// Test Suite cho PWA Sales Management System
// Kiểm tra các vấn đề về dropdown và order status

class PWASystemTester {
    constructor() {
        this.results = [];
        this.db = null;
    }

    // Utility function để log kết quả test
    log(testName, status, details = '') {
        const result = {
            test: testName,
            status: status, // 'PASS', 'FAIL', 'WARNING'
            details: details,
            timestamp: new Date().toISOString()
        };
        this.results.push(result);
        
        const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
        console.log(`${icon} ${testName}: ${details}`);
    }

    // Test 1: Kiểm tra Database Connection và Tables
    async testDatabaseStructure() {
        console.log('\n=== TEST 1: DATABASE STRUCTURE ===');
        
        try {
            this.db = window.db;
            if (!this.db) {
                this.log('Database Connection', 'FAIL', 'window.db is null');
                return false;
            }
            this.log('Database Connection', 'PASS', 'Connected successfully');

            // Kiểm tra object stores
            const requiredStores = ['suppliers', 'products', 'customers', 'orders'];
            for (const storeName of requiredStores) {
                if (this.db.objectStoreNames.contains(storeName)) {
                    this.log(`ObjectStore ${storeName}`, 'PASS', 'Exists');
                } else {
                    this.log(`ObjectStore ${storeName}`, 'FAIL', 'Missing');
                }
            }

            return true;
        } catch (error) {
            this.log('Database Test', 'FAIL', error.message);
            return false;
        }
    }

    // Test 2: Kiểm tra data trong suppliers
    async testSuppliersData() {
        console.log('\n=== TEST 2: SUPPLIERS DATA ===');
        
        try {
            const tx = this.db.transaction('suppliers', 'readonly');
            const store = tx.objectStore('suppliers');
            const suppliers = await store.getAll();
            
            this.log('Suppliers Count', suppliers.length > 0 ? 'PASS' : 'FAIL', 
                `Found ${suppliers.length} suppliers`);
            
            suppliers.forEach((supplier, index) => {
                this.log(`Supplier ${index + 1}`, 'PASS', 
                    `ID: ${supplier.id}, Name: ${supplier.name}`);
            });
            
            return suppliers;
        } catch (error) {
            this.log('Suppliers Data Test', 'FAIL', error.message);
            return [];
        }
    }

    // Test 3: Kiểm tra dropdown elements
    async testDropdownElements() {
        console.log('\n=== TEST 3: DROPDOWN ELEMENTS ===');
        
        const selectors = [
            { name: 'Product Supplier Dropdown', selector: '#product-supplier' },
            { name: 'Order Supplier Dropdowns', selector: '.supplier-select' },
            { name: 'Data Attribute Dropdowns', selector: '[data-supplier-dropdown]' }
        ];

        for (const selectorTest of selectors) {
            const elements = document.querySelectorAll(selectorTest.selector);
            this.log(selectorTest.name, elements.length > 0 ? 'PASS' : 'FAIL', 
                `Found ${elements.length} elements`);
            
            elements.forEach((element, index) => {
                this.log(`  Element ${index + 1}`, 'PASS', 
                    `ID: ${element.id}, Options: ${element.options.length}`);
            });
        }
    }

    // Test 4: Test populate supplier dropdowns
    async testPopulateSupplierDropdowns() {
        console.log('\n=== TEST 4: POPULATE SUPPLIER DROPDOWNS ===');
        
        try {
            // Test global function existence
            if (typeof window.populateSupplierDropdowns === 'function') {
                this.log('Global Function', 'PASS', 'window.populateSupplierDropdowns exists');
                
                // Execute populate
                await window.populateSupplierDropdowns();
                this.log('Populate Execution', 'PASS', 'Function executed successfully');
                
                // Check results
                const productSupplierDropdown = document.getElementById('product-supplier');
                if (productSupplierDropdown) {
                    const optionsCount = productSupplierDropdown.options.length;
                    this.log('Product Supplier Options', optionsCount > 1 ? 'PASS' : 'FAIL', 
                        `${optionsCount} options (including default)`);
                } else {
                    this.log('Product Supplier Dropdown', 'FAIL', 'Element not found');
                }
                
            } else {
                this.log('Global Function', 'FAIL', 'window.populateSupplierDropdowns not found');
            }
        } catch (error) {
            this.log('Populate Test', 'FAIL', error.message);
        }
    }

