// ===== FILE CHUẨN HÓA BẢNG - CẬP NHẬT TẤT CẢ JS =====

// Cập nhật cho supplier.js
function standardizeSupplierTable() {
    // Update displaySuppliers function
    const originalDisplaySuppliers = window.displaySuppliers;
    if (originalDisplaySuppliers) {
        window.displaySuppliers = async function() {
            const result = await originalDisplaySuppliers();
            
            // Cập nhật style cho các rows
            const supplierRows = document.querySelectorAll('#suppliers-list tr');
            supplierRows.forEach(row => {
                const cells = row.children;
                if (cells.length >= 6) {
                    // ID column - center align
                    cells[0].className = 'text-center';
                    cells[0].innerHTML = `<strong>${cells[0].textContent}</strong>`;
                    
                    // Tên nhà cung cấp - bold
                    cells[1].innerHTML = `<strong>${cells[1].textContent}</strong>`;
                    
                    // Liên hệ - handle empty
                    if (!cells[4].textContent.trim()) {
                        cells[4].innerHTML = '<em class="text-muted">Chưa có</em>';
                    }
                    
                    // Action buttons - center align with btn-group
                    cells[5].className = 'text-center';
                    const buttons = cells[5].querySelectorAll('button');
                    if (buttons.length > 0) {
                        cells[5].innerHTML = `
                            <div class="btn-group btn-group-sm">
                                ${Array.from(buttons).map(btn => {
                                    const isEdit = btn.textContent.includes('Sửa');
                                    const icon = isEdit ? 'bi-pencil' : 'bi-trash';
                                    const className = isEdit ? 'btn-outline-primary' : 'btn-outline-danger';
                                    return `<button class="btn ${className}" data-id="${btn.dataset.id}">
                                        <i class="bi ${icon}"></i> ${btn.textContent}
                                    </button>`;
                                }).join('')}
                            </div>
                        `;
                    }
                }
            });
            
            return result;
        };
    }
}

// Cập nhật cho product.js
function standardizeProductTable() {
    const originalDisplayProducts = window.displayProducts;
    if (originalDisplayProducts) {
        window.displayProducts = async function() {
            const result = await originalDisplayProducts();
            
            // Cập nhật style cho các rows
            const productRows = document.querySelectorAll('#products-list tr');
            productRows.forEach(row => {
                const cells = row.children;
                if (cells.length >= 7) {
                    // ID column - center align
                    cells[0].className = 'text-center';
                    cells[0].innerHTML = `<strong>${cells[0].textContent}</strong>`;
                    
                    // Tên sản phẩm - bold
                    cells[1].innerHTML = `<strong>${cells[1].textContent}</strong>`;
                    
                    // Đơn vị - center align
                    cells[3].className = 'text-center';
                    
                    // Giá nhập - right align với format
                    cells[4].className = 'text-end';
                    const price = cells[4].textContent;
                    if (price && price !== '0 VNĐ' && price !== 'Chưa có') {
                        cells[4].innerHTML = `<strong>${price}</strong>`;
                    }
                    
                    // Action buttons - center align
                    cells[6].className = 'text-center';
                    const buttons = cells[6].querySelectorAll('button');
                    if (buttons.length > 0) {
                        cells[6].innerHTML = `
                            <div class="btn-group btn-group-sm">
                                ${Array.from(buttons).map(btn => {
                                    const isEdit = btn.textContent.includes('Sửa');
                                    const icon = isEdit ? 'bi-pencil' : 'bi-trash';
                                    const className = isEdit ? 'btn-outline-primary' : 'btn-outline-danger';
                                    return `<button class="btn ${className}" data-id="${btn.dataset.id}">
                                        <i class="bi ${icon}"></i> ${btn.textContent}
                                    </button>`;
                                }).join('')}
                            </div>
                        `;
                    }
                }
            });
            
            return result;
        };
    }
}

// Cập nhật cho order.js
function standardizeOrderTable() {
    const originalDisplayOrders = window.displayOrders;
    if (originalDisplayOrders) {
        window.displayOrders = async function() {
            const result = await originalDisplayOrders();
            
            // Cập nhật style cho các rows
            const orderRows = document.querySelectorAll('#orders-list tr');
            orderRows.forEach(row => {
                const cells = row.children;
                if (cells.length >= 7) {
                    // ID column - center align
                    cells[0].className = 'text-center';
                    cells[0].innerHTML = `<strong>${cells[0].textContent}</strong>`;
                    
                    // Khách hàng - bold
                    cells[1].innerHTML = `<strong>${cells[1].textContent}</strong>`;
                    
                    // Ngày đặt - center align
                    cells[3].className = 'text-center';
                    
                    // Trạng thái - center align
                    cells[4].className = 'text-center';
                    
                    // Tổng tiền - right align với format
                    cells[5].className = 'text-end';
                    cells[5].innerHTML = `<strong class="text-primary">${cells[5].textContent}</strong>`;
                    
                    // Action buttons - center align
                    cells[6].className = 'text-center';
                    const buttons = cells[6].querySelectorAll('button');
                    if (buttons.length > 0) {
                        cells[6].innerHTML = `
                            <div class="btn-group btn-group-sm">
                                ${Array.from(buttons).map(btn => {
                                    let icon = 'bi-eye';
                                    let className = 'btn-outline-info';
                                    
                                    if (btn.textContent.includes('Sửa')) {
                                        icon = 'bi-pencil';
                                        className = 'btn-outline-primary';
                                    } else if (btn.textContent.includes('Xóa')) {
                                        icon = 'bi-trash';
                                        className = 'btn-outline-danger';
                                    }
                                    
                                    return `<button class="btn ${className}" data-id="${btn.dataset.id}" onclick="${btn.getAttribute('onclick')}">
                                        <i class="bi ${icon}"></i> ${btn.textContent}
                                    </button>`;
                                }).join('')}
                            </div>
                        `;
                    }
                }
            });
            
            return result;
        };
    }
}

