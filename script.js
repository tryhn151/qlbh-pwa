// Đảm bảo tất cả code chạy sau khi DOM đã load
document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo ứng dụng
    initApp();
});

// Khởi tạo ứng dụng
async function initApp() {
    // Đăng ký Service Worker
    registerServiceWorker();
    
    // Khởi tạo IndexedDB
    await initDB();
    
    // Hiển thị danh sách bán hàng
    await displaySales();
    
    // Thiết lập các event listener
    setupEventListeners();
}

// Đăng ký Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('service-worker.js')
                .then(registration => {
                    console.log('Service Worker đã đăng ký thành công:', registration.scope);
                })
                .catch(error => {
                    console.error('Đăng ký Service Worker thất bại:', error);
                });
        });
    }
}

// Khởi tạo IndexedDB sử dụng thư viện idb
let db;
async function initDB() {
    try {
        db = await idb.openDB('salesDB', 1, {
            upgrade(db) {
                // Tạo object store nếu chưa tồn tại
                if (!db.objectStoreNames.contains('sales')) {
                    const salesStore = db.createObjectStore('sales', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    
                    // Tạo index để tìm kiếm nhanh hơn
                    salesStore.createIndex('date', 'date');
                    salesStore.createIndex('productName', 'productName');
                }
            }
        });
        console.log('IndexedDB đã được khởi tạo thành công');
        return true;
    } catch (error) {
        console.error('Lỗi khi khởi tạo IndexedDB:', error);
        return false;
    }
}

// Thiết lập các event listener
function setupEventListeners() {
    // Form thêm đơn hàng
    document.getElementById('sale-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const productName = document.getElementById('product-name').value.trim();
        const quantity = parseInt(document.getElementById('quantity').value);
        const price = parseFloat(document.getElementById('price').value);
        
        if (productName && quantity > 0 && price >= 0) {
            const saleData = {
                productName,
                quantity,
                price,
                date: new Date()
            };
            
            await addSale(saleData);
            
            // Reset form
            document.getElementById('sale-form').reset();
            document.getElementById('product-name').focus();
        }
    });
    
    // Nút Export Data
    document.getElementById('export-btn').addEventListener('click', exportDataToJson);
    
    // Nút Import Data
    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    
    // Input file cho Import
    document.getElementById('import-file').addEventListener('change', importDataFromJson);
}

// Thêm đơn hàng mới
async function addSale(saleData) {
    try {
        const tx = db.transaction('sales', 'readwrite');
        const store = tx.objectStore('sales');
        
        const id = await store.add(saleData);
        await tx.done;
        
        console.log('Đã thêm đơn hàng mới với ID:', id);
        
        // Cập nhật giao diện
        await displaySales();
        
        return id;
    } catch (error) {
        console.error('Lỗi khi thêm đơn hàng:', error);
        return null;
    }
}

