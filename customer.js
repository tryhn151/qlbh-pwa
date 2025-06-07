// ===== CÁC HÀM XỬ LÝ CHO QUẢN LÝ KHÁCH HÀNG =====

// Hàm chờ database sẵn sàng trước khi thực hiện các thao tác
async function waitForDB() {
    return new Promise((resolve) => {
        // Kiểm tra liệu database đã được khởi tạo chưa
        if (window.db) {
            console.log('Database đã sẵn sàng');
            // Thử test transaction để đảm bảo db có thể sử dụng
            try {
                const tx = window.db.transaction('customers', 'readonly');
                tx.abort(); // Không cần làm gì, chỉ kiểm tra
                console.log('Đã test transaction thành công');
                resolve(window.db);
                return;
            } catch (error) {
                console.warn('Database chưa sẵn sàng cho transaction:', error);
                // Tiếp tục xuống phần chờ
            }
        }
        
        console.log('Chờ database khởi tạo...');
        
        // Kiểm tra xem thư viện idb đã được tải chưa
        if (typeof idb === 'undefined') {
            console.error('Lỗi: Thư viện idb chưa được tải');
            alert('Lỗi: Thư viện idb chưa được tải. Vui lòng tải lại trang.');
            resolve(null);
            return;
        }
        
        // Nếu chưa, thiết lập một interval để kiểm tra định kỳ
        let attempts = 0;
        const maxAttempts = 150; // Tăng lên 150 lần (~15 giây)
        
        const checkInterval = setInterval(() => {
            attempts++;
            
            if (window.db) {
                // Thử test transaction
                try {
                    const tx = window.db.transaction('customers', 'readonly');
                    tx.abort(); // Không cần làm gì, chỉ kiểm tra
                    
                    clearInterval(checkInterval);
                    console.log(`Database đã sẵn sàng sau ${attempts} lần thử`);
                    resolve(window.db);
                } catch (error) {
                    console.log(`Lần thử ${attempts}: Database chưa sẵn sàng cho transaction - ${error.message}`);
                    // Tiếp tục chờ
                }
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.error('Lỗi: Không thể kết nối đến cơ sở dữ liệu sau nhiều lần thử');
                resolve(null); // Resolve với null để code có thể xử lý lỗi
            }
        }, 100); // Kiểm tra mỗi 100ms
        
        // Đặt timeout để tránh chờ vô hạn (tăng lên 15 giây)
        setTimeout(() => {
            clearInterval(checkInterval);
            console.error('Lỗi: Không thể kết nối đến cơ sở dữ liệu sau 15 giây');
            resolve(null); // Resolve với null để code có thể xử lý lỗi
        }, 15000); // Timeout sau 15 giây
    });
}

// Event listener cho form khách hàng
document.addEventListener('DOMContentLoaded', () => {
    // Chỉ thiết lập các event listener, không gọi hàm nào yêu cầu database!
    setupCustomerEventListeners();
});

// Thiết lập các event listener cho phần quản lý khách hàng
function setupCustomerEventListeners() {
    // Form thêm khách hàng
    const customerForm = document.getElementById('customer-form');
    if (customerForm) {
        customerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('customer-name').value.trim();
            const contact = document.getElementById('customer-contact').value.trim();
            
            if (name) {
                const customerData = {
                    name,
                    contact
                };
                
                // Kiểm tra xem đang thêm mới hay chỉnh sửa
                const editId = customerForm.getAttribute('data-edit-id');
                if (editId) {
                    // Chỉnh sửa khách hàng
                    await updateCustomer(parseInt(editId), customerData);
                } else {
                    // Thêm khách hàng mới
                    await addCustomer(customerData);
                    customerForm.reset();
                    document.getElementById('customer-name').focus();
                }
            }
        });
    }
    
    // Ô tìm kiếm khách hàng
    const customerSearchInput = document.getElementById('customer-search');
    if (customerSearchInput) {
        customerSearchInput.addEventListener('input', async () => {
            await searchCustomers(customerSearchInput.value.trim());
        });
    }
    
    console.log('Đã thiết lập các event listener cho quản lý khách hàng');
}

