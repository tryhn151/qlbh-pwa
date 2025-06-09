# 📋 HƯỚNG DẪN WORKFLOW MỚI - QUẢN LÝ THANH TOÁN THEO ĐƠN HÀNG

## 🔄 **WORKFLOW NGHIỆP VỤ MỚI**

### **1. Tổng quan thay đổi**
- ❌ **Bỏ đi**: Tab Thanh toán riêng biệt
- ✅ **Thêm mới**: Thanh toán tích hợp trong tab Chuyến hàng
- ✅ **Cải thiện**: Quản lý công nợ theo từng đơn hàng cụ thể
- ✅ **Tự động**: Cập nhật trạng thái đơn hàng và chuyến hàng

### **2. Quy trình liên kết đơn hàng**

#### **Bước 1: Tạo chuyến hàng**
```
Tab Chuyến hàng → Thêm chuyến mới
- Tên chuyến: [Nhập tên]
- Ngày: [Chọn ngày]
- Trạng thái: Đang chuẩn bị (mặc định)
```

#### **Bước 2: Liên kết đơn hàng**
```
Chi tiết chuyến hàng → Tab "Liên kết đơn hàng"
- Chọn đơn hàng có trạng thái: "Mới" hoặc "Chờ xử lý"
- Sau khi liên kết → Trạng thái đơn hàng: "Đang xử lý"
- Đơn hàng được gán vào chuyến hàng
```

#### **Bước 3: Quản lý thanh toán**
```
Chi tiết chuyến hàng → Tab "Đơn hàng & Thanh toán"
- Xem danh sách đơn hàng đã liên kết
- Theo dõi: Tổng tiền | Đã thanh toán | Còn nợ
- Thực hiện thanh toán từng đơn hàng
```

## 💳 **CHI TIẾT QUY TRÌNH THANH TOÁN**

### **Thanh toán từng đơn hàng**

#### **Bước 1: Mở modal thanh toán**
```
Tab "Đơn hàng & Thanh toán" → Nút "Thanh toán" (với đơn hàng còn nợ)
```

#### **Bước 2: Nhập thông tin thanh toán**
```
📋 Form thanh toán:
- Khách hàng: [Hiển thị tự động]
- Tổng tiền đơn hàng: [Hiển thị tự động]
- Đã thanh toán: [Hiển thị số tiền đã thanh toán trước đó]
- Còn nợ: [Hiển thị số tiền còn lại]
- Số tiền thanh toán: [Nhập số tiền] ⭐ TỐI ĐA = Còn nợ
- Ngày thanh toán: [Chọn ngày]
- Ghi chú: [Tùy chọn]
```

#### **Bước 3: Xác nhận thanh toán**
```
✅ Hệ thống tự động:
- Cập nhật số tiền đã thanh toán cho đơn hàng
- Lưu lịch sử thanh toán
- Nếu thanh toán đủ → Chuyển trạng thái đơn hàng: "Thành công"
- Kiểm tra tất cả đơn hàng trong chuyến
- Nếu tất cả đơn hàng "Thành công" → Chuyển trạng thái chuyến hàng: "Đã giao"
```

## 📊 **LUỒNG TRẠNG THÁI**

### **Trạng thái đơn hàng**
```
Mới/Chờ xử lý → [Liên kết] → Đang xử lý → [Thanh toán đủ] → Thành công
```

### **Trạng thái chuyến hàng**
```
Đang chuẩn bị → [Có đơn hàng] → Đang thực hiện → [Tất cả đơn "Thành công"] → Đã giao
```

## 🔧 **CÔNG CỤ DEBUG VÀ TEST**

### **Debug commands (Console)**
```javascript
// Test workflow hoàn chính
testNewBusinessWorkflow()

// Test riêng từng phần
testOrderLinkingAndRevenue()
testNewPaymentWorkflow()

// Debug quick
systemHealthCheck()
```

### **Khắc phục sự cố nhanh**
```javascript
// Fix dropdown issues
fixProductSupplierDropdown()

// Test liên kết đơn hàng
quickTestOrderLinking()

// Reload toàn bộ dữ liệu
forceReloadAll()
```

## 📈 **THÔNG TIN HIỂN THỊ**

