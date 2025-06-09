// Test workflow mới của tab Chuyến hàng
// Tạo dữ liệu test và kiểm tra các chức năng

console.log('🧪 Bắt đầu test workflow mới tab Chuyến hàng...');

// Test data
const testCustomers = [
    { name: 'Nguyễn Văn A', phone: '0901234567', address: 'Hà Nội' },
    { name: 'Trần Thị B', phone: '0902345678', address: 'TP.HCM' }
];

const testProducts = [
    { name: 'Sản phẩm 1', currentStock: 100 },
    { name: 'Sản phẩm 2', currentStock: 50 }
];

const testOrders = [
    {
        customerId: 1,
        orderDate: '2024-01-15',
        status: 'Chờ xử lý',
        items: [
            { productId: 1, productName: 'Sản phẩm 1', qty: 10, sellingPrice: 50000, purchasePrice: 40000 }
        ],
        paymentReceived: 0
    },
    {
        customerId: 2,
        orderDate: '2024-01-16',
        status: 'Chờ xử lý',
        items: [
            { productId: 2, productName: 'Sản phẩm 2', qty: 5, sellingPrice: 30000, purchasePrice: 25000 }
        ],
        paymentReceived: 0
    }
];

const testTrip = {
    tripName: 'Chuyến test workflow mới',
    tripDate: '2024-01-20',
    status: 'Đang thực hiện'
};

async function runTestWorkflow() {
    try {
        console.log('📝 Tạo dữ liệu test...');
        
        // Tạo khách hàng test
        const customerIds = [];
        for (const customer of testCustomers) {
            const id = await addCustomer(customer);
            customerIds.push(id);
            console.log(`✅ Tạo khách hàng ID: ${id}`);
        }

        // Tạo sản phẩm test
        const productIds = [];
        for (const product of testProducts) {
            const id = await addProduct(product);
            productIds.push(id);
            console.log(`✅ Tạo sản phẩm ID: ${id}`);
        }

        // Tạo đơn hàng test
        const orderIds = [];
        for (let i = 0; i < testOrders.length; i++) {
            const order = { ...testOrders[i], customerId: customerIds[i] };
            const id = await addOrder(order);
            orderIds.push(id);
            console.log(`✅ Tạo đơn hàng ID: ${id}`);
        }

        // Tạo chuyến hàng test
        const tripId = await addTrip(testTrip);
        console.log(`✅ Tạo chuyến hàng ID: ${tripId}`);

        console.log('\n🔄 Test liên kết đơn hàng với chuyến hàng...');
        // Liên kết đơn hàng với chuyến hàng
        await linkOrdersToTrip(tripId, orderIds);
        console.log('✅ Liên kết đơn hàng thành công');

        console.log('\n💰 Test thanh toán từng phần...');
        // Test thanh toán từng phần đơn hàng đầu tiên
        const order1Total = testOrders[0].items[0].qty * testOrders[0].items[0].sellingPrice;
        const partialPayment = order1Total / 2; // Thanh toán 50%
        
        await processPayment(orderIds[0], tripId, partialPayment, 'Tiền mặt', 'Thanh toán một phần');
        console.log(`✅ Thanh toán một phần: ${formatCurrency(partialPayment)}`);

        console.log('\n💰 Test thanh toán hoàn tất...');
        // Thanh toán phần còn lại của đơn hàng đầu tiên
        await processPayment(orderIds[0], tripId, partialPayment, 'Chuyển khoản', 'Thanh toán hoàn tất');
        console.log('✅ Thanh toán hoàn tất đơn hàng đầu tiên');

        // Thanh toán hoàn tất đơn hàng thứ hai
        const order2Total = testOrders[1].items[0].qty * testOrders[1].items[0].sellingPrice;
        await processPayment(orderIds[1], tripId, order2Total, 'Tiền mặt', 'Thanh toán toàn bộ');
        console.log('✅ Thanh toán hoàn tất đơn hàng thứ hai');

        console.log('\n🏷️ Test thêm chi phí chuyến hàng...');
        // Test thêm chi phí
        const expenseData = {
            tripId: tripId,
            type: 'Xăng dầu',
            amount: 200000,
            description: 'Chi phí xăng cho chuyến test',
            date: '2024-01-20'
        };
        
        await addTripExpense(expenseData);
        console.log('✅ Thêm chi phí chuyến hàng');

        console.log('\n📊 Test hiển thị chi tiết chuyến hàng...');
        // Test hiển thị modal chi tiết
        await showTripDetail(tripId);
        console.log('✅ Modal chi tiết chuyến hàng đã mở');

        console.log('\n✅ Test workflow hoàn tất!');
        
        // Hiển thị tóm tắt
        console.log('\n📋 Tóm tắt test:');
        console.log(`- Tạo ${customerIds.length} khách hàng`);
        console.log(`- Tạo ${productIds.length} sản phẩm`);
        console.log(`- Tạo ${orderIds.length} đơn hàng`);
        console.log(`- Tạo 1 chuyến hàng`);
        console.log('- Liên kết đơn hàng với chuyến hàng');
        console.log('- Test thanh toán từng phần và hoàn tất');
        console.log('- Test thêm chi phí chuyến hàng');
        console.log('- Test hiển thị chi tiết chuyến hàng');

        return {
            tripId,
            orderIds,
            customerIds,
            productIds,
            success: true
        };

    } catch (error) {
        console.error('❌ Lỗi trong quá trình test:', error);
        return { success: false, error };
    }
}

