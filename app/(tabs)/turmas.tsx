import { useState } from 'react';
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
import { useSchoolData } from '@/context/school-data-context';
import { AppPalette, AppTypography } from '@/constants/ui';

type StudentFormState = {
  name: string;
  birthDate: string;
  studentPhone: string;
  email: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  notes: string;
};

const initialStudentForm: StudentFormState = {
  name: '',
  birthDate: '',
  studentPhone: '',
  email: '',
  guardianName: '',
  guardianPhone: '',
  address: '',
  notes: '',
};

function toggleId(values: string[], id: string) {
  return values.includes(id) ? values.filter((item) => item !== id) : [...values, id];
}

function extractPhoneDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 11);
}

function formatPhoneDigits(digits: string) {
  if (!digits) {
    return '';
  }

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function normalizePhoneInput(value: string) {
  return formatPhoneDigits(extractPhoneDigits(value));
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

export default function ClassGroupsScreen() {
  const {
    classes,
    students,
    attendanceRecords,
    createClass,
    getClassDeleteImpact,
    deleteClass,
    createStudent,
    assignStudentToClass,
    removeStudentFromClass,
    getStudentsForClass,
  } = useSchoolData();

  const [className, setClassName] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [classIdForAddStudents, setClassIdForAddStudents] = useState<string | null>(null);
  const [selectedExistingStudentIds, setSelectedExistingStudentIds] = useState<string[]>([]);
  const [isNewStudentFormVisible, setIsNewStudentFormVisible] = useState(false);
  const [studentForm, setStudentForm] = useState<StudentFormState>(initialStudentForm);

  const onCreateClass = () => {
    createClass(className, classDescription);
    setClassName('');
    setClassDescription('');
  };

  const onDeleteClass = (classId: string) => {
    const impact = getClassDeleteImpact(classId);

    Alert.alert(
      'Apagar turma?',
      `Isso removerá ${impact.attendanceCount} chamadas e desvinculará ${impact.studentsLinked} alunos desta turma.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar mesmo assim',
          style: 'destructive',
          onPress: () => {
            deleteClass(classId);
          },
        },
      ]
    );
  };

  const onToggleAddStudentsForClass = (classId: string) => {
    setClassIdForAddStudents((previous) => (previous === classId ? null : classId));
    setSelectedExistingStudentIds([]);
    setIsNewStudentFormVisible(false);
    setStudentForm(initialStudentForm);
  };

  const onAddExistingStudentsToClass = (classId: string) => {
    selectedExistingStudentIds.forEach((studentId) => {
      assignStudentToClass(classId, studentId);
    });

    setSelectedExistingStudentIds([]);
  };

  const onCreateStudentForClass = (classId: string) => {
    const trimmedBirthDate = studentForm.birthDate.trim();
    const birthDateIso = trimmedBirthDate ? parseBrDateToIso(trimmedBirthDate) : '';

    if (trimmedBirthDate && !birthDateIso) {
      Alert.alert('Data de nascimento inválida', 'Use o formato DD/MM/AAAA.');
      return;
    }

    const studentId = createStudent({
      ...studentForm,
      birthDate: birthDateIso || '',
      studentPhone: extractPhoneDigits(studentForm.studentPhone),
      guardianPhone: extractPhoneDigits(studentForm.guardianPhone),
      classIds: [classId],
    });

    if (!studentId) {
      return;
    }

    setStudentForm(initialStudentForm);
    setIsNewStudentFormVisible(false);
  };

  return (
    <ScreenShell
      title="Turmas"
      subtitle="Crie turmas e adicione alunos já cadastrados ou novos em cada turma.">
      <Animated.View entering={FadeInDown.duration(450)}>
        <SectionCard title="Nova turma" description="Monte as turmas por faixa etária, sala ou departamento.">
          <View>
            <FieldLabel>Nome da turma</FieldLabel>
            <AppInput
              value={className}
              onChangeText={setClassName}
              placeholder="Ex.: Juvenis Domingo Manhã"
              returnKeyType="next"
            />
          </View>
          <View>
            <FieldLabel>Descrição (opcional)</FieldLabel>
            <AppInput
              value={classDescription}
              onChangeText={setClassDescription}
              placeholder="Ex.: Sala 2, lição 7"
              returnKeyType="done"
            />
          </View>
          <ButtonPrimary title="Criar turma" onPress={onCreateClass} disabled={!className.trim()} />
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(90).duration(450)}>
        <SectionCard
          title="Turmas cadastradas"
          description="Abra uma turma para adicionar alunos existentes ou criar um novo aluno nela.">
          {classes.length === 0 ? (
            <EmptyMessage
              title="Sem turmas ainda"
              description="Crie a primeira turma para iniciar as aulas do discipulado."
            />
          ) : (
            classes.map((classGroup) => {
              const classStudents = getStudentsForClass(classGroup.id);
              const attendanceLinked = attendanceRecords.filter((item) => item.classId === classGroup.id).length;
              const isAddOpen = classIdForAddStudents === classGroup.id;
              const availableStudents = students.filter((student) => !classGroup.studentIds.includes(student.id));

              return (
                <View key={classGroup.id} style={styles.classItem}>
                  <View style={styles.classHeader}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={styles.classTitle}>{classGroup.name}</Text>
                      {classGroup.description ? (
                        <Text style={styles.classDescription}>{classGroup.description}</Text>
                      ) : null}
                    </View>
                    <TinyBadge label={`${classStudents.length} alunos`} tone="neutral" />
                  </View>

                  <Text style={styles.warningText}>
                    {attendanceLinked > 0
                      ? `Aviso: esta turma possui ${attendanceLinked} chamada(s) no histórico.`
                      : 'Sem chamadas vinculadas no momento.'}
                  </Text>

                  <View style={styles.studentList}>
                    {classStudents.length === 0 ? (
                      <Text style={styles.studentEmpty}>Nenhum aluno vinculado nesta turma.</Text>
                    ) : (
                      classStudents.map((student) => (
                        <View key={student.id} style={styles.studentRow}>
                          <Text style={styles.studentName}>{student.name}</Text>
                          <ButtonGhost
                            title="Remover da turma"
                            tone="danger"
                            onPress={() => removeStudentFromClass(classGroup.id, student.id)}
                          />
                        </View>
                      ))
                    )}
                  </View>

                  <View style={styles.actionsWrap}>
                    <ButtonGhost
                      title={isAddOpen ? 'Fechar adição de alunos' : 'Adicionar alunos'}
                      tone="success"
                      onPress={() => onToggleAddStudentsForClass(classGroup.id)}
                    />
                    <ButtonGhost title="Apagar turma" tone="danger" onPress={() => onDeleteClass(classGroup.id)} />
                  </View>

                  {isAddOpen ? (
                    <View style={styles.addPanel}>
                      <FieldLabel>Alunos já cadastrados</FieldLabel>
                      {availableStudents.length === 0 ? (
                        <Text style={styles.studentEmpty}>Todos os alunos cadastrados já estão nesta turma.</Text>
                      ) : (
                        <View style={styles.chipWrap}>
                          {availableStudents.map((student) => {
                            const active = selectedExistingStudentIds.includes(student.id);
                            return (
                              <Pressable
                                key={student.id}
                                onPress={() =>
                                  setSelectedExistingStudentIds((previous) => toggleId(previous, student.id))
                                }
                                style={({ pressed }) => [
                                  styles.selectionChip,
                                  active ? styles.selectionChipActive : null,
                                  pressed ? styles.pressed : null,
                                ]}>
                                <Text style={[styles.selectionChipText, active ? styles.selectionChipTextActive : null]}>
                                  {student.name}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}

                      <ButtonPrimary
                        title="Adicionar selecionados"
                        onPress={() => onAddExistingStudentsToClass(classGroup.id)}
                        disabled={selectedExistingStudentIds.length === 0}
                      />

                      <View style={styles.divider} />

                      <ButtonGhost
                        title={isNewStudentFormVisible ? 'Cancelar novo aluno' : 'Criar novo aluno'}
                        tone="success"
                        onPress={() => {
                          setIsNewStudentFormVisible((previous) => !previous);
                          setStudentForm(initialStudentForm);
                        }}
                      />

                      {isNewStudentFormVisible ? (
                        <View style={styles.newStudentForm}>
                          <View>
                            <FieldLabel>Nome completo *</FieldLabel>
                            <AppInput
                              value={studentForm.name}
                              onChangeText={(value) => setStudentForm((previous) => ({ ...previous, name: value }))}
                              placeholder="Ex.: Ana Beatriz Souza"
                            />
                          </View>

                          <View style={styles.gridTwo}>
                            <View style={{ flex: 1 }}>
                              <FieldLabel>Nascimento</FieldLabel>
                              <AppInput
                                value={studentForm.birthDate}
                                onChangeText={(value) =>
                                  setStudentForm((previous) => ({
                                    ...previous,
                                    birthDate: normalizeBrDateInput(value),
                                  }))
                                }
                                placeholder="DD/MM/AAAA"
                                keyboardType="numbers-and-punctuation"
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <FieldLabel>Telefone do aluno</FieldLabel>
                              <AppInput
                                value={studentForm.studentPhone}
                                onChangeText={(value) =>
                                  setStudentForm((previous) => ({
                                    ...previous,
                                    studentPhone: normalizePhoneInput(value),
                                  }))
                                }
                                placeholder="(11) 99999-9999"
                                keyboardType="phone-pad"
                              />
                            </View>
                          </View>

                          <View>
                            <FieldLabel>E-mail</FieldLabel>
                            <AppInput
                              value={studentForm.email}
                              onChangeText={(value) => setStudentForm((previous) => ({ ...previous, email: value }))}
                              placeholder="aluno@email.com"
                              keyboardType="email-address"
                              autoCapitalize="none"
                            />
                          </View>

                          <View style={styles.gridTwo}>
                            <View style={{ flex: 1 }}>
                              <FieldLabel>Responsável</FieldLabel>
                              <AppInput
                                value={studentForm.guardianName}
                                onChangeText={(value) =>
                                  setStudentForm((previous) => ({ ...previous, guardianName: value }))
                                }
                                placeholder="Ex.: Maria Souza"
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <FieldLabel>Telefone responsável</FieldLabel>
                              <AppInput
                                value={studentForm.guardianPhone}
                                onChangeText={(value) =>
                                  setStudentForm((previous) => ({
                                    ...previous,
                                    guardianPhone: normalizePhoneInput(value),
                                  }))
                                }
                                placeholder="(11) 98888-7777"
                                keyboardType="phone-pad"
                              />
                            </View>
                          </View>

                          <View>
                            <FieldLabel>Endereço</FieldLabel>
                            <AppInput
                              value={studentForm.address}
                              onChangeText={(value) =>
                                setStudentForm((previous) => ({ ...previous, address: value }))
                              }
                              placeholder="Rua, número, bairro"
                            />
                          </View>

                          <View>
                            <FieldLabel>Observações</FieldLabel>
                            <AppInput
                              value={studentForm.notes}
                              onChangeText={(value) => setStudentForm((previous) => ({ ...previous, notes: value }))}
                              placeholder="Alergia, necessidade especial, etc."
                              multiline
                              numberOfLines={3}
                              style={{ minHeight: 74, textAlignVertical: 'top' }}
                            />
                          </View>

                          <ButtonPrimary
                            title="Criar e adicionar nesta turma"
                            onPress={() => onCreateStudentForClass(classGroup.id)}
                            disabled={!studentForm.name.trim()}
                          />
                        </View>
                      ) : null}
                    </View>
                  ) : null}
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
  classItem: {
    borderWidth: 1,
    borderColor: AppPalette.border,
    borderRadius: 14,
    padding: 10,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  gridTwo: {
    flexDirection: 'row',
    gap: 8,
  },
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
  pressed: {
    opacity: 0.85,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  classTitle: {
    color: AppPalette.ink,
    fontSize: 15,
    fontFamily: AppTypography.bodyStrong,
  },
  classDescription: {
    color: AppPalette.inkMuted,
    fontSize: 13,
    fontFamily: AppTypography.body,
  },
  studentList: {
    gap: 8,
  },
  warningText: {
    color: AppPalette.inkMuted,
    fontSize: 12,
    fontFamily: AppTypography.body,
  },
  studentEmpty: {
    color: AppPalette.inkMuted,
    fontSize: 13,
    fontFamily: AppTypography.body,
  },
  studentRow: {
    borderWidth: 1,
    borderColor: AppPalette.border,
    borderRadius: 10,
    padding: 8,
    backgroundColor: '#FFFCF8',
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
  actionsWrap: {
    gap: 8,
  },
  addPanel: {
    borderTopWidth: 1,
    borderTopColor: AppPalette.border,
    paddingTop: 10,
    gap: 10,
  },
  divider: {
    height: 1,
    backgroundColor: AppPalette.border,
  },
  newStudentForm: {
    gap: 10,
  },
});