// Cập nhật cho trip.js 
function standardizeTripTable() {
    const originalDisplayTrips = window.displayTrips;
    if (originalDisplayTrips) {
        window.displayTrips = async function() {
            const result = await originalDisplayTrips();
            
            // Cập nhật style cho các rows
            const tripRows = document.querySelectorAll('#trips-list tr');
            tripRows.forEach(row => {
                const cells = row.children;
                if (cells.length >= 5) {
                    // ID column - center align
                    cells[0].className = 'text-center';
                    cells[0].innerHTML = `<strong>${cells[0].textContent}</strong>`;
                    
                    // Tên chuyến - bold
                    cells[1].innerHTML = `<strong>${cells[1].textContent}</strong>`;
                    
                    // Ngày - center align
                    cells[2].className = 'text-center';
                    
                    // Trạng thái - center align
                    cells[3].className = 'text-center';
                    
                    // Action buttons - center align
                    cells[4].className = 'text-center';
                    const buttons = cells[4].querySelectorAll('button');
                    if (buttons.length > 0) {
                        cells[4].innerHTML = `
                            <div class="btn-group btn-group-sm">
                                ${Array.from(buttons).map(btn => {
                                    let icon = 'bi-eye';
                                    let className = 'btn-outline-info';
                                    
                                    if (btn.textContent.includes('Xóa')) {
                                        icon = 'bi-trash';
                                        className = 'btn-outline-danger';
                                    }
                                    
                                    return `<button class="btn ${className}" onclick="${btn.getAttribute('onclick')}">
                                        <i class="bi ${icon}"></i> ${btn.textContent}
                                    </button>`;
                                }).join('')}
                            </div>
                        `;
                    }
                }
            });
            
            return result;
        };
    }
}

// Cập nhật cho report.js
function standardizeReportTable() {
    // Theo dõi khi report table được update
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const reportRows = document.querySelectorAll('#reports-list tr');
                reportRows.forEach(row => {
                    const cells = row.children;
                    if (cells.length >= 6) {
                        // ID column - center align
                        cells[0].className = 'text-center';
                        cells[0].innerHTML = `<strong>${cells[0].textContent}</strong>`;
                        
                        // Tên chuyến - bold
                        cells[1].innerHTML = `<strong>${cells[1].textContent}</strong>`;
                        
                        // Ngày - center align
                        cells[2].className = 'text-center';
                        
                        // Tổng chi phí - right align, red
                        cells[3].className = 'text-end';
                        cells[3].innerHTML = `<strong class="text-danger">${cells[3].textContent}</strong>`;
                        
                        // Tổng doanh thu - right align, blue
                        cells[4].className = 'text-end';
                        cells[4].innerHTML = `<strong class="text-primary">${cells[4].textContent}</strong>`;
                        
                        // Lợi nhuận - right align, conditional color
                        cells[5].className = 'text-end';
                        const profitText = cells[5].textContent;
                        const isPositive = !profitText.includes('-');
                        const colorClass = isPositive ? 'text-success' : 'text-danger';
                        cells[5].innerHTML = `<strong class="${colorClass}">${profitText}</strong>`;
                    }
                });
            }
        });
    });
    
    const reportsList = document.getElementById('reports-list');
    if (reportsList) {
        observer.observe(reportsList, { childList: true, subtree: true });
    }
}

// Hàm chính để áp dụng tất cả standardization
function applyTableStandardization() {
    console.log('🎨 Bắt đầu chuẩn hóa tất cả bảng...');
    
    // Chờ DOM load xong
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(applyTableStandardization, 500);
        });
        return;
    }
    
    try {
        standardizeSupplierTable();
        standardizeProductTable();
        standardizeOrderTable();
        standardizeTripTable();
        standardizeReportTable();
        
        console.log('✅ Đã chuẩn hóa tất cả bảng thành công!');
        
        // Thông báo cho user
        const notification = document.createElement('div');
        notification.className = 'alert alert-success position-fixed top-0 start-50 translate-middle-x mt-3';
        notification.style.zIndex = '9999';
        notification.innerHTML = `
            <i class="bi bi-check-circle"></i> 
            <strong>Đã chuẩn hóa giao diện bảng!</strong> 
            Tất cả bảng giờ đã có định dạng thống nhất.
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
        
    } catch (error) {
        console.error('❌ Lỗi khi chuẩn hóa bảng:', error);
    }
}

// Auto-run khi file được load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('🎨 Bắt đầu chuẩn hóa tất cả bảng...');
        
        // Thông báo cho user
        const notification = document.createElement('div');
        notification.className = 'alert alert-success position-fixed top-0 start-50 translate-middle-x mt-3';
        notification.style.zIndex = '9999';
        notification.innerHTML = `
            <i class="bi bi-check-circle"></i> 
            <strong>Đã chuẩn hóa giao diện bảng!</strong> 
            Tất cả bảng giờ đã có định dạng thống nhất.
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }, 1000);
});

// Export cho các file khác sử dụng
window.applyTableStandardization = applyTableStandardization; 