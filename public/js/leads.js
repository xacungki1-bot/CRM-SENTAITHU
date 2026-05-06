// ============================================================
// STT Marketing CRM — Leads Page + Profile Page
// ============================================================

// ── State ────────────────────────────────────────────────────
let leadsState = {
  page: 1, limit: 50, filters: {}, sort: 'created_at', order: 'desc', total: 0
};

// ── Leads List Page ──────────────────────────────────────────
registerPage('leads', {
  init: async (params = {}) => {
    if (params.status)    leadsState.filters.status    = params.status;
    if (params.data_type) leadsState.filters.data_type = params.data_type;

    const container = document.getElementById('page-leads');
    container.innerHTML = `
      <!-- Filter bar -->
      <div class="card" style="margin-bottom:16px;padding:14px 18px">
        <div class="filter-bar">
          <div class="search-box">
            <input id="f-search" type="text" placeholder="Tìm tên / SĐT..." style="min-width:200px">
          </div>
          <select id="f-branch"></select>
          <select id="f-source"></select>
          <select id="f-datatype"></select>
          <select id="f-status"></select>
          <select id="f-ads-staff"></select>
          <select id="f-cskh-staff"></select>
          <input id="f-from" type="date" style="min-width:130px">
          <input id="f-to"   type="date" style="min-width:130px">
          <button class="btn btn-outline" onclick="resetFilters()">🔄 Xóa lọc</button>
          <button class="btn btn-primary" onclick="openCreateModal()">+ Thêm Lead</button>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12px;color:var(--muted)">
          <span id="leads-count">Đang tải...</span>
          <span style="margin-left:auto">Sắp xếp:
            <select id="f-sort" style="width:auto;font-size:11px;padding:3px 8px;margin:0 4px">
              <option value="created_at_desc">Mới nhất</option>
              <option value="created_at_asc">Cũ nhất</option>
              <option value="full_name_asc">Tên A-Z</option>
              <option value="final_status_desc">Trạng thái</option>
            </select>
          </span>
        </div>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Ngày</th><th>Họ tên</th><th>SĐT</th>
                <th>Chi nhánh</th><th>Nguồn</th><th>Phân loại</th>
                <th>Trạng thái</th><th>NV Ads</th><th>NV CSKH</th>
                <th>CSKH lần cuối</th><th></th>
              </tr>
            </thead>
            <tbody id="leads-tbody">
              <tr><td colspan="12" style="text-align:center;padding:32px;color:var(--muted)">Đang tải...</td></tr>
            </tbody>
          </table>
        </div>
        <div id="pagination" class="pagination"></div>
      </div>
    `;

    // Populate dropdowns
    populateSelect(document.getElementById('f-branch'),    META.branches);
    populateSelect(document.getElementById('f-source'),    META.sources.map(s => ({ value:s, label:`${s} — ${META.source_labels[s]||s}` })));
    populateSelect(document.getElementById('f-datatype'),  META.data_types);
    populateSelect(document.getElementById('f-status'),    META.statuses.map(s => ({ value:s, label:META.status_labels[s]||s })));
    populateSelect(document.getElementById('f-ads-staff'), META.ads_staffs, 'NV Ads');
    populateSelect(document.getElementById('f-cskh-staff'),META.cskh_staffs, 'NV CSKH');

    // Khôi phục filter state
    if (leadsState.filters.status)    document.getElementById('f-status').value   = leadsState.filters.status;
    if (leadsState.filters.data_type) document.getElementById('f-datatype').value = leadsState.filters.data_type;

    // Events
    ['f-search','f-branch','f-source','f-datatype','f-status',
     'f-ads-staff','f-cskh-staff','f-from','f-to'].forEach(id => {
      const el = document.getElementById(id);
      el?.addEventListener('change', applyFilters);
      if (id === 'f-search') el?.addEventListener('input', debounce(applyFilters, 400));
    });
    document.getElementById('f-sort')?.addEventListener('change', e => {
      const [s, o] = e.target.value.split('_desc').length > 1
        ? [e.target.value.replace('_desc',''), 'desc']
        : [e.target.value.replace('_asc',''), 'asc'];
      leadsState.sort  = s;
      leadsState.order = o;
      leadsState.page  = 1;
      loadLeads();
    });

    await loadLeads();
  },
  cleanup: () => { leadsState.filters = {}; leadsState.page = 1; }
});

