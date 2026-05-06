const XLSX   = require('xlsx');
const path   = require('path');
const initSqlJs = require('sql.js');
const fs = require('fs');

const EXCEL_PATH = path.join(__dirname,'..','data','MKT_All_Data.xlsx');
const DB_PATH    = path.join(__dirname,'..','data','crm.db');

const SOURCE_MAP={'facebook ads':'FA','facebook':'FA','fb':'FA','fa':'FA','google ads':'G','google':'G','g':'G','hotline':'H','h':'H','form':'FR','fr':'FR','zalo':'Z','z':'Z','tiktok':'TT','tt':'TT','telesale':'T','t':'T'};
const STATUS_NORM={'Không có nhu cầu':'kcnc','Khách xa':'kx','Không nghe máy':'knnm','Khách tiềm năng':'tn','Đã đặt lịch hẹn':'lh','Đã đến hẹn':'ddh','Đã chốt':'dc'};

function fmtTs(val){
  if(!val)return null;
  if(val instanceof Date){const vn=new Date(val.getTime()+7*3600*1000);return vn.toISOString().replace('T',' ').slice(0,19);}
  if(typeof val==='number'){const d=new Date((val-25569)*86400000);const vn=new Date(d.getTime()+7*3600*1000);return vn.toISOString().replace('T',' ').slice(0,19);}
  return String(val);
}
function normSrc(s){if(!s)return '';const k=s.toString().toLowerCase().trim();return SOURCE_MAP[k]||s.toString().trim();}
function normSt(s){if(!s)return '';return STATUS_NORM[s]||s;}
function normName(n){if(!n)return '';return n.toString().trim().split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');}
function normPhone(p){if(!p)return '';return p.toString().replace(/[\s\-\.]/g,'');}
function vnNow(){return new Date(Date.now()+7*3600*1000).toISOString().replace('T',' ').slice(0,19);}

async function main(){
  console.log('📂 Đọc file Excel:', EXCEL_PATH);
  const SQL=await initSqlJs();
  let db;
  if(fs.existsSync(DB_PATH)){
    db=new SQL.Database(fs.readFileSync(DB_PATH));
    console.log('📂 Mở database hiện có');
  } else {
    db=new SQL.Database();
    // Tạo schema nhanh
    db.run(`CREATE TABLE IF NOT EXISTS leads(id INTEGER PRIMARY KEY AUTOINCREMENT,lead_id TEXT UNIQUE NOT NULL,created_at TEXT,full_name TEXT,phone TEXT,branch TEXT,source TEXT,ads_staff TEXT DEFAULT '',note TEXT DEFAULT '',data_type TEXT DEFAULT 'Data Nóng',cskh_staff TEXT DEFAULT '',qty_closed REAL DEFAULT 0,unit_price REAL DEFAULT 0,total_revenue REAL DEFAULT 0,final_status TEXT DEFAULT '',last_care_at TEXT,care_count INTEGER DEFAULT 0,updated_at TEXT,updated_by TEXT DEFAULT '',is_deleted INTEGER DEFAULT 0,csl1 TEXT,time_csl1 TEXT,csl2 TEXT,time_csl2 TEXT,csl3 TEXT,time_csl3 TEXT,csl4 TEXT,time_csl4 TEXT,csl5 TEXT,time_csl5 TEXT,csl6 TEXT,time_csl6 TEXT,csl7 TEXT,time_csl7 TEXT);`);
    db.run(`CREATE TABLE IF NOT EXISTS care_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,log_id TEXT UNIQUE NOT NULL,lead_id TEXT,care_number INTEGER,status TEXT,cared_at TEXT,cskh_staff TEXT DEFAULT '',note TEXT DEFAULT '',created_by TEXT DEFAULT '');`);
    db.run(`CREATE TABLE IF NOT EXISTS change_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,lead_id TEXT,changed_by TEXT,changed_at TEXT,action TEXT,field_name TEXT,old_value TEXT,new_value TEXT,source TEXT DEFAULT 'web');`);
    db.run(`CREATE TABLE IF NOT EXISTS counters(date_key TEXT PRIMARY KEY,count INTEGER DEFAULT 0);`);
  }

  const wb=XLSX.readFile(EXCEL_PATH,{cellDates:true});
  const ws=wb.Sheets['ALL DATA'];
  if(!ws){console.error('❌ Không tìm thấy sheet "ALL DATA"');process.exit(1);}
  const raw=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:false});
  const dataRows=raw.slice(2).filter(r=>r[2]||r[3]);
  console.log(`📊 Tìm thấy ${dataRows.length} dòng data`);

  let counter=1;
  const today=new Date(Date.now()+7*3600*1000).toISOString().slice(0,10).replace(/-/g,'');
  let imported=0,errors=[];

  dataRows.forEach((row,idx)=>{
    try {
      const fullName=normName(row[2]);
      const phone=normPhone(row[3]);
      if(!fullName&&!phone)return;
      const leadId=`STT-${today}-${String(counter++).padStart(4,'0')}`;
      const createdAt=fmtTs(row[1])||vnNow();
      const cslPairs=[];
      for(let i=0;i<7;i++)cslPairs.push({status:normSt(row[10+i*2]||''),time:fmtTs(row[11+i*2])});
      let finalStatus='',lastCareAt=fmtTs(row[24])||null,careCount=0;
      for(let i=6;i>=0;i--){if(cslPairs[i].status){finalStatus=cslPairs[i].status;if(!lastCareAt)lastCareAt=cslPairs[i].time;break;}}
      cslPairs.forEach(p=>{if(p.status)careCount++;});
      const source=normSrc(row[5]||'');
      const now=vnNow();
      db.run(`INSERT OR IGNORE INTO leads(lead_id,created_at,full_name,phone,branch,source,ads_staff,note,data_type,cskh_staff,csl1,time_csl1,csl2,time_csl2,csl3,time_csl3,csl4,time_csl4,csl5,time_csl5,csl6,time_csl6,csl7,time_csl7,last_care_at,final_status,care_count,qty_closed,unit_price,total_revenue,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [leadId,createdAt,fullName||'Chưa có tên',phone||'',(row[4]||'').toString().trim(),source,(row[6]||'').toString().trim(),(row[7]||'').toString().trim(),row[8]||'Data Nóng',(row[9]||'').toString().trim(),
        cslPairs[0].status,cslPairs[0].time,cslPairs[1].status,cslPairs[1].time,cslPairs[2].status,cslPairs[2].time,cslPairs[3].status,cslPairs[3].time,cslPairs[4].status,cslPairs[4].time,cslPairs[5].status,cslPairs[5].time,cslPairs[6].status,cslPairs[6].time,
        lastCareAt,finalStatus,careCount,row[25]||0,row[26]||0,row[27]||0,now,'import_excel']);
      cslPairs.forEach((pair,i)=>{
        if(!pair.status)return;
        const caredAt=pair.time||createdAt;
        db.run(`INSERT OR IGNORE INTO care_logs(log_id,lead_id,care_number,status,cared_at,cskh_staff) VALUES(?,?,?,?,?,?)`,
          [`${leadId}-C${i+1}`,leadId,i+1,pair.status,caredAt,(row[9]||'').toString().trim()]);
      });
      imported++;
    } catch(e){errors.push(`Row ${idx+3}: ${e.message}`);}
  });

  // Ghi counter
  db.run('INSERT OR REPLACE INTO counters(date_key,count) VALUES(?,?)',[today,counter-1]);

  // Lưu DB
  const data=db.export();
  fs.mkdirSync(path.dirname(DB_PATH),{recursive:true});
  fs.writeFileSync(DB_PATH,Buffer.from(data));
  console.log(`\n✅ Import hoàn tất: ${imported} leads`);
  if(errors.length){console.log(`⚠️  ${errors.length} lỗi:`);errors.forEach(e=>console.log(' ',e));}
  console.log('\n🚀 Chạy app: npm start → http://localhost:3456');
}
main().catch(console.error);
