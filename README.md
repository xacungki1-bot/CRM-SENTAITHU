# 🌸 STT Marketing CRM

Hệ thống quản lý lead Marketing cho **13 chi nhánh Sen Tài Thu Group**  
Dựa trên file `[MKT]-All_Data.xlsx` — đồng bộ 2 chiều SQLite ↔ Web

---

## 🚀 Cài đặt & Chạy (5 phút)

### Yêu cầu
- Node.js >= 16
- npm

### Bước 1 — Cài dependencies

```bash
cd stt-crm-mkt
npm install
```

### Bước 2 — Import dữ liệu từ Excel

```bash
node scripts/import-excel.js
```

> ✅ Script tự động đọc `data/MKT_All_Data.xlsx` và import vào SQLite

### Bước 3 — Chạy server

```bash
npm start
```

Mở trình duyệt: **http://localhost:3456**

---

## 📁 Cấu trúc dự án

```
stt-crm-mkt/
├── server.js              # Express server + API
├── database.js            # SQLite init + helpers
├── routes/
│   ├── leads.js           # CRUD leads
│   ├── care.js            # Lịch sử CSKH
│   └── stats.js           # Thống kê + Dashboard
├── public/
│   ├── index.html         # SPA shell
│   ├── css/style.css      # Light Luxury UI
│   └── js/
│       ├── app.js         # Core routing, API, utils
│       ├── dashboard.js   # Dashboard page
│       ├── leads.js       # Danh sách + Hồ sơ khách
│       └── stats.js       # Báo cáo + Cài đặt
├── scripts/
│   └── import-excel.js    # Import [MKT]-All_Data.xlsx
└── data/
    ├── MKT_All_Data.xlsx  # File gốc (đặt vào đây)
    └── crm.db             # SQLite database (tự tạo)
```

---

## 🔄 Đồng bộ 2 chiều

### Web → Database (SQLite)
- Mọi thao tác trên web ghi ngay vào `data/crm.db`
- Mỗi thay đổi ghi nhật ký trong bảng `change_logs`

### Database → Web
- Web đọc trực tiếp từ SQLite qua API mỗi lần load
- Không có cache tĩnh — luôn lấy data mới nhất

### Export ra Excel
- Truy cập: http://localhost:3456/api/export
- Hoặc nhấn nút **📥 Xuất Excel** trong app
- Format giống cấu trúc sheet "ALL DATA" gốc

### Import từ Excel vào DB
```bash
node scripts/import-excel.js
```

---

## 📊 API Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/leads` | Danh sách lead (có filter, phân trang) |
| GET | `/api/leads/meta` | Dropdown values (chi nhánh, nguồn...) |
| GET | `/api/leads/:id` | Chi tiết 1 lead + care logs + change logs |
| POST | `/api/leads` | Tạo lead mới |
| PATCH | `/api/leads/:id` | Cập nhật field |
| DELETE | `/api/leads/:id` | Soft delete |
| GET | `/api/care/:leadId` | Lịch sử CSKH |
| POST | `/api/care` | Thêm lần CSKH |
| GET | `/api/stats/overview` | Tổng quan dashboard |
| GET | `/api/stats/staff` | Hiệu suất nhân viên |
| POST | `/api/stats/reclassify` | Cập nhật phân loại data |
| GET | `/api/export` | Xuất Excel |

---

## 🗄️ Database Schema

### leads
- `lead_id` TEXT — STT-YYYYMMDD-XXXX (khóa chính)
- `phone` TEXT — Số điện thoại (chống trùng với branch)
- `branch` TEXT — Chi nhánh (13 CN)
- `source` TEXT — FA/G/H/FR/Z/TT/T
- `data_type` TEXT — Data Nóng/Ấm/Lạnh/Băng/Hóa Thạch
- `final_status` TEXT — kcnc/kx/knnm/tn/lh/ddh/dc
- `csl1..7`, `time_csl1..7` — Backward compat với Excel

### care_logs
- Bảng dọc — không giới hạn 7 lần
- Mỗi lần CSKH = 1 row

### change_logs
- Nhật ký mọi thay đổi
- `source`: 'web' | 'import' | 'sheet'

---

## 📋 Quy chuẩn (theo file gốc)

### Nguồn lead
| Ký hiệu | Nguồn |
|---------|-------|
| FA | Facebook Ads |
| G | Google Ads |
| H | Hotline |
| FR | Form |
| Z | Zalo |
| TT | TikTok |
| T | Telesale |

### Phân loại Data
| Loại | Điều kiện |
|------|----------|
| Data Nóng | ≤ 3 ngày |
| Data Ấm | ≤ 7 ngày |
| Data Lạnh | ≤ 30 ngày |
| Data Băng | ≤ 90 ngày |
| Data Hóa Thạch | > 90 ngày |

### Trạng thái CSKH
| Ký hiệu | Ý nghĩa |
|---------|---------|
| kcnc | Không có nhu cầu |
| kx | Khách xa |
| knnm | Không nghe máy |
| tn | Khách tiềm năng |
| lh | Đã đặt lịch hẹn |
| ddh | Đã đến hẹn |
| dc | Đã chốt |

---

## ⚙️ Cấu hình

Thay đổi port trong `server.js`:
```javascript
const PORT = process.env.PORT || 3456;
```

Hoặc chạy với port khác:
```bash
PORT=8080 npm start
```

---

## 🔧 Xem database trực tiếp

```bash
# Cài sqlite3 CLI nếu chưa có
brew install sqlite3   # macOS
apt install sqlite3    # Ubuntu

# Mở database
sqlite3 data/crm.db

# Các lệnh hữu ích
.tables               -- Xem tất cả bảng
SELECT COUNT(*) FROM leads;
SELECT * FROM change_logs ORDER BY changed_at DESC LIMIT 10;
SELECT final_status, COUNT(*) FROM leads GROUP BY final_status;
.quit
```

---

## 📞 Hỗ trợ

File gốc có vấn đề → xem phần "Lỗi phát hiện" trong tài liệu thiết kế.  
Để thêm chi nhánh mới → sửa mảng `BRANCHES` trong `routes/leads.js`.
