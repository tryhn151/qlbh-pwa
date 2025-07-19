// ===== ORDER MANAGEMENT MODULE =====
// Complete order management with modern UI and validation
// Senior JS Developer: Module pattern while preserving all business logic

// ===== MODULE STRUCTURE =====
const OrderModule = {
    // Data storage
    data: {
        currentOrders: [],
        filteredOrders: [],
        orderToDelete: null,
        currentCustomers: [],
        currentSuppliers: [],
        currentProducts: []
    },

    // Configuration
    config: {
        validationRules: {
            customer: {
                required: true,
                message: 'Vui lòng chọn khách hàng'
            },
            items: {
                required: true,
                minItems: 1,
                message: 'Vui lòng chọn ít nhất một sản phẩm'
            }
        },
        fieldDisplayNames: {
            customer: 'Khách hàng',
            items: 'Sản phẩm'
        },
        statusLabels: {
            'Mới': 'bg-primary',
            'Chờ xử lý': 'bg-warning',
            'Đang giao': 'bg-info',
            'Đã giao': 'bg-success',
            'Đã hủy': 'bg-danger'
        }
    },

    // ===== UTILITY FUNCTIONS =====
    utils: {
        // Safe value handler
        safeValue(value, defaultValue = '') {
            if (value === null || value === undefined || value === 'null' || value === 'undefined') {
                return defaultValue;
            }
            if (typeof value === 'string' && value.trim() === '') {
                return defaultValue;
            }
            return value;
        },

        // Wait for database (preserved from original)
        async waitForDB() {
            return new Promise((resolve) => {
                if (window.db) {
                    try {
                        const tx = window.db.transaction('orders', 'readonly');
                        tx.abort();
                        resolve(window.db);
                        return;
                    } catch (error) {
                        // Continue waiting
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
                            // Continue waiting
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
        },

        // Clean up modals
        cleanupAllModals() {
            try {
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => backdrop.remove());
                
                document.body.classList.remove('modal-open');
                document.body.style.removeProperty('padding-right');
                
                const modalElements = document.querySelectorAll('.modal');
                modalElements.forEach(modalEl => {
                    const instance = bootstrap.Modal.getInstance(modalEl);
                    if (instance) {
                        instance.dispose();
                    }
                });
                
                console.log('🧹 Cleaned up all modals');
            } catch (error) {
                console.log('⚠️ Error during modal cleanup:', error);
            }
        },

        // Format currency (preserved from original)
        formatCurrency(amount) {
            if (window.formatCurrency) {
                return window.formatCurrency(amount);
            }
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(amount);
        },

        // Format date (preserved from original)
        formatDate(date) {
            if (window.formatDate) {
                return window.formatDate(date);
            }
            if (!date) return '';
            const d = new Date(date);
            return d.toLocaleDateString('vi-VN');
        },

        // Get status badge class (preserved from original)
        getStatusBadgeClass(status) {
            return OrderModule.config.statusLabels[status] || 'bg-secondary';
        }
    },

    // ===== VALIDATION SYSTEM =====
    validation: {
        // Validate order form
        validateOrderForm() {
            const errors = [];
            
            // Validate customer selection
            const customerSelect = document.getElementById('order-customer');
            if (!customerSelect.value) {
                errors.push('Vui lòng chọn khách hàng');
            }
            
            // Validate items
            const orderItems = this.collectOrderItems();
            if (orderItems.length === 0) {
                errors.push('Vui lòng chọn ít nhất một sản phẩm');
            }
            
            // Validate each item
            orderItems.forEach((item, index) => {
                if (!item.productId) {
                    errors.push(`Sản phẩm ${index + 1}: Vui lòng chọn sản phẩm`);
                }
                if (!item.qty || item.qty <= 0) {
                    errors.push(`Sản phẩm ${index + 1}: Số lượng phải lớn hơn 0`);
                }
                if (!item.sellingPrice || item.sellingPrice <= 0) {
                    errors.push(`Sản phẩm ${index + 1}: Giá bán phải lớn hơn 0`);
                }
            });
            
            return {
                valid: errors.length === 0,
                errors: errors
            };
        },

        // Collect order items from form
        collectOrderItems() {
            const orderItems = [];
            const supplierGroups = document.querySelectorAll('.supplier-group');
            
            supplierGroups.forEach(supplierGroup => {
                const supplierSelect = supplierGroup.querySelector('.supplier-select');
                if (!supplierSelect.value) return;
                
                const supplierId = parseInt(supplierSelect.value);
                const supplierName = supplierSelect.options[supplierSelect.selectedIndex].textContent;
                
                const productItems = supplierGroup.querySelectorAll('.product-item');
                
                productItems.forEach(productItem => {
                    const productSelect = productItem.querySelector('.product-select');
                    const qtyInput = productItem.querySelector('.product-qty');
                    const sellingPriceInput = productItem.querySelector('.product-selling-price');
                    const purchasePriceInput = productItem.querySelector('.product-purchase-price');
                    
                    if (productSelect.value && qtyInput.value && sellingPriceInput.value) {
                        const productId = parseInt(productSelect.value);
                        const qty = parseInt(qtyInput.value);
                        const sellingPrice = parseFloat(sellingPriceInput.value);
                        const purchasePrice = parseFloat(purchasePriceInput.value) || 0;
                        
                        // Get product name from option
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
                });
            });
            
            return orderItems;
        }
    },

    // ===== DATABASE OPERATIONS (preserving original functions) =====
    database: {
        // Add order (preserved from original)
        async add(orderData) {
            try {
                const db = await OrderModule.utils.waitForDB();
                if (!db) {
                    throw new Error('Không thể kết nối đến cơ sở dữ liệu');
                }

                const tx = db.transaction('orders', 'readwrite');
                const store = tx.objectStore('orders');
                
                let result;
                
                if (orderData.id) {
                    // Update existing order
                    const existingOrder = await store.get(orderData.id);
                    if (!existingOrder) {
                        throw new Error('Không tìm thấy đơn hàng để cập nhật');
                    }
                    
                    // Keep some old information
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
                    console.log('✅ Updated order with ID:', result);
                } else {
                    // Add new order
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
                    console.log('✅ Added new order with ID:', result);
                }
                
                await tx.done;
                return result;
            } catch (error) {
                console.error('❌ Error processing order:', error);
                throw error;
            }
        },

        // Delete order (preserved from original)
        async delete(orderId) {
            try {
                const db = await OrderModule.utils.waitForDB();
                if (!db) {
                    throw new Error('Không thể kết nối đến cơ sở dữ liệu');
                }

                const tx = db.transaction('orders', 'readwrite');
                const store = tx.objectStore('orders');

                await store.delete(orderId);
                await tx.done;

                console.log('✅ Deleted order with ID:', orderId);
                return true;
            } catch (error) {
                console.error('❌ Error deleting order:', error);
                throw error;
            }
        },

        // Get single order
        async get(orderId) {
            try {
                const db = await OrderModule.utils.waitForDB();
                if (!db) return null;

                const tx = db.transaction('orders', 'readonly');
                const store = tx.objectStore('orders');
                return await store.get(orderId);
            } catch (error) {
                console.error('❌ Error getting order:', error);
                return null;
            }
        },

        // Load all orders
        async loadAll() {
            try {
                const db = await OrderModule.utils.waitForDB();
                if (!db) return;

                const tx = db.transaction(['orders', 'customers'], 'readonly');
                const orderStore = tx.objectStore('orders');
                const customerStore = tx.objectStore('customers');
                
                const orders = await orderStore.getAll();
                const customers = await customerStore.getAll();
                
                // Enrich orders with customer information
                const enrichedOrders = [];
                for (const order of orders) {
                    const customer = customers.find(c => c.id === order.customerId);
                    enrichedOrders.push({
                        ...order,
                        customerName: customer ? customer.name : 'Không xác định',
                        customerContact: customer ? customer.contact : ''
                    });
                }
                
                OrderModule.data.currentOrders = enrichedOrders;
                OrderModule.data.filteredOrders = [...enrichedOrders];
                OrderModule.data.currentCustomers = customers;
                
                console.log(`📊 Loaded ${OrderModule.data.currentOrders.length} orders`);
            } catch (error) {
                console.error('❌ Error loading orders:', error);
                OrderModule.data.currentOrders = [];
                OrderModule.data.filteredOrders = [];
            }
        },

        // Load related data
        async loadRelatedData() {
            try {
                const db = await OrderModule.utils.waitForDB();
                if (!db) return;

                const tx = db.transaction(['customers', 'suppliers', 'products'], 'readonly');
                const customerStore = tx.objectStore('customers');
                const supplierStore = tx.objectStore('suppliers');
                const productStore = tx.objectStore('products');
                
                OrderModule.data.currentCustomers = await customerStore.getAll();
                OrderModule.data.currentSuppliers = await supplierStore.getAll();
                OrderModule.data.currentProducts = await productStore.getAll();
                
                console.log('📊 Loaded related data for orders');
            } catch (error) {
                console.error('❌ Error loading related data:', error);
            }
        }
    },

    // ===== PRESERVED BUSINESS LOGIC FUNCTIONS =====
    businessLogic: {
        // Populate supplier dropdowns (preserved from original)
        async populateSupplierDropdowns() {
            try {
                const db = await OrderModule.utils.waitForDB();
                if (!db) return;
                
                const supplierSelects = document.querySelectorAll('.supplier-select');
                if (supplierSelects.length === 0) return;
                
                const tx = db.transaction('suppliers', 'readonly');
                const store = tx.objectStore('suppliers');
                const suppliers = await store.getAll();
                
                supplierSelects.forEach(select => {
                    const selectedValue = select.value;
                    
                    // Clear all options except first
                    while (select.options.length > 1) {
                        select.remove(1);
                    }
                    
                    // Add suppliers
                    suppliers.forEach(supplier => {
                        const option = document.createElement('option');
                        option.value = supplier.id;
                        option.textContent = supplier.name;
                        select.appendChild(option);
                    });
                    
                    // Restore selected value
                    if (selectedValue) {
                        select.value = selectedValue;
                    }
                });
            } catch (error) {
                console.error('❌ Error populating supplier dropdowns:', error);
            }
        },

        // Update products by supplier (preserved from original)
        async updateProductsBySupplier(supplierSelect, supplierId) {
            try {
                const db = await OrderModule.utils.waitForDB();
                if (!db) return;
                
                const supplierGroup = supplierSelect.closest('.supplier-group');
                const productSelects = supplierGroup.querySelectorAll('.product-select');
                
                if (!supplierId) {
                    // Disable all product selects in this group
                    productSelects.forEach(productSelect => {
                        productSelect.disabled = true;
                        productSelect.innerHTML = '<option value="" selected disabled>Chọn nhà cung cấp trước</option>';
                        
                        const productItem = productSelect.closest('.product-item');
                        const purchasePriceInput = productItem.querySelector('.product-purchase-price');
                        const sellingPriceInput = productItem.querySelector('.product-selling-price');
                        purchasePriceInput.value = '';
                        sellingPriceInput.value = '';
                        this.updateItemTotal(productItem);
                    });
                    return;
                }
                
                const tx = db.transaction('products', 'readonly');
                const store = tx.objectStore('products');
                const supplierIndex = store.index('supplierId');
                const products = await supplierIndex.getAll(parseInt(supplierId));
                
                // Update all product selects in this group
                productSelects.forEach(productSelect => {
                    const selectedValue = productSelect.value;
                    
                    // Clear options
                    productSelect.innerHTML = '';
                    
                    // Add default option
                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = products.length > 0 ? 'Chọn sản phẩm' : 'Không có sản phẩm';
                    defaultOption.selected = true;
                    defaultOption.disabled = true;
                    productSelect.appendChild(defaultOption);
                    
                    // Add products
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
                    
                    // Restore selected value if exists
                    if (selectedValue && products.find(p => p.id == selectedValue)) {
                        productSelect.value = selectedValue;
                        // Trigger change event to update price
                        productSelect.dispatchEvent(new Event('change'));
                    } else {
                        // Reset prices if no product selected
                        const productItem = productSelect.closest('.product-item');
                        const purchasePriceInput = productItem.querySelector('.product-purchase-price');
                        const sellingPriceInput = productItem.querySelector('.product-selling-price');
                        purchasePriceInput.value = '';
                        sellingPriceInput.value = '';
                        this.updateItemTotal(productItem);
                    }
                });
                
            } catch (error) {
                console.error('❌ Error updating products by supplier:', error);
            }
        },

        // Update product price (preserved from original)
        updateProductPrice(productSelect) {
            const productItem = productSelect.closest('.product-item');
            const purchasePriceInput = productItem.querySelector('.product-purchase-price');
            const sellingPriceInput = productItem.querySelector('.product-selling-price');
            
            const selectedOption = productSelect.options[productSelect.selectedIndex];
            if (selectedOption && selectedOption.dataset.purchasePrice) {
                const purchasePrice = parseFloat(selectedOption.dataset.purchasePrice);
                purchasePriceInput.value = purchasePrice;
                
                // Suggest selling price (110% of purchase price)
                if (!sellingPriceInput.value || parseFloat(sellingPriceInput.value) === 0) {
                    sellingPriceInput.value = Math.round(purchasePrice * 1.1);
                }
            } else {
                purchasePriceInput.value = '';
                sellingPriceInput.value = '';
            }
            
            this.updateItemTotal(productItem);
        },

        // Update item total (preserved from original)
        updateItemTotal(productItem) {
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
            
            itemTotalSpan.textContent = OrderModule.utils.formatCurrency(itemTotal);
            
            if (purchasePrice > 0) {
                profitInfoSpan.textContent = `(Lợi nhuận: ${OrderModule.utils.formatCurrency(itemProfit)})`;
                profitInfoSpan.className = itemProfit >= 0 ? 'profit-info ms-3 text-success' : 'profit-info ms-3 text-danger';
            } else {
                profitInfoSpan.textContent = '';
            }
            
            this.updateOrderTotal();
        },

        // Update order total (preserved from original)
        updateOrderTotal() {
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
            
            if (orderTotalSpan) orderTotalSpan.textContent = OrderModule.utils.formatCurrency(totalAmount);
            if (orderProfitSpan) {
                orderProfitSpan.textContent = OrderModule.utils.formatCurrency(totalProfit);
                orderProfitSpan.className = totalProfit >= 0 ? 'fw-bold text-success' : 'fw-bold text-danger';
            }
        },

        // Add supplier group (preserved from original)
        addSupplierGroup() {
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
            
            // Setup event listeners for new supplier group
            OrderModule.businessLogic.setupSupplierGroupEventListeners(newSupplierGroup);
            
            // Populate supplier dropdown
            OrderModule.businessLogic.populateSupplierDropdowns();
            
            // Update remove buttons visibility
            OrderModule.businessLogic.updateRemoveSupplierButtonsVisibility();
            OrderModule.businessLogic.updateSupplierNumbers();
        },

        // Add product to supplier (preserved from original)
        addProductToSupplier(supplierGroup) {
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
            
            // Setup event listeners for new product item
            OrderModule.businessLogic.setupProductItemEventListeners(newProductItem);
            
            // Update products if supplier is selected
            const supplierSelect = supplierGroup.querySelector('.supplier-select');
            if (supplierSelect.value) {
                OrderModule.businessLogic.updateProductsBySupplier(supplierSelect, supplierSelect.value);
            }
            
            // Update remove buttons visibility
            OrderModule.businessLogic.updateRemoveProductButtonsVisibility(supplierGroup);
            OrderModule.businessLogic.updateProductNumbers(supplierGroup);
        },

        // Update supplier numbers (preserved from original)
        updateSupplierNumbers() {
            const supplierGroups = document.querySelectorAll('.supplier-group');
            supplierGroups.forEach((group, index) => {
                const label = group.querySelector('.text-primary');
                if (label) {
                    label.textContent = `Nhà cung cấp #${index + 1}`;
                }
            });
        },

        // Update product numbers (preserved from original)
        updateProductNumbers(supplierGroup) {
            const productItems = supplierGroup.querySelectorAll('.product-item');
            productItems.forEach((item, index) => {
                const label = item.querySelector('.fw-bold');
                if (label) {
                    label.textContent = `Sản phẩm #${index + 1}`;
                }
            });
        },

        // Update remove supplier buttons visibility (preserved from original)
        updateRemoveSupplierButtonsVisibility() {
            const supplierGroups = document.querySelectorAll('.supplier-group');
            supplierGroups.forEach(group => {
                const removeBtn = group.querySelector('.remove-supplier-btn');
                if (removeBtn) {
                    removeBtn.style.display = supplierGroups.length > 1 ? 'inline-block' : 'none';
                }
            });
        },

        // Update remove product buttons visibility (preserved from original)
        updateRemoveProductButtonsVisibility(supplierGroup) {
            const productItems = supplierGroup.querySelectorAll('.product-item');
            productItems.forEach(item => {
                const removeBtn = item.querySelector('.remove-product-btn');
                if (removeBtn) {
                    removeBtn.style.display = productItems.length > 1 ? 'inline-block' : 'none';
                }
            });
        },

        // Setup supplier group event listeners (preserved from original)
        setupSupplierGroupEventListeners(supplierGroup) {
            // Event for supplier dropdown
            const supplierSelect = supplierGroup.querySelector('.supplier-select');
            if (supplierSelect) {
                supplierSelect.addEventListener('change', function() {
                    OrderModule.businessLogic.updateProductsBySupplier(this, this.value);
                });
            }
            
            // Event for remove supplier button
            const removeSupplierBtn = supplierGroup.querySelector('.remove-supplier-btn');
            if (removeSupplierBtn) {
                removeSupplierBtn.addEventListener('click', function() {
                    const suppliers = document.querySelectorAll('.supplier-group');
                    if (suppliers.length > 1) {
                        supplierGroup.remove();
                        OrderModule.businessLogic.updateSupplierNumbers();
                        OrderModule.businessLogic.updateRemoveSupplierButtonsVisibility();
                        OrderModule.businessLogic.updateOrderTotal();
                    }
                });
            }
            
            // Event for add product button
            const addProductBtn = supplierGroup.querySelector('.add-product-to-supplier-btn');
            if (addProductBtn) {
                addProductBtn.addEventListener('click', function() {
                    OrderModule.businessLogic.addProductToSupplier(supplierGroup);
                });
            }
            
            // Setup event listeners for all product items in supplier
            const productItems = supplierGroup.querySelectorAll('.product-item');
            productItems.forEach(productItem => {
                OrderModule.businessLogic.setupProductItemEventListeners(productItem);
            });
        },

        // Setup product item event listeners (preserved from original)
        setupProductItemEventListeners(productItem) {
            // Event for product dropdown
            const productSelect = productItem.querySelector('.product-select');
            if (productSelect && !productSelect.hasAttribute('data-event-added')) {
                productSelect.setAttribute('data-event-added', 'true');
                productSelect.addEventListener('change', function() {
                    OrderModule.businessLogic.updateProductPrice(this);
                });
            }
            
            // Event for quantity input
            const qtyInput = productItem.querySelector('.product-qty');
            if (qtyInput && !qtyInput.hasAttribute('data-event-added')) {
                qtyInput.setAttribute('data-event-added', 'true');
                qtyInput.addEventListener('input', function() {
                    OrderModule.businessLogic.updateItemTotal(productItem);
                });
            }
            
            // Event for selling price input
            const sellingPriceInput = productItem.querySelector('.product-selling-price');
            if (sellingPriceInput && !sellingPriceInput.hasAttribute('data-event-added')) {
                sellingPriceInput.setAttribute('data-event-added', 'true');
                sellingPriceInput.addEventListener('input', function() {
                    OrderModule.businessLogic.updateItemTotal(productItem);
                });
            }
            
            // Event for remove product button
            const removeProductBtn = productItem.querySelector('.remove-product-btn');
            if (removeProductBtn && !removeProductBtn.hasAttribute('data-event-added')) {
                removeProductBtn.setAttribute('data-event-added', 'true');
                removeProductBtn.addEventListener('click', function() {
                    const supplierGroup = productItem.closest('.supplier-group');
                    const productItems = supplierGroup.querySelectorAll('.product-item');
                    
                    if (productItems.length > 1) {
                        productItem.remove();
                        OrderModule.businessLogic.updateProductNumbers(supplierGroup);
                        OrderModule.businessLogic.updateRemoveProductButtonsVisibility(supplierGroup);
                        OrderModule.businessLogic.updateOrderTotal();
                    }
                });
            }
        },

        // Populate customer dropdown
        async populateCustomerDropdown() {
            const customerSelect = document.getElementById('order-customer');
            if (!customerSelect) return;

            try {
                // Load fresh customer data from database
                const db = await OrderModule.utils.waitForDB();
                if (db) {
                    const customers = await db.getAll('customers');
                    const currentValue = customerSelect.value;
                    
                    // Clear options except first
                    while (customerSelect.options.length > 1) {
                        customerSelect.remove(1);
                    }
                    
                    // Add customers
                    customers.forEach(customer => {
                        const option = document.createElement('option');
                        option.value = customer.id;
                        option.textContent = customer.name;
                        customerSelect.appendChild(option);
                    });
                    
                    // Restore selected value
                    if (currentValue) {
                        customerSelect.value = currentValue;
                    }
                    
                    console.log('✅ Order customer dropdown updated with fresh data');
                }
            } catch (error) {
                console.error('❌ Error updating order customer dropdown:', error);
            }
        }
    },

    // ===== UI COMPONENTS =====
    ui: {
        // Update orders count
        updateCount() {
            const countElement = document.getElementById('orders-count');
            if (countElement) {
                countElement.textContent = OrderModule.data.filteredOrders.length;
            }
        },

        // Update customer filter options
        updateCustomerFilter() {
            const customerFilter = document.getElementById('customer-filter');
            if (!customerFilter) return;

            const customers = [...new Set(OrderModule.data.currentOrders
                .map(o => o.customerName)
                .filter(name => name && name.trim() && name !== 'Không xác định')
            )].sort();

            const currentValue = customerFilter.value;
            customerFilter.innerHTML = '<option value="">Tất cả khách hàng</option>';
            
            customers.forEach(customerName => {
                const option = document.createElement('option');
                option.value = customerName;
                option.textContent = customerName;
                customerFilter.appendChild(option);
            });

            customerFilter.value = currentValue;
        },

        // Render desktop table
        renderDesktopTable() {
            const tableBody = document.getElementById('orders-list');
            if (!tableBody) return;

            // Sửa header bảng desktop cho giống supplier.js/product.js
            const table = tableBody.closest('table');
            if (table) {
                const thead = table.querySelector('thead');
                if (thead) {
                    thead.innerHTML = `
                        <tr class="align-middle table-primary">
                            <th class="text-center" scope="col" style="width: 80px;"><i class="bi bi-hash"></i></th>
                            <th scope="col"><i class="bi bi-person me-2"></i>Khách hàng</th>
                            <th scope="col"><i class="bi bi-building me-2"></i>Nhà cung cấp</th>
                            <th class="text-center" scope="col" style="width: 120px;"><i class="bi bi-calendar me-2"></i>Ngày đặt</th>
                            <th class="text-center" scope="col" style="width: 120px;"><i class="bi bi-flag me-2"></i>Trạng thái</th>
                            <th class="text-end" scope="col" style="width: 140px;"><i class="bi bi-currency-dollar me-2"></i>Tổng tiền</th>
                            <th class="text-center" scope="col" style="width: 180px;"><i class="bi bi-gear me-2"></i>Thao tác</th>
                        </tr>
                    `;
                }
            }

            tableBody.innerHTML = '';

            OrderModule.data.filteredOrders.forEach(order => {
                // Calculate total amount
                let totalAmount = order.totalAmount || 0;
                if (!totalAmount && order.items && order.items.length > 0) {
                    totalAmount = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                }

                // Create suppliers info
                let suppliersInfo = 'Không có';
                if (order.items && order.items.length > 0) {
                    const uniqueSuppliers = [...new Set(order.items.map(item => item.supplierName || 'Không xác định'))];
                    suppliersInfo = uniqueSuppliers.length > 2 
                        ? `${uniqueSuppliers.slice(0, 2).join(', ')} +${uniqueSuppliers.length - 2} khác`
                        : uniqueSuppliers.join(', ');
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="text-center fw-bold">${order.id}</td>
                    <td class="text-start">
                        <div class="fw-bold text-primary">${OrderModule.utils.safeValue(order.customerName)}</div>
                        ${order.customerContact ? `<small class="text-muted">${order.customerContact}</small>` : ''}
                    </td>
                    <td class="text-start">
                        <small class="text-muted">${suppliersInfo}</small>
                    </td>
                    <td class="text-center">
                        <small>${OrderModule.utils.formatDate(order.orderDate)}</small>
                    </td>
                    <td class="text-center">
                        <span class="badge ${OrderModule.utils.getStatusBadgeClass(order.status)}">${order.status}</span>
                    </td>
                    <td class="text-end fw-bold">
                        ${OrderModule.utils.formatCurrency(totalAmount)}
                    </td>
                    <td class="text-center">
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-info view-order-btn" data-id="${order.id}">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary" onclick="OrderModule.actions.edit(${order.id})">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="OrderModule.actions.confirmDelete(${order.id})">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        },

        // Render mobile cards
        renderMobileCards() {
            const mobileContainer = document.getElementById('orders-mobile-list');
            if (!mobileContainer) return;

            mobileContainer.innerHTML = '';

            OrderModule.data.filteredOrders.forEach(order => {
                // Calculate total amount
                let totalAmount = order.totalAmount || 0;
                if (!totalAmount && order.items && order.items.length > 0) {
                    totalAmount = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                }

                // Create suppliers info
                let suppliersInfo = 'Không có';
                if (order.items && order.items.length > 0) {
                    const uniqueSuppliers = [...new Set(order.items.map(item => item.supplierName || 'Không xác định'))];
                    suppliersInfo = uniqueSuppliers.length > 2 
                        ? `${uniqueSuppliers.slice(0, 2).join(', ')} +${uniqueSuppliers.length - 2} khác`
                        : uniqueSuppliers.join(', ');
                }

                const card = document.createElement('div');
                card.className = 'card mb-3 border-0 shadow-sm';
                card.innerHTML = `
                    <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <div class="fw-bold">
                            <i class="bi bi-receipt me-2"></i>${OrderModule.utils.safeValue(order.customerName)}
                        </div>
                        <span class="badge bg-light text-dark">#${order.id}</span>
                    </div>
                    <div class="card-body">
                        <div class="row g-2 mb-3">
                            <div class="col-12">
                                <div class="d-flex align-items-center justify-content-between">
                                    <div class="d-flex align-items-center">
                                        <i class="bi bi-calendar text-secondary me-2"></i>
                                        <span class="text-muted">Ngày đặt:</span>
                                    </div>
                                    <span class="fw-bold">${OrderModule.utils.formatDate(order.orderDate)}</span>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="d-flex align-items-center justify-content-between">
                                    <div class="d-flex align-items-center">
                                        <i class="bi bi-flag text-secondary me-2"></i>
                                        <span class="text-muted">Trạng thái:</span>
                                    </div>
                                    <span class="badge ${OrderModule.utils.getStatusBadgeClass(order.status)}">${order.status}</span>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="d-flex align-items-center justify-content-between">
                                    <div class="d-flex align-items-center">
                                        <i class="bi bi-currency-dollar text-success me-2"></i>
                                        <span class="text-muted">Tổng tiền:</span>
                                    </div>
                                    <span class="fw-bold text-primary">${OrderModule.utils.formatCurrency(totalAmount)}</span>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="d-flex align-items-start">
                                    <i class="bi bi-building text-info me-2 mt-1"></i>
                                    <div>
                                        <span class="text-muted">NCC:</span>
                                        <div class="small">${suppliersInfo}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                            <button class="btn btn-outline-info btn-sm view-order-btn" data-id="${order.id}">
                                <i class="bi bi-eye me-1"></i>Chi tiết
                            </button>
                            <button class="btn btn-outline-primary btn-sm" onclick="OrderModule.actions.edit(${order.id})">
                                <i class="bi bi-pencil me-1"></i>Sửa
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="OrderModule.actions.confirmDelete(${order.id})">
                                <i class="bi bi-trash me-1"></i>Xóa
                            </button>
                        </div>
                    </div>
                `;
                mobileContainer.appendChild(card);
            });
        },

        // Show/hide no data messages
        toggleNoDataMessages() {
            const noOrdersMessage = document.getElementById('no-orders-message');
            const noSearchResults = document.getElementById('no-order-search-results');
            const searchInput = document.getElementById('order-search');
            const statusFilter = document.getElementById('order-status-filter');
            const customerFilter = document.getElementById('customer-filter');

            const hasData = OrderModule.data.filteredOrders.length > 0;
            const hasSearchTerm = (searchInput && searchInput.value.trim()) || 
                                 (statusFilter && statusFilter.value) ||
                                 (customerFilter && customerFilter.value);

            if (noOrdersMessage) {
                noOrdersMessage.style.display = !hasData && !hasSearchTerm ? 'block' : 'none';
            }

            if (noSearchResults) {
                noSearchResults.style.display = !hasData && hasSearchTerm ? 'block' : 'none';
            }
        },

        // Main render function
        async render() {
            this.updateCount();
            this.updateCustomerFilter();
            this.renderDesktopTable();
            this.renderMobileCards();
            this.toggleNoDataMessages();
        },

        // Show success message
        showSuccess(message) {
            // Create toast notification
            const toastContainer = document.getElementById('toast-container') || this.createToastContainer();
            
            const toast = document.createElement('div');
            toast.className = 'toast show align-items-center text-white bg-success border-0';
            toast.setAttribute('role', 'alert');
            toast.innerHTML = `
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi bi-check-circle me-2"></i>${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            `;
            
            toastContainer.appendChild(toast);
            
            // Auto remove after 3 seconds
            setTimeout(() => {
                toast.remove();
            }, 3000);
        },

        // Create toast container if not exists
        createToastContainer() {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
            return container;
        },

        // Show validation errors
        showErrors(errors) {
            const existingModal = document.getElementById('validationErrorModal');
            if (existingModal) {
                existingModal.remove();
            }

            const modalHTML = `
                <div class="modal fade" id="validationErrorModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content border-0 shadow-lg">
                            <div class="modal-header bg-danger text-white border-0">
                                <h5 class="modal-title">
                                    <i class="bi bi-exclamation-triangle-fill me-2"></i>Lỗi nhập liệu
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body py-4">
                                <div class="text-center mb-3">
                                    <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
                                </div>
                                <h6 class="text-center mb-3">Vui lòng kiểm tra lại thông tin:</h6>
                                <ul class="list-unstyled">
                                    ${errors.map(error => `<li class="mb-2"><i class="bi bi-x-circle text-danger me-2"></i>${error}</li>`).join('')}
                                </ul>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            const modal = new bootstrap.Modal(document.getElementById('validationErrorModal'));
            modal.show();
            
            document.getElementById('validationErrorModal').addEventListener('hidden.bs.modal', function () {
                this.remove();
            });
        }
    },

    // ===== FORM HANDLING =====
    form: {
        // Reset form to add mode
        resetToAdd() {
            const form = document.getElementById('order-form');
            const modalTitle = document.getElementById('orderModalLabel');
            const submitButton = document.getElementById('order-submit-btn');
            
            if (form) {
                form.reset();
                form.removeAttribute('data-edit-id');
                
                // Reset to single supplier group
                const supplierContainer = document.getElementById('order-suppliers');
                if (supplierContainer) {
                    supplierContainer.innerHTML = `
                        <div class="supplier-group mb-4 p-3 border rounded bg-light">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <label class="form-label mb-0 fw-bold text-primary">Nhà cung cấp #1</label>
                                <button type="button" class="btn btn-sm btn-outline-danger remove-supplier-btn" style="display: none;">
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
                        </div>
                    `;
                    
                    // Setup event listeners for the new supplier group
                    const supplierGroup = supplierContainer.querySelector('.supplier-group');
                    if (supplierGroup) {
                        OrderModule.businessLogic.setupSupplierGroupEventListeners(supplierGroup);
                    }
                }
            }
            
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="bi bi-receipt me-2"></i>Tạo đơn hàng mới';
            }
            
            if (submitButton) {
                submitButton.textContent = 'Lưu đơn hàng';
            }

            // Reset totals
            const orderTotal = document.getElementById('order-total');
            const orderProfit = document.getElementById('order-profit');
            if (orderTotal) orderTotal.textContent = '0 VNĐ';
            if (orderProfit) orderProfit.textContent = '0 VNĐ';
        },

        // Setup for edit mode (preserved from original editOrder function)
        async setupEdit(order) {
            const form = document.getElementById('order-form');
            const modalTitle = document.getElementById('orderModalLabel');
            const submitButton = document.getElementById('order-submit-btn');
            
            if (form) {
                form.setAttribute('data-edit-id', order.id);
                
                // Set customer
                document.getElementById('order-customer').value = order.customerId;

                // Reset form first
                const supplierContainer = document.getElementById('order-suppliers');
                supplierContainer.innerHTML = '';

                // Create supplier groups from order data
                const supplierGroups = {};
                
                // Group items by supplier
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

                // Create UI for each supplier group
                let supplierIndex = 0;
                for (const [supplierId, groupData] of Object.entries(supplierGroups)) {
                    // Add supplier group
                    OrderModule.businessLogic.addSupplierGroup();
                    
                    const supplierGroupElements = document.querySelectorAll('.supplier-group');
                    const currentSupplierGroup = supplierGroupElements[supplierGroupElements.length - 1];
                    
                    // Set supplier FIRST and populate all dropdowns
                    await OrderModule.businessLogic.populateSupplierDropdowns();
                    const supplierSelect = currentSupplierGroup.querySelector('.supplier-select');
                    supplierSelect.value = supplierId;
                    
                    // Trigger change to load products and wait for completion
                    await OrderModule.businessLogic.updateProductsBySupplier(supplierSelect, supplierId);
                    
                    // Wait a bit more for products to load
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // Remove default product item
                    const defaultProductItem = currentSupplierGroup.querySelector('.product-item');
                    if (defaultProductItem) {
                        defaultProductItem.remove();
                    }
                    
                    // Add products for this supplier
                    for (let i = 0; i < groupData.items.length; i++) {
                        const item = groupData.items[i];
                        
                        // Add product item
                        OrderModule.businessLogic.addProductToSupplier(currentSupplierGroup);
                        
                        // Wait for DOM to be ready
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        const productItems = currentSupplierGroup.querySelectorAll('.product-item');
                        const currentProductItem = productItems[productItems.length - 1];
                        
                        // Get DOM elements
                        const productSelect = currentProductItem.querySelector('.product-select');
                        const qtyInput = currentProductItem.querySelector('.product-qty');
                        const sellingPriceInput = currentProductItem.querySelector('.product-selling-price');
                        const purchasePriceInput = currentProductItem.querySelector('.product-purchase-price');
                        
                        if (productSelect && qtyInput && sellingPriceInput && purchasePriceInput) {
                            // Set product first
                            productSelect.value = item.productId;
                            
                            // Trigger change event to update price
                            const changeEvent = new Event('change');
                            productSelect.dispatchEvent(changeEvent);
                            
                            // Wait for price to update
                            await new Promise(resolve => setTimeout(resolve, 50));
                            
                            // Set other values
                            qtyInput.value = item.qty;
                            sellingPriceInput.value = item.sellingPrice;
                            purchasePriceInput.value = item.purchasePrice;
                            
                            // Update total
                            OrderModule.businessLogic.updateItemTotal(currentProductItem);
                        }
                    }
                    
                    supplierIndex++;
                }
                
                // Update button visibility and numbers after all suppliers are loaded
                setTimeout(() => {
                    try {
                        OrderModule.businessLogic.updateRemoveSupplierButtonsVisibility();
                        OrderModule.businessLogic.updateSupplierNumbers();
                        
                        // Update remove buttons for all supplier groups
                        const supplierGroups = document.querySelectorAll('.supplier-group');
                        supplierGroups.forEach(group => {
                            OrderModule.businessLogic.updateRemoveProductButtonsVisibility(group);
                            OrderModule.businessLogic.updateProductNumbers(group);
                        });
                        
                        // Update totals - check if function exists first
                        if (typeof OrderModule.businessLogic.updateOrderTotal === 'function') {
                            OrderModule.businessLogic.updateOrderTotal();
                        } else {
                            console.warn('⚠️ updateOrderTotal function not found');
                        }
                        
                        console.log('✅ Order edit setup completed successfully');
                    } catch (error) {
                        console.error('❌ Error in setupEdit setTimeout:', error);
                    }
                }, 1000); // Increased timeout to ensure all async operations complete
            }
            
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="bi bi-pencil me-2"></i>Chỉnh sửa đơn hàng';
            }
            
            if (submitButton) {
                submitButton.textContent = 'Cập nhật đơn hàng';
            }
        }
    },

    // ===== FILTER SYSTEM =====
    filter: {
        // Apply filters
        apply() {
            const searchTerm = document.getElementById('order-search')?.value.toLowerCase().trim() || '';
            const statusFilter = document.getElementById('order-status-filter')?.value || '';
            const customerFilter = document.getElementById('customer-filter')?.value || '';

            OrderModule.data.filteredOrders = OrderModule.data.currentOrders.filter(order => {
                const matchesSearch = !searchTerm || 
                    order.customerName.toLowerCase().includes(searchTerm) ||
                    (order.customerContact && order.customerContact.toLowerCase().includes(searchTerm)) ||
                    (order.items && order.items.some(item => 
                        item.supplierName.toLowerCase().includes(searchTerm) ||
                        item.productName.toLowerCase().includes(searchTerm)
                    ));

                const matchesStatus = !statusFilter || order.status === statusFilter;
                const matchesCustomer = !customerFilter || order.customerName === customerFilter;

                return matchesSearch && matchesStatus && matchesCustomer;
            });

            OrderModule.ui.render();
        }
    },

    // ===== USER ACTIONS =====
    actions: {
        // Add order
        async add() {
            // Validate form
            const validation = OrderModule.validation.validateOrderForm();
            if (!validation.valid) {
                OrderModule.ui.showErrors(validation.errors);
                return;
            }

            try {
                const customerId = parseInt(document.getElementById('order-customer').value);
                const orderItems = OrderModule.validation.collectOrderItems();
                
                // Calculate totals
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
                
                const id = await OrderModule.database.add(orderData);
                if (id) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('orderModal'));
                    if (modal) {
                        modal.hide();
                    }

                    // Reload and refresh
                    await OrderModule.database.loadAll();
                    await OrderModule.refresh();
                    OrderModule.ui.showSuccess('Tạo đơn hàng thành công!');
                }
            } catch (error) {
                OrderModule.ui.showErrors([`Có lỗi xảy ra: ${error.message}`]);
            }
        },

        // Edit order
        async edit(orderId) {
            try {
                const order = await OrderModule.database.get(orderId);
                if (!order) {
                    OrderModule.ui.showErrors(['Không tìm thấy thông tin đơn hàng!']);
                    return;
                }

                // Check if order can be edited
                if (order.status === 'Đã giao' || order.deliveredTripId) {
                    OrderModule.ui.showErrors(['Không thể sửa đơn hàng đã giao!']);
                    return;
                }

                // Setup edit mode
                await OrderModule.form.setupEdit(order);
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('orderModal'));
                modal.show();
            } catch (error) {
                OrderModule.ui.showErrors([`Có lỗi xảy ra: ${error.message}`]);
            }
        },

        // Update order
        async update() {
            const form = document.getElementById('order-form');
            const editId = parseInt(form.getAttribute('data-edit-id'));
            
            // Validate form
            const validation = OrderModule.validation.validateOrderForm();
            if (!validation.valid) {
                OrderModule.ui.showErrors(validation.errors);
                return;
            }

            try {
                const customerId = parseInt(document.getElementById('order-customer').value);
                const orderItems = OrderModule.validation.collectOrderItems();
                
                // Calculate totals
                const totalAmount = orderItems.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                const totalProfit = orderItems.reduce((sum, item) => sum + (item.qty * (item.sellingPrice - item.purchasePrice)), 0);
                
                const orderData = {
                    id: editId,
                    customerId,
                    items: orderItems,
                    totalAmount,
                    totalProfit
                };
                
                const success = await OrderModule.database.add(orderData);
                if (success) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('orderModal'));
                    if (modal) {
                        modal.hide();
                    }

                    // Reload and refresh
                    await OrderModule.database.loadAll();
                    await OrderModule.refresh();
                    OrderModule.ui.showSuccess('Cập nhật đơn hàng thành công!');
                }
            } catch (error) {
                OrderModule.ui.showErrors([`Có lỗi xảy ra: ${error.message}`]);
            }
        },

        // Confirm delete
        confirmDelete(orderId) {
            const order = OrderModule.data.currentOrders.find(o => o.id === orderId);
            if (!order) return;

            OrderModule.data.orderToDelete = order;

            // Update delete modal content
            const infoElement = document.getElementById('delete-order-info');
            const detailsElement = document.getElementById('delete-order-details');

            if (infoElement) infoElement.textContent = `Đơn hàng #${order.id} - ${order.customerName}`;
            if (detailsElement) {
                const totalAmount = order.totalAmount || 0;
                detailsElement.textContent = `${OrderModule.utils.formatDate(order.orderDate)} • ${OrderModule.utils.formatCurrency(totalAmount)}`;
            }

            // Show delete modal
            const deleteModal = new bootstrap.Modal(document.getElementById('deleteOrderModal'));
            deleteModal.show();
        },

        // Delete order
        async delete() {
            const order = OrderModule.data.orderToDelete;
            if (!order) return;

            try {
                const success = await OrderModule.database.delete(order.id);
                if (success) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteOrderModal'));
                    if (modal) {
                        modal.hide();
                    }

                    // Reload and refresh
                    await OrderModule.database.loadAll();
                    await OrderModule.refresh();
                    OrderModule.ui.showSuccess('Xóa đơn hàng thành công!');
                }
            } catch (error) {
                OrderModule.ui.showErrors([`Có lỗi xảy ra khi xóa: ${error.message}`]);
            } finally {
                OrderModule.data.orderToDelete = null;
            }
        },

        // Handle form submit
        async handleFormSubmit(event) {
            event.preventDefault();
            
            const form = document.getElementById('order-form');
            const submitButton = document.getElementById('order-submit-btn');
            
            // Prevent multiple submissions
            if (submitButton.disabled) {
                console.log('⚠️ Form already submitting, skipping...');
                return;
            }

            // Disable submit button during processing
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Đang xử lý...';
            
            try {
                const editId = form.getAttribute('data-edit-id');
                
                if (editId) {
                    await this.update();
                } else {
                    await this.add();
                }
            } finally {
                // Re-enable submit button
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        },

        // Refresh data
        async refresh() {
            await OrderModule.database.loadAll();
            await OrderModule.database.loadRelatedData();
            OrderModule.filter.apply();
            
            // Update dropdowns with fresh data
            await OrderModule.businessLogic.populateCustomerDropdown();
            await OrderModule.businessLogic.populateSupplierDropdowns();
        },

        // Show order detail (preserved from original)
        async showOrderDetail(orderId) {
            try {
                const order = await OrderModule.database.get(orderId);
                if (!order) {
                    OrderModule.ui.showErrors(['Không tìm thấy đơn hàng!']);
                    return;
                }

                // Get customer info
                const customer = OrderModule.data.currentCustomers.find(c => c.id === order.customerId);
                const customerName = customer ? customer.name : 'Không xác định';

                // Calculate totals
                let totalAmount = order.totalAmount || 0;
                let totalProfit = order.totalProfit || 0;
                
                if (!totalAmount && order.items && order.items.length > 0) {
                    totalAmount = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                    totalProfit = order.items.reduce((sum, item) => sum + (item.qty * ((item.sellingPrice || 0) - (item.purchasePrice || 0))), 0);
                }

                // Create detail content
                const orderDetailContent = document.getElementById('order-detail-content');
                if (!orderDetailContent) return;

                orderDetailContent.innerHTML = `
                    <div class="mb-3">
                        <h6>Thông tin đơn hàng #${order.id}</h6>
                        <p><strong>Khách hàng:</strong> ${customerName}</p>
                        <p><strong>Ngày đặt:</strong> ${OrderModule.utils.formatDate(order.orderDate)}</p>
                        <p><strong>Hạn thanh toán:</strong> ${order.dueDate ? OrderModule.utils.formatDate(order.dueDate) : 'Không có'}</p>
                        <p><strong>Trạng thái đơn hàng:</strong> <span class="badge ${OrderModule.utils.getStatusBadgeClass(order.status)}">${order.status}</span></p>
                        <p><strong>Trạng thái thanh toán:</strong> <span class="badge ${order.paymentStatus === 'Đã thanh toán đủ' ? 'bg-success' : 'bg-warning'}">${order.paymentStatus || 'Chưa thanh toán'}</span></p>
                        <p><strong>Tổng tiền:</strong> <span class="fw-bold text-primary">${OrderModule.utils.formatCurrency(totalAmount)}</span></p>
                        <p><strong>Lợi nhuận dự kiến:</strong> <span class="fw-bold ${totalProfit >= 0 ? 'text-success' : 'text-danger'}">${OrderModule.utils.formatCurrency(totalProfit)}</span></p>
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
                                            <td class="text-end">${OrderModule.utils.formatCurrency(item.purchasePrice || 0)}</td>
                                            <td class="text-end"><strong>${OrderModule.utils.formatCurrency(item.sellingPrice)}</strong></td>
                                            <td class="text-end"><strong class="text-primary">${OrderModule.utils.formatCurrency(itemTotal)}</strong></td>
                                            <td class="text-end ${itemProfit >= 0 ? 'text-success' : 'text-danger'}"><strong>${OrderModule.utils.formatCurrency(itemProfit)}</strong></td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th colspan="5" class="text-end">Tổng cộng:</th>
                                        <th class="text-end">${OrderModule.utils.formatCurrency(totalAmount)}</th>
                                        <th class="text-end ${totalProfit >= 0 ? 'text-success' : 'text-danger'}">${OrderModule.utils.formatCurrency(totalProfit)}</th>
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

                // Show modal
                const modalElement = document.getElementById('orderDetailModal');
                if (modalElement) {
                    const orderDetailModal = new bootstrap.Modal(modalElement, {
                        backdrop: true,
                        keyboard: true
                    });
                    orderDetailModal.show();
                    
                    // Ensure modal is closed properly
                    modalElement.addEventListener('hidden.bs.modal', function () {
                        // Remove remaining backdrops
                        const backdrops = document.querySelectorAll('.modal-backdrop');
                        backdrops.forEach(backdrop => backdrop.remove());
                        
                        // Restore body
                        document.body.classList.remove('modal-open');
                        document.body.style.removeProperty('overflow');
                        document.body.style.removeProperty('padding-right');
                    }, { once: true });
                }

            } catch (error) {
                console.error('❌ Error showing order detail:', error);
                OrderModule.ui.showErrors(['Có lỗi xảy ra khi hiển thị chi tiết đơn hàng!']);
            }
        }
    },

    // ===== EVENT LISTENERS =====
    events: {
        // Track if events are already setup
        initialized: false,

        // Remove existing event listeners
        cleanup() {
            const addBtn = document.getElementById('add-order-btn');
            const refreshBtn = document.getElementById('refresh-orders-btn');
            const searchInput = document.getElementById('order-search');
            const statusFilter = document.getElementById('order-status-filter');
            const customerFilter = document.getElementById('customer-filter');
            const orderForm = document.getElementById('order-form');
            const confirmDeleteBtn = document.getElementById('confirm-delete-order');
            const addSupplierBtn = document.getElementById('add-order-supplier-btn');

            // Remove existing listeners
            if (addBtn) addBtn.replaceWith(addBtn.cloneNode(true));
            if (refreshBtn) refreshBtn.replaceWith(refreshBtn.cloneNode(true));
            if (searchInput) searchInput.replaceWith(searchInput.cloneNode(true));
            if (statusFilter) statusFilter.replaceWith(statusFilter.cloneNode(true));
            if (customerFilter) customerFilter.replaceWith(customerFilter.cloneNode(true));
            if (orderForm) orderForm.replaceWith(orderForm.cloneNode(true));
            if (confirmDeleteBtn) confirmDeleteBtn.replaceWith(confirmDeleteBtn.cloneNode(true));
            if (addSupplierBtn) addSupplierBtn.replaceWith(addSupplierBtn.cloneNode(true));
        },

        // Setup all event listeners
        setup() {
            // Prevent multiple initialization
            if (this.initialized) {
                console.log('⚠️ Order event listeners already initialized, skipping...');
                return;
            }

            // Cleanup any existing listeners
            this.cleanup();

            // Add order button
            const addBtn = document.getElementById('add-order-btn');
            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    OrderModule.utils.cleanupAllModals();
                    OrderModule.form.resetToAdd();
                    OrderModule.businessLogic.populateCustomerDropdown();
                    OrderModule.businessLogic.populateSupplierDropdowns();
                    
                    // Show modal
                    const modal = new bootstrap.Modal(document.getElementById('orderModal'));
                    modal.show();
                });
            }

            // Refresh button
            const refreshBtn = document.getElementById('refresh-orders-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', async () => {
                    await OrderModule.actions.refresh();
                    
                    // Loading animation
                    refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2 spin"></i>Đang tải...';
                    setTimeout(() => {
                        refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Làm mới';
                    }, 1000);
                });
            }

            // Search input
            const searchInput = document.getElementById('order-search');
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    OrderModule.filter.apply();
                });
            }

            // Status filter
            const statusFilter = document.getElementById('order-status-filter');
            if (statusFilter) {
                statusFilter.addEventListener('change', () => {
                    OrderModule.filter.apply();
                });
            }

            // Customer filter
            const customerFilter = document.getElementById('customer-filter');
            if (customerFilter) {
                customerFilter.addEventListener('change', () => {
                    OrderModule.filter.apply();
                });
            }

            // Form submit
            const orderForm = document.getElementById('order-form');
            if (orderForm) {
                orderForm.addEventListener('submit', (event) => {
                    OrderModule.actions.handleFormSubmit(event);
                });
            }

            // Delete confirmation
            const confirmDeleteBtn = document.getElementById('confirm-delete-order');
            if (confirmDeleteBtn) {
                confirmDeleteBtn.addEventListener('click', () => {
                    OrderModule.actions.delete();
                });
            }

            // Add supplier button
            const addSupplierBtn = document.getElementById('add-order-supplier-btn');
            if (addSupplierBtn) {
                addSupplierBtn.addEventListener('click', () => {
                    OrderModule.businessLogic.addSupplierGroup();
                });
            }

            // Modal events
            const orderModal = document.getElementById('orderModal');
            if (orderModal) {
                orderModal.addEventListener('show.bs.modal', () => {
                    setTimeout(() => {
                        const firstField = document.getElementById('order-customer');
                        if (firstField) firstField.focus();
                    }, 300);
                });
                
                orderModal.addEventListener('hidden.bs.modal', () => {
                    OrderModule.form.resetToAdd();
                    setTimeout(OrderModule.utils.cleanupAllModals, 100);
                });
            }

            const deleteModal = document.getElementById('deleteOrderModal');
            if (deleteModal) {
                deleteModal.addEventListener('hidden.bs.modal', () => {
                    OrderModule.data.orderToDelete = null;
                    setTimeout(OrderModule.utils.cleanupAllModals, 100);
                });
            }

            // Click events for view buttons
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('view-order-btn') || e.target.closest('.view-order-btn')) {
                    const btn = e.target.closest('.view-order-btn') || e.target;
                    const orderId = parseInt(btn.getAttribute('data-id'));
                    OrderModule.actions.showOrderDetail(orderId);
                }
            });

            // Mark as initialized
            this.initialized = true;
            console.log('✅ Order event listeners setup complete');
        }
    },

    // ===== PUBLIC API =====
    // Track initialization state
    isInitialized: false,

    // Initialize module
    async init() {
        try {
            // If module is already initialized, just refresh its data
            if (this.isInitialized) {
                console.log('🔄 Order module already loaded, refreshing data...');
                await this.actions.refresh();
                return true;
            }

            // Full initialization on first load
            console.log('🎯 Initializing Order Management Module...');
            
            this.utils.cleanupAllModals();
            
            const db = await this.utils.waitForDB();
            if (!db) {
                console.error('❌ Database not ready for order module');
                return false;
            }

            await this.database.loadAll();
            await this.database.loadRelatedData();
            
            this.events.setup();
            
            await this.ui.render();
            
            this.isInitialized = true;
            
            console.log('✅ Order Management Module initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Error initializing order module:', error);
            return false;
        }
    },

    // Refresh everything
    async refresh() {
        await this.database.loadAll();
        await this.database.loadRelatedData();
        this.filter.apply();
    }
};

// ===== LEGACY FUNCTIONS FOR BACKWARD COMPATIBILITY =====
// These functions maintain compatibility with existing code

// Preserved original functions
async function waitForDB() {
    return await OrderModule.utils.waitForDB();
}

async function populateSupplierDropdowns() {
    return await OrderModule.businessLogic.populateSupplierDropdowns();
}

async function updateProductsBySupplier(supplierSelect, supplierId) {
    return await OrderModule.businessLogic.updateProductsBySupplier(supplierSelect, supplierId);
}

function updateProductPrice(productSelect) {
    return OrderModule.businessLogic.updateProductPrice(productSelect);
}

function updateItemTotal(productItem) {
    return OrderModule.businessLogic.updateItemTotal(productItem);
}

function updateOrderTotal() {
    return OrderModule.businessLogic.updateOrderTotal();
}

function addSupplierGroup() {
    return OrderModule.businessLogic.addSupplierGroup();
}

function addProductToSupplier(supplierGroup) {
    return OrderModule.businessLogic.addProductToSupplier(supplierGroup);
}

function updateSupplierNumbers() {
    return OrderModule.businessLogic.updateSupplierNumbers();
}

function updateProductNumbers(supplierGroup) {
    return OrderModule.businessLogic.updateProductNumbers(supplierGroup);
}

function updateRemoveSupplierButtonsVisibility() {
    return OrderModule.businessLogic.updateRemoveSupplierButtonsVisibility();
}

function updateRemoveProductButtonsVisibility(supplierGroup) {
    return OrderModule.businessLogic.updateRemoveProductButtonsVisibility(supplierGroup);
}

function setupSupplierGroupEventListeners(supplierGroup) {
    return OrderModule.businessLogic.setupSupplierGroupEventListeners(supplierGroup);
}

function setupProductItemEventListeners(productItem) {
    return OrderModule.businessLogic.setupProductItemEventListeners(productItem);
}

async function addOrder(orderData) {
    return await OrderModule.database.add(orderData);
}

async function deleteOrder(orderId) {
    return await OrderModule.database.delete(orderId);
}

async function displayOrders() {
    await OrderModule.database.loadAll();
    await OrderModule.ui.render();
}

async function showOrderDetail(orderId) {
    return await OrderModule.actions.showOrderDetail(orderId);
}

async function editOrder(orderId) {
    return await OrderModule.actions.edit(orderId);
}

function getStatusBadgeClass(status) {
    return OrderModule.utils.getStatusBadgeClass(status);
}

function setupOrderEventListeners() {
    return OrderModule.events.setup();
}

// ===== MODULE INITIALIZATION =====
window.loadOrderModule = async function() {
    try {
        // Prevent multiple initialization
        if (window.orderModuleLoaded) {
            console.log('⚠️ Order module already loaded, skipping...');
            return true;
        }

        const success = await OrderModule.init();
        
        if (success) {
            // Register global functions for other modules
            window.populateOrderSupplierDropdowns = OrderModule.businessLogic.populateSupplierDropdowns;
            window.showOrderDetail = OrderModule.actions.showOrderDetail;
            
            // Export module globally for debugging
            window.OrderModule = OrderModule;
            
            // Mark as loaded globally
            window.orderModuleLoaded = true;
        
            console.log('🚀 Order Module ready and global functions registered');
        }
        
        return success;
    } catch (error) {
        console.error('❌ Failed to load order module:', error);
        return false;
    }
};

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.loadOrderModule);
} else {
    // DOM already loaded
    setTimeout(window.loadOrderModule, 100);
}
