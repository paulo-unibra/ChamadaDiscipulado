import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiIntegration, ApiFetch } from './types';
import { isAbortError } from './types';

export function useAiIntegration(apiFetch: ApiFetch, provider: string, enabled: boolean) {
  const [configured, setConfigured] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const revision = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const loadRevision = revision.current;
    async function load() {
      try {
        const response = await apiFetch(`/integrations/${provider}`, { signal: controller.signal });
        const result: AiIntegration & { message?: string } = await response.json();
        if (!response.ok) throw new Error(result.message || 'Não foi possível carregar a integração.');
        if (controller.signal.aborted || revision.current !== loadRevision) return;
        setConfigured(Boolean(result.configured ?? result.apiKey));
        setApiKey(result.apiKey || '');
      } catch (error) {
        if (!isAbortError(error)) setMessage(error instanceof Error ? error.message : 'Falha ao carregar a integração.');
      }
    }
    void load();
    return () => controller.abort();
  }, [apiFetch, provider, enabled]);

  const save = useCallback(async () => {
    const currentRevision = ++revision.current;
    setBusy(true);
    setMessage('');
    try {
      const response = await apiFetch(`/integrations/${provider}`, { method: 'PUT', body: JSON.stringify({ apiKey }) });
      const result: AiIntegration & { message?: string } = await response.json();
      if (!response.ok) throw new Error(result.message || 'Não foi possível salvar a integração.');
      if (revision.current === currentRevision) {
        setConfigured(Boolean(result.configured ?? result.apiKey));
        setApiKey('');
      }
      setMessage(result.configured ? 'Integração salva para esta congregação.' : 'Token removido.');
    } catch (error) {
      if (!isAbortError(error)) setMessage(error instanceof Error ? error.message : 'Falha ao salvar a integração.');
    } finally { setBusy(false); }
  }, [apiFetch, provider, apiKey]);

  const remove = useCallback(async () => {
    const currentRevision = ++revision.current;
    setBusy(true);
    setMessage('');
    try {
      const response = await apiFetch(`/integrations/${provider}`, { method: 'PUT', body: JSON.stringify({ apiKey: null }) });
      const result: AiIntegration & { message?: string } = await response.json();
      if (!response.ok) throw new Error(result.message || 'Não foi possível remover a integração.');
      if (revision.current === currentRevision) {
        setConfigured(Boolean(result.configured));
        setApiKey('');
      }
      setMessage('Token removido desta congregação.');
    } catch (error) {
      if (!isAbortError(error)) setMessage(error instanceof Error ? error.message : 'Falha ao remover a integração.');
    } finally { setBusy(false); }
  }, [apiFetch, provider]);

  return { apiKey, setApiKey, configured, busy, message, save, remove };
}
