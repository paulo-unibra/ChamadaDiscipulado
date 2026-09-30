import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { API_BASE_URL } from '@/constants/api';
import { AppPalette, AppTypography } from '@/constants/ui';
import type { AttendanceRecord, AttendanceStatus, ClassGroup, Student, Teacher } from '@/context/school-data-context';

type ReportData = {
  classes: ClassGroup[];
  discipleshipLessons: string[];
  students: Student[];
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
};

type AuditEntry = {
  id: string;
  action: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
};

type StatusCount = Record<AttendanceStatus, number> & { total: number; percent: number };

const EMPTY_DATA: ReportData = {
  classes: [],
  discipleshipLessons: [],
  students: [],
  teachers: [],
  attendanceRecords: [],
};

const STATUS_META: Record<AttendanceStatus, { label: string; title: string; color: string; background: string }> = {
  present: { label: 'P', title: 'Presente', color: AppPalette.success, background: AppPalette.successSoft },
  late: { label: 'A', title: 'Atrasado', color: AppPalette.primary, background: AppPalette.primarySoft },
  absent: { label: 'F', title: 'Falta', color: AppPalette.danger, background: AppPalette.dangerSoft },
  justified: { label: 'J', title: 'Justificada', color: AppPalette.accent, background: AppPalette.accentSoft },
};

