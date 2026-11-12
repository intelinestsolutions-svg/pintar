/* Smart Documents Writer - App Logic */
const APP_VERSION = '2026-11-13-templates';
console.info('[SmartDocs] build ' + APP_VERSION);
const STORAGE_KEY = 'smartdocs_v1';
const SETTINGS_KEY = 'smartdocs_settings_v1';
const API_BASE = ''; // same origin; falls back to localStorage if unavailable

// ---------- Data layer (API first, localStorage fallback) ----------
let USE_API = null; // null = unknown
async function apiAvailable() {
  if (USE_API !== null) return USE_API;
  try {
    const r = await fetch(API_BASE + '/api/auth-status', { cache: 'no-store' });
    if (!r.ok) throw new Error('bad');
    USE_API = true;
    return true;
  } catch (e) {
    USE_API = false;
    return false;
  }
}
function getAuthToken() { return sessionStorage.getItem('smartdocs_token') || localStorage.getItem('smartdocs_token') || ''; }
function setAuthToken(t) { sessionStorage.setItem('smartdocs_token', t); }
function getAuthRole() { return sessionStorage.getItem('smartdocs_role') || 'staff'; }
function getAuthUsername() { return sessionStorage.getItem('smartdocs_username') || ''; }
function setAuthRole(role, username) { sessionStorage.setItem('smartdocs_role', role || 'staff'); if (username) sessionStorage.setItem('smartdocs_username', username); }
function clearAuthToken() { sessionStorage.removeItem('smartdocs_token'); localStorage.removeItem('smartdocs_token'); sessionStorage.removeItem('smartdocs_role'); sessionStorage.removeItem('smartdocs_username'); }
function isAdmin() { return getAuthRole() === 'admin'; }
async function apiFetch(path, opts) {
  opts = opts || {};
  opts.headers = opts.headers || {};
  const t = getAuthToken();
  if (t) opts.headers['x-auth-token'] = t;
  const r = await fetch(API_BASE + path, opts);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

const DEFAULT_SETTINGS = {
  logo: 'data:image/png;base64,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',
  template: 'modern',
  companyName: 'Studio Pro',
  companyAddress: 'F-8-1, Block F, Cyber City Apartment 2\n88200 Kota Kinabalu, Sabah\nMalaysia',
  companyEmail: 'admin@prostudio.my',
  companyPhone: '+60 13-869 9933',
  companyTaxId: '',
  currency: 'MYR',
  currencySymbol: 'MYR ',
  taxRate: 10,
  docPrefix: { invoice: 'INV', receipt: 'RCPT', delivery: 'DN', quotation: 'QT', purchaseorder: 'PO', creditnote: 'CN', proforma: 'PI' },
  nextNumber: { invoice: 1001, receipt: 1001, delivery: 1001, quotation: 1001, purchaseorder: 1001, creditnote: 1001, proforma: 1001 },
  terms: 'Payment due within 30 days. Thank you for your business.',
  footer: 'prostudio.my',
};

let state = {
  docs: [],
  customers: [],
  recurring: [],
  publicMode: false,
  authRequired: false,
  logoPlateNeedsBacking: false,
  publicDocRef: null,
  settings: { ...DEFAULT_SETTINGS },
  currentView: 'dashboard',
  currentType: 'invoice',
  editingId: null,
  filter: 'all',
  typeFilter: '',
  search: '',
  custSearch: '',
};

// ---------- Storage ----------
async function loadData() {
  state.docs = [];
  state.customers = [];
  state.recurring = [];
  state.settings = { ...DEFAULT_SETTINGS };
  if (await apiAvailable()) {
    // public lookup mode
    const params = new URLSearchParams(location.search);
    const docRef = params.get('doc');
    if (docRef) {
      state.publicMode = true;
      state.publicDocRef = docRef;
      await refreshLogoPlate();
      return;
    }
    try {
      const st = await apiFetch('/api/auth-status');
      state.authRequired = !!st.authRequired;
      if (st.authRequired && !getAuthToken()) {
        showLoginScreen();
        return;
      }
      if (!st.authRequired) setAuthRole('admin', 'admin');
      else if (st.role) setAuthRole(st.role, st.username);
    } catch {}
    try {
      const docs = await apiFetch('/api/docs');
      state.docs = docs || [];
      const s = await apiFetch('/api/settings');
      if (s) state.settings = mergeSettings(s);
      normalizeSettings();
      await refreshLogoPlate();
      try { state.customers = await apiFetch('/api/customers'); } catch { state.customers = []; }
      try { state.recurring = await apiFetch('/api/recurring'); } catch { state.recurring = []; }
      try { state.users = await apiFetch('/api/users'); } catch { state.users = []; }
      return;
    } catch (e) {
      if (/HTTP 401\b/.test(e.message)) {
        // Session expired (e.g. server restarted/redeployed) — ask to sign in again.
        clearAuthToken();
        showLoginScreen();
        return;
      }
      console.warn('API load failed, falling back', e);
      USE_API = false;
    }
  }
  // localStorage fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const p = JSON.parse(raw); state.docs = p.docs || []; state.customers = p.customers || []; state.recurring = p.recurring || []; }
  } catch (e) { console.error('load docs', e); }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) state.settings = mergeSettings(JSON.parse(raw));
    normalizeSettings();
  } catch (e) { console.error('load settings', e); }
  await refreshLogoPlate();
}
// Keep the built-in Studio Pro logo unless the user explicitly removed it.
function mergeSettings(remote) {
  const merged = { ...DEFAULT_SETTINGS, ...(remote || {}) };
  if (!remote || (!remote.logo && !remote.logoRemoved)) merged.logo = DEFAULT_SETTINGS.logo;
  if (!merged.footer || /^generated (with|by)\b/i.test(merged.footer.trim())) merged.footer = DEFAULT_SETTINGS.footer;
  return merged;
}
async function saveState() {
  if (USE_API) {
    // docs are saved individually via saveDoc; nothing to do here
    return;
  }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ docs: state.docs, customers: state.customers, recurring: state.recurring })); } catch (e) {}
}
async function saveSettings() {
  if (USE_API) {
    try { await apiFetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state.settings) }); } catch (e) { console.warn('settings save failed', e); }
    return;
  }
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); } catch (e) {}
}

