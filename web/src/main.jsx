import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, BookOpen, CalendarDays, ChartNoAxesColumn, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, FileText, FolderOpen, LayoutDashboard, LogOut, Menu, Plus, Search, Settings, Users, X, PlugZap, Save, RefreshCw, FileInput, CircleCheck, Pencil, Pin, History, MessageCircle, WandSparkles, ClipboardList, Download, LoaderCircle, Bot, Waves } from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://146.190.138.248:2000';
const DEFAULT_CONGREGATION_ID = 'cong-zumbi-pacheco-1';
const brazilStateOptions = [['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'], ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'], ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'], ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'], ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'], ['SE', 'Sergipe'], ['TO', 'Tocantins']];
const menu = [
  { label: 'Visão geral', icon: LayoutDashboard, path: 'inicio' },
  { label: 'Membros', icon: Users, children: [{ label: 'Novos convertidos', path: 'novos-convertidos' }] },
  { label: 'Discipulado', icon: BookOpen, children: [{ label: 'Turmas', path: 'turmas' }, { label: 'Aulas', path: 'aulas' }, { label: 'Professores', path: 'professores' }, { label: 'Escala', path: 'escala' }] },
  { label: 'Operacional', icon: ClipboardCheck, children: [{ label: 'Chamadas', path: 'chamadas' }] },
  { label: 'Relatórios', icon: ChartNoAxesColumn, children: [{ label: 'Visão geral', path: 'relatorios' }, { label: 'Frequência', path: 'frequencia' }] },
  { label: 'Configurações', icon: Settings, children: [{ label: 'Congregação', path: 'congregacao' }, { label: 'Integrações', path: 'integracoes' }] },
];
const today = () => new Date().toISOString().slice(0, 10);
const nearestWeekday = (weekday, baseDate = new Date()) => { const date = baseDate instanceof Date ? new Date(Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())) : new Date(`${baseDate}T12:00:00Z`), current = date.getUTCDay(), forward = (weekday - current + 7) % 7, backward = forward === 0 ? 0 : forward - 7, offset = Math.abs(backward) < Math.abs(forward) ? backward : forward; date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); };
const isValidIsoDateClient = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const weekdayPhrases = ['aos domingos', 'às segundas-feiras', 'às terças-feiras', 'às quartas-feiras', 'às quintas-feiras', 'às sextas-feiras', 'aos sábados'];
const DEFAULT_SCALE_MESSAGE = 'Paz do Senhor, {{nome_professor}}! {{tratamento_professor}} está na escala para ministrar a aula "{{titulo_da_aula}}" do discipulado no dia {{dia_da_aula}} ({{data}}), às {{hora}}, na turma {{turma}} da congregação {{congregacao}}.';
const SCALE_MESSAGE_VARIABLES = ['{{nome_professor}}', '{{tratamento_professor}}', '{{dia_da_aula}}', '{{data}}', '{{hora}}', '{{titulo_da_aula}}', '{{turma}}', '{{congregacao}}', '{{area}}', '{{setor}}', '{{contato_justificativa}}'];
const cycleTextColor = () => '#4E504A';
const formatDate = (value) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`)) : '—';
const conversionEvents = [
  'ADESIVAÇO', 'ADOLESCENTES: TESTEMUNHAS', 'Aniversário de Campanha Evangelizadora', 'Aniversário de Conjunto Musical',
  'Aniversário de Coral', 'Aniversário de Grupo Jovem', 'Aniversário de União de Adolescentes', 'BEREANOS',
  'Caminhada Evangelistica de oração', 'Cantata Evangelística da Páscoa', 'Círculo de Oração Adulto', 'Círculo de Oração Infantil',
  'Congresso de Adolescentes', 'Congresso de Jovens', 'Congresso de Mulheres', 'Consagração', 'Cruzada Jovem',
  'Cruzadas Evangelisticas', 'Culto de Doutrina', 'Culto de Oração', 'Culto de Reencontro',
  'Culto Evangelistico (Domingo a noite)', 'Culto Jovem', 'Culto na feira', 'Culto no lar', 'Culto Relâmpago',
  'Culto rodízio', 'Em família', 'Encontro de comissões', 'Encontro de crianças', 'Escola Bíblica Dominical (EBD)',
  'Escola/faculdade (intervalo bíblico)', 'Estudo do PROJEFÉRIAS', 'Estudo para mocidade', 'EVANGELISMO COM ORGAOS DE LOUVOR',
  'Evangelismo Estudantil (ENEM)', 'Evangelismo Noturno', 'Evangelismo Pessoal', 'EVANGELISMO RESGATE',
  'EVANGELISMO SOLIDÁRIO', 'Evangelismos e visita nos hospitais', 'Evangelismos nos presídios',
  'GRANDE MOBILIZACAO PERNAMBUCO PARA CRISTO', 'Mobilização Evangelística', 'Mobilização: Mensageiro de Boas Novas',
  'Mobilização: Vou Testemunhar', 'Oração da mocidade', 'Pontos de pregação', 'Pré-congressos', 'PROATI', 'Proclamai',
  'PROCLAMAI KIDS', 'Santa Ceia', 'Semana de Visitação', 'Seminário para família', 'Simpósio de doutrinas bíblicas',
  'Vigília', 'Visitas (da comissão do círculo de oração)', 'Outras atividades evangelisticas', 'Outras ações',
];
const brazilStates = { ACRE: 'AC', ALAGOAS: 'AL', AMAPA: 'AP', AMAZONAS: 'AM', BAHIA: 'BA', CEARA: 'CE', 'DISTRITO FEDERAL': 'DF', 'ESPIRITO SANTO': 'ES', GOIAS: 'GO', MARANHAO: 'MA', 'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS', 'MINAS GERAIS': 'MG', PARA: 'PA', PARAIBA: 'PB', PARANA: 'PR', PERNAMBUCO: 'PE', PIAUI: 'PI', 'RIO DE JANEIRO': 'RJ', 'RIO GRANDE DO NORTE': 'RN', 'RIO GRANDE DO SUL': 'RS', RONDONIA: 'RO', RORAIMA: 'RR', 'SANTA CATARINA': 'SC', 'SAO PAULO': 'SP', SERGIPE: 'SE', TOCANTINS: 'TO' };
const streetTypeWords = new Set(['r', 'rua', 'av', 'avenida', 'travessa', 'tv', 'alameda', 'estrada', 'rodovia', 'praça', 'praca']);
function toStateCode(state) {
  const normalized = String(state || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleUpperCase('pt-BR').trim();
  if (normalized.length === 2) return normalized;
  const withoutPrefix = normalized.replace(/^(?:ESTADO DE|STATE OF)\s+/, '');
  const candidates = [withoutPrefix, withoutPrefix.split(/[,/|]/)[0].trim(), withoutPrefix.split(/[\s,]+/).at(-1)];
  for (const candidate of candidates) {
    if (candidate.length === 2) return candidate;
    if (brazilStates[candidate]) return brazilStates[candidate];
  }
  return '';
}
function formatCep(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}
function formatBrazilPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  const areaCode = `(${digits.slice(0, 2)})`;
  const number = digits.slice(2);
  const prefixLength = digits.length > 10 ? 5 : 4;
  if (number.length <= prefixLength) return `${areaCode} ${number}`;
  return `${areaCode} ${number.slice(0, prefixLength)}-${number.slice(prefixLength)}`;
}
function normalizeAddressText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}
function matchesStreetQuery(candidate, query) {
  const terms = normalizeAddressText(query)
    .split(/\s+/)
    .filter((term) => term.length > 1 && !streetTypeWords.has(term));
  const normalizedCandidate = normalizeAddressText(candidate);
  return terms.length > 0 && terms.every((term) => normalizedCandidate.includes(term));
}

function TechText({ text = 'React Bits', fontSize = 150, fontWeight = 600, color = '#ffffff', accentColor = '#ffffff', reveal = 'letter', dashLength = 4, dashGap = 2, specks = 15 }) {
  const root = useRef(null);
  const canvas = useRef(null);
  useEffect(() => {
    const el = root.current, cv = canvas.current, ctx = cv?.getContext('2d');
    if (!el || !cv || !ctx) return;
    let pointer = { x: 0, y: 0, active: false }, frame = 0, bounds = [];
    const layout = () => {
      const r = el.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      const pixelWidth = Math.max(1, Math.round(r.width * dpr)), pixelHeight = Math.max(1, Math.round(r.height * dpr));
      if (cv.width !== pixelWidth || cv.height !== pixelHeight) { cv.width = pixelWidth; cv.height = pixelHeight; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      let size = Math.min(fontSize, r.height * .72, r.width / (text.length * .62));
      ctx.font = `${fontWeight} ${size}px Inter, ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const width = ctx.measureText(text).width, start = (r.width - width) / 2;
      bounds = [...text].map((letter, i) => ({ letter, x: start + ctx.measureText(text.slice(0, i)).width + ctx.measureText(letter).width / 2, width: ctx.measureText(letter).width }));
      return { r, size };
    };
    const draw = () => {
      const { r, size } = layout(); ctx.clearRect(0, 0, r.width, r.height);
      ctx.font = `${fontWeight} ${size}px Inter, ui-sans-serif, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      bounds.forEach((g) => {
        const active = pointer.active && Math.abs(pointer.x - g.x) < Math.max(24, g.width / 2 + 12) && Math.abs(pointer.y - r.height / 2) < 100;
        ctx.save(); ctx.lineWidth = 1.35;
        if (active && reveal !== 'off') { ctx.strokeStyle = color; ctx.setLineDash([dashLength, dashGap]); ctx.strokeText(g.letter, g.x, r.height / 2); }
        else { ctx.fillStyle = color === '#ffffff' ? '#4E504A' : color; ctx.fillText(g.letter, g.x, r.height / 2); }
        ctx.restore();
        if (active && specks) { for (let i = 0; i < Math.min(specks, 8); i++) { ctx.fillStyle = accentColor === '#b7d9ff' ? '#F4C19A' : accentColor; ctx.globalAlpha = Math.random() * .75; ctx.fillRect(g.x + (Math.random() - .5) * 52, r.height / 2 + (Math.random() - .5) * 62, 2, 2); } ctx.globalAlpha = 1; }
      });
      if (pointer.active) frame = requestAnimationFrame(draw);
    };
    const move = (event) => { const r = el.getBoundingClientRect(); pointer = { x: event.clientX - r.left, y: event.clientY - r.top, active: true }; cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); };
    const leave = () => { pointer.active = false; cancelAnimationFrame(frame); draw(); };
    const observer = new ResizeObserver(draw); observer.observe(el); el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave); draw();
    return () => { observer.disconnect(); el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); cancelAnimationFrame(frame); };
  }, [text, fontSize, fontWeight, color, accentColor, reveal, dashLength, dashGap, specks]);
  return <div ref={root} className="tech-text" role="img" aria-label={text}><canvas ref={canvas} /></div>;
}

function App() {
  const [page, setPage] = useState(() => { const initial = window.location.pathname.split('/').filter(Boolean)[0] || 'inicio'; return initial === 'congregacoes' ? 'congregacao' : initial; }), [expanded, setExpanded] = useState(() => localStorage.getItem('chamada-menu-open') !== 'false'), [mobileMenu, setMobileMenu] = useState(false), [search, setSearch] = useState(''), [account, setAccount] = useState(false);
  const [openGroup, setOpenGroup] = useState(''), [flyoutMenu, setFlyoutMenu] = useState(null), [flyoutTop, setFlyoutTop] = useState(100);
  const [pinnedRoutes, setPinnedRoutes] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('chamada-menu-pinned') || '[]'); return Array.isArray(saved) ? saved.filter((route) => typeof route === 'string') : []; } catch { return []; } });
  const [recentRoutes, setRecentRoutes] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('chamada-menu-recent') || '[]'); return Array.isArray(saved) ? saved.filter((route) => typeof route === 'string') : []; } catch { return []; } });
  const [activeCongregationId, setActiveCongregationId] = useState(() => sessionStorage.getItem('campanha-congregacao') || DEFAULT_CONGREGATION_ID), [congregationName, setCongregationName] = useState(''), [congregationArea, setCongregationArea] = useState(''), [congregationSector, setCongregationSector] = useState('');
  const [showCreateCongregation, setShowCreateCongregation] = useState(false), [congregationEdit, setCongregationEdit] = useState({ name: '', area: '', sector: '', logoData: '', justificationContact: '', scaleMessageTemplate: DEFAULT_SCALE_MESSAGE }), [congregationSaving, setCongregationSaving] = useState(false), [logoBusy, setLogoBusy] = useState(false);
  const [token, setToken] = useState(() => sessionStorage.getItem('chamada-token') || ''), [loginStep, setLoginStep] = useState('login'), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [verifyCode, setVerifyCode] = useState(''), [challenge, setChallenge] = useState(''), [loginMessage, setLoginMessage] = useState(''), [loginBusy, setLoginBusy] = useState(false);
    const [data, setData] = useState({ congregations: [], activeCongregationId: DEFAULT_CONGREGATION_ID, classes: [], students: [], teachers: [], attendanceRecords: [], newConverts: [], discipleshipLessons: [], discipleshipCycles: [], discipleshipSchedule: [] });
  const [error, setError] = useState('');
  const [className, setClassName] = useState(''), [classWeekday, setClassWeekday] = useState(0), [classLessonTime, setClassLessonTime] = useState('09:00'), [classStartDate, setClassStartDate] = useState(nearestWeekday(0)), [classStartDateAuto, setClassStartDateAuto] = useState(true), [editingClassStart, setEditingClassStart] = useState(null), [teacherName, setTeacherName] = useState(''), [teacherPhone, setTeacherPhone] = useState(''), [teacherGender, setTeacherGender] = useState('male');
  const [studentName, setStudentName] = useState(''), [studentClass, setStudentClass] = useState('');
  const [newConvert, setNewConvert] = useState({ eventName: '', name: '', conversionDate: today(), cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', birthDate: '', contactPhone: '' });
  const [showConvertModal, setShowConvertModal] = useState(false), [editingConvertId, setEditingConvertId] = useState(''), [convertSaving, setConvertSaving] = useState(false), [convertError, setConvertError] = useState('');
  const [cepLookup, setCepLookup] = useState({ status: 'idle', message: '' });
  const [streetMatches, setStreetMatches] = useState([]), [streetLookupStatus, setStreetLookupStatus] = useState('idle');
  const suppressStreetLookup = useRef(false), lastStreetLookupAt = useRef(0);
  const [selectedClass, setSelectedClass] = useState(''), [selectedTeacher, setSelectedTeacher] = useState(''), [lessonName, setLessonName] = useState(''), [attendanceDate, setAttendanceDate] = useState(today()), [entries, setEntries] = useState({});
  const [scaleClassId, setScaleClassId] = useState(() => localStorage.getItem(`campanha-escala-turma:${activeCongregationId}`) || '');
  const [frequencyClass, setFrequencyClass] = useState('all');
  const [editingScale, setEditingScale] = useState(null), [scaleSaving, setScaleSaving] = useState(false);
  const [editingLessonContent, setEditingLessonContent] = useState(null);
  const [scaleMessageDraft, setScaleMessageDraft] = useState(null), [scaleMessageNotice, setScaleMessageNotice] = useState('');
  const [scaleExporting, setScaleExporting] = useState(false);
  const [integration, setIntegration] = useState({ enabled: false, formId: '', sections: {}, fields: {}, mappings: {}, fixedAnswers: {} });
  const [formQuestions, setFormQuestions] = useState([]), [integrationBusy, setIntegrationBusy] = useState(false), [integrationMessage, setIntegrationMessage] = useState('');
  const [chatGptApiKey, setChatGptApiKey] = useState(''), [chatGptConfigured, setChatGptConfigured] = useState(false), [chatGptBusy, setChatGptBusy] = useState(false), [chatGptMessage, setChatGptMessage] = useState('');
  const [deepSeekApiKey, setDeepSeekApiKey] = useState(''), [deepSeekConfigured, setDeepSeekConfigured] = useState(false), [deepSeekBusy, setDeepSeekBusy] = useState(false), [deepSeekMessage, setDeepSeekMessage] = useState('');
  const [quizJobs, setQuizJobs] = useState({}), [quizCountDraft, setQuizCountDraft] = useState(null), [quizGeneratingLessonId, setQuizGeneratingLessonId] = useState(''), [activeQuiz, setActiveQuiz] = useState(null), [quizNotice, setQuizNotice] = useState('');
  const availableQuizProviders = [{ id: 'chatgpt', name: 'ChatGPT', configured: chatGptConfigured && Boolean(chatGptApiKey.trim()) }, { id: 'deepseek', name: 'DeepSeek', configured: deepSeekConfigured && Boolean(deepSeekApiKey.trim()) }].filter((provider) => provider.configured);
  const pendingQuizIdsKey = Object.values(quizJobs).flat().filter((quiz) => quiz.status === 'pending').map((quiz) => quiz.id).sort().join('|');
  const [formSentItems, setFormSentItems] = useState({}), [formOpenedItems, setFormOpenedItems] = useState({});
  const initializedScaleClasses = useRef(new Set());
  const apiFetch = (path, options = {}) => { const separator = path.includes('?') ? '&' : '?'; const scopedPath = `${path}${separator}congregationId=${encodeURIComponent(activeCongregationId)}`; return fetch(`${API}${scopedPath}`, { ...options, headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } }); };
   const applyState = (payload) => { setData({ congregations: payload.congregations || [], activeCongregationId: payload.activeCongregationId || activeCongregationId, classes: payload.classes || [], students: payload.students || [], teachers: payload.teachers || [], attendanceRecords: payload.attendanceRecords || [], newConverts: payload.newConverts || [], discipleshipLessons: payload.discipleshipLessons || [], discipleshipCycles: payload.discipleshipCycles || [], discipleshipSchedule: payload.discipleshipSchedule || [] }); if (payload.activeCongregationId && payload.activeCongregationId !== activeCongregationId) { setActiveCongregationId(payload.activeCongregationId); sessionStorage.setItem('campanha-congregacao', payload.activeCongregationId); } };
  const load = async () => { if (!token) return; try { const r = await apiFetch('/school/state'); if (r.status === 401) { sessionStorage.removeItem('chamada-token'); setToken(''); throw new Error('Sua sessão expirou. Entre novamente.'); } if (!r.ok) throw new Error('Não foi possível conectar à API.'); applyState(await r.json()); setError(''); } catch (e) { setError(e.message || 'API indisponível. Configure VITE_API_BASE_URL.'); } };
  useEffect(() => { if (token) load(); }, [token, activeCongregationId]);
  useEffect(() => {
    const maskedCep = formatCep(newConvert.cep);
    if (maskedCep !== newConvert.cep) setNewConvert((current) => ({ ...current, cep: maskedCep }));
  }, [newConvert.cep]);
  useEffect(() => {
    const maskedPhone = formatBrazilPhone(newConvert.contactPhone);
    if (maskedPhone !== newConvert.contactPhone) setNewConvert((current) => ({ ...current, contactPhone: maskedPhone }));
  }, [newConvert.contactPhone]);
  useEffect(() => {
    const cepDigits = newConvert.cep.replace(/\D/g, '');
    if (cepDigits.length !== 8) {
      setCepLookup({ status: 'idle', message: '' });
      return undefined;
    }

    const controller = new AbortController();
    setCepLookup({ status: 'loading', message: 'Buscando endereço pelo CEP…' });
    fetch(`https://viacep.com.br/ws/${cepDigits}/json/`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Serviço de CEP indisponível.');
        return response.json();
      })
      .then((address) => {
        if (address.erro) {
          setCepLookup({ status: 'not-found', message: 'CEP não encontrado. Preencha o endereço manualmente.' });
          return;
        }
        suppressStreetLookup.current = true;
        setNewConvert((current) => ({
          ...current,
          street: address.logradouro || current.street,
          neighborhood: address.bairro || current.neighborhood,
          city: address.localidade || current.city,
          state: address.uf || current.state,
        }));
        setCepLookup({ status: 'success', message: 'Endereço preenchido pelo CEP.' });
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setCepLookup({ status: 'error', message: 'Não foi possível consultar o CEP. Preencha o endereço manualmente.' });
        }
      });

    return () => controller.abort();
  }, [newConvert.cep]);
  useEffect(() => {
    if (suppressStreetLookup.current) {
      suppressStreetLookup.current = false;
      setStreetMatches([]);
      setStreetLookupStatus('idle');
      return undefined;
    }

    const street = newConvert.street.trim();
    if (street.length < 6) {
      setStreetMatches([]);
      setStreetLookupStatus('idle');
      return undefined;
    }

    const controller = new AbortController();
    const elapsed = Date.now() - lastStreetLookupAt.current;
    const delay = Math.max(850, 1000 - elapsed);
    const timer = window.setTimeout(() => {
      lastStreetLookupAt.current = Date.now();
      setStreetLookupStatus('loading');
      const searchAddress = async () => {
        try {
          const stateCode = toStateCode(newConvert.state);
          if (stateCode && newConvert.city.trim()) {
            const viaCepUrl = `https://viacep.com.br/ws/${stateCode}/${encodeURIComponent(newConvert.city.trim())}/${encodeURIComponent(street)}/json/`;
            const viaCepResponse = await fetch(viaCepUrl, { signal: controller.signal });
            if (viaCepResponse.ok) {
              const addresses = await viaCepResponse.json();
              const viaCepMatches = (Array.isArray(addresses) ? addresses : [])
                .filter((address) => matchesStreetQuery(address.logradouro, street))
                .slice(0, 5)
                .map((address) => ({
                  id: `viacep-${address.cep}`,
                  properties: {
                    name: address.logradouro,
                    street: address.logradouro,
                    postcode: address.cep,
                    district: address.bairro,
                    city: address.localidade,
                    state: address.estado || address.uf,
                    countrycode: 'BR',
                  },
                }));
              if (viaCepMatches.length) {
                setStreetMatches(viaCepMatches);
                setStreetLookupStatus('results');
                return;
              }
            }
          }

          const query = [street, newConvert.city.trim(), newConvert.state.trim(), 'Brazil']
            .filter(Boolean)
            .join(', ');
          const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&countrycode=br`;
          const photonResponse = await fetch(photonUrl, { signal: controller.signal });
          if (!photonResponse.ok) throw new Error('Serviço de endereços indisponível.');
          const result = await photonResponse.json();
          const photonMatches = (result.features || [])
            .filter((feature) => {
              const properties = feature.properties || {};
              return properties.countrycode === 'BR' && matchesStreetQuery(properties.street || properties.name, street);
            })
            .slice(0, 5)
            .map((feature) => ({ id: `${feature.properties.osm_type}-${feature.properties.osm_id}`, properties: feature.properties }));
          setStreetMatches(photonMatches);
          setStreetLookupStatus(photonMatches.length ? 'results' : 'empty');
        } catch (error) {
          if (error.name !== 'AbortError') {
            setStreetMatches([]);
            setStreetLookupStatus('error');
          }
        }
      };
      void searchAddress();
    }, delay);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [newConvert.street, newConvert.city, newConvert.state]);
  useEffect(() => {
    if (!['success', 'not-found', 'error'].includes(cepLookup.status)) return undefined;
    const timeout = window.setTimeout(() => setCepLookup({ status: 'idle', message: '' }), 4500);
    return () => window.clearTimeout(timeout);
  }, [cepLookup.status]);
  useEffect(() => {
    if (!showConvertModal) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') closeConvertModal(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showConvertModal]);
  useEffect(() => { const sync = () => { const next = window.location.pathname.split('/').filter(Boolean)[0] || 'inicio'; setPage(next === 'congregacoes' ? 'congregacao' : next); }; window.addEventListener('popstate', sync); return () => window.removeEventListener('popstate', sync); }, []);
  useEffect(() => { const activeGroup = menu.find((group) => group.children?.some((child) => child.path === page)); if (activeGroup) setOpenGroup(activeGroup.label); }, [page]);
  useEffect(() => {
    if (!flyoutMenu) return undefined;
    const closeOutside = (event) => { if (event.target.closest?.('.nav-flyout, .menu-rail')) return; setFlyoutMenu(null); };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, [flyoutMenu]);
  useEffect(() => {
    if (!token) return;
    apiFetch('/integrations/google/forms').then(async (response) => {
      if (!response.ok) throw new Error('Não foi possível carregar as configurações da integração.');
      const result = await response.json();
      setIntegration((current) => ({ ...current, ...result }));
    }).catch((error) => setIntegrationMessage(error.message));
  }, [token, activeCongregationId]);
  useEffect(() => {
    if (!token) return;
    apiFetch('/integrations/chatgpt').then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Não foi possível carregar a integração do ChatGPT.');
      setChatGptApiKey(result.apiKey || '');
      setChatGptConfigured(Boolean(result.configured));
    }).catch((error) => setChatGptMessage(error.message));
  }, [token, activeCongregationId]);
  useEffect(() => {
    if (!token) return;
    apiFetch('/integrations/deepseek').then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Não foi possível carregar a integração do DeepSeek.');
      setDeepSeekApiKey(result.apiKey || '');
      setDeepSeekConfigured(Boolean(result.configured));
    }).catch((error) => setDeepSeekMessage(error.message));
  }, [token, activeCongregationId]);
  useEffect(() => {
    if (!token) return undefined;
    let stopped = false, reconnectTimer;
    let socket;
    const mergeQuiz = (quiz) => setQuizJobs((current) => {
      const existing = current[quiz.scheduleId] || [];
      return { ...current, [quiz.scheduleId]: [quiz, ...existing.filter((item) => item.id !== quiz.id)] };
    });
    const refreshQuizzes = async () => {
      try {
        const response = await apiFetch('/school/quizzes');
        if (!response.ok) return;
        const result = await response.json();
        if (stopped) return;
        setQuizJobs((current) => {
          const next = { ...current };
          for (const quiz of result.quizzes || []) next[quiz.scheduleId] = [quiz, ...(next[quiz.scheduleId] || []).filter((item) => item.id !== quiz.id)];
          return next;
        });
      } catch {}
    };
    const connect = () => {
      if (stopped) return;
      const endpoint = new URL(API);
      endpoint.protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:';
      endpoint.pathname = '/ws';
      endpoint.searchParams.set('congregationId', activeCongregationId);
      socket = new WebSocket(endpoint, ['chamada-discipulado', token]);
      socket.onopen = refreshQuizzes;
      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data);
          if (event.type === 'quiz.updated' && event.quiz) mergeQuiz(event.quiz);
          if (event.type === 'quiz.updated' && event.quiz?.status === 'completed') setQuizNotice(`Questionário pronto: ${event.quiz.lessonTitle}.`);
          if (event.type === 'quiz.updated' && event.quiz?.status === 'failed') setQuizNotice(`Falha ao gerar ${event.quiz.lessonTitle}: ${event.quiz.error}`);
        } catch {}
      };
      socket.onclose = () => { if (!stopped) reconnectTimer = window.setTimeout(connect, 2500); };
      socket.onerror = () => socket.close();
    };
    void refreshQuizzes();
    connect();
    return () => { stopped = true; window.clearTimeout(reconnectTimer); socket?.close(); };
  }, [token, activeCongregationId]);
  useEffect(() => {
    const pendingQuizzes = Object.values(quizJobs).flat().filter((quiz) => quiz.status === 'pending');
    if (!token || !pendingQuizzes.length) return undefined;
    let stopped = false;
    const pendingIds = new Set(pendingQuizzes.map((quiz) => quiz.id));
    const refreshPendingQuizzes = async () => {
      try {
        const response = await apiFetch('/school/quizzes');
        if (!response.ok || stopped) return;
        const result = await response.json();
        const updatedJobs = (result.quizzes || []).filter((quiz) => pendingIds.has(quiz.id) && quiz.status !== 'pending');
        setQuizJobs((current) => {
          const next = { ...current };
          for (const quiz of result.quizzes || []) next[quiz.scheduleId] = [quiz, ...(next[quiz.scheduleId] || []).filter((item) => item.id !== quiz.id)];
          return next;
        });
        const finished = updatedJobs.find((quiz) => quiz.status === 'completed' || quiz.status === 'failed');
        if (finished) setQuizNotice(finished.status === 'completed' ? `Questionário pronto: ${finished.lessonTitle}.` : `Falha ao gerar ${finished.lessonTitle}: ${finished.error}`);
      } catch {}
    };
    const timer = window.setInterval(refreshPendingQuizzes, 2500);
    void refreshPendingQuizzes();
    return () => { stopped = true; window.clearInterval(timer); };
  }, [token, activeCongregationId, pendingQuizIdsKey]);
  useEffect(() => {
    if (!token) return;
    apiFetch('/integrations/google/forms/sent-items').then(async (response) => {
      if (!response.ok) return;
      const result = await response.json();
      setFormSentItems(Object.fromEntries((result.items || []).map((item) => [`${item.sectionId}:${item.recordId}`, true])));
    }).catch(() => {});
  }, [token, activeCongregationId]);
  useEffect(() => { if (!selectedClass && data.classes.length) setSelectedClass(data.classes[0].id); }, [data.classes, selectedClass]);
  useEffect(() => {
    if (data.activeCongregationId !== activeCongregationId || !data.classes.length) return;
    const storageKey = `campanha-escala-turma:${activeCongregationId}`;
    const lastSelectedId = localStorage.getItem(storageKey);
    const selected = data.classes.find((group) => group.id === lastSelectedId) || data.classes.find((group) => group.id === scaleClassId) || data.classes.find((group) => /2026\.2/.test(group.name)) || data.classes[0];
    if (selected && selected.id !== scaleClassId) setScaleClassId(selected.id);
    if (selected && lastSelectedId !== selected.id) localStorage.setItem(storageKey, selected.id);
  }, [activeCongregationId, data.activeCongregationId, data.classes]);
  useEffect(() => {
    const current = data.congregations.find((item) => item.id === activeCongregationId);
    if (current) setCongregationEdit({ name: current.name || '', area: current.area || '', sector: current.sector || '', logoData: current.logoData || '', justificationContact: current.justificationContact || '', scaleMessageTemplate: current.scaleMessageTemplate || DEFAULT_SCALE_MESSAGE });
  }, [data.congregations, activeCongregationId]);
  useEffect(() => {
    const currentClass = data.classes.find((group) => group.id === scaleClassId);
    if (page !== 'escala' || data.activeCongregationId !== activeCongregationId || !currentClass || initializedScaleClasses.current.has(currentClass.id)) return;
    const currentSchedule = data.discipleshipSchedule.filter((lesson) => lesson.classId === currentClass.id).sort((a, b) => a.date.localeCompare(b.date));
    const curriculum = [...data.discipleshipLessons.slice(0, 21), 'EVANGELISMO'];
    if (currentSchedule.length === 22 && currentSchedule.every((lesson, index) => lesson.title === curriculum[index])) {
      initializedScaleClasses.current.add(currentClass.id);
      return;
    }
    initializedScaleClasses.current.add(currentClass.id);
    const previousClass = data.classes.find((group) => /2026\.1/.test(group.name));
    const previousSchedule = previousClass ? data.discipleshipSchedule.filter((lesson) => lesson.classId === previousClass.id).sort((a, b) => a.date.localeCompare(b.date)) : [];
    const previousAttendance = previousClass ? data.attendanceRecords.filter((record) => record.classId === previousClass.id).sort((a, b) => a.date.localeCompare(b.date)) : [];
    const history = previousSchedule.length ? previousSchedule : previousAttendance;
    const lessonWeekday = Number(currentClass.lessonWeekday ?? 0);
    const currentAttendance = data.attendanceRecords.filter((record) => record.classId === currentClass.id).sort((a, b) => a.date.localeCompare(b.date));
    const startDate = currentClass.startDate || nearestWeekday(lessonWeekday);
    const lessons = [];
    const usedDates = new Set();
    for (let index = 0; index < 22; index += 1) {
      const scheduledLesson = currentSchedule[index];
      const attendanceLesson = currentSchedule.length ? currentAttendance.find((record) => record.date === scheduledLesson?.date) : currentAttendance[index];
      const priorLesson = history[index % (history.length || 1)];
      const priorTeacherId = scheduledLesson?.teacherId || attendanceLesson?.teacherIds?.[0] || priorLesson?.teacherId || priorLesson?.teacherIds?.[0] || '';
      const teacherId = data.teachers.some((teacher) => teacher.id === priorTeacherId) ? priorTeacherId : data.teachers.length ? data.teachers[index % data.teachers.length].id : '';
      let date = scheduledLesson?.date || attendanceLesson?.date || '';
      if (!date) {
        const next = new Date(`${startDate}T12:00:00Z`);
        next.setUTCDate(next.getUTCDate() + index * 7);
        date = next.toISOString().slice(0, 10);
      }
      while (usedDates.has(date)) {
        const next = new Date(`${date}T12:00:00Z`);
        next.setUTCDate(next.getUTCDate() + 7);
        date = next.toISOString().slice(0, 10);
      }
      usedDates.add(date);
      const isExceptionDate = new Date(`${date}T12:00:00Z`).getUTCDay() !== lessonWeekday;
      lessons.push({ id: scheduledLesson?.id, date, title: curriculum[index] || 'EVANGELISMO', teacherId, justification: scheduledLesson?.justification || (isExceptionDate ? 'Data de aula excepcional.' : '') });
    }
    apiFetch(`/school/classes/${currentClass.id}/scale`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessons }) })
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Não foi possível preparar a escala.'); applyState(payload); })
      .catch((error) => { initializedScaleClasses.current.delete(currentClass.id); setError(error.message || 'Não foi possível preparar a escala.'); });
  }, [page, scaleClassId, data.activeCongregationId, data.classes, data.discipleshipSchedule, data.attendanceRecords, data.discipleshipLessons, data.teachers, activeCongregationId]);
  const activeTitle = useMemo(() => menu.flatMap((group) => [group, ...(group.children || [])]).find((item) => item.path === page)?.label || 'Visão geral', [page]);
  const request = async (path, method, body) => { const r = await apiFetch(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) }); const payload = await r.json(); if (!r.ok) throw new Error(payload.message || 'Não foi possível concluir a operação.'); applyState(payload); return payload; };
  const notify = async (fn) => { try { setError(''); await fn(); } catch (e) { setError(e.message || 'Ocorreu um erro.'); } };
  const pageTitles = { inicio: ['Visão geral', 'Acompanhe a atividade da campanha em um só lugar.'], congregacao: ['Congregação', 'Edite os dados e a identidade visual da congregação selecionada.'], 'novos-convertidos': ['Novos convertidos', 'Acompanhe as pessoas que aceitaram a fé em cada ação evangelística.'], turmas: ['Turmas', 'Crie turmas e organize os participantes da campanha.'], aulas: ['Aulas do discipulado', 'Conteúdo organizado por ciclos de aprendizado.'], professores: ['Professores', 'Cadastre a equipe e os responsáveis por cada encontro.'], escala: ['Escala de aulas', 'Planeje as aulas dominicais e os professores da turma atual.'], chamadas: ['Chamadas', 'Registre e consulte a participação nos encontros.'], relatorios: ['Relatórios', 'Indicadores gerais para acompanhamento da campanha.'], frequencia: ['Frequência', 'Consulte a frequência por turma e período.'], integracoes: ['Integrações', 'Configure links pré-preenchidos para seus formulários.'] };
  const [title, subtitle] = pageTitles[page] || pageTitles.inicio;
  const nav = (path) => { setPage(path); setMobileMenu(false); setFlyoutMenu(null); setRecentRoutes((current) => { const next = [path, ...current.filter((route) => route !== path && !pinnedRoutes.includes(route))].slice(0, 6); localStorage.setItem('chamada-menu-recent', JSON.stringify(next)); return next; }); window.history.pushState({}, '', `/${path === 'inicio' ? '' : path}`); };
  const togglePin = (path) => { const next = pinnedRoutes.includes(path) ? pinnedRoutes.filter((route) => route !== path) : [...pinnedRoutes, path]; setPinnedRoutes(next); localStorage.setItem('chamada-menu-pinned', JSON.stringify(next)); const filtered = recentRoutes.filter((route) => !next.includes(route)); setRecentRoutes(filtered); localStorage.setItem('chamada-menu-recent', JSON.stringify(filtered)); };
  const toggleMenu = () => { const next = !expanded; setExpanded(next); localStorage.setItem('chamada-menu-open', String(next)); setFlyoutMenu(null); };
  const openMenuFlyout = (group, event) => { const rect = event.currentTarget.getBoundingClientRect(); setFlyoutTop(Math.min(rect.top, window.innerHeight - 320)); setFlyoutMenu({ title: group.label, items: group.children || [] }); };
  const menuLeaves = menu.flatMap((group) => group.path ? [{ ...group, groupLabel: group.label }] : (group.children || []).map((child) => ({ ...child, groupLabel: group.label, icon: group.icon })));
  const submitLogin = async (event) => { event.preventDefault(); setLoginBusy(true); setLoginMessage(''); try { const path = loginStep === 'login' ? '/auth/login' : '/auth/verify'; const body = loginStep === 'login' ? { email, password } : { challenge, code: verifyCode }; const response = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Não foi possível acessar.'); if (loginStep === 'login') { setChallenge(result.challenge); setLoginStep('verify'); setLoginMessage('Enviamos um código de verificação para seu e-mail.'); } else { sessionStorage.setItem('chamada-token', result.token); setToken(result.token); } } catch (e) { setLoginMessage(e.message || 'Falha de conexão com o servidor.'); } finally { setLoginBusy(false); } };
  if (!token) return <div className="login-page"><section className="login-card"><div className="login-art"><div className="login-brand"><span className="brand-icon"><BookOpen size={21}/></span>CAMPANHA EVANGELIZADORA</div><div className="login-art-copy"><h1>Caminhamos juntos.</h1><p>Cada encontro é uma oportunidade de compartilhar esperança e cuidar uns dos outros.</p></div><span className="login-art-footer">UM SÓ PROPÓSITO, MUITAS VIDAS ALCANÇADAS</span></div><form className="login-form" onSubmit={submitLogin}><span className="eyebrow">ÁREA ADMINISTRATIVA</span><h2>{loginStep === 'login' ? 'Bem-vindo de volta' : 'Confirme seu acesso'}</h2><p>{loginStep === 'login' ? 'Acesse o painel da campanha evangelizadora.' : `Digite o código enviado para ${email}.`}</p>{loginStep === 'login' ? <><label className="field">E-mail<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com"/></label><label className="field">Senha<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Digite sua senha"/></label></> : <label className="field">Código de verificação<input inputMode="numeric" maxLength={6} required value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} placeholder="000000"/></label>}{loginMessage && <div className={`login-message ${loginMessage.startsWith('Enviamos') ? 'success' : ''}`}>{loginMessage}</div>}<button className="button primary login-submit" disabled={loginBusy}>{loginBusy ? 'Aguarde…' : loginStep === 'login' ? 'Entrar' : 'Confirmar código'}<ChevronRight size={17}/></button>{loginStep === 'verify' && <button type="button" className="text-button login-back" onClick={() => { setLoginStep('login'); setLoginMessage(''); }}>Voltar para o login</button>}<div className="login-footnote">Acesse para continuar sua jornada.</div></form></section></div>;
  const createClass = () => notify(async () => { if (!className.trim()) return; const startDate = classStartDateAuto ? nearestWeekday(classWeekday) : classStartDate; await request('/school/classes', 'POST', { name: className.trim(), description: '', startDate, weekday: classWeekday, lessonTime: classLessonTime }); setClassName(''); setClassStartDate(nearestWeekday(classWeekday)); setClassStartDateAuto(true); });
  const saveClassStartDate = () => notify(async () => { if (!editingClassStart) return; await request(`/school/classes/${editingClassStart.id}/start-date`, 'PUT', { startDate: editingClassStart.startDate, weekday: editingClassStart.lessonWeekday, lessonTime: editingClassStart.lessonTime }); setEditingClassStart(null); });
  const createCongregation = () => notify(async () => { if (!congregationName.trim()) return; await request('/school/congregations', 'POST', { name: congregationName.trim(), area: congregationArea.trim(), sector: congregationSector.trim() }); setCongregationName(''); setCongregationArea(''); setCongregationSector(''); setShowCreateCongregation(false); });
  const saveCongregation = () => notify(async () => { if (!congregationEdit.name.trim()) return setError('Informe o nome da congregação.'); setCongregationSaving(true); try { await request(`/school/congregations/${activeCongregationId}`, 'PUT', congregationEdit); } finally { setCongregationSaving(false); } });
  const chooseCongregationLogo = async (file) => { if (!file) return; setLogoBusy(true); try { if (!file.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem.'); if (file.size > 8 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 8 MB.'); const source = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Não foi possível ler a imagem.')); reader.readAsDataURL(file); }); const dataUrl = await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => { const ratio = Math.min(1, 640 / Math.max(image.width, image.height)); const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * ratio)); canvas.height = Math.max(1, Math.round(image.height * ratio)); canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/webp', 0.86)); }; image.onerror = () => reject(new Error('Formato de imagem inválido.')); image.src = source; }); if (dataUrl.length > 1_800_000) throw new Error('A logo ficou muito grande. Escolha uma imagem mais simples.'); setCongregationEdit((current) => ({ ...current, logoData: dataUrl })); setError(''); } catch (error) { setError(error.message || 'Não foi possível processar a logo.'); } finally { setLogoBusy(false); } };
  const resetNewConvert = () => setNewConvert({ eventName: '', name: '', conversionDate: today(), cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', birthDate: '', contactPhone: '' });
  const openNewConvertModal = () => { resetNewConvert(); setEditingConvertId(''); setConvertError(''); setShowConvertModal(true); };
  const openEditConvertModal = (person) => {
    setEditingConvertId(person.id);
    setConvertError('');
    setNewConvert({ eventName: person.eventName || '', name: person.name || '', conversionDate: person.conversionDate || today(), cep: person.cep || '', street: person.street || '', number: person.number || '', complement: person.complement || '', neighborhood: person.neighborhood || '', city: person.city || '', state: toStateCode(person.state) || '', birthDate: person.birthDate || '', contactPhone: person.contactPhone || '' });
    setShowConvertModal(true);
  };
  const closeConvertModal = () => { setShowConvertModal(false); setEditingConvertId(''); setConvertError(''); setStreetMatches([]); setStreetLookupStatus('idle'); resetNewConvert(); };
  const createNewConvert = async () => {
    if (!newConvert.eventName) { setConvertError('Selecione o culto ou atividade da conversão.'); return; }
    setConvertSaving(true); setConvertError('');
    try {
      await request(editingConvertId ? `/school/new-converts/${editingConvertId}` : '/school/new-converts', editingConvertId ? 'PUT' : 'POST', newConvert);
      closeConvertModal();
    } catch (error) { setConvertError(error.message || 'Não foi possível salvar o cadastro.'); }
    finally { setConvertSaving(false); }
  };
  const selectStreetSuggestion = (properties) => {
    suppressStreetLookup.current = true;
    setStreetMatches([]);
    setStreetLookupStatus('idle');
    const suggestedState = [properties.state, properties.statecode, properties.stateCode, properties.state_code, properties.uf, properties.region].map(toStateCode).find(Boolean);
    setNewConvert((current) => ({
      ...current,
      street: properties.street || properties.name || current.street,
      number: properties.housenumber || current.number,
      cep: properties.postcode || current.cep,
      neighborhood: properties.district || properties.locality || current.neighborhood,
      city: properties.city || current.city,
      state: suggestedState || current.state,
    }));
  };
  const createStudent = () => notify(async () => { if (!studentName.trim()) return; await request('/school/students', 'POST', { name: studentName.trim(), birthDate: '', studentPhone: '', email: '', guardianName: '', guardianPhone: '', address: '', notes: '', classIds: studentClass ? [studentClass] : [] }); setStudentName(''); });
  const createTeacher = () => notify(async () => { if (!teacherName.trim()) return; await request('/school/teachers', 'POST', { name: teacherName.trim(), phone: teacherPhone.replace(/\D/g, ''), gender: teacherGender }); setTeacherName(''); setTeacherPhone(''); setTeacherGender('male'); });
  const updateTeacherGender = (teacher, gender) => notify(() => request(`/school/teachers/${teacher.id}`, 'PUT', { gender }));
  const currentDiscipleshipClass = data.classes.find((group) => group.id === scaleClassId) || data.classes.find((group) => /2026\.2/.test(group.name)) || data.classes[0];
  const activeCongregation = data.congregations.find((item) => item.id === activeCongregationId);
  const classSchedule = data.discipleshipSchedule.filter((lesson) => lesson.classId === currentDiscipleshipClass?.id).sort((a, b) => a.date.localeCompare(b.date)).map((lesson) => { const cycle = data.discipleshipCycles.find((item) => item.id === lesson.cycleId) || data.discipleshipCycles.find((item) => item.lessons.some((catalogLesson) => catalogLesson.title === lesson.title)); return { ...lesson, time: lesson.time || currentDiscipleshipClass?.lessonTime || '09:00', timeOverride: lesson.timeOverride || '', cycleId: lesson.cycleId || cycle?.id || '', cycleName: lesson.cycleName || cycle?.name || '', cycleColor: lesson.cycleColor || cycle?.color || '' }; });
  const prepareScaleMessage = (lesson) => {
    const teacher = data.teachers.find((item) => item.id === lesson.teacherId);
    const teacherPhone = String(teacher?.phone || '').replace(/\D/g, '');
    const lessonDate = new Date(`${lesson.date}T12:00:00Z`);
    const variables = {
      nome_professor: teacher?.name || 'Professor',
      professor: teacher?.name || 'Professor',
      tratamento_professor: teacher?.gender === 'female' ? 'a professora' : 'o professor',
      dia_da_aula: weekdays[lessonDate.getUTCDay()].toLowerCase(),
      dia: weekdays[lessonDate.getUTCDay()].toLowerCase(),
      data: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(lessonDate),
      hora: lesson.time || currentDiscipleshipClass?.lessonTime || '09:00',
      titulo_da_aula: lesson.title,
      titulo: lesson.title,
      turma: currentDiscipleshipClass?.name || '',
      congregacao: activeCongregation?.name || '',
      nome_congregacao: activeCongregation?.name || '',
      area: activeCongregation?.area || '',
      setor: activeCongregation?.sector || '',
      contato_justificativa: activeCongregation?.justificationContact ? formatBrazilPhone(activeCongregation.justificationContact) : '',
    };
    const template = activeCongregation?.scaleMessageTemplate?.trim() || DEFAULT_SCALE_MESSAGE;
    const message = template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => variables[key] ?? match);
    const phone = teacherPhone ? `55${teacherPhone}` : '';
    setScaleMessageNotice('');
    setScaleMessageDraft({ teacherName: teacher?.name || 'Professor', teacherPhone, message, whatsappUrl: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : '' });
  };
  const copyScaleMessage = async () => { try { await navigator.clipboard.writeText(scaleMessageDraft.message); setScaleMessageNotice('Mensagem copiada.'); } catch { setScaleMessageNotice('Não foi possível copiar automaticamente. Selecione e copie o texto.'); } };
  const openScaleMessageInWhatsApp = () => { if (!scaleMessageDraft?.whatsappUrl) return; window.open(scaleMessageDraft.whatsappUrl, '_blank', 'noopener,noreferrer'); };
  const scaleFirstDate = new Date(`${currentDiscipleshipClass?.startDate || nearestWeekday(Number(currentDiscipleshipClass?.lessonWeekday ?? 0))}T12:00:00Z`);
  const scaleLastDate = new Date(`${classSchedule.at(-1)?.date || currentDiscipleshipClass?.startDate || nearestWeekday(Number(currentDiscipleshipClass?.lessonWeekday ?? 0))}T12:00:00Z`);
  const scaleMonthCount = Math.max(1, (scaleLastDate.getUTCFullYear() - scaleFirstDate.getUTCFullYear()) * 12 + scaleLastDate.getUTCMonth() - scaleFirstDate.getUTCMonth() + 1);
  const scaleMonths = Array.from({ length: scaleMonthCount }, (_, index) => new Date(Date.UTC(scaleFirstDate.getUTCFullYear(), scaleFirstDate.getUTCMonth() + index, 1)));
  const saveScale = async (lessons) => { if (!currentDiscipleshipClass) return setError('Cadastre uma turma antes de montar a escala.'); setScaleSaving(true); try { const response = await apiFetch(`/school/classes/${currentDiscipleshipClass.id}/scale`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessons }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Não foi possível salvar a escala.'); applyState(payload); setEditingScale(null); setEditingLessonContent(null); setError(''); } catch (e) { setError(e.message || 'Não foi possível salvar a escala.'); } finally { setScaleSaving(false); } };
  const saveScaleItem = () => saveScale(classSchedule.map((lesson) => lesson.id === editingScale.id ? { id: lesson.id, date: editingScale.date, title: editingScale.title, teacherId: editingScale.teacherId, justification: editingScale.justification, content: editingScale.content, time: editingScale.timeOverride } : { id: lesson.id, date: lesson.date, title: lesson.title, teacherId: lesson.teacherId, justification: lesson.justification, content: lesson.content, time: lesson.timeOverride }));
  const saveLessonContent = () => saveScale(classSchedule.map((lesson) => ({ id: lesson.id, date: lesson.date, title: lesson.title, teacherId: lesson.teacherId, justification: lesson.justification, content: lesson.id === editingLessonContent.id ? editingLessonContent.content : lesson.content, time: lesson.timeOverride })));
  const exportScale = async () => {
    if (!currentDiscipleshipClass) return;
    setScaleExporting(true);
    setError('');
    try {
      const response = await apiFetch(`/school/classes/${currentDiscipleshipClass.id}/scale/export`);
      const report = await response.json();
      if (!response.ok) throw new Error(report.message || 'Não foi possível preparar a escala para exportação.');
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = document.internal.pageSize.getWidth();
      const pageHeight = document.internal.pageSize.getHeight();
      const margin = 15;
      let logo = null;
      if (report.congregation.logoData) {
        logo = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            const canvas = window.document.createElement('canvas');
            const ratio = Math.min(1, 512 / Math.max(image.width, image.height));
            canvas.width = Math.max(1, Math.round(image.width * ratio));
            canvas.height = Math.max(1, Math.round(image.height * ratio));
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve({ data: canvas.toDataURL('image/png'), aspectRatio: canvas.width / canvas.height });
          };
          image.onerror = () => reject(new Error('Não foi possível carregar a logo da congregação.'));
          image.src = report.congregation.logoData;
        });
        const maxLogoWidth = 32, maxLogoHeight = 25;
        const logoWidth = Math.min(maxLogoWidth, maxLogoHeight * logo.aspectRatio);
        const logoHeight = logoWidth / logo.aspectRatio;
        document.addImage(logo.data, 'PNG', margin, 12 + (maxLogoHeight - logoHeight) / 2, logoWidth, logoHeight, undefined, 'FAST');
      }
      const identityX = logo ? margin + 37 : margin;
      document.setTextColor(78, 80, 74);
      document.setFont('helvetica', 'bold');
      document.setFontSize(16);
      document.text(report.congregation.name || 'Congregação', identityX, 24);
      document.setFont('helvetica', 'normal');
      document.setFontSize(10);
      document.setTextColor(104, 106, 97);
      document.text(`Setor ${report.congregation.sector || '—'}  ·  Área ${report.congregation.area || '—'}`, identityX, 31);
      document.setDrawColor(222, 228, 236);
      document.line(margin, 46, pageWidth - margin, 46);
      document.setFont('helvetica', 'bold');
      document.setFontSize(22);
      document.setTextColor(78, 80, 74);
      document.text('Escala do Discipulado', margin, 57);
      document.setFont('helvetica', 'normal');
      document.setFontSize(11);
      document.setTextColor(104, 106, 97);
      document.text(`Turma: ${report.class.name}`, margin, 65);
      document.text(`Aulas ${weekdayPhrases[report.class.lessonWeekday] || 'aos domingos'}  ·  Início: ${formatDate(report.class.startDate)}`, margin, 72);
      const contactDigits = String(report.congregation.justificationContact || '').replace(/\D/g, '');
      const whatsappNumber = contactDigits ? `55${contactDigits}` : '';
      const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '';
      const abbreviatedMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const cycleRgb = (hex) => { const value = String(hex || '').replace('#', ''); return /^[0-9a-fA-F]{6}$/.test(value) ? [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16)) : [48, 109, 41]; };
      const cycles = report.cycles?.length ? report.cycles : [{ id: 'uncategorized', name: 'Aulas do discipulado', color: '#64748B', position: 1 }];
      let tableY = 85;
      for (const cycle of cycles) {
        const cycleLessons = report.lessons.filter((lesson) => lesson.cycleId === cycle.id);
        if (!cycleLessons.length) continue;
        if (cycle.position === 3) {
          document.addPage();
          tableY = 20;
        }
        if (tableY + 18 > pageHeight - 28) {
          document.addPage();
          tableY = 20;
        }
        const cycleColor = cycleRgb(cycle.color);
        const cycleIsLight = cycleColor[0] * 0.299 + cycleColor[1] * 0.587 + cycleColor[2] * 0.114 > 165;
        document.setFont('helvetica', 'bold');
        document.setFontSize(13);
        document.setTextColor(78, 80, 74);
        document.text(cycle.name, margin, tableY);
        document.setDrawColor(...cycleColor);
        document.setLineWidth(0.6);
        document.line(margin, tableY + 2, pageWidth - margin, tableY + 2);
        autoTable(document, {
          startY: tableY + 6,
          margin: { left: margin, right: margin, bottom: 30 },
          pageBreak: cycle.position === 3 ? 'avoid' : 'auto',
          head: [['Data', 'Título da aula', 'Professor']],
          body: cycleLessons.map((lesson) => [
            (() => { const date = new Date(`${lesson.date}T12:00:00Z`), weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' }).format(date); return `${weekday.charAt(0).toLocaleUpperCase('pt-BR')}${weekday.slice(1)}, ${String(date.getUTCDate()).padStart(2, '0')} de ${abbreviatedMonths[date.getUTCMonth()]} de ${date.getUTCFullYear()}`; })(),
            lesson.title,
            lesson.teacher,
          ]),
          theme: 'grid',
          styles: { font: 'helvetica', fontSize: 10.5, cellPadding: 4, overflow: 'linebreak', textColor: [41, 43, 39], lineColor: [231, 225, 177] },
          headStyles: { fillColor: cycleColor, textColor: cycleIsLight ? [13, 83, 14] : [255, 255, 255], fontStyle: 'bold', fontSize: 11.5 },
          columnStyles: { 0: { cellWidth: 67 }, 1: { cellWidth: 112 }, 2: { cellWidth: 'auto' } },
        });
        tableY = (document.lastAutoTable?.finalY || tableY) + 14;
      }
      if (whatsappUrl) {
        let contactY = (document.lastAutoTable?.finalY || 78) + 12;
        if (contactY + 18 > pageHeight - 16) {
          document.addPage();
          contactY = 22;
        }
        document.setFont('helvetica', 'normal');
        document.setFontSize(13);
        document.setTextColor(78, 80, 74);
        document.text('Paz do Senhor! Caso não possa atender à escala,', margin, contactY);
        document.setTextColor(78, 80, 74);
        document.textWithLink('clique aqui para avisar pelo WhatsApp.', margin, contactY + 6, { url: whatsappUrl });
        document.setFontSize(11);
        document.setTextColor(119, 121, 112);
        document.text(`Contato para justificativas: ${formatBrazilPhone(contactDigits)}`, margin, contactY + 12);
      }
      const pageCount = document.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        document.setPage(page);
        document.setFont('helvetica', 'normal');
        document.setFontSize(8);
        document.setTextColor(119, 121, 112);
        document.text(`Página ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
      }
      const blob = document.output('blob');
      const objectUrl = URL.createObjectURL(blob);
      const download = window.document.createElement('a');
      const filename = report.class.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
      download.href = objectUrl;
      download.download = `escala-discipulado-${filename || 'turma'}.pdf`;
      window.document.body.appendChild(download);
      download.click();
      download.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setError(error.message || 'Não foi possível exportar a escala.');
    } finally {
      setScaleExporting(false);
    }
  };
  const saveAttendance = () => notify(async () => { const classGroup = data.classes.find((item) => item.id === selectedClass); if (!classGroup || !selectedTeacher) return setError('Selecione uma turma e um professor.'); const students = classGroup.studentIds.map((id) => data.students.find((student) => student.id === id)).filter(Boolean); await request('/school/attendance', 'POST', { classId: selectedClass, lessonName: lessonName || data.discipleshipLessons[0] || 'Encontro evangelizador', teacherIds: [selectedTeacher], date: attendanceDate, notes: '', entries: students.map((student) => ({ studentId: student.id, status: entries[student.id] || 'present', note: '' })) }); setEntries({}); });
  const stats = [{ label: 'Turmas', value: data.classes.length, icon: Users, color: 'blue' }, { label: 'Participantes', value: data.students.length, icon: Users, color: 'cyan' }, { label: 'Professores', value: data.teachers.length, icon: BookOpen, color: 'green' }, { label: 'Encontros registrados', value: data.attendanceRecords.length, icon: Check, color: 'amber' }];
  const records = [...data.attendanceRecords].reverse();
  const integrationSections = [
    { id: 'new-converts', title: 'Cadastro de novos convertidos', description: 'Envie os dados de cada novo convertido cadastrado.', fields: ['Atividade', 'Nome', 'Data da conversão', 'Data de nascimento', 'Telefone para contato', 'CEP', 'Rua / logradouro', 'Número', 'Complemento', 'Bairro', 'Cidade', 'Estado'] },
    { id: 'students', title: 'Participantes', description: 'Compartilhe os cadastros de participantes.', fields: ['Nome'] },
    { id: 'classes', title: 'Turmas', description: 'Compartilhe os dados das turmas.', fields: ['Nome da turma', 'Descrição'] },
    { id: 'teachers', title: 'Professores', description: 'Compartilhe os cadastros de professores.', fields: ['Nome', 'Telefone'] },
    { id: 'attendance', title: 'Chamadas', description: 'Compartilhe os encontros e registros de presença.', fields: ['Turma', 'Responsável', 'Tema do encontro', 'Data', 'Participante', 'Situação'] },
  ];
  const setIntegrationValue = (key, value) => { setIntegration((current) => ({ ...current, [key]: value })); setIntegrationMessage(''); };
  const setFixedAnswer = (key, property, value) => setIntegration((current) => ({
    ...current,
    fixedAnswers: {
      ...current.fixedAnswers,
      [key]: property === 'questionId' ? { questionId: value, value: '' } : { ...current.fixedAnswers[key], [property]: value },
    },
  }));
  const saveIntegration = async () => {
    setIntegrationBusy(true); setIntegrationMessage('');
    try {
      const response = await apiFetch('/integrations/google/forms', { method: 'PUT', body: JSON.stringify(integration) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Não foi possível salvar a integração.');
      setIntegration((current) => ({ ...current, ...result })); setIntegrationMessage('Configurações salvas para esta congregação.');
    } catch (error) { setIntegrationMessage(error.message); }
    finally { setIntegrationBusy(false); }
  };
  const saveChatGptIntegration = async () => {
    setChatGptBusy(true); setChatGptMessage('');
    try {
      const response = await apiFetch('/integrations/chatgpt', { method: 'PUT', body: JSON.stringify({ apiKey: chatGptApiKey }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Não foi possível salvar o token do ChatGPT.');
      setChatGptApiKey(result.apiKey || ''); setChatGptConfigured(Boolean(result.configured)); setChatGptMessage(result.configured ? 'Integração do ChatGPT configurada para esta congregação.' : 'Token removido.');
    } catch (error) { setChatGptMessage(error.message || 'Não foi possível salvar o token do ChatGPT.'); }
    finally { setChatGptBusy(false); }
  };
  const saveDeepSeekIntegration = async () => {
    setDeepSeekBusy(true); setDeepSeekMessage('');
    try {
      const response = await apiFetch('/integrations/deepseek', { method: 'PUT', body: JSON.stringify({ apiKey: deepSeekApiKey }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Não foi possível salvar o token do DeepSeek.');
      setDeepSeekApiKey(result.apiKey || ''); setDeepSeekConfigured(Boolean(result.configured)); setDeepSeekMessage(result.configured ? 'Integração do DeepSeek configurada para esta congregação.' : 'Token removido.');
    } catch (error) { setDeepSeekMessage(error.message || 'Não foi possível salvar o token do DeepSeek.'); }
    finally { setDeepSeekBusy(false); }
  };
  const requestQuizGeneration = async () => {
    if (!quizCountDraft || !currentDiscipleshipClass) return;
    setQuizGeneratingLessonId(quizCountDraft.id); setQuizNotice('');
    try {
      const response = await apiFetch(`/school/classes/${currentDiscipleshipClass.id}/scale/${quizCountDraft.id}/quizzes`, { method: 'POST', body: JSON.stringify({ questionCount: Number(quizCountDraft.questionCount), provider: quizCountDraft.provider }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Não foi possível iniciar a geração.');
      setQuizJobs((current) => ({ ...current, [result.quiz.scheduleId]: [result.quiz, ...(current[result.quiz.scheduleId] || []).filter((item) => item.id !== result.quiz.id)] }));
      setQuizCountDraft(null); setQuizNotice('A geração começou. O questionário aparecerá nesta lição quando estiver pronto.');
    } catch (error) { setQuizNotice(error.message || 'Não foi possível iniciar a geração.'); }
    finally { setQuizGeneratingLessonId(''); }
  };
  const exportQuizPdf = async () => {
    if (!activeQuiz) return;
    const [{ jsPDF }] = await Promise.all([import('jspdf')]);
    const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = document.internal.pageSize.getWidth(), pageHeight = document.internal.pageSize.getHeight();
    const margin = 14, gap = 12, columnWidth = (pageWidth - margin * 2 - gap) / 2;
    const logo = activeCongregation?.logoData || '';
    let printLogo = '', printLogoWidth = 0, printLogoHeight = 0;
    if (logo) {
      try {
        const image = await new Promise((resolve, reject) => { const source = new Image(); source.onload = () => resolve(source); source.onerror = reject; source.src = logo; });
        const canvas = window.document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        canvas.getContext('2d').drawImage(image, 0, 0); printLogo = canvas.toDataURL('image/png');
        const logoScale = Math.min(20 / image.width, 20 / image.height);
        printLogoWidth = image.width * logoScale; printLogoHeight = image.height * logoScale;
      } catch {}
    }
    const drawHeader = () => {
      if (printLogo) document.addImage(printLogo, 'PNG', 14 + (20 - printLogoWidth) / 2, 9 + (20 - printLogoHeight) / 2, printLogoWidth, printLogoHeight);
      const textX = printLogo ? 39 : 14;
      document.setFont('helvetica', 'bold'); document.setFontSize(17); document.setTextColor(18, 47, 33);
      document.text(activeQuiz.lessonTitle, textX, 17, { maxWidth: pageWidth - textX - margin });
      document.setFont('helvetica', 'normal'); document.setFontSize(9); document.setTextColor(90, 105, 97);
      document.text(activeCongregation?.name || 'Campanha Evangelizadora', textX, 23);
      document.setDrawColor(218, 229, 221); document.line(margin, 31, pageWidth - margin, 31);
    };
    drawHeader();
    let columnIndex = 0;
    const columnY = [39, 39];
    for (let index = 0; index < activeQuiz.questions.length; index += 1) {
      const question = activeQuiz.questions[index];
      document.setFont('helvetica', 'bold'); document.setFontSize(10.5); document.setTextColor(22, 41, 31);
      const questionLines = document.splitTextToSize(`${index + 1}. ${question.question}`, columnWidth);
      const optionLines = question.options.flatMap((option) => document.splitTextToSize(option, columnWidth - 3));
      const blockHeight = questionLines.length * 5 + optionLines.length * 4.4 + 7;
      if (columnY[columnIndex] + blockHeight > pageHeight - margin) {
        if (columnIndex === 0) {
          columnIndex = 1;
        } else {
          document.addPage('a4', 'landscape'); drawHeader(); columnIndex = 0; columnY[0] = 39; columnY[1] = 39;
        }
      }
      const x = margin + columnIndex * (columnWidth + gap);
      let y = columnY[columnIndex];
      document.text(questionLines, x, y); y += questionLines.length * 5 + 2;
      document.setFont('helvetica', 'normal'); document.setFontSize(9); document.setTextColor(57, 69, 62);
      for (const option of question.options) { const lines = document.splitTextToSize(option, columnWidth - 3); document.text(lines, x + 3, y); y += lines.length * 4.4; }
      columnY[columnIndex] = y + 5;
    }
    document.save(`questionario-${activeQuiz.lessonTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
  };
  const loadFormQuestions = async () => {
    if (!integration.formId.trim()) return setIntegrationMessage('Informe o ID ou link do formulário.');
    setIntegrationBusy(true); setIntegrationMessage('');
    try {
      const formId = integration.formId.trim().match(/\/forms\/d\/e\/([^/?]+)/)?.[1] || integration.formId.trim();
      const response = await apiFetch(`/integrations/google/forms/${encodeURIComponent(formId)}/questions`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Não foi possível buscar as perguntas.');
      setFormQuestions(result.questions || []);
      setIntegrationMessage(`${(result.questions || []).length} campo(s) público(s) encontrado(s).`);
    } catch (error) { setIntegrationMessage(error.message); }
    finally { setIntegrationBusy(false); }
  };
  const currentIntegrationRows = () => {
    if (page === 'novos-convertidos') return data.newConverts.map((person) => ({
      sectionId: 'new-converts', recordId: person.id, title: person.name,
      values: { Atividade: person.eventName, Nome: person.name, 'Data da conversão': person.conversionDate, 'Data de nascimento': person.birthDate, 'Telefone para contato': person.contactPhone, CEP: person.cep, 'Rua / logradouro': person.street, Número: person.number, Complemento: person.complement, Bairro: person.neighborhood, Cidade: person.city, Estado: person.state },
    }));
    if (page === 'turmas') return [
      ...data.classes.map((group) => ({ sectionId: 'classes', recordId: group.id, title: group.name, values: { 'Nome da turma': group.name, Descrição: group.description } })),
      ...data.students.map((student) => ({ sectionId: 'students', recordId: student.id, title: student.name, values: { Nome: student.name } })),
    ];
    if (page === 'professores') return data.teachers.map((teacher) => ({ sectionId: 'teachers', recordId: teacher.id, title: teacher.name, values: { Nome: teacher.name, Telefone: teacher.phone } }));
    if (page === 'chamadas') return records.map((record) => {
      const classGroup = data.classes.find((group) => group.id === record.classId);
      const teacherNames = (record.teacherIds || []).map((id) => data.teachers.find((teacher) => teacher.id === id)?.name).filter(Boolean).join(', ');
      const entriesList = (record.entries || []).map((entry) => ({ student: data.students.find((student) => student.id === entry.studentId)?.name || '', status: entry.status }));
      return { sectionId: 'attendance', recordId: record.id, title: `${classGroup?.name || 'Chamada'} · ${formatDate(record.date)}`, values: { Turma: classGroup?.name, Responsável: teacherNames, 'Tema do encontro': record.lessonName, Data: record.date, Participante: entriesList.map((entry) => entry.student).filter(Boolean).join(', '), Situação: entriesList.map((entry) => `${entry.student}: ${entry.status}`).join(', ') } };
    });
    return [];
  };
  const openPrefilledForm = (row) => {
    const publicId = integration.formId.match(/\/forms\/d\/e\/([^/?]+)/)?.[1] || integration.formId.trim();
    const url = new URL(`https://docs.google.com/forms/d/e/${encodeURIComponent(publicId)}/viewform`);
    url.searchParams.set('usp', 'pp_url');
    let mapped = 0;
    Object.values(integration.fixedAnswers || {}).forEach((answer) => {
      if (!answer.questionId || !answer.value) return;
      url.searchParams.set(`entry.${answer.questionId}`, answer.value);
      mapped += 1;
    });
    for (const [label, value] of Object.entries(row.values)) {
      const key = `${row.sectionId}:${label}`;
      const entryId = integration.mappings[key];
      if (!entryId || integration.fields[key] === false || value === undefined || value === null || value === '') continue;
      url.searchParams.set(`entry.${entryId}`, String(value));
      mapped += 1;
    }
    if (!mapped) { setIntegrationMessage('Este cadastro não tem campos mapeados para o formulário.'); return; }
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
    setFormOpenedItems((current) => ({ ...current, [`${row.sectionId}:${row.recordId}`]: true }));
  };
  const markIntegrationItemSent = async (row) => {
    const response = await apiFetch('/integrations/google/forms/mark-sent', { method: 'POST', body: JSON.stringify({ sectionId: row.sectionId, recordId: row.recordId }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Não foi possível marcar o envio.');
    const key = `${row.sectionId}:${row.recordId}`;
    setFormSentItems((current) => ({ ...current, [key]: true }));
    setFormOpenedItems((current) => ({ ...current, [key]: false }));
  };
  const unsentIntegrationRows = currentIntegrationRows().filter((row) => integration.enabled && integration.sections[row.sectionId] && !formSentItems[`${row.sectionId}:${row.recordId}`]);
  const pinnedMenuItems = pinnedRoutes.map((route) => menuLeaves.find((item) => item.path === route)).filter(Boolean);
  const recentMenuItems = recentRoutes.map((route) => menuLeaves.find((item) => item.path === route)).filter((item) => item && !pinnedRoutes.includes(item.path));
  const menuTextMatches = (label) => !search || label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
  const renderMenuEntry = (item, variant = '') => <div className={`nav-entry ${variant}`} key={`${variant}-${item.path}`}><button className={`nav-link ${item.path === page ? 'active' : ''}`} onClick={() => nav(item.path)}>{variant === 'nav-link-root' && item.icon ? <item.icon size={18}/> : null}<span>{item.label}</span></button><button className={`nav-pin ${pinnedRoutes.includes(item.path) ? 'is-pinned' : ''}`} aria-label={pinnedRoutes.includes(item.path) ? `Desafixar ${item.label}` : `Fixar ${item.label}`} title={pinnedRoutes.includes(item.path) ? 'Remover dos fixados' : 'Fixar no menu'} onClick={() => togglePin(item.path)}><Pin size={15}/></button></div>;

  return <div className="app-shell">
    <header className="topbar"><div className="brandline"><button className="icon-button mobile-only" onClick={() => { if (!mobileMenu) setExpanded(true); setMobileMenu(!mobileMenu); }} aria-label="Abrir menu"><Menu size={21}/></button><button className="brand" onClick={() => nav('inicio')}><span className="brand-icon"><BookOpen size={21}/></span><span>CAMPANHA EVANGELIZADORA</span></button></div><div className="account-area"><label className="congregation-picker"><span>CONGREGAÇÃO</span><select value={activeCongregationId} onChange={(event) => { if (event.target.value === '__new__') { setCongregationName(''); setCongregationArea(''); setCongregationSector(''); setShowCreateCongregation(true); return; } setActiveCongregationId(event.target.value); sessionStorage.setItem('campanha-congregacao', event.target.value); }}><option value={DEFAULT_CONGREGATION_ID}>{data.congregations.find((item) => item.id === DEFAULT_CONGREGATION_ID)?.name || 'Zumbi do Pacheco 1'} · Área {data.congregations.find((item) => item.id === DEFAULT_CONGREGATION_ID)?.area || '10'} · Setor {data.congregations.find((item) => item.id === DEFAULT_CONGREGATION_ID)?.sector || '10'}</option>{data.congregations.filter((item) => item.id !== DEFAULT_CONGREGATION_ID).map((item) => <option value={item.id} key={item.id}>{item.name}{item.area ? ` · Área ${item.area}` : ''}{item.sector ? ` · Setor ${item.sector}` : ''}</option>)}<option value="__new__">＋ Nova congregação</option></select></label><button className="account-trigger" onClick={() => setAccount(!account)}><span className="avatar">CE</span><span>Administrador</span><ChevronDown size={16}/></button>{account && <div className="account-menu"><strong>Campanha Evangelizadora</strong><button onClick={() => { setAccount(false); nav('congregacao'); }}><Settings size={15}/> Congregação</button><button onClick={() => { sessionStorage.removeItem('chamada-token'); setToken(''); setAccount(false); }}><LogOut size={15}/> Sair</button></div>}</div></header>
    <div className="body-layout">
      {mobileMenu && <div className="backdrop show" onClick={() => setMobileMenu(false)}/>}
      <aside className={`sidebar ${expanded ? '' : 'sidebar-collapsed'} ${mobileMenu ? 'sidebar-mobile-open' : ''}`}>
        <div className="side-heading">{expanded && <span>NAVEGAÇÃO</span>}<button className="icon-button" onClick={() => { if (window.innerWidth <= 650) setMobileMenu(false); else toggleMenu(); }} aria-label={expanded ? 'Recolher menu' : 'Expandir menu'}>{expanded ? <ChevronLeft size={18}/> : <Menu size={18}/>}</button></div>
        {expanded ? <>
          <label className="searchbox"><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar no menu"/><kbd>/</kbd>{search && <button type="button" className="search-clear" onClick={() => setSearch('')} aria-label="Limpar busca"><X size={14}/></button>}</label>
          <nav className="sidebar-nav">
            {!search && pinnedMenuItems.length > 0 && <section className="nav-shortcuts"><small>FIXADOS</small>{pinnedMenuItems.map((item) => renderMenuEntry(item, 'nav-link-sub'))}</section>}
            {!search && recentMenuItems.length > 0 && <section className="nav-shortcuts"><small>RECENTES</small>{recentMenuItems.slice(0, 5).map((item) => renderMenuEntry(item, 'nav-link-sub'))}</section>}
            {menu.map((group) => {
              const Icon = group.icon;
              if (group.path) return menuTextMatches(group.label) && <div className="nav-group" key={group.path}>{renderMenuEntry({ ...group, groupLabel: group.label }, 'nav-link-root')}</div>;
              const groupMatches = menuTextMatches(group.label), children = (group.children || []).filter((child) => groupMatches || menuTextMatches(child.label));
              if (!children.length) return null;
              const isActive = group.children?.some((child) => child.path === page), isOpen = Boolean(search) || openGroup === group.label;
              return <div className="nav-group" key={group.label}><button className={`nav-group-toggle ${isActive ? 'active' : ''}`} aria-expanded={isOpen} onClick={() => setOpenGroup(isOpen && !search ? '' : group.label)}><Icon size={18}/><strong>{group.label}</strong>{isOpen ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</button>{isOpen && <div className="nav-group-children">{children.map((child) => renderMenuEntry({ ...child, groupLabel: group.label, icon: group.icon }, 'nav-link-sub'))}</div>}</div>;
            })}
          </nav>
          <div className="sidebar-bottom"><div className="help-badge"><span>?</span><div><b>Precisa de ajuda?</b><small>Acesse os relatórios da campanha</small></div></div></div>
        </> : <nav className="menu-rail">
          <button className="rail-link" aria-label="Buscar no menu" title="Buscar no menu" onClick={() => { setExpanded(true); localStorage.setItem('chamada-menu-open', 'true'); }}><Search size={20}/></button>
          {pinnedMenuItems.length > 0 && <button className="rail-link" aria-label="Fixados" title="Fixados" onClick={(event) => { setFlyoutTop(Math.min(event.currentTarget.getBoundingClientRect().top, window.innerHeight - 320)); setFlyoutMenu({ title: 'FIXADOS', items: pinnedMenuItems }); }}><Pin size={19}/></button>}
          <div className="rail-divider"/>
          {menu.map((group) => { const Icon = group.icon, groupActive = group.path ? group.path === page : group.children?.some((child) => child.path === page); if (group.path) return <button className={`rail-link ${groupActive ? 'active' : ''}`} key={group.path} aria-label={group.label} title={group.label} onClick={() => nav(group.path)}><Icon size={20}/></button>; return <button className={`rail-link ${groupActive ? 'active' : ''}`} key={group.label} aria-label={group.label} title={group.label} onClick={(event) => openMenuFlyout(group, event)}><Icon size={20}/></button>; })}
          {recentMenuItems.length > 0 && <><div className="rail-divider"/><button className="rail-link" aria-label="Recentes" title="Recentes" onClick={(event) => { setFlyoutTop(Math.min(event.currentTarget.getBoundingClientRect().top, window.innerHeight - 320)); setFlyoutMenu({ title: 'RECENTES', items: recentMenuItems.slice(0, 5) }); }}><History size={20}/></button></>}
          {flyoutMenu && <div className="nav-flyout" style={{ top: flyoutTop }}><div className="nav-flyout-heading"><b>{flyoutMenu.title}</b><button onClick={() => setFlyoutMenu(null)} aria-label="Fechar"><X size={15}/></button></div>{flyoutMenu.items.map((item) => <div className="nav-flyout-row" key={item.path}><button className={item.path === page ? 'active' : ''} onClick={() => nav(item.path)}>{item.label}</button><button className={`nav-pin ${pinnedRoutes.includes(item.path) ? 'is-pinned' : ''}`} onClick={() => togglePin(item.path)} aria-label={pinnedRoutes.includes(item.path) ? 'Desafixar' : 'Fixar'}><Pin size={14}/></button></div>)}</div>}
        </nav>}
      </aside>
      <main className="main-column"><div className="breadcrumb"><button onClick={() => nav('inicio')}>Início</button><span>/</span><strong>{activeTitle}</strong><button className="collapse-menu" onClick={toggleMenu}><Menu size={17}/></button></div><div className="page-content"><div className="page-heading"><div><div className="eyebrow">CAMPANHA EVANGELIZADORA</div><h1>{title}</h1><p>{subtitle}</p></div><span className="today-pill"><CalendarDays size={15}/>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date())}</span></div>
        {error && <div className="alert"><Activity size={17}/><span>{error}</span><button onClick={load}>Tentar novamente</button><button className="alert-close" onClick={() => setError('')}><X size={16}/></button></div>}
        {page === 'escala' && quizNotice && <div className={`quiz-notice ${quizNotice.startsWith('Falha') ? 'error' : ''}`} role="status"><span>{quizNotice}</span><button className="icon-button" onClick={() => setQuizNotice('')} aria-label="Fechar aviso"><X size={15}/></button></div>}
         {scaleMessageDraft && <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setScaleMessageDraft(null); }}><section className="convert-modal scale-message-modal" role="dialog" aria-modal="true" aria-labelledby="scale-message-title"><div className="panel-heading"><div><h2 id="scale-message-title">Mensagem da escala</h2><p>Mensagem preparada para {scaleMessageDraft.teacherName}.</p></div><button className="icon-button" onClick={() => setScaleMessageDraft(null)} aria-label="Fechar"><X size={18}/></button></div><label className="field">Texto da mensagem<textarea readOnly rows={6} value={scaleMessageDraft.message}/></label>{!scaleMessageDraft.teacherPhone && <p className="scale-message-warning">Esse professor ainda não tem telefone cadastrado. Você pode copiar a mensagem para enviá-la por outro meio.</p>}{scaleMessageNotice && <p className="scale-message-notice" role="status">{scaleMessageNotice}</p>}<div className="convert-modal-footer"><button className="button secondary" onClick={copyScaleMessage}><FileInput size={16}/> Copiar mensagem</button><button className="button primary" onClick={openScaleMessageInWhatsApp} disabled={!scaleMessageDraft.whatsappUrl}><MessageCircle size={16}/> Abrir WhatsApp</button></div></section></div>}
        {quizCountDraft && <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setQuizCountDraft(null); }}><section className="convert-modal scale-edit-modal quiz-count-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-count-title"><div className="panel-heading"><div><h2 id="quiz-count-title">Gerar questionário</h2><p>{quizCountDraft.title}</p></div><button className="icon-button" onClick={() => setQuizCountDraft(null)} aria-label="Fechar"><X size={18}/></button></div>{availableQuizProviders.length > 1 ? <label className="field">Integração de IA<select value={quizCountDraft.provider} onChange={(event) => setQuizCountDraft({ ...quizCountDraft, provider: event.target.value })}>{availableQuizProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label> : <p className="quiz-provider-hint">A geração será feita com {availableQuizProviders[0]?.name || 'a integração configurada'}.</p>}<label className="field">Quantidade de questões<input type="number" min="1" max="30" value={quizCountDraft.questionCount} onChange={(event) => setQuizCountDraft({ ...quizCountDraft, questionCount: event.target.value })}/><small>Escolha de 1 a 30 questões de múltipla escolha.</small></label>{quizNotice && <p className="quiz-notice error" role="alert">{quizNotice}</p>}<div className="convert-modal-footer"><button className="button secondary" onClick={() => { setQuizCountDraft(null); setQuizNotice(''); }}>Cancelar</button><button className="button primary" onClick={requestQuizGeneration} disabled={quizGeneratingLessonId === quizCountDraft.id || !Number.isInteger(Number(quizCountDraft.questionCount)) || Number(quizCountDraft.questionCount) < 1 || Number(quizCountDraft.questionCount) > 30}>{quizGeneratingLessonId === quizCountDraft.id ? <LoaderCircle size={16} className="quiz-spinner"/> : <WandSparkles size={16}/>}Gerar questões</button></div></section></div>}
        {activeQuiz && <div className="modal-overlay quiz-view-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveQuiz(null); }}><section className="convert-modal quiz-view-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-view-title"><header className="quiz-document-header">{activeCongregation?.logoData && <img src={activeCongregation.logoData} alt={`Logo ${activeCongregation.name}`}/>}<div><span>{activeCongregation?.name || 'Campanha Evangelizadora'}</span><h2 id="quiz-view-title">{activeQuiz.lessonTitle}</h2><small>Questionário · {activeQuiz.questions.length} questões · {activeQuiz.provider === 'deepseek' ? 'DeepSeek' : 'ChatGPT'}</small></div><button className="icon-button quiz-close" onClick={() => setActiveQuiz(null)} aria-label="Fechar"><X size={19}/></button></header><div className="quiz-question-columns">{activeQuiz.questions.map((item, index) => <article className="quiz-question" key={`${activeQuiz.id}-${index}`}><h3><span>{index + 1}.</span> {item.question}</h3><ol type="A">{item.options.map((option, optionIndex) => <li key={optionIndex}>{option.replace(/^[A-D][).]\s*/, '')}</li>)}</ol><details><summary>Ver gabarito e explicação</summary><p><b>Resposta:</b> {item.correctAnswer}</p>{item.explanation && <p>{item.explanation}</p>}</details></article>)}</div><footer className="quiz-modal-footer"><button className="button secondary" onClick={() => setActiveQuiz(null)}>Fechar</button><button className="button primary" onClick={exportQuizPdf}><Download size={16}/> Baixar PDF paisagem</button></footer></section></div>}
        {['relatorios', 'frequencia'].includes(page) && activeCongregation && <header className="report-brand">{activeCongregation.logoData && <img src={activeCongregation.logoData} alt="Logo"/>}<div><b>{activeCongregation.name}</b><span>{[activeCongregation.area && `Área ${activeCongregation.area}`, activeCongregation.sector && `Setor ${activeCongregation.sector}`].filter(Boolean).join(' · ')}</span></div></header>}
         {page === 'integracoes' && <div className="integration-public-note">Cole o link público do formulário (<code>/forms/d/e/…/viewform</code>) ou o ID público. Os campos são lidos da página pública; não é necessária permissão de edição.</div>}
        {unsentIntegrationRows.length > 0 && <section className="panel form-actions-panel"><PanelHeading icon={FileInput} title="Enviar itens ao Google Forms" description="Abra o formulário pré-preenchido e confirme aqui depois de enviar a resposta."/><div className="form-action-list">{unsentIntegrationRows.map((row) => { const key = `${row.sectionId}:${row.recordId}`; return <div className="form-action-row" key={key}><div className="form-action-name"><b>{row.title}</b><small>{integrationSections.find((section) => section.id === row.sectionId)?.title}</small></div><div className="form-action-buttons"><button className="button secondary form-open-button" onClick={() => openPrefilledForm(row)} title="Abrir formulário pré-preenchido"><FileInput size={16}/><span>Abrir formulário</span></button>{formOpenedItems[key] && <button className="button primary form-confirm-button" onClick={() => notify(() => markIntegrationItemSent(row))}><CircleCheck size={16}/><span>Marcar enviado</span></button>}</div></div>; })}</div></section>}
        {page === 'integracoes' && <>
          <section className="panel integration-panel chatgpt-integration-panel">
            <PanelHeading icon={Bot} title="ChatGPT" description="Gere questionários a partir do conteúdo das lições do discipulado." />
            <div className="integration-status-row"><div className="integration-description"><span className={`status-dot ${chatGptConfigured ? 'on' : ''}`} /><div><b>{chatGptConfigured ? 'Integração configurada' : 'Integração não configurada'}</b><small>O token é salvo criptografado e usado somente para solicitar os questionários desta congregação.</small></div></div></div>
            <label className="field chatgpt-token-field">Token da API OpenAI<input type="text" autoComplete="off" spellCheck="false" value={chatGptApiKey} onChange={(event) => { setChatGptApiKey(event.target.value); setChatGptConfigured(false); setChatGptMessage(''); }} placeholder="sk-..."/><small>Você pode criar e revogar tokens temporários no painel da OpenAI. O token fica visível aqui para facilitar a troca.</small></label>
            <div className="integration-footer"><span className="integration-notice" role="status">{chatGptMessage}</span><button className="button primary" onClick={saveChatGptIntegration} disabled={chatGptBusy}><Save size={16}/>{chatGptBusy ? 'Salvando…' : 'Salvar token do ChatGPT'}</button></div>
          </section>
          <section className="panel integration-panel deepseek-integration-panel">
            <PanelHeading icon={Waves} title="DeepSeek" description="Use o DeepSeek para criar questionários a partir do conteúdo das lições." />
            <div className="integration-status-row"><div className="integration-description"><span className={`status-dot ${deepSeekConfigured ? 'on' : ''}`} /><div><b>{deepSeekConfigured ? 'Integração configurada' : 'Integração não configurada'}</b><small>Token criptografado e associado à congregação selecionada.</small></div></div></div>
            <label className="field deepseek-token-field">Token da API DeepSeek<input type="text" autoComplete="off" spellCheck="false" value={deepSeekApiKey} onChange={(event) => { setDeepSeekApiKey(event.target.value); setDeepSeekConfigured(false); setDeepSeekMessage(''); }} placeholder="sk-..."/><small>O token fica visível nesta tela e pode ser trocado ou removido quando quiser.</small></label>
            <div className="integration-footer"><span className="integration-notice" role="status">{deepSeekMessage}</span><button className="button primary" onClick={saveDeepSeekIntegration} disabled={deepSeekBusy}><Save size={16}/>{deepSeekBusy ? 'Salvando…' : 'Salvar token do DeepSeek'}</button></div>
          </section>
          <section className="panel integration-panel">
            <PanelHeading icon={FileInput} title="Google Forms" description="Configure um link público e escolha os dados a pré-preencher." />
            <div className="integration-status-row">
              <div className="integration-description">
                <span className={`status-dot ${integration.enabled ? 'on' : ''}`} />
                <div>
                  <b>{integration.enabled ? 'Integração ativada' : 'Integração desativada'}</b>
                  <small>Configuração independente para {data.congregations.find((item) => item.id === activeCongregationId)?.name || 'a congregação selecionada'}</small>
                </div>
              </div>
              <label className="switch-control">
                <input type="checkbox" checked={integration.enabled} onChange={(event) => setIntegrationValue('enabled', event.target.checked)} />
                <span className="switch-slider" />
              </label>
            </div>
            <div className="integration-setup-grid">
              <label className="field">Link público ou ID do formulário
                <input disabled={!integration.enabled} value={integration.formId} onChange={(event) => setIntegrationValue('formId', event.target.value)} placeholder="https://docs.google.com/forms/d/e/.../viewform" />
              </label>
              <button className="button secondary integration-fetch" disabled={!integration.enabled || !integration.formId || integrationBusy} onClick={loadFormQuestions}>
                <RefreshCw size={15} />{integrationBusy ? 'Lendo campos…' : 'Ler campos públicos'}
              </button>
            </div>
            <p className="integration-help">Os campos são lidos da página pública. Não é necessário conectar uma conta Google nem ter permissão de edição.</p>
          </section>
          <section className="panel">
            <PanelHeading icon={FileInput} title="Valores fixos" description="Esses valores serão adicionados a todos os links pré-preenchidos desta congregação." />
            <div className="fixed-answer-grid">{[['area', 'Área'], ['congregation', 'Congregação']].map(([key, label]) => {
              const answer = integration.fixedAnswers?.[key] || { questionId: '', value: '' };
              const question = formQuestions.find((item) => item.id === answer.questionId);
              return <div className="fixed-answer-card" key={key}>
                <b>{label}</b>
                <label className="field">Pergunta do formulário
                  <select disabled={!integration.enabled || !formQuestions.length} value={answer.questionId} onChange={(event) => setFixedAnswer(key, 'questionId', event.target.value)}>
                    <option value="">{formQuestions.length ? 'Selecione a pergunta' : 'Leia os campos primeiro'}</option>
                    {formQuestions.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}
                  </select>
                </label>
                <label className="field">Valor fixo
                  {question?.options?.length ? <select disabled={!integration.enabled} value={answer.value} onChange={(event) => setFixedAnswer(key, 'value', event.target.value)}><option value="">Selecione uma opção</option>{question.options.map((option) => <option value={option} key={option}>{option}</option>)}</select> : <input disabled={!integration.enabled || !question} value={answer.value} onChange={(event) => setFixedAnswer(key, 'value', event.target.value)} placeholder="Selecione a pergunta primeiro" />}
                </label>
              </div>;
            })}</div>
            <div className="integration-footer"><span className="integration-notice">Salve a configuração para aplicar Área e Congregação nos próximos links.</span><button className="button primary" disabled={integrationBusy} onClick={saveIntegration}><Save size={16} />Salvar valores</button></div>
          </section>
          <section className="panel">
            <PanelHeading icon={Settings} title="Seções e campos" description="Ative as seções e faça o de/para de cada campo com uma pergunta do formulário." />
            {integrationSections.map((section) => <article className="integration-section" key={section.id}>
              <div className="integration-section-heading">
                <div><b>{section.title}</b><small>{section.description}</small></div>
                <label className="switch-control"><input type="checkbox" disabled={!integration.enabled} checked={Boolean(integration.sections[section.id])} onChange={(event) => setIntegration((current) => ({ ...current, sections: { ...current.sections, [section.id]: event.target.checked } }))} /><span className="switch-slider" /></label>
              </div>
              {integration.sections[section.id] && <div className="mapping-list">{section.fields.map((field) => {
                const key = `${section.id}:${field}`;
                return <div className="mapping-item" key={key}>
                  <label className="mapping-check"><input type="checkbox" disabled={!integration.enabled} checked={integration.fields[key] !== false} onChange={(event) => setIntegration((current) => ({ ...current, fields: { ...current.fields, [key]: event.target.checked } }))} /><span>{field}</span></label>
                  <select disabled={!integration.enabled || integration.fields[key] === false || !formQuestions.length} value={integration.mappings[key] || ''} onChange={(event) => setIntegration((current) => ({ ...current, mappings: { ...current.mappings, [key]: event.target.value } }))}>
                    <option value="">{formQuestions.length ? 'Selecione a pergunta no Forms' : 'Leia os campos primeiro'}</option>
                    {formQuestions.map((question) => <option value={question.id} key={question.id}>{question.title}</option>)}
                  </select>
                </div>;
              })}</div>}
            </article>)}
            <div className="integration-footer"><span className="integration-notice">{integrationMessage}</span><button className="button primary" disabled={integrationBusy} onClick={saveIntegration}><Save size={16} />{integrationBusy ? 'Salvando…' : 'Salvar configuração'}</button></div>
          </section>
        </>}
        {page === 'inicio' && <><section className="welcome-card"><div className="welcome-copy"><span className="welcome-label">PAINEL DE EVANGELIZAÇÃO</span><div className="tech-wrap"><TechText text="Campanha Evangelizadora" fontSize={58} fontWeight={650} color="#ffffff" accentColor="#b7d9ff" reveal="letter" dashLength={3} dashGap={2} specks={12}/></div><p>Um só propósito, muitas vidas alcançadas. Acompanhe os encontros e cuide de cada pessoa.</p><div className="welcome-date"><CalendarDays size={15}/>{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</div></div><div className="welcome-symbol"><BookOpen size={35}/></div><div className="welcome-decoration"/></section><section className="section-block"><div className="section-heading"><div><h2>Resumo da campanha</h2><p>Indicadores atualizados com seus cadastros e encontros.</p></div><button className="text-button" onClick={() => nav('relatorios')}>Ver relatórios <ChevronRight size={16}/></button></div><div className="stats-grid">{stats.map(({ label, value, icon: Icon, color }) => <article className="stat-card" key={label}><div className="stat-top"><span>{label}</span><span className={`stat-icon ${color}`}><Icon size={18}/></span></div><strong>{value}</strong><small>no sistema</small></article>)}</div></section><div className="quick-actions"><button className="button primary" onClick={() => nav('chamadas')}><Plus size={17}/> Registrar encontro <ChevronRight size={16}/></button><button className="button secondary" onClick={() => nav('turmas')}><Users size={17}/> Gerenciar turmas</button></div><section className="panel"><div className="panel-heading"><div><h2>Atividade recente</h2><p>Últimos encontros registrados na campanha.</p></div><button className="icon-button muted" onClick={load} title="Atualizar"><Activity size={17}/></button></div>{records.length ? <div className="record-list">{records.slice(0, 5).map((record) => <div className="record-row" key={record.id}><span className="record-symbol"><ClipboardCheck size={18}/></span><div className="record-info"><b>{data.classes.find((c) => c.id === record.classId)?.name || 'Encontro evangelizador'}</b><span>{record.lessonName || 'Encontro'} · {formatDate(record.date)}</span></div><span className="badge green">{record.entries?.filter((e) => e.status === 'present').length || 0} presentes</span></div>)}</div> : <div className="empty-state"><span className="empty-icon"><FileText size={20}/></span><b>Nenhum encontro registrado ainda</b><p>Registre o primeiro encontro para ver a atividade recente aqui.</p><button className="button secondary" onClick={() => nav('chamadas')}>Registrar encontro <ChevronRight size={15}/></button></div>}</section></>}
        {page === 'novos-convertidos' && <>
          <section className="panel">
            <div className="panel-heading convert-list-heading">
              <div className="panel-title-icon"><span className="heading-icon"><Users size={18}/></span><div><h2>Novos convertidos cadastrados</h2><p>{data.newConverts.length} pessoas nesta congregação</p></div></div>
              <button className="button primary" onClick={openNewConvertModal}><Plus size={16}/>Novo convertido</button>
            </div>
            {data.newConverts.length ? <div className="table-wrap"><table><thead><tr><th>Nome</th><th>Culto / atividade</th><th>Conversão</th><th>Contato</th><th>Endereço</th><th>Ações</th></tr></thead><tbody>{data.newConverts.map((person) => {
              const address = [person.street, person.number, person.complement, person.neighborhood, person.city, person.state].filter(Boolean).join(', ');
              return <tr key={person.id}>
                <td><b>{person.name}</b>{person.birthDate && <small className="table-subtext">Nascimento: {formatDate(person.birthDate)}</small>}</td>
                <td>{person.eventName}</td><td>{formatDate(person.conversionDate)}</td><td>{person.contactPhone || '—'}</td>
                <td>{address ? <span>{address}{person.cep && <small className="table-subtext">CEP {person.cep}</small>}</span> : '—'}</td>
                <td><div className="convert-row-actions"><button className="small-edit" onClick={() => openEditConvertModal(person)}><Pencil size={13}/>Editar</button><button className="small-danger" onClick={() => window.confirm(`Remover o cadastro de ${person.name}?`) && notify(() => request(`/school/new-converts/${person.id}`, 'DELETE'))}>Remover</button></div></td>
              </tr>;
            })}</tbody></table></div> : <Empty message="Nenhum novo convertido cadastrado" detail="Cadastre a primeira pessoa alcançada nesta congregação."/>}
          </section>
          {showConvertModal && <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeConvertModal(); }}>
            <section className="convert-modal" role="dialog" aria-modal="true" aria-labelledby="convert-modal-title">
              <div className="convert-modal-heading"><div><span className="eyebrow">CADASTRO DA CONGREGAÇÃO</span><h2 id="convert-modal-title">{editingConvertId ? 'Editar novo convertido' : 'Cadastrar novo convertido'}</h2><p>Preencha os dados da pessoa e do endereço.</p></div><button className="icon-button" aria-label="Fechar" onClick={closeConvertModal}><X size={20}/></button></div>
              <form onSubmit={(event) => { event.preventDefault(); void createNewConvert(); }}>
                <div className="form-grid convert-form-grid">
                  <label className="field">Culto ou atividade da conversão<SearchableSelect options={conversionEvents} value={newConvert.eventName} onChange={(value) => setNewConvert({ ...newConvert, eventName: value })} placeholder="Pesquise ou selecione uma atividade"/></label>
                  <label className="field">Nome da pessoa<input value={newConvert.name} onChange={(event) => setNewConvert({ ...newConvert, name: event.target.value })} placeholder="Nome completo" required/></label>
                  <label className="field">Data da conversão<input type="date" value={newConvert.conversionDate} onChange={(event) => setNewConvert({ ...newConvert, conversionDate: event.target.value })} required/></label>
                  <label className="field">Data de nascimento<input type="date" value={newConvert.birthDate} onChange={(event) => setNewConvert({ ...newConvert, birthDate: event.target.value })}/></label>
                  <label className="field">Telefone para contato<input type="tel" value={newConvert.contactPhone} onChange={(event) => setNewConvert({ ...newConvert, contactPhone: event.target.value })} placeholder="(81) 99999-9999"/></label>
                  <label className="field">CEP<input inputMode="numeric" maxLength={9} value={newConvert.cep} onChange={(event) => setNewConvert({ ...newConvert, cep: event.target.value.replace(/[^\d-]/g, '').slice(0, 9) })} placeholder="00000-000"/></label>
                  <label className="field">Rua / logradouro<input value={newConvert.street} onChange={(event) => setNewConvert({ ...newConvert, street: event.target.value })} placeholder="Rua, avenida, travessa..."/></label>
                  <label className="field">Número<input value={newConvert.number} onChange={(event) => setNewConvert({ ...newConvert, number: event.target.value })} placeholder="Número ou s/n"/></label>
                  <label className="field">Complemento<input value={newConvert.complement} onChange={(event) => setNewConvert({ ...newConvert, complement: event.target.value })} placeholder="Casa, bloco, referência..."/></label>
                  <label className="field">Bairro<input value={newConvert.neighborhood} onChange={(event) => setNewConvert({ ...newConvert, neighborhood: event.target.value })} placeholder="Bairro"/></label>
                  <label className="field">Cidade<input value={newConvert.city} onChange={(event) => setNewConvert({ ...newConvert, city: event.target.value })} placeholder="Cidade"/></label>
                  <label className="field">Estado<select value={newConvert.state} onChange={(event) => setNewConvert({ ...newConvert, state: event.target.value })}><option value="">Selecione o estado</option>{brazilStateOptions.map(([uf, name]) => <option value={uf} key={uf}>{name}</option>)}</select></label>
                </div>
                {convertError && <div className="convert-modal-error" role="alert">{convertError}</div>}
                <div className="convert-modal-footer"><button type="button" className="button secondary" onClick={closeConvertModal}>Cancelar</button><button className="button primary" disabled={convertSaving}>{convertSaving ? 'Salvando…' : editingConvertId ? 'Salvar alterações' : 'Salvar novo convertido'}</button></div>
              </form>
            </section>
          </div>}
        </>}
        {page === 'congregacao' && <section className="panel"><PanelHeading icon={BookOpen} title="Dados da congregação" description="Edite as informações e a logo da congregação selecionada."/><form onSubmit={(event) => { event.preventDefault(); saveCongregation(); }}>
          <div className="form-grid congregation-edit-grid"><label className="field">Nome da congregação<input value={congregationEdit.name} onChange={(event) => setCongregationEdit({ ...congregationEdit, name: event.target.value })} required/></label><label className="field">Área<input value={congregationEdit.area} onChange={(event) => setCongregationEdit({ ...congregationEdit, area: event.target.value })} placeholder="10"/></label><label className="field">Setor<input value={congregationEdit.sector} onChange={(event) => setCongregationEdit({ ...congregationEdit, sector: event.target.value })} placeholder="10"/></label></div>
          <label className="field congregation-contact-field">Contato para justificativas<input type="tel" inputMode="tel" autoComplete="tel" value={formatBrazilPhone(congregationEdit.justificationContact)} onChange={(event) => setCongregationEdit({ ...congregationEdit, justificationContact: event.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="(81) 99999-9999"/><small>Esse é o contato que a pessoa deverá chamar caso não possa atender a uma escala.</small></label>
          <section className="scale-message-config"><label className="field">Modelo de mensagem para a escala<textarea value={congregationEdit.scaleMessageTemplate || DEFAULT_SCALE_MESSAGE} onChange={(event) => setCongregationEdit({ ...congregationEdit, scaleMessageTemplate: event.target.value })} rows={5}/></label><div className="scale-message-help"><b>Variáveis disponíveis</b><p>Use estas variáveis para preencher automaticamente os dados da aula:</p><div>{SCALE_MESSAGE_VARIABLES.map((variable) => <code key={variable}>{variable}</code>)}</div></div></section>
          <div className="congregation-logo-editor"><div className="congregation-logo-preview">{congregationEdit.logoData ? <img src={congregationEdit.logoData} alt="Logo da congregação"/> : <BookOpen size={30}/>}</div><div className="congregation-logo-copy"><b>Logo da congregação</b><span>Será exibida nos relatórios impressos. Imagens grandes serão reduzidas automaticamente.</span><div className="congregation-logo-actions"><label className="button secondary">{logoBusy ? 'Processando…' : 'Escolher imagem'}<input type="file" accept="image/*" onChange={(event) => chooseCongregationLogo(event.target.files?.[0])} disabled={logoBusy} hidden/></label>{congregationEdit.logoData && <button type="button" className="text-button" onClick={() => setCongregationEdit({ ...congregationEdit, logoData: '' })}>Remover logo</button>}</div></div></div>
          <div className="form-footer"><button className="button primary" disabled={congregationSaving || logoBusy}><Save size={16}/>{congregationSaving ? 'Salvando…' : 'Salvar alterações'}</button></div>
        </form></section>}
        {showCreateCongregation && <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreateCongregation(false); }}><section className="convert-modal" role="dialog" aria-modal="true" aria-labelledby="create-congregation-title"><div className="panel-heading"><div><h2 id="create-congregation-title">Nova congregação</h2><p>Cadastre uma congregação para selecioná-la no sistema.</p></div><button type="button" className="icon-button" onClick={() => setShowCreateCongregation(false)} aria-label="Fechar"><X size={18}/></button></div><form onSubmit={(event) => { event.preventDefault(); createCongregation(); }}><div className="form-grid"><label className="field">Nome da congregação<input value={congregationName} onChange={(event) => setCongregationName(event.target.value)} placeholder="Ex.: Jardim das Oliveiras" required/></label><label className="field">Área<input value={congregationArea} onChange={(event) => setCongregationArea(event.target.value)} placeholder="10"/></label><label className="field">Setor<input value={congregationSector} onChange={(event) => setCongregationSector(event.target.value)} placeholder="10"/></label></div><div className="convert-modal-footer"><button type="button" className="button secondary" onClick={() => setShowCreateCongregation(false)}>Cancelar</button><button className="button primary"><Plus size={16}/> Criar congregação</button></div></form></section></div>}
        {page === 'turmas' && <>
          <section className="panel"><PanelHeading icon={Users} title="Nova turma" description="Escolha o dia semanal e horário. A primeira aula começa na data mais próxima desse dia."/><form className="form-row" onSubmit={(e) => { e.preventDefault(); createClass(); }}>
            <label className="field grow">Nome da turma<input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Ex.: Grupo Esperança" required/></label>
            <label className="field weekday-field">Dia das aulas<select value={classWeekday} onChange={(e) => { const weekday = Number(e.target.value); setClassWeekday(weekday); if (classStartDateAuto) setClassStartDate(nearestWeekday(weekday)); }} required>{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
            <label className="field start-date-field">Horário das aulas<input type="time" value={classLessonTime} onChange={(e) => setClassLessonTime(e.target.value)} required/></label>
            <label className="field start-date-field">Início da turma<input type="date" value={classStartDate} onChange={(e) => { setClassStartDate(e.target.value); setClassStartDateAuto(false); }} required/></label>
            <button className="button primary form-button"><Plus size={16}/> Criar turma</button>
          </form></section>
          <section className="panel"><PanelHeading icon={FolderOpen} title="Turmas cadastradas" description={`${data.classes.length} grupos cadastrados`}/>{data.classes.length ? <div className="table-wrap"><table><thead><tr><th>Nome da turma</th><th>Dia</th><th>Horário</th><th>Data de início</th><th>Descrição</th><th>Participantes</th><th></th></tr></thead><tbody>{data.classes.map((group) => <tr key={group.id}><td><b>{group.name}</b></td><td>{weekdays[Number(group.lessonWeekday ?? 0)]}</td><td>{group.lessonTime || '09:00'}</td><td>{formatDate(group.startDate)}</td><td>{group.description || '—'}</td><td><span className="badge blue">{group.studentIds?.length || 0} pessoas</span></td><td><button className="small-edit" onClick={() => setEditingClassStart({ id: group.id, name: group.name, startDate: group.startDate, lessonWeekday: Number(group.lessonWeekday ?? 0), lessonTime: group.lessonTime || '09:00' })}><Pencil size={14}/> Editar escala</button> <button className="small-danger" onClick={() => window.confirm(`Apagar a turma ${group.name}?`) && notify(() => request(`/school/classes/${group.id}`, 'DELETE'))}>Apagar</button></td></tr>)}</tbody></table></div> : <Empty message="Nenhuma turma cadastrada" detail="Crie uma turma para organizar os participantes."/>}</section>
        </>}
        {page === 'turmas' && <section className="panel"><PanelHeading icon={Users} title="Novo participante" description="Cadastre uma pessoa e, se quiser, vincule-a a uma turma."/><form className="form-row" onSubmit={(e) => { e.preventDefault(); createStudent(); }}><label className="field grow">Nome completo<input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Ex.: Maria Oliveira" required/></label><label className="field grow">Turma<select value={studentClass} onChange={(e) => setStudentClass(e.target.value)}><option value="">Sem turma por enquanto</option>{data.classes.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><button className="button primary form-button"><Plus size={16}/> Cadastrar participante</button></form>{data.students.length > 0 && <div className="table-wrap student-table"><table><thead><tr><th>Participante</th><th>Turma</th></tr></thead><tbody>{data.students.map((student) => <tr key={student.id}><td><b>{student.name}</b></td><td>{data.classes.filter((group) => group.studentIds?.includes(student.id)).map((group) => group.name).join(', ') || 'Sem turma'}</td></tr>)}</tbody></table></div>}</section>}
        {page === 'escala' && <>
          <section className="panel scale-panel"><div className="panel-heading"><div><h2>Escala · {currentDiscipleshipClass?.name || 'Turma atual'}</h2><p>Aulas {weekdayPhrases[Number(currentDiscipleshipClass?.lessonWeekday ?? 0)]}, às {currentDiscipleshipClass?.lessonTime || '09:00'}; início em {formatDate(currentDiscipleshipClass?.startDate)}.</p></div><div className="scale-actions">{data.classes.length > 1 && <label className="field scale-class-picker">Turma<select value={currentDiscipleshipClass?.id || ''} onChange={(event) => { const id = event.target.value; setScaleClassId(id); localStorage.setItem(`campanha-escala-turma:${activeCongregationId}`, id); setEditingScale(null); setEditingClassStart(null); }} aria-label="Selecionar turma para a escala">{data.classes.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label>}<button className="button secondary" onClick={() => currentDiscipleshipClass && setEditingClassStart({ id: currentDiscipleshipClass.id, name: currentDiscipleshipClass.name, startDate: currentDiscipleshipClass.startDate, lessonWeekday: Number(currentDiscipleshipClass.lessonWeekday ?? 0), lessonTime: currentDiscipleshipClass.lessonTime || '09:00' })} disabled={!currentDiscipleshipClass}><Pencil size={16}/> Alterar início/dia/horário</button><button className="button secondary" onClick={exportScale} disabled={!classSchedule.length || scaleExporting}><FileText size={16}/>{scaleExporting ? 'Gerando PDF…' : 'Exportar PDF'}</button></div></div>
            {!currentDiscipleshipClass ? <Empty message="Nenhuma turma cadastrada" detail="Cadastre uma turma para montar a escala de aulas."/> : !classSchedule.length ? <div className="scale-empty"><CalendarDays size={30}/><b>Preparando as 22 aulas da turma</b><span>A sequência começa em Introdução ao Discipulado e termina em Evangelismo. Datas e professores ficam disponíveis para edição.</span></div> : <>
              <div className="scale-overview no-print">
                <div className="scale-cycle-legend">{data.discipleshipCycles.map((cycle) => <span className={`scale-cycle-chip scale-cycle-${cycle.position}`} key={cycle.id}><i/>{cycle.name}<small>· {cycle.lessons.length} aulas</small></span>)}</div>
                <div className="scale-lesson-grid">{classSchedule.map((lesson, index) => {
                  const cycle = data.discipleshipCycles.find((item) => item.id === lesson.cycleId) || data.discipleshipCycles.find((item) => item.name === lesson.cycleName);
                  const cyclePosition = cycle?.position || 1;
                  const teacherName = data.teachers.find((teacher) => teacher.id === lesson.teacherId)?.name || 'Professor a definir';
                  return <article className={`scale-lesson-card scale-cycle-${cyclePosition}`} key={lesson.id}>
                    <button className="scale-lesson-edit" onClick={() => setEditingScale({ ...lesson, originalDate: lesson.date, defaultTime: currentDiscipleshipClass.lessonTime || '09:00', timeOverride: lesson.timeOverride || '' })} aria-label={`Editar aula ${index + 1}: ${lesson.title}`}>
                      <span className="scale-lesson-card-top"><b>{String(index + 1).padStart(2, '0')}</b><span>{cycle?.name || 'Ciclo básico'}</span></span>
                      <strong>{lesson.title}</strong>
                      <span className="scale-lesson-meta"><span><CalendarDays size={14}/>{lesson.date ? formatDate(lesson.date) : 'Data a definir'}{lesson.time ? ` · ${lesson.time}` : ''}</span><span><Users size={14}/>{teacherName}</span></span>
                    </button>
                    <button className={`scale-content-action ${lesson.content ? 'has-content' : ''}`} onClick={() => setEditingLessonContent({ id: lesson.id, title: lesson.title, content: lesson.content || '' })} aria-label={`Adicionar ou editar conteúdo da lição ${lesson.title}`} title={lesson.content ? 'Editar conteúdo da lição' : 'Adicionar conteúdo da lição'}><FileText size={15}/></button>
                    {lesson.justification && <small className="scale-lesson-justification">Justificativa registrada</small>}
                    <div className="scale-card-actions">
                      <button className="scale-ai-action" disabled={!availableQuizProviders.length || !lesson.content?.trim() || (quizJobs[lesson.id] || []).some((quiz) => quiz.status === 'pending')} onClick={() => { setQuizNotice(''); setQuizCountDraft({ id: lesson.id, title: lesson.title, questionCount: 10, provider: availableQuizProviders[0]?.id || 'chatgpt' }); }} title={!availableQuizProviders.length ? 'Configure ChatGPT ou DeepSeek em Integrações' : !lesson.content?.trim() ? 'Adicione o conteúdo da lição primeiro' : 'Gerar questionário com IA'} aria-label={`Gerar questionário para ${lesson.title}`}>
                        {(quizJobs[lesson.id] || []).some((quiz) => quiz.status === 'pending') ? <LoaderCircle size={14} className="quiz-spinner"/> : <WandSparkles size={14}/>}
                      </button>
                      {(quizJobs[lesson.id] || []).find((quiz) => quiz.status === 'completed') && <button className="scale-quiz-action" onClick={() => setActiveQuiz((quizJobs[lesson.id] || []).find((quiz) => quiz.status === 'completed'))} title="Abrir questionário gerado" aria-label={`Abrir questionário de ${lesson.title}`}><ClipboardList size={14}/></button>}
                      <button className="scale-message-action" onClick={() => prepareScaleMessage(lesson)} aria-label={`Montar mensagem para ${teacherName}`} title="Montar mensagem para o professor"><MessageCircle size={14}/></button>
                    </div>
                  </article>;
                })}</div>
              </div>
              <div className="table-wrap scale-print-list"><table className="scale-table"><thead><tr><th>Data</th><th>Título da aula</th><th>Professor</th><th>Justificativa de alteração</th></tr></thead><tbody>{classSchedule.map((lesson) => <tr key={lesson.id}><td><b>{new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${lesson.date}T12:00:00Z`))}</b></td><td>{lesson.title}</td><td>{data.teachers.find((teacher) => teacher.id === lesson.teacherId)?.name || 'A definir'}</td><td>{lesson.justification || '—'}</td></tr>)}</tbody></table></div>
            </>}
          </section>
          {currentDiscipleshipClass && <p className="scale-note">Professores disponíveis: cadastros desta congregação. Se transferir uma aula para uma data excepcional, informe a justificativa.</p>}
          {editingClassStart && <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingClassStart(null); }}><section className="convert-modal scale-edit-modal" role="dialog" aria-modal="true" aria-labelledby="class-start-title"><div className="panel-heading"><div><h2 id="class-start-title">Escala da turma {editingClassStart.name}</h2><p>Ao alterar o início, dia ou horário, a escala será ajustada para esta turma.</p></div><button className="icon-button" onClick={() => setEditingClassStart(null)} aria-label="Fechar"><X size={18}/></button></div><div className="form-grid"><label className="field">Dia semanal<select value={editingClassStart.lessonWeekday} onChange={(event) => { const weekday = Number(event.target.value); setEditingClassStart({ ...editingClassStart, lessonWeekday: weekday, startDate: nearestWeekday(weekday, editingClassStart.startDate) }); }}>{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label><label className="field">Horário padrão<input type="time" value={editingClassStart.lessonTime || '09:00'} onChange={(event) => setEditingClassStart({ ...editingClassStart, lessonTime: event.target.value })}/></label><label className="field">Data de início<input type="date" value={editingClassStart.startDate} onChange={(event) => setEditingClassStart({ ...editingClassStart, startDate: event.target.value })}/></label></div><div className="convert-modal-footer"><button className="button secondary" onClick={() => setEditingClassStart(null)}>Cancelar</button><button className="button primary" onClick={saveClassStartDate}><Save size={16}/> Salvar e ajustar escala</button></div></section></div>}
          {editingLessonContent && <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingLessonContent(null); }}><section className="convert-modal scale-edit-modal" role="dialog" aria-modal="true" aria-labelledby="lesson-content-title"><div className="panel-heading"><div><h2 id="lesson-content-title">Conteúdo da lição</h2><p>{editingLessonContent.title}</p></div><button className="icon-button" onClick={() => setEditingLessonContent(null)} aria-label="Fechar"><X size={18}/></button></div><label className="field scale-content-field">Anotações e conteúdo<textarea rows={9} maxLength={10000} value={editingLessonContent.content} onChange={(event) => setEditingLessonContent({ ...editingLessonContent, content: event.target.value })} placeholder="Escreva aqui o conteúdo, tópicos ou anotações desta lição…"/><small>{editingLessonContent.content.length}/10.000 caracteres</small></label><div className="convert-modal-footer"><button className="button secondary" onClick={() => setEditingLessonContent(null)}>Cancelar</button><button className="button primary" onClick={saveLessonContent} disabled={scaleSaving}><Save size={16}/>{scaleSaving ? 'Salvando…' : 'Salvar conteúdo'}</button></div></section></div>}
          {editingScale && <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingScale(null); }}><section className="convert-modal scale-edit-modal" role="dialog" aria-modal="true" aria-labelledby="scale-edit-title"><div className="panel-heading"><div><h2 id="scale-edit-title">Editar aula</h2><p>Altere a data, o tema, o professor ou o horário.</p></div><button className="icon-button" onClick={() => setEditingScale(null)} aria-label="Fechar"><X size={18}/></button></div><div className="form-grid"><label className="field">Data da aula<input type="date" value={editingScale.date} onChange={(event) => setEditingScale({ ...editingScale, date: event.target.value })}/></label><label className="field">Horário da aula<input type="time" value={editingScale.timeOverride || editingScale.defaultTime || currentDiscipleshipClass?.lessonTime || '09:00'} onChange={(event) => setEditingScale({ ...editingScale, timeOverride: event.target.value === (editingScale.defaultTime || currentDiscipleshipClass?.lessonTime || '09:00') ? '' : event.target.value })}/></label><label className="field">Título da aula<select value={editingScale.title} onChange={(event) => setEditingScale({ ...editingScale, title: event.target.value })}>{data.discipleshipLessons.map((lesson) => <option key={lesson}>{lesson}</option>)}{!data.discipleshipLessons.includes(editingScale.title) && <option>{editingScale.title}</option>}</select></label><label className="field">Professor<select value={editingScale.teacherId} onChange={(event) => setEditingScale({ ...editingScale, teacherId: event.target.value })}><option value="">A definir</option>{data.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label></div><p className="scale-time-hint">Horário padrão da turma: {editingScale.defaultTime || currentDiscipleshipClass?.lessonTime || '09:00'}. Alterar aqui afeta somente esta aula.</p>{editingScale.date !== editingScale.originalDate && <label className="field scale-justification">Justificativa da mudança<textarea value={editingScale.justification || ''} onChange={(event) => setEditingScale({ ...editingScale, justification: event.target.value })} placeholder="Ex.: Aula transferida devido às eleições." required/></label>}<div className="convert-modal-footer"><button className="button secondary" onClick={() => setEditingScale(null)}>Cancelar</button><button className="button primary" onClick={saveScaleItem} disabled={scaleSaving}>{scaleSaving ? 'Salvando…' : 'Salvar aula'}</button></div></section></div>}
        </>}
        {page === 'aulas' && (data.discipleshipCycles.length ? data.discipleshipCycles.map((cycle) => <section className="panel cycle-panel" key={cycle.id} style={{ borderTop: `4px solid ${cycle.color}` }}><div className="cycle-heading" style={{ color: cycleTextColor(cycle.color) }}><div><span className="cycle-kicker">CICLO {String(cycle.position).padStart(2, '0')}</span><h2>{cycle.name}</h2></div><span className="badge" style={{ background: `${cycle.color}18`, color: cycleTextColor(cycle.color) }}>{cycle.lessons.length} aulas</span></div><ol className="cycle-lesson-list">{cycle.lessons.map((lesson) => <li key={lesson.id} title={`Ciclo: ${cycle.name}`} style={{ borderLeftColor: cycle.color }}><span className="cycle-lesson-number" style={{ color: cycleTextColor(cycle.color) }}>{String(lesson.position).padStart(2, '0')}</span><b>{lesson.title}</b><span className="cycle-lesson-chip" style={{ background: `${cycle.color}18`, color: cycleTextColor(cycle.color) }}>{cycle.name}</span></li>)}</ol></section>) : <Empty message="As aulas ainda não foram organizadas" detail="Os ciclos serão exibidos aqui quando estiverem disponíveis."/>)}
        {page === 'professores' && <><section className="panel"><PanelHeading icon={BookOpen} title="Novo professor" description="Cadastre os responsáveis pelos encontros."/><form className="form-row" onSubmit={(e) => { e.preventDefault(); createTeacher(); }}><label className="field grow">Nome completo<input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Ex.: Ana Souza" required/></label><label className="field gender-field">Sexo<select value={teacherGender} onChange={(e) => setTeacherGender(e.target.value)}><option value="male">Masculino</option><option value="female">Feminino</option></select></label><label className="field grow">Telefone (opcional)<input value={teacherPhone} onChange={(e) => setTeacherPhone(e.target.value)} placeholder="(11) 99999-9999"/></label><button className="button primary form-button"><Plus size={16}/> Cadastrar</button></form></section><section className="panel"><PanelHeading icon={Users} title="Equipe" description="Pessoas disponíveis para conduzir os encontros."/>{data.teachers.length ? <div className="people-list">{data.teachers.map((teacher) => <div className="person-row" key={teacher.id}><span className="person-avatar">{teacher.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}</span><div className="person-info"><b>{teacher.name}</b><span>{teacher.gender === 'female' ? 'Professora' : 'Professor'} · {teacher.phone || 'Sem telefone informado'}</span></div><label className="field teacher-gender-setting">Sexo<select aria-label={`Sexo de ${teacher.name}`} value={teacher.gender || 'male'} onChange={(event) => updateTeacherGender(teacher, event.target.value)}><option value="male">Masculino</option><option value="female">Feminino</option></select></label><span className="badge green">Ativo</span><button className="small-danger" onClick={() => window.confirm(`Apagar ${teacher.name}?`) && notify(() => request(`/school/teachers/${teacher.id}`, 'DELETE'))}>Apagar</button></div>)}</div> : <Empty message="Nenhum professor cadastrado" detail="Cadastre a equipe para registrar os encontros."/>}</section></>}
        {page === 'chamadas' && <><section className="panel"><PanelHeading icon={ClipboardCheck} title="Registrar encontro" description="Selecione o grupo e marque a participação de cada pessoa."/><div className="form-grid"><label className="field">Turma<select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}><option value="">Selecione uma turma</option>{data.classes.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label className="field">Responsável<select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)}><option value="">Selecione um professor</option>{data.teachers.map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label><label className="field">Tema do encontro<select value={lessonName} onChange={(e) => setLessonName(e.target.value)}><option value="">Encontro evangelizador</option>{data.discipleshipLessons.map((lesson) => <option key={lesson}>{lesson}</option>)}</select></label><label className="field">Data<input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)}/></label></div>{selectedClass && <div className="attendance-list"><h3>Participantes do grupo</h3>{data.classes.find((c) => c.id === selectedClass)?.studentIds?.map((id) => data.students.find((s) => s.id === id)).filter(Boolean).map((student) => <div className="attendance-person" key={student.id}><span>{student.name}</span><div className="status-options">{[['present','Presente'],['absent','Ausente'],['justified','Justificada'],['late','Atrasado']].map(([status, label]) => <button key={status} onClick={() => setEntries({ ...entries, [student.id]: status })} className={`status-choice ${((entries[student.id] || 'present') === status) ? `selected ${status}` : ''}`}>{label}</button>)}</div></div>)}</div>}<div className="form-footer"><button className="button primary" onClick={saveAttendance}><Check size={16}/> Salvar encontro</button></div></section><section className="panel"><PanelHeading icon={CalendarDays} title="Histórico recente" description="Encontros registrados por data."/>{records.length ? <div className="record-list">{records.map((record) => <div className="record-row" key={record.id}><span className="record-symbol"><CalendarDays size={18}/></span><div className="record-info"><b>{data.classes.find((c) => c.id === record.classId)?.name || 'Turma removida'}</b><span>{record.lessonName || 'Encontro'} · {formatDate(record.date)}</span></div><span className="badge green">{record.entries?.filter((e) => e.status === 'present').length || 0} presentes</span></div>)}</div> : <Empty message="Nenhum encontro registrado" detail="Os encontros salvos aparecerão aqui."/>}</section></>}
        {page === 'relatorios' && <section className="panel"><PanelHeading icon={ChartNoAxesColumn} title="Resumo da campanha" description="Indicadores gerais para acompanhamento."/><div className="stats-grid report-stats">{stats.map(({ label, value, icon: Icon, color }) => <article className="stat-card" key={label}><div className="stat-top"><span>{label}</span><span className={`stat-icon ${color}`}><Icon size={18}/></span></div><strong>{value}</strong><small>atualizado agora</small></article>)}</div><div className="report-links"><button className="button secondary" onClick={() => nav('frequencia')}>Consultar frequência <ChevronRight size={16}/></button><button className="button secondary" onClick={() => window.print()}><FileText size={16}/> Imprimir relatório</button></div></section>}
        {page === 'frequencia' && <><section className="panel"><div className="report-tools"><PanelHeading icon={ChartNoAxesColumn} title="Frequência por turma" description="Resumo de participação nos encontros registrados."/><button className="button secondary report-print-button" onClick={() => window.print()}><FileText size={16}/> Imprimir relatório</button></div><label className="field filter-field">Filtrar turma<select value={frequencyClass} onChange={(e) => setFrequencyClass(e.target.value)}><option value="all">Todas as turmas</option>{data.classes.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label></section><section className="panel">{data.students.filter((student) => frequencyClass === 'all' || data.classes.find((c) => c.id === frequencyClass)?.studentIds?.includes(student.id)).length ? <div className="table-wrap"><table><thead><tr><th>Participante</th><th>Turma</th><th>Encontros</th><th>Presenças</th><th>Frequência</th></tr></thead><tbody>{data.students.filter((student) => frequencyClass === 'all' || data.classes.find((c) => c.id === frequencyClass)?.studentIds?.includes(student.id)).map((student) => { const classGroup = data.classes.find((c) => c.studentIds?.includes(student.id)); const attendance = records.flatMap((record) => record.entries || []).filter((entry) => entry.studentId === student.id); const present = attendance.filter((entry) => entry.status === 'present').length; return <tr key={student.id}><td><b>{student.name}</b></td><td>{classGroup?.name || '—'}</td><td>{attendance.length}</td><td>{present}</td><td><span className="badge green">{attendance.length ? Math.round(present / attendance.length * 100) : 0}%</span></td></tr>; })}</tbody></table></div> : <Empty message="Sem dados de frequência" detail="Cadastre participantes e registre encontros para gerar o relatório."/>}</section></>}
        <footer className="page-footer">Campanha Evangelizadora <span>•</span> Gestão de encontros e participantes</footer>
        {page === 'novos-convertidos' && cepLookup.message && <div className={`cep-feedback ${cepLookup.status}`} role="status">{cepLookup.status === 'loading' && <span className="cep-spinner"/>}{cepLookup.message}</div>}
        {page === 'novos-convertidos' && streetLookupStatus !== 'idle' && <section className={`address-suggestions ${cepLookup.message ? 'with-cep-feedback' : ''}`} role="status"><div className="address-suggestions-heading"><b>{streetLookupStatus === 'loading' ? 'Buscando endereços…' : streetLookupStatus === 'results' ? 'Selecione um endereço sugerido' : streetLookupStatus === 'empty' ? 'Nenhum endereço encontrado' : 'Não foi possível buscar endereços'}</b><button type="button" aria-label="Fechar sugestões" onClick={() => { setStreetMatches([]); setStreetLookupStatus('idle'); }}><X size={16}/></button></div>{streetLookupStatus === 'loading' ? <div className="address-search-loading"><span className="cep-spinner"/>Consultando até 5 sugestões…</div> : null}{streetLookupStatus === 'empty' ? <p>Continue digitando ou preencha o endereço manualmente.</p> : null}{streetLookupStatus === 'error' ? <p>O serviço de endereços está indisponível. Você ainda pode preencher o endereço manualmente.</p> : null}{streetMatches.map(({ id: matchId, properties }) => <button type="button" className="address-suggestion" key={matchId} onClick={() => selectStreetSuggestion(properties)}><b>{properties.name || properties.street || 'Logradouro'}</b><span>{[properties.locality || properties.district, properties.city, properties.state, properties.postcode].filter(Boolean).join(' · ')}</span></button>)}</section>}
      </div></main></div>
  </div>;
}

function PanelHeading({ icon: Icon, title, description }) { return <div className="panel-heading"><div className="panel-title-icon"><span className="heading-icon"><Icon size={18}/></span><div><h2>{title}</h2><p>{description}</p></div></div></div>; }
function Empty({ message, detail }) { return <div className="empty-state"><span className="empty-icon"><FileText size={20}/></span><b>{message}</b><p>{detail}</p></div>; }
function SearchableSelect({ options, value, onChange, placeholder }) {
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const filteredOptions = options.filter((option) => normalize(option).includes(normalize(search)));
  useEffect(() => {
    const closeOnOutsideClick = (event) => { if (!wrapperRef.current?.contains(event.target)) { setOpen(false); setSearch(''); } };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);
  const choose = (option) => { onChange(option); setSearch(''); setOpen(false); setActiveIndex(0); };
  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => open ? Math.min(index + 1, Math.max(filteredOptions.length - 1, 0)) : 0); setOpen(true); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => open ? Math.max(index - 1, 0) : 0); setOpen(true); }
    else if (event.key === 'Enter' && open && filteredOptions.length) { event.preventDefault(); choose(filteredOptions[activeIndex] || filteredOptions[0]); }
    else if (event.key === 'Escape') { setOpen(false); setSearch(''); }
  };
  return <div className={`searchable-select ${open ? 'is-open' : ''}`} ref={wrapperRef}>
    <div className="searchable-select-control">
      <Search size={16} aria-hidden="true"/>
      <input ref={inputRef} type="text" role="combobox" aria-label="Pesquisar culto ou atividade" aria-autocomplete="list" aria-expanded={open} aria-controls="conversion-event-options" aria-activedescendant={open && filteredOptions[activeIndex] ? `conversion-event-option-${activeIndex}` : undefined} autoComplete="off" value={open ? search : value} placeholder={placeholder} onFocus={() => { setOpen(true); setSearch(''); setActiveIndex(0); }} onChange={(event) => { setSearch(event.target.value); setOpen(true); setActiveIndex(0); }} onKeyDown={handleKeyDown}/>
      {value && <button type="button" className="searchable-clear" aria-label="Limpar atividade selecionada" onClick={() => { onChange(''); setSearch(''); setOpen(false); inputRef.current?.focus(); }}><X size={15}/></button>}
      <button type="button" className="searchable-toggle" aria-label={open ? 'Fechar lista de atividades' : 'Abrir lista de atividades'} onClick={() => { if (open) { setOpen(false); setSearch(''); } else { inputRef.current?.focus(); setOpen(true); setSearch(''); } }}><ChevronDown size={16}/></button>
    </div>
    {open && <div className="searchable-options" id="conversion-event-options" role="listbox">{filteredOptions.length ? filteredOptions.map((option, index) => <button type="button" role="option" aria-selected={option === value} id={`conversion-event-option-${index}`} key={option} className={`searchable-option ${index === activeIndex ? 'highlighted' : ''} ${option === value ? 'chosen' : ''}`} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(option)}>{option}{option === value && <Check size={15}/>}</button>) : <div className="searchable-empty">Nenhuma atividade encontrada.</div>}</div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
