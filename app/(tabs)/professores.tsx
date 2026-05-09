import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
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
import { AppPalette, AppTypography } from '@/constants/ui';
import { useSchoolData } from '@/context/school-data-context';

export default function TeachersScreen() {
  const { teachers, createTeacher, getTeacherDeleteImpact, deleteTeacher } =
    useSchoolData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isCreatingTeacher, setIsCreatingTeacher] = useState(false);

  const onCreateTeacher = async () => {
    if (isCreatingTeacher) {
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Nome obrigatorio', 'Informe o nome do professor para cadastrar.');
      return;
    }

    setIsCreatingTeacher(true);
    const result = await createTeacher(trimmedName, phone);
    setIsCreatingTeacher(false);

    if (!result.success) {
      Alert.alert('Nao foi possivel cadastrar', result.message ?? 'Tente novamente em instantes.');
      return;
    }

    setName('');
    setPhone('');
    Alert.alert('Cadastro concluido', `${trimmedName} foi cadastrado com sucesso.`);
  };

  const onDeleteTeacher = (teacherId: string, teacherName: string) => {
    const impact = getTeacherDeleteImpact(teacherId);

    Alert.alert(
      "Apagar professor?",
      `${teacherName} sera removido do cadastro. ${impact.attendanceCount} chamada(s) ficarao sem este professor.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar mesmo assim',
          style: 'destructive',
          onPress: () => {
            deleteTeacher(teacherId);
          },
        },
      ],
    );
  };

  return (
    <ScreenShell
      title="Professores"
      subtitle="Cadastre os professores da EBD para vincular cada chamada a um ou mais responsaveis da aula."
    >
      <Animated.View entering={FadeInDown.duration(450)}>
        <SectionCard
          title="Novo professor"
          description="Nome e contato rapido para referencia da secretaria."
        >
          <View>
            <FieldLabel>Nome completo</FieldLabel>
            <AppInput
              value={name}
              onChangeText={setName}
              placeholder="Ex.: Pr. Marcos Silva"
              returnKeyType="next"
            />
          </View>
          <View>
            <FieldLabel>Telefone (opcional)</FieldLabel>
            <AppInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Ex.: (11) 99999-9999"
              keyboardType="phone-pad"
              returnKeyType="done"
            />
          </View>
          <ButtonPrimary
            title="Cadastrar professor"
            onPress={onCreateTeacher}
            disabled={!name.trim() || isCreatingTeacher}
          />
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(90).duration(450)}>
        <SectionCard
          title="Equipe"
          description="Professores disponiveis para selecao na tela de chamada."
        >
          {teachers.length === 0 ? (
            <EmptyMessage
              title="Nenhum professor cadastrado"
              description="Cadastre pelo menos um professor para liberar o registro de chamada."
            />
          ) : (
            teachers.map((teacher) => (
              <View key={teacher.id} style={styles.teacherRow}>
                <View style={styles.teacherMain}>
                  <Text style={styles.teacherName}>{teacher.name}</Text>
                  <Text style={styles.teacherPhone}>
                    {teacher.phone || 'Sem telefone informado'}
                  </Text>
                </View>
                <TinyBadge label="Ativo" tone="success" />
                <ButtonGhost
                  title="Apagar"
                  tone="danger"
                  onPress={() => onDeleteTeacher(teacher.id, teacher.name)}
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
  teacherRow: {
    borderWidth: 1,
    borderColor: AppPalette.border,
    borderRadius: 12,
    padding: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  teacherMain: {
    gap: 2,
  },
  teacherName: {
    color: AppPalette.ink,
    fontSize: 15,
    fontFamily: AppTypography.bodyStrong,
  },
  teacherPhone: {
    color: AppPalette.inkMuted,
    fontSize: 13,
    fontFamily: AppTypography.body,
  },
});
