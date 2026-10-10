import { useCallback, useEffect, useRef } from 'react';
import type { ApiFetch } from './types';

export function useApi(baseUrl: string, token: string, congregationId: string, onUnauthorized: () => void): ApiFetch {
  const pending = useRef(new Set<AbortController>());
  useEffect(() => {
    const requests = pending.current;
    return () => {
      for (const controller of requests) controller.abort();
      requests.clear();
    };
  }, [baseUrl, token, congregationId]);

  return useCallback(async (path: string, options: RequestInit = {}) => {
    const controller = new AbortController();
    pending.current.add(controller);
    const signal = options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
    const url = new URL(`${baseUrl.replace(/\/$/, '')}${path}`);
    url.searchParams.set('congregationId', congregationId);
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    if (options.body) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    try {
      const result = await fetch(url, { ...options, headers, signal });
      const body = await result.text();
      if (signal.aborted) throw new DOMException('Requisição cancelada.', 'AbortError');
      if (result.status === 401) {
        onUnauthorized();
        throw new Error('Sua sessão expirou. Entre novamente.');
      }
      return new Response(result.status === 204 ? null : body, { status: result.status, statusText: result.statusText, headers: result.headers });
    } finally {
      pending.current.delete(controller);
    }
  }, [baseUrl, token, congregationId, onUnauthorized]);
}
