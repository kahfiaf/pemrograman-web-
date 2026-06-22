import sys
import re

try:
    with open('static/app_v3.js', 'r', encoding='utf-8') as f:
        content = f.read()

    notification_logic = """
    // =============================================
    // IN-APP NOTIFICATION CENTER
    // =============================================

    window.initNotificationUI = function() {
        const badges = document.querySelectorAll('.user-profile-badge');
        badges.forEach((badge, index) => {
            if (badge.parentNode.querySelector('.nav-notification-wrapper')) return; // Already initialized
            
            const wrapper = document.createElement('div');
            wrapper.className = 'nav-notification-wrapper';
            wrapper.style.cssText = 'position: relative; margin-right: 16px; display: flex; align-items: center; cursor: pointer; color: white;';
            
            // Mail Icon SVG
            wrapper.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px; opacity: 0.9; transition: opacity 0.2s;">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <div class="notif-badge-indicator" style="position: absolute; top: -4px; right: -6px; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 0 2px #1e293b; display: none;"></div>
                
                <div class="notif-dropdown-panel" style="display: none; position: absolute; top: 35px; right: 0; width: 320px; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 10000; flex-direction: column; overflow: hidden; cursor: default;">
                    <div style="padding: 16px; font-weight: 600; font-size: 0.95rem; border-bottom: 1px solid rgba(255,255,255,0.05); color: white; display: flex; justify-content: space-between; align-items: center;">
                        <span>Notifications</span>
                        <button class="mark-all-read-btn" style="background: none; border: none; color: #3b82f6; font-size: 0.75rem; cursor: pointer;">Mark all read</button>
                    </div>
                    <div class="notif-list-container" style="max-height: 350px; overflow-y: auto; display: flex; flex-direction: column;">
                        <!-- notifications list -->
                    </div>
                </div>
            `;
            
            badge.parentNode.insertBefore(wrapper, badge);
            
            // Hover effect
            const svg = wrapper.querySelector('svg');
            wrapper.addEventListener('mouseenter', () => svg.style.opacity = '1');
            wrapper.addEventListener('mouseleave', () => svg.style.opacity = '0.9');
            
            // Toggle dropdown
            const dropdown = wrapper.querySelector('.notif-dropdown-panel');
            wrapper.addEventListener('click', (e) => {
                // Prevent closing immediately
                e.stopPropagation();
                
                const isShowing = dropdown.style.display === 'flex';
                // Close all other dropdowns
                document.querySelectorAll('.notif-dropdown-panel').forEach(p => p.style.display = 'none');
                
                if (!isShowing) {
                    dropdown.style.display = 'flex';
                    window.markNotificationsAsRead();
                }
            });
            
            dropdown.addEventListener('click', (e) => e.stopPropagation());
            
            const markAllBtn = wrapper.querySelector('.mark-all-read-btn');
            markAllBtn.addEventListener('click', () => {
                if (currentUser && currentUser.notifications) {
                    currentUser.notifications.forEach(n => n.read = true);
                    saveCurrentUserToStorage();
                    window.renderNotifications();
                }
            });
        });
        
        // Click outside to close
        document.addEventListener('click', () => {
            document.querySelectorAll('.notif-dropdown-panel').forEach(p => p.style.display = 'none');
        });
    };

    window.addNotification = function(title, message, type='info') {
        if (!currentUser) return;
        if (!currentUser.notifications) currentUser.notifications = [];
        
        const notif = {
            id: Date.now().toString() + Math.floor(Math.random()*1000),
            title: title,
            message: message,
            type: type, // 'info', 'success', 'warning', 'error'
            timestamp: Date.now(),
            read: false
        };
        
        currentUser.notifications.unshift(notif);
        
        // Keep max 50
        if (currentUser.notifications.length > 50) {
            currentUser.notifications.pop();
        }
        
        saveCurrentUserToStorage();
        window.renderNotifications();
    };

    window.markNotificationsAsRead = function() {
        if (!currentUser || !currentUser.notifications) return;
        let changed = false;
        currentUser.notifications.forEach(n => {
            if (!n.read) {
                n.read = true;
                changed = true;
            }
        });
        if (changed) {
            saveCurrentUserToStorage();
            window.renderNotifications();
        }
    };

    window.renderNotifications = function() {
        if (!currentUser) return;
        const notifs = currentUser.notifications || [];
        const unreadCount = notifs.filter(n => !n.read).length;
        
        // Update all notification UI instances
        document.querySelectorAll('.nav-notification-wrapper').forEach(wrapper => {
            const badge = wrapper.querySelector('.notif-badge-indicator');
            const list = wrapper.querySelector('.notif-list-container');
            
            if (unreadCount > 0) {
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
            
            if (notifs.length === 0) {
                list.innerHTML = `<div style="padding: 24px 16px; text-align: center; color: #64748b; font-size: 0.85rem;">No notifications yet.</div>`;
                return;
            }
            
            list.innerHTML = notifs.map(n => {
                let iconColor = '#3b82f6';
                let iconBg = 'rgba(59, 130, 246, 0.1)';
                let svg = `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>`;
                
                if (n.type === 'success') {
                    iconColor = '#10b981';
                    iconBg = 'rgba(16, 185, 129, 0.1)';
                    svg = `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>`;
                } else if (n.type === 'error') {
                    iconColor = '#ef4444';
                    iconBg = 'rgba(239, 68, 68, 0.1)';
                    svg = `<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>`;
                } else if (n.type === 'warning') {
                    iconColor = '#f59e0b';
                    iconBg = 'rgba(245, 158, 11, 0.1)';
                    svg = `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`;
                }

                // Relative time string
                const diffMs = Date.now() - n.timestamp;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHrs = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHrs / 24);
                let timeStr = 'Just now';
                if (diffMins > 0 && diffMins < 60) timeStr = diffMins + 'm ago';
                else if (diffHrs > 0 && diffHrs < 24) timeStr = diffHrs + 'h ago';
                else if (diffDays > 0) timeStr = diffDays + 'd ago';

                return `
                    <div style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; gap: 12px; align-items: flex-start; background: ${n.read ? 'transparent' : 'rgba(59,130,246,0.05)'};">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: ${iconBg}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">${svg}</svg>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px; overflow: hidden;">
                            <div style="color: #f8fafc; font-size: 0.85rem; font-weight: ${n.read ? '500' : '600'};">${n.title}</div>
                            <div style="color: #94a3b8; font-size: 0.75rem; line-height: 1.4;">${n.message}</div>
                            <div style="color: #475569; font-size: 0.65rem; margin-top: 2px;">${timeStr}</div>
                        </div>
                    </div>
                `;
            }).join('');
        });
    };
"""

    init_hook = """
    // Notification UI Init
    if (typeof window.initNotificationUI === 'function') {
        window.initNotificationUI();
        window.renderNotifications();
    }
"""

    if 'window.initNotificationUI = function' not in content:
        content = content.replace("document.addEventListener('DOMContentLoaded', () => {", notification_logic + "\n\ndocument.addEventListener('DOMContentLoaded', () => {" + init_hook)
        
        with open('static/app_v3.js', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Successfully injected notification logic.")
    else:
        print("Notification logic already exists.")

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
