import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { API_BASE_URL } from '@/constants/api';

export type Student = {
  id: string;
  name: string;
  birthDate: string;
  studentPhone: string;
  email: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  notes: string;
  createdAt: string;
};

export type ClassGroup = {
  id: string;
  name: string;
  description: string;
  studentIds: string[];
  createdAt: string;
  lessonNames: string[];
};

export type Teacher = {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
};

export type AttendanceStatus = 'present' | 'absent' | 'justified' | 'late';

export type AttendanceEntry = {
  studentId: string;
  status: AttendanceStatus;
  note: string;
};

export type AttendanceRecord = {
  id: string;
  classId: string;
  lessonName: string;
  teacherIds: string[];
  date: string;
  notes: string;
  entries: AttendanceEntry[];
  createdAt: string;
  updatedAt: string;
};

type SchoolStatePayload = {
  classes: ClassGroup[];
  discipleshipLessons?: string[];
  students: Student[];
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
};

type CreateStudentInput = {
  name: string;
  birthDate: string;
  studentPhone: string;
  email: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  notes: string;
  classIds: string[];
};

type SaveAttendanceInput = {
  id?: string;
  classId: string;
  lessonName: string;
  teacherIds: string[];
  date: string;
  notes: string;
  entries: AttendanceEntry[];
};

type ImportResult = {
  created: number;
  skipped: number;
  errors: string[];
};

type DeleteClassImpact = {
  attendanceCount: number;
  studentsLinked: number;
};

type DeleteTeacherImpact = {
  attendanceCount: number;
};

type MutationResult = {
  success: boolean;
  message?: string;
};

const DEFAULT_DISCIPLESHIP_LESSONS = [
  'INTRODUCAO AO DISCIPULADO',
  'HISTORIA DAS ASSEMBLEIAS DE DEUS',
  'TENDO UMA NOVA CONDUTA',
  'SUPERANDO CONFLITOS E DUVIDAS',
  'INTRODUCAO A BIBLIA',
  'CONHECENDO JESUS',
  'O PLANO DE DEUS PARA A HUMANIDADE',
  'O QUE E SALVACAO?',
  'O QUE E PECADO?',
  'SANTIFICACAO',
  'OBEDIENCIA',
  'ORACAO',
  'O FRUTO DO ESPIRITO',
  'MORDOMIA CRISTA',
  'A IGREJA',
  'DOUTRINAS, COSTUMES, E NORMAS DA IGREJA',
  'O BATISMO COM ESPIRITO SANTO',
  'TRINDADE DIVINA',
  'HERESIAS',
  'FINAL DOS TEMPOS',
  'ORDENANCAS BIBLICAS',
  'EVANGELISMO',
] as const;

type SchoolDataContextValue = {
  classes: ClassGroup[];
  discipleshipLessons: string[];
  students: Student[];
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  modeLabel: string;
  createClass: (name: string, description: string) => void;
  getClassDeleteImpact: (classId: string) => DeleteClassImpact;
  deleteClass: (classId: string) => DeleteClassImpact;
  createStudent: (input: CreateStudentInput) => string | null;
  deleteStudent: (studentId: string) => void;
  assignStudentToClass: (classId: string, studentId: string) => void;
  removeStudentFromClass: (classId: string, studentId: string) => void;
  importStudentsFromCsv: (csvText: string, classIds: string[]) => ImportResult;
  createTeacher: (name: string, phone: string) => Promise<MutationResult>;
  getTeacherDeleteImpact: (teacherId: string) => DeleteTeacherImpact;
  deleteTeacher: (teacherId: string) => DeleteTeacherImpact;
  saveAttendance: (input: SaveAttendanceInput) => Promise<MutationResult>;
  deleteAttendance: (attendanceId: string) => void;
  getStudentsForClass: (classId: string) => Student[];
  getClassesForStudent: (studentId: string) => ClassGroup[];
};

