import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScreenShell } from '@/components/app/screen-shell';
import {
  AppInput,
  ButtonGhost,
  ButtonPrimary,
  Divider,
  EmptyMessage,
  FieldLabel,
  SectionCard,
  TinyBadge,
} from '@/components/app/ui';
import { useSchoolData } from '@/context/school-data-context';
import { AppPalette, AppTypography } from '@/constants/ui';

type StudentFormMap = Record<string, string>;

export default function ClassGroupsScreen() {
  const { classes, createClass, deleteClass, addStudent, deleteStudent } = useSchoolData();
  const [className, setClassName] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [studentByClass, setStudentByClass] = useState<StudentFormMap>({});

  const onCreateClass = () => {
    createClass(className, classDescription);
    setClassName('');
    setClassDescription('');
  };

  const onAddStudent = (classId: string) => {
    const studentName = studentByClass[classId] ?? '';
    addStudent(classId, studentName);
    setStudentByClass((previous) => ({ ...previous, [classId]: '' }));
  };

  return (
    <ScreenShell
      title="Turmas"
      subtitle="Crie turmas da EBD, cadastre alunos e remova registros quando necessario.">
      <Animated.View entering={FadeInDown.duration(450)}>
        <SectionCard title="Nova turma" description="Comece montando as classes por faixa etaria ou departamento.">
          <View>
            <FieldLabel>Nome da turma</FieldLabel>
            <AppInput
              value={className}
              onChangeText={setClassName}
              placeholder="Ex.: Juvenis Domingo Manha"
              returnKeyType="next"
            />
          </View>
          <View>
            <FieldLabel>Descricao (opcional)</FieldLabel>
            <AppInput
              value={classDescription}
              onChangeText={setClassDescription}
              placeholder="Ex.: Sala 2, licao 7"
              returnKeyType="done"
            />
          </View>
          <ButtonPrimary title="Criar turma" onPress={onCreateClass} disabled={!className.trim()} />
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(90).duration(450)}>
        <SectionCard
          title="Turmas cadastradas"
          description="Cada turma possui seu proprio cadastro de alunos.">
          {classes.length === 0 ? (
            <EmptyMessage
              title="Sem turmas ainda"
              description="Crie a primeira turma para habilitar o cadastro de alunos e a chamada."
            />
          ) : (
            classes.map((classGroup) => (
              <View key={classGroup.id} style={styles.classItem}>
                <View style={styles.classHeader}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.classTitle}>{classGroup.name}</Text>
                    {classGroup.description ? (
                      <Text style={styles.classDescription}>{classGroup.description}</Text>
                    ) : null}
                  </View>
                  <TinyBadge label={`${classGroup.students.length} alunos`} tone="neutral" />
                </View>

                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <FieldLabel>Novo aluno</FieldLabel>
                    <AppInput
                      value={studentByClass[classGroup.id] ?? ''}
                      onChangeText={(value) =>
                        setStudentByClass((previous) => ({ ...previous, [classGroup.id]: value }))
                      }
                      placeholder="Nome completo do aluno"
                    />
                  </View>
                  <View style={styles.addButtonWrap}>
                    <ButtonPrimary
                      title="Adicionar"
                      onPress={() => onAddStudent(classGroup.id)}
                      disabled={!(studentByClass[classGroup.id] ?? '').trim()}
                    />
                  </View>
                </View>

                <View style={styles.studentList}>
                  {classGroup.students.length === 0 ? (
                    <Text style={styles.studentEmpty}>Nenhum aluno cadastrado nesta turma.</Text>
                  ) : (
                    classGroup.students.map((student) => (
                      <View key={student.id} style={styles.studentRow}>
                        <Text style={styles.studentName}>{student.name}</Text>
                        <ButtonGhost
                          title="Apagar aluno"
                          tone="danger"
                          onPress={() => deleteStudent(classGroup.id, student.id)}
                        />
                      </View>
                    ))
                  )}
                </View>

                <Divider />
                <ButtonGhost
                  title="Apagar turma"
                  tone="danger"
                  onPress={() => deleteClass(classGroup.id)}
                />
              </View>
            ))
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
  formRow: {
    gap: 8,
  },
  addButtonWrap: {
    width: 140,
  },
  studentList: {
    gap: 8,
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
