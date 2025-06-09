// ===== CÁC HÀM XỬ LÝ CHO QUẢN LÝ CHUYẾN HÀNG =====

// Hàm tính lợi nhuận chính xác (bao gồm giá vốn)
function calculateCorrectProfit(linkedOrders, tripExpenses) {
    let totalRevenue = 0;
    let totalCOGS = 0; // Cost of Goods Sold - Giá vốn hàng bán
    let totalPaymentReceived = 0;
    
    // Tính doanh thu, giá vốn và tiền đã thu
    for (const order of linkedOrders) {
        if (order.items && order.items.length > 0) {
            for (const item of order.items) {
                // Doanh thu từ item này
                const itemRevenue = item.qty * item.sellingPrice;
                totalRevenue += itemRevenue;
                
                // Giá vốn từ item này (từ purchasePrice)
                const itemCOGS = item.qty * (item.purchasePrice || 0);
                totalCOGS += itemCOGS;
            }
        }
        
        // Tiền đã thu
        totalPaymentReceived += order.paymentReceived || 0;
    }
    
    // Tính tổng chi phí vận hành
    const totalExpenses = tripExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Lợi nhuận gộp thực = Doanh thu - Giá vốn
    const grossProfit = totalRevenue - totalCOGS;
    
    // Lợi nhuận ròng = Lợi nhuận gộp - Chi phí vận hành
    const netProfit = grossProfit - totalExpenses;
    
    return {
        totalRevenue,        // Tổng doanh thu
        totalCOGS,          // Tổng giá vốn
        grossProfit,        // Lợi nhuận gộp (chưa trừ chi phí VH)
        totalExpenses,      // Tổng chi phí vận hành
        netProfit,          // Lợi nhuận ròng (đã trừ tất cả)
        totalPaymentReceived // Tổng tiền đã thu
    };
}

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

