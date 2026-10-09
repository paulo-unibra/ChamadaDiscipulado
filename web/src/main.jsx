import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, BookOpen, CalendarDays, ChartNoAxesColumn, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, FileText, FolderOpen, LayoutDashboard, LogOut, Menu, Plus, Search, Settings, Users, X, PlugZap, Save, RefreshCw, FileInput, CircleCheck } from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://146.190.138.248:2000';
const DEFAULT_CONGREGATION_ID = 'cong-zumbi-pacheco-1';
const brazilStateOptions = [['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'], ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'], ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'], ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'], ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'], ['SE', 'Sergipe'], ['TO', 'Tocantins']];
const menu = [
  { label: 'Visão geral', icon: LayoutDashboard, path: 'inicio' },
  { label: 'Cadastros', icon: FolderOpen, children: [{ label: 'Congregações', path: 'congregacoes' }, { label: 'Novos convertidos', path: 'novos-convertidos' }, { label: 'Turmas', path: 'turmas' }, { label: 'Professores', path: 'professores' }] },
  { label: 'Operacional', icon: ClipboardCheck, children: [{ label: 'Chamadas', path: 'chamadas' }] },
  { label: 'Relatórios', icon: ChartNoAxesColumn, children: [{ label: 'Visão geral', path: 'relatorios' }, { label: 'Frequência', path: 'frequencia' }] },
  { label: 'Configurações', icon: Settings, children: [{ label: 'Integrações', path: 'integracoes' }] },
];
const today = () => new Date().toISOString().slice(0, 10);
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
  return normalized.length === 2 ? normalized : brazilStates[normalized] || '';
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
        else { ctx.fillStyle = color; ctx.fillText(g.letter, g.x, r.height / 2); }
        ctx.restore();
        if (active && specks) { for (let i = 0; i < Math.min(specks, 8); i++) { ctx.fillStyle = accentColor; ctx.globalAlpha = Math.random() * .75; ctx.fillRect(g.x + (Math.random() - .5) * 52, r.height / 2 + (Math.random() - .5) * 62, 2, 2); } ctx.globalAlpha = 1; }
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
  const [page, setPage] = useState(() => window.location.pathname.split('/').filter(Boolean)[0] || 'inicio'), [expanded, setExpanded] = useState(true), [mobileMenu, setMobileMenu] = useState(false), [search, setSearch] = useState(''), [account, setAccount] = useState(false);
  const [activeCongregationId, setActiveCongregationId] = useState(() => sessionStorage.getItem('campanha-congregacao') || DEFAULT_CONGREGATION_ID), [congregationName, setCongregationName] = useState(''), [congregationArea, setCongregationArea] = useState(''), [congregationSector, setCongregationSector] = useState('');
  const [token, setToken] = useState(() => sessionStorage.getItem('chamada-token') || ''), [loginStep, setLoginStep] = useState('login'), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [verifyCode, setVerifyCode] = useState(''), [challenge, setChallenge] = useState(''), [loginMessage, setLoginMessage] = useState(''), [loginBusy, setLoginBusy] = useState(false);
  const [data, setData] = useState({ congregations: [], activeCongregationId: DEFAULT_CONGREGATION_ID, classes: [], students: [], teachers: [], attendanceRecords: [], newConverts: [], discipleshipLessons: [] });
  const [error, setError] = useState('');
  const [className, setClassName] = useState(''), [teacherName, setTeacherName] = useState(''), [teacherPhone, setTeacherPhone] = useState('');
  const [studentName, setStudentName] = useState(''), [studentClass, setStudentClass] = useState('');
  const [newConvert, setNewConvert] = useState({ eventName: '', name: '', conversionDate: today(), cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', birthDate: '', contactPhone: '' });
  const [cepLookup, setCepLookup] = useState({ status: 'idle', message: '' });
  const [streetMatches, setStreetMatches] = useState([]), [streetLookupStatus, setStreetLookupStatus] = useState('idle');
  const suppressStreetLookup = useRef(false), lastStreetLookupAt = useRef(0);
  const [selectedClass, setSelectedClass] = useState(''), [selectedTeacher, setSelectedTeacher] = useState(''), [lessonName, setLessonName] = useState(''), [attendanceDate, setAttendanceDate] = useState(today()), [entries, setEntries] = useState({});
  const [frequencyClass, setFrequencyClass] = useState('all');
  const [integration, setIntegration] = useState({ enabled: false, formId: '', sections: {}, fields: {}, mappings: {}, fixedAnswers: {} });
  const [formQuestions, setFormQuestions] = useState([]), [integrationBusy, setIntegrationBusy] = useState(false), [integrationMessage, setIntegrationMessage] = useState('');
  const [formSentItems, setFormSentItems] = useState({}), [formOpenedItems, setFormOpenedItems] = useState({});
  const apiFetch = (path, options = {}) => { const separator = path.includes('?') ? '&' : '?'; const scopedPath = `${path}${separator}congregationId=${encodeURIComponent(activeCongregationId)}`; return fetch(`${API}${scopedPath}`, { ...options, headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } }); };
  const applyState = (payload) => { setData({ congregations: payload.congregations || [], activeCongregationId: payload.activeCongregationId || activeCongregationId, classes: payload.classes || [], students: payload.students || [], teachers: payload.teachers || [], attendanceRecords: payload.attendanceRecords || [], newConverts: payload.newConverts || [], discipleshipLessons: payload.discipleshipLessons || [] }); if (payload.activeCongregationId && payload.activeCongregationId !== activeCongregationId) { setActiveCongregationId(payload.activeCongregationId); sessionStorage.setItem('campanha-congregacao', payload.activeCongregationId); } };
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
  useEffect(() => { const sync = () => setPage(window.location.pathname.split('/').filter(Boolean)[0] || 'inicio'); window.addEventListener('popstate', sync); return () => window.removeEventListener('popstate', sync); }, []);
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
    apiFetch('/integrations/google/forms/sent-items').then(async (response) => {
      if (!response.ok) return;
      const result = await response.json();
      setFormSentItems(Object.fromEntries((result.items || []).map((item) => [`${item.sectionId}:${item.recordId}`, true])));
    }).catch(() => {});
  }, [token, activeCongregationId]);
  useEffect(() => { if (!selectedClass && data.classes.length) setSelectedClass(data.classes[0].id); }, [data.classes, selectedClass]);
  const activeTitle = useMemo(() => menu.flatMap((group) => [group, ...(group.children || [])]).find((item) => item.path === page)?.label || 'Visão geral', [page]);
  const request = async (path, method, body) => { const r = await apiFetch(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) }); const payload = await r.json(); if (!r.ok) throw new Error(payload.message || 'Não foi possível concluir a operação.'); applyState(payload); return payload; };
  const notify = async (fn) => { try { setError(''); await fn(); } catch (e) { setError(e.message || 'Ocorreu um erro.'); } };
  const pageTitles = { inicio: ['Visão geral', 'Acompanhe a atividade da campanha em um só lugar.'], congregacoes: ['Congregações', 'Cadastre e selecione as congregações da campanha.'], 'novos-convertidos': ['Novos convertidos', 'Acompanhe as pessoas que aceitaram a fé em cada ação evangelística.'], turmas: ['Turmas', 'Crie turmas e organize os participantes da campanha.'], professores: ['Professores', 'Cadastre a equipe e os responsáveis por cada encontro.'], chamadas: ['Chamadas', 'Registre e consulte a participação nos encontros.'], relatorios: ['Relatórios', 'Indicadores gerais para acompanhamento da campanha.'], frequencia: ['Frequência', 'Consulte a frequência por turma e período.'], integracoes: ['Integrações', 'Configure links pré-preenchidos para seus formulários.'] };
  const [title, subtitle] = pageTitles[page] || pageTitles.inicio;
  const nav = (path) => { setPage(path); setMobileMenu(false); window.history.pushState({}, '', `/${path === 'inicio' ? '' : path}`); };
  const submitLogin = async (event) => { event.preventDefault(); setLoginBusy(true); setLoginMessage(''); try { const path = loginStep === 'login' ? '/auth/login' : '/auth/verify'; const body = loginStep === 'login' ? { email, password } : { challenge, code: verifyCode }; const response = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Não foi possível acessar.'); if (loginStep === 'login') { setChallenge(result.challenge); setLoginStep('verify'); setLoginMessage('Enviamos um código de verificação para seu e-mail.'); } else { sessionStorage.setItem('chamada-token', result.token); setToken(result.token); } } catch (e) { setLoginMessage(e.message || 'Falha de conexão com o servidor.'); } finally { setLoginBusy(false); } };
  if (!token) return <div className="login-page"><section className="login-card"><div className="login-art"><div className="login-brand"><span className="brand-icon"><BookOpen size={21}/></span>CAMPANHA EVANGELIZADORA</div><div className="login-art-copy"><h1>Caminhamos juntos.</h1><p>Cada encontro é uma oportunidade de compartilhar esperança e cuidar uns dos outros.</p></div><span className="login-art-footer">UM SÓ PROPÓSITO, MUITAS VIDAS ALCANÇADAS</span></div><form className="login-form" onSubmit={submitLogin}><span className="eyebrow">ÁREA ADMINISTRATIVA</span><h2>{loginStep === 'login' ? 'Bem-vindo de volta' : 'Confirme seu acesso'}</h2><p>{loginStep === 'login' ? 'Acesse o painel da campanha evangelizadora.' : `Digite o código enviado para ${email}.`}</p>{loginStep === 'login' ? <><label className="field">E-mail<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com"/></label><label className="field">Senha<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Digite sua senha"/></label></> : <label className="field">Código de verificação<input inputMode="numeric" maxLength={6} required value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} placeholder="000000"/></label>}{loginMessage && <div className={`login-message ${loginMessage.startsWith('Enviamos') ? 'success' : ''}`}>{loginMessage}</div>}<button className="button primary login-submit" disabled={loginBusy}>{loginBusy ? 'Aguarde…' : loginStep === 'login' ? 'Entrar' : 'Confirmar código'}<ChevronRight size={17}/></button>{loginStep === 'verify' && <button type="button" className="text-button login-back" onClick={() => { setLoginStep('login'); setLoginMessage(''); }}>Voltar para o login</button>}<div className="login-footnote">Acesse para continuar sua jornada.</div></form></section></div>;
  const createClass = () => notify(async () => { if (!className.trim()) return; await request('/school/classes', 'POST', { name: className.trim(), description: '' }); setClassName(''); });
  const createCongregation = () => notify(async () => { if (!congregationName.trim()) return; await request('/school/congregations', 'POST', { name: congregationName.trim(), area: congregationArea.trim(), sector: congregationSector.trim() }); setCongregationName(''); setCongregationArea(''); setCongregationSector(''); });
  const createNewConvert = () => notify(async () => { if (!newConvert.eventName) { setError('Selecione o culto ou atividade da conversão.'); return; } await request('/school/new-converts', 'POST', newConvert); setNewConvert({ eventName: '', name: '', conversionDate: today(), cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', birthDate: '', contactPhone: '' }); });
  const selectStreetSuggestion = (properties) => {
    suppressStreetLookup.current = true;
    setStreetMatches([]);
    setStreetLookupStatus('idle');
    setNewConvert((current) => ({
      ...current,
      street: properties.street || properties.name || current.street,
      number: properties.housenumber || current.number,
      cep: properties.postcode || current.cep,
      neighborhood: properties.district || properties.locality || current.neighborhood,
      city: properties.city || current.city,
      state: toStateCode(properties.state) || current.state,
    }));
  };
  const createStudent = () => notify(async () => { if (!studentName.trim()) return; await request('/school/students', 'POST', { name: studentName.trim(), birthDate: '', studentPhone: '', email: '', guardianName: '', guardianPhone: '', address: '', notes: '', classIds: studentClass ? [studentClass] : [] }); setStudentName(''); });
  const createTeacher = () => notify(async () => { if (!teacherName.trim()) return; await request('/school/teachers', 'POST', { name: teacherName.trim(), phone: teacherPhone.replace(/\D/g, '') }); setTeacherName(''); setTeacherPhone(''); });
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

  return <div className="app-shell">
    <header className="topbar"><div className="brandline"><button className="icon-button mobile-only" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Abrir menu"><Menu size={21}/></button><button className="brand" onClick={() => nav('inicio')}><span className="brand-icon"><BookOpen size={21}/></span><span>CAMPANHA EVANGELIZADORA</span></button></div><div className="account-area"><label className="congregation-picker"><span>CONGREGAÇÃO</span><select value={activeCongregationId} onChange={(event) => { setActiveCongregationId(event.target.value); sessionStorage.setItem('campanha-congregacao', event.target.value); }}><option value={DEFAULT_CONGREGATION_ID}>Zumbi do Pacheco 1 · Área 10 · Setor 10</option>{data.congregations.filter((item) => item.id !== DEFAULT_CONGREGATION_ID).map((item) => <option value={item.id} key={item.id}>{item.name}{item.area ? ` · Área ${item.area}` : ''}{item.sector ? ` · Setor ${item.sector}` : ''}</option>)}</select></label><button className="account-trigger" onClick={() => setAccount(!account)}><span className="avatar">CE</span><span>Administrador</span><ChevronDown size={16}/></button>{account && <div className="account-menu"><strong>Campanha Evangelizadora</strong><button onClick={() => { setAccount(false); nav('congregacoes'); }}><Settings size={15}/> Congregações</button><button onClick={() => { sessionStorage.removeItem('chamada-token'); setToken(''); setAccount(false); }}><LogOut size={15}/> Sair</button></div>}</div></header>
    <div className="body-layout">{(expanded || mobileMenu) && <><div className={`backdrop ${mobileMenu ? 'show' : ''}`} onClick={() => setMobileMenu(false)}/><aside className={`sidebar ${mobileMenu ? 'sidebar-mobile-open' : ''}`}><div className="side-heading"><span>NAVEGAÇÃO</span><button className="icon-button" onClick={() => setExpanded(!expanded)} aria-label="Recolher menu"><ChevronLeft size={18}/></button></div><label className="searchbox"><Search size={16}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar no menu"/><kbd>/</kbd></label><nav>{menu.map((group) => { const Icon = group.icon; const children = group.children?.filter((child) => child.label.toLowerCase().includes(search.toLowerCase())); if (group.path) return (!search || group.label.toLowerCase().includes(search.toLowerCase())) && <button key={group.path} className={`nav-link ${page === group.path ? 'active' : ''}`} onClick={() => nav(group.path)}><Icon size={18}/><span>{group.label}</span></button>; return children?.length > 0 && <div className="nav-group" key={group.label}><div className="nav-group-title"><Icon size={17}/><span>{group.label}</span></div>{children.map((child) => <button key={child.path} className={`nav-link sub-link ${page === child.path ? 'active' : ''}`} onClick={() => nav(child.path)}>{child.label}</button>)}</div>; })}</nav><div className="sidebar-bottom"><div className="help-badge"> <span>?</span><div><b>Precisa de ajuda?</b><small>Acesse os relatórios da campanha</small></div></div></div></aside></>}
      <main className="main-column"><div className="breadcrumb"><button onClick={() => nav('inicio')}>Início</button><span>/</span><strong>{activeTitle}</strong><button className="collapse-menu" onClick={() => setExpanded(!expanded)}><Menu size={17}/></button></div><div className="page-content"><div className="page-heading"><div><div className="eyebrow">CAMPANHA EVANGELIZADORA</div><h1>{title}</h1><p>{subtitle}</p></div><span className="today-pill"><CalendarDays size={15}/>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date())}</span></div>
        {error && <div className="alert"><Activity size={17}/><span>{error}</span><button onClick={load}>Tentar novamente</button><button className="alert-close" onClick={() => setError('')}><X size={16}/></button></div>}
        {page === 'integracoes' && <div className="integration-public-note">Cole o link público do formulário (<code>/forms/d/e/…/viewform</code>) ou o ID público. Os campos são lidos da página pública; não é necessária permissão de edição.</div>}
        {unsentIntegrationRows.length > 0 && <section className="panel form-actions-panel"><PanelHeading icon={FileInput} title="Enviar itens ao Google Forms" description="Abra o formulário pré-preenchido e confirme aqui depois de enviar a resposta."/><div className="form-action-list">{unsentIntegrationRows.map((row) => { const key = `${row.sectionId}:${row.recordId}`; return <div className="form-action-row" key={key}><div className="form-action-name"><b>{row.title}</b><small>{integrationSections.find((section) => section.id === row.sectionId)?.title}</small></div><div className="form-action-buttons"><button className="button secondary form-open-button" onClick={() => openPrefilledForm(row)} title="Abrir formulário pré-preenchido"><FileInput size={16}/><span>Abrir formulário</span></button>{formOpenedItems[key] && <button className="button primary form-confirm-button" onClick={() => notify(() => markIntegrationItemSent(row))}><CircleCheck size={16}/><span>Marcar enviado</span></button>}</div></div>; })}</div></section>}
        {page === 'integracoes' && <>
          <section className="panel integration-panel">
            <PanelHeading icon={PlugZap} title="Google Forms" description="Configure um link público e escolha os dados a pré-preencher." />
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
        {page === 'novos-convertidos' && <><section className="panel"><PanelHeading icon={Users} title="Cadastrar novo convertido" description="O cadastro fica vinculado à congregação selecionada e não exige vínculo com turma."/><form onSubmit={(event) => { event.preventDefault(); createNewConvert(); }}><div className="form-grid convert-form-grid"><label className="field">Culto ou atividade da conversão<SearchableSelect options={conversionEvents} value={newConvert.eventName} onChange={(value) => setNewConvert({ ...newConvert, eventName: value })} placeholder="Pesquise ou selecione uma atividade"/></label><label className="field">Nome da pessoa<input value={newConvert.name} onChange={(event) => setNewConvert({ ...newConvert, name: event.target.value })} placeholder="Nome completo" required/></label><label className="field">Data da conversão<input type="date" value={newConvert.conversionDate} onChange={(event) => setNewConvert({ ...newConvert, conversionDate: event.target.value })} required/></label><label className="field">Data de nascimento<input type="date" value={newConvert.birthDate} onChange={(event) => setNewConvert({ ...newConvert, birthDate: event.target.value })}/></label><label className="field">Telefone para contato<input type="tel" value={newConvert.contactPhone} onChange={(event) => setNewConvert({ ...newConvert, contactPhone: event.target.value })} placeholder="(81) 99999-9999"/></label><label className="field">CEP<input inputMode="numeric" maxLength={9} value={newConvert.cep} onChange={(event) => setNewConvert({ ...newConvert, cep: event.target.value.replace(/[^\d-]/g, '').slice(0, 9) })} placeholder="00000-000"/></label><label className="field">Rua / logradouro<input value={newConvert.street} onChange={(event) => setNewConvert({ ...newConvert, street: event.target.value })} placeholder="Rua, avenida, travessa..."/></label><label className="field">Número<input value={newConvert.number} onChange={(event) => setNewConvert({ ...newConvert, number: event.target.value })} placeholder="Número ou s/n"/></label><label className="field">Complemento<input value={newConvert.complement} onChange={(event) => setNewConvert({ ...newConvert, complement: event.target.value })} placeholder="Casa, bloco, referência..."/></label><label className="field">Bairro<input value={newConvert.neighborhood} onChange={(event) => setNewConvert({ ...newConvert, neighborhood: event.target.value })} placeholder="Bairro"/></label><label className="field">Cidade<input value={newConvert.city} onChange={(event) => setNewConvert({ ...newConvert, city: event.target.value })} placeholder="Cidade"/></label><label className="field">Estado<select value={newConvert.state} onChange={(event) => setNewConvert({ ...newConvert, state: event.target.value })}><option value="">Selecione o estado</option>{brazilStateOptions.map(([uf, name]) => <option value={uf} key={uf}>{name}</option>)}</select></label></div><div className="form-footer"><button className="button primary"><Plus size={16}/> Salvar novo convertido</button></div></form></section><section className="panel"><PanelHeading icon={FolderOpen} title="Novos convertidos cadastrados" description={`${data.newConverts.length} pessoas nesta congregação`}/>{data.newConverts.length ? <div className="table-wrap"><table><thead><tr><th>Nome</th><th>Culto / atividade</th><th>Conversão</th><th>Contato</th><th>Endereço</th><th></th></tr></thead><tbody>{data.newConverts.map((person) => { const address = [person.street, person.number, person.complement, person.neighborhood, person.city, person.state].filter(Boolean).join(', '); return <tr key={person.id}><td><b>{person.name}</b>{person.birthDate && <small className="table-subtext">Nascimento: {formatDate(person.birthDate)}</small>}</td><td>{person.eventName}</td><td>{formatDate(person.conversionDate)}</td><td>{person.contactPhone || '—'}</td><td>{address ? <span>{address}{person.cep && <small className="table-subtext">CEP {person.cep}</small>}</span> : '—'}</td><td><button className="small-danger" onClick={() => window.confirm(`Remover o cadastro de ${person.name}?`) && notify(() => request(`/school/new-converts/${person.id}`, 'DELETE'))}>Remover</button></td></tr>; })}</tbody></table></div> : <Empty message="Nenhum novo convertido cadastrado" detail="Cadastre a primeira pessoa alcançada nesta congregação."/>}</section></>}
        {page === 'congregacoes' && <><section className="panel"><PanelHeading icon={BookOpen} title="Cadastrar congregação" description="Adicione outra congregação para manter seus cadastros e chamadas separados."/><form className="form-row" onSubmit={(event) => { event.preventDefault(); createCongregation(); }}><label className="field grow">Nome da congregação<input value={congregationName} onChange={(event) => setCongregationName(event.target.value)} placeholder="Ex.: Jardim das Oliveiras" required/></label><label className="field area-field">Área<input value={congregationArea} onChange={(event) => setCongregationArea(event.target.value)} placeholder="10"/></label><label className="field area-field">Setor<input value={congregationSector} onChange={(event) => setCongregationSector(event.target.value)} placeholder="10"/></label><button className="button primary form-button"><Plus size={16}/> Cadastrar congregação</button></form></section><section className="panel"><PanelHeading icon={FolderOpen} title="Congregações cadastradas" description="Os cadastros e relatórios são separados por congregação."/><div className="congregation-list">{data.congregations.map((congregation) => <button className={`congregation-card ${congregation.id === activeCongregationId ? 'selected' : ''}`} key={congregation.id} onClick={() => { setActiveCongregationId(congregation.id); sessionStorage.setItem('campanha-congregacao', congregation.id); }}><span className="congregation-mark"><BookOpen size={19}/></span><span className="congregation-details"><b>{congregation.name}</b><small>{[congregation.area && `Área ${congregation.area}`, congregation.sector && `Setor ${congregation.sector}`].filter(Boolean).join(' · ') || 'Localização não informada'}</small></span>{congregation.id === activeCongregationId ? <span className="badge green">Selecionada</span> : <span className="text-button">Selecionar <ChevronRight size={15}/></span>}</button>)}</div></section></>}
        {page === 'turmas' && <><section className="panel"><PanelHeading icon={Users} title="Nova turma" description="Organize participantes por grupo ou local de encontro."/><form className="form-row" onSubmit={(e) => { e.preventDefault(); createClass(); }}><label className="field grow">Nome da turma<input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Ex.: Grupo Esperança" required/></label><button className="button primary form-button"><Plus size={16}/> Criar turma</button></form></section><section className="panel"><PanelHeading icon={FolderOpen} title="Turmas cadastradas" description={`${data.classes.length} grupos cadastrados`}/>{data.classes.length ? <div className="table-wrap"><table><thead><tr><th>Nome da turma</th><th>Descrição</th><th>Participantes</th><th></th></tr></thead><tbody>{data.classes.map((group) => <tr key={group.id}><td><b>{group.name}</b></td><td>{group.description || '—'}</td><td><span className="badge blue">{group.studentIds?.length || 0} pessoas</span></td><td><button className="small-danger" onClick={() => window.confirm(`Apagar a turma ${group.name}?`) && notify(() => request(`/school/classes/${group.id}`, 'DELETE'))}>Apagar</button></td></tr>)}</tbody></table></div> : <Empty message="Nenhuma turma cadastrada" detail="Crie uma turma para organizar os participantes."/>}</section></>}
        {page === 'turmas' && <section className="panel"><PanelHeading icon={Users} title="Novo participante" description="Cadastre uma pessoa e, se quiser, vincule-a a uma turma."/><form className="form-row" onSubmit={(e) => { e.preventDefault(); createStudent(); }}><label className="field grow">Nome completo<input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Ex.: Maria Oliveira" required/></label><label className="field grow">Turma<select value={studentClass} onChange={(e) => setStudentClass(e.target.value)}><option value="">Sem turma por enquanto</option>{data.classes.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><button className="button primary form-button"><Plus size={16}/> Cadastrar participante</button></form>{data.students.length > 0 && <div className="table-wrap student-table"><table><thead><tr><th>Participante</th><th>Turma</th></tr></thead><tbody>{data.students.map((student) => <tr key={student.id}><td><b>{student.name}</b></td><td>{data.classes.filter((group) => group.studentIds?.includes(student.id)).map((group) => group.name).join(', ') || 'Sem turma'}</td></tr>)}</tbody></table></div>}</section>}
        {page === 'professores' && <><section className="panel"><PanelHeading icon={BookOpen} title="Novo professor" description="Cadastre os responsáveis pelos encontros."/><form className="form-row" onSubmit={(e) => { e.preventDefault(); createTeacher(); }}><label className="field grow">Nome completo<input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Ex.: Ana Souza" required/></label><label className="field grow">Telefone (opcional)<input value={teacherPhone} onChange={(e) => setTeacherPhone(e.target.value)} placeholder="(11) 99999-9999"/></label><button className="button primary form-button"><Plus size={16}/> Cadastrar</button></form></section><section className="panel"><PanelHeading icon={Users} title="Equipe" description="Pessoas disponíveis para conduzir os encontros."/>{data.teachers.length ? <div className="people-list">{data.teachers.map((teacher) => <div className="person-row" key={teacher.id}><span className="person-avatar">{teacher.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}</span><div className="person-info"><b>{teacher.name}</b><span>{teacher.phone || 'Sem telefone informado'}</span></div><span className="badge green">Ativo</span><button className="small-danger" onClick={() => window.confirm(`Apagar ${teacher.name}?`) && notify(() => request(`/school/teachers/${teacher.id}`, 'DELETE'))}>Apagar</button></div>)}</div> : <Empty message="Nenhum professor cadastrado" detail="Cadastre a equipe para registrar os encontros."/>}</section></>}
        {page === 'chamadas' && <><section className="panel"><PanelHeading icon={ClipboardCheck} title="Registrar encontro" description="Selecione o grupo e marque a participação de cada pessoa."/><div className="form-grid"><label className="field">Turma<select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}><option value="">Selecione uma turma</option>{data.classes.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label className="field">Responsável<select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)}><option value="">Selecione um professor</option>{data.teachers.map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label><label className="field">Tema do encontro<select value={lessonName} onChange={(e) => setLessonName(e.target.value)}><option value="">Encontro evangelizador</option>{data.discipleshipLessons.map((lesson) => <option key={lesson}>{lesson}</option>)}</select></label><label className="field">Data<input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)}/></label></div>{selectedClass && <div className="attendance-list"><h3>Participantes do grupo</h3>{data.classes.find((c) => c.id === selectedClass)?.studentIds?.map((id) => data.students.find((s) => s.id === id)).filter(Boolean).map((student) => <div className="attendance-person" key={student.id}><span>{student.name}</span><div className="status-options">{[['present','Presente'],['absent','Ausente'],['justified','Justificada'],['late','Atrasado']].map(([status, label]) => <button key={status} onClick={() => setEntries({ ...entries, [student.id]: status })} className={`status-choice ${((entries[student.id] || 'present') === status) ? `selected ${status}` : ''}`}>{label}</button>)}</div></div>)}</div>}<div className="form-footer"><button className="button primary" onClick={saveAttendance}><Check size={16}/> Salvar encontro</button></div></section><section className="panel"><PanelHeading icon={CalendarDays} title="Histórico recente" description="Encontros registrados por data."/>{records.length ? <div className="record-list">{records.map((record) => <div className="record-row" key={record.id}><span className="record-symbol"><CalendarDays size={18}/></span><div className="record-info"><b>{data.classes.find((c) => c.id === record.classId)?.name || 'Turma removida'}</b><span>{record.lessonName || 'Encontro'} · {formatDate(record.date)}</span></div><span className="badge green">{record.entries?.filter((e) => e.status === 'present').length || 0} presentes</span></div>)}</div> : <Empty message="Nenhum encontro registrado" detail="Os encontros salvos aparecerão aqui."/>}</section></>}
        {page === 'relatorios' && <section className="panel"><PanelHeading icon={ChartNoAxesColumn} title="Resumo da campanha" description="Indicadores gerais para acompanhamento."/><div className="stats-grid report-stats">{stats.map(({ label, value, icon: Icon, color }) => <article className="stat-card" key={label}><div className="stat-top"><span>{label}</span><span className={`stat-icon ${color}`}><Icon size={18}/></span></div><strong>{value}</strong><small>atualizado agora</small></article>)}</div><div className="report-links"><button className="button secondary" onClick={() => nav('frequencia')}>Consultar frequência <ChevronRight size={16}/></button><button className="button secondary" onClick={() => window.print()}><FileText size={16}/> Imprimir relatório</button></div></section>}
        {page === 'frequencia' && <><section className="panel"><PanelHeading icon={ChartNoAxesColumn} title="Frequência por turma" description="Resumo de participação nos encontros registrados."/><label className="field filter-field">Filtrar turma<select value={frequencyClass} onChange={(e) => setFrequencyClass(e.target.value)}><option value="all">Todas as turmas</option>{data.classes.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label></section><section className="panel">{data.students.filter((student) => frequencyClass === 'all' || data.classes.find((c) => c.id === frequencyClass)?.studentIds?.includes(student.id)).length ? <div className="table-wrap"><table><thead><tr><th>Participante</th><th>Turma</th><th>Encontros</th><th>Presenças</th><th>Frequência</th></tr></thead><tbody>{data.students.filter((student) => frequencyClass === 'all' || data.classes.find((c) => c.id === frequencyClass)?.studentIds?.includes(student.id)).map((student) => { const classGroup = data.classes.find((c) => c.studentIds?.includes(student.id)); const attendance = records.flatMap((record) => record.entries || []).filter((entry) => entry.studentId === student.id); const present = attendance.filter((entry) => entry.status === 'present').length; return <tr key={student.id}><td><b>{student.name}</b></td><td>{classGroup?.name || '—'}</td><td>{attendance.length}</td><td>{present}</td><td><span className="badge green">{attendance.length ? Math.round(present / attendance.length * 100) : 0}%</span></td></tr>; })}</tbody></table></div> : <Empty message="Sem dados de frequência" detail="Cadastre participantes e registre encontros para gerar o relatório."/>}</section></>}
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
