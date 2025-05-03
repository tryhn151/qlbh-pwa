// ===== CÁC HÀM XỬ LÝ CHO QUẢN LÝ CHUYẾN HÀNG =====

// Thêm chuyến hàng mới
async function addTrip(tripData) {
    try {
        const tx = db.transaction('trips', 'readwrite');
        const store = tx.objectStore('trips');
        
        const id = await store.add(tripData);
        await tx.done;
        
        console.log('Đã thêm chuyến hàng mới với ID:', id);
        
        // Cập nhật giao diện
        await displayTrips();
        
        return id;
    } catch (error) {
        console.error('Lỗi khi thêm chuyến hàng:', error);
        return null;
    }
}

// Hiển thị danh sách chuyến hàng
async function displayTrips() {
    try {
        const tripsList = document.getElementById('trips-list');
        const noTripsMessage = document.getElementById('no-trips-message');
        
        if (!tripsList || !noTripsMessage) return;
        
        // Lấy tất cả chuyến hàng từ IndexedDB
        const tx = db.transaction('trips', 'readonly');
        const store = tx.objectStore('trips');
        const trips = await store.getAll();
        
        // Xóa nội dung hiện tại
        tripsList.innerHTML = '';
        
        if (trips.length > 0) {
            // Ẩn thông báo không có dữ liệu
            noTripsMessage.style.display = 'none';
            
            // Hiển thị từng chuyến hàng
            trips.forEach(trip => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${trip.id}</td>
                    <td>${trip.tripName}</td>
                    <td>${formatDate(trip.tripDate)}</td>
                    <td><span class="badge ${getTripStatusBadgeClass(trip.status)}">${trip.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-info view-trip-btn" data-id="${trip.id}">
                            Chi tiết
                        </button>
                        <button class="btn btn-sm btn-danger delete-trip-btn" data-id="${trip.id}">
                            Xóa
                        </button>
                    </td>
                `;
                
                tripsList.appendChild(row);
            });
        } else {
            // Hiển thị thông báo không có dữ liệu
            noTripsMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị chuyến hàng:', error);
    }
}

// Xóa chuyến hàng
async function deleteTrip(tripId) {
    try {
        const tx = db.transaction('trips', 'readwrite');
        const store = tx.objectStore('trips');
        
        await store.delete(tripId);
        await tx.done;
        
        console.log('Đã xóa chuyến hàng với ID:', tripId);
        
        // Cập nhật giao diện
        await displayTrips();
        
        return true;
    } catch (error) {
        console.error('Lỗi khi xóa chuyến hàng:', error);
        return false;
    }
}

// Hiển thị chi tiết chuyến hàng
async function showTripDetail(tripId) {
    try {
        // Lấy thông tin chuyến hàng
        const tx = db.transaction(['trips', 'purchases', 'orders', 'customers'], 'readonly');
        const tripStore = tx.objectStore('trips');
        const purchaseStore = tx.objectStore('purchases');
        const orderStore = tx.objectStore('orders');
        const customerStore = tx.objectStore('customers');
        
        const trip = await tripStore.get(tripId);
        if (!trip) {
            alert('Không tìm thấy chuyến hàng!');
            return;
        }
        
        // Lấy danh sách chi phí nhập hàng của chuyến
        const purchaseIndex = purchaseStore.index('tripId');
        const purchases = await purchaseIndex.getAll(tripId);
        
        // Lấy danh sách đơn hàng đã giao trong chuyến
        const orders = await orderStore.getAll();
        const deliveredOrders = orders.filter(order => order.deliveredTripId === tripId);
        
        // Tính tổng chi phí nhập hàng
        const totalCost = purchases.reduce((sum, purchase) => sum + (purchase.qty * purchase.purchasePrice), 0);
        
        // Tính tổng doanh thu từ các đơn hàng đã giao
        let totalRevenue = 0;
        for (const order of deliveredOrders) {
            if (order.items && order.items.length > 0) {
                totalRevenue += order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
            }
        }
        
        // Tính lợi nhuận gộp
        const grossProfit = totalRevenue - totalCost;
        
        // Tạo nội dung chi tiết chuyến hàng
        const tripDetailContent = document.getElementById('trip-detail-content');
        if (!tripDetailContent) return;
        
        tripDetailContent.innerHTML = `
            <div class="mb-4">
                <h5>Thông tin chuyến hàng #${trip.id}</h5>
                <p><strong>Tên chuyến:</strong> ${trip.tripName}</p>
                <p><strong>Ngày:</strong> ${formatDate(trip.tripDate)}</p>
                <p><strong>Trạng thái:</strong> <span class="badge ${getTripStatusBadgeClass(trip.status)}">${trip.status}</span></p>
            </div>
            
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6 class="card-title">Tổng chi phí nhập</h6>
                            <p class="card-text fs-4 text-danger">${formatCurrency(totalCost)}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6 class="card-title">Tổng doanh thu bán</h6>
                            <p class="card-text fs-4 text-primary">${formatCurrency(totalRevenue)}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card ${grossProfit >= 0 ? 'bg-success' : 'bg-danger'} text-white">
                        <div class="card-body text-center">
                            <h6 class="card-title">Lợi nhuận gộp</h6>
                            <p class="card-text fs-4">${formatCurrency(grossProfit)}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <ul class="nav nav-tabs" id="tripDetailTab" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="purchases-tab" data-bs-toggle="tab" data-bs-target="#purchases-tab-pane" type="button" role="tab" aria-controls="purchases-tab-pane" aria-selected="true">Chi phí nhập hàng</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="delivered-orders-tab" data-bs-toggle="tab" data-bs-target="#delivered-orders-tab-pane" type="button" role="tab" aria-controls="delivered-orders-tab-pane" aria-selected="false">Đơn hàng đã giao</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="add-purchase-tab" data-bs-toggle="tab" data-bs-target="#add-purchase-tab-pane" type="button" role="tab" aria-controls="add-purchase-tab-pane" aria-selected="false">Thêm chi phí</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="link-orders-tab" data-bs-toggle="tab" data-bs-target="#link-orders-tab-pane" type="button" role="tab" aria-controls="link-orders-tab-pane" aria-selected="false">Liên kết đơn hàng</button>
                </li>
            </ul>
            
            <div class="tab-content p-3 border border-top-0 rounded-bottom" id="tripDetailTabContent">
                <!-- Tab Chi phí nhập hàng -->
                <div class="tab-pane fade show active" id="purchases-tab-pane" role="tabpanel" aria-labelledby="purchases-tab" tabindex="0">
                    ${purchases.length > 0 ? `
                        <div class="table-responsive">
                            <table class="table table-sm table-striped">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Tên sản phẩm</th>
                                        <th>Số lượng</th>
                                        <th>Giá nhập</th>
                                        <th>Thành tiền</th>
                                        <th>Trạng thái thanh toán</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${purchases.map(purchase => `
                                        <tr>
                                            <td>${purchase.id}</td>
                                            <td>${purchase.productName}</td>
                                            <td class="text-center">${purchase.qty}</td>
                                            <td class="text-end">${formatCurrency(purchase.purchasePrice)}</td>
                                            <td class="text-end">${formatCurrency(purchase.qty * purchase.purchasePrice)}</td>
                                            <td><span class="badge ${purchase.paymentStatus === 'Đã trả' ? 'bg-success' : 'bg-warning'}">${purchase.paymentStatus}</span></td>
                                            <td>
                                                <button class="btn btn-sm btn-danger delete-purchase-btn" data-id="${purchase.id}">
                                                    Xóa
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th colspan="4" class="text-end">Tổng cộng:</th>
                                        <th class="text-end">${formatCurrency(totalCost)}</th>
                                        <th colspan="2"></th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    ` : '<div class="alert alert-info">Chưa có chi phí nhập hàng nào được ghi nhận cho chuyến này.</div>'}
                </div>
                
                <!-- Tab Đơn hàng đã giao -->
                <div class="tab-pane fade" id="delivered-orders-tab-pane" role="tabpanel" aria-labelledby="delivered-orders-tab" tabindex="0">
                    ${deliveredOrders.length > 0 ? `
                        <div class="table-responsive">
                            <table class="table table-sm table-striped">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Khách hàng</th>
                                        <th>Ngày đặt</th>
                                        <th>Tổng tiền</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${await Promise.all(deliveredOrders.map(async order => {
                                        const customer = await customerStore.get(order.customerId);
                                        const customerName = customer ? customer.name : 'Không xác định';
                                        
                                        let orderTotal = 0;
                                        if (order.items && order.items.length > 0) {
                                            orderTotal = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                                        }
                                        
                                        return `
                                            <tr>
                                                <td>${order.id}</td>
                                                <td>${customerName}</td>
                                                <td>${formatDate(order.orderDate)}</td>
                                                <td class="text-end">${formatCurrency(orderTotal)}</td>
                                                <td>
                                                    <button class="btn btn-sm btn-info view-order-btn" data-id="${order.id}">
                                                        Chi tiết
                                                    </button>
                                                    <button class="btn btn-sm btn-warning unlink-order-btn" data-id="${order.id}" data-trip-id="${tripId}">
                                                        Hủy liên kết
                                                    </button>
                                                </td>
                                            </tr>
                                        `;
                                    }))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th colspan="3" class="text-end">Tổng doanh thu:</th>
                                        <th class="text-end">${formatCurrency(totalRevenue)}</th>
                                        <th></th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    ` : '<div class="alert alert-info">Chưa có đơn hàng nào được giao trong chuyến này.</div>'}
                </div>
                
                <!-- Tab Thêm chi phí -->
                <div class="tab-pane fade" id="add-purchase-tab-pane" role="tabpanel" aria-labelledby="add-purchase-tab" tabindex="0">
                    <form id="add-purchase-form" data-trip-id="${tripId}">
                        <div class="mb-3">
                            <label for="purchase-product-name" class="form-label">Tên sản phẩm</label>
                            <input type="text" class="form-control" id="purchase-product-name" required>
                        </div>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="purchase-qty" class="form-label">Số lượng</label>
                                <input type="number" class="form-control" id="purchase-qty" min="1" value="1" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="purchase-price" class="form-label">Giá nhập (VNĐ)</label>
                                <input type="number" class="form-control" id="purchase-price" min="0" required>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label for="purchase-payment-status" class="form-label">Trạng thái thanh toán</label>
                            <select class="form-select" id="purchase-payment-status" required>
                                <option value="Đã trả">Đã trả</option>
                                <option value="Còn nợ NCC">Còn nợ NCC</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary">Thêm chi phí</button>
                    </form>
                </div>
                
                <!-- Tab Liên kết đơn hàng -->
                <div class="tab-pane fade" id="link-orders-tab-pane" role="tabpanel" aria-labelledby="link-orders-tab" tabindex="0">
                    <form id="link-orders-form" data-trip-id="${tripId}">
                        <div class="mb-3">
                            <label class="form-label">Chọn đơn hàng cần liên kết</label>
                            <div class="alert alert-info">
                                Chỉ hiển thị các đơn hàng có trạng thái "Mới" hoặc "Đang xử lý" và chưa được liên kết với chuyến hàng nào.
                            </div>
                            
                            ${await (async () => {
                                const pendingOrders = orders.filter(order => 
                                    (order.status === 'Mới' || order.status === 'Đang xử lý') && 
                                    !order.deliveredTripId
                                );
                                
                                if (pendingOrders.length === 0) {
                                    return '<div class="alert alert-warning">Không có đơn hàng nào đang chờ giao.</div>';
                                }
                                
                                let html = '<div class="table-responsive"><table class="table table-sm table-striped">';
                                html += `
                                    <thead>
                                        <tr>
                                            <th>Chọn</th>
                                            <th>ID</th>
                                            <th>Khách hàng</th>
                                            <th>Ngày đặt</th>
                                            <th>Trạng thái</th>
                                            <th>Tổng tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                `;
                                
                                for (const order of pendingOrders) {
                                    const customer = await customerStore.get(order.customerId);
                                    const customerName = customer ? customer.name : 'Không xác định';
                                    
                                    let orderTotal = 0;
                                    if (order.items && order.items.length > 0) {
                                        orderTotal = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                                    }
                                    
                                    html += `
                                        <tr>
                                            <td>
                                                <div class="form-check">
                                                    <input class="form-check-input order-checkbox" type="checkbox" value="${order.id}" id="order-${order.id}">
                                                </div>
                                            </td>
                                            <td>${order.id}</td>
                                            <td>${customerName}</td>
                                            <td>${formatDate(order.orderDate)}</td>
                                            <td><span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></td>
                                            <td class="text-end">${formatCurrency(orderTotal)}</td>
                                        </tr>
                                    `;
                                }
                                
                                html += '</tbody></table></div>';
                                return html;
                            })()}
                        </div>
                        <button type="submit" class="btn btn-primary">Xác nhận giao hàng & Liên kết với chuyến</button>
                    </form>
                </div>
            </div>
        `;
        
        // Thêm sự kiện cho form thêm chi phí
        const addPurchaseForm = document.getElementById('add-purchase-form');
        if (addPurchaseForm) {
            addPurchaseForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const tripId = parseInt(addPurchaseForm.getAttribute('data-trip-id'));
                const productName = document.getElementById('purchase-product-name').value.trim();
                const qty = parseInt(document.getElementById('purchase-qty').value);
                const purchasePrice = parseFloat(document.getElementById('purchase-price').value);
                const paymentStatus = document.getElementById('purchase-payment-status').value;
                
                if (productName && qty > 0 && purchasePrice >= 0) {
                    const purchaseData = {
                        tripId,
                        productName,
                        qty,
                        purchasePrice,
                        paymentStatus
                    };
                    
                    await addPurchase(purchaseData);
                    
                    // Đóng modal và mở lại để cập nhật dữ liệu
                    const tripDetailModal = bootstrap.Modal.getInstance(document.getElementById('tripDetailModal'));
                    tripDetailModal.hide();
                    
                    // Hiển thị lại chi tiết chuyến hàng
                    setTimeout(() => {
                        showTripDetail(tripId);
                    }, 500);
                }
            });
        }
        
        // Thêm sự kiện cho form liên kết đơn hàng
        const linkOrdersForm = document.getElementById('link-orders-form');
        if (linkOrdersForm) {
            linkOrdersForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const tripId = parseInt(linkOrdersForm.getAttribute('data-trip-id'));
                const selectedOrderIds = Array.from(document.querySelectorAll('.order-checkbox:checked')).map(checkbox => parseInt(checkbox.value));
                
                if (selectedOrderIds.length > 0) {
                    await linkOrdersToTrip(tripId, selectedOrderIds);
                    
                    // Đóng modal và mở lại để cập nhật dữ liệu
                    const tripDetailModal = bootstrap.Modal.getInstance(document.getElementById('tripDetailModal'));
                    tripDetailModal.hide();
                    
                    // Hiển thị lại chi tiết chuyến hàng
                    setTimeout(() => {
                        showTripDetail(tripId);
                    }, 500);
                } else {
                    alert('Vui lòng chọn ít nhất một đơn hàng để liên kết.');
                }
            });
        }
        
        // Thêm sự kiện cho các nút xóa chi phí
        document.querySelectorAll('.delete-purchase-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const purchaseId = parseInt(e.target.getAttribute('data-id'));
                if (confirm('Bạn có chắc muốn xóa chi phí nhập hàng này?')) {
                    await deletePurchase(purchaseId);
                    
                    // Đóng modal và mở lại để cập nhật dữ liệu
                    const tripDetailModal = bootstrap.Modal.getInstance(document.getElementById('tripDetailModal'));
                    tripDetailModal.hide();
                    
                    // Hiển thị lại chi tiết chuyến hàng
                    setTimeout(() => {
                        showTripDetail(tripId);
                    }, 500);
                }
            });
        });
        
        // Thêm sự kiện cho các nút hủy liên kết đơn hàng
        document.querySelectorAll('.unlink-order-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const orderId = parseInt(e.target.getAttribute('data-id'));
                const tripId = parseInt(e.target.getAttribute('data-trip-id'));
                
                if (confirm('Bạn có chắc muốn hủy liên kết đơn hàng này khỏi chuyến hàng?')) {
                    await unlinkOrderFromTrip(orderId);
                    
                    // Đóng modal và mở lại để cập nhật dữ liệu
                    const tripDetailModal = bootstrap.Modal.getInstance(document.getElementById('tripDetailModal'));
                    tripDetailModal.hide();
                    
                    // Hiển thị lại chi tiết chuyến hàng
                    setTimeout(() => {
                        showTripDetail(tripId);
                    }, 500);
                }
            });
        });
        
        // Hiển thị modal
        const tripDetailModal = new bootstrap.Modal(document.getElementById('tripDetailModal'));
        tripDetailModal.show();
        
    } catch (error) {
        console.error('Lỗi khi hiển thị chi tiết chuyến hàng:', error);
    }
}