// Hiển thị danh sách đơn hàng
async function displaySales() {
    try {
        const salesList = document.getElementById('sales-list');
        const noDataMessage = document.getElementById('no-data-message');
        const totalAmountElement = document.getElementById('total-amount');
        
        // Lấy tất cả đơn hàng từ IndexedDB
        const tx = db.transaction('sales', 'readonly');
        const store = tx.objectStore('sales');
        const sales = await store.getAll();
        
        // Xóa nội dung hiện tại
        salesList.innerHTML = '';
        
        // Tính tổng tiền
        let totalAmount = 0;
        
        if (sales.length > 0) {
            // Ẩn thông báo không có dữ liệu
            noDataMessage.style.display = 'none';
            
            // Hiển thị từng đơn hàng
            sales.forEach(sale => {
                const subtotal = sale.quantity * sale.price;
                totalAmount += subtotal;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${sale.id}</td>
                    <td>${sale.productName}</td>
                    <td class="text-center">${sale.quantity}</td>
                    <td class="currency">${formatCurrency(sale.price)}</td>
                    <td class="currency">${formatCurrency(subtotal)}</td>
                    <td>${formatDate(sale.date)}</td>
                    <td>
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${sale.id}">
                            Xóa
                        </button>
                    </td>
                `;
                
                salesList.appendChild(row);
            });
            
            // Thêm event listener cho các nút xóa
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const id = parseInt(e.target.getAttribute('data-id'));
                    await deleteSale(id);
                });
            });
        } else {
            // Hiển thị thông báo không có dữ liệu
            noDataMessage.style.display = 'block';
        }
        
        // Cập nhật tổng tiền
        totalAmountElement.textContent = `Tổng: ${formatCurrency(totalAmount)}`;
        
    } catch (error) {
        console.error('Lỗi khi hiển thị đơn hàng:', error);
    }
}

// Xóa đơn hàng
async function deleteSale(saleId) {
    try {
        const tx = db.transaction('sales', 'readwrite');
        const store = tx.objectStore('sales');
        
        await store.delete(saleId);
        await tx.done;
        
        console.log('Đã xóa đơn hàng với ID:', saleId);
        
        // Cập nhật giao diện
        await displaySales();
        
        return true;
    } catch (error) {
        console.error('Lỗi khi xóa đơn hàng:', error);
        return false;
    }
}

// Export dữ liệu ra file JSON
async function exportDataToJson() {
    try {
        const tx = db.transaction('sales', 'readonly');
        const store = tx.objectStore('sales');
        const sales = await store.getAll();
        
        if (sales.length === 0) {
            alert('Không có dữ liệu để xuất');
            return;
        }
        
        // Chuyển đổi ngày thành chuỗi để dễ đọc
        const exportData = sales.map(sale => ({
            ...sale,
            date: sale.date.toISOString()
        }));
        
        // Tạo file JSON
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        // Tạo link tải xuống
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(dataBlob);
        downloadLink.download = `sales-data-${formatDateForFilename(new Date())}.json`;
        
        // Thêm link vào DOM, click và xóa
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        console.log('Đã xuất dữ liệu thành công');
    } catch (error) {
        console.error('Lỗi khi xuất dữ liệu:', error);
        alert('Lỗi khi xuất dữ liệu: ' + error.message);
    }
}

// Import dữ liệu từ file JSON
async function importDataFromJson(e) {
    try {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                
                if (!Array.isArray(importedData)) {
                    throw new Error('Dữ liệu không đúng định dạng');
                }
                
                // Xác nhận từ người dùng
                if (!confirm(`Bạn có chắc muốn nhập ${importedData.length} đơn hàng? Dữ liệu hiện tại sẽ không bị mất.`)) {
                    return;
                }
                
                const tx = db.transaction('sales', 'readwrite');
                const store = tx.objectStore('sales');
                
                // Chuyển đổi chuỗi ngày thành đối tượng Date
                for (const sale of importedData) {
                    // Xóa ID để tránh xung đột
                    const { id, ...saleData } = sale;
                    
                    // Chuyển đổi chuỗi ngày thành đối tượng Date
                    if (typeof saleData.date === 'string') {
                        saleData.date = new Date(saleData.date);
                    }
                    
                    await store.add(saleData);
                }
                
                await tx.done;
                
                // Reset input file
                e.target.value = '';
                
                // Cập nhật giao diện
                await displaySales();
                
                alert(`Đã nhập ${importedData.length} đơn hàng thành công`);
            } catch (error) {
                console.error('Lỗi khi xử lý file JSON:', error);
                alert('Lỗi khi xử lý file JSON: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    } catch (error) {
        console.error('Lỗi khi nhập dữ liệu:', error);
        alert('Lỗi khi nhập dữ liệu: ' + error.message);
    }
}

// Hàm tiện ích để định dạng tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount) + ' VNĐ';
}

// Hàm tiện ích để định dạng ngày giờ
function formatDate(date) {
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

// Hàm tiện ích để định dạng ngày cho tên file
function formatDateForFilename(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}
