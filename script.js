// initApp() is called by firebase-config.js after Google sign-in succeeds.
// DO NOT call here - auth gate handles timing.

// Khởi tạo ứng dụng
async function initApp() {
    // Đăng ký Service Worker
    registerServiceWorker();

    // NOTE: Database is Firestore (via window.DB), no local init needed
    console.log('✅ App starting with user:', window.currentUser?.email);

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
        // Tải module khách hàng nếu hàm có sẵn
        if (typeof window.loadCustomerModule === 'function') {
            await window.loadCustomerModule();
        } else {
            console.warn('Module khách hàng chưa sẵn sàng - sẽ được khởi tạo sau');
        }

        // Tải module nhà cung cấp nếu hàm có sẵn
        if (typeof window.loadSupplierModule === 'function') {
            await window.loadSupplierModule();
        } else {
            console.warn('Module nhà cung cấp chưa sẵn sàng - sẽ được khởi tạo sau');
        }

        // Tải module sản phẩm nếu hàm có sẵn
        if (typeof window.loadProductModule === 'function') {
            await window.loadProductModule();
            // Đảm bảo populate supplier dropdown cho form sản phẩm
            await populateSupplierDropdowns();
        } else {
            console.warn('Module sản phẩm chưa sẵn sàng - sẽ được khởi tạo sau');
        }

        // Tải module đơn hàng nếu hàm có sẵn
        if (typeof window.loadOrderModule === 'function') {
            await window.loadOrderModule();
        } else {
            console.warn('Module đơn hàng chưa sẵn sàng - sẽ được khởi tạo sau');
            // Hiển thị danh sách đơn hàng (fallback cũ)
            await displayOrders();
        }

        // Tải module chuyến hàng nếu hàm có sẵn
        if (typeof window.loadTripModule === 'function') {
            await window.loadTripModule();
        } else {
            console.warn('Module chuyến hàng chưa sẵn sàng - sẽ được khởi tạo sau');
            // Hiển thị danh sách chuyến hàng (fallback cũ)
            await displayTrips();
        }

        // Hiển thị danh sách thanh toán
        await displayPayments();

        // Tải module công nợ nếu hàm có sẵn
        if (typeof window.loadDebtModule === 'function') {
            await window.loadDebtModule();
        } else {
            console.warn('Module công nợ chưa sẵn sàng - sẽ được khởi tạo sau');
        }

        // Hiển thị báo cáo
        await displayReports();

        // Thiết lập các event listener cho báo cáo
        if (typeof setupReportEventListeners === 'function') {
            setupReportEventListeners();
        }

        // Đảm bảo tất cả dropdown được populate sau khi load xong
        setTimeout(async () => {
            console.log('Đang populate tất cả dropdowns sau khi load xong...');
            await populateSupplierDropdowns();
            await populateProductDropdowns();
            await populateCustomerDropdowns();
            console.log('Đã hoàn thành populate tất cả dropdowns');
        }, 1000);
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

// NOTE: window.db is now the Firestore shim defined in firebase-config.js
// initDB() is kept as a no-op stub to avoid errors in any lingering references.
async function initDB() {
    console.log('✅ Using Firestore via window.db shim (IndexedDB not used)');
    return true;
}


// Thiết lập các event listener
function setupEventListeners() {
    // Tab navigation để tải lại dữ liệu khi cần thiết
    const tabs = document.querySelectorAll('button[data-bs-toggle="tab"]');
    // Biến để kiểm soát việc load tab
    let isTabLoading = false;

    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', async (e) => {
            // Tránh load song song nhiều tab
            if (isTabLoading) return;
            isTabLoading = true;

            try {
                const targetId = e.target.getAttribute('data-bs-target');
                console.log('Chuyển sang tab:', targetId);

                // Thêm delay nhỏ để tránh conflict
                await new Promise(resolve => setTimeout(resolve, 100));

                // Nếu là tab khách hàng
                if (targetId === '#customers-tab-pane' && typeof window.loadCustomerModule === 'function') {
                    console.log('Tải lại dữ liệu khách hàng khi chuyển tab');
                    await window.loadCustomerModule();
                }

                // Nếu là tab nhà cung cấp
                else if (targetId === '#suppliers-tab-pane' && typeof window.loadSupplierModule === 'function') {
                    console.log('Tải lại dữ liệu nhà cung cấp khi chuyển tab');
                    await window.loadSupplierModule();
                    // Đảm bảo populate dropdown được gọi sau khi load
                    await populateSupplierDropdowns();
                }

                // Nếu là tab sản phẩm
                else if (targetId === '#products-tab-pane' && typeof window.loadProductModule === 'function') {
                    console.log('Tải lại dữ liệu sản phẩm khi chuyển tab');
                    await window.loadProductModule();
                    // Đảm bảo populate dropdown được gọi sau khi load
                    await populateProductDropdowns();
                    // Sử dụng function riêng cho product supplier dropdown
                    if (typeof window.populateProductSupplierDropdownsWithRetry === 'function') {
                        await window.populateProductSupplierDropdownsWithRetry();
                    } else if (typeof window.populateProductSupplierDropdowns === 'function') {
                        await window.populateProductSupplierDropdowns();
                    }
                }

                // Nếu là tab đơn hàng
                else if (targetId === '#orders-tab-pane' && typeof window.loadOrderModule === 'function') {
                    console.log('Tải lại dữ liệu đơn hàng khi chuyển tab');
                    await window.loadOrderModule();
                    // Đảm bảo populate dropdown được gọi sau khi load
                    await populateSupplierDropdowns();
                    await populateCustomerDropdowns();
                }

                // Nếu là tab chuyến hàng
                else if (targetId === '#trips-tab-pane' && typeof displayTrips === 'function') {
                    console.log('Tải lại dữ liệu chuyến hàng khi chuyển tab');
                    await displayTrips();
                }

                // Nếu là tab thanh toán
                else if (targetId === '#payments-tab-pane' && typeof displayPayments === 'function') {
                    console.log('Tải lại dữ liệu thanh toán khi chuyển tab');
                    await displayPayments();
                    // Đảm bảo populate dropdown được gọi sau khi load
                    await populateCustomerDropdowns();
                }

                // Nếu là tab công nợ
                else if (targetId === '#debts-tab-pane' && typeof window.loadDebtModule === 'function') {
                    console.log('Tải lại dữ liệu công nợ khi chuyển tab');
                    await window.loadDebtModule();
                }

                // Nếu là tab báo cáo
                else if (targetId === '#reports-tab-pane') {
                    console.log('Tải lại dữ liệu báo cáo khi chuyển tab');
                    if (typeof window.loadReportModule === "function") {
                        await window.loadReportModule();
                    }
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    // This error can happen if the user switches tabs quickly,
                    // causing the database operation of the previous tab to be aborted.
                    // It's generally safe to ignore.
                    console.log('Data loading aborted by user action (tab switch).');
                } else {
                    console.error('Lỗi khi chuyển tab:', error);
                }
            } finally {
                isTabLoading = false;
            }
        });
    });

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
    // Order management được xử lý trong order.js

    // ===== Tab Chuyến hàng =====
    // Trip management được xử lý trong trip.js (TripModule)
    // Legacy event listeners đã được comment out để tránh xung đột với TripModule

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







