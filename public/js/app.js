// ============================================================
// STT Marketing CRM — App Core
// public/js/app.js
// ============================================================

const API = '/api';
let META  = {};  // dropdown values
let CURRENT_USER = { email: 'user@sentaithu.vn', name: 'Nhân viên', role: 'staff', branch: '' };

// ── Routing đơn giản ─────────────────────────────────────────
const PAGES = {};

function registerPage(id, { init, cleanup }) {
  PAGES[id] = { init, cleanup };
}

let currentPage = null;

function navigate(pageId, params = {}) {
  if (currentPage && PAGES[currentPage]?.cleanup) PAGES[currentPage].cleanup();
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const el = document.getElementById(`page-${pageId}`);
  if (el) { el.style.display = 'block'; }
  const nav = document.querySelector(`[data-page="${pageId}"]`);
  if (nav) { nav.classList.add('active'); }

  const titleEl = document.getElementById('page-title');
  const titles  = {
    dashboard: '📊 Dashboard tổng quan',
    leads:     '📋 Danh sách Lead',
    profile:   '👤 Hồ sơ khách hàng',
    stats:     '📈 Báo cáo & Thống kê',
    changelog: '📝 Nhật ký thay đổi',
    settings:  '⚙️ Cài đặt',
  };
  if (titleEl) titleEl.textContent = titles[pageId] || pageId;

  currentPage = pageId;
  if (PAGES[pageId]?.init) PAGES[pageId].init(params);
  window.location.hash = '#' + pageId;
}

// ── API helpers ──────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const url     = API + path;
  const headers = {
    'Content-Type': 'application/json',
    'X-User': CURRENT_USER.email,
    ...opts.headers,
  };
  const res = await fetch(url, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Lỗi hệ thống');
  return data;
}

const get  = (path, params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([,v]) => v !== '' && v != null)
  ).toString();
  return apiFetch(path + (qs ? '?'+qs : ''));
};
const post = (path, body) => apiFetch(path, { method:'POST',  body: JSON.stringify(body) });
const patch= (path, body) => apiFetch(path, { method:'PATCH', body: JSON.stringify(body) });
const del  = (path)       => apiFetch(path, { method:'DELETE' });

// ── Toast ────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Modal helpers ─────────────────────────────────────────────
function showModal(html, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.addEventListener('click', e => {
    if (e.target === overlay) { overlay.remove(); if (onClose) onClose(); }
  });
  document.body.appendChild(overlay);
  return overlay;
}
function closeModal(overlay) { overlay?.remove(); }

// ── Format helpers ───────────────────────────────────────────
const STATUS_LABELS = {
  kcnc:'Không có nhu cầu', kx:'Khách xa', knnm:'Không nghe máy',
  tn:'Khách tiềm năng', lh:'Đã đặt lịch hẹn', ddh:'Đã đến hẹn', dc:'Đã chốt'
};
const STATUS_COLORS = {
  kcnc:'kcnc', kx:'kx', knnm:'knnm', tn:'tn', lh:'lh', ddh:'ddh', dc:'dc'
};
const SOURCE_LABELS = {
  FA:'Facebook Ads', G:'Google Ads', H:'Hotline',
  FR:'Form', Z:'Zalo', TT:'TikTok', T:'Telesale'
};
const DTYPE_BADGE = {
  'Data Nóng':'hot', 'Data Ấm':'warm', 'Data Lạnh':'cold',
  'Data Băng':'ice', 'Data Hóa Thạch':'fossil'
};

function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function fmtDateTime(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
}
function fmtMoney(n) {
  if (!n) return '—';
  return Number(n).toLocaleString('vi-VN') + 'đ';
}

function badgeDtype(dtype) {
  const cls = DTYPE_BADGE[dtype] || 'fossil';
  return `<span class="badge badge-${cls}">${dtype || '—'}</span>`;
}
function badgeStatus(status) {
  const cls   = STATUS_COLORS[status] || '';
  const label = STATUS_LABELS[status] || status || '—';
  return `<span class="badge badge-${cls}">${label}</span>`;
}
function badgeSource(src) {
  return `<span class="badge badge-${src}">${src || '—'}</span>`;
}

function avatarInitial(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts[parts.length - 1].charAt(0).toUpperCase();
}

// ── Populate select ───────────────────────────────────────────
function populateSelect(el, options, placeholder = 'Tất cả') {
  el.innerHTML = `<option value="">${placeholder}</option>`;
  options.forEach(opt => {
    if (typeof opt === 'string') {
      el.innerHTML += `<option value="${opt}">${opt}</option>`;
    } else {
      el.innerHTML += `<option value="${opt.value}">${opt.label}</option>`;
    }
  });
}

// ── Load meta ─────────────────────────────────────────────────
async function loadMeta() {
  META = await get('/leads/meta');
}

// ── Init app ─────────────────────────────────────────────────
async function initApp() {
  // Load metadata
  await loadMeta();

  // Render sidebar user
  document.getElementById('sidebar-user-name').textContent = CURRENT_USER.name;
  document.getElementById('sidebar-user-role').textContent = CURRENT_USER.role;
  document.getElementById('sidebar-user-avatar').textContent = CURRENT_USER.name.charAt(0);

  // Nav click
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.page));
  });

  // Initial page from hash
  const hash = window.location.hash.replace('#','') || 'dashboard';
  navigate(hash);

  // Nút export
  document.getElementById('btn-export')?.addEventListener('click', () => {
    window.location.href = '/api/export';
  });
}

document.addEventListener('DOMContentLoaded', initApp);
