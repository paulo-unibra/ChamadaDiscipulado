import { useState } from 'react';
import { Eye, EyeOff, Save, X } from 'lucide-react';
import { Modal } from './Modal';

export function AiIntegrationPanel({ name, logo, integration, onClose }) {
  const [showKey, setShowKey] = useState(false);
  const id = `${name.toLowerCase()}-api-key`;

  return <Modal className="integration-modal-overlay" onClose={onClose}>
    <section className="convert-modal integration-config-modal" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
      <header className="integration-config-heading">
        <span className="integration-tool-icon"><img src={logo} alt=""/></span>
        <div><h2 id={`${id}-title`}>Configurar {name}</h2><p>Gere questionários com inteligência artificial.</p></div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar configuração"><X size={19}/></button>
      </header>
      <div className="integration-status-row">
        <div className="integration-description"><span className={`status-dot ${integration.configured ? 'on' : ''}`}/><div><b>{integration.configured ? 'Integração configurada' : 'Integração não configurada'}</b><small>A chave fica criptografada e vinculada à congregação selecionada.</small></div></div>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); void integration.save(); }}>
        <label className="field integration-secret-label" htmlFor={id}>Chave da API
          <span className="integration-secret-field"><input id={id} type={showKey ? 'text' : 'password'} autoComplete="new-password" spellCheck="false" value={integration.apiKey} onChange={(event) => integration.setApiKey(event.target.value)} placeholder={integration.configured ? '••••••••••••••••••••' : 'Cole a chave da API'} aria-describedby={`${id}-help`}/><button type="button" className="integration-reveal-key" onClick={() => setShowKey((current) => !current)} aria-label={showKey ? 'Ocultar chave da API' : 'Mostrar chave da API'}>{showKey ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span>
          <small id={`${id}-help`}>{integration.configured ? 'A chave armazenada fica protegida. Digite outra somente para substituí-la.' : 'A chave será armazenada de forma protegida nesta congregação.'}</small>
        </label>
        {integration.message && <p className="integration-dialog-message" role="status">{integration.message}</p>}
        <footer className="integration-config-footer">
          <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
          {integration.configured && <button type="button" className="integration-remove-button" onClick={() => void integration.remove()} disabled={integration.busy}>Remover integração</button>}
          <button type="submit" className="button primary" disabled={integration.busy || !integration.apiKey.trim()}><Save size={15}/>{integration.busy ? 'Salvando…' : 'Salvar integração'}</button>
        </footer>
      </form>
    </section>
  </Modal>;
}
