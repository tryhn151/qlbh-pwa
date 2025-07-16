// ===== CUSTOMER MANAGEMENT MODULE =====
// Complete customer management with modern UI and validation
// Senior JS Developer: Modular approach for better maintainability

// ===== MODULE STRUCTURE =====
const CustomerModule = {
    // Data storage
    data: {
        currentCustomers: [],
        filteredCustomers: [],
        customerToDelete: null
    },

    // Configuration
    config: {
        validationRules: {
            name: {
                required: true,
                minLength: 2,
                maxLength: 100,
                message: 'Tên khách hàng phải từ 2-100 ký tự'
            },
            contact: {
                required: false,
                pattern: /^0(3[2-9]|5[689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/,
                message: 'Số điện thoại không đúng định dạng. VD: 0912345678'
            }
        },
        fieldDisplayNames: {
            name: 'Tên khách hàng',
            contact: 'Số điện thoại'
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

        // Wait for database
        async waitForDB() {
    return new Promise((resolve) => {
        if (window.db) {
            try {
                const tx = window.db.transaction('customers', 'readonly');
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
                    const tx = window.db.transaction('customers', 'readonly');
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
                            console.log('⚠️ Customer modal instance disposal warning:', e);
                        }
                    }
                    
                    // Ensure modal is hidden
                    modalEl.style.display = 'none';
                    modalEl.classList.remove('show');
                    modalEl.setAttribute('aria-hidden', 'true');
                    modalEl.removeAttribute('aria-modal');
                    modalEl.removeAttribute('role');
                });
                
                console.log('🧹 Cleaned up all customer modals');
            } catch (error) {
                console.log('⚠️ Error during customer modal cleanup:', error);
            }
        }
    },

    // ===== VALIDATION SYSTEM =====
    validation: {
        // Validate single field
        validateField(fieldName, value) {
            const rule = CustomerModule.config.validationRules[fieldName];
            if (!rule) return { valid: true };

            const trimmedValue = String(value || '').trim();
            
            // Required check
            if (rule.required && !trimmedValue) {
                return { 
                    valid: false, 
                    message: `${CustomerModule.config.fieldDisplayNames[fieldName]} là bắt buộc` 
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
                    message: `${CustomerModule.config.fieldDisplayNames[fieldName]} phải có ít nhất ${rule.minLength} ký tự` 
                };
            }

            // Max length check
            if (rule.maxLength && trimmedValue.length > rule.maxLength) {
                return { 
                    valid: false, 
                    message: `${CustomerModule.config.fieldDisplayNames[fieldName]} không được quá ${rule.maxLength} ký tự` 
                };
            }

            // Pattern validation for phone
            if (fieldName === 'contact' && trimmedValue && rule.pattern) {
                if (!rule.pattern.test(trimmedValue)) {
                    return { valid: false, message: rule.message };
                }
            }

            return { valid: true };
        },

        // Check duplicate name
        async checkDuplicateName(name, excludeId = null) {
            const trimmedName = name.trim().toLowerCase();
            return CustomerModule.data.currentCustomers.some(customer => 
                customer.name.toLowerCase() === trimmedName && 
                customer.id !== excludeId
            );
        },

        // Validate entire form
        async validateForm(formData, editId = null) {
            const errors = [];

            // Validate each field
            for (const fieldName in formData) {
                const validation = CustomerModule.validation.validateField(fieldName, formData[fieldName]);
                if (!validation.valid) {
                    errors.push(validation.message);
                }
            }

            // Check for duplicate name
            if (formData.name && formData.name.trim()) {
                const isDuplicate = await CustomerModule.validation.checkDuplicateName(formData.name, editId);
                if (isDuplicate) {
                    errors.push('Tên khách hàng đã tồn tại');
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
        // Add customer (keeping original logic)
        async add(customerData) {
            try {
                const db = await CustomerModule.utils.waitForDB();
                if (!db) {
                    throw new Error('Không thể kết nối đến cơ sở dữ liệu');
                }

                // Backend validation
                if (!customerData.name || !customerData.name.trim()) {
                    throw new Error('Tên khách hàng là bắt buộc');
                }

                // Normalize data
                const normalizedData = {
                    name: customerData.name.trim(),
                    contact: customerData.contact ? customerData.contact.trim() : '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const tx = db.transaction('customers', 'readwrite');
                const store = tx.objectStore('customers');
                
                const id = await store.add(normalizedData);
                await tx.done;
                
                console.log('✅ Added customer with ID:', id);
                return id;
            } catch (error) {
                console.error('❌ Error adding customer:', error);
                throw error;
            }
        },

        // Update customer (keeping original logic)
        async update(customerId, customerData) {
            try {
                const db = await CustomerModule.utils.waitForDB();
                if (!db) {
                    throw new Error('Không thể kết nối đến cơ sở dữ liệu');
                }

                // Backend validation
                if (!customerData.name || !customerData.name.trim()) {
                    throw new Error('Tên khách hàng là bắt buộc');
                }

                const tx = db.transaction('customers', 'readwrite');
                const store = tx.objectStore('customers');
                
                // Get existing customer
                const existingCustomer = await store.get(customerId);
                if (!existingCustomer) {
                    throw new Error('Không tìm thấy khách hàng');
                }
                
                // Normalize and update data
                const normalizedData = {
                    name: customerData.name.trim(),
                    contact: customerData.contact ? customerData.contact.trim() : '',
                    updated_at: new Date().toISOString()
                };

                const updatedCustomer = { 
                    ...existingCustomer, 
                    ...normalizedData 
                };
                
                await store.put(updatedCustomer);
                await tx.done;
                
                console.log('✅ Updated customer with ID:', customerId);
                return true;
            } catch (error) {
                console.error('❌ Error updating customer:', error);
                throw error;
            }
        },

        // Delete customer (keeping original logic)
        async delete(customerId) {
            try {
                const db = await CustomerModule.utils.waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }
        
                const tx = db.transaction('customers', 'readwrite');
                const store = tx.objectStore('customers');
                
                await store.delete(customerId);
                await tx.done;
                
                console.log('✅ Deleted customer with ID:', customerId);
                return true;
            } catch (error) {
                console.error('❌ Error deleting customer:', error);
                throw error;
            }
        },

        // Get single customer
        async get(customerId) {
            try {
                const db = await CustomerModule.utils.waitForDB();
                if (!db) return null;

        const tx = db.transaction('customers', 'readonly');
        const store = tx.objectStore('customers');
                return await store.get(customerId);
            } catch (error) {
                console.error('❌ Error getting customer:', error);
                return null;
            }
        },

        // Load all customers
        async loadAll() {
            try {
                const db = await CustomerModule.utils.waitForDB();
                if (!db) return;

                const tx = db.transaction('customers', 'readonly');
                const store = tx.objectStore('customers');
                CustomerModule.data.currentCustomers = await store.getAll();
                CustomerModule.data.filteredCustomers = [...CustomerModule.data.currentCustomers];
                
                console.log(`📊 Loaded ${CustomerModule.data.currentCustomers.length} customers`);
            } catch (error) {
                console.error('❌ Error loading customers:', error);
                CustomerModule.data.currentCustomers = [];
                CustomerModule.data.filteredCustomers = [];
            }
        }
    },

    // ===== UI COMPONENTS =====
    ui: {
        // Update customers count
        updateCount() {
            const countElement = document.getElementById('customers-count');
            if (countElement) {
                countElement.textContent = CustomerModule.data.filteredCustomers.length;
            }
        },

        // Render desktop table
        renderDesktopTable() {
            const tableBody = document.getElementById('customers-list');
            if (!tableBody) return;

            // Sửa header bảng desktop cho giống supplier.js/product.js
            const table = tableBody.closest('table');
            if (table) {
                const thead = table.querySelector('thead');
                if (thead) {
                    thead.innerHTML = `
                        <tr class="align-middle table-primary">
                            <th class="text-center" scope="col" style="width: 80px;"><i class="bi bi-hash"></i></th>
                            <th scope="col"><i class="bi bi-person me-2"></i>Tên khách hàng</th>
                            <th class="text-center" scope="col" style="width: 200px;"><i class="bi bi-telephone me-2"></i>Số điện thoại</th>
                            <th class="text-center" scope="col" style="width: 150px;"><i class="bi bi-gear me-2"></i>Thao tác</th>
                        </tr>
                    `;
                }
            }

            tableBody.innerHTML = '';

            CustomerModule.data.filteredCustomers.forEach(customer => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="text-center fw-bold">${customer.id}</td>
                    <td class="text-start">
                        <div class="fw-bold text-primary">${CustomerModule.utils.safeValue(customer.name)}</div>
                    </td>
                    <td class="text-center">
                        <div class="d-flex align-items-center justify-content-center">
                            <i class="bi bi-telephone me-2 text-success"></i>
                            <span>${CustomerModule.utils.safeValue(customer.contact, 'Chưa có')}</span>
                        </div>
                    </td>
                    <td class="text-center">
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="CustomerModule.actions.edit(${customer.id})" 
                                    title="Chỉnh sửa khách hàng">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="CustomerModule.actions.confirmDelete(${customer.id})"
                                    title="Xóa khách hàng">
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
            const mobileContainer = document.getElementById('customers-mobile-list');
            if (!mobileContainer) return;

            mobileContainer.innerHTML = '';

            CustomerModule.data.filteredCustomers.forEach(customer => {
                const card = document.createElement('div');
                card.className = 'card mb-3 border-0 shadow-sm';
                card.innerHTML = `
                    <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <div class="fw-bold">
                            <i class="bi bi-person me-2"></i>${CustomerModule.utils.safeValue(customer.name)}
                        </div>
                        <span class="badge bg-light text-dark">#${customer.id}</span>
                    </div>
                    <div class="card-body">
                        <div class="row g-2 mb-3">
                            <div class="col-12">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-telephone text-success me-2"></i>
                                    <span class="text-muted">Liên hệ:</span>
                                    <span class="ms-2">${CustomerModule.utils.safeValue(customer.contact, 'Chưa có')}</span>
                                </div>
                            </div>
                        </div>
                        <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                            <button class="btn btn-outline-primary btn-sm" onclick="CustomerModule.actions.edit(${customer.id})" 
                                    title="Chỉnh sửa khách hàng">
                                <i class="bi bi-pencil me-1"></i>Sửa
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="CustomerModule.actions.confirmDelete(${customer.id})"
                                    title="Xóa khách hàng">
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
            const noCustomersMessage = document.getElementById('no-customers-message');
            const noSearchResults = document.getElementById('no-customer-search-results');
            const searchInput = document.getElementById('customer-search');

            const hasData = CustomerModule.data.filteredCustomers.length > 0;
            const hasSearchTerm = searchInput && searchInput.value.trim();

            if (noCustomersMessage) {
                noCustomersMessage.style.display = !hasData && !hasSearchTerm ? 'block' : 'none';
            }

            if (noSearchResults) {
                noSearchResults.style.display = !hasData && hasSearchTerm ? 'block' : 'none';
            }
        },

        // Main render function
        async render() {
            this.updateCount();
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
            const existingModal = document.getElementById('customerValidationErrorModal');
            if (existingModal) {
                existingModal.remove();
            }

            const modalHTML = `
                <div class="modal fade" id="customerValidationErrorModal" tabindex="-1">
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
            
            const modal = new bootstrap.Modal(document.getElementById('customerValidationErrorModal'));
            modal.show();
            
            document.getElementById('customerValidationErrorModal').addEventListener('hidden.bs.modal', function () {
                this.remove();
            });
        }
    },

    // ===== FORM HANDLING =====
    form: {
        // Reset form to add mode
        resetToAdd() {
            const form = document.getElementById('customer-form');
            const modalTitle = document.getElementById('customerModalLabel');
            const submitButton = document.getElementById('customer-submit-btn');
            
            if (form) {
                form.reset();
                form.removeAttribute('data-edit-id');
            }
            
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="bi bi-person me-2"></i>Thêm khách hàng mới';
            }
            
            if (submitButton) {
                submitButton.textContent = 'Lưu khách hàng';
            }

            this.clearValidationErrors();
        },

        // Setup for edit mode
        setupEdit(customer) {
            const form = document.getElementById('customer-form');
            const modalTitle = document.getElementById('customerModalLabel');
            const submitButton = document.getElementById('customer-submit-btn');
            
            if (form) {
                form.setAttribute('data-edit-id', customer.id);
            
                document.getElementById('customer-name').value = customer.name || '';
                document.getElementById('customer-contact').value = customer.contact || '';
            }
            
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="bi bi-pencil me-2"></i>Chỉnh sửa khách hàng';
            }
            
            if (submitButton) {
                submitButton.textContent = 'Cập nhật khách hàng';
            }
            
            this.clearValidationErrors();
        },

        // Clear validation errors
        clearValidationErrors() {
            const fields = ['customer-name', 'customer-contact'];
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
            const fields = ['customer-name', 'customer-contact'];
            
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
        },

        // Handle field validation on blur
        handleFieldValidation(event) {
            const fieldId = event.target.id;
            const fieldName = fieldId.replace('customer-', '');
            const value = event.target.value;
            
            const validation = CustomerModule.validation.validateField(fieldName, value);
            CustomerModule.form.showFieldValidation(fieldId, validation);
        },

        // Handle field input (clear errors on typing)
        handleFieldInput(event) {
            const fieldId = event.target.id;
            CustomerModule.form.clearFieldValidation(fieldId);
        }
    },

    // ===== FILTER SYSTEM =====
    filter: {
        // Apply filters
        apply() {
            const searchTerm = document.getElementById('customer-search')?.value.toLowerCase().trim() || '';

            CustomerModule.data.filteredCustomers = CustomerModule.data.currentCustomers.filter(customer => {
                const matchesSearch = !searchTerm || 
                    customer.name.toLowerCase().includes(searchTerm) ||
                    (customer.contact && customer.contact.toLowerCase().includes(searchTerm));

                return matchesSearch;
            });

            CustomerModule.ui.render();
        }
    },

    // ===== USER ACTIONS =====
    actions: {
        // Add customer
        async add() {
            const form = document.getElementById('customer-form');
            const formData = {
                name: document.getElementById('customer-name').value.trim(),
                contact: document.getElementById('customer-contact').value.trim()
            };

            // Clear validation errors
            CustomerModule.form.clearValidationErrors();
            
            // Validate form
            const validation = await CustomerModule.validation.validateForm(formData);
            if (!validation.valid) {
                CustomerModule.ui.showErrors(validation.errors);
                return;
            }

            try {
                const id = await CustomerModule.database.add(formData);
                if (id) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('customerModal'));
                    if (modal) {
                        modal.hide();
                    }

                    // Reload and refresh
                    await CustomerModule.database.loadAll();
                    await CustomerModule.refresh();
                    CustomerModule.ui.showSuccess('Thêm khách hàng thành công!');
                }
            } catch (error) {
                CustomerModule.ui.showErrors([`Có lỗi xảy ra: ${error.message}`]);
            }
        },

        // Edit customer
        async edit(customerId) {
            try {
                const customer = await CustomerModule.database.get(customerId);
                if (!customer) {
                    CustomerModule.ui.showErrors(['Không tìm thấy thông tin khách hàng!']);
                    return;
                }

                // Ensure modal is clean before opening
                CustomerModule.utils.cleanupAllModals();
                
                // Small delay to ensure cleanup is complete
                setTimeout(() => {
                    CustomerModule.form.setupEdit(customer);
                    
                    // Verify modal exists before trying to show it
                    const modal = document.getElementById('customerModal');
                    if (modal) {
                        try {
                            const bsModal = new bootstrap.Modal(modal);
                            bsModal.show();
                        } catch (error) {
                            console.error('❌ Error showing customer modal:', error);
                            CustomerModule.ui.showErrors(['Có lỗi khi mở form chỉnh sửa. Vui lòng thử lại.']);
                        }
                    } else {
                        console.error('❌ Customer modal element not found');
                        CustomerModule.ui.showErrors(['Không tìm thấy form chỉnh sửa. Vui lòng tải lại trang.']);
                    }
                }, 100);
            } catch (error) {
                console.error('❌ Error in edit customer:', error);
                CustomerModule.ui.showErrors(['Có lỗi khi chỉnh sửa khách hàng. Vui lòng thử lại.']);
            }
        },
        
        // Update customer
        async update() {
            const form = document.getElementById('customer-form');
            const editId = parseInt(form.getAttribute('data-edit-id'));
            
            const formData = {
                name: document.getElementById('customer-name').value.trim(),
                contact: document.getElementById('customer-contact').value.trim()
            };

            // Clear validation errors
            CustomerModule.form.clearValidationErrors();

            // Validate form
            const validation = await CustomerModule.validation.validateForm(formData, editId);
            if (!validation.valid) {
                CustomerModule.ui.showErrors(validation.errors);
                return;
            }

            try {
                const success = await CustomerModule.database.update(editId, formData);
                if (success) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('customerModal'));
                    if (modal) {
                        modal.hide();
                    }

                    // Reload and refresh
                    await CustomerModule.database.loadAll();
                    await CustomerModule.refresh();
                    CustomerModule.ui.showSuccess('Cập nhật khách hàng thành công!');
                }
    } catch (error) {
                CustomerModule.ui.showErrors([`Có lỗi xảy ra: ${error.message}`]);
            }
        },

        // Confirm delete
        confirmDelete(customerId) {
            const customer = CustomerModule.data.currentCustomers.find(c => c.id === customerId);
            if (!customer) return;

            CustomerModule.data.customerToDelete = customer;

            // Update delete modal content
            const nameElement = document.getElementById('delete-customer-name');
            const detailsElement = document.getElementById('delete-customer-details');

            if (nameElement) nameElement.textContent = customer.name;
            if (detailsElement) {
                detailsElement.textContent = customer.contact || 'Chưa có số điện thoại';
            }

            // Show delete modal
            const deleteModal = new bootstrap.Modal(document.getElementById('deleteCustomerModal'));
            deleteModal.show();
        },

        // Delete customer
        async delete() {
            const customer = CustomerModule.data.customerToDelete;
            if (!customer) return;

            try {
                const success = await CustomerModule.database.delete(customer.id);
                if (success) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteCustomerModal'));
                    if (modal) {
                        modal.hide();
                    }

                    // Reload and refresh
                    await CustomerModule.database.loadAll();
                    await CustomerModule.refresh();
                    CustomerModule.ui.showSuccess('Xóa khách hàng thành công!');
                }
            } catch (error) {
                CustomerModule.ui.showErrors([`Có lỗi xảy ra khi xóa: ${error.message}`]);
            } finally {
                CustomerModule.data.customerToDelete = null;
            }
        },

        // Handle form submit
        async handleFormSubmit(event) {
            event.preventDefault();
            
            const form = document.getElementById('customer-form');
            const submitButton = document.getElementById('customer-submit-btn');
            
            // Prevent multiple submissions
            if (submitButton.disabled) {
                console.log('⚠️ Customer form already submitting, skipping...');
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
            await CustomerModule.database.loadAll();
            CustomerModule.filter.apply();
            
            // Update dropdowns in other modules if needed
            if (window.populateCustomerDropdowns) {
                await window.populateCustomerDropdowns();
            }
        }
    },

    // ===== EVENT LISTENERS =====
    events: {
        // Track if events are already setup
        initialized: false,

        // Remove existing event listeners
        cleanup() {
            const addBtn = document.getElementById('add-customer-btn');
            const refreshBtn = document.getElementById('refresh-customers-btn');
            const searchInput = document.getElementById('customer-search');
            const customerForm = document.getElementById('customer-form');
            const confirmDeleteBtn = document.getElementById('confirm-delete-customer');

            // Remove existing listeners
            if (addBtn) addBtn.replaceWith(addBtn.cloneNode(true));
            if (refreshBtn) refreshBtn.replaceWith(refreshBtn.cloneNode(true));
            if (searchInput) searchInput.replaceWith(searchInput.cloneNode(true));
            if (customerForm) customerForm.replaceWith(customerForm.cloneNode(true));
            if (confirmDeleteBtn) confirmDeleteBtn.replaceWith(confirmDeleteBtn.cloneNode(true));
        },

        // Setup all event listeners
        setup() {
            // Prevent multiple initialization
            if (this.initialized) {
                console.log('⚠️ Customer event listeners already initialized, skipping...');
                return;
            }

            // Cleanup any existing listeners
            this.cleanup();

            // Add customer button
            const addBtn = document.getElementById('add-customer-btn');
            if (addBtn) {
                addBtn.addEventListener('click', (event) => {
                    // Prevent any default behavior
                    event.preventDefault();
                    
                    // Clean up any existing modals first
                    CustomerModule.utils.cleanupAllModals();
                    
                    // Small delay to ensure cleanup is complete
                    setTimeout(() => {
                        CustomerModule.form.resetToAdd();
                        
                        // Show modal safely
                        const modal = document.getElementById('customerModal');
                        if (modal) {
                            try {
                                const bsModal = new bootstrap.Modal(modal);
                                bsModal.show();
    } catch (error) {
                                console.error('❌ Error showing add customer modal:', error);
                                CustomerModule.ui.showErrors(['Có lỗi khi mở form thêm khách hàng. Vui lòng thử lại.']);
                            }
                        } else {
                            console.error('❌ Customer modal element not found');
                            CustomerModule.ui.showErrors(['Không tìm thấy form thêm khách hàng. Vui lòng tải lại trang.']);
                        }
                    }, 100);
                });
            }

            // Refresh button
            const refreshBtn = document.getElementById('refresh-customers-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', async () => {
                    await CustomerModule.actions.refresh();
                    
                    // Loading animation
                    refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2 spin"></i>Đang tải...';
            setTimeout(() => {
                        refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Làm mới';
                    }, 1000);
                });
            }

            // Search input
            const searchInput = document.getElementById('customer-search');
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    CustomerModule.filter.apply();
                });
            }

            // Form submit
            const customerForm = document.getElementById('customer-form');
            if (customerForm) {
                customerForm.addEventListener('submit', (event) => {
                    CustomerModule.actions.handleFormSubmit(event);
                });
            }

            // Delete confirmation
            const confirmDeleteBtn = document.getElementById('confirm-delete-customer');
            if (confirmDeleteBtn) {
                confirmDeleteBtn.addEventListener('click', () => {
                    CustomerModule.actions.delete();
                });
            }
        
            // Modal events
            const customerModal = document.getElementById('customerModal');
            if (customerModal) {
                customerModal.addEventListener('show.bs.modal', (event) => {
                    console.log('🎯 Customer modal opening...');
                    
                    // Setup real-time validation
                    CustomerModule.form.setupRealTimeValidation();
                    
                    // Ensure modal is properly initialized
                    setTimeout(() => {
                        const firstField = document.getElementById('customer-name');
                        if (firstField) {
                            firstField.focus();
                        }
                    }, 300);
                });
                
                customerModal.addEventListener('shown.bs.modal', (event) => {
                    console.log('✅ Customer modal opened successfully');
                });
                
                customerModal.addEventListener('hide.bs.modal', (event) => {
                    console.log('🔄 Customer modal closing...');
                });
                
                customerModal.addEventListener('hidden.bs.modal', (event) => {
                    console.log('✅ Customer modal closed');
                    
                    // Reset form and clear validation
                    CustomerModule.form.resetToAdd();
                    CustomerModule.form.clearValidationErrors();
                    
                    // Cleanup with delay to ensure modal is fully hidden
                    setTimeout(() => {
                        CustomerModule.utils.cleanupAllModals();
                    }, 150);
                });
            }

            const deleteModal = document.getElementById('deleteCustomerModal');
            if (deleteModal) {
                deleteModal.addEventListener('hidden.bs.modal', (event) => {
                    console.log('✅ Delete customer modal closed');
                    
                    // Clear delete data
                    CustomerModule.data.customerToDelete = null;
                    
                    // Cleanup with delay
            setTimeout(() => {
                        CustomerModule.utils.cleanupAllModals();
                    }, 150);
                });
            }

            // Mark as initialized
            this.initialized = true;
            console.log('✅ Customer event listeners setup complete');
        }
    },

    // ===== PUBLIC API =====
    // Track initialization state
    isInitialized: false,

    // Verify modal elements exist
    verifyModalElements() {
        const customerModal = document.getElementById('customerModal');
        const deleteModal = document.getElementById('deleteCustomerModal');
        
        if (!customerModal) {
            console.error('❌ Customer modal element not found in DOM');
            return false;
        }
        
        if (!deleteModal) {
            console.error('❌ Delete customer modal element not found in DOM');
            return false;
        }
        
        console.log('✅ Customer modal elements verified');
        return true;
    },

    // Initialize module
    async init() {
        try {
            // Prevent multiple initialization
            if (this.isInitialized) {
                console.log('⚠️ Customer module already initialized, skipping...');
                return true;
            }

            console.log('🎯 Initializing Customer Management Module...');
            
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
                console.error('❌ Database not ready for customer module');
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
            
            console.log('✅ Customer Management Module initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Error initializing customer module:', error);
            return false;
        }
    },

    // Refresh everything
    async refresh() {
        await this.database.loadAll();
        this.filter.apply();
        
        // Update dropdowns in other modules
        if (window.populateCustomerDropdowns) {
            await window.populateCustomerDropdowns();
        }
    }
};
        
