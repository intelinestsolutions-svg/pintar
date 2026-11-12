const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Load .env file if present (simple parser)
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['\"]|['\"]$/g, '');
    });
  }
} catch (e) { console.warn('env load failed', e.message); }

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- Storage abstraction (SQLite if available, else JSON file) ----------
let store;
try {
  const { DatabaseSync } = require('node:sqlite');
  const DB_PATH = path.join(DATA_DIR, 'smartdocs.db');
  const db = new DatabaseSync(DB_PATH);
  db.exec(`CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, type TEXT NOT NULL, number TEXT, issueDate TEXT, dueDate TEXT, data TEXT NOT NULL, createdAt TEXT, updatedAt TEXT);
           CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
           CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT, taxId TEXT, kind TEXT, notes TEXT, createdAt TEXT, updatedAt TEXT);
           CREATE TABLE IF NOT EXISTS recurring (id TEXT PRIMARY KEY, sourceDocId TEXT, frequency TEXT, nextRun TEXT, active INTEGER DEFAULT 1, createdAt TEXT, updatedAt TEXT);
           CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, salt TEXT NOT NULL, role TEXT NOT NULL, name TEXT, createdAt TEXT, updatedAt TEXT);`);
  store = {
    mode: 'sqlite',
    listDocs(type) {
      const rows = type
        ? db.prepare('SELECT data FROM documents WHERE type=? ORDER BY createdAt DESC').all(type)
        : db.prepare('SELECT data FROM documents ORDER BY createdAt DESC').all();
      return rows.map(r => JSON.parse(r.data));
    },
    getDoc(id) {
      const row = db.prepare('SELECT data FROM documents WHERE id=?').get(id);
      return row ? JSON.parse(row.data) : null;
    },
    saveDoc(d) {
      if (!d.id) d.id = 'd_' + crypto.randomBytes(6).toString('hex') + Date.now().toString(36);
      d.updatedAt = new Date().toISOString();
      if (!d.createdAt) d.createdAt = d.updatedAt;
      db.prepare('INSERT INTO documents (id,type,number,issueDate,dueDate,data,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET type=excluded.type, number=excluded.number, issueDate=excluded.issueDate, dueDate=excluded.dueDate, data=excluded.data, updatedAt=excluded.updatedAt')
        .run(d.id, d.type, d.number, d.issueDate, d.dueDate, JSON.stringify(d), d.createdAt, d.updatedAt);
      return d;
    },
    deleteDoc(id) { db.prepare('DELETE FROM documents WHERE id=?').run(id); },
    getSettings() {
      const row = db.prepare("SELECT value FROM settings WHERE key='main'").get();
      return row ? JSON.parse(row.value) : null;
    },
    saveSettings(s) {
      db.prepare("INSERT INTO settings (key,value) VALUES ('main',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(s));
      return s;
    },
    listCustomers() {
      return db.prepare('SELECT * FROM customers ORDER BY name ASC').all().map(r => ({ id: r.id, name: r.name, email: r.email, phone: r.phone, address: r.address, taxId: r.taxId, kind: r.kind, notes: r.notes, createdAt: r.createdAt, updatedAt: r.updatedAt }));
    },
    getCustomer(id) {
      const r = db.prepare('SELECT * FROM customers WHERE id=?').get(id);
      if (!r) return null;
      return { id: r.id, name: r.name, email: r.email, phone: r.phone, address: r.address, taxId: r.taxId, kind: r.kind, notes: r.notes, createdAt: r.createdAt, updatedAt: r.updatedAt };
    },
    saveCustomer(c) {
      if (!c.id) c.id = 'c_' + crypto.randomBytes(6).toString('hex') + Date.now().toString(36);
      c.updatedAt = new Date().toISOString();
      if (!c.createdAt) c.createdAt = c.updatedAt;
      db.prepare('INSERT INTO customers (id,name,email,phone,address,taxId,kind,notes,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email, phone=excluded.phone, address=excluded.address, taxId=excluded.taxId, kind=excluded.kind, notes=excluded.notes, updatedAt=excluded.updatedAt')
        .run(c.id, c.name, c.email||'', c.phone||'', c.address||'', c.taxId||'', c.kind||'client', c.notes||'', c.createdAt, c.updatedAt);
      return c;
    },
    deleteCustomer(id) { db.prepare('DELETE FROM customers WHERE id=?').run(id); },
    listRecurring() {
      return db.prepare('SELECT * FROM recurring ORDER BY nextRun ASC').all().map(r => ({ id: r.id, sourceDocId: r.sourceDocId, frequency: r.frequency, nextRun: r.nextRun, active: !!r.active, createdAt: r.createdAt, updatedAt: r.updatedAt }));
    },
    getRecurring(id) {
      const r = db.prepare('SELECT * FROM recurring WHERE id=?').get(id);
      if (!r) return null;
      return { id: r.id, sourceDocId: r.sourceDocId, frequency: r.frequency, nextRun: r.nextRun, active: !!r.active, createdAt: r.createdAt, updatedAt: r.updatedAt };
    },
    saveRecurring(r) {
      if (!r.id) r.id = 'r_' + crypto.randomBytes(6).toString('hex') + Date.now().toString(36);
      r.updatedAt = new Date().toISOString();
      if (!r.createdAt) r.createdAt = r.updatedAt;
      db.prepare('INSERT INTO recurring (id,sourceDocId,frequency,nextRun,active,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET sourceDocId=excluded.sourceDocId, frequency=excluded.frequency, nextRun=excluded.nextRun, active=excluded.active, updatedAt=excluded.updatedAt')
        .run(r.id, r.sourceDocId, r.frequency, r.nextRun, r.active ? 1 : 0, r.createdAt, r.updatedAt);
      return r;
    },
    deleteRecurring(id) { db.prepare('DELETE FROM recurring WHERE id=?').run(id); },
    listUsers() {
      return db.prepare('SELECT id,username,role,name,createdAt,updatedAt FROM users ORDER BY username ASC').all();
    },
    getUser(id) {
      const r = db.prepare('SELECT id,username,role,name,createdAt,updatedAt FROM users WHERE id=?').get(id);
      return r || null;
    },
    getUserByUsername(username) {
      return db.prepare('SELECT * FROM users WHERE lower(username)=lower(?)').get(username) || null;
    },
    saveUser(u) {
      if (!u.id) u.id = 'u_' + crypto.randomBytes(6).toString('hex') + Date.now().toString(36);
      u.updatedAt = new Date().toISOString();
      if (!u.createdAt) u.createdAt = u.updatedAt;
      const existing = db.prepare('SELECT id FROM users WHERE username=? AND id<>?').get(u.username, u.id);
      if (existing) throw new Error('Username already taken');
      if (u.password) {
        const { salt, hash } = hashPassword(u.password);
        u.salt = salt; u.passwordHash = hash;
      }
      const row = db.prepare('SELECT * FROM users WHERE id=?').get(u.id);
      if (row) {
        db.prepare('UPDATE users SET username=?, role=?, name=?, updatedAt=?' + (u.password ? ', password=?, salt=?' : '') + ' WHERE id=?')
          .run(u.username, u.role, u.name || '', u.updatedAt, ...(u.password ? [u.passwordHash, u.salt] : []), u.id);
      } else {
        db.prepare('INSERT INTO users (id,username,password,salt,role,name,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?)')
          .run(u.id, u.username, u.passwordHash, u.salt, u.role, u.name || '', u.createdAt, u.updatedAt);
      }
      return { id: u.id, username: u.username, role: u.role, name: u.name, createdAt: u.createdAt, updatedAt: u.updatedAt };
    },
    deleteUser(id) { db.prepare('DELETE FROM users WHERE id=?').run(id); },
    seedAdmin(password) {
      const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
      if (count === 0) {
        const { salt, hash } = hashPassword(password);
        const now = new Date().toISOString();
        db.prepare('INSERT INTO users (id,username,password,salt,role,name,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?)')
          .run('u_admin', ADMIN_USERNAME, hash, salt, 'admin', 'Administrator', now, now);
      }
    },
  };
  console.log('Using SQLite storage');
} catch (e) {
  console.log('node:sqlite unavailable, using JSON file storage:', e.message);
  const FILE = path.join(DATA_DIR, 'smartdocs.json');
  let cache = { docs: [], settings: null, customers: [], recurring: [], users: [] };
  try { if (fs.existsSync(FILE)) cache = JSON.parse(fs.readFileSync(FILE, 'utf8')); if (!cache.customers) cache.customers = []; if (!cache.recurring) cache.recurring = []; if (!cache.users) cache.users = []; } catch {}
  function persist() { fs.writeFileSync(FILE, JSON.stringify(cache, null, 2)); }
  store = {
    mode: 'json',
    listDocs(type) {
      const docs = type ? cache.docs.filter(d => d.type === type) : cache.docs.slice();
      return docs.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    },
    getDoc(id) { return cache.docs.find(d => d.id === id) || null; },
    saveDoc(d) {
      if (!d.id) d.id = 'd_' + crypto.randomBytes(6).toString('hex') + Date.now().toString(36);
      d.updatedAt = new Date().toISOString();
      if (!d.createdAt) d.createdAt = d.updatedAt;
      const idx = cache.docs.findIndex(x => x.id === d.id);
      if (idx >= 0) cache.docs[idx] = d; else cache.docs.push(d);
      persist();
      return d;
    },
    deleteDoc(id) { cache.docs = cache.docs.filter(d => d.id !== id); persist(); },
    getSettings() { return cache.settings; },
    saveSettings(s) { cache.settings = s; persist(); return s; },
    listCustomers() { return (cache.customers || []).slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'')); },
    getCustomer(id) { return (cache.customers || []).find(c => c.id === id) || null; },
    saveCustomer(c) {
      if (!c.id) c.id = 'c_' + crypto.randomBytes(6).toString('hex') + Date.now().toString(36);
      c.updatedAt = new Date().toISOString();
      if (!c.createdAt) c.createdAt = c.updatedAt;
      const idx = (cache.customers || []).findIndex(x => x.id === c.id);
      if (idx >= 0) cache.customers[idx] = c; else { if (!cache.customers) cache.customers = []; cache.customers.push(c); }
      persist();
      return c;
    },
    deleteCustomer(id) { cache.customers = (cache.customers || []).filter(c => c.id !== id); persist(); },
    listRecurring() { return (cache.recurring || []).slice().sort((a,b)=>(a.nextRun||'').localeCompare(b.nextRun||'')); },
    getRecurring(id) { return (cache.recurring || []).find(r => r.id === id) || null; },
    saveRecurring(r) {
      if (!r.id) r.id = 'r_' + crypto.randomBytes(6).toString('hex') + Date.now().toString(36);
      r.updatedAt = new Date().toISOString();
      if (!r.createdAt) r.createdAt = r.updatedAt;
      if (!cache.recurring) cache.recurring = [];
      const idx = cache.recurring.findIndex(x => x.id === r.id);
      if (idx >= 0) cache.recurring[idx] = r; else cache.recurring.push(r);
      persist();
      return r;
    },
    deleteRecurring(id) { cache.recurring = (cache.recurring || []).filter(r => r.id !== id); persist(); },
    listUsers() { return (cache.users || []).map(u => ({ id: u.id, username: u.username, role: u.role, name: u.name, createdAt: u.createdAt, updatedAt: u.updatedAt })); },
    getUser(id) { const u = (cache.users || []).find(x => x.id === id); return u ? { id: u.id, username: u.username, role: u.role, name: u.name, createdAt: u.createdAt, updatedAt: u.updatedAt } : null; },
    getUserByUsername(username) { return (cache.users || []).find(u => String(u.username || '').toLowerCase() === String(username || '').toLowerCase()) || null; },
    saveUser(u) {
      if (!u.id) u.id = 'u_' + crypto.randomBytes(6).toString('hex') + Date.now().toString(36);
      u.updatedAt = new Date().toISOString();
      if (!u.createdAt) u.createdAt = u.updatedAt;
      if ((cache.users || []).some(x => x.username === u.username && x.id !== u.id)) throw new Error('Username already taken');
      const idx = (cache.users || []).findIndex(x => x.id === u.id);
      const existing = idx >= 0 ? cache.users[idx] : null;
      let salt = existing ? existing.salt : null;
      let passwordHash = existing ? existing.password : null;
      if (u.password) {
        const h = hashPassword(u.password, salt);
        salt = h.salt; passwordHash = h.hash;
      }
      const obj = { id: u.id, username: u.username, password: passwordHash, salt, role: u.role, name: u.name || '', createdAt: u.createdAt, updatedAt: u.updatedAt };
      if (!cache.users) cache.users = [];
      if (idx >= 0) cache.users[idx] = obj; else cache.users.push(obj);
      persist();
      return { id: obj.id, username: obj.username, role: obj.role, name: obj.name, createdAt: obj.createdAt, updatedAt: obj.updatedAt };
    },
    deleteUser(id) { cache.users = (cache.users || []).filter(u => u.id !== id); persist(); },
    seedAdmin(password) {
      if (!(cache.users || []).length) {
        if (!cache.users) cache.users = [];
        const { salt, hash } = hashPassword(password);
        const now = new Date().toISOString();
        cache.users.push({ id: 'u_admin', username: ADMIN_USERNAME, password: hash, salt, role: 'admin', name: 'Administrator', createdAt: now, updatedAt: now });
        persist();
      }
    },
  };
}

