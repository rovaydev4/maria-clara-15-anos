(() => {
  const partyDate = new Date(2026, 9, 31);
  const todayNow = new Date();
  const today = new Date(todayNow.getFullYear(), todayNow.getMonth(), todayNow.getDate());
  const daysLeft = Math.max(0, Math.ceil((partyDate.getTime() - today.getTime()) / 86400000));
  document.getElementById('dias-restantes').textContent = String(daysLeft).padStart(2, '0');

  const form = document.getElementById('rsvp-form');
  const endpoint = String(window.RSVP_CONFIG?.appsScriptUrl || '').trim();
  const status = document.getElementById('rsvp-status');
  const submitButton = document.getElementById('rsvp-submit');
  const companionsField = document.getElementById('campo-acompanhantes');
  const companionsSelect = document.getElementById('acompanhantes');
  const responseFrame = document.getElementById('rsvp-response');
  let waitingForResponse = false;
  let responseTimeout;

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `form-alert${type ? ` ${type}` : ''}`;
    status.hidden = false;
  }

  function syncCompanions() {
    const attending = document.getElementById('presenca-sim').checked;
    companionsField.hidden = !attending;
    companionsSelect.disabled = !attending;
  }

  document.querySelectorAll('input[name="presenca"]').forEach((input) => input.addEventListener('change', syncCompanions));
  syncCompanions();

  if (!endpoint || endpoint.includes('COLE_AQUI')) {
    submitButton.disabled = true;
    showStatus('O formulário ainda precisa ser conectado ao Apps Script. Veja o README do projeto para concluir a configuração.', 'error');
    return;
  }

  window.addEventListener('message', (event) => {
    if (event.source !== responseFrame.contentWindow || event.data?.type !== 'rsvp-result' || !waitingForResponse) return;

    window.clearTimeout(responseTimeout);
    waitingForResponse = false;
    submitButton.disabled = false;
    submitButton.textContent = 'Enviar confirmação';

    if (event.data.ok) {
      form.reset();
      syncCompanions();
      showStatus('Confirmação recebida. Obrigada por fazer parte deste capítulo tão especial!');
    } else {
      showStatus(event.data.message || 'Não foi possível registrar agora. Tente novamente.', 'error');
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.hidden = true;
    status.className = 'form-alert';

    if (!form.reportValidity()) return;

    waitingForResponse = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando…';
    form.action = endpoint;
    form.submit();

    responseTimeout = window.setTimeout(() => {
      if (!waitingForResponse) return;
      waitingForResponse = false;
      submitButton.disabled = false;
      submitButton.textContent = 'Enviar confirmação';
      showStatus('O envio demorou mais que o esperado. Confira sua conexão antes de tentar novamente.', 'error');
    }, 30000);
  });
})();
