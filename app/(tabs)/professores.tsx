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

function formatPhoneForDisplay(value: string) {
  return formatPhoneDigits(extractPhoneDigits(value));
}

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
      Alert.alert('Nome obrigatório', 'Informe o nome do professor para cadastrar.');
      return;
    }

    setIsCreatingTeacher(true);
    const result = await createTeacher(trimmedName, extractPhoneDigits(phone));
    setIsCreatingTeacher(false);

    if (!result.success) {
      Alert.alert('Não foi possível cadastrar', result.message ?? 'Tente novamente em instantes.');
      return;
    }

    setName('');
    setPhone('');
    Alert.alert('Cadastro concluído', `${trimmedName} foi cadastrado com sucesso.`);
  };

  const onDeleteTeacher = (teacherId: string, teacherName: string) => {
    const impact = getTeacherDeleteImpact(teacherId);

    Alert.alert(
      "Apagar professor?",
      `${teacherName} será removido do cadastro. ${impact.attendanceCount} chamada(s) ficarão sem este professor.`,
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
      subtitle="Cadastre os professores da EBD para vincular cada chamada a um ou mais responsáveis da aula."
    >
      <Animated.View entering={FadeInDown.duration(450)}>
        <SectionCard
          title="Novo professor"
          description="Nome e contato rápido para referência da secretaria."
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
              onChangeText={(value) => setPhone(normalizePhoneInput(value))}
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
          description="Professores disponíveis para seleção na tela de chamada."
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
                    {formatPhoneForDisplay(teacher.phone) || 'Sem telefone informado'}
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
    padding: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  teacherMain: {
    flex: 1,
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
