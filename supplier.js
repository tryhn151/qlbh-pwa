// ===== CÁC HÀM XỬ LÝ CHO QUẢN LÝ NHÀ CUNG CẤP =====

// Hàm chờ database sẵn sàng (copy từ customer.js)
async function waitForDB() {
    return new Promise((resolve) => {
        if (window.db) {
            try {
                const tx = window.db.transaction('suppliers', 'readonly');
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
                    const tx = window.db.transaction('suppliers', 'readonly');
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

// Thêm nhà cung cấp mới
async function addSupplier(supplierData) {
    try {
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }

        const tx = db.transaction('suppliers', 'readwrite');
        const store = tx.objectStore('suppliers');
        
        const id = await store.add(supplierData);
        await tx.done;
        
        console.log('Đã thêm nhà cung cấp mới với ID:', id);
        
        // Cập nhật giao diện
        await displaySuppliers();
        await populateSupplierDropdowns();
        
        return id;
    } catch (error) {
        console.error('Lỗi khi thêm nhà cung cấp:', error);
        return null;
    }
}

// Cập nhật nhà cung cấp
async function updateSupplier(supplierId, supplierData) {
    try {
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }

        const tx = db.transaction('suppliers', 'readwrite');
        const store = tx.objectStore('suppliers');
        
        // Lấy nhà cung cấp hiện tại
        const existingSupplier = await store.get(supplierId);
        if (!existingSupplier) {
            throw new Error('Không tìm thấy nhà cung cấp');
        }
        
        // Cập nhật thông tin
        const updatedSupplier = { ...existingSupplier, ...supplierData };
        
        await store.put(updatedSupplier);
        await tx.done;
        
        console.log('Đã cập nhật nhà cung cấp với ID:', supplierId);
        
        // Cập nhật giao diện
        await displaySuppliers();
        await populateSupplierDropdowns();
        
        return true;
    } catch (error) {
        console.error('Lỗi khi cập nhật nhà cung cấp:', error);
        return false;
    }
}

// Xóa nhà cung cấp
async function deleteSupplier(supplierId) {
    try {
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }

        // Kiểm tra xem nhà cung cấp có đang được sử dụng không
        const productTx = db.transaction('products', 'readonly');
        const productStore = productTx.objectStore('products');
        const productIndex = productStore.index('supplierId');
        const relatedProducts = await productIndex.getAll(supplierId);
        
        if (relatedProducts.length > 0) {
            alert(`Không thể xóa nhà cung cấp này vì đang có ${relatedProducts.length} sản phẩm liên quan.`);
            return false;
        }
        
        const tx = db.transaction('suppliers', 'readwrite');
        const store = tx.objectStore('suppliers');
        
        await store.delete(supplierId);
        await tx.done;
        
        console.log('Đã xóa nhà cung cấp với ID:', supplierId);
        
        // Cập nhật giao diện
        await displaySuppliers();
        await populateSupplierDropdowns();
        
        // Hiển thị thông báo thành công
        const suppliersList = document.getElementById('suppliers-list');
        if (suppliersList) {
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-success mt-3';
            alertElement.textContent = 'Đã xóa nhà cung cấp thành công!';
            suppliersList.parentNode.insertBefore(alertElement, suppliersList);
            
            setTimeout(() => {
                alertElement.remove();
            }, 3000);
        }
        
        return true;
    } catch (error) {
        console.error('Lỗi khi xóa nhà cung cấp:', error);
        return false;
    }
}

// Hiển thị danh sách nhà cung cấp
async function displaySuppliers() {
    try {
        const suppliersList = document.getElementById('suppliers-list');
        const noSuppliersMessage = document.getElementById('no-suppliers-message');
        
        if (!suppliersList || !noSuppliersMessage) return;
        
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }
        
        // Lấy tất cả nhà cung cấp từ IndexedDB
        const tx = db.transaction('suppliers', 'readonly');
        const store = tx.objectStore('suppliers');
        const suppliers = await store.getAll();
        
        // Xóa nội dung hiện tại
        suppliersList.innerHTML = '';
        
        if (suppliers.length > 0) {
            // Ẩn thông báo không có dữ liệu
            noSuppliersMessage.style.display = 'none';
            
            // Hiển thị từng nhà cung cấp
            suppliers.forEach(supplier => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${supplier.id}</td>
                    <td>${supplier.name}</td>
                    <td>${supplier.region || 'Không xác định'}</td>
                    <td>${supplier.address || ''}</td>
                    <td>${supplier.contact || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-supplier-btn" data-id="${supplier.id}">
                            Sửa
                        </button>
                        <button class="btn btn-sm btn-danger delete-supplier-btn" data-id="${supplier.id}">
                            Xóa
                        </button>
                    </td>
                `;
                
                suppliersList.appendChild(row);
            });
            
            // Thêm event listener cho các nút sửa
            document.querySelectorAll('.edit-supplier-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const supplierId = parseInt(e.target.getAttribute('data-id'));
                    await editSupplier(supplierId);
                });
            });

            // Thêm event listener cho các nút xóa
            document.querySelectorAll('.delete-supplier-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const supplierId = parseInt(e.target.getAttribute('data-id'));
                    
                    if (confirm('Bạn có chắc chắn muốn xóa nhà cung cấp này?')) {
                        await deleteSupplier(supplierId);
                    }
                });
            });
        } else {
            // Hiển thị thông báo không có dữ liệu
            noSuppliersMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị danh sách nhà cung cấp:', error);
    }
}

// Lấy thông tin nhà cung cấp theo ID
async function getSupplier(supplierId) {
    try {
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }

        const tx = db.transaction('suppliers', 'readonly');
        const store = tx.objectStore('suppliers');
        
        const supplier = await store.get(supplierId);
        return supplier;
    } catch (error) {
        console.error('Lỗi khi lấy thông tin nhà cung cấp:', error);
        
        // Hiển thị thông báo lỗi
        const formElement = document.getElementById('supplier-form');
        if (formElement) {
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-danger mt-3';
            alertElement.textContent = `Lỗi khi lấy thông tin nhà cung cấp: ${error.message}`;
            formElement.parentNode.insertBefore(alertElement, formElement.nextSibling);
            
            setTimeout(() => {
                alertElement.remove();
            }, 5000);
        }
        
        return null;
    }
}

// Chỉnh sửa nhà cung cấp
async function editSupplier(supplierId) {
    try {
        const supplier = await getSupplier(supplierId);
        if (!supplier) {
            alert('Không tìm thấy thông tin nhà cung cấp!');
            return;
        }
        
        // Điền thông tin vào form
        const supplierForm = document.getElementById('supplier-form');
        if (supplierForm) {
            supplierForm.setAttribute('data-edit-id', supplierId);
            
            document.getElementById('supplier-name').value = supplier.name || '';
            document.getElementById('supplier-region').value = supplier.region || '';
            document.getElementById('supplier-address').value = supplier.address || '';
            document.getElementById('supplier-contact').value = supplier.contact || '';
            
            // Thay đổi nút submit
            const submitButton = supplierForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.textContent = 'Cập nhật nhà cung cấp';
            }
            
            // Cuộn đến form
            supplierForm.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Lỗi khi chỉnh sửa nhà cung cấp:', error);
    }
}

// Tìm kiếm nhà cung cấp
async function searchSuppliers(keyword) {
    try {
        const suppliersList = document.getElementById('suppliers-list');
        const noSuppliersMessage = document.getElementById('no-suppliers-message');
        
        if (!suppliersList || !noSuppliersMessage) return;
        
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }
        
        // Lấy tất cả nhà cung cấp từ IndexedDB
        const tx = db.transaction('suppliers', 'readonly');
        const store = tx.objectStore('suppliers');
        const suppliers = await store.getAll();
        
        // Lọc nhà cung cấp theo từ khóa (tên, khu vực hoặc liên hệ)
        const lowercaseKeyword = keyword.toLowerCase();
        const filteredSuppliers = suppliers.filter(supplier => 
            supplier.name.toLowerCase().includes(lowercaseKeyword) || 
            (supplier.region && supplier.region.toLowerCase().includes(lowercaseKeyword)) ||
            (supplier.contact && supplier.contact.toLowerCase().includes(lowercaseKeyword)) ||
            (supplier.address && supplier.address.toLowerCase().includes(lowercaseKeyword))
        );
        
        // Xóa nội dung hiện tại
        suppliersList.innerHTML = '';
        
        if (filteredSuppliers.length > 0) {
            // Ẩn thông báo không có dữ liệu
            noSuppliersMessage.style.display = 'none';
            
            // Hiển thị từng nhà cung cấp
            filteredSuppliers.forEach(supplier => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${supplier.id}</td>
                    <td>${supplier.name}</td>
                    <td>${supplier.region || 'Không xác định'}</td>
                    <td>${supplier.address || ''}</td>
                    <td>${supplier.contact || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-supplier-btn" data-id="${supplier.id}">
                            Sửa
                        </button>
                        <button class="btn btn-sm btn-danger delete-supplier-btn" data-id="${supplier.id}">
                            Xóa
                        </button>
                    </td>
                `;
                
                suppliersList.appendChild(row);
            });
            
            // Thêm event listener cho các nút sửa
            document.querySelectorAll('.edit-supplier-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const supplierId = parseInt(e.target.getAttribute('data-id'));
                    await editSupplier(supplierId);
                });
            });

            // Thêm event listener cho các nút xóa
            document.querySelectorAll('.delete-supplier-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const supplierId = parseInt(e.target.getAttribute('data-id'));
                    
                    if (confirm('Bạn có chắc chắn muốn xóa nhà cung cấp này?')) {
                        await deleteSupplier(supplierId);
                    }
                });
            });
        } else {
            // Hiển thị thông báo không có dữ liệu
            noSuppliersMessage.style.display = 'block';
            noSuppliersMessage.textContent = `Không tìm thấy nhà cung cấp nào phù hợp với từ khóa "${keyword}"`;
        }
    } catch (error) {
        console.error('Lỗi khi tìm kiếm nhà cung cấp:', error);
    }
}

