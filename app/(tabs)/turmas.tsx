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

export default function ClassGroupsScreen() {
  const {
    classes,
    discipleshipLessons,
    students,
    attendanceRecords,
    createClass,
    getClassDeleteImpact,
    deleteClass,
    createStudent,
    deleteStudent,
    assignStudentToClass,
    removeStudentFromClass,
    importStudentsFromCsv,
    getStudentsForClass,
    getClassesForStudent,
  } = useSchoolData();

  const [className, setClassName] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [studentForm, setStudentForm] = useState<StudentFormState>(initialStudentForm);
  const [selectedClassIdsForStudent, setSelectedClassIdsForStudent] = useState<string[]>([]);
  const [selectedClassIdsForImport, setSelectedClassIdsForImport] = useState<string[]>([]);
  const [csvText, setCsvText] = useState('');
  const [importMessage, setImportMessage] = useState('');

  const onCreateClass = () => {
    createClass(className, classDescription);
    setClassName('');
    setClassDescription('');
  };

  const onCreateStudent = () => {
    const studentId = createStudent({
      ...studentForm,
      classIds: selectedClassIdsForStudent,
    });

    if (!studentId) {
      return;
    }

    setStudentForm(initialStudentForm);
    setSelectedClassIdsForStudent([]);
  };

  const onDeleteStudent = (studentId: string, studentName: string) => {
    const linkedClasses = getClassesForStudent(studentId).length;

    Alert.alert(
      'Apagar cadastro do aluno?',
      `${studentName} será removido de ${linkedClasses} turma(s) e das chamadas relacionadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar aluno',
          style: 'destructive',
          onPress: () => {
            deleteStudent(studentId);
          },
        },
      ]
    );
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

  const toggleStudentClass = (studentId: string, classId: string) => {
    const isLinked = classes.find((item) => item.id === classId)?.studentIds.includes(studentId);
    if (isLinked) {
      removeStudentFromClass(classId, studentId);
      return;
    }

    assignStudentToClass(classId, studentId);
  };

  const onImportCsv = () => {
    const result = importStudentsFromCsv(csvText, selectedClassIdsForImport);
    const message = `Importados: ${result.created} | Ignorados: ${result.skipped}${
      result.errors.length > 0 ? ` | Erros: ${result.errors.length}` : ''
    }`;

    setImportMessage(message);
    if (result.created > 0) {
      setCsvText('');
    }

    if (result.errors.length > 0) {
      Alert.alert('Importação finalizada', result.errors.slice(0, 5).join('\n'));
    }
  };

  return (
    <ScreenShell
      title="Turmas"
      subtitle="Crie turmas e vincule alunos. Cada turma segue a grade fixa de aulas do discipulado.">
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

      <Animated.View entering={FadeInDown.delay(70).duration(450)}>
        <SectionCard
          title="Grade fixa de aulas"
          description="Toda turma cadastrada usa automaticamente esta sequência de aulas do discipulado.">
          <TinyBadge label={`Total de aulas: ${discipleshipLessons.length}`} tone="primary" />
          {discipleshipLessons.length === 0 ? (
            <Text style={styles.studentEmpty}>Não foi possível carregar a lista de aulas.</Text>
          ) : (
            <View style={styles.lessonList}>
              {discipleshipLessons.map((lessonName, index) => (
                <Text key={lessonName} style={styles.lessonItem}>
                  {index + 1}. {lessonName}
                </Text>
              ))}
            </View>
          )}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(140).duration(450)}>
        <SectionCard
          title="Cadastro completo de aluno"
          description="Dados principais do aluno e do responsável para secretaria e acompanhamento.">
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
                onChangeText={(value) => setStudentForm((previous) => ({ ...previous, birthDate: value }))}
                placeholder="AAAA-MM-DD"
              />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel>Telefone do aluno</FieldLabel>
              <AppInput
                value={studentForm.studentPhone}
                onChangeText={(value) => setStudentForm((previous) => ({ ...previous, studentPhone: value }))}
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
                onChangeText={(value) => setStudentForm((previous) => ({ ...previous, guardianName: value }))}
                placeholder="Ex.: Maria Souza"
              />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel>Telefone responsável</FieldLabel>
              <AppInput
                value={studentForm.guardianPhone}
                onChangeText={(value) => setStudentForm((previous) => ({ ...previous, guardianPhone: value }))}
                placeholder="(11) 98888-7777"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View>
            <FieldLabel>Endereço</FieldLabel>
            <AppInput
              value={studentForm.address}
              onChangeText={(value) => setStudentForm((previous) => ({ ...previous, address: value }))}
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

          <View>
            <FieldLabel>Vincular nas turmas</FieldLabel>
            <View style={styles.chipWrap}>
              {classes.map((classGroup) => {
                const active = selectedClassIdsForStudent.includes(classGroup.id);
                return (
                  <Pressable
                    key={classGroup.id}
                    onPress={() => setSelectedClassIdsForStudent((previous) => toggleId(previous, classGroup.id))}
                    style={({ pressed }) => [
                      styles.selectionChip,
                      active ? styles.selectionChipActive : null,
                      pressed ? styles.pressed : null,
                    ]}>
                    <Text style={[styles.selectionChipText, active ? styles.selectionChipTextActive : null]}>
                      {classGroup.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <ButtonPrimary
            title="Cadastrar aluno"
            onPress={onCreateStudent}
            disabled={!studentForm.name.trim()}
          />
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(210).duration(450)}>
        <SectionCard
          title="Importação CSV"
          description="Cole CSV com colunas: nome,nascimento,telefone,email,responsavel,telefone_responsavel,endereco,observacoes">
          <View>
            <FieldLabel>Turmas para vincular importados</FieldLabel>
            <View style={styles.chipWrap}>
              {classes.map((classGroup) => {
                const active = selectedClassIdsForImport.includes(classGroup.id);
                return (
                  <Pressable
                    key={classGroup.id}
                    onPress={() => setSelectedClassIdsForImport((previous) => toggleId(previous, classGroup.id))}
                    style={({ pressed }) => [
                      styles.selectionChip,
                      active ? styles.selectionChipActive : null,
                      pressed ? styles.pressed : null,
                    ]}>
                    <Text style={[styles.selectionChipText, active ? styles.selectionChipTextActive : null]}>
                      {classGroup.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View>
            <FieldLabel>Conteúdo CSV</FieldLabel>
            <AppInput
              value={csvText}
              onChangeText={setCsvText}
              placeholder="nome,nascimento,telefone,email,responsavel,telefone_responsavel,endereco,observacoes"
              multiline
              numberOfLines={6}
              style={{ minHeight: 130, textAlignVertical: 'top' }}
              autoCapitalize="none"
            />
          </View>
          <ButtonPrimary title="Importar CSV" onPress={onImportCsv} disabled={!csvText.trim()} />
          {importMessage ? <Text style={styles.importMessage}>{importMessage}</Text> : null}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(270).duration(450)}>
        <SectionCard
          title="Alunos cadastrados"
          description="Toque nas chips de turma para adicionar/remover o aluno em várias turmas.">
          {students.length === 0 ? (
            <EmptyMessage
              title="Sem alunos cadastrados"
              description="Cadastre manualmente ou use importação CSV para preencher mais rápido."
            />
          ) : (
            students.map((student) => {
              const linkedClassIds = getClassesForStudent(student.id).map((item) => item.id);

              return (
                <View key={student.id} style={styles.studentCard}>
                  <View style={styles.studentHeader}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.studentName}>{student.name}</Text>
                      <Text style={styles.studentMeta}>
                        {student.guardianName || 'Sem responsável'}
                        {student.guardianPhone ? ` | ${student.guardianPhone}` : ''}
                      </Text>
                    </View>
                    <ButtonGhost
                      title="Apagar cadastro"
                      tone="danger"
                      onPress={() => onDeleteStudent(student.id, student.name)}
                    />
                  </View>

                  <View style={styles.chipWrap}>
                    {classes.map((classGroup) => {
                      const active = linkedClassIds.includes(classGroup.id);
                      return (
                        <Pressable
                          key={`${student.id}-${classGroup.id}`}
                          onPress={() => toggleStudentClass(student.id, classGroup.id)}
                          style={({ pressed }) => [
                            styles.selectionChip,
                            active ? styles.selectionChipActive : null,
                            pressed ? styles.pressed : null,
                          ]}>
                          <Text style={[styles.selectionChipText, active ? styles.selectionChipTextActive : null]}>
                            {classGroup.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {student.notes ? <Text style={styles.studentNotes}>Observação: {student.notes}</Text> : null}
                </View>
              );
            })
          )}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(330).duration(450)}>
        <SectionCard
          title="Turmas cadastradas"
          description="Visão de cada turma com alerta de impacto antes de apagar.">
          {classes.length === 0 ? (
            <EmptyMessage
              title="Sem turmas ainda"
              description="Crie a primeira turma para iniciar as aulas do discipulado."
            />
          ) : (
            classes.map((classGroup) => {
              const classStudents = getStudentsForClass(classGroup.id);
              const attendanceLinked = attendanceRecords.filter((item) => item.classId === classGroup.id).length;

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

                  <ButtonGhost title="Apagar turma" tone="danger" onPress={() => onDeleteClass(classGroup.id)} />
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
  importMessage: {
    color: AppPalette.ink,
    fontSize: 13,
    fontFamily: AppTypography.bodyStrong,
  },
  lessonList: {
    gap: 6,
  },
  lessonItem: {
    color: AppPalette.ink,
    fontSize: 13,
    fontFamily: AppTypography.body,
    lineHeight: 19,
  },
  studentCard: {
    borderWidth: 1,
    borderColor: AppPalette.border,
    borderRadius: 12,
    padding: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  studentHeader: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentMeta: {
    color: AppPalette.inkMuted,
    fontSize: 12,
    fontFamily: AppTypography.body,
  },
  studentNotes: {
    color: AppPalette.ink,
    fontSize: 13,
    fontFamily: AppTypography.body,
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
});
