import { Save } from 'lucide-react';

export function AiIntegrationPanel({ name, icon: Icon, integration }) {
  return <section className={`panel integration-panel ${name === 'ChatGPT' ? 'chatgpt' : 'deepseek'}-integration-panel`}>
    <div className="panel-heading"><div className="panel-title-icon"><span className="heading-icon"><Icon size={18}/></span><div><h2>{name}</h2><p>Gere questionários a partir do conteúdo das lições.</p></div></div></div>
    <div className="integration-status-row"><div className="integration-description"><span className={`status-dot ${integration.configured ? 'on' : ''}`}/><div><b>{integration.configured ? 'Integração configurada' : 'Integração não configurada'}</b><small>Token criptografado e associado à congregação selecionada.</small></div></div></div>
    <form onSubmit={(event) => { event.preventDefault(); void integration.save(); }}>
      <label className="field chatgpt-token-field">Token da API {name}<input type="text" autoComplete="off" spellCheck="false" value={integration.apiKey} onChange={(event) => integration.setApiKey(event.target.value)} placeholder="sk-..."/><small>A edição só é aplicada ao salvar. Você pode trocar ou remover o token.</small></label>
      <div className="integration-footer"><span className="integration-notice" role="status">{integration.message}</span><button type="submit" className="button primary" disabled={integration.busy}><Save size={16}/>{integration.busy ? 'Salvando…' : `Salvar token do ${name}`}</button></div>
    </form>
  </section>;
}