// Đổ danh sách nhà cung cấp vào dropdown
async function populateSupplierDropdowns() {
    try {
        // Lấy tất cả các dropdown nhà cung cấp (bao gồm cả trong order form và product form)
        const supplierDropdowns = document.querySelectorAll('.supplier-select, #product-supplier, [data-supplier-dropdown]');
        if (supplierDropdowns.length === 0) {
            console.log('Không tìm thấy dropdown nhà cung cấp nào');
            return false;
        }
        
        const db = await waitForDB();
        if (!db) {
            console.error('Không thể kết nối đến cơ sở dữ liệu để tải danh sách nhà cung cấp');
            return false;
        }
        
        // Lấy danh sách nhà cung cấp từ IndexedDB
        const tx = db.transaction('suppliers', 'readonly');
        const store = tx.objectStore('suppliers');
        const suppliers = await store.getAll();
        
        // Đổ dữ liệu vào từng dropdown
        supplierDropdowns.forEach(dropdown => {
            // Lưu lại giá trị đã chọn (nếu có)
            const selectedValue = dropdown.value;
            
            // Xóa tất cả các option trừ option mặc định đầu tiên
            while (dropdown.options.length > 1) {
                dropdown.remove(1);
            }
            
            // Thêm các option mới
            suppliers.forEach(supplier => {
                const option = document.createElement('option');
                option.value = supplier.id;
                option.textContent = supplier.name;
                dropdown.appendChild(option);
            });
            
            // Khôi phục giá trị đã chọn (nếu có)
            if (selectedValue) {
                dropdown.value = selectedValue;
            }
        });
        
        console.log(`✅ Populate ${supplierDropdowns.length} dropdown(s) với ${suppliers.length} suppliers`);
        return true;
    } catch (error) {
        console.error('Lỗi khi đổ danh sách nhà cung cấp vào dropdown:', error);
        return false;
    }
}

