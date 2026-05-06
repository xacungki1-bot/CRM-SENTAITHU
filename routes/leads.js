const express = require('express');
const router  = express.Router();
const { getDb, generateLeadId, vnNow } = require('../database');
const { dbGet, dbAll, dbRun } = require('../database');

const BRANCHES=['Sen Đại Mỗ','Sen Mỹ Đình','Sen Cầu Giấy','Sen Hà Đông','Sen Hoàng Mai','Sen Long Biên','Sen Gia Lâm','Sen Đông Anh','Sen Thanh Xuân','Sen Ba Đình','Sen Tây Hồ','Sen Đống Đa','Sen Hoàn Kiếm'];
const SOURCES=['FA','G','H','FR','Z','TT','T'];
const DATA_TYPES=['Data Nóng','Data Ấm','Data Lạnh','Data Băng','Data Hóa Thạch'];
const STATUSES=['kcnc','kx','knnm','tn','lh','ddh','dc'];
const STATUS_LABELS={kcnc:'Không có nhu cầu',kx:'Khách xa',knnm:'Không nghe máy',tn:'Khách tiềm năng',lh:'Đã đặt lịch hẹn',ddh:'Đã đến hẹn',dc:'Đã chốt'};
const SOURCE_LABELS={FA:'Facebook Ads',G:'Google Ads',H:'Hotline',FR:'Form',Z:'Zalo',TT:'TikTok',T:'Telesale'};

router.get('/', async (req,res) => {
  try {
    const db=await getDb();
    const {branch,source,data_type,status,ads_staff,cskh_staff,search,from_date,to_date,page=1,limit=50,sort='created_at',order='desc'}=req.query;
    const conds=['is_deleted=0'], params=[];
    if(branch)    {conds.push('branch=?');params.push(branch);}
    if(source)    {conds.push('source=?');params.push(source);}
    if(data_type) {conds.push('data_type=?');params.push(data_type);}
    if(status)    {conds.push('final_status=?');params.push(status);}
    if(ads_staff) {conds.push('ads_staff LIKE ?');params.push('%'+ads_staff+'%');}
    if(cskh_staff){conds.push('cskh_staff LIKE ?');params.push('%'+cskh_staff+'%');}
    if(from_date) {conds.push('created_at>=?');params.push(from_date+' 00:00:00');}
    if(to_date)   {conds.push('created_at<=?');params.push(to_date+' 23:59:59');}
    if(search)    {conds.push('(full_name LIKE ? OR phone LIKE ?)');params.push('%'+search+'%','%'+search+'%');}
    const safeSort=['created_at','full_name','branch','data_type','final_status','updated_at'].includes(sort)?sort:'created_at';
    const safeOrd=order==='asc'?'ASC':'DESC';
    const offset=(parseInt(page)-1)*parseInt(limit);
    const where='WHERE '+conds.join(' AND ');
    const totalRow=dbGet(db,`SELECT COUNT(*) as c FROM leads ${where}`,params);
    const total=totalRow?totalRow.c:0;
    const rows=dbAll(db,`SELECT * FROM leads ${where} ORDER BY ${safeSort} ${safeOrd} LIMIT ${parseInt(limit)} OFFSET ${offset}`,params);
    const data=rows.map(r=>({...r,status_label:STATUS_LABELS[r.final_status]||r.final_status,source_label:SOURCE_LABELS[r.source]||r.source}));
    res.json({data,total,page:parseInt(page),limit:parseInt(limit),total_pages:Math.ceil(total/parseInt(limit))});
  } catch(e){res.status(500).json({error:e.message});}
});

router.get('/meta', async (req,res) => {
  try {
    const db=await getDb();
    const brs=dbAll(db,"SELECT DISTINCT branch FROM leads WHERE branch!='' ORDER BY branch").map(r=>r.branch);
    const ads=dbAll(db,"SELECT DISTINCT ads_staff FROM leads WHERE ads_staff!='' ORDER BY ads_staff").map(r=>r.ads_staff);
    const csk=dbAll(db,"SELECT DISTINCT cskh_staff FROM leads WHERE cskh_staff!='' ORDER BY cskh_staff").map(r=>r.cskh_staff);
    res.json({branches:[...new Set([...BRANCHES,...brs])],sources:SOURCES,source_labels:SOURCE_LABELS,data_types:DATA_TYPES,statuses:STATUSES,status_labels:STATUS_LABELS,ads_staffs:ads,cskh_staffs:csk});
  } catch(e){res.status(500).json({error:e.message});}
});