// Tạo ô tìm kiếm khách hàng
function createCustomerSearchBox() {
    try {
        // Tìm thẻ chứa bảng khách hàng
        const customerTableCard = document.querySelector('#customers-tab-pane .col-md-8 .card-header');
        if (!customerTableCard) {
            console.warn('Không tìm thấy phần tử .card-header trong tab khách hàng');
            return;
        }
        
        // Kiểm tra xem đã có ô tìm kiếm chưa
        if (document.getElementById('customer-search')) {
            // Đã tồn tại ô tìm kiếm, không cần tạo mới
            return;
        }
        
        // Tạo ô tìm kiếm và thêm vào trước bảng
        const searchDiv = document.createElement('div');
        searchDiv.className = 'input-group mb-3 mt-3';
        searchDiv.innerHTML = `
            <input type="text" id="customer-search" class="form-control" placeholder="Tìm kiếm khách hàng...">
            <button class="btn btn-outline-secondary" type="button" id="clear-customer-search">
                <i class="bi bi-x"></i> Xóa
            </button>
        `;
        
        // Chèn ô tìm kiếm vào sau tiêu đề card
        customerTableCard.parentNode.insertBefore(searchDiv, customerTableCard.nextSibling);
        
        // Thêm sự kiện cho nút xóa tìm kiếm
        const clearButton = document.getElementById('clear-customer-search');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                const searchInput = document.getElementById('customer-search');
                if (searchInput) {
                    searchInput.value = '';
                    displayCustomers(); // Hiển thị lại tất cả khách hàng
                }
            });
        }
        
        // Thêm sự kiện cho ô tìm kiếm
        const searchInput = document.getElementById('customer-search');
        if (searchInput) {
            searchInput.addEventListener('input', async (e) => {
                await searchCustomers(e.target.value.trim());
            });
        }
        
        console.log('Đã tạo ô tìm kiếm khách hàng thành công');
    } catch (error) {
        console.error('Lỗi khi tạo ô tìm kiếm khách hàng:', error);
    }
}

