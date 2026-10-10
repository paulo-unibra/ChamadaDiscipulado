import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceRoot } from './main';
import { DialogAccessibility } from './DialogAccessibility';
import { ErrorBoundary } from './ErrorBoundary';

const congregations = [
  { id: 'cong-zumbi-pacheco-1', name: 'Congregação A', area: '10', sector: '10' },
  { id: 'congregacao-b', name: 'Congregação B', area: '20', sector: '20' },
];

function state(id) {
  return {
    activeCongregationId: id, congregations,
    classes: [{ id: `class-${id}`, name: '2026.2', startDate: '2026-10-11', studentIds: [] }],
    students: [], teachers: [], attendanceRecords: [], newConverts: [],
    discipleshipLessons: ['Lição original', 'Lição editada'], discipleshipCycles: [],
    discipleshipSchedule: [{ id: 'lesson-stable', classId: `class-${id}`, date: '2026-10-11', title: 'Lição editada', content: 'Conteúdo preservado', timeOverride: '10:30', teacherId: '' }],
  };
}

function payloadFor(url) {
  const path = url.pathname;
  const scope = url.searchParams.get('congregationId');
  if (path === '/school/state') return state(scope);
  if (path === '/integrations/chatgpt' || path === '/integrations/deepseek') return { configured: true, apiKey: `token-${scope}` };
  if (path === '/school/quizzes') return { quizzes: [] };
  if (path.endsWith('/sent-items')) return { items: [] };
  return { enabled: false, formId: '', sections: {}, fields: {}, mappings: {}, fixedAnswers: {} };
}

beforeEach(() => {
  vi.stubGlobal('WebSocket', class {
    static OPEN = 1;
    readyState = 3;
    close() {}
  });
  sessionStorage.clear(); localStorage.clear();
  sessionStorage.setItem('chamada-token', 'test-session');
  window.history.replaceState({}, '', '/integracoes');
  vi.stubGlobal('fetch', vi.fn(async (input) => new Response(JSON.stringify(payloadFor(new URL(input))), { status: 200 })));
});

function mount() {
  return render(<React.StrictMode><ErrorBoundary><DialogAccessibility><WorkspaceRoot/></DialogAccessibility></ErrorBoundary></React.StrictMode>);
}

