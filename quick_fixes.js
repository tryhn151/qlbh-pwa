// Quick Fixes cho PWA Sales Management System

// Fix 1: Force populate product supplier dropdown
window.fixProductSupplierDropdown = async function() {
    console.log('🔧 Fixing product supplier dropdown...');
    
    try {
        // Method 1: Use dedicated product function
        if (typeof window.populateProductSupplierDropdowns === 'function') {
            const result = await window.populateProductSupplierDropdowns();
            if (result) {
                console.log('✅ Product supplier dropdown fixed with dedicated function');
                return true;
            }
        }
        
        // Method 2: Use retry function
        if (typeof window.populateProductSupplierDropdownsWithRetry === 'function') {
            const result = await window.populateProductSupplierDropdownsWithRetry();
            if (result) {
                console.log('✅ Product supplier dropdown fixed with retry function');
                return true;
            }
        }
        
        // Method 3: Manual fix
        console.log('🔄 Trying manual fix...');
        const db = window.db;
        if (!db) {
            console.log('❌ Database not available');
            return false;
        }

        const dropdown = document.getElementById('product-supplier');
        if (!dropdown) {
            console.log('❌ #product-supplier dropdown not found');
            return false;
        }

        const tx = db.transaction('suppliers', 'readonly');
        const store = tx.objectStore('suppliers');
        const suppliers = await store.getAll();

        // Clear and repopulate
        dropdown.innerHTML = '<option value="" disabled selected>Chọn nhà cung cấp</option>';
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.id;
            option.textContent = supplier.name;
            dropdown.appendChild(option);
        });

        console.log(`✅ Manually fixed dropdown with ${suppliers.length} suppliers`);
        return true;

    } catch (error) {
        console.error('❌ Error fixing product supplier dropdown:', error);
        return false;
    }
};

// Fix 2: Test order linking
window.quickTestOrderLinking = async function() {
    console.log('🔗 Quick test order linking...');
    
    try {
        const db = window.db;
        if (!db) {
            console.log('❌ Database not available');
            return false;
        }

        // Check if we have required data
        const customerTx = db.transaction('customers', 'readonly');
        const customerStore = customerTx.objectStore('customers');
        const customers = await customerStore.getAll();
        
        if (customers.length === 0) {
            console.log('⚠️ No customers found. Please add customers first.');
            return false;
        }

        // Check trips
        const tripTx = db.transaction('trips', 'readonly');
        const tripStore = tripTx.objectStore('trips');
        const trips = await tripStore.getAll();
        
        if (trips.length === 0) {
            console.log('⚠️ No trips found. Please add trips first.');
            return false;
        }

        // Check orders with "Chờ xử lý" status
        const orderTx = db.transaction('orders', 'readonly');
        const orderStore = orderTx.objectStore('orders');
        const orders = await orderStore.getAll();
        
        const pendingOrders = orders.filter(order => 
            (order.status === 'Mới' || order.status === 'Chờ xử lý') && 
            !order.deliveredTripId
        );

        console.log(`📊 Found ${pendingOrders.length} orders available for linking`);
        console.log(`📊 Found ${trips.length} trips available`);

        if (pendingOrders.length === 0) {
            console.log('ℹ️ No orders available for linking. Create an order first.');
            return false;
        }

        // Test linking function exists
        if (typeof linkOrdersToTrip === 'function') {
            console.log('✅ linkOrdersToTrip function is available');
            console.log('🎯 You can now test linking orders in the Trip tab');
            return true;
        } else {
            console.log('❌ linkOrdersToTrip function not found');
            return false;
        }

    } catch (error) {
        console.error('❌ Error testing order linking:', error);
        return false;
    }
};