// Tìm kiếm khách hàng
async function searchCustomers(keyword) {
    if (!keyword) {
        // Nếu không có từ khóa, hiển thị tất cả khách hàng
        await displayCustomers();
        return;
    }
    
    try {
        // Đảm bảo DB đã sẵn sàng
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }
        
        // Lấy tất cả khách hàng từ IndexedDB
        const tx = db.transaction('customers', 'readonly');
        const store = tx.objectStore('customers');
        const customers = await store.getAll();
        
        // Lọc khách hàng theo từ khóa (tên hoặc liên hệ)
        const lowercaseKeyword = keyword.toLowerCase();
        const filteredCustomers = customers.filter(customer => 
            customer.name.toLowerCase().includes(lowercaseKeyword) || 
            (customer.contact && customer.contact.toLowerCase().includes(lowercaseKeyword))
        );
        
        // Hiển thị kết quả tìm kiếm
        const customersList = document.getElementById('customers-list');
        const noCustomersMessage = document.getElementById('no-customers-message');
        
        if (!customersList || !noCustomersMessage) return;
        
        // Xóa nội dung hiện tại
        customersList.innerHTML = '';
        
        if (filteredCustomers.length > 0) {
            // Ẩn thông báo không có dữ liệu
            noCustomersMessage.style.display = 'none';
            
            // Hiển thị từng khách hàng
            filteredCustomers.forEach(customer => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${customer.id}</td>
                    <td>${customer.name}</td>
                    <td>${customer.contact || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-customer-btn" data-id="${customer.id}">
                            Sửa
                        </button>
                        <button class="btn btn-sm btn-danger delete-customer-btn" data-id="${customer.id}">
                            Xóa
                        </button>
                    </td>
                `;
                
                customersList.appendChild(row);
            });
            
            // Thêm sự kiện cho các nút chỉnh sửa
            document.querySelectorAll('.edit-customer-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const customerId = parseInt(e.target.getAttribute('data-id'));
                    await showEditCustomerForm(customerId);
                });
            });
        } else {
            // Hiển thị thông báo không có dữ liệu
            noCustomersMessage.style.display = 'block';
            noCustomersMessage.textContent = `Không tìm thấy khách hàng nào phù hợp với "${keyword}"`;
        }
    } catch (error) {
        console.error('Lỗi khi tìm kiếm khách hàng:', error);
        
        // Hiển thị thông báo lỗi
        const customersList = document.getElementById('customers-list');
        if (customersList) {
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-danger mt-3';
            alertElement.textContent = `Lỗi khi tìm kiếm: ${error.message}`;
            customersList.parentNode.insertBefore(alertElement, customersList);
            
            setTimeout(() => {
                alertElement.remove();
            }, 5000);
        }
    }
}

// Thêm khách hàng mới
async function addCustomer(customerData) {
    try {
        // Đảm bảo DB đã sẵn sàng
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }
        
        const tx = db.transaction('customers', 'readwrite');
        const store = tx.objectStore('customers');
        
        const id = await store.add(customerData);
        await tx.done;
        
        console.log('Đã thêm khách hàng mới với ID:', id);
        
        // Cập nhật giao diện
        await displayCustomers();
        await populateCustomerDropdowns();
        
        // Hiển thị thông báo thành công
        const formElement = document.getElementById('customer-form');
        if (formElement) {
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-success mt-3';
            alertElement.textContent = `Đã thêm khách hàng "${customerData.name}" thành công!`;
            
            // Thêm thông báo vào sau form
            formElement.parentNode.insertBefore(alertElement, formElement.nextSibling);
            
            // Tự động ẩn thông báo sau 3 giây
            setTimeout(() => {
                alertElement.remove();
            }, 3000);
        }
        
        return id;
    } catch (error) {
        console.error('Lỗi khi thêm khách hàng:', error);
        
        // Hiển thị thông báo lỗi
        const formElement = document.getElementById('customer-form');
        if (formElement) {
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-danger mt-3';
            alertElement.textContent = `Lỗi khi thêm khách hàng: ${error.message}`;
            
            // Thêm thông báo vào sau form
            formElement.parentNode.insertBefore(alertElement, formElement.nextSibling);
            
            // Tự động ẩn thông báo sau 5 giây
            setTimeout(() => {
                alertElement.remove();
            }, 5000);
        }
        
        return null;
    }
}

// Hiển thị danh sách khách hàng
async function displayCustomers() {
    try {
        const customersList = document.getElementById('customers-list');
        const noCustomersMessage = document.getElementById('no-customers-message');
        
        if (!customersList || !noCustomersMessage) return;
        
        // Đảm bảo DB đã sẵn sàng
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }
        
        // Lấy tất cả khách hàng từ IndexedDB
        const tx = db.transaction('customers', 'readonly');
        const store = tx.objectStore('customers');
        const customers = await store.getAll();
        
        // Xóa nội dung hiện tại
        customersList.innerHTML = '';
        
        if (customers.length > 0) {
            // Ẩn thông báo không có dữ liệu
            noCustomersMessage.style.display = 'none';
            
            // Hiển thị từng khách hàng
            customers.forEach(customer => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${customer.id}</td>
                    <td>${customer.name}</td>
                    <td>${customer.contact || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-customer-btn" data-id="${customer.id}">
                            Sửa
                        </button>
                        <button class="btn btn-sm btn-danger delete-customer-btn" data-id="${customer.id}">
                            Xóa
                        </button>
                    </td>
                `;
                
                customersList.appendChild(row);
            });
            
            // Thêm sự kiện cho các nút chỉnh sửa
            document.querySelectorAll('.edit-customer-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const customerId = parseInt(e.target.getAttribute('data-id'));
                    await showEditCustomerForm(customerId);
                });
            });
        } else {
            // Hiển thị thông báo không có dữ liệu
            noCustomersMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị khách hàng:', error);
        
        // Hiển thị thông báo lỗi
        const customersList = document.getElementById('customers-list');
        if (customersList) {
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-danger mt-3';
            alertElement.textContent = `Lỗi khi hiển thị khách hàng: ${error.message}`;
            customersList.parentNode.insertBefore(alertElement, customersList);
            
            setTimeout(() => {
                alertElement.remove();
            }, 5000);
        }
    }
}

