import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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

function todayDateIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateToBr(value: string) {
  const trimmed = value.trim();
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    return trimmed;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const year = String(parsed.getUTCFullYear());
  return `${day}/${month}/${year}`;
}

function normalizeBrDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseBrDateToIso(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${match[3]}-${match[2]}-${match[1]}`;
}

function isValidDate(value: string) {
  return parseBrDateToIso(value) !== null;
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
    discipleshipLessons,
    teachers,
    attendanceRecords,
    saveAttendance,
    deleteAttendance,
    getStudentsForClass,
  } = useSchoolData();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedLessonName, setSelectedLessonName] = useState('');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(formatDateToBr(todayDateIso()));
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [entriesByStudent, setEntriesByStudent] = useState<EntryMap>({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

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

  const classLessonOptions = useMemo(() => {
    const baseLessons = selectedClass?.lessonNames?.length
      ? selectedClass.lessonNames
      : discipleshipLessons;

    if (!selectedClassId) {
      return baseLessons;
    }

    const usedLessonNames = new Set(
      attendanceRecords
        .filter((record) => record.classId === selectedClassId && record.id !== editingId)
        .map((record) => record.lessonName)
        .filter(Boolean)
    );

    return baseLessons.filter((lessonName) => !usedLessonNames.has(lessonName));
  }, [selectedClass, discipleshipLessons, selectedClassId, attendanceRecords, editingId]);

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
    if (classLessonOptions.length === 0) {
      if (selectedLessonName) {
        setSelectedLessonName('');
      }
      return;
    }

    if (!selectedLessonName || !classLessonOptions.includes(selectedLessonName)) {
      setSelectedLessonName(classLessonOptions[0]);
    }
  }, [classLessonOptions, selectedLessonName]);

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
    setAttendanceDate(formatDateToBr(todayDateIso()));
    setNotes('');
    setSelectedLessonName(classLessonOptions[0] ?? '');

    const visibleStudentIds = classStudents.map((student) => student.id);
    setEntriesByStudent(buildEntriesMap(selectedClass, visibleStudentIds));
  };

  const onPickClass = (classId: string) => {
    setSelectedClassId(classId);
    const target = classes.find((item) => item.id === classId);
    const targetStudents = getStudentsForClass(classId);
    setEntriesByStudent(buildEntriesMap(target, targetStudents.map((student) => student.id)));
  };

  const onSave = async () => {
    if (isSavingAttendance) {
      return;
    }

    const isoDate = parseBrDateToIso(attendanceDate);
    if (!selectedClassId || selectedTeacherIds.length === 0 || !selectedClass || !selectedLessonName || !isoDate) {
      return;
    }

    setIsSavingAttendance(true);
    const result = await saveAttendance({
      id: editingId ?? undefined,
      classId: selectedClassId,
      lessonName: selectedLessonName,
      teacherIds: selectedTeacherIds,
      date: isoDate,
      notes,
      entries: classStudents.map((student) => ({
        studentId: student.id,
        status: entriesByStudent[student.id]?.status ?? 'present',
        note: entriesByStudent[student.id]?.note ?? '',
      })),
    });

    setIsSavingAttendance(false);

    if (!result.success) {
      Alert.alert('Não foi possível salvar', result.message ?? 'Verifique os dados e tente novamente.');
      return;
    }

    clearForm();
    setIsComposerOpen(false);
    Alert.alert('Chamada registrada', 'A chamada foi salva com sucesso.');
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
    setSelectedLessonName(record.lessonName);
    setSelectedTeacherIds(safeTeacherIds.length > 0 ? safeTeacherIds : teachers[0] ? [teachers[0].id] : []);
    setAttendanceDate(formatDateToBr(record.date));
    setNotes(record.notes);
    setEntriesByStudent(buildEntriesMap(classGroup, classStudentIds, entriesMap));
    setIsComposerOpen(true);
  };

  const saveDisabled =
    !selectedClass ||
    !selectedLessonName ||
    selectedTeacherIds.length === 0 ||
    classStudents.length === 0 ||
    !isValidDate(attendanceDate) ||
    isSavingAttendance;

  return (
    <ScreenShell
      title="Chamada"
      subtitle="Registre a presença por turma, com um ou mais professores, status atrasado e observação por aluno.">
      <Animated.View entering={FadeInDown.duration(460)}>
        <SectionCard
          title={editingId ? 'Editar chamada' : 'Nova chamada'}
          description={
            isComposerOpen
              ? 'Turma e pelo menos um professor são obrigatórios para salvar.'
              : 'Formulário fechado para manter a tela organizada.'
          }>
          {!isComposerOpen ? (
            <ButtonPrimary title="Abrir formulário de chamada" onPress={() => setIsComposerOpen(true)} />
          ) : (
            <>
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
                <FieldLabel>Aula</FieldLabel>
                {classLessonOptions.length === 0 ? (
                  <Text style={styles.validationText}>
                    Todas as aulas dessa turma já possuem chamada registrada.
                  </Text>
                ) : null}
                <View style={styles.chipWrap}>
                  {classLessonOptions.map((lessonName) => {
                    const active = selectedLessonName === lessonName;
                    return (
                      <Pressable
                        key={lessonName}
                        onPress={() => setSelectedLessonName(lessonName)}
                        style={({ pressed }) => [
                          styles.selectionChip,
                          active ? styles.selectionChipActive : null,
                          pressed ? styles.pressed : null,
                        ]}>
                        <Text style={[styles.selectionChipText, active ? styles.selectionChipTextActive : null]}>
                          {lessonName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View>
                <FieldLabel>Professores da aula (múltiplos)</FieldLabel>
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
                  onChangeText={(value) => setAttendanceDate(normalizeBrDateInput(value))}
                  placeholder="DD/MM/AAAA"
                  keyboardType="numbers-and-punctuation"
                  returnKeyType="done"
                />
                {!isValidDate(attendanceDate) ? (
                  <Text style={styles.validationText}>Use formato DD/MM/AAAA (ex.: 09/05/2026).</Text>
                ) : null}
              </View>

              <View>
                <FieldLabel>Observações gerais (opcional)</FieldLabel>
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
                    <Text style={styles.noStudents}>Esta turma ainda não possui alunos vinculados.</Text>
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
                          placeholder="Observação do aluno (opcional)"
                        />
                      </View>
                    ))
                  )}
                </View>
              ) : null}

              <View style={styles.actionsWrap}>
                <ButtonPrimary
                  title={editingId ? 'Salvar edição' : 'Registrar chamada'}
                  onPress={onSave}
                  disabled={saveDisabled}
                />
                {editingId ? <ButtonGhost title="Cancelar edição" onPress={clearForm} /> : null}
                <ButtonGhost
                  title="Fechar formulário"
                  onPress={() => {
                    clearForm();
                    setIsComposerOpen(false);
                  }}
                />
              </View>
            </>
          )}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(460)}>
        <SectionCard
          title="Historico"
          description="Use editar para corrigir presenças, professores ou observações de aulas anteriores.">
          {attendanceRecords.length === 0 ? (
            <EmptyMessage
              title="Sem histórico"
              description="As chamadas registradas aparecerão aqui em ordem recente."
            />
          ) : (
            attendanceRecords.map((record) => {
              const className = classes.find((item) => item.id === record.classId)?.name ?? 'Turma removida';
              const lessonName = record.lessonName || 'Aula não informada';
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
                    <TinyBadge label={formatDateToBr(record.date)} tone="neutral" />
                  </View>
                  <Text style={styles.historySub}>Aula: {lessonName}</Text>
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
                    <ButtonGhost
                      title="Apagar"
                      tone="danger"
                      onPress={() => {
                        Alert.alert(
                          'Apagar chamada?',
                          `Essa chamada da turma ${className} será removida permanentemente.`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Apagar',
                              style: 'destructive',
                              onPress: () => deleteAttendance(record.id),
                            },
                          ]
                        );
                      }}
                    />
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
