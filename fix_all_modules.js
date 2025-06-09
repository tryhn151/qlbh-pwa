// SCRIPT SỬA CHỮA TẤT CẢ CÁC MODULE

// Hàm waitForDB chuẩn để copy vào tất cả module
const standardWaitForDB = `
// Hàm chờ database sẵn sàng
async function waitForDB() {
    return new Promise((resolve) => {
        if (window.db) {
            try {
                const tx = window.db.transaction('customers', 'readonly');
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
                    const tx = window.db.transaction('customers', 'readonly');
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
`;

console.log('Script fix này sẽ hướng dẫn sửa các lỗi sau:');
console.log('1. Thêm waitForDB() vào đầu mỗi module');
console.log('2. Thay thế "db." bằng "const db = await waitForDB(); db."');
console.log('3. Thêm event listeners cho nút xóa');
console.log('4. Thêm validation và error handling');

// Danh sách các file cần sửa
const filesToFix = [
    'order.js',
    'trip.js', 
    'payment.js',
    'debt.js',
    'report.js'
];

console.log('Các file cần sửa:', filesToFix);

// Các pattern thường gặp cần thay thế:
const patterns = [
    {
        find: 'const tx = db.transaction(',
        replace: 'const db = await waitForDB();\nif (!db) throw new Error("Không thể kết nối database");\nconst tx = db.transaction('
    },
    {
        find: '// Thêm event listener cho các nút sửa',
        replace: `// Thêm event listener cho các nút sửa
            document.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const id = parseInt(e.target.getAttribute('data-id'));
                    await editFunction(id);
                });
            });

            // Thêm event listener cho các nút xóa
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const id = parseInt(e.target.getAttribute('data-id'));
                    
                    if (confirm('Bạn có chắc chắn muốn xóa?')) {
                        await deleteFunction(id);
                    }
                });
            });`
    }
];

console.log('Các pattern cần sửa:', patterns); 