// ---------- Password hashing ----------
function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPassword(password, salt, hash) {
  const h = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(hash, 'hex'));
}

// ---------- Legacy demo branding migration ----------
// Older builds seeded "Acme Corp" (New York) as the company profile and copied it
// into every document. Replace only those leftover demo values with Studio Pro.
const STUDIO_PRO = {
  name: 'Studio Pro',
  address: 'F-8-1, Block F, Cyber City Apartment 2\n88200 Kota Kinabalu, Sabah\nMalaysia',
  email: 'admin@prostudio.my',
  phone: '+60 13-869 9933',
  taxId: '',
};
const isLegacyAddress = (v) => /123 business street|new york,\s*ny\s*10001/i.test(String(v || ''));
const isLegacyPhone = (v) => /\+1\s*\(555\)\s*010-2000/.test(String(v || ''));
const isLegacyTaxId = (v) => /^tax-12345678$/i.test(String(v || '').trim());
const isLegacyCompany = (c) => !!c && (/acme\s*corp/i.test(String(c.name || '')) || /@acmecorp\.com$/i.test(String(c.email || '').trim()));

function migrateLegacyBranding() {
  try {
    const s = store.getSettings();
    if (s) {
      let changed = false;
      if (isLegacyCompany({ name: s.companyName, email: s.companyEmail })) {
        s.companyName = STUDIO_PRO.name;
        s.companyEmail = STUDIO_PRO.email;
        changed = true;
      }
      if (isLegacyAddress(s.companyAddress)) { s.companyAddress = STUDIO_PRO.address; changed = true; }
      if (isLegacyPhone(s.companyPhone)) { s.companyPhone = STUDIO_PRO.phone; changed = true; }
      if (isLegacyTaxId(s.companyTaxId)) { s.companyTaxId = STUDIO_PRO.taxId; changed = true; }
      if (!s.footer) { s.footer = 'prostudio.my'; changed = true; }
      if (/^generated (with|by)\b/i.test(String(s.footer || '').trim())) { s.footer = 'prostudio.my'; changed = true; }
      if (changed) { store.saveSettings(s); console.log('Company profile migrated to Studio Pro'); }
    }

    let n = 0;
    for (const d of store.listDocs()) {
      const f = d && d.from;
      if (!f) continue;
      let changed = false;
      if (isLegacyCompany(f)) { f.name = STUDIO_PRO.name; f.email = STUDIO_PRO.email; changed = true; }
      if (isLegacyAddress(f.address)) { f.address = STUDIO_PRO.address; changed = true; }
      if (isLegacyPhone(f.phone)) { f.phone = STUDIO_PRO.phone; changed = true; }
      if (isLegacyTaxId(f.taxId)) { f.taxId = STUDIO_PRO.taxId; changed = true; }
      if (changed) { store.saveDoc(d); n++; }
    }
    if (n) console.log('Updated company details on ' + n + ' document(s)');
  } catch (e) {
    console.warn('Branding migration skipped:', e.message);
  }
}

