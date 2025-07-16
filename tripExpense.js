// ===== TRIP EXPENSE MANAGEMENT MODULE =====
// Complete trip expense management with modern UI and validation
// Senior JS Developer: Following supplier.js pattern
// CRITICAL: Preserve ALL existing business logic

// ===== MODULE STRUCTURE =====
const TripExpenseModule = {
    // Data storage
    data: {
        currentExpenses: [],
        filteredExpenses: [],
        expenseToDelete: null,
        currentTripId: null
    },

    // Configuration
    config: {
        validationRules: {
            description: {
                required: false,
                minLength: 2,
                maxLength: 200,
                message: 'Mô tả chi phí phải từ 2-200 ký tự'
            },
            amount: {
                required: true,
                min: 1,
                max: 999999999,
                message: 'Số tiền phải từ 1 đến 999,999,999 VNĐ'
            },
            category: {
                required: true,
                message: 'Danh mục chi phí là bắt buộc'
            },
            date: {
                required: true,
                message: 'Ngày phát sinh là bắt buộc'
            }
        },
        fieldDisplayNames: {
            description: 'Mô tả chi phí',
            amount: 'Số tiền',
            category: 'Danh mục',
            date: 'Ngày phát sinh'
        },
        // Preserved: Original expense categories
        expenseCategories: [
            'Xăng dầu',
            'Phí cầu đường',
            'Ăn uống',
            'Lưu trú',
            'Lương tài xế',
            'Lương phụ xe',
            'Sửa chữa xe',
            'Bảo dưỡng xe',
            'Chi phí khác'
        ]
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
            if (typeof window.formatCurrency === 'function') {
                return window.formatCurrency(amount);
            }
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(amount);
        },

        // Format date
        formatDate(date) {
            if (typeof window.formatDate === 'function') {
                return window.formatDate(date);
            }
            if (!date) return '';
            const d = new Date(date);
            return d.toLocaleDateString('vi-VN');
        },

        // Wait for database
        async waitForDB() {
            return new Promise((resolve) => {
                if (window.db) {
                    try {
                        const tx = window.db.transaction('tripExpenses', 'readonly');
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
                            const tx = window.db.transaction('tripExpenses', 'readonly');
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
        }
    },

    // ===== VALIDATION SYSTEM =====
    validation: {
        // Validate single field
        validateField(fieldName, value) {
            const rule = TripExpenseModule.config.validationRules[fieldName];
            if (!rule) return { valid: true };

            // Required check
            if (rule.required && (!value || value.toString().trim() === '')) {
                return { 
                    valid: false, 
                    message: `${TripExpenseModule.config.fieldDisplayNames[fieldName]} là bắt buộc` 
                };
            }

            // Skip other validations if field is empty and not required
            if ((!value || value.toString().trim() === '') && !rule.required) {
                return { valid: true };
            }

            // Amount validation
            if (fieldName === 'amount') {
                const numValue = parseFloat(value);
                if (isNaN(numValue) || numValue < rule.min || numValue > rule.max) {
                    return { valid: false, message: rule.message };
                }
            }

            // String length validation
            if (fieldName === 'description') {
                const trimmedValue = value.toString().trim();
                if (trimmedValue.length > 0) {
                    if (rule.minLength && trimmedValue.length < rule.minLength) {
                        return { 
                            valid: false, 
                            message: `${TripExpenseModule.config.fieldDisplayNames[fieldName]} phải có ít nhất ${rule.minLength} ký tự` 
                        };
                    }
                    if (rule.maxLength && trimmedValue.length > rule.maxLength) {
                        return { 
                            valid: false, 
                            message: `${TripExpenseModule.config.fieldDisplayNames[fieldName]} không được quá ${rule.maxLength} ký tự` 
                        };
                    }
                }
            }

            // Category validation
            if (fieldName === 'category') {
                if (!TripExpenseModule.config.expenseCategories.includes(value)) {
                    return { valid: false, message: 'Danh mục chi phí không hợp lệ' };
                }
            }

            return { valid: true };
        },

        // Validate entire form
        async validateForm(formData) {
            const errors = [];

            // Validate each field
            for (const fieldName in formData) {
                const validation = TripExpenseModule.validation.validateField(fieldName, formData[fieldName]);
                if (!validation.valid) {
                    errors.push(validation.message);
                }
            }

            return {
                valid: errors.length === 0,
                errors: errors
            };
        }
    },

    // ===== PRESERVED BUSINESS LOGIC =====
    // All original functions preserved with exact same logic
    businessLogic: {
        // Preserved: Original addTripExpense function
        async addTripExpense(expenseData) {
            try {
                const db = await TripExpenseModule.utils.waitForDB();
                if (!db) {
                    throw new Error('Không thể kết nối đến cơ sở dữ liệu');
                }

                const tx = db.transaction('tripExpenses', 'readwrite');
                const store = tx.objectStore('tripExpenses');
                
                const id = await store.add(expenseData);
                await tx.done;
                
                console.log('Đã thêm chi phí phát sinh mới với ID:', id);
                
                // Cập nhật giao diện chi tiết chuyến hàng nếu đang mở
                const tripDetailContent = document.getElementById('trip-detail-content');
                if (tripDetailContent) {
                    const tripId = expenseData.tripId;
                    await updateTripExpensesTab(tripId);
                    await updateTripSummary(tripId);
                }
                
                // Cập nhật báo cáo
                if (typeof displayReports === 'function') {
                    await displayReports();
                }
                
                return id;
            } catch (error) {
                console.error('Lỗi khi thêm chi phí phát sinh:', error);
                return null;
            }
        },

        // Preserved: Original updateTripExpense function
        async updateTripExpense(expenseId, expenseData) {
            try {
                const db = await TripExpenseModule.utils.waitForDB();
                if (!db) {
                    throw new Error('Không thể kết nối đến cơ sở dữ liệu');
                }

                const tx = db.transaction('tripExpenses', 'readwrite');
                const store = tx.objectStore('tripExpenses');
                
                // Lấy chi phí hiện tại
                const existingExpense = await store.get(expenseId);
                if (!existingExpense) {
                    throw new Error('Không tìm thấy chi phí phát sinh');
                }
                
                // Lưu tripId để cập nhật giao diện sau khi cập nhật
                const tripId = existingExpense.tripId;
                
                // Cập nhật thông tin
                const updatedExpense = { ...existingExpense, ...expenseData };
                
                await store.put(updatedExpense);
                await tx.done;
                
                console.log('Đã cập nhật chi phí phát sinh với ID:', expenseId);
                
                // Cập nhật giao diện chi tiết chuyến hàng nếu đang mở
                const tripDetailContent = document.getElementById('trip-detail-content');
                if (tripDetailContent) {
                    await updateTripExpensesTab(tripId);
                    await updateTripSummary(tripId);
                }
                
                // Cập nhật báo cáo
                if (typeof displayReports === 'function') {
                    await displayReports();
                }
                
                return true;
            } catch (error) {
                console.error('Lỗi khi cập nhật chi phí phát sinh:', error);
                return false;
            }
        },

        // Preserved: Original deleteTripExpense function  
        async deleteTripExpense(expenseId) {
            try {
                const db = await TripExpenseModule.utils.waitForDB();
                if (!db) {
                    throw new Error('Không thể kết nối đến cơ sở dữ liệu');
                }

                const tx = db.transaction('tripExpenses', 'readwrite');
                const store = tx.objectStore('tripExpenses');
                
                // Lấy chi phí để biết tripId trước khi xóa
                const expense = await store.get(expenseId);
                if (!expense) {
                    throw new Error('Không tìm thấy chi phí phát sinh');
                }
                
                const tripId = expense.tripId;
                
                await store.delete(expenseId);
                await tx.done;
                
                console.log('Đã xóa chi phí phát sinh với ID:', expenseId);
                
                // Cập nhật giao diện chi tiết chuyến hàng nếu đang mở
                const tripDetailContent = document.getElementById('trip-detail-content');
                if (tripDetailContent) {
                    await updateTripExpensesTab(tripId);
                    await updateTripSummary(tripId);
                }
                
                // Cập nhật báo cáo
                if (typeof displayReports === 'function') {
                    await displayReports();
                }
                
                return true;
            } catch (error) {
                console.error('Lỗi khi xóa chi phí phát sinh:', error);
                return false;
            }
        },

        // Preserved: Original getTripExpenses function
        async getTripExpenses(tripId) {
            try {
                const db = await TripExpenseModule.utils.waitForDB();
                if (!db) return [];

                const tx = db.transaction('tripExpenses', 'readonly');
                const store = tx.objectStore('tripExpenses');
                const index = store.index('tripId');
                
                const expenses = await index.getAll(tripId);
                return expenses;
            } catch (error) {
                console.error('Lỗi khi lấy chi phí phát sinh của chuyến hàng:', error);
                return [];
            }
        },

        // Preserved: Original calculateTotalTripExpenses function
        async calculateTotalTripExpenses(tripId) {
            try {
                const expenses = await TripExpenseModule.businessLogic.getTripExpenses(tripId);
                const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
                return total;
            } catch (error) {
                console.error('Lỗi khi tính tổng chi phí phát sinh:', error);
                return 0;
            }
        },

        // Preserved: Original calculateTripExpensesByCategory function
        async calculateTripExpensesByCategory(tripId) {
            try {
                const expenses = await TripExpenseModule.businessLogic.getTripExpenses(tripId);
                
                // Tạo đối tượng để lưu tổng chi phí theo danh mục
                const expensesByCategory = {};
                
                // Khởi tạo tất cả danh mục với giá trị 0
                TripExpenseModule.config.expenseCategories.forEach(category => {
                    expensesByCategory[category] = 0;
                });
                
                // Tính tổng chi phí cho từng danh mục
                expenses.forEach(expense => {
                    const category = expense.category || 'Chi phí khác';
                    expensesByCategory[category] = (expensesByCategory[category] || 0) + expense.amount;
                });
                
                return expensesByCategory;
            } catch (error) {
                console.error('Lỗi khi tính chi phí phát sinh theo danh mục:', error);
                return {};
            }
        }
    },

    // ===== DATABASE OPERATIONS =====
    database: {
        // Add expense (modernized with validation)
        async add(expenseData) {
            try {
                const db = await TripExpenseModule.utils.waitForDB();
                if (!db) {
                    throw new Error('Không thể kết nối đến cơ sở dữ liệu');
                }

                // Backend validation
                
                if (!expenseData.amount || expenseData.amount <= 0) {
                    throw new Error('Số tiền phải lớn hơn 0');
                }

                // Normalize data
                const normalizedData = {
                    tripId: expenseData.tripId,
                    description: expenseData.description.trim(),
                    amount: parseFloat(expenseData.amount),
                    category: expenseData.category || 'Chi phí khác',
                    date: expenseData.date || new Date(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                // Use original business logic
                return await TripExpenseModule.businessLogic.addTripExpense(normalizedData);
            } catch (error) {
                console.error('❌ Error adding expense:', error);
                throw error;
            }
        },

        // Update expense (modernized with validation)
        async update(expenseId, expenseData) {
            try {
                const db = await TripExpenseModule.utils.waitForDB();
                if (!db) {
                    throw new Error('Không thể kết nối đến cơ sở dữ liệu');
                }

                // Backend validation
                
                if (!expenseData.amount || expenseData.amount <= 0) {
                    throw new Error('Số tiền phải lớn hơn 0');
                }

                // Normalize data
                const normalizedData = {
                    description: expenseData.description.trim(),
                    amount: parseFloat(expenseData.amount),
                    category: expenseData.category || 'Chi phí khác',
                    date: expenseData.date || new Date(),
                    updated_at: new Date().toISOString()
                };

                // Use original business logic
                return await TripExpenseModule.businessLogic.updateTripExpense(expenseId, normalizedData);
            } catch (error) {
                console.error('❌ Error updating expense:', error);
                throw error;
            }
        },

        // Delete expense (use original business logic)
        async delete(expenseId) {
            try {
                return await TripExpenseModule.businessLogic.deleteTripExpense(expenseId);
            } catch (error) {
                console.error('❌ Error deleting expense:', error);
                throw error;
            }
        },

        // Get expense by ID
        async get(expenseId) {
            try {
                const db = await TripExpenseModule.utils.waitForDB();
                if (!db) return null;

                const tx = db.transaction('tripExpenses', 'readonly');
                const store = tx.objectStore('tripExpenses');
                return await store.get(expenseId);
            } catch (error) {
                console.error('❌ Error getting expense:', error);
                return null;
            }
        },

        // Load expenses for a trip
        async loadForTrip(tripId) {
            try {
                TripExpenseModule.data.currentTripId = tripId;
                TripExpenseModule.data.currentExpenses = await TripExpenseModule.businessLogic.getTripExpenses(tripId);
                TripExpenseModule.data.filteredExpenses = [...TripExpenseModule.data.currentExpenses];
                
                console.log(`📊 Loaded ${TripExpenseModule.data.currentExpenses.length} expenses for trip ${tripId}`);
            } catch (error) {
                console.error('❌ Error loading expenses:', error);
                TripExpenseModule.data.currentExpenses = [];
                TripExpenseModule.data.filteredExpenses = [];
            }
        }
    },

    // ===== UI COMPONENTS =====
    ui: {
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
            const existingModal = document.getElementById('expenseValidationErrorModal');
            if (existingModal) {
                existingModal.remove();
            }

            const modalHTML = `
                <div class="modal fade" id="expenseValidationErrorModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content border-0 shadow-lg">
                            <div class="modal-header bg-danger text-white border-0">
                                <h5 class="modal-title">
                                    <i class="bi bi-exclamation-triangle-fill me-2"></i>Lỗi nhập liệu chi phí
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body py-4">
                                <div class="text-center mb-3">
                                    <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
                                </div>
                                <h6 class="text-center mb-3">Vui lòng kiểm tra lại thông tin chi phí:</h6>
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
            
            const modal = new bootstrap.Modal(document.getElementById('expenseValidationErrorModal'));
            modal.show();
            
            document.getElementById('expenseValidationErrorModal').addEventListener('hidden.bs.modal', function () {
                this.remove();
            });
        },

        // Create expense category dropdown
        createExpenseCategoryDropdown() {
            const categorySelect = document.getElementById('expense-category');
            if (!categorySelect) return;
            
            // Xóa tất cả các option hiện tại
            categorySelect.innerHTML = '';
            
            // Thêm các option mới
            TripExpenseModule.config.expenseCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
            
            console.log('✅ Created expense category dropdown');
        },

        // Modern confirm dialog (Promise-based) - tham khảo từ supplier.js
        async confirm(message) {
            // Remove old modal if exists
            const existingModal = document.getElementById('expenseConfirmModal');
            if (existingModal) existingModal.remove();

            return new Promise((resolve) => {
                const modalHtml = `
                    <div class="modal fade" id="expenseConfirmModal" tabindex="-1" aria-labelledby="expenseConfirmModalLabel" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered">
                            <div class="modal-content border-0 shadow-lg">
                                <div class="modal-header bg-warning text-dark border-0">
                                    <h5 class="modal-title" id="expenseConfirmModalLabel">
                                        <i class="bi bi-question-circle-fill me-2"></i>Xác nhận thao tác
                                    </h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body py-4">
                                    <div class="text-center">
                                        <div class="text-warning mb-3">
                                            <i class="bi bi-question-circle" style="font-size: 3rem;"></i>
                                        </div>
                                        <h5 class="mb-3">${message}</h5>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="expenseConfirmCancel">Hủy</button>
                                    <button type="button" class="btn btn-danger" id="expenseConfirmOk">Xác nhận</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                const modalEl = document.getElementById('expenseConfirmModal');
                const modal = new bootstrap.Modal(modalEl);
                modal.show();

                // Xử lý nút xác nhận
                document.getElementById('expenseConfirmOk').onclick = () => {
                    resolve(true);
                    modal.hide();
                };
                // Xử lý nút hủy
                document.getElementById('expenseConfirmCancel').onclick = () => {
                    resolve(false);
                    modal.hide();
                };
                // Khi modal đóng thì reject nếu chưa chọn
                modalEl.addEventListener('hidden.bs.modal', function () {
                    setTimeout(() => {
                        if (document.getElementById('expenseConfirmModal')) {
                            document.getElementById('expenseConfirmModal').remove();
                        }
                    }, 200);
                });
            });
        }
    },

    // ===== FORM HANDLING =====
    form: {
        // Reset form to add mode
        resetToAdd() {
            const form = document.getElementById('add-expense-form');
            if (form) {
                form.reset();
                form.removeAttribute('data-edit-id');
                
                // Set today's date as default
                const dateInput = document.getElementById('expense-date');
                if (dateInput) {
                    dateInput.valueAsDate = new Date();
                }
                
                // Reset submit button
                const submitButton = form.querySelector('button[type="submit"]');
                if (submitButton) {
                    submitButton.textContent = 'Thêm chi phí';
                }
                
                // Hide cancel button
                const cancelButton = document.getElementById('cancel-edit-expense');
                if (cancelButton) {
                    cancelButton.style.display = 'none';
                }
            }
            
            this.clearValidationErrors();
        },

        // Setup for edit mode
        setupEdit(expense) {
            const form = document.getElementById('add-expense-form');
            if (form) {
                form.setAttribute('data-edit-id', expense.id);
                
                document.getElementById('expense-description').value = expense.description || '';
                document.getElementById('expense-amount').value = expense.amount || '';
                document.getElementById('expense-category').value = expense.category || 'Chi phí khác';
                
                // Định dạng ngày để hiển thị trong input date
                if (expense.date) {
                    const dateObj = new Date(expense.date);
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    document.getElementById('expense-date').value = `${year}-${month}-${day}`;
                }
                
                // Change submit button
                const submitButton = form.querySelector('button[type="submit"]');
                if (submitButton) {
                    submitButton.textContent = 'Cập nhật chi phí';
                }
                
                // Show cancel button
                const cancelButton = document.getElementById('cancel-edit-expense');
                if (cancelButton) {
                    cancelButton.style.display = 'inline-block';
                }
                
                // Switch to add expense tab
                const addExpenseTab = document.getElementById('add-expense-tab');
                if (addExpenseTab) {
                    addExpenseTab.click();
                }
            }
            
            this.clearValidationErrors();
        },

        // Clear validation errors
        clearValidationErrors() {
            const fields = ['expense-description', 'expense-amount', 'expense-category', 'expense-date'];
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
            const fields = ['expense-description', 'expense-amount', 'expense-category', 'expense-date'];
            
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
            const fieldName = fieldId.replace('expense-', '');
            const value = event.target.value;
            
            const validation = TripExpenseModule.validation.validateField(fieldName, value);
            TripExpenseModule.form.showFieldValidation(fieldId, validation);
        },

        // Handle field input (clear errors on typing)
        handleFieldInput(event) {
            const fieldId = event.target.id;
            TripExpenseModule.form.clearFieldValidation(fieldId);
        }
    },

    // ===== USER ACTIONS =====
    actions: {
        // Add expense
        async add(tripId) {
            if (!tripId || isNaN(tripId)) {
                TripExpenseModule.ui.showErrors(['Không xác định được chuyến hàng để thêm chi phí! Vui lòng thử lại.']);
                return;
            }
            const formData = {
                tripId: tripId,
                description: document.getElementById('expense-description').value.trim(),
                amount: parseFloat(document.getElementById('expense-amount').value) || 0,
                category: document.getElementById('expense-category').value,
                date: document.getElementById('expense-date').value ? new Date(document.getElementById('expense-date').value) : new Date()
            };

            // Clear validation errors
            TripExpenseModule.form.clearValidationErrors();

            // Validate form
            const validation = await TripExpenseModule.validation.validateForm(formData);
            if (!validation.valid) {
                TripExpenseModule.ui.showErrors(validation.errors);
                return;
            }

            try {
                const id = await TripExpenseModule.database.add(formData);
                if (id) {
                    TripExpenseModule.form.resetToAdd();
                    TripExpenseModule.ui.showSuccess('Thêm chi phí thành công!');
                    
                    // Focus on description field
                    setTimeout(() => {
                        const descField = document.getElementById('expense-description');
                        if (descField) descField.focus();
                    }, 100);
                    
                    // Chỉ cập nhật lại tab chi phí, không reload modal
                    await TripExpenseModule.refresh();
                    // Cập nhật lại tab chi phí trong modal nếu có
                    if (typeof updateTripExpensesTab === 'function') {
                        await updateTripExpensesTab(tripId);
                    }
                }
            } catch (error) {
                TripExpenseModule.ui.showErrors([`Có lỗi xảy ra: ${error.message}`]);
            }
        },

        // Edit expense
        async edit(expenseId) {
            const expense = await TripExpenseModule.database.get(expenseId);
            if (!expense) {
                TripExpenseModule.ui.showErrors(['Không tìm thấy thông tin chi phí!']);
                return;
            }

            TripExpenseModule.form.setupEdit(expense);
        },

        // Update expense
        async update() {
            const form = document.getElementById('add-expense-form');
            const editId = parseInt(form.getAttribute('data-edit-id'));
            
            const formData = {
                description: document.getElementById('expense-description').value.trim(),
                amount: parseFloat(document.getElementById('expense-amount').value) || 0,
                category: document.getElementById('expense-category').value,
                date: document.getElementById('expense-date').value ? new Date(document.getElementById('expense-date').value) : new Date()
            };

            // Clear validation errors
            TripExpenseModule.form.clearValidationErrors();

            // Validate form
            const validation = await TripExpenseModule.validation.validateForm(formData);
            if (!validation.valid) {
                TripExpenseModule.ui.showErrors(validation.errors);
                return;
            }

            try {
                const success = await TripExpenseModule.database.update(editId, formData);
                if (success) {
                    TripExpenseModule.form.resetToAdd();
                    TripExpenseModule.ui.showSuccess('Cập nhật chi phí thành công!');
                    
                    // Cập nhật lại tab chi phí
                    await TripExpenseModule.refresh();
                    // Cập nhật lại tab chi phí trong modal nếu có
                    const tripId = TripExpenseModule.data.currentTripId;
                    if (typeof updateTripExpensesTab === 'function' && tripId) {
                        await updateTripExpensesTab(tripId);
                    }
                }
            } catch (error) {
                TripExpenseModule.ui.showErrors([`Có lỗi xảy ra: ${error.message}`]);
            }
        },

        // Confirm delete (following supplier.js pattern)
        confirmDelete(expenseId) {
            const expense = TripExpenseModule.data.currentExpenses.find(e => e.id === expenseId);
            if (!expense) return;

            TripExpenseModule.data.expenseToDelete = expense;

            // Create and show confirmation modal (following supplier.js pattern)
            const modalHtml = `
                <div class="modal fade" id="deleteExpenseModal" tabindex="-1" aria-labelledby="deleteExpenseModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-danger text-white">
                                <h5 class="modal-title" id="deleteExpenseModalLabel">
                                    <i class="bi bi-exclamation-triangle me-2"></i>Xác nhận xóa chi phí
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="d-flex align-items-center mb-3">
                                    <div class="bg-danger bg-opacity-10 rounded-circle p-3 me-3">
                                        <i class="bi bi-exclamation-triangle text-danger fs-4"></i>
                                    </div>
                                    <div>
                                        <h6 class="mb-1">Bạn có chắc muốn xóa chi phí này?</h6>
                                        <small class="text-muted">Hành động này không thể hoàn tác</small>
                                    </div>
                                </div>
                                <div class="bg-light p-3 rounded">
                                    <div class="row">
                                        <div class="col-sm-4"><strong>Loại chi phí:</strong></div>
                                        <div class="col-sm-8" id="delete-expense-category">${expense.category || expense.type}</div>
                                    </div>
                                    <div class="row mt-2">
                                        <div class="col-sm-4"><strong>Số tiền:</strong></div>
                                        <div class="col-sm-8" id="delete-expense-amount">${formatCurrency(expense.amount)}</div>
                                    </div>
                                    <div class="row mt-2">
                                        <div class="col-sm-4"><strong>Mô tả:</strong></div>
                                        <div class="col-sm-8" id="delete-expense-description">${expense.description || 'Không có mô tả'}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle me-2"></i>Hủy
                                </button>
                                <button type="button" class="btn btn-danger" id="confirm-delete-expense">
                                    <i class="bi bi-trash me-2"></i>Xóa chi phí
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal if any
            const existingModal = document.getElementById('deleteExpenseModal');
            if (existingModal) {
                existingModal.remove();
            }

            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Setup delete confirmation button
            const confirmBtn = document.getElementById('confirm-delete-expense');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    TripExpenseModule.actions.delete();
                });
            }

            // Show modal
            const deleteModal = new bootstrap.Modal(document.getElementById('deleteExpenseModal'));
            deleteModal.show();
        },

        // Delete expense (following supplier.js pattern)
        async delete() {
            const expense = TripExpenseModule.data.expenseToDelete;
            if (!expense) return;

            try {
                const success = await TripExpenseModule.database.delete(expense.id);
                if (success) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteExpenseModal'));
                    if (modal) {
                        modal.hide();
                    }

                    // Reload and refresh
                    await TripExpenseModule.database.loadForTrip(TripExpenseModule.data.currentTripId);
                    await TripExpenseModule.refresh();
                    TripExpenseModule.ui.showSuccess('Xóa chi phí thành công!');
                    // Cập nhật lại tab chi phí trong modal nếu có
                    const tripId = TripExpenseModule.data.currentTripId;
                    if (typeof updateTripExpensesTab === 'function' && tripId) {
                        await updateTripExpensesTab(tripId);
                    }
                }
            } catch (error) {
                TripExpenseModule.ui.showErrors([`Có lỗi xảy ra khi xóa: ${error.message}`]);
            } finally {
                TripExpenseModule.data.expenseToDelete = null;
            }
        },

        // Handle form submit (following supplier.js pattern)
        async handleFormSubmit(event) {
            event.preventDefault();

            const form = document.getElementById('add-expense-form');
            const submitButton = form.querySelector('button[type="submit"]');

            // Prevent multiple submissions
            if (submitButton.disabled) {
                console.log('⚠️ Form already submitting, skipping...');
                return;
            }

            // Disable submit button during processing (following supplier.js pattern)
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Đang xử lý...';

            try {
                const editId = form.getAttribute('data-edit-id');
                const tripId = parseInt(form.getAttribute('data-trip-id'));

                if (editId) {
                    await this.update();
                } else {
                    await this.add(tripId);
                }
            } finally {
                // Re-enable submit button (following supplier.js pattern)
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        },

        // Refresh data (following supplier.js pattern)
        async refresh() {
            await TripExpenseModule.database.loadForTrip(TripExpenseModule.data.currentTripId);
            TripExpenseModule.filter.apply();

            // Update expense list in current tab
            await TripExpenseModule.updateExpenseListInCurrentTab();
        }
    },

    // ===== FILTER MANAGEMENT =====
    filter: {
        // Apply current filters (following supplier.js pattern)
        apply() {
            // For now, just show all expenses
            // Can be extended later for filtering by category, date, etc.
            TripExpenseModule.data.filteredExpenses = [...TripExpenseModule.data.currentExpenses];
        }
    },

    // ===== EVENT LISTENERS =====
    events: {
        // Track if events are already setup
        initialized: false,

        // Setup event listeners for expense form
        setup() {
            // Prevent multiple initialization
            if (this.initialized) {
                console.log('⚠️ TripExpense event listeners already initialized, skipping...');
                return;
            }

            // Form submit event
            const addExpenseForm = document.getElementById('add-expense-form');
            if (addExpenseForm) {
                addExpenseForm.addEventListener('submit', (event) => {
                    TripExpenseModule.actions.handleFormSubmit(event);
                });
            }

            // Cancel edit button
            const cancelEditButton = document.getElementById('cancel-edit-expense');
            if (cancelEditButton) {
                cancelEditButton.addEventListener('click', () => {
                    TripExpenseModule.form.resetToAdd();
                });
            }

            // Mark as initialized
            this.initialized = true;
            console.log('✅ TripExpense event listeners setup complete');
        },

        // Setup real-time validation when form is shown
        setupFormValidation() {
            TripExpenseModule.form.setupRealTimeValidation();
        }
    },

    // ===== PUBLIC API =====
    // Initialize for a specific trip
    async initForTrip(tripId) {
        try {
            console.log(`🎯 Initializing TripExpenseModule for trip ${tripId}...`);
            
            // Store current trip ID
            this.data.currentTripId = tripId;
            
            // Create expense category dropdown
            this.ui.createExpenseCategoryDropdown();
            
            // Setup event listeners
            this.events.setup();
            
            // Load expenses for this trip
            await this.database.loadForTrip(tripId);
            
            // Setup form validation
            this.events.setupFormValidation();
            
            // Reset form to add mode and set trip ID
            this.form.resetToAdd();

            // Set trip ID in form
            const form = document.getElementById('add-expense-form');
            if (form) {
                form.setAttribute('data-trip-id', tripId);
            }

            console.log('✅ TripExpenseModule initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Error initializing TripExpenseModule:', error);
            return false;
        }
    },

    // Get current trip ID
    getCurrentTripId() {
        return this.data.currentTripId;
    },

    // Refresh data for current trip
    async refresh() {
        if (this.data.currentTripId) {
            await this.database.loadForTrip(this.data.currentTripId);

            // Update the expense list in the current tab without switching tabs
            await this.updateExpenseListInCurrentTab();
            // Đảm bảo form luôn có đúng data-trip-id
            const form = document.getElementById('add-expense-form');
            if (form) {
                form.setAttribute('data-trip-id', this.data.currentTripId);
            }
        }
    },

    // Update expense list in current tab without switching tabs
    async updateExpenseListInCurrentTab() {
        try {
            const tripId = this.data.currentTripId;
            if (!tripId) return;

            // Find the expense table in the current tab
            const expenseTable = document.querySelector('#trip-expenses-pane .table tbody');
            if (!expenseTable) return;

            // Get current expenses
            const expenses = await getTripExpenses(tripId);

            // Update table content
            let tableContent = '';
            if (expenses.length > 0) {
                expenses.forEach(expense => {
                    tableContent += `
                        <tr>
                            <td><span class="badge bg-secondary">${expense.category || expense.type}</span></td>
                            <td class="text-end"><strong class="text-danger">${formatCurrency(expense.amount)}</strong></td>
                            <td><small class="text-muted">${expense.description || '<em>Không có mô tả</em>'}</small></td>
                            <td class="text-center">
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-outline-warning btn-sm edit-expense-btn"
                                            data-expense-id="${expense.id}">
                                        <i class="bi bi-pencil"></i> Sửa
                                    </button>
                                    <button class="btn btn-outline-danger btn-sm delete-expense-btn"
                                            data-expense-id="${expense.id}">
                                        <i class="bi bi-trash"></i> Xóa
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
            } else {
                tableContent = `
                    <tr>
                        <td colspan="4" class="text-center text-muted py-4">
                            <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                            Chưa có chi phí phát sinh nào
                        </td>
                    </tr>
                `;
            }

            expenseTable.innerHTML = tableContent;

            // Re-setup event listeners for new buttons
            TripExpenseModule.setupExpenseButtonListeners();

            // Update total if exists
            const totalElement = document.querySelector('#trip-expenses-pane .text-danger.fw-bold');
            if (totalElement && expenses.length > 0) {
                const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
                totalElement.textContent = formatCurrency(total);
            }

        } catch (error) {
            console.error('❌ Error updating expense list:', error);
        }
    },

    // Setup event listeners for expense buttons (following supplier.js pattern)
    setupExpenseButtonListeners() {
        document.querySelectorAll('.edit-expense-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const expenseId = parseInt(e.currentTarget.getAttribute('data-expense-id'));
                console.log('Edit expense ID:', expenseId);
                await TripExpenseModule.actions.edit(expenseId);
            });
        });

        document.querySelectorAll('.delete-expense-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const expenseId = parseInt(e.currentTarget.getAttribute('data-expense-id'));
                console.log('Delete expense ID:', expenseId);
                TripExpenseModule.actions.confirmDelete(expenseId);
            });
        });
    }
};