### **Chi tiết chuyến hàng - Cards tổng quan**
```
🟦 Tổng doanh thu: [Tổng giá trị tất cả đơn hàng đã liên kết]
🟥 Tổng chi phí: [Chi phí xăng dầu, phí đường, ăn uống, khác]
🟩 Lợi nhuận gộp: [Doanh thu - Chi phí] 
🟨 Đã thu: [Tổng số tiền đã thanh toán]
```

### **Bảng đơn hàng & thanh toán**
```
┌─────┬──────────────┬──────────┬───────────┬──────────┬─────────────┬──────────┬──────────┐
│ ID  │ Khách hàng   │ Ngày đặt │ Trạng thái│ Tổng tiền│ Đã thanh toán│ Còn nợ   │ Thao tác │
├─────┼──────────────┼──────────┼───────────┼──────────┼─────────────┼──────────┼──────────┤
│ 001 │ Khách A      │ 01/12    │ Đang xử lý│ 500K     │ 300K        │ 200K     │ [💳][🔗][👁] │
│ 002 │ Khách B      │ 02/12    │ Thành công│ 800K     │ 800K        │ 0        │ [🔗][👁]    │
└─────┴──────────────┴──────────┴───────────┴──────────┴─────────────┴──────────┴──────────┘

[💳] = Thanh toán | [🔗] = Hủy liên kết | [👁] = Chi tiết
```

## ⚡ **TÍNH NĂNG NỔI BẬT**

### **1. Thanh toán linh hoạt**
- ✅ Thanh toán từng phần
- ✅ Theo dõi công nợ realtime
- ✅ Lịch sử thanh toán chi tiết

### **2. Tự động hóa**
- ✅ Auto cập nhật trạng thái đơn hàng
- ✅ Auto cập nhật trạng thái chuyến hàng
- ✅ Auto tính toán doanh thu, lợi nhuận

### **3. Báo cáo tích hợp**
- ✅ Doanh thu theo chuyến
- ✅ Công nợ theo khách hàng  
- ✅ Lợi nhuận gộp realtime

## 🚨 **LƯU Ý QUAN TRỌNG**

### **❗ Ràng buộc nghiệp vụ**
1. **Không thể thanh toán quá số tiền còn nợ**
2. **Chỉ đơn hàng "Đang xử lý" mới có thể thanh toán**
3. **Đơn hàng "Thành công" không thể hủy liên kết**
4. **Chuyến hàng "Đã giao" không thể thêm đơn hàng mới**

### **❗ Dữ liệu quan trọng**
- `paymentReceived`: Số tiền đã thanh toán cho đơn hàng
- `deliveredTripId`: ID chuyến hàng liên kết với đơn hàng
- `payments`: Bảng lưu lịch sử thanh toán chi tiết

### **❗ Khác biệt với workflow cũ**
- **Cũ**: Thanh toán tổng quát cho khách hàng
- **Mới**: Thanh toán cụ thể theo từng đơn hàng
- **Cũ**: Theo dõi công nợ chung
- **Mới**: Theo dõi công nợ theo đơn hàng cụ thể

## 🎯 **KỊch bản sử dụng mẫu**

### **Kịch bản 1: Chuyến hàng hoàn tất**
```
1. Tạo chuyến hàng "Giao hàng ngày 15/12"
2. Liên kết 3 đơn hàng: A(500K), B(800K), C(300K)
3. Thực hiện giao hàng
4. Thu tiền:
   - Đơn A: Thu 300K (còn nợ 200K)
   - Đơn B: Thu đủ 800K → Trạng thái "Thành công"  
   - Đơn C: Thu đủ 300K → Trạng thái "Thành công"
5. Đi thu nợ đơn A: Thu thêm 200K → Trạng thái "Thành công"
6. Tất cả đơn "Thành công" → Chuyến hàng chuyển thành "Đã giao"
```

### **Kịch bản 2: Quản lý công nợ**
```
1. Xem tab "Công nợ" để biết khách nào đang nợ
2. Vào chi tiết chuyến hàng tương ứng
3. Xem tab "Đơn hàng & Thanh toán" 
4. Thanh toán từng đơn hàng có công nợ
5. Hệ thống tự động cập nhật trạng thái
```

---

**💡 Tip**: Sử dụng các lệnh debug trong Console để kiểm tra và khắc phục sự cố nhanh chóng! 