function applyFilters() {
  leadsState.filters = {
    search:     document.getElementById('f-search')?.value || '',
    branch:     document.getElementById('f-branch')?.value || '',
    source:     document.getElementById('f-source')?.value || '',
    data_type:  document.getElementById('f-datatype')?.value || '',
    status:     document.getElementById('f-status')?.value || '',
    ads_staff:  document.getElementById('f-ads-staff')?.value || '',
    cskh_staff: document.getElementById('f-cskh-staff')?.value || '',
    from_date:  document.getElementById('f-from')?.value || '',
    to_date:    document.getElementById('f-to')?.value || '',
  };
  leadsState.page = 1;
  loadLeads();
}

function resetFilters() {
  leadsState.filters = {};
  leadsState.page = 1;
  ['f-search','f-branch','f-source','f-datatype','f-status',
   'f-ads-staff','f-cskh-staff','f-from','f-to'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  loadLeads();
}

async function loadLeads() {
  try {
    const data = await get('/leads', {
      ...leadsState.filters,
      page:  leadsState.page,
      limit: leadsState.limit,
      sort:  leadsState.sort,
      order: leadsState.order,
    });
    leadsState.total = data.total;
    renderLeadsTable(data.data);
    renderPagination(data.total, data.page, data.limit);
    document.getElementById('leads-count').textContent =
      `Tổng ${data.total.toLocaleString()} lead${leadsState.filters.search ? ` — tìm: "${leadsState.filters.search}"` : ''}`;
  } catch(e) {
    toast('Lỗi tải danh sách: ' + e.message, 'error');
  }
}

function renderLeadsTable(leads) {
  const tbody = document.getElementById('leads-tbody');
  if (!leads.length) {
    tbody.innerHTML = `
      <tr><td colspan="12">
        <div class="empty-state"><div class="icon">📋</div><p>Không có lead nào phù hợp bộ lọc</p></div>
      </td></tr>`;
    return;
  }
  tbody.innerHTML = leads.map(l => `
    <tr onclick="openProfile('${l.lead_id}')">
      <td style="font-family:monospace;font-size:11px;color:var(--muted)">${l.lead_id}</td>
      <td style="white-space:nowrap">${fmtDate(l.created_at)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:7px">
          <div style="width:28px;height:28px;border-radius:50%;background:var(--gold-light);color:var(--gold-deep);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0">
            ${avatarInitial(l.full_name)}
          </div>
          <div>
            <div style="font-weight:600">${l.full_name}</div>
          </div>
        </div>
      </td>
      <td><a href="tel:${l.phone}" onclick="event.stopPropagation()" style="color:var(--info);text-decoration:none">${l.phone}</a></td>
      <td style="font-size:12px">${l.branch || '—'}</td>
      <td>${badgeSource(l.source)}</td>
      <td>${badgeDtype(l.data_type)}</td>
      <td>${badgeStatus(l.final_status)}</td>
      <td style="font-size:12px">${l.ads_staff || '—'}</td>
      <td style="font-size:12px">${l.cskh_staff || '—'}</td>
      <td style="font-size:11px;color:var(--muted);white-space:nowrap">${fmtDateTime(l.last_care_at)}</td>
      <td onclick="event.stopPropagation()">
        <div style="display:flex;gap:5px">
          <button class="btn btn-sm btn-outline" onclick="openProfile('${l.lead_id}')">CSKH</button>
          <button class="btn btn-sm btn-danger" onclick="deleteLead('${l.lead_id}',event)">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderPagination(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  const el = document.getElementById('pagination');
  if (totalPages <= 1) { el.innerHTML = ''; return; }

  let html = `<span class="page-info">Trang ${page}/${totalPages} (${total.toLocaleString()} kết quả)</span>`;

  if (page > 1) html += `<div class="page-btn" onclick="goPage(1)">«</div><div class="page-btn" onclick="goPage(${page-1})">‹</div>`;

  const start = Math.max(1, page-2), end = Math.min(totalPages, page+2);
  for (let i = start; i <= end; i++) {
    html += `<div class="page-btn${i===page?' active':''}" onclick="goPage(${i})">${i}</div>`;
  }
  if (page < totalPages) html += `<div class="page-btn" onclick="goPage(${page+1})">›</div><div class="page-btn" onclick="goPage(${totalPages})">»</div>`;

  el.innerHTML = html;
}

function goPage(p) { leadsState.page = p; loadLeads(); }

// ── CREATE Lead Modal ────────────────────────────────────────
function openCreateModal(prefillData = {}) {
  const branchOptions  = META.branches.map(b => `<option value="${b}" ${b===prefillData.branch?'selected':''}>${b}</option>`).join('');
  const sourceOptions  = META.sources.map(s => `<option value="${s}" ${s===prefillData.source?'selected':''}>${s} — ${META.source_labels[s]||s}</option>`).join('');

  const overlay = showModal(`
    <div class="modal-header">
      <span class="modal-title">➕ Thêm Lead Mới</span>
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <div id="create-alert"></div>
      <div class="pinned-section">
        <div class="pinned-title">📌 1. Thông tin chung (bắt buộc)</div>
        <div class="form-row">
          <div class="form-group">
            <label class="pinned required">Chi nhánh</label>
            <select id="new-branch"><option value="">-- Chọn --</option>${branchOptions}</select>
          </div>
          <div class="form-group">
            <label class="pinned required">Số điện thoại</label>
            <input id="new-phone" type="tel" placeholder="09xx xxx xxx" value="${prefillData.phone||''}">
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="required">Họ và tên</label>
          <input id="new-name" type="text" placeholder="Nguyễn Thị A" value="${prefillData.full_name||''}">
        </div>
        <div class="form-group">
          <label class="required">Nguồn</label>
          <select id="new-source"><option value="">-- Chọn --</option>${sourceOptions}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="required">Nhân viên Ads</label>
          <input id="new-ads-staff" type="text" placeholder="Tên NV Ads" value="${prefillData.ads_staff||''}">
        </div>
        <div class="form-group">
          <label>Nhân viên CSKH</label>
          <input id="new-cskh-staff" type="text" placeholder="Tên NV CSKH" value="${prefillData.cskh_staff||''}">
        </div>
      </div>
      <div class="form-group">
        <label>Ghi chú</label>
        <textarea id="new-note" rows="2" placeholder="Nhu cầu khách hàng...">${prefillData.note||''}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Hủy</button>
      <button class="btn btn-primary" onclick="submitCreate(this.closest('.modal-overlay'))">Tạo Lead</button>
    </div>
  `);
}

async function submitCreate(overlay) {
  const alertEl = overlay.querySelector('#create-alert');
  const data = {
    full_name:  overlay.querySelector('#new-name').value.trim(),
    phone:      overlay.querySelector('#new-phone').value.replace(/\s/g,''),
    branch:     overlay.querySelector('#new-branch').value,
    source:     overlay.querySelector('#new-source').value,
    ads_staff:  overlay.querySelector('#new-ads-staff').value.trim(),
    cskh_staff: overlay.querySelector('#new-cskh-staff').value.trim(),
    note:       overlay.querySelector('#new-note').value.trim(),
  };

  try {
    const result = await post('/leads', data);
    if (result.warning === 'duplicate') {
      alertEl.innerHTML = `
        <div class="alert alert-warning">
          ⚠️ ${result.message}
          <button class="btn btn-sm btn-outline" style="margin-left:8px"
            onclick="overlay.remove();openProfile('${result.existing_lead_id}')">
            Xem lead cũ
          </button>
        </div>`;
      return;
    }
    toast('✅ Tạo lead thành công: ' + result.lead_id);
    overlay.remove();
    loadLeads();
  } catch(e) {
    alertEl.innerHTML = `<div class="alert alert-error">❌ ${e.message}</div>`;
  }
}

async function deleteLead(leadId, event) {
  event?.stopPropagation();
  if (!confirm('Xóa lead này? (Có thể khôi phục từ nhật ký)')) return;
  try {
    await del('/leads/' + leadId);
    toast('Đã xóa lead');
    loadLeads();
  } catch(e) {
    toast('Lỗi xóa: ' + e.message, 'error');
  }
}

// ── PROFILE Page ─────────────────────────────────────────────
let profileLeadId = null;

registerPage('profile', {
  init: async (params = {}) => {
    if (params.id) profileLeadId = params.id;
    if (!profileLeadId) { navigate('leads'); return; }
    await loadProfile(profileLeadId);
  },
  cleanup: () => {}
});

function openProfile(leadId) {
  profileLeadId = leadId;
  navigate('profile', { id: leadId });
}

async function loadProfile(leadId) {
  const container = document.getElementById('page-profile');
  container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">Đang tải...</div>';

  try {
    const lead = await get('/leads/' + leadId);
    renderProfile(lead);
  } catch(e) {
    container.innerHTML = `<div class="alert alert-error">❌ ${e.message}</div>`;
  }
}

function renderProfile(lead) {
  const STATUS_COLORS_MAP = { kcnc:'#6B7280',kx:'#2563EB',knnm:'#DC2626',tn:'#059669',lh:'#D97706',ddh:'#16A34A',dc:'#047857' };
  const container = document.getElementById('page-profile');

  const careHtml = lead.care_logs?.length
    ? lead.care_logs.map(c => `
        <div class="timeline-item">
          <div class="timeline-dot" style="background:${STATUS_COLORS_MAP[c.status]||'#6B7280'}20;color:${STATUS_COLORS_MAP[c.status]||'#6B7280'}">
            ${c.care_number}
          </div>
          <div class="timeline-content">
            <div class="timeline-status">${STATUS_LABELS[c.status] || c.status}</div>
            <div class="timeline-meta">${fmtDateTime(c.cared_at)} · ${c.cskh_staff || '—'}</div>
            ${c.note ? `<div style="font-size:12px;color:var(--muted);margin-top:3px">${c.note}</div>` : ''}
          </div>
        </div>
      `).join('')
    : '<div class="empty-state"><p>Chưa có lần chăm sóc nào</p></div>';

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <button class="btn btn-outline btn-sm" onclick="navigate('leads')">← Danh sách</button>
      <span style="font-size:12px;color:var(--muted);font-family:monospace">${lead.lead_id}</span>
    </div>

    <div style="display:grid;grid-template-columns:1fr 360px;gap:18px">

      <!-- Left: Info + Timeline -->
      <div style="display:flex;flex-direction:column;gap:16px">

        <!-- Header card -->
        <div class="card">
          <div class="card-body">
            <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:16px">
              <div style="width:50px;height:50px;border-radius:50%;background:var(--gold-light);color:var(--gold-deep);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;flex-shrink:0">
                ${avatarInitial(lead.full_name)}
              </div>
              <div style="flex:1">
                <div style="font-size:20px;font-weight:700;margin-bottom:4px">${lead.full_name}</div>
                <div style="font-size:13px;color:var(--muted);margin-bottom:4px">
                  📞 <a href="tel:${lead.phone}" style="color:var(--info);text-decoration:none">${lead.phone}</a>
                  &nbsp;·&nbsp; 🏢 ${lead.branch || '—'}
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                  ${badgeSource(lead.source)}
                  ${badgeDtype(lead.data_type)}
                  ${badgeStatus(lead.final_status)}
                </div>
              </div>
              <button class="btn btn-primary" onclick="openAddCareModal('${lead.lead_id}')">
                + Thêm CSKH
              </button>
            </div>

            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding-top:14px;border-top:1px solid var(--gold-border)">
              ${[
                ['Ngày tạo',    fmtDate(lead.created_at)],
                ['NV Ads',      lead.ads_staff || '—'],
                ['NV CSKH',     lead.cskh_staff || '—'],
                ['Số lần CSKH', lead.care_count + ' lần'],
              ].map(([l,v]) => `
                <div style="background:var(--bg);border-radius:8px;padding:9px 10px">
                  <div style="font-size:10px;color:var(--muted);font-weight:500;margin-bottom:3px">${l}</div>
                  <div style="font-size:13px;font-weight:600">${v}</div>
                </div>
              `).join('')}
            </div>

            ${lead.note ? `<div style="margin-top:12px;padding:10px 12px;background:var(--gold-bg);border-radius:8px;font-size:13px;color:var(--muted)"><strong>Ghi chú:</strong> ${lead.note}</div>` : ''}
          </div>
        </div>

        <!-- Timeline CSKH -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">📋 Lịch sử chăm sóc</span>
            <button class="btn btn-sm btn-primary" onclick="openAddCareModal('${lead.lead_id}')">+ Thêm</button>
          </div>
          <div class="card-body">
            <div class="timeline">${careHtml}</div>
          </div>
        </div>
      </div>

      <!-- Right: Edit form + Chốt -->
      <div style="display:flex;flex-direction:column;gap:14px">

        <!-- Chốt dịch vụ -->
        ${lead.final_status === 'dc' || lead.qty_closed ? `
        <div class="card">
          <div class="card-header"><span class="card-title">💰 Thông tin chốt</span></div>
          <div class="card-body">
            ${[
              ['Số lượng', lead.qty_closed || '—'],
              ['Đơn giá', fmtMoney(lead.unit_price)],
              ['Thành tiền', fmtMoney(lead.total_revenue)],
            ].map(([l,v]) => `
              <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--gold-border);font-size:13px">
                <span style="color:var(--muted)">${l}</span>
                <span style="font-weight:600">${v}</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Cập nhật thông tin -->
        <div class="card">
          <div class="card-header"><span class="card-title">✏️ Cập nhật</span></div>
          <div class="card-body">
            <div class="form-group">
              <label>Nhân viên CSKH</label>
              <input id="edit-cskh" type="text" value="${lead.cskh_staff||''}">
            </div>
            <div class="form-group">
              <label>Ghi chú</label>
              <textarea id="edit-note" rows="2">${lead.note||''}</textarea>
            </div>
            ${lead.final_status === 'dc' ? `
            <div class="form-group"><label>Số lượng khách</label><input id="edit-qty" type="number" value="${lead.qty_closed||''}"></div>
            <div class="form-group"><label>Đơn giá (đ)</label><input id="edit-price" type="number" value="${lead.unit_price||''}"></div>
            ` : ''}
            <button class="btn btn-primary" style="width:100%" onclick="saveLeadUpdates('${lead.lead_id}')">Lưu thay đổi</button>
          </div>
        </div>

        <!-- Nhật ký thay đổi -->
        <div class="card">
          <div class="card-header"><span class="card-title">📝 Nhật ký</span></div>
          <div class="card-body" style="max-height:300px;overflow-y:auto">
            ${lead.change_logs?.length
              ? lead.change_logs.slice(0,15).map(c => `
                  <div style="font-size:11px;padding:6px 0;border-bottom:1px solid var(--gold-border)">
                    <div style="color:var(--muted)">${fmtDateTime(c.changed_at)} · ${c.changed_by}</div>
                    <div><strong>${c.action}</strong> ${c.field_name ? `· ${c.field_name}` : ''} ${c.old_value&&c.new_value ? `<span style="color:var(--danger)">${c.old_value}</span> → <span style="color:var(--success)">${c.new_value}</span>` : ''}</div>
                  </div>
                `).join('')
              : '<div class="text-muted" style="font-size:12px">Chưa có nhật ký</div>'}
          </div>
        </div>
      </div>
    </div>
  `;
}

async function saveLeadUpdates(leadId) {
  const updates = {};
  const cskh = document.getElementById('edit-cskh')?.value?.trim();
  const note  = document.getElementById('edit-note')?.value?.trim();
  const qty   = document.getElementById('edit-qty')?.value;
  const price = document.getElementById('edit-price')?.value;

  if (cskh !== undefined) updates.cskh_staff  = cskh;
  if (note !== undefined)  updates.note         = note;
  if (qty)  { updates.qty_closed   = parseFloat(qty); }
  if (price){ updates.unit_price   = parseFloat(price);
              updates.total_revenue = (parseFloat(qty)||1) * parseFloat(price); }

  try {
    await patch('/leads/' + leadId, updates);
    toast('✅ Đã lưu thay đổi');
    loadProfile(leadId);
  } catch(e) { toast('Lỗi: ' + e.message, 'error'); }
}

// ── Add Care Modal ────────────────────────────────────────────
function openAddCareModal(leadId) {
  const opts = Object.entries(STATUS_LABELS).map(([v,l]) =>
    `<option value="${v}">${l}</option>`
  ).join('');

  const overlay = showModal(`
    <div class="modal-header">
      <span class="modal-title">📋 Thêm lần chăm sóc</span>
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <div id="care-alert"></div>
      <div class="form-group">
        <label class="required">Kết quả chăm sóc</label>
        <select id="care-status" style="font-size:14px;padding:11px 12px">
          <option value="">-- Chọn trạng thái --</option>${opts}
        </select>
      </div>
      <div class="form-group">
        <label>Nhân viên thực hiện</label>
        <input id="care-staff" type="text" placeholder="Tên nhân viên">
      </div>
      <div class="form-group">
        <label>Ghi chú</label>
        <textarea id="care-note" rows="2" placeholder="Khách nói gì, hẹn như thế nào..."></textarea>
      </div>
      <div id="closed-extra" style="display:none">
        <div class="form-row">
          <div class="form-group">
            <label>Số lượng khách</label>
            <input id="care-qty" type="number" placeholder="1">
          </div>
          <div class="form-group">
            <label>Đơn giá (đ)</label>
            <input id="care-price" type="number" placeholder="500000">
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Hủy</button>
      <button class="btn btn-primary" onclick="submitCare('${leadId}',this.closest('.modal-overlay'))">Lưu</button>
    </div>
  `);

  overlay.querySelector('#care-status').addEventListener('change', e => {
    overlay.querySelector('#closed-extra').style.display = e.target.value === 'dc' ? 'block' : 'none';
  });
}

async function submitCare(leadId, overlay) {
  const status = overlay.querySelector('#care-status').value;
  if (!status) { overlay.querySelector('#care-alert').innerHTML = '<div class="alert alert-error">Chọn trạng thái</div>'; return; }

  const body = {
    lead_id:    leadId,
    status,
    cskh_staff: overlay.querySelector('#care-staff').value.trim(),
    note:       overlay.querySelector('#care-note').value.trim(),
  };

  // Nếu đã chốt → cập nhật luôn thông tin chốt
  if (status === 'dc') {
    const qty   = parseFloat(overlay.querySelector('#care-qty')?.value || 0);
    const price = parseFloat(overlay.querySelector('#care-price')?.value || 0);
    if (qty && price) {
      await patch('/leads/' + leadId, { qty_closed:qty, unit_price:price, total_revenue:qty*price });
    }
  }

  try {
    const res = await post('/care', body);
    toast(`✅ Ghi nhận: ${res.status_label || status} (lần ${res.care_number})`);
    overlay.remove();
    loadProfile(leadId);
    if (currentPage === 'leads') loadLeads();
  } catch(e) {
    overlay.querySelector('#care-alert').innerHTML = `<div class="alert alert-error">❌ ${e.message}</div>`;
  }
}

// ── Utils ─────────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
