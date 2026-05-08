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

type EntryMap = Record<string, AttendanceStatus>;

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildEntriesMap(classGroup: ClassGroup | undefined, initial?: EntryMap): EntryMap {
  if (!classGroup) {
    return {};
  }

  const mapped: EntryMap = {};
  classGroup.students.forEach((student) => {
    mapped[student.id] = initial?.[student.id] ?? 'present';
  });
  return mapped;
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function StatusButton({
  active,
  label,
  tone,
  onPress,
}: {
  active: boolean;
  label: string;
  tone: 'success' | 'danger' | 'neutral';
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
        active ? styles.statusActive : null,
        pressed ? styles.pressed : null,
      ]}>
      <Text style={styles.statusLabel}>{label}</Text>
    </Pressable>
  );
}

export default function AttendanceScreen() {
  const { classes, teachers, attendanceRecords, saveAttendance, deleteAttendance } = useSchoolData();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(todayDate());
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [entriesByStudent, setEntriesByStudent] = useState<EntryMap>({});

  const selectedClass = useMemo(
    () => classes.find((classGroup) => classGroup.id === selectedClassId),
    [classes, selectedClassId]
  );

  const summary = useMemo(() => {
    const values = Object.values(entriesByStudent);
    return {
      present: values.filter((item) => item === 'present').length,
      absent: values.filter((item) => item === 'absent').length,
      justified: values.filter((item) => item === 'justified').length,
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
    if (!selectedTeacherId && teachers.length > 0) {
      setSelectedTeacherId(teachers[0].id);
      return;
    }

    if (selectedTeacherId && !teachers.some((teacher) => teacher.id === selectedTeacherId)) {
      setSelectedTeacherId(teachers[0]?.id ?? '');
    }
  }, [teachers, selectedTeacherId]);

  useEffect(() => {
    if (!selectedClass) {
      setEntriesByStudent({});
      return;
    }

    setEntriesByStudent((previous) => {
      const next = buildEntriesMap(selectedClass, previous);
      const previousIds = Object.keys(previous).sort().join('|');
      const nextIds = Object.keys(next).sort().join('|');

      if (previousIds === nextIds) {
        const hasDiff = Object.keys(next).some((id) => next[id] !== previous[id]);
        if (!hasDiff) {
          return previous;
        }
      }

      return next;
    });
  }, [selectedClass]);

  const clearForm = () => {
    setEditingId(null);
    setAttendanceDate(todayDate());
    setNotes('');
    setEntriesByStudent(buildEntriesMap(selectedClass));
  };

  const onPickClass = (classId: string) => {
    setSelectedClassId(classId);
    const target = classes.find((item) => item.id === classId);
    setEntriesByStudent(buildEntriesMap(target));
  };

  const onSave = () => {
    if (!selectedClassId || !selectedTeacherId || !selectedClass) {
      return;
    }

    saveAttendance({
      id: editingId ?? undefined,
      classId: selectedClassId,
      teacherId: selectedTeacherId,
      date: attendanceDate,
      notes,
      entries: selectedClass.students.map((student) => ({
        studentId: student.id,
        status: entriesByStudent[student.id] ?? 'present',
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
    const entriesMap = Object.fromEntries(record.entries.map((entry) => [entry.studentId, entry.status])) as EntryMap;

    setEditingId(record.id);
    setSelectedClassId(record.classId);
    setSelectedTeacherId(
      teachers.some((teacher) => teacher.id === record.teacherId) ? record.teacherId : teachers[0]?.id ?? ''
    );
    setAttendanceDate(record.date);
    setNotes(record.notes);
    setEntriesByStudent(buildEntriesMap(classGroup, entriesMap));
  };

  const saveDisabled =
    !selectedClass || !selectedTeacherId || selectedClass.students.length === 0 || !isValidDate(attendanceDate);

  return (
    <ScreenShell
      title="Chamada"
      subtitle="Registre a presenca por turma e selecione qual professor ministrou a aula.">
      <Animated.View entering={FadeInDown.duration(460)}>
        <SectionCard
          title={editingId ? 'Editar chamada' : 'Nova chamada'}
          description="Professor e turma sao obrigatorios para registrar.">
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
            <FieldLabel>Professor da aula</FieldLabel>
            <View style={styles.chipWrap}>
              {teachers.map((teacher) => (
                <Pressable
                  key={teacher.id}
                  onPress={() => setSelectedTeacherId(teacher.id)}
                  style={({ pressed }) => [
                    styles.selectionChip,
                    selectedTeacherId === teacher.id ? styles.selectionChipActive : null,
                    pressed ? styles.pressed : null,
                  ]}>
                  <Text
                    style={[
                      styles.selectionChipText,
                      selectedTeacherId === teacher.id ? styles.selectionChipTextActive : null,
                    ]}>
                    {teacher.name}
                  </Text>
                </Pressable>
              ))}
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
            <FieldLabel>Observacoes (opcional)</FieldLabel>
            <AppInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Ex.: visitante na turma, aula especial, etc."
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          </View>

          <View style={styles.rowBadges}>
            <TinyBadge label={`Presentes: ${summary.present}`} tone="success" />
            <TinyBadge label={`Faltas: ${summary.absent}`} tone="danger" />
            <TinyBadge label={`Justif.: ${summary.justified}`} tone="primary" />
          </View>

          {selectedClass ? (
            <View style={styles.studentWrap}>
              <FieldLabel>Lista da turma</FieldLabel>
              {selectedClass.students.length === 0 ? (
                <Text style={styles.noStudents}>Esta turma ainda nao possui alunos cadastrados.</Text>
              ) : (
                selectedClass.students.map((student) => (
                  <View key={student.id} style={styles.studentRow}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <View style={styles.studentActions}>
                      <StatusButton
                        active={entriesByStudent[student.id] === 'present'}
                        label="P"
                        tone="success"
                        onPress={() =>
                          setEntriesByStudent((previous) => ({ ...previous, [student.id]: 'present' }))
                        }
                      />
                      <StatusButton
                        active={entriesByStudent[student.id] === 'absent'}
                        label="F"
                        tone="danger"
                        onPress={() =>
                          setEntriesByStudent((previous) => ({ ...previous, [student.id]: 'absent' }))
                        }
                      />
                      <StatusButton
                        active={entriesByStudent[student.id] === 'justified'}
                        label="J"
                        tone="neutral"
                        onPress={() =>
                          setEntriesByStudent((previous) => ({ ...previous, [student.id]: 'justified' }))
                        }
                      />
                    </View>
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
          description="Use editar para corrigir presencas e observacoes de aulas anteriores.">
          {attendanceRecords.length === 0 ? (
            <EmptyMessage
              title="Sem historico"
              description="As chamadas registradas aparecerao aqui em ordem recente."
            />
          ) : (
            attendanceRecords.map((record) => {
              const className = classes.find((item) => item.id === record.classId)?.name ?? 'Turma removida';
              const teacherName =
                teachers.find((item) => item.id === record.teacherId)?.name ?? 'Professor removido';

              const presentCount = record.entries.filter((entry) => entry.status === 'present').length;
              const absentCount = record.entries.filter((entry) => entry.status === 'absent').length;
              const justifiedCount = record.entries.filter((entry) => entry.status === 'justified').length;

              return (
                <View key={record.id} style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyTitle}>{className}</Text>
                    <TinyBadge label={record.date} tone="neutral" />
                  </View>
                  <Text style={styles.historySub}>Professor: {teacherName}</Text>
                  {record.notes ? <Text style={styles.historyNotes}>Obs: {record.notes}</Text> : null}
                  <View style={styles.rowBadges}>
                    <TinyBadge label={`P: ${presentCount}`} tone="success" />
                    <TinyBadge label={`F: ${absentCount}`} tone="danger" />
                    <TinyBadge label={`J: ${justifiedCount}`} tone="primary" />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  studentName: {
    flex: 1,
    color: AppPalette.ink,
    fontSize: 14,
    fontFamily: AppTypography.body,
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