// ===== LEGACY FUNCTIONS FOR BACKWARD COMPATIBILITY =====
// These functions maintain compatibility with existing code

async function addCustomer(customerData) {
    return await CustomerModule.database.add(customerData);
}

async function updateCustomer(customerId, customerData) {
    return await CustomerModule.database.update(customerId, customerData);
}

async function deleteCustomer(customerId) {
    return await CustomerModule.database.delete(customerId);
}

async function getCustomerById(customerId) {
    return await CustomerModule.database.get(customerId);
}

async function displayCustomers() {
    await CustomerModule.database.loadAll();
    await CustomerModule.ui.render();
}

async function searchCustomers(keyword) {
    const searchInput = document.getElementById('customer-search');
    if (searchInput) {
        searchInput.value = keyword;
        CustomerModule.filter.apply();
    }
}

async function populateCustomerDropdowns() {
    try {
        // Đảm bảo DB đã sẵn sàng
        const db = await CustomerModule.utils.waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }
        
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
        console.error('❌ Error populating customer dropdowns:', error);
    }
}

async function showEditCustomerForm(customerId) {
    await CustomerModule.actions.edit(customerId);
}

function resetCustomerForm() {
    CustomerModule.form.resetToAdd();
}

function setupCustomerEventListeners() {
    // Legacy function - now handled by module
    console.log('📞 setupCustomerEventListeners called - using modern module');
}

function createCustomerSearchBox() {
    // Legacy function - search is now part of modern UI
    console.log('📞 createCustomerSearchBox called - using modern module UI');
}

// Wait for database function
async function waitForDB() {
    return await CustomerModule.utils.waitForDB();
}

// ===== MODULE INITIALIZATION =====
window.loadCustomerModule = async function() {
    try {
        // Prevent multiple initialization
        if (window.customerModuleLoaded) {
            console.log('⚠️ Customer module already loaded, skipping...');
            return true;
        }

        const success = await CustomerModule.init();
        
        if (success) {
            // Register global functions for other modules
            window.populateCustomerDropdowns = populateCustomerDropdowns;
            
            // Export module globally for debugging
            window.CustomerModule = CustomerModule;
            
            // Mark as loaded globally
            window.customerModuleLoaded = true;
        
            console.log('🚀 Customer Module ready and global functions registered');
        }
        
        return success;
    } catch (error) {
        console.error('❌ Failed to load customer module:', error);
        return false;
    }
};

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.loadCustomerModule);
} else {
    // DOM already loaded
    setTimeout(window.loadCustomerModule, 100);
}
