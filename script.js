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

        // Hiển thị danh sách khách hàng
        await displayCustomers();

        // Đổ danh sách khách hàng vào các dropdown
        await populateCustomerDropdowns();

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
        db = await idb.openDB('salesAppDB', 1, {
            upgrade(db) {
                // 1. Tạo object store customers
                if (!db.objectStoreNames.contains('customers')) {
                    const customersStore = db.createObjectStore('customers', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    // Không cần index ban đầu
                }

                // 2. Tạo object store orders
                if (!db.objectStoreNames.contains('orders')) {
                    const ordersStore = db.createObjectStore('orders', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    // Tạo index cho customerId
                    ordersStore.createIndex('customerId', 'customerId');
                }

                // 3. Tạo object store trips
                if (!db.objectStoreNames.contains('trips')) {
                    const tripsStore = db.createObjectStore('trips', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    // Không cần index ban đầu
                }

                // 4. Tạo object store purchases
                if (!db.objectStoreNames.contains('purchases')) {
                    const purchasesStore = db.createObjectStore('purchases', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    // Tạo index cho tripId
                    purchasesStore.createIndex('tripId', 'tripId');
                }

                // 5. Tạo object store customerPayments
                if (!db.objectStoreNames.contains('customerPayments')) {
                    const customerPaymentsStore = db.createObjectStore('customerPayments', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    // Tạo index cho customerId
                    customerPaymentsStore.createIndex('customerId', 'customerId');
                }

                // Giữ lại object store sales cũ nếu cần (có thể xóa sau)
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
    // Form thêm khách hàng
    if (document.getElementById('customer-form')) {
        document.getElementById('customer-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('customer-name').value.trim();
            const contact = document.getElementById('customer-contact').value.trim();

            if (name) {
                const customerData = {
                    name,
                    contact
                };

                await addCustomer(customerData);

                // Reset form
                document.getElementById('customer-form').reset();
                document.getElementById('customer-name').focus();
            }
        });
    }

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

                await addCustomerPayment(paymentData);

                // Reset form
                document.getElementById('payment-form').reset();
                document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
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

// ===== CÁC HÀM XỬ LÝ CHO QUẢN LÝ KHÁCH HÀNG =====

// Thêm khách hàng mới
async function addCustomer(customerData) {
    try {
        const tx = db.transaction('customers', 'readwrite');
        const store = tx.objectStore('customers');

        const id = await store.add(customerData);
        await tx.done;

        console.log('Đã thêm khách hàng mới với ID:', id);

        // Cập nhật giao diện
        await displayCustomers();
        await populateCustomerDropdowns();

        return id;
    } catch (error) {
        console.error('Lỗi khi thêm khách hàng:', error);
        return null;
    }
}

// Hiển thị danh sách khách hàng
async function displayCustomers() {
    try {
        const customersList = document.getElementById('customers-list');
        const noCustomersMessage = document.getElementById('no-customers-message');

        if (!customersList || !noCustomersMessage) return;

        // Lấy tất cả khách hàng từ IndexedDB
        const tx = db.transaction('customers', 'readonly');
        const store = tx.objectStore('customers');
        const customers = await store.getAll();

        // Xóa nội dung hiện tại
        customersList.innerHTML = '';

        if (customers.length > 0) {
            // Ẩn thông báo không có dữ liệu
            noCustomersMessage.style.display = 'none';

            // Hiển thị từng khách hàng
            customers.forEach(customer => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${customer.id}</td>
                    <td>${customer.name}</td>
                    <td>${customer.contact || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-danger delete-customer-btn" data-id="${customer.id}">
                            Xóa
                        </button>
                    </td>
                `;

                customersList.appendChild(row);
            });
        } else {
            // Hiển thị thông báo không có dữ liệu
            noCustomersMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị khách hàng:', error);
    }
}

// Xóa khách hàng
async function deleteCustomer(customerId) {
    try {
        const tx = db.transaction('customers', 'readwrite');
        const store = tx.objectStore('customers');

        await store.delete(customerId);
        await tx.done;

        console.log('Đã xóa khách hàng với ID:', customerId);

        // Cập nhật giao diện
        await displayCustomers();
        await populateCustomerDropdowns();

        return true;
    } catch (error) {
        console.error('Lỗi khi xóa khách hàng:', error);
        return false;
    }
}

// Đổ danh sách khách hàng vào các dropdown
async function populateCustomerDropdowns() {
    try {
        // Lấy tất cả khách hàng từ IndexedDB
        const tx = db.transaction('customers', 'readonly');
        const store = tx.objectStore('customers');
        const customers = await store.getAll();

        // Danh sách các dropdown cần đổ dữ liệu
        const dropdowns = [
            document.getElementById('order-customer'),
            document.getElementById('payment-customer')
        ];

        // Đổ dữ liệu vào từng dropdown
        for (const dropdown of dropdowns) {
            if (dropdown) {
                // Lưu lại giá trị đã chọn (nếu có)
                const selectedValue = dropdown.value;

                // Xóa tất cả các option trừ option mặc định
                dropdown.innerHTML = '<option value="" selected disabled>Chọn khách hàng</option>';

                // Thêm các option mới
                customers.forEach(customer => {
                    const option = document.createElement('option');
                    option.value = customer.id;
                    option.textContent = customer.name;
                    dropdown.appendChild(option);
                });

                // Khôi phục giá trị đã chọn (nếu có và vẫn còn hợp lệ)
                if (selectedValue) {
                    dropdown.value = selectedValue;
                }
            }
        }
    } catch (error) {
        console.error('Lỗi khi đổ danh sách khách hàng vào dropdown:', error);
    }
}

// Lấy thông tin khách hàng theo ID
async function getCustomerById(customerId) {
    try {
        const tx = db.transaction('customers', 'readonly');
        const store = tx.objectStore('customers');

        const customer = await store.get(customerId);
        return customer;
    } catch (error) {
        console.error('Lỗi khi lấy thông tin khách hàng:', error);
        return null;
    }
}

// ===== CÁC HÀM XỬ LÝ CHO QUẢN LÝ ĐƠN HÀNG =====

// Thêm dòng sản phẩm vào form đơn hàng
function addOrderItemRow() {
    const orderItemsContainer = document.getElementById('order-items');
    if (!orderItemsContainer) return;

    const newItem = document.createElement('div');
    newItem.className = 'order-item mb-2 p-2 border rounded';
    newItem.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <label class="form-label mb-0">Tên sản phẩm</label>
            <button type="button" class="btn btn-sm btn-outline-danger remove-item-btn">
                <i class="bi bi-x"></i> Xóa
            </button>
        </div>
        <div class="mb-2">
            <input type="text" class="form-control product-name" required>
        </div>
        <div class="row">
            <div class="col-6 mb-2">
                <label class="form-label">Số lượng</label>
                <input type="number" class="form-control product-qty" min="1" value="1" required>
            </div>
            <div class="col-6 mb-2">
                <label class="form-label">Giá bán (VNĐ)</label>
                <input type="number" class="form-control product-price" min="0" required>
            </div>
        </div>
    `;

    // Thêm sự kiện xóa dòng sản phẩm
    newItem.querySelector('.remove-item-btn').addEventListener('click', function() {
        orderItemsContainer.removeChild(newItem);
    });

    orderItemsContainer.appendChild(newItem);
}

// Thêm đơn hàng mới
async function addOrder(orderData) {
    try {
        const tx = db.transaction('orders', 'readwrite');
        const store = tx.objectStore('orders');

        const id = await store.add(orderData);
        await tx.done;

        console.log('Đã thêm đơn hàng mới với ID:', id);

        // Cập nhật giao diện
        await displayOrders();

        return id;
    } catch (error) {
        console.error('Lỗi khi thêm đơn hàng:', error);
        return null;
    }
}

// Hiển thị danh sách đơn hàng
async function displayOrders() {
    try {
        const ordersList = document.getElementById('orders-list');
        const noOrdersMessage = document.getElementById('no-orders-message');

        if (!ordersList || !noOrdersMessage) return;

        // Lấy tất cả đơn hàng từ IndexedDB
        const tx = db.transaction(['orders', 'customers'], 'readonly');
        const orderStore = tx.objectStore('orders');
        const customerStore = tx.objectStore('customers');
        const orders = await orderStore.getAll();

        // Xóa nội dung hiện tại
        ordersList.innerHTML = '';

        if (orders.length > 0) {
            // Ẩn thông báo không có dữ liệu
            noOrdersMessage.style.display = 'none';

            // Hiển thị từng đơn hàng
            for (const order of orders) {
                // Lấy thông tin khách hàng
                const customer = await customerStore.get(order.customerId);
                const customerName = customer ? customer.name : 'Không xác định';

                // Tính tổng tiền đơn hàng
                let totalAmount = 0;
                if (order.items && order.items.length > 0) {
                    totalAmount = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${order.id}</td>
                    <td>${customerName}</td>
                    <td>${formatDate(order.orderDate)}</td>
                    <td><span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></td>
                    <td class="currency">${formatCurrency(totalAmount)}</td>
                    <td>
                        <button class="btn btn-sm btn-info view-order-btn" data-id="${order.id}">
                            Chi tiết
                        </button>
                        <button class="btn btn-sm btn-danger delete-order-btn" data-id="${order.id}">
                            Xóa
                        </button>
                    </td>
                `;

                ordersList.appendChild(row);
            }
        } else {
            // Hiển thị thông báo không có dữ liệu
            noOrdersMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị đơn hàng:', error);
    }
}

// Xóa đơn hàng
async function deleteOrder(orderId) {
    try {
        const tx = db.transaction('orders', 'readwrite');
        const store = tx.objectStore('orders');

        await store.delete(orderId);
        await tx.done;

        console.log('Đã xóa đơn hàng với ID:', orderId);

        // Cập nhật giao diện
        await displayOrders();

        return true;
    } catch (error) {
        console.error('Lỗi khi xóa đơn hàng:', error);
        return false;
    }
}

// Hiển thị chi tiết đơn hàng
async function showOrderDetail(orderId) {
    try {
        const tx = db.transaction(['orders', 'customers'], 'readonly');
        const orderStore = tx.objectStore('orders');
        const customerStore = tx.objectStore('customers');

        const order = await orderStore.get(orderId);
        if (!order) {
            alert('Không tìm thấy đơn hàng!');
            return;
        }

        // Lấy thông tin khách hàng
        const customer = await customerStore.get(order.customerId);
        const customerName = customer ? customer.name : 'Không xác định';

        // Tính tổng tiền đơn hàng
        let totalAmount = 0;
        if (order.items && order.items.length > 0) {
            totalAmount = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
        }

        // Tạo nội dung chi tiết đơn hàng
        const orderDetailContent = document.getElementById('order-detail-content');
        if (!orderDetailContent) return;

        orderDetailContent.innerHTML = `
            <div class="mb-3">
                <h6>Thông tin đơn hàng #${order.id}</h6>
                <p><strong>Khách hàng:</strong> ${customerName}</p>
                <p><strong>Ngày đặt:</strong> ${formatDate(order.orderDate)}</p>
                <p><strong>Trạng thái:</strong> <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></p>
            </div>

            <div class="mb-3">
                <h6>Danh sách sản phẩm</h6>
                <div class="table-responsive">
                    <table class="table table-sm table-bordered">
                        <thead>
                            <tr>
                                <th>Tên sản phẩm</th>
                                <th>Số lượng</th>
                                <th>Đơn giá</th>
                                <th>Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map(item => `
                                <tr>
                                    <td>${item.productName}</td>
                                    <td class="text-center">${item.qty}</td>
                                    <td class="text-end">${formatCurrency(item.sellingPrice)}</td>
                                    <td class="text-end">${formatCurrency(item.qty * item.sellingPrice)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th colspan="3" class="text-end">Tổng cộng:</th>
                                <th class="text-end">${formatCurrency(totalAmount)}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            ${order.deliveredTripId ? `
                <div class="alert alert-info">
                    Đơn hàng này đã được giao trong chuyến hàng #${order.deliveredTripId}
                </div>
            ` : ''}
        `;

        // Hiển thị modal
        const orderDetailModal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
        orderDetailModal.show();

    } catch (error) {
        console.error('Lỗi khi hiển thị chi tiết đơn hàng:', error);
    }
}

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

// ===== CÁC HÀM XỬ LÝ CHO QUẢN LÝ KHÁCH HÀNG =====

// Thêm khách hàng mới
async function addCustomer(customerData) {
    try {
        const tx = db.transaction('customers', 'readwrite');
        const store = tx.objectStore('customers');

        const id = await store.add(customerData);
        await tx.done;

        console.log('Đã thêm khách hàng mới với ID:', id);

        // Cập nhật giao diện
        await displayCustomers();
        await populateCustomerDropdowns();

        return id;
    } catch (error) {
        console.error('Lỗi khi thêm khách hàng:', error);
        return null;
    }
}

// Hiển thị danh sách khách hàng
async function displayCustomers() {
    try {
        const customersList = document.getElementById('customers-list');
        const noCustomersMessage = document.getElementById('no-customers-message');

        if (!customersList || !noCustomersMessage) return;

        // Lấy tất cả khách hàng từ IndexedDB
        const tx = db.transaction('customers', 'readonly');
        const store = tx.objectStore('customers');
        const customers = await store.getAll();

        // Xóa nội dung hiện tại
        customersList.innerHTML = '';

        if (customers.length > 0) {
            // Ẩn thông báo không có dữ liệu
            noCustomersMessage.style.display = 'none';

            // Hiển thị từng khách hàng
            customers.forEach(customer => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${customer.id}</td>
                    <td>${customer.name}</td>
                    <td>${customer.contact || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-danger delete-customer-btn" data-id="${customer.id}">
                            Xóa
                        </button>
                    </td>
                `;

                customersList.appendChild(row);
            });
        } else {
            // Hiển thị thông báo không có dữ liệu
            noCustomersMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị khách hàng:', error);
    }
}

// Xóa khách hàng
async function deleteCustomer(customerId) {
    try {
        const tx = db.transaction('customers', 'readwrite');
        const store = tx.objectStore('customers');

        await store.delete(customerId);
        await tx.done;

        console.log('Đã xóa khách hàng với ID:', customerId);

        // Cập nhật giao diện
        await displayCustomers();
        await populateCustomerDropdowns();

        return true;
    } catch (error) {
        console.error('Lỗi khi xóa khách hàng:', error);
        return false;
    }
}

// Đổ danh sách khách hàng vào các dropdown
async function populateCustomerDropdowns() {
    try {
        // Lấy tất cả khách hàng từ IndexedDB
        const tx = db.transaction('customers', 'readonly');
        const store = tx.objectStore('customers');
        const customers = await store.getAll();

        // Danh sách các dropdown cần đổ dữ liệu
        const dropdowns = [
            document.getElementById('order-customer'),
            document.getElementById('payment-customer')
        ];

        // Đổ dữ liệu vào từng dropdown
        for (const dropdown of dropdowns) {
            if (dropdown) {
                // Lưu lại giá trị đã chọn (nếu có)
                const selectedValue = dropdown.value;

                // Xóa tất cả các option trừ option mặc định
                dropdown.innerHTML = '<option value="" selected disabled>Chọn khách hàng</option>';

                // Thêm các option mới
                customers.forEach(customer => {
                    const option = document.createElement('option');
                    option.value = customer.id;
                    option.textContent = customer.name;
                    dropdown.appendChild(option);
                });

                // Khôi phục giá trị đã chọn (nếu có và vẫn còn hợp lệ)
                if (selectedValue) {
                    dropdown.value = selectedValue;
                }
            }
        }
    } catch (error) {
        console.error('Lỗi khi đổ danh sách khách hàng vào dropdown:', error);
    }
}

// Lấy thông tin khách hàng theo ID
async function getCustomerById(customerId) {
    try {
        const tx = db.transaction('customers', 'readonly');
        const store = tx.objectStore('customers');

        const customer = await store.get(customerId);
        return customer;
    } catch (error) {
        console.error('Lỗi khi lấy thông tin khách hàng:', error);
        return null;
    }
}
