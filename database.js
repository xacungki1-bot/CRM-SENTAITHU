// STT CRM — Database (sql.js pure JS)
const initSqlJs = require('sql.js');
const fs   = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, 'data', 'crm.db');
let _db = null;

function saveDb(db) {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function getDb() {
  if (_db) return _db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    _db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _db = new SQL.Database();
    _initSchema(_db);
    saveDb(_db);
  }
  return _db;
}

function _initSchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL, full_name TEXT NOT NULL,
      phone TEXT NOT NULL, branch TEXT NOT NULL, source TEXT NOT NULL,
      ads_staff TEXT DEFAULT '', note TEXT DEFAULT '',
      data_type TEXT DEFAULT 'Data Nóng', cskh_staff TEXT DEFAULT '',
      qty_closed REAL DEFAULT 0, unit_price REAL DEFAULT 0, total_revenue REAL DEFAULT 0,
      final_status TEXT DEFAULT '', last_care_at TEXT, care_count INTEGER DEFAULT 0,
      updated_at TEXT, updated_by TEXT DEFAULT '', is_deleted INTEGER DEFAULT 0,
      csl1 TEXT, time_csl1 TEXT, csl2 TEXT, time_csl2 TEXT,
      csl3 TEXT, time_csl3 TEXT, csl4 TEXT, time_csl4 TEXT,
      csl5 TEXT, time_csl5 TEXT, csl6 TEXT, time_csl6 TEXT,
      csl7 TEXT, time_csl7 TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_phone  ON leads(phone);
    CREATE INDEX IF NOT EXISTS idx_branch ON leads(branch);
    CREATE INDEX IF NOT EXISTS idx_source ON leads(source);
    CREATE INDEX IF NOT EXISTS idx_status ON leads(final_status);
    CREATE INDEX IF NOT EXISTS idx_date   ON leads(created_at);
    CREATE INDEX IF NOT EXISTS idx_type   ON leads(data_type);
    CREATE TABLE IF NOT EXISTS care_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, log_id TEXT UNIQUE NOT NULL,
      lead_id TEXT NOT NULL, care_number INTEGER NOT NULL,
      status TEXT NOT NULL, cared_at TEXT NOT NULL,
      cskh_staff TEXT DEFAULT '', note TEXT DEFAULT '', created_by TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_care_lead ON care_logs(lead_id);
    CREATE TABLE IF NOT EXISTS change_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id TEXT,
      changed_by TEXT, changed_at TEXT NOT NULL, action TEXT NOT NULL,
      field_name TEXT, old_value TEXT, new_value TEXT, source TEXT DEFAULT 'web'
    );
    CREATE TABLE IF NOT EXISTS counters (date_key TEXT PRIMARY KEY, count INTEGER DEFAULT 0);
  `);
  console.log('✅ Schema initialized');
}

function initDb() { return _initSchema; }

function dbGet(db, sql, params=[]) {
  const s = db.prepare(sql); s.bind(params);
  if (s.step()) { const r=s.getAsObject(); s.free(); return r; }
  s.free(); return null;
}
function dbAll(db, sql, params=[]) {
  const res=[]; const s=db.prepare(sql); s.bind(params);
  while(s.step()) res.push(s.getAsObject()); s.free(); return res;
}
function dbRun(db, sql, params=[]) {
  const s=db.prepare(sql); s.bind(params); s.step(); s.free(); saveDb(db);
}
function dbRunNoSave(db, sql, params=[]) {
  const s=db.prepare(sql); s.bind(params); s.step(); s.free();
}

function generateLeadId(db) {
  const vn=new Date(Date.now()+7*3600*1000);
  const dk=vn.toISOString().slice(0,10).replace(/-/g,'');
  const ex=dbGet(db,'SELECT count FROM counters WHERE date_key=?',[dk]);
  const nc=ex?ex.count+1:1;
  if(ex) dbRunNoSave(db,'UPDATE counters SET count=? WHERE date_key=?',[nc,dk]);
  else   dbRunNoSave(db,'INSERT INTO counters(date_key,count) VALUES(?,?)',[dk,nc]);
  saveDb(db);
  return `STT-${dk}-${String(nc).padStart(4,'0')}`;
}
function vnNow() {
  return new Date(Date.now()+7*3600*1000).toISOString().replace('T',' ').slice(0,19);
}
module.exports={getDb,initDb,saveDb,dbGet,dbAll,dbRun,dbRunNoSave,generateLeadId,vnNow};