router.get('/:id', async (req,res) => {
  try {
    const db=await getDb();
    const lead=dbGet(db,'SELECT * FROM leads WHERE lead_id=? AND is_deleted=0',[req.params.id]);
    if(!lead) return res.status(404).json({error:'Lead không tồn tại'});
    const care_logs=dbAll(db,'SELECT * FROM care_logs WHERE lead_id=? ORDER BY care_number ASC',[req.params.id]);
    const change_logs=dbAll(db,'SELECT * FROM change_logs WHERE lead_id=? ORDER BY changed_at DESC LIMIT 50',[req.params.id]);
    res.json({...lead,status_label:STATUS_LABELS[lead.final_status]||lead.final_status,source_label:SOURCE_LABELS[lead.source]||lead.source,care_logs,change_logs});
  } catch(e){res.status(500).json({error:e.message});}
});

router.post('/', async (req,res) => {
  try {
    const db=await getDb();
    const data=req.body, user=req.headers['x-user']||'unknown';
    const errors=[];
    if(!data.full_name) errors.push('Thiếu họ tên');
    const phone=(data.phone||'').replace(/[\s\-\.]/g,'');
    if(!/^0\d{9}$/.test(phone)) errors.push('SĐT không hợp lệ');
    if(!data.branch)   errors.push('Thiếu chi nhánh');
    if(!data.source)   errors.push('Thiếu nguồn');
    if(!data.ads_staff)errors.push('Thiếu NV Ads');
    if(errors.length)  return res.status(400).json({error:errors.join('; ')});
    const dup=dbGet(db,'SELECT lead_id,full_name FROM leads WHERE phone=? AND branch=? AND is_deleted=0',[phone,data.branch]);
    if(dup) return res.status(409).json({warning:'duplicate',message:`SĐT ${phone} đã tồn tại tại ${data.branch} (${dup.full_name})`,existing_lead_id:dup.lead_id});
    const now=vnNow(), leadId=generateLeadId(db);
    const name=data.full_name.trim().split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
    dbRun(db,'INSERT INTO leads(lead_id,created_at,full_name,phone,branch,source,ads_staff,note,data_type,cskh_staff,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',[leadId,now,name,phone,data.branch,data.source,data.ads_staff||'',data.note||'','Data Nóng',data.cskh_staff||'',now,user]);
    dbRun(db,'INSERT INTO change_logs(lead_id,changed_by,changed_at,action,new_value,source) VALUES(?,?,?,?,?,?)',[leadId,user,now,'CREATE',JSON.stringify(data),'web']);
    res.json({success:true,lead_id:leadId});
  } catch(e){res.status(500).json({error:e.message});}
});

router.patch('/:id', async (req,res) => {
  try {
    const db=await getDb();
    const leadId=req.params.id, user=req.headers['x-user']||'unknown', body=req.body;
    const lead=dbGet(db,'SELECT * FROM leads WHERE lead_id=? AND is_deleted=0',[leadId]);
    if(!lead) return res.status(404).json({error:'Lead không tồn tại'});
    const ALLOWED=['full_name','phone','branch','source','ads_staff','note','data_type','cskh_staff','qty_closed','unit_price','total_revenue'];
    const now=vnNow();
    ALLOWED.forEach(f=>{
      if(body[f]!==undefined){
        dbRun(db,`UPDATE leads SET ${f}=?,updated_at=?,updated_by=? WHERE lead_id=?`,[body[f],now,user,leadId]);
        dbRun(db,'INSERT INTO change_logs(lead_id,changed_by,changed_at,action,field_name,old_value,new_value,source) VALUES(?,?,?,?,?,?,?,?)',[leadId,user,now,'UPDATE',f,String(lead[f]),String(body[f]),'web']);
      }
    });
    res.json({success:true,updated_at:now});
  } catch(e){res.status(500).json({error:e.message});}
});

router.delete('/:id', async (req,res) => {
  try {
    const db=await getDb();
    const user=req.headers['x-user']||'unknown';
    dbRun(db,'UPDATE leads SET is_deleted=1,updated_at=?,updated_by=? WHERE lead_id=?',[vnNow(),user,req.params.id]);
    dbRun(db,'INSERT INTO change_logs(lead_id,changed_by,changed_at,action,source) VALUES(?,?,?,?,?)',[req.params.id,user,vnNow(),'DELETE','web']);
    res.json({success:true});
  } catch(e){res.status(500).json({error:e.message});}
});

module.exports=router;
