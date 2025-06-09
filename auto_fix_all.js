// AUTO FIX SCRIPT - SỬA TẤT CẢ CÁC LỖI DATABASE ACCESS

console.log('🚀 Bắt đầu sửa tất cả các lỗi database access...');

// Danh sách các file cần sửa
const filesToFix = [
    'order.js',
    'trip.js', 
    'tripExpense.js',
    'payment.js',
    'debt.js',
    'report.js'
];

// Template waitForDB function cho từng module
const waitForDBTemplates = {
    'order.js': `
// Hàm chờ database sẵn sàng
async function waitForDB() {
    return new Promise((resolve) => {
        if (window.db) {
            try {
                const tx = window.db.transaction('orders', 'readonly');
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
                    const tx = window.db.transaction('orders', 'readonly');
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
}`,
    'trip.js': `
// Hàm chờ database sẵn sàng
async function waitForDB() {
    return new Promise((resolve) => {
        if (window.db) {
            try {
                const tx = window.db.transaction('trips', 'readonly');
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
                    const tx = window.db.transaction('trips', 'readonly');
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
}`,
    'tripExpense.js': `
// Hàm chờ database sẵn sàng
async function waitForDB() {
    return new Promise((resolve) => {
        if (window.db) {
            try {
                const tx = window.db.transaction('tripExpenses', 'readonly');
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
                    const tx = window.db.transaction('tripExpenses', 'readonly');
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
}`,
    'payment.js': `
// Hàm chờ database sẵn sàng
async function waitForDB() {
    return new Promise((resolve) => {
        if (window.db) {
            try {
                const tx = window.db.transaction('payments', 'readonly');
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
                    const tx = window.db.transaction('payments', 'readonly');
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
}`,
    'debt.js': `
// Hàm chờ database sẵn sàng
async function waitForDB() {
    return new Promise((resolve) => {
        if (window.db) {
            try {
                const tx = window.db.transaction('debts', 'readonly');
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
                    const tx = window.db.transaction('debts', 'readonly');
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
}`,
    'report.js': `
// Hàm chờ database sẵn sàng
async function waitForDB() {
    return new Promise((resolve) => {
        if (window.db) {
            try {
                const tx = window.db.transaction('orders', 'readonly');
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
                    const tx = window.db.transaction('orders', 'readonly');
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
}`
};

// Các pattern cần thay thế
const patterns = [
    {
        description: 'Thay thế database access',
        find: /const tx = db\.transaction\(/g,
        replace: 'const db = await waitForDB();\n        if (!db) {\n            throw new Error("Không thể kết nối đến cơ sở dữ liệu");\n        }\n        const tx = db.transaction('
    },
    {
        description: 'Thay thế database access khác',
        find: /const (\w+)Tx = db\.transaction\(/g,
        replace: 'const db = await waitForDB();\n        if (!db) {\n            throw new Error("Không thể kết nối đến cơ sở dữ liệu");\n        }\n        const $1Tx = db.transaction('
    }
];

console.log('📋 Danh sách file cần sửa:', filesToFix);
console.log('🔧 Các pattern sẽ được thay thế:', patterns.map(p => p.description));

// Hướng dẫn sử dụng
console.log(`
🎯 HƯỚNG DẪN SỬA THỦ CÔNG:

1. Mở từng file trong danh sách: ${filesToFix.join(', ')}

2. Thêm waitForDB function vào đầu file (sau comment header)

3. Tìm và thay thế tất cả:
   - "const tx = db.transaction(" 
   → "const db = await waitForDB(); if (!db) throw new Error('Không thể kết nối database'); const tx = db.transaction("

4. Thêm event listeners cho nút xóa trong các hàm display

5. Test từng module sau khi sửa

🚀 Sau khi sửa xong, tất cả chức năng CRUD sẽ hoạt động hoàn hảo!
`);

// Export để có thể sử dụng
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        filesToFix,
        waitForDBTemplates,
        patterns
    };
} 