    // Test 5: Test order creation and status
    async testOrderCreationAndStatus() {
        console.log('\n=== TEST 5: ORDER CREATION AND STATUS ===');
        
        try {
            // Kiểm tra orders hiện tại
            const tx = this.db.transaction('orders', 'readonly');
            const store = tx.objectStore('orders');
            const orders = await store.getAll();
            
            this.log('Total Orders', 'PASS', `Found ${orders.length} orders`);
            
            // Kiểm tra status của từng đơn hàng
            const statusCounts = {};
            orders.forEach(order => {
                statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
                this.log(`Order ${order.id}`, 'PASS', 
                    `Status: ${order.status}, Customer: ${order.customerId}`);
            });
            
            // Thống kê status
            Object.entries(statusCounts).forEach(([status, count]) => {
                this.log(`Status "${status}"`, 'PASS', `${count} orders`);
            });
            
            // Kiểm tra orders có status phù hợp cho linking
            const pendingOrders = orders.filter(order => 
                (order.status === 'Mới' || order.status === 'Đang xử lý' || order.status === 'Chờ xử lý') &&
                !order.deliveredTripId
            );
            
            this.log('Pending Orders for Linking', pendingOrders.length > 0 ? 'PASS' : 'WARNING', 
                `${pendingOrders.length} orders available for linking`);
            
            return { allOrders: orders, pendingOrders };
        } catch (error) {
            this.log('Order Test', 'FAIL', error.message);
            return { allOrders: [], pendingOrders: [] };
        }
    }

    // Test 6: Test trip order linking logic
    async testTripOrderLinking() {
        console.log('\n=== TEST 6: TRIP ORDER LINKING LOGIC ===');
        
        try {
            // Kiểm tra function updateTripDetailOrders
            if (typeof updateTripDetailOrders === 'function') {
                this.log('UpdateTripDetailOrders Function', 'PASS', 'Function exists');
            } else {
                this.log('UpdateTripDetailOrders Function', 'FAIL', 'Function not found');
                return;
            }
            
            // Kiểm tra logic filter trong code
            const tx = this.db.transaction('orders', 'readonly');
            const store = tx.objectStore('orders');
            const orders = await store.getAll();
            
            // Test filter logic tương tự như trong updateTripDetailOrders
            const pendingOrders1 = orders.filter(order =>
                (order.status === 'Mới' || order.status === 'Đang xử lý') &&
                !order.deliveredTripId
            );
            
            const pendingOrders2 = orders.filter(order =>
                (order.status === 'Mới' || order.status === 'Đang xử lý' || order.status === 'Chờ xử lý') &&
                !order.deliveredTripId
            );
            
            this.log('Filter Logic 1 (Mới|Đang xử lý)', 'PASS', 
                `${pendingOrders1.length} orders found`);
            this.log('Filter Logic 2 (Mới|Đang xử lý|Chờ xử lý)', 'PASS', 
                `${pendingOrders2.length} orders found`);
            
            if (pendingOrders2.length > pendingOrders1.length) {
                this.log('Filter Difference', 'WARNING', 
                    'Some orders have "Chờ xử lý" status but code only filters "Mới|Đang xử lý"');
            }
            
        } catch (error) {
            this.log('Trip Linking Test', 'FAIL', error.message);
        }
    }

    // Test 7: Test module loading order
    async testModuleLoadingOrder() {
        console.log('\n=== TEST 7: MODULE LOADING ORDER ===');
        
        const modules = [
            'loadCustomerModule',
            'loadSupplierModule', 
            'loadProductModule',
            'loadOrderModule'
        ];
        
        modules.forEach(moduleName => {
            if (typeof window[moduleName] === 'function') {
                this.log(`Module ${moduleName}`, 'PASS', 'Function exists');
            } else {
                this.log(`Module ${moduleName}`, 'FAIL', 'Function not found');
            }
        });
        
        // Test populate functions
        const populateFunctions = [
            'populateSupplierDropdowns',
            'populateProductDropdowns',
            'populateCustomerDropdowns'
        ];
        
        populateFunctions.forEach(funcName => {
            if (typeof window[funcName] === 'function') {
                this.log(`Function ${funcName}`, 'PASS', 'Function exists globally');
            } else {
                this.log(`Function ${funcName}`, 'FAIL', 'Function not found globally');
            }
        });
    }

