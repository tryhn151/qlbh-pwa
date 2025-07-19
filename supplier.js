// ===== SUPPLIER MANAGEMENT MODULE =====
// Complete supplier management with modern UI and validation
// Senior JS Developer: All-in-one approach for better maintainability

// ===== MODULE STRUCTURE =====
const SupplierModule = {
    // Data storage
    data: {
        currentSuppliers: [],
        filteredSuppliers: [],
        supplierToDelete: null
    },

    // Configuration
    config: {
        validationRules: {
            name: {
                required: true,
                minLength: 2,
                maxLength: 100,
                pattern: /^[a-zA-ZàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s0-9\-\.]+$/,
                message: 'Tên nhà cung cấp phải từ 2-100 ký tự, chỉ chứa chữ cái, số, dấu gạch ngang và dấu chấm'
            },
            region: {
                required: false,
                maxLength: 50,
                pattern: /^[a-zA-ZàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s\-\.]+$/,
                message: 'Khu vực không được quá 50 ký tự và chỉ chứa chữ cái, dấu gạch ngang và dấu chấm'
            },
            contact: {
                required: false,
                pattern: /^0(3[2-9]|5[689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/,
                message: 'Số điện thoại không đúng định dạng (VD: 0912345678)'
            },
            address: {
                required: false,
                maxLength: 200,
                message: 'Địa chỉ không được quá 200 ký tự'
            }
        },
        fieldDisplayNames: {
            name: 'Tên nhà cung cấp',
            region: 'Khu vực',
            contact: 'Số điện thoại',
            address: 'Địa chỉ'
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
                        const tx = window.db.transaction('suppliers', 'readonly');
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
                            const tx = window.db.transaction('suppliers', 'readonly');
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
                
                console.log('🧹 Cleaned up all supplier modals');
            } catch (error) {
                console.log('⚠️ Error during supplier modal cleanup:', error);
            }
        }
    },

    // ===== VALIDATION SYSTEM =====
    validation: {
        // Validate single field
        validateField(fieldName, value) {
            const rule = SupplierModule.config.validationRules[fieldName];
            if (!rule) return { valid: true };

            const trimmedValue = value.trim();
            
            // Required check
            if (rule.required && !trimmedValue) {
                return { 
                    valid: false, 
                    message: `${SupplierModule.config.fieldDisplayNames[fieldName]} là bắt buộc` 
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
                    message: `${SupplierModule.config.fieldDisplayNames[fieldName]} phải có ít nhất ${rule.minLength} ký tự` 
                };
            }

            // Max length check
            if (rule.maxLength && trimmedValue.length > rule.maxLength) {
                return { 
                    valid: false, 
                    message: `${SupplierModule.config.fieldDisplayNames[fieldName]} không được quá ${rule.maxLength} ký tự` 
                };
            }

            // Pattern check
            if (rule.pattern && !rule.pattern.test(trimmedValue)) {
                return { valid: false, message: rule.message };
            }

            return { valid: true };
        },

        // Check duplicate name
        async checkDuplicateName(name, excludeId = null) {
            const trimmedName = name.trim().toLowerCase();
            return SupplierModule.data.currentSuppliers.some(supplier => 
                supplier.name.toLowerCase() === trimmedName && 
                supplier.id !== excludeId
            );
        },

        // Validate entire form
        async validateForm(formData, editId = null) {
            const errors = [];

            // Validate each field
            for (const fieldName in formData) {
                const validation = SupplierModule.validation.validateField(fieldName, formData[fieldName]);
                if (!validation.valid) {
                    errors.push(validation.message);
                }
            }

            // Check for duplicate name
            if (formData.name.trim()) {
                const isDuplicate = await SupplierModule.validation.checkDuplicateName(formData.name, editId);
                if (isDuplicate) {
                    errors.push('Tên nhà cung cấp đã tồn tại');
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
        // Add supplier
        async add(supplierData) {
            try {
                const db = await SupplierModule.utils.waitForDB();
                if (!db) {
                    throw new Error('Không thể kết nối đến cơ sở dữ liệu');
                }

                // Backend validation
                if (!supplierData.name || !supplierData.name.trim()) {
                    throw new Error('Tên nhà cung cấp là bắt buộc');
                }

                // Normalize data
                const normalizedData = {
                    name: supplierData.name.trim(),
                    region: supplierData.region ? supplierData.region.trim() : '',
                    address: supplierData.address ? supplierData.address.trim() : '',
                    contact: supplierData.contact ? supplierData.contact.trim() : '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const tx = db.transaction('suppliers', 'readwrite');
                const store = tx.objectStore('suppliers');
                
                const id = await store.add(normalizedData);
                await tx.done;
                
                console.log('✅ Added supplier with ID:', id);
                return id;
            } catch (error) {
                console.error('❌ Error adding supplier:', error);
                throw error;
            }
        },

        // Update supplier
        async update(supplierId, supplierData) {
            try {
                const db = await SupplierModule.utils.waitForDB();
                if (!db) {
                    throw new Error('Không thể kết nối đến cơ sở dữ liệu');
                }

                // Backend validation
                if (!supplierData.name || !supplierData.name.trim()) {
                    throw new Error('Tên nhà cung cấp là bắt buộc');
                }

                const tx = db.transaction('suppliers', 'readwrite');
                const store = tx.objectStore('suppliers');
                
                // Get existing supplier
                const existingSupplier = await store.get(supplierId);
                if (!existingSupplier) {
                    throw new Error('Không tìm thấy nhà cung cấp');
                }
                
                // Normalize and update data
                const normalizedData = {
                    name: supplierData.name.trim(),
                    region: supplierData.region ? supplierData.region.trim() : '',
                    address: supplierData.address ? supplierData.address.trim() : '',
                    contact: supplierData.contact ? supplierData.contact.trim() : '',
                    updated_at: new Date().toISOString()
                };

                const updatedSupplier = { 
                    ...existingSupplier, 
                    ...normalizedData 
                };
                
                await store.put(updatedSupplier);
                await tx.done;
                
                console.log('✅ Updated supplier with ID:', supplierId);
                return true;
            } catch (error) {
                console.error('❌ Error updating supplier:', error);
                throw error;
            }
        },

        // Delete supplier
        async delete(supplierId) {
            try {
                const db = await SupplierModule.utils.waitForDB();
                if (!db) {
                    throw new Error('Không thể kết nối đến cơ sở dữ liệu');
                }

                const tx = db.transaction('suppliers', 'readwrite');
                const store = tx.objectStore('suppliers');
                
                await store.delete(supplierId);
                await tx.done;
                
                console.log('✅ Deleted supplier with ID:', supplierId);
                return true;
            } catch (error) {
                console.error('❌ Error deleting supplier:', error);
                throw error;
            }
        },

        // Get single supplier
        async get(supplierId) {
            try {
                const db = await SupplierModule.utils.waitForDB();
                if (!db) return null;

                const tx = db.transaction('suppliers', 'readonly');
                const store = tx.objectStore('suppliers');
                return await store.get(supplierId);
            } catch (error) {
                console.error('❌ Error getting supplier:', error);
                return null;
            }
        },

        // Load all suppliers
        async loadAll() {
            try {
                const db = await SupplierModule.utils.waitForDB();
                if (!db) return;

                const tx = db.transaction('suppliers', 'readonly');
                const store = tx.objectStore('suppliers');
                SupplierModule.data.currentSuppliers = await store.getAll();
                SupplierModule.data.filteredSuppliers = [...SupplierModule.data.currentSuppliers];
                
                console.log(`📊 Loaded ${SupplierModule.data.currentSuppliers.length} suppliers`);
            } catch (error) {
                console.error('❌ Error loading suppliers:', error);
                SupplierModule.data.currentSuppliers = [];
                SupplierModule.data.filteredSuppliers = [];
            }
        }
    },

    // ===== UI COMPONENTS =====
    ui: {
        // Update suppliers count
        updateCount() {
            const countElement = document.getElementById('suppliers-count');
            if (countElement) {
                countElement.textContent = SupplierModule.data.filteredSuppliers.length;
            }
        },

        // Update region filter options
        updateRegionFilter() {
            const regionFilter = document.getElementById('region-filter');
            if (!regionFilter) return;

            const regions = [...new Set(SupplierModule.data.currentSuppliers
                .map(s => s.region)
                .filter(region => region && region.trim())
            )].sort();

            const currentValue = regionFilter.value;
            regionFilter.innerHTML = '<option value="">Tất cả khu vực</option>';
            
            regions.forEach(region => {
                const option = document.createElement('option');
                option.value = region;
                option.textContent = region;
                regionFilter.appendChild(option);
            });

            regionFilter.value = currentValue;
        },

        // Render desktop table
        renderDesktopTable() {
            const tableBody = document.getElementById('suppliers-list');
            if (!tableBody) return;

            // Sửa header bảng desktop cho giống report.js
            const table = tableBody.closest('table');
            if (table) {
                const thead = table.querySelector('thead');
                if (thead) {
                    thead.innerHTML = `
                        <tr class="align-middle table-primary">
                            <th class="text-center" scope="col" style="width: 80px;"><i class="bi bi-hash"></i></th>
                            <th scope="col"><i class="bi bi-building me-2"></i>Tên nhà cung cấp</th>
                            <th class="text-center" scope="col" style="width: 150px;"><i class="bi bi-geo-alt me-2"></i>Khu vực</th>
                            <th scope="col"><i class="bi bi-house me-2"></i>Địa chỉ</th>
                            <th class="text-center" scope="col" style="width: 180px;"><i class="bi bi-telephone me-2"></i>Liên hệ</th>
                            <th class="text-center" scope="col" style="width: 150px;"><i class="bi bi-gear me-2"></i>Thao tác</th>
                        </tr>
                    `;
                }
            }

            tableBody.innerHTML = '';

            SupplierModule.data.filteredSuppliers.forEach(supplier => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="text-center fw-bold">${supplier.id}</td>
                    <td class="text-start">
                        <div class="fw-bold text-primary">${SupplierModule.utils.safeValue(supplier.name)}</div>
                    </td>
                    <td class="text-center">
                        <span class="badge bg-secondary">${SupplierModule.utils.safeValue(supplier.region, 'Chưa có')}</span>
                    </td>
                    <td class="text-start">
                        <small class="text-muted">${SupplierModule.utils.safeValue(supplier.address, 'Chưa có địa chỉ')}</small>
                    </td>
                    <td class="text-center">
                        <div class="d-flex align-items-center justify-content-center">
                            <i class="bi bi-telephone me-2 text-success"></i>
                            <span>${SupplierModule.utils.safeValue(supplier.contact, 'Chưa có')}</span>
                        </div>
                    </td>
                    <td class="text-center">
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="SupplierModule.actions.edit(${supplier.id})">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="SupplierModule.actions.confirmDelete(${supplier.id})">
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
            const mobileContainer = document.getElementById('suppliers-mobile-list');
            if (!mobileContainer) return;

            mobileContainer.innerHTML = '';

            SupplierModule.data.filteredSuppliers.forEach(supplier => {
                const card = document.createElement('div');
                card.className = 'card mb-3 border-0 shadow-sm';
                card.innerHTML = `
                    <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <div class="fw-bold">
                            <i class="bi bi-building me-2"></i>${SupplierModule.utils.safeValue(supplier.name)}
                        </div>
                        <span class="badge bg-light text-dark">#${supplier.id}</span>
                    </div>
                    <div class="card-body">
                        <div class="row g-2 mb-3">
                            <div class="col-12">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-geo-alt text-secondary me-2"></i>
                                    <span class="text-muted">Khu vực:</span>
                                    <span class="ms-2 fw-bold">${SupplierModule.utils.safeValue(supplier.region, 'Chưa có')}</span>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-telephone text-success me-2"></i>
                                    <span class="text-muted">Liên hệ:</span>
                                    <span class="ms-2">${SupplierModule.utils.safeValue(supplier.contact, 'Chưa có')}</span>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="d-flex align-items-start">
                                    <i class="bi bi-house text-info me-2 mt-1"></i>
                                    <div>
                                        <span class="text-muted">Địa chỉ:</span>
                                        <div class="small">${SupplierModule.utils.safeValue(supplier.address, 'Chưa có địa chỉ')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                            <button class="btn btn-outline-primary btn-sm" onclick="SupplierModule.actions.edit(${supplier.id})">
                                <i class="bi bi-pencil me-1"></i>Sửa
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="SupplierModule.actions.confirmDelete(${supplier.id})">
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
            const noSuppliersMessage = document.getElementById('no-suppliers-message');
            const noSearchResults = document.getElementById('no-search-results');
            const searchInput = document.getElementById('supplier-search');
            const regionFilter = document.getElementById('region-filter');

            const hasData = SupplierModule.data.filteredSuppliers.length > 0;
            const hasSearchTerm = (searchInput && searchInput.value.trim()) || 
                                 (regionFilter && regionFilter.value);

            if (noSuppliersMessage) {
                noSuppliersMessage.style.display = !hasData && !hasSearchTerm ? 'block' : 'none';
            }

            if (noSearchResults) {
                noSearchResults.style.display = !hasData && hasSearchTerm ? 'block' : 'none';
            }
        },

        // Main render function
        async render() {
            this.updateCount();
            this.updateRegionFilter();
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
            const form = document.getElementById('supplier-form');
            const modalTitle = document.getElementById('supplierModalLabel');
            const submitButton = document.getElementById('supplier-submit-btn');
            
            if (form) {
                form.reset();
                form.removeAttribute('data-edit-id');
            }
            
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="bi bi-building me-2"></i>Thêm nhà cung cấp mới';
            }
            
            if (submitButton) {
                submitButton.textContent = 'Lưu nhà cung cấp';
            }

            this.clearValidationErrors();
        },

        // Setup for edit mode
        setupEdit(supplier) {
            const form = document.getElementById('supplier-form');
            const modalTitle = document.getElementById('supplierModalLabel');
            const submitButton = document.getElementById('supplier-submit-btn');
            
            if (form) {
                form.setAttribute('data-edit-id', supplier.id);
                
                document.getElementById('supplier-name').value = supplier.name || '';
                document.getElementById('supplier-region').value = supplier.region || '';
                document.getElementById('supplier-address').value = supplier.address || '';
                document.getElementById('supplier-contact').value = supplier.contact || '';
            }
            
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="bi bi-pencil me-2"></i>Chỉnh sửa nhà cung cấp';
            }
            
            if (submitButton) {
                submitButton.textContent = 'Cập nhật nhà cung cấp';
            }

            this.clearValidationErrors();
        },

        // Clear validation errors
        clearValidationErrors() {
            const fields = ['supplier-name', 'supplier-region', 'supplier-contact', 'supplier-address'];
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
            const fields = ['supplier-name', 'supplier-region', 'supplier-contact', 'supplier-address'];
            
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
            const fieldName = fieldId.replace('supplier-', '');
            const value = event.target.value;
            
            const validation = SupplierModule.validation.validateField(fieldName, value);
            SupplierModule.form.showFieldValidation(fieldId, validation);
        },

        // Handle field input (clear errors on typing)
        handleFieldInput(event) {
            const fieldId = event.target.id;
            SupplierModule.form.clearFieldValidation(fieldId);
        }
    },

    // ===== FILTER SYSTEM =====
    filter: {
        // Apply filters
        apply() {
            const searchTerm = document.getElementById('supplier-search')?.value.toLowerCase().trim() || '';
            const regionFilter = document.getElementById('region-filter')?.value || '';

            SupplierModule.data.filteredSuppliers = SupplierModule.data.currentSuppliers.filter(supplier => {
                const matchesSearch = !searchTerm || 
                    supplier.name.toLowerCase().includes(searchTerm) ||
                    (supplier.region && supplier.region.toLowerCase().includes(searchTerm)) ||
                    (supplier.contact && supplier.contact.toLowerCase().includes(searchTerm)) ||
                    (supplier.address && supplier.address.toLowerCase().includes(searchTerm));

                const matchesRegion = !regionFilter || supplier.region === regionFilter;

                return matchesSearch && matchesRegion;
            });

            SupplierModule.ui.render();
        }
    },

    // ===== USER ACTIONS =====
    actions: {
        // Add supplier
        async add() {
            const form = document.getElementById('supplier-form');
            const formData = {
                name: document.getElementById('supplier-name').value.trim(),
                region: document.getElementById('supplier-region').value.trim(),
                address: document.getElementById('supplier-address').value.trim(),
                contact: document.getElementById('supplier-contact').value.trim()
            };

            // Clear validation errors
            SupplierModule.form.clearValidationErrors();

            // Validate form
            const validation = await SupplierModule.validation.validateForm(formData);
            if (!validation.valid) {
                SupplierModule.ui.showErrors(validation.errors);
                return;
            }

            try {
                const id = await SupplierModule.database.add(formData);
                if (id) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('supplierModal'));
                    if (modal) {
                        modal.hide();
                    }

                    // Reload and refresh
                    await SupplierModule.database.loadAll();
                    await SupplierModule.refresh();
                    
                    // Update product supplier dropdowns immediately
                    if (window.populateProductSupplierDropdowns) {
                        await window.populateProductSupplierDropdowns();
                    }
                    
                    SupplierModule.ui.showSuccess('Thêm nhà cung cấp thành công!');
                }
            } catch (error) {
                SupplierModule.ui.showErrors([`Có lỗi xảy ra: ${error.message}`]);
            }
        },

        // Edit supplier
        async edit(supplierId) {
            try {
                const supplier = await SupplierModule.database.get(supplierId);
                if (!supplier) {
                    SupplierModule.ui.showErrors(['Không tìm thấy thông tin nhà cung cấp!']);
                    return;
                }
                
                // Setup form for edit
                SupplierModule.form.setupEdit(supplier);
                
                // Show modal directly without cleanup (let Bootstrap handle it)
                const modal = document.getElementById('supplierModal');
                if (modal) {
                    try {
                        const bsModal = new bootstrap.Modal(modal);
                        bsModal.show();
                    } catch (error) {
                        console.error('❌ Error showing supplier modal:', error);
                        SupplierModule.ui.showErrors(['Có lỗi khi mở form chỉnh sửa. Vui lòng thử lại.']);
                    }
                } else {
                    console.error('❌ Supplier modal element not found');
                    SupplierModule.ui.showErrors(['Không tìm thấy form chỉnh sửa. Vui lòng tải lại trang.']);
                }
            } catch (error) {
                console.error('❌ Error in edit supplier:', error);
                SupplierModule.ui.showErrors(['Có lỗi khi chỉnh sửa nhà cung cấp. Vui lòng thử lại.']);
            }
        },

        // Update supplier
        async update() {
            const form = document.getElementById('supplier-form');
            const editId = parseInt(form.getAttribute('data-edit-id'));
            
            const formData = {
                name: document.getElementById('supplier-name').value.trim(),
                region: document.getElementById('supplier-region').value.trim(),
                address: document.getElementById('supplier-address').value.trim(),
                contact: document.getElementById('supplier-contact').value.trim()
            };

            // Clear validation errors
            SupplierModule.form.clearValidationErrors();

            // Validate form
            const validation = await SupplierModule.validation.validateForm(formData, editId);
            if (!validation.valid) {
                SupplierModule.ui.showErrors(validation.errors);
                return;
            }

            try {
                const success = await SupplierModule.database.update(editId, formData);
                if (success) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('supplierModal'));
                    if (modal) {
                        modal.hide();
                    }

                    // Reload and refresh
                    await SupplierModule.database.loadAll();
                    await SupplierModule.refresh();
                    
                    // Update product supplier dropdowns immediately
                    if (window.populateProductSupplierDropdowns) {
                        await window.populateProductSupplierDropdowns();
                    }
                    
                    SupplierModule.ui.showSuccess('Cập nhật nhà cung cấp thành công!');
                }
            } catch (error) {
                SupplierModule.ui.showErrors([`Có lỗi xảy ra: ${error.message}`]);
            }
        },

        // Confirm delete
        confirmDelete(supplierId) {
            try {
                const supplier = SupplierModule.data.currentSuppliers.find(s => s.id === supplierId);
                if (!supplier) return;

                SupplierModule.data.supplierToDelete = supplier;

                // Update delete modal content
                const nameElement = document.getElementById('delete-supplier-name');
                const detailsElement = document.getElementById('delete-supplier-details');

                if (nameElement) nameElement.textContent = supplier.name;
                if (detailsElement) {
                    detailsElement.textContent = `${supplier.region || 'Chưa có khu vực'} • ${supplier.contact || 'Chưa có liên hệ'}`;
                }

                // Show delete modal safely
                const modal = document.getElementById('deleteSupplierModal');
                if (modal) {
                    try {
                        const bsModal = new bootstrap.Modal(modal);
                        bsModal.show();
                    } catch (error) {
                        console.error('❌ Error showing delete supplier modal:', error);
                        SupplierModule.ui.showErrors(['Có lỗi khi mở dialog xác nhận xóa. Vui lòng thử lại.']);
                    }
                } else {
                    console.error('❌ Delete supplier modal element not found');
                    SupplierModule.ui.showErrors(['Không tìm thấy dialog xác nhận xóa. Vui lòng tải lại trang.']);
                }
            } catch (error) {
                console.error('❌ Error in confirm delete supplier:', error);
                SupplierModule.ui.showErrors(['Có lỗi khi xác nhận xóa nhà cung cấp. Vui lòng thử lại.']);
            }
        },

        // Delete supplier
        async delete() {
            const supplier = SupplierModule.data.supplierToDelete;
            if (!supplier) return;

            try {
                const success = await SupplierModule.database.delete(supplier.id);
                if (success) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteSupplierModal'));
                    if (modal) {
                        modal.hide();
                    }

                    // Reload and refresh
                    await SupplierModule.database.loadAll();
                    await SupplierModule.refresh();
                    SupplierModule.ui.showSuccess('Xóa nhà cung cấp thành công!');
                }
            } catch (error) {
                SupplierModule.ui.showErrors([`Có lỗi xảy ra khi xóa: ${error.message}`]);
            } finally {
                SupplierModule.data.supplierToDelete = null;
            }
        },

        // Handle form submit
        async handleFormSubmit(event) {
            event.preventDefault();
            
            const form = document.getElementById('supplier-form');
            const submitButton = document.getElementById('supplier-submit-btn');
            
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
            await SupplierModule.database.loadAll();
            SupplierModule.filter.apply();
            
            // Update other modules if needed
            if (window.populateSupplierDropdowns) {
                await window.populateSupplierDropdowns();
            }
            
            // Update product supplier dropdowns
            if (window.populateProductSupplierDropdowns) {
                await window.populateProductSupplierDropdowns();
            }
        }
    },

    // ===== EVENT LISTENERS =====
    events: {
        // Track if events are already setup
        initialized: false,

        // Remove existing event listeners
        cleanup() {
            const addBtn = document.getElementById('add-supplier-btn');
            const refreshBtn = document.getElementById('refresh-suppliers-btn');
            const searchInput = document.getElementById('supplier-search');
            const regionFilter = document.getElementById('region-filter');
            const supplierForm = document.getElementById('supplier-form');
            const confirmDeleteBtn = document.getElementById('confirm-delete-supplier');

            // Remove existing listeners
            if (addBtn) addBtn.replaceWith(addBtn.cloneNode(true));
            if (refreshBtn) refreshBtn.replaceWith(refreshBtn.cloneNode(true));
            if (searchInput) searchInput.replaceWith(searchInput.cloneNode(true));
            if (regionFilter) regionFilter.replaceWith(regionFilter.cloneNode(true));
            if (supplierForm) supplierForm.replaceWith(supplierForm.cloneNode(true));
            if (confirmDeleteBtn) confirmDeleteBtn.replaceWith(confirmDeleteBtn.cloneNode(true));
        },

        // Setup all event listeners
        setup() {
            // Prevent multiple initialization
            if (this.initialized) {
                console.log('⚠️ Event listeners already initialized, skipping...');
                return;
            }

            // Cleanup any existing listeners
            this.cleanup();

            // Add supplier button
            const addBtn = document.getElementById('add-supplier-btn');
            if (addBtn) {
                addBtn.addEventListener('click', (event) => {
                    // Prevent any default behavior
                    event.preventDefault();
                    
                    // Reset form first
                    SupplierModule.form.resetToAdd();
                    
                    // Show modal directly without cleanup (let Bootstrap handle it)
                    const modal = document.getElementById('supplierModal');
                    if (modal) {
                        try {
                            const bsModal = new bootstrap.Modal(modal);
                            bsModal.show();
                        } catch (error) {
                            console.error('❌ Error showing add supplier modal:', error);
                            SupplierModule.ui.showErrors(['Có lỗi khi mở form thêm nhà cung cấp. Vui lòng thử lại.']);
                        }
                    } else {
                        console.error('❌ Supplier modal element not found');
                        SupplierModule.ui.showErrors(['Không tìm thấy form thêm nhà cung cấp. Vui lòng tải lại trang.']);
                    }
                });
            }

            // Refresh button
            const refreshBtn = document.getElementById('refresh-suppliers-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', async () => {
                    await SupplierModule.actions.refresh();
                    
                    // Loading animation
                    refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2 spin"></i>Đang tải...';
                    setTimeout(() => {
                        refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Làm mới';
                    }, 1000);
                });
            }

            // Search input
            const searchInput = document.getElementById('supplier-search');
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    SupplierModule.filter.apply();
                });
            }

            // Region filter
            const regionFilter = document.getElementById('region-filter');
            if (regionFilter) {
                regionFilter.addEventListener('change', () => {
                    SupplierModule.filter.apply();
                });
            }

            // Form submit
            const supplierForm = document.getElementById('supplier-form');
            if (supplierForm) {
                supplierForm.addEventListener('submit', (event) => {
                    SupplierModule.actions.handleFormSubmit(event);
                });
            }

            // Delete confirmation
            const confirmDeleteBtn = document.getElementById('confirm-delete-supplier');
            if (confirmDeleteBtn) {
                confirmDeleteBtn.addEventListener('click', () => {
                    SupplierModule.actions.delete();
                });
                        }
        
            // Modal events
            const supplierModal = document.getElementById('supplierModal');
            if (supplierModal) {
                supplierModal.addEventListener('show.bs.modal', (event) => {
                    console.log('🎯 Supplier modal opening...');
                    
                    // Setup real-time validation
                    SupplierModule.form.setupRealTimeValidation();
                    
                    // Ensure modal is properly initialized
                    setTimeout(() => {
                        const firstField = document.getElementById('supplier-name');
                        if (firstField) {
                            firstField.focus();
                        }
                    }, 300);
                });
                
                supplierModal.addEventListener('shown.bs.modal', (event) => {
                    console.log('✅ Supplier modal opened successfully');
                });
                
                supplierModal.addEventListener('hide.bs.modal', (event) => {
                    console.log('🔄 Supplier modal closing...');
                });
                
                supplierModal.addEventListener('hidden.bs.modal', (event) => {
                    console.log('✅ Supplier modal closed');
                    
                    // Reset form and clear validation
                    SupplierModule.form.resetToAdd();
                    SupplierModule.form.clearValidationErrors();
                    
                    // Cleanup with delay to ensure modal is fully hidden
                    setTimeout(() => {
                        SupplierModule.utils.cleanupAllModals();
                    }, 150);
                });
            }   

            const deleteModal = document.getElementById('deleteSupplierModal');
            if (deleteModal) {
                deleteModal.addEventListener('hidden.bs.modal', (event) => {
                    console.log('✅ Delete supplier modal closed');
                    
                    // Clear delete data
                    SupplierModule.data.supplierToDelete = null;
                    
                    // Cleanup with delay
                    setTimeout(() => {
                        SupplierModule.utils.cleanupAllModals();
                    }, 150);
                });
            }

            // Mark as initialized
            this.initialized = true;
            console.log('✅ Supplier event listeners setup complete');
        }
    },

    // ===== PUBLIC API =====
    // Track initialization state
    isInitialized: false,

            // Verify modal elements exist
        verifyModalElements() {
            const supplierModal = document.getElementById('supplierModal');
            const deleteModal = document.getElementById('deleteSupplierModal');
            
            if (!supplierModal) {
                console.error('❌ Supplier modal element not found in DOM');
                return false;
            }
            
            if (!deleteModal) {
                console.error('❌ Delete supplier modal element not found in DOM');
                return false;
            }
            
            // Check if Bootstrap is available
            if (typeof bootstrap === 'undefined') {
                console.error('❌ Bootstrap not available');
                return false;
            }
            
            console.log('✅ Supplier modal elements verified');
            return true;
        },

    // Initialize module
    async init() {
        try {
            // Prevent multiple initialization
            if (this.isInitialized) {
                console.log('⚠️ Supplier module already initialized, skipping...');
                return true;
            }

            console.log('🎯 Initializing Supplier Management Module...');
            
            // Wait for Bootstrap to be available
            if (typeof bootstrap === 'undefined') {
                console.log('⏳ Waiting for Bootstrap to load...');
                await new Promise(resolve => {
                    const checkBootstrap = () => {
                        if (typeof bootstrap !== 'undefined') {
                            resolve();
                        } else {
                            setTimeout(checkBootstrap, 100);
                        }
                    };
                    checkBootstrap();
                });
            }
            

            
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
                console.error('❌ Database not ready for supplier module');
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
            
            console.log('✅ Supplier Management Module initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Error initializing supplier module:', error);
            return false;
        }
    },

    // Refresh everything
    async refresh() {
        await this.database.loadAll();
        this.filter.apply();
        
        // Update dropdowns in other modules
        if (window.populateSupplierDropdowns) {
            await window.populateSupplierDropdowns();
        }
    }
};

// ===== LEGACY FUNCTIONS FOR BACKWARD COMPATIBILITY =====
// These functions maintain compatibility with existing code

async function addSupplier(supplierData) {
    return await SupplierModule.database.add(supplierData);
}

async function updateSupplier(supplierId, supplierData) {
    return await SupplierModule.database.update(supplierId, supplierData);
}

async function deleteSupplier(supplierId) {
    return await SupplierModule.database.delete(supplierId);
}

async function getSupplier(supplierId) {
    return await SupplierModule.database.get(supplierId);
}

async function displaySuppliers() {
    await SupplierModule.database.loadAll();
    await SupplierModule.ui.render();
}

// ===== MODULE INITIALIZATION =====
window.loadSupplierModule = async function() {
    try {
        // Prevent multiple initialization
        if (window.supplierModuleLoaded) {
            console.log('⚠️ Supplier module already loaded, skipping...');
            return true;
        }

        // Ensure Bootstrap is loaded
        if (typeof bootstrap === 'undefined') {
            console.log('⏳ Waiting for Bootstrap to be available...');
            await new Promise(resolve => {
                const checkBootstrap = () => {
                    if (typeof bootstrap !== 'undefined') {
                        resolve();
                    } else {
                        setTimeout(checkBootstrap, 100);
                    }
                };
                checkBootstrap();
            });
        }

        const success = await SupplierModule.init();
        
        if (success) {
            // Register global functions for other modules
            window.populateSupplierDropdowns = async function() {
                // Implementation for populating dropdowns in other modules
                const dropdowns = document.querySelectorAll('[data-supplier-dropdown]');
                dropdowns.forEach(async (dropdown) => {
                    const currentValue = dropdown.value;
                    dropdown.innerHTML = '<option value="" selected disabled>Chọn nhà cung cấp</option>';
                    
                    SupplierModule.data.currentSuppliers.forEach(supplier => {
                        const option = document.createElement('option');
                        option.value = supplier.id;
                        option.textContent = supplier.name;
                        dropdown.appendChild(option);
                    });
                    
                    dropdown.value = currentValue;
                });
            };
            
            // Export module globally for debugging
            window.SupplierModule = SupplierModule;
            
            // Mark as loaded globally
            window.supplierModuleLoaded = true;
        
            console.log('🚀 Supplier Module ready and global functions registered');
        }
        
        return success;
    } catch (error) {
        console.error('❌ Failed to load supplier module:', error);
        return false;
    }
};

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit more for Bootstrap to be fully loaded
        setTimeout(window.loadSupplierModule, 500);
    });
} else {
    // DOM already loaded, wait for Bootstrap
    setTimeout(window.loadSupplierModule, 500);
}
