import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

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
  teacherIds: string[];
  date: string;
  notes: string;
  entries: AttendanceEntry[];
  createdAt: string;
  updatedAt: string;
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

type SchoolDataContextValue = {
  classes: ClassGroup[];
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
  createTeacher: (name: string, phone: string) => void;
  getTeacherDeleteImpact: (teacherId: string) => DeleteTeacherImpact;
  deleteTeacher: (teacherId: string) => DeleteTeacherImpact;
  saveAttendance: (input: SaveAttendanceInput) => void;
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

export function SchoolDataProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const modeLabel = 'Online (API mock)';

  const studentsMap = useMemo(
    () => Object.fromEntries(students.map((student) => [student.id, student])),
    [students]
  );

  const createClass = (name: string, description: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    setClasses((previous) => [
      {
        id: makeId('class'),
        name: trimmedName,
        description: description.trim(),
        studentIds: [],
        createdAt: nowIso(),
      },
      ...previous,
    ]);
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

    setClasses((previous) => previous.filter((item) => item.id !== classId));
    setAttendanceRecords((previous) => previous.filter((item) => item.classId !== classId));
    return impact;
  };

  const createStudent = (input: CreateStudentInput) => {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return null;
    }

    const studentId = makeId('student');
    const nextStudent: Student = {
      id: studentId,
      name: trimmedName,
      birthDate: input.birthDate.trim(),
      studentPhone: input.studentPhone.trim(),
      email: input.email.trim(),
      guardianName: input.guardianName.trim(),
      guardianPhone: input.guardianPhone.trim(),
      address: input.address.trim(),
      notes: input.notes.trim(),
      createdAt: nowIso(),
    };

    setStudents((previous) => [nextStudent, ...previous]);

    const uniqueClassIds = unique(input.classIds.filter(Boolean));
    if (uniqueClassIds.length > 0) {
      setClasses((previous) =>
        previous.map((classGroup) => {
          if (!uniqueClassIds.includes(classGroup.id) || classGroup.studentIds.includes(studentId)) {
            return classGroup;
          }

          return {
            ...classGroup,
            studentIds: [...classGroup.studentIds, studentId],
          };
        })
      );
    }

    return studentId;
  };

  const deleteStudent = (studentId: string) => {
    setStudents((previous) => previous.filter((student) => student.id !== studentId));

    setClasses((previous) =>
      previous.map((classGroup) => ({
        ...classGroup,
        studentIds: classGroup.studentIds.filter((id) => id !== studentId),
      }))
    );

    setAttendanceRecords((previous) =>
      previous.map((record) => ({
        ...record,
        entries: record.entries.filter((entry) => entry.studentId !== studentId),
        updatedAt: nowIso(),
      }))
    );
  };

  const assignStudentToClass = (classId: string, studentId: string) => {
    setClasses((previous) =>
      previous.map((classGroup) => {
        if (classGroup.id !== classId || classGroup.studentIds.includes(studentId)) {
          return classGroup;
        }

        return {
          ...classGroup,
          studentIds: [...classGroup.studentIds, studentId],
        };
      })
    );
  };

  const removeStudentFromClass = (classId: string, studentId: string) => {
    setClasses((previous) =>
      previous.map((classGroup) => {
        if (classGroup.id !== classId) {
          return classGroup;
        }

        return {
          ...classGroup,
          studentIds: classGroup.studentIds.filter((id) => id !== studentId),
        };
      })
    );

    setAttendanceRecords((previous) =>
      previous.map((record) => {
        if (record.classId !== classId) {
          return record;
        }

        return {
          ...record,
          entries: record.entries.filter((entry) => entry.studentId !== studentId),
          updatedAt: nowIso(),
        };
      })
    );
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

    setStudents((previous) => [...importedStudents, ...previous]);

    const uniqueClassIds = unique(classIds.filter(Boolean));
    if (uniqueClassIds.length > 0) {
      const importedIds = importedStudents.map((student) => student.id);
      setClasses((previous) =>
        previous.map((classGroup) => {
          if (!uniqueClassIds.includes(classGroup.id)) {
            return classGroup;
          }

          return {
            ...classGroup,
            studentIds: unique([...classGroup.studentIds, ...importedIds]),
          };
        })
      );
    }

    return {
      created: importedStudents.length,
      skipped: contentRows.length - importedStudents.length,
      errors,
    };
  };

  const createTeacher = (name: string, phone: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    setTeachers((previous) => [
      {
        id: makeId('teacher'),
        name: trimmedName,
        phone: phone.trim(),
        createdAt: nowIso(),
      },
      ...previous,
    ]);
  };

  const getTeacherDeleteImpact = (teacherId: string): DeleteTeacherImpact => ({
    attendanceCount: attendanceRecords.filter((record) => record.teacherIds.includes(teacherId)).length,
  });

  const deleteTeacher = (teacherId: string): DeleteTeacherImpact => {
    const impact = getTeacherDeleteImpact(teacherId);

    setTeachers((previous) => previous.filter((item) => item.id !== teacherId));
    setAttendanceRecords((previous) =>
      previous.map((record) => ({
        ...record,
        teacherIds: record.teacherIds.filter((id) => id !== teacherId),
        updatedAt: nowIso(),
      }))
    );
    return impact;
  };

  const saveAttendance = (input: SaveAttendanceInput) => {
    const stamp = nowIso();
    const uniqueTeacherIds = unique(input.teacherIds.filter(Boolean));

    setAttendanceRecords((previous) => {
      const normalized = {
        classId: input.classId,
        teacherIds: uniqueTeacherIds,
        date: input.date,
        notes: input.notes.trim(),
        entries: input.entries.map((entry) => ({
          studentId: entry.studentId,
          status: entry.status,
          note: entry.note.trim(),
        })),
      };

      if (input.id) {
        return previous.map((record) => {
          if (record.id !== input.id) {
            return record;
          }

          return {
            ...record,
            ...normalized,
            updatedAt: stamp,
          };
        });
      }

      return [
        {
          id: makeId('attendance'),
          ...normalized,
          createdAt: stamp,
          updatedAt: stamp,
        },
        ...previous,
      ];
    });
  };

  const deleteAttendance = (attendanceId: string) => {
    setAttendanceRecords((previous) => previous.filter((item) => item.id !== attendanceId));
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
    [classes, students, teachers, attendanceRecords]
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