// ---------- Utils ----------
function uid() { return 'd_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

const CURRENCY_SYMBOLS = {
  MYR: 'MYR', USD: '$', EUR: '€', GBP: '£', SGD: 'S$', AUD: 'A$', CAD: 'C$', NZD: 'NZ$',
  JPY: '¥', CNY: '¥', HKD: 'HK$', TWD: 'NT$', KRW: '₩', THB: '฿', IDR: 'Rp', PHP: '₱',
  VND: '₫', INR: '₹', BDT: '৳', PKR: '₨', LKR: 'Rs', NPR: 'Rs', BND: 'B$', MOP: 'MOP$',
  CHF: 'CHF', SEK: 'kr', NOK: 'kr', DKK: 'kr', SAR: 'SAR', AED: 'AED', QAR: 'QAR',
  KWD: 'KWD', BHD: 'BHD', OMR: 'OMR', JOD: 'JOD', MXN: 'MX$', BRL: 'R$', ZAR: 'R',
  RUB: '₽', TRY: '₺', EGP: 'E£', NGN: '₦', KES: 'KSh', TZS: 'TSh', MMK: 'K', KHR: '៛',
  LAK: '₭', MVR: 'MVR',
};

function currencySymbolFor(code) {
  const def = String(state.settings.currency || 'MYR').toUpperCase();
  const c = String(code || def).toUpperCase();
  if (!code && def === 'MYR') return 'MYR ';
  // MYR always renders as "MYR", never the legacy "RM"
  if (c === 'MYR') return 'MYR ';
  if (c === def) {
    const sym = String(state.settings.currencySymbol || '').trim();
    if (sym && sym.toUpperCase() !== 'RM') return state.settings.currencySymbol;
  }
  if (CURRENCY_SYMBOLS[c]) return CURRENCY_SYMBOLS[c] + ' ';
  try {
    const p = new Intl.NumberFormat('en', { style: 'currency', currency: c, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0).find(x => x.type === 'currency');
    if (p && p.value) return p.value + ' ';
  } catch (e) {}
  return c + ' ';
}

// Clean up legacy values: "RM" -> "MYR", "Acme Corp" demo profile -> Studio Pro
function normalizeSettings() {
  const s = state.settings;
  let changed = false;
  if (String(s.currency || 'MYR').toUpperCase() === 'MYR' && String(s.currencySymbol || '').trim().toUpperCase() === 'RM') {
    s.currencySymbol = 'MYR ';
    changed = true;
  }
  if (/acme\s*corp/i.test(String(s.companyName || '')) || /@acmecorp\.com$/i.test(String(s.companyEmail || '').trim())) {
    s.companyName = 'Studio Pro';
    s.companyEmail = 'admin@prostudio.my';
    changed = true;
  }
  if (/123 business street|new york,\s*ny\s*10001/i.test(String(s.companyAddress || ''))) {
    s.companyAddress = DEFAULT_SETTINGS.companyAddress;
    changed = true;
  }
  if (/\+1\s*\(555\)\s*010-2000/.test(String(s.companyPhone || ''))) {
    s.companyPhone = DEFAULT_SETTINGS.companyPhone;
    changed = true;
  }
  if (/^tax-12345678$/i.test(String(s.companyTaxId || '').trim())) {
    s.companyTaxId = '';
    changed = true;
  }
  if (/^generated (with|by)\b/i.test(String(s.footer || '').trim())) {
    s.footer = 'prostudio.my';
    changed = true;
  }
  if (changed) { try { saveSettings(); } catch (e) {} }
}

function money(n, code) {
  const s = currencySymbolFor(code);
  const v = (Number(n) || 0).toFixed(2);
  return s + v.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function currencyOptionsHtml(selected) {
  const list = (currencyCodesCache || CURRENCY_FALLBACK).slice().sort();
  const sel = String(selected || state.settings.currency || 'MYR').toUpperCase();
  if (!list.includes(sel)) list.unshift(sel);
  return list.map(c => `<option value="${c}" ${c === sel ? 'selected' : ''}>${escapeHtml(currencyLabel(c))}</option>`).join('');
}
function fmtDate(d) {
  if (!d) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let dt;
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(d)) {
    const [y,m,day] = d.split('-');
    dt = new Date(parseInt(y), parseInt(m)-1, parseInt(day));
  } else {
    dt = new Date(d);
  }
  if (isNaN(dt)) return d;
  return String(dt.getDate()).padStart(2,'0') + ' ' + months[dt.getMonth()] + ' ' + dt.getFullYear();
}
const TEMPLATES = [
  { key: 'modern', label: 'Modern (blue accent)' },
  { key: 'minimal', label: 'Minimal (clean)' },
  { key: 'classic', label: 'Classic (serif, bordered)' },
  { key: 'bold', label: 'Bold (dark header)' },
  { key: 'executive', label: 'Executive (navy, serif)' },
  { key: 'corporate', label: 'Corporate (gradient header)' },
  { key: 'elegant', label: 'Elegant (purple, light)' },
  { key: 'sleek', label: 'Sleek (dark totals)' },
  { key: 'aurora', label: 'Aurora (soft gradient)' },
  { key: 'heritage', label: 'Heritage (emerald & gold)' },
  { key: 'blueprint', label: 'Blueprint (technical grid)' },
  { key: 'luxe', label: 'Luxe (black & gold)' },
  { key: 'nordic', label: 'Nordic (clean wave)' },
  { key: 'sunrise', label: 'Sunrise (warm gradient)' },
];
const DOC_TYPES = [
  { key: 'invoice', label: 'Invoice', prefix: 'INV' },
  { key: 'receipt', label: 'Sales Receipt', prefix: 'RCPT' },
  { key: 'delivery', label: 'Delivery Note', prefix: 'DN' },
  { key: 'quotation', label: 'Quotation', prefix: 'QT' },
  { key: 'purchaseorder', label: 'Purchase Order', prefix: 'PO' },
  { key: 'creditnote', label: 'Credit Note', prefix: 'CN' },
  { key: 'proforma', label: 'Proforma Invoice', prefix: 'PI' },
];
function typeInfo(t) { return DOC_TYPES.find(x => x.key === t) || { key: t, label: t, prefix: 'DOC' }; }
function typeLabel(t) { return typeInfo(t).label; }
function typeClass(t) { return t; }
function isPricingType(t) { return t !== 'delivery'; }
function hasBalance(t) { return ['invoice', 'creditnote', 'proforma'].includes(t); }
function hasPaymentMethod(t) { return t === 'receipt'; }
function today() { return new Date().toISOString().slice(0, 10); }
function addDays(d, n) { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); }

function genNumber(type) {
  const prefix = state.settings.docPrefix[type] || 'DOC';
  const num = state.settings.nextNumber[type] || 1001;
  const code = prefix + '-' + String(num).padStart(4, '0');
  state.settings.nextNumber[type] = num + 1;
  saveSettings();
  return code;
}

function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function nl2br(s) {
  let t = escapeHtml(s ?? '');
  // convert literal <br>, <br/>, <br /> typed by user into line breaks
  t = t.replace(/&lt;br\s*\/?&gt;/gi, '<br/>');
  // convert newlines
  t = t.replace(/\n/g, '<br/>');
  return t;
}

// ---------- Navigation ----------
function navigate(view, type) {
  state.currentView = view;
  if (type) state.currentType = type;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const active = document.querySelector(`.nav-item[data-view="${view}"][data-type="${type || ''}"]`) ||
                document.querySelector(`.nav-item[data-view="${view}"]`);
  if (active) active.classList.add('active');
  // sync mobile nav
  document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'));
  const activeM = document.querySelector(`.mobile-nav-item[data-view="${view}"][data-type="${type || ''}"]`) ||
                  document.querySelector(`.mobile-nav-item[data-view="${view}"]`);
  if (activeM) activeM.classList.add('active');
  render();
}

// ---------- Customers ----------
async function saveCustomer(c) {
  if (USE_API) {
    try {
      const exists = await apiFetch('/api/customers/' + c.id).catch(() => null);
      if (exists) await apiFetch('/api/customers/' + c.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
      else await apiFetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
    } catch (e) { console.warn('save customer failed', e); }
  }
  const idx = state.customers.findIndex(x => x.id === c.id);
  if (idx >= 0) state.customers[idx] = c; else state.customers.push(c);
  await saveState();
  return c;
}
async function deleteCustomer(id) {
  if (!confirm('Delete this customer?')) return;
  state.customers = state.customers.filter(c => c.id !== id);
  if (USE_API) { try { await apiFetch('/api/customers/' + id, { method: 'DELETE' }); } catch (e) {} }
  else { await saveState(); }
  render();
}
function newCustomer() {
  return { id: 'c_' + Math.random().toString(36).slice(2, 10), name: '', email: '', phone: '', address: '', taxId: '', kind: 'client', notes: '' };
}

// ---------- Recurring ----------
async function saveRecurring(r) {
  if (USE_API) {
    try {
      const exists = await apiFetch('/api/recurring/' + r.id).catch(() => null);
      if (exists) await apiFetch('/api/recurring/' + r.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) });
      else await apiFetch('/api/recurring', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) });
    } catch (e) { console.warn('save recurring failed', e); }
  }
  const idx = state.recurring.findIndex(x => x.id === r.id);
  if (idx >= 0) state.recurring[idx] = r; else state.recurring.push(r);
  await saveState();
  return r;
}
async function deleteRecurring(id) {
  if (!confirm('Delete this recurring schedule?')) return;
  state.recurring = state.recurring.filter(r => r.id !== id);
  if (USE_API) { try { await apiFetch('/api/recurring/' + id, { method: 'DELETE' }); } catch (e) {} }
  else { await saveState(); }
  render();
}
function makeRecurring(docId) {
  const existing = document.getElementById('rec-modal-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'rec-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);padding:20px;max-width:360px;width:95%;box-shadow:var(--shadow);';
  modal.innerHTML = `
    <h3 style="margin-bottom:12px;">Make Recurring</h3>
    <div class="form-group"><label>Frequency</label><select id="rc-freq">
      <option value="weekly">Weekly</option>
      <option value="monthly" selected>Monthly</option>
      <option value="quarterly">Quarterly</option>
      <option value="yearly">Yearly</option>
    </select></div>
    <div class="form-group"><label>Start date</label><input type="date" id="rc-start" value="${new Date().toISOString().slice(0,10)}"/></div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
      <button class="btn ghost" id="rc-cancel">Cancel</button>
      <button class="btn primary" id="rc-save">Create</button>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  document.getElementById('rc-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('rc-save').addEventListener('click', async () => {
    const freq = document.getElementById('rc-freq').value;
    const start = document.getElementById('rc-start').value;
    const r = { id: 'r_' + Math.random().toString(36).slice(2, 10), sourceDocId: docId, frequency: freq, nextRun: start, active: true };
    await saveRecurring(r);
    overlay.remove();
    toast('Recurring schedule created', 'success');
    render();
  });
}

// ---------- Render dispatcher ----------
function render() {
  const title = document.getElementById('topbar-title');
  const sub = document.getElementById('topbar-sub');
  const actions = document.getElementById('topbar-actions');
  const content = document.getElementById('content');
  actions.innerHTML = '';

  if (state.publicMode) {
    title.textContent = 'Document Retrieval';
    sub.textContent = 'Public access';
    renderPublicLookup(content);
    return;
  }

  if (!isAdmin() && (state.currentView === 'settings' || state.currentView === 'customers' || state.currentView === 'recurring' || state.currentView === 'reports')) {
    state.currentView = 'dashboard';
  }

  if (state.currentView === 'dashboard') {
    title.textContent = 'Dashboard';
    sub.textContent = 'Overview of your documents';
    const btn = document.createElement('button');
    btn.className = 'btn primary';
    btn.innerHTML = icon('plus') + ' New Document';
    btn.onclick = () => openTypePicker();
    actions.appendChild(btn);
    renderDashboard(content);
  } else if (state.currentView === 'list') {
    const isAll = state.currentType === 'all' || !state.currentType;
    title.textContent = isAll ? 'All Documents' : typeLabel(state.currentType) + 's';
    sub.textContent = isAll ? 'Manage and track all your documents' : 'Manage and track your ' + typeLabel(state.currentType).toLowerCase() + 's';
    const btn = document.createElement('button');
    btn.className = 'btn primary';
    btn.innerHTML = icon('plus') + ' New Document';
    btn.onclick = () => openTypePicker();
    actions.appendChild(btn);
    renderList(content, state.currentType);
  } else if (state.currentView === 'editor') {
    title.textContent = (state.editingId ? 'Edit' : 'New') + ' ' + typeLabel(state.currentType);
    sub.textContent = 'Fill in the details below';
    renderEditor(content);
  } else if (state.currentView === 'preview') {
    title.textContent = 'Preview';
    sub.textContent = state.previewDoc ? state.previewDoc.number : '';
    const back = document.createElement('button');
    back.className = 'btn ghost';
    back.innerHTML = icon('arrow-left') + ' Back';
    back.onclick = () => navigate('list', state.currentType);
    actions.appendChild(back);
    const print = document.createElement('button');
    print.className = 'btn';
    print.innerHTML = icon('printer') + ' Print / Save PDF';
    print.onclick = () => printDocument(state.previewDoc);
    actions.appendChild(print);
    const emailBtn = document.createElement('button');
    emailBtn.className = 'btn';
    emailBtn.innerHTML = icon('upload') + ' Send by Email';
    emailBtn.onclick = () => sendDocByEmail();
    actions.appendChild(emailBtn);
    const recBtn = document.createElement('button');
    recBtn.className = 'btn';
    recBtn.innerHTML = icon('copy') + ' Make Recurring';
    recBtn.onclick = () => { if (state.previewDoc) makeRecurring(state.previewDoc.id); };
    actions.appendChild(recBtn);
    renderPreview(content);
  } else if (state.currentView === 'recurring') {
    title.textContent = 'Recurring Documents';
    sub.textContent = 'Automatically generate documents on a schedule';
    renderRecurring(content);
  } else if (state.currentView === 'currency') {
    title.textContent = 'Currency Converter';
    sub.textContent = 'Live exchange rates';
    renderCurrency(content);
  } else if (state.currentView === 'reports') {
    title.textContent = 'Reports';
    sub.textContent = 'Revenue, clients and document analytics';
    renderReports(content);
  } else if (state.currentView === 'customers') {
    title.textContent = 'Customers';
    sub.textContent = 'Manage your clients and suppliers';
    const btn = document.createElement('button');
    btn.className = 'btn primary';
    btn.innerHTML = icon('plus') + ' New Customer';
    btn.onclick = () => openCustomerEditor(null);
    actions.appendChild(btn);
    renderCustomers(content);
  } else if (state.currentView === 'settings') {
    title.textContent = 'Settings';
    sub.textContent = 'Company profile and preferences';
    const save = document.createElement('button');
    save.className = 'btn primary';
    save.innerHTML = icon('save') + ' Save Settings';
    save.onclick = saveSettingsFromForm;
    actions.appendChild(save);
    renderSettings(content);
    setTimeout(() => renderUsersList(), 0);
  }
}

// ---------- Dashboard ----------
function renderDashboard(c) {
  const docs = state.docs;
  const invoices = docs.filter(d => d.type === 'invoice');
  const totalRevenue = invoices.reduce((a, d) => a + (d.total || 0), 0);
  const paid = invoices.reduce((a, d) => a + (d.amountPaid || 0), 0);
  const outstanding = totalRevenue - paid;

  c.innerHTML = `
    <div class="grid grid-4" style="margin-bottom:16px;">
      <div class="stat"><div class="stat-label">Total Documents</div><div class="stat-value">${docs.length}</div><div class="stat-hint">${DOC_TYPES.map(t => docs.filter(d=>d.type===t.key).length + ' ' + t.label.toLowerCase()).join(' · ')}</div></div>
      <div class="stat"><div class="stat-label">Invoiced</div><div class="stat-value">${money(totalRevenue)}</div><div class="stat-hint">Lifetime</div></div>
      <div class="stat"><div class="stat-label">Collected</div><div class="stat-value" style="color:var(--success)">${money(paid)}</div><div class="stat-hint">Payments received</div></div>
      <div class="stat"><div class="stat-label">Outstanding</div><div class="stat-value" style="color:var(--warning)">${money(outstanding)}</div><div class="stat-hint">Balance due</div></div>
    </div>
    <div class="card">
      <div class="card-title">Recent Documents</div>
      <div class="card-sub">Your latest activity</div>
      ${docs.length === 0 ? `<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><h3>No documents yet</h3><p>Create your first invoice, receipt or delivery note to get started.</p></div>` :
      `<div class="table-wrap"><table><thead><tr><th>Type</th><th>Number</th><th>Client</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>
        ${docs.slice().sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,10).map(d => rowHtml(d)).join('')}
      </tbody></table></div>`}
    </div>
    <div class="grid grid-4" style="margin-top:16px;">
      ${DOC_TYPES.map(t => {
        const cnt = docs.filter(d => d.type === t.key).length;
        return `<div class="card" style="cursor:pointer" onclick="navigate('list','${t.key}')"><div class="card-title">${t.label}s</div><div class="card-sub">${cnt} document${cnt===1?'':'s'}</div><div style="font-size:24px;font-weight:700;color:var(--accent)">${cnt}</div></div>`;
      }).join('')}
    </div>
  `;
}

function rowHtml(d) {
  const status = d.type === 'invoice' ? (d.balanceDue <= 0 ? 'paid' : (d.amountPaid > 0 ? 'partial' : 'unpaid')) : (d.type === 'receipt' ? 'paid' : 'paid');
  const statusLabel = d.type === 'invoice' ? (d.balanceDue <= 0 ? 'Paid' : (d.amountPaid > 0 ? 'Partial' : 'Unpaid')) : (d.type === 'receipt' ? 'Paid' : 'Delivered');
  return `<tr>
    <td><span class="badge ${typeClass(d.type)}">${typeLabel(d.type)}</span></td>
    <td><strong>${escapeHtml(d.number)}</strong></td>
    <td>${escapeHtml(d.to?.name || '-')}</td>
    <td>${fmtDate(d.issueDate)}</td>
    <td>${d.type === 'delivery' ? '-' : money(d.total, d.currency)}</td>
    <td><span class="badge ${status}">${statusLabel}</span></td>
    <td><div class="actions-cell">
      <button class="btn sm ghost" onclick="openPreview('${d.id}')" title="Preview">${icon('eye')}</button>
      <button class="btn sm ghost" onclick="openEditor('${d.id}','${d.type}')" title="Edit">${icon('edit')}</button>
      <button class="btn sm danger" onclick="deleteDoc('${d.id}')" title="Delete">${icon('trash')}</button>
    </div></td>
  </tr>`;
}

// ---------- List ----------
function renderList(c, type) {
  let docs = (type === 'all' || !type) ? state.docs.slice() : state.docs.filter(d => d.type === type);
  if ((type === 'all' || !type) && state.typeFilter) docs = docs.filter(d => d.type === state.typeFilter);
  if (state.filter === 'unpaid') docs = docs.filter(d => (d.balanceDue || 0) > 0);
  if (state.filter === 'paid') docs = docs.filter(d => (d.balanceDue || 0) <= 0);
  if (state.search) {
    const q = state.search.toLowerCase();
    docs = docs.filter(d => (d.number + ' ' + (d.to?.name||'') + ' ' + (d.to?.email||'')).toLowerCase().includes(q));
  }
  docs = docs.slice().sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));

  c.innerHTML = `
    <div class="filters">
      <div class="search-bar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input placeholder="Search..." value="${escapeHtml(state.search)}" oninput="state.search=this.value; render()"/></div>
      ${type === 'invoice' ? `
        <div class="chip ${state.filter==='all'?'active':''}" onclick="state.filter='all';render()">All</div>
        <div class="chip ${state.filter==='unpaid'?'active':''}" onclick="state.filter='unpaid';render()">Unpaid</div>
        <div class="chip ${state.filter==='paid'?'active':''}" onclick="state.filter='paid';render()">Paid</div>
      ` : ''}
      ${type === 'all' ? DOC_TYPES.map(t => `<div class="chip ${state.typeFilter===t.key?'active':''}" onclick="state.typeFilter='${t.key}';render()">${t.label}</div>`).join('') + `<div class="chip ${!state.typeFilter?'active':''}" onclick="state.typeFilter='';render()">All types</div>` : ''}
    </div>
    ${docs.length === 0 ? `<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><h3>No documents yet</h3><p>Click "New Document" to create one.</p></div>` :
    `<div class="table-wrap"><table><thead><tr>${type === 'all' ? '<th>Type</th>' : ''}<th>Number</th><th>Client</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>
      ${docs.map(d => {
        const isInv = d.type === 'invoice';
        const status = isInv ? (d.balanceDue <= 0 ? 'paid' : (d.amountPaid > 0 ? 'partial' : 'unpaid')) : 'paid';
        const statusLabel = isInv ? (d.balanceDue <= 0 ? 'Paid' : (d.amountPaid > 0 ? 'Partial' : 'Unpaid')) : (d.type === 'receipt' ? 'Paid' : 'Delivered');
        return `<tr>
          ${type === 'all' ? `<td><span class="badge ${typeClass(d.type)}">${typeLabel(d.type)}</span></td>` : ''}
          <td><strong>${escapeHtml(d.number)}</strong></td>
          <td>${escapeHtml(d.to?.name || '-')}</td>
          <td>${fmtDate(d.issueDate)}</td>
          <td>${d.type === 'delivery' ? (d.items||[]).length + ' items' : money(d.total, d.currency)}</td>
          <td><span class="badge ${status}">${statusLabel}</span></td>
          <td><div class="actions-cell">
            <button class="btn sm ghost" onclick="openPreview('${d.id}')" title="Preview">${icon('eye')}</button>
            <button class="btn sm ghost" onclick="openEditor('${d.id}','${d.type}')" title="Edit">${icon('edit')}</button>
            <button class="btn sm" onclick="duplicateDoc('${d.id}')" title="Duplicate">${icon('copy')}</button>
            <button class="btn sm danger" onclick="deleteDoc('${d.id}')" title="Delete">${icon('trash')}</button>
          </div></td>
        </tr>`;
      }).join('')}
    </tbody></table></div>`}
  `;
}

// ---------- Editor ----------
function emptyDoc(type) {
  const s = state.settings;
  return {
    id: uid(),
    type,
    number: genNumber(type),
    issueDate: today(),
    dueDate: type === 'invoice' ? addDays(today(), 30) : today(),
    from: { name: s.companyName, address: s.companyAddress, email: s.companyEmail, phone: s.companyPhone, taxId: s.companyTaxId },
    to: { name: '', address: '', email: '', phone: '', taxId: '' },
    items: [{ id: uid(), description: '', quantity: 1, unitPrice: 0, taxRate: s.taxRate, amount: 0 }],
    taxRate: s.taxRate,
    subtotal: 0,
    taxAmount: 0,
    total: 0,
    amountPaid: 0,
    balanceDue: 0,
    notes: '',
    template: '',
    currency: s.currency || 'MYR',
    terms: type === 'invoice' ? s.terms : '',
    paymentMethod: type === 'receipt' ? 'Cash' : '',
    deliveredBy: '',
    receivedBy: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function openEditor(id, type) {
  if (id) {
    const d = state.docs.find(x => x.id === id);
    state.editingId = id;
    state.currentType = d.type;
    state.editingDoc = JSON.parse(JSON.stringify(d));
  } else {
    state.editingId = null;
    state.currentType = type;
    state.editingDoc = emptyDoc(type);
  }
  state.currentView = 'editor';
  render();
}

function openPreview(id) {
  const d = id ? state.docs.find(x => x.id === id) : state.editingDoc;
  if (!d) return;
  state.previewDoc = d;
  state.currentView = 'preview';
  state.currentType = d.type;
  render();
}

function renderEditor(c) {
  const d = state.editingDoc;
  const isDelivery = d.type === 'delivery';
  const isReceipt = d.type === 'receipt';
  const pricing = !isDelivery;
  const showBalance = hasBalance(d.type);
  const showDueDate = pricing && !isReceipt;

  c.innerHTML = `
    <div class="card">
      <div class="form-section">
        <div class="form-section-title">Document Details</div>
        <div class="form-grid">
          <div class="form-group"><label>Document Number</label><input id="f-number" value="${escapeHtml(d.number)}"/></div>
          <div class="form-group"><label>Issue Date</label><input type="date" id="f-issueDate" value="${d.issueDate}"/></div>
          ${showDueDate ? `<div class="form-group"><label>Due / Valid Date</label><input type="date" id="f-dueDate" value="${d.dueDate}"/></div>` : ''}
          ${isReceipt ? `<div class="form-group"><label>Payment Method</label><select id="f-paymentMethod">
            ${['Cash','Card','Bank Transfer','Cheque','Mobile Money','Other'].map(m => `<option ${d.paymentMethod===m?'selected':''}>${m}</option>`).join('')}
          </select></div>` : ''}
          <div class="form-group"><label>Template</label><select id="f-template">
            ${['', ...TEMPLATES.map(t=>t.key)].map(t => `<option value="${t}" ${d.template===t?'selected':''}>${t===''?'Default (settings)': (TEMPLATES.find(x=>x.key===t)?.label || t)}</option>`).join('')}
          </select></div>
          <div class="form-group"><label>Currency</label><select id="f-currency" onchange="onDocCurrencyChange(this.value)">
            ${currencyOptionsHtml(d.currency || state.settings.currency || 'MYR')}
          </select></div>
          <div class="form-group full"><label><input type="checkbox" id="f-recur" ${d._recur?'checked':''} onchange="document.getElementById('f-recur-freq').disabled=!this.checked"/> Make this a recurring document</label>
            <select id="f-recur-freq" ${d._recur?'':'disabled'} style="margin-top:6px;">
              <option value="weekly">Weekly</option>
              <option value="monthly" selected>Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">From (Company)</div>
        <div class="form-grid">
          <div class="form-group"><label>Company Name</label><input id="f-from-name" value="${escapeHtml(d.from.name)}"/></div>
          <div class="form-group"><label>Email</label><input id="f-from-email" value="${escapeHtml(d.from.email)}"/></div>
          <div class="form-group"><label>Phone</label><input id="f-from-phone" value="${escapeHtml(d.from.phone)}"/></div>
          <div class="form-group"><label>Tax ID</label><input id="f-from-taxId" value="${escapeHtml(d.from.taxId)}"/></div>
          <div class="form-group full"><label>Address</label><textarea id="f-from-address">${escapeHtml(d.from.address)}</textarea></div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">To (Client)</div>
        <div class="form-grid">
          <div class="form-group full"><label>Pick saved customer</label><select id="f-customer-pick" onchange="applyCustomerPick(this.value)"><option value="">— Select or type manually —</option>${state.customers.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${c.kind})</option>`).join('')}</select></div>
          <div class="form-group"><label>Client Name</label><input id="f-to-name" value="${escapeHtml(d.to.name)}"/></div>
          <div class="form-group"><label>Email</label><input id="f-to-email" value="${escapeHtml(d.to.email)}"/></div>
          <div class="form-group"><label>Phone</label><input id="f-to-phone" value="${escapeHtml(d.to.phone)}"/></div>
          <div class="form-group"><label>Tax ID</label><input id="f-to-taxId" value="${escapeHtml(d.to.taxId)}"/></div>
          <div class="form-group full"><label>Address</label><textarea id="f-to-address">${escapeHtml(d.to.address)}</textarea></div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">Line Items</div>
        <table class="items-table">
          <thead><tr>
            <th class="col-desc">Description</th>
            <th class="col-qty">Qty</th>
            ${!isDelivery ? `<th class="col-price">Unit Price</th><th class="col-tax">Tax %</th><th class="col-amount">Amount</th>` : `<th class="col-amount">Notes</th>`}
            <th class="col-action"></th>
          </tr></thead>
          <tbody id="items-body">
            ${d.items.map((it, i) => itemRowHtml(it, i, isDelivery)).join('')}
          </tbody>
        </table>
        <div style="margin-top:10px;">
          <button class="btn sm" onclick="addItem()">${icon('plus')} Add Item</button>
        </div>
      </div>

      ${!isDelivery ? `
      <div class="totals-box">
        <div class="totals-row"><span>Subtotal</span><span id="t-subtotal">${money(d.subtotal, d.currency)}</span></div>
        <div class="totals-row"><span>Tax Rate %</span><input type="number" id="f-taxRate" value="${d.taxRate}" min="0" step="0.01" oninput="recalc()"/></div>
        <div class="totals-row"><span>Tax Amount</span><span id="t-tax">${money(d.taxAmount, d.currency)}</span></div>
        <div class="totals-row total"><span>Total</span><span id="t-total">${money(d.total, d.currency)}</span></div>
        ${showBalance ? `
        <div class="totals-row"><span>Amount Paid</span><input type="number" id="f-amountPaid" value="${d.amountPaid}" min="0" step="0.01" oninput="recalc()"/></div>
        <div class="totals-row"><span>Balance Due</span><span id="t-balance">${money(d.balanceDue, d.currency)}</span></div>
        ` : ''}
        ${isReceipt ? `
        <div class="totals-row"><span>Amount Paid</span><input type="number" id="f-amountPaid" value="${d.total}" min="0" step="0.01" oninput="recalc()"/></div>
        ` : ''}
      </div>` : ''}

      ${isDelivery ? `
      <div class="form-section">
        <div class="form-section-title">Delivery Details</div>
        <div class="form-grid">
          <div class="form-group"><label>Delivered By</label><input id="f-deliveredBy" value="${escapeHtml(d.deliveredBy)}"/></div>
          <div class="form-group"><label>Received By</label><input id="f-receivedBy" value="${escapeHtml(d.receivedBy)}"/></div>
        </div>
      </div>` : ''}

      <div class="form-section">
        <div class="form-section-title">Notes & Terms</div>
        <div class="form-grid">
          <div class="form-group full"><label>Notes</label><textarea id="f-notes">${escapeHtml(d.notes)}</textarea></div>
          ${pricing && !isReceipt ? `<div class="form-group full"><label>Terms & Conditions</label><textarea id="f-terms">${escapeHtml(d.terms)}</textarea></div>` : ''}
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end;" class="no-print">
        <button class="btn ghost" onclick="navigate('list','${d.type}')">Cancel</button>
        <button class="btn" onclick="saveDraft()">${icon('save')} Save</button>
        <button class="btn primary" onclick="saveAndPreview()">${icon('eye')} Save & Preview</button>
      </div>
    </div>
  `;

  // wire item inputs
  attachItemListeners();
  recalc();
}