// Hàm populate với retry mechanism để xử lý race condition
async function populateSupplierDropdownsWithRetry(maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // Thêm delay tăng dần cho mỗi lần retry
            if (attempt > 1) {
                await new Promise(resolve => setTimeout(resolve, 300 * (attempt - 1)));
                console.log(`🔄 Retry populate suppliers lần ${attempt}...`);
            }
            
            const result = await populateSupplierDropdowns();
            if (result) {
                console.log(`✅ Populate suppliers thành công ở lần thử ${attempt}`);
                return true;
            }
        } catch (error) {
            console.log(`❌ Lần thử ${attempt} thất bại:`, error.message);
            if (attempt === maxAttempts) {
                console.error('🚨 Đã thử tối đa', maxAttempts, 'lần nhưng vẫn không thể populate supplier dropdown');
                
                // Fallback: Thử populate trực tiếp với DOM observer
                observeAndPopulateSuppliers();
            }
        }
    }
    return false;
}

// Observer để tự động populate khi DOM element xuất hiện
function observeAndPopulateSuppliers() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const productSupplierDropdown = document.getElementById('product-supplier');
                if (productSupplierDropdown && productSupplierDropdown.options.length <= 1) {
                    console.log('🔍 Detected empty product-supplier dropdown, attempting populate...');
                    populateSupplierDropdowns();
                }
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Auto disconnect after 5 seconds to avoid memory leaks
    setTimeout(() => {
        observer.disconnect();
        console.log('🔍 Supplier dropdown observer disconnected');
    }, 5000);
}

