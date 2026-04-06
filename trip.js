// ===== TRIP MANAGEMENT MODULE =====
// Complete trip management with modern UI and validation
// Senior JS Developer: Module Pattern following supplier.js approach
// IMPORTANT: Preserve ALL existing business logic

// ===== MODULE STRUCTURE =====
const TripModule = {
    // Data storage
    data: {
        currentTrips: [],
        filteredTrips: [],
        tripToDelete: null
    },

    // Configuration
    config: {
        validationRules: {
            tripName: {
                required: true,
                minLength: 2,
                maxLength: 100,
                pattern: /^[a-zA-ZàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s0-9\-\.\/]+$/,
                message: 'Tên chuyến hàng phải từ 2-100 ký tự'
            },
            tripDate: {
                required: true,
                message: 'Ngày đi là bắt buộc'
            },
            destination: {
                required: false,
                maxLength: 200,
                message: 'Điểm đến không được quá 200 ký tự'
            },
            note: {
                required: false,
                maxLength: 500,
                message: 'Ghi chú không được quá 500 ký tự'
            }
        },
        fieldDisplayNames: {
            tripName: 'Tên chuyến hàng',
            tripDate: 'Ngày đi',
            destination: 'Điểm đến',
            note: 'Ghi chú'
        },
        statusOptions: ['Mới tạo', 'Đang lấy hàng', 'Đang giao', 'Đã hoàn thành', 'Đã hủy'],
        expenseTypes: ['Xăng dầu', 'Phí đường', 'Ăn uống', 'Khác']
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

        // Wait for database (Firestore shim - always ready after auth)
        async waitForDB() {
            return window.db || null;
        },

        // Clean up modals
        cleanupAllModals() {
            try {
                const modalElements = document.querySelectorAll('.modal');
                modalElements.forEach(modalEl => {
                    const instance = bootstrap.Modal.getInstance(modalEl);
                    if (instance) {
                        instance.hide();
                    }
                });
                
                // If backdrops still exist after hide (e.g. from rapid triggers)
                setTimeout(() => {
                    const backdrops = document.querySelectorAll('.modal-backdrop');
                    backdrops.forEach(backdrop => backdrop.remove());
                    document.body.classList.remove('modal-open');
                    document.body.style.removeProperty('padding-right');
                }, 100);
                
                console.log('🧹 Cleaned up all modals');
            } catch (error) {
                console.log('⚠️ Error during modal cleanup:', error);
            }
        },

        // Format date (preserve existing logic)
        formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN');
        },

        // Format currency (preserve existing logic)
        formatCurrency(amount) {
            if (typeof window.formatCurrency === 'function') return window.formatCurrency(amount);
            if (!amount && amount !== 0) return '0 K';
            return new Intl.NumberFormat('vi-VN', {
                style: 'decimal',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(amount) + ' K';
        },

        // Get trip status badge class (preserve existing logic)
        getTripStatusBadgeClass(status) {
            switch (status) {
                case 'Mới tạo':
                    return 'bg-primary';
                case 'Đang lấy hàng':
                    return 'bg-warning';
                case 'Đang giao':
                    return 'bg-info';
                case 'Đã hoàn thành':
                    return 'bg-success';
                case 'Đã hủy':
                    return 'bg-danger';
                default:
                    return 'bg-secondary';
            }
        }
    },

    // ===== BUSINESS LOGIC (PRESERVED FROM ORIGINAL) =====
    businessLogic: {
        // Preserved: Calculate correct profit function
        calculateCorrectProfit(linkedOrders, tripExpenses, assignedEmployees = []) {
            let totalRevenue = 0;
            let totalCOGS = 0;
            let totalPaymentReceived = 0;
            
            for (const order of linkedOrders) {
                if (order.items && order.items.length > 0) {
                    for (const item of order.items) {
                        totalRevenue += item.qty * item.sellingPrice;
                        totalCOGS += item.qty * (item.purchasePrice || 0);
                    }
                }
                totalPaymentReceived += order.paymentReceived || 0;
            }
            
            // Tổng chi phí vận hành (bao gồm chi phí phát sinh và lương nhân viên theo chuyến)
            const expenseSum = tripExpenses.reduce((sum, exp) => sum + exp.amount, 0);
            const employeeSum = assignedEmployees.reduce((sum, emp) => sum + (emp.pay || 0), 0);
            const totalExpenses = expenseSum + employeeSum;
            
            const grossProfit = totalRevenue - totalCOGS;
            const netProfit = grossProfit - totalExpenses;
            
            return {
                totalRevenue,
                totalCOGS,
                grossProfit,
                totalExpenses,
                netProfit,
                totalPaymentReceived
            };
        }
    },

    // ===== VALIDATION SYSTEM =====
    validation: {
        // Validate single field
        validateField(fieldName, value) {
            const rule = TripModule.config.validationRules[fieldName];
            if (!rule) return { valid: true };

            const trimmedValue = value.trim();
            
            // Required check
            if (rule.required && !trimmedValue) {
                return { 
                    valid: false, 
                    message: `${TripModule.config.fieldDisplayNames[fieldName]} là bắt buộc` 
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
                    message: `${TripModule.config.fieldDisplayNames[fieldName]} phải có ít nhất ${rule.minLength} ký tự` 
                };
            }

            // Max length check
            if (rule.maxLength && trimmedValue.length > rule.maxLength) {
                return { 
                    valid: false, 
                    message: `${TripModule.config.fieldDisplayNames[fieldName]} không được quá ${rule.maxLength} ký tự` 
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
            return TripModule.data.currentTrips.some(trip => 
                trip.tripName.toLowerCase() === trimmedName && 
                trip.id != excludeId
            );
        },

        // Validate entire form
        async validateForm(formData, editId = null) {
            const errors = [];

            // Validate each field
            for (const fieldName in formData) {
                const validation = TripModule.validation.validateField(fieldName, formData[fieldName]);
                if (!validation.valid) {
                    errors.push(validation.message);
                }
            }

            // Check for duplicate name
            if (formData.tripName && formData.tripName.trim()) {
                const isDuplicate = await TripModule.validation.checkDuplicateName(formData.tripName, editId);
                if (isDuplicate) {
                    errors.push('Tên chuyến hàng đã tồn tại');
                }
            }

            // Validate date
            if (formData.tripDate) {
                const selectedDate = new Date(formData.tripDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (selectedDate < today) {
                    errors.push('Ngày đi không được trong quá khứ');
                }
            }

            return {
                valid: errors.length === 0,
                errors: errors
            };
        }
    },

    // ===== DATABASE OPERATIONS (PRESERVED LOGIC) =====
    database: {
        // Add trip (preserve existing logic)
        async add(tripData) {
            try {
                const db = await TripModule.utils.waitForDB();
                if (!db) {
                    throw new Error('Không thể kết nối đến cơ sở dữ liệu');
                }

                // Backend validation
                if (!tripData.tripName || !tripData.tripName.trim()) {
                    throw new Error('Tên chuyến hàng là bắt buộc');
                }

                // Normalize data
                const normalizedData = {
                    tripName: tripData.tripName.trim(),
                    tripDate: tripData.tripDate,
                    destination: tripData.destination ? tripData.destination.trim() : '',
                    note: tripData.note ? tripData.note.trim() : '',
                    employees: tripData.employees || [],
                    status: tripData.status || 'Mới tạo',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const tx = db.transaction('trips', 'readwrite');
                const store = tx.objectStore('trips');
                
                const id = await store.add(normalizedData);
                await tx.done;
                
                console.log('✅ Added trip with ID:', id);
                return id;
            } catch (error) {
                console.error('❌ Error adding trip:', error);
                throw error;
            }
        },

        // Update trip (preserve existing logic)
        async update(tripId, tripData) {
            tripId = parseInt(tripId);

            try {
                const db = await TripModule.utils.waitForDB();
                if (!db) {
                    throw new Error('Không thể kết nối đến cơ sở dữ liệu');
                }

                // Backend validation
                if (!tripData.tripName || !tripData.tripName.trim()) {
                    throw new Error('Tên chuyến hàng là bắt buộc');
                }

                const tx = db.transaction('trips', 'readwrite');
                const store = tx.objectStore('trips');
                
                // Get existing trip
                const existingTrip = await store.get(tripId);
                if (!existingTrip) {
                    throw new Error('Không tìm thấy chuyến hàng');
                }
                
                // Normalize and update data
                const normalizedData = {
                    tripName: tripData.tripName.trim(),
                    tripDate: tripData.tripDate,
                    destination: tripData.destination ? tripData.destination.trim() : '',
                    note: tripData.note ? tripData.note.trim() : '',
                    employees: tripData.employees || [],
                    status: tripData.status || existingTrip.status,
                    updated_at: new Date().toISOString()
                };

                const updatedTrip = { 
                    ...existingTrip, 
                    ...normalizedData 
                };
                
                await store.put(updatedTrip);
                await tx.done;
                
                console.log('✅ Updated trip with ID:', tripId);
                return true;
            } catch (error) {
                console.error('❌ Error updating trip:', error);
                throw error;
            }
        },

        // Delete trip (preserve existing logic)
        async delete(tripId) {
            tripId = parseInt(tripId);

            try {
                const db = await TripModule.utils.waitForDB();
                if (!db) {
                    throw new Error('Không thể kết nối đến cơ sở dữ liệu');
                }

                const tx = db.transaction('trips', 'readwrite');
                const store = tx.objectStore('trips');
                
                await store.delete(tripId);
                await tx.done;
                
                console.log('✅ Deleted trip with ID:', tripId);
                return true;
            } catch (error) {
                console.error('❌ Error deleting trip:', error);
                throw error;
            }
        },

        // Get single trip
        async get(tripId) {
            tripId = parseInt(tripId);

            try {
                const db = await TripModule.utils.waitForDB();
                if (!db) return null;

                const tx = db.transaction('trips', 'readonly');
                const store = tx.objectStore('trips');
                return await store.get(tripId);
            } catch (error) {
                console.error('❌ Error getting trip:', error);
                return null;
            }
        },

        // Load all trips
        async loadAll() {
            try {
                const db = await TripModule.utils.waitForDB();
                if (!db) return;

                const tx = db.transaction('trips', 'readonly');
                const store = tx.objectStore('trips');
                TripModule.data.currentTrips = await store.getAll();
                TripModule.data.filteredTrips = [...TripModule.data.currentTrips];
                
                console.log(`📊 Loaded ${TripModule.data.currentTrips.length} trips`);
            } catch (error) {
                console.error('❌ Error loading trips:', error);
                TripModule.data.currentTrips = [];
                TripModule.data.filteredTrips = [];
            }
        }
    },

    // ===== LEGACY FUNCTIONS (PRESERVED) =====
    legacy: {
        // All original functions preserved for backward compatibility
        
        // Preserved: Original addTrip function
        async addTrip(tripData) {
            try {
                const db = window.db;
        const tx = db.transaction('trips', 'readwrite');
        const store = tx.objectStore('trips');

        const id = await store.add(tripData);
        await tx.done;

        console.log('Đã thêm chuyến hàng mới với ID:', id);

        // Cập nhật giao diện
                await TripModule.legacy.displayTrips();

        return id;
    } catch (error) {
        console.error('Lỗi khi thêm chuyến hàng:', error);
        return null;
    }
        },

        // Preserved: Original displayTrips function
        async displayTrips() {
    try {
        const tripsList = document.getElementById('trips-list');
        const noTripsMessage = document.getElementById('no-trips-message');

        if (!tripsList || !noTripsMessage) return;

        // Lấy tất cả chuyến hàng từ IndexedDB
                const db = window.db;
        const tx = db.transaction('trips', 'readonly');
        const store = tx.objectStore('trips');
        const trips = await store.getAll();

        // Xóa nội dung hiện tại
        tripsList.innerHTML = '';

        if (trips.length > 0) {
            // Ẩn thông báo không có dữ liệu
            noTripsMessage.style.display = 'none';

            // Hiển thị từng chuyến hàng
            trips.forEach(trip => {
                const row = document.createElement('tr');
                row.innerHTML = `
                            <td class="text-center fw-bold">${trip.id}</td>
                            <td>
                                <div class="fw-bold text-primary">${TripModule.utils.safeValue(trip.tripName)}</div>
                                ${trip.destination ? `<small class="text-muted">${trip.destination}</small>` : ''}
                            </td>
                            <td class="text-center">${TripModule.utils.formatDate(trip.tripDate)}</td>
                            <td class="text-center">
                                <span class="badge ${TripModule.utils.getTripStatusBadgeClass(trip.status)}">${trip.status}</span>
                            </td>
                            <td class="text-center">
                                <div class="btn-group" role="group">
                                    <button class="btn btn-sm btn-outline-info view-trip-btn" data-id="${trip.id}" onclick="TripModule.legacy.showTripDetail(${trip.id})">
                                        <i class="bi bi-eye"></i>
                        </button>
                                    <button class="btn btn-sm btn-outline-primary" onclick="TripModule.actions.edit(${trip.id})">
                                        <i class="bi bi-pencil"></i>
                        </button>
                                    <button class="btn btn-sm btn-outline-danger delete-trip-btn" data-id="${trip.id}" onclick="TripModule.actions.confirmDelete(${trip.id})">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                    </td>
                `;

                tripsList.appendChild(row);
            });
        } else {
            // Hiển thị thông báo không có dữ liệu
            noTripsMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị chuyến hàng:', error);
    }
        },

        // Preserved: Original deleteTrip function
        async deleteTrip(tripId) {
    try {
                const db = window.db;
        const tx = db.transaction('trips', 'readwrite');
        const store = tx.objectStore('trips');

        await store.delete(tripId);
        await tx.done;

        console.log('Đã xóa chuyến hàng với ID:', tripId);

        // Cập nhật giao diện
                await TripModule.legacy.displayTrips();

        return true;
    } catch (error) {
        console.error('Lỗi khi xóa chuyến hàng:', error);
        return false;
    }
        },

        // Preserved: All other original functions will be added here
        showTripDetail: null, // Will be set later
        linkOrdersToTrip: null, // Will be set later
        // ... other functions
    },

    // ===== UI COMPONENTS =====
    ui: {
        // Update trips count
        updateCount() {
            const countElement = document.getElementById('trips-count');
            if (countElement) {
                countElement.textContent = TripModule.data.filteredTrips.length;
            }
        },

        // Update status filter options
        updateStatusFilter() {
            console.log('🔍 Updating status filter...');
            const statusFilter = document.getElementById('status-filter');
            if (!statusFilter) {
                console.warn('⚠️ Status filter element not found');
                return;
            }

            const currentValue = statusFilter.value;
            statusFilter.innerHTML = '<option value="">Tất cả trạng thái</option>';
            
            console.log('📋 Available status options:', TripModule.config.statusOptions);
            
            TripModule.config.statusOptions.forEach(status => {
                const option = document.createElement('option');
                option.value = status;
                option.textContent = status;
                statusFilter.appendChild(option);
                console.log('✅ Added status option:', status);
            });

            statusFilter.value = currentValue;
            console.log('✅ Status filter updated with', statusFilter.options.length, 'options');
        },

        // Render desktop table
        renderDesktopTable() {
            const tableBody = document.getElementById('trips-list');
            if (!tableBody) return;

            // Sửa header bảng desktop cho giống supplier.js
            const table = tableBody.closest('table');
            if (table) {
                const thead = table.querySelector('thead');
                if (thead) {
                    thead.innerHTML = `
                        <tr class="align-middle table-primary">
                            <th class="text-center" scope="col" style="width: 80px;"><i class="bi bi-hash"></i></th>
                            <th scope="col"><i class="bi bi-truck me-2"></i>Tên chuyến</th>
                            <th class="text-center" scope="col" style="width: 120px;"><i class="bi bi-calendar me-2"></i>Ngày đi</th>
                            <th class="text-center" scope="col" style="width: 120px;"><i class="bi bi-flag me-2"></i>Trạng thái</th>
                            <th class="text-center" scope="col" style="width: 180px;"><i class="bi bi-gear me-2"></i>Thao tác</th>
                        </tr>
                    `;
                }
            }

            tableBody.innerHTML = '';
            TripModule.data.filteredTrips.forEach(trip => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="text-center fw-bold">${trip.id}</td>
                    <td class="text-start">
                        <div class="fw-bold text-primary">${TripModule.utils.safeValue(trip.tripName || trip.name)}</div>
                    </td>
                    <td class="text-center">${TripModule.utils.formatDate(trip.tripDate || trip.date)}</td>
                    <td class="text-center">
                        <span class="badge ${TripModule.utils.getTripStatusBadgeClass(trip.status)}">${trip.status}</span>
                    </td>
                    <td class="text-center">
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-info" onclick="TripModule.legacy.showTripDetail('${trip.id}')" title="Chi tiết"><i class="bi bi-eye"></i></button>
                            <button class="btn btn-sm btn-outline-primary" onclick="TripModule.actions.edit('${trip.id}')" data-bs-toggle="modal" data-bs-target="#tripModal" title="Sửa"><i class="bi bi-pencil"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="TripModule.actions.confirmDelete('${trip.id}')" title="Xóa"><i class="bi bi-trash"></i></button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        },

        // Render mobile cards
        renderMobileCards() {
            const mobileContainer = document.getElementById('trips-mobile-list');
            if (!mobileContainer) return;

            mobileContainer.innerHTML = '';

            TripModule.data.filteredTrips.forEach(trip => {
                const card = document.createElement('div');
                card.className = 'card mb-3 border-0 shadow-sm';
                card.innerHTML = `
                    <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <div class="fw-bold">
                            <i class="bi bi-truck me-2"></i>${TripModule.utils.safeValue(trip.tripName || trip.name)}
                        </div>
                        <span class="badge bg-light text-dark">#${trip.id}</span>
                    </div>
                    <div class="card-body">
                        <div class="row g-2 mb-3">
                            <div class="col-12">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-calendar text-secondary me-2"></i>
                                    <span class="text-muted">Ngày đi:</span>
                                    <span class="ms-2 fw-bold">${TripModule.utils.formatDate(trip.tripDate)}</span>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-geo-alt text-success me-2"></i>
                                    <span class="text-muted">Điểm đến:</span>
                                    <span class="ms-2">${TripModule.utils.safeValue(trip.destination, 'Chưa có')}</span>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-flag text-info me-2"></i>
                                    <span class="text-muted">Trạng thái:</span>
                                    <span class="ms-2">
                                        <span class="badge ${TripModule.utils.getTripStatusBadgeClass(trip.status)}">${trip.status}</span>
                                    </span>
                                </div>
                            </div>
                            ${trip.note ? `
                            <div class="col-12">
                                <div class="d-flex align-items-start">
                                    <i class="bi bi-sticky text-warning me-2 mt-1"></i>
                                    <div>
                                        <span class="text-muted">Ghi chú:</span>
                                        <div class="small">${trip.note}</div>
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                            <button class="btn btn-outline-info btn-sm" onclick="TripModule.legacy.showTripDetail('${trip.id}')">
                                <i class="bi bi-eye me-1"></i>Chi tiết
                            </button>
                            <button class="btn btn-outline-primary btn-sm" onclick="TripModule.actions.edit('${trip.id}')">
                                <i class="bi bi-pencil me-1"></i>Sửa
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="TripModule.actions.confirmDelete('${trip.id}')">
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
            const noTripsMessage = document.getElementById('no-trips-message');
            const noSearchResults = document.getElementById('no-trip-search-results');
            const searchInput = document.getElementById('trip-search');
            const statusFilter = document.getElementById('status-filter');

            const hasData = TripModule.data.filteredTrips.length > 0;
            const hasSearchTerm = (searchInput && searchInput.value.trim()) || 
                                 (statusFilter && statusFilter.value);

            if (noTripsMessage) {
                noTripsMessage.style.display = !hasData && !hasSearchTerm ? 'block' : 'none';
            }

            if (noSearchResults) {
                noSearchResults.style.display = !hasData && hasSearchTerm ? 'block' : 'none';
            }
        },

        // Main render function
        async render() {
            this.updateCount();
            this.updateStatusFilter();
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
        },

        // Modern confirm dialog (Promise-based)
        async confirm(message) {
            // Remove old modal if exists
            const existingModal = document.getElementById('modernConfirmModal');
            if (existingModal) existingModal.remove();

            return new Promise((resolve) => {
                const modalHtml = `
                    <div class="modal fade" id="modernConfirmModal" tabindex="-1" aria-labelledby="modernConfirmModalLabel" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered">
                            <div class="modal-content border-0 shadow-lg">
                                <div class="modal-header bg-warning text-dark border-0">
                                    <h5 class="modal-title" id="modernConfirmModalLabel">
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
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="modernConfirmCancel">Hủy</button>
                                    <button type="button" class="btn btn-danger" id="modernConfirmOk">Xác nhận</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                const modalEl = document.getElementById('modernConfirmModal');
                const modal = new bootstrap.Modal(modalEl);
                modal.show();

                // Xử lý nút xác nhận
                document.getElementById('modernConfirmOk').onclick = () => {
                    resolve(true);
                    modal.hide();
                };
                // Xử lý nút hủy
                document.getElementById('modernConfirmCancel').onclick = () => {
                    resolve(false);
                    modal.hide();
                };
                // Khi modal đóng thì reject nếu chưa chọn
                modalEl.addEventListener('hidden.bs.modal', function () {
                    setTimeout(() => {
                        if (document.getElementById('modernConfirmModal')) {
                            document.getElementById('modernConfirmModal').remove();
                        }
                    }, 200);
                });
            });
        },

        // Populate employee selection in trip modal
        async populateEmployeeSelection(assignedEmployees = []) {
            const container = document.getElementById('trip-employee-selection');
            if (!container) return;

            if (!window.EmployeeModule) {
                container.innerHTML = '<p class="text-danger small">Lỗi: Module nhân viên chưa tải.</p>';
                return;
            }

            // Ensure employees are loaded
            if (window.EmployeeModule.data.currentEmployees.length === 0) {
                await window.EmployeeModule.database.getAll().then(emps => {
                    window.EmployeeModule.data.currentEmployees = emps;
                });
            }

            const employees = window.EmployeeModule.data.currentEmployees;

            if (employees.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-2">
                        <p class="text-muted small mb-0">Chưa có nhân viên nào.</p>
                        <a href="#" class="small" onclick="bootstrap.Modal.getInstance(document.getElementById('tripModal')).hide(); document.getElementById('employees-tab').click();">Thêm nhân viên ngay</a>
                    </div>
                `;
                return;
            }

            container.innerHTML = employees.map(emp => {
                const assigned = assignedEmployees.find(ae => String(ae.employeeId) === String(emp.id));
                const isChecked = assigned ? 'checked' : '';
                const payValue = assigned ? assigned.pay : (emp.baseSalaryPerTrip || 0);

                return `
                    <div class="employee-item d-flex align-items-center gap-3 p-2 rounded bg-white shadow-sm border mb-2">
                        <div class="form-check mb-0">
                            <input class="form-check-input employee-checkbox" type="checkbox" value="${emp.id}" id="emp-check-${emp.id}" ${isChecked}>
                            <label class="form-check-label fw-medium" for="emp-check-${emp.id}">
                                ${emp.name} <small class="text-muted">(${window.EmployeeModule.config.roles[emp.role] || emp.role})</small>
                            </label>
                        </div>
                        <div class="ms-auto" style="width: 150px;">
                            <div class="input-group input-group-sm">
                                <span class="input-group-text">Pay</span>
                                <input type="number" class="form-control employee-pay" step="any" 
                                       data-emp-id="${emp.id}" 
                                       value="${payValue}" 
                                       placeholder="Số tiền" 
                                       ${isChecked ? '' : 'disabled'}>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Add event listeners to toggle inputs
            container.querySelectorAll('.employee-checkbox').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const payInput = container.querySelector(`.employee-pay[data-emp-id="${e.target.value}"]`);
                    if (payInput) payInput.disabled = !e.target.checked;
                });
            });
        }
    },

    // ===== FORM HANDLING =====
    form: {
        // Reset form to add mode
        resetToAdd() {
            const form = document.getElementById('trip-form');
            const modalTitle = document.getElementById('tripModalLabel');
            const submitButton = document.getElementById('trip-submit-btn');
            
            if (form) {
                form.reset();
                form.removeAttribute('data-edit-id');
                
                // Set default date to today
                const today = new Date().toISOString().split('T')[0];
                const dateInput = document.getElementById('trip-date');
                if (dateInput) {
                    dateInput.value = today;
                }
            }
            
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="bi bi-truck me-2"></i>Tạo chuyến hàng mới';
            }
            
            if (submitButton) {
                submitButton.textContent = 'Tạo chuyến hàng';
            }

            // Populate employees
            TripModule.ui.populateEmployeeSelection();

            this.clearValidationErrors();
        },

        // Setup for edit mode
        async setupEdit(trip) {
            const form = document.getElementById('trip-form');
            const modalTitle = document.getElementById('tripModalLabel');
            const submitButton = document.getElementById('trip-submit-btn');
            
            if (form) {
                form.setAttribute('data-edit-id', trip.id);
                
                document.getElementById('trip-name').value = trip.tripName || '';
                document.getElementById('trip-date').value = trip.tripDate || '';
                document.getElementById('trip-destination').value = trip.destination || '';
                document.getElementById('trip-note').value = trip.note || '';
                
                // Set status if editing
                const statusSelect = document.getElementById('trip-status');
                if (statusSelect) {
                    statusSelect.value = trip.status || 'Mới tạo';
                }
            }
            
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="bi bi-pencil me-2"></i>Chỉnh sửa chuyến hàng';
            }
            
            if (submitButton) {
                submitButton.textContent = 'Cập nhật chuyến hàng';
            }

            // Populate employees with assigned data (MUST await because it might fetch from DB)
            await TripModule.ui.populateEmployeeSelection(trip.employees || []);

            this.clearValidationErrors();
        },

        // Clear validation errors
        clearValidationErrors() {
            const fields = ['trip-name', 'trip-date', 'trip-destination', 'trip-note'];
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
            const fields = ['trip-name', 'trip-date', 'trip-destination', 'trip-note'];
            
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
            const fieldName = fieldId.replace('trip-', '');
            const value = event.target.value;
            
            const validation = TripModule.validation.validateField(fieldName, value);
            TripModule.form.showFieldValidation(fieldId, validation);
        },

        // Handle field input (clear errors on typing)
        handleFieldInput(event) {
            const fieldId = event.target.id;
            TripModule.form.clearFieldValidation(fieldId);
        }
    },

    // ===== FILTER SYSTEM =====
    filter: {
        // Apply filters
        apply() {
            const searchTerm = document.getElementById('trip-search')?.value.toLowerCase().trim() || '';
            const statusFilter = document.getElementById('status-filter')?.value || '';

            TripModule.data.filteredTrips = TripModule.data.currentTrips.filter(trip => {
                const matchesSearch = !searchTerm || 
                    trip.tripName.toLowerCase().includes(searchTerm) ||
                    (trip.destination && trip.destination.toLowerCase().includes(searchTerm)) ||
                    (trip.note && trip.note.toLowerCase().includes(searchTerm));

                const matchesStatus = !statusFilter || trip.status === statusFilter;

                return matchesSearch && matchesStatus;
            });

            TripModule.ui.render();
        }
    },

    // Continue with actions, events, and legacy functions...

    // ===== USER ACTIONS =====
    actions: {
        // Add trip
        async add() {
            const form = document.getElementById('trip-form');
            const formData = {
                tripName: document.getElementById('trip-name').value.trim(),
                tripDate: document.getElementById('trip-date').value,
                destination: document.getElementById('trip-destination').value.trim(),
                note: document.getElementById('trip-note').value.trim(),
                employees: (() => {
                    const containers = document.querySelectorAll('#trip-employee-selection .employee-item');
                    const selected = [];
                    containers.forEach(item => {
                        const cb = item.querySelector('.employee-checkbox');
                        if (cb && cb.checked) {
                            const empId = cb.value;
                            const payInput = item.querySelector('.employee-pay');
                            const label = item.querySelector('label');
                            selected.push({
                                employeeId: empId,
                                pay: payInput ? parseFloat(payInput.value || 0) : 0,
                                name: label ? label.textContent.split(' (')[0].trim() : 'Unknown'
                            });
                        }
                    });
                    return selected;
                })()
            };

            // Clear validation errors
            TripModule.form.clearValidationErrors();

            // Validate form
            const validation = await TripModule.validation.validateForm(formData);
            if (!validation.valid) {
                TripModule.ui.showErrors(validation.errors);
                return;
            }

            try {
                console.log('💾 Đang lưu chuyến hàng với dữ liệu:', formData);
                const id = await TripModule.database.add(formData);
                if (id) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('tripModal'));
                    if (modal) {
                        modal.hide();
                    }

                    // Reload and refresh
                    await TripModule.database.loadAll();
                    await TripModule.refresh();
                    TripModule.ui.showSuccess('Thêm chuyến hàng thành công!');
                }
            } catch (error) {
                TripModule.ui.showErrors([`Có lỗi xảy ra: ${error.message}`]);
            }
        },

        // Edit trip
        async edit(tripId) {
            const trip = await TripModule.database.get(tripId);
            if (!trip) {
                TripModule.ui.showErrors(['Không tìm thấy thông tin chuyến hàng!']);
                return;
            }

            // Cleanup any existing modals first
            TripModule.utils.cleanupAllModals();

            await TripModule.form.setupEdit(trip);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('tripModal'));
            modal.show();
        },

        // Update trip
        async update() {
            const form = document.getElementById('trip-form');
            const editId = form.getAttribute('data-edit-id');
            
            const formData = {
                tripName: document.getElementById('trip-name').value.trim(),
                tripDate: document.getElementById('trip-date').value,
                destination: document.getElementById('trip-destination').value.trim(),
                note: document.getElementById('trip-note').value.trim(),
                employees: (() => {
                    const containers = document.querySelectorAll('#trip-employee-selection .employee-item');
                    const selected = [];
                    containers.forEach(item => {
                        const cb = item.querySelector('.employee-checkbox');
                        if (cb && cb.checked) {
                            const empId = cb.value;
                            const payInput = item.querySelector('.employee-pay');
                            const label = item.querySelector('label');
                            selected.push({
                                employeeId: empId,
                                pay: payInput ? parseFloat(payInput.value || 0) : 0,
                                name: label ? label.textContent.split(' (')[0].trim() : 'Unknown'
                            });
                        }
                    });
                    return selected;
                })()
            };

            // Clear validation errors
            TripModule.form.clearValidationErrors();

            // Validate form
            const validation = await TripModule.validation.validateForm(formData, editId);
            if (!validation.valid) {
                TripModule.ui.showErrors(validation.errors);
                return;
            }

            try {
                console.log('🔄 Đang cập nhật chuyến hàng ID:', editId, 'với dữ liệu:', formData);
                const success = await TripModule.database.update(editId, formData);
                if (success) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('tripModal'));
                    if (modal) {
                        modal.hide();
                    }

                    // Reload and refresh
                    await TripModule.database.loadAll();
                    await TripModule.refresh();
                    TripModule.ui.showSuccess('Cập nhật chuyến hàng thành công!');
                }
            } catch (error) {
                TripModule.ui.showErrors([`Có lỗi xảy ra: ${error.message}`]);
            }
        },

        // Confirm delete
        confirmDelete(tripId) {
            const trip = TripModule.data.currentTrips.find(t => t.id == tripId);
            if (!trip) return;

            TripModule.data.tripToDelete = trip;

            // Update delete modal content
            const nameElement = document.getElementById('delete-trip-name');
            const detailsElement = document.getElementById('delete-trip-details');

            if (nameElement) nameElement.textContent = trip.tripName;
            if (detailsElement) {
                detailsElement.textContent = `${TripModule.utils.formatDate(trip.tripDate)} • ${trip.destination || 'Chưa có điểm đến'}`;
            }

            // Cleanup any existing modals first
            TripModule.utils.cleanupAllModals();

            // Show delete modal
            const deleteModal = new bootstrap.Modal(document.getElementById('deleteTripModal'));
            deleteModal.show();
        },

        // Delete trip
        async delete() {
            const trip = TripModule.data.tripToDelete;
            if (!trip) return;

            try {
                const success = await TripModule.database.delete(trip.id);
                if (success) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteTripModal'));
                    if (modal) {
                        modal.hide();
                    }

                    // Reload and refresh
                    await TripModule.database.loadAll();
                    await TripModule.refresh();

                    // Cập nhật công nợ nếu module có sẵn
                    if (window.DebtModule && window.DebtModule.actions && typeof window.DebtModule.actions.displayCustomerDebts === 'function') {
                        await window.DebtModule.actions.displayCustomerDebts();
                    }

                    TripModule.ui.showSuccess('Xóa chuyến hàng thành công!');
                }
            } catch (error) {
                TripModule.ui.showErrors([`Có lỗi xảy ra khi xóa: ${error.message}`]);
            } finally {
                TripModule.data.tripToDelete = null;
            }
        },

        // Handle form submit
        async handleFormSubmit(event) {
            event.preventDefault();
            
            const form = document.getElementById('trip-form');
            const submitButton = document.getElementById('trip-submit-btn');
            
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
            await TripModule.database.loadAll();
            TripModule.filter.apply();
        }
    },

    // ===== EVENT LISTENERS =====
    events: {
        // Track if events are already setup
        initialized: false,

        // Remove existing event listeners
        cleanup() {
            const addBtn = document.getElementById('add-trip-btn');
            const refreshBtn = document.getElementById('refresh-trips-btn');
            const searchInput = document.getElementById('trip-search');
            const statusFilter = document.getElementById('status-filter');
            const tripForm = document.getElementById('trip-form');
            const confirmDeleteBtn = document.getElementById('confirm-delete-trip');

            // Remove existing listeners
            if (addBtn) addBtn.replaceWith(addBtn.cloneNode(true));
            if (refreshBtn) refreshBtn.replaceWith(refreshBtn.cloneNode(true));
            if (searchInput) searchInput.replaceWith(searchInput.cloneNode(true));
            if (statusFilter) statusFilter.replaceWith(statusFilter.cloneNode(true));
            if (tripForm) tripForm.replaceWith(tripForm.cloneNode(true));
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

            // Add trip button
            const addBtn = document.getElementById('add-trip-btn');
            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    TripModule.utils.cleanupAllModals();
                    TripModule.form.resetToAdd();
                    
                    // Show modal
                    const modal = new bootstrap.Modal(document.getElementById('tripModal'));
                    modal.show();
                });
            }

            // Refresh button
            const refreshBtn = document.getElementById('refresh-trips-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', async () => {
                    await TripModule.actions.refresh();
                    
                    // Loading animation
                    refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2 spin"></i>Đang tải...';
                    setTimeout(() => {
                        refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Làm mới';
                    }, 1000);
                });
            }

            // Search input
            const searchInput = document.getElementById('trip-search');
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    TripModule.filter.apply();
                });
            }

            // Status filter
            const statusFilter = document.getElementById('status-filter');
            if (statusFilter) {
                statusFilter.addEventListener('change', () => {
                    TripModule.filter.apply();
                });
            }

            // Form submit
            const tripForm = document.getElementById('trip-form');
            if (tripForm) {
                tripForm.addEventListener('submit', (event) => {
                    TripModule.actions.handleFormSubmit(event);
                });
            }

            // Delete confirmation
            const confirmDeleteBtn = document.getElementById('confirm-delete-trip');
            if (confirmDeleteBtn) {
                confirmDeleteBtn.addEventListener('click', () => {
                    TripModule.actions.delete();
                });
            }

            // Modal events
            const tripModal = document.getElementById('tripModal');
            if (tripModal) {
                tripModal.addEventListener('show.bs.modal', () => {
                    TripModule.form.setupRealTimeValidation();
                    
                    setTimeout(() => {
                        const firstField = document.getElementById('trip-name');
                        if (firstField) firstField.focus();
                    }, 300);
                });
                
                tripModal.addEventListener('hidden.bs.modal', () => {
                    TripModule.form.resetToAdd();
                    TripModule.form.clearValidationErrors();
                    setTimeout(TripModule.utils.cleanupAllModals, 100);
                });
            }

            const deleteModal = document.getElementById('deleteTripModal');
            if (deleteModal) {
                deleteModal.addEventListener('hidden.bs.modal', () => {
                    TripModule.data.tripToDelete = null;
                    setTimeout(TripModule.utils.cleanupAllModals, 100);
                });
            }

            // Trip detail modal cleanup
            const tripDetailModal = document.getElementById('tripDetailModal');
            if (tripDetailModal) {
                tripDetailModal.addEventListener('hidden.bs.modal', () => {
                    console.log('🧹 Cleaning up trip detail modal...');
                    // Clear content
                    const content = document.getElementById('trip-detail-content');
                    if (content) {
                        content.innerHTML = '';
                    }
                    
                    // Cleanup modal instances and backdrops
                    setTimeout(() => {
                        TripModule.utils.cleanupAllModals();
                    }, 100);
                });
            }

            // Mark as initialized
            this.initialized = true;
            console.log('✅ Trip event listeners setup complete');
        }
    },

    // ===== PUBLIC API =====
    // Track initialization state
    isInitialized: false,

    // Initialize module
    async init() {
        try {
            // Prevent multiple initialization
            if (this.isInitialized) {
                console.log('⚠️ Trip module already initialized, skipping...');
                return true;
            }

            console.log('🎯 Initializing Trip Management Module...');
            
            // Cleanup any existing modals
            this.utils.cleanupAllModals();
            
            // Wait for database
            const db = await this.utils.waitForDB();
            if (!db) {
                console.error('❌ Database not ready for trip module');
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
            
            console.log('✅ Trip Management Module initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Error initializing trip module:', error);
            return false;
        }
    },

    // Refresh everything
    async refresh() {
        await this.database.loadAll();
        this.filter.apply();
    }
};

// ===== LEGACY FUNCTIONS FOR BACKWARD COMPATIBILITY =====
// These functions maintain compatibility with existing code

// Preserved: Original functions with full logic
// Hàm tính lợi nhuận chính xác (bao gồm giá vốn) - PRESERVED
function calculateCorrectProfit(linkedOrders, tripExpenses, assignedEmployees = []) {
    return TripModule.businessLogic.calculateCorrectProfit(linkedOrders, tripExpenses, assignedEmployees);
}

// Thêm chuyến hàng mới - PRESERVED
async function addTrip(tripData) {
    return await TripModule.legacy.addTrip(tripData);
}

// Hiển thị danh sách chuyến hàng - PRESERVED
async function displayTrips() {
    return await TripModule.legacy.displayTrips();
}

// Xóa chuyến hàng - PRESERVED
async function deleteTrip(tripId) {
    return await TripModule.legacy.deleteTrip(tripId);
}

// Preserved: Original showTripDetail function (with all complex logic)
async function showTripDetail(tripId) {
    tripId = parseInt(tripId);

    try {
        // Ensure database is ready
        if (!window.db) {
            alert('Cơ sở dữ liệu chưa sẵn sàng');
            return;
        }
        
        const tx = db.transaction(['trips', 'tripExpenses', 'orders', 'customers'], 'readonly');
        const tripStore = tx.objectStore('trips');
        const expenseStore = tx.objectStore('tripExpenses');
        const orderStore = tx.objectStore('orders');
        const customerStore = tx.objectStore('customers');

        const trip = await tripStore.get(tripId);
        const expenses = await expenseStore.getAll();
        const allOrders = await orderStore.getAll();

        if (!trip) {
            alert('Không tìm thấy chuyến hàng');
            return;
        }

        // Lấy chi phí của chuyến này
        const tripExpenses = expenses ? expenses.filter(exp => exp && exp.tripId === tripId) : [];
        
        // Lấy đơn hàng đã liên kết với chuyến này
        const linkedOrders = allOrders ? allOrders.filter(order => order && order.deliveredTripId === tripId) : [];
        
        // Tính lợi nhuận chính xác (bao gồm giá vốn và lương nhân viên)
        const tripEmployees = (trip.employees || []).filter(emp => emp !== null);
        const profitData = calculateCorrectProfit(linkedOrders, tripExpenses, tripEmployees);
        const { totalRevenue, totalCOGS, grossProfit, totalExpenses, netProfit, totalPaymentReceived } = profitData;

        // Xây dựng nội dung modal
        let content = `
            <!-- Thông tin tổng quan -->
            <div class="row g-4 mb-4">
                <div class="col-md-2">
                    <div class="card bg-primary text-white">
                        <div class="card-body text-center">
                            <h6 class="card-title">Doanh thu</h6>
                            <p class="card-text fs-5" id="summary-revenue">${formatCurrency(totalRevenue)}</p>
            </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card bg-warning text-dark">
                        <div class="card-body text-center">
                            <h6 class="card-title">Giá vốn</h6>
                            <p class="card-text fs-5" id="summary-cogs">${formatCurrency(totalCOGS)}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card bg-info text-white">
                        <div class="card-body text-center">
                            <h6 class="card-title">LN Gộp</h6>
                            <p class="card-text fs-5" id="summary-gross-profit">${formatCurrency(grossProfit)}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card bg-danger text-white">
                        <div class="card-body text-center">
                            <h6 class="card-title">Chi phí VH</h6>
                             <p class="card-text fs-5" id="summary-trip-expenses">${formatCurrency(totalExpenses)}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card ${netProfit >= 0 ? 'bg-success' : 'bg-danger'} text-white">
                        <div class="card-body text-center">
                            <h6 class="card-title">LN Ròng</h6>
                             <p class="card-text fs-5" id="summary-net-profit">${formatCurrency(netProfit)}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card bg-secondary text-white">
                        <div class="card-body text-center">
                            <h6 class="card-title">Đã thu</h6>
                            <p class="card-text fs-5">${formatCurrency(totalPaymentReceived)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Navigation tabs -->
            <ul class="nav nav-tabs" id="tripDetailTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="link-orders-tab" data-bs-toggle="tab" data-bs-target="#link-orders-pane" type="button" role="tab">Liên kết đơn hàng</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="linked-orders-tab" data-bs-toggle="tab" data-bs-target="#linked-orders-pane" type="button" role="tab">Đơn hàng đã liên kết</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="trip-employees-tab" data-bs-toggle="tab" data-bs-target="#trip-employees-pane" type="button" role="tab">Nhân viên</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="trip-expenses-tab" data-bs-toggle="tab" data-bs-target="#trip-expenses-pane" type="button" role="tab">Chi phí</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="invoice-tab" data-bs-toggle="tab" data-bs-target="#invoice-tab-pane" type="button" role="tab">Hóa đơn</button>
                </li>
            </ul>

            <div class="tab-content mt-3" id="tripDetailTabContent">
                <!-- Tab đơn hàng đã liên kết -->
                <div class="tab-pane fade" id="linked-orders-pane" role="tabpanel">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Đơn hàng đã liên kết - Quản lý thanh toán</h5>
                        </div>
                        <div class="card-body">
        `;

        // Fetch all trip payments for dynamic calculation
        const paymentStore = tx.objectStore('payments');
        const allTripPayments = await paymentStore.getAll();
        const tripPayments = allTripPayments.filter(p => String(p.tripId) === String(tripId));

        if (linkedOrders.length === 0) {
            content += '<div class="alert alert-info">Chưa có đơn hàng nào được liên kết với chuyến hàng này.</div>';
        } else {
            content += `
                        <div class="table-responsive">
                    <table class="table table-striped table-hover align-middle">
                                <thead class="table-dark">
                                    <tr>
                                        <th scope="col" class="text-center" style="width: 80px;">ID</th>
                                <th scope="col">Khách hàng</th>
                                <th scope="col" class="text-center" style="width: 110px;">Ngày đặt</th>
                                <th scope="col" class="text-center" style="width: 120px;">Trạng thái</th>
                                <th scope="col" class="text-end" style="width: 130px;">Tổng tiền</th>
                                <th scope="col" class="text-end" style="width: 130px;">Đã thanh toán</th>
                                <th scope="col" class="text-end" style="width: 120px;">Còn nợ</th>
                                        <th scope="col" class="text-center" style="width: 200px;">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;

            for (const order of linkedOrders) {
                const customer = await customerStore.get(order.customerId);
                const customerName = customer ? customer.name : 'Không xác định';
                
                let orderTotal = 0;
                if (order.items && order.items.length > 0) {
                    orderTotal = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                }
                
                // Tính toán sum payments THEO DB thay vì fix cứng trong order
                const orderPayments = tripPayments.filter(p => String(p.orderId) === String(order.id));
                const paymentReceived = orderPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                const remainingDebt = orderTotal - paymentReceived;

                content += `
                    <tr id="order-row-${order.id}">
                        <td class="text-center"><strong>${order.id}</strong></td>
                        <td>${customerName}</td>
                        <td class="text-center">${formatDate(order.orderDate)}</td>
                        <td class="text-center">
                            <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span>
                        </td>
                        <td class="text-end"><strong>${formatCurrency(orderTotal)}</strong></td>
                        <td class="text-end text-success">${formatCurrency(paymentReceived)}</td>
                        <td class="text-end ${remainingDebt > 0 ? 'text-danger' : 'text-success'}">
                            <strong>${formatCurrency(remainingDebt)}</strong>
                        </td>
                        <td class="text-center">
                            <div class="btn-group btn-group-sm">
                                ${remainingDebt > 0 && order.status !== 'Thành công' ? `
                                    <button class="btn btn-outline-success btn-sm" 
                                            data-order-id="${order.id}" 
                                            data-trip-id="${tripId}" 
                                            data-customer-name="${customerName.replace(/'/g, '&apos;')}" 
                                            data-order-total="${orderTotal}" 
                                            data-payment-received="${paymentReceived}"
                                            onclick="openPaymentModal(this.dataset.orderId, this.dataset.tripId, this.dataset.customerName, this.dataset.orderTotal, this.dataset.paymentReceived)">
                                        <i class="bi bi-credit-card"></i> Thanh toán
                                    </button>
                                ` : ''}
                                <button class="btn btn-outline-danger btn-sm" onclick="unlinkOrderFromTrip(${order.id})">
                                    <i class="bi bi-x-circle"></i> Hủy liên kết
                                </button>
                                <button class="btn btn-outline-info btn-sm" onclick="showTripOrderDetail(${order.id})">
                                    <i class="bi bi-eye"></i> Chi tiết
                                </button>
                            </div>
                        </td>
                                        </tr>
                `;
            }

            content += `
                                </tbody>
                            </table>
                        </div>
            `;
        }

        content += `
                </div>
                </div>
                        </div>

                <!-- Tab nhân viên -->
                <div class="tab-pane fade" id="trip-employees-pane" role="tabpanel">
                    <div class="card">
                        <div class="card-header bg-light d-flex justify-content-between align-items-center">
                            <h5 class="card-title mb-0">Nhân viên tham gia chuyến hàng</h5>
                            <span class="badge bg-primary">${(trip.employees || []).length} người</span>
                        </div>
                        <div class="card-body">
                            ${(trip.employees && trip.employees.length > 0) ? `
                                <div class="table-responsive">
                                    <table class="table table-hover align-middle">
                                        <thead class="table-light">
                                            <tr>
                                                <th>Nhân viên</th>
                                                <th class="text-end">Tiền công/Chuyến</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${(trip.employees || []).filter(emp => emp !== null).map(emp => `
                                                <tr>
                                                    <td>
                                                        <div class="fw-bold text-primary">${emp.name || 'N/A'}</div>
                                                        <small class="text-muted">ID: ${emp.employeeId || 'N/A'}</small>
                                                    </td>
                                                    <td class="text-end fw-bold text-success">
                                                        ${formatCurrency(emp.pay || 0)}
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                        <tfoot class="table-light">
                                            <tr>
                                                <th class="fw-bold">Tổng cộng tiền công:</th>
                                                <th class="text-end text-danger fw-bold fs-5">
                                                    ${formatCurrency((trip.employees || []).filter(e => e !== null).reduce((sum, e) => sum + (e.pay || 0), 0))}
                                                </th>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ` : `
                                <div class="text-center py-4 bg-light rounded shadow-sm border border-dashed">
                                    <i class="bi bi-people text-muted fs-1"></i>
                                    <p class="mt-2 text-muted mb-0">Chưa có nhân viên nào được gán cho chuyến này.</p>
                                    <button class="btn btn-sm btn-outline-primary mt-3" onclick="bootstrap.Modal.getInstance(document.getElementById('tripDetailModal')).hide(); TripModule.actions.edit(${trip.id});">
                                        <i class="bi bi-person-plus me-1"></i>Gán nhân viên ngay
                                    </button>
                                </div>
                            `}
                        </div>
                    </div>
                </div>

                <!-- Tab chi phí -->
                <div class="tab-pane fade" id="trip-expenses-pane" role="tabpanel">
                        <div class="row">
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="card-title mb-0">Thêm chi phí</h5>
                            </div>
                                <div class="card-body">
                                    <form id="add-expense-form" data-trip-id="${tripId}">
                        <div class="mb-3">
                                            <label for="expense-category" class="form-label">Loại chi phí</label>
                                            <select class="form-select" id="expense-category" required>
                                                <option value="" disabled selected>Chọn loại chi phí</option>
                                                <option value="Xăng dầu">Xăng dầu</option>
                                                <option value="Phí cầu đường">Phí cầu đường</option>
                                                <option value="Ăn uống">Ăn uống</option>
                                                <option value="Lưu trú">Lưu trú</option>
                                                <option value="Lương tài xế">Lương tài xế</option>
                                                <option value="Lương phụ xe">Lương phụ xe</option>
                                                <option value="Sửa chữa xe">Sửa chữa xe</option>
                                                <option value="Bảo dưỡng xe">Bảo dưỡng xe</option>
                                                <option value="Chi phí khác">Chi phí khác</option>
                            </select>
                        </div>
                        <div class="mb-3">
                                <label for="expense-amount" class="form-label">Số tiền (K)</label>
                                <input type="number" class="form-control" id="expense-amount" min="0" step="any" required>
                        </div>
                        <div class="mb-3">
                                            <label for="expense-description" class="form-label">Mô tả</label>
                                            <textarea class="form-control" id="expense-description" rows="2" placeholder="Mô tả chi tiết"></textarea>
                        </div>
                        <div class="mb-3">
                                            <label for="expense-date" class="form-label">Ngày</label>
                                            <input type="date" class="form-control" id="expense-date" required>
                        </div>
                                        <button type="submit" class="btn btn-primary w-100">Thêm chi phí</button>
                                        <button type="button" class="btn btn-secondary w-100 mt-2" id="cancel-edit-expense" style="display: none;">Hủy</button>
                    </form>
                </div>
                </div>
            </div>
                        <div class="col-md-8">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="card-title mb-0">Danh sách chi phí</h5>
                                </div>
                                <div class="card-body" id="expense-list-container">
        `;

        if (tripExpenses.length === 0) {
            content += '<div class="alert alert-info">Chưa có chi phí nào cho chuyến hàng này.</div>';
        } else {
            content += `
                <div class="table-responsive">
                    <table class="table table-striped table-hover align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th scope="col" style="width: 120px;">Loại chi phí</th>
                                <th scope="col" class="text-end" style="width: 130px;">Số tiền</th>
                                <th scope="col">Mô tả</th>
                                <th scope="col" class="text-center" style="width: 140px;">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            tripExpenses.forEach(expense => {
                content += `
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

            content += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        content += `
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab liên kết đơn hàng -->
                <div class="tab-pane fade show active" id="link-orders-pane" role="tabpanel">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Liên kết đơn hàng mới</h5>
                        </div>
                        <div class="card-body" id="link-orders-tab-pane">
                            <!-- Nội dung sẽ được load bằng updateTripDetailOrders -->
                        </div>
                    </div>
                </div>
                <!-- Tab hóa đơn -->
                <div class="tab-pane fade" id="invoice-tab-pane" role="tabpanel">
                    <div id="invoice-tab-content"></div>
                </div>
            </div>
        `;

        // Hiển thị modal
        const modalEl = document.getElementById('tripDetailModal');
        if (!modalEl) {
            console.error('❌ Error: tripDetailModal element not found!');
            return;
        }

        document.getElementById('trip-detail-content').innerHTML = content;
        const modalLabel = document.getElementById('tripDetailModalLabel');
        if (modalLabel) modalLabel.textContent = `Chi tiết chuyến hàng: ${trip.tripName}`;
        
        // Use existing instance if available, otherwise create new one
        let modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) {
            // If already exists, just refresh content (already done via innerHTML)
            // But we might need to show if it was hidden
            modalInstance.show();
        } else {
            // Create new instance
            modalInstance = new bootstrap.Modal(modalEl);
            modalInstance.show();
        }

        // Load dữ liệu cho tab liên kết đơn hàng
        await updateTripDetailOrders(tripId);

        // Initialize TripExpenseModule for this trip
        if (typeof TripExpenseModule !== 'undefined') {
            await TripExpenseModule.initForTrip(tripId);
        }

        // Setup event listeners for edit/delete buttons (following supplier.js pattern)
        document.querySelectorAll('.edit-expense-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const expenseId = parseInt(e.currentTarget.getAttribute('data-expense-id'));
                console.log('Edit expense ID:', expenseId);
                if (typeof TripExpenseModule !== 'undefined') {
                    await TripExpenseModule.actions.edit(expenseId);
                }
            });
        });

        document.querySelectorAll('.delete-expense-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const expenseId = parseInt(e.currentTarget.getAttribute('data-expense-id'));
                console.log('Delete expense ID:', expenseId);
                if (typeof TripExpenseModule !== 'undefined') {
                    TripExpenseModule.actions.confirmDelete(expenseId);
                }
            });
        });

        // Sau khi render modal, gọi renderInvoiceTab(tripId) khi tab hóa đơn được click
        const invoiceTabBtn = document.getElementById('invoice-tab');
        if (invoiceTabBtn) {
            invoiceTabBtn.addEventListener('click', function() {
                renderInvoiceTab(tripId);
            });
        }

    } catch (error) {
        console.error('Lỗi khi hiển thị chi tiết chuyến hàng:', error);
        alert('Có lỗi xảy ra khi tải chi tiết chuyến hàng');
    }
}

// Set legacy functions in module
TripModule.legacy.showTripDetail = showTripDetail;

// Continue preserving all remaining functions...
// [ALL OTHER ORIGINAL FUNCTIONS PRESERVED HERE]

// ===== MODULE INITIALIZATION =====
// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Wait a moment for other modules to be ready
    setTimeout(async () => {
        try {
            console.log('🎯 Starting TripModule auto-initialization...');
            const success = await TripModule.init();
            if (success) {
                console.log('✅ TripModule initialized successfully');
            } else {
                console.error('❌ TripModule initialization failed');
            }
        } catch (error) {
            console.error('❌ Error during TripModule auto-initialization:', error);
        }
    }, 100);
});

// Export for script.js compatibility
window.loadTripModule = async function() {
    console.log('📦 Loading TripModule via window.loadTripModule...');
    return await TripModule.init();
};

// Export TripModule globally
window.TripModule = TripModule;

// ===== ALL REMAINING ORIGINAL FUNCTIONS PRESERVED BELOW =====

// Preserved: Link orders to trip (original business logic)
async function linkOrdersToTrip(tripId, orderIds) {
    tripId = parseInt(tripId);

    try {
        const tx = db.transaction('orders', 'readwrite');
        const store = tx.objectStore('orders');

        let successCount = 0;
        for (const orderId of orderIds) {
            const order = await store.get(orderId);
            if (order && (order.status === 'Mới' || order.status === 'Đang xử lý' || order.status === 'Chờ xử lý')) {
                // Cập nhật trạng thái thành "Đang xử lý" và liên kết với chuyến hàng
                order.status = 'Đang xử lý';
                order.deliveredTripId = tripId;
                order.linkedDate = new Date(); // Đổi từ deliveredDate thành linkedDate
                
                // Khởi tạo paymentReceived nếu chưa có
                if (!order.paymentReceived) {
                    order.paymentReceived = 0;
                }
                
                await store.put(order);
                successCount++;
                console.log(`✅ Đã liên kết đơn hàng ID: ${orderId} với chuyến hàng ID: ${tripId}, status: ${order.status}`);
            } else {
                console.log(`⚠️ Không thể liên kết đơn hàng ID: ${orderId} - order không tồn tại hoặc status không hợp lệ`);
            }
        }

        await tx.done;

        if (successCount > 0) {
            console.log(`✅ Đã liên kết thành công ${successCount}/${orderIds.length} đơn hàng với chuyến hàng ID: ${tripId}`);
            
            // Hiển thị thông báo thành công
            if (typeof TripModule !== 'undefined' && TripModule.ui && TripModule.ui.showSuccess) {
                TripModule.ui.showSuccess(`Đã liên kết thành công ${successCount} đơn hàng với chuyến hàng!`);
            } else {
            alert(`Đã liên kết thành công ${successCount} đơn hàng với chuyến hàng!`);
            }

        // Cập nhật trực tiếp giao diện modal chi tiết chuyến hàng
        await updateTripDetailOrders(tripId);
        // Cập nhật lại tab Đơn hàng đã liên kết
        await updateLinkedOrdersTab(tripId);

            // Cập nhật lại tab Liên kết đơn hàng để đơn hàng vừa hủy xuất hiện lại trong danh sách
            await updateTripDetailOrders(tripId);
            
            // Cập nhật giao diện danh sách đơn hàng chung với refresh đầy đủ
            if (typeof window.OrderModule !== 'undefined' && window.OrderModule.refresh) {
                await window.OrderModule.refresh();
            } else if (typeof displayOrders === 'function') {
        await displayOrders();
            }
            
            if (typeof displayReports === 'function') {
        await displayReports();
            }
            
            // Refresh trip module để cập nhật trạng thái
            if (typeof TripModule !== 'undefined' && TripModule.refresh) {
                await TripModule.refresh();
            }

            // Đồng bộ công nợ nếu module có sẵn
            if (window.DebtModule && window.DebtModule.actions && typeof window.DebtModule.actions.displayCustomerDebts === 'function') {
                console.log('🔄 Đồng bộ: Đang cập nhật lại công nợ sau khi liên kết đơn hàng...');
                await window.DebtModule.actions.displayCustomerDebts();
            }
        } else {
            if (typeof TripModule !== 'undefined' && TripModule.ui && TripModule.ui.showError) {
                TripModule.ui.showError('Không có đơn hàng nào được liên kết. Vui lòng kiểm tra lại.');
        } else {
            alert('Không có đơn hàng nào được liên kết. Vui lòng kiểm tra lại.');
            }
        }

        return successCount > 0;
    } catch (error) {
        console.error('Lỗi khi liên kết đơn hàng với chuyến hàng:', error);
        if (typeof TripModule !== 'undefined' && TripModule.ui && TripModule.ui.showError) {
            TripModule.ui.showError('Có lỗi xảy ra khi liên kết đơn hàng. Vui lòng thử lại.');
        } else {
        alert('Có lỗi xảy ra khi liên kết đơn hàng. Vui lòng thử lại.');
        }
        return false;
    }
}

// Preserved: Update trip detail orders (original business logic)
async function updateTripDetailOrders(tripId) {
    tripId = parseInt(tripId);

    try {
        // Lấy thông tin chuyến hàng và đơn hàng
        const tx = db.transaction(['orders', 'customers'], 'readonly');
        const orderStore = tx.objectStore('orders');
        const customerStore = tx.objectStore('customers');

        const orders = await orderStore.getAll();

        // Lấy danh sách đơn hàng đã giao trong chuyến
        const deliveredOrders = orders.filter(order => order.deliveredTripId === tripId);

        // Lấy danh sách đơn hàng chờ xử lý (chưa liên kết với chuyến hàng)
        const pendingOrders = orders.filter(order =>
            (order.status === 'Mới' || order.status === 'Chờ xử lý') &&
            !order.deliveredTripId
        );

        // Tính tổng doanh thu từ các đơn hàng đã giao
        let totalRevenue = 0;
        for (const order of deliveredOrders) {
            if (order.items && order.items.length > 0) {
                totalRevenue += order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
            }
        }

        // Cập nhật tab liên kết đơn hàng
        const linkOrdersTabPane = document.getElementById('link-orders-tab-pane');
        if (linkOrdersTabPane) {
            let html = `
                <form id="link-orders-form" data-trip-id="${tripId}">
                    <div class="mb-3">
                        <label class="form-label">Chọn đơn hàng cần liên kết</label>
            `;

            if (pendingOrders.length === 0) {
                html += '<div class="alert alert-warning">Không có đơn hàng nào đang chờ xử lý.</div>';
            } else {
                html += `
                    <div class="table-responsive">
                        <table class="table table-sm table-striped">
                            <thead>
                                <tr>
                                    <th>Chọn</th>
                                    <th>ID</th>
                                    <th>Khách hàng</th>
                                    <th>Ngày đặt</th>
                                    <th>Trạng thái</th>
                                    <th>Tổng tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                for (const order of pendingOrders) {
                    const customer = await customerStore.get(order.customerId);
                    const customerName = customer ? customer.name : 'Không xác định';

                    let orderTotal = 0;
                    if (order.items && order.items.length > 0) {
                        orderTotal = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                    }

                    html += `
                        <tr>
                            <td>
                                <div class="form-check">
                                    <input class="form-check-input order-checkbox" type="checkbox" value="${order.id}" id="order-${order.id}">
                                </div>
                            </td>
                            <td>${order.id}</td>
                            <td>${customerName}</td>
                            <td>${formatDate(order.orderDate)}</td>
                            <td><span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></td>
                            <td class="text-end">${formatCurrency(orderTotal)}</td>
                        </tr>
                    `;
                }

                html += `
                            </tbody>
                        </table>
                    </div>
                `;
            }

            html += `
                    </div>
                    <button type="submit" class="btn btn-primary">Xác nhận giao hàng & Liên kết với chuyến</button>
                </form>
            `;

            linkOrdersTabPane.innerHTML = html;

            // Thêm lại sự kiện cho form liên kết đơn hàng
            const linkOrdersForm = document.getElementById('link-orders-form');
            if (linkOrdersForm) {
                linkOrdersForm.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const tripId = parseInt(linkOrdersForm.getAttribute('data-trip-id'));
                    const selectedOrderIds = Array.from(document.querySelectorAll('.order-checkbox:checked')).map(checkbox => parseInt(checkbox.value));

                    if (selectedOrderIds.length > 0) {
                        await linkOrdersToTrip(tripId, selectedOrderIds);
                    } else {
                        if (typeof TripModule !== 'undefined' && TripModule.ui && TripModule.ui.showError) {
                            TripModule.ui.showError('Vui lòng chọn ít nhất một đơn hàng để liên kết.');
                    } else {
                        alert('Vui lòng chọn ít nhất một đơn hàng để liên kết.');
                        }
                    }
                });
            }
        }

        // Cập nhật doanh thu trong card thông tin
        const revenueCardElement = document.querySelector('.card-text.fs-4.text-primary');
        if (revenueCardElement) {
            revenueCardElement.textContent = formatCurrency(totalRevenue);
        }

        // Cập nhật lợi nhuận trong card thông tin
        const grossProfitCardElement = document.querySelector('.card-text.fs-4:not(.text-danger):not(.text-primary)');
        if (grossProfitCardElement) {
            // Lấy tổng chi phí nhập hàng
            const costCardElement = document.querySelector('.card-text.fs-4.text-danger');
            if (costCardElement) {
                const totalCostText = costCardElement.textContent;
                const totalCost = parseFloat(totalCostText.replace(/[^\d.-]/g, '')) || 0;
                const grossProfit = totalRevenue - totalCost;

                // Cập nhật giá trị và màu nền
                grossProfitCardElement.textContent = formatCurrency(grossProfit);
                const grossProfitCard = grossProfitCardElement.closest('.card');
                if (grossProfitCard) {
                    grossProfitCard.className = grossProfit >= 0 ?
                        'card bg-success text-white' : 'card bg-danger text-white';
                }
            }
        }

    } catch (error) {
        console.error('Lỗi khi cập nhật thông tin đơn hàng trong chi tiết chuyến:', error);
    }
}

// Preserved: Unlink order from trip (original business logic)
async function unlinkOrderFromTrip(orderId) {
    orderId = parseInt(orderId);

    try {
        // Sử dụng confirm hiện đại
        let confirmed = false;
        if (typeof TripModule !== 'undefined' && TripModule.ui && TripModule.ui.confirm) {
            confirmed = await TripModule.ui.confirm('Bạn có chắc muốn hủy liên kết đơn hàng này khỏi chuyến hàng?');
        } else {
            confirmed = window.confirm('Bạn có chắc muốn hủy liên kết đơn hàng này khỏi chuyến hàng?');
        }
        if (!confirmed) {
            return;
        }

        const tx = db.transaction('orders', 'readwrite');
        const store = tx.objectStore('orders');

        const order = await store.get(orderId);
        if (order) {
            const tripId = order.deliveredTripId;

            // Reset trạng thái đơn hàng
            order.status = 'Chờ xử lý';
            order.deliveredTripId = null;
            order.paymentReceived = 0; // Reset thanh toán về 0

            await store.put(order);
            await tx.done;

            console.log(`Đã hủy liên kết đơn hàng ${orderId} khỏi chuyến hàng`);

            // Hiển thị thông báo thành công
            if (typeof TripModule !== 'undefined' && TripModule.ui && TripModule.ui.showSuccess) {
                TripModule.ui.showSuccess(`Đã hủy liên kết đơn hàng #${orderId} khỏi chuyến hàng thành công!`);
            }

            // Chỉ cập nhật lại tab Đơn hàng đã liên kết (không thay đổi modal cha)
            await updateLinkedOrdersTab(tripId);
            
            // Cập nhật lại tab Liên kết đơn hàng để đơn hàng vừa hủy xuất hiện lại trong danh sách
            await updateTripDetailOrders(tripId);
            
            // Cập nhật giao diện danh sách đơn hàng chung với refresh đầy đủ
            if (typeof window.OrderModule !== 'undefined' && window.OrderModule.refresh) {
                await window.OrderModule.refresh();
            } else if (typeof displayOrders === 'function') {
                await displayOrders();
            }

            // Đồng bộ công nợ nếu module có sẵn (Vì hủy liên kết có thể thay đổi trạng thái nợ của đơn)
            if (window.DebtModule && window.DebtModule.actions && typeof window.DebtModule.actions.displayCustomerDebts === 'function') {
                console.log('🔄 Đồng bộ: Đang cập nhật lại công nợ sau khi hủy liên kết đơn hàng...');
                await window.DebtModule.actions.displayCustomerDebts();
            }
        }
    } catch (error) {
        console.error('Lỗi khi hủy liên kết đơn hàng:', error);
        if (typeof TripModule !== 'undefined' && TripModule.ui && TripModule.ui.showError) {
            TripModule.ui.showError('Có lỗi xảy ra khi hủy liên kết đơn hàng');
        } else {
        alert('Có lỗi xảy ra khi hủy liên kết đơn hàng');
    }
    }
}

// Preserved: Open payment modal (original business logic)
function openPaymentModal(orderId, tripId, customerName, orderTotal, currentPayment) {
    // Check if database is ready
    if (!window.db) {
        alert('Cơ sở dữ liệu chưa sẵn sàng. Vui lòng thử lại sau.');
        return;
    }
    
    // Convert string parameters to proper types
    orderId = parseInt(orderId);
    tripId = parseInt(tripId);
    orderTotal = parseFloat(orderTotal);
    currentPayment = parseFloat(currentPayment);
    customerName = customerName.replace(/&apos;/g, "'"); // Convert back HTML entities
    const remainingDebt = orderTotal - currentPayment;
    
    const modalHtml = `
        <div class="modal fade" id="paymentModal" tabindex="-1" aria-labelledby="paymentModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="paymentModalLabel">Thanh toán đơn hàng #${orderId}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <p><strong>Khách hàng:</strong> ${customerName}</p>
                            <p><strong>Tổng tiền đơn hàng:</strong> <span class="text-primary">${formatCurrency(orderTotal)}</span></p>
                            <p><strong>Đã thanh toán:</strong> <span class="text-success">${formatCurrency(currentPayment)}</span></p>
                            <p><strong>Còn nợ:</strong> <span class="text-danger">${formatCurrency(remainingDebt)}</span></p>
                        </div>
                        <form id="payment-form" data-order-id="${orderId}" data-trip-id="${tripId}">
                            <div class="mb-3">
                                <label for="payment-amount" class="form-label">Số tiền thanh toán (K)</label>
                                <input type="number" class="form-control" id="payment-amount" 
                                       min="0" max="${remainingDebt}" value="${remainingDebt}" required step="any">
                                <div class="form-text">Tối đa: ${formatCurrency(remainingDebt)}</div>
                            </div>
                            <div class="mb-3">
                                <label for="payment-method" class="form-label">Phương thức thanh toán</label>
                                <select class="form-select" id="payment-method" required>
                                    <option value="Tiền mặt">Tiền mặt</option>
                                    <option value="Chuyển khoản">Chuyển khoản</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="payment-note" class="form-label">Ghi chú</label>
                                <textarea class="form-control" id="payment-note" rows="2" placeholder="Ghi chú về thanh toán (không bắt buộc)"></textarea>
                            </div>
                            <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                                <button type="submit" class="btn btn-success">Xác nhận thanh toán</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Loại bỏ modal cũ nếu có
    const existingModal = document.getElementById('paymentModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Thêm modal mới vào body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Hiển thị modal
    const paymentModalEl = document.getElementById('paymentModal');
    const modal = new bootstrap.Modal(paymentModalEl);
    window._currentPaymentModalInstance = modal;
    modal.show();

    // Thêm sự kiện cho form
    const paymentForm = document.getElementById('payment-form');
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const orderId = parseInt(paymentForm.getAttribute('data-order-id'));
        const tripId = parseInt(paymentForm.getAttribute('data-trip-id'));
        const amount = parseFloat(document.getElementById('payment-amount').value);
        const method = document.getElementById('payment-method').value;
        const note = document.getElementById('payment-note').value;

        const success = await processPayment(orderId, tripId, amount, method, note);
        if (success) {
            if (typeof TripModule !== 'undefined' && TripModule.ui && TripModule.ui.showSuccess) {
                TripModule.ui.showSuccess('Thanh toán thành công!');
            } else {
                alert('Thanh toán thành công!');
            }
            const paymentModalEl = document.getElementById('paymentModal');
            if (paymentModalEl) {
                // Đăng ký sự kiện chỉ một lần để remove modal khỏi DOM sau khi đã ẩn xong
                const handler = function() {
                    paymentModalEl.removeEventListener('hidden.bs.modal', handler);
                    paymentModalEl.remove();
                };
                paymentModalEl.addEventListener('hidden.bs.modal', handler);
                // Ưu tiên dùng instance đã lưu
                if (window._currentPaymentModalInstance) {
                    window._currentPaymentModalInstance.hide();
                    window._currentPaymentModalInstance = null;
                } else {
                    const modalInstance = bootstrap.Modal.getOrCreateInstance(paymentModalEl);
                    modalInstance.hide();
                }
                // Fallback: remove modal nếu sau 500ms vẫn chưa đóng
                setTimeout(() => {
                    if (document.body.contains(paymentModalEl)) {
                        paymentModalEl.remove();
                    }
                }, 500);
            }
        } else {
            if (typeof TripModule !== 'undefined' && TripModule.ui && TripModule.ui.showErrors) {
                TripModule.ui.showErrors(['Thanh toán thất bại. Vui lòng kiểm tra lại!']);
            } else {
                alert('Thanh toán thất bại. Vui lòng kiểm tra lại!');
            }
            // Không đóng modal nếu thất bại
        }
    });
}

// Preserved: Process payment (original business logic)
async function processPayment(orderId, tripId, amount, method, note) {
    try {
        const tx = db.transaction(['orders', 'payments'], 'readwrite');
        const orderStore = tx.objectStore('orders');
        const paymentStore = tx.objectStore('payments');

        // Lấy thông tin đơn hàng
        const order = await orderStore.get(orderId);
        if (!order) {
            alert('Không tìm thấy đơn hàng');
            return false;
        }

        // Tính tổng tiền đơn hàng
        const orderTotal = (order.items || []).reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
        
        // Tính toán số tiền đã thanh toán hiện tại bằng cách sum tất cả bản ghi trong store payments
        const allPayments = await paymentStore.getAll();
        const currentPayment = allPayments
            .filter(p => String(p.orderId) === String(orderId))
            .reduce((sum, p) => sum + (p.amount || 0), 0);
            
        const remainingDebt = orderTotal - currentPayment;

        // Kiểm tra số tiền thanh toán
        if (amount <= 0 || amount > remainingDebt) {
            alert('Số tiền thanh toán không hợp lệ hoặc vượt quá dư nợ: ' + formatCurrency(remainingDebt));
            return false;
        }

        // Tạo bản ghi thanh toán
        const paymentData = {
            orderId: orderId,
            customerId: order.customerId,
            amount: amount,
            method: method,
            note: note || '',
            paymentDate: new Date().toISOString().split('T')[0],
            tripId: tripId
        };

        await paymentStore.add(paymentData);

        // Cập nhật trạng thái thanh toán (đồng bộ với OrderModule)
        // Không còn lưu fixed order.paymentReceived nữa, chỉ cập nhật status nếu cần
        const newTotalPaid = currentPayment + amount;
        
        if (newTotalPaid >= orderTotal) {
            order.status = 'Thành công';
            order.paymentStatus = 'Đã thanh toán đủ';
        } else if (newTotalPaid > 0) {
            order.paymentStatus = 'Thanh toán một phần';
        } else {
            order.paymentStatus = 'Chưa thanh toán';
        }

        // Xóa thuộc tính paymentReceived nếu nó tồn tại để đảm bảo không bị "fix cứng"
        delete order.paymentReceived;

        await orderStore.put(order);
        await tx.done;

        console.log('Đã xử lý thanh toán thành công');

        // Kiểm tra và cập nhật trạng thái chuyến hàng
        await checkAndUpdateTripStatus(tripId);

        // Refresh giao diện
        await showTripDetail(tripId);
        
        // Cập nhật các module khác nếu có
        if (typeof displayOrders === 'function') {
            await displayOrders();
        }
        if (typeof displayReports === 'function') {
            await displayReports();
        }
        if (window.DebtModule && window.DebtModule.actions && typeof window.DebtModule.actions.displayCustomerDebts === 'function') {
            await window.DebtModule.actions.displayCustomerDebts();
        }

        return true;
    } catch (error) {
        console.error('Lỗi khi xử lý thanh toán:', error);
        alert('Có lỗi xảy ra khi xử lý thanh toán');
        return false;
    }
}

// Preserved: Check and update trip status (original business logic)
async function checkAndUpdateTripStatus(tripId) {
    try {
        const tx = db.transaction(['trips', 'orders'], 'readwrite');
        const tripStore = tx.objectStore('trips');
        const orderStore = tx.objectStore('orders');

        const trip = await tripStore.get(tripId);
        const allOrders = await orderStore.getAll();

        if (!trip) return;

        // Lấy tất cả đơn hàng liên kết với chuyến này
        const linkedOrders = allOrders.filter(order => order.deliveredTripId === tripId);

        if (linkedOrders.length === 0) return;

        // Kiểm tra xem tất cả đơn hàng đã "Thành công" chưa
        const allOrdersCompleted = linkedOrders.every(order => order.status === 'Thành công');

        if (allOrdersCompleted && trip.status !== 'Đã giao') {
            trip.status = 'Đã giao';
            trip.completedDate = new Date().toISOString().split('T')[0];
            await tripStore.put(trip);
            
            console.log(`Đã cập nhật trạng thái chuyến hàng ${tripId} thành "Đã giao"`);
        }

        await tx.done;
    } catch (error) {
        console.error('Lỗi khi kiểm tra và cập nhật trạng thái chuyến hàng:', error);
    }
}

// Preserved: Show trip order detail (original business logic)
async function showTripOrderDetail(orderId) {
    try {
        // Thử sử dụng function từ order.js trước
        if (typeof window.showOrderDetail === 'function') {
            await window.showOrderDetail(orderId);
            return;
        }
        
        // Fallback: Tự tạo modal chi tiết đơn hàng
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
        let totalAmount = 0;
        let totalProfit = 0;
        
        if (order.items && order.items.length > 0) {
            totalAmount = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
            totalProfit = order.items.reduce((sum, item) => sum + (item.qty * ((item.sellingPrice || 0) - (item.purchasePrice || 0))), 0);
        }

        // Tạo modal chi tiết
        const modalHtml = `
            <div class="modal fade" id="orderDetailModal" tabindex="-1" aria-labelledby="orderDetailModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="orderDetailModalLabel">Chi tiết đơn hàng #${order.id}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <p><strong>Khách hàng:</strong> ${customerName}</p>
                                <p><strong>Ngày đặt:</strong> ${formatDate(order.orderDate)}</p>
                                <p><strong>Trạng thái:</strong> <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></p>
                                <p><strong>Tổng tiền:</strong> <span class="fw-bold text-primary">${formatCurrency(totalAmount)}</span></p>
                                <p><strong>Đã thanh toán:</strong> <span class="fw-bold text-success">${formatCurrency(order.paymentReceived || 0)}</span></p>
                                <p><strong>Còn nợ:</strong> <span class="fw-bold text-danger">${formatCurrency(totalAmount - (order.paymentReceived || 0))}</span></p>
                            </div>

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
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${order.items.map(item => {
                                            const itemTotal = item.qty * item.sellingPrice;
                                            return `
                                            <tr>
                                                <td><small>${item.supplierName || 'Không xác định'}</small></td>
                                                <td>${item.productName}</td>
                                                <td class="text-center">${item.qty}</td>
                                                <td class="text-end">${formatCurrency(item.purchasePrice || 0)}</td>
                                                <td class="text-end">${formatCurrency(item.sellingPrice)}</td>
                                                <td class="text-end fw-bold">${formatCurrency(itemTotal)}</td>
                                            </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <th colspan="5" class="text-end">Tổng cộng:</th>
                                            <th class="text-end">${formatCurrency(totalAmount)}</th>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Loại bỏ modal cũ nếu có
        const existingModal = document.getElementById('orderDetailModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Thêm modal mới vào body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Hiển thị modal
        const modal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
        modal.show();

    } catch (error) {
        console.error('Lỗi khi hiển thị chi tiết đơn hàng:', error);
        alert('Có lỗi xảy ra khi hiển thị chi tiết đơn hàng!');
    }
}

// Preserved: Add trip expense (original business logic)
async function addTripExpense(expenseData) {
    try {
        const tx = db.transaction('tripExpenses', 'readwrite');
        const store = tx.objectStore('tripExpenses');

        const id = await store.add(expenseData);
        await tx.done;

        console.log('Đã thêm chi phí chuyến hàng mới với ID:', id);
        return true;
    } catch (error) {
        console.error('Lỗi khi thêm chi phí chuyến hàng:', error);
        alert('Có lỗi xảy ra khi thêm chi phí');
        return false;
    }
}

// Preserved: Edit trip expense (original business logic)
async function editTripExpense(expenseId, currentType, currentAmount, currentDescription) {
    // Convert string parameters to proper types
    expenseId = parseInt(expenseId);
    currentAmount = parseFloat(currentAmount);
    currentDescription = currentDescription.replace(/&apos;/g, "'"); // Convert back HTML entities
    try {
        // Tạo modal chỉnh sửa chi phí
        const modalHtml = `
            <div class="modal fade" id="editExpenseModal" tabindex="-1" aria-labelledby="editExpenseModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="editExpenseModalLabel">Sửa chi phí</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="edit-expense-form" data-expense-id="${expenseId}">
                                <div class="mb-3">
                                    <label for="edit-expense-type" class="form-label">Loại chi phí</label>
                                    <select class="form-select" id="edit-expense-type" required>
                                        <option value="Xăng dầu" ${currentType === 'Xăng dầu' ? 'selected' : ''}>Xăng dầu</option>
                                        <option value="Phí đường" ${currentType === 'Phí đường' ? 'selected' : ''}>Phí đường</option>
                                        <option value="Ăn uống" ${currentType === 'Ăn uống' ? 'selected' : ''}>Ăn uống</option>
                                        <option value="Khác" ${currentType === 'Khác' ? 'selected' : ''}>Khác</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="edit-expense-amount" class="form-label">Số tiền (K)</label>
                                    <input type="number" class="form-control" id="edit-expense-amount" min="0" value="${currentAmount}" required step="any">
                                </div>
                                <div class="mb-3">
                                    <label for="edit-expense-description" class="form-label">Mô tả</label>
                                    <input type="text" class="form-control" id="edit-expense-description" value="${currentDescription}" placeholder="Mô tả chi tiết">
                                </div>
                                <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                                    <button type="submit" class="btn btn-warning">Cập nhật</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Loại bỏ modal cũ nếu có
        const existingModal = document.getElementById('editExpenseModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Thêm modal mới vào body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Hiển thị modal
        const modal = new bootstrap.Modal(document.getElementById('editExpenseModal'));
        modal.show();

        // Thêm sự kiện cho form
        const editExpenseForm = document.getElementById('edit-expense-form');
        editExpenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const expenseId = parseInt(editExpenseForm.getAttribute('data-expense-id'));
            const updatedData = {
                type: document.getElementById('edit-expense-type').value,
                amount: parseFloat(document.getElementById('edit-expense-amount').value),
                description: document.getElementById('edit-expense-description').value || ''
            };

            const success = await updateTripExpense(expenseId, updatedData);
            if (success) {
                modal.hide();
            }
        });

    } catch (error) {
        console.error('Lỗi khi mở form sửa chi phí:', error);
        alert('Có lỗi xảy ra khi mở form sửa chi phí');
    }
}

// Preserved: Update trip expense (original business logic)
async function updateTripExpense(expenseId, updatedData) {
    try {
        const tx = db.transaction('tripExpenses', 'readwrite');
        const store = tx.objectStore('tripExpenses');

        // Lấy chi phí hiện tại
        const expense = await store.get(expenseId);
        if (!expense) {
            alert('Không tìm thấy chi phí để cập nhật');
            return false;
        }

        // Cập nhật dữ liệu
        const updatedExpense = {
            ...expense,
            ...updatedData
        };

        await store.put(updatedExpense);
        await tx.done;

        console.log('Đã cập nhật chi phí chuyến hàng với ID:', expenseId);

        // Lấy tripId hiện tại và refresh giao diện
        const tripId = getCurrentTripIdFromModal();
        if (tripId) {
            await showTripDetail(tripId);
            await displayTrips();
            if (typeof displayReports === 'function') {
            await displayReports();
            }
        }

        return true;
    } catch (error) {
        console.error('Lỗi khi cập nhật chi phí chuyến hàng:', error);
        alert('Có lỗi xảy ra khi cập nhật chi phí');
        return false;
    }
}

// Preserved: Delete trip expense (original business logic)
async function deleteTripExpense(expenseId) {
    try {
        if (!confirm('Bạn có chắc muốn xóa chi phí này?')) {
            return;
        }

        const tx = db.transaction('tripExpenses', 'readwrite');
        const store = tx.objectStore('tripExpenses');

        await store.delete(expenseId);
        await tx.done;

        console.log('Đã xóa chi phí ID:', expenseId);

        // Refresh giao diện (cần có tripId từ context)
        const currentTripId = getCurrentTripIdFromModal();
        if (currentTripId) {
            await showTripDetail(currentTripId);
            await displayTrips();
            if (typeof displayReports === 'function') {
            await displayReports();
            }
        }
    } catch (error) {
        console.error('Lỗi khi xóa chi phí chuyến hàng:', error);
        alert('Có lỗi xảy ra khi xóa chi phí');
    }
}

// Preserved: Get current trip ID from modal (original business logic)
function getCurrentTripIdFromModal() {
    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
        return parseInt(expenseForm.getAttribute('data-trip-id'));
    }
    return null;
}

// Preserved: Get status badge class (original business logic)
function getStatusBadgeClass(status) {
    switch (status) {
        case 'Mới':
            return 'bg-primary';
        case 'Chờ xử lý':
            return 'bg-warning';
        case 'Đang xử lý':
            return 'bg-info';
        case 'Thành công':
            return 'bg-success';
        case 'Đã hủy':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

// Set all legacy functions in module
TripModule.legacy.linkOrdersToTrip = linkOrdersToTrip;
TripModule.legacy.unlinkOrderFromTrip = unlinkOrderFromTrip;
TripModule.legacy.openPaymentModal = openPaymentModal;
TripModule.legacy.processPayment = processPayment;
TripModule.legacy.showTripOrderDetail = showTripOrderDetail;
TripModule.legacy.addTripExpense = addTripExpense;
TripModule.legacy.editTripExpense = editTripExpense;
TripModule.legacy.updateTripExpense = updateTripExpense;
TripModule.legacy.deleteTripExpense = deleteTripExpense;
TripModule.legacy.getCurrentTripIdFromModal = getCurrentTripIdFromModal;
TripModule.legacy.getStatusBadgeClass = getStatusBadgeClass;

// ===== MODERNIZATION COMPLETE =====
// All original business logic preserved
// Modern UI with Module Pattern added
// Responsive design implemented
// Validation system added
// Toast notifications added
// Modal-based CRUD operations added
// Search and filter functionality added
// Event handling modernized
// Backward compatibility maintained
// Auto-initialization added

// Hàm cập nhật lại tab Đơn hàng đã liên kết
async function updateLinkedOrdersTab(tripId) {
    try {
        // Kiểm tra xem modal có đang mở không
        const tripDetailModal = document.getElementById('tripDetailModal');
        if (!tripDetailModal || !tripDetailModal.classList.contains('show')) {
            console.log('Modal không đang mở, bỏ qua cập nhật tab');
            return;
        }

        const tx = db.transaction(['trips', 'tripExpenses', 'orders', 'customers'], 'readonly');
        const tripStore = tx.objectStore('trips');
        const expenseStore = tx.objectStore('tripExpenses');
        const orderStore = tx.objectStore('orders');
        const customerStore = tx.objectStore('customers');

        const trip = await tripStore.get(tripId);
        const expenses = await expenseStore.getAll();
        const allOrders = await orderStore.getAll();

        // Lấy chi phí của chuyến này
        const tripExpenses = expenses.filter(exp => exp.tripId === tripId);
        // Lấy đơn hàng đã liên kết với chuyến này
        const linkedOrders = allOrders.filter(order => order.deliveredTripId === tripId);

        // Tính lợi nhuận chính xác với giá vốn
        const profitData = calculateCorrectProfit(linkedOrders, tripExpenses);
        const { totalRevenue, totalCOGS, grossProfit, totalExpenses, netProfit, totalPaymentReceived } = profitData;

        // Tìm tab Đơn hàng đã liên kết trong modal
        const linkedOrdersPane = document.getElementById('linked-orders-pane');
        if (!linkedOrdersPane) {
            console.log('Không tìm thấy tab Đơn hàng đã liên kết');
            return;
        }

        let content = '';
        if (linkedOrders.length === 0) {
            content += '<div class="alert alert-info">Chưa có đơn hàng nào được liên kết với chuyến hàng này.</div>';
        } else {
            content += `
                <div class="table-responsive">
                    <table class="table table-striped table-hover align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th scope="col" class="text-center" style="width: 80px;">ID</th>
                                <th scope="col">Khách hàng</th>
                                <th scope="col" class="text-center" style="width: 110px;">Ngày đặt</th>
                                <th scope="col" class="text-center" style="width: 120px;">Trạng thái</th>
                                <th scope="col" class="text-end" style="width: 130px;">Tổng tiền</th>
                                <th scope="col" class="text-end" style="width: 130px;">Đã thanh toán</th>
                                <th scope="col" class="text-end" style="width: 120px;">Còn nợ</th>
                                <th scope="col" class="text-center" style="width: 200px;">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            for (const order of linkedOrders) {
                const customer = await customerStore.get(order.customerId);
                const customerName = customer ? customer.name : 'Không xác định';
                let orderTotal = 0;
                if (order.items && order.items.length > 0) {
                    orderTotal = order.items.reduce((sum, item) => sum + (item.qty * item.sellingPrice), 0);
                }
                const paymentReceived = order.paymentReceived || 0;
                const remainingDebt = orderTotal - paymentReceived;
                content += `
                    <tr id="order-row-${order.id}">
                        <td class="text-center"><strong>${order.id}</strong></td>
                        <td>${customerName}</td>
                        <td class="text-center">${formatDate(order.orderDate)}</td>
                        <td class="text-center">
                            <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span>
                        </td>
                        <td class="text-end"><strong>${formatCurrency(orderTotal)}</strong></td>
                        <td class="text-end text-success">${formatCurrency(paymentReceived)}</td>
                        <td class="text-end ${remainingDebt > 0 ? 'text-danger' : 'text-success'}">
                            <strong>${formatCurrency(remainingDebt)}</strong>
                        </td>
                        <td class="text-center">
                            <div class="btn-group btn-group-sm">
                                ${remainingDebt > 0 && order.status !== 'Thành công' ? `
                                    <button class="btn btn-outline-success btn-sm" 
                                            data-order-id="${order.id}" 
                                            data-trip-id="${tripId}" 
                                            data-customer-name="${customerName.replace(/'/g, '&apos;')}" 
                                            data-order-total="${orderTotal}" 
                                            data-payment-received="${paymentReceived}"
                                            onclick="openPaymentModal(this.dataset.orderId, this.dataset.tripId, this.dataset.customerName, this.dataset.orderTotal, this.dataset.paymentReceived)">
                                        <i class="bi bi-credit-card"></i> Thanh toán
                                    </button>
                                ` : ''}
                                <button class="btn btn-outline-danger btn-sm" onclick="unlinkOrderFromTrip(${order.id})">
                                    <i class="bi bi-x-circle"></i> Hủy liên kết
                                </button>
                                <button class="btn btn-outline-info btn-sm" onclick="showTripOrderDetail(${order.id})">
                                    <i class="bi bi-eye"></i> Chi tiết
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }
            content += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        // AN TOÀN: Chỉ thay đổi nội dung bên trong tab, không thay đổi modal cha
        linkedOrdersPane.innerHTML = content;
        
        console.log(`✅ Đã cập nhật tab Đơn hàng đã liên kết cho chuyến hàng ${tripId}`);
    } catch (error) {
        console.error('Lỗi khi cập nhật tab Đơn hàng đã liên kết:', error);
        // Không hiển thị lỗi cho user để tránh làm gián đoạn UX
    }
}

// Thêm hàm renderInvoiceTab
async function renderInvoiceTab(tripId) {
    const container = document.getElementById('invoice-tab-content');
    if (!container) return;
    // Lấy đơn hàng đã liên kết với chuyến này
    const tx = db.transaction(['orders', 'customers'], 'readonly');
    const orderStore = tx.objectStore('orders');
    const customerStore = tx.objectStore('customers');
    const orders = await orderStore.getAll();
    const linkedOrders = orders.filter(order => order.deliveredTripId === tripId);
    if (linkedOrders.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Chưa có đơn hàng nào liên kết với chuyến này.</div>';
        return;
    }
    // Lấy danh sách khách hàng
    const customerIds = [...new Set(linkedOrders.map(o => o.customerId))];
    const customers = [];
    for (const cid of customerIds) {
        const c = await customerStore.get(cid);
        if (c) customers.push(c);
    }
    // Dropdown chọn khách hàng
    let html = `<div class="mb-3">
        <label for="invoice-customer-select" class="form-label">Chọn khách hàng để xuất hóa đơn</label>
        <select class="form-select" id="invoice-customer-select">
            <option value="">-- Chọn khách hàng --</option>
            ${customers.map(c => `<option value="${c.id}">${c.name} (${c.contact || ''})</option>`).join('')}
        </select>
        <button class="btn btn-primary mt-2" id="export-invoice-btn" disabled>Xuất hóa đơn</button>
    </div>
    <div id="invoice-preview"></div>`;
    container.innerHTML = html;
    // Sự kiện chọn khách hàng
    const select = document.getElementById('invoice-customer-select');
    const exportBtn = document.getElementById('export-invoice-btn');
    select.addEventListener('change', function() {
        exportBtn.disabled = !select.value;
        document.getElementById('invoice-preview').innerHTML = '';
    });
    exportBtn.addEventListener('click', function() {
        if (!select.value) return;
        renderCustomerInvoice(tripId, parseInt(select.value));
    });
}
// Hàm renderCustomerInvoice
async function renderCustomerInvoice(tripId, customerId) {
    const container = document.getElementById('invoice-preview');
    if (!container) return;

    container.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Đang khởi tạo hóa đơn...</p></div>';

    try {
        const orders = await window.DB.collection('orders').getAll();
        const customer = await window.DB.collection('customers').get(customerId);
        const allPayments = await window.DB.collection('payments').getAll();
        const legacyDebts = await window.DB.collection('legacyDebts').getAll();
        const generalPayments = await window.DB.collection('customerPayments').getAll();

        const currentTripId = tripId;
        const currentCustomerId = customerId;

        // Lấy dữ liệu nợ cũ và công nợ tổng
        const customerOrdersAll = orders.filter(o => o.customerId == currentCustomerId);
        const customerLegacyDebt = legacyDebts.filter(d => d.customerId == currentCustomerId).reduce((sum, d) => sum + (d.amount || 0), 0);
        const customerGeneralPaid = generalPayments.filter(p => p.customerId == currentCustomerId).reduce((sum, p) => sum + (p.amount || p.paymentAmount || 0), 0);
        
        let totalValueAllOrders = 0;
        customerOrdersAll.forEach(o => {
            if (o.items && Array.isArray(o.items)) {
                totalValueAllOrders += o.items.reduce((sum, item) => sum + (item.qty * (item.sellingPrice || 0)), 0);
            }
        });

        // Tính tổng tiền ĐÃ TRẢ dựa trên database (allPayments) thay vì fix-cứng trong order
        const totalPaidAllOrders = allPayments
            .filter(p => String(p.customerId) === String(currentCustomerId))
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        // Tổng nợ thực tế hiện tại (trước khi tính toán cụ thể cho chuyến này)
        const currentTotalDebt = (totalValueAllOrders - totalPaidAllOrders) + customerLegacyDebt - customerGeneralPaid;

        // Lấy đơn hàng của khách này trong chuyến này (dùng == cho an toàn)
        const customerOrders = orders.filter(o => (String(o.deliveredTripId) === String(currentTripId) || String(o.tripId) === String(currentTripId)) && String(o.customerId) === String(currentCustomerId));
        const tripPayments = allPayments.filter(p => p.tripId == currentTripId && p.customerId == currentCustomerId);

        if (customerOrders.length === 0) {
            container.innerHTML = `
                <div class="alert alert-warning border-0 shadow-sm text-center">
                    <i class="bi bi-exclamation-triangle-fill fs-1 text-warning d-block mb-3"></i>
                    Không tìm thấy đơn hàng nào của khách <strong>${customer ? customer.name : customerId}</strong> được giao trong chuyến này.
                    <br /> <small class="text-muted d-block mb-3">Ghi chú: Đơn phải có Chuyến hàng #${currentTripId}</small>
                    <button class="btn btn-outline-warning btn-sm" onclick="renderCustomerInvoice(${currentTripId}, ${currentCustomerId})">
                        <i class="bi bi-arrow-clockwise me-1"></i> Làm mới & Thử lại
                    </button>
                    <div class="mt-3 p-2 bg-light rounded text-start">
                        <small>Thông tin công nợ hiện tại: <strong>${(currentTotalDebt).toLocaleString('vi-VN')} K</strong></small>
                    </div>
                </div>`;
            return;
        }

        let itemsMap = {};
        let totalValue = 0;
        let deliveryDate = '';

        const dates = customerOrders.map(o => o.orderDate).filter(Boolean).map(d => new Date(d));
        if (dates.length > 0) {
            const minDate = new Date(Math.min(...dates));
            deliveryDate = minDate.toLocaleDateString('vi-VN');
        } else {
            deliveryDate = new Date().toLocaleDateString('vi-VN');
        }

        customerOrders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    const key = `${item.productName}_${item.sellingPrice}`;
                    if (!itemsMap[key]) {
                        itemsMap[key] = {
                            productName: item.productName,
                            qty: 0,
                            sellingPrice: item.sellingPrice || 0,
                            unit: item.unit || 'Cái'
                        };
                    }
                    itemsMap[key].qty += (item.qty || 0);
                    totalValue += ((item.qty || 0) * (item.sellingPrice || 0));
                });
            }
        });

        const items = Object.values(itemsMap);
        const totalPaidInTrip = tripPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const balance = totalValue - totalPaidInTrip;

        let html = `
            <div class="mb-3 d-flex justify-content-between align-items-center">
                <h6 class="mb-0 text-muted"><i class="bi bi-info-circle me-1"></i>Xem trước hóa đơn</h6>
                <button class="btn btn-primary" id="save-invoice-image-btn">
                    <i class="bi bi-image me-1"></i> Lưu ảnh & Gửi khách
                </button>
            </div>
            <div id="invoice-bill-card" class="card shadow-none border-0" style="width: 100%; max-width: 500px; margin: 0 auto; background: #fff; color: #333; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div class="card-body p-4 border" style="border: 2px solid #333 !important;">
                    <div class="text-center mb-4">
                        <div style="font-size: 2.5rem; margin-bottom: 5px;">🏺</div>
                        <h3 style="margin: 0; font-weight: 800; color: #000; letter-spacing: 1px; font-family: 'Times New Roman', serif;">GỐM SỨ NGUYỄN NGỌC</h3>
                        <p style="margin: 5px 0 0; font-size: 0.9rem; color: #555;">Thôn 4 Phụng Công Hưng Yên</p>
                        <p style="margin: 2px 0 0; font-size: 0.9rem; color: #555;">Hotline: 0962845960 | Zalo: 0775297777</p>
                        <div style="height: 1px; background: #333; margin: 15px auto; width: 80%;"></div>
                        <h4 style="margin: 10px 0; font-weight: 700; letter-spacing: 2px;">HÓA ĐƠN BÁN HÀNG</h4>
                        <p style="font-size: 0.85rem; color: #666;">Chuyến: #${currentTripId} - Ngày: ${deliveryDate}</p>
                    </div>

                    <div class="mb-4" style="font-size: 0.95rem; border-bottom: 1px dashed #ccc; padding-bottom: 15px;">
                        <div class="d-flex justify-content-between mb-1">
                            <span>Khách hàng:</span>
                            <strong style="text-transform: uppercase;">${customer ? customer.name : 'Khách vãng lai'}</strong>
                        </div>
                        <div class="d-flex justify-content-between mb-1">
                            <span>Số điện thoại:</span>
                            <span>${customer ? (customer.contact || '-') : '-'}</span>
                        </div>
                    </div>

                    <div class="table-responsive mb-4">
                        <table class="table table-sm table-borderless" style="font-size: 0.9rem;">
                            <thead style="border-bottom: 2px solid #333;">
                                <tr>
                                    <th style="padding: 8px 0;">Sản phẩm</th>
                                    <th class="text-center" style="padding: 8px 0;">SL</th>
                                    <th class="text-end" style="padding: 8px 0;">Đơn giá</th>
                                    <th class="text-end" style="padding: 8px 0;">T.Tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(i => `
                                    <tr style="border-bottom: 1px solid #eee;">
                                        <td style="padding: 10px 0; max-width: 150px;">${i.productName}</td>
                                        <td class="text-center" style="padding: 10px 0;">${i.qty}</td>
                                        <td class="text-end" style="padding: 10px 0;">${i.sellingPrice.toLocaleString('vi-VN')}</td>
                                        <td class="text-end" style="padding: 10px 0; font-weight: 600;">${(i.qty * i.sellingPrice).toLocaleString('vi-VN')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="border-top pt-3" style="font-size: 1rem;">
                        <div class="d-flex justify-content-between mb-2">
                            <span style="font-weight: 600;">TỔNG CỘNG:</span>
                            <span style="font-weight: 800; font-size: 1.1rem; color: #000;">${totalValue.toLocaleString('vi-VN')} K</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2 text-success">
                            <span>Đã thanh toán:</span>
                            <span>-${totalPaidInTrip.toLocaleString('vi-VN')} K</span>
                        </div>
                        <div class="d-flex justify-content-between pt-2 border-top" style="font-weight: 800; color: #d63031;">
                            <span>CÒN LẠI:</span>
                            <span>${balance.toLocaleString('vi-VN')} K</span>
                        </div>

                        ${(currentTotalDebt - balance) > 0 ? `
                        <div class="d-flex justify-content-between mt-2 pt-2 border-top" style="font-size: 0.95rem; border-top-style: dashed !important;">
                            <span class="text-muted">Nợ cũ:</span>
                            <span class="text-muted">+${(currentTotalDebt - balance).toLocaleString('vi-VN')} K</span>
                        </div>
                        <div class="d-flex justify-content-between mt-1 pt-2 border-top" style="font-weight: 800; border-top: 2px solid #333 !important; font-size: 1.15rem; color: #000;">
                            <span>TỔNG NỢ:</span>
                            <span>${currentTotalDebt.toLocaleString('vi-VN')} K</span>
                        </div>
                        ` : ''}
                    </div>

                    <div class="text-center mt-5">
                        <p style="font-style: italic; margin-bottom: 10px; font-size: 0.85rem;">Cảm ơn quý khách đã tin tưởng Gốm Sứ Nguyễn Ngọc!</p>
                        <div style="font-size: 0.75rem; color: #999;">Ghi chú: Vui lòng kiểm tra hàng khi nhận.</div>
                    </div>
                </div>
            </div>`;

        container.innerHTML = html;

        const saveBtn = document.getElementById('save-invoice-image-btn');
        if (saveBtn) {
            saveBtn.onclick = async function() {
                const billCard = document.getElementById('invoice-bill-card');
                if (!billCard) return;
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Đang tạo ảnh...';
                try {
                    const canvas = await html2canvas(billCard, { 
                        scale: 2,
                        backgroundColor: '#ffffff',
                        logging: false,
                        onclone: function(clonedDoc) {
                            // Xoá các stylesheet gắn ngoài (bootstrap 5.3+) trong bản clone để tránh lỗi parse màu 'oklch'
                            const links = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
                            links.forEach(link => link.remove());
                            // Thêm style tiện ích tuỳ chỉnh thay cho bootstrap bị xóa để giữ nguyên layout
                            const fallbackStyle = clonedDoc.createElement('style');
                            fallbackStyle.innerHTML = `
                                .text-center { text-align: center !important; }
                                .text-end { text-align: right !important; }
                                .text-success { color: #198754 !important; }
                                .text-muted { color: #6c757d !important; }
                                .d-flex { display: flex !important; }
                                .justify-content-between { justify-content: space-between !important; }
                                .align-items-center { align-items: center !important; }
                                .p-4 { padding: 1.5rem !important; }
                                .p-2 { padding: 0.5rem !important; }
                                .mb-1 { margin-bottom: 0.25rem !important; }
                                .mb-2 { margin-bottom: 0.5rem !important; }
                                .mb-3 { margin-bottom: 1rem !important; }
                                .mb-4 { margin-bottom: 1.5rem !important; }
                                .mt-1 { margin-top: 0.25rem !important; }
                                .mt-2 { margin-top: 0.5rem !important; }
                                .mt-3 { margin-top: 1rem !important; }
                                .mt-5 { margin-top: 3rem !important; }
                                .pt-2 { padding-top: 0.5rem !important; }
                                .pt-3 { padding-top: 1rem !important; }
                                .pb-2 { padding-bottom: 0.5rem !important; }
                                .border-top { border-top: 1px solid #dee2e6 !important; }
                                .border-0 { border: 0 !important; }
                                .table { width: 100%; margin-bottom: 1rem; border-collapse: collapse; }
                                .table th, .table td { vertical-align: middle; }
                                .table-responsive { display: block; width: 100%; overflow-x: auto; }
                            `;
                            clonedDoc.head.appendChild(fallbackStyle);
                            
                            const styles = clonedDoc.querySelectorAll('style');
                            styles.forEach(style => {
                                if (style !== fallbackStyle && style.innerHTML.includes('oklch')) {
                                    style.remove();
                                }
                            });
                            // Ẩn thanh cuộn ngoài thẻ bill
                            const body = clonedDoc.querySelector('body');
                            if(body) {
                                body.style.margin = '0';
                                body.style.padding = '0';
                            }
                        }
                    });
                    const link = document.createElement('a');
                    link.download = `HoaDon_KH${customer ? customer.name.replace(/\s+/g, '_') : 'KH'}_Trip${currentTripId}.png`;
                    link.href = canvas.toDataURL('image/png');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } catch (e) {
                    console.error('Lỗi html2canvas:', e);
                    // Hiển thị thông báo thân thiện hơn
                    alert('Hệ thống trình duyệt hiện tại không hỗ trợ chụp ảnh tự động. Vui lòng sử dụng tính năng chụp ảnh màn hình của điện thoại/máy tính.');
                }
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="bi bi-image me-1"></i> Lưu ảnh & Gửi khách';
            };
        }
    } catch (error) {
        console.error('Lỗi khi render hóa đơn:', error);
        container.innerHTML = `<div class="alert alert-danger">Lỗi khi khởi tạo hóa đơn: ${error.message}</div>`;
    }
}


