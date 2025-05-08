// ===== CÁC HÀM XỬ LÝ CHO QUẢN LÝ THANH TOÁN =====

// Cập nhật thông tin công nợ trong form thanh toán
async function updatePaymentFormWithDebtInfo(customerId) {
    try {
        // Kiểm tra xem có phần hiển thị thông tin công nợ chưa, nếu chưa thì tạo mới
        let debtInfoContainer = document.getElementById('debt-info-container');
        if (!debtInfoContainer) {
            // Tạo container cho thông tin công nợ
            debtInfoContainer = document.createElement('div');
            debtInfoContainer.id = 'debt-info-container';
            debtInfoContainer.className = 'mt-3 p-3 border rounded bg-light';

            // Thêm vào sau trường chọn khách hàng
            const customerField = document.getElementById('payment-customer').closest('.mb-3');
            customerField.parentNode.insertBefore(debtInfoContainer, customerField.nextSibling);
        }

        // Hiển thị thông báo đang tải
        debtInfoContainer.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm" role="status"></div> Đang tải thông tin công nợ...</div>';

        // Lấy thông tin khách hàng
        const customerTx = db.transaction('customers', 'readonly');
        const customerStore = customerTx.objectStore('customers');
        const customer = await customerStore.get(customerId);

        if (!customer) {
            debtInfoContainer.innerHTML = '<div class="alert alert-warning">Không tìm thấy thông tin khách hàng</div>';
            return;
        }

        // Lấy đơn hàng của khách hàng
        const orderTx = db.transaction('orders', 'readonly');
        const orderStore = orderTx.objectStore('orders');
        const orders = await orderStore.getAll();
        const customerOrders = orders.filter(order => order.customerId === customerId);

        // Lấy thanh toán của khách hàng
        const paymentTx = db.transaction('customerPayments', 'readonly');
        const paymentStore = paymentTx.objectStore('customerPayments');
        const paymentIndex = paymentStore.index('customerId');
        const customerPayments = await paymentIndex.getAll(customerId);

        // Tính tổng giá trị đơn hàng và tổng thanh toán
        let totalOrderValue = 0;
        let unpaidOrderCount = 0;

        for (const order of customerOrders) {
            // Tính giá trị đơn hàng
            if (order.items && Array.isArray(order.items)) {
                const orderValue = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);

                // Kiểm tra trạng thái thanh toán
                if (!order.paymentStatus || order.paymentStatus !== 'Đã thanh toán đủ') {
                    totalOrderValue += orderValue;
                    unpaidOrderCount++;
                }
            }
        }

        // Tính tổng thanh toán
        const totalPayment = customerPayments.reduce((sum, payment) => sum + payment.amount, 0);

        // Tính công nợ còn lại
        const remainingDebt = totalOrderValue - totalPayment;

        // Hiển thị thông tin công nợ
        if (remainingDebt > 0) {
            debtInfoContainer.innerHTML = `
                <h6 class="mb-3">Thông tin công nợ - ${customer.name}</h6>
                <div class="row">
                    <div class="col-md-4">
                        <p class="mb-1"><strong>Tổng nợ:</strong></p>
                        <p class="text-danger fs-5">${formatCurrency(remainingDebt)}</p>
                    </div>
                    <div class="col-md-4">
                        <p class="mb-1"><strong>Đã thanh toán:</strong></p>
                        <p class="text-success">${formatCurrency(totalPayment)}</p>
                    </div>
                    <div class="col-md-4">
                        <p class="mb-1"><strong>Đơn chưa thanh toán:</strong></p>
                        <p>${unpaidOrderCount}</p>
                    </div>
                </div>
                <div class="form-check mt-2">
                    <input class="form-check-input" type="checkbox" id="auto-fill-debt-amount" checked>
                    <label class="form-check-label" for="auto-fill-debt-amount">
                        Điền số tiền nợ vào ô thanh toán
                    </label>
                </div>
            `;

            // Thêm sự kiện cho checkbox tự động điền số tiền
            document.getElementById('auto-fill-debt-amount').addEventListener('change', function() {
                if (this.checked) {
                    document.getElementById('payment-amount').value = remainingDebt;
                }
            });

            // Tự động điền số tiền nợ vào ô thanh toán
            document.getElementById('payment-amount').value = remainingDebt;

            // Thêm ghi chú mặc định
            const paymentNote = document.getElementById('payment-note');
            if (paymentNote && !paymentNote.value) {
                paymentNote.value = `Thanh toán công nợ - ${customer.name}`;
            }
        } else {
            debtInfoContainer.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle-fill me-2"></i>
                    Khách hàng ${customer.name} không có khoản nợ nào.
                </div>
            `;
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật thông tin công nợ:', error);

        const debtInfoContainer = document.getElementById('debt-info-container');
        if (debtInfoContainer) {
            debtInfoContainer.innerHTML = `<div class="alert alert-danger">Lỗi khi tải thông tin công nợ: ${error.message}</div>`;
        }
    }
}

// Xóa thông tin công nợ
function clearDebtInfo() {
    const debtInfoContainer = document.getElementById('debt-info-container');
    if (debtInfoContainer) {
        debtInfoContainer.innerHTML = '';
    }
}

// Thêm thanh toán mới
async function addCustomerPayment(paymentData) {
    try {
        const tx = db.transaction('customerPayments', 'readwrite');
        const store = tx.objectStore('customerPayments');

        const id = await store.add(paymentData);
        await tx.done;

        console.log('Đã thêm thanh toán mới với ID:', id);

        // Cập nhật giao diện
        await displayPayments();

        return id;
    } catch (error) {
        console.error('Lỗi khi thêm thanh toán:', error);
        return null;
    }
}

// Hiển thị danh sách thanh toán
async function displayPayments() {
    try {
        const paymentsList = document.getElementById('payments-list');
        const noPaymentsMessage = document.getElementById('no-payments-message');

        if (!paymentsList || !noPaymentsMessage) return;

        // Lấy tất cả thanh toán từ IndexedDB
        const tx = db.transaction(['customerPayments', 'customers', 'orders'], 'readonly');
        const paymentStore = tx.objectStore('customerPayments');
        const customerStore = tx.objectStore('customers');
        const orderStore = tx.objectStore('orders');
        const payments = await paymentStore.getAll();

        // Xóa nội dung hiện tại
        paymentsList.innerHTML = '';

        if (payments.length > 0) {
            // Ẩn thông báo không có dữ liệu
            noPaymentsMessage.style.display = 'none';

            // Hiển thị từng thanh toán
            for (const payment of payments) {
                // Lấy thông tin khách hàng
                const customer = await customerStore.get(payment.customerId);
                const customerName = customer ? customer.name : 'Không xác định';

                // Lấy thông tin đơn hàng (nếu có)
                let orderInfo = 'Thanh toán chung';
                if (payment.orderId) {
                    const order = await orderStore.get(payment.orderId);
                    if (order) {
                        orderInfo = `Đơn hàng #${order.id}`;
                    }
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${payment.id}</td>
                    <td>${customerName}</td>
                    <td class="currency">${formatCurrency(payment.paymentAmount)}</td>
                    <td>${formatDate(payment.paymentDate)}</td>
                    <td>${orderInfo}</td>
                    <td>
                        <button class="btn btn-sm btn-danger delete-payment-btn" data-id="${payment.id}">
                            Xóa
                        </button>
                    </td>
                `;

                paymentsList.appendChild(row);
            }
        } else {
            // Hiển thị thông báo không có dữ liệu
            noPaymentsMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị thanh toán:', error);
    }
}

// Xóa thanh toán
async function deleteCustomerPayment(paymentId) {
    try {
        const tx = db.transaction('customerPayments', 'readwrite');
        const store = tx.objectStore('customerPayments');

        await store.delete(paymentId);
        await tx.done;

        console.log('Đã xóa thanh toán với ID:', paymentId);

        // Cập nhật giao diện
        await displayPayments();

        return true;
    } catch (error) {
        console.error('Lỗi khi xóa thanh toán:', error);
        return false;
    }
}

// Thiết lập các event listener cho quản lý thanh toán
function setupPaymentEventListeners() {
    // Form thêm thanh toán
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        // Sự kiện khi chọn khách hàng
        const customerSelect = document.getElementById('payment-customer');
        if (customerSelect) {
            customerSelect.addEventListener('change', async function() {
                const customerId = parseInt(this.value);
                if (customerId) {
                    // Hiển thị thông tin công nợ của khách hàng
                    await updatePaymentFormWithDebtInfo(customerId);
                } else {
                    // Xóa thông tin công nợ
                    clearDebtInfo();
                }
            });
        }

        // Sự kiện khi submit form
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const customerId = parseInt(document.getElementById('payment-customer').value);
            const amount = parseFloat(document.getElementById('payment-amount').value);
            const paymentDate = new Date(document.getElementById('payment-date').value);
            const note = document.getElementById('payment-note').value.trim();

            if (customerId && amount > 0 && paymentDate) {
                const paymentData = {
                    customerId,
                    amount,
                    paymentDate,
                    note,
                    createdAt: new Date()
                };

                // Thêm thanh toán
                await addCustomerPayment(paymentData);

                // Reset form
                paymentForm.reset();
                document.getElementById('payment-date').valueAsDate = new Date();

                // Xóa thông tin công nợ
                clearDebtInfo();
            }
        });
    }

    // Nút xóa thanh toán
    document.querySelectorAll('.delete-payment-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const paymentId = parseInt(e.target.getAttribute('data-id'));
            if (confirm('Bạn có chắc muốn xóa thanh toán này?')) {
                await deleteCustomerPayment(paymentId);
            }
        });
    });
}

// Hàm khởi động module thanh toán - có thể gọi từ script.js
window.loadPaymentModule = async function() {
    try {
        // Đảm bảo DB đã sẵn sàng
        if (!db) {
            console.error('Không thể khởi tạo module thanh toán: Database chưa sẵn sàng');
            return false;
        }

        // Hiển thị danh sách thanh toán
        await displayPayments();

        // Thiết lập các event listener
        setupPaymentEventListeners();

        // Đặt giá trị mặc định cho trường ngày
        const paymentDateInput = document.getElementById('payment-date');
        if (paymentDateInput) {
            paymentDateInput.valueAsDate = new Date();
        }

        console.log('Module thanh toán đã khởi tạo thành công');
        return true;
    } catch (error) {
        console.error('Lỗi khi khởi tạo module thanh toán:', error);
        return false;
    }
};
