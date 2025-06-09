# Hướng Dẫn Debug Dropdown Nhà Cung Cấp

## **Vấn đề:** 
Dropdown nhà cung cấp trong tab sản phẩm bị trống mặc dù đã có nhà cung cấp trong hệ thống.

## **Các bước debug:**

### **Bước 1: Mở Developer Tools**
- Nhấn `F12` hoặc `Ctrl+Shift+I` để mở Developer Tools
- Chuyển đến tab `Console`

### **Bước 2: Chạy debug functions**
Trong console, gõ các lệnh sau:

```javascript
// Kiểm tra dropdown hiện tại
debugSupplierDropdowns()
```

Kết quả mong đợi:
- Sẽ hiển thị danh sách tất cả dropdown nhà cung cấp trên trang
- Kiểm tra xem có tìm thấy `#product-supplier` không
- Kiểm tra xem dropdown có options nào không

```javascript
// Test populate dropdown
testPopulateSupplierDropdowns()
```

### **Bước 3: Nếu vẫn trống, thử các lệnh sau:**

```javascript
// Populate thủ công
await populateSupplierDropdowns()

// Hoặc load lại module nhà cung cấp
await window.loadSupplierModule()

// Sau đó chuyển đến tab sản phẩm và kiểm tra lại
```

### **Bước 4: Kiểm tra dữ liệu trong database**

```javascript
// Kiểm tra có nhà cung cấp trong DB không
window.db.transaction('suppliers', 'readonly')
  .objectStore('suppliers')
  .getAll()
  .then(suppliers => {
    console.log('Nhà cung cấp trong DB:', suppliers)
  })
```

### **Bước 5: Force populate sau khi thêm nhà cung cấp**

Sau khi thêm nhà cung cấp mới:
```javascript
// Chuyển sang tab sản phẩm
// Sau đó chạy lệnh này
await populateSupplierDropdowns()
```

## **Các thay đổi đã thực hiện:**

1. **Sửa selector dropdown**: 
   - Trước: chỉ tìm `[data-supplier-dropdown]`
   - Sau: tìm `.supplier-select, #product-supplier, [data-supplier-dropdown]`

2. **Thêm populate trong tab switching**:
   - Khi chuyển đến tab sản phẩm tự động populate supplier dropdown

3. **Thêm populate trong loadInitialData**:
   - Sau khi load tất cả modules, tự động populate tất cả dropdown

4. **Thêm fallback populate**:
   - Delay 1 giây sau khi load xong để đảm bảo

## **Nếu vẫn không hoạt động:**

### **Kiểm tra thứ tự load file script**
Đảm bảo trong `index.html` các file được load theo thứ tự:
```html
<script src="script.js"></script>
<script src="customer.js"></script>
<script src="supplier.js"></script>  <!-- Phải có -->
<script src="product.js"></script>    <!-- Phải có -->
<script src="order.js"></script>
<script src="debug_dropdown.js"></script>  <!-- File debug -->
```

### **Hard reload trang**
- Nhấn `Ctrl+Shift+R` để hard reload
- Hoặc `Ctrl+F5`

### **Kiểm tra Network tab**
- Trong Developer Tools, tab Network
- Reload trang và kiểm tra xem tất cả JS files có load thành công không
- Nếu có file nào 404 hoặc lỗi, cần sửa path

## **Test case đầy đủ:**

1. **Thêm nhà cung cấp mới** trong tab "Nhà cung cấp"
2. **Chuyển sang tab "Sản phẩm"**
3. **Kiểm tra dropdown** nhà cung cấp trong form thêm sản phẩm
4. **Dropdown phải có nhà cung cấp vừa thêm**

Nếu bước 4 fail, chạy: `await populateSupplierDropdowns()`

---

*File debug: debug_dropdown.js*  
*Console functions: debugSupplierDropdowns(), testPopulateSupplierDropdowns()* 