// Thêm chi phí nhập hàng
async function addPurchase(purchaseData) {
    try {
        const tx = db.transaction('purchases', 'readwrite');
        const store = tx.objectStore('purchases');
        
        const id = await store.add(purchaseData);
        await tx.done;
        
        console.log('Đã thêm chi phí nhập hàng mới với ID:', id);
        
        // Cập nhật báo cáo
        await displayReports();
        
        return id;
    } catch (error) {
        console.error('Lỗi khi thêm chi phí nhập hàng:', error);
        return null;
    }
}

// Xóa chi phí nhập hàng
async function deletePurchase(purchaseId) {
    try {
        const tx = db.transaction('purchases', 'readwrite');
        const store = tx.objectStore('purchases');
        
        await store.delete(purchaseId);
        await tx.done;
        
        console.log('Đã xóa chi phí nhập hàng với ID:', purchaseId);
        
        // Cập nhật báo cáo
        await displayReports();
        
        return true;
    } catch (error) {
        console.error('Lỗi khi xóa chi phí nhập hàng:', error);
        return false;
    }
}

// Liên kết đơn hàng với chuyến hàng
async function linkOrdersToTrip(tripId, orderIds) {
    try {
        const tx = db.transaction('orders', 'readwrite');
        const store = tx.objectStore('orders');
        
        for (const orderId of orderIds) {
            const order = await store.get(orderId);
            if (order) {
                order.status = 'Đã giao';
                order.deliveredTripId = tripId;
                await store.put(order);
            }
        }
        
        await tx.done;
        
        console.log(`Đã liên kết ${orderIds.length} đơn hàng với chuyến hàng ID: ${tripId}`);
        
        // Cập nhật giao diện
        await displayOrders();
        await displayReports();
        
        return true;
    } catch (error) {
        console.error('Lỗi khi liên kết đơn hàng với chuyến hàng:', error);
        return false;
    }
}

// Hủy liên kết đơn hàng khỏi chuyến hàng
async function unlinkOrderFromTrip(orderId) {
    try {
        const tx = db.transaction('orders', 'readwrite');
        const store = tx.objectStore('orders');
        
        const order = await store.get(orderId);
        if (order) {
            order.status = 'Đang xử lý';
            order.deliveredTripId = null;
            await store.put(order);
        }
        
        await tx.done;
        
        console.log(`Đã hủy liên kết đơn hàng ID: ${orderId} khỏi chuyến hàng`);
        
        // Cập nhật giao diện
        await displayOrders();
        await displayReports();
        
        return true;
    } catch (error) {
        console.error('Lỗi khi hủy liên kết đơn hàng khỏi chuyến hàng:', error);
        return false;
    }
}

// Lấy class cho badge trạng thái chuyến hàng
function getTripStatusBadgeClass(status) {
    switch (status) {
        case 'Mới tạo':
            return 'bg-primary';
        case 'Đang lấy hàng':
            return 'bg-warning';
        case 'Đã hoàn thành':
            return 'bg-success';
        default:
            return 'bg-secondary';
    }
}
