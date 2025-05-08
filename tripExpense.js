// ===== CÁC HÀM XỬ LÝ CHO QUẢN LÝ CHI PHÍ PHÁT SINH CHUYẾN HÀNG =====

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
    try {
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
        await displayReports();
        
        return id;
    } catch (error) {
        console.error('Lỗi khi thêm chi phí phát sinh:', error);
        return null;
    }
}

// Cập nhật chi phí phát sinh
async function updateTripExpense(expenseId, expenseData) {
    try {
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
        await displayReports();
        
        return true;
    } catch (error) {
        console.error('Lỗi khi cập nhật chi phí phát sinh:', error);
        return false;
    }
}

// Xóa chi phí phát sinh
async function deleteTripExpense(expenseId) {
    try {
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
        await displayReports();
        
        return true;
    } catch (error) {
        console.error('Lỗi khi xóa chi phí phát sinh:', error);
        return false;
    }
}

// Lấy tất cả chi phí phát sinh của một chuyến hàng
async function getTripExpenses(tripId) {
    try {
        const tx = db.transaction('tripExpenses', 'readonly');
        const store = tx.objectStore('tripExpenses');
        const index = store.index('tripId');
        
        const expenses = await index.getAll(tripId);
        return expenses;
    } catch (error) {
        console.error('Lỗi khi lấy chi phí phát sinh của chuyến hàng:', error);
        return [];
    }
}

// Tính tổng chi phí phát sinh của một chuyến hàng
async function calculateTotalTripExpenses(tripId) {
    try {
        const expenses = await getTripExpenses(tripId);
        const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        return total;
    } catch (error) {
        console.error('Lỗi khi tính tổng chi phí phát sinh:', error);
        return 0;
    }
}

// Tính tổng chi phí phát sinh theo danh mục
async function calculateTripExpensesByCategory(tripId) {
    try {
        const expenses = await getTripExpenses(tripId);
        
        // Tạo đối tượng để lưu tổng chi phí theo danh mục
        const expensesByCategory = {};
        
        // Khởi tạo tất cả danh mục với giá trị 0
        EXPENSE_CATEGORIES.forEach(category => {
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

// Cập nhật tab chi phí phát sinh trong modal chi tiết chuyến hàng
async function updateTripExpensesTab(tripId) {
    try {
        const expensesTabPane = document.getElementById('expenses-tab-pane');
        if (!expensesTabPane) return;
        
        // Lấy tất cả chi phí phát sinh của chuyến hàng
        const expenses = await getTripExpenses(tripId);
        
        // Tính tổng chi phí phát sinh
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        // Tạo HTML cho tab chi phí phát sinh
        if (expenses.length > 0) {
            let html = `
                <div class="table-responsive">
                    <table class="table table-sm table-striped">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Mô tả</th>
                                <th>Danh mục</th>
                                <th>Ngày</th>
                                <th>Số tiền</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            for (const expense of expenses) {
                html += `
                    <tr>
                        <td>${expense.id}</td>
                        <td>${expense.description}</td>
                        <td>${expense.category}</td>
                        <td>${formatDate(expense.date)}</td>
                        <td class="text-end">${formatCurrency(expense.amount)}</td>
                        <td>
                            <button class="btn btn-sm btn-primary edit-expense-btn" data-id="${expense.id}">
                                Sửa
                            </button>
                            <button class="btn btn-sm btn-danger delete-expense-btn" data-id="${expense.id}">
                                Xóa
                            </button>
                        </td>
                    </tr>
                `;
            }
            
            html += `
                        </tbody>
                        <tfoot>
                            <tr>
                                <th colspan="4" class="text-end">Tổng cộng:</th>
                                <th class="text-end">${formatCurrency(totalExpenses)}</th>
                                <th></th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <h6 class="mt-4">Chi phí theo danh mục</h6>
                <div class="row">
            `;
            
            // Tính chi phí theo danh mục
            const expensesByCategory = await calculateTripExpensesByCategory(tripId);
            
            // Hiển thị chi phí theo danh mục
            for (const category in expensesByCategory) {
                if (expensesByCategory[category] > 0) {
                    html += `
                        <div class="col-md-4 mb-3">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-title">${category}</h6>
                                    <p class="card-text text-danger">${formatCurrency(expensesByCategory[category])}</p>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }
            
            html += `
                </div>
            `;
            
            expensesTabPane.innerHTML = html;
            
            // Thêm sự kiện cho các nút
            document.querySelectorAll('.edit-expense-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const expenseId = parseInt(e.target.getAttribute('data-id'));
                    await editTripExpense(expenseId);
                });
            });
            
            document.querySelectorAll('.delete-expense-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const expenseId = parseInt(e.target.getAttribute('data-id'));
                    if (confirm('Bạn có chắc muốn xóa chi phí phát sinh này?')) {
                        await deleteTripExpense(expenseId);
                    }
                });
            });
        } else {
            expensesTabPane.innerHTML = '<div class="alert alert-info">Chưa có chi phí phát sinh nào được ghi nhận cho chuyến này.</div>';
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật tab chi phí phát sinh:', error);
    }
}

