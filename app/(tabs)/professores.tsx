import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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

export default function TeachersScreen() {
  const { teachers, createTeacher, deleteTeacher } = useSchoolData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const onCreateTeacher = () => {
    createTeacher(name, phone);
    setName('');
    setPhone('');
  };

  return (
    <ScreenShell
      title="Professores"
      subtitle="Cadastre os professores da EBD para vincular cada chamada ao responsavel da aula.">
      <Animated.View entering={FadeInDown.duration(450)}>
        <SectionCard title="Novo professor" description="Nome e contato rapido para referencia da secretaria.">
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
          <ButtonPrimary title="Cadastrar professor" onPress={onCreateTeacher} disabled={!name.trim()} />
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(90).duration(450)}>
        <SectionCard title="Equipe" description="Professores disponiveis para selecao na tela de chamada.">
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
                  <Text style={styles.teacherPhone}>{teacher.phone || 'Sem telefone informado'}</Text>
                </View>
                <TinyBadge label="Ativo" tone="success" />
                <ButtonGhost title="Apagar" tone="danger" onPress={() => deleteTeacher(teacher.id)} />
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