const SchoolDataContext = createContext<SchoolDataContextValue | null>(null);

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const escapedQuote = insideQuotes && line[index + 1] === '"';
      if (escapedQuote) {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

async function parseResponse<T>(response: Response) {
  const text = await response.text();
  let parsed: unknown = {};

  if (text) {
    try {
      parsed = JSON.parse(text) as T;
    } catch {
      parsed = { message: text };
    }
  }

  if (!response.ok) {
    const message =
      typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message?: string }).message ?? 'Erro na API')
        : `Erro HTTP ${response.status}`;
    throw new Error(message);
  }

  return parsed as T;
}

async function fetchSchoolState() {
  const response = await fetch(`${API_BASE_URL}/school/state`, {
    headers: { Accept: 'application/json' },
  });

  return parseResponse<SchoolStatePayload>(response);
}

export function SchoolDataProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [discipleshipLessons, setDiscipleshipLessons] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const modeLabel = `Online (API ${API_BASE_URL})`;

  const applyState = (payload: SchoolStatePayload) => {
    const fallbackLessons =
      payload.discipleshipLessons ?? payload.classes?.[0]?.lessonNames ?? [...DEFAULT_DISCIPLESHIP_LESSONS];
    const normalizedClasses = (payload.classes ?? []).map((classGroup) => ({
      ...classGroup,
      lessonNames: classGroup.lessonNames ?? fallbackLessons,
    }));

    setClasses(normalizedClasses);
    setDiscipleshipLessons(payload.discipleshipLessons ?? normalizedClasses[0]?.lessonNames ?? []);
    setStudents(payload.students ?? []);
    setTeachers(payload.teachers ?? []);
    setAttendanceRecords(payload.attendanceRecords ?? []);
  };

  const syncState = async () => {
    const payload = await fetchSchoolState();
    applyState(payload);
  };

  useEffect(() => {
    syncState().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Erro ao sincronizar estado';
      console.warn('[school-data] sync error:', message);
    });
  }, []);

  const studentsMap = useMemo(
    () => Object.fromEntries(students.map((student) => [student.id, student])),
    [students]
  );

  const createClass = (name: string, description: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    fetch(`${API_BASE_URL}/school/classes`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: trimmedName, description: description.trim() }),
    })
      .then((response) => parseResponse<SchoolStatePayload>(response))
      .then((payload) => applyState(payload))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Erro ao criar turma';
        console.warn('[school-data] createClass error:', message);
      });
  };

  const getClassDeleteImpact = (classId: string): DeleteClassImpact => {
    const classGroup = classes.find((item) => item.id === classId);
    return {
      attendanceCount: attendanceRecords.filter((item) => item.classId === classId).length,
      studentsLinked: classGroup?.studentIds.length ?? 0,
    };
  };

  const deleteClass = (classId: string): DeleteClassImpact => {
    const impact = getClassDeleteImpact(classId);

    fetch(`${API_BASE_URL}/school/classes/${classId}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    })
      .then((response) => parseResponse<SchoolStatePayload>(response))
      .then((payload) => applyState(payload))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Erro ao apagar turma';
        console.warn('[school-data] deleteClass error:', message);
      });

    return impact;
  };

  const createStudent = (input: CreateStudentInput) => {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return null;
    }

    const studentId = makeId('student');

    fetch(`${API_BASE_URL}/school/students`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: trimmedName,
        birthDate: input.birthDate,
        studentPhone: input.studentPhone,
        email: input.email,
        guardianName: input.guardianName,
        guardianPhone: input.guardianPhone,
        address: input.address,
        notes: input.notes,
        classIds: unique(input.classIds.filter(Boolean)),
      }),
    })
      .then((response) => parseResponse<SchoolStatePayload>(response))
      .then((payload) => applyState(payload))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Erro ao criar aluno';
        console.warn('[school-data] createStudent error:', message);
      });

    return studentId;
  };

  const deleteStudent = (studentId: string) => {
    fetch(`${API_BASE_URL}/school/students/${studentId}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    })
      .then((response) => parseResponse<SchoolStatePayload>(response))
      .then((payload) => applyState(payload))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Erro ao apagar aluno';
        console.warn('[school-data] deleteStudent error:', message);
      });
  };

  const assignStudentToClass = (classId: string, studentId: string) => {
    fetch(`${API_BASE_URL}/school/students/assign`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ classId, studentId }),
    })
      .then((response) => parseResponse<SchoolStatePayload>(response))
      .then((payload) => applyState(payload))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Erro ao vincular aluno';
        console.warn('[school-data] assignStudentToClass error:', message);
      });
  };

  const removeStudentFromClass = (classId: string, studentId: string) => {
    fetch(`${API_BASE_URL}/school/students/remove`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ classId, studentId }),
    })
      .then((response) => parseResponse<SchoolStatePayload>(response))
      .then((payload) => applyState(payload))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Erro ao remover aluno da turma';
        console.warn('[school-data] removeStudentFromClass error:', message);
      });
  };

  const importStudentsFromCsv = (csvText: string, classIds: string[]) => {
    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return {
        created: 0,
        skipped: 0,
        errors: ['Cole o conteudo CSV antes de importar.'],
      };
    }

    const semicolonCount = (lines[0].match(/;/g) ?? []).length;
    const commaCount = (lines[0].match(/,/g) ?? []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';

    const rows = lines.map((line) => parseCsvLine(line, delimiter));
    const rawHeader = rows[0].map(normalizeHeader);
    const hasHeader = rawHeader.includes('nome') || rawHeader.includes('name');

    const nameColumnIndex = hasHeader
      ? rawHeader.findIndex((header) => ['nome', 'name'].includes(header))
      : 0;
    const birthDateIndex = hasHeader
      ? rawHeader.findIndex((header) => ['nascimento', 'birthdate', 'data_nascimento'].includes(header))
      : 1;
    const studentPhoneIndex = hasHeader
      ? rawHeader.findIndex((header) => ['telefone_aluno', 'telefone', 'phone'].includes(header))
      : 2;
    const emailIndex = hasHeader ? rawHeader.findIndex((header) => ['email'].includes(header)) : 3;
    const guardianNameIndex = hasHeader
      ? rawHeader.findIndex((header) => ['responsavel', 'guardian', 'guardian_name'].includes(header))
      : 4;
    const guardianPhoneIndex = hasHeader
      ? rawHeader.findIndex((header) => ['telefone_responsavel', 'guardian_phone'].includes(header))
      : 5;
    const addressIndex = hasHeader
      ? rawHeader.findIndex((header) => ['endereco', 'address'].includes(header))
      : 6;
    const notesIndex = hasHeader
      ? rawHeader.findIndex((header) => ['observacoes', 'obs', 'notes'].includes(header))
      : 7;

    const contentRows = hasHeader ? rows.slice(1) : rows;
    const errors: string[] = [];
    const importedStudents: Student[] = [];

    contentRows.forEach((columns, index) => {
      const rowNumber = index + (hasHeader ? 2 : 1);
      const name = (columns[nameColumnIndex] ?? '').trim();

      if (!name) {
        errors.push(`Linha ${rowNumber}: nome vazio.`);
        return;
      }

      importedStudents.push({
        id: makeId('student'),
        name,
        birthDate: (columns[birthDateIndex] ?? '').trim(),
        studentPhone: (columns[studentPhoneIndex] ?? '').trim(),
        email: (columns[emailIndex] ?? '').trim(),
        guardianName: (columns[guardianNameIndex] ?? '').trim(),
        guardianPhone: (columns[guardianPhoneIndex] ?? '').trim(),
        address: (columns[addressIndex] ?? '').trim(),
        notes: (columns[notesIndex] ?? '').trim(),
        createdAt: nowIso(),
      });
    });

    if (importedStudents.length === 0) {
      return {
        created: 0,
        skipped: contentRows.length,
        errors,
      };
    }

    const uniqueClassIds = unique(classIds.filter(Boolean));
    importedStudents.forEach((student) => {
      fetch(`${API_BASE_URL}/school/students`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...student,
          classIds: uniqueClassIds,
        }),
      })
        .then((response) => parseResponse<SchoolStatePayload>(response))
        .then((payload) => applyState(payload))
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Erro ao importar aluno';
          console.warn('[school-data] importStudentsFromCsv error:', message);
        });
    });

    return {
      created: importedStudents.length,
      skipped: contentRows.length - importedStudents.length,
      errors,
    };
  };

  const createTeacher = async (name: string, phone: string): Promise<MutationResult> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return {
        success: false,
        message: 'Nome do professor eh obrigatorio.',
      };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/school/teachers`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmedName, phone: phone.trim() }),
      });

      const payload = await parseResponse<SchoolStatePayload>(response);
      applyState(payload);

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao criar professor';
      console.warn('[school-data] createTeacher error:', message);

      return {
        success: false,
        message,
      };
    }
  };

  const getTeacherDeleteImpact = (teacherId: string): DeleteTeacherImpact => ({
    attendanceCount: attendanceRecords.filter((record) => record.teacherIds.includes(teacherId)).length,
  });

  const deleteTeacher = (teacherId: string): DeleteTeacherImpact => {
    const impact = getTeacherDeleteImpact(teacherId);

    fetch(`${API_BASE_URL}/school/teachers/${teacherId}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    })
      .then((response) => parseResponse<SchoolStatePayload>(response))
      .then((payload) => applyState(payload))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Erro ao apagar professor';
        console.warn('[school-data] deleteTeacher error:', message);
      });

    return impact;
  };

  const saveAttendance = async (input: SaveAttendanceInput): Promise<MutationResult> => {
    const uniqueTeacherIds = unique(input.teacherIds.filter(Boolean));

    try {
      const response = await fetch(`${API_BASE_URL}/school/attendance`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: input.id,
          classId: input.classId,
          lessonName: input.lessonName,
          teacherIds: uniqueTeacherIds,
          date: input.date,
          notes: input.notes.trim(),
          entries: input.entries.map((entry) => ({
            studentId: entry.studentId,
            status: entry.status,
            note: entry.note.trim(),
          })),
        }),
      });

      const payload = await parseResponse<SchoolStatePayload>(response);
      applyState(payload);

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar chamada';
      console.warn('[school-data] saveAttendance error:', message);

      return {
        success: false,
        message,
      };
    }
  };

  const deleteAttendance = (attendanceId: string) => {
    fetch(`${API_BASE_URL}/school/attendance/${attendanceId}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    })
      .then((response) => parseResponse<SchoolStatePayload>(response))
      .then((payload) => applyState(payload))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Erro ao apagar chamada';
        console.warn('[school-data] deleteAttendance error:', message);
      });
  };

  const getStudentsForClass = (classId: string) => {
    const classGroup = classes.find((item) => item.id === classId);
    if (!classGroup) {
      return [];
    }

    return classGroup.studentIds
      .map((id) => studentsMap[id])
      .filter((student): student is Student => Boolean(student));
  };

  const getClassesForStudent = (studentId: string) =>
    classes.filter((classGroup) => classGroup.studentIds.includes(studentId));

  const value = useMemo<SchoolDataContextValue>(
    () => ({
      classes,
      discipleshipLessons,
      students,
      teachers,
      attendanceRecords,
      modeLabel,
      createClass,
      getClassDeleteImpact,
      deleteClass,
      createStudent,
      deleteStudent,
      assignStudentToClass,
      removeStudentFromClass,
      importStudentsFromCsv,
      createTeacher,
      getTeacherDeleteImpact,
      deleteTeacher,
      saveAttendance,
      deleteAttendance,
      getStudentsForClass,
      getClassesForStudent,
    }),
    [classes, discipleshipLessons, students, teachers, attendanceRecords]
  );

  return <SchoolDataContext.Provider value={value}>{children}</SchoolDataContext.Provider>;
}

export function useSchoolData() {
  const context = useContext(SchoolDataContext);

  if (!context) {
    throw new Error('useSchoolData must be used within SchoolDataProvider');
  }

  return context;
}
