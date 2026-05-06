// ============================================================
// STT Marketing CRM — Server chính
// server.js  |  npm start → http://localhost:3456
// ============================================================
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');
const { initDb } = require('./database');

const app  = express();
const PORT = process.env.PORT || 3456;

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// ── Init DB ──────────────────────────────────────────────────
initDb();

// ── Routes ──────────────────────────────────────────────────
app.use('/api/leads', require('./routes/leads'));
app.use('/api/care',  require('./routes/care'));
app.use('/api/stats', require('./routes/stats'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString(), app: 'STT Marketing CRM v1.0' });
});

// Export to Excel
app.get('/api/export', (req, res) => {
  const XLSX  = require('xlsx');
  const { getDb } = require('./database');
  const db    = getDb();
  const leads = db.prepare('SELECT * FROM leads WHERE is_deleted = 0 ORDER BY created_at DESC').all();

  const STATUS_LABELS = {
    kcnc:'Không có nhu cầu', kx:'Khách xa', knnm:'Không nghe máy',
    tn:'Khách tiềm năng', lh:'Đã đặt lịch hẹn', ddh:'Đã đến hẹn', dc:'Đã chốt'
  };

  const rows = leads.map(l => ({
    'ID':              l.lead_id,
    'Ngày':           l.created_at,
    'Họ và tên':      l.full_name,
    'Số điện thoại':  l.phone,
    'Chi nhánh':      l.branch,
    'Nguồn':          l.source,
    'Nhân viên Ads':  l.ads_staff,
    'Ghi chú':        l.note,
    'Phân loại Data': l.data_type,
    'Nhân viên CSKH': l.cskh_staff,
    'Chăm sóc lần 1': l.csl1, 'Thời gian csl1': l.time_csl1,
    'Chăm sóc lần 2': l.csl2, 'Thời gian csl2': l.time_csl2,
    'Chăm sóc lần 3': l.csl3, 'Thời gian csl3': l.time_csl3,
    'Chăm sóc lần 4': l.csl4, 'Thời gian csl4': l.time_csl4,
    'Chăm sóc lần 5': l.csl5, 'Thời gian csl5': l.time_csl5,
    'Chăm sóc lần 6': l.csl6, 'Thời gian csl6': l.time_csl6,
    'Chăm sóc lần 7': l.csl7, 'Thời gian csl7': l.time_csl7,
    'Lần CSKH cuối':  l.last_care_at,
    'Trạng thái':     STATUS_LABELS[l.final_status] || l.final_status,
    'Số lượng khách': l.qty_closed,
    'Đơn giá':        l.unit_price,
    'Thành tiền':     l.total_revenue,
  }));

  const wb  = XLSX.utils.book_new();
  const ws  = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'ALL DATA');
  const buf = XLSX.write(wb, { type:'buffer', bookType:'xlsx' });

  const fname = `STT_CRM_Export_${new Date().toISOString().slice(0,10)}.xlsx`;
  res.set('Content-Disposition', `attachment; filename="${fname}"`);
  res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// Catch-all → SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n🌸 =========================================');
  console.log(`🌸  STT Marketing CRM đang chạy`);
  console.log(`🌸  http://localhost:${PORT}`);
  console.log('🌸 =========================================\n');
});

module.exports = app;