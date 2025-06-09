// ===== CÁC HÀM XỬ LÝ CHO QUẢN LÝ SẢN PHẨM =====

// Hàm chờ database sẵn sàng (copy từ customer.js)
async function waitForDB() {
    return new Promise((resolve) => {
        if (window.db) {
            try {
                const tx = window.db.transaction('products', 'readonly');
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
                    const tx = window.db.transaction('products', 'readonly');
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

// Thêm sản phẩm mới
async function addProduct(productData) {
    try {
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }

        const tx = db.transaction('products', 'readwrite');
        const store = tx.objectStore('products');
        
        const id = await store.add(productData);
        await tx.done;
        
        console.log('Đã thêm sản phẩm mới với ID:', id);
        
        // Cập nhật giao diện
        await displayProducts();
        await populateProductDropdowns();
        
        return id;
    } catch (error) {
        console.error('Lỗi khi thêm sản phẩm:', error);
        return null;
    }
}

// Cập nhật sản phẩm
async function updateProduct(productId, productData) {
    try {
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }

        const tx = db.transaction('products', 'readwrite');
        const store = tx.objectStore('products');
        
        // Lấy sản phẩm hiện tại
        const existingProduct = await store.get(productId);
        if (!existingProduct) {
            throw new Error('Không tìm thấy sản phẩm');
        }
        
        // Cập nhật thông tin
        const updatedProduct = { ...existingProduct, ...productData };
        
        await store.put(updatedProduct);
        await tx.done;
        
        console.log('Đã cập nhật sản phẩm với ID:', productId);
        
        // Cập nhật giao diện
        await displayProducts();
        await populateProductDropdowns();
        
        return true;
    } catch (error) {
        console.error('Lỗi khi cập nhật sản phẩm:', error);
        return false;
    }
}

// Xóa sản phẩm
async function deleteProduct(productId) {
    try {
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }

        // Kiểm tra xem sản phẩm có đang được sử dụng trong đơn hàng không
        const orderItemsTx = db.transaction('orderItems', 'readonly');
        const orderItemsStore = orderItemsTx.objectStore('orderItems');
        const orderItemsIndex = orderItemsStore.index('productId');
        const relatedOrderItems = await orderItemsIndex.getAll(productId);
        
        if (relatedOrderItems.length > 0) {
            alert(`Không thể xóa sản phẩm này vì đang có ${relatedOrderItems.length} đơn hàng liên quan.`);
            return false;
        }
        
        const tx = db.transaction('products', 'readwrite');
        const store = tx.objectStore('products');
        
        await store.delete(productId);
        await tx.done;
        
        console.log('Đã xóa sản phẩm với ID:', productId);
        
        // Cập nhật giao diện
        await displayProducts();
        await populateProductDropdowns();
        
        // Hiển thị thông báo thành công
        const productsList = document.getElementById('products-list');
        if (productsList) {
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-success mt-3';
            alertElement.textContent = 'Đã xóa sản phẩm thành công!';
            productsList.parentNode.insertBefore(alertElement, productsList);
            
            setTimeout(() => {
                alertElement.remove();
            }, 3000);
        }
        
        return true;
    } catch (error) {
        console.error('Lỗi khi xóa sản phẩm:', error);
        return false;
    }
}

// Hiển thị danh sách sản phẩm
async function displayProducts() {
    try {
        const productsList = document.getElementById('products-list');
        const noProductsMessage = document.getElementById('no-products-message');
        
        if (!productsList || !noProductsMessage) return;
        
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }
        
        // Lấy tất cả sản phẩm từ IndexedDB
        const tx = db.transaction(['products', 'suppliers'], 'readonly');
        const productStore = tx.objectStore('products');
        const supplierStore = tx.objectStore('suppliers');
        const products = await productStore.getAll();
        
        // Xóa nội dung hiện tại
        productsList.innerHTML = '';
        
        if (products.length > 0) {
            // Ẩn thông báo không có dữ liệu
            noProductsMessage.style.display = 'none';
            
            // Hiển thị từng sản phẩm
            for (const product of products) {
                // Lấy thông tin nhà cung cấp
                let supplierName = 'Không xác định';
                if (product.supplierId) {
                    const supplier = await supplierStore.get(product.supplierId);
                    if (supplier) {
                        supplierName = supplier.name;
                    }
                }
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${product.id}</td>
                    <td>${product.name}</td>
                    <td>${product.code || ''}</td>
                    <td>${product.unit || ''}</td>
                    <td class="text-end">${formatCurrency(product.purchasePrice || 0)}</td>
                    <td>${supplierName}</td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-product-btn" data-id="${product.id}">
                            Sửa
                        </button>
                        <button class="btn btn-sm btn-danger delete-product-btn" data-id="${product.id}">
                            Xóa
                        </button>
                    </td>
                `;
                
                productsList.appendChild(row);
            }
            
            // Thêm event listener cho các nút sửa
            document.querySelectorAll('.edit-product-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const productId = parseInt(e.target.getAttribute('data-id'));
                    await editProduct(productId);
                });
            });

            // Thêm event listener cho các nút xóa
            document.querySelectorAll('.delete-product-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const productId = parseInt(e.target.getAttribute('data-id'));
                    
                    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
                        await deleteProduct(productId);
                    }
                });
            });
        } else {
            // Hiển thị thông báo không có dữ liệu
            noProductsMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị danh sách sản phẩm:', error);
    }
}

// Lấy thông tin sản phẩm theo ID
async function getProduct(productId) {
    try {
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }

        const tx = db.transaction('products', 'readonly');
        const store = tx.objectStore('products');
        
        const product = await store.get(productId);
        return product;
    } catch (error) {
        console.error('Lỗi khi lấy thông tin sản phẩm:', error);
        
        // Hiển thị thông báo lỗi
        const formElement = document.getElementById('product-form');
        if (formElement) {
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-danger mt-3';
            alertElement.textContent = `Lỗi khi lấy thông tin sản phẩm: ${error.message}`;
            formElement.parentNode.insertBefore(alertElement, formElement.nextSibling);
            
            setTimeout(() => {
                alertElement.remove();
            }, 5000);
        }
        
        return null;
    }
}

// Chỉnh sửa sản phẩm
async function editProduct(productId) {
    try {
        const product = await getProduct(productId);
        if (!product) {
            alert('Không tìm thấy thông tin sản phẩm!');
            return;
        }
        
        // Điền thông tin vào form
        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.setAttribute('data-edit-id', productId);
            
            document.getElementById('product-name').value = product.name || '';
            document.getElementById('product-code').value = product.code || '';
            document.getElementById('product-unit').value = product.unit || '';
            document.getElementById('product-purchase-price').value = product.purchasePrice || '';
            
            // Chọn nhà cung cấp
            const supplierSelect = document.getElementById('product-supplier');
            if (supplierSelect && product.supplierId) {
                supplierSelect.value = product.supplierId;
            }
            
            // Thay đổi nút submit
            const submitButton = productForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.textContent = 'Cập nhật sản phẩm';
            }
            
            // Cuộn đến form
            productForm.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Lỗi khi chỉnh sửa sản phẩm:', error);
    }
}

// Tìm kiếm sản phẩm
async function searchProducts(keyword) {
    try {
        const productsList = document.getElementById('products-list');
        const noProductsMessage = document.getElementById('no-products-message');
        
        if (!productsList || !noProductsMessage) return;
        
        const db = await waitForDB();
        if (!db) {
            throw new Error('Không thể kết nối đến cơ sở dữ liệu');
        }
        
        // Lấy tất cả sản phẩm từ IndexedDB
        const tx = db.transaction(['products', 'suppliers'], 'readonly');
        const productStore = tx.objectStore('products');
        const supplierStore = tx.objectStore('suppliers');
        const products = await productStore.getAll();
        
        // Lọc sản phẩm theo từ khóa (tên, mã hoặc đơn vị)
        const lowercaseKeyword = keyword.toLowerCase();
        const filteredProducts = products.filter(product => 
            product.name.toLowerCase().includes(lowercaseKeyword) || 
            (product.code && product.code.toLowerCase().includes(lowercaseKeyword)) ||
            (product.unit && product.unit.toLowerCase().includes(lowercaseKeyword))
        );
        
        // Xóa nội dung hiện tại
        productsList.innerHTML = '';
        
        if (filteredProducts.length > 0) {
            // Ẩn thông báo không có dữ liệu
            noProductsMessage.style.display = 'none';
            
            // Hiển thị từng sản phẩm
            for (const product of filteredProducts) {
                // Lấy thông tin nhà cung cấp
                let supplierName = 'Không xác định';
                if (product.supplierId) {
                    const supplier = await supplierStore.get(product.supplierId);
                    if (supplier) {
                        supplierName = supplier.name;
                    }
                }
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${product.id}</td>
                    <td>${product.name}</td>
                    <td>${product.code || ''}</td>
                    <td>${product.unit || ''}</td>
                    <td class="text-end">${formatCurrency(product.purchasePrice || 0)}</td>
                    <td>${supplierName}</td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-product-btn" data-id="${product.id}">
                            Sửa
                        </button>
                        <button class="btn btn-sm btn-danger delete-product-btn" data-id="${product.id}">
                            Xóa
                        </button>
                    </td>
                `;
                
                productsList.appendChild(row);
            }
            
            // Thêm event listener cho các nút sửa
            document.querySelectorAll('.edit-product-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const productId = parseInt(e.target.getAttribute('data-id'));
                    await editProduct(productId);
                });
            });

            // Thêm event listener cho các nút xóa
            document.querySelectorAll('.delete-product-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const productId = parseInt(e.target.getAttribute('data-id'));
                    
                    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
                        await deleteProduct(productId);
                    }
                });
            });
        } else {
            // Hiển thị thông báo không có dữ liệu
            noProductsMessage.style.display = 'block';
            noProductsMessage.textContent = `Không tìm thấy sản phẩm nào phù hợp với từ khóa "${keyword}"`;
        }
    } catch (error) {
        console.error('Lỗi khi tìm kiếm sản phẩm:', error);
    }
}

