import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { AppPalette, AppTypography } from '@/constants/ui';
import { useSchoolData } from '@/context/school-data-context';

const INITIAL_SECTIONS = [
  { id: 'students', label: 'Cadastro de alunos', fields: ['Nome', 'Data de nascimento', 'Telefone do aluno', 'E-mail', 'Nome do responsável', 'Telefone do responsável', 'Endereço', 'Observações'] },
  { id: 'classes', label: 'Turmas', fields: ['Nome da turma', 'Descrição'] },
  { id: 'teachers', label: 'Professores', fields: ['Nome', 'Telefone'] },
  { id: 'attendance', label: 'Chamadas', fields: ['Turma', 'Lição', 'Professor(es)', 'Data', 'Presenças', 'Observações'] },
];

type Config = { enabled: boolean; formUrl: string; sections: Record<string, boolean>; fields: Record<string, boolean> };
const EMPTY_CONFIG: Config = { enabled: false, formUrl: '', sections: {}, fields: {} };
const STORAGE_KEY = '@chamada:integracoes:google-forms';

export default function IntegracoesScreen() {
  const { discipleshipLessons } = useSchoolData();
  const [config, setConfig] = useState<Config>(EMPTY_CONFIG);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setConfig({ ...EMPTY_CONFIG, ...JSON.parse(stored) as Partial<Config> });
    } catch { /* Usa as configurações padrão quando não houver dados válidos. */ }
  }, []);

  const update = (next: Config) => { setConfig(next); setSaved(false); };
  const toggleSection = (id: string, value: boolean) => update({ ...config, sections: { ...config.sections, [id]: value } });
  const toggleField = (id: string, value: boolean) => update({ ...config, fields: { ...config.fields, [id]: value } });
  const save = () => {
    if (Platform.OS === 'web') localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSaved(true);
  };
  const sections = INITIAL_SECTIONS.map((section) => section.id === 'attendance'
    ? { ...section, fields: [...section.fields, ...discipleshipLessons] }
    : section);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <View><Text style={styles.title}>Integrações</Text><Text style={styles.subtitle}>Conecte os dados da congregação a serviços externos.</Text></View>
        <View style={styles.badge}><MaterialIcons name="settings" size={15} color="#426A9D" /><Text style={styles.badgeText}>POR CONGREGAÇÃO</Text></View>
      </View>

      <View style={styles.card}>
        <View style={styles.integrationHeader}>
          <View style={styles.googleIcon}><MaterialIcons name="description" size={23} color="#4285F4" /></View>
          <View style={styles.integrationCopy}><Text style={styles.integrationName}>Google Forms</Text><Text style={styles.integrationDescription}>Compartilhe dados selecionados com um formulário Google.</Text></View>
          <View style={styles.switchGroup}><Text style={[styles.status, config.enabled ? styles.statusOn : null]}>{config.enabled ? 'Ativada' : 'Desativada'}</Text><Switch value={config.enabled} onValueChange={(enabled) => update({ ...config, enabled })} trackColor={{ false: '#D0D5DD', true: '#83B1E8' }} thumbColor={config.enabled ? AppPalette.primary : '#F9FAFB'} accessibilityLabel="Ativar integração Google Forms" /></View>
        </View>
        <View style={styles.divider} />
        <Text style={styles.label}>Link do formulário</Text>
        <TextInput value={config.formUrl} onChangeText={(formUrl) => update({ ...config, formUrl })} placeholder="https://docs.google.com/forms/..." placeholderTextColor="#98A2B3" editable={config.enabled} style={[styles.input, !config.enabled ? styles.disabled : null]} autoCapitalize="none" keyboardType="url" />
        <Text style={styles.helper}>Cole o link de edição do formulário. Você poderá vincular as seções e os campos abaixo.</Text>
      </View>

      <View style={[styles.card, !config.enabled ? styles.cardDisabled : null]}>
        <Text style={styles.cardTitle}>Seções compartilhadas</Text>
        <Text style={styles.cardHint}>Escolha quais partes do sistema poderão ser enviadas ao formulário.</Text>
        {sections.map((section) => <View key={section.id} style={styles.sectionRow}>
          <View style={styles.sectionTop}><View style={styles.sectionTitleWrap}><MaterialIcons name="drag-indicator" size={18} color="#98A2B3" /><Text style={styles.sectionTitle}>{section.label}</Text></View><Switch value={Boolean(config.sections[section.id])} onValueChange={(value) => toggleSection(section.id, value)} disabled={!config.enabled} trackColor={{ false: '#D0D5DD', true: '#83B1E8' }} thumbColor={config.sections[section.id] ? AppPalette.primary : '#F9FAFB'} accessibilityLabel={`Compartilhar seção ${section.label}`} /></View>
          {config.sections[section.id] ? <View style={styles.fields}><Text style={styles.fieldCaption}>CAMPOS INCLUÍDOS</Text>{section.fields.map((field) => {
            const id = `${section.id}:${field}`;
            const selected = config.fields[id] ?? true;
            return <Pressable key={id} onPress={() => toggleField(id, !selected)} style={styles.fieldRow} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}><MaterialIcons name={selected ? 'check-box' : 'check-box-outline-blank'} size={19} color={selected ? AppPalette.primary : '#98A2B3'} /><Text style={styles.fieldText}>{field}</Text></Pressable>;
          })}</View> : null}
        </View>)}
        {!config.enabled ? <Text style={styles.disabledHint}>Ative a integração para configurar seções e campos.</Text> : null}
      </View>

      <View style={styles.actions}><Text style={styles.saved}>{saved ? 'Configurações salvas neste dispositivo.' : ''}</Text><Pressable onPress={save} style={({ pressed }) => [styles.saveButton, pressed ? styles.savePressed : null]}><MaterialIcons name="save" size={18} color="#FFFFFF" /><Text style={styles.saveText}>Salvar configurações</Text></Pressable></View>
      <Text style={styles.note}>As integrações ficam desativadas por padrão. A seleção de uma seção inclui todos os campos inicialmente; ajuste os campos individualmente conforme necessário.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: AppPalette.background }, content: { width: '100%', maxWidth: 1040, alignSelf: 'center', padding: 28, gap: 18 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 2 }, title: { color: '#26364B', fontSize: 24, fontFamily: AppTypography.bodyStrong }, subtitle: { color: '#7B8794', fontSize: 13, fontFamily: AppTypography.body, marginTop: 5 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, backgroundColor: '#EAF1FA' }, badgeText: { color: '#426A9D', fontSize: 9, letterSpacing: 0.7, fontFamily: AppTypography.bodyStrong },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E6EAF0', padding: 20 }, cardDisabled: { opacity: 0.82 }, integrationHeader: { flexDirection: 'row', alignItems: 'center', gap: 13 }, googleIcon: { height: 44, width: 44, borderRadius: 11, backgroundColor: '#F1F6FD', alignItems: 'center', justifyContent: 'center' }, integrationCopy: { flex: 1 }, integrationName: { color: '#26364B', fontSize: 16, fontFamily: AppTypography.bodyStrong }, integrationDescription: { color: '#7B8794', fontSize: 12, fontFamily: AppTypography.body, marginTop: 3 }, switchGroup: { flexDirection: 'row', alignItems: 'center', gap: 9 }, status: { color: '#7B8794', fontSize: 11, fontFamily: AppTypography.bodyStrong }, statusOn: { color: '#198754' }, divider: { height: 1, backgroundColor: '#EEF0F3', marginVertical: 18 }, label: { color: '#344054', fontSize: 12, fontFamily: AppTypography.bodyStrong, marginBottom: 7 }, input: { height: 42, paddingHorizontal: 12, color: '#344054', borderWidth: 1, borderColor: '#D9DEE7', borderRadius: 8, fontFamily: AppTypography.body, fontSize: 13, outlineStyle: 'none' } as never, disabled: { backgroundColor: '#F6F7F9', color: '#98A2B3' }, helper: { color: '#98A2B3', fontSize: 11, fontFamily: AppTypography.body, marginTop: 7 },
  cardTitle: { color: '#26364B', fontSize: 15, fontFamily: AppTypography.bodyStrong }, cardHint: { color: '#7B8794', fontSize: 12, fontFamily: AppTypography.body, marginTop: 4, marginBottom: 9 }, sectionRow: { borderTopWidth: 1, borderTopColor: '#EEF0F3', paddingVertical: 10 }, sectionTop: { minHeight: 39, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 }, sectionTitle: { color: '#344054', fontSize: 13, fontFamily: AppTypography.bodyStrong }, fields: { marginTop: 7, marginLeft: 25, padding: 11, backgroundColor: '#F8FAFC', borderRadius: 8 }, fieldCaption: { color: '#98A2B3', fontSize: 9, letterSpacing: 0.8, fontFamily: AppTypography.bodyStrong, marginBottom: 5 }, fieldRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 8 }, fieldText: { color: '#5B6B7F', fontSize: 12, fontFamily: AppTypography.body }, disabledHint: { color: '#98A2B3', fontSize: 11, fontFamily: AppTypography.body, marginTop: 5 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, saved: { color: '#198754', fontFamily: AppTypography.body, fontSize: 11 }, saveButton: { minHeight: 42, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8, backgroundColor: AppPalette.primary }, savePressed: { opacity: 0.85 }, saveText: { color: '#FFFFFF', fontFamily: AppTypography.bodyStrong, fontSize: 12 }, note: { color: '#98A2B3', fontFamily: AppTypography.body, fontSize: 11, lineHeight: 17 },
});
