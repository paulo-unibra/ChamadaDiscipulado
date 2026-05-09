import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScreenShell } from '@/components/app/screen-shell';
import {
  AppInput,
  ButtonGhost,
  ButtonPrimary,
  EmptyMessage,
  FieldLabel,
  SectionCard,
  TinyBadge,
} from '@/components/app/ui';
import {
  type AttendanceStatus,
  type ClassGroup,
  useSchoolData,
} from '@/context/school-data-context';
import { AppPalette, AppTypography } from '@/constants/ui';

type EntryMap = Record<string, { status: AttendanceStatus; note: string }>;

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toggleId(values: string[], id: string) {
  return values.includes(id) ? values.filter((item) => item !== id) : [...values, id];
}

function buildEntriesMap(
  classGroup: ClassGroup | undefined,
  studentIds: string[],
  initial?: EntryMap
): EntryMap {
  if (!classGroup) {
    return {};
  }

  const mapped: EntryMap = {};
  classGroup.studentIds.forEach((studentId) => {
    if (!studentIds.includes(studentId)) {
      return;
    }

    mapped[studentId] = {
      status: initial?.[studentId]?.status ?? 'present',
      note: initial?.[studentId]?.note ?? '',
    };
  });
  return mapped;
}

function StatusButton({
  active,
  label,
  tone,
  onPress,
}: {
  active: boolean;
  label: string;
  tone: 'success' | 'danger' | 'neutral' | 'warning';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statusBtn,
        tone === 'success' ? styles.statusSuccess : null,
        tone === 'danger' ? styles.statusDanger : null,
        tone === 'neutral' ? styles.statusNeutral : null,
        tone === 'warning' ? styles.statusWarning : null,
        active ? styles.statusActive : null,
        pressed ? styles.pressed : null,
      ]}>
      <Text style={styles.statusLabel}>{label}</Text>
    </Pressable>
  );
}