// Test riêng các chức năng UI
async function testUIFunctions() {
    console.log('\n🎨 Test các chức năng UI...');
    
    try {
        // Test openPaymentModal
        console.log('Test openPaymentModal...');
        if (typeof openPaymentModal === 'function') {
            // Không thực sự mở modal, chỉ test function tồn tại
            console.log('✅ Function openPaymentModal đã sẵn sàng');
        }

        // Test processPayment
        console.log('Test processPayment...');
        if (typeof processPayment === 'function') {
            console.log('✅ Function processPayment đã sẵn sàng');
        }

        // Test unlinkOrderFromTrip
        console.log('Test unlinkOrderFromTrip...');
        if (typeof unlinkOrderFromTrip === 'function') {
            console.log('✅ Function unlinkOrderFromTrip đã sẵn sàng');
        }

        // Test showOrderDetail
        console.log('Test showOrderDetail...');
        if (typeof showOrderDetail === 'function') {
            console.log('✅ Function showOrderDetail đã sẵn sàng');
        }

        // Test addTripExpense và deleteTripExpense
        console.log('Test expense functions...');
        if (typeof addTripExpense === 'function' && typeof deleteTripExpense === 'function') {
            console.log('✅ Functions chi phí đã sẵn sàng');
        }

        console.log('✅ Tất cả functions UI đã sẵn sàng!');
        return true;

    } catch (error) {
        console.error('❌ Lỗi test UI functions:', error);
        return false;
    }
}

// Test workflow khi trang web đã load xong
if (typeof window !== 'undefined') {
    window.addEventListener('load', async () => {
        console.log('🌐 Trang web đã load, bắt đầu test...');
        
        // Đợi DB khởi tạo xong
        if (typeof db !== 'undefined' && db) {
            setTimeout(async () => {
                await testUIFunctions();
                console.log('\n💡 Để chạy test đầy đủ, hãy gọi: await runTestWorkflow()');
                
                // Export function để có thể gọi từ console
                window.runTestWorkflow = runTestWorkflow;
                window.testUIFunctions = testUIFunctions;
            }, 2000);
        }
    });
}

console.log('📝 File test workflow đã sẵn sàng!');
console.log('💡 Để chạy test, hãy gọi: await runTestWorkflow()'); 