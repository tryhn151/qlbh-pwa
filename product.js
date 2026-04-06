// ===== PRODUCT MANAGEMENT MODULE =====
// Complete product management with modern UI and validation
// Senior JS Developer: Modular approach for better maintainability

// ===== MODULE STRUCTURE =====
const ProductModule = {
    // Data storage
    data: {
        currentProducts: [],
        filteredProducts: [],
        currentSuppliers: [],
        productToDelete: null
    },

    // Configuration
    config: {
        validationRules: {
            name: {
                required: true,
                minLength: 2,
                maxLength: 100,
                pattern: /^[a-zA-ZàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s0-9\-\.()\/&]+$/,
                message: 'Tên sản phẩm phải từ 2-100 ký tự, chỉ chứa chữ cái, số và một số ký tự đặc biệt'
            },
            unit: {
                required: false,
                maxLength: 30,
                pattern: /^[a-zA-ZàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s0-9\/²³]+$/,
                message: 'Đơn vị tính không được quá 30 ký tự, chỉ chứa chữ cái, số và một số ký tự đặc biệt'
            },
            purchasePrice: {
                required: false,
                min: 0,
                message: 'Giá nhập phải là số và lớn hơn hoặc bằng 0'
            }
        },
        fieldDisplayNames: {
            name: 'Tên sản phẩm',
            unit: 'Đơn vị tính',
            purchasePrice: 'Giá nhập',
            supplierId: 'Nhà cung cấp'
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

        // Format currency
        formatCurrency(amount) {
            if (typeof window.formatCurrency === 'function') return window.formatCurrency(amount);
            if (!amount && amount !== 0) return '0 K';
            return new Intl.NumberFormat('vi-VN', {
                style: 'decimal',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(amount) + ' K';
        },

        // Get color based on unit
        getUnitColor(unit) {
            if (!unit) return '#6c757d'; // Muted gray
            const units = {
                'bao': '#198754',   // green
                'kg': '#0d6efd',    // blue
                'thùng': '#fd7e14', // orange
                'chai': '#dc3545',  // red
                'cái': '#6f42c1',   // purple
                'hộp': '#0dcaf0',   // cyan
                'lít': '#20c997'    // teal
            };
            const key = unit.toLowerCase().trim();
            if (units[key]) return units[key];
            
            // Hash for stable color if not defined
            let hash = 0;
            for (let i = 0; i < key.length; i++) {
                hash = key.charCodeAt(i) + ((hash << 5) - hash);
            }
            const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
            return '#' + '00000'.substring(0, 6 - c.length) + c;
        },

        // Wait for database
        async waitForDB() {
            return window.db || null;
        },

        // Clean up modals
        cleanupAllModals() {
            try {
                // Remove all existing backdrop elements
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => backdrop.remove());
                
                // Reset body state
                document.body.classList.remove('modal-open');
                document.body.style.removeProperty('padding-right');
                document.body.style.removeProperty('overflow');
                
                // Dispose all modal instances safely
                const modalElements = document.querySelectorAll('.modal');
                modalElements.forEach(modalEl => {
                    const instance = bootstrap.Modal.getInstance(modalEl);
                    if (instance) {
                        try {
                            instance.dispose();
                        } catch (e) {
                            console.log('⚠️ Modal instance disposal warning:', e);
                        }
                    }
                    
                    // Ensure modal is hidden
                    modalEl.style.display = 'none';
                    modalEl.classList.remove('show');
                    modalEl.setAttribute('aria-hidden', 'true');
                    modalEl.removeAttribute('aria-modal');
                    modalEl.removeAttribute('role');
                });
                
                console.log('🧹 Cleaned up all product modals');
            } catch (error) {
                console.log('⚠️ Error during product modal cleanup:', error);
            }
        }
    },

    // ===== VALIDATION SYSTEM =====
    validation: {
        // Validate single field
        validateField(fieldName, value) {
            const rule = ProductModule.config.validationRules[fieldName];
            if (!rule) return { valid: true };

            const trimmedValue = String(value || '').trim();
            
            // Required check
            if (rule.required && !trimmedValue) {
                return { 
                    valid: false, 
                    message: `${ProductModule.config.fieldDisplayNames[fieldName]} là bắt buộc` 
                };
            }

            // Skip other validations if field is empty and not required
            if (!trimmedValue && !rule.required) {
                return { valid: true };
            }

            // Min length check
            if (rule.minLength && trimmedValue.length < rule.minLength) {
                return { 
                    valid: false, 
                    message: `${ProductModule.config.fieldDisplayNames[fieldName]} phải có ít nhất ${rule.minLength} ký tự` 
                };
            }

            // Max length check
            if (rule.maxLength && trimmedValue.length > rule.maxLength) {
                return { 
                    valid: false, 
                    message: `${ProductModule.config.fieldDisplayNames[fieldName]} không được quá ${rule.maxLength} ký tự` 
                };
            }

            // Pattern validation
            if (rule.pattern && trimmedValue && !rule.pattern.test(trimmedValue)) {
                return { valid: false, message: rule.message };
            }

            // Number validation for price
            if (fieldName === 'purchasePrice' && trimmedValue) {
                const numValue = parseFloat(trimmedValue);
                if (isNaN(numValue) || numValue < 0) {
                    return { valid: false, message: rule.message };
                }
            }

            return { valid: true };
        },

        // Check duplicate name
        async checkDuplicateName(name, excludeId = null) {
            const trimmedName = name.trim().toLowerCase();
            return ProductModule.data.currentProducts.some(product => 
                product.name.toLowerCase() === trimmedName && 
                product.id != excludeId
            );
        },

        // Validate entire form
        async validateForm(formData, editId = null) {
            const errors = [];

            // Validate each field
            for (const fieldName in formData) {
                const validation = ProductModule.validation.validateField(fieldName, formData[fieldName]);
                if (!validation.valid) {
                    errors.push(validation.message);
                }
            }

            // Check for duplicate name
            if (formData.name && formData.name.trim()) {
                const isDuplicate = await ProductModule.validation.checkDuplicateName(formData.name, editId);
                if (isDuplicate) {
                    errors.push('Tên sản phẩm đã tồn tại');
                }
            }

            return {
                valid: errors.length === 0,
                errors: errors
            };
        }
    },

    // ===== DATABASE OPERATIONS =====
    database: {
        // Add product (keeping original logic)
        async add(productData) {
            try {
                const db = await ProductModule.utils.waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }

                // Backend validation
                if (!productData.name || !productData.name.trim()) {
                    throw new Error('Tên sản phẩm là bắt buộc');
                }

                // Normalize data
                const normalizedData = {
                    name: productData.name.trim(),
                    unit: productData.unit ? productData.unit.trim() : '',
                    purchasePrice: parseFloat(productData.purchasePrice) || 0,
                    supplierId: parseInt(productData.supplierId) || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

        const tx = db.transaction('products', 'readwrite');
        const store = tx.objectStore('products');
        
                const id = await store.add(normalizedData);
        await tx.done;
        
                console.log('✅ Added product with ID:', id);
        return id;
    } catch (error) {
                console.error('❌ Error adding product:', error);
                throw error;
    }
        },

        // Update product (keeping original logic)
        async update(productId, productData) {
    try {
                const db = await ProductModule.utils.waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }

                // Backend validation
                if (!productData.name || !productData.name.trim()) {
                    throw new Error('Tên sản phẩm là bắt buộc');
        }

        const tx = db.transaction('products', 'readwrite');
        const store = tx.objectStore('products');
        
                // Get existing product
        const existingProduct = await store.get(productId);
        if (!existingProduct) {
            throw new Error('Không tìm thấy sản phẩm');
        }
        
                // Normalize and update data
                const normalizedData = {
                    name: productData.name.trim(),
                    unit: productData.unit ? productData.unit.trim() : '',
                    purchasePrice: parseFloat(productData.purchasePrice) || 0,
                    supplierId: parseInt(productData.supplierId) || null,
                    updated_at: new Date().toISOString()
                };

                const updatedProduct = { 
                    ...existingProduct, 
                    ...normalizedData 
                };
        
        await store.put(updatedProduct);
        await tx.done;
        
                console.log('✅ Updated product with ID:', productId);
        return true;
    } catch (error) {
                console.error('❌ Error updating product:', error);
                throw error;
    }
        },

        // Delete product (keeping original logic with order check)
        async delete(productId) {
    try {
                const db = await ProductModule.utils.waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }

                // Check if product is used in orders
        const orderItemsTx = db.transaction('orderItems', 'readonly');
        const orderItemsStore = orderItemsTx.objectStore('orderItems');
        const orderItemsIndex = orderItemsStore.index('productId');
        const relatedOrderItems = await orderItemsIndex.getAll(productId);
        
        if (relatedOrderItems.length > 0) {
                    throw new Error(`Không thể xóa sản phẩm này vì đang có ${relatedOrderItems.length} đơn hàng liên quan.`);
        }
        
        const tx = db.transaction('products', 'readwrite');
        const store = tx.objectStore('products');
        
        await store.delete(productId);
        await tx.done;
        
                console.log('✅ Deleted product with ID:', productId);
                return true;
            } catch (error) {
                console.error('❌ Error deleting product:', error);
                throw error;
            }
        },

        // Get single product
        async get(productId) {
            try {
                const db = await ProductModule.utils.waitForDB();
                if (!db) return null;

                const tx = db.transaction('products', 'readonly');
                const store = tx.objectStore('products');
                return await store.get(productId);
            } catch (error) {
                console.error('❌ Error getting product:', error);
                return null;
            }
        },

        // Load all products and suppliers
        async loadAll() {
            try {
                const db = await ProductModule.utils.waitForDB();
                if (!db) return;

                // Load products
                const productsTx = db.transaction('products', 'readonly');
                const productsStore = productsTx.objectStore('products');
                ProductModule.data.currentProducts = await productsStore.getAll();
                ProductModule.data.filteredProducts = [...ProductModule.data.currentProducts];
                
                // Load suppliers for filter
                const suppliersTx = db.transaction('suppliers', 'readonly');
                const suppliersStore = suppliersTx.objectStore('suppliers');
                ProductModule.data.currentSuppliers = await suppliersStore.getAll();
                
                console.log(`📊 Loaded ${ProductModule.data.currentProducts.length} products and ${ProductModule.data.currentSuppliers.length} suppliers`);
    } catch (error) {
                console.error('❌ Error loading products:', error);
                ProductModule.data.currentProducts = [];
                ProductModule.data.filteredProducts = [];
                ProductModule.data.currentSuppliers = [];
            }
        }
    },

    // ===== UI COMPONENTS =====
    ui: {
        // Update products count
        updateCount() {
            const countElement = document.getElementById('products-count');
            if (countElement) {
                countElement.textContent = ProductModule.data.filteredProducts.length;
            }
        },

        // Update filter options
        updateFilters() {
            const supplierFilter = document.getElementById('supplier-filter');
            const unitFilter = document.getElementById('unit-filter');

            // Update supplier filter
            if (supplierFilter) {
                const currentSupplierValue = supplierFilter.value;
                supplierFilter.innerHTML = '<option value="">Tất cả nhà cung cấp</option>';
                
                ProductModule.data.currentSuppliers.forEach(supplier => {
                    const option = document.createElement('option');
                    option.value = supplier.id;
                    option.textContent = supplier.name;
                    supplierFilter.appendChild(option);
                });

                supplierFilter.value = currentSupplierValue;
            }

            // Update unit filter
            if (unitFilter) {
                const units = [...new Set(ProductModule.data.currentProducts
                    .map(p => p.unit)
                    .filter(unit => unit && unit.trim())
                )].sort();

                const currentUnitValue = unitFilter.value;
                unitFilter.innerHTML = '<option value="">Tất cả đơn vị</option>';
                
                units.forEach(unit => {
                    const option = document.createElement('option');
                    option.value = unit;
                    option.textContent = unit;
                    unitFilter.appendChild(option);
                });

                unitFilter.value = currentUnitValue;
            }
        },

        // Get supplier name by ID
        getSupplierName(supplierId) {
            if (!supplierId) return 'Chưa có';
            const supplier = ProductModule.data.currentSuppliers.find(s => s.id == supplierId);
            return supplier ? supplier.name : 'Không xác định';
        },

        // Render desktop table
        renderDesktopTable() {
            const tableBody = document.getElementById('products-list');
            if (!tableBody) return;

            // Sửa header bảng desktop cho giống supplier.js/report.js
            const table = tableBody.closest('table');
            if (table) {
                const thead = table.querySelector('thead');
                if (thead) {
                    thead.innerHTML = `
                        <tr class="align-middle table-primary">
                            <th class="text-center" scope="col" style="width: 80px;"><i class="bi bi-hash"></i></th>
                            <th scope="col"><i class="bi bi-box-seam me-2"></i>Tên sản phẩm</th>
                            <th class="text-center" scope="col" style="width: 100px;"><i class="bi bi-rulers me-2"></i>Đơn vị</th>
                            <th class="text-end" scope="col" style="width: 140px;"><i class="bi bi-currency-dollar me-2"></i>Giá nhập</th>
                            <th scope="col" style="width: 180px;"><i class="bi bi-building me-2"></i>Nhà cung cấp</th>
                            <th class="text-center" scope="col" style="width: 150px;"><i class="bi bi-gear me-2"></i>Thao tác</th>
                        </tr>
                    `;
                }
            }

            tableBody.innerHTML = '';

            ProductModule.data.filteredProducts.forEach(product => {
                const unitColor = ProductModule.utils.getUnitColor(product.unit);
                const row = document.createElement('tr');
                row.style.borderLeft = `4px solid ${unitColor}`;
                row.innerHTML = `
                    <td class="text-center fw-bold">${product.id}</td>
                    <td class="text-start">
                        <div class="fw-bold text-primary">${ProductModule.utils.safeValue(product.name)}</div>
                    </td>
                    <td class="text-center">
                        <span class="badge" style="background-color: ${unitColor}">${ProductModule.utils.safeValue(product.unit, '--')}</span>
                    </td>
                    <td class="text-end">
                        <span class="fw-bold text-success">${ProductModule.utils.formatCurrency(product.purchasePrice)}</span>
                    </td>
                    <td class="text-start">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-building me-2 text-secondary"></i>
                            <span>${this.getSupplierName(product.supplierId)}</span>
                        </div>
                    </td>
                    <td class="text-center">
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="ProductModule.actions.edit('${product.id}')" 
                                    title="Chỉnh sửa sản phẩm">
                                <i class="bi bi-pencil"></i>
                        </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="ProductModule.actions.confirmDelete('${product.id}')"
                                    title="Xóa sản phẩm">
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
            const mobileContainer = document.getElementById('products-mobile-list');
            if (!mobileContainer) return;

            mobileContainer.innerHTML = '';

            ProductModule.data.filteredProducts.forEach(product => {
                const unitColor = ProductModule.utils.getUnitColor(product.unit);
                const card = document.createElement('div');
                card.className = 'card mb-3 border-0 shadow-sm';
                card.style.borderLeft = `5px solid ${unitColor}`;
                card.innerHTML = `
                    <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <div class="fw-bold">
                            <i class="bi bi-box-seam me-2"></i>${ProductModule.utils.safeValue(product.name)}
                        </div>
                        <span class="badge bg-light text-dark">#${product.id}</span>
                    </div>
                    <div class="card-body">
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-rulers text-info me-2"></i>
                                    <span class="text-muted">Đơn vị:</span>
                                    <span class="ms-2 badge" style="background-color: ${unitColor}">${ProductModule.utils.safeValue(product.unit, '--')}</span>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-currency-dollar text-success me-2"></i>
                                    <span class="text-muted">Giá nhập:</span>
                                    <span class="ms-2 fw-bold text-success">${ProductModule.utils.formatCurrency(product.purchasePrice)}</span>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-building text-secondary me-2"></i>
                                    <span class="text-muted">Nhà cung cấp:</span>
                                    <span class="ms-2">${this.getSupplierName(product.supplierId)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                            <button class="btn btn-outline-primary btn-sm" onclick="ProductModule.actions.edit('${product.id}')" 
                                    title="Chỉnh sửa sản phẩm">
                                <i class="bi bi-pencil me-1"></i>Sửa
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="ProductModule.actions.confirmDelete('${product.id}')"
                                    title="Xóa sản phẩm">
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
            const noProductsMessage = document.getElementById('no-products-message');
            const noSearchResults = document.getElementById('no-product-search-results');
            const searchInput = document.getElementById('product-search');
            const supplierFilter = document.getElementById('supplier-filter');
            const unitFilter = document.getElementById('unit-filter');

            const hasData = ProductModule.data.filteredProducts.length > 0;
            const hasSearchTerm = (searchInput && searchInput.value.trim()) || 
                                 (supplierFilter && supplierFilter.value) ||
                                 (unitFilter && unitFilter.value);

            if (noProductsMessage) {
                noProductsMessage.style.display = !hasData && !hasSearchTerm ? 'block' : 'none';
            }

            if (noSearchResults) {
                noSearchResults.style.display = !hasData && hasSearchTerm ? 'block' : 'none';
            }
        },

        // Main render function
        async render() {
            this.updateCount();
            this.updateFilters();
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
            const existingModal = document.getElementById('productValidationErrorModal');
            if (existingModal) {
                existingModal.remove();
            }

            const modalHTML = `
                <div class="modal fade" id="productValidationErrorModal" tabindex="-1">
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
            
            const modal = new bootstrap.Modal(document.getElementById('productValidationErrorModal'));
            modal.show();
            
            document.getElementById('productValidationErrorModal').addEventListener('hidden.bs.modal', function () {
                this.remove();
            });
        }
    },

    // ===== FORM HANDLING =====
    form: {
        // Reset form to add mode
        resetToAdd() {
            const form = document.getElementById('product-form');
            const modalTitle = document.getElementById('productModalLabel');
            const submitButton = document.getElementById('product-submit-btn');
            
            if (form) {
                form.reset();
                form.removeAttribute('data-edit-id');
            }
            
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="bi bi-box-seam me-2"></i>Thêm sản phẩm mới';
            }
            
            if (submitButton) {
                submitButton.textContent = 'Lưu sản phẩm';
            }

            this.clearValidationErrors();
        },

        // Setup for edit mode
        setupEdit(product) {
            const form = document.getElementById('product-form');
            const modalTitle = document.getElementById('productModalLabel');
            const submitButton = document.getElementById('product-submit-btn');
            
            if (form) {
                form.setAttribute('data-edit-id', product.id);
            
            document.getElementById('product-name').value = product.name || '';
            document.getElementById('product-unit').value = product.unit || '';
            document.getElementById('product-purchase-price').value = product.purchasePrice || '';
            
            const supplierSelect = document.getElementById('product-supplier');
            if (supplierSelect && product.supplierId) {
                supplierSelect.value = product.supplierId;
                }
            }
            
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="bi bi-pencil me-2"></i>Chỉnh sửa sản phẩm';
            }
            
            if (submitButton) {
                submitButton.textContent = 'Cập nhật sản phẩm';
            }
            
            this.clearValidationErrors();
        },

        // Clear validation errors
        clearValidationErrors() {
            const fields = ['product-name', 'product-unit', 'product-purchase-price', 'product-supplier'];
            fields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.classList.remove('is-invalid', 'is-valid');
                    const errorDiv = document.getElementById(`${fieldId}-error`);
                    if (errorDiv) {
                        errorDiv.remove();
                    }
                }
            });
        },

        // Show field validation result
        showFieldValidation(fieldId, validation) {
            const field = document.getElementById(fieldId);
            if (!field) return;

            this.clearFieldValidation(fieldId);

            if (!validation.valid) {
                field.classList.add('is-invalid');
                
                const errorDiv = document.createElement('div');
                errorDiv.className = 'invalid-feedback';
                errorDiv.textContent = validation.message;
                errorDiv.id = `${fieldId}-error`;
                
                field.parentNode.appendChild(errorDiv);
            } else {
                field.classList.add('is-valid');
            }
        },

        // Clear field validation
        clearFieldValidation(fieldId) {
            const field = document.getElementById(fieldId);
            if (!field) return;

            field.classList.remove('is-invalid', 'is-valid');
            
            const errorDiv = document.getElementById(`${fieldId}-error`);
            if (errorDiv) {
                errorDiv.remove();
            }
        },

        // Setup real-time validation
        setupRealTimeValidation() {
            const fields = ['product-name', 'product-unit', 'product-purchase-price'];
            
            fields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    // Remove existing listeners
                    field.removeEventListener('blur', this.handleFieldValidation);
                    field.removeEventListener('input', this.handleFieldInput);
                    
                    // Add new listeners with proper binding
                    field.addEventListener('blur', (event) => {
                        this.handleFieldValidation(event);
                    });
                    field.addEventListener('input', (event) => {
                        this.handleFieldInput(event);
                    });
                }
            });

            // Special handling for supplier dropdown
            const supplierSelect = document.getElementById('product-supplier');
            if (supplierSelect) {
                supplierSelect.removeEventListener('change', this.handleFieldValidation);
                supplierSelect.addEventListener('change', (event) => {
                    this.handleFieldValidation(event);
                });
            }
        },

        // Handle field validation on blur
        handleFieldValidation(event) {
            const fieldId = event.target.id;
            const fieldName = fieldId.replace('product-', '');
            const value = event.target.value;
            
            // Map field names to validation names
            const fieldMapping = {
                'name': 'name',
                'code': 'code',
                'unit': 'unit',
                'purchase-price': 'purchasePrice',
                'supplier': 'supplierId'
            };
            
            const validationFieldName = fieldMapping[fieldName];
            if (validationFieldName) {
                const validation = ProductModule.validation.validateField(validationFieldName, value);
                ProductModule.form.showFieldValidation(fieldId, validation);
            }
        },

        // Handle field input (clear errors on typing)
        handleFieldInput(event) {
            const fieldId = event.target.id;
            ProductModule.form.clearFieldValidation(fieldId);
        }
    },

    // ===== FILTER SYSTEM =====
    filter: {
        // Apply filters
        apply() {
            const searchTerm = document.getElementById('product-search')?.value.toLowerCase().trim() || '';
            const supplierFilter = document.getElementById('supplier-filter')?.value || '';
            const unitFilter = document.getElementById('unit-filter')?.value || '';

            ProductModule.data.filteredProducts = ProductModule.data.currentProducts.filter(product => {
                const matchesSearch = !searchTerm || 
                    product.name.toLowerCase().includes(searchTerm) ||
                    (product.code && product.code.toLowerCase().includes(searchTerm)) ||
                    (product.unit && product.unit.toLowerCase().includes(searchTerm));

                const matchesSupplier = !supplierFilter || product.supplierId == supplierFilter;
                const matchesUnit = !unitFilter || product.unit === unitFilter;

                return matchesSearch && matchesSupplier && matchesUnit;
            });

            ProductModule.ui.render();
        }
    },

    // ===== USER ACTIONS =====
    actions: {
        // Add product
        async add() {
            const form = document.getElementById('product-form');
            const formData = {
                name: document.getElementById('product-name').value.trim(),
                unit: document.getElementById('product-unit').value.trim(),
                purchasePrice: document.getElementById('product-purchase-price').value,
                supplierId: document.getElementById('product-supplier').value
            };

            // Clear validation errors
            ProductModule.form.clearValidationErrors();
            
            // Validate form
            const validation = await ProductModule.validation.validateForm(formData);
            if (!validation.valid) {
                ProductModule.ui.showErrors(validation.errors);
                return;
            }

            try {
                const id = await ProductModule.database.add(formData);
                if (id) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
                    if (modal) {
                        modal.hide();
                    }

                    // Reload and refresh
                    await ProductModule.database.loadAll();
                    await ProductModule.refresh();
                    ProductModule.ui.showSuccess('Thêm sản phẩm thành công!');
        }
    } catch (error) {
                ProductModule.ui.showErrors([`Có lỗi xảy ra: ${error.message}`]);
            }
        },

        // Edit product
        async edit(productId) {
            try {
                const product = await ProductModule.database.get(productId);
                if (!product) {
                    ProductModule.ui.showErrors(['Không tìm thấy thông tin sản phẩm!']);
            return;
        }
        
                // Ensure modal is clean before opening
                ProductModule.utils.cleanupAllModals();
                
                // Small delay to ensure cleanup is complete
                setTimeout(() => {
                    ProductModule.form.setupEdit(product);
                    
                    // Verify modal exists before trying to show it
                    const modal = document.getElementById('productModal');
                    if (modal) {
                        try {
                            const bsModal = new bootstrap.Modal(modal);
                            bsModal.show();
                        } catch (error) {
                            console.error('❌ Error showing product modal:', error);
                            ProductModule.ui.showErrors(['Có lỗi khi mở form chỉnh sửa. Vui lòng thử lại.']);
                        }
                    } else {
                        console.error('❌ Product modal element not found');
                        ProductModule.ui.showErrors(['Không tìm thấy form chỉnh sửa. Vui lòng tải lại trang.']);
                    }
                }, 100);
            } catch (error) {
                console.error('❌ Error in edit product:', error);
                ProductModule.ui.showErrors(['Có lỗi khi chỉnh sửa sản phẩm. Vui lòng thử lại.']);
            }
        },
        
        // Update product
        async update() {
            const form = document.getElementById('product-form');
            const editId = form.getAttribute('data-edit-id');
            
            const formData = {
                name: document.getElementById('product-name').value.trim(),
                unit: document.getElementById('product-unit').value.trim(),
                purchasePrice: document.getElementById('product-purchase-price').value,
                supplierId: document.getElementById('product-supplier').value
            };

            // Clear validation errors
            ProductModule.form.clearValidationErrors();

            // Validate form
            const validation = await ProductModule.validation.validateForm(formData, editId);
            if (!validation.valid) {
                ProductModule.ui.showErrors(validation.errors);
            return;
        }
        
            try {
                const success = await ProductModule.database.update(editId, formData);
                if (success) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
                    if (modal) {
                        modal.hide();
                    }

                    // Reload and refresh
                    await ProductModule.database.loadAll();
                    await ProductModule.refresh();
                    ProductModule.ui.showSuccess('Cập nhật sản phẩm thành công!');
                }
            } catch (error) {
                ProductModule.ui.showErrors([`Có lỗi xảy ra: ${error.message}`]);
            }
        },

        // Confirm delete
        confirmDelete(productId) {
            console.log('🗑️ Confirming delete for product ID:', productId);
            const product = ProductModule.data.currentProducts.find(p => String(p.id) === String(productId));
            
            if (!product) {
                console.error('❌ Product not found for ID:', productId);
                return;
            }

            ProductModule.data.productToDelete = product;

            // Update delete modal content
            const nameElement = document.getElementById('delete-product-name');
            const detailsElement = document.getElementById('delete-product-details');

            if (nameElement) nameElement.textContent = product.name;
            if (detailsElement) {
                const supplierName = ProductModule.ui.getSupplierName(product.supplierId);
                detailsElement.textContent = `ID: #${product.id} • ${product.unit || 'Không có đơn vị'} • ${supplierName}`;
            }

            // Show delete modal safely
            const modalEl = document.getElementById('deleteProductModal');
            if (modalEl) {
                const deleteModal = bootstrap.Modal.getOrCreateInstance(modalEl);
                deleteModal.show();
            }
        },

        // Delete product
        async delete() {
            const product = ProductModule.data.productToDelete;
            console.log('🔥 Executing delete for product:', product ? product.name : 'NULL');
            
            if (!product) {
                console.error('❌ No product selected for deletion');
                return;
            }

            try {
                const success = await ProductModule.database.delete(product.id);
                if (success) {
                    console.log('✅ Database delete successful');
                    
                    // Close modal safely
                    const modalEl = document.getElementById('deleteProductModal');
                    if (modalEl) {
                        const modal = bootstrap.Modal.getInstance(modalEl);
                        if (modal) modal.hide();
                    }

                    // Force clean up any remaining backdrop
                    ProductModule.utils.cleanupAllModals();

                    // Reload and refresh
                    await ProductModule.refresh();
                    ProductModule.ui.showSuccess('Xóa sản phẩm thành công!');
                }
    } catch (error) {
                ProductModule.ui.showErrors([`Có lỗi xảy ra khi xóa: ${error.message}`]);
            } finally {
                ProductModule.data.productToDelete = null;
            }
        },

        // Handle form submit
        async handleFormSubmit(event) {
            event.preventDefault();
            
            const form = document.getElementById('product-form');
            const submitButton = document.getElementById('product-submit-btn');
            
            // Prevent multiple submissions
            if (submitButton.disabled) {
                console.log('⚠️ Product form already submitting, skipping...');
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
            await ProductModule.database.loadAll();
            ProductModule.filter.apply();
            
            // Update dropdowns in other modules if needed
            if (window.populateProductDropdowns) {
                await window.populateProductDropdowns();
            }
            if (window.populateSupplierDropdowns) {
                await window.populateSupplierDropdowns();
            }
        }
    },

    // ===== EVENT LISTENERS =====
    events: {
        // Track if events are already setup
        initialized: false,

        // Remove existing event listeners
        cleanup() {
            const addBtn = document.getElementById('add-product-btn');
            const refreshBtn = document.getElementById('refresh-products-btn');
            const searchInput = document.getElementById('product-search');
            const supplierFilter = document.getElementById('supplier-filter');
            const unitFilter = document.getElementById('unit-filter');
    const productForm = document.getElementById('product-form');
            const confirmDeleteBtn = document.getElementById('confirm-delete-product');

            // Remove existing listeners
            if (addBtn) addBtn.replaceWith(addBtn.cloneNode(true));
            if (refreshBtn) refreshBtn.replaceWith(refreshBtn.cloneNode(true));
            if (searchInput) searchInput.replaceWith(searchInput.cloneNode(true));
            if (supplierFilter) supplierFilter.replaceWith(supplierFilter.cloneNode(true));
            if (unitFilter) unitFilter.replaceWith(unitFilter.cloneNode(true));
            if (productForm) productForm.replaceWith(productForm.cloneNode(true));
            if (confirmDeleteBtn) confirmDeleteBtn.replaceWith(confirmDeleteBtn.cloneNode(true));
        },

        // Setup all event listeners
        setup() {
            // Prevent multiple initialization
            if (this.initialized) {
                console.log('⚠️ Product event listeners already initialized, skipping...');
            return;
        }
        
            // Cleanup any existing listeners
            this.cleanup();

            // Add product button
            const addBtn = document.getElementById('add-product-btn');
            if (addBtn) {
                addBtn.addEventListener('click', (event) => {
                    // Prevent any default behavior
                    event.preventDefault();
                    
                    // Clean up any existing modals first
                    ProductModule.utils.cleanupAllModals();
                    
                    // Small delay to ensure cleanup is complete
                    setTimeout(() => {
                        ProductModule.form.resetToAdd();
                        
                        // Show modal safely
                        const modal = document.getElementById('productModal');
                        if (modal) {
                            try {
                                const bsModal = new bootstrap.Modal(modal);
                                bsModal.show();
                            } catch (error) {
                                console.error('❌ Error showing add product modal:', error);
                                ProductModule.ui.showErrors(['Có lỗi khi mở form thêm sản phẩm. Vui lòng thử lại.']);
                    }
                } else {
                            console.error('❌ Product modal element not found');
                            ProductModule.ui.showErrors(['Không tìm thấy form thêm sản phẩm. Vui lòng tải lại trang.']);
                        }
                    }, 100);
                });
            }

            // Refresh button
            const refreshBtn = document.getElementById('refresh-products-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', async () => {
                    await ProductModule.actions.refresh();
                    
                    // Loading animation
                    refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2 spin"></i>Đang tải...';
                    setTimeout(() => {
                        refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Làm mới';
                    }, 1000);
                });
            }

            // Search input
            const searchInput = document.getElementById('product-search');
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    ProductModule.filter.apply();
                });
            }

            // Supplier filter
            const supplierFilter = document.getElementById('supplier-filter');
            if (supplierFilter) {
                supplierFilter.addEventListener('change', () => {
                    ProductModule.filter.apply();
                });
            }

            // Unit filter
            const unitFilter = document.getElementById('unit-filter');
            if (unitFilter) {
                unitFilter.addEventListener('change', () => {
                    ProductModule.filter.apply();
                });
            }

            // Form submit
            const productForm = document.getElementById('product-form');
            if (productForm) {
                productForm.addEventListener('submit', (event) => {
                    ProductModule.actions.handleFormSubmit(event);
                });
            }

            // Delete confirmation
            const confirmDeleteBtn = document.getElementById('confirm-delete-product');
            if (confirmDeleteBtn) {
                confirmDeleteBtn.addEventListener('click', () => {
                    ProductModule.actions.delete();
                });
            }
        
            // Modal events
            const productModal = document.getElementById('productModal');
            if (productModal) {
                productModal.addEventListener('show.bs.modal', (event) => {
                    console.log('🎯 Product modal opening...');
                    
                    // Setup real-time validation
                    ProductModule.form.setupRealTimeValidation();
                    
                    // Ensure modal is properly initialized
                    setTimeout(() => {
                        const firstField = document.getElementById('product-name');
                        if (firstField) {
                            firstField.focus();
                        }
                    }, 300);
                });
                
                productModal.addEventListener('shown.bs.modal', (event) => {
                    console.log('✅ Product modal opened successfully');
                });
                
                productModal.addEventListener('hide.bs.modal', (event) => {
                    console.log('🔄 Product modal closing...');
                });
                
                productModal.addEventListener('hidden.bs.modal', (event) => {
                    console.log('✅ Product modal closed');
                    
                    // Reset form and clear validation
                    ProductModule.form.resetToAdd();
                    ProductModule.form.clearValidationErrors();
                    
                    // Cleanup with delay to ensure modal is fully hidden
                    setTimeout(() => {
                        ProductModule.utils.cleanupAllModals();
                    }, 150);
                });
            }

            const deleteModal = document.getElementById('deleteProductModal');
            if (deleteModal) {
                deleteModal.addEventListener('hidden.bs.modal', (event) => {
                    console.log('✅ Delete product modal closed');
                    
                    // Clear delete data
                    ProductModule.data.productToDelete = null;
                    
                    // Cleanup with delay
                    setTimeout(() => {
                        ProductModule.utils.cleanupAllModals();
                    }, 150);
                });
            }

            // Mark as initialized
            this.initialized = true;
            console.log('✅ Product event listeners setup complete');
        }
    },

    // ===== PUBLIC API =====
    // Track initialization state
    isInitialized: false,

    // Verify modal elements exist
    verifyModalElements() {
        const productModal = document.getElementById('productModal');
        const deleteModal = document.getElementById('deleteProductModal');
        
        if (!productModal) {
            console.error('❌ Product modal element not found in DOM');
            return false;
        }
        
        if (!deleteModal) {
            console.error('❌ Delete product modal element not found in DOM');
            return false;
        }
        
        console.log('✅ Product modal elements verified');
        return true;
    },

    // Initialize module
    async init() {
        try {
            // Prevent multiple initialization
            if (this.isInitialized) {
                console.log('⚠️ Product module already initialized, skipping...');
                return true;
            }

            console.log('🎯 Initializing Product Management Module...');
            
            // Verify modal elements exist
            if (!this.verifyModalElements()) {
                console.error('❌ Modal elements not ready, delaying initialization...');
                // Retry after a short delay
                setTimeout(() => this.init(), 500);
                return false;
            }
            
            // Cleanup any existing modals
            this.utils.cleanupAllModals();
            
            // Wait for database
            const db = await this.utils.waitForDB();
            if (!db) {
                console.error('❌ Database not ready for product module');
                return false;
            }

            // Load data
            await this.database.loadAll();
            
            // Setup event listeners
            this.events.setup();
            
            // Initial render
            await this.ui.render();
            
            // Mark as initialized
            this.isInitialized = true;
            
            console.log('✅ Product Management Module initialized successfully');
            return true;
    } catch (error) {
            console.error('❌ Error initializing product module:', error);
        return false;
    }
    },

    // Refresh everything
    async refresh() {
        await this.database.loadAll();
        this.filter.apply();
        
        // Update dropdowns in other modules
        if (window.populateProductDropdowns) {
            await window.populateProductDropdowns();
        }
        if (window.populateSupplierDropdowns) {
            await window.populateSupplierDropdowns();
        }
        if (window.populateProductSupplierDropdowns) {
            await window.populateProductSupplierDropdowns();
        }
    }
};
        
