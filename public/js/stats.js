// ============================================================
// STT Marketing CRM — Stats & Changelog Pages
// ============================================================

// ── Stats Page ───────────────────────────────────────────────
registerPage('stats', {
  init: async () => {
    const container = document.getElementById('page-stats');
    container.innerHTML = `
      <div class="filter-bar" style="margin-bottom:18px">
        <select id="s-branch"></select>
        <input id="s-month" type="month" value="${new Date().toISOString().slice(0,7)}">
        <button class="btn btn-primary" onclick="loadStats()">🔍 Xem báo cáo</button>
        <button class="btn btn-outline" onclick="window.location.href='/api/export'">📥 Xuất Excel</button>
        <button class="btn btn-outline" onclick="reclassify()">🔄 Cập nhật phân loại Data</button>
      </div>
      <div id="stats-content">
        <div style="text-align:center;padding:40px;color:var(--muted)">Chọn bộ lọc và nhấn "Xem báo cáo"</div>
      </div>
    `;
    populateSelect(document.getElementById('s-branch'), META.branches);
    await loadStats();
  },
  cleanup: () => {}
});

async function loadStats() {
  const branch  = document.getElementById('s-branch')?.value || '';
  const month   = document.getElementById('s-month')?.value || '';
  const params  = {};
  if (branch) params.branch = branch;
  if (month)  { params.from_date = month + '-01'; params.to_date = month + '-31'; }

  const [overview, staffData] = await Promise.all([
    get('/stats/overview', params),
    get('/stats/staff', { branch, month }),
  ]);

  document.getElementById('stats-content').innerHTML = `

    <!-- Summary KPIs -->
    <div class="kpi-grid" style="margin-bottom:18px">
      <div class="kpi-card accent">
        <div class="kpi-label">Tổng Lead kỳ này</div>
        <div class="kpi-value">${overview.total.toLocaleString()}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Tỷ lệ chốt</div>
        <div class="kpi-value" style="color:var(--success)">${overview.conversion_rate}%</div>
        <div class="kpi-sub">${overview.total_closed} / ${overview.total} lead</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Doanh thu chốt</div>
        <div class="kpi-value" style="color:var(--gold)">${fmtMoney(overview.total_revenue)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Avg doanh thu / lead chốt</div>
        <div class="kpi-value">${overview.total_closed ? fmtMoney(Math.round(overview.total_revenue/overview.total_closed)) : '—'}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

      <!-- Hiệu suất NV Ads -->
      <div class="card">
        <div class="card-header"><span class="card-title">👤 Hiệu suất NV Ads</span></div>
        <div class="card-body">
          <table style="width:100%;font-size:12px">
            <thead><tr>
              <th>Nhân viên</th><th>Tổng lead</th><th>Chốt</th><th>Tỷ lệ</th><th>Doanh thu</th>
            </tr></thead>
            <tbody>
              ${staffData.ads_performance?.length
                ? staffData.ads_performance.map(s => `
                    <tr>
                      <td style="font-weight:600">${s.staff}</td>
                      <td>${s.total_leads}</td>
                      <td style="color:var(--success)">${s.closed}</td>
                      <td>${s.total_leads ? Math.round(s.closed/s.total_leads*100) : 0}%</td>
                      <td>${fmtMoney(s.revenue)}</td>
                    </tr>
                  `).join('')
                : '<tr><td colspan="5" style="text-align:center;color:var(--muted)">Không có dữ liệu</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Hiệu suất CSKH -->
      <div class="card">
        <div class="card-header"><span class="card-title">📞 Hiệu suất NV CSKH</span></div>
        <div class="card-body">
          <table style="width:100%;font-size:12px">
            <thead><tr>
              <th>Nhân viên</th><th>Phụ trách</th><th>Chốt</th><th>Tỷ lệ</th><th>Doanh thu</th>
            </tr></thead>
            <tbody>
              ${staffData.cskh_performance?.length
                ? staffData.cskh_performance.map(s => `
                    <tr>
                      <td style="font-weight:600">${s.staff}</td>
                      <td>${s.total_leads}</td>
                      <td style="color:var(--success)">${s.closed}</td>
                      <td>${s.total_leads ? Math.round(s.closed/s.total_leads*100) : 0}%</td>
                      <td>${fmtMoney(s.revenue)}</td>
                    </tr>
                  `).join('')
                : '<tr><td colspan="5" style="text-align:center;color:var(--muted)">Không có dữ liệu</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Chi nhánh -->
    <div class="card">
      <div class="card-header"><span class="card-title">🏢 Hiệu suất theo chi nhánh</span></div>
      <div class="card-body table-wrap">
        <table style="font-size:12px">
          <thead><tr>
            <th>Chi nhánh</th><th>Tổng lead</th><th>Data Nóng</th><th>Đã chốt</th>
            <th>Tỷ lệ chốt</th><th>Doanh thu</th>
          </tr></thead>
          <tbody>
            ${overview.by_branch?.map(b => `
              <tr onclick="navigate('leads',{branch:'${b.branch}'})" style="cursor:pointer">
                <td style="font-weight:600">${b.branch||'Chưa xác định'}</td>
                <td>${b.total}</td>
                <td>—</td>
                <td style="color:var(--success)">${b.closed}</td>
                <td>${b.total ? Math.round(b.closed/b.total*100) : 0}%</td>
                <td style="color:var(--gold);font-weight:600">${fmtMoney(b.revenue)}</td>
              </tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--muted)">Không có dữ liệu</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function reclassify() {
  try {
    const res = await apiFetch('/stats/reclassify', { method:'POST', body:'{}' });
    toast(`✅ Đã cập nhật ${res.updated}/${res.total} lead`);
    if (currentPage === 'dashboard') navigate('dashboard');
  } catch(e) { toast('Lỗi: ' + e.message, 'error'); }
}