function itemRowHtml(it, i, isDelivery) {
  const cur = state.editingDoc ? state.editingDoc.currency : null;
  return `<tr data-idx="${i}" data-id="${it.id}">
    <td class="col-desc"><input class="item-desc" value="${escapeHtml(it.description)}" placeholder="Item description"/></td>
    <td class="col-qty"><input type="number" class="item-qty" value="${it.quantity}" min="0" step="0.01"/></td>
    ${!isDelivery ? `
      <td class="col-price"><input type="number" class="item-price" value="${it.unitPrice}" min="0" step="0.01"/></td>
      <td class="col-tax"><input type="number" class="item-tax" value="${it.taxRate}" min="0" step="0.01"/></td>
      <td class="col-amount amount item-amount">${money(it.amount, cur)}</td>
    ` : `<td class="col-amount"><input class="item-note" value="${escapeHtml(it.note||'')}" placeholder="notes"/></td>`}
    <td class="col-action"><button class="btn sm danger" onclick="removeItem(${i})">${icon('trash')}</button></td>
  </tr>`;
}

function onDocCurrencyChange(code) {
  const d = state.editingDoc;
  if (!d) return;
  gatherForm();
  d.currency = code;
  const sel = document.getElementById('f-currency');
  if (sel && sel.value !== code) sel.value = code;
  recalc();
  toast('Currency set to ' + code, 'success');
}