// Đổ danh sách sản phẩm vào dropdown
async function populateProductDropdowns() {
    try {
        // Lấy tất cả các dropdown sản phẩm
        const productDropdowns = document.querySelectorAll('.product-select');
        if (productDropdowns.length === 0) {
            console.log('Không tìm thấy dropdown sản phẩm nào');
            return;
        }
        
        const db = await waitForDB();
        if (!db) {
            console.error('Không thể kết nối đến cơ sở dữ liệu để tải danh sách sản phẩm');
            return;
        }
        
        // Lấy danh sách sản phẩm từ IndexedDB
        const tx = db.transaction('products', 'readonly');
        const store = tx.objectStore('products');
        const products = await store.getAll();
        
        // Đổ dữ liệu vào từng dropdown
        productDropdowns.forEach(dropdown => {
            // Lưu lại giá trị đã chọn (nếu có)
            const selectedValue = dropdown.value;
            
            // Xóa tất cả các option trừ option mặc định đầu tiên
            while (dropdown.options.length > 1) {
                dropdown.remove(1);
            }
            
            // Thêm các option mới
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (${product.code || 'Không mã'})`;
                dropdown.appendChild(option);
            });
            
            // Khôi phục giá trị đã chọn (nếu có)
            if (selectedValue) {
                dropdown.value = selectedValue;
            }
        });
    } catch (error) {
        console.error('Lỗi khi đổ danh sách sản phẩm vào dropdown:', error);
    }
}

// Tạo ô tìm kiếm sản phẩm
function createProductSearchBox() {
    const productsList = document.getElementById('products-list');
    if (!productsList) return;
    
    // Kiểm tra xem đã có ô tìm kiếm chưa
    if (document.getElementById('product-search')) return;
    
    // Tạo ô tìm kiếm
    const searchContainer = document.createElement('div');
    searchContainer.className = 'mb-3';
    searchContainer.innerHTML = `
        <div class="input-group">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input type="text" class="form-control" id="product-search" placeholder="Tìm kiếm sản phẩm...">
        </div>
    `;
    
    // Thêm vào trước bảng
    const tableContainer = productsList.closest('.table-responsive');
    if (tableContainer && tableContainer.parentNode) {
        tableContainer.parentNode.insertBefore(searchContainer, tableContainer);
    }
}

// Thiết lập các event listener cho quản lý sản phẩm
function setupProductEventListeners() {
    // Form thêm/sửa sản phẩm
    const productForm = document.getElementById('product-form');
    if (productForm) {
        // Kiểm tra xem đã có event listener chưa
        if (productForm.hasAttribute('data-listener-added')) {
            return;
        }
        
        // Đánh dấu đã thêm event listener
        productForm.setAttribute('data-listener-added', 'true');
        
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('product-name').value.trim();
            const code = document.getElementById('product-code').value.trim();
            const unit = document.getElementById('product-unit').value.trim();
            const purchasePrice = parseFloat(document.getElementById('product-purchase-price').value) || 0;
            const supplierId = parseInt(document.getElementById('product-supplier').value) || null;
            
            if (name) {
                const productData = {
                    name,
                    code,
                    unit,
                    purchasePrice,
                    supplierId
                };
                
                // Kiểm tra xem đang thêm mới hay chỉnh sửa
                const editId = productForm.getAttribute('data-edit-id');
                if (editId) {
                    // Chỉnh sửa sản phẩm
                    await updateProduct(parseInt(editId), productData);
                    
                    // Reset form và trạng thái
                    productForm.removeAttribute('data-edit-id');
                    const submitButton = productForm.querySelector('button[type="submit"]');
                    if (submitButton) {
                        submitButton.textContent = 'Thêm sản phẩm';
                    }
                } else {
                    // Thêm sản phẩm mới
                    await addProduct(productData);
                }
                
                // Reset form
                productForm.reset();
                document.getElementById('product-name').focus();
            }
        });
        
        // Nút hủy chỉnh sửa
        const cancelEditButton = document.getElementById('cancel-edit-product');
        if (cancelEditButton) {
            cancelEditButton.addEventListener('click', () => {
                productForm.reset();
                productForm.removeAttribute('data-edit-id');
                
                const submitButton = productForm.querySelector('button[type="submit"]');
                if (submitButton) {
                    submitButton.textContent = 'Thêm sản phẩm';
                }
            });
        }
    }
    
    // Ô tìm kiếm sản phẩm
    const productSearchInput = document.getElementById('product-search');
    if (productSearchInput) {
        productSearchInput.addEventListener('input', async () => {
            await searchProducts(productSearchInput.value.trim());
        });
    }
    
    console.log('Đã thiết lập các event listener cho quản lý sản phẩm');
}

// Đổ danh sách nhà cung cấp vào dropdown trong product tab (học theo order.js)
async function populateProductSupplierDropdowns() {
    try {
        const db = await waitForDB();
        if (!db) {
            console.error('Không thể kết nối đến cơ sở dữ liệu để tải danh sách nhà cung cấp');
            return false;
        }
        
        // Chỉ target dropdown trong product tab
        const productSupplierDropdown = document.getElementById('product-supplier');
        if (!productSupplierDropdown) {
            console.log('Không tìm thấy dropdown #product-supplier');
            return false;
        }
        
        const tx = db.transaction('suppliers', 'readonly');
        const store = tx.objectStore('suppliers');
        const suppliers = await store.getAll();
        
        // Lưu giá trị đã chọn
        const selectedValue = productSupplierDropdown.value;
        
        // Xóa tất cả options trừ option đầu tiên
        while (productSupplierDropdown.options.length > 1) {
            productSupplierDropdown.remove(1);
        }
        
        // Đảm bảo có option đầu tiên
        if (productSupplierDropdown.options.length === 0) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Chọn nhà cung cấp';
            defaultOption.disabled = true;
            defaultOption.selected = true;
            productSupplierDropdown.appendChild(defaultOption);
        }
        
        // Thêm các nhà cung cấp
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.id;
            option.textContent = supplier.name;
            productSupplierDropdown.appendChild(option);
        });
        
        // Khôi phục giá trị đã chọn
        if (selectedValue) {
            productSupplierDropdown.value = selectedValue;
        }
        
        console.log(`✅ Đã populate dropdown #product-supplier với ${suppliers.length} nhà cung cấp`);
        return true;
        
    } catch (error) {
        console.error('Lỗi khi tải danh sách nhà cung cấp cho product tab:', error);
        return false;
    }
}

// Hàm populate với retry mechanism cho product tab
async function populateProductSupplierDropdownsWithRetry(maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // Thêm delay tăng dần cho mỗi lần retry
            if (attempt > 1) {
                await new Promise(resolve => setTimeout(resolve, 200 * (attempt - 1)));
                console.log(`🔄 Retry populate product suppliers lần ${attempt}...`);
            }
            
            const result = await populateProductSupplierDropdowns();
            if (result) {
                console.log(`✅ Populate product suppliers thành công ở lần thử ${attempt}`);
                return true;
            }
        } catch (error) {
            console.log(`❌ Lần thử ${attempt} thất bại:`, error.message);
            if (attempt === maxAttempts) {
                console.error('🚨 Đã thử tối đa', maxAttempts, 'lần nhưng vẫn không thể populate product supplier dropdown');
                
                // Fallback: Thử observer pattern
                observeProductSupplierDropdown();
            }
        }
    }
    return false;
}