    // Test 8: Create test order with correct status
    async testCreateOrderWithCorrectStatus() {
        console.log('\n=== TEST 8: CREATE TEST ORDER ===');
        
        try {
            // Kiểm tra có customers không
            const customerTx = this.db.transaction('customers', 'readonly');
            const customerStore = customerTx.objectStore('customers');
            const customers = await customerStore.getAll();
            
            if (customers.length === 0) {
                this.log('Test Order Creation', 'FAIL', 'No customers found');
                return;
            }
            
            // Tạo test order
            const testOrder = {
                customerId: customers[0].id,
                items: [{
                    supplierName: 'Test Supplier',
                    productName: 'Test Product',
                    qty: 1,
                    sellingPrice: 100000,
                    purchasePrice: 80000
                }],
                orderDate: new Date(),
                status: 'Chờ xử lý', // Đúng status để test
                totalAmount: 100000,
                totalProfit: 20000
            };
            
            // Thêm vào DB
            const orderTx = this.db.transaction('orders', 'readwrite');
            const orderStore = orderTx.objectStore('orders');
            const orderId = await orderStore.add(testOrder);
            await orderTx.done;
            
            this.log('Test Order Created', 'PASS', `Order ID: ${orderId} with status: ${testOrder.status}`);
            
            return orderId;
        } catch (error) {
            this.log('Test Order Creation', 'FAIL', error.message);
            return null;
        }
    }

    // Generate test report
    generateReport() {
        console.log('\n=== TEST REPORT ===');
        
        const summary = {
            total: this.results.length,
            passed: this.results.filter(r => r.status === 'PASS').length,
            failed: this.results.filter(r => r.status === 'FAIL').length,
            warnings: this.results.filter(r => r.status === 'WARNING').length
        };
        
        console.log(`Total Tests: ${summary.total}`);
        console.log(`✅ Passed: ${summary.passed}`);
        console.log(`❌ Failed: ${summary.failed}`);
        console.log(`⚠️ Warnings: ${summary.warnings}`);
        
        if (summary.failed > 0) {
            console.log('\n=== FAILED TESTS ===');
            this.results.filter(r => r.status === 'FAIL').forEach(result => {
                console.log(`❌ ${result.test}: ${result.details}`);
            });
        }
        
        return summary;
    }

    // Run all tests
    async runAllTests() {
        console.log('🚀 Starting PWA System Tests...\n');
        
        await this.testDatabaseStructure();
        await this.testSuppliersData();
        await this.testDropdownElements();
        await this.testPopulateSupplierDropdowns();
        await this.testOrderCreationAndStatus();
        await this.testTripOrderLinking();
        await this.testModuleLoadingOrder();
        await this.testCreateOrderWithCorrectStatus();
        
        const summary = this.generateReport();
        
        // Đưa ra khuyến nghị
        console.log('\n=== RECOMMENDATIONS ===');
        if (summary.failed > 0) {
            console.log('❌ System has critical issues that need fixing');
        } else if (summary.warnings > 0) {
            console.log('⚠️ System works but has some issues to improve');
        } else {
            console.log('✅ System is working correctly');
        }
        
        return this.results;
    }
}

// Quick fix functions
window.fixSupplierDropdown = async function() {
    console.log('🔧 Attempting to fix supplier dropdown...');
    
    // Force populate
    if (typeof window.populateSupplierDropdowns === 'function') {
        await window.populateSupplierDropdowns();
        console.log('✅ Supplier dropdown populated');
    }
    
    // Re-check
    const dropdown = document.getElementById('product-supplier');
    if (dropdown && dropdown.options.length > 1) {
        console.log(`✅ Dropdown now has ${dropdown.options.length} options`);
    } else {
        console.log('❌ Dropdown still empty');
    }
};

window.fixOrderStatus = async function() {
    console.log('🔧 Attempting to fix order status...');
    
    const db = window.db;
    const tx = db.transaction('orders', 'readwrite');
    const store = tx.objectStore('orders');
    const orders = await store.getAll();
    
    let updated = 0;
    for (const order of orders) {
        if (order.status === 'Mới' && !order.deliveredTripId) {
            order.status = 'Chờ xử lý';
            await store.put(order);
            updated++;
        }
    }
    
    await tx.done;
    console.log(`✅ Updated ${updated} orders to "Chờ xử lý" status`);
};

// Export tester
window.PWASystemTester = PWASystemTester;
window.runSystemTests = async function() {
    const tester = new PWASystemTester();
    return await tester.runAllTests();
};

console.log('🔬 PWA System Test Suite loaded');
console.log('📞 Usage:');
console.log('  - runSystemTests() - Run complete test suite');
console.log('  - fixSupplierDropdown() - Try to fix supplier dropdown');
console.log('  - fixOrderStatus() - Fix order status issues'); 