function attachItemListeners() {
  const tbody = document.getElementById('items-body');
  if (!tbody) return;
  tbody.querySelectorAll('tr').forEach((tr, i) => {
    const desc = tr.querySelector('.item-desc');
    const qty = tr.querySelector('.item-qty');
    const price = tr.querySelector('.item-price');
    const tax = tr.querySelector('.item-tax');
    const note = tr.querySelector('.item-note');
    const update = () => {
      const d = state.editingDoc;
      if (desc) d.items[i].description = desc.value;
      if (qty) d.items[i].quantity = parseFloat(qty.value) || 0;
      if (price) d.items[i].unitPrice = parseFloat(price.value) || 0;
      if (tax) d.items[i].taxRate = parseFloat(tax.value) || 0;
      if (note) d.items[i].note = note.value;
      recalc();
    };
    [desc, qty, price, tax, note].forEach(el => { if (el) el.addEventListener('input', update); });
  });
}

function addItem() {
  const d = state.editingDoc;
  d.items.push({ id: uid(), description: '', quantity: 1, unitPrice: 0, taxRate: d.taxRate, amount: 0, note: '' });
  renderEditor(document.getElementById('content'));
}

function removeItem(i) {
  const d = state.editingDoc;
  if (d.items.length <= 1) { toast('At least one item required', 'error'); return; }
  d.items.splice(i, 1);
  renderEditor(document.getElementById('content'));
}

function recalc() {
  const d = state.editingDoc;
  if (!d) return;
  const isDelivery = d.type === 'delivery';
  // read form values
  const taxRateInput = document.getElementById('f-taxRate');
  if (taxRateInput) d.taxRate = parseFloat(taxRateInput.value) || 0;
  const amountPaidInput = document.getElementById('f-amountPaid');
  if (amountPaidInput) d.amountPaid = parseFloat(amountPaidInput.value) || 0;

  let subtotal = 0;
  let taxAmount = 0;
  d.items.forEach((it, i) => {
    it.amount = (it.quantity || 0) * (it.unitPrice || 0);
    const itemTax = it.amount * ((it.taxRate || 0) / 100);
    subtotal += it.amount;
    taxAmount += itemTax;
  });
  // If global tax rate mode (use d.taxRate as overall) - we use per-item taxRate; but also support overall. Keep per-item.
  d.subtotal = subtotal;
  d.taxAmount = taxAmount;
  d.total = subtotal + taxAmount;
  if (d.type === 'receipt') {
    // amount paid defaults to total
    if (amountPaidInput && (amountPaidInput.value === '' || amountPaidInput.value === '0')) {
      // leave
    }
  }
  d.balanceDue = d.total - (d.amountPaid || 0);

  // update DOM
  const cur = d.currency || state.settings.currency;
  const ts = document.getElementById('t-subtotal'); if (ts) ts.textContent = money(subtotal, cur);
  const tt = document.getElementById('t-tax'); if (tt) tt.textContent = money(taxAmount, cur);
  const tot = document.getElementById('t-total'); if (tot) tot.textContent = money(d.total, cur);
  const bal = document.getElementById('t-balance'); if (bal) bal.textContent = money(d.balanceDue, cur);
  // update item amount cells
  document.querySelectorAll('#items-body tr').forEach((tr, i) => {
    const amt = tr.querySelector('.item-amount');
    if (amt) amt.textContent = money(d.items[i].amount, cur);
  });
}

function gatherForm() {
  const d = state.editingDoc;
  d.number = document.getElementById('f-number').value.trim() || d.number;
  d.issueDate = document.getElementById('f-issueDate').value;
  const due = document.getElementById('f-dueDate'); if (due) d.dueDate = due.value;
  const pm = document.getElementById('f-paymentMethod'); if (pm) d.paymentMethod = pm.value;
  const tpl = document.getElementById('f-template'); if (tpl) d.template = tpl.value;
  const cur = document.getElementById('f-currency'); if (cur) d.currency = cur.value;
  const rc = document.getElementById('f-recur'); if (rc) d._recur = rc.checked;
  const rcf = document.getElementById('f-recur-freq'); if (rcf) d._recurFreq = rcf.value;

  d.from.name = document.getElementById('f-from-name').value;
  d.from.email = document.getElementById('f-from-email').value;
  d.from.phone = document.getElementById('f-from-phone').value;
  d.from.taxId = document.getElementById('f-from-taxId').value;
  d.from.address = document.getElementById('f-from-address').value;

  d.to.name = document.getElementById('f-to-name').value;
  d.to.email = document.getElementById('f-to-email').value;
  d.to.phone = document.getElementById('f-to-phone').value;
  d.to.taxId = document.getElementById('f-to-taxId').value;
  d.to.address = document.getElementById('f-to-address').value;

  const notes = document.getElementById('f-notes'); if (notes) d.notes = notes.value;
  const terms = document.getElementById('f-terms'); if (terms) d.terms = terms.value;
  const db = document.getElementById('f-deliveredBy'); if (db) d.deliveredBy = db.value;
  const rb = document.getElementById('f-receivedBy'); if (rb) d.receivedBy = rb.value;

  recalc();
  d.updatedAt = new Date().toISOString();
  return d;
}