// ===== LEGACY FUNCTIONS FOR BACKWARD COMPATIBILITY =====
// These functions maintain compatibility with existing code

async function addProduct(productData) {
    return await ProductModule.database.add(productData);
}

async function updateProduct(productId, productData) {
    return await ProductModule.database.update(productId, productData);
}

async function deleteProduct(productId) {
    return await ProductModule.database.delete(productId);
}

async function getProduct(productId) {
    return await ProductModule.database.get(productId);
}

async function displayProducts() {
    await ProductModule.database.loadAll();
    await ProductModule.ui.render();
}

async function searchProducts(keyword) {
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.value = keyword;
        ProductModule.filter.apply();
    }
}

async function populateProductDropdowns() {
    // Legacy function - now handled by module
    console.log('📦 populateProductDropdowns called - using modern module');
}

async function editProduct(productId) {
    // Legacy function - now handled by module with safer modal handling
    console.log('📦 editProduct called - using modern module with safe modal handling');
    await ProductModule.actions.edit(productId);
}

// ===== MODULE INITIALIZATION =====
window.loadProductModule = async function() {
    try {
        // Prevent multiple initialization
        if (window.productModuleLoaded) {
            console.log('⚠️ Product module already loaded, skipping...');
            return true;
        }

        const success = await ProductModule.init();
        
        if (success) {
            // Register global functions for other modules
            window.populateProductDropdowns = async function() {
                // Implementation for populating dropdowns in other modules
                const dropdowns = document.querySelectorAll('.product-select');
                dropdowns.forEach(async (dropdown) => {
                    const currentValue = dropdown.value;
                    dropdown.innerHTML = '<option value="" selected disabled>Chọn sản phẩm</option>';
                    
                    ProductModule.data.currentProducts.forEach(product => {
                        const option = document.createElement('option');
                        option.value = product.id;
                        option.textContent = `${product.name} (${product.code || 'Không mã'})`;
                        dropdown.appendChild(option);
                    });
                    
                    dropdown.value = currentValue;
                });
            };

            // Also populate supplier dropdowns for product forms
            window.populateProductSupplierDropdowns = async function() {
                const productSupplierDropdown = document.getElementById('product-supplier');
                if (productSupplierDropdown) {
                    try {
                        // Load fresh supplier data from database
                        const db = await ProductModule.utils.waitForDB();
                        if (db) {
                            const suppliers = await db.getAll('suppliers');
                            const currentValue = productSupplierDropdown.value;
                            productSupplierDropdown.innerHTML = '<option value="" selected disabled>Chọn nhà cung cấp</option>';
                            
                            suppliers.forEach(supplier => {
                                const option = document.createElement('option');
                                option.value = supplier.id;
                                option.textContent = supplier.name;
                                productSupplierDropdown.appendChild(option);
                            });
                            
                            productSupplierDropdown.value = currentValue;
                            console.log('✅ Product supplier dropdown updated with fresh data');
                        }
                    } catch (error) {
                        console.error('❌ Error updating product supplier dropdown:', error);
                    }
                }
            };
            
            // Export module globally for debugging
            window.ProductModule = ProductModule;
            
            // Mark as loaded globally
            window.productModuleLoaded = true;
        
            console.log('🚀 Product Module ready and global functions registered');
        }
        
        return success;
    } catch (error) {
        console.error('❌ Failed to load product module:', error);
        return false;
    }
};

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.loadProductModule);
} else {
    // DOM already loaded
    setTimeout(window.loadProductModule, 100);
}
