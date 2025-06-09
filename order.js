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

// Đổ danh sách nhà cung cấp vào dropdown cho từng nhà cung cấp
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

// Cập nhật danh sách sản phẩm theo nhà cung cấp được chọn
async function updateProductsBySupplier(supplierSelect, supplierId) {
    try {
        const db = await waitForDB();
        if (!db) return;
        
        const supplierGroup = supplierSelect.closest('.supplier-group');
        const productSelects = supplierGroup.querySelectorAll('.product-select');
        
        if (!supplierId) {
            // Disable tất cả product select trong group này
            productSelects.forEach(productSelect => {
                productSelect.disabled = true;
                productSelect.innerHTML = '<option value="" selected disabled>Chọn nhà cung cấp trước</option>';
                
                const productItem = productSelect.closest('.product-item');
                const purchasePriceInput = productItem.querySelector('.product-purchase-price');
                const sellingPriceInput = productItem.querySelector('.product-selling-price');
                purchasePriceInput.value = '';
                sellingPriceInput.value = '';
                updateItemTotal(productItem);
            });
            return;
        }
        
        const tx = db.transaction('products', 'readonly');
        const store = tx.objectStore('products');
        const supplierIndex = store.index('supplierId');
        const products = await supplierIndex.getAll(parseInt(supplierId));
        
        // Cập nhật tất cả product select trong group này
        productSelects.forEach(productSelect => {
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
                const productItem = productSelect.closest('.product-item');
                const purchasePriceInput = productItem.querySelector('.product-purchase-price');
                const sellingPriceInput = productItem.querySelector('.product-selling-price');
                purchasePriceInput.value = '';
                sellingPriceInput.value = '';
                updateItemTotal(productItem);
            }
        });
        
    } catch (error) {
        console.error('Lỗi khi cập nhật danh sách sản phẩm:', error);
    }
}

// Cập nhật giá khi chọn sản phẩm
function updateProductPrice(productSelect) {
    const productItem = productSelect.closest('.product-item');
    const purchasePriceInput = productItem.querySelector('.product-purchase-price');
    const sellingPriceInput = productItem.querySelector('.product-selling-price');
    
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
    
    updateItemTotal(productItem);
}

