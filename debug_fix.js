/**
 * Script Debug và Khắc phục lỗi cho ứng dụng PWA Quản lý Bán hàng
 * Sử dụng script này để kiểm tra và sửa các vấn đề thường gặp
 */

// Debug utilities
const DebugUtils = {
    // Kiểm tra môi trường
    checkEnvironment() {
        console.log('=== KIỂM TRA MÔI TRƯỜNG ===');
        console.log('IndexedDB Support:', !!window.indexedDB);
        console.log('idb Library:', typeof idb !== 'undefined' ? '✅ Loaded' : '❌ Not loaded');
    },

    // Xóa toàn bộ database (reset)
    async clearAllDatabases() {
        console.log('🗑️ Đang xóa toàn bộ database...');
        await this.deleteDatabase('salesAppDB');
        console.log('✅ Đã xóa database');
    },

    // Xóa một database cụ thể
    async deleteDatabase(dbName) {
        return new Promise((resolve) => {
            const deleteReq = indexedDB.deleteDatabase(dbName);
            deleteReq.onsuccess = () => resolve();
            deleteReq.onerror = () => resolve();
            deleteReq.onblocked = () => resolve();
        });
    },

    // Kiểm tra và khắc phục database
    async fixDatabase() {
        try {
            console.log('🔧 Đang khắc phục database...');
            
            if (typeof idb === 'undefined') {
                console.error('❌ Thư viện idb chưa được tải');
                return false;
            }

            const db = await idb.openDB('salesAppDB', 3, {
                upgrade(db, oldVersion, newVersion, transaction) {
                    console.log(`🔄 Upgrade từ v${oldVersion} lên v${newVersion}`);
                    
                    if (oldVersion < 1) {
                        if (!db.objectStoreNames.contains('customers')) {
                            db.createObjectStore('customers', {
                                keyPath: 'id',
                                autoIncrement: true
                            });
                        }
                        if (!db.objectStoreNames.contains('orders')) {
                            const orderStore = db.createObjectStore('orders', {
                                keyPath: 'id',
                                autoIncrement: true
                            });
                            orderStore.createIndex('customerId', 'customerId');
                        }
                    }
                    
                    if (oldVersion < 3) {
                        if (db.objectStoreNames.contains('orders')) {
                            const orderStore = transaction.objectStore('orders');
                            if (!orderStore.indexNames.contains('paymentStatus')) {
                                orderStore.createIndex('paymentStatus', 'paymentStatus');
                            }
                        }
                    }
                }
            });

            console.log('✅ Database đã được khắc phục');
            db.close();
            return true;

        } catch (error) {
            console.error('❌ Lỗi khi khắc phục:', error);
            return false;
        }
    },

    // Thêm dữ liệu test
    async addTestData() {
        try {
            console.log('📝 Đang thêm dữ liệu test...');
            
            if (typeof idb === 'undefined') {
                throw new Error('Thư viện idb chưa được tải');
            }

            const db = await idb.openDB('salesAppDB', 3);

            // Thêm khách hàng test
            await db.add('customers', {
                name: 'Nguyễn Văn A',
                contact: '0123456789'
            });

            await db.add('customers', {
                name: 'Trần Thị B', 
                contact: 'b@example.com'
            });

            console.log('✅ Đã thêm dữ liệu test thành công');
            db.close();

        } catch (error) {
            console.error('❌ Lỗi khi thêm dữ liệu test:', error);
        }
    },

    // Kiểm tra dữ liệu
    async checkData() {
        try {
            console.log('🔍 Đang kiểm tra dữ liệu...');
            
            if (typeof idb === 'undefined') {
                throw new Error('Thư viện idb chưa được tải');
            }

            const db = await idb.openDB('salesAppDB', 3);
            
            // Kiểm tra từng store
            const stores = ['customers', 'orders', 'trips', 'suppliers', 'products'];
            
            for (const storeName of stores) {
                try {
                    const count = await db.count(storeName);
                    console.log(`📊 Store ${storeName}: ${count} bản ghi`);
                } catch (error) {
                    console.warn(`⚠️ Không thể đếm ${storeName}:`, error.message);
                }
            }

            db.close();

        } catch (error) {
            console.error('❌ Lỗi khi kiểm tra dữ liệu:', error);
        }
    },

    // Chạy full diagnostic
    async runFullDiagnostic() {
        console.log('🏥 === BẮT ĐẦU CHẨN ĐOÁN TOÀN DIỆN ===');
        
        this.checkEnvironment();
        await this.checkData();
        
        console.log('🏥 === KẾT THÚC CHẨN ĐOÁN ===');
    }
};

// Export cho browser
if (typeof window !== 'undefined') {
    window.DebugUtils = DebugUtils;
    
    // Tự động chạy chẩn đoán nếu có lỗi
    window.addEventListener('error', (event) => {
        if (event.error && event.error.message.includes('IndexedDB')) {
            console.log('🚨 Phát hiện lỗi IndexedDB, chạy chẩn đoán...');
            DebugUtils.runFullDiagnostic();
        }
    });
}

// Các lệnh debug có thể chạy trong console:
console.log(`
🔧 === DEBUG COMMANDS ===

Trong Console, bạn có thể chạy các lệnh sau:

// Kiểm tra môi trường
DebugUtils.checkEnvironment()

// Chạy chẩn đoán toàn diện  
DebugUtils.runFullDiagnostic()

// Xóa toàn bộ database (CẢNH BÁO: Mất hết dữ liệu!)
DebugUtils.clearAllDatabases()

// Khắc phục database
DebugUtils.fixDatabase()

// Thêm dữ liệu test
DebugUtils.addTestData()

// Kiểm tra dữ liệu hiện tại
DebugUtils.checkData()

🔧 === END COMMANDS ===
`); 