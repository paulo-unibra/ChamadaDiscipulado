import { Linking, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScreenShell } from '@/components/app/screen-shell';
import { ButtonGhost, SectionCard, TinyBadge } from '@/components/app/ui';
import { AppPalette, AppTypography } from '@/constants/ui';

const appVersion = 'v0.1 front local';

export default function SettingsScreen() {
  return (
    <ScreenShell
      title="Configuracoes"
      subtitle="Area para ajustes gerais, exportacao e futuras integracoes da secretaria.">
      <Animated.View entering={FadeInDown.duration(480)}>
        <SectionCard title="Estado atual" description="Primeira base do front em Expo Router com fluxo completo de chamada.">
          <View style={styles.rowWrap}>
            <TinyBadge label={appVersion} tone="neutral" />
            <TinyBadge label="Expo SDK 54" tone="primary" />
            <TinyBadge label="React 19" tone="success" />
          </View>
          <Text style={styles.bodyText}>
            Esta etapa prepara a experiencia de uso: turmas, professores, alunos e chamadas com edicao.
          </Text>
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(110).duration(480)}>
        <SectionCard title="Proximas funcionalidades" description="Sugestoes para a proxima sprint do app.">
          <View style={styles.bulletWrap}>
            <Text style={styles.bullet}>- Persistencia local com AsyncStorage/SQLite</Text>
            <Text style={styles.bullet}>- Backup e sincronizacao com backend</Text>
            <Text style={styles.bullet}>- Relatorios por periodo e exportacao PDF</Text>
            <Text style={styles.bullet}>- Controle de permissao por perfil (admin/professor)</Text>
          </View>
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(480)}>
        <SectionCard title="Links uteis" description="Atalhos para publicar e evoluir o projeto.">
          <ButtonGhost
            title="Abrir docs do Expo"
            onPress={() => Linking.openURL('https://docs.expo.dev')}
          />
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
