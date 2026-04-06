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
        // Wait for database (Firestore shim - always ready after auth)
        async waitForDB() {
            return window.db || null;
        },
        formatCurrency(value) {
            if (typeof window.formatCurrency === 'function') return window.formatCurrency(value);
            if (value === null || value === undefined) return '0 K';
            return new Intl.NumberFormat('vi-VN', {
                style: 'decimal',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(value) + ' K';
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

                // Lấy tất cả các nguồn thanh toán
                let tripPayments = [];
                try { 
                    const payTx = db.transaction('payments', 'readonly');
                    tripPayments = await payTx.objectStore('payments').getAll();
                } catch (e) { console.warn('Store payments chưa có dữ liệu'); }

                let generalPayments = [];
                try { 
                    const genPayTx = db.transaction('customerPayments', 'readonly');
                    generalPayments = await genPayTx.objectStore('customerPayments').getAll();
                } catch (e) { console.warn('Store customerPayments chưa có dữ liệu'); }

                const customerDebts = [];

                for (const customer of customers) {
                    const customerIdStr = String(customer.id);
                    const customerOrders = orders.filter(order => String(order.customerId) === customerIdStr);
                    const customerTripPayments = tripPayments.filter(p => String(p.customerId) === customerIdStr);
                    const customerGeneralPayments = generalPayments.filter(p => String(p.customerId) === customerIdStr);

                    let totalOrderValue = 0;
                    let totalPaymentReceived = 0;
                    let unpaidOrderCount = 0;
                    const debtOrders = [];

                    for (const order of customerOrders) {
                        const orderValue = (order.items || []).reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                        
                        // Tính toán đã thanh toán dựa trên lịch sử thanh toán thực tế trong DB
                        const orderPayments = customerTripPayments.filter(p => String(p.orderId) === String(order.id));
                        const paymentReceived = orderPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                        
                        const remainingDebt = orderValue - paymentReceived;

                        totalOrderValue += orderValue;
                        // Lưu ý: totalPaymentReceived ở đây là tổng các khoản đã trả THEO ĐƠN
                        totalPaymentReceived += paymentReceived;

                        if (remainingDebt > 0) {
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

                    // Tính tổng thanh toán chung (không gắn với order cụ thể trong orders store)
                    // Note: tripPayments thường đã được cộng vào order.paymentReceived, 
                    // nhưng generalPayments thì chưa.
                    const totalGeneralPaid = customerGeneralPayments.reduce((sum, p) => sum + (p.amount || p.paymentAmount || 0), 0);
                    
                    const legacyDebt = legacyDebts.filter(d => String(d.customerId) === customerIdStr).reduce((sum, d) => sum + (d.amount || 0), 0);
                    
                    // Tổng nợ = (Giá trị đơn - Đã trả đơn) + Nợ cũ - Thanh toán chung
                    const totalDebtAll = (totalOrderValue - totalPaymentReceived) + legacyDebt - totalGeneralPaid;

                    if (totalDebtAll > 0) {
                        customerDebts.push({
                            customerId: customer.id,
                            customerName: customer.name,
                            unpaidOrderCount,
                            totalOrderValue,
                            totalPaymentReceived: totalPaymentReceived + totalGeneralPaid,
                            totalDebt: totalOrderValue - totalPaymentReceived,
                            legacyDebt,
                            totalGeneralPaid,
                            totalDebtAll: Math.max(0, totalDebtAll),
                            debtOrders,
                            payments: [
                                ...customerTripPayments.map(p => ({...p, type: 'Trip'})),
                                ...customerGeneralPayments.map(p => ({...p, type: 'General'}))
                            ].sort((a,b) => new Date(b.paymentDate) - new Date(a.paymentDate))
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

                // Xóa nội dung cũ ngay lập tức để tránh display stale data
                customerDebtsList.innerHTML = '<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 mb-0 text-muted small">Đang tính toán lại công nợ...</p></td></tr>';

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
           async showCustomerDebtDetail(customerId) {
            try {
                // Sử dụng hàm đã có để tính toán đầy đủ
                const allDebtData = await DebtModule.actions.calculateAllCustomerDebts();
                const debt = allDebtData.find(d => d.customerId == customerId);
                
                if (!debt) {
                    // Nếu không thấy trong danh sách nợ, lấy thông tin cơ bản để hiển thị 0
                    const tx = db.transaction(['customers'], 'readonly');
                    const customer = await tx.objectStore('customers').get(customerId);
                    alert(`Khách hàng ${customer?.name || customerId} hiện không có nợ.`);
                    return;
                }

                const { customerName, legacyDebt, totalOrderValue, totalPaymentReceived, totalDebtAll, debtOrders, payments, totalGeneralPaid } = debt;
        
                // Tạo modal hiển thị chi tiết (bổ sung card Công nợ cũ)
                const modalHtml = `
            <div class="modal fade" id="customerDebtModal" tabindex="-1" aria-labelledby="customerDebtModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl modal-dialog-scrollable">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header bg-dark text-white">
                            <h5 class="modal-title" id="customerDebtModalLabel">
                                <i class="bi bi-person-badge me-2"></i>Chi tiết công nợ: ${customerName}
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body bg-light">
                            <!-- Tổng quan công nợ -->
                            <div class="row g-3 mb-4">
                                <div class="col-md-3">
                                    <div class="card h-100 border-0 shadow-sm border-start border-danger border-4">
                                        <div class="card-body">
                                            <h6 class="text-muted small text-uppercase">Tổng dư nợ</h6>
                                            <p class="fs-4 fw-bold text-danger mb-0">${DebtModule.utils.formatCurrency(totalDebtAll)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="card h-100 border-0 shadow-sm border-start border-warning border-4">
                                        <div class="card-body">
                                            <h6 class="text-muted small text-uppercase">Nợ cũ / Nợ đơn</h6>
                                            <p class="fs-5 mb-0">${DebtModule.utils.formatCurrency(legacyDebt)} / ${DebtModule.utils.formatCurrency(debt.totalDebt)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="card h-100 border-0 shadow-sm border-start border-success border-4">
                                        <div class="card-body">
                                            <h6 class="text-muted small text-uppercase">Tổng đã trả</h6>
                                            <p class="fs-5 text-success fw-bold mb-0">${DebtModule.utils.formatCurrency(totalPaymentReceived)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="card h-100 border-0 shadow-sm border-start border-info border-4">
                                        <div class="card-body">
                                            <h6 class="text-muted small text-uppercase">Số đơn còn nợ</h6>
                                            <p class="fs-5 mb-0">${debtOrders.length} đơn hàng</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <!-- Cột trái: Danh sách đơn nợ -->
                                <div class="col-lg-8">
                                    <div class="card border-0 shadow-sm mb-4">
                                        <div class="card-header bg-white py-3">
                                            <h6 class="mb-0 fw-bold text-primary"><i class="bi bi-receipt-cutoff me-2"></i>Đơn hàng chưa thanh toán xong</h6>
                                        </div>
                                        <div class="card-body p-0">
                                            <div class="table-responsive">
                                                <table class="table table-hover align-middle mb-0">
                                                    <thead class="bg-light">
                                                        <tr>
                                                            <th class="ps-3">Đơn</th>
                                                            <th>Ngày</th>
                                                            <th class="text-end">Giá trị</th>
                                                            <th class="text-end">Đã trả</th>
                                                            <th class="text-end text-danger">Còn nợ</th>
                                                            <th class="text-center">Thao tác</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${debtOrders.map(order => `
                                                            <tr>
                                                                <td class="ps-3"><strong>#${order.orderId}</strong> ${order.tripId ? `<span class="badge bg-info p-1">T.${order.tripId}</span>` : ''}</td>
                                                                <td><small class="text-muted">${DebtModule.utils.formatDate(order.orderDate)}</small></td>
                                                                <td class="text-end font-monospace">${DebtModule.utils.formatCurrency(order.orderValue)}</td>
                                                                <td class="text-end text-success font-monospace">${DebtModule.utils.formatCurrency(order.paymentReceived)}</td>
                                                                <td class="text-end text-danger fw-bold font-monospace">${DebtModule.utils.formatCurrency(order.remainingDebt)}</td>
                                                                <td class="text-center">
                                                                    <button class="btn btn-sm btn-outline-primary view-order-btn" data-id="${order.orderId}">
                                                                        <i class="bi bi-eye"></i>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        `).join('')}
                                                        ${debtOrders.length === 0 ? '<tr><td colspan="6" class="text-center py-4 text-muted">Không có đơn hàng nợ</td></tr>' : ''}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Cột phải: Lịch sử thanh toán -->
                                <div class="col-lg-4">
                                    <div class="card border-0 shadow-sm mb-4">
                                        <div class="card-header bg-white py-3">
                                            <h6 class="mb-0 fw-bold text-success"><i class="bi bi-clock-history me-2"></i>Lịch sử thanh toán</h6>
                                        </div>
                                        <div class="card-body p-0">
                                            <div class="list-group list-group-flush" style="max-height: 400px; overflow-y: auto;">
                                                ${payments.length > 0 ? payments.map(p => `
                                                    <div class="list-group-item p-3">
                                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                                            <span class="badge ${p.type === 'Trip' ? 'bg-info' : 'bg-primary'}">${p.type === 'Trip' ? 'Theo chuyến' : 'Thanh toán chung'}</span>
                                                            <small class="text-muted">${DebtModule.utils.formatDate(p.paymentDate || p.createdAt)}</small>
                                                        </div>
                                                        <div class="d-flex justify-content-between align-items-center">
                                                            <strong class="text-success fs-5">+ ${DebtModule.utils.formatCurrency(p.amount || p.paymentAmount || 0)}</strong>
                                                            ${p.orderId ? `<small class="text-muted">Đơn #${p.orderId}</small>` : ''}
                                                        </div>
                                                        ${p.note ? `<div class="mt-1 small text-secondary fst-italic">${p.note}</div>` : ''}
                                                    </div>
                                                `).join('') : '<div class="p-4 text-center text-muted">Chưa có lịch sử thanh toán</div>'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="alert alert-info border-0 shadow-sm">
                                        <i class="bi bi-info-circle-fill me-2"></i> <strong>Thanh toán chung:</strong> Tổng tiền trả không theo đơn là <b>${DebtModule.utils.formatCurrency(totalGeneralPaid)}</b>. 
                                        Tiền này được trừ trực tiếp vào tổng nợ cuối cùng của khách.
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer bg-light border-0">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                            <button type="button" class="btn btn-primary" id="goto-trips-btn">
                                <i class="bi bi-truck me-2"></i>Quản lý ở Chuyến hàng
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Thêm modal vào DOM (giữ nguyên phần code modal hide/show và event listener bên dưới)
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        
        // Hiển thị modal
        const modal = new bootstrap.Modal(document.getElementById('customerDebtModal'));
        modal.show();
        
        // Xử lý sự kiện nút đi đến chuyến hàng
        document.getElementById('goto-trips-btn').addEventListener('click', () => {
            modal.hide();
            document.getElementById('trips-tab').click();
            setTimeout(() => {
                alert(`Bạn có thể quản lý thanh toán cho khách hàng ${customerName} trong phần "Đơn hàng liên kết" của từng chuyến hàng.`);
            }, 500);
        });
        
        // Xử lý sự kiện nút xem đơn hàng
        document.querySelectorAll('.view-order-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const orderId = parseInt(button.getAttribute('data-id'));
                modal.hide();
                try {
                    if (typeof window.showOrderDetail === 'function') {
                        await window.showOrderDetail(orderId);
                    } else {
                        alert('Chức năng xem chi tiết đơn hàng chưa sẵn sàng.');
                    }
                } catch (error) {
                    console.error('Lỗi khi hiển thị chi tiết đơn hàng:', error);
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
                    const debt = allDebts.find(d => d.customerId == customerId);
                    totalDebt = debt ? debt.totalDebtAll : 0;
                } catch {}
                info.textContent = `Tổng nợ hiện tại: ${DebtModule.utils.formatCurrency(totalDebt)}`;
    };
    // Xử lý submit form
    form.onsubmit = async (e) => {
        e.preventDefault();
        const customerId = parseInt(select.value);
        const amount = parseFloat(document.getElementById('legacy-debt-amount').value);
        const note = document.getElementById('legacy-debt-note').value.trim();
        const date = document.getElementById('legacy-debt-date').value;
        if (!customerId || !amount || amount <= 0) {
            alert('Vui lòng chọn khách hàng và nhập số tiền nợ hợp lệ!');
            return;
        }
        // Xác nhận lại trước khi lưu
        const customerName = customers.find(c => c.id == customerId)?.name || '';
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
