// ===== CÁC HÀM XỬ LÝ CHO QUẢN LÝ THANH TOÁN =====

// Thêm thanh toán mới
async function addCustomerPayment(paymentData) {
    try {
        const tx = db.transaction('customerPayments', 'readwrite');
        const store = tx.objectStore('customerPayments');
        
        const id = await store.add(paymentData);
        await tx.done;
        
        console.log('Đã thêm thanh toán mới với ID:', id);
        
        // Cập nhật giao diện
        await displayPayments();
        
        return id;
    } catch (error) {
        console.error('Lỗi khi thêm thanh toán:', error);
        return null;
    }
}

// Hiển thị danh sách thanh toán
async function displayPayments() {
    try {
        const paymentsList = document.getElementById('payments-list');
        const noPaymentsMessage = document.getElementById('no-payments-message');
        
        if (!paymentsList || !noPaymentsMessage) return;
        
        // Lấy tất cả thanh toán từ IndexedDB
        const tx = db.transaction(['customerPayments', 'customers', 'orders'], 'readonly');
        const paymentStore = tx.objectStore('customerPayments');
        const customerStore = tx.objectStore('customers');
        const orderStore = tx.objectStore('orders');
        const payments = await paymentStore.getAll();
        
        // Xóa nội dung hiện tại
        paymentsList.innerHTML = '';
        
        if (payments.length > 0) {
            // Ẩn thông báo không có dữ liệu
            noPaymentsMessage.style.display = 'none';
            
            // Hiển thị từng thanh toán
            for (const payment of payments) {
                // Lấy thông tin khách hàng
                const customer = await customerStore.get(payment.customerId);
                const customerName = customer ? customer.name : 'Không xác định';
                
                // Lấy thông tin đơn hàng (nếu có)
                let orderInfo = 'Thanh toán chung';
                if (payment.orderId) {
                    const order = await orderStore.get(payment.orderId);
                    if (order) {
                        orderInfo = `Đơn hàng #${order.id}`;
                    }
                }
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${payment.id}</td>
                    <td>${customerName}</td>
                    <td class="currency">${formatCurrency(payment.paymentAmount)}</td>
                    <td>${formatDate(payment.paymentDate)}</td>
                    <td>${orderInfo}</td>
                    <td>
                        <button class="btn btn-sm btn-danger delete-payment-btn" data-id="${payment.id}">
                            Xóa
                        </button>
                    </td>
                `;
                
                paymentsList.appendChild(row);
            }
        } else {
            // Hiển thị thông báo không có dữ liệu
            noPaymentsMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị thanh toán:', error);
    }
}

// Xóa thanh toán
async function deleteCustomerPayment(paymentId) {
    try {
        const tx = db.transaction('customerPayments', 'readwrite');
        const store = tx.objectStore('customerPayments');
        
        await store.delete(paymentId);
        await tx.done;
        
        console.log('Đã xóa thanh toán với ID:', paymentId);
        
        // Cập nhật giao diện
        await displayPayments();
        
        return true;
    } catch (error) {
        console.error('Lỗi khi xóa thanh toán:', error);
        return false;
    }
}