// ---------- Auth ----------
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'StudioPro2026!';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Admin';
const sessions = new Map();

// Seed default admin user (SQLite)
function seedAdminUser() {
  if (store.seedAdmin) store.seedAdmin(ADMIN_PASSWORD);
}
// (JSON fallback handles its own)
function checkAuth(req, res, next) {
  if (!ADMIN_PASSWORD) return next();
  if (req.path === '/api/login' || req.path === '/api/logout' || req.path === '/api/auth-status') return next();
  if (req.path.startsWith('/public')) return next();
  if (req.originalUrl && req.originalUrl.startsWith('/api/public')) return next();
  const token = req.headers['x-auth-token'];
  if (token && sessions.has(token)) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(express.json({ limit: '5mb' }));
app.use((req, res, next) => {
  const c = req.headers.cookie || '';
  req.cookies = {};
  c.split(';').forEach(p => { const [k, v] = p.trim().split('='); if (k) req.cookies[k] = decodeURIComponent(v || ''); });
  next();
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!ADMIN_PASSWORD && !(store.getUserByUsername && store.getUserByUsername(username))) {
    // no users seeded? seed admin
  }
  // seed admin if empty
  try { store.seedAdmin(ADMIN_PASSWORD); } catch {}
  const u = store.getUserByUsername(username);
  if (!u) return res.status(401).json({ error: 'Invalid credentials' });
  if (!verifyPassword(password, u.salt, u.password)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { username: u.username, role: u.role, userId: u.id });
  res.json({ ok: true, token, username: u.username, role: u.role });
});
app.post('/api/logout', (req, res) => { const t = req.headers['x-auth-token']; if (t) sessions.delete(t); res.json({ ok: true }); });
app.get('/api/auth-status', (req, res) => {
  if (!ADMIN_PASSWORD) return res.json({ authRequired: false, role: 'admin' });
  const t = req.headers['x-auth-token'];
  const sess = t ? sessions.get(t) : null;
  res.json({ authRequired: true, authenticated: !!sess, role: sess ? sess.role : null, username: sess ? sess.username : null });
});

