// ===== CÁC HÀM XỬ LÝ CHO QUẢN LÝ CÔNG NỢ =====

// Tính toán công nợ của tất cả khách hàng (chuẩn hóa với trip logic)
async function calculateAllCustomerDebts() {
    try {
        // Lấy tất cả khách hàng và đơn hàng
        const tx = db.transaction(['customers', 'orders'], 'readonly');
        const customerStore = tx.objectStore('customers');
        const orderStore = tx.objectStore('orders');
        
        const customers = await customerStore.getAll();
        const orders = await orderStore.getAll();
        
        // Tính toán công nợ cho từng khách hàng
        const customerDebts = [];
        
        for (const customer of customers) {
            // Lọc đơn hàng của khách hàng
            const customerOrders = orders.filter(order => order.customerId === customer.id);
            
            let totalOrderValue = 0;
            let totalPaymentReceived = 0;
            let unpaidOrderCount = 0;

            const debtOrders = []; // Chi tiết đơn hàng còn nợ
            
            for (const order of customerOrders) {
                // Tính giá trị đơn hàng
                if (order.items && Array.isArray(order.items)) {
                    const orderValue = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                    const paymentReceived = order.paymentReceived || 0;
                    const remainingDebt = orderValue - paymentReceived;
                    
                    // Chỉ tính các đơn hàng còn nợ
                    if (remainingDebt > 0) {
                        totalOrderValue += orderValue;
                        totalPaymentReceived += paymentReceived;
                        unpaidOrderCount++;
                        

                        
                        // Thêm thông tin chi tiết đơn hàng
                        debtOrders.push({
                            orderId: order.id,
                            orderDate: order.orderDate,
                            orderValue,
                            paymentReceived,
                            remainingDebt,
                            tripId: order.deliveredTripId,
                            status: order.status,
                            dueDate: order.dueDate
                        });
                    }
                }
            }
            
            // Tính công nợ còn lại tổng cộng
            const totalRemainingDebt = totalOrderValue - totalPaymentReceived;
            
            if (totalRemainingDebt > 0) {
                customerDebts.push({
                    customerId: customer.id,
                    customerName: customer.name,
                    unpaidOrderCount,
                    totalOrderValue,
                    totalPaymentReceived,
                    totalDebt: totalRemainingDebt,
                    debtOrders // Thêm chi tiết đơn hàng
                });
            }
        }
        
        return customerDebts;
    } catch (error) {
        console.error('Lỗi khi tính toán công nợ:', error);
        return [];
    }
}