// ── Changelog Page ───────────────────────────────────────────
registerPage('changelog', {
  init: async () => {
    const container = document.getElementById('page-changelog');
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">📝 Nhật ký thay đổi toàn hệ thống</span>
          <span style="font-size:12px;color:var(--muted)">Realtime từ database</span>
        </div>
        <div class="card-body" id="changelog-body">
          <div style="text-align:center;padding:32px;color:var(--muted)">Đang tải...</div>
        </div>
      </div>
    `;
    // Tạo route get changelog nếu cần — dùng tạm ở đây
    const { getDb } = window; // không dùng được → sẽ fetch qua API
    try {
      const data = await get('/leads', { limit:1 }); // just a ping
      // Vì chưa có /api/changelog riêng → hiển thị từ leads
      document.getElementById('changelog-body').innerHTML = `
        <div class="alert alert-info">
          Nhật ký chi tiết xem trong hồ sơ từng khách hàng.<br>
          Tất cả thay đổi được ghi vào bảng <code>change_logs</code> trong <code>data/crm.db</code>.
        </div>
        <div style="font-size:13px;line-height:2">
          <strong>Cách xem nhật ký toàn hệ thống:</strong><br>
          1. Mở Terminal tại thư mục dự án<br>
          2. Chạy: <code>sqlite3 data/crm.db</code><br>
          3. Truy vấn: <code>SELECT * FROM change_logs ORDER BY changed_at DESC LIMIT 50;</code>
        </div>
      `;
    } catch(e) {}
  },
  cleanup: () => {}
});

registerPage('settings', {
  init: () => {
    document.getElementById('page-settings').innerHTML = `
      <div class="card">
        <div class="card-header"><span class="card-title">⚙️ Cài đặt hệ thống</span></div>
        <div class="card-body">
          <div class="form-group">
            <label>Tên người dùng</label>
            <input id="set-name" type="text" value="${CURRENT_USER.name}" style="max-width:300px">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input id="set-email" type="email" value="${CURRENT_USER.email}" style="max-width:300px">
          </div>
          <div class="form-group">
            <label>Chi nhánh phụ trách</label>
            <select id="set-branch" style="max-width:300px">
              <option value="">Toàn hệ thống</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="saveSettings()">Lưu cài đặt</button>
          <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--gold-border)">
            <div class="card-title" style="margin-bottom:10px">Thao tác dữ liệu</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-outline" onclick="reclassify()">🔄 Cập nhật phân loại Data</button>
              <button class="btn btn-outline" onclick="window.location.href='/api/export'">📥 Xuất Excel</button>
            </div>
          </div>
        </div>
      </div>
    `;
    populateSelect(document.getElementById('set-branch'), META.branches);
    if (CURRENT_USER.branch) document.getElementById('set-branch').value = CURRENT_USER.branch;
  },
  cleanup: () => {}
});

function saveSettings() {
  CURRENT_USER.name   = document.getElementById('set-name')?.value || CURRENT_USER.name;
  CURRENT_USER.email  = document.getElementById('set-email')?.value || CURRENT_USER.email;
  CURRENT_USER.branch = document.getElementById('set-branch')?.value || '';
  document.getElementById('sidebar-user-name').textContent = CURRENT_USER.name;
  document.getElementById('sidebar-user-avatar').textContent = CURRENT_USER.name.charAt(0);
  toast('✅ Đã lưu cài đặt');
}