app.use('/api', checkAuth);

// ---------- Documents API ----------
app.get('/api/docs', (req, res) => res.json(store.listDocs(req.query.type)));
app.get('/api/docs/:id', (req, res) => {
  const d = store.getDoc(req.params.id);
  if (!d) return res.status(404).json({ error: 'Not found' });
  res.json(d);
});
app.post('/api/docs', (req, res) => res.json(store.saveDoc(req.body || {})));
app.put('/api/docs/:id', (req, res) => {
  const d = req.body || {}; d.id = req.params.id;
  res.json(store.saveDoc(d));
});
app.delete('/api/docs/:id', (req, res) => { store.deleteDoc(req.params.id); res.json({ ok: true }); });

// ---------- Settings API ----------
app.get('/api/settings', (req, res) => res.json(store.getSettings()));
app.put('/api/settings', (req, res) => res.json(store.saveSettings(req.body || {})));

// ---------- Users API (admin only) ----------
function requireAdmin(req, res, next) {
  const token = req.headers['x-auth-token'];
  const sess = token ? sessions.get(token) : null;
  if (!sess || sess.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}
app.get('/api/users', requireAdmin, (req, res) => res.json(store.listUsers()));
app.post('/api/users', requireAdmin, (req, res) => {
  try { res.json(store.saveUser(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/users/:id', requireAdmin, (req, res) => {
  try { const u = req.body || {}; u.id = req.params.id; res.json(store.saveUser(u)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/users/:id', requireAdmin, (req, res) => {
  // prevent deleting self
  const token = req.headers['x-auth-token'];
  const sess = sessions.get(token);
  const u = store.getUser(req.params.id);
  if (u && sess && u.username === sess.username) return res.status(400).json({ error: 'Cannot delete yourself' });
  store.deleteUser(req.params.id);
  res.json({ ok: true });
});

// ---------- Customers API ----------
app.get('/api/customers', (req, res) => res.json(store.listCustomers()));
app.get('/api/customers/:id', (req, res) => {
  const c = store.getCustomer(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});
app.post('/api/customers', (req, res) => res.json(store.saveCustomer(req.body || {})));
app.put('/api/customers/:id', (req, res) => {
  const c = req.body || {}; c.id = req.params.id;
  res.json(store.saveCustomer(c));
});
app.delete('/api/customers/:id', (req, res) => { store.deleteCustomer(req.params.id); res.json({ ok: true }); });

// ---------- Email API ----------
let mailer = null;
function getMailer() {
  if (mailer) return mailer;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const nodemailer = require('nodemailer');
  mailer = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return mailer;
}
app.get('/api/email/status', (req, res) => res.json({ configured: !!process.env.SMTP_HOST }));
app.post('/api/email/send', async (req, res) => {
  const transport = getMailer();
  if (!transport) return res.status(501).json({ error: 'SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.' });
  const { to, subject, text, html, attachmentBase64, filename } = req.body || {};
  if (!to || !subject) return res.status(400).json({ error: 'Missing to/subject' });
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
  const fromName = process.env.SMTP_FROM_NAME || '';
  const mail = {
    from: fromName ? `\"${fromName}\" <${fromEmail}>` : fromEmail,
    to, subject, text, html,
  };
  if (attachmentBase64) {
    mail.attachments = [{ filename: filename || 'document.pdf', content: attachmentBase64, encoding: 'base64' }];
  }
  try {
    await transport.sendMail(mail);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Recurring API ----------
app.get('/api/recurring', (req, res) => res.json(store.listRecurring()));
app.post('/api/recurring', (req, res) => res.json(store.saveRecurring(req.body || {})));
app.put('/api/recurring/:id', (req, res) => { const r = req.body || {}; r.id = req.params.id; res.json(store.saveRecurring(r)); });
app.delete('/api/recurring/:id', (req, res) => { store.deleteRecurring(req.params.id); res.json({ ok: true }); });

// ---------- Reports API ----------
app.get('/api/reports/summary', (req, res) => {
  const docs = store.listDocs();
  const byType = {};
  const byMonth = {};
  const byClient = {};
  let revenue = 0, paid = 0, outstanding = 0;
  docs.forEach(d => {
    byType[d.type] = (byType[d.type] || 0) + 1;
    const m = (d.issueDate || '').slice(0, 7);
    if (m) {
      if (!byMonth[m]) byMonth[m] = { count: 0, revenue: 0 };
      byMonth[m].count++;
      byMonth[m].revenue += (d.total || 0);
    }
    const client = d.to?.name || 'Unknown';
    if (!byClient[client]) byClient[client] = { count: 0, revenue: 0 };
    byClient[client].count++;
    byClient[client].revenue += (d.total || 0);
    if (d.type === 'invoice') { revenue += d.total || 0; paid += d.amountPaid || 0; }
  });
  outstanding = revenue - paid;
  res.json({ totalDocs: docs.length, revenue, paid, outstanding, byType, byMonth, byClient });
});

// ---------- FX proxy (live rates, cached) ----------
const FX_TTL_MS = 60 * 60 * 1000; // 1 hour
const fxCache = new Map(); // base -> { rates, date, source, at }

// Bank Negara Malaysia official rates (no API key). Returns MYR per 1 unit.
let bnmCache = { at: 0, data: null };
async function fetchBnmRates() {
  if (bnmCache.data && Date.now() - bnmCache.at < FX_TTL_MS) return bnmCache.data;
  try {
    const r = await fetch('https://api.bnm.gov.my/public/exchange-rate', {
      headers: { Accept: 'application/vnd.BNM.API.v1+json' },
      signal: AbortSignal.timeout(9000),
    });
    const j = await r.json();
    if (!j || !Array.isArray(j.data)) return bnmCache.data;
    const rates = { MYR: 1 };
    let date = null;
    for (const row of j.data) {
      const rt = row.rate || {};
      const mid = rt.middle_rate != null ? rt.middle_rate
        : rt.selling_rate != null && rt.buying_rate != null ? (rt.selling_rate + rt.buying_rate) / 2
        : (rt.selling_rate != null ? rt.selling_rate : rt.buying_rate);
      if (mid == null || !row.unit) continue;
      rates[row.currency_code] = mid / row.unit;
      if (!date && rt.date) date = rt.date;
    }
    if (!date) date = new Date().toISOString().slice(0, 10);
    bnmCache = { at: Date.now(), data: { rates, date, source: 'Bank Negara Malaysia' } };
    return bnmCache.data;
  } catch {
    return bnmCache.data;
  }
}

async function fetchRates(base) {
  const hit = fxCache.get(base);
  if (hit && Date.now() - hit.at < FX_TTL_MS) return hit;

  // Primary: open.er-api.com — 160+ currencies, no API key required
  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/${base}`, { signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    if (j && j.result === 'success' && j.rates && Object.keys(j.rates).length > 10) {
      const entry = {
        rates: j.rates,
        date: (j.time_last_update_utc || '').slice(5, 16) || new Date().toISOString().slice(0, 10),
        source: 'open.er-api.com',
        at: Date.now(),
      };
      fxCache.set(base, entry);
      return entry;
    }
  } catch { /* fall through */ }

  // Fallback: ECB reference rates via Frankfurter
  try {
    const r = await fetch(`https://api.frankfurter.app/latest?from=${base}`, { signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    if (j && j.rates) {
      const entry = {
        rates: { ...j.rates, [base]: 1 },
        date: j.date || new Date().toISOString().slice(0, 10),
        source: 'ECB / Frankfurter',
        at: Date.now(),
      };
      fxCache.set(base, entry);
      return entry;
    }
  } catch { /* fall through */ }

  // Serve stale cache rather than failing outright
  if (hit) return hit;
  throw new Error('Live rate service unavailable');
}

app.get('/api/fx', async (req, res) => {
  const from = (req.query.from || 'USD').toUpperCase();
  const to = (req.query.to || 'MYR').toUpperCase();
  const amount = parseFloat(req.query.amount || '1');
  const source = (req.query.source || 'bnm').toLowerCase();
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
    return res.status(400).json({ error: 'Invalid currency code' });
  }

  // Official Bank Negara Malaysia cross-rates (via MYR)
  if (source === 'bnm') {
    const bnm = await fetchBnmRates();
    if (bnm && bnm.rates[from] != null && bnm.rates[to] != null) {
      const rate = bnm.rates[from] / bnm.rates[to];
      res.set('Cache-Control', 'public, max-age=300');
      return res.json({
        from, to, rate, amount, converted: amount * rate,
        date: bnm.date, source: 'Bank Negara Malaysia',
      });
    }
    // Not covered by BNM — fall back to market rates below
  }

  try {
    const data = await fetchRates(from);
    const rate = data.rates[to];
    if (!rate) return res.status(400).json({ error: `Rate not available for ${from} to ${to}` });
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ from, to, rate, amount, converted: amount * rate, date: data.date, source: data.source });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.get('/api/fx/currencies', async (req, res) => {
  try {
    const data = await fetchRates('USD');
    const bnm = await fetchBnmRates();
    const set = new Set(Object.keys(data.rates));
    if (bnm) Object.keys(bnm.rates).forEach(c => set.add(c));
    set.add('MYR');
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ base: 'USD', date: data.date, source: data.source, currencies: [...set].sort() });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.get('/api/fx/bnm', async (req, res) => {
  const bnm = await fetchBnmRates();
  if (!bnm) return res.status(502).json({ error: 'BNM rates unavailable' });
  res.set('Cache-Control', 'public, max-age=1800');
  res.json({ base: 'MYR', date: bnm.date, source: bnm.source, rates: bnm.rates });
});

// ---------- Recurring scheduler ----------
function addDaysIso(iso, days) {
  const d = new Date(iso); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10);
}
function nextRunDate(freq, from) {
  const d = new Date(from);
  if (freq === 'weekly') d.setDate(d.getDate() + 7);
  else if (freq === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (freq === 'quarterly') d.setMonth(d.getMonth() + 3);
  else if (freq === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}
async function runRecurring() {
  try {
    const list = store.listRecurring().filter(r => r.active);
    const today = new Date().toISOString().slice(0, 10);
    for (const r of list) {
      if (r.nextRun <= today) {
        const src = store.getDoc(r.sourceDocId);
        if (src) {
          const copy = JSON.parse(JSON.stringify(src));
          copy.id = 'd_' + crypto.randomBytes(6).toString('hex') + Date.now().toString(36);
          const s = store.getSettings() || {};
          const prefix = (s.docPrefix && s.docPrefix[src.type]) || 'DOC';
          const num = (s.nextNumber && s.nextNumber[src.type]) || 1001;
          copy.number = prefix + '-' + String(num).padStart(4, '0');
          if (s.nextNumber) { s.nextNumber[src.type] = num + 1; store.saveSettings(s); }
          copy.issueDate = today;
          copy.createdAt = new Date().toISOString();
          copy.updatedAt = copy.createdAt;
          store.saveDoc(copy);
        }
        r.nextRun = nextRunDate(r.frequency, r.nextRun);
        store.saveRecurring(r);
      }
    }
  } catch (e) { console.error('recurring run failed', e); }
}
setInterval(runRecurring, 60 * 60 * 1000); // hourly
setTimeout(runRecurring, 5000); // on boot

// ---------- Public document retrieval (no auth) ----------
app.get('/api/public/docs/:ref', (req, res) => {
  const ref = req.params.ref;
  const docs = store.listDocs();
  const d = docs.find(x => x.number === ref || x.id === ref);
  if (!d) return res.status(404).json({ error: 'Document not found' });
  // Include the company branding so the public page matches the printed document.
  const s = store.getSettings() || {};
  res.json({ ...d, _settings: {
    logo: s.logo || '', companyName: s.companyName || '',
    currency: s.currency || 'MYR', currencySymbol: s.currencySymbol || 'MYR ',
    template: s.template || 'modern'
  } });
});

// ---------- Agent & static delivery ----------
// Never let browsers hold on to the app shell / JS / CSS: deploys must take effect.
app.use((req, res, next) => {
  const p = req.path;
  if (p === '/' || p === '/sw.js' || /\.(html|js|css|json|txt|xml|md)$/i.test(p)) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

// Homepage: advertise machine-readable resources and support content negotiation.
app.get(['/', '/index.html'], (req, res) => {
  res.set('Link', '<https://pintar.prostudio.my/llms.txt>; rel="describedby"; type="text/plain", <https://pintar.prostudio.my/index.md>; rel="alternate"; type="text/markdown", <https://pintar.prostudio.my/sitemap.xml>; rel="sitemap"; type="application/xml"');
  res.set('Vary', 'Accept');
  const accept = req.headers.accept || '';
  if (accept.includes('text/markdown')) {
    return res.type('text/markdown; charset=utf-8').sendFile(path.join(__dirname, 'index.md'));
  }
  return res.type('html').sendFile(path.join(__dirname, 'index.html'));
});

// Ensure agent-facing files are served with correct types (not SPA/catch-all HTML).
app.get('/robots.txt', (req, res) => res.type('text/plain; charset=utf-8').sendFile(path.join(__dirname, 'robots.txt')));
app.get('/sitemap.xml', (req, res) => res.type('application/xml; charset=utf-8').sendFile(path.join(__dirname, 'sitemap.xml')));
app.get('/llms.txt', (req, res) => res.type('text/plain; charset=utf-8').sendFile(path.join(__dirname, 'llms.txt')));
app.get('/index.md', (req, res) => res.type('text/markdown; charset=utf-8').sendFile(path.join(__dirname, 'index.md')));
app.get('/.well-known/mcp/server-card.json', (req, res) => res.type('application/json; charset=utf-8').sendFile(path.join(__dirname, '.well-known', 'mcp', 'server-card.json')));

app.use(express.static(__dirname, {
  index: false,
  dotfiles: 'allow',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.json')) res.type('application/json; charset=utf-8');
    if (filePath.endsWith('.md')) res.type('text/markdown; charset=utf-8');
    if (filePath.endsWith('.txt')) res.type('text/plain; charset=utf-8');
    if (filePath.endsWith('.xml')) res.type('application/xml; charset=utf-8');
  }
}));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  // Unknown pages must return a real 404 (not 200 SPA fallback) so agents don't treat them as existing.
  res.status(404).type('text/plain; charset=utf-8').send('404 Not Found');
});

// Replace any leftover "Acme Corp" demo branding before serving
migrateLegacyBranding();

app.listen(PORT, () => console.log('SmartDocs server running on port ' + PORT + ' (storage: ' + store.mode + ')'));
