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

    // Hiển thị dữ liệu ban đầu
    await loadInitialData();

    // Thiết lập các event listener
    setupEventListeners();

    // Thiết lập ngày hiện tại cho các trường ngày
    setDefaultDates();
}

// Tải dữ liệu ban đầu
async function loadInitialData() {
    try {
        // Hiển thị danh sách bán hàng (tab cũ)
        await displaySales();

        // Tải module khách hàng nếu hàm có sẵn
        if (typeof window.loadCustomerModule === 'function') {
            await window.loadCustomerModule();
        } else {
            console.warn('Module khách hàng chưa sẵn sàng - sẽ được khởi tạo sau');
        }

        // Hiển thị danh sách đơn hàng
        await displayOrders();

        // Hiển thị danh sách chuyến hàng
        await displayTrips();

        // Hiển thị danh sách thanh toán
        await displayPayments();

        // Hiển thị báo cáo
        await displayReports();
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu ban đầu:', error);
    }
}

// Thiết lập ngày hiện tại cho các trường ngày
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];

    // Đặt ngày mặc định cho các trường ngày
    if (document.getElementById('trip-date')) {
        document.getElementById('trip-date').value = today;
    }

    if (document.getElementById('payment-date')) {
        document.getElementById('payment-date').value = today;
    }
}

// Đăng ký Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('Service Worker đã đăng ký thành công:', registration.scope);
            })
            .catch(error => {
                console.error('Đăng ký Service Worker thất bại:', error);
            });
    } else {
        console.warn('Trình duyệt không hỗ trợ Service Worker');
    }
}

