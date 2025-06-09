// ===== HỆ THỐNG BACKUP TỰ ĐỘNG - GỐM SỨ NGUYỄN NGỌC =====

class AutoBackupSystem {
    constructor() {
        this.config = {
            // Tần suất backup (phút)
            intervals: {
                quick: 30,      // 30 phút - backup nhanh
                hourly: 60,     // 1 giờ - backup chính
                daily: 1440,    // 24 giờ - backup hàng ngày
                weekly: 10080   // 7 ngày - backup tuần
            },
            // Số lượng backup giữ lại
            retentionPolicy: {
                quick: 5,       // Giữ 5 backup gần nhất (2.5h)
                hourly: 24,     // Giữ 24 backup (1 ngày)
                daily: 30,      // Giữ 30 backup (1 tháng)
                weekly: 52      // Giữ 52 backup (1 năm)
            },
            // Kích thước tối đa cho mỗi backup (MB)
            maxBackupSize: 50,
            // Storage method
            storageMethod: 'localStorage' // 'localStorage', 'indexedDB', 'download'
        };
        
        this.timers = {};
        this.isEnabled = this.getBackupEnabled();
        this.stats = this.getBackupStats();
        
        this.init();
    }

    // Khởi tạo hệ thống
    init() {
        console.log('🔄 Khởi tạo hệ thống Auto Backup...');
        
        // Load cấu hình đã lưu
        this.loadConfig();
        
        // Tạo UI quản lý backup
        this.createBackupUI();
        
        // Bắt đầu các timer nếu enabled
        if (this.isEnabled) {
            this.startAllBackups();
        }
        
        // Kiểm tra backup khi khởi động
        this.checkBackupOnStartup();
        
        // Cleanup backups cũ
        this.cleanupOldBackups();
        
        console.log('✅ Hệ thống Auto Backup đã sẵn sàng');
    }

    // Tạo UI quản lý backup
    createBackupUI() {
        // UI đã được tạo sẵn trong HTML, chỉ cần setup event listeners
        console.log('📍 Auto Backup UI đã được tạo sẵn trong tab Quản trị dữ liệu');
        
        // Load trạng thái hiện tại
        this.updateUI();
        
        // Setup event listeners
        this.setupBackupEventListeners();
        
        // Setup database stats
        this.setupDatabaseStats();
        
        return;
    }

