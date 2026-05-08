import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScreenShell } from '@/components/app/screen-shell';
import { ButtonGhost, SectionCard, TinyBadge } from '@/components/app/ui';
import { useSchoolData } from '@/context/school-data-context';
import { AppPalette, AppTypography } from '@/constants/ui';

function fakeExport(kind: string) {
  const timestamp = new Date().toISOString();
  Alert.alert('Exportacao simulada', `${kind} gerado com sucesso (mock) em ${timestamp}.`);
}

export default function ReportsScreen() {
  const { classes, students, teachers, attendanceRecords, modeLabel } = useSchoolData();

  return (
    <ScreenShell
      title="Relatorios"
      subtitle="Area dedicada para analises e exportacoes. Nesta fase, exportacao ainda esta em modo mock.">
      <Animated.View entering={FadeInDown.duration(470)}>
        <SectionCard title="Resumo rapido" description="Indicadores gerais para secretaria e lideranca.">
          <View style={styles.rowWrap}>
            <TinyBadge label={`Turmas: ${classes.length}`} tone="neutral" />
            <TinyBadge label={`Alunos: ${students.length}`} tone="primary" />
            <TinyBadge label={`Professores: ${teachers.length}`} tone="success" />
            <TinyBadge label={`Chamadas: ${attendanceRecords.length}`} tone="neutral" />
          </View>
          <Text style={styles.bodyText}>Modo atual: {modeLabel}</Text>
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(110).duration(470)}>
        <SectionCard title="Tipos de exportacao" description="Atalhos para exportar em multiplos formatos.">
          <View style={styles.buttonsWrap}>
            <ButtonGhost title="Exportar PDF (geral)" onPress={() => fakeExport('PDF geral')} />
            <ButtonGhost title="Exportar Excel (geral)" onPress={() => fakeExport('Excel geral')} />
            <ButtonGhost title="Exportar por turma" onPress={() => fakeExport('Relatorio por turma')} />
            <ButtonGhost title="Exportar por periodo" onPress={() => fakeExport('Relatorio por periodo')} />
            <ButtonGhost title="Compartilhar no WhatsApp" onPress={() => fakeExport('Pacote WhatsApp')} />
          </View>
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(470)}>
        <SectionCard title="Planejamento API" description="Proximas rotas para sincronizacao online real.">
          <View style={styles.bulletWrap}>
            <Text style={styles.bullet}>- POST /students/import-csv</Text>
            <Text style={styles.bullet}>- POST /attendance/export/pdf</Text>
            <Text style={styles.bullet}>- POST /attendance/export/excel</Text>
            <Text style={styles.bullet}>- GET /reports/period?start=YYYY-MM-DD&end=YYYY-MM-DD</Text>
          </View>
          <ButtonGhost title="Abrir docs do Expo" onPress={() => Linking.openURL('https://docs.expo.dev')} />
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bodyText: {
    color: AppPalette.ink,
    fontSize: 14,
    fontFamily: AppTypography.body,
    lineHeight: 20,
  },
  buttonsWrap: {
    gap: 8,
  },
  bulletWrap: {
    gap: 6,
  },
  bullet: {
    color: AppPalette.ink,
    fontSize: 14,
    fontFamily: AppTypography.body,
    lineHeight: 20,
  },
});