// Cập nhật thành tiền cho từng sản phẩm và tổng đơn hàng
function updateItemTotal(productItem) {
    const qtyInput = productItem.querySelector('.product-qty');
    const sellingPriceInput = productItem.querySelector('.product-selling-price');
    const purchasePriceInput = productItem.querySelector('.product-purchase-price');
    const itemTotalSpan = productItem.querySelector('.item-total');
    const profitInfoSpan = productItem.querySelector('.profit-info');
    
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
    const productItems = document.querySelectorAll('.product-item');
    let totalAmount = 0;
    let totalProfit = 0;
    
    productItems.forEach(item => {
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

// Thêm nhà cung cấp mới vào đơn hàng
function addSupplierGroup() {
    const orderSuppliersContainer = document.getElementById('order-suppliers');
    if (!orderSuppliersContainer) return;

    const supplierCount = orderSuppliersContainer.querySelectorAll('.supplier-group').length + 1;
    
    const newSupplierGroup = document.createElement('div');
    newSupplierGroup.className = 'supplier-group mb-4 p-3 border rounded bg-light';
    newSupplierGroup.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <label class="form-label mb-0 fw-bold text-primary">Nhà cung cấp #${supplierCount}</label>
            <button type="button" class="btn btn-sm btn-outline-danger remove-supplier-btn">
                <i class="bi bi-x"></i> Xóa nhà cung cấp
            </button>
        </div>
        
        <div class="mb-3">
            <label class="form-label">Chọn nhà cung cấp</label>
            <select class="form-control supplier-select" required>
                <option value="" selected disabled>Chọn nhà cung cấp</option>
            </select>
        </div>

        <div class="products-container">
            <label class="form-label fw-bold">Sản phẩm từ nhà cung cấp này:</label>
            <div class="product-items">
                <div class="product-item mb-3 p-3 border rounded bg-white">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <label class="form-label mb-0 fw-bold">Sản phẩm #1</label>
                        <button type="button" class="btn btn-sm btn-outline-warning remove-product-btn" style="display: none;">
                            <i class="bi bi-x"></i> Xóa SP
                        </button>
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
                            <label class="form-label">Giá nhập</label>
                            <input type="number" class="form-control product-purchase-price" min="0" readonly>
                            <small class="text-muted">Giá tham khảo</small>
                        </div>
                        <div class="col-4 mb-2">
                            <label class="form-label">Giá bán</label>
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
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-outline-success add-product-to-supplier-btn">
                <i class="bi bi-plus"></i> Thêm sản phẩm từ nhà cung cấp này
            </button>
        </div>
    `;

    orderSuppliersContainer.appendChild(newSupplierGroup);
    
    // Thiết lập event listeners cho supplier group mới
    setupSupplierGroupEventListeners(newSupplierGroup);
    
    // Populate dropdown nhà cung cấp
    populateSupplierDropdowns();
    
    // Hiển thị nút xóa cho tất cả suppliers nếu có nhiều hơn 1
    updateRemoveSupplierButtonsVisibility();
    
    updateSupplierNumbers();
}

// Thêm sản phẩm mới vào một nhà cung cấp
function addProductToSupplier(supplierGroup) {
    const productItemsContainer = supplierGroup.querySelector('.product-items');
    const currentProducts = productItemsContainer.querySelectorAll('.product-item');
    const newIndex = currentProducts.length + 1;
    
    const newProductItem = document.createElement('div');
    newProductItem.className = 'product-item mb-3 p-3 border rounded bg-white';
    
    newProductItem.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <label class="form-label mb-0 fw-bold">Sản phẩm #${newIndex}</label>
            <button type="button" class="btn btn-sm btn-outline-warning remove-product-btn">
                <i class="bi bi-x"></i> Xóa SP
            </button>
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
                <label class="form-label">Giá nhập</label>
                <input type="number" class="form-control product-purchase-price" min="0" readonly>
                <small class="text-muted">Giá tham khảo</small>
            </div>
            <div class="col-4 mb-2">
                <label class="form-label">Giá bán</label>
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

    productItemsContainer.appendChild(newProductItem);
    
    // Thiết lập event listeners cho product item mới
    setupProductItemEventListeners(newProductItem);
    
    // Cập nhật sản phẩm cho nhà cung cấp này nếu đã chọn
    const supplierSelect = supplierGroup.querySelector('.supplier-select');
    if (supplierSelect.value) {
        updateProductsBySupplier(supplierSelect, supplierSelect.value);
    }
    
    // Hiển thị nút xóa cho tất cả products nếu có nhiều hơn 1
    updateRemoveProductButtonsVisibility(supplierGroup);
    
    updateProductNumbers(supplierGroup);
}

// Cập nhật số thứ tự các nhà cung cấp
function updateSupplierNumbers() {
    const supplierGroups = document.querySelectorAll('.supplier-group');
    supplierGroups.forEach((group, index) => {
        const label = group.querySelector('.text-primary');
        if (label) {
            label.textContent = `Nhà cung cấp #${index + 1}`;
        }
    });
}

// Cập nhật số thứ tự các sản phẩm trong một nhà cung cấp
function updateProductNumbers(supplierGroup) {
    const productItems = supplierGroup.querySelectorAll('.product-item');
    productItems.forEach((item, index) => {
        const label = item.querySelector('.fw-bold');
        if (label) {
            label.textContent = `Sản phẩm #${index + 1}`;
        }
    });
}

// Hiển thị/ẩn nút xóa nhà cung cấp
function updateRemoveSupplierButtonsVisibility() {
    const supplierGroups = document.querySelectorAll('.supplier-group');
    supplierGroups.forEach(group => {
        const removeBtn = group.querySelector('.remove-supplier-btn');
        if (removeBtn) {
            removeBtn.style.display = supplierGroups.length > 1 ? 'inline-block' : 'none';
        }
    });
}