// Hiển thị danh sách công nợ
async function displayCustomerDebts() {
    try {
        const customerDebtsList = document.getElementById('customer-debts-list');
        const noDebtsMessage = document.getElementById('no-debts-message');
        const totalDebtAmount = document.getElementById('total-debt-amount');
        const totalDebtors = document.getElementById('total-debtors');

        
        if (!customerDebtsList || !noDebtsMessage) return;
        
        // Tính toán công nợ
        const customerDebts = await calculateAllCustomerDebts();
        
        // Xóa nội dung hiện tại
        customerDebtsList.innerHTML = '';
        
        if (customerDebts.length > 0) {
            // Ẩn thông báo không có dữ liệu
            noDebtsMessage.style.display = 'none';
            
            // Tính tổng công nợ và số khách hàng đang nợ
            const totalDebt = customerDebts.reduce((sum, debt) => sum + debt.totalDebt, 0);
            
            // Cập nhật tổng quan
            totalDebtAmount.textContent = formatCurrency(totalDebt);
            totalDebtors.textContent = customerDebts.length;
            
            // Hiển thị từng khách hàng
            customerDebts.forEach(debt => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="text-center"><strong>${debt.customerId}</strong></td>
                    <td><strong>${debt.customerName}</strong></td>
                    <td class="text-center"><span class="badge bg-secondary">${debt.unpaidOrderCount}</span></td>
                    <td class="text-end"><strong>${formatCurrency(debt.totalOrderValue)}</strong></td>
                    <td class="text-end text-success"><strong>${formatCurrency(debt.totalPaymentReceived)}</strong></td>
                    <td class="text-end text-danger"><strong>${formatCurrency(debt.totalDebt)}</strong></td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-primary view-customer-debt-btn" data-id="${debt.customerId}">
                            <i class="bi bi-eye"></i> Chi tiết
                        </button>
                    </td>
                `;
                
                customerDebtsList.appendChild(row);
            });
            
            // Thêm event listener cho nút chi tiết
            document.querySelectorAll('.view-customer-debt-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const customerId = parseInt(e.target.getAttribute('data-id'));
                    await showCustomerDebtDetail(customerId);
                });
            });
        } else {
            // Hiển thị thông báo không có dữ liệu
            noDebtsMessage.style.display = 'block';
            
            // Đặt tổng quan về 0
            totalDebtAmount.textContent = formatCurrency(0);
            totalDebtors.textContent = '0';
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị công nợ:', error);
    }
}

// Hiển thị chi tiết công nợ của một khách hàng (cải thiện)
async function showCustomerDebtDetail(customerId) {
    try {
        // Lấy thông tin khách hàng và đơn hàng
        const tx = db.transaction(['customers', 'orders'], 'readonly');
        const customerStore = tx.objectStore('customers');
        const orderStore = tx.objectStore('orders');
        
        const customer = await customerStore.get(customerId);
        if (!customer) {
            alert('Không tìm thấy thông tin khách hàng!');
            return;
        }
        
        const orders = await orderStore.getAll();
        const customerOrders = orders.filter(order => order.customerId === customerId);
        
        // Tính toán chi tiết công nợ
        let totalOrderValue = 0;
        let totalPaymentReceived = 0;
        const debtOrders = [];
        const tripDebts = {}; // Nhóm theo chuyến hàng
        
        for (const order of customerOrders) {
            if (order.items && Array.isArray(order.items)) {
                const orderValue = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                const paymentReceived = order.paymentReceived || 0;
                const remainingDebt = orderValue - paymentReceived;
                
                // Chỉ hiển thị đơn hàng còn nợ
                if (remainingDebt > 0) {
                    totalOrderValue += orderValue;
                    totalPaymentReceived += paymentReceived;
                    
                    const isOverdue = order.dueDate && new Date(order.dueDate) < new Date();
                    const tripId = order.deliveredTripId;
                    
                    const orderDebt = {
                        ...order,
                        orderValue,
                        paymentReceived,
                        remainingDebt,
                        isOverdue,
                        tripId
                    };
                    
                    debtOrders.push(orderDebt);
                    
                    // Nhóm theo chuyến hàng
                    if (tripId) {
                        if (!tripDebts[tripId]) {
                            tripDebts[tripId] = {
                                tripId,
                                orders: [],
                                totalDebt: 0,
                                overdueDebt: 0
                            };
                        }
                        tripDebts[tripId].orders.push(orderDebt);
                        tripDebts[tripId].totalDebt += remainingDebt;
                        if (isOverdue) {
                            tripDebts[tripId].overdueDebt += remainingDebt;
                        }
                    }
                }
            }
        }
        
        // Tính công nợ còn lại tổng cộng
        const totalRemainingDebt = totalOrderValue - totalPaymentReceived;
        const totalOverdue = debtOrders.filter(order => order.isOverdue).reduce((sum, order) => sum + order.remainingDebt, 0);
        
        // Tạo modal hiển thị chi tiết (cải thiện)
        const modalHtml = `
            <div class="modal fade" id="customerDebtModal" tabindex="-1" aria-labelledby="customerDebtModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="customerDebtModalLabel">Chi tiết công nợ - ${customer.name} (ID: ${customer.id})</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Tổng quan công nợ -->
                            <div class="row mb-4">
                                <div class="col-md-3">
                                    <div class="card bg-danger text-white">
                                        <div class="card-body text-center">
                                            <h6 class="card-title">Tổng công nợ</h6>
                                            <p class="card-text fs-4">${formatCurrency(totalRemainingDebt)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="card bg-warning text-dark">
                                        <div class="card-body text-center">
                                            <h6 class="card-title">Nợ quá hạn</h6>
                                            <p class="card-text fs-4">${formatCurrency(totalOverdue)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="card bg-success text-white">
                                        <div class="card-body text-center">
                                            <h6 class="card-title">Đã thanh toán</h6>
                                            <p class="card-text fs-4">${formatCurrency(totalPaymentReceived)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="card bg-info text-white">
                                        <div class="card-body text-center">
                                            <h6 class="card-title">Số đơn còn nợ</h6>
                                            <p class="card-text fs-4">${debtOrders.length}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Công nợ theo chuyến hàng -->
                            ${Object.keys(tripDebts).length > 0 ? `
                                <h6 class="mb-3">Công nợ theo chuyến hàng</h6>
                                <div class="accordion mb-4" id="tripDebtAccordion">
                                    ${Object.values(tripDebts).map((trip, index) => `
                                        <div class="accordion-item">
                                            <h2 class="accordion-header" id="trip-${trip.tripId}">
                                                <button class="accordion-button ${index === 0 ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-trip-${trip.tripId}" aria-expanded="${index === 0 ? 'true' : 'false'}" aria-controls="collapse-trip-${trip.tripId}">
                                                    <strong>Chuyến ${trip.tripId}</strong>
                                                    <span class="ms-3 badge bg-danger">${formatCurrency(trip.totalDebt)}</span>
                                                    ${trip.overdueDebt > 0 ? `<span class="ms-2 badge bg-warning">Quá hạn: ${formatCurrency(trip.overdueDebt)}</span>` : ''}
                                                    <span class="ms-2 text-muted">(${trip.orders.length} đơn hàng)</span>
                                                </button>
                                            </h2>
                                            <div id="collapse-trip-${trip.tripId}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" aria-labelledby="trip-${trip.tripId}" data-bs-parent="#tripDebtAccordion">
                                                <div class="accordion-body">
                                                    <div class="table-responsive">
                                                        <table class="table table-striped table-hover align-middle">
                                                            <thead class="table-dark">
                                                                <tr>
                                                                    <th scope="col" class="text-center" style="width: 100px;">Đơn hàng</th>
                                                                    <th scope="col" class="text-center" style="width: 110px;">Ngày đặt</th>
                                                                    <th scope="col" class="text-end" style="width: 120px;">Giá trị</th>
                                                                    <th scope="col" class="text-end" style="width: 120px;">Đã thanh toán</th>
                                                                    <th scope="col" class="text-end" style="width: 120px;">Còn nợ</th>
                                                                    <th scope="col" class="text-center" style="width: 130px;">Hạn thanh toán</th>
                                                                    <th scope="col" class="text-center" style="width: 80px;">Thao tác</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                ${trip.orders.map(order => `
                                                                    <tr class="${order.isOverdue ? 'table-danger' : ''}">
                                                                        <td class="text-center">
                                                                            <strong>${order.id}</strong>
                                                                            ${order.isOverdue ? '<div><span class="badge bg-danger">Quá hạn</span></div>' : ''}
                                                                        </td>
                                                                        <td class="text-center">${formatDate(order.orderDate)}</td>
                                                                        <td class="text-end"><strong>${formatCurrency(order.orderValue)}</strong></td>
                                                                        <td class="text-end text-success"><strong>${formatCurrency(order.paymentReceived)}</strong></td>
                                                                        <td class="text-end text-danger"><strong>${formatCurrency(order.remainingDebt)}</strong></td>
                                                                        <td class="text-center">${order.dueDate ? formatDate(order.dueDate) : '<em class="text-muted">Không có</em>'}</td>
                                                                        <td class="text-center">
                                                                            <button class="btn btn-sm btn-primary view-order-btn" data-id="${order.id}">
                                                                                <i class="bi bi-eye"></i> Xem
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                `).join('')}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            <!-- Tất cả đơn hàng còn nợ -->
                            <h6 class="mb-3">Tất cả đơn hàng còn nợ (${debtOrders.length} đơn)</h6>
                            ${debtOrders.length > 0 ? `
                                <div class="table-responsive">
                                    <table class="table table-striped table-hover align-middle">
                                        <thead class="table-dark">
                                            <tr>
                                                <th scope="col" class="text-center" style="width: 100px;">Đơn hàng</th>
                                                <th scope="col" class="text-center" style="width: 110px;">Ngày đặt</th>
                                                <th scope="col" class="text-center" style="width: 90px;">Chuyến</th>
                                                <th scope="col" class="text-end" style="width: 120px;">Giá trị</th>
                                                <th scope="col" class="text-end" style="width: 120px;">Đã thanh toán</th>
                                                <th scope="col" class="text-end" style="width: 120px;">Còn nợ</th>
                                                <th scope="col" class="text-center" style="width: 130px;">Hạn thanh toán</th>
                                                <th scope="col" class="text-center" style="width: 80px;">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${debtOrders.map(order => `
                                                <tr class="${order.isOverdue ? 'table-danger' : ''}">
                                                    <td class="text-center">
                                                        <strong>${order.id}</strong>
                                                        ${order.isOverdue ? '<div><span class="badge bg-danger">Quá hạn</span></div>' : ''}
                                                    </td>
                                                    <td class="text-center">${formatDate(order.orderDate)}</td>
                                                    <td class="text-center">${order.tripId ? `<span class="badge bg-info">T.${order.tripId}</span>` : '<em class="text-muted">Chưa giao</em>'}</td>
                                                    <td class="text-end"><strong>${formatCurrency(order.orderValue)}</strong></td>
                                                    <td class="text-end text-success"><strong>${formatCurrency(order.paymentReceived)}</strong></td>
                                                    <td class="text-end text-danger"><strong>${formatCurrency(order.remainingDebt)}</strong></td>
                                                    <td class="text-center">${order.dueDate ? formatDate(order.dueDate) : '<em class="text-muted">Không có</em>'}</td>
                                                    <td class="text-center">
                                                        <button class="btn btn-sm btn-primary view-order-btn" data-id="${order.id}">
                                                            <i class="bi bi-eye"></i> Xem
                                                        </button>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : '<div class="alert alert-info">Không có đơn hàng nào còn nợ.</div>'}
                            
                            <!-- Thông tin khuyến nghị -->
                            ${totalRemainingDebt > 0 ? `
                                <div class="alert alert-info">
                                    <h6><i class="bi bi-info-circle"></i> Thông tin</h6>
                                    <ul class="mb-0">
                                        <li>Khách hàng này còn nợ tổng cộng <strong>${formatCurrency(totalRemainingDebt)}</strong></li>
                                        ${totalOverdue > 0 ? `<li class="text-danger">Có <strong>${formatCurrency(totalOverdue)}</strong> đã quá hạn thanh toán</li>` : ''}
                                        <li>Thanh toán được quản lý trực tiếp trong phần <strong>Chuyến hàng</strong></li>
                                        <li>Nhấn "Xem" để xem chi tiết từng đơn hàng</li>
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                            ${totalRemainingDebt > 0 ? `
                                <button type="button" class="btn btn-primary" id="goto-trips-btn">Đi đến chuyến hàng</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Thêm modal vào DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        
        // Hiển thị modal
        const modal = new bootstrap.Modal(document.getElementById('customerDebtModal'));
        modal.show();
        
        // Xử lý sự kiện nút đi đến chuyến hàng
        if (totalRemainingDebt > 0) {
            document.getElementById('goto-trips-btn').addEventListener('click', () => {
                // Đóng modal
                modal.hide();
                
                // Chuyển đến tab chuyến hàng
                document.getElementById('trips-tab').click();
                
                // Hiển thị thông báo
                setTimeout(() => {
                    alert(`Bạn có thể quản lý thanh toán cho khách hàng ${customer.name} trong phần "Đơn hàng liên kết" của từng chuyến hàng.`);
                }, 500);
            });
        }
        
        // Xử lý sự kiện nút xem đơn hàng
        document.querySelectorAll('.view-order-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const orderId = parseInt(e.target.getAttribute('data-id'));
                
                // Đóng modal
                modal.hide();
                
                // Hiển thị chi tiết đơn hàng (sử dụng window.showOrderDetail an toàn)
                try {
                    if (typeof window.showOrderDetail === 'function') {
                        await window.showOrderDetail(orderId);
                    } else {
                        alert('Chức năng xem chi tiết đơn hàng chưa sẵn sàng. Vui lòng thử lại sau.');
                    }
                } catch (error) {
                    console.error('Lỗi khi hiển thị chi tiết đơn hàng:', error);
                    alert('Có lỗi khi hiển thị chi tiết đơn hàng. Vui lòng thử lại.');
                }
            });
        });
        
        // Xóa modal khi đóng
        document.getElementById('customerDebtModal').addEventListener('hidden.bs.modal', () => {
            modalContainer.remove();
        });
    } catch (error) {
        console.error('Lỗi khi hiển thị chi tiết công nợ:', error);
    }
}

// Tìm kiếm công nợ
function searchCustomerDebts(keyword) {
    const rows = document.querySelectorAll('#customer-debts-list tr');
    const noDebtsMessage = document.getElementById('no-debts-message');
    
    let hasVisibleRows = false;
    
    rows.forEach(row => {
        const customerName = row.cells[1].textContent.toLowerCase();
        
        if (customerName.includes(keyword.toLowerCase())) {
            row.style.display = '';
            hasVisibleRows = true;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Hiển thị hoặc ẩn thông báo không có dữ liệu
    if (noDebtsMessage) {
        noDebtsMessage.style.display = hasVisibleRows ? 'none' : 'block';
        if (!hasVisibleRows) {
            noDebtsMessage.textContent = `Không tìm thấy khách hàng nào phù hợp với từ khóa "${keyword}"`;
        }
    }
}

// Thiết lập các event listener cho quản lý công nợ
function setupDebtEventListeners() {
    // Nút làm mới công nợ
    const refreshDebtsBtn = document.getElementById('refresh-debts-btn');
    if (refreshDebtsBtn) {
        refreshDebtsBtn.addEventListener('click', async () => {
            await displayCustomerDebts();
        });
    }
    
    // Ô tìm kiếm công nợ
    const debtSearchInput = document.getElementById('debt-search');
    if (debtSearchInput) {
        debtSearchInput.addEventListener('input', () => {
            searchCustomerDebts(debtSearchInput.value.trim());
        });
    }
    
    // Nút xuất Excel
    const exportDebtsBtn = document.getElementById('export-debts-btn');
    if (exportDebtsBtn) {
        exportDebtsBtn.addEventListener('click', async () => {
            await exportDebtsToExcel();
        });
    }
}

// Xuất công nợ ra Excel
async function exportDebtsToExcel() {
    try {
        // Tính toán công nợ
        const customerDebts = await calculateAllCustomerDebts();
        
        if (customerDebts.length === 0) {
            alert('Không có dữ liệu công nợ để xuất');
            return;
        }
        
        // Tạo dữ liệu CSV
        let csvContent = 'ID,Tên khách hàng,Số đơn nợ,Tổng nợ,Nợ quá hạn\n';
        
        customerDebts.forEach(debt => {
            csvContent += `${debt.customerId},"${debt.customerName}",${debt.unpaidOrderCount},${debt.totalDebt},${debt.overdueAmount}\n`;
        });
        
        // Tạo file CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // Tạo link tải xuống
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `cong-no-khach-hang-${formatDateForFilename(new Date())}.csv`;
        
        // Thêm link vào DOM, click và xóa
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        console.log('Đã xuất công nợ thành công');
    } catch (error) {
        console.error('Lỗi khi xuất công nợ:', error);
        alert('Lỗi khi xuất công nợ: ' + error.message);
    }
}

// Hàm khởi động module công nợ - có thể gọi từ script.js
window.loadDebtModule = async function() {
    try {
        // Đảm bảo DB đã sẵn sàng
        if (!db) {
            console.error('Không thể khởi tạo module công nợ: Database chưa sẵn sàng');
            return false;
        }
        
        // Hiển thị danh sách công nợ
        await displayCustomerDebts();
        
        // Thiết lập các event listener
        setupDebtEventListeners();
        
        console.log('Module công nợ đã khởi tạo thành công');
        return true;
    } catch (error) {
        console.error('Lỗi khi khởi tạo module công nợ:', error);
        return false;
    }
};
