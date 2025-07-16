// ===== REPORT MANAGEMENT MODULE =====
const ReportModule = {
    // ===== DATA =====
    data: {
        reports: [],
        filter: {
            tripName: '',
            fromDate: '',
            toDate: ''
        },
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
                        const tx = window.db.transaction('trips', 'readonly');
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
                            const tx = window.db.transaction('trips', 'readonly');
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
        parseDate(dateStr) {
            if (!dateStr) return null;
            return new Date(dateStr);
        }
    },

    // ===== DATABASE =====
    database: {
        async getAllTrips() {
            const db = await ReportModule.utils.waitForDB();
            if (!db) return [];
            const tx = db.transaction(['trips'], 'readonly');
            return await tx.objectStore('trips').getAll();
        },
        async getAllPurchases() {
            const db = await ReportModule.utils.waitForDB();
            if (!db) return [];
            const tx = db.transaction(['purchases'], 'readonly');
            return await tx.objectStore('purchases').getAll();
        },
        async getAllOrders() {
            const db = await ReportModule.utils.waitForDB();
            if (!db) return [];
            const tx = db.transaction(['orders'], 'readonly');
            return await tx.objectStore('orders').getAll();
        },
        async getAllTripExpenses() {
            const db = await ReportModule.utils.waitForDB();
            if (!db) return [];
            const tx = db.transaction(['tripExpenses'], 'readonly');
            return await tx.objectStore('tripExpenses').getAll();
        }
    },

    // ===== UI =====
    ui: {
        showSuccess(message) {
            const toastContainer = document.getElementById('toast-container') || ReportModule.ui.createToastContainer();
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
            const existingModal = document.getElementById('reportValidationErrorModal');
            if (existingModal) existingModal.remove();
            const modalHTML = `
                <div class="modal fade" id="reportValidationErrorModal" tabindex="-1">
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
            const modal = new bootstrap.Modal(document.getElementById('reportValidationErrorModal'));
            modal.show();
            document.getElementById('reportValidationErrorModal').addEventListener('hidden.bs.modal', function () {
                this.remove();
            });
        },
        renderFilter() {
            const filterContainer = document.getElementById('report-filter-container');
            if (!filterContainer) return;
            filterContainer.innerHTML = `
                <div class="row g-2 align-items-end mb-3">
                    <div class="col-md-4">
                        <label class="form-label mb-1">Tìm theo tên chuyến</label>
                        <input type="text" class="form-control" id="report-filter-tripName" placeholder="Nhập tên chuyến..." value="${ReportModule.data.filter.tripName || ''}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label mb-1">Từ ngày</label>
                        <input type="date" class="form-control" id="report-filter-fromDate" value="${ReportModule.data.filter.fromDate || ''}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label mb-1">Đến ngày</label>
                        <input type="date" class="form-control" id="report-filter-toDate" value="${ReportModule.data.filter.toDate || ''}">
                    </div>
                    <div class="col-md-2 d-flex align-items-end">
                        <button class="btn btn-primary w-100" id="report-filter-apply"><i class="bi bi-funnel me-1"></i>Lọc</button>
                    </div>
                </div>
            `;
        }
    },

    // ===== ACTIONS =====
    actions: {
        async displayReports() {
            // Gọi renderFilter trước khi render bảng
            ReportModule.ui.renderFilter();
            // Lấy loại báo cáo đang được chọn
            const reportType = document.querySelector('input[name="report-type"]:checked')?.value || 'trip';
            switch (reportType) {
                case 'trip':
                    await ReportModule.actions.displayTripReports();
                    break;
                case 'month':
                    await ReportModule.actions.displayMonthlyReports();
                    break;
                case 'year':
                    await ReportModule.actions.displayYearlyReports();
                    break;
                default:
                    await ReportModule.actions.displayTripReports();
            }
        },
        async displayTripReports() {
            try {
                const reportsList = document.getElementById('reports-list');
                const noReportsMessage = document.getElementById('no-reports-message');
                const reportTitle = document.getElementById('report-title');

                if (!reportsList || !noReportsMessage) return;

                // Cập nhật tiêu đề báo cáo
                if (reportTitle) {
                    reportTitle.textContent = 'Báo cáo KQKD theo chuyến hàng';
                }

                // Cập nhật tiêu đề cột
                const reportTableHead = document.getElementById('report-table-head');
                if (reportTableHead) {
                    reportTableHead.innerHTML = `
                        <tr class="align-middle text-center table-primary">
                            <th style="width:60px;">ID</th>
                            <th style="min-width:180px;">Tên chuyến</th>
                            <th style="width:120px;">Ngày</th>
                            <th class="text-end" style="width:140px;">Tổng chi phí</th>
                            <th class="text-end" style="width:140px;">Tổng doanh thu</th>
                            <th class="text-end" style="width:140px;">Lợi nhuận gộp</th>
                        </tr>
                    `;
                }

                // Lấy filter
                const { tripName, fromDate, toDate } = ReportModule.data.filter;

                // Lấy tất cả chuyến hàng từ IndexedDB
                const db = await ReportModule.utils.waitForDB();
                const tx = db.transaction(['trips', 'purchases', 'orders', 'tripExpenses'], 'readonly');
                const tripStore = tx.objectStore('trips');
                let trips = await tripStore.getAll();

                // Áp dụng filter
                if (tripName) {
                    trips = trips.filter(trip => trip.tripName && trip.tripName.toLowerCase().includes(tripName.toLowerCase()));
                }
                if (fromDate) {
                    const from = new Date(fromDate);
                    trips = trips.filter(trip => new Date(trip.tripDate) >= from);
                }
                if (toDate) {
                    const to = new Date(toDate);
                    trips = trips.filter(trip => new Date(trip.tripDate) <= to);
                }

                // Sắp xếp chuyến hàng theo ngày mới nhất trước
                trips.sort((a, b) => new Date(b.tripDate) - new Date(a.tripDate));

                // Xóa nội dung hiện tại
                reportsList.innerHTML = '';

                if (trips.length > 0) {
                    // Ẩn thông báo không có dữ liệu
                    noReportsMessage.style.display = 'none';

                    // Hiển thị báo cáo cho từng chuyến hàng
                    let totalCost = 0;
                    let totalRevenue = 0;
                    
                    for (const trip of trips) {
                        // Tính toán kết quả kinh doanh cho chuyến hàng
                        const result = await ReportModule.actions.calculateTripProfitLoss(trip.id);

                        // Cộng dồn để tính tổng
                        totalCost += result.totalCost;
                        totalRevenue += result.totalRevenue;

                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td class="text-center fw-bold">${trip.id}</td>
                            <td class="text-start">${trip.tripName}</td>
                            <td class="text-center">${ReportModule.utils.formatDate(trip.tripDate)}</td>
                            <td class="text-end text-danger">${ReportModule.utils.formatCurrency(result.totalCost)}</td>
                            <td class="text-end text-primary">${ReportModule.utils.formatCurrency(result.totalRevenue)}</td>
                            <td class="text-end ${result.grossProfit >= 0 ? 'text-success' : 'text-danger'} fw-bold">${ReportModule.utils.formatCurrency(result.grossProfit)}</td>
                        `;

                        reportsList.appendChild(row);
                    }

                    // Tính tổng lợi nhuận
                    const totalProfit = totalRevenue - totalCost;

                    // Thêm dòng tổng cộng
                    const totalRow = document.createElement('tr');
                    totalRow.className = 'table-dark fw-bold';
                    totalRow.innerHTML = `
                        <td colspan="3" class="text-end">Tổng cộng:</td>
                        <td class="text-end text-danger">${ReportModule.utils.formatCurrency(totalCost)}</td>
                        <td class="text-end text-primary">${ReportModule.utils.formatCurrency(totalRevenue)}</td>
                        <td class="text-end ${totalProfit >= 0 ? 'text-success' : 'text-danger'}">${ReportModule.utils.formatCurrency(totalProfit)}</td>
                    `;

                    reportsList.appendChild(totalRow);
                } else {
                    // Hiển thị thông báo không có dữ liệu
                    noReportsMessage.style.display = 'block';
                }
            } catch (error) {
                console.error('Lỗi khi hiển thị báo cáo theo chuyến hàng:', error);
            }
        },
        async displayMonthlyReports() {
            try {
                const reportsList = document.getElementById('reports-list');
                const noReportsMessage = document.getElementById('no-reports-message');
                const reportTitle = document.getElementById('report-title');

                if (!reportsList || !noReportsMessage) return;

                // Cập nhật tiêu đề báo cáo
                if (reportTitle) {
                    reportTitle.textContent = 'Báo cáo KQKD theo tháng';
                }

                // Cập nhật tiêu đề cột
                const reportTableHead = document.getElementById('report-table-head');
                if (reportTableHead) {
                    reportTableHead.innerHTML = `
                        <tr class="align-middle text-center table-primary">
                            <th style="min-width:120px;">Tháng</th>
                            <th style="width:120px;">Số chuyến hàng</th>
                            <th class="text-end" style="width:140px;">Tổng chi phí</th>
                            <th class="text-end" style="width:140px;">Tổng doanh thu</th>
                            <th class="text-end" style="width:140px;">Lợi nhuận gộp</th>
                        </tr>
                    `;
                }

                // Lấy tất cả chuyến hàng từ IndexedDB
                const db = await ReportModule.utils.waitForDB();
                const tx = db.transaction(['trips', 'purchases', 'orders', 'tripExpenses'], 'readonly');
                const tripStore = tx.objectStore('trips');
                let trips = await tripStore.getAll();

                // Áp dụng filter
                const { tripName, fromDate, toDate } = ReportModule.data.filter;
                if (tripName) {
                    trips = trips.filter(trip => trip.tripName && trip.tripName.toLowerCase().includes(tripName.toLowerCase()));
                }
                if (fromDate) {
                    const from = new Date(fromDate);
                    trips = trips.filter(trip => new Date(trip.tripDate) >= from);
                }
                if (toDate) {
                    const to = new Date(toDate);
                    trips = trips.filter(trip => new Date(trip.tripDate) <= to);
                }

                // Xóa nội dung hiện tại
                reportsList.innerHTML = '';

                if (trips.length > 0) {
                    // Ẩn thông báo không có dữ liệu
                    noReportsMessage.style.display = 'none';

                    // Tạo đối tượng để lưu trữ dữ liệu theo tháng
                    const monthlyData = {};

                    // Tính toán kết quả kinh doanh cho từng chuyến hàng và nhóm theo tháng
                    for (const trip of trips) {
                        const tripDate = new Date(trip.tripDate);
                        const monthKey = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, '0')}`;
                        const monthName = `Tháng ${tripDate.getMonth() + 1}/${tripDate.getFullYear()}`;

                        // Tính toán kết quả kinh doanh cho chuyến hàng
                        const result = await ReportModule.actions.calculateTripProfitLoss(trip.id);

                        // Lưu kết quả vào đối tượng chuyến hàng để sử dụng sau này
                        trip._totalCost = result.totalCost;
                        trip._totalRevenue = result.totalRevenue;
                        trip._grossProfit = result.grossProfit;

                        // Thêm hoặc cập nhật dữ liệu tháng
                        if (!monthlyData[monthKey]) {
                            monthlyData[monthKey] = {
                                monthName,
                                tripCount: 0,
                                totalCost: 0,
                                totalRevenue: 0,
                                grossProfit: 0
                            };
                        }

                        monthlyData[monthKey].tripCount++;
                        monthlyData[monthKey].totalCost += result.totalCost;
                        monthlyData[monthKey].totalRevenue += result.totalRevenue;
                        monthlyData[monthKey].grossProfit += result.grossProfit;
                    }

                    // Chuyển đối đối tượng thành mảng và sắp xếp theo tháng mới nhất trước
                    const monthlyDataArray = Object.entries(monthlyData).map(([key, data]) => ({
                        key,
                        ...data
                    }));

                    monthlyDataArray.sort((a, b) => b.key.localeCompare(a.key));

                    // Hiển thị báo cáo theo tháng
                    for (const monthData of monthlyDataArray) {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td class="text-center">${monthData.monthName}</td>
                            <td class="text-center">${monthData.tripCount}</td>
                            <td class="text-end text-danger">${ReportModule.utils.formatCurrency(monthData.totalCost)}</td>
                            <td class="text-end text-primary">${ReportModule.utils.formatCurrency(monthData.totalRevenue)}</td>
                            <td class="text-end ${monthData.grossProfit >= 0 ? 'text-success' : 'text-danger'} fw-bold">${ReportModule.utils.formatCurrency(monthData.grossProfit)}</td>
                        `;

                        reportsList.appendChild(row);
                    }

                    // Tính tổng cộng
                    const totalTripCount = monthlyDataArray.reduce((sum, month) => sum + month.tripCount, 0);
                    const totalCost = monthlyDataArray.reduce((sum, month) => sum + month.totalCost, 0);
                    const totalRevenue = monthlyDataArray.reduce((sum, month) => sum + month.totalRevenue, 0);
                    const totalProfit = totalRevenue - totalCost;

                    // Thêm dòng tổng cộng
                    const totalRow = document.createElement('tr');
                    totalRow.className = 'table-dark fw-bold';
                    totalRow.innerHTML = `
                        <td class="text-end">Tổng cộng</td>
                        <td class="text-center">${totalTripCount}</td>
                        <td class="text-end text-danger">${ReportModule.utils.formatCurrency(totalCost)}</td>
                        <td class="text-end text-primary">${ReportModule.utils.formatCurrency(totalRevenue)}</td>
                        <td class="text-end ${totalProfit >= 0 ? 'text-success' : 'text-danger'}">${ReportModule.utils.formatCurrency(totalProfit)}</td>
                    `;
                    reportsList.appendChild(totalRow);
                } else {
                    // Hiển thị thông báo không có dữ liệu
                    noReportsMessage.style.display = 'block';
                }
            } catch (error) {
                console.error('Lỗi khi hiển thị báo cáo theo tháng:', error);
            }
        },
        async displayYearlyReports() {
            try {
                const reportsList = document.getElementById('reports-list');
                const noReportsMessage = document.getElementById('no-reports-message');
                const reportTitle = document.getElementById('report-title');

                if (!reportsList || !noReportsMessage) return;

                // Cập nhật tiêu đề báo cáo
                if (reportTitle) {
                    reportTitle.textContent = 'Báo cáo KQKD theo năm';
                }

                // Cập nhật tiêu đề cột
                const reportTableHead = document.getElementById('report-table-head');
                if (reportTableHead) {
                    reportTableHead.innerHTML = `
                        <tr class="align-middle text-center table-primary">
                            <th style="min-width:120px;">Năm</th>
                            <th style="width:120px;">Số chuyến hàng</th>
                            <th class="text-end" style="width:140px;">Tổng chi phí</th>
                            <th class="text-end" style="width:140px;">Tổng doanh thu</th>
                            <th class="text-end" style="width:140px;">Lợi nhuận gộp</th>
                        </tr>
                    `;
                }

                // Lấy tất cả chuyến hàng từ IndexedDB
                const db = await ReportModule.utils.waitForDB();
                const tx = db.transaction(['trips', 'purchases', 'orders', 'tripExpenses'], 'readonly');
                const tripStore = tx.objectStore('trips');
                let trips = await tripStore.getAll();

                // Áp dụng filter
                const { tripName, fromDate, toDate } = ReportModule.data.filter;
                if (tripName) {
                    trips = trips.filter(trip => trip.tripName && trip.tripName.toLowerCase().includes(tripName.toLowerCase()));
                }
                if (fromDate) {
                    const from = new Date(fromDate);
                    trips = trips.filter(trip => new Date(trip.tripDate) >= from);
                }
                if (toDate) {
                    const to = new Date(toDate);
                    trips = trips.filter(trip => new Date(trip.tripDate) <= to);
                }

                // Xóa nội dung hiện tại
                reportsList.innerHTML = '';

                if (trips.length > 0) {
                    // Ẩn thông báo không có dữ liệu
                    noReportsMessage.style.display = 'none';

                    // Tạo đối tượng để lưu trữ dữ liệu theo năm
                    const yearlyData = {};

                    // Tính toán kết quả kinh doanh cho từng chuyến hàng và nhóm theo năm
                    for (const trip of trips) {
                        const tripDate = new Date(trip.tripDate);
                        const yearKey = `${tripDate.getFullYear()}`;

                        // Tính toán kết quả kinh doanh cho chuyến hàng
                        const result = await ReportModule.actions.calculateTripProfitLoss(trip.id);

                        // Thêm hoặc cập nhật dữ liệu năm
                        if (!yearlyData[yearKey]) {
                            yearlyData[yearKey] = {
                                year: yearKey,
                                tripCount: 0,
                                totalCost: 0,
                                totalRevenue: 0,
                                grossProfit: 0
                            };
                        }

                        yearlyData[yearKey].tripCount++;
                        yearlyData[yearKey].totalCost += result.totalCost;
                        yearlyData[yearKey].totalRevenue += result.totalRevenue;
                        yearlyData[yearKey].grossProfit += result.grossProfit;
                    }

                    // Chuyển đối đối tượng thành mảng và sắp xếp theo năm mới nhất trước
                    const yearlyDataArray = Object.entries(yearlyData).map(([key, data]) => ({
                        key,
                        ...data
                    }));

                    yearlyDataArray.sort((a, b) => b.key.localeCompare(a.key));

                    // Hiển thị báo cáo theo năm
                    for (const yearData of yearlyDataArray) {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td class="text-center">Năm ${yearData.year}</td>
                            <td class="text-center">${yearData.tripCount}</td>
                            <td class="text-end text-danger">${ReportModule.utils.formatCurrency(yearData.totalCost)}</td>
                            <td class="text-end text-primary">${ReportModule.utils.formatCurrency(yearData.totalRevenue)}</td>
                            <td class="text-end ${yearData.grossProfit >= 0 ? 'text-success' : 'text-danger'} fw-bold">${ReportModule.utils.formatCurrency(yearData.grossProfit)}</td>
                        `;

                        reportsList.appendChild(row);
                    }

                    // Tính tổng cộng
                    const totalTripCount = yearlyDataArray.reduce((sum, year) => sum + year.tripCount, 0);
                    const totalCost = yearlyDataArray.reduce((sum, year) => sum + year.totalCost, 0);
                    const totalRevenue = yearlyDataArray.reduce((sum, year) => sum + year.totalRevenue, 0);
                    const totalProfit = totalRevenue - totalCost;

                    // Thêm dòng tổng cộng
                    const totalRow = document.createElement('tr');
                    totalRow.className = 'table-dark fw-bold';
                    totalRow.innerHTML = `
                        <td class="text-end">Tổng cộng</td>
                        <td class="text-center">${totalTripCount}</td>
                        <td class="text-end text-danger">${ReportModule.utils.formatCurrency(totalCost)}</td>
                        <td class="text-end text-primary">${ReportModule.utils.formatCurrency(totalRevenue)}</td>
                        <td class="text-end ${totalProfit >= 0 ? 'text-success' : 'text-danger'}">${ReportModule.utils.formatCurrency(totalProfit)}</td>
                    `;
                    reportsList.appendChild(totalRow);
                } else {
                    // Hiển thị thông báo không có dữ liệu
                    noReportsMessage.style.display = 'block';
                }
            } catch (error) {
                console.error('Lỗi khi hiển thị báo cáo theo năm:', error);
            }
        },
        async calculateTripProfitLoss(tripId) {
            try {
                const db = await ReportModule.utils.waitForDB();
                if (!db) return {
                    purchaseCost: 0,
                    expenseCost: 0,
                    totalCost: 0,
                    totalRevenue: 0,
                    grossProfit: 0
                };
                const tx = db.transaction(['purchases', 'orders', 'tripExpenses'], 'readonly');
                const purchaseStore = tx.objectStore('purchases');
                const orderStore = tx.objectStore('orders');
                const tripExpenseStore = tx.objectStore('tripExpenses');

                // Lấy tất cả chi phí nhập hàng của chuyến
                const purchaseIndex = purchaseStore.index('tripId');
                const purchases = await purchaseIndex.getAll(tripId);

                // Lấy tất cả chi phí phát sinh của chuyến
                const expenseIndex = tripExpenseStore.index('tripId');
                const expenses = await expenseIndex.getAll(tripId);

                // Lấy tất cả đơn hàng đã giao trong chuyến
                const orders = await orderStore.getAll();
                const deliveredOrders = orders.filter(order => order.deliveredTripId === tripId);

                // Tính tổng chi phí nhập hàng
                const purchaseCost = purchases.reduce((sum, purchase) => sum + (purchase.qty * purchase.purchasePrice), 0);

                // Tính tổng chi phí phát sinh
                const expenseCost = expenses.reduce((sum, expense) => sum + expense.amount, 0);

                // Tổng chi phí = chi phí nhập hàng + chi phí phát sinh
                const totalCost = purchaseCost + expenseCost;

                // Tính tổng doanh thu từ các đơn hàng đã giao
                let totalRevenue = 0;
                for (const order of deliveredOrders) {
                    if (order.items && order.items.length > 0) {
                        totalRevenue += order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                    }
                }

                // Tính lợi nhuận gộp
                const grossProfit = totalRevenue - totalCost;

                return {
                    purchaseCost,
                    expenseCost,
                    totalCost,
                    totalRevenue,
                    grossProfit
                };
            } catch (error) {
                console.error('Lỗi khi tính toán lợi nhuận/lỗ cho chuyến hàng:', error);
                return {
                    purchaseCost: 0,
                    expenseCost: 0,
                    totalCost: 0,
                    totalRevenue: 0,
                    grossProfit: 0
                };
            }
        }
    },

    // ===== EVENTS =====
    events: {
        setup() {
            // Lắng nghe sự kiện thay đổi loại báo cáo
            const reportTypeRadios = document.querySelectorAll('input[name="report-type"]');
            if (reportTypeRadios.length > 0) {
                reportTypeRadios.forEach(radio => {
                    radio.addEventListener('change', async () => {
                        await ReportModule.actions.displayReports();
                    });
                });
            }
            // Lắng nghe sự kiện filter
            document.addEventListener('click', async (e) => {
                if (e.target && e.target.id === 'report-filter-apply') {
                    ReportModule.data.filter.tripName = document.getElementById('report-filter-tripName').value.trim();
                    ReportModule.data.filter.fromDate = document.getElementById('report-filter-fromDate').value;
                    ReportModule.data.filter.toDate = document.getElementById('report-filter-toDate').value;
                    await ReportModule.actions.displayReports();
                }
            });
        }
    },

    // ===== PUBLIC API =====
    async init() {
        if (ReportModule.data.isInitialized) return true;
        await ReportModule.actions.displayReports();
        ReportModule.events.setup();
        ReportModule.data.isInitialized = true;
        window.ReportModule = ReportModule;
        return true;
    }
};

// ===== LEGACY EXPORTS =====
window.loadReportModule = ReportModule.init;
