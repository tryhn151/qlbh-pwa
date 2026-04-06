// ===== EMPLOYEE MANAGEMENT MODULE =====
// Complete employee management with modern UI for driver, assistant, and loader roles
// Senior JS Developer: Modular approach for better maintainability

// ===== MODULE STRUCTURE =====
const EmployeeModule = {
    // Data storage
    data: {
        currentEmployees: [],
        filteredEmployees: [],
        employeeToDelete: null
    },

    // Configuration
    config: {
        roles: {
            'phu_xe': 'Phụ xe',
            'lai_xe': 'Lái xe',
            'boc_hang': 'Bốc hàng'
        },
        validationRules: {
            name: {
                required: true,
                minLength: 2,
                maxLength: 100,
                message: 'Tên nhân viên phải từ 2-100 ký tự'
            },
            role: {
                required: true,
                message: 'Vui lòng chọn loại nhân viên'
            },
            contact: {
                required: false,
                pattern: /^0(3[2-9]|5[689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/,
                message: 'Số điện thoại không đúng định dạng. VD: 0912345678'
            }
        },
        fieldDisplayNames: {
            name: 'Tên nhân viên',
            role: 'Chức danh',
            contact: 'Số điện thoại',
            baseSalaryPerTrip: 'Lương/chuyến mặc định'
        }
    },

    // ===== UTILITY FUNCTIONS =====
    utils: {
        safeValue(value, defaultValue = '') {
            if (value === null || value === undefined || value === 'null' || value === 'undefined') {
                return defaultValue;
            }
            if (typeof value === 'string' && value.trim() === '') {
                return defaultValue;
            }
            return value;
        },

        async waitForDB() {
            return window.db || null;
        },

        cleanupAllModals() {
            try {
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => backdrop.remove());
                document.body.classList.remove('modal-open');
                document.body.style.removeProperty('padding-right');
                document.body.style.removeProperty('overflow');
                
                const modalElements = document.querySelectorAll('.modal');
                modalElements.forEach(modalEl => {
                    const instance = bootstrap.Modal.getInstance(modalEl);
                    if (instance) instance.dispose();
                    modalEl.style.display = 'none';
                    modalEl.classList.remove('show');
                });
            } catch (error) {
                console.log('⚠️ Error during employee modal cleanup:', error);
            }
        },

        formatCurrency(amount) {
            if (typeof window.formatCurrency === 'function') return window.formatCurrency(amount);
            if (!amount || amount === 0) return '0 K';
            return new Intl.NumberFormat('vi-VN', {
                style: 'decimal',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(amount) + ' K';
        }
    },

    // ===== VALIDATION SYSTEM =====
    validation: {
        validateField(fieldName, value) {
            const rule = EmployeeModule.config.validationRules[fieldName];
            if (!rule) return { valid: true };

            const trimmedValue = String(value || '').trim();
            
            if (rule.required && !trimmedValue) {
                return { valid: false, message: `${EmployeeModule.config.fieldDisplayNames[fieldName]} là bắt buộc` };
            }

            if (!trimmedValue && !rule.required) return { valid: true };

            if (rule.minLength && trimmedValue.length < rule.minLength) {
                return { valid: false, message: `${EmployeeModule.config.fieldDisplayNames[fieldName]} phải có ít nhất ${rule.minLength} ký tự` };
            }

            if (fieldName === 'contact' && trimmedValue && rule.pattern) {
                if (!rule.pattern.test(trimmedValue)) return { valid: false, message: rule.message };
            }

            return { valid: true };
        },

        async validateForm(formData, editId = null) {
            const errors = [];
            for (const fieldName in formData) {
                const validation = this.validateField(fieldName, formData[fieldName]);
                if (!validation.valid) errors.push(validation.message);
            }
            return { valid: errors.length === 0, errors: errors };
        }
    },

    // ===== DATABASE OPERATIONS =====
    database: {
        async add(data) {
            try {
                if (!window.DB) throw new Error('Database chưa sẵn sàng');
                const id = await window.DB.collection('employees').add({
                    ...data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
                return id;
            } catch (error) {
                console.error('❌ Error adding employee:', error);
                throw error;
            }
        },

        async update(id, data) {
            try {
                await window.DB.collection('employees').put({
                    ...data,
                    id: id,
                    updated_at: new Date().toISOString()
                });
                return true;
            } catch (error) {
                console.error('❌ Error updating employee:', error);
                throw error;
            }
        },

        async delete(id) {
            try {
                await window.DB.collection('employees').delete(id);
                return true;
            } catch (error) {
                console.error('❌ Error deleting employee:', error);
                throw error;
            }
        },

        async getAll() {
            try {
                return await window.DB.collection('employees').getAll();
            } catch (error) {
                console.error('❌ Error loading employees:', error);
                return [];
            }
        }
    },

    // ===== UI RENDERERS =====
    ui: {
        renderEmployeeList(employees = null) {
            const list = employees || EmployeeModule.data.filteredEmployees;
            const container = document.getElementById('employee-list-container');
            if (!container) return;

            if (list.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-5 bg-light rounded-4 border-2 border-dashed">
                        <i class="bi bi-person-badge text-muted" style="font-size: 3rem;"></i>
                        <p class="mt-3 text-muted">Chưa có nhân viên nào.</p>
                        <button class="btn btn-primary" onclick="EmployeeModule.events.showAddModal()">
                            <i class="bi bi-plus-circle me-2"></i>Thêm nhân viên đầu tiên
                        </button>
                    </div>
                `;
                return;
            }

            container.innerHTML = list.map(emp => `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card h-100 border-0 shadow-sm hover-shadow transition">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div class="d-flex align-items-center">
                                    <div class="bg-primary bg-opacity-10 p-3 rounded-circle me-3">
                                        <i class="bi bi-person-vcard text-primary fs-4"></i>
                                    </div>
                                    <div>
                                        <h5 class="card-title mb-0 fw-bold">${emp.name}</h5>
                                        <span class="badge ${this.getRoleBadgeClass(emp.role)} mt-1">
                                            ${EmployeeModule.config.roles[emp.role] || emp.role}
                                        </span>
                                    </div>
                                </div>
                                <div class="dropdown">
                                    <button class="btn btn-link text-muted p-0" data-bs-toggle="dropdown">
                                        <i class="bi bi-three-dots-vertical"></i>
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
                                        <li><a class="dropdown-item" href="#" onclick="EmployeeModule.events.showEditModal('${emp.id}')">
                                            <i class="bi bi-pencil me-2"></i>Chỉnh sửa</a></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li><a class="dropdown-item text-danger" href="#" onclick="EmployeeModule.events.showDeleteModal('${emp.id}')">
                                            <i class="bi bi-trash me-2"></i>Xóa nhân viên</a></li>
                                    </ul>
                                </div>
                            </div>
                            <div class="space-y-2 mt-3">
                                <div class="d-flex align-items-center text-muted small">
                                    <i class="bi bi-telephone me-2"></i>
                                    ${emp.contact || 'Chưa cập nhật'}
                                </div>
                                <div class="d-flex align-items-center text-muted small">
                                    <i class="bi bi-cash-stack me-2"></i>
                                    Lương/chuyến: <span class="text-dark fw-medium ms-1">${EmployeeModule.utils.formatCurrency(emp.baseSalaryPerTrip || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        },

        getRoleBadgeClass(role) {
            switch(role) {
                case 'lai_xe': return 'bg-primary';
                case 'phu_xe': return 'bg-info';
                case 'boc_hang': return 'bg-success';
                default: return 'bg-secondary';
            }
        },

        showToast(message, type = 'success') {
            const toastContainer = document.querySelector('.toast-container');
            if (!toastContainer) return;
            const id = 'toast-' + Date.now();
            const color = type === 'success' ? 'success' : 'danger';
            const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
            
            toastContainer.insertAdjacentHTML('beforeend', `
                <div id="${id}" class="toast align-items-center text-white bg-${color} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="d-flex">
                        <div class="toast-body d-flex align-items-center gap-2">
                            <i class="bi bi-${icon}"></i> ${message}
                        </div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                </div>
            `);
            const toast = new bootstrap.Toast(document.getElementById(id));
            toast.show();
        },

        renderPayrollTable(payrollData, period, type, targetMonth = null, targetYear = null) {
            const container = document.getElementById('payroll-container');
            if (!container) return;

            if (Object.keys(payrollData).length === 0) {
                const periodText = type === 'month' ? `tháng ${period}` : `năm ${period}`;
                container.innerHTML = `<div class="alert alert-info border-0 shadow-sm">Không có dữ liệu công tác cho ${periodText}.</div>`;
                return;
            }

            const headerText = type === 'month' ? `Tháng ${period}` : `Năm ${period}`;

            let html = `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0 fw-bold"><i class="bi bi-calendar-check me-2"></i>Bảng lương ${headerText}</h6>
                </div>
                <table class="table table-hover align-middle border">
                    <thead class="table-light">
                        <tr>
                            <th>Nhân viên</th>
                            <th class="text-center">Số chuyến đi</th>
                            <th class="text-end">Tổng lương</th>
                            <th class="text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (const empId in payrollData) {
                const data = payrollData[empId];
                html += `
                    <tr>
                        <td>
                            <div class="fw-bold">${data.name}</div>
                            <small class="text-muted">${EmployeeModule.config.roles[data.role] || data.role}</small>
                        </td>
                        <td class="text-center">
                            <span class="badge bg-light text-dark border">${data.tripCount} chuyến</span>
                        </td>
                        <td class="text-end fw-bold text-success">
                            ${EmployeeModule.utils.formatCurrency(data.totalPay)}
                        </td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline-primary" onclick="EmployeeModule.events.showPayrollDetail('${empId}', ${targetMonth}, ${targetYear})">
                                <i class="bi bi-info-circle me-1"></i>Chi tiết
                            </button>
                        </td>
                    </tr>
                `;
            }

            html += `
                    </tbody>
                </table>
            `;
            container.innerHTML = html;
        }
    },

    // ===== EVENT HANDLERS =====
    events: {
        async init() {
            await this.refreshData();
            this.setupSearch();
            
            // Set default payroll month to current
            const payrollMonthInput = document.getElementById('payroll-month');
            if (payrollMonthInput && !payrollMonthInput.value) {
                const now = new Date();
                payrollMonthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            }

            const payrollYearInput = document.getElementById('payroll-year');
            if (payrollYearInput && !payrollYearInput.value) {
                payrollYearInput.value = new Date().getFullYear();
            }

            console.log('👷 Employee module initialized');
        },

        async refreshData() {
            EmployeeModule.data.currentEmployees = await EmployeeModule.database.getAll();
            EmployeeModule.data.filteredEmployees = [...EmployeeModule.data.currentEmployees];
            EmployeeModule.ui.renderEmployeeList();
        },

        setupSearch() {
            const searchInput = document.getElementById('employee-search');
            if (!searchInput) return;
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase().trim();
                EmployeeModule.data.filteredEmployees = EmployeeModule.data.currentEmployees.filter(emp => 
                    emp.name.toLowerCase().includes(term) || (emp.contact && emp.contact.includes(term))
                );
                EmployeeModule.ui.renderEmployeeList();
            });
        },

        showAddModal() {
            EmployeeModule.utils.cleanupAllModals();
            document.getElementById('employee-form').reset();
            document.getElementById('edit-employee-id').value = '';
            document.getElementById('employeeModalLabel').innerHTML = '<i class="bi bi-person-plus me-2"></i>Thêm nhân viên mới';
            const modal = new bootstrap.Modal(document.getElementById('employeeModal'));
            modal.show();
        },

        async showEditModal(id) {
            EmployeeModule.utils.cleanupAllModals();
            const emp = EmployeeModule.data.currentEmployees.find(e => e.id == id);
            if (!emp) return;

            document.getElementById('employee-name').value = emp.name;
            document.getElementById('employee-role').value = emp.role;
            document.getElementById('employee-contact').value = emp.contact || '';
            document.getElementById('employee-baseSalary').value = emp.baseSalaryPerTrip || 0;
            document.getElementById('edit-employee-id').value = emp.id;
            
            document.getElementById('employeeModalLabel').innerHTML = '<i class="bi bi-pencil me-2"></i>Chỉnh sửa nhân viên';
            const modal = new bootstrap.Modal(document.getElementById('employeeModal'));
            modal.show();
        },

        showDeleteModal(id) {
            EmployeeModule.utils.cleanupAllModals();
            const emp = EmployeeModule.data.currentEmployees.find(e => e.id == id);
            if (!emp) return;
            EmployeeModule.data.employeeToDelete = emp;
            document.getElementById('delete-employee-name').textContent = emp.name;
            const modal = new bootstrap.Modal(document.getElementById('deleteEmployeeModal'));
            modal.show();
        },

        async handleFormSubmit(e) {
            e.preventDefault();
            const editId = document.getElementById('edit-employee-id').value;
            const formData = {
                name: document.getElementById('employee-name').value,
                role: document.getElementById('employee-role').value,
                contact: document.getElementById('employee-contact').value,
                baseSalaryPerTrip: parseFloat(document.getElementById('employee-baseSalary').value || 0)
            };

            const validation = await EmployeeModule.validation.validateForm(formData, editId ? parseInt(editId) : null);
            if (!validation.valid) {
                alert(validation.errors.join('\n'));
                return;
            }

            try {
                if (editId) {
                    await EmployeeModule.database.update(parseInt(editId), formData);
                    EmployeeModule.ui.showToast('Cập nhật nhân viên thành công');
                } else {
                    await EmployeeModule.database.add(formData);
                    EmployeeModule.ui.showToast('Thêm nhân viên thành công');
                }
                const modal = bootstrap.Modal.getInstance(document.getElementById('employeeModal'));
                if (modal) modal.hide();
                await this.refreshData();
            } catch (error) {
                alert('Lỗi: ' + error.message);
            }
        },

        async confirmDelete() {
            if (!EmployeeModule.data.employeeToDelete) return;
            try {
                await EmployeeModule.database.delete(EmployeeModule.data.employeeToDelete.id);
                EmployeeModule.ui.showToast('Xóa nhân viên thành công');
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteEmployeeModal'));
                if (modal) modal.hide();
                await this.refreshData();
            } catch (error) {
                alert('Lỗi khi xóa: ' + error.message);
            }
        },

        async loadPayroll() {
            const viewType = document.getElementById('payroll-view-type')?.value || 'month';
            const monthInput = document.getElementById('payroll-month');
            const yearInput = document.getElementById('payroll-year');
            
            let period = '';
            let targetMonth = null;
            let targetYear = null;

            if (viewType === 'month') {
                if (!monthInput.value) {
                    const now = new Date();
                    monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                }
                [targetYear, targetMonth] = monthInput.value.split('-').map(Number);
                period = `${targetMonth}/${targetYear}`;
            } else {
                if (!yearInput.value) {
                    yearInput.value = new Date().getFullYear();
                }
                targetYear = parseInt(yearInput.value);
                period = `${targetYear}`;
            }

            const container = document.getElementById('payroll-container');
            if (container) container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 text-muted">Đang tổng hợp dữ liệu...</p></div>';

            try {
                const trips = await window.DB.collection('trips').getAll();
                const employees = await EmployeeModule.database.getAll();
                
                // Group by employee
                const payroll = {};
                
                trips.forEach(trip => {
                    const tripDate = new Date(trip.tripDate);
                    const matchMonth = viewType === 'month' ? (tripDate.getMonth() + 1 === targetMonth) : true;
                    const matchYear = tripDate.getFullYear() === targetYear;

                    if (matchYear && matchMonth && trip.employees) {
                        trip.employees.forEach(te => {
                            if (!payroll[te.employeeId]) {
                                const emp = employees.find(e => e.id == te.employeeId);
                                payroll[te.employeeId] = {
                                    name: te.name || (emp ? emp.name : 'Unknown'),
                                    role: emp ? emp.role : '',
                                    tripCount: 0,
                                    totalPay: 0,
                                    trips: []
                                };
                            }
                            payroll[te.employeeId].tripCount++;
                            payroll[te.employeeId].totalPay += (te.pay || 0);
                            payroll[te.employeeId].trips.push({
                                tripId: trip.id,
                                tripName: trip.tripName,
                                date: trip.tripDate,
                                pay: te.pay
                            });
                        });
                    }
                });

                EmployeeModule.ui.renderPayrollTable(payroll, period, viewType, targetMonth, targetYear);
            } catch (error) {
                console.error('Lỗi khi tải bảng lương:', error);
                if (container) container.innerHTML = '<div class="alert alert-danger">Lỗi khi tải dữ liệu bảng lương.</div>';
            }
        },

        togglePayrollView() {
            const viewType = document.getElementById('payroll-view-type').value;
            const monthCont = document.getElementById('payroll-month-container');
            const yearCont = document.getElementById('payroll-year-container');

            if (viewType === 'month') {
                monthCont.classList.remove('d-none');
                yearCont.classList.add('d-none');
            } else {
                monthCont.classList.add('d-none');
                yearCont.classList.remove('d-none');
            }
            this.loadPayroll();
        },

        async showPayrollDetail(empId, month, year) {
            // Simple detail for now
            alert(`Tính năng đang được phát triển. Nhân viên ID ${empId} trong tháng ${month}/${year}.`);
        }
    }
};

// Auto-init for employees when needed in script.js or on tab change
window.EmployeeModule = EmployeeModule;