// Hiển thị/ẩn nút xóa sản phẩm trong một nhà cung cấp
function updateRemoveProductButtonsVisibility(supplierGroup) {
    const productItems = supplierGroup.querySelectorAll('.product-item');
    productItems.forEach(item => {
        const removeBtn = item.querySelector('.remove-product-btn');
        if (removeBtn) {
            removeBtn.style.display = productItems.length > 1 ? 'inline-block' : 'none';
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

        const tx = db.transaction('orders', 'readwrite');
        const store = tx.objectStore('orders');
        
        let result;
        
        if (orderData.id) {
            // Cập nhật đơn hàng hiện có
            const existingOrder = await store.get(orderData.id);
            if (!existingOrder) {
                throw new Error('Không tìm thấy đơn hàng để cập nhật');
            }
            
            // Giữ lại một số thông tin cũ
            const updatedOrder = {
                ...existingOrder,
                ...orderData,
                orderDate: orderData.orderDate || existingOrder.orderDate,
                status: orderData.status || existingOrder.status,
                paymentStatus: existingOrder.paymentStatus || 'Chưa thanh toán',
                dueDate: existingOrder.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                paymentReceived: existingOrder.paymentReceived || 0
            };
            
            await store.put(updatedOrder);
            result = orderData.id;
            console.log('Đã cập nhật đơn hàng với ID:', result);
        } else {
            // Thêm đơn hàng mới
            // Đảm bảo có trường dueDate và paymentStatus
            if (!orderData.dueDate) {
                orderData.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            }

            if (!orderData.paymentStatus) {
                orderData.paymentStatus = 'Chưa thanh toán';
            }
            
            if (!orderData.paymentReceived) {
                orderData.paymentReceived = 0;
            }

            result = await store.add(orderData);
            console.log('Đã thêm đơn hàng mới với ID:', result);
        }
        
        await tx.done;

        // Cập nhật giao diện
        await displayOrders();

        return result;
    } catch (error) {
        console.error('Lỗi khi xử lý đơn hàng:', error);
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
                        <button class="btn btn-sm btn-warning edit-order-btn" data-id="${order.id}">
                            Sửa
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
                    <table class="table table-striped table-hover align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th scope="col" style="width: 120px;">Nhà cung cấp</th>
                                <th scope="col">Tên sản phẩm</th>
                                <th scope="col" class="text-center" style="width: 80px;">SL</th>
                                <th scope="col" class="text-end" style="width: 100px;">Giá nhập</th>
                                <th scope="col" class="text-end" style="width: 100px;">Giá bán</th>
                                <th scope="col" class="text-end" style="width: 120px;">Thành tiền</th>
                                <th scope="col" class="text-end" style="width: 120px;">Lợi nhuận</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map(item => {
                                const itemTotal = item.qty * item.sellingPrice;
                                const itemProfit = item.qty * ((item.sellingPrice || 0) - (item.purchasePrice || 0));
                                return `
                                <tr>
                                        <td><span class="badge bg-info text-dark small">${item.supplierName || 'N/A'}</span></td>
                                    <td><strong>${item.productName}</strong></td>
                                    <td class="text-center"><span class="badge bg-primary">${item.qty}</span></td>
                                        <td class="text-end">${formatCurrency(item.purchasePrice || 0)}</td>
                                    <td class="text-end"><strong>${formatCurrency(item.sellingPrice)}</strong></td>
                                        <td class="text-end"><strong class="text-primary">${formatCurrency(itemTotal)}</strong></td>
                                        <td class="text-end ${itemProfit >= 0 ? 'text-success' : 'text-danger'}"><strong>${formatCurrency(itemProfit)}</strong></td>
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
        const modalElement = document.getElementById('orderDetailModal');
        if (modalElement) {
            const orderDetailModal = new bootstrap.Modal(modalElement, {
                backdrop: true,
                keyboard: true
            });
        orderDetailModal.show();
            
            // Đảm bảo modal được đóng đúng cách
            modalElement.addEventListener('hidden.bs.modal', function () {
                // Xóa backdrop còn sót lại
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => backdrop.remove());
                
                // Khôi phục body
                document.body.classList.remove('modal-open');
                document.body.style.removeProperty('overflow');
                document.body.style.removeProperty('padding-right');
            }, { once: true });
        }

    } catch (error) {
        console.error('Lỗi khi hiển thị chi tiết đơn hàng:', error);
    }
}

// Chỉnh sửa đơn hàng
async function editOrder(orderId) {
    try {
        const db = await waitForDB();
        if (!db) {
            alert('Không thể kết nối đến cơ sở dữ liệu');
            return;
        }
        
        const tx = db.transaction(['orders', 'customers'], 'readonly');
        const orderStore = tx.objectStore('orders');
        const customerStore = tx.objectStore('customers');

        const order = await orderStore.get(orderId);
        if (!order) {
            alert('Không tìm thấy đơn hàng!');
            return;
        }

        // Kiểm tra trạng thái đơn hàng
        if (order.status === 'Đã giao' || order.deliveredTripId) {
            alert('Không thể sửa đơn hàng đã giao!');
            return;
        }

        // Điền dữ liệu vào form
        document.getElementById('order-customer').value = order.customerId;

        // Reset form trước
        const supplierContainer = document.getElementById('supplier-container');
        supplierContainer.innerHTML = '';

        // Tạo các supplier group từ dữ liệu đơn hàng
        const supplierGroups = {};
        
        // Nhóm items theo supplier
        order.items.forEach(item => {
            if (!supplierGroups[item.supplierId]) {
                supplierGroups[item.supplierId] = {
                    supplierId: item.supplierId,
                    supplierName: item.supplierName,
                    items: []
                };
            }
            supplierGroups[item.supplierId].items.push(item);
        });

        // Tạo UI cho từng supplier group
        for (const [supplierId, groupData] of Object.entries(supplierGroups)) {
            // Thêm supplier group
            addSupplierGroup();
            
            const supplierGroupElements = document.querySelectorAll('.supplier-group');
            const currentSupplierGroup = supplierGroupElements[supplierGroupElements.length - 1];
            
            // Set supplier
            const supplierSelect = currentSupplierGroup.querySelector('.supplier-select');
            await populateSupplierDropdowns();
            supplierSelect.value = supplierId;
            
            // Trigger change để load products
            await updateProductsBySupplier(supplierSelect, supplierId);
            
            // Remove default product item
            const defaultProductItem = currentSupplierGroup.querySelector('.product-item');
            if (defaultProductItem) {
                defaultProductItem.remove();
            }
            
            // Add products cho supplier này
            for (const item of groupData.items) {
                addProductToSupplier(currentSupplierGroup);
                
                const productItems = currentSupplierGroup.querySelectorAll('.product-item');
                const currentProductItem = productItems[productItems.length - 1];
                
                // Set values
                const productSelect = currentProductItem.querySelector('.product-select');
                const qtyInput = currentProductItem.querySelector('.product-qty');
                const sellingPriceInput = currentProductItem.querySelector('.product-selling-price');
                const purchasePriceInput = currentProductItem.querySelector('.product-purchase-price');
                
                productSelect.value = item.productId;
                qtyInput.value = item.qty;
                sellingPriceInput.value = item.sellingPrice;
                purchasePriceInput.value = item.purchasePrice;
                
                updateItemTotal(currentProductItem);
            }
        }

        // Cập nhật form title và button
        document.querySelector('#order-form h5').textContent = `Sửa đơn hàng #${orderId}`;
        const submitButton = document.querySelector('#order-form button[type="submit"]');
        submitButton.textContent = 'Cập nhật đơn hàng';
        submitButton.className = 'btn btn-warning';
        
        // Thêm hidden input để lưu orderId
        let orderIdInput = document.getElementById('edit-order-id');
        if (!orderIdInput) {
            orderIdInput = document.createElement('input');
            orderIdInput.type = 'hidden';
            orderIdInput.id = 'edit-order-id';
            orderIdInput.name = 'orderId';
            document.getElementById('order-form').appendChild(orderIdInput);
        }
        orderIdInput.value = orderId;

        // Scroll to form
        document.getElementById('order-form').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Lỗi khi chỉnh sửa đơn hàng:', error);
        alert('Có lỗi xảy ra khi chỉnh sửa đơn hàng!');
    }
}

// Hàm hủy chỉnh sửa và reset form
function cancelOrderEdit() {
    // Reset form title và button
    document.querySelector('#order-form h5').textContent = 'Thêm đơn hàng mới';
    const submitButton = document.querySelector('#order-form button[type="submit"]');
    submitButton.textContent = 'Thêm đơn hàng';
    submitButton.className = 'btn btn-primary';
    
    // Remove hidden input
    const orderIdInput = document.getElementById('edit-order-id');
    if (orderIdInput) {
        orderIdInput.remove();
    }
    
    // Reset form
    document.getElementById('order-form').reset();
    
    // Reset supplier container
    const supplierContainer = document.getElementById('supplier-container');
    supplierContainer.innerHTML = '';
    addSupplierGroup();
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

// Thiết lập event listeners cho supplier group
function setupSupplierGroupEventListeners(supplierGroup) {
    // Event cho dropdown nhà cung cấp
    const supplierSelect = supplierGroup.querySelector('.supplier-select');
    if (supplierSelect) {
        supplierSelect.addEventListener('change', function() {
            updateProductsBySupplier(this, this.value);
        });
    }
    
    // Event cho nút xóa nhà cung cấp
    const removeSupplierBtn = supplierGroup.querySelector('.remove-supplier-btn');
    if (removeSupplierBtn) {
        removeSupplierBtn.addEventListener('click', function() {
            const suppliers = document.querySelectorAll('.supplier-group');
            if (suppliers.length > 1) {
                supplierGroup.remove();
                updateSupplierNumbers();
                updateRemoveSupplierButtonsVisibility();
                updateOrderTotal();
            }
        });
    }
    
    // Event cho nút thêm sản phẩm vào nhà cung cấp này
    const addProductBtn = supplierGroup.querySelector('.add-product-to-supplier-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', function() {
            addProductToSupplier(supplierGroup);
        });
    }
    
    // Setup event listeners cho tất cả product items trong supplier này
    const productItems = supplierGroup.querySelectorAll('.product-item');
    productItems.forEach(productItem => {
        setupProductItemEventListeners(productItem);
    });
}

// Thiết lập event listeners cho product item
function setupProductItemEventListeners(productItem) {
    // Event cho dropdown sản phẩm
    const productSelect = productItem.querySelector('.product-select');
    if (productSelect && !productSelect.hasAttribute('data-event-added')) {
        productSelect.setAttribute('data-event-added', 'true');
        productSelect.addEventListener('change', function() {
            updateProductPrice(this);
        });
    }
    
    // Event cho input số lượng
    const qtyInput = productItem.querySelector('.product-qty');
    if (qtyInput && !qtyInput.hasAttribute('data-event-added')) {
        qtyInput.setAttribute('data-event-added', 'true');
        qtyInput.addEventListener('input', function() {
            updateItemTotal(productItem);
        });
    }
    
    // Event cho input giá bán
    const sellingPriceInput = productItem.querySelector('.product-selling-price');
    if (sellingPriceInput && !sellingPriceInput.hasAttribute('data-event-added')) {
        sellingPriceInput.setAttribute('data-event-added', 'true');
        sellingPriceInput.addEventListener('input', function() {
            updateItemTotal(productItem);
        });
    }
    
    // Event cho nút xóa sản phẩm
    const removeProductBtn = productItem.querySelector('.remove-product-btn');
    if (removeProductBtn && !removeProductBtn.hasAttribute('data-event-added')) {
        removeProductBtn.setAttribute('data-event-added', 'true');
        removeProductBtn.addEventListener('click', function() {
            const supplierGroup = productItem.closest('.supplier-group');
            const productItems = supplierGroup.querySelectorAll('.product-item');
            
            if (productItems.length > 1) {
                productItem.remove();
                updateProductNumbers(supplierGroup);
                updateRemoveProductButtonsVisibility(supplierGroup);
                updateOrderTotal();
            }
        });
    }
}

// Setup event listeners cho module đơn hàng
function setupOrderEventListeners() {
    // Nút thêm nhà cung cấp
    const addSupplierBtn = document.getElementById('add-supplier-btn');
    if (addSupplierBtn && !addSupplierBtn.hasAttribute('data-event-added')) {
        addSupplierBtn.setAttribute('data-event-added', 'true');
        addSupplierBtn.addEventListener('click', addSupplierGroup);
    }
    
    // Setup sự kiện cho supplier group đầu tiên
    const firstSupplierGroup = document.querySelector('.supplier-group');
    if (firstSupplierGroup) {
        setupSupplierGroupEventListeners(firstSupplierGroup);
    }
    
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
            
            // Thu thập dữ liệu sản phẩm từ các nhà cung cấp
            const orderItems = [];
            const supplierGroups = document.querySelectorAll('.supplier-group');
            
            for (const supplierGroup of supplierGroups) {
                const supplierSelect = supplierGroup.querySelector('.supplier-select');
                if (!supplierSelect.value) continue;
                
                const supplierId = parseInt(supplierSelect.value);
                const supplierName = supplierSelect.options[supplierSelect.selectedIndex].textContent;
                
                const productItems = supplierGroup.querySelectorAll('.product-item');
                
                for (const productItem of productItems) {
                    const productSelect = productItem.querySelector('.product-select');
                    const qtyInput = productItem.querySelector('.product-qty');
                    const sellingPriceInput = productItem.querySelector('.product-selling-price');
                    const purchasePriceInput = productItem.querySelector('.product-purchase-price');
                    
                    if (productSelect.value && qtyInput.value && sellingPriceInput.value) {
                        const productId = parseInt(productSelect.value);
                        const qty = parseInt(qtyInput.value);
                        const sellingPrice = parseFloat(sellingPriceInput.value);
                        const purchasePrice = parseFloat(purchasePriceInput.value) || 0;
                        
                        // Lấy tên sản phẩm từ option text
                        const productOption = productSelect.options[productSelect.selectedIndex];
                        const productName = productOption.dataset.productName || productOption.textContent.split(' (')[0];
                        
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
            }
            
            if (orderItems.length === 0) {
                alert('Vui lòng chọn ít nhất một sản phẩm!');
                return;
            }
            
            // Tính tổng tiền và lợi nhuận
            const totalAmount = orderItems.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
            const totalProfit = orderItems.reduce((sum, item) => sum + (item.qty * (item.sellingPrice - item.purchasePrice)), 0);
            
            // Kiểm tra xem có đang edit không
            const editOrderId = document.getElementById('edit-order-id');
            const isEditing = editOrderId && editOrderId.value;
            
            const orderData = {
                customerId,
                items: orderItems,
                orderDate: isEditing ? undefined : new Date(), // Giữ nguyên ngày cũ khi edit
                status: isEditing ? undefined : 'Chờ xử lý', // Giữ nguyên status cũ khi edit
                totalAmount,
                totalProfit
            };
            
            if (isEditing) {
                orderData.id = parseInt(editOrderId.value);
            }
            
            const result = await addOrder(orderData);
            if (result) {
                const message = isEditing ? 'Đã cập nhật đơn hàng thành công!' : 'Đã tạo đơn hàng thành công!';
                alert(message);
                
                // Reset form về trạng thái ban đầu
                cancelOrderEdit();
                updateOrderTotal();
            } else {
                const message = isEditing ? 'Có lỗi xảy ra khi cập nhật đơn hàng!' : 'Có lỗi xảy ra khi tạo đơn hàng!';
                alert(message);
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

// Reset một supplier group về trạng thái ban đầu
function resetSupplierGroup(supplierGroup) {
    // Reset supplier select
    const supplierSelect = supplierGroup.querySelector('.supplier-select');
    if (supplierSelect) {
        supplierSelect.value = '';
    }
    
    // Reset tất cả product items trong supplier group này
    const productItemsContainer = supplierGroup.querySelector('.product-items');
    const productItems = productItemsContainer.querySelectorAll('.product-item');
    
    // Xóa tất cả product items trừ item đầu tiên
    for (let i = 1; i < productItems.length; i++) {
        productItemsContainer.removeChild(productItems[i]);
    }
    
    // Reset product item đầu tiên
    const firstProductItem = productItemsContainer.querySelector('.product-item');
    if (firstProductItem) {
        resetProductItem(firstProductItem);
        
        // Ẩn nút xóa product
        const removeProductBtn = firstProductItem.querySelector('.remove-product-btn');
        if (removeProductBtn) {
            removeProductBtn.style.display = 'none';
        }
    }
    
    updateProductNumbers(supplierGroup);
}

// Reset một product item về trạng thái ban đầu
function resetProductItem(productItem) {
    const productSelect = productItem.querySelector('.product-select');
    const qtyInput = productItem.querySelector('.product-qty');
    const purchasePriceInput = productItem.querySelector('.product-purchase-price');
    const sellingPriceInput = productItem.querySelector('.product-selling-price');
    
    if (productSelect) {
        productSelect.disabled = true;
        productSelect.innerHTML = '<option value="" selected disabled>Chọn nhà cung cấp trước</option>';
    }
    if (qtyInput) qtyInput.value = '1';
    if (purchasePriceInput) purchasePriceInput.value = '';
    if (sellingPriceInput) sellingPriceInput.value = '';
    
    updateItemTotal(productItem);
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
        
        // Đăng ký các hàm làm global
        window.populateOrderSupplierDropdowns = populateSupplierDropdowns;
        window.showOrderDetail = showOrderDetail;
        
        console.log('Module đơn hàng đã khởi tạo thành công');
        return true;
    } catch (error) {
        console.error('Lỗi khi khởi tạo module đơn hàng:', error);
        return false;
    }
};



// Thêm event listener cho nút xem chi tiết, sửa và xóa
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('view-order-btn')) {
        const orderId = parseInt(e.target.getAttribute('data-id'));
        await showOrderDetail(orderId);
    }
    
    if (e.target.classList.contains('edit-order-btn')) {
        const orderId = parseInt(e.target.getAttribute('data-id'));
        await editOrder(orderId);
    }
    
    if (e.target.classList.contains('delete-order-btn')) {
        const orderId = parseInt(e.target.getAttribute('data-id'));
        if (confirm('Bạn có chắc muốn xóa đơn hàng này?')) {
            await deleteOrder(orderId);
        }
    }
});
