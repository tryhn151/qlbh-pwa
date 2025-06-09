# 📋 HƯỚNG DẪN SỬ DỤNG ỨNG DỤNG QUẢN LÝ BÁN HÀNG

## 🎯 **GIỚI THIỆU CHUNG**

Ứng dụng Quản lý Bán hàng là một Progressive Web App (PWA) được thiết kế để hỗ trợ các cửa hàng nhỏ, cá nhân kinh doanh quản lý toàn bộ quy trình bán hàng từ A-Z mà không cần backend server.

### **✨ Tính năng chính:**
- 👥 **Quản lý khách hàng**: Thêm, sửa, xóa, tìm kiếm thông tin khách hàng
- 📦 **Quản lý đơn hàng**: Tạo đơn hàng với nhiều sản phẩm, theo dõi trạng thái giao hàng
- 🚛 **Quản lý chuyến hàng**: Lập kế hoạch và theo dõi các chuyến giao hàng
- 🏪 **Quản lý nhà cung cấp**: Thông tin các đối tác cung cấp hàng hóa
- 🛍️ **Quản lý sản phẩm**: Danh mục sản phẩm và quản lý giá cả
- 💰 **Thanh toán & Công nợ**: Theo dõi thanh toán và quản lý công nợ khách hàng
- 📊 **Báo cáo**: Thống kê doanh thu, lợi nhuận theo nhiều tiêu chí

### **💾 Đặc điểm kỹ thuật:**
- ⚡ **Hoạt động offline**: Không cần internet sau khi tải lần đầu
- 💾 **Lưu trữ local**: Sử dụng IndexedDB, dữ liệu lưu trên máy khách
- 📱 **Tương thích di động**: Giao diện responsive, có thể cài đặt như app
- 🔄 **Backup/Restore**: Xuất/nhập dữ liệu dạng JSON

---

## 🚀 **CÁCH CÀI ĐẶT VÀ KHỞI CHẠY**

### **Phương pháp 1: Sử dụng trực tiếp**
1. Tải về hoặc clone dự án về máy
2. Mở file `index.html` bằng trình duyệt (khuyến nghị Chrome/Edge)
3. Ứng dụng sẽ tự động khởi tạo database và sẵn sàng sử dụng

### **Phương pháp 2: Chạy với Local Server (khuyến nghị)**
```bash
# Sử dụng Python
python -m http.server 8000

# Hoặc sử dụng Node.js
npx serve .

# Hoặc sử dụng PHP
php -S localhost:8000
```
Sau đó truy cập: `http://localhost:8000`

### **Cài đặt như PWA**
1. Mở ứng dụng trong trình duyệt
2. Nhấn nút "Cài đặt" trên thanh địa chỉ (Chrome/Edge)
3. Hoặc vào Menu > "Cài đặt Quản lý Bán hàng"

---

## 📖 **HƯỚNG DẪN SỬ DỤNG CHI TIẾT**

### **1. 👥 TAB KHÁCH HÀNG**

#### **Thêm khách hàng mới:**
1. Nhập **Tên khách hàng** (bắt buộc)
2. Nhập **Liên hệ** (số điện thoại/email - tùy chọn)
3. Nhấn **"Lưu khách hàng"**

#### **Tìm kiếm khách hàng:**
- Sử dụng ô tìm kiếm để lọc theo tên hoặc thông tin liên hệ
- Kết quả hiển thị ngay khi gõ

#### **Chỉnh sửa/xóa khách hàng:**
- Nhấn nút **"Sửa"** để chỉnh sửa thông tin
- Nhấn nút **"Xóa"** để xóa khách hàng (cần xác nhận)

---

### **2. 📦 TAB ĐỚN HÀNG**

#### **Tạo đơn hàng mới:**
1. Chọn **khách hàng** từ dropdown
2. Thêm sản phẩm:
   - Nhập **tên sản phẩm**
   - Nhập **số lượng**
   - Nhập **giá bán**
   - Nhấn **"Thêm sản phẩm"** để thêm dòng mới
3. Nhấn **"Lưu đơn hàng"**

#### **Quản lý đơn hàng:**
- Xem danh sách tất cả đơn hàng với thông tin tóm tắt
- Nhấn **"Chi tiết"** để xem chi tiết đơn hàng
- Nhấn **"Xóa"** để hủy đơn hàng

---

### **3. 🚛 TAB CHUYẾN HÀNG**

#### **Tạo chuyến hàng:**
1. Nhập **tên chuyến hàng**
2. Chọn **ngày xuất phát**
3. Chọn các **đơn hàng** cần giao
4. Nhấn **"Tạo chuyến hàng"**

#### **Quản lý chuyến hàng:**
- Xem danh sách các chuyến hàng
- Theo dõi trạng thái: Chưa xuất phát / Đang giao / Hoàn thành
- Nhấn **"Chi tiết"** để xem thông tin đầy đủ

