const STORAGE_KEY = 'trading-journal-v7';

const defaultData = {
  settings: {
    initialCapital: 1000,
    riskPercent: 1,
    systemName: '',
    defaultTicker: ''
  },
  trades: []
};

let state = loadState();
let editingId = null;

const $ = (id) => document.getElementById(id);
const tradeForm = $('tradeForm');
const tradesContainer = $('tradesContainer');
const tradeCardTemplate = $('tradeCardTemplate');

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultData);
    const parsed = JSON.parse(raw);
    return {
      settings: { ...defaultData.settings, ...(parsed.settings || {}) },
      trades: Array.isArray(parsed.trades) ? parsed.trades : []
    };
  } catch {
    return structuredClone(defaultData);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(number);
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 }).format(Number(value || 0));
}

function calculateTrade(trade) {
  const entry = Number(trade.entryPrice || 0);
  const current = Number(trade.currentPrice || 0);
  const exit = Number(trade.exitPrice || 0);
  const stop = Number(trade.stopPrice || 0);
  const qty = Number(trade.quantity || 0);
  const fees = Number(trade.fees || 0);
  const isLong = trade.side === 'long';
  const livePrice = trade.status === 'closed' ? exit || current : current;

  const grossPnL = isLong
    ? (livePrice - entry) * qty
    : (entry - livePrice) * qty;

  const netPnL = grossPnL - fees;
  const invested = trade.status === 'open' ? current * qty : 0;
  const riskPerUnit = stop ? (isLong ? entry - stop : stop - entry) : 0;
  const openRisk = trade.status === 'open' ? Math.max(riskPerUnit, 0) * qty : 0;

  return {
    grossPnL,
    netPnL,
    invested,
    openRisk
  };
}

function calculatePortfolio() {
  const initialCapital = Number(state.settings.initialCapital || 0);
  let realizedPnL = 0;
  let floatingPnL = 0;
  let openInvested = 0;
  let openRisk = 0;
  let openCount = 0;
  let closedCount = 0;

  for (const trade of state.trades) {
    const metrics = calculateTrade(trade);
    if (trade.status === 'closed') {
      realizedPnL += metrics.netPnL;
      closedCount += 1;
    } else {
      floatingPnL += metrics.netPnL;
      openInvested += metrics.invested;
      openRisk += metrics.openRisk;
      openCount += 1;
    }
  }

  const currentCapital = initialCapital + realizedPnL + floatingPnL;

  return { initialCapital, currentCapital, realizedPnL, floatingPnL, openInvested, openRisk, openCount, closedCount };
}

function renderStats() {
  const p = calculatePortfolio();
  $('statInitialCapital').textContent = formatCurrency(p.initialCapital);
  $('statCurrentCapital').textContent = formatCurrency(p.currentCapital);
  $('statRealizedPnL').textContent = formatCurrency(p.realizedPnL);
  $('statFloatingPnL').textContent = formatCurrency(p.floatingPnL);
  $('statOpenInvested').textContent = formatCurrency(p.openInvested);
  $('statOpenRisk').textContent = formatCurrency(p.openRisk);
  $('statOpenCount').textContent = String(p.openCount);
  $('statClosedCount').textContent = String(p.closedCount);

  setSignClass($('statCurrentCapital'), p.currentCapital - p.initialCapital);
  setSignClass($('statRealizedPnL'), p.realizedPnL);
  setSignClass($('statFloatingPnL'), p.floatingPnL);
}

function setSignClass(el, value) {
  el.classList.remove('positive', 'negative');
  if (value > 0) el.classList.add('positive');
  if (value < 0) el.classList.add('negative');
}