// Continue with the rest of the original code for now...
// All remaining functions will be preserved below

// Danh sách các danh mục chi phí phát sinh
const EXPENSE_CATEGORIES = [
    'Xăng dầu',
    'Phí cầu đường',
    'Ăn uống',
    'Lưu trú',
    'Lương tài xế',
    'Lương phụ xe',
    'Sửa chữa xe',
    'Bảo dưỡng xe',
    'Chi phí khác'
];

// Thêm chi phí phát sinh mới
async function addTripExpense(expenseData) {
    return await TripExpenseModule.businessLogic.addTripExpense(expenseData);
}

// Cập nhật chi phí phát sinh
async function updateTripExpense(expenseId, expenseData) {
    return await TripExpenseModule.businessLogic.updateTripExpense(expenseId, expenseData);
}

// Xóa chi phí phát sinh
async function deleteTripExpense(expenseId) {
    return await TripExpenseModule.businessLogic.deleteTripExpense(expenseId);
}

// Lấy tất cả chi phí phát sinh của một chuyến hàng
async function getTripExpenses(tripId) {
    return await TripExpenseModule.businessLogic.getTripExpenses(tripId);
}

// Tính tổng chi phí phát sinh của một chuyến hàng
async function calculateTotalTripExpenses(tripId) {
    return await TripExpenseModule.businessLogic.calculateTotalTripExpenses(tripId);
}