// Hiển thị chi tiết chuyến hàng với workflow mới
async function showTripDetail(tripId) {
    try {
        // Ensure database is ready
        if (!window.db) {
            alert('Cơ sở dữ liệu chưa sẵn sàng');
            return;
        }
        
        const tx = db.transaction(['trips', 'tripExpenses', 'orders', 'customers'], 'readonly');
        const tripStore = tx.objectStore('trips');
        const expenseStore = tx.objectStore('tripExpenses');
        const orderStore = tx.objectStore('orders');
        const customerStore = tx.objectStore('customers');

        const trip = await tripStore.get(tripId);
        const expenses = await expenseStore.getAll();
        const allOrders = await orderStore.getAll();

        if (!trip) {
            alert('Không tìm thấy chuyến hàng');
            return;
        }

        // Lấy chi phí của chuyến này
        const tripExpenses = expenses.filter(exp => exp.tripId === tripId);
        
        // Lấy đơn hàng đã liên kết với chuyến này
        const linkedOrders = allOrders.filter(order => order.deliveredTripId === tripId);
        
        // Tính lợi nhuận chính xác với giá vốn
        const profitData = calculateCorrectProfit(linkedOrders, tripExpenses);
        const { totalRevenue, totalCOGS, grossProfit, totalExpenses, netProfit, totalPaymentReceived } = profitData;

        // Xây dựng nội dung modal
        let content = `
            <!-- Thông tin tổng quan -->
            <div class="row g-4 mb-4">
                <div class="col-md-2">
                    <div class="card bg-primary text-white">
                        <div class="card-body text-center">
                            <h6 class="card-title">Doanh thu</h6>
                            <p class="card-text fs-5">${formatCurrency(totalRevenue)}</p>
            </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card bg-warning text-dark">
                        <div class="card-body text-center">
                            <h6 class="card-title">Giá vốn</h6>
                            <p class="card-text fs-5">${formatCurrency(totalCOGS)}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card bg-info text-white">
                        <div class="card-body text-center">
                            <h6 class="card-title">LN Gộp</h6>
                            <p class="card-text fs-5">${formatCurrency(grossProfit)}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card bg-danger text-white">
                        <div class="card-body text-center">
                            <h6 class="card-title">Chi phí VH</h6>
                            <p class="card-text fs-5">${formatCurrency(totalExpenses)}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card ${netProfit >= 0 ? 'bg-success' : 'bg-danger'} text-white">
                        <div class="card-body text-center">
                            <h6 class="card-title">LN Ròng</h6>
                            <p class="card-text fs-5">${formatCurrency(netProfit)}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card bg-secondary text-white">
                        <div class="card-body text-center">
                            <h6 class="card-title">Đã thu</h6>
                            <p class="card-text fs-5">${formatCurrency(totalPaymentReceived)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Navigation tabs -->
            <ul class="nav nav-tabs" id="tripDetailTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="linked-orders-tab" data-bs-toggle="tab" data-bs-target="#linked-orders-pane" type="button" role="tab">Đơn hàng đã liên kết</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="trip-expenses-tab" data-bs-toggle="tab" data-bs-target="#trip-expenses-pane" type="button" role="tab">Chi phí</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="link-orders-tab" data-bs-toggle="tab" data-bs-target="#link-orders-pane" type="button" role="tab">Liên kết đơn hàng</button>
                </li>
            </ul>

            <div class="tab-content mt-3" id="tripDetailTabContent">
                <!-- Tab đơn hàng đã liên kết -->
                <div class="tab-pane fade show active" id="linked-orders-pane" role="tabpanel">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Đơn hàng đã liên kết - Quản lý thanh toán</h5>
                        </div>
                        <div class="card-body">
        `;

        if (linkedOrders.length === 0) {
            content += '<div class="alert alert-info">Chưa có đơn hàng nào được liên kết với chuyến hàng này.</div>';
        } else {
            content += `
                        <div class="table-responsive">
                    <table class="table table-striped table-hover align-middle">
                                <thead class="table-dark">
                                    <tr>
                                        <th scope="col" class="text-center" style="width: 80px;">ID</th>
                                <th scope="col">Khách hàng</th>
                                <th scope="col" class="text-center" style="width: 110px;">Ngày đặt</th>
                                <th scope="col" class="text-center" style="width: 120px;">Trạng thái</th>
                                <th scope="col" class="text-end" style="width: 130px;">Tổng tiền</th>
                                <th scope="col" class="text-end" style="width: 130px;">Đã thanh toán</th>
                                <th scope="col" class="text-end" style="width: 120px;">Còn nợ</th>
                                        <th scope="col" class="text-center" style="width: 200px;">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;

            for (const order of linkedOrders) {
                const customer = await customerStore.get(order.customerId);
                const customerName = customer ? customer.name : 'Không xác định';
                
                let orderTotal = 0;
                if (order.items && order.items.length > 0) {
                    orderTotal = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                }
                
                const paymentReceived = order.paymentReceived || 0;
                const remainingDebt = orderTotal - paymentReceived;

                content += `
                    <tr id="order-row-${order.id}">
                        <td class="text-center"><strong>${order.id}</strong></td>
                        <td>${customerName}</td>
                        <td class="text-center">${formatDate(order.orderDate)}</td>
                        <td class="text-center">
                            <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span>
                        </td>
                        <td class="text-end"><strong>${formatCurrency(orderTotal)}</strong></td>
                        <td class="text-end text-success">${formatCurrency(paymentReceived)}</td>
                        <td class="text-end ${remainingDebt > 0 ? 'text-danger' : 'text-success'}">
                            <strong>${formatCurrency(remainingDebt)}</strong>
                        </td>
                        <td class="text-center">
                            <div class="btn-group btn-group-sm">
                                ${remainingDebt > 0 && order.status !== 'Thành công' ? `
                                    <button class="btn btn-outline-success btn-sm" 
                                            data-order-id="${order.id}" 
                                            data-trip-id="${tripId}" 
                                            data-customer-name="${customerName.replace(/'/g, '&apos;')}" 
                                            data-order-total="${orderTotal}" 
                                            data-payment-received="${paymentReceived}"
                                            onclick="openPaymentModal(this.dataset.orderId, this.dataset.tripId, this.dataset.customerName, this.dataset.orderTotal, this.dataset.paymentReceived)">
                                        <i class="bi bi-credit-card"></i> Thanh toán
                                    </button>
                                ` : ''}
                                <button class="btn btn-outline-danger btn-sm" onclick="unlinkOrderFromTrip(${order.id})">
                                    <i class="bi bi-x-circle"></i> Hủy liên kết
                                </button>
                                <button class="btn btn-outline-info btn-sm" onclick="showTripOrderDetail(${order.id})">
                                    <i class="bi bi-eye"></i> Chi tiết
                                </button>
                            </div>
                        </td>
                                        </tr>
                `;
            }

            content += `
                                </tbody>
                            </table>
                        </div>
            `;
        }

        content += `
                </div>
                </div>
                        </div>

                <!-- Tab chi phí -->
                <div class="tab-pane fade" id="trip-expenses-pane" role="tabpanel">
                        <div class="row">
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="card-title mb-0">Thêm chi phí</h5>
                            </div>
                                <div class="card-body">
                                    <form id="expense-form" data-trip-id="${tripId}">
                        <div class="mb-3">
                                            <label for="expense-type" class="form-label">Loại chi phí</label>
                                            <select class="form-select" id="expense-type" required>
                                                <option value="" disabled selected>Chọn loại chi phí</option>
                                                <option value="Xăng dầu">Xăng dầu</option>
                                                <option value="Phí đường">Phí đường</option>
                                                <option value="Ăn uống">Ăn uống</option>
                                                <option value="Khác">Khác</option>
                            </select>
                        </div>
                        <div class="mb-3">
                                <label for="expense-amount" class="form-label">Số tiền (VNĐ)</label>
                                <input type="number" class="form-control" id="expense-amount" min="0" required>
                        </div>
                        <div class="mb-3">
                                            <label for="expense-description" class="form-label">Mô tả</label>
                                            <input type="text" class="form-control" id="expense-description" placeholder="Mô tả chi tiết">
                        </div>
                                        <button type="submit" class="btn btn-primary w-100">Thêm chi phí</button>
                    </form>
                </div>
                </div>
            </div>
                        <div class="col-md-8">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="card-title mb-0">Danh sách chi phí</h5>
                                </div>
                                <div class="card-body">
        `;

        if (tripExpenses.length === 0) {
            content += '<div class="alert alert-info">Chưa có chi phí nào cho chuyến hàng này.</div>';
        } else {
            content += `
                <div class="table-responsive">
                    <table class="table table-striped table-hover align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th scope="col" style="width: 120px;">Loại chi phí</th>
                                <th scope="col" class="text-end" style="width: 130px;">Số tiền</th>
                                <th scope="col">Mô tả</th>
                                <th scope="col" class="text-center" style="width: 140px;">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            tripExpenses.forEach(expense => {
                content += `
                    <tr>
                        <td><span class="badge bg-secondary">${expense.type}</span></td>
                        <td class="text-end"><strong class="text-danger">${formatCurrency(expense.amount)}</strong></td>
                        <td><small class="text-muted">${expense.description || '<em>Không có mô tả</em>'}</small></td>
                        <td class="text-center">
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-warning btn-sm" 
                                        data-expense-id="${expense.id}"
                                        data-expense-type="${expense.type}"
                                        data-expense-amount="${expense.amount}"
                                        data-expense-description="${(expense.description || '').replace(/'/g, '&apos;')}"
                                        onclick="editTripExpense(this.dataset.expenseId, this.dataset.expenseType, this.dataset.expenseAmount, this.dataset.expenseDescription)">
                                    <i class="bi bi-pencil"></i> Sửa
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="deleteTripExpense(${expense.id})">
                                    <i class="bi bi-trash"></i> Xóa
                                </button>
                            </div>
                        </td>
                                </tr>
                `;
            });

            content += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        content += `
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab liên kết đơn hàng -->
                <div class="tab-pane fade" id="link-orders-pane" role="tabpanel">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Liên kết đơn hàng mới</h5>
                        </div>
                        <div class="card-body" id="link-orders-tab-pane">
                            <!-- Nội dung sẽ được load bằng updateTripDetailOrders -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Hiển thị modal
        document.getElementById('trip-detail-content').innerHTML = content;
        document.getElementById('tripDetailModalLabel').textContent = `Chi tiết chuyến hàng: ${trip.tripName}`;
        const modal = new bootstrap.Modal(document.getElementById('tripDetailModal'));
        modal.show();

        // Load dữ liệu cho tab liên kết đơn hàng
        await updateTripDetailOrders(tripId);

        // Thêm sự kiện cho form chi phí
        const expenseForm = document.getElementById('expense-form');
        if (expenseForm) {
            expenseForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const tripId = parseInt(expenseForm.getAttribute('data-trip-id'));
                const expenseData = {
                    tripId: tripId,
                    type: document.getElementById('expense-type').value,
                    amount: parseFloat(document.getElementById('expense-amount').value),
                    description: document.getElementById('expense-description').value || '',
                    date: new Date().toISOString().split('T')[0]
                };

                const success = await addTripExpense(expenseData);
                if (success) {
                    // Refresh chi tiết chuyến hàng
                    await showTripDetail(tripId);
                    await displayTrips();
        await displayReports();
                }
            });
        }

    } catch (error) {
        console.error('Lỗi khi hiển thị chi tiết chuyến hàng:', error);
        alert('Có lỗi xảy ra khi tải chi tiết chuyến hàng');
    }
}

// (Đã loại bỏ các function addPurchase và deletePurchase vì không sử dụng trong workflow mới)

// Liên kết đơn hàng với chuyến hàng
async function linkOrdersToTrip(tripId, orderIds) {
    try {
        const tx = db.transaction('orders', 'readwrite');
        const store = tx.objectStore('orders');

        let successCount = 0;
        for (const orderId of orderIds) {
            const order = await store.get(orderId);
            if (order && (order.status === 'Mới' || order.status === 'Đang xử lý' || order.status === 'Chờ xử lý')) {
                // Cập nhật trạng thái thành "Đang xử lý" và liên kết với chuyến hàng
                order.status = 'Đang xử lý';
                order.deliveredTripId = tripId;
                order.linkedDate = new Date(); // Đổi từ deliveredDate thành linkedDate
                
                // Khởi tạo paymentReceived nếu chưa có
                if (!order.paymentReceived) {
                    order.paymentReceived = 0;
                }
                
                await store.put(order);
                successCount++;
                console.log(`✅ Đã liên kết đơn hàng ID: ${orderId} với chuyến hàng ID: ${tripId}, status: ${order.status}`);
            } else {
                console.log(`⚠️ Không thể liên kết đơn hàng ID: ${orderId} - order không tồn tại hoặc status không hợp lệ`);
            }
        }

        await tx.done;

        if (successCount > 0) {
            console.log(`✅ Đã liên kết thành công ${successCount}/${orderIds.length} đơn hàng với chuyến hàng ID: ${tripId}`);
            
            // Hiển thị thông báo thành công
            alert(`Đã liên kết thành công ${successCount} đơn hàng với chuyến hàng!`);

        // Cập nhật trực tiếp giao diện modal chi tiết chuyến hàng
        await updateTripDetailOrders(tripId);

        // Cập nhật giao diện danh sách đơn hàng chung
            if (typeof displayOrders === 'function') {
        await displayOrders();
            }
            
            if (typeof displayReports === 'function') {
        await displayReports();
            }
            
            // Refresh danh sách đơn hàng nếu có
            if (typeof window.loadOrderModule === 'function') {
                await window.loadOrderModule();
            }
        } else {
            alert('Không có đơn hàng nào được liên kết. Vui lòng kiểm tra lại.');
        }

        return successCount > 0;
    } catch (error) {
        console.error('Lỗi khi liên kết đơn hàng với chuyến hàng:', error);
        alert('Có lỗi xảy ra khi liên kết đơn hàng. Vui lòng thử lại.');
        return false;
    }
}

// Hàm mới để cập nhật phần đơn hàng trong modal chi tiết chuyến
async function updateTripDetailOrders(tripId) {
    try {
        // Lấy thông tin chuyến hàng và đơn hàng
        const tx = db.transaction(['orders', 'customers'], 'readonly');
        const orderStore = tx.objectStore('orders');
        const customerStore = tx.objectStore('customers');

        const orders = await orderStore.getAll();

        // Lấy danh sách đơn hàng đã giao trong chuyến
        const deliveredOrders = orders.filter(order => order.deliveredTripId === tripId);

        // Lấy danh sách đơn hàng chờ xử lý (chưa liên kết với chuyến hàng)
        const pendingOrders = orders.filter(order =>
            (order.status === 'Mới' || order.status === 'Chờ xử lý') &&
            !order.deliveredTripId
        );

        // Tính tổng doanh thu từ các đơn hàng đã giao
        let totalRevenue = 0;
        for (const order of deliveredOrders) {
            if (order.items && order.items.length > 0) {
                totalRevenue += order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
            }
        }

        // Cập nhật thông tin doanh thu trong card overview (vì đã bỏ tab đơn hàng đã giao)
        // Chỉ cần cập nhật các card thông tin tổng quan

        // Cập nhật tab liên kết đơn hàng
        const linkOrdersTabPane = document.getElementById('link-orders-tab-pane');
        if (linkOrdersTabPane) {
            let html = `
                <form id="link-orders-form" data-trip-id="${tripId}">
                    <div class="mb-3">
                        <label class="form-label">Chọn đơn hàng cần liên kết</label>
                        <div class="alert alert-info">
                            Chỉ hiển thị các đơn hàng có trạng thái "Mới" hoặc "Chờ xử lý" và chưa được liên kết với chuyến hàng nào.
                            <br><small>Sau khi liên kết, đơn hàng sẽ chuyển thành trạng thái "Đang xử lý".</small>
                        </div>
            `;

            if (pendingOrders.length === 0) {
                html += '<div class="alert alert-warning">Không có đơn hàng nào đang chờ xử lý.</div>';
            } else {
                html += `
                    <div class="table-responsive">
                        <table class="table table-sm table-striped">
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

                html += `
                            </tbody>
                        </table>
                    </div>
                `;
            }

            html += `
                    </div>
                    <button type="submit" class="btn btn-primary">Xác nhận giao hàng & Liên kết với chuyến</button>
                </form>
            `;

            linkOrdersTabPane.innerHTML = html;

            // Thêm lại sự kiện cho form liên kết đơn hàng
            const linkOrdersForm = document.getElementById('link-orders-form');
            if (linkOrdersForm) {
                linkOrdersForm.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const tripId = parseInt(linkOrdersForm.getAttribute('data-trip-id'));
                    const selectedOrderIds = Array.from(document.querySelectorAll('.order-checkbox:checked')).map(checkbox => parseInt(checkbox.value));

                    if (selectedOrderIds.length > 0) {
                        await linkOrdersToTrip(tripId, selectedOrderIds);
                    } else {
                        alert('Vui lòng chọn ít nhất một đơn hàng để liên kết.');
                    }
                });
            }
        }

        // Cập nhật doanh thu trong card thông tin
        const revenueCardElement = document.querySelector('.card-text.fs-4.text-primary');
        if (revenueCardElement) {
            revenueCardElement.textContent = formatCurrency(totalRevenue);
        }

        // Cập nhật lợi nhuận trong card thông tin
        const grossProfitCardElement = document.querySelector('.card-text.fs-4:not(.text-danger):not(.text-primary)');
        if (grossProfitCardElement) {
            // Lấy tổng chi phí nhập hàng
            const costCardElement = document.querySelector('.card-text.fs-4.text-danger');
            if (costCardElement) {
                const totalCostText = costCardElement.textContent;
                const totalCost = parseFloat(totalCostText.replace(/[^\d.-]/g, '')) || 0;
                const grossProfit = totalRevenue - totalCost;

                // Cập nhật giá trị và màu nền
                grossProfitCardElement.textContent = formatCurrency(grossProfit);
                const grossProfitCard = grossProfitCardElement.closest('.card');
                if (grossProfitCard) {
                    grossProfitCard.className = grossProfit >= 0 ?
                        'card bg-success text-white' : 'card bg-danger text-white';
                }
            }
        }

    } catch (error) {
        console.error('Lỗi khi cập nhật thông tin đơn hàng trong chi tiết chuyến:', error);
    }
}