---

### **4. 🏪 TAB NHÀ CUNG CẤP**

#### **Thêm nhà cung cấp:**
1. Nhập **tên nhà cung cấp**
2. Nhập **địa chỉ**
3. Nhập **thông tin liên hệ**
4. Chọn **khu vực**
5. Nhấn **"Lưu nhà cung cấp"**

---

### **5. 🛍️ TAB SẢN PHẨM**

#### **Thêm sản phẩm:**
1. Nhập **tên sản phẩm**
2. Nhập **mã sản phẩm** (tùy chọn)
3. Chọn **đơn vị tính**
4. Nhập **giá nhập**
5. Chọn **nhà cung cấp**
6. Nhấn **"Lưu sản phẩm"**

#### **Quản lý giá bán theo khách hàng:**
- Có thể set giá bán khác nhau cho từng khách hàng
- Sử dụng tính năng **"Thiết lập giá"**

---

### **6. 💰 TAB THANH TOÁN**

#### **Ghi nhận thanh toán:**
1. Chọn **khách hàng**
2. Nhập **số tiền thanh toán**
3. Chọn **phương thức** (Tiền mặt/Chuyển khoản)
4. Thêm **ghi chú** (tùy chọn)
5. Nhấn **"Lưu thanh toán"**

---

### **7. 📊 TAB CÔNG NỢ**

#### **Theo dõi công nợ:**
- Xem tổng quan số liệu công nợ
- Danh sách khách hàng đang nợ
- Phân biệt nợ thường và nợ quá hạn
- Tìm kiếm theo tên khách hàng

---

### **8. 📈 TAB BÁO CÁO**

#### **Các loại báo cáo:**
- **Theo chuyến hàng**: Lợi nhuận từng chuyến
- **Theo tháng**: Tổng hợp doanh thu/lợi nhuận theo tháng
- **Theo năm**: Báo cáo tổng quan cả năm

#### **Quản lý dữ liệu:**
- **Xuất dữ liệu**: Tải về file JSON chứa toàn bộ dữ liệu
- **Nhập dữ liệu**: Khôi phục từ file JSON đã sao lưu

---

## ⚠️ **LƯU Ý QUAN TRỌNG**

### **Backup dữ liệu:**
- Thường xuyên xuất dữ liệu để sao lưu
- Lưu file backup ở nhiều nơi khác nhau
- Kiểm tra file backup định kỳ

### **Bảo mật:**
- Dữ liệu lưu trên máy tính cá nhân
- Không chia sẻ file backup chứa thông tin nhạy cảm
- Sử dụng mật khẩu máy tính để bảo vệ

### **Hiệu suất:**
- Ứng dụng hoạt động tốt với vài nghìn bản ghi
- Nếu dữ liệu quá lớn, nên phân chia theo thời gian
- Xóa dữ liệu cũ không cần thiết định kỳ

### **Khắc phục sự cố:**
- Nếu ứng dụng bị lỗi, thử tải lại trang
- Xóa cache trình duyệt nếu có vấn đề
- Kiểm tra console (F12) để xem thông báo lỗi

---

## 🆘 **HỖ TRỢ VÀ TROUBLESHOOTING**

### **Các lỗi thường gặp:**

#### **Lỗi "Database không khởi tạo được":**
- Kiểm tra trình duyệt có hỗ trợ IndexedDB
- Xóa dữ liệu site trong Settings > Privacy
- Thử trình duyệt khác (Chrome/Edge khuyến nghị)

#### **Lỗi "Thư viện idb chưa được tải":**
- Kiểm tra kết nối internet
- Tải lại trang (Ctrl+F5)
- Kiểm tra file script.js có bị sửa đổi

#### **Dữ liệu bị mất:**
- Khôi phục từ file backup JSON
- Kiểm tra lịch sử trình duyệt xem có trang nào khác
- Dữ liệu có thể vẫn còn nếu chưa xóa cache

### **Yêu cầu hệ thống:**
- **Trình duyệt**: Chrome 63+, Edge 79+, Firefox 58+, Safari 11.1+
- **Hệ điều hành**: Windows 7+, macOS 10.12+, Linux (any)
- **RAM**: Tối thiểu 2GB
- **Dung lượng**: ~10MB cho ứng dụng + dữ liệu

---

## 📞 **LIÊN HỆ HỖ TRỢ**

Nếu gặp vấn đề không thể tự giải quyết:
1. Chụp màn hình lỗi
2. Mở Console (F12) và chụp thông báo lỗi
3. Mô tả chi tiết các bước dẫn đến lỗi
4. Cung cấp thông tin trình duyệt và hệ điều hành

**Chúc bạn sử dụng ứng dụng hiệu quả!** 🎉 