// Fix 3: Comprehensive system check
window.systemHealthCheck = async function() {
    console.log('🏥 Running system health check...');
    
    const checks = {
        database: false,
        modules: 0,
        suppliers: 0,
        customers: 0,
        products: 0,
        orders: 0,
        trips: 0
    };

    try {
        // Check database
        const db = window.db;
        if (db) {
            checks.database = true;
            console.log('✅ Database: Connected');

            // Check data counts
            const tx = db.transaction(['suppliers', 'customers', 'products', 'orders', 'trips'], 'readonly');
            
            checks.suppliers = (await tx.objectStore('suppliers').getAll()).length;
            checks.customers = (await tx.objectStore('customers').getAll()).length;
            checks.products = (await tx.objectStore('products').getAll()).length;
            checks.orders = (await tx.objectStore('orders').getAll()).length;
            checks.trips = (await tx.objectStore('trips').getAll()).length;

            console.log(`📊 Suppliers: ${checks.suppliers}`);
            console.log(`📊 Customers: ${checks.customers}`);
            console.log(`📊 Products: ${checks.products}`);
            console.log(`📊 Orders: ${checks.orders}`);
            console.log(`📊 Trips: ${checks.trips}`);
        } else {
            console.log('❌ Database: Not connected');
        }

        // Check modules
        const modules = [
            'loadSupplierModule',
            'loadProductModule',
            'loadOrderModule',
            'loadCustomerModule'
        ];

        modules.forEach(moduleName => {
            if (typeof window[moduleName] === 'function') {
                checks.modules++;
                console.log(`✅ Module: ${moduleName}`);
            } else {
                console.log(`❌ Module: ${moduleName} not found`);
            }
        });

        // Check populate functions
        const populateFunctions = [
            'populateSupplierDropdowns',
            'populateProductSupplierDropdowns',
            'populateProductDropdowns',
            'populateCustomerDropdowns'
        ];

        let populateCount = 0;
        populateFunctions.forEach(funcName => {
            if (typeof window[funcName] === 'function') {
                populateCount++;
                console.log(`✅ Function: ${funcName}`);
            } else {
                console.log(`⚠️ Function: ${funcName} not found`);
            }
        });

        // Summary
        console.log('\n=== HEALTH CHECK SUMMARY ===');
        console.log(`Database: ${checks.database ? '✅' : '❌'}`);
        console.log(`Modules: ${checks.modules}/4 loaded`);
        console.log(`Populate Functions: ${populateCount}/${populateFunctions.length} available`);
        console.log(`Data: ${checks.suppliers + checks.customers + checks.products + checks.orders + checks.trips} total records`);

        if (checks.database && checks.modules >= 3 && populateCount >= 3) {
            console.log('🎉 System health: GOOD');
            return true;
        } else {
            console.log('⚠️ System health: NEEDS ATTENTION');
            return false;
        }

    } catch (error) {
        console.error('❌ Error during health check:', error);
        return false;
    }
};

// Fix 4: Reset and reload everything
window.forceReloadAll = async function() {
    console.log('🔄 Force reloading all modules...');
    
    try {
        // Reload all modules
        if (typeof window.loadSupplierModule === 'function') {
            await window.loadSupplierModule();
            console.log('✅ Supplier module reloaded');
        }

        if (typeof window.loadProductModule === 'function') {
            await window.loadProductModule();
            console.log('✅ Product module reloaded');
        }

        if (typeof window.loadCustomerModule === 'function') {
            await window.loadCustomerModule();
            console.log('✅ Customer module reloaded');
        }

        if (typeof window.loadOrderModule === 'function') {
            await window.loadOrderModule();
            console.log('✅ Order module reloaded');
        }

        // Force populate all dropdowns
        const delays = [100, 300, 500]; // Staggered delays
        
        setTimeout(async () => {
            if (typeof window.populateSupplierDropdowns === 'function') {
                await window.populateSupplierDropdowns();
                console.log('✅ Supplier dropdowns populated');
            }
        }, delays[0]);

        setTimeout(async () => {
            if (typeof window.populateProductSupplierDropdowns === 'function') {
                await window.populateProductSupplierDropdowns();
                console.log('✅ Product supplier dropdowns populated');
            }
        }, delays[1]);

        setTimeout(async () => {
            if (typeof window.populateCustomerDropdowns === 'function') {
                await window.populateCustomerDropdowns();
                console.log('✅ Customer dropdowns populated');
            }
        }, delays[2]);

        console.log('🎉 Force reload complete');
        return true;

    } catch (error) {
        console.error('❌ Error during force reload:', error);
        return false;
    }
};

