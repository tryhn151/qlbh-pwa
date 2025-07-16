// ===== DEBT MANAGEMENT MODULE =====
const DebtModule = {
    // ===== DATA =====
    data: {
        customerDebts: [],
        legacyDebts: [],
        isInitialized: false
    },

    // ===== CONFIG =====
    config: {
        // Có thể bổ sung config nếu cần
    },

    // ===== UTILS =====
    utils: {
        async waitForDB() {
            return new Promise((resolve) => {
                if (window.db) {
    try {
                        const tx = window.db.transaction('customers', 'readonly');
                        tx.abort();
                        resolve(window.db);
                        return;
                    } catch {}
                }
                let attempts = 0;
                const maxAttempts = 150;
                const checkInterval = setInterval(() => {
                    attempts++;
                    if (window.db) {
                        try {
                            const tx = window.db.transaction('customers', 'readonly');
                            tx.abort();
                            clearInterval(checkInterval);
                            resolve(window.db);
        } catch {}
                    } else if (attempts >= maxAttempts) {
                        clearInterval(checkInterval);
                        resolve(null);
                    }
                }, 100);
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve(null);
                }, 15000);
            });
        },
        formatCurrency(value) {
            if (typeof window.formatCurrency === 'function') return window.formatCurrency(value);
            return value?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) || '0 VNĐ';
        },
        formatDate(date) {
            if (typeof window.formatDate === 'function') return window.formatDate(date);
            if (!date) return '';
            const d = new Date(date);
            return d.toLocaleDateString('vi-VN');
        },
        formatDateForFilename(date) {
            if (!date) return '';
            const d = new Date(date);
            return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
        }
    },

    // ===== VALIDATION =====
    validation: {
        // Có thể bổ sung validate nếu cần
    },

    // ===== DATABASE =====
    database: {
        async getAllCustomers() {
            const db = await DebtModule.utils.waitForDB();
            if (!db) return [];
            const tx = db.transaction(['customers'], 'readonly');
            return await tx.objectStore('customers').getAll();
        },
        async getAllOrders() {
            const db = await DebtModule.utils.waitForDB();
            if (!db) return [];
            const tx = db.transaction(['orders'], 'readonly');
            return await tx.objectStore('orders').getAll();
        },
        async getAllLegacyDebts() {
            const db = await DebtModule.utils.waitForDB();
            if (!db) return [];
            const tx = db.transaction(['legacyDebts'], 'readonly');
            return await tx.objectStore('legacyDebts').getAll();
        },
        async addLegacyDebt({ customerId, amount, note, date }) {
            const db = await DebtModule.utils.waitForDB();
            if (!db) return;
            const tx = db.transaction(['legacyDebts'], 'readwrite');
            await tx.objectStore('legacyDebts').add({ customerId, amount, note, date });
            await tx.done;
        },
        async getLegacyDebtTotal(customerId) {
            const all = await DebtModule.database.getAllLegacyDebts();
            return all.filter(d => d.customerId === customerId).reduce((sum, d) => sum + (d.amount || 0), 0);
        }
    },

    // ===== UI =====
    ui: {
        showSuccess(message) {
            const toastContainer = document.getElementById('toast-container') || DebtModule.ui.createToastContainer();
            const toast = document.createElement('div');
            toast.className = 'toast show align-items-center text-white bg-success border-0';
            toast.setAttribute('role', 'alert');
            toast.innerHTML = `
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi bi-check-circle me-2"></i>${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            `;
            toastContainer.appendChild(toast);
            setTimeout(() => { toast.remove(); }, 3000);
        },
        createToastContainer() {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
            return container;
        },
        showErrors(errors) {
            const existingModal = document.getElementById('debtValidationErrorModal');
            if (existingModal) existingModal.remove();
            const modalHTML = `
                <div class="modal fade" id="debtValidationErrorModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content border-0 shadow-lg">
                            <div class="modal-header bg-danger text-white border-0">
                                <h5 class="modal-title">
                                    <i class="bi bi-exclamation-triangle-fill me-2"></i>Lỗi nhập liệu
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body py-4">
                                <div class="text-center mb-3">
                                    <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
                                </div>
                                <h6 class="text-center mb-3">Vui lòng kiểm tra lại thông tin:</h6>
                                <ul class="list-unstyled">
                                    ${errors.map(error => `<li class="mb-2"><i class="bi bi-x-circle text-danger me-2"></i>${error}</li>`).join('')}
                                </ul>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const modal = new bootstrap.Modal(document.getElementById('debtValidationErrorModal'));
            modal.show();
            document.getElementById('debtValidationErrorModal').addEventListener('hidden.bs.modal', function () {
                this.remove();
            });
        },
        renderDesktopTable() {
            const tableBody = document.getElementById('customer-debts-list');
            if (!tableBody) return;
            const table = tableBody.closest('table');
            if (table) {
                const thead = table.querySelector('thead');
                if (thead) {
                    thead.innerHTML = `
                        <tr class="align-middle table-primary">
                            <th class="text-center" scope="col" style="width: 80px;">ID</th>
                            <th scope="col">Tên khách hàng</th>
                            <th class="text-center" scope="col" style="width: 100px;">Số đơn nợ</th>
                            <th class="text-end" scope="col" style="width: 130px;">Tổng giá trị</th>
                            <th class="text-end" scope="col" style="width: 130px;">Đã thanh toán</th>
                            <th class="text-end" scope="col" style="width: 120px;">Còn nợ</th>
                            <th class="text-center" scope="col" style="width: 120px;">Thao tác</th>
                        </tr>
                    `;
                }
            }
        }
    },

    // ===== ACTIONS =====
    actions: {
        async calculateAllCustomerDebts() {
            try {
                const customers = await DebtModule.database.getAllCustomers();
                const orders = await DebtModule.database.getAllOrders();
                let legacyDebts = [];
                try { legacyDebts = await DebtModule.database.getAllLegacyDebts(); } catch {}
        const customerDebts = [];
        for (const customer of customers) {
            const customerOrders = orders.filter(order => order.customerId === customer.id);
            let totalOrderValue = 0;
            let totalPaymentReceived = 0;
            let unpaidOrderCount = 0;
                    const debtOrders = [];
            for (const order of customerOrders) {
                if (order.items && Array.isArray(order.items)) {
                    const orderValue = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                    const paymentReceived = order.paymentReceived || 0;
                    const remainingDebt = orderValue - paymentReceived;
                    if (remainingDebt > 0) {
                        totalOrderValue += orderValue;
                        totalPaymentReceived += paymentReceived;
                        unpaidOrderCount++;
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
            const totalRemainingDebt = totalOrderValue - totalPaymentReceived;
            const legacyDebt = legacyDebts.filter(d => d.customerId === customer.id).reduce((sum, d) => sum + (d.amount || 0), 0);
            const totalDebtAll = totalRemainingDebt + legacyDebt;
            if (totalDebtAll > 0) {
                customerDebts.push({
                    customerId: customer.id,
                    customerName: customer.name,
                    unpaidOrderCount,
                    totalOrderValue,
                    totalPaymentReceived,
                    totalDebt: totalRemainingDebt,
                    legacyDebt,
                    totalDebtAll,
                            debtOrders
                });
            }
        }
                DebtModule.data.customerDebts = customerDebts;
        return customerDebts;
    } catch (error) {
        console.error('Lỗi khi tính toán công nợ:', error);
        return [];
    }
        },
        async displayCustomerDebts() {
    try {
        const customerDebtsList = document.getElementById('customer-debts-list');
        const noDebtsMessage = document.getElementById('no-debts-message');
        const totalDebtAmount = document.getElementById('total-debt-amount');
        const totalDebtors = document.getElementById('total-debtors');
        if (!customerDebtsList || !noDebtsMessage) return;
                const customerDebts = await DebtModule.actions.calculateAllCustomerDebts();
        customerDebtsList.innerHTML = '';
        if (customerDebts.length > 0) {
            noDebtsMessage.style.display = 'none';
            const totalDebt = customerDebts.reduce((sum, debt) => sum + (debt.totalDebtAll), 0);
                    totalDebtAmount.textContent = DebtModule.utils.formatCurrency(totalDebt);
            totalDebtors.textContent = customerDebts.length;
            customerDebts.forEach(debt => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="text-center"><strong>${debt.customerId}</strong></td>
                    <td><strong>${debt.customerName}</strong></td>
                    <td class="text-center"><span class="badge bg-secondary">${debt.unpaidOrderCount}</span></td>
                            <td class="text-end"><strong>${DebtModule.utils.formatCurrency(debt.totalOrderValue)}</strong></td>
                            <td class="text-end text-success"><strong>${DebtModule.utils.formatCurrency(debt.totalPaymentReceived)}</strong></td>
                            <td class="text-end text-danger"><strong>${DebtModule.utils.formatCurrency(debt.totalDebtAll)}</strong>${debt.legacyDebt > 0 ? `<br><span class='badge bg-success'>Nợ cũ: ${DebtModule.utils.formatCurrency(debt.legacyDebt)}</span>` : ''}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-primary view-customer-debt-btn" data-id="${debt.customerId}">
                            <i class="bi bi-eye"></i> Chi tiết
                        </button>
                    </td>
                `;
                customerDebtsList.appendChild(row);
            });
            document.querySelectorAll('.view-customer-debt-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const customerId = parseInt(e.target.getAttribute('data-id'));
                            await DebtModule.actions.showCustomerDebtDetail(customerId);
                });
            });
        } else {
            noDebtsMessage.style.display = 'block';
                    totalDebtAmount.textContent = DebtModule.utils.formatCurrency(0);
            totalDebtors.textContent = '0';
        }
        DebtModule.ui.renderDesktopTable();
    } catch (error) {
        console.error('Lỗi khi hiển thị công nợ:', error);
    }
        },
        searchCustomerDebts(keyword) {
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
            if (noDebtsMessage) {
                noDebtsMessage.style.display = hasVisibleRows ? 'none' : 'block';
                if (!hasVisibleRows) {
                    noDebtsMessage.textContent = `Không tìm thấy khách hàng nào phù hợp với từ khóa "${keyword}"`;
                }
            }
        },
        setupDebtEventListeners() {
            const refreshDebtsBtn = document.getElementById('refresh-debts-btn');
            if (refreshDebtsBtn) {
                refreshDebtsBtn.addEventListener('click', async () => {
                    await DebtModule.actions.displayCustomerDebts();
                });
            }
            const debtSearchInput = document.getElementById('debt-search');
            if (debtSearchInput) {
                debtSearchInput.addEventListener('input', () => {
                    DebtModule.actions.searchCustomerDebts(debtSearchInput.value.trim());
                });
            }
            const exportDebtsBtn = document.getElementById('export-debts-btn');
            if (exportDebtsBtn) {
                exportDebtsBtn.addEventListener('click', async () => {
                    await DebtModule.actions.exportDebtsToExcel();
                });
            }
        },
        async exportDebtsToExcel() {
            try {
                const customerDebts = await DebtModule.actions.calculateAllCustomerDebts();
                if (customerDebts.length === 0) {
                    alert('Không có dữ liệu công nợ để xuất');
                    return;
                }
                let csvContent = 'ID,Tên khách hàng,Số đơn nợ,Tổng nợ,Nợ quá hạn\n';
                customerDebts.forEach(debt => {
                    csvContent += `${debt.customerId},"${debt.customerName}",${debt.unpaidOrderCount},${debt.totalDebtAll},${debt.legacyDebt}\n`;
                });
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                downloadLink.download = `cong-no-khach-hang-${DebtModule.utils.formatDateForFilename(new Date())}.csv`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                DebtModule.ui.showSuccess('Đã xuất công nợ thành công!');
            } catch (error) {
                console.error('Lỗi khi xuất công nợ:', error);
                alert('Lỗi khi xuất công nợ: ' + error.message);
            }
        },
        // ... giữ nguyên các hàm showCustomerDebtDetail, setupLegacyDebtModal, ...
        // Để ngắn gọn, các hàm này sẽ được chuyển vào DebtModule.actions và tham chiếu lại các hàm utils/ui/database
        // ...
        async showCustomerDebtDetail(customerId) {
    try {
        // Lấy thông tin khách hàng và đơn hàng
                const tx = db.transaction(['customers', 'orders', 'legacyDebts'], 'readonly');
        const customerStore = tx.objectStore('customers');
        const orderStore = tx.objectStore('orders');
                const legacyDebtStore = tx.objectStore('legacyDebts');
        
        const customer = await customerStore.get(customerId);
        if (!customer) {
            alert('Không tìm thấy thông tin khách hàng!');
            return;
        }
        
        const orders = await orderStore.getAll();
        const customerOrders = orders.filter(order => order.customerId === customerId);
                // Lấy công nợ cũ
                const allLegacyDebts = await legacyDebtStore.getAll();
                const legacyDebt = allLegacyDebts.filter(d => d.customerId === customerId).reduce((sum, d) => sum + (d.amount || 0), 0);
        
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
                    
                    const tripId = order.deliveredTripId;
                    
                    const orderDebt = {
                        ...order,
                        orderValue,
                        paymentReceived,
                        remainingDebt,
                        tripId
                    };
                    
                    debtOrders.push(orderDebt);
                    
                    // Nhóm theo chuyến hàng
                    if (tripId) {
                        if (!tripDebts[tripId]) {
                            tripDebts[tripId] = {
                                tripId,
                                orders: [],
                                        totalDebt: 0
                            };
                        }
                        tripDebts[tripId].orders.push(orderDebt);
                        tripDebts[tripId].totalDebt += remainingDebt;
                    }
                }
            }
        }
        
        // Tính công nợ còn lại tổng cộng
        const totalRemainingDebt = totalOrderValue - totalPaymentReceived;
                const totalDebtAll = totalRemainingDebt + legacyDebt;
        
                // Tạo modal hiển thị chi tiết (bổ sung card Công nợ cũ)
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
                                                    <p class="card-text fs-4">${DebtModule.utils.formatCurrency(totalDebtAll)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="card bg-warning text-dark">
                                        <div class="card-body text-center">
                                                    <h6 class="card-title">Công nợ cũ</h6>
                                                    <p class="card-text fs-4">${DebtModule.utils.formatCurrency(legacyDebt)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="card bg-success text-white">
                                        <div class="card-body text-center">
                                            <h6 class="card-title">Đã thanh toán</h6>
                                                    <p class="card-text fs-4">${DebtModule.utils.formatCurrency(totalPaymentReceived)}</p>
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
                                                            <span class="ms-3 badge bg-danger">${DebtModule.utils.formatCurrency(trip.totalDebt)}</span>
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
                                                                    <tr>
                                                                        <td class="text-center">
                                                                            <strong>${order.id}</strong>
                                                                        </td>
                                                                                <td class="text-center">${DebtModule.utils.formatDate(order.orderDate)}</td>
                                                                                <td class="text-end"><strong>${DebtModule.utils.formatCurrency(order.orderValue)}</strong></td>
                                                                                <td class="text-end text-success"><strong>${DebtModule.utils.formatCurrency(order.paymentReceived)}</strong></td>
                                                                                <td class="text-end text-danger"><strong>${DebtModule.utils.formatCurrency(order.remainingDebt)}</strong></td>
                                                                                <td class="text-center">${order.dueDate ? DebtModule.utils.formatDate(order.dueDate) : '<em class="text-muted">Không có</em>'}</td>
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
                                                <tr>
                                                    <td class="text-center">
                                                        <strong>${order.id}</strong>
                                                    </td>
                                                            <td class="text-center">${DebtModule.utils.formatDate(order.orderDate)}</td>
                                                    <td class="text-center">${order.tripId ? `<span class="badge bg-info">T.${order.tripId}</span>` : '<em class="text-muted">Chưa giao</em>'}</td>
                                                            <td class="text-end"><strong>${DebtModule.utils.formatCurrency(order.orderValue)}</strong></td>
                                                            <td class="text-end text-success"><strong>${DebtModule.utils.formatCurrency(order.paymentReceived)}</strong></td>
                                                            <td class="text-end text-danger"><strong>${DebtModule.utils.formatCurrency(order.remainingDebt)}</strong></td>
                                                            <td class="text-center">${order.dueDate ? DebtModule.utils.formatDate(order.dueDate) : '<em class="text-muted">Không có</em>'}</td>
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
                                    ${totalDebtAll > 0 ? `
                                <div class="alert alert-info">
                                    <h6><i class="bi bi-info-circle"></i> Thông tin</h6>
                                    <ul class="mb-0">
                                                <li>Khách hàng này còn nợ tổng cộng <strong>${DebtModule.utils.formatCurrency(totalDebtAll)}</strong></li>
                                                <li>Trong đó công nợ cũ là <strong>${DebtModule.utils.formatCurrency(legacyDebt)}</strong></li>
                                        <li>Thanh toán được quản lý trực tiếp trong phần <strong>Chuyến hàng</strong></li>
                                        <li>Nhấn "Xem" để xem chi tiết từng đơn hàng</li>
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                                    ${totalDebtAll > 0 ? `
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
                if (totalDebtAll > 0) {
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
        },
        setupLegacyDebtModal() {
    const btn = document.getElementById('add-legacy-debt-btn');
    if (!btn) return;
    let customers = [];
    let select = document.getElementById('legacy-debt-customer');
    let info = document.getElementById('legacy-debt-customer-info');
    let form = document.getElementById('legacy-debt-form');
    // Đảm bảo không lặp event
    select.onchange = null;
    form.onsubmit = null;
    btn.onclick = async () => {
        // Lấy danh sách khách hàng
        const tx = db.transaction(['customers'], 'readonly');
        const store = tx.objectStore('customers');
        customers = await store.getAll();
        // Đổ vào select
        select.innerHTML = '<option value="" selected disabled>Chọn khách hàng</option>';
        customers.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.name} (ID: ${c.id}${c.contact ? ', ' + c.contact : ''})`;
            select.appendChild(opt);
        });
        // Reset form
        form.reset();
        document.getElementById('legacy-debt-date').value = (new Date()).toISOString().slice(0,10);
        info.textContent = '';
        // Hiện modal
        const modal = new bootstrap.Modal(document.getElementById('legacyDebtModal'));
        modal.show();
        // Reset info khi đóng modal
        document.getElementById('legacyDebtModal').addEventListener('hidden.bs.modal', () => {
            form.reset();
            info.textContent = '';
        }, { once: true });
    };
    // Khi chọn khách hàng, hiển thị tổng nợ hiện tại
    select.onchange = async (e) => {
        const customerId = parseInt(e.target.value);
        if (!customerId) { info.textContent = ''; return; }
        let totalDebt = 0;
        try {
                    const allDebts = await DebtModule.actions.calculateAllCustomerDebts();
            const debt = allDebts.find(d => d.customerId === customerId);
            totalDebt = debt ? debt.totalDebtAll : 0;
        } catch {}
                info.textContent = `Tổng nợ hiện tại: ${DebtModule.utils.formatCurrency(totalDebt)}`;
    };
    // Xử lý submit form
    form.onsubmit = async (e) => {
        e.preventDefault();
        const customerId = parseInt(select.value);
        const amount = parseInt(document.getElementById('legacy-debt-amount').value);
        const note = document.getElementById('legacy-debt-note').value.trim();
        const date = document.getElementById('legacy-debt-date').value;
        if (!customerId || !amount || amount <= 0) {
            alert('Vui lòng chọn khách hàng và nhập số tiền nợ hợp lệ!');
            return;
        }
        // Xác nhận lại trước khi lưu
        const customerName = customers.find(c => c.id === customerId)?.name || '';
                if (!confirm(`Bạn chắc chắn muốn thêm công nợ cũ cho khách hàng "${customerName}" với số tiền ${DebtModule.utils.formatCurrency(amount)}?`)) {
            return;
        }
                await DebtModule.database.addLegacyDebt({ customerId, amount, note, date });
        bootstrap.Modal.getInstance(document.getElementById('legacyDebtModal')).hide();
                await DebtModule.actions.displayCustomerDebts();
        // Reset form và info
        form.reset();
        info.textContent = '';
                DebtModule.ui.showSuccess('Đã thêm công nợ cũ thành công!');
    };
}
    },

    // ===== EVENTS =====
    events: {
        async init() {
            await DebtModule.actions.displayCustomerDebts();
            DebtModule.actions.setupDebtEventListeners();
            DebtModule.actions.setupLegacyDebtModal();
        }
    },

    // ===== PUBLIC API =====
    async init() {
        if (DebtModule.data.isInitialized) return true;
        await DebtModule.events.init();
        DebtModule.data.isInitialized = true;
        window.DebtModule = DebtModule;
        return true;
    }
};

// ===== LEGACY EXPORTS =====
window.loadDebtModule = DebtModule.init;

// ===== UI: RENDER DESKTOP TABLE CÔNG NỢ =====
DebtModule.ui = DebtModule.ui || {};

DebtModule.ui.renderDesktopTable = function() {
    const tableBody = document.getElementById('customer-debts-list');
    if (!tableBody) return;
    const table = tableBody.closest('table');
    if (table) {
        const thead = table.querySelector('thead');
        if (thead) {
            thead.innerHTML = `
                <tr class="align-middle table-primary">
                    <th class="text-center" scope="col" style="width: 80px;">ID</th>
                    <th scope="col">Tên khách hàng</th>
                    <th class="text-center" scope="col" style="width: 100px;">Số đơn nợ</th>
                    <th class="text-end" scope="col" style="width: 130px;">Tổng giá trị</th>
                    <th class="text-end" scope="col" style="width: 130px;">Đã thanh toán</th>
                    <th class="text-end" scope="col" style="width: 120px;">Còn nợ</th>
                    <th class="text-center" scope="col" style="width: 120px;">Thao tác</th>
                </tr>
            `;
        }
    }
};
