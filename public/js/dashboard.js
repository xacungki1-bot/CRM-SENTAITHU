// ============================================================
// STT Marketing CRM — Dashboard Page
// ============================================================

registerPage('dashboard', {
  init: async () => {
    const container = document.getElementById('page-dashboard');
    container.innerHTML = `
      <div class="kpi-grid" id="kpi-grid">
        ${[1,2,3,4].map(()=>`<div class="kpi-card"><div style="height:60px;background:#F5F0E8;border-radius:8px;animation:pulse 1.5s infinite"></div></div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:18px;margin-bottom:18px">
        <div class="card" id="card-trend">
          <div class="card-header"><span class="card-title">Lead theo ngày (30 ngày)</span></div>
          <div class="card-body" id="chart-trend"></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Phân loại Data</span></div>
          <div class="card-body" id="chart-dtype"></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px">
        <div class="card">
          <div class="card-header"><span class="card-title">Nguồn Lead</span></div>
          <div class="card-body" id="chart-source"></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Funnel chuyển đổi</span></div>
          <div class="card-body" id="chart-funnel"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">Top chi nhánh</span>
            <button class="btn btn-sm btn-outline" onclick="navigate('leads')">Xem tất cả</button>
          </div>
          <div class="card-body" id="chart-branch"></div>
        </div>
      </div>
    `;

    try {
      const stats = await get('/stats/overview');
      renderKpis(stats);
      renderTrend(stats.daily_trend);
      renderBarChart('chart-dtype',   stats.by_data_type,  'data_type', 'c', '#C9A84C');
      renderBarChart('chart-source',  stats.by_source,     'source',    'c', '#2563EB');
      renderFunnel(stats.funnel);
      renderBranchTable(stats.by_branch);
    } catch(e) {
      console.error(e);
      toast('Lỗi tải dashboard: ' + e.message, 'error');
    }
  },
  cleanup: () => {}
});

function renderKpis(s) {
  document.getElementById('kpi-grid').innerHTML = `
    <div class="kpi-card accent" onclick="navigate('leads')">
      <div class="kpi-label">📊 Tổng Lead</div>
      <div class="kpi-value">${s.total.toLocaleString()}</div>
      <div class="kpi-sub">Hôm nay: +${s.today_leads} · Tháng: +${s.month_leads}</div>
    </div>
    <div class="kpi-card" onclick="navigate('leads',{status:'dc'})">
      <div class="kpi-label">✅ Đã Chốt</div>
      <div class="kpi-value" style="color:var(--success)">${s.total_closed.toLocaleString()}</div>
      <div class="kpi-sub">Tỷ lệ: ${s.conversion_rate}% · Tháng: ${s.month_closed}</div>
    </div>
    <div class="kpi-card" onclick="navigate('leads',{data_type:'Data Nóng'})">
      <div class="kpi-label">🔥 Data Nóng Chưa CSKH</div>
      <div class="kpi-value" style="color:${s.hot_uncared>0?'var(--danger)':'var(--success)'}">${s.hot_uncared}</div>
      <div class="kpi-sub">${s.hot_uncared>0?'⚠️ Cần xử lý ngay':'✓ Đã xử lý hết'}</div>
    </div>
    <div class="kpi-card" onclick="navigate('stats')">
      <div class="kpi-label">💰 Doanh Thu Chốt</div>
      <div class="kpi-value" style="color:var(--gold)">${fmtMoney(s.total_revenue)}</div>
      <div class="kpi-sub">Tháng này: ${fmtMoney(s.month_revenue)}</div>
    </div>
  `;
}

function renderTrend(data) {
  if (!data || !data.length) {
    document.getElementById('chart-trend').innerHTML = '<div class="empty-state"><p>Chưa có dữ liệu</p></div>';
    return;
  }
  const max = Math.max(...data.map(d => d.c), 1);
  const html = `
    <div style="display:flex;align-items:flex-end;gap:3px;height:120px;border-bottom:1px solid var(--gold-border);padding-bottom:4px">
      ${data.map(d => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
          <div title="${d.day}: ${d.c} leads"
               style="width:100%;background:var(--gold);border-radius:3px 3px 0 0;
                      height:${Math.max(4, (d.c/max)*100)}px;
                      opacity:.8;cursor:pointer;transition:opacity .15s"
               onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=.8">
          </div>
        </div>
      `).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:var(--muted)">
      <span>${data[0]?.day?.slice(5)||''}</span>
      <span>${data[Math.floor(data.length/2)]?.day?.slice(5)||''}</span>
      <span>${data[data.length-1]?.day?.slice(5)||''}</span>
    </div>
  `;
  document.getElementById('chart-trend').innerHTML = html;
}

function renderBarChart(elId, data, labelKey, countKey, color) {
  if (!data || !data.length) {
    document.getElementById(elId).innerHTML = '<div class="empty-state"><p>Không có dữ liệu</p></div>';
    return;
  }
  const max = Math.max(...data.map(d => d[countKey]), 1);
  const SOURCE_LABELS_LOCAL = {
    FA:'Facebook Ads', G:'Google Ads', H:'Hotline',
    FR:'Form', Z:'Zalo', TT:'TikTok', T:'Telesale'
  };
  document.getElementById(elId).innerHTML = `
    <div class="bar-chart">
      ${data.map(d => `
        <div class="bar-row">
          <div class="bar-label">${SOURCE_LABELS_LOCAL[d[labelKey]] || d[labelKey] || '—'}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${(d[countKey]/max*100)}%;background:${color}"></div>
          </div>
          <div class="bar-value">${d[countKey]}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderFunnel(f) {
  const steps = [
    { label:'Tổng Lead',        count:f.total,  color:'#6B7280', pct:100 },
    { label:'Data Nóng',        count:f.hot,    color:'#DC2626', pct:f.total?Math.round(f.hot/f.total*100):0 },
    { label:'Đã đặt lịch hẹn', count:f.booked, color:'#D97706', pct:f.total?Math.round(f.booked/f.total*100):0 },
    { label:'Đã đến hẹn',       count:f.came,   color:'#2563EB', pct:f.total?Math.round(f.came/f.total*100):0 },
    { label:'Đã Chốt',          count:f.closed, color:'#059669', pct:f.total?Math.round(f.closed/f.total*100):0 },
  ];
  document.getElementById('chart-funnel').innerHTML = `
    <div class="funnel">
      ${steps.map((s, i) => `
        <div class="funnel-step" style="background:${s.color};width:${100-(i*12)}%;min-width:70%">
          <span>${s.label}</span>
          <span class="count">${s.count} <small style="font-size:11px;opacity:.8">(${s.pct}%)</small></span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderBranchTable(data) {
  if (!data || !data.length) {
    document.getElementById('chart-branch').innerHTML = '<div class="empty-state"><p>Không có dữ liệu</p></div>';
    return;
  }
  const maxTotal = Math.max(...data.map(d => d.total), 1);
  document.getElementById('chart-branch').innerHTML = `
    <div style="font-size:12px">
      ${data.slice(0,8).map((b, i) => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--gold-border)">
          <span style="font-weight:700;color:var(--gold);min-width:18px">${i+1}.</span>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.branch||'Chưa xác định'}</span>
          <div style="width:50px;height:5px;background:var(--gold-bg);border-radius:3px;overflow:hidden">
            <div style="height:100%;background:var(--gold);width:${b.total/maxTotal*100}%"></div>
          </div>
          <span style="font-weight:600;min-width:24px;text-align:right">${b.total}</span>
          <span style="color:var(--success);min-width:24px;text-align:right;font-size:11px">✓${b.closed}</span>
        </div>
      `).join('')}
    </div>
  `;
}
