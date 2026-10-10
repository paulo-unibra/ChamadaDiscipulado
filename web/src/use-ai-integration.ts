import { useCallback, useEffect, useState } from 'react';
import type { AiIntegration, ApiFetch } from './types';
import { isAbortError } from './types';

export function useAiIntegration(apiFetch: ApiFetch, provider: string, enabled: boolean) {
  const [savedKey, setSavedKey] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await apiFetch(`/integrations/${provider}`, { signal: controller.signal });
        const result: AiIntegration & { message?: string } = await response.json();
        if (!response.ok) throw new Error(result.message || 'Não foi possível carregar a integração.');
        if (controller.signal.aborted) return;
        setSavedKey(result.apiKey || '');
        setApiKey(result.apiKey || '');
      } catch (error) {
        if (!isAbortError(error)) setMessage(error instanceof Error ? error.message : 'Falha ao carregar a integração.');
      }
    }
    void load();
    return () => controller.abort();
  }, [apiFetch, provider, enabled]);

  const save = useCallback(async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await apiFetch(`/integrations/${provider}`, { method: 'PUT', body: JSON.stringify({ apiKey }) });
      const result: AiIntegration & { message?: string } = await response.json();
      if (!response.ok) throw new Error(result.message || 'Não foi possível salvar a integração.');
      setSavedKey(result.apiKey || '');
      setApiKey(result.apiKey || '');
      setMessage(result.configured ? 'Integração salva para esta congregação.' : 'Token removido.');
    } catch (error) {
      if (!isAbortError(error)) setMessage(error instanceof Error ? error.message : 'Falha ao salvar a integração.');
    } finally { setBusy(false); }
  }, [apiFetch, provider, apiKey]);

  return { apiKey, setApiKey, configured: Boolean(savedKey), busy, message, save };
}
