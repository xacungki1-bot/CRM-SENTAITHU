const express = require('express');
const router  = express.Router();
const { getDb, vnNow } = require('../database');
const { dbGet, dbAll, dbRun } = require('../database');

router.get('/overview', async (req,res) => {
  try {
    const db=await getDb();
    const {branch,from_date,to_date}=req.query;
    const conds=['is_deleted=0'], params=[];
    if(branch)    {conds.push('branch=?');params.push(branch);}
    if(from_date) {conds.push('created_at>=?');params.push(from_date+' 00:00:00');}
    if(to_date)   {conds.push('created_at<=?');params.push(to_date+' 23:59:59');}
    const where='WHERE '+conds.join(' AND ');
    const today=new Date(Date.now()+7*3600*1000).toISOString().slice(0,10);
    const thisMonth=today.slice(0,7);
    const g=(sql,p=[])=>dbGet(db,sql,p);
    const a=(sql,p=[])=>dbAll(db,sql,p);
    const total=g(`SELECT COUNT(*) c FROM leads ${where}`,params)?.c||0;
    const todayLeads=g(`SELECT COUNT(*) c FROM leads ${where} AND created_at LIKE ?`,[...params,today+'%'])?.c||0;
    const monthLeads=g(`SELECT COUNT(*) c FROM leads ${where} AND created_at LIKE ?`,[...params,thisMonth+'%'])?.c||0;
    const totalClosed=g(`SELECT COUNT(*) c FROM leads ${where} AND final_status='dc'`,params)?.c||0;
    const monthClosed=g(`SELECT COUNT(*) c FROM leads ${where} AND final_status='dc' AND updated_at LIKE ?`,[...params,thisMonth+'%'])?.c||0;
    const totalRevenue=g(`SELECT SUM(total_revenue) s FROM leads ${where}`,params)?.s||0;
    const monthRevenue=g(`SELECT SUM(total_revenue) s FROM leads ${where} AND created_at LIKE ?`,[...params,thisMonth+'%'])?.s||0;
    const hotUncared=g(`SELECT COUNT(*) c FROM leads ${where} AND data_type='Data Nóng' AND (final_status='' OR final_status IS NULL)`,params)?.c||0;
    const by_data_type=a(`SELECT data_type,COUNT(*) c FROM leads ${where} GROUP BY data_type ORDER BY c DESC`,params);
    const by_status=a(`SELECT final_status,COUNT(*) c FROM leads ${where} GROUP BY final_status ORDER BY c DESC`,params);
    const by_source=a(`SELECT source,COUNT(*) c FROM leads ${where} GROUP BY source ORDER BY c DESC`,params);
    const by_branch=a(`SELECT branch,COUNT(*) total,SUM(CASE WHEN final_status='dc' THEN 1 ELSE 0 END) closed,SUM(total_revenue) revenue FROM leads ${where} GROUP BY branch ORDER BY total DESC`,params);
    const daily_trend=a(`SELECT DATE(created_at) day,COUNT(*) c FROM leads WHERE is_deleted=0 ${branch?'AND branch=?':''} AND created_at>=datetime('now','-30 days','+7 hours') GROUP BY DATE(created_at) ORDER BY day ASC`,branch?[branch]:[]);
    const funnel={total,hot:g(`SELECT COUNT(*) c FROM leads ${where} AND data_type='Data Nóng'`,params)?.c||0,booked:g(`SELECT COUNT(*) c FROM leads ${where} AND final_status='lh'`,params)?.c||0,came:g(`SELECT COUNT(*) c FROM leads ${where} AND final_status='ddh'`,params)?.c||0,closed:totalClosed};
    res.json({total,today_leads:todayLeads,month_leads:monthLeads,total_closed:totalClosed,month_closed:monthClosed,total_revenue:totalRevenue,month_revenue:monthRevenue,conversion_rate:total>0?((totalClosed/total)*100).toFixed(1):0,hot_uncared:hotUncared,by_data_type,by_status,by_source,by_branch,daily_trend,funnel,generated_at:vnNow()});
  } catch(e){console.error(e);res.status(500).json({error:e.message});}
});

router.get('/staff', async (req,res) => {
  try {
    const db=await getDb();
    const {branch,month}=req.query;
    const conds=['is_deleted=0'],params=[];
    if(branch){conds.push('branch=?');params.push(branch);}
    if(month) {conds.push('created_at LIKE ?');params.push(month+'%');}
    const where='WHERE '+conds.join(' AND ');
    const ads=require('../database').dbAll(db,`SELECT ads_staff staff,COUNT(*) total_leads,SUM(CASE WHEN final_status='dc' THEN 1 ELSE 0 END) closed,SUM(total_revenue) revenue FROM leads ${where} AND ads_staff!='' GROUP BY ads_staff ORDER BY total_leads DESC`,params);
    const csk=require('../database').dbAll(db,`SELECT cskh_staff staff,COUNT(*) total_leads,SUM(CASE WHEN final_status='dc' THEN 1 ELSE 0 END) closed,SUM(total_revenue) revenue FROM leads ${where} AND cskh_staff!='' GROUP BY cskh_staff ORDER BY closed DESC`,params);
    res.json({ads_performance:ads,cskh_performance:csk});
  } catch(e){res.status(500).json({error:e.message});}
});

router.post('/reclassify', async (req,res) => {
  try {
    const db=await getDb();
    const rows=require('../database').dbAll(db,'SELECT lead_id,created_at,data_type FROM leads WHERE is_deleted=0',[]);
    const now=Date.now(); let updated=0;
    rows.forEach(lead=>{
      const days=(now-new Date(lead.created_at).getTime())/86400000;
      const newType=days<=3?'Data Nóng':days<=7?'Data Ấm':days<=30?'Data Lạnh':days<=90?'Data Băng':'Data Hóa Thạch';
      if(newType!==lead.data_type){require('../database').dbRun(db,'UPDATE leads SET data_type=? WHERE lead_id=?',[newType,lead.lead_id]);updated++;}
    });
    res.json({success:true,updated,total:rows.length});
  } catch(e){res.status(500).json({error:e.message});}
});

module.exports=router;