// Tạo ô tìm kiếm nhà cung cấp
function createSupplierSearchBox() {
    const suppliersList = document.getElementById('suppliers-list');
    if (!suppliersList) return;
    
    // Kiểm tra xem đã có ô tìm kiếm chưa
    if (document.getElementById('supplier-search')) return;
    
    // Tạo ô tìm kiếm
    const searchContainer = document.createElement('div');
    searchContainer.className = 'mb-3';
    searchContainer.innerHTML = `
        <div class="input-group">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input type="text" class="form-control" id="supplier-search" placeholder="Tìm kiếm nhà cung cấp...">
        </div>
    `;
    
    // Thêm vào trước bảng
    const tableContainer = suppliersList.closest('.table-responsive');
    if (tableContainer && tableContainer.parentNode) {
        tableContainer.parentNode.insertBefore(searchContainer, tableContainer);
    }
}

// Thiết lập các event listener cho quản lý nhà cung cấp
function setupSupplierEventListeners() {
    // Form thêm/sửa nhà cung cấp
    const supplierForm = document.getElementById('supplier-form');
    if (supplierForm) {
        // Kiểm tra xem đã có event listener chưa
        if (supplierForm.hasAttribute('data-listener-added')) {
            return;
        }
        
        // Đánh dấu đã thêm event listener
        supplierForm.setAttribute('data-listener-added', 'true');
        
        supplierForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('supplier-name').value.trim();
            const region = document.getElementById('supplier-region').value.trim();
            const address = document.getElementById('supplier-address').value.trim();
            const contact = document.getElementById('supplier-contact').value.trim();
            
            if (name) {
                const supplierData = {
                    name,
                    region,
                    address,
                    contact
                };
                
                // Kiểm tra xem đang thêm mới hay chỉnh sửa
                const editId = supplierForm.getAttribute('data-edit-id');
                if (editId) {
                    // Chỉnh sửa nhà cung cấp
                    await updateSupplier(parseInt(editId), supplierData);
                    
                    // Reset form và trạng thái
                    supplierForm.removeAttribute('data-edit-id');
                    const submitButton = supplierForm.querySelector('button[type="submit"]');
                    if (submitButton) {
                        submitButton.textContent = 'Thêm nhà cung cấp';
                    }
                } else {
                    // Thêm nhà cung cấp mới
                    await addSupplier(supplierData);
                }
                
                // Reset form
                supplierForm.reset();
                document.getElementById('supplier-name').focus();
            }
        });
        
        // Nút hủy chỉnh sửa
        const cancelEditButton = document.getElementById('cancel-edit-supplier');
        if (cancelEditButton) {
            cancelEditButton.addEventListener('click', () => {
                supplierForm.reset();
                supplierForm.removeAttribute('data-edit-id');
                
                const submitButton = supplierForm.querySelector('button[type="submit"]');
                if (submitButton) {
                    submitButton.textContent = 'Thêm nhà cung cấp';
                }
            });
        }
    }
    
    // Ô tìm kiếm nhà cung cấp
    const supplierSearchInput = document.getElementById('supplier-search');
    if (supplierSearchInput) {
        supplierSearchInput.addEventListener('input', async () => {
            await searchSuppliers(supplierSearchInput.value.trim());
        });
    }
    
    console.log('Đã thiết lập các event listener cho quản lý nhà cung cấp');
}

// Hàm khởi động module nhà cung cấp - có thể gọi từ script.js
window.loadSupplierModule = async function() {
    try {
        // Đảm bảo DB đã sẵn sàng
        const db = await waitForDB();
        if (!db) {
            console.error('Không thể khởi tạo module nhà cung cấp: Database chưa sẵn sàng');
            return false;
        }
        
        // Tạo ô tìm kiếm nếu cần
        createSupplierSearchBox();
        
        // Hiển thị danh sách nhà cung cấp
        await displaySuppliers();
        
        // Đổ danh sách nhà cung cấp vào dropdown
        await populateSupplierDropdowns();
        
        // Thiết lập các event listener
        setupSupplierEventListeners();
        
        // Đăng ký các hàm populate làm global
        window.populateSupplierDropdowns = populateSupplierDropdowns;
        window.populateSupplierDropdownsWithRetry = populateSupplierDropdownsWithRetry;
        
        console.log('Module nhà cung cấp đã khởi tạo thành công');
        return true;
    } catch (error) {
        console.error('Lỗi khi khởi tạo module nhà cung cấp:', error);
        return false;
    }
};
