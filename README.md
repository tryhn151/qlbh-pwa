# 🏺 Gốm Sứ Nguyễn Ngọc — Quản Lý Bán Hàng

Ứng dụng web PWA để quản lý bán hàng nội bộ cho cửa hàng gốm sứ. Hoạt động hoàn toàn phía client, không cần backend riêng.

## 🌐 Hosting

**Production:** [https://ceramics-a633a.web.app/](https://ceramics-a633a.web.app/)

## ✨ Tính năng

- Quản lý khách hàng, nhà cung cấp, sản phẩm
- Quản lý đơn hàng và chuyến hàng
- Theo dõi thanh toán và công nợ
- Báo cáo doanh thu, chi phí
- Xuất/nhập dữ liệu JSON (backup thủ công)
- Đăng nhập bảo mật qua Google Account

## 🔧 Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Frontend | HTML, Vanilla JS, Bootstrap 5 |
| Database | Firebase Firestore (cloud, real-time sync) |
| Authentication | Firebase Auth — Google Sign-in |
| Hosting | Firebase Hosting |
| PWA | Service Worker |

## 🔐 Bảo mật & Phân quyền

- Chỉ tài khoản Google được whitelist mới có thể đăng nhập
- Firestore Security Rules đảm bảo không ai đọc/ghi DB nếu không có quyền
- Cấu hình whitelist trong `firebase-config.js`:

```javascript
const ALLOWED_EMAILS = [
    'xuantrinhxq2@gmail.com',
    // Thêm email khác nếu cần
];
```

- Tất cả user được phép **chia sẻ cùng một database** (phù hợp dùng nội bộ)

## 🚀 Deploy

```powershell
# Login Firebase CLI (chỉ cần 1 lần)
npx firebase login

# Deploy lên Firebase Hosting
npx firebase deploy
```

## 💻 Chạy local

```powershell
# Dùng Python
python -m http.server 8080

# Hoặc dùng Firebase emulator (sau khi đã login)
npx firebase serve --only hosting --port 5000
```

> ⚠️ **Lưu ý:** Phải mở qua HTTP server (không mở file trực tiếp) vì Firebase SDK dùng ES Modules.

## 📦 Migrate dữ liệu cũ (IndexedDB → Firestore)

Nếu có dữ liệu cũ từ phiên bản IndexedDB, dùng tool migration:

1. Mở `migrate-to-firestore.html` trên cùng domain (localhost hoặc production)
2. Đăng nhập Google
3. Nhấn **Kiểm tra dữ liệu nguồn** để xem dữ liệu IndexedDB hiện có
4. Nhấn **Bắt đầu migrate** để upload lên Firestore

## 📁 Cấu trúc chính

```
qlbh-pwa/
├── index.html              # App chính
├── firebase-config.js      # Firebase init + Auth + DB Shim
├── script.js               # Logic chính, event listeners
├── customer.js             # Module khách hàng
├── supplier.js             # Module nhà cung cấp
├── product.js              # Module sản phẩm
├── order.js                # Module đơn hàng
├── trip.js                 # Module chuyến hàng
├── payment.js              # Module thanh toán
├── debt.js                 # Module công nợ
├── report.js               # Module báo cáo
├── migrate-to-firestore.html  # Tool migrate dữ liệu
├── firebase.json           # Firebase Hosting config
└── .firebaserc             # Firebase project alias
```

## 📄 Giấy phép

[MIT](https://choosealicense.com/licenses/mit/)
