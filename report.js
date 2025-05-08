// ===== CÁC HÀM XỬ LÝ CHO BÁO CÁO =====

// Hiển thị báo cáo KQKD theo chuyến hàng
async function displayReports() {
    try {
        // Lấy loại báo cáo đang được chọn
        const reportType = document.querySelector('input[name="report-type"]:checked')?.value || 'trip';

        // Hiển thị báo cáo tương ứng
        switch (reportType) {
            case 'trip':
                await displayTripReports();
                break;
            case 'month':
                await displayMonthlyReports();
                break;
            case 'year':
                await displayYearlyReports();
                break;
            default:
                await displayTripReports();
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị báo cáo:', error);
    }
}

// Hiển thị báo cáo KQKD theo chuyến hàng
async function displayTripReports() {
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
                <tr>
                    <th>ID</th>
                    <th>Tên chuyến</th>
                    <th>Ngày</th>
                    <th>Tổng chi phí</th>
                    <th>Tổng doanh thu</th>
                    <th>Lợi nhuận gộp</th>
                </tr>
            `;
        }

        // Lấy tất cả chuyến hàng từ IndexedDB
        const tx = db.transaction(['trips', 'purchases', 'orders', 'tripExpenses'], 'readonly');
        const tripStore = tx.objectStore('trips');

        const trips = await tripStore.getAll();

        // Sắp xếp chuyến hàng theo ngày mới nhất trước
        trips.sort((a, b) => new Date(b.tripDate) - new Date(a.tripDate));

        // Xóa nội dung hiện tại
        reportsList.innerHTML = '';

        if (trips.length > 0) {
            // Ẩn thông báo không có dữ liệu
            noReportsMessage.style.display = 'none';

            // Hiển thị báo cáo cho từng chuyến hàng
            for (const trip of trips) {
                // Tính toán kết quả kinh doanh cho chuyến hàng
                const result = await calculateTripProfitLoss(trip.id);

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${trip.id}</td>
                    <td>${trip.tripName}</td>
                    <td>${formatDate(trip.tripDate)}</td>
                    <td class="text-end text-danger">${formatCurrency(result.totalCost)}</td>
                    <td class="text-end text-primary">${formatCurrency(result.totalRevenue)}</td>
                    <td class="text-end ${result.grossProfit >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(result.grossProfit)}</td>
                `;

                reportsList.appendChild(row);
            }

            // Tính tổng cộng
            const totalCost = trips.reduce((sum, trip) => sum + (trip._totalCost || 0), 0);
            const totalRevenue = trips.reduce((sum, trip) => sum + (trip._totalRevenue || 0), 0);
            const totalProfit = totalRevenue - totalCost;

            // Thêm dòng tổng cộng
            const totalRow = document.createElement('tr');
            totalRow.className = 'table-dark fw-bold';
            totalRow.innerHTML = `
                <td colspan="3" class="text-end">Tổng cộng:</td>
                <td class="text-end text-danger">${formatCurrency(totalCost)}</td>
                <td class="text-end text-primary">${formatCurrency(totalRevenue)}</td>
                <td class="text-end ${totalProfit >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(totalProfit)}</td>
            `;

            reportsList.appendChild(totalRow);
        } else {
            // Hiển thị thông báo không có dữ liệu
            noReportsMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị báo cáo theo chuyến hàng:', error);
    }
}

// Hiển thị báo cáo KQKD theo tháng
async function displayMonthlyReports() {
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
                <tr>
                    <th>Tháng</th>
                    <th>Số chuyến hàng</th>
                    <th>Tổng chi phí</th>
                    <th>Tổng doanh thu</th>
                    <th>Lợi nhuận gộp</th>
                </tr>
            `;
        }

        // Lấy tất cả chuyến hàng từ IndexedDB
        const tx = db.transaction(['trips', 'purchases', 'orders', 'tripExpenses'], 'readonly');
        const tripStore = tx.objectStore('trips');

        const trips = await tripStore.getAll();

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
                const result = await calculateTripProfitLoss(trip.id);

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
                    <td>${monthData.monthName}</td>
                    <td class="text-center">${monthData.tripCount}</td>
                    <td class="text-end text-danger">${formatCurrency(monthData.totalCost)}</td>
                    <td class="text-end text-primary">${formatCurrency(monthData.totalRevenue)}</td>
                    <td class="text-end ${monthData.grossProfit >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(monthData.grossProfit)}</td>
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
                <td>Tổng cộng</td>
                <td class="text-center">${totalTripCount}</td>
                <td class="text-end text-danger">${formatCurrency(totalCost)}</td>
                <td class="text-end text-primary">${formatCurrency(totalRevenue)}</td>
                <td class="text-end ${totalProfit >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(totalProfit)}</td>
            `;

            reportsList.appendChild(totalRow);
        } else {
            // Hiển thị thông báo không có dữ liệu
            noReportsMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị báo cáo theo tháng:', error);
    }
}

// Hiển thị báo cáo KQKD theo năm
async function displayYearlyReports() {
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
                <tr>
                    <th>Năm</th>
                    <th>Số chuyến hàng</th>
                    <th>Tổng chi phí</th>
                    <th>Tổng doanh thu</th>
                    <th>Lợi nhuận gộp</th>
                </tr>
            `;
        }

        // Lấy tất cả chuyến hàng từ IndexedDB
        const tx = db.transaction(['trips', 'purchases', 'orders', 'tripExpenses'], 'readonly');
        const tripStore = tx.objectStore('trips');

        const trips = await tripStore.getAll();

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
                const result = await calculateTripProfitLoss(trip.id);

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
                    <td>Năm ${yearData.year}</td>
                    <td class="text-center">${yearData.tripCount}</td>
                    <td class="text-end text-danger">${formatCurrency(yearData.totalCost)}</td>
                    <td class="text-end text-primary">${formatCurrency(yearData.totalRevenue)}</td>
                    <td class="text-end ${yearData.grossProfit >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(yearData.grossProfit)}</td>
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
                <td>Tổng cộng</td>
                <td class="text-center">${totalTripCount}</td>
                <td class="text-end text-danger">${formatCurrency(totalCost)}</td>
                <td class="text-end text-primary">${formatCurrency(totalRevenue)}</td>
                <td class="text-end ${totalProfit >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(totalProfit)}</td>
            `;

            reportsList.appendChild(totalRow);
        } else {
            // Hiển thị thông báo không có dữ liệu
            noReportsMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị báo cáo theo năm:', error);
    }
}

// Tính toán lợi nhuận/lỗ cho một chuyến hàng
async function calculateTripProfitLoss(tripId) {
    try {
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

// Thiết lập các event listener cho báo cáo
function setupReportEventListeners() {
    // Lắng nghe sự kiện thay đổi loại báo cáo
    const reportTypeRadios = document.querySelectorAll('input[name="report-type"]');
    if (reportTypeRadios.length > 0) {
        reportTypeRadios.forEach(radio => {
            radio.addEventListener('change', async () => {
                await displayReports();
            });
        });
    }
}
