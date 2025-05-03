// ===== CÁC HÀM XỬ LÝ CHO QUẢN LÝ KHÁCH HÀNG =====

// Thêm khách hàng mới
async function addCustomer(customerData) {
    try {
        const tx = db.transaction('customers', 'readwrite');
        const store = tx.objectStore('customers');
        
        const id = await store.add(customerData);
        await tx.done;
        
        console.log('Đã thêm khách hàng mới với ID:', id);
        
        // Cập nhật giao diện
        await displayCustomers();
        await populateCustomerDropdowns();
        
        return id;
    } catch (error) {
        console.error('Lỗi khi thêm khách hàng:', error);
        return null;
    }
}

// Hiển thị danh sách khách hàng
async function displayCustomers() {
    try {
        const customersList = document.getElementById('customers-list');
        const noCustomersMessage = document.getElementById('no-customers-message');
        
        if (!customersList || !noCustomersMessage) return;
        
        // Lấy tất cả khách hàng từ IndexedDB
        const tx = db.transaction('customers', 'readonly');
        const store = tx.objectStore('customers');
        const customers = await store.getAll();
        
        // Xóa nội dung hiện tại
        customersList.innerHTML = '';
        
        if (customers.length > 0) {
            // Ẩn thông báo không có dữ liệu
            noCustomersMessage.style.display = 'none';
            
            // Hiển thị từng khách hàng
            customers.forEach(customer => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${customer.id}</td>
                    <td>${customer.name}</td>
                    <td>${customer.contact || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-danger delete-customer-btn" data-id="${customer.id}">
                            Xóa
                        </button>
                    </td>
                `;
                
                customersList.appendChild(row);
            });
        } else {
            // Hiển thị thông báo không có dữ liệu
            noCustomersMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị khách hàng:', error);
    }
}

// Xóa khách hàng
async function deleteCustomer(customerId) {
    try {
        const tx = db.transaction('customers', 'readwrite');
        const store = tx.objectStore('customers');
        
        await store.delete(customerId);
        await tx.done;
        
        console.log('Đã xóa khách hàng với ID:', customerId);
        
        // Cập nhật giao diện
        await displayCustomers();
        await populateCustomerDropdowns();
        
        return true;
    } catch (error) {
        console.error('Lỗi khi xóa khách hàng:', error);
        return false;
    }
}

// Đổ danh sách khách hàng vào các dropdown
async function populateCustomerDropdowns() {
    try {
        // Lấy tất cả khách hàng từ IndexedDB
        const tx = db.transaction('customers', 'readonly');
        const store = tx.objectStore('customers');
        const customers = await store.getAll();
        
        // Danh sách các dropdown cần đổ dữ liệu
        const dropdowns = [
            document.getElementById('order-customer'),
            document.getElementById('payment-customer')
        ];
        
        // Đổ dữ liệu vào từng dropdown
        for (const dropdown of dropdowns) {
            if (dropdown) {
                // Lưu lại giá trị đã chọn (nếu có)
                const selectedValue = dropdown.value;
                
                // Xóa tất cả các option trừ option mặc định
                dropdown.innerHTML = '<option value="" selected disabled>Chọn khách hàng</option>';
                
                // Thêm các option mới
                customers.forEach(customer => {
                    const option = document.createElement('option');
                    option.value = customer.id;
                    option.textContent = customer.name;
                    dropdown.appendChild(option);
                });
                
                // Khôi phục giá trị đã chọn (nếu có và vẫn còn hợp lệ)
                if (selectedValue) {
                    dropdown.value = selectedValue;
                }
            }
        }
    } catch (error) {
        console.error('Lỗi khi đổ danh sách khách hàng vào dropdown:', error);
    }
}

// Lấy thông tin khách hàng theo ID
async function getCustomerById(customerId) {
    try {
        const tx = db.transaction('customers', 'readonly');
        const store = tx.objectStore('customers');
        
        const customer = await store.get(customerId);
        return customer;
    } catch (error) {
        console.error('Lỗi khi lấy thông tin khách hàng:', error);
        return null;
    }
}
