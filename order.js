// ===== CÁC HÀM XỬ LÝ CHO QUẢN LÝ ĐƠN HÀNG =====

// Thêm dòng sản phẩm vào form đơn hàng
function addOrderItemRow() {
    const orderItemsContainer = document.getElementById('order-items');
    if (!orderItemsContainer) return;

    const newItem = document.createElement('div');
    newItem.className = 'order-item mb-2 p-2 border rounded';
    newItem.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <label class="form-label mb-0">Tên sản phẩm</label>
            <button type="button" class="btn btn-sm btn-outline-danger remove-item-btn">
                <i class="bi bi-x"></i> Xóa
            </button>
        </div>
        <div class="mb-2">
            <input type="text" class="form-control product-name" required>
        </div>
        <div class="row">
            <div class="col-6 mb-2">
                <label class="form-label">Số lượng</label>
                <input type="number" class="form-control product-qty" min="1" value="1" required>
            </div>
            <div class="col-6 mb-2">
                <label class="form-label">Giá bán (VNĐ)</label>
                <input type="number" class="form-control product-price" min="0" required>
            </div>
        </div>
    `;

    // Thêm sự kiện xóa dòng sản phẩm
    newItem.querySelector('.remove-item-btn').addEventListener('click', function() {
        orderItemsContainer.removeChild(newItem);
    });

    orderItemsContainer.appendChild(newItem);
}

// Thêm đơn hàng mới
async function addOrder(orderData) {
    try {
        // Đảm bảo có trường dueDate và paymentStatus
        if (!orderData.dueDate) {
            // Mặc định hạn thanh toán là 30 ngày sau ngày đặt hàng
            orderData.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }

        if (!orderData.paymentStatus) {
            orderData.paymentStatus = 'Chưa thanh toán';
        }

        const tx = db.transaction('orders', 'readwrite');
        const store = tx.objectStore('orders');

        const id = await store.add(orderData);
        await tx.done;

        console.log('Đã thêm đơn hàng mới với ID:', id);

        // Cập nhật giao diện
        await displayOrders();

        return id;
    } catch (error) {
        console.error('Lỗi khi thêm đơn hàng:', error);
        return null;
    }
}

// Hiển thị danh sách đơn hàng
async function displayOrders() {
    try {
        const ordersList = document.getElementById('orders-list');
        const noOrdersMessage = document.getElementById('no-orders-message');

        if (!ordersList || !noOrdersMessage) return;

        // Lấy tất cả đơn hàng từ IndexedDB
        const tx = db.transaction(['orders', 'customers'], 'readonly');
        const orderStore = tx.objectStore('orders');
        const customerStore = tx.objectStore('customers');
        const orders = await orderStore.getAll();

        // Xóa nội dung hiện tại
        ordersList.innerHTML = '';

        if (orders.length > 0) {
            // Ẩn thông báo không có dữ liệu
            noOrdersMessage.style.display = 'none';

            // Hiển thị từng đơn hàng
            for (const order of orders) {
                // Lấy thông tin khách hàng
                const customer = await customerStore.get(order.customerId);
                const customerName = customer ? customer.name : 'Không xác định';

                // Tính tổng tiền đơn hàng
                let totalAmount = 0;
                if (order.items && order.items.length > 0) {
                    totalAmount = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${order.id}</td>
                    <td>${customerName}</td>
                    <td>${formatDate(order.orderDate)}</td>
                    <td><span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></td>
                    <td class="currency">${formatCurrency(totalAmount)}</td>
                    <td>
                        <button class="btn btn-sm btn-info view-order-btn" data-id="${order.id}">
                            Chi tiết
                        </button>
                        <button class="btn btn-sm btn-danger delete-order-btn" data-id="${order.id}">
                            Xóa
                        </button>
                    </td>
                `;

                ordersList.appendChild(row);
            }
        } else {
            // Hiển thị thông báo không có dữ liệu
            noOrdersMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị đơn hàng:', error);
    }
}

// Xóa đơn hàng
async function deleteOrder(orderId) {
    try {
        const tx = db.transaction('orders', 'readwrite');
        const store = tx.objectStore('orders');

        await store.delete(orderId);
        await tx.done;

        console.log('Đã xóa đơn hàng với ID:', orderId);

        // Cập nhật giao diện
        await displayOrders();

        return true;
    } catch (error) {
        console.error('Lỗi khi xóa đơn hàng:', error);
        return false;
    }
}

// Hiển thị chi tiết đơn hàng
async function showOrderDetail(orderId) {
    try {
        const tx = db.transaction(['orders', 'customers'], 'readonly');
        const orderStore = tx.objectStore('orders');
        const customerStore = tx.objectStore('customers');

        const order = await orderStore.get(orderId);
        if (!order) {
            alert('Không tìm thấy đơn hàng!');
            return;
        }

        // Lấy thông tin khách hàng
        const customer = await customerStore.get(order.customerId);
        const customerName = customer ? customer.name : 'Không xác định';

        // Tính tổng tiền đơn hàng
        let totalAmount = 0;
        if (order.items && order.items.length > 0) {
            totalAmount = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
        }

        // Tạo nội dung chi tiết đơn hàng
        const orderDetailContent = document.getElementById('order-detail-content');
        if (!orderDetailContent) return;

        orderDetailContent.innerHTML = `
            <div class="mb-3">
                <h6>Thông tin đơn hàng #${order.id}</h6>
                <p><strong>Khách hàng:</strong> ${customerName}</p>
                <p><strong>Ngày đặt:</strong> ${formatDate(order.orderDate)}</p>
                <p><strong>Hạn thanh toán:</strong> ${order.dueDate ? formatDate(order.dueDate) : 'Không có'}</p>
                <p><strong>Trạng thái đơn hàng:</strong> <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></p>
                <p><strong>Trạng thái thanh toán:</strong> <span class="badge ${order.paymentStatus === 'Đã thanh toán đủ' ? 'bg-success' : 'bg-warning'}">${order.paymentStatus || 'Chưa thanh toán'}</span></p>
            </div>

            <div class="mb-3">
                <h6>Danh sách sản phẩm</h6>
                <div class="table-responsive">
                    <table class="table table-sm table-bordered">
                        <thead>
                            <tr>
                                <th>Tên sản phẩm</th>
                                <th>Số lượng</th>
                                <th>Đơn giá</th>
                                <th>Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map(item => `
                                <tr>
                                    <td>${item.productName}</td>
                                    <td class="text-center">${item.qty}</td>
                                    <td class="text-end">${formatCurrency(item.sellingPrice)}</td>
                                    <td class="text-end">${formatCurrency(item.qty * item.sellingPrice)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th colspan="3" class="text-end">Tổng cộng:</th>
                                <th class="text-end">${formatCurrency(totalAmount)}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            ${order.deliveredTripId ? `
                <div class="alert alert-info">
                    Đơn hàng này đã được giao trong chuyến hàng #${order.deliveredTripId}
                </div>
            ` : ''}
        `;

        // Hiển thị modal
        const orderDetailModal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
        orderDetailModal.show();

    } catch (error) {
        console.error('Lỗi khi hiển thị chi tiết đơn hàng:', error);
    }
}

// Lấy class cho badge trạng thái
function getStatusBadgeClass(status) {
    switch (status) {
        case 'Mới':
            return 'bg-primary';
        case 'Đang xử lý':
            return 'bg-warning';
        case 'Đã giao':
            return 'bg-success';
        case 'Đã hủy':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}