// Khởi tạo IndexedDB sử dụng thư viện idb
window.db = null; // Khai báo biến toàn cục để các file khác có thể truy cập
async function initDB() {
    try {
        console.log('Đang khởi tạo IndexedDB...');
        
        // Kiểm tra xem idb có sẵn không
        if (typeof idb === 'undefined') {
            console.error('Thư viện idb không được tải. Đang thử lại sau 1 giây...');
            
            // Thử lại sau 1 giây
            return new Promise(resolve => {
                setTimeout(async () => {
                    if (typeof idb === 'undefined') {
                        console.error('Thư viện idb vẫn không được tải sau khi thử lại.');
                        resolve(false);
                    } else {
                        const result = await initDB();
                        resolve(result);
                    }
                }, 1000);
            });
        }

        console.log('Thư viện idb đã được tải, tiếp tục khởi tạo database...');
        window.db = await idb.openDB('salesAppDB', 1, {
            upgrade(db) {
                console.log('Đang nâng cấp database...');
                
                // 1. Tạo object store customers
                if (!db.objectStoreNames.contains('customers')) {
                    console.log('Tạo object store customers');
                    const customersStore = db.createObjectStore('customers', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    // Các trường: name, contact
                }

                // 2. Tạo object store orders
                if (!db.objectStoreNames.contains('orders')) {
                    console.log('Tạo object store orders');
                    const ordersStore = db.createObjectStore('orders', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    ordersStore.createIndex('customerId', 'customerId');
                }

                // 3. Tạo object store trips
                if (!db.objectStoreNames.contains('trips')) {
                    console.log('Tạo object store trips');
                    const tripsStore = db.createObjectStore('trips', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                }

                // 4. Tạo object store purchases
                if (!db.objectStoreNames.contains('purchases')) {
                    console.log('Tạo object store purchases');
                    const purchasesStore = db.createObjectStore('purchases', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    purchasesStore.createIndex('tripId', 'tripId');
                }

                // 5. Tạo object store customerPayments
                if (!db.objectStoreNames.contains('customerPayments')) {
                    console.log('Tạo object store customerPayments');
                    const customerPaymentsStore = db.createObjectStore('customerPayments', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    customerPaymentsStore.createIndex('customerId', 'customerId');
                }

                // Kiểm tra object store sales
                if (!db.objectStoreNames.contains('sales')) {
                    console.log('Tạo object store sales');
                    const salesStore = db.createObjectStore('sales', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    salesStore.createIndex('date', 'date');
                    salesStore.createIndex('productName', 'productName');
                }
            }
        });

        // Kiểm tra xem database có thể sử dụng không
        try {
            const tx = window.db.transaction('customers', 'readonly');
            tx.abort();
            console.log('IndexedDB đã được khởi tạo thành công và có thể sử dụng');
            return true;
        } catch (error) {
            console.error('Database đã được tạo nhưng không thể sử dụng:', error);
            throw error;
        }
    } catch (error) {
        console.error('Lỗi nghiêm trọng khi khởi tạo IndexedDB:', error);
        throw error;
    }
}

// Thiết lập các event listener
function setupEventListeners() {
    // Tab navigation để tải lại dữ liệu khi cần thiết
    const tabs = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', async (e) => {
            const targetId = e.target.getAttribute('data-bs-target');
            
            // Nếu là tab khách hàng và module khách hàng tồn tại
            if (targetId === '#customers-tab-pane' && typeof window.loadCustomerModule === 'function') {
                // Tải lại dữ liệu khách hàng
                console.log('Tải lại dữ liệu khách hàng khi chuyển tab');
                await window.loadCustomerModule();
            }
        });
    });

    // ===== Tab Bán hàng (tab cũ) =====
    // Form thêm đơn hàng
    if (document.getElementById('sale-form')) {
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
    }

    // Nút Export Data
    if (document.getElementById('export-btn')) {
        document.getElementById('export-btn').addEventListener('click', exportDataToJson);
    }

    // Nút Import Data
    if (document.getElementById('import-btn')) {
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
    }

    // Input file cho Import
    if (document.getElementById('import-file')) {
        document.getElementById('import-file').addEventListener('change', importDataFromJson);
    }

    // ===== Tab Khách hàng =====
    // Form thêm khách hàng - được xử lý trong customer.js
    // if (document.getElementById('customer-form')) {
    //     document.getElementById('customer-form').addEventListener('submit', async (e) => {
    //         e.preventDefault();

    //         const name = document.getElementById('customer-name').value.trim();
    //         const contact = document.getElementById('customer-contact').value.trim();

    //         if (name) {
    //             const customerData = {
    //                 name,
    //                 contact
    //             };

    //             await addCustomer(customerData);

    //             // Reset form
    //             document.getElementById('customer-form').reset();
    //             document.getElementById('customer-name').focus();
    //         }
    //     });
    // }

    // ===== Tab Đơn hàng =====
    // Nút thêm sản phẩm trong form đơn hàng
    if (document.getElementById('add-product-btn')) {
        document.getElementById('add-product-btn').addEventListener('click', () => {
            addOrderItemRow();
        });
    }

    // Form tạo đơn hàng
    if (document.getElementById('order-form')) {
        document.getElementById('order-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const customerId = parseInt(document.getElementById('order-customer').value);
            const orderItems = [];

            // Lấy thông tin các sản phẩm trong đơn hàng
            const itemElements = document.querySelectorAll('.order-item');

            for (const itemElement of itemElements) {
                const productName = itemElement.querySelector('.product-name').value.trim();
                const qty = parseInt(itemElement.querySelector('.product-qty').value);
                const sellingPrice = parseFloat(itemElement.querySelector('.product-price').value);

                if (productName && qty > 0 && sellingPrice >= 0) {
                    orderItems.push({
                        productName,
                        qty,
                        sellingPrice
                    });
                }
            }

            if (customerId && orderItems.length > 0) {
                const orderData = {
                    customerId,
                    orderDate: new Date(),
                    status: 'Mới',
                    items: orderItems,
                    deliveredTripId: null
                };

                await addOrder(orderData);

                // Reset form
                document.getElementById('order-form').reset();

                // Xóa các dòng sản phẩm trừ dòng đầu tiên
                const orderItemsContainer = document.getElementById('order-items');
                const items = orderItemsContainer.querySelectorAll('.order-item');

                // Giữ lại dòng đầu tiên và reset nó
                if (items.length > 0) {
                    const firstItem = items[0];
                    firstItem.querySelector('.product-name').value = '';
                    firstItem.querySelector('.product-qty').value = '1';
                    firstItem.querySelector('.product-price').value = '';

                    // Xóa các dòng còn lại
                    for (let i = 1; i < items.length; i++) {
                        orderItemsContainer.removeChild(items[i]);
                    }
                }

                // Đổ lại danh sách khách hàng vào dropdown
                await populateCustomerDropdowns();
            }
        });
    }

    // ===== Tab Chuyến hàng =====
    // Form tạo chuyến hàng
    if (document.getElementById('trip-form')) {
        document.getElementById('trip-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const tripName = document.getElementById('trip-name').value.trim();
            const tripDate = document.getElementById('trip-date').value;

            if (tripName && tripDate) {
                const tripData = {
                    tripName,
                    tripDate: new Date(tripDate),
                    status: 'Mới tạo'
                };

                await addTrip(tripData);

                // Reset form
                document.getElementById('trip-form').reset();
                document.getElementById('trip-date').value = new Date().toISOString().split('T')[0];
                document.getElementById('trip-name').focus();
            }
        });
    }

    // ===== Tab Thanh toán =====
    // Form ghi nhận thanh toán
    if (document.getElementById('payment-form')) {
        // Đặt giá trị mặc định cho trường ngày thanh toán là ngày hôm nay
        document.getElementById('payment-date').valueAsDate = new Date();
        
        document.getElementById('payment-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const customerId = parseInt(document.getElementById('payment-customer').value);
            const paymentAmount = parseFloat(document.getElementById('payment-amount').value);
            const paymentDate = document.getElementById('payment-date').value;

            if (customerId && paymentAmount > 0 && paymentDate) {
                const paymentData = {
                    customerId,
                    paymentAmount,
                    paymentDate: new Date(paymentDate),
                    orderId: null // Không liên kết với đơn hàng cụ thể
                };

                const paymentId = await addCustomerPayment(paymentData);
                
                if (paymentId) {
                    // Hiển thị thông báo thành công
                    const alertElement = document.createElement('div');
                    alertElement.className = 'alert alert-success mt-3';
                    alertElement.textContent = 'Đã lưu thanh toán thành công!';
                    
                    // Thêm thông báo vào sau form
                    const formElement = document.getElementById('payment-form');
                    formElement.parentNode.insertBefore(alertElement, formElement.nextSibling);
                    
                    // Tự động ẩn thông báo sau 3 giây
                    setTimeout(() => {
                        alertElement.remove();
                    }, 3000);
                }

                // Reset form
                document.getElementById('payment-form').reset();
                document.getElementById('payment-date').valueAsDate = new Date();
                await populateCustomerDropdowns();
            }
        });
    }

    // ===== Sự kiện cho các nút xem chi tiết =====
    // Sự kiện delegation cho các nút xem chi tiết đơn hàng
    document.addEventListener('click', async (e) => {
        // Nút xem chi tiết đơn hàng
        if (e.target.classList.contains('view-order-btn')) {
            const orderId = parseInt(e.target.getAttribute('data-id'));
            await showOrderDetail(orderId);
        }

        // Nút xem chi tiết chuyến hàng
        if (e.target.classList.contains('view-trip-btn')) {
            const tripId = parseInt(e.target.getAttribute('data-id'));
            await showTripDetail(tripId);
        }

        // Nút xóa khách hàng
        if (e.target.classList.contains('delete-customer-btn')) {
            const customerId = parseInt(e.target.getAttribute('data-id'));
            if (confirm('Bạn có chắc muốn xóa khách hàng này?')) {
                await deleteCustomer(customerId);
            }
        }

        // Nút xóa đơn hàng
        if (e.target.classList.contains('delete-order-btn')) {
            const orderId = parseInt(e.target.getAttribute('data-id'));
            if (confirm('Bạn có chắc muốn xóa đơn hàng này?')) {
                await deleteOrder(orderId);
            }
        }

        // Nút xóa chuyến hàng
        if (e.target.classList.contains('delete-trip-btn')) {
            const tripId = parseInt(e.target.getAttribute('data-id'));
            if (confirm('Bạn có chắc muốn xóa chuyến hàng này?')) {
                await deleteTrip(tripId);
            }
        }

        // Nút xóa thanh toán
        if (e.target.classList.contains('delete-payment-btn')) {
            const paymentId = parseInt(e.target.getAttribute('data-id'));
            if (confirm('Bạn có chắc muốn xóa thanh toán này?')) {
                await deleteCustomerPayment(paymentId);
            }
        }
    });
}

// Thêm đơn hàng mới
async function addSale(saleData) {
    try {
        const tx = window.db.transaction('sales', 'readwrite');
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
        const tx = window.db.transaction('sales', 'readonly');
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
        const tx = window.db.transaction('sales', 'readwrite');
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
        const tx = window.db.transaction('sales', 'readonly');
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

// ===== CÁC HÀM XỬ LÝ CHO QUẢN LÝ KHÁCH HÀNG =====
// Các hàm quản lý khách hàng được định nghĩa trong file customer.js
// Không định nghĩa lại để tránh trùng lặp

// ===== CÁC HÀM XỬ LÝ CHO QUẢN LÝ ĐƠN HÀNG =====

// Các hàm liên quan đến quản lý đơn hàng được định nghĩa trong file order.js
// Không định nghĩa lại để tránh trùng lặp

// Lấy class cho badge trạng thái
function getStatusBadgeClass(status) {
    switch (status) {
        case 'Mới':
            return 'bg-primary';
        case 'Đang xử lý':
            return 'bg-warning';
        case 'Đã giao':
            return 'bg-success';
        case 'Đã hủy':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}
