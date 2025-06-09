// Debug function để kiểm tra dropdown nhà cung cấp

function debugSupplierDropdowns() {
    console.log('=== DEBUG SUPPLIER DROPDOWNS ===');
    
    // Kiểm tra tất cả các selector có thể
    const selectors = [
        '.supplier-select',
        '#product-supplier', 
        '[data-supplier-dropdown]'
    ];
    
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`Selector "${selector}": tìm thấy ${elements.length} elements`);
        
        elements.forEach((element, index) => {
            console.log(`  Element ${index + 1}:`, {
                id: element.id,
                className: element.className,
                options: element.options.length,
                value: element.value,
                disabled: element.disabled
            });
            
            // Log các options
            if (element.options.length > 0) {
                console.log('    Options:');
                Array.from(element.options).forEach((option, optIndex) => {
                    console.log(`      ${optIndex}: value="${option.value}" text="${option.textContent}"`);
                });
            }
        });
    });
    
    // Kiểm tra global functions
    console.log('=== GLOBAL FUNCTIONS ===');
    console.log('window.populateSupplierDropdowns:', typeof window.populateSupplierDropdowns);
    console.log('window.loadSupplierModule:', typeof window.loadSupplierModule);
    
    // Kiểm tra DB
    console.log('=== DATABASE ===');
    console.log('window.db:', !!window.db);
    
    if (window.db) {
        // Kiểm tra suppliers trong DB
        window.db.transaction('suppliers', 'readonly')
            .objectStore('suppliers')
            .getAll()
            .then(suppliers => {
                console.log(`Suppliers trong DB: ${suppliers.length}`);
                suppliers.forEach(supplier => {
                    console.log(`  ID: ${supplier.id}, Name: ${supplier.name}`);
                });
            })
            .catch(error => {
                console.error('Lỗi khi lấy suppliers từ DB:', error);
            });
    }
}

// Hàm test populate
async function testPopulateSupplierDropdowns() {
    console.log('=== TEST POPULATE SUPPLIER DROPDOWNS ===');
    
    if (typeof window.populateSupplierDropdowns === 'function') {
        try {
            await window.populateSupplierDropdowns();
            console.log('✅ populateSupplierDropdowns() thành công');
            
            // Kiểm tra lại sau khi populate
            setTimeout(() => {
                debugSupplierDropdowns();
            }, 500);
        } catch (error) {
            console.error('❌ Lỗi khi populate:', error);
        }
    } else {
        console.log('❌ window.populateSupplierDropdowns không tồn tại');
    }
}

// Export để dùng trong console
window.debugSupplierDropdowns = debugSupplierDropdowns;
window.testPopulateSupplierDropdowns = testPopulateSupplierDropdowns;

console.log('Debug functions đã sẵn sàng. Sử dụng:');
console.log('- debugSupplierDropdowns() để kiểm tra dropdown');
console.log('- testPopulateSupplierDropdowns() để test populate'); 