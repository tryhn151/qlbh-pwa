// ===== CÁC HÀM XỬ LÝ CHO QUẢN LÝ ĐƠN HÀNG =====

// Hàm chờ database sẵn sàng
async function waitForDB() {
    return new Promise((resolve) => {
        if (window.db) {
            try {
                const tx = window.db.transaction('orders', 'readonly');
                tx.abort();
                resolve(window.db);
                return;
            } catch (error) {
                // Tiếp tục chờ
            }
        }
        
        let attempts = 0;
        const maxAttempts = 150;
        
        const checkInterval = setInterval(() => {
            attempts++;
            
            if (window.db) {
                try {
                    const tx = window.db.transaction('orders', 'readonly');
                    tx.abort();
                    
                    clearInterval(checkInterval);
                    resolve(window.db);
                } catch (error) {
                    // Tiếp tục chờ
                }
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
}

// Đổ danh sách nhà cung cấp vào dropdown cho từng item
async function populateSupplierDropdowns() {
    try {
        const db = await waitForDB();
        if (!db) return;
        
        const supplierSelects = document.querySelectorAll('.supplier-select');
        if (supplierSelects.length === 0) return;
        
        const tx = db.transaction('suppliers', 'readonly');
        const store = tx.objectStore('suppliers');
        const suppliers = await store.getAll();
        
        supplierSelects.forEach(select => {
            // Lưu giá trị đã chọn
            const selectedValue = select.value;
            
            // Xóa tất cả options trừ option đầu tiên
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // Thêm các nhà cung cấp
            suppliers.forEach(supplier => {
                const option = document.createElement('option');
                option.value = supplier.id;
                option.textContent = supplier.name;
                select.appendChild(option);
            });
            
            // Khôi phục giá trị đã chọn
            if (selectedValue) {
                select.value = selectedValue;
            }
        });
    } catch (error) {
        console.error('Lỗi khi tải danh sách nhà cung cấp:', error);
    }
}

// Cập nhật danh sách sản phẩm theo nhà cung cấp được chọn cho một item cụ thể
async function updateProductsBySupplier(supplierSelect, supplierId) {
    try {
        const db = await waitForDB();
        if (!db) return;
        
        const orderItem = supplierSelect.closest('.order-item');
        const productSelect = orderItem.querySelector('.product-select');
        const purchasePriceInput = orderItem.querySelector('.product-purchase-price');
        const sellingPriceInput = orderItem.querySelector('.product-selling-price');
        
        if (!supplierId) {
            // Disable product select
            productSelect.disabled = true;
            productSelect.innerHTML = '<option value="" selected disabled>Chọn nhà cung cấp trước</option>';
            purchasePriceInput.value = '';
            sellingPriceInput.value = '';
            updateItemTotal(orderItem);
            return;
        }
        
        const tx = db.transaction('products', 'readonly');
        const store = tx.objectStore('products');
        const supplierIndex = store.index('supplierId');
        const products = await supplierIndex.getAll(parseInt(supplierId));
        
        // Lưu giá trị đã chọn
        const selectedValue = productSelect.value;
        
        // Xóa tất cả options
        productSelect.innerHTML = '';
        
        // Thêm option mặc định
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = products.length > 0 ? 'Chọn sản phẩm' : 'Không có sản phẩm';
        defaultOption.selected = true;
        defaultOption.disabled = true;
        productSelect.appendChild(defaultOption);
        
        // Thêm các sản phẩm
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (${product.code || 'Không có mã'})`;
            option.dataset.purchasePrice = product.purchasePrice || 0;
            option.dataset.productName = product.name;
            productSelect.appendChild(option);
        });
        
        // Enable select
        productSelect.disabled = products.length === 0;
        
        // Khôi phục giá trị đã chọn nếu có
        if (selectedValue && products.find(p => p.id == selectedValue)) {
            productSelect.value = selectedValue;
            // Trigger change event để cập nhật giá
            productSelect.dispatchEvent(new Event('change'));
        } else {
            // Reset giá nếu không có sản phẩm được chọn
            purchasePriceInput.value = '';
            sellingPriceInput.value = '';
            updateItemTotal(orderItem);
        }
        
    } catch (error) {
        console.error('Lỗi khi cập nhật danh sách sản phẩm:', error);
    }
}

// Cập nhật giá khi chọn sản phẩm
function updateProductPrice(productSelect) {
    const orderItem = productSelect.closest('.order-item');
    const purchasePriceInput = orderItem.querySelector('.product-purchase-price');
    const sellingPriceInput = orderItem.querySelector('.product-selling-price');
    
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    if (selectedOption && selectedOption.dataset.purchasePrice) {
        const purchasePrice = parseFloat(selectedOption.dataset.purchasePrice);
        purchasePriceInput.value = purchasePrice;
        
        // Gợi ý giá bán (110% giá nhập)
        if (!sellingPriceInput.value || parseFloat(sellingPriceInput.value) === 0) {
            sellingPriceInput.value = Math.round(purchasePrice * 1.1);
        }
    } else {
        purchasePriceInput.value = '';
        sellingPriceInput.value = '';
    }
    
    updateItemTotal(orderItem);
}

// Cập nhật thành tiền cho từng item và tổng đơn hàng
function updateItemTotal(orderItem) {
    const qtyInput = orderItem.querySelector('.product-qty');
    const sellingPriceInput = orderItem.querySelector('.product-selling-price');
    const purchasePriceInput = orderItem.querySelector('.product-purchase-price');
    const itemTotalSpan = orderItem.querySelector('.item-total');
    const profitInfoSpan = orderItem.querySelector('.profit-info');
    
    const qty = parseInt(qtyInput.value) || 0;
    const sellingPrice = parseFloat(sellingPriceInput.value) || 0;
    const purchasePrice = parseFloat(purchasePriceInput.value) || 0;
    
    const itemTotal = qty * sellingPrice;
    const itemProfit = qty * (sellingPrice - purchasePrice);
    
    itemTotalSpan.textContent = formatCurrency(itemTotal);
    
    if (purchasePrice > 0) {
        profitInfoSpan.textContent = `(Lợi nhuận: ${formatCurrency(itemProfit)})`;
        profitInfoSpan.className = itemProfit >= 0 ? 'profit-info ms-3 text-success' : 'profit-info ms-3 text-danger';
    } else {
        profitInfoSpan.textContent = '';
    }
    
    updateOrderTotal();
}

// Cập nhật tổng đơn hàng
function updateOrderTotal() {
    const orderItems = document.querySelectorAll('.order-item');
    let totalAmount = 0;
    let totalProfit = 0;
    
    orderItems.forEach(item => {
        const qtyInput = item.querySelector('.product-qty');
        const sellingPriceInput = item.querySelector('.product-selling-price');
        const purchasePriceInput = item.querySelector('.product-purchase-price');
        
        const qty = parseInt(qtyInput.value) || 0;
        const sellingPrice = parseFloat(sellingPriceInput.value) || 0;
        const purchasePrice = parseFloat(purchasePriceInput.value) || 0;
        
        totalAmount += qty * sellingPrice;
        totalProfit += qty * (sellingPrice - purchasePrice);
    });
    
    const orderTotalSpan = document.getElementById('order-total');
    const orderProfitSpan = document.getElementById('order-profit');
    
    if (orderTotalSpan) orderTotalSpan.textContent = formatCurrency(totalAmount);
    if (orderProfitSpan) {
        orderProfitSpan.textContent = formatCurrency(totalProfit);
        orderProfitSpan.className = totalProfit >= 0 ? 'fw-bold text-success' : 'fw-bold text-danger';
    }
}

// Thêm dòng sản phẩm vào form đơn hàng
function addOrderItemRow() {
    const orderItemsContainer = document.getElementById('order-items');
    if (!orderItemsContainer) return;

    const itemCount = orderItemsContainer.querySelectorAll('.order-item').length + 1;
    
    const newItem = document.createElement('div');
    newItem.className = 'order-item mb-3 p-3 border rounded';
    newItem.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <label class="form-label mb-0 fw-bold">Sản phẩm #${itemCount}</label>
            <button type="button" class="btn btn-sm btn-outline-danger remove-item-btn">
                <i class="bi bi-x"></i> Xóa
            </button>
        </div>
        
        <div class="mb-2">
            <label class="form-label">Nhà cung cấp</label>
            <select class="form-control supplier-select" required>
                <option value="" selected disabled>Chọn nhà cung cấp</option>
            </select>
        </div>
        
        <div class="mb-2">
            <label class="form-label">Sản phẩm</label>
            <select class="form-control product-select" required disabled>
                <option value="" selected disabled>Chọn nhà cung cấp trước</option>
            </select>
        </div>
        
        <div class="row">
            <div class="col-4 mb-2">
                <label class="form-label">Số lượng</label>
                <input type="number" class="form-control product-qty" min="1" value="1" required>
            </div>
            <div class="col-4 mb-2">
                <label class="form-label">Giá nhập (VNĐ)</label>
                <input type="number" class="form-control product-purchase-price" min="0" readonly>
                <small class="text-muted">Giá tham khảo</small>
            </div>
            <div class="col-4 mb-2">
                <label class="form-label">Giá bán (VNĐ)</label>
                <input type="number" class="form-control product-selling-price" min="0" required>
                <small class="text-muted">Giá bán cho khách</small>
            </div>
        </div>
        
        <div class="row mt-2">
            <div class="col-12">
                <div class="bg-light p-2 rounded">
                    <strong>Thành tiền: <span class="item-total">0 VNĐ</span></strong>
                    <span class="profit-info ms-3 text-success"></span>
                </div>
            </div>
        </div>
    `;

    // Thêm sự kiện xóa dòng sản phẩm
    newItem.querySelector('.remove-item-btn').addEventListener('click', function() {
        const items = orderItemsContainer.querySelectorAll('.order-item');
        if (items.length > 1) {
            orderItemsContainer.removeChild(newItem);
            
            // Cập nhật lại số thứ tự cho các item còn lại
            updateItemNumbers();
            
            // Ẩn nút xóa nếu chỉ còn 1 item
            if (items.length === 2) {
                orderItemsContainer.querySelector('.remove-item-btn').style.display = 'none';
            }
            
            // Cập nhật tổng đơn hàng
            updateOrderTotal();
        }
    });

    // Thêm sự kiện cho dropdown nhà cung cấp
    const supplierSelect = newItem.querySelector('.supplier-select');
    supplierSelect.addEventListener('change', function() {
        updateProductsBySupplier(this, this.value);
    });

    // Thêm sự kiện cho dropdown sản phẩm
    const productSelect = newItem.querySelector('.product-select');
    productSelect.addEventListener('change', function() {
        updateProductPrice(this);
    });
    
    // Thêm sự kiện cho các input số lượng và giá
    const qtyInput = newItem.querySelector('.product-qty');
    const sellingPriceInput = newItem.querySelector('.product-selling-price');
    
    qtyInput.addEventListener('input', function() {
        updateItemTotal(newItem);
    });
    
    sellingPriceInput.addEventListener('input', function() {
        updateItemTotal(newItem);
    });

    orderItemsContainer.appendChild(newItem);
    
    // Populate dropdown nhà cung cấp cho item mới
    populateSupplierDropdowns();
    
    // Hiển thị nút xóa cho tất cả items nếu có nhiều hơn 1
    const allItems = orderItemsContainer.querySelectorAll('.order-item');
    if (allItems.length > 1) {
        allItems.forEach(item => {
            item.querySelector('.remove-item-btn').style.display = 'inline-block';
        });
    }
}

// Cập nhật số thứ tự các item
function updateItemNumbers() {
    const orderItems = document.querySelectorAll('.order-item');
    orderItems.forEach((item, index) => {
        const label = item.querySelector('.fw-bold');
        if (label) {
            label.textContent = `Sản phẩm #${index + 1}`;
        }
    });
}

// Thêm đơn hàng mới
async function addOrder(orderData) {
    try {
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }

        // Đảm bảo có trường dueDate và paymentStatus
        if (!orderData.dueDate) {
            // Mặc định hạn thanh toán là 30 ngày sau ngày đặt hàng
            orderData.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }

        if (!orderData.paymentStatus) {
            orderData.paymentStatus = 'Chưa thanh toán';
        }

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

        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }

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
                let totalAmount = order.totalAmount || 0;
                if (!totalAmount && order.items && order.items.length > 0) {
                    totalAmount = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                }

                // Tạo thông tin nhà cung cấp
                let suppliersInfo = 'Không có';
                if (order.items && order.items.length > 0) {
                    const uniqueSuppliers = [...new Set(order.items.map(item => item.supplierName || 'Không xác định'))];
                    suppliersInfo = uniqueSuppliers.length > 2 
                        ? `${uniqueSuppliers.slice(0, 2).join(', ')} +${uniqueSuppliers.length - 2} khác`
                        : uniqueSuppliers.join(', ');
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${order.id}</td>
                    <td>${customerName}</td>
                    <td><small>${suppliersInfo}</small></td>
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

        // Tính tổng tiền và lợi nhuận
        let totalAmount = order.totalAmount || 0;
        let totalProfit = order.totalProfit || 0;
        
        if (!totalAmount && order.items && order.items.length > 0) {
            totalAmount = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
            totalProfit = order.items.reduce((sum, item) => sum + (item.qty * ((item.sellingPrice || 0) - (item.purchasePrice || 0))), 0);
        }

        // Tạo nội dung chi tiết đơn hàng
        const orderDetailContent = document.getElementById('order-detail-content');
        if (!orderDetailContent) return;

        orderDetailContent.innerHTML = `
            <div class="mb-3">
                <h6>Thông tin đơn hàng #${order.id}</h6>
                <p><strong>Khách hàng:</strong> ${customerName}</p>
                <p><strong>Ngày đặt:</strong> ${formatDate(order.orderDate)}</p>
                <p><strong>Hạn thanh toán:</strong> ${order.dueDate ? formatDate(order.dueDate) : 'Không có'}</p>
                <p><strong>Trạng thái đơn hàng:</strong> <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></p>
                <p><strong>Trạng thái thanh toán:</strong> <span class="badge ${order.paymentStatus === 'Đã thanh toán đủ' ? 'bg-success' : 'bg-warning'}">${order.paymentStatus || 'Chưa thanh toán'}</span></p>
                <p><strong>Tổng tiền:</strong> <span class="fw-bold text-primary">${formatCurrency(totalAmount)}</span></p>
                <p><strong>Lợi nhuận dự kiến:</strong> <span class="fw-bold ${totalProfit >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(totalProfit)}</span></p>
            </div>

            <div class="mb-3">
                <h6>Danh sách sản phẩm</h6>
                <div class="table-responsive">
                    <table class="table table-sm table-bordered">
                        <thead>
                            <tr>
                                <th>Nhà cung cấp</th>
                                <th>Tên sản phẩm</th>
                                <th>Số lượng</th>
                                <th>Giá nhập</th>
                                <th>Giá bán</th>
                                <th>Thành tiền</th>
                                <th>Lợi nhuận</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map(item => {
                                const itemTotal = item.qty * item.sellingPrice;
                                const itemProfit = item.qty * ((item.sellingPrice || 0) - (item.purchasePrice || 0));
                                return `
                                    <tr>
                                        <td><small>${item.supplierName || 'Không xác định'}</small></td>
                                        <td>${item.productName}</td>
                                        <td class="text-center">${item.qty}</td>
                                        <td class="text-end">${formatCurrency(item.purchasePrice || 0)}</td>
                                        <td class="text-end">${formatCurrency(item.sellingPrice)}</td>
                                        <td class="text-end fw-bold">${formatCurrency(itemTotal)}</td>
                                        <td class="text-end ${itemProfit >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(itemProfit)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th colspan="5" class="text-end">Tổng cộng:</th>
                                <th class="text-end">${formatCurrency(totalAmount)}</th>
                                <th class="text-end ${totalProfit >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(totalProfit)}</th>
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
        case 'Chờ xử lý':
            return 'bg-warning';
        case 'Đang giao':
            return 'bg-info';
        case 'Đã giao':
            return 'bg-success';
        case 'Đã hủy':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

// Setup event listeners cho module đơn hàng
function setupOrderEventListeners() {
    // Nút thêm sản phẩm
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', addOrderItemRow);
    }
    
    // Setup sự kiện cho item đầu tiên
    setupItemEventListeners();
    
    // Form đơn hàng
    const orderForm = document.getElementById('order-form');
    if (orderForm && !orderForm.hasAttribute('data-listener-added')) {
        orderForm.setAttribute('data-listener-added', 'true');
        
        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const customerId = parseInt(document.getElementById('order-customer').value);
            
            if (!customerId) {
                alert('Vui lòng chọn khách hàng!');
                return;
            }
            
            // Thu thập dữ liệu sản phẩm
            const orderItems = [];
            const productRows = document.querySelectorAll('.order-item');
            
            for (const row of productRows) {
                const supplierSelect = row.querySelector('.supplier-select');
                const productSelect = row.querySelector('.product-select');
                const qtyInput = row.querySelector('.product-qty');
                const sellingPriceInput = row.querySelector('.product-selling-price');
                const purchasePriceInput = row.querySelector('.product-purchase-price');
                
                if (supplierSelect.value && productSelect.value && qtyInput.value && sellingPriceInput.value) {
                    const supplierId = parseInt(supplierSelect.value);
                    const productId = parseInt(productSelect.value);
                    const qty = parseInt(qtyInput.value);
                    const sellingPrice = parseFloat(sellingPriceInput.value);
                    const purchasePrice = parseFloat(purchasePriceInput.value) || 0;
                    
                    // Lấy tên sản phẩm từ option text
                    const productOption = productSelect.options[productSelect.selectedIndex];
                    const productName = productOption.dataset.productName || productOption.textContent.split(' (')[0];
                    
                    // Lấy tên nhà cung cấp
                    const supplierName = supplierSelect.options[supplierSelect.selectedIndex].textContent;
                    
                    orderItems.push({
                        supplierId,
                        supplierName,
                        productId,
                        productName,
                        qty,
                        sellingPrice,
                        purchasePrice
                    });
                }
            }
            
            if (orderItems.length === 0) {
                alert('Vui lòng chọn ít nhất một sản phẩm!');
                return;
            }
            
            // Tính tổng tiền và lợi nhuận
            const totalAmount = orderItems.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
            const totalProfit = orderItems.reduce((sum, item) => sum + (item.qty * (item.sellingPrice - item.purchasePrice)), 0);
            
            const orderData = {
                customerId,
                items: orderItems,
                orderDate: new Date(),
                status: 'Chờ xử lý',
                totalAmount,
                totalProfit
            };
            
            const result = await addOrder(orderData);
            if (result) {
                // Reset form
                orderForm.reset();
                
                // Reset về 1 item duy nhất
                const orderItemsContainer = document.getElementById('order-items');
                const items = orderItemsContainer.querySelectorAll('.order-item');
                for (let i = 1; i < items.length; i++) {
                    orderItemsContainer.removeChild(items[i]);
                }
                
                // Reset item đầu tiên
                const firstItem = orderItemsContainer.querySelector('.order-item');
                if (firstItem) {
                    resetOrderItem(firstItem);
                    firstItem.querySelector('.remove-item-btn').style.display = 'none';
                }
                
                // Reset tổng đơn hàng
                updateOrderTotal();
                
                alert('Đã tạo đơn hàng thành công!');
            }
        });
    }
    
    console.log('Đã thiết lập event listeners cho module đơn hàng');
}

// Setup event listeners cho item đầu tiên và các item mới
function setupItemEventListeners() {
    const orderItems = document.querySelectorAll('.order-item');
    
    orderItems.forEach(item => {
        const supplierSelect = item.querySelector('.supplier-select');
        const productSelect = item.querySelector('.product-select');
        const qtyInput = item.querySelector('.product-qty');
        const sellingPriceInput = item.querySelector('.product-selling-price');
        
        // Kiểm tra xem đã setup chưa
        if (supplierSelect && !supplierSelect.hasAttribute('data-event-added')) {
            supplierSelect.setAttribute('data-event-added', 'true');
            supplierSelect.addEventListener('change', function() {
                updateProductsBySupplier(this, this.value);
            });
        }
        
        if (productSelect && !productSelect.hasAttribute('data-event-added')) {
            productSelect.setAttribute('data-event-added', 'true');
            productSelect.addEventListener('change', function() {
                updateProductPrice(this);
            });
        }
        
        if (qtyInput && !qtyInput.hasAttribute('data-event-added')) {
            qtyInput.setAttribute('data-event-added', 'true');
            qtyInput.addEventListener('input', function() {
                updateItemTotal(item);
            });
        }
        
        if (sellingPriceInput && !sellingPriceInput.hasAttribute('data-event-added')) {
            sellingPriceInput.setAttribute('data-event-added', 'true');
            sellingPriceInput.addEventListener('input', function() {
                updateItemTotal(item);
            });
        }
    });
}

// Reset một order item về trạng thái ban đầu
function resetOrderItem(item) {
    const supplierSelect = item.querySelector('.supplier-select');
    const productSelect = item.querySelector('.product-select');
    const qtyInput = item.querySelector('.product-qty');
    const purchasePriceInput = item.querySelector('.product-purchase-price');
    const sellingPriceInput = item.querySelector('.product-selling-price');
    
    if (supplierSelect) supplierSelect.value = '';
    if (productSelect) {
        productSelect.disabled = true;
        productSelect.innerHTML = '<option value="" selected disabled>Chọn nhà cung cấp trước</option>';
    }
    if (qtyInput) qtyInput.value = '1';
    if (purchasePriceInput) purchasePriceInput.value = '';
    if (sellingPriceInput) sellingPriceInput.value = '';
    
    updateItemTotal(item);
}

// Hàm khởi động module đơn hàng
window.loadOrderModule = async function() {
    try {
        const db = await waitForDB();
        if (!db) {
            console.error('Không thể khởi tạo module đơn hàng: Database chưa sẵn sàng');
            return false;
        }
        
        // Đổ dữ liệu vào dropdown nhà cung cấp
        await populateSupplierDropdowns();
        
        // Hiển thị danh sách đơn hàng
        await displayOrders();
        
        // Thiết lập event listeners
        setupOrderEventListeners();
        
        console.log('Module đơn hàng đã khởi tạo thành công');
        return true;
    } catch (error) {
        console.error('Lỗi khi khởi tạo module đơn hàng:', error);
        return false;
    }
};
