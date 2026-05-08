import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type Student = {
  id: string;
  name: string;
  createdAt: string;
};

export type ClassGroup = {
  id: string;
  name: string;
  description: string;
  students: Student[];
  createdAt: string;
};

export type Teacher = {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
};

export type AttendanceStatus = 'present' | 'absent' | 'justified';

export type AttendanceEntry = {
  studentId: string;
  status: AttendanceStatus;
};

export type AttendanceRecord = {
  id: string;
  classId: string;
  teacherId: string;
  date: string;
  notes: string;
  entries: AttendanceEntry[];
  createdAt: string;
  updatedAt: string;
};

type SaveAttendanceInput = {
  id?: string;
  classId: string;
  teacherId: string;
  date: string;
  notes: string;
  entries: AttendanceEntry[];
};

type SchoolDataContextValue = {
  classes: ClassGroup[];
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  createClass: (name: string, description: string) => void;
  deleteClass: (classId: string) => void;
  addStudent: (classId: string, studentName: string) => void;
  deleteStudent: (classId: string, studentId: string) => void;
  createTeacher: (name: string, phone: string) => void;
  deleteTeacher: (teacherId: string) => void;
  saveAttendance: (input: SaveAttendanceInput) => void;
  deleteAttendance: (attendanceId: string) => void;
};

const SchoolDataContext = createContext<SchoolDataContextValue | null>(null);

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function SchoolDataProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

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
        students: [],
        createdAt: nowIso(),
      },
      ...previous,
    ]);
  };

  const deleteClass = (classId: string) => {
    setClasses((previous) => previous.filter((item) => item.id !== classId));
    setAttendanceRecords((previous) => previous.filter((item) => item.classId !== classId));
  };

  const addStudent = (classId: string, studentName: string) => {
    const trimmedName = studentName.trim();
    if (!trimmedName) {
      return;
    }

    setClasses((previous) =>
      previous.map((classGroup) => {
        if (classGroup.id !== classId) {
          return classGroup;
        }

        const hasSameName = classGroup.students.some(
          (student) => student.name.toLowerCase() === trimmedName.toLowerCase()
        );

        if (hasSameName) {
          return classGroup;
        }

        return {
          ...classGroup,
          students: [
            ...classGroup.students,
            {
              id: makeId('student'),
              name: trimmedName,
              createdAt: nowIso(),
            },
          ],
        };
      })
    );
  };

  const deleteStudent = (classId: string, studentId: string) => {
    setClasses((previous) =>
      previous.map((classGroup) => {
        if (classGroup.id !== classId) {
          return classGroup;
        }

        return {
          ...classGroup,
          students: classGroup.students.filter((student) => student.id !== studentId),
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

  const deleteTeacher = (teacherId: string) => {
    setTeachers((previous) => previous.filter((item) => item.id !== teacherId));
  };

  const saveAttendance = (input: SaveAttendanceInput) => {
    const stamp = nowIso();

    setAttendanceRecords((previous) => {
      const normalized = {
        classId: input.classId,
        teacherId: input.teacherId,
        date: input.date,
        notes: input.notes.trim(),
        entries: input.entries,
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

  const value = useMemo<SchoolDataContextValue>(
    () => ({
      classes,
      teachers,
      attendanceRecords,
      createClass,
      deleteClass,
      addStudent,
      deleteStudent,
      createTeacher,
      deleteTeacher,
      saveAttendance,
      deleteAttendance,
    }),
    [classes, teachers, attendanceRecords]
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
