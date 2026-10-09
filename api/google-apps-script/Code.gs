function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || '{}');
    const expected = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
    if (!expected || payload.secret !== expected) return json({ success: false, message: 'Autorização inválida.' });

    const form = FormApp.openById(payload.formId);
    const answers = (payload.answers || []).map(function (answer) {
      const item = form.getItemById(Number(answer.itemId));
      if (!item) throw new Error('Uma pergunta mapeada não existe mais no formulário.');
      const value = String(answer.value ?? '');
      switch (item.getType()) {
        case FormApp.ItemType.TEXT: return item.asTextItem().createResponse(value);
        case FormApp.ItemType.PARAGRAPH_TEXT: return item.asParagraphTextItem().createResponse(value);
        case FormApp.ItemType.MULTIPLE_CHOICE: return item.asMultipleChoiceItem().createResponse(value);
        case FormApp.ItemType.LIST: return item.asListItem().createResponse(value);
        case FormApp.ItemType.DATE: return item.asDateItem().createResponse(parseDate(value));
        default: throw new Error('Tipo de pergunta não suportado para envio automático: ' + item.getTitle());
      }
    });

    if (!answers.length) throw new Error('Nenhuma resposta mapeada para enviar.');
    form.createResponse().withItemResponses(answers).submit();
    return json({ success: true });
  } catch (error) {
    return json({ success: false, message: error.message || 'Falha ao enviar as respostas.' });
  }
}

function parseDate(value) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('Data inválida: ' + value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
