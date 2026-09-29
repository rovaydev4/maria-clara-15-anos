(() => {
  const endpoint = String(window.RSVP_CONFIG?.appsScriptUrl || '').trim();
  const status = document.getElementById('list-status');
  const tableToolbar = document.getElementById('table-toolbar');
  const tableWrap = document.getElementById('table-wrap');
  const emptyState = document.getElementById('empty-state');
  const noResults = document.getElementById('no-results');
  const tableFoot = document.getElementById('table-foot');
  const guestList = document.getElementById('guest-list');
  const nameFilter = document.getElementById('filtro-nome');
  const attendanceFilter = document.getElementById('filtro-presenca');
  const rows = [];

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle('error', isError);
    status.hidden = false;
  }

  function normalizeText(value) {
    return value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function updateFilters() {
    const query = normalizeText(nameFilter.value.trim());
    const attendance = attendanceFilter.value;
    let visible = 0;

    rows.forEach(({ element, name, status: presence }) => {
      const match = normalizeText(name).includes(query) && (attendance === 'todas' || presence === attendance);
      element.hidden = !match;
      if (match) visible++;
    });

    noResults.hidden = visible !== 0;
    document.getElementById('visible-count').textContent = `${visible} ${visible === 1 ? 'resposta' : 'respostas'}`;
  }

  function addCell(row, value, className) {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = value;
    row.appendChild(cell);
    return cell;
  }

  function render(records) {
    const normalized = records
      .filter((record) => record && typeof record.name === 'string' && record.name.trim())
      .map((record) => ({
        name: record.name.trim(),
        attendance: record.attendance === 'Sim' ? 'sim' : 'nao',
        companions: Math.max(0, Math.min(6, Number.parseInt(record.companions, 10) || 0)),
        createdAt: typeof record.createdAt === 'string' ? record.createdAt : ''
      }))
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt));

    document.getElementById('total-respostas').textContent = String(normalized.length);
    const confirmed = normalized.filter((record) => record.attendance === 'sim');
    document.getElementById('total-confirmados').textContent = String(confirmed.length);
    document.getElementById('total-pessoas').textContent = String(confirmed.reduce((sum, record) => sum + 1 + record.companions, 0));
    document.getElementById('total-ausentes').textContent = String(normalized.length - confirmed.length);
    status.hidden = true;

    if (!normalized.length) {
      emptyState.hidden = false;
      return;
    }

    normalized.forEach((record) => {
      const row = document.createElement('tr');
      row.dataset.name = record.name;
      row.dataset.status = record.attendance;
      addCell(row, record.name, 'guest-name');

      const statusCell = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `status ${record.attendance === 'sim' ? 'status-yes' : 'status-no'}`;
      badge.textContent = record.attendance === 'sim' ? 'Confirmado' : 'Não poderá ir';
      statusCell.appendChild(badge);
      row.appendChild(statusCell);

      addCell(row, record.attendance === 'sim' ? String(record.companions) : '—');
      addCell(row, record.createdAt);
      guestList.appendChild(row);
      rows.push({ element: row, name: record.name, status: record.attendance });
    });

    tableToolbar.hidden = false;
    tableWrap.hidden = false;
    tableFoot.hidden = false;
    document.getElementById('visible-count').textContent = `${normalized.length} ${normalized.length === 1 ? 'resposta' : 'respostas'}`;
  }

  if (!endpoint || endpoint.includes('COLE_AQUI')) {
    showStatus('A lista ainda precisa ser conectada ao Apps Script. Veja o README do projeto para concluir a configuração.', true);
    return;
  }

  const callbackName = `rsvpList_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const script = document.createElement('script');
  const timeout = window.setTimeout(() => {
    delete window[callbackName];
    script.remove();
    showStatus('Não foi possível carregar a lista. Verifique a conexão e tente novamente.', true);
  }, 15000);

  window[callbackName] = (result) => {
    window.clearTimeout(timeout);
    script.remove();
    delete window[callbackName];
    if (!result || result.ok !== true || !Array.isArray(result.records)) {
      showStatus(result?.error || 'Não foi possível carregar as confirmações.', true);
      return;
    }
    render(result.records);
  };

  script.onerror = () => {
    window.clearTimeout(timeout);
    delete window[callbackName];
    showStatus('Não foi possível conectar à planilha de confirmações.', true);
  };
  script.src = `${endpoint}${endpoint.includes('?') ? '&' : '?'}callback=${encodeURIComponent(callbackName)}&t=${Date.now()}`;
  document.head.appendChild(script);

  nameFilter.addEventListener('input', updateFilters);
  attendanceFilter.addEventListener('change', updateFilters);
  document.getElementById('print-list').addEventListener('click', () => window.print());
})();
