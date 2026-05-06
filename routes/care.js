const express = require('express');
const router  = express.Router();
const { getDb, vnNow } = require('../database');
const { dbGet, dbAll, dbRun } = require('../database');
const STATUS_LABELS={kcnc:'Không có nhu cầu',kx:'Khách xa',knnm:'Không nghe máy',tn:'Khách tiềm năng',lh:'Đã đặt lịch hẹn',ddh:'Đã đến hẹn',dc:'Đã chốt'};

router.get('/:leadId', async (req,res) => {
  try {
    const db=await getDb();
    const logs=dbAll(db,'SELECT * FROM care_logs WHERE lead_id=? ORDER BY care_number ASC',[req.params.leadId]);
    res.json(logs.map(l=>({...l,status_label:STATUS_LABELS[l.status]||l.status})));
  } catch(e){res.status(500).json({error:e.message});}
});

router.post('/', async (req,res) => {
  try {
    const db=await getDb();
    const {lead_id,status,note,cskh_staff}=req.body;
    const user=req.headers['x-user']||'unknown';
    if(!lead_id||!status) return res.status(400).json({error:'Thiếu lead_id hoặc status'});
    const lead=dbGet(db,'SELECT * FROM leads WHERE lead_id=? AND is_deleted=0',[lead_id]);
    if(!lead) return res.status(404).json({error:'Lead không tồn tại'});
    const now=vnNow(), careNumber=(lead.care_count||0)+1;
    const logId=`${lead_id}-C${careNumber}`;
    const staff=cskh_staff||lead.cskh_staff||user;
    dbRun(db,'INSERT INTO care_logs(log_id,lead_id,care_number,status,cared_at,cskh_staff,note,created_by) VALUES(?,?,?,?,?,?,?,?)',[logId,lead_id,careNumber,status,now,staff,note||'',user]);
    dbRun(db,'UPDATE leads SET final_status=?,last_care_at=?,care_count=?,updated_at=?,updated_by=? WHERE lead_id=?',[status,now,careNumber,now,user,lead_id]);
    if(careNumber<=7){
      dbRun(db,`UPDATE leads SET csl${careNumber}=?,time_csl${careNumber}=? WHERE lead_id=?`,[status,now,lead_id]);
    }
    dbRun(db,'INSERT INTO change_logs(lead_id,changed_by,changed_at,action,field_name,old_value,new_value,source) VALUES(?,?,?,?,?,?,?,?)',[lead_id,user,now,'CARE','CSL'+careNumber,lead.final_status,status,'web']);
    res.json({success:true,care_number:careNumber,status_label:STATUS_LABELS[status]||status});
  } catch(e){res.status(500).json({error:e.message});}
});

module.exports=router;