// Observer để tự động populate khi DOM element xuất hiện cho product tab
function observeProductSupplierDropdown() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const productSupplierDropdown = document.getElementById('product-supplier');
                if (productSupplierDropdown && productSupplierDropdown.options.length <= 1) {
                    console.log('🔍 Detected empty #product-supplier dropdown, attempting populate...');
                    populateProductSupplierDropdowns();
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
        console.log('🔍 Product supplier dropdown observer disconnected');
    }, 5000);
}

// Hàm khởi động module sản phẩm - có thể gọi từ script.js
window.loadProductModule = async function() {
    try {
        // Đảm bảo DB đã sẵn sàng
        const db = await waitForDB();
        if (!db) {
            console.error('Không thể khởi tạo module sản phẩm: Database chưa sẵn sàng');
            return false;
        }
        
        // Tạo ô tìm kiếm nếu cần
        createProductSearchBox();
        
        // Hiển thị danh sách sản phẩm
        await displayProducts();
        
        // Đổ danh sách sản phẩm vào dropdown
        await populateProductDropdowns();
        
        // Đổ danh sách nhà cung cấp vào dropdown (sử dụng function riêng cho product)
        await populateProductSupplierDropdownsWithRetry();
        
        // Thiết lập các event listener
        setupProductEventListeners();
        
        // Đăng ký các hàm populate làm global  
        window.populateProductDropdowns = populateProductDropdowns;
        window.populateProductSupplierDropdowns = populateProductSupplierDropdowns;
        window.populateProductSupplierDropdownsWithRetry = populateProductSupplierDropdownsWithRetry;
        
        console.log('Module sản phẩm đã khởi tạo thành công');
        return true;
    } catch (error) {
        console.error('Lỗi khi khởi tạo module sản phẩm:', error);
        return false;
    }
};
