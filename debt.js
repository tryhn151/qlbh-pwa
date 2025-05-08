// ===== CÁC HÀM XỬ LÝ CHO QUẢN LÝ CÔNG NỢ =====

// Tính toán công nợ của tất cả khách hàng
async function calculateAllCustomerDebts() {
    try {
        // Lấy tất cả khách hàng
        const customerTx = db.transaction('customers', 'readonly');
        const customerStore = customerTx.objectStore('customers');
        const customers = await customerStore.getAll();
        
        // Lấy tất cả đơn hàng
        const orderTx = db.transaction('orders', 'readonly');
        const orderStore = orderTx.objectStore('orders');
        const orders = await orderStore.getAll();
        
        // Lấy tất cả thanh toán
        const paymentTx = db.transaction('customerPayments', 'readonly');
        const paymentStore = paymentTx.objectStore('customerPayments');
        const payments = await paymentStore.getAll();
        
        // Tính toán công nợ cho từng khách hàng
        const customerDebts = [];
        
        for (const customer of customers) {
            // Lọc đơn hàng của khách hàng
            const customerOrders = orders.filter(order => order.customerId === customer.id);
            
            // Tính tổng giá trị đơn hàng
            let totalOrderValue = 0;
            let unpaidOrderCount = 0;
            let overdueAmount = 0;
            
            for (const order of customerOrders) {
                // Tính giá trị đơn hàng
                if (order.items && Array.isArray(order.items)) {
                    const orderValue = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                    
                    // Kiểm tra trạng thái thanh toán
                    if (!order.paymentStatus || order.paymentStatus !== 'Đã thanh toán đủ') {
                        totalOrderValue += orderValue;
                        unpaidOrderCount++;
                        
                        // Kiểm tra quá hạn
                        if (order.dueDate && new Date(order.dueDate) < new Date()) {
                            overdueAmount += orderValue;
                        }
                    }
                }
            }
            
            // Lọc thanh toán của khách hàng
            const customerPayments = payments.filter(payment => payment.customerId === customer.id);
            
            // Tính tổng thanh toán
            const totalPayment = customerPayments.reduce((sum, payment) => sum + payment.amount, 0);
            
            // Tính công nợ còn lại
            const remainingDebt = totalOrderValue - totalPayment;
            
            if (remainingDebt > 0) {
                customerDebts.push({
                    customerId: customer.id,
                    customerName: customer.name,
                    unpaidOrderCount,
                    totalDebt: remainingDebt,
                    overdueAmount
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
        const overdueDebtAmount = document.getElementById('overdue-debt-amount');
        
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
            const totalOverdue = customerDebts.reduce((sum, debt) => sum + debt.overdueAmount, 0);
            
            // Cập nhật tổng quan
            totalDebtAmount.textContent = formatCurrency(totalDebt);
            totalDebtors.textContent = customerDebts.length;
            overdueDebtAmount.textContent = formatCurrency(totalOverdue);
            
            // Hiển thị từng khách hàng
            customerDebts.forEach(debt => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${debt.customerId}</td>
                    <td>${debt.customerName}</td>
                    <td class="text-center">${debt.unpaidOrderCount}</td>
                    <td class="text-end">${formatCurrency(debt.totalDebt)}</td>
                    <td class="text-end ${debt.overdueAmount > 0 ? 'text-danger' : ''}">${formatCurrency(debt.overdueAmount)}</td>
                    <td>
                        <button class="btn btn-sm btn-primary view-customer-debt-btn" data-id="${debt.customerId}">
                            Chi tiết
                        </button>
                        <button class="btn btn-sm btn-success add-payment-btn" data-id="${debt.customerId}" data-name="${debt.customerName}">
                            Thanh toán
                        </button>
                    </td>
                `;
                
                customerDebtsList.appendChild(row);
            });
            
            // Thêm event listener cho các nút
            document.querySelectorAll('.view-customer-debt-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const customerId = parseInt(e.target.getAttribute('data-id'));
                    await showCustomerDebtDetail(customerId);
                });
            });
            
            document.querySelectorAll('.add-payment-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const customerId = parseInt(e.target.getAttribute('data-id'));
                    const customerName = e.target.getAttribute('data-name');
                    
                    // Chuyển đến tab thanh toán và điền thông tin khách hàng
                    document.getElementById('payments-tab').click();
                    
                    // Điền thông tin khách hàng vào form thanh toán
                    const customerSelect = document.getElementById('payment-customer');
                    if (customerSelect) {
                        customerSelect.value = customerId;
                        
                        // Kích hoạt sự kiện change để cập nhật thông tin công nợ
                        customerSelect.dispatchEvent(new Event('change'));
                    }
                });
            });
        } else {
            // Hiển thị thông báo không có dữ liệu
            noDebtsMessage.style.display = 'block';
            
            // Đặt tổng quan về 0
            totalDebtAmount.textContent = formatCurrency(0);
            totalDebtors.textContent = '0';
            overdueDebtAmount.textContent = formatCurrency(0);
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị công nợ:', error);
    }
}

// Hiển thị chi tiết công nợ của một khách hàng
async function showCustomerDebtDetail(customerId) {
    try {
        // Lấy thông tin khách hàng
        const customerTx = db.transaction('customers', 'readonly');
        const customerStore = customerTx.objectStore('customers');
        const customer = await customerStore.get(customerId);
        
        if (!customer) {
            alert('Không tìm thấy thông tin khách hàng!');
            return;
        }
        
        // Lấy đơn hàng của khách hàng
        const orderTx = db.transaction('orders', 'readonly');
        const orderStore = orderTx.objectStore('orders');
        const orders = await orderStore.getAll();
        const customerOrders = orders.filter(order => order.customerId === customerId);
        
        // Lấy thanh toán của khách hàng
        const paymentTx = db.transaction('customerPayments', 'readonly');
        const paymentStore = paymentTx.objectStore('customerPayments');
        const paymentIndex = paymentStore.index('customerId');
        const customerPayments = await paymentIndex.getAll(customerId);
        
        // Tính tổng giá trị đơn hàng và tổng thanh toán
        let totalOrderValue = 0;
        const unpaidOrders = [];
        
        for (const order of customerOrders) {
            // Tính giá trị đơn hàng
            if (order.items && Array.isArray(order.items)) {
                const orderValue = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                
                // Kiểm tra trạng thái thanh toán
                if (!order.paymentStatus || order.paymentStatus !== 'Đã thanh toán đủ') {
                    totalOrderValue += orderValue;
                    
                    unpaidOrders.push({
                        ...order,
                        orderValue,
                        isOverdue: order.dueDate && new Date(order.dueDate) < new Date()
                    });
                }
            }
        }
        
        // Tính tổng thanh toán
        const totalPayment = customerPayments.reduce((sum, payment) => sum + payment.amount, 0);
        
        // Tính công nợ còn lại
        const remainingDebt = totalOrderValue - totalPayment;
        
        // Tạo modal hiển thị chi tiết
        const modalHtml = `
            <div class="modal fade" id="customerDebtModal" tabindex="-1" aria-labelledby="customerDebtModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="customerDebtModalLabel">Chi tiết công nợ - ${customer.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-4">
                                <div class="col-md-4">
                                    <div class="card bg-light">
                                        <div class="card-body text-center">
                                            <h6 class="card-title">Tổng nợ</h6>
                                            <p class="card-text fs-4 text-danger">${formatCurrency(remainingDebt)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="card bg-light">
                                        <div class="card-body text-center">
                                            <h6 class="card-title">Đã thanh toán</h6>
                                            <p class="card-text fs-4 text-success">${formatCurrency(totalPayment)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="card bg-light">
                                        <div class="card-body text-center">
                                            <h6 class="card-title">Số đơn chưa thanh toán</h6>
                                            <p class="card-text fs-4">${unpaidOrders.length}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <h6 class="mb-3">Đơn hàng chưa thanh toán đủ</h6>
                            ${unpaidOrders.length > 0 ? `
                                <div class="table-responsive">
                                    <table class="table table-sm table-striped">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Ngày đặt</th>
                                                <th>Giá trị</th>
                                                <th>Hạn thanh toán</th>
                                                <th>Trạng thái</th>
                                                <th>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${unpaidOrders.map(order => `
                                                <tr class="${order.isOverdue ? 'table-danger' : ''}">
                                                    <td>${order.id}</td>
                                                    <td>${formatDate(order.orderDate)}</td>
                                                    <td class="text-end">${formatCurrency(order.orderValue)}</td>
                                                    <td>${order.dueDate ? formatDate(order.dueDate) : 'Không có'}</td>
                                                    <td>${order.paymentStatus || 'Chưa thanh toán'}</td>
                                                    <td>
                                                        <button class="btn btn-sm btn-primary view-order-btn" data-id="${order.id}">
                                                            Xem
                                                        </button>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : '<div class="alert alert-info">Không có đơn hàng nào chưa thanh toán.</div>'}
                            
                            <h6 class="mb-3 mt-4">Lịch sử thanh toán</h6>
                            ${customerPayments.length > 0 ? `
                                <div class="table-responsive">
                                    <table class="table table-sm table-striped">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Ngày thanh toán</th>
                                                <th>Số tiền</th>
                                                <th>Ghi chú</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${customerPayments.map(payment => `
                                                <tr>
                                                    <td>${payment.id}</td>
                                                    <td>${formatDate(payment.paymentDate)}</td>
                                                    <td class="text-end">${formatCurrency(payment.amount)}</td>
                                                    <td>${payment.note || ''}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <th colspan="2" class="text-end">Tổng cộng:</th>
                                                <th class="text-end">${formatCurrency(totalPayment)}</th>
                                                <th></th>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ` : '<div class="alert alert-info">Chưa có lịch sử thanh toán.</div>'}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                            <button type="button" class="btn btn-success" id="add-payment-modal-btn">Thêm thanh toán</button>
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
        
        // Xử lý sự kiện nút thêm thanh toán
        document.getElementById('add-payment-modal-btn').addEventListener('click', () => {
            // Đóng modal
            modal.hide();
            
            // Chuyển đến tab thanh toán và điền thông tin khách hàng
            document.getElementById('payments-tab').click();
            
            // Điền thông tin khách hàng vào form thanh toán
            const customerSelect = document.getElementById('payment-customer');
            if (customerSelect) {
                customerSelect.value = customerId;
                
                // Kích hoạt sự kiện change để cập nhật thông tin công nợ
                customerSelect.dispatchEvent(new Event('change'));
            }
        });
        
        // Xử lý sự kiện nút xem đơn hàng
        document.querySelectorAll('.view-order-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const orderId = parseInt(e.target.getAttribute('data-id'));
                
                // Đóng modal
                modal.hide();
                
                // Hiển thị chi tiết đơn hàng
                await showOrderDetail(orderId);
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