export default function AttendanceScreen() {
  const {
    classes,
    teachers,
    attendanceRecords,
    saveAttendance,
    deleteAttendance,
    getStudentsForClass,
  } = useSchoolData();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(todayDate());
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [entriesByStudent, setEntriesByStudent] = useState<EntryMap>({});

  const selectedClass = useMemo(
    () => classes.find((classGroup) => classGroup.id === selectedClassId),
    [classes, selectedClassId]
  );

  const classStudents = useMemo(() => {
    if (!selectedClassId) {
      return [];
    }

    return getStudentsForClass(selectedClassId);
  }, [getStudentsForClass, selectedClassId]);

  const summary = useMemo(() => {
    const values = Object.values(entriesByStudent).map((item) => item.status);
    return {
      present: values.filter((item) => item === 'present').length,
      absent: values.filter((item) => item === 'absent').length,
      justified: values.filter((item) => item === 'justified').length,
      late: values.filter((item) => item === 'late').length,
    };
  }, [entriesByStudent]);

  useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id);
      return;
    }

    if (selectedClassId && !classes.some((classGroup) => classGroup.id === selectedClassId)) {
      setSelectedClassId(classes[0]?.id ?? '');
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (teachers.length === 0) {
      setSelectedTeacherIds((previous) => (previous.length === 0 ? previous : []));
      return;
    }

    if (selectedTeacherIds.length === 0) {
      const fallbackTeacherId = teachers[0].id;
      setSelectedTeacherIds((previous) =>
        previous.length === 1 && previous[0] === fallbackTeacherId ? previous : [fallbackTeacherId]
      );
      return;
    }

    const validIds = selectedTeacherIds.filter((teacherId) => teachers.some((teacher) => teacher.id === teacherId));
    if (validIds.length !== selectedTeacherIds.length) {
      const normalized = validIds.length > 0 ? validIds : [teachers[0].id];
      setSelectedTeacherIds((previous) => {
        if (previous.length === normalized.length && previous.every((id, index) => id === normalized[index])) {
          return previous;
        }

        return normalized;
      });
    }
  }, [teachers, selectedTeacherIds]);

  useEffect(() => {
    if (!selectedClass) {
      setEntriesByStudent((previous) => (Object.keys(previous).length === 0 ? previous : {}));
      return;
    }

    const visibleStudentIds = classStudents.map((student) => student.id);

    setEntriesByStudent((previous) => {
      const next = buildEntriesMap(selectedClass, visibleStudentIds, previous);
      const previousKeys = Object.keys(previous).sort().join('|');
      const nextKeys = Object.keys(next).sort().join('|');

      if (previousKeys !== nextKeys) {
        return next;
      }

      const changed = Object.keys(next).some(
        (key) => next[key].status !== previous[key]?.status || next[key].note !== previous[key]?.note
      );

      return changed ? next : previous;
    });
  }, [selectedClass, classStudents]);

  const clearForm = () => {
    setEditingId(null);
    setAttendanceDate(todayDate());
    setNotes('');
    const visibleStudentIds = classStudents.map((student) => student.id);
    setEntriesByStudent(buildEntriesMap(selectedClass, visibleStudentIds));
  };

  const onPickClass = (classId: string) => {
    setSelectedClassId(classId);
    const target = classes.find((item) => item.id === classId);
    const targetStudents = getStudentsForClass(classId);
    setEntriesByStudent(buildEntriesMap(target, targetStudents.map((student) => student.id)));
  };

  const onSave = () => {
    if (!selectedClassId || selectedTeacherIds.length === 0 || !selectedClass) {
      return;
    }

    saveAttendance({
      id: editingId ?? undefined,
      classId: selectedClassId,
      teacherIds: selectedTeacherIds,
      date: attendanceDate,
      notes,
      entries: classStudents.map((student) => ({
        studentId: student.id,
        status: entriesByStudent[student.id]?.status ?? 'present',
        note: entriesByStudent[student.id]?.note ?? '',
      })),
    });

    clearForm();
  };

  const onEdit = (recordId: string) => {
    const record = attendanceRecords.find((item) => item.id === recordId);
    if (!record) {
      return;
    }

    const classGroup = classes.find((item) => item.id === record.classId);
    const classStudentIds = getStudentsForClass(record.classId).map((student) => student.id);
    const entriesMap = Object.fromEntries(
      record.entries.map((entry) => [entry.studentId, { status: entry.status, note: entry.note }])
    ) as EntryMap;

    const safeTeacherIds = record.teacherIds.filter((teacherId) =>
      teachers.some((teacher) => teacher.id === teacherId)
    );

    setEditingId(record.id);
    setSelectedClassId(record.classId);
    setSelectedTeacherIds(safeTeacherIds.length > 0 ? safeTeacherIds : teachers[0] ? [teachers[0].id] : []);
    setAttendanceDate(record.date);
    setNotes(record.notes);
    setEntriesByStudent(buildEntriesMap(classGroup, classStudentIds, entriesMap));
  };

  const saveDisabled =
    !selectedClass || selectedTeacherIds.length === 0 || classStudents.length === 0 || !isValidDate(attendanceDate);

  return (
    <ScreenShell
      title="Chamada"
      subtitle="Registre a presenca por turma, com um ou mais professores, status atrasado e observacao por aluno.">
      <Animated.View entering={FadeInDown.duration(460)}>
        <SectionCard
          title={editingId ? 'Editar chamada' : 'Nova chamada'}
          description="Turma e pelo menos um professor sao obrigatorios para salvar.">
          {classes.length === 0 ? (
            <EmptyMessage
              title="Sem turmas cadastradas"
              description="Cadastre pelo menos uma turma para iniciar a chamada."
            />
          ) : null}

          {teachers.length === 0 ? (
            <EmptyMessage
              title="Sem professores cadastrados"
              description="Cadastre professores para vincular quem deu a aula."
            />
          ) : null}

          <View>
            <FieldLabel>Turma</FieldLabel>
            <View style={styles.chipWrap}>
              {classes.map((classGroup) => (
                <Pressable
                  key={classGroup.id}
                  onPress={() => onPickClass(classGroup.id)}
                  style={({ pressed }) => [
                    styles.selectionChip,
                    selectedClassId === classGroup.id ? styles.selectionChipActive : null,
                    pressed ? styles.pressed : null,
                  ]}>
                  <Text
                    style={[
                      styles.selectionChipText,
                      selectedClassId === classGroup.id ? styles.selectionChipTextActive : null,
                    ]}>
                    {classGroup.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <FieldLabel>Professores da aula (multiplos)</FieldLabel>
            <View style={styles.chipWrap}>
              {teachers.map((teacher) => {
                const active = selectedTeacherIds.includes(teacher.id);
                return (
                  <Pressable
                    key={teacher.id}
                    onPress={() => setSelectedTeacherIds((previous) => toggleId(previous, teacher.id))}
                    style={({ pressed }) => [
                      styles.selectionChip,
                      active ? styles.selectionChipActive : null,
                      pressed ? styles.pressed : null,
                    ]}>
                    <Text style={[styles.selectionChipText, active ? styles.selectionChipTextActive : null]}>
                      {teacher.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <FieldLabel>Data da aula</FieldLabel>
            <AppInput
              value={attendanceDate}
              onChangeText={setAttendanceDate}
              placeholder="AAAA-MM-DD"
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
            />
            {!isValidDate(attendanceDate) ? (
              <Text style={styles.validationText}>Use formato AAAA-MM-DD (ex.: 2026-05-08).</Text>
            ) : null}
          </View>

          <View>
            <FieldLabel>Observacoes gerais (opcional)</FieldLabel>
            <AppInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Ex.: classe com visitantes, atividade externa, etc."
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          </View>

          <View style={styles.rowBadges}>
            <TinyBadge label={`Presentes: ${summary.present}`} tone="success" />
            <TinyBadge label={`Faltas: ${summary.absent}`} tone="danger" />
            <TinyBadge label={`Justif.: ${summary.justified}`} tone="primary" />
            <TinyBadge label={`Atrasados: ${summary.late}`} tone="neutral" />
          </View>

          {selectedClass ? (
            <View style={styles.studentWrap}>
              <FieldLabel>Lista da turma</FieldLabel>
              {classStudents.length === 0 ? (
                <Text style={styles.noStudents}>Esta turma ainda nao possui alunos vinculados.</Text>
              ) : (
                classStudents.map((student) => (
                  <View key={student.id} style={styles.studentRow}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <View style={styles.studentActions}>
                      <StatusButton
                        active={entriesByStudent[student.id]?.status === 'present'}
                        label="P"
                        tone="success"
                        onPress={() =>
                          setEntriesByStudent((previous) => ({
                            ...previous,
                            [student.id]: { status: 'present', note: previous[student.id]?.note ?? '' },
                          }))
                        }
                      />
                      <StatusButton
                        active={entriesByStudent[student.id]?.status === 'absent'}
                        label="F"
                        tone="danger"
                        onPress={() =>
                          setEntriesByStudent((previous) => ({
                            ...previous,
                            [student.id]: { status: 'absent', note: previous[student.id]?.note ?? '' },
                          }))
                        }
                      />
                      <StatusButton
                        active={entriesByStudent[student.id]?.status === 'justified'}
                        label="J"
                        tone="neutral"
                        onPress={() =>
                          setEntriesByStudent((previous) => ({
                            ...previous,
                            [student.id]: { status: 'justified', note: previous[student.id]?.note ?? '' },
                          }))
                        }
                      />
                      <StatusButton
                        active={entriesByStudent[student.id]?.status === 'late'}
                        label="A"
                        tone="warning"
                        onPress={() =>
                          setEntriesByStudent((previous) => ({
                            ...previous,
                            [student.id]: { status: 'late', note: previous[student.id]?.note ?? '' },
                          }))
                        }
                      />
                    </View>
                    <AppInput
                      value={entriesByStudent[student.id]?.note ?? ''}
                      onChangeText={(value) =>
                        setEntriesByStudent((previous) => ({
                          ...previous,
                          [student.id]: { status: previous[student.id]?.status ?? 'present', note: value },
                        }))
                      }
                      placeholder="Observacao do aluno (opcional)"
                    />
                  </View>
                ))
              )}
            </View>
          ) : null}

          <View style={styles.actionsWrap}>
            <ButtonPrimary
              title={editingId ? 'Salvar edicao' : 'Registrar chamada'}
              onPress={onSave}
              disabled={saveDisabled}
            />
            {editingId ? <ButtonGhost title="Cancelar edicao" onPress={clearForm} /> : null}
          </View>
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(460)}>
        <SectionCard
          title="Historico"
          description="Use editar para corrigir presencas, professores ou observacoes de aulas anteriores.">
          {attendanceRecords.length === 0 ? (
            <EmptyMessage
              title="Sem historico"
              description="As chamadas registradas aparecerao aqui em ordem recente."
            />
          ) : (
            attendanceRecords.map((record) => {
              const className = classes.find((item) => item.id === record.classId)?.name ?? 'Turma removida';
              const teacherNames =
                record.teacherIds.length === 0
                  ? 'Professor removido'
                  : record.teacherIds
                      .map((teacherId) => teachers.find((item) => item.id === teacherId)?.name ?? 'Removido')
                      .join(', ');

              const presentCount = record.entries.filter((entry) => entry.status === 'present').length;
              const absentCount = record.entries.filter((entry) => entry.status === 'absent').length;
              const justifiedCount = record.entries.filter((entry) => entry.status === 'justified').length;
              const lateCount = record.entries.filter((entry) => entry.status === 'late').length;

              return (
                <View key={record.id} style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyTitle}>{className}</Text>
                    <TinyBadge label={record.date} tone="neutral" />
                  </View>
                  <Text style={styles.historySub}>Professores: {teacherNames}</Text>
                  {record.notes ? <Text style={styles.historyNotes}>Obs geral: {record.notes}</Text> : null}
                  <View style={styles.rowBadges}>
                    <TinyBadge label={`P: ${presentCount}`} tone="success" />
                    <TinyBadge label={`F: ${absentCount}`} tone="danger" />
                    <TinyBadge label={`J: ${justifiedCount}`} tone="primary" />
                    <TinyBadge label={`A: ${lateCount}`} tone="neutral" />
                  </View>
                  <View style={styles.historyActions}>
                    <ButtonGhost title="Editar" tone="success" onPress={() => onEdit(record.id)} />
                    <ButtonGhost title="Apagar" tone="danger" onPress={() => deleteAttendance(record.id)} />
                  </View>
                </View>
              );
            })
          )}
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppPalette.border,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  selectionChipActive: {
    backgroundColor: AppPalette.primary,
    borderColor: AppPalette.primary,
  },
  selectionChipText: {
    color: AppPalette.ink,
    fontSize: 13,
    fontFamily: AppTypography.bodyStrong,
  },
  selectionChipTextActive: {
    color: '#FFFFFF',
  },
  validationText: {
    marginTop: 4,
    color: AppPalette.danger,
    fontSize: 12,
    fontFamily: AppTypography.body,
  },
  rowBadges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  studentWrap: {
    gap: 8,
  },
  noStudents: {
    color: AppPalette.inkMuted,
    fontSize: 13,
    fontFamily: AppTypography.body,
  },
  studentRow: {
    borderWidth: 1,
    borderColor: AppPalette.border,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 8,
    gap: 8,
  },
  studentName: {
    flex: 1,
    color: AppPalette.ink,
    fontSize: 14,
    fontFamily: AppTypography.bodyStrong,
  },
  studentActions: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBtn: {
    minWidth: 32,
    borderWidth: 1,
    borderColor: AppPalette.border,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSuccess: {
    backgroundColor: AppPalette.successSoft,
  },
  statusDanger: {
    backgroundColor: AppPalette.dangerSoft,
  },
  statusNeutral: {
    backgroundColor: '#F2ECE1',
  },
  statusWarning: {
    backgroundColor: AppPalette.accentSoft,
  },
  statusActive: {
    borderColor: AppPalette.primary,
    borderWidth: 2,
  },
  statusLabel: {
    color: AppPalette.ink,
    fontSize: 12,
    fontFamily: AppTypography.bodyStrong,
  },
  pressed: {
    opacity: 0.85,
  },
  actionsWrap: {
    gap: 8,
  },
  historyItem: {
    borderWidth: 1,
    borderColor: AppPalette.border,
    borderRadius: 12,
    padding: 10,
    gap: 7,
    backgroundColor: '#FFFFFF',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  historyTitle: {
    flex: 1,
    color: AppPalette.ink,
    fontSize: 15,
    fontFamily: AppTypography.bodyStrong,
  },
  historySub: {
    color: AppPalette.inkMuted,
    fontSize: 13,
    fontFamily: AppTypography.body,
  },
  historyNotes: {
    color: AppPalette.ink,
    fontSize: 13,
    fontFamily: AppTypography.body,
  },
  historyActions: {
    flexDirection: 'row',
    gap: 8,
  },
});