describe('fluxos do painel', () => {
  it('mantém os tokens da congregação B quando uma resposta antiga de A chega depois', async () => {
    const deferred = [];
    fetch.mockImplementation((input) => {
      const url = new URL(input);
      const payload = payloadFor(url);
      if (url.pathname.startsWith('/integrations/') && url.searchParams.get('congregationId') === congregations[0].id) {
        return new Promise((resolve) => deferred.push(() => resolve(new Response(JSON.stringify(payload), { status: 200 }))));
      }
      return Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }));
    });
    mount();
    const selector = await screen.findByRole('combobox', { name: 'CONGREGAÇÃO' });
    fireEvent.change(selector, { target: { value: 'congregacao-b' } });
    const token = await screen.findByRole('textbox', { name: /^Token da API ChatGPT/ });
    await waitFor(() => expect(token).toHaveValue('token-congregacao-b'));
    await act(async () => { deferred.forEach((resolve) => resolve()); });
    expect(screen.getByRole('textbox', { name: /^Token da API ChatGPT/ })).toHaveValue('token-congregacao-b');
    expect(screen.getByRole('combobox', { name: 'CONGREGAÇÃO' })).toHaveValue('congregacao-b');
  });

  it('não regrava uma escala existente ao abrir a tela', async () => {
    window.history.replaceState({}, '', '/escala');
    mount();
    expect(await screen.findByRole('button', { name: 'Editar aula 1: Lição editada' })).toBeVisible();
    expect(fetch.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(0);
  });

  it('expira a sessão quando uma consulta autenticada retorna 401', async () => {
    fetch.mockImplementation(async () => new Response(JSON.stringify({ message: 'Autenticação necessária.' }), { status: 401 }));
    mount();
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible();
    expect(sessionStorage.getItem('chamada-token')).toBeNull();
  });

  it('mostra o questionário quando o backend envia a conclusão por WebSocket', async () => {
    const sockets = [];
    vi.stubGlobal('WebSocket', class {
      static OPEN = 1;
      readyState = 1;
      constructor() { sockets.push(this); }
      close() {}
    });
    window.history.replaceState({}, '', '/escala');
    const job = { id: 'quiz-1', scheduleId: 'lesson-stable', classId: `class-${congregations[0].id}`, lessonTitle: 'Lição editada', provider: 'chatgpt', createdAt: '2026-10-10T10:00:00Z', status: 'pending', questions: [], error: '' };
    fetch.mockImplementation(async (input, options) => {
      if (options?.method === 'POST') return new Response(JSON.stringify({ quiz: job }), { status: 202 });
      return new Response(JSON.stringify(payloadFor(new URL(input))), { status: 200 });
    });
    mount();
    const generate = await screen.findByRole('button', { name: /Gerar questionário para/ });
    await waitFor(() => expect(generate).toBeEnabled());
    fireEvent.click(generate);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar questões' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await act(async () => {
      sockets.at(-1).onmessage({ data: JSON.stringify({ type: 'quiz.updated', quiz: { ...job, status: 'completed', questions: [{ question: 'Questão gerada?', options: ['A) Sim', 'B) Não', 'C) Outra', 'D) Nenhuma'], correctAnswer: 'A', explanation: 'Explicação' }] } }) });
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir questionário de Lição editada' }));
    expect(screen.getByRole('heading', { name: /Questão gerada/ })).toBeVisible();
  });

  it('permite abrir o editor por teclado, salvar o conteúdo e fechar com Escape', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/escala');
    fetch.mockImplementation(async (input, options) => {
      const url = new URL(input);
      if (options?.method === 'PUT' && url.pathname.includes('/scale')) {
        const updated = state(congregations[0].id);
        updated.discipleshipSchedule = JSON.parse(options.body).lessons.map((lesson) => ({ ...lesson, classId: updated.classes[0].id }));
        return new Response(JSON.stringify(updated), { status: 200 });
      }
      return new Response(JSON.stringify(payloadFor(url)), { status: 200 });
    });
    mount();
    const trigger = await screen.findByRole('button', { name: /Adicionar ou editar conteúdo/ });
    trigger.focus(); await user.keyboard('{Enter}');
    const textbox = await screen.findByRole('textbox', { name: /Anotações e conteúdo/ });
    await waitFor(() => expect(textbox).toHaveFocus());
    fireEvent.change(textbox, { target: { value: 'Novo conteúdo da lição' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar conteúdo' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [, options] = fetch.mock.calls.find(([, item]) => item?.method === 'PUT');
    expect(JSON.parse(options.body).lessons[0]).toMatchObject({ id: 'lesson-stable', content: 'Novo conteúdo da lição', time: '10:30' });
    fireEvent.click(screen.getByRole('button', { name: /Adicionar ou editar conteúdo/ }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('desabilita geração sem conteúdo e mostra o erro de uma solicitação rejeitada', async () => {
    window.history.replaceState({}, '', '/escala');
    let content = '';
    fetch.mockImplementation(async (input, options) => {
      const url = new URL(input);
      if (options?.method === 'POST') return new Response(JSON.stringify({ message: 'Token da IA inválido.' }), { status: 400 });
      const payload = payloadFor(url);
      if (url.pathname === '/school/state') payload.discipleshipSchedule[0].content = content;
      return new Response(JSON.stringify(payload), { status: 200 });
    });
    const view = mount();
    expect(await screen.findByRole('button', { name: /Gerar questionário para/ })).toBeDisabled();
    view.unmount(); content = 'Conteúdo com texto'; mount();
    const generate = await screen.findByRole('button', { name: /Gerar questionário para/ });
    await waitFor(() => expect(generate).toBeEnabled());
    fireEvent.click(generate);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar questões' }));
    expect(await screen.findByText('Token da IA inválido.', { selector: '[role="alert"]' })).toBeVisible();
  });
});
