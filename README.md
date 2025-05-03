# Ứng dụng Quản lý Bán hàng Cá nhân

Một ứng dụng web tiến bộ (PWA) đơn giản để quản lý bán hàng cá nhân, hoạt động hoàn toàn ở phía client mà không cần backend.

## Tính năng

- Thêm, xem và xóa đơn hàng
- Tự động tính toán tổng tiền
- Xuất/nhập dữ liệu dưới dạng JSON
- Hoạt động offline (PWA)
- Lưu trữ dữ liệu cục bộ bằng IndexedDB

## Công nghệ sử dụng

- HTML, CSS, JavaScript thuần (Vanilla JS)
- Bootstrap 5 cho giao diện người dùng
- IndexedDB với thư viện idb để lưu trữ dữ liệu
- Service Worker cho tính năng offline

## Cách sử dụng

1. Mở ứng dụng trong trình duyệt
2. Nhập thông tin sản phẩm, số lượng và giá
3. Nhấn "Thêm đơn hàng" để lưu
4. Xem danh sách đơn hàng và tổng tiền
5. Sử dụng các nút "Export Data" và "Import Data" để sao lưu hoặc khôi phục dữ liệu

## Cài đặt cục bộ

1. Clone repository này
2. Mở file `index.html` trong trình duyệt web

## Giấy phép

[MIT](https://choosealicense.com/licenses/mit/)