// Chỉnh sửa chi phí phát sinh
async function editTripExpense(expenseId) {
    try {
        const tx = db.transaction('tripExpenses', 'readonly');
        const store = tx.objectStore('tripExpenses');
        
        const expense = await store.get(expenseId);
        if (!expense) {
            alert('Không tìm thấy chi phí phát sinh!');
            return;
        }
        
        // Điền thông tin vào form
        const addExpenseForm = document.getElementById('add-expense-form');
        if (addExpenseForm) {
            addExpenseForm.setAttribute('data-edit-id', expenseId);
            
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
            
            // Thay đổi nút submit
            const submitButton = addExpenseForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.textContent = 'Cập nhật chi phí';
            }
            
            // Hiển thị nút hủy chỉnh sửa
            const cancelButton = document.getElementById('cancel-edit-expense');
            if (cancelButton) {
                cancelButton.style.display = 'inline-block';
            }
            
            // Chuyển tab về tab thêm chi phí
            const addExpenseTab = document.getElementById('add-expense-tab');
            if (addExpenseTab) {
                addExpenseTab.click();
            }
        }
    } catch (error) {
        console.error('Lỗi khi chỉnh sửa chi phí phát sinh:', error);
    }
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

// Tạo dropdown danh mục chi phí
function createExpenseCategoryDropdown() {
    const categorySelect = document.getElementById('expense-category');
    if (!categorySelect) return;
    
    // Xóa tất cả các option hiện tại
    categorySelect.innerHTML = '';
    
    // Thêm các option mới
    EXPENSE_CATEGORIES.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

// Thiết lập các event listener cho quản lý chi phí phát sinh
function setupTripExpenseEventListeners() {
    // Form thêm/sửa chi phí phát sinh
    const addExpenseForm = document.getElementById('add-expense-form');
    if (addExpenseForm) {
        addExpenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const tripId = parseInt(addExpenseForm.getAttribute('data-trip-id'));
            const description = document.getElementById('expense-description').value.trim();
            const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
            const category = document.getElementById('expense-category').value;
            const dateStr = document.getElementById('expense-date').value;
            const date = dateStr ? new Date(dateStr) : new Date();
            
            if (description && amount > 0) {
                const expenseData = {
                    tripId,
                    description,
                    amount,
                    category,
                    date
                };
                
                // Kiểm tra xem đang thêm mới hay chỉnh sửa
                const editId = addExpenseForm.getAttribute('data-edit-id');
                if (editId) {
                    // Chỉnh sửa chi phí
                    await updateTripExpense(parseInt(editId), expenseData);
                    
                    // Reset form và trạng thái
                    addExpenseForm.removeAttribute('data-edit-id');
                    const submitButton = addExpenseForm.querySelector('button[type="submit"]');
                    if (submitButton) {
                        submitButton.textContent = 'Thêm chi phí';
                    }
                    
                    // Ẩn nút hủy chỉnh sửa
                    const cancelButton = document.getElementById('cancel-edit-expense');
                    if (cancelButton) {
                        cancelButton.style.display = 'none';
                    }
                } else {
                    // Thêm chi phí mới
                    await addTripExpense(expenseData);
                }
                
                // Reset form
                addExpenseForm.reset();
                document.getElementById('expense-date').valueAsDate = new Date();
                document.getElementById('expense-description').focus();
                
                // Chuyển tab về tab chi phí phát sinh để người dùng thấy kết quả
                const expensesTab = document.getElementById('expenses-tab');
                if (expensesTab) {
                    expensesTab.click();
                }
            }
        });
        
        // Nút hủy chỉnh sửa
        const cancelEditButton = document.getElementById('cancel-edit-expense');
        if (cancelEditButton) {
            cancelEditButton.addEventListener('click', () => {
                addExpenseForm.reset();
                addExpenseForm.removeAttribute('data-edit-id');
                document.getElementById('expense-date').valueAsDate = new Date();
                
                const submitButton = addExpenseForm.querySelector('button[type="submit"]');
                if (submitButton) {
                    submitButton.textContent = 'Thêm chi phí';
                }
                
                // Ẩn nút hủy
                cancelEditButton.style.display = 'none';
            });
        }
    }
}

// Khởi tạo module chi phí phát sinh
function initTripExpenseModule() {
    // Tạo dropdown danh mục chi phí
    createExpenseCategoryDropdown();
    
    // Thiết lập các event listener
    setupTripExpenseEventListeners();
    
    console.log('Module chi phí phát sinh đã khởi tạo thành công');
}