// Tính tổng chi phí phát sinh theo danh mục
async function calculateTripExpensesByCategory(tripId) {
    return await TripExpenseModule.businessLogic.calculateTripExpensesByCategory(tripId);
}

// Cập nhật tab chi phí phát sinh trong modal chi tiết chuyến hàng - MODERNIZED
async function updateTripExpensesTab(tripId) {
    try {
        const expensesTabPane = document.getElementById('expenses-tab-pane');
        if (!expensesTabPane) return;
        
        // Initialize TripExpenseModule for this trip
        await TripExpenseModule.initForTrip(tripId);
        
        // Lấy tất cả chi phí phát sinh của chuyến hàng (preserved business logic)
        const expenses = await getTripExpenses(tripId);
        
        // Tính tổng chi phí phát sinh (preserved business logic)
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        // Tạo HTML cho tab chi phí phát sinh - MODERNIZED UI
        if (expenses.length > 0) {
            let html = `
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-primary text-white">
                        <h6 class="mb-0">
                            <i class="bi bi-receipt me-2"></i>Danh sách chi phí phát sinh
                            <span class="badge bg-light text-dark ms-2">${expenses.length} khoản</span>
                        </h6>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th scope="col" class="text-center" style="width: 80px;">
                                            <i class="bi bi-hash"></i>
                                        </th>
                                        <th scope="col">
                                            <i class="bi bi-file-text me-2"></i>Mô tả
                                        </th>
                                        <th scope="col" style="width: 150px;">
                                            <i class="bi bi-tag me-2"></i>Danh mục
                                        </th>
                                        <th scope="col" class="text-center" style="width: 120px;">
                                            <i class="bi bi-calendar me-2"></i>Ngày
                                        </th>
                                        <th scope="col" class="text-end" style="width: 140px;">
                                            <i class="bi bi-currency-dollar me-2"></i>Số tiền
                                        </th>
                                        <th scope="col" class="text-center" style="width: 120px;">
                                            <i class="bi bi-gear me-2"></i>Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
            `;
            
            for (const expense of expenses) {
                html += `
                    <tr>
                        <td class="text-center fw-bold text-muted">${expense.id}</td>
                        <td>
                            <div class="fw-medium">${TripExpenseModule.utils.safeValue(expense.description)}</div>
                        </td>
                        <td>
                            <span class="badge bg-info">${TripExpenseModule.utils.safeValue(expense.category, 'Chi phí khác')}</span>
                        </td>
                        <td class="text-center">
                            <small class="text-muted">${TripExpenseModule.utils.formatDate(expense.date)}</small>
                        </td>
                        <td class="text-end">
                            <strong class="text-danger">${TripExpenseModule.utils.formatCurrency(expense.amount)}</strong>
                        </td>
                        <td class="text-center">
                            <div class="btn-group" role="group">
                                <button class="btn btn-sm btn-outline-primary edit-expense-btn" 
                                        data-expense-id="${expense.id}" 
                                        title="Chỉnh sửa">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-expense-btn" 
                                        data-expense-id="${expense.id}"
                                        title="Xóa">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }
            
            html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="card-footer bg-light">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-calculator text-primary me-2"></i>
                                    <span class="text-muted">Tổng chi phí phát sinh:</span>
                                </div>
                            </div>
                            <div class="col-md-4 text-end">
                                <h5 class="mb-0 text-danger">${TripExpenseModule.utils.formatCurrency(totalExpenses)}</h5>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card border-0 shadow-sm mt-4">
                    <div class="card-header bg-success text-white">
                        <h6 class="mb-0">
                            <i class="bi bi-pie-chart me-2"></i>Chi phí theo danh mục
                        </h6>
                    </div>
                    <div class="card-body">
                        <div class="row g-3">
            `;
            
            // Tính chi phí theo danh mục (preserved business logic)
            const expensesByCategory = await calculateTripExpensesByCategory(tripId);
            
            // Hiển thị chi phí theo danh mục - MODERNIZED UI
            for (const category in expensesByCategory) {
                if (expensesByCategory[category] > 0) {
                    // Calculate percentage
                    const percentage = totalExpenses > 0 ? ((expensesByCategory[category] / totalExpenses) * 100).toFixed(1) : 0;
                    
                    html += `
                        <div class="col-md-6 col-lg-4">
                            <div class="card h-100 border-0 shadow-sm">
                                <div class="card-body text-center">
                                    <i class="bi bi-circle-fill text-warning mb-2" style="font-size: 1.5rem;"></i>
                                    <h6 class="card-title">${category}</h6>
                                    <p class="card-text text-danger mb-1">
                                        <strong>${TripExpenseModule.utils.formatCurrency(expensesByCategory[category])}</strong>
                                    </p>
                                    <small class="text-muted">${percentage}% tổng chi phí</small>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }
            
            html += `
                        </div>
                    </div>
                </div>
            `;
            
            expensesTabPane.innerHTML = html;
            
            // Thêm sự kiện cho các nút - SỬA LẠI để lấy đúng ID
            document.querySelectorAll('.edit-expense-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const expenseId = parseInt(e.currentTarget.getAttribute('data-expense-id'));
                    console.log('Edit expense ID:', expenseId);
                    await TripExpenseModule.actions.edit(expenseId);
                });
            });
            
            document.querySelectorAll('.delete-expense-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const expenseId = parseInt(e.currentTarget.getAttribute('data-expense-id'));
                    console.log('Delete expense ID:', expenseId);
                    TripExpenseModule.actions.confirmDelete(expenseId);
                });
            });
        } else {
            expensesTabPane.innerHTML = `
                <div class="card border-0 shadow-sm">
                    <div class="card-body text-center py-5">
                        <i class="bi bi-receipt text-muted mb-3" style="font-size: 3rem; opacity: 0.3;"></i>
                        <h5 class="text-muted mb-3">Chưa có chi phí phát sinh</h5>
                        <p class="text-muted">Chưa có chi phí phát sinh nào được ghi nhận cho chuyến này.</p>
                        <div class="mt-3">
                            <button class="btn btn-primary" onclick="document.getElementById('add-expense-tab').click()">
                                <i class="bi bi-plus-circle me-2"></i>Thêm chi phí đầu tiên
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật tab chi phí phát sinh:', error);
        // Show error with modern UI
        const expensesTabPane = document.getElementById('expenses-tab-pane');
        if (expensesTabPane) {
            expensesTabPane.innerHTML = `
                <div class="alert alert-danger border-0 shadow-sm">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-exclamation-triangle-fill me-3" style="font-size: 1.5rem;"></i>
                        <div>
                            <h6 class="mb-1">Lỗi khi tải chi phí phát sinh</h6>
                            <small>Vui lòng thử lại sau hoặc liên hệ hỗ trợ</small>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

// Chỉnh sửa chi phí phát sinh - MODERNIZED
async function editTripExpense(expenseId) {
    // Use modern module action
    return await TripExpenseModule.actions.edit(expenseId);
}

// Cập nhật thông tin tổng quan của chuyến hàng
async function updateTripSummary(tripId) {
    try {
        // Lấy tổng chi phí nhập hàng
        const purchaseTx = db.transaction('purchases', 'readonly');
        const purchaseStore = purchaseTx.objectStore('purchases');
        const purchaseIndex = purchaseStore.index('tripId');
        const purchases = await purchaseIndex.getAll(tripId);
        const totalPurchaseCost = purchases.reduce((sum, purchase) => sum + (purchase.qty * purchase.purchasePrice), 0);
        
        // Lấy tổng chi phí phát sinh
        const totalExpenses = await calculateTotalTripExpenses(tripId);
        
        // Lấy tổng doanh thu từ đơn hàng
        const orderTx = db.transaction('orders', 'readonly');
        const orderStore = orderTx.objectStore('orders');
        const orders = await orderStore.getAll();
        const deliveredOrders = orders.filter(order => order.deliveredTripId === tripId);
        
        let totalRevenue = 0;
        for (const order of deliveredOrders) {
            if (order.items && order.items.length > 0) {
                totalRevenue += order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
            }
        }
        
        // Tính tổng chi phí (nhập hàng + phát sinh)
        const totalCost = totalPurchaseCost + totalExpenses;
        
        // Tính lợi nhuận gộp
        const grossProfit = totalRevenue - totalCost;
        
        // Cập nhật các card thông tin
        const costCardElement = document.querySelector('.card-text.fs-4.text-danger');
        if (costCardElement) {
            costCardElement.textContent = formatCurrency(totalCost);
        }
        
        const revenueCardElement = document.querySelector('.card-text.fs-4.text-primary');
        if (revenueCardElement) {
            revenueCardElement.textContent = formatCurrency(totalRevenue);
        }
        
        const grossProfitCardElement = document.querySelector('.card-text.fs-4:not(.text-danger):not(.text-primary)');
        if (grossProfitCardElement) {
            grossProfitCardElement.textContent = formatCurrency(grossProfit);
            
            // Cập nhật màu nền card lợi nhuận
            const grossProfitCard = grossProfitCardElement.closest('.card');
            if (grossProfitCard) {
                grossProfitCard.className = grossProfit >= 0 ? 
                    'card bg-success text-white' : 'card bg-danger text-white';
            }
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật thông tin tổng quan chuyến hàng:', error);
    }
}

// Tạo dropdown danh mục chi phí - MODERNIZED
function createExpenseCategoryDropdown() {
    // Use modern module UI function
    return TripExpenseModule.ui.createExpenseCategoryDropdown();
}

// Thiết lập các event listener cho quản lý chi phí phát sinh - MODERNIZED
function setupTripExpenseEventListeners() {
    // Use modern module event setup
    return TripExpenseModule.events.setup();
}

// Khởi tạo module chi phí phát sinh - MODERNIZED
function initTripExpenseModule() {
    // Use modern module initialization
    return TripExpenseModule.initForTrip(TripExpenseModule.getCurrentTripId() || 0);
}

// ===== EXPORT GLOBAL MODULE =====
// Export TripExpenseModule globally for debugging and integration
window.TripExpenseModule = TripExpenseModule;

// Export legacy compatibility functions
window.createExpenseCategoryDropdown = createExpenseCategoryDropdown;
window.setupTripExpenseEventListeners = setupTripExpenseEventListeners;
window.initTripExpenseModule = initTripExpenseModule;

console.log('🚀 TripExpenseModule ready - All business logic preserved with modern UI');

// ===== MODERNIZATION COMPLETE =====
// ✅ All original business logic preserved
// ✅ Modern UI with Module Pattern added
// ✅ Responsive design implemented
// ✅ Validation system added
// ✅ Toast notifications added
// ✅ Modal-based error handling
// ✅ Real-time form validation
// ✅ Backward compatibility maintained
// ✅ Following supplier.js pattern successfully