// Test workflow thanh toán mới (Quick version)
async function quickTestPaymentWorkflow() {
    console.log('💳 Quick test payment workflow...');
    
    try {
        const tx = db.transaction(['orders', 'trips', 'customers'], 'readonly');
        const orderStore = tx.objectStore('orders');
        const tripStore = tx.objectStore('trips');
        const customerStore = tx.objectStore('customers');
        
        const orders = await orderStore.getAll();
        const trips = await tripStore.getAll();
        
        console.log(`📊 Data overview: ${orders.length} orders, ${trips.length} trips`);
        
        // Tìm đơn hàng đã liên kết
        const linkedOrders = orders.filter(order => 
            order.deliveredTripId && order.status === 'Đang xử lý'
        );
        
        if (linkedOrders.length > 0) {
            const testOrder = linkedOrders[0];
            const customer = await customerStore.get(testOrder.customerId);
            
            let orderTotal = 0;
            if (testOrder.items && testOrder.items.length > 0) {
                orderTotal = testOrder.items.reduce((sum, item) => 
                    sum + (item.qty * item.sellingPrice), 0
                );
            }
            
            const paymentReceived = testOrder.paymentReceived || 0;
            const remainingDebt = orderTotal - paymentReceived;
            
            console.log(`📄 Test order #${testOrder.id}:`);
            console.log(`   Customer: ${customer ? customer.name : 'Unknown'}`);
            console.log(`   Total: ${formatCurrency(orderTotal)}`);
            console.log(`   Paid: ${formatCurrency(paymentReceived)}`);
            console.log(`   Debt: ${formatCurrency(remainingDebt)}`);
            
            if (remainingDebt > 0) {
                console.log('✅ Ready for payment testing');
                console.log(`💡 Có thể test thanh toán với openPaymentModal(${testOrder.id}, ${testOrder.deliveredTripId}, '${customer?.name}', ${orderTotal}, ${paymentReceived})`);
            } else {
                console.log('✅ Order fully paid');
            }
            
            return true;
        } else {
            console.warn('⚠️ No linked orders for payment testing');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error in payment workflow test:', error);
        return false;
    }
}

// Kiểm tra tính năng auto status update
async function quickTestStatusUpdate() {
    console.log('🔄 Quick test status update...');
    
    try {
        const tx = db.transaction(['orders', 'trips'], 'readonly');
        const orderStore = tx.objectStore('orders');
        const tripStore = tx.objectStore('trips');
        
        const orders = await orderStore.getAll();
        const trips = await tripStore.getAll();
        
        // Kiểm tra chuyến hàng có đơn hàng hoàn thành
        for (const trip of trips) {
            const tripOrders = orders.filter(order => order.deliveredTripId === trip.id);
            
            if (tripOrders.length > 0) {
                const completedOrders = tripOrders.filter(order => order.status === 'Thành công');
                const allCompleted = tripOrders.length === completedOrders.length;
                
                console.log(`🚚 Trip #${trip.id} (${trip.tripName}):`);
                console.log(`   Total orders: ${tripOrders.length}`);
                console.log(`   Completed: ${completedOrders.length}`);
                console.log(`   Trip status: ${trip.status}`);
                console.log(`   Should be "Đã giao": ${allCompleted ? 'YES' : 'NO'}`);
                
                if (allCompleted && trip.status !== 'Đã giao') {
                    console.warn(`⚠️ Trip #${trip.id} should be "Đã giao" but is "${trip.status}"`);
                }
            }
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error checking status update:', error);
        return false;
    }
}

// Enhanced system health check
async function enhancedSystemHealthCheck() {
    console.log('🏥 Enhanced system health check...');
    
    const checks = [
        () => systemHealthCheck(),
        () => quickTestPaymentWorkflow(), 
        () => quickTestStatusUpdate()
    ];
    
    let passedChecks = 0;
    for (const check of checks) {
        try {
            const result = await check();
            if (result) passedChecks++;
        } catch (error) {
            console.error('❌ Health check failed:', error);
        }
    }
    
    console.log(`🎯 Health check result: ${passedChecks}/${checks.length} passed`);
    
    if (passedChecks === checks.length) {
        console.log('🎉 System is healthy!');
    } else {
        console.warn('⚠️ Some issues detected');
    }
    
    return passedChecks === checks.length;
}

// Test mock payment (giả lập thanh toán không thực sự update DB)
async function mockPaymentTest(orderId, amount) {
    console.log(`💰 Mock payment test: Order #${orderId}, Amount: ${formatCurrency(amount)}`);
    
    try {
        const tx = db.transaction(['orders', 'customers'], 'readonly');
        const orderStore = tx.objectStore('orders');
        const customerStore = tx.objectStore('customers');
        
        const order = await orderStore.get(orderId);
        if (!order) {
            console.error('❌ Order not found');
            return false;
        }
        
        const customer = await customerStore.get(order.customerId);
        let orderTotal = 0;
        if (order.items && order.items.length > 0) {
            orderTotal = order.items.reduce((sum, item) => 
                sum + (item.qty * item.sellingPrice), 0
            );
        }
        
        const currentPayment = order.paymentReceived || 0;
        const remainingDebt = orderTotal - currentPayment;
        const newTotalPayment = currentPayment + amount;
        
        console.log(`📄 Order details:`);
        console.log(`   Customer: ${customer ? customer.name : 'Unknown'}`);
        console.log(`   Total: ${formatCurrency(orderTotal)}`);
        console.log(`   Current paid: ${formatCurrency(currentPayment)}`);
        console.log(`   Payment amount: ${formatCurrency(amount)}`);
        console.log(`   New total paid: ${formatCurrency(newTotalPayment)}`);
        console.log(`   Remaining debt: ${formatCurrency(Math.max(0, orderTotal - newTotalPayment))}`);
        
        if (amount > remainingDebt) {
            console.warn(`⚠️ Payment amount exceeds remaining debt (${formatCurrency(remainingDebt)})`);
            return false;
        }
        
        if (newTotalPayment >= orderTotal) {
            console.log('✅ Order would be fully paid → Status: "Thành công"');
        } else {
            console.log('⏳ Order still has debt → Status remains: "Đang xử lý"');
        }
        
        console.log('💡 This is a mock test - no actual data updated');
        return true;
        
    } catch (error) {
        console.error('❌ Mock payment test failed:', error);
        return false;
    }
}

console.log('⚡ Quick Fixes loaded');
console.log('📞 Available commands:');
console.log('  - fixProductSupplierDropdown() - Fix product supplier dropdown');
console.log('  - quickTestOrderLinking() - Quick test order linking');
console.log('  - systemHealthCheck() - Check system health');
console.log('  - forceReloadAll() - Force reload all modules');
console.log('🚀 Enhanced Quick Fixes loaded! New commands:');
console.log('  - quickTestPaymentWorkflow() - Test payment workflow');
console.log('  - quickTestStatusUpdate() - Test status update logic');  
console.log('  - enhancedSystemHealthCheck() - Enhanced health check');
console.log('  - mockPaymentTest(orderId, amount) - Mock payment test'); 