// Xóa khách hàng
async function deleteCustomer(customerId) {
    try {
        // Đảm bảo DB đã sẵn sàng
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }
        
        const tx = db.transaction('customers', 'readwrite');
        const store = tx.objectStore('customers');
        
        await store.delete(customerId);
        await tx.done;
        
        console.log('Đã xóa khách hàng với ID:', customerId);
        
        // Cập nhật giao diện
        await displayCustomers();
        await populateCustomerDropdowns();
        
        // Hiển thị thông báo thành công
        const customersList = document.getElementById('customers-list');
        if (customersList) {
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-success mt-3';
            alertElement.textContent = 'Đã xóa khách hàng thành công!';
            customersList.parentNode.insertBefore(alertElement, customersList);
            
            setTimeout(() => {
                alertElement.remove();
            }, 3000);
        }
        
        return true;
    } catch (error) {
        console.error('Lỗi khi xóa khách hàng:', error);
        
        // Hiển thị thông báo lỗi
        const customersList = document.getElementById('customers-list');
        if (customersList) {
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-danger mt-3';
            alertElement.textContent = `Lỗi khi xóa khách hàng: ${error.message}`;
            customersList.parentNode.insertBefore(alertElement, customersList);
            
            setTimeout(() => {
                alertElement.remove();
            }, 5000);
        }
        
        return false;
    }
}

// Đổ danh sách khách hàng vào các dropdown
async function populateCustomerDropdowns() {
    try {
        // Đảm bảo DB đã sẵn sàng
        const db = await waitForDB();
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
        console.error('Lỗi khi đổ danh sách khách hàng vào dropdown:', error);
        
        // Hiển thị thông báo lỗi ở nơi phù hợp
        const orderForm = document.getElementById('order-form');
        if (orderForm) {
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-danger mt-3';
            alertElement.textContent = `Lỗi khi tải danh sách khách hàng: ${error.message}`;
            orderForm.insertBefore(alertElement, orderForm.firstChild);
            
            setTimeout(() => {
                alertElement.remove();
            }, 5000);
        }
    }
}

// Lấy thông tin khách hàng theo ID
async function getCustomerById(customerId) {
    try {
        // Đảm bảo DB đã sẵn sàng
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }
        
        const tx = db.transaction('customers', 'readonly');
        const store = tx.objectStore('customers');
        
        const customer = await store.get(customerId);
        return customer;
    } catch (error) {
        console.error('Lỗi khi lấy thông tin khách hàng:', error);
        
        // Hiển thị thông báo lỗi
        const formElement = document.getElementById('customer-form');
        if (formElement) {
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-danger mt-3';
            alertElement.textContent = `Lỗi khi lấy thông tin khách hàng: ${error.message}`;
            formElement.parentNode.insertBefore(alertElement, formElement.nextSibling);
            
            setTimeout(() => {
                alertElement.remove();
            }, 5000);
        }
        
        return null;
    }
}

// Hiển thị form chỉnh sửa khách hàng
async function showEditCustomerForm(customerId) {
    try {
        // Đảm bảo DB đã sẵn sàng
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }
        
        // Lấy thông tin khách hàng
        const customer = await getCustomerById(customerId);
        if (!customer) {
            alert('Không tìm thấy thông tin khách hàng!');
            return;
        }
        
        // Chuyển form thêm khách hàng thành form sửa khách hàng
        const form = document.getElementById('customer-form');
        const formTitle = form.closest('.card').querySelector('.card-title');
        const submitButton = form.querySelector('button[type="submit"]');
        
        // Lưu ID khách hàng vào form
        form.setAttribute('data-edit-id', customerId);
        
        // Cập nhật tiêu đề và nút
        formTitle.textContent = 'Chỉnh sửa khách hàng';
        submitButton.textContent = 'Cập nhật';
        
        // Điền dữ liệu vào form
        document.getElementById('customer-name').value = customer.name;
        document.getElementById('customer-contact').value = customer.contact || '';
        
        // Thêm nút hủy
        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn btn-secondary mt-2';
        cancelButton.textContent = 'Hủy';
        cancelButton.id = 'cancel-edit-btn';
        cancelButton.onclick = resetCustomerForm;
        
        submitButton.parentNode.insertBefore(cancelButton, submitButton.nextSibling);
        
        // Focus vào ô tên
        document.getElementById('customer-name').focus();
    } catch (error) {
        console.error('Lỗi khi hiển thị form chỉnh sửa khách hàng:', error);
        
        // Hiển thị thông báo lỗi
        const formElement = document.getElementById('customer-form');
        if (formElement) {
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-danger mt-3';
            alertElement.textContent = `Lỗi khi hiển thị form chỉnh sửa: ${error.message}`;
            formElement.parentNode.insertBefore(alertElement, formElement.nextSibling);
            
            setTimeout(() => {
                alertElement.remove();
            }, 5000);
        }
    }
}