const AUDIT_ACTIONS: Record<string, string> = {
  'class.create': 'Turma criada',
  'class.delete': 'Turma apagada',
  'student.create': 'Aluno criado',
  'student.delete': 'Aluno apagado',
  'class_students.assign': 'Aluno vinculado à turma',
  'class_students.remove': 'Aluno removido da turma',
  'teacher.create': 'Professor criado',
  'teacher.delete': 'Professor apagado',
  'attendance.save': 'Chamada salva/atualizada',
  'attendance.delete': 'Chamada apagada',
};

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Accept: 'application/json' } });
  const body = await response.text();
  let payload: unknown = {};
  if (body) {
    try {
      payload = JSON.parse(body);
    } catch {
      payload = { message: body };
    }
  }
  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'message' in payload
      ? String((payload as { message: string }).message)
      : `Falha HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function parseDate(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

function shortDate(value: string) {
  const parts = value.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : value;
}

function longDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
}

function getStudentCounts(studentId: string, records: AttendanceRecord[]): StatusCount {
  const counts: StatusCount = { present: 0, absent: 0, justified: 0, late: 0, total: 0, percent: 0 };
  records.forEach((record) => {
    const entry = record.entries.find((item) => item.studentId === studentId);
    if (!entry) return;
    counts[entry.status] += 1;
    counts.total += 1;
  });
  counts.percent = counts.total ? Math.round(((counts.present + counts.late) / counts.total) * 1000) / 10 : 0;
  return counts;
}

function Button({ title, onPress, primary = false, disabled = false, tone }: {
  title: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  tone?: 'success' | 'danger';
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [
      styles.button,
      primary ? styles.primaryButton : null,
      disabled ? styles.disabledButton : null,
      pressed ? styles.pressedButton : null,
    ]}>
      <Text style={[styles.buttonText, primary ? styles.primaryButtonText : null, tone === 'success' ? styles.successText : null, tone === 'danger' ? styles.dangerText : null]}>{title}</Text>
    </Pressable>
  );
}

function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'primary' | 'success' | 'danger' }) {
  return <View style={[styles.badge, tone === 'primary' ? styles.primaryBadge : null, tone === 'success' ? styles.successBadge : null, tone === 'danger' ? styles.dangerBadge : null]}><Text style={styles.badgeText}>{label}</Text></View>;
}

function Card({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeading}>
          <Text style={styles.cardTitle}>{title}</Text>
          {description ? <Text style={styles.cardDescription}>{description}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

export default function FrequencyReportScreen() {
  const [data, setData] = useState<ReportData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditEntry[] | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ classId: '', start: '', end: '', search: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchJson<ReportData>('/school/state');
      setData({ ...EMPTY_DATA, ...result });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const allRecords = data.attendanceRecords;
  const records = useMemo(() => allRecords
    .filter((record) => !filters.classId || record.classId === filters.classId)
    .filter((record) => !filters.start || record.date >= filters.start)
    .filter((record) => !filters.end || record.date <= filters.end)
    .sort((a, b) => a.date.localeCompare(b.date) || a.lessonName.localeCompare(b.lessonName)),
  [allRecords, filters]);

  const students = useMemo(() => {
    const classStudents = filters.classId
      ? data.classes.find((item) => item.id === filters.classId)?.studentIds ?? []
      : null;
    const presentInRange = new Set(records.flatMap((record) => record.entries.map((entry) => entry.studentId)));
    const needle = normalize(filters.search);
    return data.students
      .filter((student) => !classStudents || classStudents.includes(student.id))
      .filter((student) => Boolean(classStudents) || presentInRange.has(student.id))
      .filter((student) => !needle || normalize(student.name).includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.classes, data.students, filters, records]);

  const lessons = useMemo(() => data.discipleshipLessons.length
    ? data.discipleshipLessons
    : data.classes[0]?.lessonNames ?? [], [data.classes, data.discipleshipLessons]);

  const courseProgress = useMemo(() => {
    const lessonSet = new Set(lessons.map(normalize));
    const progress = new Map<string, Set<string>>();
    allRecords.forEach((record) => {
      const lesson = normalize(record.lessonName || '');
      if (!lessonSet.has(lesson)) return;
      record.entries.forEach((entry) => {
        if (entry.status !== 'present' && entry.status !== 'late') return;
        if (!progress.has(entry.studentId)) progress.set(entry.studentId, new Set());
        progress.get(entry.studentId)?.add(lesson);
      });
    });
    return progress;
  }, [allRecords, lessons]);

  const summary = useMemo(() => ({
    classes: data.classes.length,
    students: data.students.length,
    teachers: data.teachers?.length ?? 0,
    attendance: allRecords.length,
  }), [allRecords.length, data.classes.length, data.students.length, data.teachers]);

  const applyFilters = () => setFilters({
    classId: selectedClass,
    start: parseDate(startInput),
    end: parseDate(endInput),
    search: searchInput.trim(),
  });

  const clearFilters = () => {
    setSelectedClass('');
    setStartInput('');
    setEndInput('');
    setSearchInput('');
    setFilters({ classId: '', start: '', end: '', search: '' });
  };

  const loadAudit = async () => {
    setAuditLoading(true);
    try {
      setAuditLogs(await fetchJson<AuditEntry[]>('/school/audit-logs'));
    } catch (auditError) {
      const message = auditError instanceof Error ? auditError.message : 'Não foi possível carregar a auditoria.';
      setAuditLogs([]);
      if (Platform.OS !== 'web') Alert.alert('Falha ao carregar auditoria', message);
    } finally {
      setAuditLoading(false);
    }
  };

  const exportCsv = () => {
    const header = ['Aluno', ...records.map((record) => `${shortDate(record.date)} - ${record.lessonName}`), 'Presentes', 'Faltas', 'Justificadas', 'Atrasos', 'Frequência (%)'];
    const rows = students.map((student) => {
      const counts = getStudentCounts(student.id, records);
      const statuses = records.map((record) => record.entries.find((entry) => entry.studentId === student.id)?.status ?? '');
      const labels = statuses.map((status) => status ? STATUS_META[status as AttendanceStatus].label : '');
      return [student.name, ...labels, counts.present, counts.absent, counts.justified, counts.late, counts.percent.toLocaleString('pt-BR')];
    });
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n');
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `frequencia-discipulado-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } else {
      Alert.alert('Exportação CSV', 'A exportação CSV está disponível na versão web.');
    }
  };

  const printReport = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.print();
    else Alert.alert('Imprimir / PDF', 'A impressão está disponível na versão web.');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.page}>
      <View style={styles.pageContent}>
        <View style={styles.pageHeader}>
          <Text style={styles.kicker}>CHAMADA DO DISCIPULADO</Text>
          <Text style={styles.pageTitle}>Relatório de Frequência</Text>
          <Text style={styles.pageSubtitle}>Frequência por aluno em todas as aulas do discipulado, com filtros por turma, período e nome. Dados carregados da API online em tempo real.</Text>
        </View>

        <Card title="Resumo rápido" description="Indicadores gerais para secretaria e liderança.">
          {loading ? <Text style={styles.mutedText}>Carregando dados…</Text> : error ? <Badge label="Falha ao conectar" tone="danger" /> : <View style={styles.badges}>
            <Badge label={`Turmas: ${summary.classes}`} />
            <Badge label={`Alunos: ${summary.students}`} tone="primary" />
            <Badge label={`Professores: ${summary.teachers}`} tone="success" />
            <Badge label={`Chamadas: ${summary.attendance}`} />
          </View>}
          {allRecords.length > 0 ? <Text style={styles.mutedText}>Período com chamadas registradas: {longDate(allRecords.map((record) => record.date).sort()[0])} até {longDate(allRecords.map((record) => record.date).sort().at(-1) ?? '')}.</Text> : null}
        </Card>

        <Card title="Filtros" description="Refine o relatório por turma, período de aulas e nome do aluno.">
          <View style={styles.filterGrid}>
            <View style={styles.field}>
              <Text style={styles.label}>Turma</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classOptions}>
                <Pressable onPress={() => setSelectedClass('')} style={[styles.classOption, !selectedClass ? styles.classOptionSelected : null]}><Text style={[styles.classOptionText, !selectedClass ? styles.classOptionTextSelected : null]}>Todas</Text></Pressable>
                {data.classes.map((item) => <Pressable key={item.id} onPress={() => setSelectedClass(item.id)} style={[styles.classOption, selectedClass === item.id ? styles.classOptionSelected : null]}><Text style={[styles.classOptionText, selectedClass === item.id ? styles.classOptionTextSelected : null]}>{item.name}</Text></Pressable>)}
              </ScrollView>
            </View>
            <View style={styles.dateFields}>
              <View style={[styles.field, styles.flexField]}><Text style={styles.label}>De (data da aula)</Text><TextInput value={startInput} onChangeText={setStartInput} placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" style={styles.input} /></View>
              <View style={[styles.field, styles.flexField]}><Text style={styles.label}>Até (data da aula)</Text><TextInput value={endInput} onChangeText={setEndInput} placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" style={styles.input} /></View>
            </View>
            <View style={styles.field}><Text style={styles.label}>Aluno</Text><TextInput value={searchInput} onChangeText={setSearchInput} placeholder="Buscar por nome…" style={styles.input} /></View>
          </View>
          <View style={styles.actions}>
            <Button title="Aplicar filtros" primary onPress={applyFilters} disabled={loading} />
            <Button title="Limpar" onPress={clearFilters} />
            <Button title="Imprimir / PDF" onPress={printReport} />
            <Button title="Exportar CSV" onPress={exportCsv} tone="success" />
            <Button title="Atualizar dados" onPress={() => void loadData()} />
          </View>
        </Card>

        <Card title="Frequência por aluno" description={error ? 'Não foi possível carregar os dados. Verifique a autenticação e a API.' : `${filters.classId ? `Turma: ${data.classes.find((item) => item.id === filters.classId)?.name}` : 'Todas as turmas'} · ${students.length} alunos · ${records.length} aulas`}>
          {loading ? <View style={styles.stateBlock}><View style={styles.spinner} /><Text style={styles.stateTitle}>Carregando dados…</Text><Text style={styles.mutedText}>Buscando turmas, alunos e chamadas na API.</Text></View> : error ? <View style={styles.stateBlock}><Text style={styles.stateTitle}>Não foi possível carregar os dados</Text><Text style={styles.mutedText}>Verifique se a API ({API_BASE_URL}) está online: {error}</Text></View> : records.length === 0 ? <View style={styles.stateBlock}><Text style={styles.stateTitle}>Nenhuma chamada no período</Text><Text style={styles.mutedText}>Ajuste os filtros de turma ou período para visualizar o relatório.</Text></View> : students.length === 0 ? <View style={styles.stateBlock}><Text style={styles.stateTitle}>Nenhum aluno encontrado</Text><Text style={styles.mutedText}>Ajuste os filtros para visualizar os alunos.</Text></View> : <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tableScroll}>
            <View>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.cell, styles.studentCell, styles.headerCell]}>Aluno</Text>
                {records.map((record) => <View key={record.id} style={[styles.cell, styles.lessonCell]}><Text style={styles.headerCell}>{shortDate(record.date)}</Text><Text style={styles.lessonName} numberOfLines={2}>{record.lessonName || 'Aula'}</Text></View>)}
                {['P', 'F', 'J', 'A', 'Freq.', 'Curso'].map((title) => <Text key={title} style={[styles.cell, styles.summaryCell, styles.headerCell]}>{title}</Text>)}
              </View>
              {students.map((student, rowIndex) => {
                const counts = getStudentCounts(student.id, records);
                const completedLessons = courseProgress.get(student.id)?.size ?? 0;
                const coursePercent = lessons.length ? Math.round((completedLessons / lessons.length) * 1000) / 10 : 0;
                return <View key={student.id} style={[styles.tableRow, rowIndex % 2 === 1 ? styles.alternateRow : null]}>
                  <View style={[styles.cell, styles.studentCell]}><Text style={styles.studentName}>{student.name}</Text><Text style={styles.studentMeta}>{counts.total} aula(s) com registro</Text></View>
                  {records.map((record) => {
                    const status = record.entries.find((entry) => entry.studentId === student.id)?.status;
                    const meta = status ? STATUS_META[status] : null;
                    return <View key={record.id} style={[styles.cell, styles.statusCell]}>{meta ? <View style={[styles.statusChip, { backgroundColor: meta.background }]}><Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text></View> : <Text style={styles.emptyStatus}>—</Text>}</View>;
                  })}
                  <Text style={[styles.cell, styles.summaryCell]}>{counts.present}</Text>
                  <Text style={[styles.cell, styles.summaryCell]}>{counts.absent}</Text>
                  <Text style={[styles.cell, styles.summaryCell]}>{counts.justified}</Text>
                  <Text style={[styles.cell, styles.summaryCell]}>{counts.late}</Text>
                  <View style={[styles.cell, styles.progressCell]}><Text style={styles.progressValue}>{counts.percent.toLocaleString('pt-BR')}%</Text><ProgressBar percent={counts.percent} /></View>
                  <View style={[styles.cell, styles.progressCell]}><Text style={styles.progressValue}>{coursePercent.toLocaleString('pt-BR')}%</Text><Text style={styles.progressMeta}>{completedLessons} de {lessons.length}</Text><ProgressBar percent={coursePercent} />{coursePercent >= 85 ? <Badge label="Apto" tone="success" /> : null}</View>
                </View>;
              })}
            </View>
          </ScrollView>}
          <View style={styles.legend}>
            <Text style={styles.legendText}>🟢 P — Presente</Text><Text style={styles.legendText}>🔴 F — Falta</Text><Text style={styles.legendText}>🟠 J — Justificada</Text><Text style={styles.legendText}>🔵 A — Atrasado</Text>
            <Text style={styles.legendText}>Curso — % das {lessons.length || 22} aulas da grade com presença, somando todas as turmas · Apto: 85%+ concluído</Text>
            <Text style={styles.legendText}>Freq. = (presentes + atrasos) ÷ aulas com registro</Text>
          </View>
        </Card>

        <Card title="Auditoria" description="Registro das últimas transações executadas na API." action={<Button title={auditLoading ? 'Carregando…' : 'Carregar auditoria'} onPress={() => void loadAudit()} disabled={auditLoading} />}>
          {auditLogs === null ? <Text style={styles.mutedText}>Clique em “Carregar auditoria” para listar os últimos eventos.</Text> : auditLogs.length === 0 ? <Text style={styles.mutedText}>Nenhum evento registrado ainda.</Text> : auditLogs.map((entry) => <View key={entry.id} style={styles.auditRow}>
            <Text style={styles.auditDate}>{formatDateTime(entry.createdAt)}</Text>
            <Text style={styles.auditAction}>{AUDIT_ACTIONS[entry.action] ?? entry.action}</Text>
            <Text style={styles.auditDetail}>{auditDetails(entry)}</Text>
          </View>)}
        </Card>
      </View>
    </ScrollView>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, percent)}%`, backgroundColor: percent < 50 ? AppPalette.danger : percent < 75 ? AppPalette.accent : AppPalette.success }]} /></View>;
}

function auditDetails(entry: AuditEntry) {
  const values = Object.entries(entry.details ?? {})
    .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${value}`);
  return [...values, entry.ip || ''].filter(Boolean).join(' · ');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppPalette.background },
  page: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 50 },
  pageContent: { width: '100%', maxWidth: 1280, alignSelf: 'center', gap: 16 },
  pageHeader: { gap: 5, marginBottom: 4 },
  kicker: { color: AppPalette.primary, fontFamily: AppTypography.bodyStrong, fontSize: 12, letterSpacing: 1.6 },
  pageTitle: { color: AppPalette.ink, fontFamily: AppTypography.title, fontSize: 30, fontWeight: '700' },
  pageSubtitle: { color: AppPalette.inkMuted, fontFamily: AppTypography.body, fontSize: 14, lineHeight: 21, maxWidth: 740 },
  card: { backgroundColor: AppPalette.surface, borderColor: AppPalette.border, borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  cardHeading: { flex: 1, gap: 3 },
  cardTitle: { color: AppPalette.ink, fontFamily: AppTypography.bodyStrong, fontSize: 17 },
  cardDescription: { color: AppPalette.inkMuted, fontFamily: AppTypography.body, fontSize: 13, lineHeight: 19 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#EEE8DE', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  primaryBadge: { backgroundColor: AppPalette.primarySoft },
  successBadge: { backgroundColor: AppPalette.successSoft },
  dangerBadge: { backgroundColor: AppPalette.dangerSoft },
  badgeText: { color: AppPalette.ink, fontFamily: AppTypography.bodyStrong, fontSize: 12 },
  mutedText: { color: AppPalette.inkMuted, fontFamily: AppTypography.body, fontSize: 13, lineHeight: 20 },
  filterGrid: { gap: 12 },
  field: { flex: 1, minWidth: 190, gap: 6 },
  label: { color: AppPalette.ink, fontFamily: AppTypography.bodyStrong, fontSize: 13 },
  classOptions: { gap: 7, paddingVertical: 2 },
  classOption: { paddingHorizontal: 11, paddingVertical: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: AppPalette.border, borderRadius: 10 },
  classOptionSelected: { backgroundColor: AppPalette.primary, borderColor: AppPalette.primary },
  classOptionText: { color: AppPalette.ink, fontFamily: AppTypography.body, fontSize: 13 },
  classOptionTextSelected: { color: '#FFFFFF', fontFamily: AppTypography.bodyStrong },
  dateFields: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  flexField: { flex: 1, minWidth: 180 },
  input: { height: 42, borderWidth: 1, borderColor: AppPalette.border, borderRadius: 11, paddingHorizontal: 12, color: AppPalette.ink, backgroundColor: '#FFFFFF', fontFamily: AppTypography.body, fontSize: 14, outlineStyle: 'none' } as never,
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { minHeight: 42, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: AppPalette.border, borderRadius: 12 },
  primaryButton: { backgroundColor: AppPalette.primary, borderColor: AppPalette.primary },
  disabledButton: { opacity: 0.5 },
  pressedButton: { opacity: 0.75 },
  buttonText: { color: AppPalette.ink, fontFamily: AppTypography.bodyStrong, fontSize: 13 },
  primaryButtonText: { color: '#FFFFFF' },
  successText: { color: AppPalette.success },
  dangerText: { color: AppPalette.danger },
  stateBlock: { minHeight: 160, justifyContent: 'center', alignItems: 'center', gap: 7, padding: 22 },
  stateTitle: { color: AppPalette.ink, fontFamily: AppTypography.bodyStrong, fontSize: 16, textAlign: 'center' },
  spinner: { width: 24, height: 24, borderRadius: 999, borderWidth: 3, borderColor: AppPalette.border, borderTopColor: AppPalette.primary },
  tableScroll: { minWidth: '100%' },
  tableRow: { minHeight: 54, flexDirection: 'row', alignItems: 'stretch', borderBottomWidth: 1, borderBottomColor: AppPalette.border },
  tableHeader: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: AppPalette.border },
  alternateRow: { backgroundColor: '#FAF6EE' },
  cell: { borderRightWidth: 1, borderRightColor: AppPalette.border, paddingHorizontal: 8, paddingVertical: 8, justifyContent: 'center', alignItems: 'center' },
  studentCell: { width: 220, alignItems: 'flex-start' },
  lessonCell: { width: 110, alignItems: 'center' },
  summaryCell: { width: 46, textAlign: 'center', fontFamily: AppTypography.bodyStrong, color: AppPalette.ink, fontSize: 12 },
  headerCell: { color: AppPalette.ink, fontFamily: AppTypography.bodyStrong, fontSize: 11, textAlign: 'center' },
  lessonName: { color: AppPalette.inkMuted, fontFamily: AppTypography.body, fontSize: 10, textAlign: 'center', marginTop: 3 },
  studentName: { color: AppPalette.ink, fontFamily: AppTypography.bodyStrong, fontSize: 13 },
  studentMeta: { color: AppPalette.inkMuted, fontFamily: AppTypography.body, fontSize: 10, marginTop: 3 },
  statusCell: { width: 52 },
  statusChip: { width: 26, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  statusText: { fontFamily: AppTypography.bodyStrong, fontSize: 12 },
  emptyStatus: { color: AppPalette.border, fontSize: 14 },
  progressCell: { width: 92, gap: 3 },
  progressValue: { color: AppPalette.ink, fontFamily: AppTypography.bodyStrong, fontSize: 12 },
  progressMeta: { color: AppPalette.inkMuted, fontFamily: AppTypography.body, fontSize: 10 },
  progressTrack: { width: 68, height: 5, borderRadius: 999, backgroundColor: '#EEE8DE', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  legendText: { color: AppPalette.inkMuted, fontFamily: AppTypography.body, fontSize: 11, lineHeight: 17 },
  auditRow: { borderTopWidth: 1, borderTopColor: AppPalette.border, paddingVertical: 9, gap: 3 },
  auditDate: { color: AppPalette.inkMuted, fontFamily: AppTypography.body, fontSize: 11 },
  auditAction: { color: AppPalette.ink, fontFamily: AppTypography.bodyStrong, fontSize: 13 },
  auditDetail: { color: AppPalette.inkMuted, fontFamily: AppTypography.body, fontSize: 12 },
});
