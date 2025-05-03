// ===== CÁC HÀM XỬ LÝ CHO BÁO CÁO =====

// Hiển thị báo cáo KQKD theo chuyến hàng
async function displayReports() {
    try {
        const reportsList = document.getElementById('reports-list');
        const noReportsMessage = document.getElementById('no-reports-message');
        
        if (!reportsList || !noReportsMessage) return;
        
        // Lấy tất cả chuyến hàng từ IndexedDB
        const tx = db.transaction(['trips', 'purchases', 'orders'], 'readonly');
        const tripStore = tx.objectStore('trips');
        const purchaseStore = tx.objectStore('purchases');
        const orderStore = tx.objectStore('orders');
        
        const trips = await tripStore.getAll();
        
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
        } else {
            // Hiển thị thông báo không có dữ liệu
            noReportsMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị báo cáo:', error);
    }
}

// Tính toán lợi nhuận/lỗ cho một chuyến hàng
async function calculateTripProfitLoss(tripId) {
    try {
        const tx = db.transaction(['purchases', 'orders'], 'readonly');
        const purchaseStore = tx.objectStore('purchases');
        const orderStore = tx.objectStore('orders');
        
        // Lấy tất cả chi phí nhập hàng của chuyến
        const purchaseIndex = purchaseStore.index('tripId');
        const purchases = await purchaseIndex.getAll(tripId);
        
        // Lấy tất cả đơn hàng đã giao trong chuyến
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
        
        return {
            totalCost,
            totalRevenue,
            grossProfit
        };
    } catch (error) {
        console.error('Lỗi khi tính toán lợi nhuận/lỗ cho chuyến hàng:', error);
        return {
            totalCost: 0,
            totalRevenue: 0,
            grossProfit: 0
        };
    }
}