// Export dữ liệu ra file JSON
async function exportDataToJson() {
    try {
        // Lấy tất cả dữ liệu từ các collection Firestore
        const allData = {};
        const storeNames = ['customers', 'suppliers', 'products', 'orders', 'trips', 'purchases', 'tripExpenses', 'customerPayments', 'payments', 'orderItems', 'customerPrices'];

        for (const storeName of storeNames) {
            try {
                const data = await window.DB.collection(storeName).getAll();

                // Chuyển đổi ngày thành chuỗi để dễ đọc
                const processedData = data.map(item => {
                    const newItem = { ...item };
                    // Chuyển đổi các trường ngày thành chuỗi ISO
                    for (const key in newItem) {
                        if (newItem[key] instanceof Date) {
                            newItem[key] = newItem[key].toISOString();
                        }
                    }
                    return newItem;
                });

                allData[storeName] = processedData;
            } catch (storeError) {
                console.warn(`Không thể lấy dữ liệu từ ${storeName}:`, storeError);
                allData[storeName] = [];
            }
        }

        // Kiểm tra xem có dữ liệu nào không
        const hasData = Object.values(allData).some(arr => arr.length > 0);
        if (!hasData) {
            alert('Không có dữ liệu để xuất');
            return;
        }

        // Tạo file JSON
        const dataStr = JSON.stringify(allData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        // Tạo link tải xuống
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(dataBlob);
        downloadLink.download = `qlbh-data-${formatDateForFilename(new Date())}.json`;

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
                const jsonData = JSON.parse(event.target.result);

                // Kiểm tra xem dữ liệu có đúng định dạng không
                if (typeof jsonData !== 'object') {
                    throw new Error('Dữ liệu không đúng định dạng');
                }

                if (!confirm('Nhập dữ liệu sẽ ghi đè lên dữ liệu hiện tại. Bạn có chắc chắn muốn tiếp tục?')) {
                    return;
                }

                // Xác định các object store cần nhập dữ liệu
                const storeNames = Object.keys(jsonData).filter(name => {
                    return Array.isArray(jsonData[name]) && jsonData[name].length > 0;
                });

                if (storeNames.length === 0) {
                    throw new Error('Không có dữ liệu hợp lệ để nhập');
                }

                // Nhập dữ liệu cho từng collection Firestore
                for (const storeName of storeNames) {
                    try {
                        // Xóa dữ liệu hiện tại
                        await window.DB.collection(storeName).clear();
                        console.log(`Đã xóa dữ liệu cũ của ${storeName}`);

                        // Thêm dữ liệu mới
                        for (const item of jsonData[storeName]) {
                            await window.DB.collection(storeName).add(item);
                        }
                        console.log(`Đã nhập ${jsonData[storeName].length} bản ghi vào ${storeName}`);
                    } catch (storeError) {
                        console.error(`Lỗi khi nhập dữ liệu vào ${storeName}:`, storeError);
                    }
                }

                alert('Nhập dữ liệu thành công!');
                console.log('Nhập dữ liệu thành công');

                // Cập nhật giao diện
                await loadInitialData();

                // Reset input file
                e.target.value = '';
            } catch (parseError) {
                console.error('Lỗi khi xử lý file JSON:', parseError);
                alert('Lỗi khi xử lý file JSON: ' + parseError.message);
                e.target.value = '';
            }
        };

        reader.readAsText(file);
    } catch (error) {
        console.error('Lỗi khi nhập dữ liệu:', error);
        alert('Lỗi khi nhập dữ liệu: ' + error.message);
        e.target.value = '';
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

// ===== HÀM POPULATE DROPDOWN TOÀN CỤC =====

// Hàm populate dropdown nhà cung cấp toàn cục
async function populateSupplierDropdowns() {
    // Tìm hàm populate trong supplier.js
    if (typeof window.populateSupplierDropdowns === 'function') {
        return await window.populateSupplierDropdowns();
    }

    // Fallback - sử dụng window.DB (Firestore)
    try {
        const supplierDropdowns = document.querySelectorAll('.supplier-select, #product-supplier, [data-supplier-dropdown]');
        if (supplierDropdowns.length === 0) return;
        const suppliers = await window.DB.collection('suppliers').getAll();
        supplierDropdowns.forEach(dropdown => {
            const selectedValue = dropdown.value;
            while (dropdown.options.length > 1) dropdown.remove(1);
            suppliers.forEach(supplier => {
                const option = document.createElement('option');
                option.value = supplier.id;
                option.textContent = supplier.name;
                dropdown.appendChild(option);
            });
            if (selectedValue) dropdown.value = selectedValue;
        });
    } catch (error) {
        console.error('Lỗi khi populate dropdown nhà cung cấp:', error);
    }
}

// Hàm populate dropdown sản phẩm toàn cục
async function populateProductDropdowns() {
    // Tìm hàm populate trong product.js
    if (typeof window.populateProductDropdowns === 'function') {
        return await window.populateProductDropdowns();
    }

    // Fallback - sử dụng window.DB (Firestore)
    try {
        const productDropdowns = document.querySelectorAll('.product-select');
        if (productDropdowns.length === 0) return;
        const products = await window.DB.collection('products').getAll();
        productDropdowns.forEach(dropdown => {
            const selectedValue = dropdown.value;
            while (dropdown.options.length > 1) dropdown.remove(1);
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (${product.code || 'Không mã'})`;
                dropdown.appendChild(option);
            });
            if (selectedValue) dropdown.value = selectedValue;
        });
    } catch (error) {
        console.error('Lỗi khi populate dropdown sản phẩm:', error);
    }
}

// Hàm populate dropdown khách hàng toàn cục
async function populateCustomerDropdowns() {
    // Tìm hàm populate trong customer.js
    if (typeof window.populateCustomerDropdowns === 'function') {
        return await window.populateCustomerDropdowns();
    }

    // Fallback - sử dụng window.DB (Firestore)
    try {
        const customerDropdowns = document.querySelectorAll('#order-customer, #payment-customer');
        if (customerDropdowns.length === 0) return;
        const customers = await window.DB.collection('customers').getAll();
        customerDropdowns.forEach(dropdown => {
            const selectedValue = dropdown.value;
            while (dropdown.options.length > 1) dropdown.remove(1);
            customers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = customer.name;
                dropdown.appendChild(option);
            });
            if (selectedValue) dropdown.value = selectedValue;
        });
    } catch (error) {
        console.error('Lỗi khi populate dropdown khách hàng:', error);
    }
}
