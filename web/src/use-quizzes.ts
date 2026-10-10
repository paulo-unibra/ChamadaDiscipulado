import { useEffect, useEffectEvent, useState } from 'react';
import { isAbortError, type ApiFetch, type Quiz } from './types';

export function groupQuizzes(quizzes: Quiz[]): Record<string, Quiz[]> {
  const groups: Record<string, Quiz[]> = {};
  for (const quiz of [...quizzes].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))) {
    (groups[quiz.scheduleId] ||= []).push(quiz);
  }
  return groups;
}

function mergeQuizzes(current: Record<string, Quiz[]>, incoming: Quiz[]) {
  const records = new Map(Object.values(current).flat().map((quiz) => [quiz.id, quiz]));
  for (const quiz of incoming) {
    const previous = records.get(quiz.id);
    if (previous?.status !== undefined && previous.status !== 'pending' && quiz.status === 'pending') continue;
    records.set(quiz.id, quiz);
  }
  return groupQuizzes([...records.values()]);
}

export function useQuizzes(apiFetch: ApiFetch, apiBase: string, token: string, congregationId: string) {
  const [jobs, setJobs] = useState<Record<string, Quiz[]>>({});
  const [notice, setNotice] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const hasPending = useEffectEvent(() => Object.values(jobs).flat().some((job) => job.status === 'pending'));
  const announce = useEffectEvent((quiz: Quiz) => {
    const previous = jobs[quiz.scheduleId]?.find((item) => item.id === quiz.id);
    if (previous?.status !== 'pending') return;
    if (quiz.status === 'completed') setNotice(`Questionário pronto: ${quiz.lessonTitle}.`);
    if (quiz.status === 'failed') setNotice(`Falha ao gerar ${quiz.lessonTitle}: ${quiz.error}`);
  });

  useEffect(() => {
    if (!token) return;
    let stopped = false;
    let refreshing = false;
    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    async function refresh() {
      if (stopped || refreshing) return;
      refreshing = true;
      try {
        const response = await apiFetch('/school/quizzes', { signal: controller.signal });
        const payload: { quizzes: Quiz[]; message?: string } = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Não foi possível atualizar os questionários.');
        if (stopped) return;
        for (const quiz of payload.quizzes) announce(quiz);
        setJobs((current) => mergeQuizzes(current, payload.quizzes));
        setConnectionError('');
      } catch (error) {
        if (!stopped && !isAbortError(error)) setConnectionError(error instanceof Error ? error.message : 'Falha ao atualizar questionários.');
      } finally { refreshing = false; }
    }
    function connect() {
      if (stopped) return;
      try {
        const url = new URL(apiBase);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        url.pathname = '/ws';
        url.searchParams.set('congregationId', congregationId);
        const connection = new WebSocket(url, ['chamada-discipulado', token]);
        socket = connection;
        connection.onopen = () => { void refresh(); };
        connection.onmessage = (event) => {
          if (stopped) return;
          try {
            const payload: { type: string; quiz: Quiz } = JSON.parse(String(event.data));
            if (payload.type !== 'quiz.updated') return;
            announce(payload.quiz);
            setJobs((current) => mergeQuizzes(current, [payload.quiz]));
          } catch { setConnectionError('Aviso inválido recebido. Atualizando pela API.'); void refresh(); }
        };
        connection.onerror = () => connection.close();
        connection.onclose = () => { if (!stopped) retry = setTimeout(connect, 5000); };
      } catch { setConnectionError('Conexão em tempo real indisponível. Atualizando pela API.'); }
    }
    void refresh();
    connect();
    const timer = setInterval(() => {
      if (hasPending() || socket?.readyState !== WebSocket.OPEN) void refresh();
    }, 3000);
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => {
      stopped = true;
      controller.abort();
      clearInterval(timer);
      clearTimeout(retry);
      window.removeEventListener('focus', onFocus);
      socket?.close();
    };
  }, [apiFetch, apiBase, token, congregationId]);

  function addJob(quiz: Quiz) {
    setJobs((current) => mergeQuizzes(current, [quiz]));
  }
  return { jobs, notice, setNotice, connectionError, addJob };
}