async function saveDoc() {
  const d = gatherForm();
  const recur = d._recur; const recurFreq = d._recurFreq;
  delete d._recur; delete d._recurFreq;
  const idx = state.docs.findIndex(x => x.id === d.id);
  if (idx >= 0) state.docs[idx] = d; else state.docs.push(d);
  if (USE_API) {
    try {
      const exists = await apiFetch('/api/docs/' + d.id).catch(() => null);
      if (exists) await apiFetch('/api/docs/' + d.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
      else await apiFetch('/api/docs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    } catch (e) { console.warn('save doc failed', e); toast('Save failed', 'error'); }
  } else {
    await saveState();
  }
  if (recur) {
    const r = { id: 'r_' + Math.random().toString(36).slice(2, 10), sourceDocId: d.id, frequency: recurFreq || 'monthly', nextRun: d.issueDate || new Date().toISOString().slice(0,10), active: true };
    await saveRecurring(r);
    toast('Recurring schedule created', 'success');
  }
  toast('Document saved', 'success');
  return d;
}

async function saveDraft() { await saveDoc(); }
async function saveAndPreview() {
  const d = await saveDoc();
  openPreview(d.id);
}

async function deleteDoc(id) {
  if (!confirm('Delete this document? This cannot be undone.')) return;
  state.docs = state.docs.filter(d => d.id !== id);
  if (USE_API) { try { await apiFetch('/api/docs/' + id, { method: 'DELETE' }); } catch (e) {} }
  else { await saveState(); }
  toast('Document deleted', 'success');
  render();
}

async function duplicateDoc(id) {
  const src = state.docs.find(d => d.id === id);
  if (!src) return;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = uid();
  copy.number = genNumber(copy.type);
  copy.createdAt = new Date().toISOString();
  copy.updatedAt = new Date().toISOString();
  state.docs.push(copy);
  if (USE_API) { try { await apiFetch('/api/docs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(copy) }); } catch (e) {} }
  else { await saveState(); }
  toast('Duplicated', 'success');
  render();
}

// ---------- Preview ----------
function renderPreview(c) {
  const d = state.previewDoc;
  if (!d) { c.innerHTML = ''; return; }
  const isDelivery = d.type === 'delivery';
  const isReceipt = d.type === 'receipt';
  const tpl = (d.template || state.settings.template || 'modern');
  c.innerHTML = `<div class="doc-preview tpl-${escapeHtml(tpl)}" id="print-area">
    ${docHtml(d)}
  </div>`;
}

function docHtml(d) {
  const s = state.settings;
  const cur = d.currency || s.currency || 'MYR';
  const isDelivery = d.type === 'delivery';
  const title = d.type === 'invoice' ? 'INVOICE' :
    d.type === 'receipt' ? 'SALES RECEIPT' :
    d.type === 'delivery' ? 'DELIVERY NOTE' :
    d.type === 'quotation' ? 'QUOTATION' :
    d.type === 'purchaseorder' ? 'PURCHASE ORDER' :
    d.type === 'creditnote' ? 'CREDIT NOTE' :
    d.type === 'proforma' ? 'PROFORMA INVOICE' : d.type.toUpperCase();
  return `
    <div class="doc-header">
      <div>
        ${s.logo ? `<span class="doc-logo${state.logoPlateNeedsBacking ? ' has-plate' : ''}"><img src="${s.logo}" alt="logo"/></span>` : ''}
        <div class="doc-brand">${escapeHtml(d.from.name || s.companyName)}</div>
        <div class="doc-brand-sub">${nl2br(d.from.address||'')}</div>
        <div class="doc-brand-sub">${escapeHtml(d.from.email)} ${d.from.phone ? '· ' + escapeHtml(d.from.phone) : ''}</div>
        ${d.from.taxId ? `<div class="doc-brand-sub">Tax ID: ${escapeHtml(d.from.taxId)}</div>` : ''}
      </div>
      <div>
        <div class="doc-title">${title}</div>
        <div class="doc-meta"><strong>${escapeHtml(d.number)}</strong></div>
        <div class="doc-meta">Date: ${fmtDate(d.issueDate)}</div>
        ${d.type === 'invoice' ? `<div class="doc-meta">Due: ${fmtDate(d.dueDate)}</div>` : ''}
        <div class="doc-meta">Currency: ${escapeHtml(cur)}</div>
        ${d.type === 'receipt' ? `<div class="doc-meta">Payment: ${escapeHtml(d.paymentMethod)}</div>` : ''}
      </div>
    </div>

    <div class="doc-parties">
      <div>
        <div class="doc-party-label">Bill To</div>
        <div class="doc-party-name">${escapeHtml(d.to.name || '-')}</div>
        <div class="doc-party-line">${nl2br(d.to.address||'')}</div>
        ${d.to.email ? `<div class="doc-party-line">${escapeHtml(d.to.email)}</div>` : ''}
        ${d.to.phone ? `<div class="doc-party-line">${escapeHtml(d.to.phone)}</div>` : ''}
        ${d.to.taxId ? `<div class="doc-party-line">Tax ID: ${escapeHtml(d.to.taxId)}</div>` : ''}
      </div>
      <div>
        <div class="doc-party-label">From</div>
        <div class="doc-party-name">${escapeHtml(d.from.name)}</div>
        <div class="doc-party-line">${nl2br(d.from.address||'')}</div>
      </div>
    </div>

    <table class="doc-table">
      <thead><tr>
        <th>#</th>
        <th>Description</th>
        <th class="right">Qty</th>
        ${!isDelivery ? `<th class="right">Unit Price</th><th class="right">Tax</th><th class="right">Amount</th>` : `<th>Notes</th>`}
      </tr></thead>
      <tbody>
        ${d.items.map((it, i) => `<tr>
          <td>${i+1}</td>
          <td>${escapeHtml(it.description)}</td>
          <td class="right">${it.quantity}</td>
          ${!isDelivery ? `<td class="right">${money(it.unitPrice, cur)}</td><td class="right">${it.taxRate}%</td><td class="right">${money(it.amount, cur)}</td>` : `<td>${escapeHtml(it.note||'')}</td>`}
        </tr>`).join('')}
      </tbody>
    </table>

    ${!isDelivery ? `
    <div class="doc-totals">
      <div class="doc-totals-row"><span>Subtotal</span><span>${money(d.subtotal, cur)}</span></div>
      <div class="doc-totals-row"><span>Tax</span><span>${money(d.taxAmount, cur)}</span></div>
      <div class="doc-totals-row total"><span>Total</span><span>${money(d.total, cur)}</span></div>
      ${hasBalance(d.type) ? `
        <div class="doc-totals-row"><span>Amount Paid</span><span>${money(d.amountPaid, cur)}</span></div>
        <div class="doc-totals-row"><span>Balance Due</span><span>${money(d.balanceDue, cur)}</span></div>
      ` : ''}
    </div>` : ''}

    ${d.notes ? `<div class="doc-notes"><h4>Notes</h4><p>${nl2br(d.notes)}</p></div>` : ''}
    ${d.terms ? `<div class="doc-notes"><h4>Terms & Conditions</h4><p>${nl2br(d.terms)}</p></div>` : ''}

    ${isDelivery ? `
    <div class="doc-sig">
      <div><div class="doc-sig-line">Delivered By: ${escapeHtml(d.deliveredBy)}</div></div>
      <div><div class="doc-sig-line">Received By: ${escapeHtml(d.receivedBy)}</div></div>
    </div>` : ''}

    <div style="margin-top:18px;padding:10px;border:1px dashed #ccc;border-radius:6px;font-size:11px;color:#555;text-align:center;">
      Retrieve this document anytime: <strong>https://pintar.prostudio.my/?doc=${escapeHtml(d.number)}</strong>
    </div>
    ${s.footer ? `<div style="margin-top:12px;font-size:10px;color:#999;text-align:center;">${escapeHtml(s.footer)}</div>` : ''}
  `;
}

// Print only the saved document — never the retrieval/app UI around it.
// The document is rendered into an isolated iframe, so what gets printed is
// exactly the document content (vector text, selectable), not a screenshot.
function printDocument(d) {
  if (!d) return;
  const tpl = d.template || state.settings.template || 'modern';
  const cssLink = document.querySelector('link[href*="style.css"]');
  const cssHref = cssLink ? cssLink.href : new URL('css/style.css', location.href).href;
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>${escapeHtml(d.number || 'Document')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="${cssHref}"/>
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .doc-preview {
    box-shadow: none !important; border-radius: 0 !important;
    max-width: 100% !important; min-height: 0 !important;
    padding: 40px !important; margin: 0 !important;
  }
  .doc-logo.has-plate { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body, .doc-preview, .doc-preview * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
</style></head>
<body><div class="doc-preview tpl-${escapeHtml(tpl)}">${docHtml(d)}</div></body></html>`;

  const old = document.getElementById('doc-print-frame');
  if (old) old.remove();
  const frame = document.createElement('iframe');
  frame.id = 'doc-print-frame';
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;background:#fff;';
  frame.onload = () => {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    const images = Array.from(doc.images);
    Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = img.onerror = res; })))
      .then(() => new Promise(res => setTimeout(res, 300)))
      .then(() => {
        try { win.focus(); win.print(); }
        catch (e) { window.print(); }
      });
    setTimeout(() => { try { frame.remove(); } catch (e) {} }, 60000);
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
}

// Public page: re-fetch the saved document from the server, then print just it.
async function printPublicDoc() {
  const ref = (document.getElementById('pub-ref')?.value || state.publicDocRef || '').trim();
  if (!ref) return;
  try {
    const d = await fetch(API_BASE + '/api/public/docs/' + encodeURIComponent(ref), { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); });
    if (d._settings) {
      state.settings = mergeSettings({ ...state.settings, ...d._settings });
      delete d._settings;
      await refreshLogoPlate();
    }
    printDocument(d);
  } catch (e) {
    toast('Could not load this document for printing', 'error');
  }
}

// ---------- Settings ----------
function renderSettings(c) {
  const s = state.settings;
  c.innerHTML = `
    <div class="card">
      <div class="form-section-title">Company Logo</div>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:18px;">
        <div id="logo-preview" style="width:200px;height:80px;display:grid;place-items:center;background:var(--bg-3);border:1px dashed var(--border);border-radius:6px;overflow:hidden;">
          ${s.logo ? `<img src="${s.logo}" alt="logo" style="max-width:100%;max-height:100%;"/>` : '<span style="color:var(--text-dim);font-size:12px;">No logo uploaded</span>'}
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <input type="file" accept="image/*" onchange="handleLogoUpload(event)" />
          <button class="btn sm danger" onclick="removeLogo();render()">Remove Logo</button>
          <span style="font-size:11px;color:var(--text-dim);">PNG/JPG, max 2MB. Resized automatically.</span>
        </div>
      </div>

      <div class="form-section-title">Company Profile</div>
      <div class="settings-grid">
        <div class="form-group"><label>Company Name</label><input id="s-companyName" value="${escapeHtml(s.companyName)}"/></div>
        <div class="form-group"><label>Email</label><input id="s-companyEmail" value="${escapeHtml(s.companyEmail)}"/></div>
        <div class="form-group"><label>Phone</label><input id="s-companyPhone" value="${escapeHtml(s.companyPhone)}"/></div>
        <div class="form-group"><label>Tax ID</label><input id="s-companyTaxId" value="${escapeHtml(s.companyTaxId)}"/></div>
        <div class="form-group full"><label>Address</label><textarea id="s-companyAddress">${escapeHtml(s.companyAddress)}</textarea></div>
      </div>

      <div class="form-section-title" style="margin-top:18px;">Preferences</div>
      <div class="settings-grid">
        <div class="form-group"><label>Default Currency</label><select id="s-currency" onchange="onDefaultCurrencyChange(this.value)">
          ${currencyOptionsHtml(s.currency || 'MYR')}
        </select></div>
        <div class="form-group"><label>Currency Symbol</label><input id="s-currencySymbol" value="${escapeHtml(s.currencySymbol)}"/></div>
        <div class="form-group"><label>Default Tax Rate %</label><input type="number" id="s-taxRate" value="${s.taxRate}" step="0.01"/></div>
        <div class="form-group"><label>Document Template</label><select id="s-template">
          ${TEMPLATES.map(t => `<option value="${t.key}" ${s.template===t.key?'selected':''}>${t.label}</option>`).join('')}
        </select></div>
        <div class="form-group"><label>Invoice Prefix</label><input id="s-pref-inv" value="${escapeHtml(s.docPrefix.invoice)}"/></div>
        <div class="form-group"><label>Receipt Prefix</label><input id="s-pref-rcpt" value="${escapeHtml(s.docPrefix.receipt)}"/></div>
        <div class="form-group"><label>Delivery Note Prefix</label><input id="s-pref-dn" value="${escapeHtml(s.docPrefix.delivery)}"/></div>
        <div class="form-group full"><label>Default Terms</label><textarea id="s-terms">${escapeHtml(s.terms)}</textarea></div>
      </div>

      <div class="form-section-title" style="margin-top:18px;">User Management</div>
      <div id="users-list">${(state.users||[]).length ? '' : '<p style="font-size:12px;color:var(--text-muted);">Loading...</p>'}</div>
      <div style="margin-top:10px;display:flex;gap:8px;">
        <button class="btn sm" onclick="openUserEditor(null)">${icon('plus')} Add User</button>
      </div>

      <div class="form-section-title" style="margin-top:18px;">Data Management</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn" onclick="exportData()">${icon('download')} Export Data (JSON)</button>
        <button class="btn" onclick="document.getElementById('importFile').click()">${icon('upload')} Import Data (JSON)</button>
        <input type="file" id="importFile" accept="application/json" style="display:none" onchange="importData(event)"/>
        <button class="btn danger" onclick="clearAllData()">${icon('trash')} Clear All Data</button>
      </div>
    </div>
  `;
}

function renderUsersList() {
  const el = document.getElementById('users-list');
  if (!el) return;
  const users = state.users || [];
  if (!users.length) {
    // try loading
    if (USE_API) {
      apiFetch('/api/users').then(u => { state.users = u || []; renderUsersList(); }).catch(()=>{});
      el.innerHTML = '<p style="font-size:12px;color:var(--text-muted);">Loading...</p>';
      return;
    }
    el.innerHTML = '<p style="font-size:12px;color:var(--text-muted);">No users. Default admin: username "admin".</p>';
    return;
  }
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Username</th><th>Name</th><th>Role</th><th></th></tr></thead><tbody>
    ${users.map(u => `<tr>
      <td><strong>${escapeHtml(u.username)}</strong></td>
      <td>${escapeHtml(u.name||'-')}</td>
      <td><span class="badge ${u.role==='admin'?'invoice':'receipt'}">${u.role}</span></td>
      <td><div class="actions-cell">
        <button class="btn sm ghost" onclick="openUserEditor('${u.id}')" title="Edit">${icon('edit')}</button>
        <button class="btn sm danger" onclick="deleteUser('${u.id}')" title="Delete">${icon('trash')}</button>
      </div></td>
    </tr>`).join('')}
  </tbody></table></div>`;
}
async function openUserEditor(id) {
  const u = id ? (state.users||[]).find(x=>x.id===id) : null;
  const user = u ? { ...u } : { id: null, username: '', name: '', role: 'staff', password: '' };
  const existing = document.getElementById('user-modal-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'user-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);padding:20px;max-width:420px;width:95%;box-shadow:var(--shadow);';
  modal.innerHTML = `
    <h3 style="margin-bottom:12px;">${id?'Edit':'New'} User</h3>
    <div class="form-grid">
      <div class="form-group"><label>Username</label><input id="um-username" value="${escapeHtml(user.username)}" ${id?'readonly':''}/></div>
      <div class="form-group"><label>Role</label><select id="um-role"><option value="staff" ${user.role==='staff'?'selected':''}>Staff (no settings/customers)</option><option value="admin" ${user.role==='admin'?'selected':''}>Admin (full access)</option></select></div>
      <div class="form-group full"><label>Name</label><input id="um-name" value="${escapeHtml(user.name||'')}"/></div>
      <div class="form-group full"><label>Password ${id?'(leave blank to keep)':''}</label><input type="password" id="um-password" placeholder="${id?'unchanged':'required'}"/></div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
      <button class="btn ghost" id="um-cancel">Cancel</button>
      <button class="btn primary" id="um-save">Save</button>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  document.getElementById('um-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('um-save').addEventListener('click', async () => {
    const username = document.getElementById('um-username').value.trim();
    const role = document.getElementById('um-role').value;
    const name = document.getElementById('um-name').value.trim();
    const password = document.getElementById('um-password').value;
    if (!username) { toast('Username required', 'error'); return; }
    if (!id && !password) { toast('Password required', 'error'); return; }
    const payload = { username, role, name };
    if (password) payload.password = password;
    if (id) payload.id = id;
    try {
      const saved = await apiFetch(id ? '/api/users/' + id : '/api/users', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!state.users) state.users = [];
      const idx = state.users.findIndex(x => x.id === saved.id);
      if (idx >= 0) state.users[idx] = saved; else state.users.push(saved);
      overlay.remove();
      toast('User saved', 'success');
      renderUsersList();
    } catch (e) { toast('Failed: ' + e.message, 'error'); }
  });
}
async function deleteUser(id) {
  if (!confirm('Delete this user?')) return;
  try {
    await apiFetch('/api/users/' + id, { method: 'DELETE' });
    state.users = (state.users || []).filter(u => u.id !== id);
    toast('User deleted', 'success');
    renderUsersList();
  } catch (e) { toast('Failed: ' + e.message, 'error'); }
}
function onDefaultCurrencyChange(code) {
  const el = document.getElementById('s-currencySymbol');
  if (!el) return;
  el.value = (CURRENCY_SYMBOLS[code] || code) + ' ';
}

async function saveSettingsFromForm() {
  const s = state.settings;
  s.companyName = document.getElementById('s-companyName').value;
  s.companyEmail = document.getElementById('s-companyEmail').value;
  s.companyPhone = document.getElementById('s-companyPhone').value;
  s.companyTaxId = document.getElementById('s-companyTaxId').value;
  s.companyAddress = document.getElementById('s-companyAddress').value;
  const curSel = document.getElementById('s-currency');
  if (curSel) s.currency = curSel.value;
  s.currencySymbol = document.getElementById('s-currencySymbol').value;
  s.taxRate = parseFloat(document.getElementById('s-taxRate').value) || 0;
  s.template = document.getElementById('s-template').value;
  s.docPrefix.invoice = document.getElementById('s-pref-inv').value;
  s.docPrefix.receipt = document.getElementById('s-pref-rcpt').value;
  s.docPrefix.delivery = document.getElementById('s-pref-dn').value;
  s.terms = document.getElementById('s-terms').value;
  await saveSettings();
  toast('Settings saved', 'success');
}

function exportData() {
  const blob = new Blob([JSON.stringify({ docs: state.docs, settings: state.settings }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'smartdocs-backup.json'; a.click();
  URL.revokeObjectURL(url);
}
function importData(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (parsed.docs) {
        state.docs = parsed.docs;
        if (USE_API) {
          // replace all: delete existing then save
          const existing = await apiFetch('/api/docs');
          for (const d of existing) await apiFetch('/api/docs/' + d.id, { method: 'DELETE' });
          for (const d of state.docs) await apiFetch('/api/docs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
        } else {
          await saveState();
        }
      }
      if (parsed.settings) {
        state.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
        await saveSettings();
      }
      toast('Data imported', 'success');
      render();
    } catch (err) { toast('Invalid file', 'error'); }
  };
  reader.readAsText(file);
}
async function clearAllData() {
  if (!confirm('This will delete ALL documents and reset settings. Continue?')) return;
  if (USE_API) {
    const existing = await apiFetch('/api/docs');
    for (const d of existing) await apiFetch('/api/docs/' + d.id, { method: 'DELETE' });
  }
  state.docs = [];
  state.settings = { ...DEFAULT_SETTINGS };
  await saveSettings();
  if (!USE_API) await saveState();
  toast('All data cleared', 'success');
  render();
}

// ---------- Logo upload ----------
// A light or transparent logo disappears on the white document paper.
// Detect that case so the document can put a dark plate behind it.
const logoPlateCache = {};
function detectLogoPlate(src) {
  return new Promise(resolve => {
    if (!src) return resolve(false);
    if (Object.prototype.hasOwnProperty.call(logoPlateCache, src)) return resolve(logoPlateCache[src]);
    const img = new Image();
    img.onload = () => {
      try {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let opaque = 0, transparent = 0, lum = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3] / 255;
          if (a < 0.15) { transparent++; continue; }
          opaque++;
          const r = data[i] * a + 255 * (1 - a);
          const g = data[i + 1] * a + 255 * (1 - a);
          const b = data[i + 2] * a + 255 * (1 - a);
          lum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        }
        const total = size * size;
        const avg = opaque ? lum / opaque : 1;
        const needs = (transparent / total) > 0.3 && avg > 0.5;
        logoPlateCache[src] = needs;
        resolve(needs);
      } catch (e) { resolve(false); }
    };
    img.onerror = () => resolve(false);
    img.src = src;
  });
}
async function refreshLogoPlate() {
  try { state.logoPlateNeedsBacking = await detectLogoPlate(state.settings.logo); }
  catch (e) { state.logoPlateNeedsBacking = false; }
}

function handleLogoUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('Please select an image', 'error'); return; }
  if (file.size > 2 * 1024 * 1024) { toast('Image too large (max 2MB)', 'error'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      // resize to max width 300, max height 120
      const maxW = 300, maxH = 120;
      let w = img.width, h = img.height;
      const scale = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * scale); h = Math.round(h * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      state.settings.logo = canvas.toDataURL('image/png');
      state.settings.logoRemoved = false;
      detectLogoPlate(state.settings.logo).then(v => { state.logoPlateNeedsBacking = v; }).catch(() => {});
      const preview = document.getElementById('logo-preview');
      if (preview) preview.innerHTML = `<img src="${state.settings.logo}" alt="logo" style="max-width:100%;max-height:100px;"/>`;
      toast('Logo loaded — click Save Settings to keep it', 'success');
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
function removeLogo() {
  state.settings.logo = '';
  state.settings.logoRemoved = true;
  state.logoPlateNeedsBacking = false;
  const preview = document.getElementById('logo-preview');
  if (preview) preview.innerHTML = '<span style="color:var(--text-dim);font-size:12px;">No logo uploaded</span>';
}

// ---------- Customer editor modal ----------
function openCustomerEditor(id) {
  const c = id ? (state.customers.find(x => x.id === id) || newCustomer()) : newCustomer();
  if (id) c.id = id;
  const existing = document.getElementById('cust-modal-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'cust-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);padding:20px;max-width:520px;width:95%;box-shadow:var(--shadow);max-height:90vh;overflow:auto;';
  modal.innerHTML = `
    <h3 style="margin-bottom:12px;">${id ? 'Edit' : 'New'} Customer</h3>
    <div class="form-grid">
      <div class="form-group"><label>Name</label><input id="cm-name" value="${escapeHtml(c.name)}"/></div>
      <div class="form-group"><label>Kind</label><select id="cm-kind"><option value="client" ${c.kind==='client'?'selected':''}>Client</option><option value="supplier" ${c.kind==='supplier'?'selected':''}>Supplier</option></select></div>
      <div class="form-group"><label>Email</label><input id="cm-email" value="${escapeHtml(c.email)}"/></div>
      <div class="form-group"><label>Phone</label><input id="cm-phone" value="${escapeHtml(c.phone)}"/></div>
      <div class="form-group"><label>Tax ID</label><input id="cm-taxId" value="${escapeHtml(c.taxId)}"/></div>
      <div class="form-group full"><label>Address</label><textarea id="cm-address">${escapeHtml(c.address)}</textarea></div>
      <div class="form-group full"><label>Notes</label><textarea id="cm-notes">${escapeHtml(c.notes)}</textarea></div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
      <button class="btn ghost" id="cm-cancel">Cancel</button>
      <button class="btn primary" id="cm-save">Save</button>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  document.getElementById('cm-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('cm-save').addEventListener('click', async () => {
    c.name = document.getElementById('cm-name').value.trim();
    if (!c.name) { toast('Name required', 'error'); return; }
    c.kind = document.getElementById('cm-kind').value;
    c.email = document.getElementById('cm-email').value;
    c.phone = document.getElementById('cm-phone').value;
    c.taxId = document.getElementById('cm-taxId').value;
    c.address = document.getElementById('cm-address').value;
    c.notes = document.getElementById('cm-notes').value;
    await saveCustomer(c);
    overlay.remove();
    toast('Customer saved', 'success');
    render();
  });
}

function renderCustomers(c) {
  const customers = state.customers.slice().sort((a,b) => (a.name||'').localeCompare(b.name||''));
  c.innerHTML = `
    <div class="filters">
      <div class="search-bar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input placeholder="Search customers..." value="${escapeHtml(state.custSearch||'')}" oninput="state.custSearch=this.value; render()"/></div>
    </div>
    ${customers.length === 0 ? `<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><h3>No customers yet</h3><p>Add your first client or supplier.</p></div>` :
    `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Kind</th><th>Email</th><th>Phone</th><th></th></tr></thead><tbody>
      ${customers.filter(x => !state.custSearch || (x.name+' '+x.email+' '+x.phone).toLowerCase().includes(state.custSearch.toLowerCase())).map(x => `
        <tr>
          <td><strong>${escapeHtml(x.name)}</strong></td>
          <td><span class="badge ${x.kind==='supplier'?'delivery':'invoice'}">${x.kind}</span></td>
          <td>${escapeHtml(x.email||'-')}</td>
          <td>${escapeHtml(x.phone||'-')}</td>
          <td><div class="actions-cell">
            <button class="btn sm ghost" onclick="openCustomerEditor('${x.id}')" title="Edit">${icon('edit')}</button>
            <button class="btn sm danger" onclick="deleteCustomer('${x.id}')" title="Delete">${icon('trash')}</button>
          </div></td>
        </tr>`).join('')}
    </tbody></table></div>`}
  `;
}

function applyCustomerPick(id) {
  if (!id) return;
  const c = state.customers.find(x => x.id === id);
  if (!c) return;
  document.getElementById('f-to-name').value = c.name || '';
  document.getElementById('f-to-email').value = c.email || '';
  document.getElementById('f-to-phone').value = c.phone || '';
  document.getElementById('f-to-taxId').value = c.taxId || '';
  document.getElementById('f-to-address').value = c.address || '';
  const d = state.editingDoc;
  d.to.name = c.name || ''; d.to.email = c.email || ''; d.to.phone = c.phone || ''; d.to.taxId = c.taxId || ''; d.to.address = c.address || '';
}

// ---------- Send email ----------
async function sendDocByEmail() {
  const d = state.previewDoc;
  if (!d) { toast('No document to send', 'error'); return; }
  // check smtp status
  let configured = true;
  if (USE_API) {
    try { const st = await apiFetch('/api/email/status'); configured = st.configured; } catch {}
  } else { configured = false; }
  const overlay = document.createElement('div');
  overlay.id = 'email-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);padding:20px;max-width:460px;width:95%;box-shadow:var(--shadow);';
  modal.innerHTML = `
    <h3 style="margin-bottom:12px;">Send by Email</h3>
    ${!configured ? '<p style="color:var(--warning);font-size:12px;margin-bottom:10px;">SMTP not configured on server. Set SMTP_HOST/PORT/USER/PASS/FROM env vars.</p>' : ''}
    <div class="form-group"><label>To</label><input id="em-to" value="${escapeHtml(d.to?.email || '')}"/></div>
    <div class="form-group"><label>Subject</label><input id="em-subject" value="${escapeHtml(typeLabel(d.type) + ' ' + d.number)}"/></div>
    <div class="form-group"><label>Message</label><textarea id="em-body">Please find attached ${typeLabel(d.type).toLowerCase()} ${escapeHtml(d.number)}.</textarea></div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
      <button class="btn ghost" id="em-cancel">Cancel</button>
      <button class="btn primary" id="em-send">Send</button>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  document.getElementById('em-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('em-send').addEventListener('click', async () => {
    const to = document.getElementById('em-to').value.trim();
    const subject = document.getElementById('em-subject').value.trim();
    const text = document.getElementById('em-body').value;
    if (!to) { toast('Recipient required', 'error'); return; }
    const btn = document.getElementById('em-send');
    btn.disabled = true; btn.textContent = 'Generating PDF...';
    try {
      // generate PDF
      const el = document.getElementById('print-area');
      const opt = { margin: 10, filename: d.number + '.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
      const pdfBlob = await html2pdf().set(opt).from(el).outputPdf('blob');
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(pdfBlob);
      });
      btn.textContent = 'Sending...';
      if (USE_API) {
        await apiFetch('/api/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, subject, text, attachmentBase64: base64, filename: d.number + '.pdf' }) });
        toast('Email sent', 'success');
      } else {
        toast('Email requires server (SMTP). PDF downloaded instead.', 'warning');
        // fallback download
        html2pdf().set(opt).from(el).save();
      }
      overlay.remove();
    } catch (e) {
      console.error(e);
      toast('Failed: ' + (e.message || e), 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Send';
    }
  });
}

function renderRecurring(c) {
  const list = state.recurring.slice().sort((a,b) => (a.nextRun||'').localeCompare(b.nextRun||''));
  c.innerHTML = `
    <div class="card">
      <div class="card-title">Recurring Schedules</div>
      <div class="card-sub">Server generates new documents automatically when due (hourly check).</div>
      ${list.length === 0 ? `<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 4 23 10 17 10"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/></svg><h3>No recurring schedules</h3><p>Open a document preview and click "Make Recurring".</p></div>` :
      `<div class="table-wrap"><table><thead><tr><th>Source</th><th>Type</th><th>Frequency</th><th>Next Run</th><th>Active</th><th></th></tr></thead><tbody>
        ${list.map(r => {
          const src = state.docs.find(d => d.id === r.sourceDocId);
          return `<tr>
            <td>${escapeHtml(src ? src.number : r.sourceDocId)}</td>
            <td>${src ? typeLabel(src.type) : '-'}</td>
            <td>${r.frequency}</td>
            <td>${fmtDate(r.nextRun)}</td>
            <td><span class="badge ${r.active?'paid':'unpaid'}">${r.active?'Active':'Paused'}</span></td>
            <td><div class="actions-cell">
              <button class="btn sm ghost" onclick="toggleRecurring('${r.id}', ${!r.active})">${r.active?'Pause':'Resume'}</button>
              <button class="btn sm danger" onclick="deleteRecurring('${r.id}')">${icon('trash')}</button>
            </div></td>
          </tr>`;
        }).join('')}
      </tbody></table></div>`}
    </div>
  `;
}
async function toggleRecurring(id, active) {
  const r = state.recurring.find(x => x.id === id);
  if (!r) return;
  r.active = active;
  await saveRecurring(r);
  render();
}

async function renderReports(c) {
  let summary = null;
  if (USE_API) {
    try { summary = await apiFetch('/api/reports/summary'); } catch {}
  }
  if (!summary) {
    // client-side fallback
    const docs = state.docs;
    const byType = {}, byMonth = {}, byClient = {};
    let revenue = 0, paid = 0;
    docs.forEach(d => {
      byType[d.type] = (byType[d.type] || 0) + 1;
      const m = (d.issueDate || '').slice(0, 7);
      if (m) { if (!byMonth[m]) byMonth[m] = { count: 0, revenue: 0 }; byMonth[m].count++; byMonth[m].revenue += (d.total || 0); }
      const client = d.to?.name || 'Unknown';
      if (!byClient[client]) byClient[client] = { count: 0, revenue: 0 };
      byClient[client].count++; byClient[client].revenue += (d.total || 0);
      if (d.type === 'invoice') { revenue += d.total || 0; paid += d.amountPaid || 0; }
    });
    summary = { totalDocs: docs.length, revenue, paid, outstanding: revenue - paid, byType, byMonth, byClient };
  }
  const monthRows = Object.keys(summary.byMonth).sort().map(m => `<tr><td>${m}</td><td>${summary.byMonth[m].count}</td><td>${money(summary.byMonth[m].revenue)}</td></tr>`).join('');
  const clientRows = Object.keys(summary.byClient).sort((a,b) => summary.byClient[b].revenue - summary.byClient[a].revenue).map(k => `<tr><td>${escapeHtml(k)}</td><td>${summary.byClient[k].count}</td><td>${money(summary.byClient[k].revenue)}</td></tr>`).join('');
  const typeRows = Object.keys(summary.byType).map(k => `<tr><td>${typeLabel(k)}</td><td>${summary.byType[k]}</td></tr>`).join('');
  c.innerHTML = `
    <div class="grid grid-4" style="margin-bottom:16px;">
      <div class="stat"><div class="stat-label">Total Documents</div><div class="stat-value">${summary.totalDocs}</div></div>
      <div class="stat"><div class="stat-label">Revenue</div><div class="stat-value">${money(summary.revenue)}</div></div>
      <div class="stat"><div class="stat-label">Collected</div><div class="stat-value" style="color:var(--success)">${money(summary.paid)}</div></div>
      <div class="stat"><div class="stat-label">Outstanding</div><div class="stat-value" style="color:var(--warning)">${money(summary.outstanding)}</div></div>
    </div>
    <div class="grid grid-3">
      <div class="card">
        <div class="card-title">By Document Type</div>
        <div class="table-wrap" style="margin-top:10px;"><table><thead><tr><th>Type</th><th>Count</th></tr></thead><tbody>${typeRows}</tbody></table></div>
      </div>
      <div class="card">
        <div class="card-title">Revenue by Month</div>
        <div class="table-wrap" style="margin-top:10px;"><table><thead><tr><th>Month</th><th>Docs</th><th>Revenue</th></tr></thead><tbody>${monthRows || '<tr><td colspan="3">No data</td></tr>'}</tbody></table></div>
      </div>
      <div class="card">
        <div class="card-title">Top Clients</div>
        <div class="table-wrap" style="margin-top:10px;"><table><thead><tr><th>Client</th><th>Docs</th><th>Revenue</th></tr></thead><tbody>${clientRows || '<tr><td colspan="3">No data</td></tr>'}</tbody></table></div>
      </div>
    </div>
    <div style="margin-top:14px;">
      <button class="btn" onclick="exportReportCSV()">${icon('download')} Export Report (CSV)</button>
    </div>
  `;
}
function exportReportCSV() {
  const rows = [['Type','Number','Client','Date','Total']];
  state.docs.forEach(d => rows.push([d.type, d.number, d.to?.name||'', d.issueDate, d.total||0]));
  const csv = rows.map(r => r.map(x => '"' + String(x).replace(/"/g,'""') + '"').join(',')).join('\\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'report.csv'; a.click();
  URL.revokeObjectURL(url);
}

function renderCurrency(c) {
  c.innerHTML = `
    <div class="card" style="max-width:620px;">
      <div class="card-title">Live Currency Converter</div>
      <div class="card-sub" id="cc-sub">Fetching live exchange rates…</div>
      <div class="settings-grid">
        <div class="form-group">
          <label>Amount</label>
          <input type="number" id="cc-amount" value="1" step="0.01" min="0" inputmode="decimal"/>
        </div>
        <div class="form-group">
          <label>Rate source</label>
          <select id="cc-source">
            <option value="bnm">Bank Negara Malaysia (official)</option>
            <option value="market">Open market (160+ currencies)</option>
          </select>
        </div>
        <div class="form-group">
          <label>From</label>
          <select id="cc-from"></select>
        </div>
        <div class="form-group">
          <label>To</label>
          <select id="cc-to"></select>
        </div>
        <div class="form-group full" style="grid-column:1 / -1;">
          <label>Result</label>
          <input id="cc-result" readonly placeholder="—" style="font-weight:600;font-size:18px;"/>
        </div>
      </div>
      <div style="margin-top:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button class="btn primary" onclick="convertCurrencyLive()">${icon('refresh')} Convert</button>
        <button class="btn" onclick="swapCurrency()" title="Swap currencies">${icon('swap')} Swap</button>
        <span id="cc-rate" style="font-size:12px;color:var(--text-muted);"></span>
      </div>
      <p style="font-size:11px;color:var(--text-dim);margin-top:12px;">Rates refresh hourly. “Bank Negara Malaysia” uses the official central-bank middle rate; “Open market” uses live mid-market rates for 160+ currencies.</p>
    </div>
  `;
  populateCurrencySelects();
  const sourceSel = document.getElementById('cc-source');
  const savedSource = localStorage.getItem('cc_source');
  if (savedSource === 'market' || savedSource === 'bnm') sourceSel.value = savedSource;
  const amountEl = document.getElementById('cc-amount');
  let t;
  amountEl.addEventListener('input', () => { clearTimeout(t); t = setTimeout(convertCurrencyLive, 450); });
  document.getElementById('cc-from').addEventListener('change', () => convertCurrencyLive());
  document.getElementById('cc-to').addEventListener('change', () => convertCurrencyLive());
  sourceSel.addEventListener('change', () => convertCurrencyLive());
  amountEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') convertCurrencyLive(); });
  setTimeout(convertCurrencyLive, 60);
}

const CURRENCY_FALLBACK = ['AED','AUD','BDT','BHD','BND','BRL','CAD','CHF','CNY','DKK','EGP','EUR','GBP','HKD','IDR','INR','JPY','KES','KHR','KRW','KWD','LAK','LKR','MMK','MOP','MVR','MXN','MYR','NGN','NOK','NPR','NZD','OMR','PHP','PKR','QAR','RUB','SAR','SEK','SGD','THB','TRY','TWD','TZS','USD','VND','ZAR'];

function currencyName(code) {
  try {
    const parts = new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay: 'name' }).formatToParts(1);
    let n = (parts.find(p => p.type === 'currency') || {}).value || '';
    n = n.replace(/^./, ch => ch.toUpperCase());
    if (/[a-z]s$/.test(n) && !/ss$/.test(n)) n = n.slice(0, -1);
    return n || code;
  } catch { return code; }
}

function currencyLabel(code) { return `${code} — ${currencyName(code)}`; }

let currencyCodesCache = null;

async function populateCurrencySelects(codes) {
  const fromEl = document.getElementById('cc-from');
  const toEl = document.getElementById('cc-to');
  if (!fromEl || !toEl) return;
  const prevFrom = fromEl.value || localStorage.getItem('cc_from') || 'USD';
  const prevTo = toEl.value || localStorage.getItem('cc_to') || (state.settings && state.settings.currency) || 'MYR';
  const list = (codes && codes.length ? codes : (currencyCodesCache || CURRENCY_FALLBACK)).slice().sort();

  const opts = list.map(code => `<option value="${code}">${escapeHtml(currencyLabel(code))}</option>`).join('');
  fromEl.innerHTML = opts;
  toEl.innerHTML = opts;
  fromEl.value = list.includes(prevFrom) ? prevFrom : 'USD';
  toEl.value = list.includes(prevTo) ? prevTo : 'MYR';

  if (codes && codes.length) {
    currencyCodesCache = list;
    return;
  }
  // Try to load the full live currency list, then refresh the dropdowns
  try {
    let data;
    if (USE_API) data = await apiFetch('/api/fx/currencies');
    else {
      const r = await fetch('https://open.er-api.com/v6/latest/USD');
      const j = await r.json();
      data = { currencies: Object.keys(j.rates || {}) };
    }
    if (data && data.currencies && data.currencies.length > list.length) {
      const f = fromEl.value, t2 = toEl.value;
      populateCurrencySelects(data.currencies).then(() => {
        const fe = document.getElementById('cc-from'), te = document.getElementById('cc-to');
        if (fe) fe.value = f;
        if (te) te.value = t2;
      });
    }
  } catch { /* fallback list is already shown */ }
}

function swapCurrency() {
  const fromEl = document.getElementById('cc-from');
  const toEl = document.getElementById('cc-to');
  if (!fromEl || !toEl) return;
  const a = fromEl.value; fromEl.value = toEl.value; toEl.value = a;
  convertCurrencyLive();
}

// ---------- Type picker modal ----------
function openTypePicker() {
  const existing = document.getElementById('type-picker-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'type-picker-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);padding:20px;max-width:420px;width:90%;box-shadow:var(--shadow);';
  modal.innerHTML = `<h3 style="margin-bottom:12px;">New Document</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">` +
    DOC_TYPES.map(t => `<button class="btn" style="justify-content:center;" data-type="${t.key}">${t.label}</button>`).join('') +
    `</div><div style="margin-top:14px;text-align:right;"><button class="btn ghost" id="tp-cancel">Cancel</button></div>`;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  modal.querySelectorAll('button[data-type]').forEach(b => {
    b.addEventListener('click', () => { overlay.remove(); openEditor(null, b.dataset.type); });
  });
  document.getElementById('tp-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}
async function convertCurrencyLive() {
  const amountEl = document.getElementById('cc-amount');
  const fromEl = document.getElementById('cc-from');
  const toEl = document.getElementById('cc-to');
  const resultEl = document.getElementById('cc-result');
  const rateEl = document.getElementById('cc-rate');
  const subEl = document.getElementById('cc-sub');
  if (!amountEl || !fromEl || !toEl || !resultEl) return;

  const amount = parseFloat(amountEl.value);
  const from = fromEl.value;
  const to = toEl.value;
  const sourceSel = document.getElementById('cc-source');
  const source = sourceSel ? sourceSel.value : 'bnm';
  localStorage.setItem('cc_from', from);
  localStorage.setItem('cc_to', to);
  if (sourceSel) localStorage.setItem('cc_source', source);

  if (!isFinite(amount)) { resultEl.value = ''; rateEl.textContent = 'Enter an amount'; return; }
  if (!from || !to) return;

  const fmt = (n) => new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n);

  if (from === to) {
    resultEl.value = fmt(amount);
    rateEl.textContent = `1 ${from} = 1 ${to}`;
    return;
  }

  resultEl.value = '…';
  rateEl.textContent = 'Fetching live rate…';
  try {
    let data;
    if (USE_API) data = await apiFetch(`/api/fx?from=${from}&to=${to}&amount=${amount}&source=${encodeURIComponent(source)}`);
    else {
      const r = await fetch(`https://open.er-api.com/v6/latest/${from}`);
      const j = await r.json();
      if (!j || !j.rates || !j.rates[to]) throw new Error('Rate unavailable');
      data = { rate: j.rates[to], converted: amount * j.rates[to], date: (j.time_last_update_utc || '').slice(5, 16), source: 'open.er-api.com' };
    }
    resultEl.value = fmt(data.converted);
    const digits = data.rate >= 1 ? 4 : 6;
    rateEl.textContent = `1 ${from} = ${Number(data.rate).toFixed(digits).replace(/0+$/, '').replace(/\.$/, '')} ${to} · ${data.source || 'live'} · ${data.date || ''}`;
    if (subEl) subEl.textContent = `Live rate as of ${data.date || 'today'} — ${data.source || 'live FX feed'}. Rates are indicative; your bank may differ.`;
  } catch (e) {
    resultEl.value = '—';
    rateEl.textContent = 'Could not load rate: ' + e.message;
    if (subEl) subEl.textContent = 'Live rates could not be fetched. Please try again shortly.';
  }
}

// ---------- Toast ----------
function toast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + (type || '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ---------- Icons ----------
function icon(name) {
  const icons = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 0-2-2V5a2 2 0 0 0 2-2h11l5 5v11a2 2 0 0 0-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
    printer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    'arrow-left': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  };
  return icons[name] || '';
}

// ---------- Login screen ----------
function showLoginScreen() {
  const existing = document.getElementById('login-overlay');
  if (existing) return;
  const overlay = document.createElement('div');
  overlay.id = 'login-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:300;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);padding:30px;max-width:360px;width:90%;box-shadow:var(--shadow);">
      <div style="text-align:center;margin-bottom:18px;">
        <img src="img/icon-64.png" style="width:48px;height:48px;border-radius:10px;margin-bottom:8px;"/>
        <h2 style="font-size:18px;">Studio Pro Documents</h2>
        <p style="font-size:12px;color:var(--text-muted);">Please log in.</p>
      </div>
      <div class="form-group"><label>Username</label><input id="login-user" placeholder="username" autocomplete="username"/></div>
      <div class="form-group"><label>Password</label><input type="password" id="login-pw" placeholder="password" autocomplete="current-password"/></div>
      <div id="login-err" style="color:var(--danger);font-size:12px;margin-top:6px;display:none;">Invalid credentials</div>
      <div style="margin-top:14px;"><button class="btn primary" style="width:100%;" id="login-btn">Log in</button></div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('login-btn').addEventListener('click', doLogin);
  document.getElementById('login-pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
}
async function doLogin() {
  const username = document.getElementById('login-user').value.trim();
  const pw = document.getElementById('login-pw').value;
  try {
    const res = await apiFetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: pw }) });
    if (res.token) { setAuthToken(res.token); setAuthRole(res.role || 'staff', res.username); }
    document.getElementById('login-overlay')?.remove();
    await loadData();
    applyRoleVisibility();
    prefetchCurrencies();
    navigate('dashboard');
    updateLogoutVisibility();
  } catch (e) {
    const err = document.getElementById('login-err');
    if (err) err.style.display = 'block';
  }
}

// ---------- Logout ----------
async function doLogout() {
  try { await apiFetch('/api/logout', { method: 'POST' }); } catch (e) {}
  clearAuthToken();
  // Force a fresh load so the app falls back to the login screen.
  location.reload();
}

// ---------- Public document lookup ----------
async function renderPublicLookup(c) {
  const ref = state.publicDocRef;
  c.innerHTML = `<div style="max-width:820px;margin:0 auto;">
    <div class="card no-print" style="margin-bottom:16px;">
      <div class="card-title">Document Retrieval</div>
      <div class="card-sub">Enter a document number to retrieve and download.</div>
      <div style="display:flex;gap:8px;">
        <input id="pub-ref" value="${escapeHtml(ref||'')}" placeholder="e.g. INV-1001" style="flex:1;"/>
        <button class="btn primary" onclick="fetchPublicDoc()">Retrieve</button>
      </div>
      <div id="pub-status" style="margin-top:8px;font-size:12px;color:var(--text-muted);"></div>
    </div>
    <div id="pub-preview"></div>
  </div>`;
  if (ref) await fetchPublicDoc();
}
async function fetchPublicDoc() {
  const ref = (document.getElementById('pub-ref')?.value || state.publicDocRef || '').trim();
  if (!ref) return;
  const status = document.getElementById('pub-status');
  const preview = document.getElementById('pub-preview');
  if (status) status.textContent = 'Loading...';
  try {
    const d = await fetch(API_BASE + '/api/public/docs/' + encodeURIComponent(ref)).then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); });
    if (d._settings) {
      state.settings = mergeSettings({ ...state.settings, ...d._settings });
      delete d._settings;
      await refreshLogoPlate();
    }
    state.previewDoc = d;
    if (preview) preview.innerHTML = `<div class="doc-preview tpl-${escapeHtml(d.template||'modern')}" id="print-area">${docHtml(d)}</div>
      <div class="no-print" style="margin-top:14px;text-align:center;">
        <button class="btn primary" onclick="printPublicDoc()">${icon('printer')} Print / Save PDF</button>
      </div>`;
    if (status) status.textContent = 'Document found: ' + d.number;
  } catch (e) {
    if (preview) preview.innerHTML = '';
    if (status) status.textContent = 'Document not found.';
  }
}

function applyRoleVisibility() {
  const admin = isAdmin();
  document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(el => {
    const v = el.dataset.view;
    if (['settings','customers','recurring','reports'].includes(v)) {
      el.style.display = admin ? '' : 'none';
    }
  });
}

// Load the full live currency list once so every dropdown has all currencies
async function prefetchCurrencies() {
  if (currencyCodesCache) return;
  try {
    let codes;
    if (USE_API) { const d = await apiFetch('/api/fx/currencies'); codes = d && d.currencies; }
    else {
      const r = await fetch('https://open.er-api.com/v6/latest/USD');
      const j = await r.json();
      codes = Object.keys((j && j.rates) || {});
    }
    if (codes && codes.length) {
      currencyCodesCache = codes.slice().sort();
      ['cc-from','cc-to','f-currency','s-currency'].forEach(elId => {
        const el = document.getElementById(elId);
        if (el) { const v = el.value; el.innerHTML = currencyOptionsHtml(v); el.value = v; }
      });
    }
  } catch (e) { /* keep the built-in fallback list */ }
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  if (state.publicMode) {
    // hide sidebar/nav for public view
    document.querySelector('.sidebar')?.style && (document.querySelector('.sidebar').style.display = 'none');
    document.getElementById('mobile-nav')?.style && (document.getElementById('mobile-nav').style.display = 'none');
    render();
    return;
  }
  // nav click (desktop + mobile)
  document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.action === 'new') { openTypePicker(); return; }
      if (el.dataset.action === 'logout') { doLogout(); return; }
      const view = el.dataset.view;
      const type = el.dataset.type;
      if (view === 'list') { state.filter = 'all'; state.search = ''; }
      navigate(view, type || undefined);
      // sync active state on mobile nav
      document.querySelectorAll('.mobile-nav-item').forEach(m => m.classList.remove('active'));
      const activeMobile = document.querySelector(`.mobile-nav-item[data-view="${view}"][data-type="${type || ''}"]`) ||
                           document.querySelector(`.mobile-nav-item[data-view="${view}"]`);
      if (activeMobile) activeMobile.classList.add('active');
    });
  });
  // initial mobile active
  const initMobile = document.querySelector('.mobile-nav-item[data-view="dashboard"]');
  if (initMobile) initMobile.classList.add('active');
  applyRoleVisibility();
  prefetchCurrencies();
  navigate('dashboard');
  updateLogoutVisibility();
});

// Show the Log out buttons only when the user is actually signed in.
function updateLogoutVisibility() {
  const show = state.authRequired && !state.publicMode;
  const side = document.getElementById('sidebar-logout');
  const mob = document.getElementById('mobile-logout');
  if (side) side.style.display = show ? '' : 'none';
  if (mob) mob.style.display = show ? '' : 'none';
}