    // Setup event listeners cho UI
    setupBackupEventListeners() {
        // Toggle auto backup
        const enableToggle = document.getElementById('autoBackupEnabled');
        if (enableToggle) {
            enableToggle.addEventListener('change', (e) => {
                this.setBackupEnabled(e.target.checked);
            });
        }

        // Manual backup
        const manualBtn = document.getElementById('manualBackupBtn');
        if (manualBtn) {
            manualBtn.addEventListener('click', () => {
                this.performManualBackup();
            });
        }

        // View backups
        const viewBtn = document.getElementById('viewBackupsBtn');
        if (viewBtn) {
            viewBtn.addEventListener('click', () => {
                this.showBackupList();
            });
        }

        // Restore backup
        const restoreBtn = document.getElementById('restoreBackupBtn');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', () => {
                this.showRestoreDialog();
            });
        }
    }

    // Bật/tắt auto backup
    setBackupEnabled(enabled) {
        this.isEnabled = enabled;
        localStorage.setItem('autoBackupEnabled', enabled.toString());
        
        if (enabled) {
            this.startAllBackups();
        } else {
            this.stopAllBackups();
        }
        
        this.updateUI();
        
        // Thông báo
        this.showNotification(
            enabled ? 'Đã bật Auto Backup' : 'Đã tắt Auto Backup',
            enabled ? 'success' : 'warning'
        );
    }

    // Bắt đầu tất cả backup timers
    startAllBackups() {
        console.log('🚀 Bắt đầu tất cả backup timers...');
        
        // Quick backup (30 phút)
        this.timers.quick = setInterval(() => {
            this.performBackup('quick');
        }, this.config.intervals.quick * 60 * 1000);

        // Hourly backup (1 giờ)
        this.timers.hourly = setInterval(() => {
            this.performBackup('hourly');
        }, this.config.intervals.hourly * 60 * 1000);

        // Daily backup (24 giờ)
        this.timers.daily = setInterval(() => {
            this.performBackup('daily');
        }, this.config.intervals.daily * 60 * 1000);

        // Weekly backup (7 ngày)
        this.timers.weekly = setInterval(() => {
            this.performBackup('weekly');
        }, this.config.intervals.weekly * 60 * 1000);

        console.log('✅ Tất cả backup timers đã được khởi động');
    }

    // Dừng tất cả backup timers
    stopAllBackups() {
        console.log('⏹️ Dừng tất cả backup timers...');
        
        Object.keys(this.timers).forEach(key => {
            if (this.timers[key]) {
                clearInterval(this.timers[key]);
                this.timers[key] = null;
            }
        });
    }

    // Bắt đầu tất cả backup timers
    startAllBackups() {
        console.log('🚀 Bắt đầu tất cả backup timers...');
        
        // Quick backup (30 phút)
        this.timers.quick = setInterval(() => {
            this.performBackup('quick');
        }, this.config.intervals.quick * 60 * 1000);

        // Hourly backup (1 giờ)
        this.timers.hourly = setInterval(() => {
            this.performBackup('hourly');
        }, this.config.intervals.hourly * 60 * 1000);

        // Daily backup (24 giờ)
        this.timers.daily = setInterval(() => {
            this.performBackup('daily');
        }, this.config.intervals.daily * 60 * 1000);

        // Weekly backup (7 ngày)
        this.timers.weekly = setInterval(() => {
            this.performBackup('weekly');
        }, this.config.intervals.weekly * 60 * 1000);

        console.log('✅ Tất cả backup timers đã được khởi động');
    }

    // Dừng tất cả backup timers
    stopAllBackups() {
        console.log('⏹️ Dừng tất cả backup timers...');
        
        Object.keys(this.timers).forEach(key => {
            if (this.timers[key]) {
                clearInterval(this.timers[key]);
                this.timers[key] = null;
            }
        });
    }

    // Thực hiện backup
    async performBackup(type = 'manual') {
        try {
            console.log(`📦 Bắt đầu backup ${type}...`);
            
            if (!window.db) {
                throw new Error('Database chưa sẵn sàng');
            }

            // Lấy tất cả dữ liệu
            const allData = await this.getAllData();
            
            // Tạo backup object
            const backup = {
                id: this.generateBackupId(),
                type: type,
                timestamp: new Date().toISOString(),
                data: allData,
                stats: this.calculateDataStats(allData),
                version: '1.0',
                source: 'auto-backup-system'
            };

            // Kiểm tra kích thước
            const backupSize = this.calculateBackupSize(backup);
            if (backupSize > this.config.maxBackupSize * 1024 * 1024) {
                console.warn(`⚠️ Backup quá lớn (${this.formatBytes(backupSize)}), bỏ qua`);
                return false;
            }

            // Lưu backup
            await this.saveBackup(backup);
            
            // Cập nhật stats
            this.updateBackupStats(backup);
            
            // Cleanup backup cũ
            this.cleanupOldBackups();
            
            console.log(`✅ Backup ${type} thành công - ${this.formatBytes(backupSize)}`);
            
            if (type === 'manual') {
                this.showNotification(
                    'Backup thành công!', 
                    'success', 
                    `Đã tạo backup ${this.formatBytes(backupSize)}`
                );
            }
            
            return true;

        } catch (error) {
            console.error(`❌ Lỗi backup ${type}:`, error);
            
            if (type === 'manual') {
                this.showNotification('Lỗi backup!', 'danger', error.message);
            }
            
            return false;
        }
    }

    // Lấy tất cả dữ liệu từ IndexedDB
    async getAllData() {
        const allData = {};
        const storeNames = [
            'customers', 'suppliers', 'products', 'orders', 
            'trips', 'purchases', 'tripExpenses', 'customerPayments',
            'payments', 'sales', 'orderItems', 'customerPrices'
        ];

        for (const storeName of storeNames) {
            try {
                if (window.db.objectStoreNames.contains(storeName)) {
                    const tx = window.db.transaction(storeName, 'readonly');
                    const store = tx.objectStore(storeName);
                    const data = await store.getAll();
                    
                    // Serialize dates
                    allData[storeName] = data.map(item => {
                        const newItem = {...item};
                        for (const key in newItem) {
                            if (newItem[key] instanceof Date) {
                                newItem[key] = newItem[key].toISOString();
                            }
                        }
                        return newItem;
                    });
                } else {
                    allData[storeName] = [];
                }
            } catch (error) {
                console.warn(`Không thể backup ${storeName}:`, error);
                allData[storeName] = [];
            }
        }

        return allData;
    }

    // Lưu backup
    async saveBackup(backup) {
        const backupKey = `backup_${backup.type}_${backup.id}`;
        
        try {
            // Lưu vào localStorage
            localStorage.setItem(backupKey, JSON.stringify(backup));
            
            // Lưu metadata
            const metadata = {
                id: backup.id,
                type: backup.type,
                timestamp: backup.timestamp,
                stats: backup.stats,
                size: this.calculateBackupSize(backup)
            };
            
            const metadataList = this.getBackupMetadata();
            metadataList.push(metadata);
            localStorage.setItem('backupMetadata', JSON.stringify(metadataList));
            
        } catch (error) {
            // Nếu localStorage đầy, thử xóa backup cũ
            if (error.name === 'QuotaExceededError') {
                this.emergencyCleanup();
                // Thử lại
                localStorage.setItem(backupKey, JSON.stringify(backup));
            } else {
                throw error;
            }
        }
    }

    // Backup thủ công
    async performManualBackup() {
        const btn = document.getElementById('manualBackupBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '⏳ Đang backup...';
        }

        const success = await this.performBackup('manual');
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '💾 Backup ngay';
        }

        if (success) {
            this.updateUI();
        }
    }

    // Hiển thị danh sách backup
    showBackupList() {
        const backups = this.getBackupMetadata().sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        let content = `
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead class="table-dark">
                        <tr>
                            <th>Thời gian</th>
                            <th>Loại</th>
                            <th>Kích thước</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        backups.forEach(backup => {
            content += `
                <tr>
                    <td><small>${this.formatDate(new Date(backup.timestamp))}</small></td>
                    <td><span class="badge bg-${this.getBackupTypeBadge(backup.type)}">${backup.type}</span></td>
                    <td><small>${this.formatBytes(backup.size)}</small></td>
                    <td>
                        <button class="btn btn-outline-success btn-sm" onclick="autoBackup.restoreBackup('${backup.id}')">
                            🔄
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="autoBackup.deleteBackup('${backup.id}')">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        });

        content += '</tbody></table></div>';

        if (backups.length === 0) {
            content = '<div class="text-center text-muted py-3">Chưa có backup nào</div>';
        }

        this.showModal('Danh sách Backup', content);
    }

    // Khôi phục backup
    async restoreBackup(backupId) {
        if (!confirm('Khôi phục backup sẽ ghi đè tất cả dữ liệu hiện tại. Bạn có chắc chắn?')) {
            return;
        }

        try {
            const metadata = this.getBackupMetadata();
            const backupMeta = metadata.find(b => b.id === backupId);
            if (!backupMeta) {
                throw new Error('Không tìm thấy backup');
            }

            const backupKey = `backup_${backupMeta.type}_${backupId}`;
            const backupData = localStorage.getItem(backupKey);
            if (!backupData) {
                throw new Error('Dữ liệu backup bị lỗi');
            }

            const backup = JSON.parse(backupData);
            await this.restoreData(backup.data);

            this.showNotification('Khôi phục thành công!', 'success');
            
            // Reload page để cập nhật UI
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Lỗi khôi phục backup:', error);
            this.showNotification('Lỗi khôi phục!', 'danger', error.message);
        }
    }

    // Xóa backup
    async deleteBackup(backupId) {
        if (!confirm('Bạn có chắc chắn muốn xóa backup này?')) {
            return;
        }

        try {
            const metadata = this.getBackupMetadata();
            const backupMeta = metadata.find(b => b.id === backupId);
            if (!backupMeta) {
                throw new Error('Không tìm thấy backup');
            }

            // Xóa file backup
            this.deleteBackupFile(backupId, backupMeta.type);

            // Cập nhật metadata
            const newMetadata = metadata.filter(b => b.id !== backupId);
            localStorage.setItem('backupMetadata', JSON.stringify(newMetadata));

            this.showNotification('Đã xóa backup', 'info');
            
            // Refresh danh sách
            this.showBackupList();

        } catch (error) {
            console.error('Lỗi xóa backup:', error);
            this.showNotification('Lỗi xóa backup!', 'danger', error.message);
        }
    }

    // Hiển thị dialog khôi phục
    showRestoreDialog() {
        const backups = this.getBackupMetadata().sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        if (backups.length === 0) {
            this.showNotification('Không có backup để khôi phục', 'warning');
            return;
        }

        let content = `
            <div class="mb-3">
                <p class="text-warning">⚠️ <strong>Cảnh báo:</strong> Khôi phục sẽ ghi đè toàn bộ dữ liệu hiện tại!</p>
            </div>
            <div class="list-group">
        `;

        backups.slice(0, 10).forEach(backup => {
            content += `
                <button class="list-group-item list-group-item-action" onclick="autoBackup.restoreBackup('${backup.id}')">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">
                            <span class="badge bg-${this.getBackupTypeBadge(backup.type)}">${backup.type}</span>
                            ${this.formatDate(new Date(backup.timestamp))}
                        </h6>
                        <small>${this.formatBytes(backup.size)}</small>
                    </div>
                    <p class="mb-1">
                        ${Object.entries(backup.stats || {}).map(([store, count]) => 
                            `${store}: ${count}`
                        ).join(', ')}
                    </p>
                </button>
            `;
        });

        content += '</div>';

        this.showModal('Chọn Backup để khôi phục', content);
    }

    // Khôi phục dữ liệu
    async restoreData(data) {
        if (!window.db) {
            throw new Error('Database chưa sẵn sàng');
        }

        const storeNames = Object.keys(data);
        
        for (const storeName of storeNames) {
            if (!window.db.objectStoreNames.contains(storeName)) {
                console.warn(`Object store ${storeName} không tồn tại, bỏ qua`);
                continue;
            }

            try {
                // Xóa dữ liệu hiện tại
                const clearTx = window.db.transaction(storeName, 'readwrite');
                const clearStore = clearTx.objectStore(storeName);
                await clearStore.clear();
                await clearTx.done;

                // Thêm dữ liệu mới
                const tx = window.db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);

                for (const item of data[storeName]) {
                    // Chuyển đổi các trường ngày từ chuỗi thành đối tượng Date
                    for (const key in item) {
                        if (typeof item[key] === 'string' && 
                            item[key].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                            item[key] = new Date(item[key]);
                        }
                    }
                    await store.add(item);
                }

                await tx.done;
                console.log(`Đã khôi phục ${data[storeName].length} bản ghi vào ${storeName}`);
                
            } catch (error) {
                console.error(`Lỗi khôi phục ${storeName}:`, error);
            }
        }
    }

    // Hiển thị danh sách backup
    showBackupList() {
        const backups = this.getBackupMetadata().sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        let content = `
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead class="table-dark">
                        <tr>
                            <th>Thời gian</th>
                            <th>Loại</th>
                            <th>Kích thước</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        backups.forEach(backup => {
            content += `
                <tr>
                    <td><small>${this.formatDate(new Date(backup.timestamp))}</small></td>
                    <td><span class="badge bg-${this.getBackupTypeBadge(backup.type)}">${backup.type}</span></td>
                    <td><small>${this.formatBytes(backup.size)}</small></td>
                    <td>
                        <button class="btn btn-outline-success btn-sm" onclick="autoBackup.restoreBackup('${backup.id}')">
                            <i class="bi bi-arrow-clockwise"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="autoBackup.deleteBackup('${backup.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        content += '</tbody></table></div>';

        if (backups.length === 0) {
            content = '<div class="text-center text-muted py-3">Chưa có backup nào</div>';
        }

        this.showModal('Danh sách Backup', content);
    }

    // Utility functions
    generateBackupId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    calculateBackupSize(backup) {
        return new Blob([JSON.stringify(backup)]).size;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    // Storage methods
    getBackupEnabled() {
        return localStorage.getItem('autoBackupEnabled') === 'true';
    }

    getBackupStats() {
        const stats = localStorage.getItem('backupStats');
        return stats ? JSON.parse(stats) : { total: 0, lastBackup: null };
    }

    getBackupMetadata() {
        const metadata = localStorage.getItem('backupMetadata');
        return metadata ? JSON.parse(metadata) : [];
    }

    updateBackupStats(backup) {
        this.stats.total++;
        this.stats.lastBackup = backup.timestamp;
        localStorage.setItem('backupStats', JSON.stringify(this.stats));
    }

    // Thông báo
    showNotification(title, type = 'info', message = '') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
        notification.style.zIndex = '9999';
        notification.innerHTML = `
            <strong><i class="bi bi-shield-check"></i> ${title}</strong>
            ${message ? `<br><small>${message}</small>` : ''}
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    showModal(title, content) {
        // Tạo modal động
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    updateUI() {
        // Cập nhật toggle switch
        const enableToggle = document.getElementById('autoBackupEnabled');
        if (enableToggle) {
            enableToggle.checked = this.isEnabled;
        }

        // Cập nhật UI stats
        const totalElement = document.getElementById('totalBackups');
        const lastElement = document.getElementById('lastBackup');
        
        if (totalElement) totalElement.textContent = this.stats.total;
        if (lastElement) {
            lastElement.textContent = this.stats.lastBackup ? 
                this.formatDate(new Date(this.stats.lastBackup)) : 'Chưa có';
        }
        
        this.updateBackupStatus();
    }

    // Setup database statistics
    setupDatabaseStats() {
        this.updateDatabaseStats();

        // Setup refresh button
        const refreshBtn = document.getElementById('refreshDbStats');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.updateDatabaseStats();
            });
        }

        // Setup clear cache button
        const clearCacheBtn = document.getElementById('clearCacheBtn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                this.clearCache();
            });
        }
    }

    // Update database statistics
    async updateDatabaseStats() {
        if (!window.db) {
            console.warn('Database chưa sẵn sàng');
            return;
        }

        try {
            const storeNames = ['customers', 'orders', 'trips', 'products'];
            
            for (const storeName of storeNames) {
                if (window.db.objectStoreNames.contains(storeName)) {
                    const tx = window.db.transaction(storeName, 'readonly');
                    const store = tx.objectStore(storeName);
                    const count = await store.count();
                    
                    const element = document.getElementById(`dbStats-${storeName}`);
                    if (element) {
                        element.textContent = count;
                    }
                }
            }

            // Calculate storage usage
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                const usedMB = (estimate.usage / 1024 / 1024).toFixed(1);
                const quotaMB = (estimate.quota / 1024 / 1024).toFixed(1);
                
                const storageElement = document.getElementById('storageUsage');
                if (storageElement) {
                    storageElement.textContent = `${usedMB}MB / ${quotaMB}MB`;
                }
            }

        } catch (error) {
            console.error('Lỗi cập nhật thống kê database:', error);
        }
    }

    // Clear browser cache
    clearCache() {
        if (confirm('Xóa cache sẽ làm mới toàn bộ ứng dụng. Bạn có chắc chắn?')) {
            // Clear localStorage backup data (except backup metadata)
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key !== 'autoBackupEnabled' && key !== 'backupStats' && key !== 'backupMetadata') {
                    localStorage.removeItem(key);
                }
            });

            this.showNotification('Đã xóa cache', 'success');
            
            // Reload page after 2 seconds
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    }

    updateBackupStatus() {
        const statusElement = document.getElementById('backupStatus');
        if (statusElement) {
            statusElement.innerHTML = this.isEnabled ? 
                `⏰ Backup tiếp theo: ${this.getNextBackupTime()}` : 
                '⏸️ Auto backup đã tắt';
        }
    }

    getNextBackupTime() {
        if (!this.isEnabled) return 'N/A';
        
        const now = new Date();
        const nextQuick = new Date(now.getTime() + this.config.intervals.quick * 60 * 1000);
        return this.formatDate(nextQuick);
    }

    // Cleanup methods
    cleanupOldBackups() {
        const metadata = this.getBackupMetadata();
        const groupedBackups = {};
        
        // Nhóm backup theo type
        metadata.forEach(backup => {
            if (!groupedBackups[backup.type]) {
                groupedBackups[backup.type] = [];
            }
            groupedBackups[backup.type].push(backup);
        });
        
        // Cleanup theo retention policy
        Object.keys(groupedBackups).forEach(type => {
            const backups = groupedBackups[type].sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
            
            const retention = this.config.retentionPolicy[type] || 10;
            const toDelete = backups.slice(retention);
            
            toDelete.forEach(backup => {
                this.deleteBackupFile(backup.id, backup.type);
            });
        });
        
        // Cập nhật metadata
        const remainingMetadata = metadata.filter(backup => {
            const typeBackups = groupedBackups[backup.type] || [];
            const sortedBackups = typeBackups.sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
            const retention = this.config.retentionPolicy[backup.type] || 10;
            return sortedBackups.indexOf(backup) < retention;
        });
        
        localStorage.setItem('backupMetadata', JSON.stringify(remainingMetadata));
    }

    deleteBackupFile(backupId, type) {
        const backupKey = `backup_${type}_${backupId}`;
        localStorage.removeItem(backupKey);
    }

    // Emergency cleanup khi storage đầy
    emergencyCleanup() {
        console.warn('🚨 Emergency cleanup - storage đầy!');
        
        const metadata = this.getBackupMetadata();
        const sorted = metadata.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Xóa 50% backup cũ nhất
        const toDelete = sorted.slice(0, Math.floor(sorted.length / 2));
        toDelete.forEach(backup => {
            this.deleteBackupFile(backup.id, backup.type);
        });
        
        // Cập nhật metadata
        const remaining = sorted.slice(Math.floor(sorted.length / 2));
        localStorage.setItem('backupMetadata', JSON.stringify(remaining));
        
        this.showNotification('Emergency Cleanup', 'warning', 'Đã xóa backup cũ do hết dung lượng');
    }

    checkBackupOnStartup() {
        const lastBackup = this.stats.lastBackup;
        if (!lastBackup) {
            // Chưa có backup nào, tạo backup đầu tiên
            setTimeout(() => {
                this.performBackup('startup');
            }, 5000); // Đợi 5s để app load xong
            return;
        }
        
        const timeSinceLastBackup = Date.now() - new Date(lastBackup).getTime();
        const hoursAgo = timeSinceLastBackup / (1000 * 60 * 60);
        
        // Nếu > 2 giờ không backup, tạo backup ngay
        if (hoursAgo > 2) {
            setTimeout(() => {
                this.performBackup('recovery');
            }, 5000);
        }
    }

    calculateDataStats(data) {
        const stats = {};
        Object.keys(data).forEach(store => {
            stats[store] = data[store].length;
        });
        return stats;
    }

    getBackupTypeBadge(type) {
        const badges = {
            quick: 'primary',
            hourly: 'success', 
            daily: 'warning',
            weekly: 'info',
            manual: 'secondary',
            startup: 'light',
            recovery: 'danger'
        };
        return badges[type] || 'secondary';
    }

    loadConfig() {
        const saved = localStorage.getItem('autoBackupConfig');
        if (saved) {
            this.config = { ...this.config, ...JSON.parse(saved) };
        }
    }
}

// Khởi tạo hệ thống backup khi DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Đợi database được khởi tạo
    setTimeout(() => {
        if (typeof window !== 'undefined') {
            window.autoBackup = new AutoBackupSystem();
            
            // Update database stats khi vào tab admin
            const adminTab = document.getElementById('admin-tab');
            if (adminTab) {
                adminTab.addEventListener('click', () => {
                    setTimeout(() => {
                        if (window.autoBackup) {
                            window.autoBackup.updateDatabaseStats();
                        }
                    }, 100);
                });
            }
        }
    }, 2000);
});

// Export cho các file khác
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutoBackupSystem;
}

// Khởi tạo hệ thống backup khi DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Đợi database được khởi tạo
    setTimeout(() => {
        if (typeof window !== 'undefined') {
            window.autoBackup = new AutoBackupSystem();
        }
    }, 2000);
});

// Export cho các file khác
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutoBackupSystem;
} 