// Hủy liên kết đơn hàng khỏi chuyến hàng
async function unlinkOrderFromTrip(orderId) {
    try {
        if (!confirm('Bạn có chắc muốn hủy liên kết đơn hàng này khỏi chuyến hàng?')) {
            return;
        }

        const tx = db.transaction('orders', 'readwrite');
        const store = tx.objectStore('orders');

        const order = await store.get(orderId);
        if (order) {
            const tripId = order.deliveredTripId;

            // Reset trạng thái đơn hàng
            order.status = 'Chờ xử lý';
            order.deliveredTripId = null;
            order.paymentReceived = 0; // Reset thanh toán về 0

            await store.put(order);
            await tx.done;

            console.log(`Đã hủy liên kết đơn hàng ${orderId} khỏi chuyến hàng`);

            // Refresh giao diện
            await showTripDetail(tripId);
            await displayOrders();
            await displayReports();
        }
    } catch (error) {
        console.error('Lỗi khi hủy liên kết đơn hàng:', error);
        alert('Có lỗi xảy ra khi hủy liên kết đơn hàng');
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

// Mở modal thanh toán cho đơn hàng
function openPaymentModal(orderId, tripId, customerName, orderTotal, currentPayment) {
    // Check if database is ready
    if (!window.db) {
        alert('Cơ sở dữ liệu chưa sẵn sàng. Vui lòng thử lại sau.');
        return;
    }
    
    // Convert string parameters to proper types
    orderId = parseInt(orderId);
    tripId = parseInt(tripId);
    orderTotal = parseFloat(orderTotal);
    currentPayment = parseFloat(currentPayment);
    customerName = customerName.replace(/&apos;/g, "'"); // Convert back HTML entities
    const remainingDebt = orderTotal - currentPayment;
    
    const modalHtml = `
        <div class="modal fade" id="paymentModal" tabindex="-1" aria-labelledby="paymentModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="paymentModalLabel">Thanh toán đơn hàng #${orderId}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <p><strong>Khách hàng:</strong> ${customerName}</p>
                            <p><strong>Tổng tiền đơn hàng:</strong> <span class="text-primary">${formatCurrency(orderTotal)}</span></p>
                            <p><strong>Đã thanh toán:</strong> <span class="text-success">${formatCurrency(currentPayment)}</span></p>
                            <p><strong>Còn nợ:</strong> <span class="text-danger">${formatCurrency(remainingDebt)}</span></p>
                        </div>
                        <form id="payment-form" data-order-id="${orderId}" data-trip-id="${tripId}">
                            <div class="mb-3">
                                <label for="payment-amount" class="form-label">Số tiền thanh toán (VNĐ)</label>
                                <input type="number" class="form-control" id="payment-amount" 
                                       min="0" max="${remainingDebt}" value="${remainingDebt}" required>
                                <div class="form-text">Tối đa: ${formatCurrency(remainingDebt)}</div>
                            </div>
                            <div class="mb-3">
                                <label for="payment-method" class="form-label">Phương thức thanh toán</label>
                                <select class="form-select" id="payment-method" required>
                                    <option value="Tiền mặt">Tiền mặt</option>
                                    <option value="Chuyển khoản">Chuyển khoản</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="payment-note" class="form-label">Ghi chú</label>
                                <textarea class="form-control" id="payment-note" rows="2" placeholder="Ghi chú về thanh toán (không bắt buộc)"></textarea>
                            </div>
                            <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                                <button type="submit" class="btn btn-success">Xác nhận thanh toán</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Loại bỏ modal cũ nếu có
    const existingModal = document.getElementById('paymentModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Thêm modal mới vào body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Hiển thị modal
    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();

    // Thêm sự kiện cho form
    const paymentForm = document.getElementById('payment-form');
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const orderId = parseInt(paymentForm.getAttribute('data-order-id'));
        const tripId = parseInt(paymentForm.getAttribute('data-trip-id'));
        const amount = parseFloat(document.getElementById('payment-amount').value);
        const method = document.getElementById('payment-method').value;
        const note = document.getElementById('payment-note').value;

        const success = await processPayment(orderId, tripId, amount, method, note);
        if (success) {
            modal.hide();
        }
    });
}

// Xử lý thanh toán
async function processPayment(orderId, tripId, amount, method, note) {
    try {
        const tx = db.transaction(['orders', 'payments'], 'readwrite');
        const orderStore = tx.objectStore('orders');
        const paymentStore = tx.objectStore('payments');

        // Lấy thông tin đơn hàng
        const order = await orderStore.get(orderId);
        if (!order) {
            alert('Không tìm thấy đơn hàng');
            return false;
        }

        // Tính tổng tiền đơn hàng
        const orderTotal = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
        const currentPayment = order.paymentReceived || 0;
        const remainingDebt = orderTotal - currentPayment;

        // Kiểm tra số tiền thanh toán
        if (amount <= 0 || amount > remainingDebt) {
            alert('Số tiền thanh toán không hợp lệ');
            return false;
        }

        // Tạo bản ghi thanh toán
        const paymentData = {
            orderId: orderId,
            customerId: order.customerId,
            amount: amount,
            method: method,
            note: note || '',
            paymentDate: new Date().toISOString().split('T')[0],
            tripId: tripId
        };

        await paymentStore.add(paymentData);

        // Cập nhật số tiền đã thanh toán trong đơn hàng
        order.paymentReceived = currentPayment + amount;

        // Kiểm tra nếu đã thanh toán đủ thì chuyển trạng thái thành "Thành công"
        if (order.paymentReceived >= orderTotal) {
            order.status = 'Thành công';
        }

        await orderStore.put(order);
        await tx.done;

        console.log('Đã xử lý thanh toán thành công');

        // Kiểm tra và cập nhật trạng thái chuyến hàng
        await checkAndUpdateTripStatus(tripId);

        // Refresh giao diện
        await showTripDetail(tripId);
        
        // Cập nhật displays nếu có
        if (typeof displayOrders === 'function') {
            await displayOrders();
        }
        if (typeof displayReports === 'function') {
            await displayReports();
        }

        return true;
    } catch (error) {
        console.error('Lỗi khi xử lý thanh toán:', error);
        alert('Có lỗi xảy ra khi xử lý thanh toán');
        return false;
    }
}

// Kiểm tra và cập nhật trạng thái chuyến hàng
async function checkAndUpdateTripStatus(tripId) {
    try {
        const tx = db.transaction(['trips', 'orders'], 'readwrite');
        const tripStore = tx.objectStore('trips');
        const orderStore = tx.objectStore('orders');

        const trip = await tripStore.get(tripId);
        const allOrders = await orderStore.getAll();

        if (!trip) return;

        // Lấy tất cả đơn hàng liên kết với chuyến này
        const linkedOrders = allOrders.filter(order => order.deliveredTripId === tripId);

        if (linkedOrders.length === 0) return;

        // Kiểm tra xem tất cả đơn hàng đã "Thành công" chưa
        const allOrdersCompleted = linkedOrders.every(order => order.status === 'Thành công');

        if (allOrdersCompleted && trip.status !== 'Đã giao') {
            trip.status = 'Đã giao';
            trip.completedDate = new Date().toISOString().split('T')[0];
            await tripStore.put(trip);
            
            console.log(`Đã cập nhật trạng thái chuyến hàng ${tripId} thành "Đã giao"`);
        }

        await tx.done;
    } catch (error) {
        console.error('Lỗi khi kiểm tra và cập nhật trạng thái chuyến hàng:', error);
    }
}

// Hiển thị chi tiết đơn hàng (trip version)
async function showTripOrderDetail(orderId) {
    try {
        // Thử sử dụng function từ order.js trước
        if (typeof window.showOrderDetail === 'function') {
            await window.showOrderDetail(orderId);
            return;
        }
        
        // Fallback: Tự tạo modal chi tiết đơn hàng
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

        // Tính tổng tiền và lợi nhuận
        let totalAmount = 0;
        let totalProfit = 0;
        
        if (order.items && order.items.length > 0) {
            totalAmount = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
            totalProfit = order.items.reduce((sum, item) => sum + (item.qty * ((item.sellingPrice || 0) - (item.purchasePrice || 0))), 0);
        }

        // Tạo modal chi tiết
        const modalHtml = `
            <div class="modal fade" id="orderDetailModal" tabindex="-1" aria-labelledby="orderDetailModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="orderDetailModalLabel">Chi tiết đơn hàng #${order.id}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <p><strong>Khách hàng:</strong> ${customerName}</p>
                                <p><strong>Ngày đặt:</strong> ${formatDate(order.orderDate)}</p>
                                <p><strong>Trạng thái:</strong> <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></p>
                                <p><strong>Tổng tiền:</strong> <span class="fw-bold text-primary">${formatCurrency(totalAmount)}</span></p>
                                <p><strong>Đã thanh toán:</strong> <span class="fw-bold text-success">${formatCurrency(order.paymentReceived || 0)}</span></p>
                                <p><strong>Còn nợ:</strong> <span class="fw-bold text-danger">${formatCurrency(totalAmount - (order.paymentReceived || 0))}</span></p>
                            </div>

                            <h6>Danh sách sản phẩm</h6>
                            <div class="table-responsive">
                                <table class="table table-sm table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Nhà cung cấp</th>
                                            <th>Tên sản phẩm</th>
                                            <th>Số lượng</th>
                                            <th>Giá nhập</th>
                                            <th>Giá bán</th>
                                            <th>Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${order.items.map(item => {
                                            const itemTotal = item.qty * item.sellingPrice;
                                            return `
                                            <tr>
                                                <td><small>${item.supplierName || 'Không xác định'}</small></td>
                                                <td>${item.productName}</td>
                                                <td class="text-center">${item.qty}</td>
                                                <td class="text-end">${formatCurrency(item.purchasePrice || 0)}</td>
                                                <td class="text-end">${formatCurrency(item.sellingPrice)}</td>
                                                <td class="text-end fw-bold">${formatCurrency(itemTotal)}</td>
                                            </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <th colspan="5" class="text-end">Tổng cộng:</th>
                                            <th class="text-end">${formatCurrency(totalAmount)}</th>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Loại bỏ modal cũ nếu có
        const existingModal = document.getElementById('orderDetailModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Thêm modal mới vào body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Hiển thị modal
        const modal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
        modal.show();

    } catch (error) {
        console.error('Lỗi khi hiển thị chi tiết đơn hàng:', error);
        alert('Có lỗi xảy ra khi hiển thị chi tiết đơn hàng!');
    }
}



// Thêm chi phí chuyến hàng
async function addTripExpense(expenseData) {
    try {
        const tx = db.transaction('tripExpenses', 'readwrite');
        const store = tx.objectStore('tripExpenses');

        const id = await store.add(expenseData);
        await tx.done;

        console.log('Đã thêm chi phí chuyến hàng mới với ID:', id);
        return true;
    } catch (error) {
        console.error('Lỗi khi thêm chi phí chuyến hàng:', error);
        alert('Có lỗi xảy ra khi thêm chi phí');
        return false;
    }
}

// Sửa chi phí chuyến hàng
async function editTripExpense(expenseId, currentType, currentAmount, currentDescription) {
    // Convert string parameters to proper types
    expenseId = parseInt(expenseId);
    currentAmount = parseFloat(currentAmount);
    currentDescription = currentDescription.replace(/&apos;/g, "'"); // Convert back HTML entities
    try {
        // Tạo modal chỉnh sửa chi phí
        const modalHtml = `
            <div class="modal fade" id="editExpenseModal" tabindex="-1" aria-labelledby="editExpenseModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="editExpenseModalLabel">Sửa chi phí</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="edit-expense-form" data-expense-id="${expenseId}">
                                <div class="mb-3">
                                    <label for="edit-expense-type" class="form-label">Loại chi phí</label>
                                    <select class="form-select" id="edit-expense-type" required>
                                        <option value="Xăng dầu" ${currentType === 'Xăng dầu' ? 'selected' : ''}>Xăng dầu</option>
                                        <option value="Phí đường" ${currentType === 'Phí đường' ? 'selected' : ''}>Phí đường</option>
                                        <option value="Ăn uống" ${currentType === 'Ăn uống' ? 'selected' : ''}>Ăn uống</option>
                                        <option value="Khác" ${currentType === 'Khác' ? 'selected' : ''}>Khác</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="edit-expense-amount" class="form-label">Số tiền (VNĐ)</label>
                                    <input type="number" class="form-control" id="edit-expense-amount" min="0" value="${currentAmount}" required>
                                </div>
                                <div class="mb-3">
                                    <label for="edit-expense-description" class="form-label">Mô tả</label>
                                    <input type="text" class="form-control" id="edit-expense-description" value="${currentDescription}" placeholder="Mô tả chi tiết">
                                </div>
                                <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                                    <button type="submit" class="btn btn-warning">Cập nhật</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Loại bỏ modal cũ nếu có
        const existingModal = document.getElementById('editExpenseModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Thêm modal mới vào body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Hiển thị modal
        const modal = new bootstrap.Modal(document.getElementById('editExpenseModal'));
        modal.show();

        // Thêm sự kiện cho form
        const editExpenseForm = document.getElementById('edit-expense-form');
        editExpenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const expenseId = parseInt(editExpenseForm.getAttribute('data-expense-id'));
            const updatedData = {
                type: document.getElementById('edit-expense-type').value,
                amount: parseFloat(document.getElementById('edit-expense-amount').value),
                description: document.getElementById('edit-expense-description').value || ''
            };

            const success = await updateTripExpense(expenseId, updatedData);
            if (success) {
                modal.hide();
            }
        });

    } catch (error) {
        console.error('Lỗi khi mở form sửa chi phí:', error);
        alert('Có lỗi xảy ra khi mở form sửa chi phí');
    }
}

// Cập nhật chi phí chuyến hàng
async function updateTripExpense(expenseId, updatedData) {
    try {
        const tx = db.transaction('tripExpenses', 'readwrite');
        const store = tx.objectStore('tripExpenses');

        // Lấy chi phí hiện tại
        const expense = await store.get(expenseId);
        if (!expense) {
            alert('Không tìm thấy chi phí để cập nhật');
            return false;
        }

        // Cập nhật dữ liệu
        const updatedExpense = {
            ...expense,
            ...updatedData
        };

        await store.put(updatedExpense);
        await tx.done;

        console.log('Đã cập nhật chi phí chuyến hàng với ID:', expenseId);

        // Lấy tripId hiện tại và refresh giao diện
        const tripId = getCurrentTripIdFromModal();
        if (tripId) {
            await showTripDetail(tripId);
            await displayTrips();
            await displayReports();
        }

        return true;
    } catch (error) {
        console.error('Lỗi khi cập nhật chi phí chuyến hàng:', error);
        alert('Có lỗi xảy ra khi cập nhật chi phí');
        return false;
    }
}

// Xóa chi phí chuyến hàng
async function deleteTripExpense(expenseId) {
    try {
        if (!confirm('Bạn có chắc muốn xóa chi phí này?')) {
            return;
        }

        const tx = db.transaction('tripExpenses', 'readwrite');
        const store = tx.objectStore('tripExpenses');

        await store.delete(expenseId);
        await tx.done;

        console.log('Đã xóa chi phí ID:', expenseId);

        // Refresh giao diện (cần có tripId từ context)
        const currentTripId = getCurrentTripIdFromModal();
        if (currentTripId) {
            await showTripDetail(currentTripId);
            await displayTrips();
            await displayReports();
        }
    } catch (error) {
        console.error('Lỗi khi xóa chi phí chuyến hàng:', error);
        alert('Có lỗi xảy ra khi xóa chi phí');
    }
}

// Helper function để lấy tripId hiện tại từ modal
function getCurrentTripIdFromModal() {
    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
        return parseInt(expenseForm.getAttribute('data-trip-id'));
    }
    return null;
}

// Lấy class cho badge trạng thái đơn hàng
function getStatusBadgeClass(status) {
    switch (status) {
        case 'Mới':
            return 'bg-primary';
        case 'Chờ xử lý':
            return 'bg-warning';
        case 'Đang xử lý':
            return 'bg-info';
        case 'Thành công':
            return 'bg-success';
        case 'Đã hủy':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