// Cập nhật thông tin khách hàng
async function updateCustomer(customerId, customerData) {
    try {
        // Đảm bảo DB đã sẵn sàng
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }
        
        const tx = db.transaction('customers', 'readwrite');
        const store = tx.objectStore('customers');
        
        // Lấy khách hàng hiện tại
        const existingCustomer = await store.get(customerId);
        if (!existingCustomer) {
            throw new Error('Không tìm thấy khách hàng để cập nhật');
        }
        
        // Cập nhật thông tin
        const updatedCustomer = { ...existingCustomer, ...customerData };
        await store.put(updatedCustomer);
        await tx.done;
        
        console.log('Đã cập nhật khách hàng với ID:', customerId);
        
        // Cập nhật giao diện
        await displayCustomers();
        await populateCustomerDropdowns();
        
        // Reset form về trạng thái thêm mới
        resetCustomerForm();
        
        // Hiển thị thông báo thành công
        const formElement = document.getElementById('customer-form');
        if (formElement) {
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-success mt-3';
            alertElement.textContent = `Đã cập nhật thông tin khách hàng "${updatedCustomer.name}" thành công!`;
            
            // Thêm thông báo vào sau form
            formElement.parentNode.insertBefore(alertElement, formElement.nextSibling);
            
            // Tự động ẩn thông báo sau 3 giây
            setTimeout(() => {
                alertElement.remove();
            }, 3000);
        }
        
        return customerId;
    } catch (error) {
        console.error('Lỗi khi cập nhật khách hàng:', error);
        
        // Hiển thị thông báo lỗi
        const formElement = document.getElementById('customer-form');
        if (formElement) {
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-danger mt-3';
            alertElement.textContent = `Lỗi khi cập nhật khách hàng: ${error.message}`;
            
            // Thêm thông báo vào sau form
            formElement.parentNode.insertBefore(alertElement, formElement.nextSibling);
            
            // Tự động ẩn thông báo sau 5 giây
            setTimeout(() => {
                alertElement.remove();
            }, 5000);
        }
        
        return null;
    }
}

// Khôi phục form về trạng thái thêm mới
function resetCustomerForm() {
    try {
        const form = document.getElementById('customer-form');
        const formTitle = form.closest('.card').querySelector('.card-title');
        const submitButton = form.querySelector('button[type="submit"]');
        
        // Xóa ID khách hàng đang chỉnh sửa
        form.removeAttribute('data-edit-id');
        
        // Cập nhật tiêu đề và nút
        formTitle.textContent = 'Thêm khách hàng mới';
        submitButton.textContent = 'Thêm';
        
        // Xóa dữ liệu trong form
        form.reset();
        
        // Xóa nút hủy nếu có
        const cancelButton = document.getElementById('cancel-edit-btn');
        if (cancelButton) {
            cancelButton.remove();
        }
        
        // Focus vào ô tên
        document.getElementById('customer-name').focus();
        
        console.log('Đã khôi phục form về trạng thái thêm mới');
    } catch (error) {
        console.error('Lỗi khi khôi phục form:', error);
    }
}

// Hàm khởi động module khách hàng - có thể gọi từ script.js
window.loadCustomerModule = async function() {
    try {
        // Đảm bảo DB đã sẵn sàng trước khi thực hiện bất kỳ thao tác nào
        const db = await waitForDB();
        if (!db) {
            console.error('Không thể khởi tạo module khách hàng: Database chưa sẵn sàng');
            return false;
        }
        
        // Tạo ô tìm kiếm nếu cần
        createCustomerSearchBox();
        
        // Hiển thị danh sách khách hàng
        await displayCustomers();
        
        // Đổ danh sách khách hàng vào dropdown
        await populateCustomerDropdowns();
        
        console.log('Module khách hàng đã khởi tạo thành công');
        return true;
    } catch (error) {
        console.error('Lỗi khi khởi tạo module khách hàng:', error);
        return false;
    }
};