function renderTrades() {
  tradesContainer.innerHTML = '';

  const statusFilter = $('filterStatus').value;
  const query = $('searchInput').value.trim().toLowerCase();

  const filtered = [...state.trades]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter((trade) => {
      if (statusFilter !== 'all' && trade.status !== statusFilter) return false;
      if (!query) return true;
      const haystack = [trade.ticker, trade.notes, trade.setup, trade.entryReason, trade.exitReason]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

  if (!filtered.length) {
    tradesContainer.innerHTML = '<div class="trade-card">No hay operaciones que mostrar.</div>';
    return;
  }

  for (const trade of filtered) {
    const node = tradeCardTemplate.content.firstElementChild.cloneNode(true);
    const title = node.querySelector('.trade-title');
    const meta = node.querySelector('.trade-meta');
    const grid = node.querySelector('.trade-grid');
    const notes = node.querySelector('.trade-notes');
    const link = node.querySelector('.trade-link');
    const editBtn = node.querySelector('.edit-btn');
    const deleteBtn = node.querySelector('.delete-btn');

    const m = calculateTrade(trade);
    title.textContent = `${trade.ticker} · ${trade.side === 'long' ? 'Long' : 'Short'} · ${trade.status === 'open' ? 'Abierta' : 'Cerrada'}`;
    meta.textContent = `${trade.date}${trade.timeframe ? ' · ' + trade.timeframe : ''}${trade.setup ? ' · ' + trade.setup : ''}`;

    const items = [
      ['Entrada', formatNumber(trade.entryPrice)],
      ['Precio actual', formatNumber(trade.currentPrice)],
      ['Salida', trade.exitPrice ? formatNumber(trade.exitPrice) : '—'],
      ['Stop', trade.stopPrice ? formatNumber(trade.stopPrice) : '—'],
      ['Cantidad', formatNumber(trade.quantity)],
      ['Comisiones', formatCurrency(trade.fees)],
      ['P/L neto', formatCurrency(m.netPnL)],
      ['Capital invertido', formatCurrency(m.invested)],
      ['Riesgo abierto', formatCurrency(m.openRisk)],
      ['Entrada por', trade.entryReason || '—'],
      ['Salida por', trade.exitReason || '—'],
      ['R múltiple', trade.rMultiple || '—']
    ];

    for (const [label, value] of items) {
      const div = document.createElement('div');
      div.className = 'trade-item';
      div.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
      if (label === 'P/L neto') setSignClass(div.querySelector('strong'), m.netPnL);
      grid.appendChild(div);
    }

    if (trade.notes) {
      notes.textContent = trade.notes;
      notes.classList.remove('hidden');
    }

    if (trade.screenshot) {
      link.href = trade.screenshot;
      link.textContent = 'Ver captura';
      link.classList.remove('hidden');
    }

    editBtn.addEventListener('click', () => startEdit(trade.id));
    deleteBtn.addEventListener('click', () => deleteTrade(trade.id));

    tradesContainer.appendChild(node);
  }
}

function syncSettingsForm() {
  $('initialCapital').value = state.settings.initialCapital;
  $('riskPercent').value = state.settings.riskPercent;
  $('systemName').value = state.settings.systemName;
  $('defaultTicker').value = state.settings.defaultTicker;
}

function updateSettings() {
  state.settings.initialCapital = Number($('initialCapital').value || 0);
  state.settings.riskPercent = Number($('riskPercent').value || 0);
  state.settings.systemName = $('systemName').value.trim();
  state.settings.defaultTicker = $('defaultTicker').value.trim();
  saveState();
  renderStats();
}

function collectFormData(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  return {
    id: editingId || crypto.randomUUID(),
    date: data.date,
    ticker: data.ticker.trim().toUpperCase(),
    side: data.side,
    status: data.status,
    entryPrice: Number(data.entryPrice || 0),
    currentPrice: Number(data.currentPrice || 0),
    exitPrice: data.exitPrice ? Number(data.exitPrice) : 0,
    stopPrice: data.stopPrice ? Number(data.stopPrice) : 0,
    quantity: Number(data.quantity || 0),
    fees: Number(data.fees || 0),
    rMultiple: data.rMultiple || '',
    timeframe: data.timeframe.trim(),
    entryReason: data.entryReason,
    exitReason: data.exitReason,
    setup: data.setup.trim(),
    screenshot: data.screenshot.trim(),
    notes: data.notes.trim()
  };
}

function resetForm() {
  tradeForm.reset();
  tradeForm.elements.date.valueAsDate = new Date();
  tradeForm.elements.ticker.value = state.settings.defaultTicker || '';
  editingId = null;
  $('cancelEditBtn').classList.add('hidden');
}

function startEdit(id) {
  const trade = state.trades.find(t => t.id === id);
  if (!trade) return;
  editingId = id;
  for (const [key, value] of Object.entries(trade)) {
    if (tradeForm.elements[key]) tradeForm.elements[key].value = value;
  }
  $('cancelEditBtn').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteTrade(id) {
  if (!confirm('¿Eliminar esta operación?')) return;
  state.trades = state.trades.filter(t => t.id !== id);
  saveState();
  renderAll();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'trading-journal-v7-data.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      state = {
        settings: { ...defaultData.settings, ...(parsed.settings || {}) },
        trades: Array.isArray(parsed.trades) ? parsed.trades : []
      };
      saveState();
      syncSettingsForm();
      resetForm();
      renderAll();
      alert('Datos importados correctamente.');
    } catch {
      alert('El archivo JSON no es válido.');
    }
  };
  reader.readAsText(file);
}

function renderAll() {
  renderStats();
  renderTrades();
}

['initialCapital', 'riskPercent', 'systemName', 'defaultTicker'].forEach(id => {
  $(id).addEventListener('input', updateSettings);
});

tradeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const trade = collectFormData(tradeForm);

  if (editingId) {
    state.trades = state.trades.map(t => t.id === editingId ? trade : t);
  } else {
    state.trades.push(trade);
  }

  saveState();
  resetForm();
  renderAll();
});

$('cancelEditBtn').addEventListener('click', resetForm);
$('filterStatus').addEventListener('change', renderTrades);
$('searchInput').addEventListener('input', renderTrades);
$('exportBtn').addEventListener('click', exportData);
$('importInput').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) importData(file);
  e.target.value = '';
});
$('resetBtn').addEventListener('click', () => {
  if (!confirm('Esto borrará todas las operaciones guardadas en este navegador. ¿Continuar?')) return;
  state = structuredClone(defaultData);
  saveState();
  syncSettingsForm();
  resetForm();
  renderAll();
});

syncSettingsForm();
resetForm();
renderAll();
