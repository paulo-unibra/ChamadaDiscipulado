import { Download, FileInput, LoaderCircle, MessageCircle, WandSparkles, X } from 'lucide-react';
import { Modal } from './Modal';

export function QuizCountDialog({ draft, setDraft, providers, generating, notice, onGenerate, onClose }) {
  return <Modal onClose={onClose}><section className="convert-modal scale-edit-modal quiz-count-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-count-title">
    <div className="panel-heading"><div><h2 id="quiz-count-title">Gerar questionário</h2><p>{draft.title}</p></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={18}/></button></div>
    <form onSubmit={(event) => { event.preventDefault(); void onGenerate(); }}>
      <label className="field">Integração de IA<select value={draft.provider} onChange={(event) => { const provider = event.target.value; setDraft((current) => ({ ...current, provider })); }} required>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>
      <label className="field">Quantidade de questões<input type="number" min="1" max="30" step="1" required value={draft.questionCount} onChange={(event) => { const questionCount = event.target.value; setDraft((current) => ({ ...current, questionCount })); }}/><small>Escolha de 1 a 30 questões de múltipla escolha.</small></label>
      {notice && <p className="quiz-notice error" role="alert">{notice}</p>}
      <div className="convert-modal-footer"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary" disabled={generating || !providers.some((provider) => provider.id === draft.provider)}>{generating ? <LoaderCircle size={16} className="quiz-spinner"/> : <WandSparkles size={16}/>}Gerar questões</button></div>
    </form>
  </section></Modal>;
}

export function QuizViewDialog({ quiz, congregation, exporting, notice, onExport, onClose }) {
  return <Modal className="quiz-view-overlay" onClose={onClose}><section className="convert-modal quiz-view-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-view-title">
    <header className="quiz-document-header">{congregation?.logoData && <img src={congregation.logoData} alt={`Logo ${congregation.name}`}/>}<div><span>{congregation?.name || 'Campanha Evangelizadora'}</span><h2 id="quiz-view-title">{quiz.lessonTitle}</h2><small>Questionário · {quiz.questions.length} questões · {quiz.provider === 'deepseek' ? 'DeepSeek' : 'ChatGPT'}</small></div><button className="icon-button quiz-close" onClick={onClose} aria-label="Fechar"><X size={19}/></button></header>
    {notice.startsWith('Falha ao exportar') && <p className="quiz-notice error" role="alert">{notice}</p>}
    <div className="quiz-question-columns">{quiz.questions.map((item, index) => <article className="quiz-question" key={`${quiz.id}-${index}`}><h3><span>{index + 1}.</span> {item.question}</h3><ol type="A">{item.options.map((option, optionIndex) => <li key={optionIndex}>{option.replace(/^[A-D][).]\s*/, '')}</li>)}</ol><details><summary>Ver gabarito e explicação</summary><p><b>Resposta:</b> {item.correctAnswer}</p>{item.explanation && <p>{item.explanation}</p>}</details></article>)}</div>
    <footer className="quiz-modal-footer"><button className="button secondary" onClick={onClose}>Fechar</button><button className="button primary" onClick={onExport} disabled={exporting}>{exporting ? <LoaderCircle size={16}/> : <Download size={16}/>} {exporting ? 'Gerando PDF…' : 'Baixar PDF paisagem'}</button></footer>
  </section></Modal>;
}

export function ScaleMessageDialog({ draft, notice, onCopy, onWhatsApp, onClose }) {
  return <Modal onClose={onClose}><section className="convert-modal scale-message-modal" role="dialog" aria-modal="true" aria-labelledby="scale-message-title"><div className="panel-heading"><div><h2 id="scale-message-title">Mensagem da escala</h2><p>Mensagem preparada para {draft.teacherName}.</p></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={18}/></button></div><label className="field">Texto da mensagem<textarea readOnly rows={6} value={draft.message}/></label>{!draft.teacherPhone && <p>Esse professor ainda não tem telefone cadastrado. Você pode copiar a mensagem para enviá-la por outro meio.</p>}{notice && <p role="status">{notice}</p>}<div className="convert-modal-footer"><button className="button secondary" onClick={onCopy}><FileInput size={16}/> Copiar mensagem</button><button className="button primary" onClick={onWhatsApp} disabled={!draft.whatsappUrl}><MessageCircle size={16}/> Abrir WhatsApp</button></div></section></Modal>;
}
