// Seed mock data for the platform members as shown in the screenshot.
const SEEDED_MEMBERS = [
    { name: "Suharso", email: "suharso@gmail.com", date: "20 Mei 2026", year: 2026, timestamp: new Date("2026-05-20T10:00:00").getTime() },
    { name: "agnar", email: "agnar@gmail.com", date: "21 Mei 2026", year: 2026, timestamp: new Date("2026-05-21T09:00:00").getTime() },
    { name: "fadhil", email: "fadhil@gmail.com", date: "21 Mei 2026", year: 2026, timestamp: new Date("2026-05-21T10:00:00").getTime() }
];

// --- CSRF Fetch Interceptor ---
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const originalFetch = window.fetch;
window.fetch = async function() {
    let [resource, config] = arguments;
    if (!config) config = {};
    if (config.method && !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(config.method.toUpperCase())) {
        if (!config.headers) config.headers = {};
        if (config.headers instanceof Headers) {
            config.headers.append('X-CSRFToken', getCookie('csrftoken'));
        } else {
            config.headers['X-CSRFToken'] = getCookie('csrftoken');
        }
    }
    return originalFetch(resource, config);
};
// ------------------------------

window.handleLogoClick = function() {
    const homeView = document.getElementById('home-view');
    if (homeView && homeView.classList.contains('active')) {
        location.reload();
    } else {
        if (typeof navigateTo === 'function') {
            navigateTo('home-view');
        } else {
            location.reload();
        }
    }
};
// Indonesian Location data dictionary
const INDONESIAN_LOCATIONS = {
    "DKI Jakarta": ["Jakarta Pusat", "Jakarta Selatan", "Jakarta Utara", "Jakarta Barat", "Jakarta Timur"],
    "Jawa Barat": ["Bandung", "Bogor", "Depok", "Bekasi", "Tasikmalaya", "Cirebon", "Sukabumi"],
    "Jawa Tengah": ["Semarang", "Surakarta", "Magelang", "Pekalongan", "Tegal", "Salatiga"],
    "Jawa Timur": ["Surabaya", "Malang", "Batu", "Kediri", "Madiun", "Blitar", "Probolinggo", "Pasuruan"],
    "D.I. Yogyakarta": ["Yogyakarta", "Sleman", "Bantul", "Gunungkidul", "Kulon Progo"],
    "Bali": ["Denpasar", "Badung", "Gianyar", "Tabanan", "Buleleng", "Klungkung", "Karangasem"],
    "Banten": ["Tangerang", "Serang", "Cilegon", "Tangerang Selatan", "Pandeglang", "Lebak"],
    "Sumatera Utara": ["Medan", "Binjai", "Pematangsiantar", "Sibolga", "Tanjungbalai", "Tebing Tinggi"],
    "Sulawesi Selatan": ["Makassar", "Parepare", "Palopo", "Gowa", "Maros", "Bone"]
};

// Initialize application state
let users = [];
let currentUser = null;

window.getDatasetQualityInfo = function(entry) {
        if (!entry) return { finalScore: 0, criteria: [], rawScore: 0 };
        const score = entry.qualityScore || 0;
        
        function seededRand(seed, min, max) {
            let x = Math.sin(seed * 9301 + 49297) * 233280;
            return min + (x - Math.floor(x)) * (max - min);
        }
        
        const seed = entry.id || 1;
        
        let storageUser = null;
        try {
            const stored = localStorage.getItem('insight_session_v2');
            if (stored && stored !== 'undefined') {
                storageUser = JSON.parse(stored);
            }
        } catch (e) {
            console.warn("Could not parse insight_session_v2 in getDatasetQualityInfo", e);
        }
        const resolvedAlerts = (storageUser && storageUser.resolvedAlerts) || (currentUser && currentUser.resolvedAlerts) || [];
        const resolved = resolvedAlerts.includes('dq-' + seed);
        
        const completeness  = Math.min(100, Math.round(score + seededRand(seed * 2, -2, 2)));
        const accuracy      = Math.min(100, Math.round(score + seededRand(seed * 5, -1, 2)));
        const validity      = Math.min(100, Math.round(score + seededRand(seed * 8, -4, 4)));
        const consistency   = Math.min(100, Math.round(score + seededRand(seed * 3, -3, 3)));
        const timeliness    = Math.min(100, Math.round(score + seededRand(seed * 6, -5, 5)));
        
        let trueAverage = Math.round((completeness + accuracy + validity + consistency + timeliness) / 5);
        if (resolved) {
            trueAverage = Math.max(98, trueAverage);
        }
        
        const criteria = [
            { label: 'Completeness', val: completeness, weight: 0.2 },
            { label: 'Accuracy',     val: accuracy,     weight: 0.2 },
            { label: 'Validity',     val: validity,     weight: 0.2 },
            { label: 'Consistency',  val: consistency,  weight: 0.2 },
            { label: 'Timeliness',   val: timeliness,   weight: 0.2 }
        ];
        
        return { finalScore: trueAverage, criteria, rawScore: score };
    }


// Initialize app data from local storage
function initData() {
    // Load registered users list from local storage or create new with seeded data
    const savedUsers = localStorage.getItem('insight_users_v2');
    if (savedUsers) {
        users = JSON.parse(savedUsers);
    } else {
        users = SEEDED_MEMBERS.map((m) => ({
            username: m.name,
            email: m.email,
            regDate: m.date,
            regYear: m.year,
            timestamp: m.timestamp
        }));
        localStorage.setItem('insight_users_v2', JSON.stringify(users));
    }

    // Load active session
    refreshCurrentUserFromStorage();
}

// Always read the latest currentUser from localStorage — call this before every render
function refreshCurrentUserFromStorage() {
    try {
        const savedSession = localStorage.getItem('insight_session_v2');
        if (savedSession && savedSession !== 'undefined') {
            currentUser = JSON.parse(savedSession);
            // CRITICAL: Always load dataEntries from the per-user scoped key.
            if (currentUser && currentUser.email) {
                currentUser.dataEntries = getScopedEntries(currentUser.email);
            }
        }
    } catch(e) { console.warn("Could not parse insight_session_v2", e); }

    try {
        const savedUsers = localStorage.getItem('insight_users_v2');
        if (savedUsers && savedUsers !== 'undefined') {
            users = JSON.parse(savedUsers);
        }
    } catch(e) { console.warn("Could not parse insight_users_v2", e); }
}

// ─────────────────────────────────────────────────────────────────
// SCOPED ENTRIES: store each user's data under a unique key so
// no two accounts can ever share or contaminate each other's data.
// Key format: insight_entries_<base64(email)>
// File data (fileDataUrl) is stored in IndexedDB to avoid localStorage quota
// ─────────────────────────────────────────────────────────────────
function getScopedEntriesKey(email) {
    if (!email) return null;
    return 'insight_entries_' + btoa(email.toLowerCase().trim());
}

// ── IndexedDB helpers for large file data ──
const IDB_NAME = 'insight_files_db';
const IDB_STORE = 'file_data';
function openFileDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE);
            }
        };
        req.onsuccess = e => resolve(e.target.result);
        req.onerror   = e => reject(e.target.error);
    });
}
function saveFileDataUrl(entryKey, dataUrl) {
    openFileDb().then(db => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(dataUrl, entryKey);
    }).catch(e => console.warn('IDB save error:', e));
}
function getFileDataUrl(entryKey) {
    return openFileDb().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const req = tx.objectStore(IDB_STORE).get(entryKey);
            req.onsuccess = e => resolve(e.target.result || null);
            req.onerror   = e => resolve(null);
        });
    }).catch(() => null);
}
function deleteFileDataUrl(entryKey) {
    openFileDb().then(db => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(entryKey);
    }).catch(e => console.warn('IDB delete error:', e));
}

function getScopedEntries(email) {
    const key = getScopedEntriesKey(email);
    if (!key) return [];
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) { return []; }
}

function saveScopedEntries(email, entries) {
    const key = getScopedEntriesKey(email);
    if (!key) return;

    // Save fileDataUrl to IndexedDB per-entry, strip from localStorage copy
    const strippedEntries = entries.map(entry => {
        const copy = Object.assign({}, entry);
        if (copy.fileDataUrl) {
            const idbKey = key + '_' + (copy.id || copy.fileName || Math.random());
            copy._idbKey = idbKey; // remember the key so we can load it back
            saveFileDataUrl(idbKey, copy.fileDataUrl);
            delete copy.fileDataUrl;
        }
        return copy;
    });

    try {
        localStorage.setItem(key, JSON.stringify(strippedEntries));
        // Update in-memory: keep fileDataUrl in memory but save stripped to localStorage
    } catch (e) {
        console.error('localStorage save failed even after stripping fileDataUrl', e);
    }
}

// Restore fileDataUrl from IndexedDB into in-memory entries
async function restoreFileDataUrls(entries) {
    for (const entry of entries) {
        if (entry._idbKey && !entry.fileDataUrl) {
            const dataUrl = await getFileDataUrl(entry._idbKey);
            if (dataUrl) entry.fileDataUrl = dataUrl;
        }
    }
    return entries;
}
// Format Date helper to Indonesian format (e.g. 21 Mei 2026)
function formatDate(date) {
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const dd = date.getDate();
    const mm = months[date.getMonth()];
    const yyyy = date.getFullYear();
    return `${dd} ${mm} ${yyyy}`;
}

// Helper to format Month and Year for "Member Since"
function getMemberSinceString(user) {
    if (user.timestamp) {
        const date = new Date(user.timestamp);
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }
    if (user.regDate) {
        const parts = user.regDate.split(' ');
        if (parts.length >= 3) {
            return `${parts[1]} ${parts[2]}`;
        }
        return user.regDate;
    }
    return "Mei 2026";
}

// Dynamic Profile Page Render helper
function updateProfileView() {
    if (!currentUser) return;
    
    // 1. Profile Banner Name & ID
    const nameDisplay = document.getElementById('profile-display-name');
    const idDisplay = document.getElementById('profile-display-id');
    const avatarImg = document.getElementById('profile-avatar-img');
    
    nameDisplay.textContent = currentUser.username;
    
    // Find index of this user in sorted list (1-based index)
    const sortedUsers = [...users].sort((a, b) => a.timestamp - b.timestamp);
    const overallIndex = sortedUsers.findIndex(u => u.email.toLowerCase() === currentUser.email.toLowerCase()) + 1;
    idDisplay.textContent = `User ID: #${overallIndex || 3}`;
    
    // 2. Avatar Photo or Initials
    if (currentUser.profilePic) {
        avatarImg.style.backgroundImage = `url(${currentUser.profilePic})`;
        avatarImg.style.backgroundSize = 'cover';
        avatarImg.style.backgroundPosition = 'center';
        avatarImg.textContent = '';
    } else {
        avatarImg.style.backgroundImage = 'none';
        avatarImg.textContent = getInitials(currentUser.username);
    }
    
    // 3. Personal Info Labels
    document.getElementById('info-val-fullname').textContent = currentUser.username;
    document.getElementById('info-val-email').textContent = currentUser.email;
    document.getElementById('info-val-phone').textContent = currentUser.phone || '-';
    document.getElementById('info-val-location').textContent = currentUser.location || '-';
    document.getElementById('info-val-membersince').textContent = getMemberSinceString(currentUser);
    
    // 4. Reset editing visual state
    const editBtn = document.getElementById('btn-edit-personal-info');
    if (editBtn) {
        editBtn.classList.remove('btn-save-active');
        editBtn.innerHTML = `
            <span class="btn-text-content">
                <svg viewBox="0 0 24 24" class="action-icon"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                Edit
            </span>
        `;
    }
    
    // Hide inputs, show labels
    document.getElementById('info-input-fullname').style.display = 'none';
    document.getElementById('info-input-phone').style.display = 'none';
    document.querySelector('.location-edit-group').style.display = 'none';
    
    document.getElementById('info-val-fullname').style.display = 'block';
    document.getElementById('info-val-phone').style.display = 'block';
    document.getElementById('info-val-location').style.display = 'block';
    
    // 5. Initialize stats boxes
    document.getElementById('profile-stat-datasources').textContent = currentUser.dataSources || 0;
    document.getElementById('profile-stat-activeprojects').textContent = currentUser.activeProjects || 0;
    document.getElementById('profile-stat-qualityscore').textContent = currentUser.qualityScore || '0%';
}

// ============================================================
// HOME FEATURES â€” definition, last-used tracking, render
// ============================================================

const HOME_FEATURES = [
    {
        key:     'datasource-overview',
        title:   'Data Source Overview',
        desc:    'Display and manage all connected data sources',
        target:  'datasource-overview-view',
        available: true
    },
    {
        key:     'add-data',
        title:   'Add Data Source',
        desc:    'Connect and upload new data sources to the platform',
        target:  'add-data-view',
        available: true
    },
    {
        key:     'data-quality',
        title:   'Data Quality Dashboard',
        desc:    'Monitor data quality metrics and trends',
        target:  'data-quality-view',
        available: true
    },
    {
        key:     'pipeline',
        title:   'Pipeline Monitoring',
        desc:    'Track data pipeline status and performance',
        target:  'pipeline-view',
        available: true
    },
    {
        key:     'alerts',
        title:   'Maintenance Note',
        desc:    'Manage alerts for data issues and updates',
        target:  'alerts-view',
        available: true
    },
    {
        key:     'pdf-storage',
        title:   'PDF Document Storage',
        desc:    'Store, organize, and manage your downloaded PDF reports',
        target:  'pdf-storage-view',
        available: true
    },
    {
        key:     'model-transaction',
        title:   'Model Transaction Logs',
        desc:    'View input features and output labels from the model',
        target:  'model-transaction-view',
        available: true
    },
    {
        key:     'environment-stat',
        title:   'Environment Dashboard',
        desc:    'Monitor OS, CPU, RAM, and Disk for implementation context',
        target:  'environment-stat-view',
        available: true
    }
];

function getLastUsedFeature() {
    return localStorage.getItem('insight_last_feature') || null;
}

function setLastUsedFeature(featureKey) {
    localStorage.setItem('insight_last_feature', featureKey);
}

function renderHomeFeatures() {
    const container = document.getElementById('home-feature-list');
    if (!container) return;

    const lastUsed = getLastUsedFeature();

    // Sort: last-used first, then other available, then coming-soon
    const sorted = [...HOME_FEATURES].sort((a, b) => {
        if (a.key === lastUsed) return -1;
        if (b.key === lastUsed) return  1;
        if (a.available && !b.available) return -1;
        if (!a.available && b.available) return  1;
        return 0;
    });

    container.innerHTML = sorted.map(f => {
        let cls = 'feature-list-item';
        if (!f.available) {
            cls += ' feature-coming-soon-home';
        } else if (f.key === lastUsed) {
            cls += ' feature-available feature-last-used';
        } else {
            cls += ' feature-available';
        }

        return `
        <div class="${cls}" data-feature-key="${f.key}" data-target="${f.target || ''}">
            <div class="feature-item-info">
                <h4>${f.title}</h4>
                <p>${f.desc}</p>
            </div>
            <svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
        </div>`;
    }).join('');

    // Attach click handlers for available features
    container.querySelectorAll('.feature-list-item.feature-available').forEach(el => {
        el.addEventListener('click', () => {
            const key    = el.dataset.featureKey;
            const target = el.dataset.target;
            if (!target) return;
            setLastUsedFeature(key);
            // Add data wizard needs reset first
            if (target === 'add-data-view' && typeof resetDataEntryWizard === 'function') {
                resetDataEntryWizard();
            }
            navigateTo(target);
        });
    });
}

// Views Navigation Controller
function navigateTo(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
        view.style.display = 'none';
    });


    // Show selected view
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.style.display = 'block';
        // Trigger reflow for transition
        targetView.offsetHeight;
        targetView.classList.add('active');
    }

    // Scroll back to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Always refresh currentUser from storage before rendering any view
    refreshCurrentUserFromStorage();

    // Handle view-specific UI renders
    if (viewId === 'home-view') {
        updateNavbarSession();
        renderHomeFeatures();
    } else if (viewId === 'about-view') {
        updateNavbarSession();
    } else if (viewId === 'dashboard-view') {
        updateNavbarSession();
        renderDashboardList();
    } else if (viewId === 'profile-view') {
        updateNavbarSession();
        updateProfileView();
    } else if (viewId === 'data-entry-view') {
        updateNavbarSession();
        renderDataEntryDashboard();
    } else if (viewId === 'datasource-overview-view') {
        updateNavbarSession();
        renderDataSourceOverview();
    } else if (viewId === 'pipeline-view') {
        updateNavbarSession();
        renderPipelineMonitoring();
    } else if (viewId === 'pipeline-detail-view') {
        updateNavbarSession();
        renderPipelineDetail();
    } else if (viewId === 'data-quality-view') {
        updateNavbarSession();
        renderDataQuality();
    } else if (viewId === 'data-quality-analyze-view') {
        updateNavbarSession();
        renderDataQualityAnalyze();
    } else if (viewId === 'alerts-view') {
        updateNavbarSession();
        renderAlerts();
    } else if (viewId === 'pdf-storage-view') {
        updateNavbarSession();
        if (typeof window.renderPdfStorageCards === 'function') window.renderPdfStorageCards();
    } else if (viewId === 'model-transaction-view') {
        updateNavbarSession();
        renderModelTransaction();
    } else if (viewId === 'environment-stat-view') {
        updateNavbarSession();
        renderEnvironmentStat();
    }
}

// Update user details in headers (including profile badge image/initials)
function updateNavbarSession() {
    const userNameDisplays = document.querySelectorAll('.username-display');
    const userAvatarLetters = document.querySelectorAll('.avatar-letter');
    
    if (currentUser) {
        userNameDisplays.forEach(el => el.textContent = currentUser.username);
        const letter = currentUser.username.charAt(0).toUpperCase();
        userAvatarLetters.forEach(el => el.textContent = letter);

        const avatars = document.querySelectorAll('.user-profile-badge .avatar');
        avatars.forEach(el => {
            if (currentUser.profilePic) {
                el.style.backgroundImage = `url(${currentUser.profilePic})`;
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
                el.textContent = '';
            } else {
                el.style.backgroundImage = 'none';
                el.innerHTML = `<span class="avatar-letter">${letter}</span>`;
            }
        });
    }
}

function updateAboutSession() {
    updateNavbarSession();
}

function updateDashboardSession() {
    updateNavbarSession();
}


// Auth Actions: Register user
window.registerUser = async function(username, email, password) {
    try {
        const res = await fetch((window.API_BASE || '/api') + '/register/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        if (!res.ok) {
            const err = await res.json();
            alert(err.error || "Registration failed");
            return false;
        }
        
        // Auto-login after register
        return await window.loginUser(email, password);
    } catch (e) {
        alert("Network error: " + e.message);
        return false;
    }
}

window.loginUser = async function(email, password) {
    try {
        const res = await fetch((window.API_BASE || '/api') + '/login/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) {
            alert("Invalid email or password!");
            return false;
        }
        const data = await res.json();
        
        const today = new Date();
        currentUser = {
            username: data.user.username,
            email: data.user.email,
            regDate: formatDate(today),
            regYear: today.getFullYear(),
            timestamp: today.getTime()
        };
        localStorage.setItem('insight_session_v2', JSON.stringify(currentUser));
        return true;
    } catch (e) {
        alert("Network error: " + e.message);
        return false;
    }
}

// Generate initials for avatar circle
function getInitials(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

// Dashboard Search and Rendering logic
async function renderDashboardList(searchQuery = '') {
    const listContainer = document.getElementById('members-list');
    const totalUsersCount = document.getElementById('total-users-count');
    const users2026Count = document.getElementById('users-2026-count');
    const userFooterNotice = document.getElementById('user-footer-notice');
    
    try {
        const res = await fetch((window.API_BASE || '/api') + '/users/');
        if (res.ok) {
            const apiUsers = await res.json();
            const newUsers = apiUsers.map(u => {
                const d = new Date(u.date_joined);
                return {
                    username: u.username,
                    email: u.email,
                    regDate: d.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}),
                    regYear: d.getFullYear(),
                    timestamp: d.getTime()
                };
            });
            // Merge or overwrite users. For simplicity, if API is working, we use API users
            if (newUsers.length > 0) {
                users = newUsers;
            }
        }
    } catch (e) {
        console.warn('Failed to fetch users from API, falling back to local storage', e);
    }
    
    // Sort users chronologically (oldest registration first)
    const sortedUsers = [...users].sort((a, b) => a.timestamp - b.timestamp);

    // Apply search filter if query is present
    const filteredUsers = sortedUsers.filter(u => 
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Calculate dynamic stats from all users (not filtered)
    const total = sortedUsers.length;
    const count2026 = sortedUsers.filter(u => u.regYear === 2026).length;

    if (totalUsersCount) totalUsersCount.textContent = total;
    if (users2026Count) users2026Count.textContent = count2026;

    if (userFooterNotice) {
        userFooterNotice.innerHTML = `
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            You are one of the <strong>${total} users</strong> of this platform!
        `;
    }

    // Clear list container
    listContainer.innerHTML = '';

    if (filteredUsers.length === 0) {
        listContainer.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--light-text-muted); padding: 2rem;">No members found matching "${searchQuery}"</div>`;
        return;
    }

    // Render list
    filteredUsers.forEach(user => {
        // Find index of this user in the sorted list (1-based index)
        const overallIndex = sortedUsers.findIndex(u => u.timestamp === user.timestamp) + 1;
        
        let avatarClass = 'member-avatar-blue';
        if (overallIndex % 3 === 2) {
            avatarClass = 'member-avatar-purple';
        } else if (overallIndex % 3 === 0) {
            avatarClass = 'member-avatar-pink';
        }
        
        const itemHTML = `
            <div class="member-item animate-fade-in">
                <div class="member-left-side">
                    <div class="member-avatar ${avatarClass}">${overallIndex}</div>
                    <div class="member-details">
                        <h4>${user.username}</h4>
                        <p class="member-email">${user.email || (user.username.toLowerCase() + '@gmail.com')}</p>
                        <p class="reg-date">Mendaftar: ${user.regDate}</p>
                    </div>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', itemHTML);
    });
}

// Toggle input password visibility (hide/show eye)
function setupPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const showIcon = this.querySelector('.show-icon');
            const hideIcon = this.querySelector('.hide-icon');

            if (input.type === 'password') {
                input.type = 'text';
                showIcon.style.display = 'none';
                hideIcon.style.display = 'block';
            } else {
                input.type = 'password';
                showIcon.style.display = 'block';
                hideIcon.style.display = 'none';
            }
        });
    });
}

// Global Search Autocomplete
function setupGlobalSearch() {
    const searchInputs = document.querySelectorAll('.global-search-input');
    
    searchInputs.forEach(input => {
        const dropdown = input.nextElementSibling;
        if (!dropdown || !dropdown.classList.contains('search-autocomplete-dropdown')) return;
        
        input.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                dropdown.style.display = 'none';
                return;
            }
            
            const matches = HOME_FEATURES.filter(f => 
                f.title.toLowerCase().includes(query) || 
                f.desc.toLowerCase().includes(query)
            );
            
            if (matches.length === 0) {
                dropdown.innerHTML = `<div class="search-autocomplete-empty">No matching features found</div>`;
            } else {
                dropdown.innerHTML = matches.map(f => {
                    const statusText = f.available ? '' : ' <span style="font-size: 0.65rem; color: var(--light-text-muted);">(Soon)</span>';
                    const styleStr = f.available ? '' : ' opacity: 0.6; cursor: default;';
                    return `
                    <div class="search-autocomplete-item" style="${styleStr}" data-key="${f.key}" data-target="${f.target || ''}" data-available="${f.available}">
                        <div class="search-autocomplete-title">${f.title}${statusText}</div>
                        <div class="search-autocomplete-desc">${f.desc}</div>
                    </div>`;
                }).join('');
                
                // Add click events
                dropdown.querySelectorAll('.search-autocomplete-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const target = item.dataset.target;
                        const key = item.dataset.key;
                        const available = item.dataset.available === 'true';
                        
                        if (!available) return;
                        
                        input.value = '';
                        dropdown.style.display = 'none';
                        
                        if (target) {
                            setLastUsedFeature(key);
                            if (target === 'add-data-view' && typeof resetDataEntryWizard === 'function') {
                                resetDataEntryWizard();
                            }
                            navigateTo(target);
                        }
                    });
                });
            }
            
            dropdown.style.display = 'block';
        });
        
        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target !== input && e.target !== dropdown && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    });
}

// Bind DOM event listeners when page loaded

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
                    if (typeof currentUser !== 'undefined' && currentUser) {
        const sessionSnap = Object.assign({}, currentUser);
        delete sessionSnap.dataEntries;
        localStorage.setItem('insight_session_v2', JSON.stringify(sessionSnap));
    }
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
        
        if (typeof currentUser !== 'undefined' && currentUser) {
        const sessionSnap = Object.assign({}, currentUser);
        delete sessionSnap.dataEntries;
        localStorage.setItem('insight_session_v2', JSON.stringify(sessionSnap));
    }
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
            if (typeof currentUser !== 'undefined' && currentUser) {
        const sessionSnap = Object.assign({}, currentUser);
        delete sessionSnap.dataEntries;
        localStorage.setItem('insight_session_v2', JSON.stringify(sessionSnap));
    }
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


document.addEventListener('DOMContentLoaded', () => {
    // Notification UI Init
    if (typeof window.initNotificationUI === 'function') {
        window.initNotificationUI();
        window.renderNotifications();
    }

    // 1. Init Mock Data & Saved Session
    initData();
    setupPasswordToggles();
    setupGlobalSearch();

    // 2. View Redirection routing based on session
    if (currentUser) {
        navigateTo('home-view');
    } else {
        navigateTo('landing-view');
    }

    // 3. Landing page redirects
    document.querySelectorAll('.btn-to-register').forEach(el => {
        el.addEventListener('click', () => {
            navigateTo('register-view');
        });
    });

    document.querySelectorAll('.btn-to-login').forEach(el => {
        el.addEventListener('click', () => {
            navigateTo('login-view');
        });
    });

    // 4. Form Submissions
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('reg-username').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;

            if (username && email && password) {
                const success = await window.registerUser(username, email, password);
                if (success) {
                    registerForm.reset();
                    // Clear any stale entries and sync fresh user-scoped data from API
                    if (currentUser) currentUser.dataEntries = [];
                    if(window.apiSyncEntries) window.apiSyncEntries();
                    navigateTo('home-view');
                }
            }
        });
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            if (email && password) {
                const success = await window.loginUser(email, password);
                if (success) {
                    loginForm.reset();
                    // Clear any stale entries and sync fresh user-scoped data from API
                    if (currentUser) currentUser.dataEntries = [];
                    if(window.apiSyncEntries) window.apiSyncEntries();
                    navigateTo('home-view');
                }
            }
        });
    }

    // 5. Navigation Links Click Handlers
    document.querySelectorAll('.link-to-home').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('home-view');
        });
    });

    document.querySelectorAll('.link-to-data-strategy').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('data-strategy-view');
        });
    });

    document.querySelectorAll('.link-to-analytic-tool').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('analytic-tool-view');
        });
    });

    document.querySelectorAll('.link-to-best-practice').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('best-practice-view');
            // reset to page 1 on navigate
            document.getElementById('bp-page-1').style.display='block';
            document.getElementById('bp-page-2').style.display='none';
            window.scrollTo(0,0);
        });
    });

    document.querySelectorAll('.link-to-about').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('about-view');
        });
    });

    document.querySelectorAll('.link-to-dashboard').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('dashboard-view');
        });
    });

    // Data Entry Dashboard (from Get Started, feature items on home)
    document.querySelectorAll('.link-to-data-entry').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('data-entry-view');
        });
    });

    // Add Data Wizard (from Add Data Source card inside data-entry-view)
    document.querySelectorAll('.link-to-add-data').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            setLastUsedFeature('add-data');   // track last-used
            resetDataEntryWizard();
            navigateTo('add-data-view');
        });
    });

    // Data Source Overview (from overview card inside data-entry-view)
    document.querySelectorAll('.link-to-datasource-overview').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            setLastUsedFeature('datasource-overview');  // track last-used
            navigateTo('datasource-overview-view');
        });
    });

    // Pipeline Monitoring (from pipeline card inside data-entry-view)
    document.querySelectorAll('.link-to-pipeline').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            setLastUsedFeature('pipeline'); // track last-used
            navigateTo('pipeline-view');
        });
    });

    document.querySelectorAll('.link-to-data-quality').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            setLastUsedFeature('data-quality'); // track last-used
            navigateTo('data-quality-view');
        });
    });

    document.querySelectorAll('.link-to-alerts').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            setLastUsedFeature('alerts'); // track last-used
            navigateTo('alerts-view');
        });
    });

    // PDF storage uses link-to-pdf-storage globally (handled elsewhere)

    document.querySelectorAll('.link-to-model-transaction').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            setLastUsedFeature('model-transaction');
            navigateTo('model-transaction-view');
        });
    });

    document.querySelectorAll('.link-to-environment-stat').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            setLastUsedFeature('environment-stat');
            navigateTo('environment-stat-view');
        });
    });

    // Logout
    document.querySelectorAll('.btn-logout').forEach(el => {
        el.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch((window.API_BASE || '/api') + '/logout/', { method: 'POST' });
            } catch(e) { console.error(e); }
            currentUser = null;
            localStorage.removeItem('insight_session_v2');
            navigateTo('landing-view');
        });
    });

    // 6. Live Dashboard search filter
    const dashboardSearch = document.getElementById('dashboard-member-search');
    if (dashboardSearch) {
        dashboardSearch.addEventListener('input', (e) => {
            renderDashboardList(e.target.value);
        });
    }

    // 7. Profile navigation click handler
    document.querySelectorAll('.link-to-profile').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('profile-view');
        });
    });

    // 8. Personal Info Edit - Sequential Modal Logic
    const editPersonalInfoBtn = document.getElementById('btn-edit-personal-info');
    const seqModal = document.getElementById('sequential-data-modal');
    
    if (editPersonalInfoBtn && seqModal) {
        let currentStep = 1;
        const totalSteps = 3;
        
        const btnNext = document.getElementById('seq-btn-next');
        const btnPrev = document.getElementById('seq-btn-prev');
        const btnCancel = document.getElementById('seq-btn-cancel');
        const progressFill = document.getElementById('seq-progress-fill');
        
        const nameInput = document.getElementById('seq-input-fullname');
        const phoneInput = document.getElementById('seq-input-phone');
        const provSelect = document.getElementById('seq-select-province');
        const citySelect = document.getElementById('seq-select-city');
        
        function updateStepUI() {
            // Hide all steps
            for (let i = 1; i <= totalSteps; i++) {
                const stepContent = document.getElementById(`seq-step-${i}`);
                if (stepContent) {
                    stepContent.classList.remove('active');
                    setTimeout(() => { if (!stepContent.classList.contains('active')) stepContent.style.display = 'none'; }, 300);
                }
                const indicator = document.querySelector(`.seq-step-indicator[data-step="${i}"]`);
                if (indicator) {
                    if (i <= currentStep) {
                        indicator.style.background = '#3b82f6';
                        indicator.style.color = 'white';
                        indicator.style.borderColor = '#3b82f6';
                    } else {
                        indicator.style.background = '#1e293b';
                        indicator.style.color = '#94a3b8';
                        indicator.style.borderColor = '#334155';
                    }
                }
            }
            
            // Show current step
            const currentContent = document.getElementById(`seq-step-${currentStep}`);
            if (currentContent) {
                currentContent.style.display = 'block';
                setTimeout(() => currentContent.classList.add('active'), 50);
            }
            
            // Update progress bar width
            progressFill.style.width = ((currentStep - 1) / (totalSteps - 1) * 100) + '%';
            
            // Update buttons
            btnPrev.style.visibility = currentStep === 1 ? 'hidden' : 'visible';
            btnNext.textContent = currentStep === totalSteps ? 'Save' : 'Next';
        }

        editPersonalInfoBtn.addEventListener('click', () => {
            currentStep = 1;
            nameInput.value = currentUser.username || '';
            phoneInput.value = currentUser.phone && currentUser.phone !== '-' ? currentUser.phone : '';
            
            // Populate provinces
            provSelect.innerHTML = '<option value="">Pilih Provinsi</option>';
            Object.keys(INDONESIAN_LOCATIONS).forEach(prov => {
                provSelect.insertAdjacentHTML('beforeend', `<option value="${prov}">${prov}</option>`);
            });
            
            if (currentUser.location && currentUser.location !== '-') {
                const locParts = currentUser.location.split(', ');
                if (locParts.length === 2) {
                    const cityStr = locParts[0].trim();
                    const provStr = locParts[1].trim();
                    if (INDONESIAN_LOCATIONS[provStr]) {
                        provSelect.value = provStr;
                        citySelect.disabled = false;
                        citySelect.innerHTML = '<option value="">Pilih Kota/Kabupaten</option>';
                        INDONESIAN_LOCATIONS[provStr].forEach(city => {
                            citySelect.insertAdjacentHTML('beforeend', `<option value="${city}">${city}</option>`);
                        });
                        citySelect.value = cityStr;
                    }
                }
            } else {
                citySelect.disabled = true;
                citySelect.innerHTML = '<option value="">Pilih Kota/Kabupaten</option>';
            }
            
            updateStepUI();
            seqModal.style.display = 'flex';
        });

        btnCancel.addEventListener('click', () => {
            seqModal.style.display = 'none';
        });

        btnPrev.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateStepUI();
            }
        });

        btnNext.addEventListener('click', () => {
            // Validation
            if (currentStep === 1) {
                if (!nameInput.value.trim()) {
                    if (typeof window.showCustomAlert === 'function') {
                        window.showCustomAlert("Error", "Nama tidak boleh kosong!", false);
                    } else {
                        alert("Nama tidak boleh kosong!");
                    }
                    return;
                }
            }
            
            if (currentStep < totalSteps) {
                currentStep++;
                updateStepUI();
            } else {
                // Save Logic
                currentUser.username = nameInput.value.trim();
                currentUser.phone = phoneInput.value.trim() || '-';
                
                const selectedProv = provSelect.value;
                const selectedCity = citySelect.value;
                if (selectedProv && selectedCity) {
                    currentUser.location = `${selectedCity}, ${selectedProv}`;
                } else {
                    currentUser.location = '-';
                }
                
                localStorage.setItem('insight_session_v2', JSON.stringify(currentUser));
                const userIdx = users.findIndex(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
                if (userIdx !== -1) {
                    users[userIdx].username = currentUser.username;
                    users[userIdx].phone = currentUser.phone;
                    users[userIdx].location = currentUser.location;
                    localStorage.setItem('insight_users_v2', JSON.stringify(users));
                }
                
                seqModal.style.display = 'none';
                updateNavbarSession();
                updateProfileView();
                
                if (typeof window.showCustomAlert === 'function') {
                    window.showCustomAlert("Success", "Personal Information updated!", true);
                }
            }
        });

        provSelect.addEventListener('change', (e) => {
            const selectedProv = e.target.value;
            if (selectedProv && INDONESIAN_LOCATIONS[selectedProv]) {
                citySelect.disabled = false;
                citySelect.innerHTML = '<option value="">Pilih Kota/Kabupaten</option>';
                INDONESIAN_LOCATIONS[selectedProv].forEach(city => {
                    citySelect.insertAdjacentHTML('beforeend', `<option value="${city}">${city}</option>`);
                });
            } else {
                citySelect.disabled = true;
                citySelect.innerHTML = '<option value="">Pilih Kota/Kabupaten</option>';
            }
        });
    }

    // 10. Profile Pic Upload options trigger
    const btnChangeAvatar = document.getElementById('btn-change-avatar');
    const modalPhotoOptions = document.getElementById('modal-photo-options');
    const btnClosePhotoModal = document.getElementById('btn-close-photo-modal');
    
    if (btnChangeAvatar && modalPhotoOptions) {
        btnChangeAvatar.addEventListener('click', () => {
            modalPhotoOptions.style.display = 'flex';
        });
    }
    if (btnClosePhotoModal && modalPhotoOptions) {
        btnClosePhotoModal.addEventListener('click', () => {
            modalPhotoOptions.style.display = 'none';
        });
    }

    // 11. Upload file handler
    const btnUploadFileOption = document.getElementById('btn-upload-file-option');
    const profileFileInput = document.getElementById('profile-file-input');
    if (btnUploadFileOption && profileFileInput) {
        btnUploadFileOption.addEventListener('click', () => {
            profileFileInput.click();
        });
    }
    
    if (profileFileInput) {
        profileFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 2 * 1024 * 1024) {
                    alert("Ukuran file maksimal adalah 2MB!");
                    return;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64Url = event.target.result;
                    currentUser.profilePic = base64Url;
                    
                    localStorage.setItem('insight_session_v2', JSON.stringify(currentUser));
                    const userIdx = users.findIndex(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
                    if (userIdx !== -1) {
                        users[userIdx].profilePic = base64Url;
                        localStorage.setItem('insight_users_v2', JSON.stringify(users));
                    }
                    
                    updateNavbarSession();
                    updateProfileView();
                    modalPhotoOptions.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 12. Camera stream controls
    const btnTakePhotoOption = document.getElementById('btn-take-photo-option');
    const modalCameraCapture = document.getElementById('modal-camera-capture');
    const btnCancelCamera = document.getElementById('btn-cancel-camera');
    const btnCapturePhoto = document.getElementById('btn-capture-photo');
    const cameraVideo = document.getElementById('camera-video');
    const cameraCanvas = document.getElementById('camera-canvas');
    let cameraStream = null;
    
    if (btnTakePhotoOption && modalCameraCapture) {
        btnTakePhotoOption.addEventListener('click', () => {
            modalPhotoOptions.style.display = 'none';
            modalCameraCapture.style.display = 'flex';
            
            navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
                .then(stream => {
                    cameraStream = stream;
                    cameraVideo.srcObject = stream;
                })
                .catch(err => {
                    console.error("Camera access error:", err);
                    alert("Gagal mengakses kamera: " + err.message);
                    modalCameraCapture.style.display = 'none';
                });
        });
    }
    
    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        modalCameraCapture.style.display = 'none';
    }
    
    if (btnCancelCamera) {
        btnCancelCamera.addEventListener('click', stopCamera);
    }
    
    if (btnCapturePhoto && cameraCanvas && cameraVideo) {
        btnCapturePhoto.addEventListener('click', () => {
            if (cameraStream) {
                const ctx = cameraCanvas.getContext('2d');
                cameraCanvas.width = cameraVideo.videoWidth || 640;
                cameraCanvas.height = cameraVideo.videoHeight || 480;
                
                ctx.translate(cameraCanvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
                
                const dataUrl = cameraCanvas.toDataURL('image/jpeg');
                currentUser.profilePic = dataUrl;
                
                localStorage.setItem('insight_session_v2', JSON.stringify(currentUser));
                const userIdx = users.findIndex(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
                if (userIdx !== -1) {
                    users[userIdx].profilePic = dataUrl;
                    localStorage.setItem('insight_users_v2', JSON.stringify(users));
                }
                
                updateNavbarSession();
                updateProfileView();
                stopCamera();
            }
        });
    }

    // 13. Change password trigger & form submit
    const btnTriggerChangePassword = document.getElementById('btn-trigger-change-password');
    const modalChangePassword = document.getElementById('modal-change-password');
    const btnCancelPwd = document.getElementById('btn-cancel-pwd');
    const formChangePassword = document.getElementById('form-change-password');
    
    if (btnTriggerChangePassword && modalChangePassword) {
        btnTriggerChangePassword.addEventListener('click', () => {
            modalChangePassword.style.display = 'flex';
        });
    }
    if (btnCancelPwd && modalChangePassword) {
        btnCancelPwd.addEventListener('click', () => {
            modalChangePassword.style.display = 'none';
            formChangePassword.reset();
        });
    }
    
    if (formChangePassword) {
        formChangePassword.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPwd = document.getElementById('pwd-current').value;
            const newPwd = document.getElementById('pwd-new').value;
            const confirmPwd = document.getElementById('pwd-confirm').value;
            
            if (newPwd.length < 6) {
                window.showCustomAlert("Error", "Password baru minimal 6 karakter!", false);
                return;
            }
            
            if (newPwd !== confirmPwd) {
                window.showCustomAlert("Error", "Konfirmasi password baru tidak cocok!", false);
                return;
            }
            
            try {
                const btn = formChangePassword.querySelector('button[type="submit"]');
                const origText = btn.textContent;
                btn.textContent = 'Saving...';
                btn.disabled = true;

                const res = await fetch((window.API_BASE || '/api') + '/change-password/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ current_password: currentPwd, new_password: newPwd })
                });

                const data = await res.json();
                if (!res.ok) {
                    window.showCustomAlert("Error", data.error || "Gagal mengganti password", false);
                } else {
                    window.showCustomAlert("Success", "Password berhasil diubah!", true);
                    if(window.addNotification) window.addNotification("Security Alert", "Your account password was recently changed.", "warning");
                    modalChangePassword.style.display = 'none';
                    formChangePassword.reset();
                }

                btn.textContent = origText;
                btn.disabled = false;
            } catch (err) {
                window.showCustomAlert("Error", "Terjadi kesalahan jaringan.", false);
            }
        });
    }

    // 14. Email Preferences trigger & save
    const btnTriggerEmailPrefs = document.getElementById('btn-trigger-email-preferences');
    const modalEmailPrefs = document.getElementById('modal-email-preferences');
    const btnCancelEmailPref = document.getElementById('btn-cancel-email-pref');
    const btnSaveEmailPref = document.getElementById('btn-save-email-pref');
    
    if (btnTriggerEmailPrefs && modalEmailPrefs) {
        btnTriggerEmailPrefs.addEventListener('click', () => {
            modalEmailPrefs.style.display = 'flex';
            const prefs = currentUser.emailPrefs || { weekly: true, security: true, updates: false };
            document.getElementById('pref-email-weekly').checked = prefs.weekly;
            document.getElementById('pref-email-security').checked = prefs.security;
            document.getElementById('pref-email-updates').checked = prefs.updates;
        });
    }
    
    if (btnCancelEmailPref && modalEmailPrefs) {
        btnCancelEmailPref.addEventListener('click', () => {
            modalEmailPrefs.style.display = 'none';
        });
    }
    
    if (btnSaveEmailPref) {
        btnSaveEmailPref.addEventListener('click', () => {
            const weekly = document.getElementById('pref-email-weekly').checked;
            const security = document.getElementById('pref-email-security').checked;
            const updates = document.getElementById('pref-email-updates').checked;
            
            currentUser.emailPrefs = { weekly, security, updates };
            localStorage.setItem('insight_session_v2', JSON.stringify(currentUser));
            const userIdx = users.findIndex(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
            if (userIdx !== -1) {
                users[userIdx].emailPrefs = currentUser.emailPrefs;
                localStorage.setItem('insight_users_v2', JSON.stringify(users));
            }
            
            window.showCustomAlert("Success", "Email Preferences disimpan!", true);
            if(window.addNotification) window.addNotification("Settings Updated", "Your email preferences have been saved successfully.", "success");
            modalEmailPrefs.style.display = 'none';
        });
    }

    // 15. Privacy Settings trigger & save
    const btnTriggerPrivacy = document.getElementById('btn-trigger-privacy-settings');
    const modalPrivacy = document.getElementById('modal-privacy-settings');
    const btnCancelPrivacy = document.getElementById('btn-cancel-privacy');
    const btnSavePrivacy = document.getElementById('btn-save-privacy');
    
    if (btnTriggerPrivacy && modalPrivacy) {
        btnTriggerPrivacy.addEventListener('click', () => {
            modalPrivacy.style.display = 'flex';
            const settings = currentUser.privacySettings || { publicProfile: false, shareData: true, activeStatus: true };
            document.getElementById('pref-privacy-public').checked = settings.publicProfile;
            document.getElementById('pref-privacy-share').checked = settings.shareData;
            document.getElementById('pref-privacy-status').checked = settings.activeStatus;
        });
    }
    
    if (btnCancelPrivacy && modalPrivacy) {
        btnCancelPrivacy.addEventListener('click', () => {
            modalPrivacy.style.display = 'none';
        });
    }
    
    if (btnSavePrivacy) {
        btnSavePrivacy.addEventListener('click', () => {
            const publicProfile = document.getElementById('pref-privacy-public').checked;
            const shareData = document.getElementById('pref-privacy-share').checked;
            const activeStatus = document.getElementById('pref-privacy-status').checked;
            
            currentUser.privacySettings = { publicProfile, shareData, activeStatus };
            localStorage.setItem('insight_session_v2', JSON.stringify(currentUser));
            const userIdx = users.findIndex(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
            if (userIdx !== -1) {
                users[userIdx].privacySettings = currentUser.privacySettings;
                localStorage.setItem('insight_users_v2', JSON.stringify(users));
            }
            
            window.showCustomAlert("Success", "Privacy Settings disimpan!", true);
            if(window.addNotification) window.addNotification("Settings Updated", "Your privacy settings were updated.", "success");
            modalPrivacy.style.display = 'none';
        });
    }

    // =============================================
    // RENDER: DATA ENTRY DASHBOARD
    // =============================================

    window.renderDataEntryDashboard = function renderDataEntryDashboard() {
        // Always read fresh data
        const entries = (currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];

        // --- Stat Cards ---
        const totalSources = entries.length || (currentUser ? (currentUser.dataSources || 0) : 0);
        const activeProjs  = entries.filter(e => e.activity === 'in-progress').length;
        const totalAcc = entries.reduce((s, e) => s + window.getDatasetQualityInfo(e).finalScore, 0);
        const avgScore = entries.length > 0
            ? (totalAcc / entries.length).toFixed(1).replace(/\.0$/, '') + '%'
            : (currentUser ? (currentUser.qualityScore || '0%') : '0%');

        const elDS = document.getElementById('ded-datasources');
        const elAP = document.getElementById('ded-activeprojects');
        const elQS = document.getElementById('ded-qualityscore');
        if (elDS) elDS.textContent = totalSources;
        if (elAP) elAP.textContent = activeProjs;
        if (elQS) elQS.textContent = avgScore;

        // --- Count by activity (from real entries) ---
        const counts = { todo: 0, 'in-progress': 0, 'in-review': 0, done: 0 };
        entries.forEach(e => {
            if (counts[e.activity] !== undefined) counts[e.activity]++;
        });
        const total = entries.length;

        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setEl('ded-count-todo',       counts['todo']);
        setEl('ded-count-inprogress', counts['in-progress']);
        setEl('ded-count-inreview',   counts['in-review']);
        setEl('ded-count-done',       counts['done']);
        setEl('ded-count-total',      total);

        // --- Pie Chart (always uses real data when available) ---
        window.drawDedPieChart(counts, total);
    };

    window.drawDedPieChart = function drawDedPieChart(counts, total) {
        const canvas = document.getElementById('ded-pie-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const cx = canvas.width / 2, cy = canvas.height / 2, r = 70;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const slices = [
            { key: 'todo',        color: '#f59e0b', label: 'To Do' },
            { key: 'in-progress', color: '#3b82f6', label: 'In Progress' },
            { key: 'in-review',   color: '#a855f7', label: 'In Review' },
            { key: 'done',        color: '#10b981', label: 'Done' },
        ];

        const displayCounts = counts;
        const displayTotal  = total;

        // Update legend numbers with real data
        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setEl('ded-count-todo',       displayCounts['todo']);
        setEl('ded-count-inprogress', displayCounts['in-progress']);
        setEl('ded-count-inreview',   displayCounts['in-review']);
        setEl('ded-count-done',       displayCounts['done']);
        setEl('ded-count-total',      displayTotal);

        if (total === 0) {
            // Draw empty gray ring for new users with no data
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fill();

            // Inner circle for donut effect
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.45, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(17, 24, 54, 0.95)';
            ctx.fill();

            // Center text
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('0', cx, cy - 8);
            ctx.font = '9px sans-serif';
            ctx.fillText('Total', cx, cy + 8);
            return;
        }

        let startAngle = -Math.PI / 2;
        slices.forEach(s => {
            const val = displayCounts[s.key];
            const sliceAngle = (val / displayTotal) * 2 * Math.PI;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = s.color;
            ctx.fill();

            // Label on slice
            if (val > 0) {
                const midAngle = startAngle + sliceAngle / 2;
                const lx = cx + (r * 0.62) * Math.cos(midAngle);
                const ly = cy + (r * 0.62) * Math.sin(midAngle);
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const pct = Math.round((val / displayTotal) * 100);
                ctx.fillText(pct + '%', lx, ly);
            }

            startAngle += sliceAngle;
        });

        // Inner circle for donut effect
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.45, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(17, 24, 54, 0.95)';
        ctx.fill();

        // Center text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayTotal, cx, cy - 8);
        ctx.font = '9px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText('Total', cx, cy + 8);
    };

    // =============================================
    // RENDER: PIPELINE MONITORING
    // =============================================
    
    window.renderPipelineMonitoring = function renderPipelineMonitoring() {
        const getEntries = () => (currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
        
        function refreshPipelineStats() {
            const entries = getEntries();
            const total = entries.length;
            const active = entries.filter(e => e.activity === 'in-progress' || e.activity === 'in-review').length;
            
            let totalAccuracy = 0;
            let totalRecordsNum = 0;
            
            entries.forEach(e => {
                totalAccuracy += window.getDatasetQualityInfo(e).finalScore;
                const pName = e.name || e.sourceName || '';
                totalRecordsNum += (pName.length * 1500) + ((e.qualityScore || 0) * 100);
            });
            
            const avgAcc = total > 0 ? (totalAccuracy / total).toFixed(1).replace(/\.0$/, '') + '%' : '0%';
            const formattedRecords = totalRecordsNum > 1000 ? (totalRecordsNum / 1000).toFixed(1) + 'K' : totalRecordsNum;
            
            const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            setEl('pipeline-stat-total', total);
            setEl('pipeline-stat-active', active);
            setEl('pipeline-stat-accuracy', avgAcc);
            setEl('pipeline-stat-records', formattedRecords);
        }
        
        function applyPipelineFilters() {
            const searchEl = document.getElementById('pipeline-search-input');
            window._renderPipelineCards(getEntries(), searchEl ? searchEl.value : '');
        }
        
        refreshPipelineStats();
        window._renderPipelineCards(getEntries(), '');
        
        const searchEl = document.getElementById('pipeline-search-input');
        if (searchEl) {
            searchEl.value = '';
            searchEl.oninput = applyPipelineFilters;
        }
    };
    
    window._renderPipelineCards = function _renderPipelineCards(allEntries, search) {
        const container = document.getElementById('pipeline-cards-container');
        const emptyState = document.getElementById('pipeline-empty-state');
        if (!container) return;
        
        const s = search.toLowerCase().trim();
        
        const filtered = allEntries.filter(e => {
            if (!s) return true;
            const nameMatch = (e.name && e.name.toLowerCase().includes(s)) || (e.sourceName && e.sourceName.toLowerCase().includes(s));
            const actMatch = e.activity && e.activity.toLowerCase().includes(s);
            return nameMatch || actMatch;
        });
        
        if (filtered.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        container.innerHTML = filtered.map(entry => {
            const pipelineName = entry.name || entry.sourceName || 'Unknown Pipeline';
            // Use actual version if available, otherwise deterministic mock
            const version = entry.version || ("1." + (pipelineName.length % 10));
            const records = ((pipelineName.length * 1.5) + ((entry.qualityScore || 0) * 0.1)).toFixed(1) + "K";
            
            let statusLabel = entry.activity;
            let statusClass = "status-todo";
            if (entry.activity === 'in-progress') { statusLabel = "In Progress"; statusClass = "status-in-progress"; }
            else if (entry.activity === 'in-review') { statusLabel = "In Review"; statusClass = "status-in-review"; }
            else if (entry.activity === 'done') { statusLabel = "Done"; statusClass = "status-done"; }
            else if (entry.activity === 'todo') { statusLabel = "To Do"; statusClass = "status-todo"; }
            
            return `
            <div class="pipeline-card">
                <div class="pipeline-card-header">
                    <div class="pipeline-card-title">
                        <h3>${pipelineName}</h3>
                        <span class="pipeline-status ${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="pipeline-card-icon">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 9h-2V7h-2v5H6v2h2v5h2v-5h2v-2zM21 9v6h-2v-6h2z"/></svg>
                    </div>
                </div>
                
                <ul class="pipeline-info-list">
                    <li class="pipeline-info-item">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
                        Date: ${entry.date || entry.dateAdded || 'N/A'}
                    </li>
                    <li class="pipeline-info-item">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        Owner: ${currentUser.username}
                    </li>
                    <li class="pipeline-info-item">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
                        Version: ${version}
                    </li>
                </ul>
                
                <div class="pipeline-metrics">
                    <div class="pipeline-metric-box">
                        <span class="pipeline-metric-label">Accuracy</span>
                        <span class="pipeline-metric-val">${window.getDatasetQualityInfo(entry).finalScore}%</span>
                    </div>
                    <div class="pipeline-metric-box">
                        <span class="pipeline-metric-label">Records</span>
                        <span class="pipeline-metric-val records">${records}</span>
                    </div>
                </div>
                
                <div class="pipeline-card-footer">
                    <span class="pipeline-last-updated">Last updated: Just now</span>
                    <button class="pipeline-monitor-btn" onclick="window.showPipelineDetail(${entry.id})">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg>
                        Monitor This Data
                    </button>
                </div>
            </div>`;
        }).join('');
    };

    // =============================================
    // RENDER: PIPELINE DETAIL VIEW (Chart.js)
    // =============================================
    let pipelineCharts = {};
    window.currentPipelineId = null;

    window.showPipelineDetail = function(id) {
        window.currentPipelineId = id;
        navigateTo('pipeline-detail-view');
    };

    window.renderPipelineDetail = function renderPipelineDetail() {
        if (!window.Chart) {
            console.warn("Chart.js not loaded.");
            return;
        }

        const entries = (currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
        // If currentPipelineId is not found, fallback to the first entry
        const entry = entries.find(e => String(e.id) === String(window.currentPipelineId)) || entries[0];
        
        if (!entry) {
            return; // No data to show
        }

        const seedVal = entry.id || 12345;
        const resolved = currentUser && currentUser.resolvedAlerts && currentUser.resolvedAlerts.includes('pl-' + seedVal);

        Chart.defaults.color = 'rgba(255, 255, 255, 0.5)';
        Chart.defaults.font.family = 'sans-serif';
        Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';
        Chart.defaults.scale.grid.borderColor = 'rgba(255, 255, 255, 0.1)';

        function createChart(id, config) {
            if (pipelineCharts[id]) {
                pipelineCharts[id].destroy();
            }
            const ctx = document.getElementById(id);
            if (ctx) {
                pipelineCharts[id] = new Chart(ctx, config);
            }
        }

        // Simple pseudo-random generator seeded by entry.id so it's deterministic per pipeline
        let seed = seedVal;
        function random(min, max) {
            let x = Math.sin(seed++) * 10000;
            return min + (x - Math.floor(x)) * (max - min);
        }

        // Generate data based on entry properties to make it dynamic but deterministic
        const baseAcc = entry.qualityScore || 90;
        const baseErr = resolved ? 0 : Math.max(1000, 10000 - (baseAcc * 80)); 

        // Update top stats dynamically
        const processedGB = Math.round(random(10, 800));
        const activeCount = Math.round(random(1, 50));
        const totalCount = activeCount + Math.round(random(0, 10));
        const failCount = resolved ? 0 : Math.round(random(0, 15));
        
        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        
        setEl('pd-val-1', totalCount.toLocaleString());
        setEl('pd-trend-1', '+' + (random(2, 15)).toFixed(1) + '%');
        
        setEl('pd-val-2', activeCount.toLocaleString());
        setEl('pd-trend-2', baseAcc.toFixed(1) + '%');
        
        setEl('pd-val-3', processedGB + ' GB');
        const tbStr = (processedGB / 1000 * random(1, 5)).toFixed(1) + ' TB';
        setEl('pd-trend-3', tbStr);
        
        setEl('pd-val-4', failCount.toLocaleString());
        setEl('pd-trend-4', '-' + (random(1, 10)).toFixed(1) + '%');

        // 1. Pipeline Performance Overview (Wide Line Chart)
        createChart('pd-performance-chart', {
            type: 'line',
            data: {
                labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
                datasets: [
                    {
                        label: 'Throughput (req/s)',
                        data: Array.from({length: 7}, () => parseFloat(random(55, 120).toFixed(1))),
                        borderColor: '#60a5fa',
                        backgroundColor: '#60a5fa',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 3
                    },
                    {
                        label: 'Latency (s)',
                        data: Array.from({length: 7}, () => parseFloat(random(15, 50).toFixed(1))),
                        borderColor: '#c084fc',
                        backgroundColor: '#c084fc',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 3
                    },
                    {
                        label: 'Errors',
                        data: Array.from({length: 7}, () => resolved ? 0 : Math.round(random(0, 10))),
                        borderColor: '#f87171',
                        backgroundColor: '#f87171',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 20 } } },
                scales: { y: { beginAtZero: true } }
            }
        });

        // 2. Data Quality Metrics (Cyan Line Chart)
        createChart('pd-quality-chart', {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [
                    {
                        label: 'Accuracy (%)',
                        data: Array.from({length: 7}, () => random(Math.max(0, baseAcc - 5), Math.min(100, baseAcc + 5))),
                        borderColor: '#34d399',
                        backgroundColor: '#34d399',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 3
                    },
                    {
                        label: 'Completeness (%)',
                        data: Array.from({length: 7}, () => random(95, 100)),
                        borderColor: '#2dd4bf',
                        backgroundColor: '#2dd4bf',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
                scales: { y: { min: 80, max: 100, ticks: { stepSize: 5 } } }
            }
        });

        // 3. Processing Time Analysis (Orange Line Chart)
        createChart('pd-time-chart', {
            type: 'line',
            data: {
                labels: ['1h', '2h', '3h', '4h', '5h', '6h'],
                datasets: [
                    {
                        label: 'Avg Time (min)',
                        data: Array.from({length: 6}, () => random(10, 30)),
                        borderColor: '#fbbf24',
                        backgroundColor: '#fbbf24',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 3,
                        borderDash: [5, 5]
                    },
                    {
                        label: 'Max Time (min)',
                        data: Array.from({length: 6}, () => random(35, 60)),
                        borderColor: '#f87171',
                        backgroundColor: '#f87171',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
                scales: { y: { min: 0, max: 100, ticks: { stepSize: 25 } } }
            }
        });

        // 4. Pipeline Execution Status (Bar Chart) - equal totals per category
        const execTotal = 1000;
        const execSuccess = [], execFailed = [], execPending = [];
        for (let ei = 0; ei < 5; ei++) {
            const failVal = resolved ? 0 : Math.round(random(10, 50));
            const pendVal = Math.round(random(50, 150));
            execSuccess.push(execTotal - failVal - pendVal);
            execFailed.push(failVal);
            execPending.push(pendVal);
        }
        createChart('pd-execution-chart', {
            type: 'bar',
            data: {
                labels: ['User Data', 'Analytics', 'Reporting', 'Integration', 'Backup'],
                datasets: [
                    { label: 'Success', data: execSuccess, backgroundColor: '#34d399', barThickness: 20 },
                    { label: 'Failed', data: execFailed, backgroundColor: '#f87171', barThickness: 20 },
                    { label: 'Pending', data: execPending, backgroundColor: '#fbbf24', barThickness: 20 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
                scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
            }
        });
    };

    // =============================================
    // RENDER: DATA SOURCE OVERVIEW  (global so navigateTo can call it)
    // =============================================

    // =============================================
    // RENDER: CHART INFO MODAL (Dynamic)
    // =============================================
    window.showChartInfo = function(type) {
        let overlay = document.getElementById('chart-info-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'chart-info-modal-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.7)';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.zIndex = '9999';
            overlay.style.backdropFilter = 'blur(4px)';
            
            const modal = document.createElement('div');
            modal.style.background = 'linear-gradient(145deg, #1e293b, #0f172a)';
            modal.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            modal.style.borderRadius = '12px';
            modal.style.padding = '24px';
            modal.style.width = '90%';
            modal.style.maxWidth = '500px';
            modal.style.color = '#f1f5f9';
            modal.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)';
            
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.marginBottom = '16px';
            header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
            header.style.paddingBottom = '12px';
            
            const title = document.createElement('h3');
            title.id = 'chart-info-modal-title';
            title.style.margin = '0';
            title.style.fontSize = '1.25rem';
            title.style.fontWeight = '600';
            
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.background = 'transparent';
            closeBtn.style.border = 'none';
            closeBtn.style.color = '#94a3b8';
            closeBtn.style.fontSize = '1.5rem';
            closeBtn.style.cursor = 'pointer';
            closeBtn.onclick = () => overlay.style.display = 'none';
            
            const body = document.createElement('div');
            body.id = 'chart-info-modal-body';
            body.style.fontSize = '0.95rem';
            body.style.lineHeight = '1.5';
            body.style.color = '#cbd5e1';
            
            const closeAction = document.createElement('div');
            closeAction.style.marginTop = '24px';
            closeAction.style.textAlign = 'right';
            
            const okBtn = document.createElement('button');
            okBtn.textContent = 'Mengerti';
            okBtn.style.padding = '8px 16px';
            okBtn.style.background = '#3b82f6';
            okBtn.style.color = 'white';
            okBtn.style.border = 'none';
            okBtn.style.borderRadius = '6px';
            okBtn.style.cursor = 'pointer';
            okBtn.style.fontWeight = '500';
            okBtn.onclick = () => overlay.style.display = 'none';
            
            header.appendChild(title);
            header.appendChild(closeBtn);
            closeAction.appendChild(okBtn);
            
            modal.appendChild(header);
            modal.appendChild(body);
            modal.appendChild(closeAction);
            overlay.appendChild(modal);
            
            document.body.appendChild(overlay);
        }
        
        const titleEl = document.getElementById('chart-info-modal-title');
        const bodyEl = document.getElementById('chart-info-modal-body');
        
        let c = null;
        let dynStr = "";

        if (type === 'pipeline') {
            c = window.Chart.getChart('pd-execution-chart');
            if (c) {
                let s = c.data.datasets[0].data[0] || 0;
                let f = c.data.datasets[1].data[0] || 0;
                let p = c.data.datasets[2].data[0] || 0;
                dynStr = "Berdasarkan data saat ini, rata-rata terdapat <strong>" + s + "</strong> proses sukses, <strong>" + f + "</strong> gagal, dan <strong>" + p + "</strong> pending untuk setiap kategori (total " + (s+f+p) + ").";
            }
            titleEl.textContent = 'Informasi: Pipeline Execution Status';
            bodyEl.innerHTML = `
                <p style="margin-bottom: 12px;"><strong>Apa itu grafik ini?</strong></p>
                <p style="margin-bottom: 16px;">Grafik batang bertumpuk ini menunjukkan status eksekusi dari 5 tahapan utama dalam pipeline data.</p>
                <p style="margin-bottom: 12px;"><strong>Hasil Tabel Saat Ini:</strong></p>
                <p style="margin-bottom: 16px; color: #60a5fa;">${dynStr}</p>
                <p style="margin-top: 16px; margin-bottom: 12px;"><strong>Kesimpulan Akhir:</strong></p>
                <p>Sistem eksekusi pipeline berjalan sangat sehat dan stabil tanpa hambatan berarti di seluruh tahapan proses data.</p>
            `;
        } else if (type === 'quality') {
            c = window.Chart.getChart('dqa-issues-chart');
            if (c) {
                let crit = c.data.datasets[0].data[0] || 0;
                let high = c.data.datasets[1].data[0] || 0;
                let med = c.data.datasets[2].data[0] || 0;
                let low = c.data.datasets[3].data[0] || 0;
                let t = crit + high + med + low;
                dynStr = "Dari data grafik yang terlihat, tiap kategori memiliki total <strong>" + t + "</strong> isu. Rata-rata ada sekitar <strong>" + crit + "</strong> isu Critical, <strong>" + high + "</strong> High, <strong>" + med + "</strong> Medium, dan <strong>" + low + "</strong> Low per kategori.";
            }
            titleEl.textContent = 'Informasi: Data Issues by Category';
            bodyEl.innerHTML = `
                <p style="margin-bottom: 12px;"><strong>Apa itu grafik ini?</strong></p>
                <p style="margin-bottom: 16px;">Grafik ini menunjukkan rincian anomali kualitas data berdasarkan kategorinya dan tingkat keparahan.</p>
                <p style="margin-bottom: 12px;"><strong>Hasil Tabel Saat Ini:</strong></p>
                <p style="margin-bottom: 16px; color: #60a5fa;">${dynStr}</p>
                <p style="margin-top: 16px; margin-bottom: 12px;"><strong>Kesimpulan Akhir:</strong></p>
                <p>Kualitas data terkelola dengan baik, di mana isu tingkat rendah mendominasi dan dapat diselesaikan tanpa mengganggu integritas sistem secara kritis.</p>
            `;
        } else if (type === 'pipeline-performance') {
            c = window.Chart.getChart('pd-performance-chart');
            if (c) {
                let tps = c.data.datasets[0].data; let avgTps = (tps.reduce((a,b)=>a+b,0)/tps.length).toFixed(1);
                let lat = c.data.datasets[1].data; let avgLat = (lat.reduce((a,b)=>a+b,0)/lat.length).toFixed(1);
                let err = c.data.datasets[2].data; let totalErr = err.reduce((a,b)=>a+b,0);
                dynStr = "Rata-rata throughput adalah <strong>" + avgTps + " req/s</strong> dengan latensi <strong>" + avgLat + " s</strong>. Total error tercatat: <strong>" + totalErr + "</strong>.";
            }
            titleEl.textContent = 'Informasi: Pipeline Performance Overview';
            bodyEl.innerHTML = `
                <p style="margin-bottom: 12px;"><strong>Apa itu grafik ini?</strong></p>
                <p style="margin-bottom: 16px;">Grafik ini melacak kinerja *throughput*, latensi, dan tingkat *error* pada pipeline.</p>
                <p style="margin-bottom: 12px;"><strong>Hasil Tabel Saat Ini:</strong></p>
                <p style="margin-bottom: 16px; color: #60a5fa;">${dynStr}</p>
                <p style="margin-top: 16px; margin-bottom: 12px;"><strong>Kesimpulan Akhir:</strong></p>
                <p>Performa operasional berada dalam kondisi prima dengan penanganan beban yang efisien.</p>
            `;
        } else if (type === 'pipeline-quality') {
            c = window.Chart.getChart('pd-quality-chart');
            if (c) {
                let s = c.data.datasets[0].data;
                let mn = Math.min(...s).toFixed(1); let mx = Math.max(...s).toFixed(1); let ag = (s.reduce((a,b)=>a+b,0)/s.length).toFixed(1);
                dynStr = "Skor berfluktuasi antara <strong>" + mn + "%</strong> hingga <strong>" + mx + "%</strong>, dengan rata-rata <strong>" + ag + "%</strong>.";
            }
            titleEl.textContent = 'Informasi: Data Quality Metrics';
            bodyEl.innerHTML = `
                <p style="margin-bottom: 12px;"><strong>Apa itu grafik ini?</strong></p>
                <p style="margin-bottom: 16px;">Grafik ini menunjukkan pergerakan metrik kualitas data secara umum dalam rentang waktu tertentu.</p>
                <p style="margin-bottom: 12px;"><strong>Hasil Tabel Saat Ini:</strong></p>
                <p style="margin-bottom: 16px; color: #60a5fa;">${dynStr}</p>
                <p style="margin-top: 16px; margin-bottom: 12px;"><strong>Kesimpulan Akhir:</strong></p>
                <p>Integritas data tetap tinggi secara konsisten, membuktikan tata kelola berjalan efektif.</p>
            `;
        } else if (type === 'pipeline-time') {
            c = window.Chart.getChart('pd-time-chart');
            if (c) {
                let av = c.data.datasets[0].data; let mnAv = (av.reduce((a,b)=>a+b,0)/av.length).toFixed(1);
                let mx = c.data.datasets[1].data; let mnMx = (mx.reduce((a,b)=>a+b,0)/mx.length).toFixed(1);
                dynStr = "Waktu proses rata-rata adalah <strong>" + mnAv + " menit</strong>, di bawah batas maksimum yang berada di <strong>" + mnMx + " menit</strong>.";
            }
            titleEl.textContent = 'Informasi: Processing Time Analysis';
            bodyEl.innerHTML = `
                <p style="margin-bottom: 12px;"><strong>Apa itu grafik ini?</strong></p>
                <p style="margin-bottom: 16px;">Grafik ini memberikan gambaran waktu pemrosesan aktual dibandingkan ekspektasi batas waktu.</p>
                <p style="margin-bottom: 12px;"><strong>Hasil Tabel Saat Ini:</strong></p>
                <p style="margin-bottom: 16px; color: #60a5fa;">${dynStr}</p>
                <p style="margin-top: 16px; margin-bottom: 12px;"><strong>Kesimpulan Akhir:</strong></p>
                <p>Sistem memproses antrean data jauh lebih cepat dari batas waktu maksimum (SLA terpenuhi).</p>
            `;
        } else if (type === 'quality-trend') {
            c = window.Chart.getChart('dqa-trend-chart');
            if (c) {
                let s = c.data.datasets[0].data;
                let ls = s[s.length - 1].toFixed(1); let fs = s[0].toFixed(1); let df = (ls - fs).toFixed(1);
                dynStr = "Skor awal: <strong>" + fs + "%</strong>, skor terbaru: <strong>" + ls + "%</strong> (" + (df >= 0 ? "naik" : "turun") + " " + Math.abs(df) + "%).";
            }
            titleEl.textContent = 'Informasi: Overall Quality Score Trend';
            bodyEl.innerHTML = `
                <p style="margin-bottom: 12px;"><strong>Apa itu grafik ini?</strong></p>
                <p style="margin-bottom: 16px;">Grafik ini menampilkan skor kesehatan data harian selama periode 7 hari ke belakang.</p>
                <p style="margin-bottom: 12px;"><strong>Hasil Tabel Saat Ini:</strong></p>
                <p style="margin-bottom: 16px; color: #60a5fa;">${dynStr}</p>
                <p style="margin-top: 16px; margin-bottom: 12px;"><strong>Kesimpulan Akhir:</strong></p>
                <p>Tren positif ini mencerminkan data dipastikan siap pakai untuk kebutuhan analitik lanjutan.</p>
            `;
        } else if (type === 'quality-dimensions') {
            c = window.Chart.getChart('dqa-dims-chart');
            if (c) {
                let week4Data = c.data.datasets[c.data.datasets.length - 1].data;
                let dims = c.data.labels;
                let minV = Math.min(...week4Data); let maxV = Math.max(...week4Data);
                let minI = week4Data.indexOf(minV); let maxI = week4Data.indexOf(maxV);
                let minD = dims[minI]; let maxD = dims[maxI];
                dynStr = "Dimensi tertinggi: <strong>" + maxD + " (" + maxV.toFixed(1) + "%)</strong>. Dimensi terendah: <strong>" + minD + " (" + minV.toFixed(1) + "%)</strong>.";
            }
            titleEl.textContent = 'Informasi: Quality Dimensions - Monthly Trend';
            bodyEl.innerHTML = `
                <p style="margin-bottom: 12px;"><strong>Apa itu grafik ini?</strong></p>
                <p style="margin-bottom: 16px;">Grafik garis ini membandingkan 5 dimensi utama kualitas data selama 4 minggu.</p>
                <p style="margin-bottom: 12px;"><strong>Hasil Tabel Saat Ini:</strong></p>
                <p style="margin-bottom: 16px; color: #60a5fa;">${dynStr}</p>
                <p style="margin-top: 16px; margin-bottom: 12px;"><strong>Kesimpulan Akhir:</strong></p>
                <p>Pilar kualitas data menunjukkan kematangan sistem dalam mempertahankan akurasi.</p>
            `;
        } else if (type === 'quality-freshness') {
            c = window.Chart.getChart('dqa-freshness-chart');
            if (c) {
                let dArr = c.data.datasets[0].data;
                let ot = dArr[0]; let dl = dArr[1]; let st = dArr[2] || 0; let tot = ot + dl + st;
                let pct = ((ot / tot) * 100).toFixed(1);
                dynStr = "Dari total " + tot.toLocaleString() + " data, <strong>" + ot.toLocaleString() + " (" + pct + "%)</strong> datang tepat waktu.";
            }
            titleEl.textContent = 'Informasi: Data Freshness Status';
            bodyEl.innerHTML = `
                <p style="margin-bottom: 12px;"><strong>Apa itu grafik ini?</strong></p>
                <p style="margin-bottom: 16px;">Grafik ini menunjukkan jumlah data tepat waktu vs. terlambat.</p>
                <p style="margin-bottom: 12px;"><strong>Hasil Tabel Saat Ini:</strong></p>
                <p style="margin-bottom: 16px; color: #60a5fa;">${dynStr}</p>
                <p style="margin-top: 16px; margin-bottom: 12px;"><strong>Kesimpulan Akhir:</strong></p>
                <p>Data aktual terjamin, meminimalkan risiko keputusan bisnis berdasarkan data usang.</p>
            `;
        } else if (type === 'run-prediction') {
            titleEl.textContent = 'Mekanisme Machine Learning & Prediksi';
            bodyEl.innerHTML = `
                <p style="margin-bottom: 12px;"><strong>Algoritma Machine Learning:</strong></p>
                <p style="margin-bottom: 16px;">Fitur ini menggunakan algoritma klasifikasi <i>(Binary Classification)</i> berbasis pohon keputusan (seperti <i>Random Forest</i> atau <i>XGBoost</i>). Model ini telah dilatih memproses ribuan data historis Jastip untuk mengenali pola anomali pengiriman.</p>
                <p style="margin-bottom: 12px;"><strong>Bagaimana Cara Perhitungannya?</strong></p>
                <p style="margin-bottom: 16px; color: #60a5fa; line-height: 1.5;">
                    1. <strong>Ekstraksi Fitur:</strong> Sistem mengonversi input seperti Negara Asal, Ongkos Kirim, dan Pajak Bea Cukai menjadi vektor numerik berbobot <i>(weighted vector)</i>.<br>
                    2. <strong>Kalkulasi Probabilitas:</strong> Vektor tersebut dimasukkan ke dalam jaringan model, yang akan menghitung skor probabilitas matematis dari 0% hingga 100%.<br>
                    3. <strong>Penentuan Kelas:</strong> Apabila skor probabilitas melewati batas ambang <i>(threshold)</i> tertentu, maka sistem akan menentukan prediksi kelas akhirnya (misal: <i>Tepat Waktu</i> atau <i>Terlambat</i>).
                </p>
                <p style="margin-top: 16px; margin-bottom: 12px;"><strong>Confidence Score:</strong></p>
                <p>Angka persentase yang muncul menunjukkan tingkat keyakinan (akurasi matematis) dari algoritma terhadap hasil prediksi yang diberikan.</p>
            `;
        } else if (type === 'env-dashboard') {
            titleEl.textContent = 'Informasi: Environment Dashboard';
            bodyEl.innerHTML = `
                <p style="margin-bottom: 12px;"><strong>Apa itu fitur ini?</strong></p>
                <p style="margin-bottom: 16px;">Dashboard ini adalah pusat pemantauan <i>(monitoring)</i> yang dirancang khusus untuk merekam data lingkungan infrastruktur <strong>Sistem Prediksi Machine Learning Jastip</strong> secara <i>real-time</i>.</p>
                <p style="margin-bottom: 12px;"><strong>Penjelasan Metrik Lingkungan:</strong></p>
                <ul style="margin-bottom: 16px; color: #60a5fa; line-height: 1.6; padding-left: 20px;">
                    <li><strong>API Gateway Load (CPU):</strong> Memonitor beban proses prediksi yang berjalan secara real-time.</li>
                    <li><strong>Inference RAM Usage (Memory):</strong> Memantau penggunaan RAM sistem saat algoritma AI sedang melakukan kalkulasi matematis.</li>
                    <li><strong>Model Data Storage (Disk):</strong> Melacak ruang penyimpanan untuk file model <i>(weights)</i>, dataset historis transaksi Jastip, dan log hasil prediksi.</li>
                    <li><strong>External API Traffic (Network):</strong> Merekam volume pertukaran data (seperti input pengguna dan tarikan data Bea Cukai/Logistik).</li>
                </ul>
                <p style="margin-top: 16px; margin-bottom: 12px;"><strong>Kesimpulan Akhir:</strong></p>
                <p>Dashboard ini memastikan stabilitas seluruh <i>environment</i> yang menopang berjalannya fitur cerdas pada platform Jastip Anda.</p>
            `;
        }
        overlay.style.display = 'flex';
    };

    window.renderDataSourceOverview = function renderDataSourceOverview() {
        // Always read the latest data from currentUser (already refreshed by navigateTo)
        const getEntries = () => (currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];

        function refreshStats() {
            const entries = getEntries();
            const counts = { todo: 0, 'in-progress': 0, 'in-review': 0, done: 0 };
            let totalAccuracy = 0;
            entries.forEach(e => {
                if (counts[e.activity] !== undefined) counts[e.activity]++;
                totalAccuracy += window.getDatasetQualityInfo(e).finalScore;
            });
            const avgAcc = entries.length > 0 
                ? (totalAccuracy / entries.length).toFixed(1).replace(/\.0$/, '') + '%' 
                : '0%';
            const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            setEl('dso-stat-total',      entries.length);
            setEl('dso-stat-todo',       counts['todo']);
            setEl('dso-stat-inprogress', counts['in-progress']);
            setEl('dso-stat-inreview',   counts['in-review']);
            setEl('dso-stat-done',       counts['done']);
            setEl('dso-stat-accuracy',   avgAcc);
        }

        function applyFilters() {
            const searchEl = document.getElementById('dso-search');
            const filterEl = document.getElementById('dso-filter');
            window._dsoRenderTable(
                getEntries(),
                searchEl ? searchEl.value : '',
                filterEl ? filterEl.value : 'all'
            );
        }

        refreshStats();
        window._dsoRenderTable(getEntries(), '', 'all');

        // Search
        const searchEl = document.getElementById('dso-search');
        if (searchEl) {
            searchEl.value = '';
            searchEl.oninput = applyFilters;
        }

        // Filter
        const filterEl = document.getElementById('dso-filter');
        if (filterEl) {
            filterEl.value = 'all';
            filterEl.onchange = applyFilters;
        }

        // Modal close
        const modalClose = document.getElementById('dso-modal-close');
        const overlay    = document.getElementById('dso-modal-overlay');
        if (modalClose) modalClose.onclick = () => { if (overlay) overlay.style.display = 'none'; };
        if (overlay) overlay.onclick = (e) => { if (e.target === overlay) overlay.style.display = 'none'; };

        // Expose live refresh for delete
        window._dsoRefresh = () => { refreshCurrentUserFromStorage(); refreshStats(); applyFilters(); };
    };

    window._dsoRenderTable = function _dsoRenderTable(allEntries, search, filter) {
        try {
            const tbody     = document.getElementById('dso-tbody');
            const emptyEl   = document.getElementById('dso-empty');
            const tableWrap = document.getElementById('dso-table-wrap');
            const countEl   = document.getElementById('dso-entry-count');
            if (!tbody) return;

            const q = (search || '').toLowerCase().trim();
            const filtered = allEntries.filter(entry => {
                const matchFilter = filter === 'all' || entry.activity === filter;
                const matchSearch = !q ||
                    (entry.name        || '').toLowerCase().includes(q) ||
                    (entry.fileName    || '').toLowerCase().includes(q) ||
                    (entry.notes       || '').toLowerCase().includes(q) ||
                    (entry.description || '').toLowerCase().includes(q) ||
                    (entry.activity    || '').toLowerCase().includes(q);
                return matchFilter && matchSearch;
            });

            if (filtered.length === 0) {
                if (emptyEl)   emptyEl.style.display   = 'flex';
                if (tableWrap) tableWrap.style.display  = 'none';
                return;
            }
            if (emptyEl)   emptyEl.style.display   = 'none';
            if (tableWrap) tableWrap.style.display  = 'block';

            if (countEl) countEl.textContent = `Showing ${filtered.length} of ${allEntries.length} entries`;

            const actCfg = {
                'todo':        { label: 'To Do',       cls: 'dso-badge-todo' },
                'in-progress': { label: 'In Progress',  cls: 'dso-badge-inprogress' },
                'in-review':   { label: 'In Review',    cls: 'dso-badge-inreview' },
                'done':        { label: 'Done',          cls: 'dso-badge-done' },
            };

            tbody.innerHTML = filtered.map((entry) => {
                const act = actCfg[entry.activity] || { label: entry.activity || '-', cls: '' };
                const score = window.getDatasetQualityInfo(entry).finalScore;
                const accClass = score >= 80 ? 'dso-acc-green' : score >= 50 ? 'dso-acc-yellow' : 'dso-acc-red';
                const fileIcon = entry.hasImage ? '📷' : entry.fileName ? '📄' : '📋';
                const submittedDate = entry.submittedAt
                    ? new Date(entry.submittedAt).toLocaleDateString('en-CA')
                    : (entry.date || '-');
                const notesText = entry.notes || entry.description || '-';
                const versionText = entry.version ? `v${entry.version}` : '-';

                return `<tr data-idx="${allEntries.indexOf(entry)}">
                    <td>
                        <div class="dso-file-cell" onclick="dsoOpenFile(${allEntries.indexOf(entry)})" title="Klik untuk membuka file" style="cursor:pointer;">
                            <span class="dso-file-icon" style="transition: transform 0.15s;">${fileIcon}</span>
                            <div>
                                <div class="dso-file-name" style="color:#38bdf8;">${entry.fileName || 'Manual Entry'}</div>
                                <div class="dso-file-type">${entry.fileType || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="dso-date-cell">
                            <svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm-5-8h-5v5h5v-5z"/></svg>
                            ${submittedDate}
                        </div>
                    </td>
                    <td>
                        <div class="dso-name-cell">
                            <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                            ${entry.name || '-'}
                            ${(entry.sourceType === 'api' || entry.source_type === 'api') ? '<span class="badge badge-api" style="margin-left: 8px;">API</span>' : '<span class="badge badge-manual" style="margin-left: 8px;">Manual</span>'}
                        </div>
                    </td>
                    <td><span class="dso-badge ${act.cls}">${act.label}</span></td>
                    <td>
                        <div class="dso-version-cell">
                            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>
                            ${versionText}
                        </div>
                    </td>
                    <td><span class="dso-accuracy-val ${accClass}">${score}%</span></td>
                    <td><span class="dso-notes-cell" title="${notesText}">${notesText}</span></td>
                    <td>
                        <div class="dso-action-btns">
                            <button class="dso-btn-view" title="View Detail" onclick="dsoOpenDetail(${allEntries.indexOf(entry)})">
                                <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                            </button>
                            <button class="dso-btn-download" title="Download Data" onclick="dsoDownloadEntry(${allEntries.indexOf(entry)})">
                                <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                            </button>
                            <button class="dso-btn-delete" title="Delete" onclick="dsoDeleteEntry(${allEntries.indexOf(entry)})">
                                <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        } catch (e) {
            console.error("Render Table Error:", e);
            alert("Terjadi kesalahan pada Render Tabel: " + e.message + "\nMohon laporkan pesan ini kepada developer.");
        }
    };

    // Global functions for table button onclick (must be on window scope)
    // Open file directly in new tab or trigger download
    window.dsoOpenFile = function(idx) {
        if (!currentUser || !currentUser.dataEntries) return;
        const entry = currentUser.dataEntries[idx];
        if (!entry) return;

        // Try to get fileDataUrl from memory first, then from IndexedDB
        const openWith = function(dataUrl) {
            if (!dataUrl) {
                const toast = document.createElement('div');
                toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:#94a3b8;padding:12px 24px;border-radius:10px;border:1px solid rgba(56,189,248,0.3);font-size:0.875rem;z-index:999999;box-shadow:0 8px 32px rgba(0,0,0,0.4);';
                toast.textContent = '📎 File "' + (entry.fileName || 'Manual Entry') + '" tidak tersedia. Silakan upload ulang file ini.';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 4000);
                return;
            }
            entry.fileDataUrl = dataUrl; // cache in memory

            try {
                // Convert data URL → Blob → Object URL (browsers block data: URLs in iframes)
                const [header, base64] = dataUrl.split(',');
                const mimeMatch = header.match(/:(.*?);/);
                const mime = mimeMatch ? mimeMatch[1] : (entry.fileType || 'application/octet-stream');
                const byteChars = atob(base64);
                const byteArr = new Uint8Array(byteChars.length);
                for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
                const blob = new Blob([byteArr], { type: mime });
                const blobUrl = URL.createObjectURL(blob);

                const win = window.open(blobUrl, '_blank');
                if (!win) {
                    // Popup blocked fallback: create a link and click it
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.target = '_blank';
                    a.download = entry.fileName || 'file';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
                if(window.addNotification) window.addNotification("Data Exported", `You downloaded file: ${entry.fileName || 'file'}`, "info");
                // Revoke after a delay to allow tab to load
                setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
            } catch (convErr) {
                console.error('Blob conversion error:', convErr);
                // Fallback: open data URL directly
                const win = window.open('', '_blank');
                if (win) win.location.href = dataUrl;
            }
        };

        if (entry.pdfUrl) {
            window.open(entry.pdfUrl, '_blank');
        } else if (entry.fileDataUrl) {
            openWith(entry.fileDataUrl);
        } else if (entry._idbKey) {
            getFileDataUrl(entry._idbKey).then(openWith);
        } else {
            openWith(null);
        }
    };

    window.dsoOpenDetail = function(idx) {
        if (!currentUser || !currentUser.dataEntries) return;
        const entry = currentUser.dataEntries[idx];
        if (!entry) return;

        const overlay = document.getElementById('dso-modal-overlay');
        const title   = document.getElementById('dso-modal-title');
        const body    = document.getElementById('dso-modal-body');
        if (!overlay || !title || !body) return;

        const actLabel = { 'todo':'To Do','in-progress':'In Progress','in-review':'In Review','done':'Done' };
        const submittedDate = entry.submittedAt
            ? new Date(entry.submittedAt).toLocaleString('id-ID')
            : (entry.date || '-');

        title.textContent = entry.fileName || 'Manual Entry';
        body.innerHTML = `
            <div class="dso-modal-grid">
                ${(entry.pdfUrl || entry.fileDataUrl) ? (
                    (entry.hasImage || (entry.fileType && entry.fileType.includes('image'))) ? 
                    `<div class="dso-modal-preview"><img src="${entry.pdfUrl ? entry.pdfUrl : entry.fileDataUrl}" alt="preview" style="max-width:100%; border-radius:8px;"></div>` : 
                    `<div class="dso-modal-preview" style="height:400px; width:100%; border-radius:8px; overflow:hidden;"><iframe src="${entry.pdfUrl ? entry.pdfUrl : entry.fileDataUrl}" style="width:100%; height:100%; border:none;"></iframe></div>`
                ) : 'Preview tidak tersedia'}
                <div class="dso-modal-rows">
                    ${[
                        ['File', entry.fileName || 'Tidak ada file'],
                        ['Tipe', entry.fileType || '-'],
                        ['Name', entry.name || '-'],
                        ['Tanggal', entry.date || '-'],
                        ['Disubmit', submittedDate],
                        ['Activity', actLabel[entry.activity] || entry.activity || '-'],
                        ['Version', entry.version || '-'],
                        ['Description', entry.description || '-'],
                        ['Notes', entry.notes || '-'],
                        ['Quality Score', window.getDatasetQualityInfo(entry).finalScore + '%'],
                    ].map(([k, v]) => `
                        <div class="dso-detail-row">
                            <span class="dso-detail-key">${k}</span>
                            <span class="dso-detail-val">${v}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        overlay.style.display = 'flex';
    };

    // Helper for Custom Alerts
    window.showCustomAlert = function(title, message, isSuccess = true) {
        let overlay = document.getElementById('custom-alert-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'custom-alert-modal-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.8)';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.zIndex = '999999';
            overlay.style.backdropFilter = 'blur(4px)';
            document.body.appendChild(overlay);
        }
        
        const iconColor = isSuccess ? '#10b981' : '#ef4444';
        const iconBg = isSuccess ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        const iconBorder = isSuccess ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        const svgPath = isSuccess 
            ? '<polyline points="20 6 9 17 4 12"></polyline>' 
            : '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
            
        overlay.innerHTML = `
            <div style="background: linear-gradient(145deg, #1e293b, #0f172a); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 32px 24px; width: 90%; max-width: 400px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); position: relative; font-family: 'Inter', sans-serif; text-align: center;">
                <button onclick="document.getElementById('custom-alert-modal-overlay').style.display='none'" style="position: absolute; top: 16px; right: 16px; background: transparent; border: none; color: #64748b; font-size: 1.5rem; cursor: pointer;">&times;</button>
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: ${iconBg}; border: 1px solid ${iconBorder}; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px;">${svgPath}</svg>
                    </div>
                    <h2 style="color: #f8fafc; margin: 0 0 8px 0; font-size: 1.25rem; font-weight: 700;">${title}</h2>
                    <p style="color: #94a3b8; margin: 0 0 24px 0; font-size: 0.95rem; line-height: 1.5;">${message}</p>
                    <button onclick="document.getElementById('custom-alert-modal-overlay').style.display='none'" style="width: 100%; padding: 12px; border-radius: 8px; background: #3b82f6; border: none; color: white; font-weight: 600; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                        OK, Got it
                    </button>
                </div>
            </div>
        `;
        overlay.style.display = 'flex';
    };

    // Helper for Custom Delete Confirmation
    window.showCustomConfirm = function(title, subtitle, iconHtml, targetTitle, targetName, warningText, onConfirm) {
        let overlay = document.getElementById('custom-confirm-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'custom-confirm-modal-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.8)';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.zIndex = '99999';
            overlay.style.backdropFilter = 'blur(4px)';
            document.body.appendChild(overlay);
        }
        
        overlay.innerHTML = `
            <div style="background: linear-gradient(145deg, #1e293b, #0f172a); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 32px 24px; width: 90%; max-width: 440px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); position: relative; font-family: 'Inter', sans-serif;">
                <button onclick="document.getElementById('custom-confirm-modal-overlay').style.display='none'" style="position: absolute; top: 16px; right: 16px; background: transparent; border: none; color: #64748b; font-size: 1.5rem; cursor: pointer;">&times;</button>
                <div style="display: flex; flex-direction: column; align-items: center; text-align: center;">
                    <div style="position: relative; width: 64px; height: 64px; border-radius: 16px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        <div style="position: absolute; top: -8px; right: -8px; background: #f59e0b; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" style="width: 12px; height: 12px;"><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        </div>
                    </div>
                    <h2 style="color: #f8fafc; margin: 0 0 8px 0; font-size: 1.25rem; font-weight: 700;">${title}</h2>
                    <p style="color: #94a3b8; margin: 0 0 24px 0; font-size: 0.875rem;">${subtitle}</p>
                    <div style="width: 100%; text-align: left; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 16px; margin-bottom: 16px; display: flex; align-items: center; gap: 16px;">
                        <div style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            ${iconHtml}
                        </div>
                        <div style="overflow: hidden;">
                            <div style="color: #94a3b8; font-size: 0.75rem; margin-bottom: 4px;">${targetTitle}</div>
                            <div style="color: #f8fafc; font-size: 0.875rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${targetName}</div>
                        </div>
                    </div>
                    <div style="width: 100%; text-align: left; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; gap: 12px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" style="width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        <p style="color: #fca5a5; margin: 0; font-size: 0.875rem; line-height: 1.5;">${warningText}</p>
                    </div>
                    <div style="display: flex; gap: 12px; width: 100%;">
                        <button onclick="document.getElementById('custom-confirm-modal-overlay').style.display='none'" style="flex: 1; padding: 12px; border-radius: 8px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); color: #e2e8f0; font-weight: 600; cursor: pointer;">Cancel</button>
                        <button id="custom-confirm-btn-yes" style="flex: 1; padding: 12px; border-radius: 8px; background: linear-gradient(135deg, #ef4444, #ea580c); border: none; color: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Yes, Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('custom-confirm-btn-yes').onclick = function() {
            document.getElementById('custom-confirm-modal-overlay').style.display = 'none';
            if (onConfirm) onConfirm();
        };
        overlay.style.display = 'flex';
    };

    window.dsoDeleteEntry = function(idx) {
        if (!currentUser || !currentUser.dataEntries) return;
        const entry = currentUser.dataEntries[idx];
        if (!entry) return;
        
        const fileName = entry.fileName || entry.name || 'this entry';
        const fileIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" style="width: 20px; height: 20px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
        
        window.showCustomConfirm(
            "Delete Confirmation",
            "This action cannot be undone. Please confirm carefully.",
            fileIcon,
            "File to be deleted",
            fileName,
            `Are you sure you want to delete "${fileName}"? Once deleted, the data cannot be recovered.`,
            function() {
                if (entry && entry.id) {
                    fetch((window.API_BASE || '/api') + '/datasets/' + entry.id + '/', { method: 'DELETE' }).catch(e=>console.error(e));
                }

                currentUser.dataEntries.splice(idx, 1);

                // Recalculate all stats from remaining entries
                const remaining = currentUser.dataEntries;
                currentUser.dataSources    = remaining.length;
                currentUser.activeProjects = remaining.filter(e => e.activity === 'in-progress').length;
                const totalAcc = remaining.reduce((s, e) => s + window.getDatasetQualityInfo(e).finalScore, 0);
                currentUser.qualityScore   = remaining.length > 0
                    ? (totalAcc / remaining.length).toFixed(1).replace(/\.0$/, '') + '%'
                    : '0%';

                // Save updated entries to per-user scoped key
                saveScopedEntries(currentUser.email, currentUser.dataEntries);
                const sessionSnap = Object.assign({}, currentUser);
                delete sessionSnap.dataEntries;
                localStorage.setItem('insight_session_v2', JSON.stringify(sessionSnap));

                // Refresh currentUser from storage then re-render
                refreshCurrentUserFromStorage();
                if(window.addNotification) window.addNotification("Data Deleted", `Dataset "${fileName}" was deleted.`, "info");
                if (window._dsoRefresh) window._dsoRefresh();
                else renderDataSourceOverview();
            }
        );
    };

            window.dsoDownloadEntry = async function(idx) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(11, 15, 25, 0.95)';
    overlay.style.color = '#ffffff';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '999999';
    overlay.style.fontFamily = 'sans-serif';
    overlay.innerHTML = '<div style="width:50px;height:50px;border:5px solid #3b82f6;border-top:5px solid transparent;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:20px"></div><h2>Memproses Laporan PDF...</h2><p style="color:#94a3b8">Harap tunggu sebentar, menyusun grafik dan menarik seluruh data.</p><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>';
    document.body.appendChild(overlay);

    const hiddenWrapper = document.createElement('div');
    hiddenWrapper.style.position = 'fixed';
    hiddenWrapper.style.top = '0';
    hiddenWrapper.style.left = '0';
    hiddenWrapper.style.width = '2000px';
    hiddenWrapper.style.height = '2000px';
    hiddenWrapper.style.zIndex = '999998';
    hiddenWrapper.style.backgroundColor = '#ffffff';
    hiddenWrapper.style.display = 'flex';
    hiddenWrapper.style.flexWrap = 'wrap';
    
    // Create 13 canvas containers
    const cIds = ['c31', 'c32', 'c33', 'c41', 'c42', 'c43', 'c44', 'c45', 'c46', 'c51', 'c52', 'c53', 'c54'];
    cIds.forEach(id => {
        let div = document.createElement('div');
        div.style.width = '600px';
        div.style.height = '300px';
        div.innerHTML = `<canvas id="${id}"></canvas>`;
        hiddenWrapper.appendChild(div);
    });
    document.body.appendChild(hiddenWrapper);

    try {
        const entries = (typeof currentUser !== 'undefined' && currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
        let mainE = entries[idx] || entries[0] || {};
        if (!mainE) { throw new Error("Data tidak ditemukan."); }

        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'});
        const timeStr = now.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'});
        let email = (typeof currentUser !== 'undefined' && currentUser && currentUser.email) ? currentUser.email : 'admin@domain.com';
        let printBy = email.split('@')[0];

        let qis = entries.map(e => getDatasetQualityInfo(e));
        let mainQi = getDatasetQualityInfo(mainE);

        // helper for colors
        const colors = ['#d97706', '#059669', '#3b82f6', '#8b5cf6', '#f43f5e', '#14b8a6', '#f59e0b', '#6366f1'];
        const getCol = i => colors[i % colors.length];

        // Chart 3.1 HBar
        new Chart(document.getElementById('c31'), {
            type: 'bar',
            data: { labels: entries.map(e => e.name), datasets: [{ data: qis.map(q => q.finalScore), backgroundColor: entries.map((_, i) => getCol(i)) }] },
            options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { min: 0, max: 100 } }, maintainAspectRatio: false }
        });

        // Chart 3.2 Doughnut
        let acts = { 'To Do':0, 'In Progress':0, 'In Review':0, 'Done':0 };
        entries.forEach(e => acts[e.activity || 'In Progress'] = (acts[e.activity || 'In Progress'] || 0) + 1);
        new Chart(document.getElementById('c32'), {
            type: 'doughnut',
            data: { labels: Object.keys(acts), datasets: [{ data: Object.values(acts), backgroundColor: ['#94a3b8', '#f59e0b', '#3b82f6', '#10b981'] }] },
            options: { plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false }
        });

        // Chart 3.3 VBar
        const dims = ['Completeness', 'Accuracy', 'Validity', 'Consistency', 'Timeliness'];
        const dimAvgs = dims.map(d => {
            let sum = 0; qis.forEach(q => { sum += (q.criteria.find(c=>c.label===d)||{val:0}).val; });
            return sum / (qis.length || 1);
        });
        new Chart(document.getElementById('c33'), {
            type: 'bar',
            data: { labels: dims, datasets: [{ data: dimAvgs, backgroundColor: ['#60a5fa', '#34d399', '#a78bfa', '#fbbf24', '#2dd4bf'] }] },
            options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } }, maintainAspectRatio: false }
        });

        // Chart 4.1 HBar (main)
        const mainDims = dims.map(d => (mainQi.criteria.find(c=>c.label===d)||{val:0}).val);
        new Chart(document.getElementById('c41'), {
            type: 'bar',
            data: { labels: dims, datasets: [{ data: mainDims, backgroundColor: '#3b82f6' }] },
            options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { min: 0, max: 100 } }, maintainAspectRatio: false }
        });

        // Historical Data Generation
        const histDates = [];
        const accs = []; const errs = []; const thrpts = []; const lats = [];
        const mainAcc = (mainQi.criteria.find(c=>c.label==='Accuracy')||{val:90}).val;
        let cAcc = mainAcc - 3;
        for(let i=0; i<8; i++) {
            let d = new Date(now); d.setDate(d.getDate() - (7-i)*2);
            histDates.push(d.toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'}));
            if(i===7) cAcc = mainAcc; else cAcc = Math.min(100, Math.max(0, cAcc + (Math.random()*4 - 1.5)));
            accs.push(parseFloat(cAcc.toFixed(1)));
            errs.push(parseFloat(Math.max(0, (100 - cAcc)/100).toFixed(2)));
            thrpts.push(Math.floor(80 + Math.random()*40));
            lats.push(Math.floor(150 + Math.random()*150));
        }

        // Charts 4.2 - 4.6
        new Chart(document.getElementById('c42'), { type: 'line', data: { labels: histDates, datasets: [{ label: 'Akurasi (%)', data: accs, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4 }] }, options: { maintainAspectRatio: false } });
        new Chart(document.getElementById('c43'), { type: 'line', data: { labels: histDates, datasets: [{ label: 'Error Rate (%)', data: errs, borderColor: '#d97706', tension: 0.4 }] }, options: { maintainAspectRatio: false } });
        new Chart(document.getElementById('c44'), { type: 'bar', data: { labels: histDates, datasets: [{ label: 'Throughput (req/s)', data: thrpts, backgroundColor: '#93c5fd' }] }, options: { maintainAspectRatio: false } });
        new Chart(document.getElementById('c45'), { type: 'line', data: { labels: histDates, datasets: [{ label: 'Latency (ms)', data: lats, borderColor: '#111827', tension: 0.4 }] }, options: { maintainAspectRatio: false } });
        
        let stPerlu = 0, stBaik = 0; errs.forEach(e => { if(e > 0.8) stPerlu++; else stBaik++; });
        new Chart(document.getElementById('c46'), { type: 'bar', data: { labels: ['Perlu Perhatian', 'Baik'], datasets: [{ data: [stPerlu, stBaik], backgroundColor: ['#374151', '#374151'] }] }, options: { plugins: { legend: { display: false } }, maintainAspectRatio: false } });

        // Environment charts
        const makeEnvChart = (id, lbl, col, base, v) => {
            let data = []; let cv = base;
            for(let i=0; i<8; i++) { cv = Math.min(100, Math.max(0, cv + (Math.random()*v - v/2))); data.push(cv); }
            new Chart(document.getElementById(id), { type: 'line', data: { labels: histDates, datasets: [{ label: lbl, data: data, borderColor: col, backgroundColor: col+'22', fill: true, tension: 0.4 }] }, options: { maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } } });
        };
        makeEnvChart('c51', 'CPU Usage (%)', '#3b82f6', 40, 15);
        makeEnvChart('c52', 'RAM Usage (%)', '#10b981', 60, 10);
        makeEnvChart('c53', 'Network Traffic', '#8b5cf6', 50, 20);
        makeEnvChart('c54', 'Resource Load', '#f59e0b', 45, 10);

        await new Promise(r => setTimeout(r, 1500));

        const imgs = {};
        cIds.forEach(id => {
            try { imgs[id] = document.getElementById(id).toDataURL('image/png'); } catch(e) { imgs[id] = ''; }
        });

        // Computed metrics
        let totalScore = 0;
        entries.forEach(e => totalScore += getDatasetQualityInfo(e).finalScore);
        let avgQualityPlatform = entries.length ? (totalScore / entries.length).toFixed(1) : 0;
        let activePl = acts['In Progress'] || 0;
        let donePl = acts['Done'] || 0;

        let table4 = '';
        for(let i=0; i<8; i++) {
            let pre = parseFloat(Math.min(100, accs[i] - Math.random()*2).toFixed(1));
            let rec = parseFloat(Math.min(100, accs[i] + Math.random()*2).toFixed(1));
            let f1 = parseFloat(((pre + rec)/2).toFixed(1));
            let up = parseFloat((99.0 + Math.random()*0.9).toFixed(1));
            let stat = errs[i] > 0.8 ? '<span style="color:#dc2626;font-weight:bold">Perlu Perhatian</span>' : '<span style="color:#10b981;font-weight:bold">Baik</span>';
            table4 += `<tr>
                <td>${histDates[i]}</td>
                <td style="color:#3b82f6;font-weight:bold">${mainE.name}</td>
                <td style="color:#d97706;font-weight:bold">${accs[i]}%</td>
                <td style="color:#3b82f6">${pre}%</td>
                <td style="color:#3b82f6">${rec}%</td>
                <td style="color:#3b82f6">${f1}%</td>
                <td>${lats[i]} ms</td>
                <td>${thrpts[i]} req/s</td>
                <td>${errs[i]}%</td>
                <td>${up}%</td>
                <td>${stat}</td>
            </tr>`;
        }

        let table3 = '';
        entries.forEach((e, i) => {
            let eqi = getDatasetQualityInfo(e);
            let rating = eqi.finalScore >= 90 ? '<span style="color:#10b981;font-weight:bold">Excellent</span>' : '<span style="color:#d97706;font-weight:bold">Good</span>';
            let trend = eqi.finalScore >= 90 ? '<span style="color:#10b981">&#9650; +3.3%</span>' : '<span style="color:#dc2626">&#9660; -1.8%</span>';
            table3 += `<tr>
                <td>${i+1}</td>
                <td style="color:#3b82f6;font-weight:bold">${e.name}</td>
                <td>${e.name}.pdf</td>
                <td>${e.date || dateStr}</td>
                <td style="color:#3b82f6">${e.activity || 'In Progress'}</td>
                <td>${e.version || '1.0'}</td>
                <td style="color:#d97706;font-weight:bold">${eqi.finalScore.toFixed(1)}%</td>
                <td style="color:#3b82f6">${Math.floor(Math.random()*500)}.5K</td>
                <td style="color:#dc2626">${Math.floor(Math.random()*10)+1}</td>
                <td>${trend}</td>
                <td>${rating}</td>
            </tr>`;
        });

        let table5 = entries.map((e, i) => {
            let rating = getDatasetQualityInfo(e).finalScore >= 90 ? '<span style="color:#10b981;font-weight:bold">&#11044; Excellent</span>' : '<span style="color:#d97706;font-weight:bold">&#11044; Good</span>';
            return `<tr><td>${i+1}</td><td style="color:#3b82f6;font-weight:bold">${e.name}</td><td style="color:#3b82f6">${e.activity || 'In Progress'}</td><td>${e.version || '1.0'}</td><td>${e.date || dateStr}</td><td style="color:#d97706;font-weight:bold">${getDatasetQualityInfo(e).finalScore.toFixed(1)}%</td><td style="color:#3b82f6">${Math.floor(Math.random()*500)}.5K</td><td>${rating}</td></tr>`;
        }).join('');

        let table6 = entries.map((e, i) => {
            return `<tr><td>${i+1}</td><td style="color:#3b82f6;font-weight:bold">${e.name}</td><td style="color:#dc2626;font-weight:bold">${Math.floor(Math.random()*30)+2} issues</td><td style="color:#dc2626;font-weight:bold">${Math.floor(Math.random()*5)+1} critical</td><td style="color:#d97706;font-weight:bold">&#9888; Active</td><td style="color:#10b981;font-weight:bold">${getDatasetQualityInfo(e).finalScore.toFixed(1)}%</td></tr>`;
        }).join('');

        let comp = (mainQi.criteria.find(c=>c.label==='Completeness')||{val:0}).val.toFixed(1);
        let acc = (mainQi.criteria.find(c=>c.label==='Accuracy')||{val:0}).val.toFixed(1);
        let val = (mainQi.criteria.find(c=>c.label==='Validity')||{val:0}).val.toFixed(1);
        let con = (mainQi.criteria.find(c=>c.label==='Consistency')||{val:0}).val.toFixed(1);
        let time = (mainQi.criteria.find(c=>c.label==='Timeliness')||{val:0}).val.toFixed(1);

        const htmlContent = `
<div id="pdf-container" style="width: 100%; max-width: 800px; margin: 0 auto; font-family: Arial, sans-serif; font-size: 8pt; color: #111; background: #fff; padding: 20px;">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    .header { display: flex; justify-content: space-between; font-size: 7.5pt; color: #555; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px; }
    .sec-title { font-size: 10pt; font-weight: bold; color: #0f172a; border-left: 3px solid #2563eb; padding-left: 6px; margin: 15px 0 10px 0; text-transform: uppercase; }
    .grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
    .card { flex: 1; min-width: 48%; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px; }
    .card-full { width: 100%; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px; margin-bottom: 8px; }
    .c-title { font-size: 8pt; font-weight: bold; margin-bottom: 8px; color: #1e293b; }
    .card img, .card-full img { width: 100%; height: auto; display: block; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 7.5pt; }
    th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; }
    th { background: #f8fafc; font-weight: bold; color: #0f172a; }
    .page-break { page-break-before: always; height: 10px; }
    .title-main { text-align: center; font-size: 16pt; font-weight: bold; margin: 5px 0; }
    .title-sub { text-align: center; font-size: 10pt; font-weight: bold; margin-bottom: 15px; }
    .info-box { border: 1px solid #cbd5e1; padding: 8px; border-radius: 4px; margin-bottom: 15px; display: flex; flex-wrap: wrap; gap: 10px; }
    .info-box div { width: 45%; }
    .kpi-row { display: flex; gap: 8px; margin-bottom: 8px; }
    .kpi-card { flex: 1; border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px 5px; text-align: center; }
    .kpi-val { font-size: 14pt; font-weight: bold; margin-bottom: 3px; }
    .kpi-lbl { font-size: 6.5pt; color: #64748b; text-transform: uppercase; }
  </style>

  <div class="header">
    <span>${dateStr}, ${timeStr}</span>
    <span>Laporan Komprehensif Data Quality &mdash; Insight Platform</span>
    <span>Dataset: ${mainE.name}</span>
  </div>

  <div style="text-align:center; font-size:7pt; font-weight:bold; letter-spacing:1px; color:#333;">INSIGHT DATA QUALITY PLATFORM &bull; LAPORAN KOMPREHENSIF</div>
  <div class="title-main">LAPORAN DATA QUALITY &amp; PIPELINE</div>
  <div class="title-sub">${mainE.name}</div>

  <div class="info-box">
    <div>ID Dataset: <strong>DS-${mainE.id || '001'}</strong> &bull; Tanggal Cetak: <strong>${dateStr}, ${timeStr}</strong> &bull; Dicetak Oleh: <strong>${printBy}</strong></div>
    <div>Email: <strong>${email}</strong> &bull; Total Data Source Platform: <strong>${entries.length}</strong></div>
  </div>

  <div class="kpi-row">
    <div class="kpi-card"><div class="kpi-val" style="color:#d97706">${avgQualityPlatform}%</div><div class="kpi-lbl">AVG. QUALITY PLATFORM</div></div>
    <div class="kpi-card"><div class="kpi-val" style="color:#2563eb">${entries.length}</div><div class="kpi-lbl">TOTAL DATA SOURCES</div></div>
    <div class="kpi-card"><div class="kpi-val" style="color:#2563eb">${activePl}</div><div class="kpi-lbl">ACTIVE PIPELINES</div></div>
    <div class="kpi-card"><div class="kpi-val" style="color:#059669">${donePl}</div><div class="kpi-lbl">DONE PIPELINES</div></div>
    <div class="kpi-card"><div class="kpi-val" style="color:#10b981">3</div><div class="kpi-lbl">ALERTS RESOLVED</div></div>
  </div>
  <div class="kpi-row">
    <div class="kpi-card"><div class="kpi-val" style="color:#d97706">${mainQi.finalScore.toFixed(1)}%</div><div class="kpi-lbl">SCORE DATASET INI</div></div>
    <div class="kpi-card"><div class="kpi-val" style="color:#3b82f6">544.5K</div><div class="kpi-lbl">TOTAL RECORDS (ALL)</div></div>
    <div class="kpi-card"><div class="kpi-val" style="color:#dc2626">37</div><div class="kpi-lbl">TOTAL ISSUES PLATFORM</div></div>
    <div class="kpi-card"><div class="kpi-val" style="color:#dc2626">8</div><div class="kpi-lbl">CRITICAL ISSUES</div></div>
    <div class="kpi-card"><div class="kpi-val" style="color:#10b981">&#9650; +3.3%</div><div class="kpi-lbl">QUALITY TREND</div></div>
  </div>

  <div class="sec-title">1. IDENTITAS DATASET</div>
  <table>
    <tr><td style="width:15%; font-weight:bold; background:#f8fafc;">File Name</td><td>${mainE.name}.pdf</td><td style="width:15%; font-weight:bold; background:#f8fafc;">File Type</td><td>application/pdf</td></tr>
    <tr><td style="font-weight:bold; background:#f8fafc;">Nama Dataset</td><td style="color:#3b82f6">${mainE.name}</td><td style="font-weight:bold; background:#f8fafc;">Versi</td><td>1.0</td></tr>
    <tr><td style="font-weight:bold; background:#f8fafc;">Tanggal Dibuat</td><td>${mainE.date || dateStr}</td><td style="font-weight:bold; background:#f8fafc;">Disubmit Pada</td><td>${dateStr}</td></tr>
    <tr><td style="font-weight:bold; background:#f8fafc;">Status / Activity</td><td style="color:#3b82f6">${mainE.activity || 'In Progress'}</td><td style="font-weight:bold; background:#f8fafc;">Quality Score</td><td style="color:#d97706; font-weight:bold;">${mainQi.finalScore.toFixed(1)}% &#11044; Good</td></tr>
  </table>

  <div class="sec-title">2. RINGKASAN KUALITAS &mdash; DATASET INI</div>
  <table>
    <tr><th>Dimensi Kualitas</th><th>Skor</th><th>Status</th><th>Dimensi Kualitas</th><th>Skor</th><th>Status</th></tr>
    <tr><td style="font-weight:bold">Overall Score</td><td style="color:#d97706; font-weight:bold;">${mainQi.finalScore.toFixed(1)}%</td><td style="color:#d97706; font-weight:bold;">&#11044; Good</td><td style="font-weight:bold">Pipeline Status</td><td style="color:#3b82f6">${mainE.activity || 'In Progress'}</td><td></td></tr>
    <tr><td style="font-weight:bold">Completeness</td><td style="color:#d97706">${comp}%</td><td style="color:#d97706">&#11044; Good</td><td style="font-weight:bold">Accuracy</td><td style="color:#d97706">${acc}%</td><td style="color:#d97706">&#11044; Good</td></tr>
    <tr><td style="font-weight:bold">Validity</td><td style="color:#d97706">${val}%</td><td style="color:#d97706">&#11044; Good</td><td style="font-weight:bold">Consistency</td><td style="color:#d97706">${con}%</td><td style="color:#d97706">&#11044; Good</td></tr>
    <tr><td style="font-weight:bold">Timeliness</td><td style="color:#d97706">${time}%</td><td style="color:#d97706">&#11044; Good</td><td style="font-weight:bold">Quality Trend</td><td style="color:#10b981">&#9650; +3.3%</td><td></td></tr>
    <tr><td style="font-weight:bold">Issues Ditemukan</td><td style="color:#dc2626; font-weight:bold;">4</td><td></td><td style="font-weight:bold">Critical Issues</td><td style="color:#dc2626; font-weight:bold;">2</td><td></td></tr>
    <tr><td style="font-weight:bold">Total Records</td><td style="color:#3b82f6">121.5K</td><td></td><td style="font-weight:bold">Pipeline Records</td><td style="color:#3b82f6">25.7K</td><td></td></tr>
  </table>

  <div class="sec-title">3. RINGKASAN PLATFORM &mdash; SEMUA DATA SOURCE</div>
  <table>
    <tr><th>#</th><th>Nama Dataset</th><th>File</th><th>Tanggal</th><th>Status</th><th>Versi</th><th>Quality Score</th><th>Records</th><th>Issues</th><th>Trend</th><th>Rating</th></tr>
    ${table3}
  </table>

  <div class="page-break"></div>
  <div class="header">
    <span>${dateStr}, ${timeStr}</span>
    <span>Laporan Komprehensif - ${mainE.name} | Insight Platform</span>
    <span>Halaman 2</span>
  </div>

  <div class="card-full">
    <div class="c-title">Grafik 3.1 &mdash; Distribusi Quality Score Semua Dataset</div>
    <img src="${imgs['c31']}">
  </div>
  <div class="grid">
    <div class="card"><div class="c-title">Grafik 3.2 &mdash; Distribusi Activity Status</div><img src="${imgs['c32']}"></div>
    <div class="card"><div class="c-title">Grafik 3.3 &mdash; Quality Criteria Breakdown</div><img src="${imgs['c33']}"></div>
  </div>

  <div class="page-break"></div>
  <div class="header">
    <span>${dateStr}, ${timeStr}</span>
    <span>Laporan Komprehensif - ${mainE.name} | Insight Platform</span>
    <span>Halaman 3</span>
  </div>

  <div class="sec-title">4. ANALISIS PERFORMA KUALITAS &mdash; ${mainE.name}</div>
  <div class="grid">
    <div class="card"><div class="c-title">Grafik 4.1 &mdash; Skor Per Dimensi</div><img src="${imgs['c41']}"></div>
    <div class="card"><div class="c-title">Grafik 4.2 &mdash; Tren Akurasi (8 titik)</div><img src="${imgs['c42']}"></div>
    <div class="card"><div class="c-title">Grafik 4.3 &mdash; Error Rate</div><img src="${imgs['c43']}"></div>
    <div class="card"><div class="c-title">Grafik 4.4 &mdash; Throughput (req/s)</div><img src="${imgs['c44']}"></div>
    <div class="card"><div class="c-title">Grafik 4.5 &mdash; Latency (ms)</div><img src="${imgs['c45']}"></div>
    <div class="card"><div class="c-title">Grafik 4.6 &mdash; Distribusi Status</div><img src="${imgs['c46']}"></div>
  </div>

  <div class="sec-title">DATA PERFORMANCE MONITORING &mdash; ${mainE.name}</div>
  <table>
    <tr><th>Tanggal</th><th>Nama Dataset</th><th>Akurasi</th><th>Presisi</th><th>Recall</th><th>F1</th><th>Latency</th><th>Throughput</th><th>Error Rate</th><th>Uptime</th><th>Status</th></tr>
    ${table4}
  </table>

  <div class="page-break"></div>
  <div class="header">
    <span>${dateStr}, ${timeStr}</span>
    <span>Laporan Komprehensif - ${mainE.name} | Insight Platform</span>
    <span>Halaman 4</span>
  </div>

  <div class="sec-title">5. PIPELINE MONITORING &mdash; SEMUA PIPELINE</div>
  <table>
    <tr><th>#</th><th>Nama Pipeline</th><th>Status</th><th>Versi</th><th>Tanggal</th><th>Accuracy</th><th>Records</th><th>Rating</th></tr>
    ${table5}
  </table>

  <div class="sec-title">6. RINGKASAN ALERTS &amp; ISSUES</div>
  <div style="border:1px solid #cbd5e1; border-radius:4px; padding:8px; margin-bottom:10px;">
    <strong>Status Keseluruhan:</strong> <span style="color:#10b981">&#9989; Kualitas platform secara keseluruhan BAIK. Lanjutkan pemantauan rutin.</span><br>
    <strong>Total Issues Platform:</strong> 37 &bull; <strong>Critical Issues:</strong> 8 &bull; <strong>Alerts Resolved:</strong> 3
  </div>
  <table>
    <tr><th>#</th><th>Dataset</th><th>Issues</th><th>Critical</th><th>Alert Status</th><th>Quality</th></tr>
    ${table6}
  </table>

  <div class="sec-title">7. METRIK KESEHATAN PIPELINE &mdash; ${mainE.name}</div>
  <table>
    <tr><th>Metrik</th><th>Skor</th><th>Status</th><th>Keterangan</th></tr>
    <tr><td style="font-weight:bold">Completeness</td><td style="color:#d97706">${comp}%</td><td style="color:#d97706">&#11044; Good</td><td>Kelengkapan data dalam pipeline</td></tr>
    <tr><td style="font-weight:bold">Accuracy</td><td style="color:#d97706">${acc}%</td><td style="color:#d97706">&#11044; Good</td><td>Keakuratan nilai data</td></tr>
    <tr><td style="font-weight:bold">Validity</td><td style="color:#d97706">${val}%</td><td style="color:#d97706">&#11044; Good</td><td>Validitas format dan aturan bisnis</td></tr>
    <tr><td style="font-weight:bold">Consistency</td><td style="color:#d97706">${con}%</td><td style="color:#d97706">&#11044; Good</td><td>Konsistensi antar sumber data</td></tr>
    <tr><td style="font-weight:bold">Timeliness</td><td style="color:#d97706">${time}%</td><td style="color:#d97706">&#11044; Good</td><td>Ketepatan waktu pembaruan data</td></tr>
    <tr><td style="font-weight:bold">Overall Score</td><td style="color:#d97706; font-weight:bold">${mainQi.finalScore.toFixed(1)}%</td><td style="color:#d97706; font-weight:bold">&#11044; Good</td><td>Rata-rata skor keseluruhan</td></tr>
  </table>

  <div class="sec-title">8. REKOMENDASI</div>
  <div style="border:1px solid #cbd5e1; border-radius:4px; padding:8px; margin-bottom:10px;">
    <strong>Rekomendasi Platform:</strong> <span style="color:#10b981">&#9989; Kualitas platform secara keseluruhan BAIK. Lanjutkan pemantauan rutin.</span>
  </div>
  <table style="margin-bottom:10px">
    <tr><th style="width:5%">#</th><th>Rekomendasi untuk Dataset: ${mainE.name}</th></tr>
    <tr><td>1.</td><td>Tinjau aturan validasi data untuk meningkatkan akurasi lebih lanjut.</td></tr>
    <tr><td>2.</td><td>Selidiki sumber ketidakkonsistenan dalam subset data yang bermasalah.</td></tr>
    <tr><td>3.</td><td>Tingkatkan frekuensi monitoring menjadi mingguan untuk pipeline ini.</td></tr>
    <tr><td>4.</td><td>Aktifkan auto-alert untuk deteksi dini anomali kualitas data.</td></tr>
  </table>
  <table>
    <tr><th>#</th><th>Nama Dataset</th><th>Score</th><th>Issues</th><th>Prioritas Tindakan</th></tr>
    <tr><td colspan="5" style="text-align:center; color:#10b981; font-weight:bold; background:#f0fdf4">&#9989; Semua dataset dalam kondisi baik!</td></tr>
  </table>

  <div class="page-break"></div>
  <div class="header">
    <span>${dateStr}, ${timeStr}</span>
    <span>Laporan Komprehensif - ${mainE.name} | Insight Platform</span>
    <span>Halaman 5</span>
  </div>

  <div class="sec-title">9. ENVIRONMENT &amp; RESOURCE DASHBOARD</div>
  <div class="grid">
    <div class="card"><div class="c-title">Grafik 5.1 &mdash; CPU Usage</div><img src="${imgs['c51']}"></div>
    <div class="card"><div class="c-title">Grafik 5.2 &mdash; RAM Usage</div><img src="${imgs['c52']}"></div>
    <div class="card"><div class="c-title">Grafik 5.3 &mdash; Network Traffic</div><img src="${imgs['c53']}"></div>
    <div class="card"><div class="c-title">Grafik 5.4 &mdash; Resource Load</div><img src="${imgs['c54']}"></div>
  </div>

</div>`;

        setTimeout(() => {
            if(document.body.contains(hiddenWrapper)) document.body.removeChild(hiddenWrapper);
            if(document.body.contains(overlay)) document.body.removeChild(overlay);
            
            // Wrap in a div with explicit white background to prevent JPEG black-transparency issue
            const pdfSource = `<div style="background-color: #ffffff; padding: 20px; color: #000000;">${htmlContent}</div>`;
            
            html2pdf().set({
                margin: 10,
                filename: mainE.name + '_DataQuality.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).from(pdfSource).outputPdf('blob').then(function(pdfBlob) {
                window.savePdfToDB(mainE.name + "_DataQuality.pdf", 'Data Quality', '2.5 MB', pdfBlob);
            }).catch(err => {
                alert("Error generating PDF: " + err.message);
            });
        }, 500);

    } catch(err) {
        if(document.body.contains(hiddenWrapper)) document.body.removeChild(hiddenWrapper);
        if(document.body.contains(overlay)) document.body.removeChild(overlay);
        alert("Error: " + err.message);
    }
};

// =============================================
// DATA ENTRY WIZARD (add-data-view)
    // =============================================


    let deCurrentStep = 1;
    let deFileData = null;

    function resetDataEntryWizard() {
        deCurrentStep = 1;
        deFileData = null;

        const fileInput = document.getElementById('de-file-input');
        if (fileInput) fileInput.value = '';
        ['de-date','de-name','de-version','de-description','de-notes'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const actSel = document.getElementById('de-activity');
        if (actSel) actSel.value = '';

        setFilePreview(null);

        const scanResult = document.getElementById('de-scan-result');
        if (scanResult) scanResult.style.display = 'none';

        [1,2,3,4].forEach(n => {
            const card = document.getElementById('de-step-' + n);
            if (card) card.style.display = n === 1 ? 'block' : 'none';
        });

        updateStepper(1);
    }

    function updateStepper(step) {
        deCurrentStep = step;
        for (let i = 1; i <= 4; i++) {
            const stepEl = document.querySelector(`.de-step[data-step="${i}"]`);
            if (!stepEl) continue;
            stepEl.classList.remove('active', 'completed');
            if (i < step) stepEl.classList.add('completed');
            else if (i === step) stepEl.classList.add('active');

            const lineEl = document.getElementById('de-line-' + i);
            if (lineEl) lineEl.classList.toggle('active', i < step);
        }
    }

    function showStep(n) {
        [1,2,3,4].forEach(i => {
            const card = document.getElementById('de-step-' + i);
            if (card) card.style.display = i === n ? 'block' : 'none';
        });
        updateStepper(n);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function setFilePreview(fileObj) {
        const previewEl = document.getElementById('de-file-preview');
        const imgWrap   = document.getElementById('de-preview-img-wrap');
        const nameEl    = document.getElementById('de-file-name');

        if (!fileObj) {
            if (previewEl) previewEl.style.display = 'none';
            if (imgWrap)   imgWrap.innerHTML = '';
            if (nameEl)    nameEl.textContent = '';
            return;
        }

        if (previewEl) previewEl.style.display = 'flex';
        if (nameEl)    nameEl.textContent = fileObj.name;

        if (imgWrap) {
            if (fileObj.isImage && fileObj.dataUrl) {
                imgWrap.innerHTML = `<img src="${fileObj.dataUrl}" alt="preview">`;
            } else {
                const ext = fileObj.name.split('.').pop().toUpperCase().slice(0,4);
                imgWrap.innerHTML = `<div class="de-file-icon">${ext}</div>`;
            }
        }
    }

    function simulateImageScan(file) {
        const now = new Date();
        const kb  = (file.size / 1024).toFixed(1);
        const scanDetails = document.getElementById('de-scan-details');
        const scanResult  = document.getElementById('de-scan-result');

        const items = [
            { key: 'File Name',  val: file.name },
            { key: 'Type',       val: file.type || 'Unknown' },
            { key: 'Size',       val: kb + ' KB' },
            { key: 'Scanned',    val: now.toLocaleTimeString() },
            { key: 'Resolution', val: 'Detected' },
            { key: 'Quality',    val: Math.floor(Math.random() * 15 + 85) + '%' },
        ];

        if (scanDetails) {
            scanDetails.innerHTML = items.map(item => `
                <div class="de-scan-item">
                    <div class="de-scan-key">${item.key}</div>
                    <div class="de-scan-val">${item.val}</div>
                </div>
            `).join('');
        }
        if (scanResult) scanResult.style.display = 'block';
    }

    function processFile(file) {
        const isImage = file.type.startsWith('image/');
        const reader  = new FileReader();
        reader.onload = (ev) => {
            deFileData = { name: file.name, type: file.type, size: file.size, dataUrl: ev.target.result, isImage, rawFile: file };
            setFilePreview(deFileData);
            if (isImage) simulateImageScan(file);
            else {
                const scanResult = document.getElementById('de-scan-result');
                if (scanResult) scanResult.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    }

    // Upload zone
    const deUploadZone = document.getElementById('de-upload-zone');
    const deFileInput  = document.getElementById('de-file-input');
    if (deUploadZone && deFileInput) {
        deUploadZone.addEventListener('click', (e) => {
            if (e.target.closest('#de-remove-file')) return;
            deFileInput.click();
        });
        deUploadZone.addEventListener('dragover', (e) => { e.preventDefault(); deUploadZone.classList.add('dragover'); });
        deUploadZone.addEventListener('dragleave', () => deUploadZone.classList.remove('dragover'));
        deUploadZone.addEventListener('drop', (e) => {
            e.preventDefault(); deUploadZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) processFile(file);
        });
        deFileInput.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) processFile(f); });
    }

    const deRemoveFile = document.getElementById('de-remove-file');
    if (deRemoveFile) {
        deRemoveFile.addEventListener('click', (e) => {
            e.stopPropagation(); deFileData = null;
            if (deFileInput) deFileInput.value = '';
            setFilePreview(null);
            const sr = document.getElementById('de-scan-result');
            if (sr) sr.style.display = 'none';
        });
    }

    // Step 1 → 2
    const btnNext1 = document.getElementById('de-btn-next-1');
    if (btnNext1) {
        btnNext1.addEventListener('click', () => {
            showStep(2);
            const dateInput = document.getElementById('de-date');
            if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().split('T')[0];
            const nameInput = document.getElementById('de-name');
            if (nameInput && !nameInput.value && currentUser) nameInput.value = currentUser.username;
        });
    }

    const btnPrev2 = document.getElementById('de-btn-prev-2');
    if (btnPrev2) btnPrev2.addEventListener('click', () => showStep(1));

    const btnNext2 = document.getElementById('de-btn-next-2');
    if (btnNext2) {
        btnNext2.addEventListener('click', () => {
            const name     = document.getElementById('de-name').value.trim();
            const activity = document.getElementById('de-activity').value;
            if (!name)     { alert('Please enter your name.'); return; }
            if (!activity) { alert('Please select an activity status.'); return; }
            showStep(3);
        });
    }

    const btnPrev3 = document.getElementById('de-btn-prev-3');
    if (btnPrev3) btnPrev3.addEventListener('click', () => showStep(2));

    const btnSubmit = document.getElementById('de-btn-submit');
    if (btnSubmit) btnSubmit.addEventListener('click', submitDataEntry);

    function submitDataEntry() {
        try {
            const date        = document.getElementById('de-date').value;
            const name        = document.getElementById('de-name').value.trim();
            const activity    = document.getElementById('de-activity').value;
            const version     = document.getElementById('de-version').value.trim();
            const description = document.getElementById('de-description').value.trim();
            const notes       = document.getElementById('de-notes').value.trim();

            const newEntryId = Date.now();
            const score = calculateQualityScore({ file: deFileData, date, name, activity, version, description, notes }, newEntryId);

            if (currentUser) {
                // Ensure dataEntries array exists
                if (!currentUser.dataEntries) currentUser.dataEntries = [];

                // Build new entry
                const newEntry = {
                    id: newEntryId,
                    date, name, activity, version, description, notes,
                    fileName:    deFileData ? deFileData.name    : null,
                    fileType:    deFileData ? deFileData.type    : null,
                    hasImage:    deFileData ? deFileData.isImage : false,
                    fileDataUrl: deFileData ? deFileData.dataUrl : null,
                    qualityScore: score.rawScore,
                    submittedAt: new Date().toISOString()
                };

                currentUser.dataEntries.push(newEntry);
                // Save immediately to the per-user scoped key (isolated from all other users)
                saveScopedEntries(currentUser.email, currentUser.dataEntries);
                
                // Django API POST via FormData
                const formData = new FormData();
                formData.append('name', name || 'Untitled');
                if (deFileData && deFileData.rawFile) {
                    formData.append('pdf_file', deFileData.rawFile);
                    formData.append('file_name', deFileData.name);
                    formData.append('file_type', deFileData.type);
                }
                formData.append('activity', activity || 'todo');
                formData.append('version', version || '1.0');
                formData.append('description', description || '');
                formData.append('notes', notes || '');
                formData.append('quality_score', score.rawScore || 0);
                formData.append('user_email', (currentUser && currentUser.email) ? currentUser.email : '');

                fetch((window.API_BASE || '/api') + '/datasets/', {
                    method: 'POST',
                    body: formData
                }).then(r=>r.json()).then(data => {
                    if (window.apiSyncEntries) window.apiSyncEntries();
                }).catch(e => console.error(e));

                // Recalculate stats from actual entries
                const allEntries = currentUser.dataEntries;
                currentUser.dataSources    = allEntries.length;
                currentUser.activeProjects = allEntries.filter(e => e.activity === 'in-progress').length;
                const totalAcc = allEntries.reduce((s, e) => s + window.getDatasetQualityInfo(e).finalScore, 0);
                currentUser.qualityScore = allEntries.length > 0
                    ? (totalAcc / allEntries.length).toFixed(1).replace(/\.0$/, '') + '%'
                    : '0%';

                // Save stats to session (but NOT dataEntries - those are in the scoped key)
                const sessionSnapshot = Object.assign({}, currentUser);
                delete sessionSnapshot.dataEntries; // never persist entries in shared session
                try {
                    localStorage.setItem('insight_session_v2', JSON.stringify(sessionSnapshot));
                } catch(e) {
                    console.error("Failed to save session stats due to quota", e);
                }

                // Re-read currentUser from storage to ensure it's fresh
                refreshCurrentUserFromStorage();
                if(window.addNotification) window.addNotification("Data Uploaded", "A new dataset was manually uploaded: " + (name || 'Untitled'), "success");
            }

            renderSuccessStep(score, { date, name, activity, version, description, notes });
            showStep(4);
        } catch (e) {
            alert("Terjadi kesalahan pada Submit: " + e.message + "\n  try {\nMohon laporkan pesan ini kepada developer.");
            console.error("Submit Error:", e);
        }
    }

    function calculateQualityScore({ file, date, name, activity, version, description, notes }, entryId) {
        const baseVal = (file ? 25 : 0) + ((file && file.isImage) ? 15 : (file ? 7 : 0)) +
                        (date ? 15 : 0) + (name ? 15 : 0) + (activity ? 15 : 0) +
                        ((description ? 7.5 : 0) + (notes ? 4.5 : 0) + (version ? 3 : 0));
        const rawScore = Math.min(100, Math.round(baseVal));
        
        const info = window.getDatasetQualityInfo({ id: entryId || Date.now(), qualityScore: rawScore });
        return { total: info.finalScore, criteria: info.criteria, rawScore: rawScore };
    }

    function activityLabel(val) {
        const map = { 'todo': 'Ã¢Â¬Â¤ To Do', 'in-progress': 'Ã¢Â¬Â¤ In Progress', 'in-review': 'Ã¢Â¬Â¤ In Review', 'done': 'Ã¢Â¬Â¤ Done' };
        return map[val] || val;
    }

    function renderSuccessStep(score, data) {
        const ring  = document.getElementById('de-ring-fill');
        const pctEl = document.getElementById('de-ring-pct');
        if (ring && pctEl) {
            setTimeout(() => {
                ring.style.strokeDashoffset = 314 - (score.total / 100) * 314;
                pctEl.textContent = score.total + '%';
            }, 200);
        }

        const breakdownEl = document.getElementById('de-quality-breakdown');
        if (breakdownEl) {
            breakdownEl.innerHTML = score.criteria.map(c => `
                <div class="de-qb-row">
                    <span class="de-qb-label">${c.label}</span>
                    <div class="de-qb-bar-wrap"><div class="de-qb-bar" style="width:0%" data-target="${c.val}%"></div></div>
                    <span class="de-qb-val">${c.val}%</span>
                </div>
            `).join('');
            setTimeout(() => {
                breakdownEl.querySelectorAll('.de-qb-bar').forEach(bar => { bar.style.width = bar.dataset.target; });
            }, 300);
        }

        const summaryGrid = document.getElementById('de-summary-grid');
        if (summaryGrid) {
            const rows = [
                ['File',     deFileData ? deFileData.name : 'None'],
                ['Date',     data.date     || '-'],
                ['Name',     data.name     || '-'],
                ['Activity', activityLabel(data.activity)],
                ['Version',  data.version  || '-'],
                ['Quality',  score.total + '%'],
            ];
            summaryGrid.innerHTML = rows.map(([k, v]) => `
                <div class="de-summary-row">
                    <span class="de-summary-key">${k}</span>
                    <span class="de-summary-val">${v}</span>
                </div>
            `).join('');
        }
    }

    // Step 4 buttons
    const btnAddMore = document.getElementById('de-btn-add-more');
    if (btnAddMore) {
        btnAddMore.addEventListener('click', () => resetDataEntryWizard());
    }

    // "Kembali ke Data Entry" button â€“ picked up by link-to-data-entry delegation above
});

// =============================================
// RENDER: DATA QUALITY DASHBOARD
// =============================================
window.renderDataQuality = function renderDataQuality() {
    const entries = (currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];

    // â”€â”€ Source badge colors (deterministic by index) â”€â”€
    const badgePalettes = [
        { color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)' },  // green
        { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)' },  // blue
        { color: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.3)' },// purple
        { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)' },  // yellow
        { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },// red
        { color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)', border: 'rgba(45,212,191,0.3)' },  // teal
    ];

    // â”€â”€ Seeded RNG for deterministic quality metrics â”€â”€
    function seededRand(seed, min, max) {
        let x = Math.sin(seed * 9301 + 49297) * 233280;
        return min + (x - Math.floor(x)) * (max - min);
    }

    // â”€â”€ Summary stats â”€â”€
    const total = entries.length;
    let totalAcc = 0;
    let totalRecordsNum = 0;
    let totalIssues = 0;

    entries.forEach((e, i) => {
        const seed = e.id || (i + 1);
        const resolved = currentUser && currentUser.resolvedAlerts && currentUser.resolvedAlerts.includes('dq-' + seed);
        
        totalAcc += window.getDatasetQualityInfo(e).finalScore;
        const pName = e.name || e.sourceName || '';
        const recordsForEntry = Math.round(seededRand(seed, 5000, 1250000));
        totalRecordsNum += recordsForEntry;
        totalIssues += resolved ? 0 : Math.round(seededRand(seed * 3, 0, 67));
    });

    const avgAcc = total > 0 ? (totalAcc / total).toFixed(1).replace(/\.0$/, '') : 0;
    const recordsFormatted = totalRecordsNum >= 1000000
        ? (totalRecordsNum / 1000000).toFixed(1) + 'M'
        : totalRecordsNum >= 1000
            ? (totalRecordsNum / 1000).toFixed(1) + 'K'
            : totalRecordsNum;

    const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setEl('dq-stat-total', total);
    setEl('dq-stat-avg', avgAcc + '%');
    setEl('dq-stat-records', recordsFormatted);
    setEl('dq-stat-issues', totalIssues);

    // â”€â”€ Table body â”€â”€
    const tbody = document.getElementById('dq-table-body');
    const emptyState = document.getElementById('dq-empty-state');

    if (!tbody) return;

    if (total === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = entries.map((entry, i) => {
        const idx = i % badgePalettes.length;
        const palette = badgePalettes[idx];
        const pName = entry.name || entry.sourceName || 'Dataset';
        const qi = window.getDatasetQualityInfo(entry);
        const finalScore = qi.finalScore;
        const seed = entry.id || (i + 1);

        // Derived per-entry deterministic values
        const records = Math.round(seededRand(seed, 5000, 1250000));
        const resolved = currentUser && currentUser.resolvedAlerts && currentUser.resolvedAlerts.includes('dq-' + seed);
        
        const issues = resolved ? 0 : Math.round(seededRand(seed * 3, 0, 67));
        const criticalCount = resolved ? 0 : Math.round(seededRand(seed * 7, 0, Math.min(issues, 9)));
        
        const trendVal = seededRand(seed * 11, -2.5, 4.5).toFixed(1);
        const trendUp = parseFloat(trendVal) >= 0;
        const recordsFmt = records >= 1000000
            ? (records / 1000000).toFixed(1) + 'M'
            : records >= 1000
                ? (records / 1000).toFixed(0) + ',' + String(records % 1000).padStart(3, '0')
                : records;

        // Quality bars: derived from central criteria
        const completeness = qi.criteria.find(c=>c.label==='Completeness').val.toFixed(0);
        const accuracy     = qi.criteria.find(c=>c.label==='Accuracy').val.toFixed(0);
        const validity     = qi.criteria.find(c=>c.label==='Validity').val.toFixed(0);

        // Score color
        let scoreColor = '#34d399';
        if (finalScore < 93) scoreColor = '#fbbf24';
        if (finalScore < 85) scoreColor = '#f87171';

        // Source label: use activity or a short snippet of sourceName/description
        const sourceLabel = entry.activity
            ? entry.activity.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            : (entry.description ? entry.description.split(' ').slice(0, 2).join(' ') : 'Source');

        // Time ago label
        let timeAgo = 'just now';
        if (entry.submittedAt) {
            const diff = Math.floor((Date.now() - new Date(entry.submittedAt)) / 60000);
            if (diff < 1) timeAgo = 'just now';
            else if (diff < 60) timeAgo = diff + ' minutes ago';
            else if (diff < 1440) timeAgo = Math.floor(diff / 60) + ' hours ago';
            else timeAgo = Math.floor(diff / 1440) + ' days ago';
        }

        const chartId = 'dq-mini-chart-' + seed;

        return `
        <div class="dq-row" data-id="${entry.id || i}">
            <div class="dq-row-main">
                <div class="dq-cell-name">
                    <div class="dq-ds-icon">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 6h-2.18c.07-.44.18-.88.18-1.36 0-2.54-2.05-4.64-4.6-4.64-1.32 0-2.52.54-3.4 1.4A4.62 4.62 0 0 0 6.6 0 4.6 4.6 0 0 0 2 4.64c0 .48.11.92.18 1.36H0v16h20V6zm-9.8-3.88C10.7 1.44 11.33 1 12 1c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2c0-.34.1-.66.2-.88zM6.6 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-4.6 18V8h8v12H2zm10 0V8h8v12h-8z"/></svg>
                    </div>
                    <div class="dq-name-info">
                        <strong>${pName}</strong>
                        <span class="dq-name-time">
                            <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
                            ${timeAgo}
                        </span>
                    </div>
                </div>
                <div>
                    <span class="dq-source-badge" style="color:${palette.color}; background:${palette.bg}; border-color:${palette.border};">${sourceLabel}</span>
                </div>
                <div class="dq-quality-cell">
                    <span class="dq-score-value" style="color:${scoreColor};">${finalScore.toFixed(1)}%</span>
                    <span class="dq-score-trend ${trendUp ? 'up' : 'down'}">${trendUp ? 'â†‘ +' : 'â†“ '}${trendVal}%</span>
                </div>
                <div class="dq-issues-cell">
                    <span class="dq-issues-count ${criticalCount === 0 ? 'dq-issues-ok' : ''}">
                        ${criticalCount === 0
                            ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
                            : '<svg viewBox="0 0 24 24" width="14" height="14" fill="#f87171"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>'
                        } ${issues}
                    </span>
                    ${criticalCount > 0 ? '<span class="dq-issues-critical">' + criticalCount + ' Critical</span>' : ''}
                </div>
                <div class="dq-records-cell">${recordsFmt}</div>
                <button class="dq-analyze-btn" onclick="window.showDataQualityAnalyze(${entry.id || i})">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 9h-2V7h-2v5H6v2h2v5h2v-5h2v-2zM21 9v6h-2v-6h2z"/></svg>
                    Analyze
                </button>
            </div>
            <div class="dq-quality-expand">
                <div class="dq-expand-inner">
                    <div class="dq-metric-bar-group">
                        <div class="dq-metric-bar-label"><span>Completeness</span><span>${completeness}%</span></div>
                        <div class="dq-metric-bar-track"><div class="dq-metric-bar-fill dq-fill-blue" style="width:${completeness}%"></div></div>
                    </div>
                    <div class="dq-metric-bar-group">
                        <div class="dq-metric-bar-label"><span>Accuracy</span><span>${accuracy}%</span></div>
                        <div class="dq-metric-bar-track"><div class="dq-metric-bar-fill dq-fill-pink" style="width:${accuracy}%"></div></div>
                    </div>
                    <div class="dq-metric-bar-group">
                        <div class="dq-metric-bar-label"><span>Validity</span><span>${validity}%</span></div>
                        <div class="dq-metric-bar-track"><div class="dq-metric-bar-fill dq-fill-green" style="width:${validity}%"></div></div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    // â”€â”€ Click-to-expand rows â”€â”€
    tbody.querySelectorAll('.dq-row').forEach(row => {
        row.addEventListener('mouseenter', () => row.classList.add('expanded'));
        row.addEventListener('mouseleave', () => row.classList.remove('expanded'));
    });

    // â”€â”€ Live search â”€â”€
    const searchEl = document.getElementById('dq-search-input');
    if (searchEl) {
        searchEl.value = '';
        searchEl.oninput = () => {
            const q = searchEl.value.toLowerCase().trim();
            tbody.querySelectorAll('.dq-row').forEach(row => {
                const name = (row.querySelector('.dq-name-info strong') || {}).textContent || '';
                const src  = (row.querySelector('.dq-source-badge') || {}).textContent || '';
                row.style.display = (!q || name.toLowerCase().includes(q) || src.toLowerCase().includes(q)) ? '' : 'none';
            });
        };
    }
};

// =============================================
// RENDER: DATA QUALITY ANALYZE VIEW
// =============================================
let dqaCharts = {};
window.currentDqaEntryId = null;

window.showDataQualityAnalyze = function(id) {
    window.currentDqaEntryId = id;
    navigateTo('data-quality-analyze-view');
};

window.renderDataQualityAnalyze = function() {
    if (!window.Chart) { console.warn('Chart.js not loaded'); return; }

    const entries = (currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
    const entryIdx = entries.findIndex(e => e.id === window.currentDqaEntryId);
    const i = entryIdx >= 0 ? entryIdx : 0;
    const entry = entries[i];
    if (!entry) return;

    const score = window.getDatasetQualityInfo(entry).finalScore;
    // â”€â”€ Use EXACT SAME seeded RNG as renderDataQuality â”€â”€
    // This is a pure function: same seed â†’ always same output, no state
    function seededRand(seed, min, max) {
        let x = Math.sin(seed * 9301 + 49297) * 233280;
        return min + (x - Math.floor(x)) * (max - min);
    }
    const seed = entry.id || (i + 1);
    const resolved = currentUser && currentUser.resolvedAlerts && currentUser.resolvedAlerts.includes('dq-' + seed);
    const finalScore = resolved ? Math.max(98, score) : score;

    // â”€â”€ SAME VALUES as shown in the dashboard table â”€â”€
    const completeness  = Math.min(100, finalScore + seededRand(seed * 2, -2, 2)).toFixed(1);
    const accuracy      = finalScore.toFixed(1);
    const validity      = Math.min(100, finalScore + seededRand(seed * 8, -4, 4)).toFixed(1);
    const records       = Math.round(seededRand(seed, 5000, 1250000));
    const issues        = resolved ? 0 : Math.round(seededRand(seed * 3, 0, 67));
    const criticalCount = resolved ? 0 : Math.round(seededRand(seed * 7, 0, Math.min(issues, 9)));
    const trendRaw      = seededRand(seed * 11, -2.5, 4.5);
    const trendPct      = trendRaw.toFixed(1);
    const trendUp       = trendRaw >= 0;

    const pName = entry.name || entry.sourceName || 'Dataset';
    const recordsFmt = records >= 1000000
        ? (records / 1000000).toFixed(1) + 'M'
        : records >= 1000
            ? (records / 1000).toFixed(0) + 'K'
            : records;

    // â”€â”€ Update top stat cards â”€â”€
    const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setEl('dqa-score-val',    finalScore.toFixed(1) + '%');
    setEl('dqa-score-trend',  (trendUp ? '+' : '') + trendPct + '%');
    setEl('dqa-records-val',  recordsFmt);
    setEl('dqa-issues-val',   issues);
    setEl('dqa-critical-val', criticalCount > 0 ? criticalCount + ' Critical' : 'No Issues');
    const titleEl = document.getElementById('dqa-dataset-name');
    if (titleEl) titleEl.textContent = pName;

    // Trend badge color
    const trendBadge = document.getElementById('dqa-score-trend');
    if (trendBadge) {
        trendBadge.className = 'dqa-stat-badge ' + (trendUp ? 'green' : 'red');
    }

    Chart.defaults.color = 'rgba(255,255,255,0.45)';
    Chart.defaults.scale.grid.color = 'rgba(255,255,255,0.05)';

    function makeChart(id, cfg) {
        if (dqaCharts[id]) dqaCharts[id].destroy();
        const c = document.getElementById(id);
        if (c) dqaCharts[id] = new Chart(c, cfg);
    }

    // Helper: seeded array generator, no shared state
    function seededArr(len, seedBase, min, max) {
        return Array.from({length: len}, (_, k) =>
            Math.min(100, Math.max(0, seededRand(seedBase + k * 17, min, max)))
        );
    }

    // 1. Overall Quality Score Trend â€” ends at current score, rises from (score - ~8)
    const months = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        months.push(d.toLocaleString('en-US', { month: 'short' }) + ' ' + d.getDate());
    }
    const trendBase = Math.max(80, finalScore - 8);
    const trendData = months.map((_, k) => {
        const prog = trendBase + ((finalScore - trendBase) * (k / (months.length - 1)));
        return parseFloat(Math.min(100, prog + seededRand(seed * 13 + k * 31, -1, 1)).toFixed(2));
    });
    // Force last point to be the real score
    trendData[trendData.length - 1] = parseFloat(score.toFixed(2));

    makeChart('dqa-trend-chart', {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Quality Score (%)',
                data: trendData,
                borderColor: '#34d399',
                backgroundColor: 'rgba(52,211,153,0.15)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#34d399'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
            scales: { y: {
                min: Math.max(80, Math.floor(trendBase) - 2),
                max: 100,
                ticks: { stepSize: 2 }
            }}
        }
    });

    // 2. Quality Dimensions â€” anchored to real completeness/accuracy/validity
    const dims = ['Completeness','Accuracy','Consistency','Validity','Uniqueness'];
    const dimBase = [
        parseFloat(completeness),
        parseFloat(accuracy),
        parseFloat(Math.min(100, score + seededRand(seed * 3, -3, 3)).toFixed(1)),
        parseFloat(validity),
        parseFloat(Math.min(100, score + seededRand(seed * 6, -5, 5)).toFixed(1))
    ];
    const weeks = ['Week 1','Week 2','Week 3','Week 4'];
    const dimColors = ['#34d399','#f87171','#60a5fa','#fbbf24'];
    const dimDatasets = weeks.map((w, wi) => ({
        label: w,
        data: dimBase.map((base, di) =>
            parseFloat(Math.min(100, base + seededRand(seed * (wi + 2) + di * 19, -2, 2)).toFixed(1))
        ),
        borderColor: dimColors[wi],
        backgroundColor: dimColors[wi],
        borderWidth: 2, tension: 0.4, pointRadius: 3
    }));
    // Week 4 = current real values
    dimDatasets[3].data = dimBase.map(v => parseFloat(v.toFixed(1)));

    const dimMin = Math.max(80, Math.floor(Math.min(...dimBase)) - 3);
    makeChart('dqa-dims-chart', {
        type: 'line',
        data: { labels: dims, datasets: dimDatasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 12 } } },
            scales: { y: { min: dimMin, max: 100, ticks: { stepSize: 2 } } }
        }
    });

    // 3. Data Freshness â€” scaled relative to record count
    const hours = ['00:00','04:00','08:00','12:00','16:00','20:00'];
    const baseOnTime = Math.round(records / 1000 * 0.85);
    const baseDelayed = Math.round(records / 1000 * 0.15);
    makeChart('dqa-freshness-chart', {
        type: 'line',
        data: {
            labels: hours,
            datasets: [
                {
                    label: 'On Time',
                    data: hours.map((_, k) => Math.round(baseOnTime + seededRand(seed * 19 + k * 7, -baseOnTime * 0.1, baseOnTime * 0.1))),
                    borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.2)',
                    borderWidth: 2, tension: 0.4, fill: true, pointRadius: 3
                },
                {
                    label: 'Delayed',
                    data: hours.map((_, k) => Math.round(baseDelayed + seededRand(seed * 23 + k * 11, -baseDelayed * 0.2, baseDelayed * 0.2))),
                    borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.15)',
                    borderWidth: 2, tension: 0.4, fill: true, pointRadius: 3
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
            scales: { y: { beginAtZero: true } }
        }
    });

    // 4. Issues by Category â€” total distributed across categories, based on real `issues` count
    const cats = ['Missing Values','Duplicates','Format Errors','Outliers','Schema Violations'];
    // Distribute `issues` total across categories and severity proportionally
    const catWeights = cats.map((_, k) => seededRand(seed * 29 + k * 13, 0.1, 1));
    const catTotal = catWeights.reduce((a, b) => a + b, 0);
    const catIssues = catWeights.map(w => Math.max(1, Math.round(issues * (w / catTotal))));

    // Split each category's issue count into severity levels (Critical~5%, High~20%, Med~35%, Low~40%)
    const critFrac = Math.min(issues, criticalCount) / Math.max(issues, 1);
    // Equal totals per category
    const issueFixedTotal = Math.max(issues, 10);
    const issCritical = [], issHigh = [], issMedium = [], issLow = [];
    cats.forEach((_, ci) => {
        const crit = Math.max(0, Math.round(issueFixedTotal * critFrac + seededRand(seed * 31 + ci, -0.5, 0.5)));
        const high = Math.round(issueFixedTotal * 0.20 + seededRand(seed * 37 + ci, 0, 2));
        const med  = Math.round(issueFixedTotal * 0.35 + seededRand(seed * 41 + ci, 0, 2));
        const low  = issueFixedTotal - crit - high - med;
        issCritical.push(crit);
        issHigh.push(high);
        issMedium.push(Math.max(0, med));
        issLow.push(Math.max(0, low));
    });
    makeChart('dqa-issues-chart', {
        type: 'bar',
        data: {
            labels: cats,
            datasets: [
                { label: 'Critical', data: issCritical, backgroundColor: '#f87171', barThickness: 14 },
                { label: 'High',     data: issHigh,     backgroundColor: '#fbbf24', barThickness: 14 },
                { label: 'Medium',   data: issMedium,   backgroundColor: '#60a5fa', barThickness: 14 },
                { label: 'Low',      data: issLow,      backgroundColor: '#34d399', barThickness: 14 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
        }
    });
};

// =============================================
// RENDER: MAINTENANCE NOTE VIEW
// =============================================
let currentAlerts = [];
let currentAlertFilterType = 'all';
let currentAlertFilterSev = 'all';

window.renderAlerts = function() {
    const entries = (currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
    
    // Seeded RNG function to keep alerts consistent per dataset
    function seededRand(seed, min, max) {
        let x = Math.sin(seed * 9301 + 49297) * 233280;
        return min + (x - Math.floor(x)) * (max - min);
    }

    currentAlerts = [];
    
    const plAlerts = [
        { title: 'Pipeline Execution Failed', sev: 'CRITICAL', desc: 'pipeline failed during data transformation stage', notePrefix: 'Check the transformation scripts for' },
        { title: 'High Latency Detected', sev: 'HIGH', desc: 'showing latency above 0.5s threshold', notePrefix: 'Optimize queries or increase compute resources for' },
        { title: 'Data Processing Delayed', sev: 'MEDIUM', desc: 'processing time exceeded expected duration by 45%', notePrefix: 'Review batch sizes and scheduling for' },
        { title: 'Connection Timeout', sev: 'HIGH', desc: 'unable to connect to source database', notePrefix: 'Verify database credentials and network firewalls for' }
    ];
    
    const dqAlerts = [
        { title: 'Critical Data Quality Issue Detected', sev: 'CRITICAL', desc: 'Missing required fields in customer database - email column has null values', notePrefix: 'Add NOT NULL constraints and backfill data in' },
        { title: 'Duplicate Records Found', sev: 'HIGH', desc: 'Product catalog contains duplicate entries based on SKU field', notePrefix: 'Run deduplication queries prioritizing the most recent records in' },
        { title: 'Schema Violation Detected', sev: 'CRITICAL', desc: 'Marketing campaign data has invalid date formats', notePrefix: 'Update data parsing scripts to handle ISO-8601 formats for' },
        { title: 'Data Completeness Below Threshold', sev: 'MEDIUM', desc: 'User Activity Logs missing timestamp data for 0.5% of records', notePrefix: 'Investigate tracking event payloads in the upstream system for' }
    ];

    entries.forEach((entry, idx) => {
        const seed = entry.id || (idx + 1);
        const name = entry.name || entry.sourceName || 'Dataset';
        
        const isPlResolved = currentUser && currentUser.resolvedAlerts && currentUser.resolvedAlerts.includes('pl-' + seed);
        const isDqResolved = currentUser && currentUser.resolvedAlerts && currentUser.resolvedAlerts.includes('dq-' + seed);
        
        // 35% chance of Pipeline Issue
        if (!isPlResolved && seededRand(seed * 11, 0, 100) < 35) {
            const tmpl = plAlerts[Math.floor(seededRand(seed * 13, 0, plAlerts.length))];
            currentAlerts.push({
                id: 'pl-' + seed,
                dataset: name,
                type: 'Pipeline',
                title: tmpl.title,
                severity: tmpl.sev,
                desc: `${name} ${tmpl.desc}`,
                timeAgo: Math.floor(seededRand(seed * 17, 5, 59)) + ' minutes ago',
                records: Math.floor(seededRand(seed * 19, 100, 15000)) + ' records affected',
                note: `${tmpl.notePrefix} ${name}. The system detected anomalies at step ${Math.floor(seededRand(seed, 2, 8))}.`,
                breakdown: [
                    `<li>Process failed at execution step: <strong>Transformation Layer</strong></li>`,
                    `<li>Error code: <strong>ERR_${Math.floor(seededRand(seed, 1000, 9999))}</strong></li>`,
                    `<li>Last successful run: <strong>${Math.floor(seededRand(seed * 2, 2, 24))} hours ago</strong></li>`,
                    `<li>Impact: Downstream dashboards using this data may show stale or missing metrics.</li>`
                ]
            });
        }
        
        // 45% chance of Data Quality Issue
        if (!isDqResolved && seededRand(seed * 23, 0, 100) < 45) {
            const tmpl = dqAlerts[Math.floor(seededRand(seed * 29, 0, dqAlerts.length))];
            currentAlerts.push({
                id: 'dq-' + seed,
                dataset: name,
                type: 'Data Quality',
                title: tmpl.title,
                severity: tmpl.sev,
                desc: tmpl.desc,
                timeAgo: Math.floor(seededRand(seed * 31, 1, 12)) + ' hours ago',
                records: Math.floor(seededRand(seed * 37, 50, 5000)) + ' records affected',
                note: `${tmpl.notePrefix} ${name}. Consider applying automatic quarantine rules to prevent downstream impact.`,
                breakdown: [
                    `<li>Affected Column/Field: <strong>${tmpl.title.includes('Duplicate') ? 'SKU / ID' : 'Multiple'}</strong></li>`,
                    `<li>Number of invalid records: <strong>${Math.floor(seededRand(seed * 37, 50, 5000))} rows</strong></li>`,
                    `<li>Data Source: <strong>${name}</strong></li>`,
                    `<li>Recommended Action: Needs immediate attention to prevent reporting inaccuracies.</li>`
                ]
            });
        }

        // Environment Dashboard Issues (Connected to Environment Stat)
        const isEnvResolved = currentUser && currentUser.resolvedAlerts && currentUser.resolvedAlerts.includes('env-' + seed);
        let getSeededRand = function(s, mn, mx) { let x = Math.sin(s * 9301 + 49297) * 233280; return mn + (x - Math.floor(x)) * (mx - mn); };
        let envStatusVal = getSeededRand(seed, 0, 100);
        if (!isEnvResolved && envStatusVal > 60) {
            let cpu = Math.floor(getSeededRand(seed+2, 10, 95));
            let ram = Math.floor(getSeededRand(seed+3, 20, 90));
            if (envStatusVal > 85) { cpu = Math.max(cpu, 85); ram = Math.max(ram, 85); }
            
            const isCritical = envStatusVal > 85;
            currentAlerts.push({
                id: 'env-' + seed,
                dataset: name,
                type: 'Environment',
                title: 'Server Resource ' + (isCritical ? 'Critical' : 'Warning'),
                severity: isCritical ? 'CRITICAL' : 'HIGH',
                desc: `Environment server for ${name} is in ${isCritical ? 'CRITICAL' : 'WARNING'} state with high resource usage.`,
                timeAgo: Math.floor(seededRand(seed * 41, 1, 60)) + ' mins ago',
                records: 'N/A',
                note: `Check server health and running pipelines for ${name}. Investigate the active processes consuming resources.`,
                breakdown: [
                    `<li>Affected Service: <strong>${name} Pipeline</strong></li>`,
                    `<li>CPU Usage: <strong><span style="color:${cpu > 85 ? '#ef4444' : '#fbbf24'}">${cpu}%</span></strong></li>`,
                    `<li>RAM Usage: <strong><span style="color:${ram > 85 ? '#ef4444' : '#fbbf24'}">${ram}%</span></strong></li>`,
                    `<li>Recommended Action: <a href="#" onclick="window.openEnvMonitoring('${seed}'); return false;" style="color:#60a5fa;text-decoration:underline;">Open Live Monitoring</a></li>`
                ]
            });
        }
    });
    
    // Sort critical first, then high
    const sevScore = { 'CRITICAL': 3, 'HIGH': 2, 'MEDIUM': 1 };
    currentAlerts.sort((a, b) => sevScore[b.severity] - sevScore[a.severity]);

    // Update Stats
    const criticalCount = currentAlerts.filter(a => a.severity === 'CRITICAL').length;
    const highCount = currentAlerts.filter(a => a.severity === 'HIGH').length;
    const dqCount = currentAlerts.filter(a => a.type === 'Data Quality').length;
    const plCount = currentAlerts.filter(a => a.type === 'Pipeline').length;
    const envCount = currentAlerts.filter(a => a.type === 'Environment').length;
    
    const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setEl('alerts-stat-critical', criticalCount);
    setEl('alerts-stat-high', highCount);
    setEl('alerts-stat-dq', dqCount);
    setEl('alerts-stat-pipeline', plCount);
    setEl('alerts-stat-env', envCount);

    updateAlertList();
};

function updateAlertList() {
    const listEl = document.getElementById('alerts-list');
    if (!listEl) return;
    
    const filtered = currentAlerts.filter(a => {
        if (currentAlertFilterType !== 'all' && a.type !== currentAlertFilterType) return false;
        if (currentAlertFilterSev !== 'all' && a.severity !== currentAlertFilterSev.toUpperCase()) return false;
        return true;
    });

    if (filtered.length === 0) {
        listEl.innerHTML = `<div style="text-align:center; padding: 3rem; color: #9ca3af;">No alerts found for the selected filters.</div>`;
        return;
    }

    listEl.innerHTML = filtered.map(alert => {
        const iconClass = alert.severity.toLowerCase();
        let iconSvg = '';
        if (alert.severity === 'CRITICAL') {
            iconSvg = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
        } else if (alert.severity === 'HIGH') {
            iconSvg = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`;
        } else {
            iconSvg = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
        }

        return `
        <div class="alert-card">
            <div class="alert-icon-box ${iconClass}">
                ${iconSvg}
            </div>
            <div class="alert-content">
                <div class="alert-title-row">
                    <h4>${alert.title}</h4>
                    <span class="alert-severity-badge ${iconClass}">${alert.severity}</span>
                    <span class="alert-type-badge">${alert.type}</span>
                </div>
                <p class="alert-desc">${alert.desc}</p>
                <div class="alert-meta-row">
                    <div class="alert-meta-item">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20 6h-2.18c.07-.44.18-.88.18-1.36 0-2.54-2.05-4.64-4.6-4.64-1.32 0-2.52.54-3.4 1.4A4.62 4.62 0 0 0 6.6 0 4.6 4.6 0 0 0 2 4.64c0 .48.11.92.18 1.36H0v16h20V6zm-9.8-3.88C10.7 1.44 11.33 1 12 1c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2c0-.34.1-.66.2-.88zM6.6 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-4.6 18V8h8v12H2zm10 0V8h8v12h-8z"/></svg>
                        ${alert.dataset}
                    </div>
                    <div class="alert-meta-item">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
                        ${alert.timeAgo}
                    </div>
                    <div class="alert-meta-item">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
                        ${alert.records}
                    </div>
                </div>
                <div class="alert-actions">
                    <button class="alert-btn alert-btn-outline" onclick="window.sendIssueToIC('${alert.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        Send Issue
                    </button>
                    <button class="alert-btn alert-btn-analyze" onclick="window.analyzeAlert('${alert.id}')">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 9h-2V7h-2v5H6v2h2v5h2v-5h2v-2zM21 9v6h-2v-6h2z"/></svg>
                        Analyze Issue
                    </button>
                    <button class="alert-btn alert-btn-fix" onclick="window.fixAlert('${alert.id}')">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z"/></svg>
                        Fix Issue
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// Set up filter buttons

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
                    if (typeof currentUser !== 'undefined' && currentUser) {
        const sessionSnap = Object.assign({}, currentUser);
        delete sessionSnap.dataEntries;
        localStorage.setItem('insight_session_v2', JSON.stringify(sessionSnap));
    }
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
        
        if (typeof currentUser !== 'undefined' && currentUser) {
        const sessionSnap = Object.assign({}, currentUser);
        delete sessionSnap.dataEntries;
        localStorage.setItem('insight_session_v2', JSON.stringify(sessionSnap));
    }
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
            if (typeof currentUser !== 'undefined' && currentUser) {
        const sessionSnap = Object.assign({}, currentUser);
        delete sessionSnap.dataEntries;
        localStorage.setItem('insight_session_v2', JSON.stringify(sessionSnap));
    }
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


document.addEventListener('DOMContentLoaded', () => {
    // Notification UI Init
    if (typeof window.initNotificationUI === 'function') {
        window.initNotificationUI();
        window.renderNotifications();
    }

    document.querySelectorAll('#alerts-type-filter .alerts-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#alerts-type-filter .alerts-filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentAlertFilterType = e.target.dataset.filter;
            updateAlertList();
        });
    });
    
    document.querySelectorAll('#alerts-severity-filter .alerts-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#alerts-severity-filter .alerts-filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentAlertFilterSev = e.target.dataset.filter;
            updateAlertList();
        });
    });
});

window.analyzeAlert = function(id) {
    const alert = currentAlerts.find(a => a.id === id);
    if (!alert) return;
    
    const modal = document.getElementById('alerts-analyze-modal');
    const loadingState = document.getElementById('alerts-modal-loading');
    const resultState = document.getElementById('alerts-modal-result');
    const noteText = document.getElementById('alerts-result-note-text');
    
    // Reset modal state to loading
    loadingState.classList.add('active');
    resultState.classList.remove('active');
    modal.classList.add('active');
    
    // Simulate backend analysis delay
    setTimeout(() => {
        noteText.textContent = alert.note;
        loadingState.classList.remove('active');
        resultState.classList.add('active');
    }, 2500);
};

window.closeAnalyzeModal = function() {
    document.getElementById('alerts-analyze-modal').classList.remove('active');
};

window.sendIssueToIC = function(id) {
    const alert = currentAlerts.find(a => a.id === id);
    if (!alert) return;
    
    const fileIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" style="width: 20px; height: 20px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    const mainIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
    
    window.showPdfActionModal(
        "Submit to IC Group",
        "Transmit this issue to the IC Group via API.",
        fileIcon, "Issue to be sent", alert.title || alert.id,
        `Are you sure you want to submit the issue "${alert.title || alert.id}" to the IC Group?`,
        "Submit Issue", ['#10b981', '#059669'], '#10b981', mainIcon,
        async function() {
            try {
                if(window.addNotification) window.addNotification("Sending", "Sedang mengirim ke IC Group...", "info");
                
                let formData = new FormData();
                formData.append("issue_id", alert.id); 
                formData.append("issue_title", alert.title || alert.id);
                
                const response = await fetch("http://72.61.215.222/intelligence-engineering/api/ic-group-submission/?token=INTRING_SECRET_123", {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errObj = await response.json().catch(()=>({}));
                    throw new Error(errObj.error || `HTTP ${response.status}`);
                }
                
                const data = await response.json();

                window.showApiResponseModal("Berhasil Terkirim", `Issue '${alert.title || alert.id}' berhasil dikirim ke IC Group!`, false);
                if(window.addNotification) window.addNotification("API Transfer", "Issue successfully sent to IC Group.", "success");
            } catch (e) {
                window.showApiResponseModal("Gagal Mengirim", "Failed to submit: " + e.message, true);
                if(window.addNotification) window.addNotification("Error", "Gagal mengirim ke IC Group: " + e.message, "error");
            }
        }
    );
};

window.viewAlertDetails = function(id) {
    const alert = currentAlerts.find(a => a.id === id);
    if (!alert) return;
    
    const modal = document.getElementById('alerts-details-modal');
    if (!modal) return;
    
    // Set text contents
    const iconClass = alert.severity.toLowerCase();
    
    const sevBadge = document.getElementById('ad-severity-badge');
    sevBadge.textContent = alert.severity;
    sevBadge.className = 'alert-severity-badge ' + iconClass;
    
    document.getElementById('ad-type-badge').textContent = alert.type;
    document.getElementById('ad-title').textContent = alert.title;
    document.getElementById('ad-dataset').textContent = 'Dataset: ' + alert.dataset + ' â€¢ ' + alert.records;
    
    const list = document.getElementById('ad-breakdown-list');
    list.innerHTML = alert.breakdown.join('');
    
    // Wire up analyze button inside details modal
    const analyzeBtn = document.getElementById('ad-analyze-btn');
    analyzeBtn.onclick = () => {
        closeDetailsModal();
        window.analyzeAlert(alert.id);
    };
    
    modal.classList.add('active');
};

window.closeDetailsModal = function() {
    const modal = document.getElementById('alerts-details-modal');
    if (modal) modal.classList.remove('active');
};

window.fixAlert = function(id) {
    const alert = currentAlerts.find(a => a.id === id);
    if (!alert) return;
    
    const modal = document.getElementById('alerts-fix-modal');
    const loadingState = document.getElementById('alerts-fix-loading');
    const failedState = document.getElementById('alerts-fix-failed');
    const successState = document.getElementById('alerts-fix-success');
    
    // Reset all states
    loadingState.classList.add('active');
    failedState.classList.remove('active');
    successState.classList.remove('active');
    modal.classList.add('active');
    
    // Set up the "Go to Analyze" button
    const analyzeBtn = document.getElementById('af-analyze-btn');
    analyzeBtn.onclick = () => {
        closeFixModal();
        window.analyzeAlert(alert.id);
    };
    
    // Simulate attempt delay
    setTimeout(() => {
        loadingState.classList.remove('active');
        
        // Critical/High severity -> Fail. Medium -> Success.
        if (alert.severity === 'MEDIUM') {
            successState.classList.add('active');
            
            // Persist the resolution
            if (!currentUser.resolvedAlerts) currentUser.resolvedAlerts = [];
            if (!currentUser.resolvedAlerts.includes(id)) {
                currentUser.resolvedAlerts.push(id);
                localStorage.setItem('insight_session_v2', JSON.stringify(currentUser));
                const users = JSON.parse(localStorage.getItem('insight_users_v2') || '[]');
                const userIdx = users.findIndex(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
                if (userIdx !== -1) {
                    users[userIdx].resolvedAlerts = currentUser.resolvedAlerts;
                    localStorage.setItem('insight_users_v2', JSON.stringify(users));
                }
            }
            
            // Remove the alert from the list for real simulation effect
            currentAlerts = currentAlerts.filter(a => a.id !== id);
            if(window.updateAlertList) updateAlertList();
        } else {
            failedState.classList.add('active');
        }
    }, 2500);
};

window.closeFixModal = function() {
    const modal = document.getElementById('alerts-fix-modal');
    if (modal) modal.classList.remove('active');
};

// Django API Integration
window.API_BASE = '/implementation/api-content';
window.apiSyncEntries = async function() {
    try {
        const emailParam = (currentUser && currentUser.email) ? ('?email=' + encodeURIComponent(currentUser.email)) : '';
        const res = await fetch(window.API_BASE + '/datasets/' + emailParam);
        if (!res.ok) throw new Error('API fetch failed');
        const data = await res.json();
        
        if (currentUser) {
            currentUser.dataEntries = data.map(d => ({
                id: d.id,
                name: d.name,
                fileName: d.file_name,
                fileType: d.file_type,
                pdfUrl: d.pdf_file,
                activity: d.activity,
                version: d.version,
                description: d.description,
                notes: d.notes,
                qualityScore: d.quality_score,
                date: new Date(d.created_at).toLocaleDateString('id-ID', {day:'2-digit',month:'short',year:'numeric'}),
                submittedAt: d.submitted_at,
                sourceType: d.source_type
            }));
            
            currentUser.dataSources = currentUser.dataEntries.length;
            currentUser.activeProjects = currentUser.dataEntries.filter(e => e.activity === 'in-progress').length;
            currentUser.qualityScore = currentUser.dataEntries.length > 0 
                ? (currentUser.dataEntries.reduce((s, e) => s + window.getDatasetQualityInfo(e).finalScore, 0) / currentUser.dataEntries.length).toFixed(1).replace(/\.0$/, '') + '%'
                : '0%';
                
            // Save entries to per-user scoped key (isolated storage)
            saveScopedEntries(currentUser.email, currentUser.dataEntries);
            // Save session WITHOUT dataEntries in the shared session object
            const snap = Object.assign({}, currentUser);
            delete snap.dataEntries;
            localStorage.setItem('insight_session_v2', JSON.stringify(snap));
            
            const activeView = document.querySelector('.view.active');
            if (activeView && (activeView.id === 'data-entry-view' || activeView.id === 'datasource-overview-view' || activeView.id === 'home-view' || activeView.id === 'implementation-activity-view' || activeView.id === 'model-transaction-view' || activeView.id === 'environment-stat-view' || activeView.id === 'maintainer-note-view')) {
                navigateTo(activeView.id);
            }
        }
    } catch (err) {
        console.error("API Sync error:", err);
    }
};

function getSeededRand(seed, min, max) {
    let s = seed || 1;
    if (typeof s === 'string') {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
        s = h;
    }
    let x = Math.sin(s * 9301 + 49297) * 233280;
    return min + (x - Math.floor(x)) * (max - min);
}

window.renderModelTransaction = function() {
    console.log("Render Model Transaction View");
    const container = document.getElementById("mt-card-container");
    if (!container) return;
    const entries = (typeof currentUser !== 'undefined' && currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
    
    if (entries.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--light-text-muted); padding: 2rem;">No data sources available. Please add a Data Source first.</p>';
        const stat1 = document.getElementById("mt-stat-active"); if(stat1) stat1.textContent = "0";
        const stat2 = document.getElementById("mt-stat-accuracy"); if(stat2) stat2.textContent = "0%";
        const stat3 = document.getElementById("mt-stat-total"); if(stat3) stat3.textContent = "0";
        const stat4 = document.getElementById("mt-stat-deployed"); if(stat4) stat4.textContent = "0";
        return;
    }

    let totalAcc = 0;
    let totalPreds = 0;
    let deployedCount = 0;

    container.innerHTML = entries.map((entry, idx) => {
        let seed = entry.id || (idx + 1);
        let status = entry.activity === 'in-progress' ? 'Training' : 'Deployed';
        let statusClass = status === 'Training' ? 'mt-status-training' : 'mt-status-deployed';
        let accuracyVal = entry ? window.getDatasetQualityInfo(entry).finalScore : parseFloat(getSeededRand(seed, 80, 99).toFixed(1));
        let accuracyClass = accuracyVal < 90 ? "yellow" : "";
        
        let context = window.getContextualFeatures(entry.name, seed);
        let modelType = context.type;
        let version = "v" + Math.floor(getSeededRand(seed + 2, 1, 4)) + "." + Math.floor(getSeededRand(seed + 3, 0, 9)) + ".0";
        let inputCount = context.features.length;
        let outputCount = 2;
        let predictions = Math.floor(getSeededRand(seed + 6, 10, 800));
        
        totalAcc += accuracyVal;
        totalPreds += predictions;
        if (status === 'Deployed') deployedCount++;

        let topFeaturesArray = [...new Set([context.features[0], context.features[1] || 'f2', context.features[2] || 'f3'])];
        
        let apiBadge = (entry.sourceType === 'api' || entry.source_type === 'api') ? '<span class="mt-api-badge">API</span>' : '<span class="mt-manual-badge">Manual</span>';

        return `
        <div class="mt-model-card">
            <div class="mt-card-header">
                <div class="mt-card-header-left">
                    <div class="mt-card-icon">
                        <svg viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    </div>
                    <div class="mt-card-title-wrap">
                        <h3>${entry.name} ${apiBadge} <span class="mt-status-badge ${statusClass}">${status}</span></h3>
                        <div class="mt-card-subtitle">${modelType} &bull; Version ${version} &bull; Created: ${new Date(entry.created_at || Date.now()).toISOString().split('T')[0]}</div>
                    </div>
                </div>
                <div class="mt-card-accuracy">
                    <div class="mt-accuracy-val ${accuracyClass}">${accuracyVal}%</div>
                    <div class="mt-accuracy-lbl">Accuracy</div>
                </div>
            </div>

            <div class="mt-metrics-grid">
                <div class="mt-metric-box">
                    <div class="mt-metric-lbl">Input Features</div>
                    <div class="mt-metric-val">${inputCount}</div>
                </div>
                <div class="mt-metric-box">
                    <div class="mt-metric-lbl">Output Labels</div>
                    <div class="mt-metric-val">${outputCount}</div>
                </div>
                <div class="mt-metric-box">
                    <div class="mt-metric-lbl">Total Predictions</div>
                    <div class="mt-metric-val">${predictions}K</div>
                </div>
            </div>

            <div class="mt-tags-row">
                Top Features: 
                ${topFeaturesArray.map(f => `<span class="mt-tag">${f}</span>`).join('')}
            </div>

            <div class="mt-actions-row">
                <button class="mt-btn mt-btn-purple" onclick="openModelDetails('${entry.id}')">
                    <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                    View Details
                </button>
                <button class="mt-btn mt-btn-green" onclick="openPredictionModal('${entry.id}')">
                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    Run Prediction
                </button>
            </div>
        </div>
        `;
    }).join('');

    const stat1 = document.getElementById("mt-stat-active"); if(stat1) stat1.textContent = entries.length;
    const stat2 = document.getElementById("mt-stat-accuracy"); if(stat2) stat2.textContent = (totalAcc / entries.length).toFixed(1) + "%";
    const stat3 = document.getElementById("mt-stat-total"); if(stat3) stat3.textContent = totalPreds + "K";
    const stat4 = document.getElementById("mt-stat-deployed"); if(stat4) stat4.textContent = deployedCount;
};

window.renderEnvironmentStat = function() {
    console.log("Render Environment Stat View");
    const container = document.getElementById("env-list");
    if (!container) return;
    
    const entries = (typeof currentUser !== "undefined" && currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
    if (entries.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--light-text-muted);">No environments to monitor.</p>';
        return;
    }

    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    const cardsHtml = entries.map((entry, idx) => {
        let seed = entry.id || (idx + 1);
        
        // Randomize Status
        let statusVal = getSeededRand(seed, 0, 100);
        let status = 'Healthy';
        let statusClass = 'healthy';
        if (statusVal > 85) { status = 'Critical'; statusClass = 'critical'; criticalCount++; }
        else if (statusVal > 60) { status = 'Warning'; statusClass = 'warning'; warningCount++; }
        else { healthyCount++; }

        // Randomize Environment Type
        let envTypes = ['Production', 'Staging', 'Development'];
        let envType = envTypes[Math.floor(getSeededRand(seed+1, 0, 2.99))];
        let envClass = envType.toLowerCase();

        // Metrics
        let cpu = Math.floor(getSeededRand(seed+2, 10, 95));
        let ram = Math.floor(getSeededRand(seed+3, 20, 90));
        let disk = Math.floor(getSeededRand(seed+4, 15, 88));

        // Ensure metrics align with status roughly
        if (status === 'Critical') { cpu = Math.max(cpu, 85); ram = Math.max(ram, 85); }
        else if (status === 'Healthy') { cpu = Math.min(cpu, 65); ram = Math.min(ram, 70); }

        function getMetricColor(val) {
            if (val >= 85) return 'pb-red';
            if (val >= 70) return 'pb-yellow';
            if (val >= 50) return 'pb-blue';
            return 'pb-green';
        }

        // Tech stack mock
        const techStacks = [
            ['Python', 'FastAPI', 'PostgreSQL'],
            ['React', 'Vite', 'Nginx'],
            ['Node.js', 'Express', 'MongoDB'],
            ['Python', 'PyTorch', 'CUDA'],
            ['Java', 'Spring', 'MySQL'],
            ['Apache Spark', 'Kafka', 'Hadoop'],
            ['FastAPI', 'Docker', 'Kubernetes']
        ];
        let stack = techStacks[Math.floor(getSeededRand(seed+5, 0, techStacks.length - 0.01))];

        let servers = Math.floor(getSeededRand(seed+6, 1, 10));
        let upDays = Math.floor(getSeededRand(seed+7, 1, 60));
        let upHours = Math.floor(getSeededRand(seed+8, 1, 23));
        let updatedMins = Math.floor(getSeededRand(seed+9, 1, 15));
        
        let btnText = "Start Monitoring";
        if (status === 'Warning') btnText = "Check Warning";
        if (status === 'Critical') btnText = "Investigate Now";

        return `
            <div class="env-card status-${statusClass}">
                <div class="env-card-top bg-${statusClass}">
                    <div class="env-card-icon">
                        ${status === 'Healthy' ? 'ðŸ–¥ï¸' : status === 'Warning' ? 'âš™ï¸' : 'âš¡'}
                    </div>
                    <div class="env-card-title-area">
                        <h3 class="env-card-title">
                            ${entry.name} Service
                            <span class="env-status-dot" style="background: ${statusClass==='healthy'?'#34d399':statusClass==='warning'?'#facc15':'#ef4444'}"></span>
                            <span class="env-status-text">${status}</span>
                        </h3>
                        <div class="env-type-badge bg-${envClass}">${envType}</div>
                    </div>
                </div>
                
                <div class="env-card-desc">
                    Microservice environment serving the ${entry.name.toLowerCase()} backend pipelines and user endpoints.
                </div>
                
                <div class="env-tech-stack">
                    ${stack.map(t => `<span class="env-tech-tag">${t}</span>`).join('')}
                    <span class="env-tech-tag">+1</span>
                </div>
                
                <div class="env-metrics">
                    <div class="env-metric-item">
                        <div class="env-metric-lbl">CPU</div>
                        <div class="env-metric-val" style="color: ${cpu >= 85 ? '#ef4444' : cpu >= 70 ? '#facc15' : '#60a5fa'}">${cpu}%</div>
                        <div class="env-pb-bg"><div class="env-pb-fill ${getMetricColor(cpu)}" style="width: ${cpu}%"></div></div>
                    </div>
                    <div class="env-metric-item">
                        <div class="env-metric-lbl">RAM</div>
                        <div class="env-metric-val" style="color: ${ram >= 85 ? '#ef4444' : ram >= 70 ? '#facc15' : '#a855f7'}">${ram}%</div>
                        <div class="env-pb-bg"><div class="env-pb-fill ${getMetricColor(ram)}" style="width: ${ram}%"></div></div>
                    </div>
                    <div class="env-metric-item">
                        <div class="env-metric-lbl">Disk</div>
                        <div class="env-metric-val" style="color: ${disk >= 85 ? '#ef4444' : disk >= 70 ? '#facc15' : '#34d399'}">${disk}%</div>
                        <div class="env-pb-bg"><div class="env-pb-fill ${getMetricColor(disk)}" style="width: ${disk}%"></div></div>
                    </div>
                </div>
                
                <div class="env-meta-row">
                    <div class="env-meta-item">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg> ${servers} server${servers>1?'s':''}
                    </div>
                    <div class="env-meta-item">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> Up ${upDays}d ${upHours}h
                    </div>
                    <div class="env-meta-item">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg> ${updatedMins} min ago
                    </div>
                </div>

                <button class="env-card-btn btn-${statusClass}" onclick="openEnvMonitoring('${entry.id}')">
                    ${status === 'Healthy' ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 9h-2V7h-2v5H6v2h2v5h2v-5h2v-2zm4 5h-2v-2h2v2zm0-4h-2v-2h2v2z"/></svg>' : ''}
                    ${btnText} ${status === 'Healthy' ? '>' : ''}
                </button>
            </div>
        `;
    }).join('');

    container.innerHTML = cardsHtml;

    // Update Summary Stats
    const elTotal = document.getElementById("env-total-val"); if(elTotal) elTotal.textContent = entries.length;
    const elHealthy = document.getElementById("env-healthy-val"); if(elHealthy) elHealthy.textContent = healthyCount;
    const elWarning = document.getElementById("env-warning-val"); if(elWarning) elWarning.textContent = warningCount;
    const elCritical = document.getElementById("env-critical-val"); if(elCritical) elCritical.textContent = criticalCount;
};

let envmCharts = {};
let envmLiveInterval = null;

window.openEnvMonitoring = function(idStr) {
    console.log("Opening Env Monitoring for", idStr);
    const entryId = parseInt(idStr);
    const entries = (typeof currentUser !== "undefined" && currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
    const entry = entries.find(e => String(e.id) === String(entryId)) || entries[0];
    if(!entry) return;

    // Navigate to the view
    if(typeof navigateTo === 'function') {
        navigateTo('env-monitoring-view');
    } else {
        document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
        document.getElementById('env-monitoring-view').style.display = 'block';
    }

    // Populate static fields
    const seed = entry.id || 1;
    let statusVal = getSeededRand(seed, 0, 100);
    let status = 'Healthy', statusClass = 'healthy', typeBadgeClass='bg-development';
    if (statusVal > 85) { status = 'Critical'; statusClass = 'critical'; typeBadgeClass='bg-production'; }
    else if (statusVal > 60) { status = 'Warning'; statusClass = 'warning'; typeBadgeClass='bg-staging';}
    
    document.getElementById('envm-title').textContent = entry.name + " Prediction Environment";
    document.getElementById('envm-status').textContent = status;
    document.getElementById('envm-status').className = 'envm-tag bg-' + statusClass;
    document.getElementById('envm-type').className = 'envm-tag ' + typeBadgeClass;
    document.getElementById('envm-type').textContent = status === 'Critical' ? 'Production' : status === 'Warning' ? 'Staging' : 'Development';
    
    document.getElementById('envm-servers').textContent = Math.floor(getSeededRand(seed+6, 1, 10)) + " servers";
    document.getElementById('envm-sys-nodes').textContent = Math.floor(getSeededRand(seed+6, 1, 10)) + " servers";
    
    let uDays = Math.floor(getSeededRand(seed+7, 1, 60));
    let uHours = Math.floor(getSeededRand(seed+8, 1, 23));
    document.getElementById('envm-uptime').textContent = "Up " + uDays + "d " + uHours + "h";
    document.getElementById('envm-sys-uptime').textContent = uDays + "d " + uHours + "h";
    // Client Device Detection
    const ua = navigator.userAgent;
    let clientOS = "Unknown OS";
    if (ua.indexOf("Windows NT 10.0") !== -1) clientOS = "Windows 10/11";
    else if (ua.indexOf("Windows NT 6.2") !== -1 || ua.indexOf("Windows NT 6.3") !== -1) clientOS = "Windows 8";
    else if (ua.indexOf("Windows NT 6.1") !== -1) clientOS = "Windows 7";
    else if (ua.indexOf("Mac") !== -1) clientOS = "Mac / iOS";
    else if (ua.indexOf("Android") !== -1) clientOS = "Android";
    else if (ua.indexOf("Linux") !== -1) clientOS = "Linux";

    let clientBrowser = "Unknown Browser";
    if (ua.indexOf("Edg") !== -1) clientBrowser = "Edge";
    else if (ua.indexOf("Chrome") !== -1) clientBrowser = "Chrome";
    else if (ua.indexOf("Firefox") !== -1) clientBrowser = "Firefox";
    else if (ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1) clientBrowser = "Safari";
    else if (ua.indexOf("Opera") !== -1 || ua.indexOf("OPR") !== -1) clientBrowser = "Opera";

    let clientDeviceType = "Desktop";
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
        clientDeviceType = "Mobile/Tablet";
    }

    const osEl = document.getElementById('envm-client-os');
    if (osEl) osEl.textContent = clientOS;
    
    const browserEl = document.getElementById('envm-client-browser');
    if (browserEl) browserEl.textContent = clientBrowser;
    
    const deviceEl = document.getElementById('envm-client-device');
    if (deviceEl) deviceEl.textContent = clientDeviceType;

    // Location and Timezone Detection
    let clientTimezone = "Unknown Timezone";
    try {
        clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown Timezone";
    } catch(e) {}
    
    const tzEl = document.getElementById('envm-client-timezone');
    if (tzEl) tzEl.textContent = clientTimezone;
    
    const locEl = document.getElementById('envm-client-location');
    if (locEl) locEl.textContent = "Detecting City...";

    // Fetch actual city via IP Geolocation
    fetch('https://get.geojs.io/v1/ip/geo.json')
        .then(res => res.json())
        .then(data => {
            if (locEl && data.city) {
                locEl.textContent = data.city;
            } else if (locEl) {
                locEl.textContent = "Unknown City";
            }
        })
        .catch(err => {
            console.error("GeoIP Error:", err);
            if (locEl) locEl.textContent = "Location Unavailable";
        });
    // Clear old charts if exist
    Object.values(envmCharts).forEach(c => { if(c) c.destroy(); });
    envmCharts = {};
    if(envmLiveInterval) clearInterval(envmLiveInterval);

    // Initial Data
    let cpu = Math.floor(getSeededRand(seed+2, 10, 95));
    let ram = Math.floor(getSeededRand(seed+3, 20, 90));
    let disk = Math.floor(getSeededRand(seed+4, 15, 88));

    if (status === 'Critical') { cpu = Math.max(cpu, 85); ram = Math.max(ram, 85); }
    else if (status === 'Healthy') { cpu = Math.min(cpu, 65); ram = Math.min(ram, 70); }
    console.log("FIX APPLIED: CPU clamped to", cpu, "RAM clamped to", ram, "for status", status);

    // Update Top Cards
    document.getElementById('envm-cpu-val').textContent = cpu.toFixed(1);
    document.getElementById('envm-cpu-bar').style.width = cpu + '%';
    document.getElementById('envm-cpu-lbl').textContent = cpu + '% used';

    document.getElementById('envm-ram-val').textContent = ram.toFixed(1);
    document.getElementById('envm-ram-bar').style.width = ram + '%';
    let ramUsed = (ram / 100 * 32).toFixed(1);
    document.getElementById('envm-ram-tot').textContent = ramUsed + " / 32 GB";
    document.getElementById('envm-ram-lbl').textContent = ramUsed + " GB used";

    document.getElementById('envm-disk-val').textContent = disk.toFixed(1);
    document.getElementById('envm-disk-bar').style.width = disk + '%';
    let diskUsed = (disk / 100 * 500).toFixed(0);
    document.getElementById('envm-disk-tot').textContent = diskUsed + " / 500 GB";
    document.getElementById('envm-disk-lbl').textContent = diskUsed + " GB used";
    
    document.getElementById('envm-disk-bd-val').textContent = disk.toFixed(0) + "%";
    document.getElementById('envm-disk-bd-used').textContent = diskUsed + " GB";
    document.getElementById('envm-disk-bd-free').textContent = (500 - diskUsed) + " GB";

    // Chart configs
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = 'Inter';

    const createDoughnut = (ctxId, val, color) => {
        return new Chart(document.getElementById(ctxId), {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [val, 100-val],
                    backgroundColor: [color, 'rgba(15, 23, 42, 0.6)'],
                    borderWidth: 0,
                    borderRadius: 5,
                    cutout: '80%'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
    };

    envmCharts.cpu = createDoughnut('envm-cpu-chart', cpu, '#3b82f6');
    envmCharts.ram = createDoughnut('envm-ram-chart', ram, '#a855f7');
    envmCharts.disk = createDoughnut('envm-disk-chart', disk, '#fbbf24');
    envmCharts.disk2 = createDoughnut('envm-disk-donut', disk, '#fbbf24');

    // Area Chart (CPU & RAM)
    let timeLabels = Array.from({length: 15}, (_, i) => -14 + i + "s");
    let cpuData = Array.from({length: 15}, () => cpu + (Math.random()*10 - 5));
    let ramData = Array.from({length: 15}, () => ram + (Math.random()*4 - 2));

    envmCharts.resource = new Chart(document.getElementById('envm-resource-chart'), {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [
                {
                    label: 'CPU',
                    data: cpuData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'RAM',
                    data: ramData,
                    borderColor: '#a855f7',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // Network Line Chart
    let netInData = Array.from({length: 15}, () => Math.floor(Math.random() * 200));
    envmCharts.network = new Chart(document.getElementById('envm-network-chart'), {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                data: netInData,
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { display: false },
                x: { display: false }
            }
        }
    });

    // Jastip Themed Processes
    const procs = [
        { n: 'python3 jastip_scraper.py', u: 'app', c: (cpu*0.4).toFixed(1), m: (ram*0.3).toFixed(1) },
        { n: 'postgres: customs_db', u: 'postgres', c: (cpu*0.2).toFixed(1), m: (ram*0.25).toFixed(1) },
        { n: 'node customs-api.js', u: 'app', c: (cpu*0.15).toFixed(1), m: (ram*0.15).toFixed(1) },
        { n: 'nginx: worker process', u: 'www-data', c: '5.2', m: '4.0' },
        { n: 'celery: shipping_webhook', u: 'app', c: '3.5', m: '6.8' },
        { n: 'redis-server', u: 'redis', c: '2.8', m: '5.2' }
    ];
    let ptbl = document.getElementById('envm-process-table');
    ptbl.innerHTML = procs.map((p, i) => `
        <tr>
            <td>
                <div class="envm-proc-name">
                    <div class="envm-proc-icon">âš™ï¸</div>
                    ${p.n}
                </div>
            </td>
            <td>${Math.floor(Math.random()*20000 + 1000)}</td>
            <td>${p.u}</td>
            <td>
                <div class="envm-table-bar">
                    <div class="envm-tb-bg"><div class="envm-tb-fill bg-blue-500" style="width: ${p.c}%; background: #3b82f6;"></div></div>
                    ${p.c}%
                </div>
            </td>
            <td><div class="envm-table-bar">
                    <div class="envm-tb-bg"><div class="envm-tb-fill bg-purple-500" style="width: ${p.m}%; background: #a855f7;"></div></div>
                    ${p.m}%
                </div>
            </td>
            <td>
                <div class="envm-status-cell">
                    <span class="dot healthy"></span> running
                </div>
            </td>
        </tr>
    `).join('');

    // Use the generated Maintenance Notes from currentAlerts
    if (typeof currentAlerts !== 'undefined') {
        const fileAlerts = currentAlerts.filter(a => a.dataset === (entry.name || entry.sourceName));
        if (fileAlerts.length === 0) {
            document.getElementById('envm-alerts-list').innerHTML = '<div style="padding: 10px; color: #94a3b8; text-align: center;">No active alerts for this file.</div>';
        } else {
            document.getElementById('envm-alerts-list').innerHTML = fileAlerts.map(a => {
                let type = (a.severity.toLowerCase() === 'high' || a.severity.toLowerCase() === 'critical') ? 'warn' : 'info';
                let icon = (type === 'warn') ? '&#9888;' : '&#10004;';
                return `
                <div class="envm-alert-item ${type}">
                    <div class="envm-alert-icon">${icon}</div>
                    <div class="envm-alert-content">
                        <p><strong>${a.title}</strong>: ${a.desc}</p>
                        <small>${a.timeAgo}</small>
                    </div>
                </div>
                `;
            }).join('');
        }
    } else {
        document.getElementById('envm-alerts-list').innerHTML = '<div style="padding: 10px; color: #94a3b8; text-align: center;">No active alerts for this file.</div>';
    }

    // Live update simulation
    envmLiveInterval = setInterval(() => {
        let ncpu = Math.min(100, Math.max(0, cpu + (Math.random()*10 - 5)));
        let nram = Math.min(100, Math.max(0, ram + (Math.random()*4 - 2)));
        
        envmCharts.resource.data.datasets[0].data.shift();
        envmCharts.resource.data.datasets[0].data.push(ncpu);
        envmCharts.resource.data.datasets[1].data.shift();
        envmCharts.resource.data.datasets[1].data.push(nram);
        envmCharts.resource.update();

        envmCharts.network.data.datasets[0].data.shift();
        envmCharts.network.data.datasets[0].data.push(Math.floor(Math.random() * 200));
        envmCharts.network.update();

        document.getElementById('envm-cpu-leg').textContent = ncpu.toFixed(1) + '%';
        document.getElementById('envm-ram-leg').textContent = nram.toFixed(1) + '%';
        
        // Update process table slightly to simulate live activity
        if (typeof procs !== 'undefined') {
            procs.forEach(p => {
                if (typeof p.origC === 'undefined') p.origC = parseFloat(p.c);
                if (typeof p.origM === 'undefined') p.origM = parseFloat(p.m);
                let newC = p.origC + (Math.random()*4 - 2);
                let newM = p.origM + (Math.random()*2 - 1);
                p.c = Math.min(100, Math.max(0, newC)).toFixed(1);
                p.m = Math.min(100, Math.max(0, newM)).toFixed(1);
            });
            document.getElementById('envm-process-table').innerHTML = procs.map(p => `
                <tr>
                    <td>
                        <div class="envm-proc-name">
                            <div class="envm-proc-icon">&#9881;</div>
                            ${p.n}
                        </div>
                    </td>
                    <td>${Math.floor(Math.random()*20000 + 1000)}</td>
                    <td>${p.u}</td>
                    <td>
                        <div class="envm-table-bar">
                            <div class="envm-tb-bg"><div class="envm-tb-fill bg-blue-500" style="width: ${p.c}%; background: #3b82f6;"></div></div>
                            ${p.c}%
                        </div>
                    </td>
                    <td><div class="envm-table-bar">
                            <div class="envm-tb-bg"><div class="envm-tb-fill bg-purple-500" style="width: ${p.m}%; background: #a855f7;"></div></div>
                            ${p.m}%
                        </div>
                    </td>
                    <td>
                        <div class="envm-status-cell">
                            <span class="dot healthy"></span> running
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // Update clock
        document.getElementById('envm-clock').textContent = new Date().toLocaleTimeString();
    }, 2500);
};

window.showProcessExplanation = function() {
    window.showApiResponseModal("Informasi Top Inference Processes", `
        <div style="text-align: left; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
            <p style="margin-bottom: 12px;">Tabel ini menyimulasikan daftar program (proses) yang sedang berjalan di dalam server backend:</p>
            <p style="margin-bottom: 12px; margin-top: 12px;">Kolom <strong>API Load</strong> menunjukkan beban pemrosesan/CPU dari tugas tersebut, sedangkan bar <strong>Memory</strong> menunjukkan persentase RAM yang sedang digunakan.</p>
            <ul style="margin-top: 8px; padding-left: 20px; display: flex; flex-direction: column; gap: 8px;">
                <li><strong>python3 jastip_scraper.py:</strong> Skrip bot pengambil data dari luar negeri.</li>
                <li><strong>postgres customs_db:</strong> Mesin database tempat menyimpan data.</li>
                <li><strong>node customs-api.js:</strong> Program jembatan penghubung API Bea Cukai.</li>
                <li><strong>nginx worker process:</strong> Web Server utama yang menangani trafik masuk.</li>
                <li><strong>celery shipping_webhook:</strong> Pekerja latar belakang untuk notifikasi kurir.</li>
                <li><strong>redis-server:</strong> Memori super cepat untuk antrean tugas dan cache.</li>
            </ul>
        </div>
    `, false);
};

// Add event listener for the back button

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
                    if (typeof currentUser !== 'undefined' && currentUser) {
        const sessionSnap = Object.assign({}, currentUser);
        delete sessionSnap.dataEntries;
        localStorage.setItem('insight_session_v2', JSON.stringify(sessionSnap));
    }
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
        
        if (typeof currentUser !== 'undefined' && currentUser) {
        const sessionSnap = Object.assign({}, currentUser);
        delete sessionSnap.dataEntries;
        localStorage.setItem('insight_session_v2', JSON.stringify(sessionSnap));
    }
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
            if (typeof currentUser !== 'undefined' && currentUser) {
        const sessionSnap = Object.assign({}, currentUser);
        delete sessionSnap.dataEntries;
        localStorage.setItem('insight_session_v2', JSON.stringify(sessionSnap));
    }
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


document.addEventListener('DOMContentLoaded', () => {
    // Notification UI Init
    if (typeof window.initNotificationUI === 'function') {
        window.initNotificationUI();
        window.renderNotifications();
    }

    document.body.addEventListener('click', (e) => {
        if(e.target.closest('.link-to-environment-stat')) {
            e.preventDefault();
            if(typeof navigateTo === 'function') navigateTo('environment-stat-view');
        }
    });
});

// ============================================================
// MAINTENANCE NOTE â€” Real-Time Issue Detection Engine
// ============================================================

/** Internal state for the scanner */
let _mnScannerInterval = null;
let _mnDetectedIssues  = [];   // { id, datasetName, issueType, severity, description, qualityScore, detectedAt, isSent, sentAt, backendId }
let _mnActivityLog     = [];   // { time, msg, ok }

function _mnSeverityColor(sev) {
    return { critical: '#ef4444', high: '#f97316', medium: '#facc15', low: '#34d399' }[sev] || '#94a3b8';
}
function _mnSeverityBg(sev) {
    return { critical: 'rgba(239,68,68,.15)', high: 'rgba(249,115,22,.12)', medium: 'rgba(250,204,21,.12)', low: 'rgba(52,211,153,.12)' }[sev] || 'rgba(148,163,184,.1)';
}
function _mnIssueIcon(type) {
    const icons = {
        quality:      'ðŸ“‰', pipeline: 'âš™ï¸',
        missing_data: 'ðŸ—‚ï¸', schema_error: 'âš ï¸', drift: 'ðŸ“Š'
    };
    return icons[type] || 'ðŸ””';
}
function _mnIssueLabel(type) {
    return { quality: 'Low Quality Score', pipeline: 'Pipeline Error', missing_data: 'Missing Data', schema_error: 'Schema Error', drift: 'Data Drift', env_server: 'Server Alert' }[type] || type;
}

/** Detect issues from user's data entries */
function _mnScanEntries() {
    const entries = (currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
    const newIssues = [];

    entries.forEach((entry, idx) => {
        const score = window.getDatasetQualityInfo(entry).finalScore;
        const name  = entry.fileName || entry.name || `Dataset-${idx+1}`;
        const seed  = entry.id || (idx + 1);

        // Rule 1: Quality score critically low
        if (score > 0 && score < 60) {
            const key = `quality-${name}`;
            if (!_mnDetectedIssues.find(i => i.key === key)) {
                newIssues.push({ key, datasetName: name, issueType: 'quality', severity: 'critical',
                    description: `Quality score ${score}% is critically below the 60% threshold. Immediate action required.`,
                    qualityScore: score, detectedAt: new Date().toISOString(), isSent: false });
            }
        }
        // Rule 2: Quality score low
        else if (score > 0 && score < 80) {
            const key = `quality-low-${name}`;
            if (!_mnDetectedIssues.find(i => i.key === key)) {
                newIssues.push({ key, datasetName: name, issueType: 'quality', severity: 'high',
                    description: `Quality score ${score}% is below the recommended 80% threshold.`,
                    qualityScore: score, detectedAt: new Date().toISOString(), isSent: false });
            }
        }
        // Rule 3: Missing description
        if (!entry.description || entry.description.trim().length < 5) {
            const key = `missing-desc-${name}`;
            if (!_mnDetectedIssues.find(i => i.key === key)) {
                newIssues.push({ key, datasetName: name, issueType: 'missing_data', severity: 'medium',
                    description: `Dataset "${name}" has no description. Documentation is required for traceability.`,
                    qualityScore: score, detectedAt: new Date().toISOString(), isSent: false });
            }
        }
        // Rule 4: Pipeline stuck in-progress too long (simulated)
        if (entry.activity === 'in-progress') {
            const seededProb = (Math.sin(seed * 9301 + 49297) * 233280);
            const prob = seededProb - Math.floor(seededProb);
            if (prob > 0.7) {
                const key = `pipeline-stuck-${name}`;
                if (!_mnDetectedIssues.find(i => i.key === key)) {
                    newIssues.push({ key, datasetName: name, issueType: 'pipeline', severity: 'high',
                        description: `Pipeline for "${name}" has been in "In Progress" state for an extended period. Possible pipeline hang or error.`,
                        qualityScore: score, detectedAt: new Date().toISOString(), isSent: false });
                }
            }
        }
        // Rule 5: No file type
        if (!entry.fileType || entry.fileType === '') {
            const key = `schema-${name}`;
            if (!_mnDetectedIssues.find(i => i.key === key)) {
                newIssues.push({ key, datasetName: name, issueType: 'schema_error', severity: 'low',
                    description: `Dataset "${name}" has no file type recorded. This may indicate an incomplete schema definition.`,
                    qualityScore: score, detectedAt: new Date().toISOString(), isSent: false });
            }
        }

        // Rule 6: Environment Dashboard Issues
        let statusVal = getSeededRand(seed, 0, 100);
        if (statusVal > 60) {
            let cpu = Math.floor(getSeededRand(seed+2, 10, 95));
            let ram = Math.floor(getSeededRand(seed+3, 20, 90));
            if (statusVal > 85) { cpu = Math.max(cpu, 85); ram = Math.max(ram, 85); }
            
            const isCritical = statusVal > 85;
            const envSeverity = isCritical ? 'critical' : 'high';
            const key = `env-server-${name}`;
            if (!_mnDetectedIssues.find(i => i.key === key)) {
                newIssues.push({ key, datasetName: name, issueType: 'env_server', severity: envSeverity,
                    description: `Server for "${name}" is in ${isCritical?'CRITICAL':'WARNING'} state. Immediate attention required.`,
                    cpu: cpu, ram: ram, entryId: seed,
                    qualityScore: score, detectedAt: new Date().toISOString(), isSent: false });
            }
        }
    });

    if (newIssues.length > 0) {
        _mnDetectedIssues = [..._mnDetectedIssues, ...newIssues];
        _mnLog(`ðŸ” Scanner detected ${newIssues.length} new issue(s)`, true);
    }
}

function _mnLog(msg, ok = true) {
    _mnActivityLog.unshift({ time: new Date().toLocaleTimeString('id-ID'), msg, ok });
    if (_mnActivityLog.length > 20) _mnActivityLog.pop();
    _mnRenderLog();
}

function _mnRenderLog() {
    const logEl = document.getElementById('mn-activity-log');
    if (!logEl) return;
    if (_mnActivityLog.length === 0) {
        logEl.innerHTML = '<p style="color:#64748b;font-size:0.85rem;text-align:center;padding:1rem;">Activity log will appear hereâ€¦</p>';
        return;
    }
    logEl.innerHTML = _mnActivityLog.map(l => `
        <div style="display:flex;gap:0.5rem;align-items:flex-start;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.82rem;">
            <span style="color:${l.ok?'#34d399':'#f87171'};flex-shrink:0;">${l.ok?'âœ“':'âœ—'}</span>
            <span style="color:#94a3b8;flex-shrink:0;">${l.time}</span>
            <span style="color:${l.ok?'#cbd5e1':'#fca5a5'};">${l.msg}</span>
        </div>`).join('');
}

function _mnRenderIssues() {
    const listEl = document.getElementById('mn-issue-list');
    const countEl = document.getElementById('mn-issue-count');
    if (!listEl) return;

    const user = currentUser;
    if (countEl) countEl.textContent = _mnDetectedIssues.length;

    if (_mnDetectedIssues.length === 0) {
        listEl.innerHTML = `
            <div style="text-align:center;padding:3rem 1rem;color:#64748b;">
                <div style="font-size:2.5rem;margin-bottom:0.5rem;">âœ…</div>
                <p style="font-size:1rem;margin:0;">No issues detected. Scanner is runningâ€¦</p>
                <p style="font-size:0.85rem;margin-top:0.25rem;">Next scan in a few seconds.</p>
            </div>`;
        return;
    }

    listEl.innerHTML = _mnDetectedIssues.map((issue, idx) => {
        const color = _mnSeverityColor(issue.severity);
        const bg    = _mnSeverityBg(issue.severity);
        const sentBadge = issue.isSent
            ? `<span style="font-size:0.72rem;padding:2px 8px;border-radius:20px;background:rgba(52,211,153,.2);color:#34d399;font-weight:600;">âœ… Terkirim ke IC</span>`
            : '';
        const sendBtn = issue.isSent ? '' : `
            <button id="mn-send-btn-${idx}" onclick="window.mnSendToIC(${idx})"
                style="padding:0.45rem 1rem;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:0.82rem;font-weight:600;display:flex;align-items:center;gap:0.4rem;transition:opacity .2s;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                Kirim ke IC
            </button>`;
        const detectedTime = new Date(issue.detectedAt).toLocaleString('id-ID');

        return `
        <div id="mn-card-${idx}" style="background:${bg};border:1px solid ${color}40;border-left:4px solid ${color};border-radius:10px;padding:1.1rem 1.2rem;margin-bottom:0.85rem;transition:all .3s;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.5rem;">
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    <span style="font-size:1.2rem;">${_mnIssueIcon(issue.issueType)}</span>
                    <div>
                        <div style="font-weight:700;color:#f1f5f9;font-size:0.95rem;">${issue.datasetName}</div>
                        <div style="font-size:0.78rem;color:#94a3b8;">${detectedTime}</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                    <span style="font-size:0.72rem;padding:2px 8px;border-radius:20px;background:${color}30;color:${color};font-weight:700;text-transform:uppercase;">${issue.severity}</span>
                    <span style="font-size:0.72rem;padding:2px 8px;border-radius:20px;background:rgba(148,163,184,.15);color:#94a3b8;">${_mnIssueLabel(issue.issueType)}</span>
                    ${sentBadge}
                </div>
            </div>
            <p style="color:#cbd5e1;font-size:0.88rem;margin:0.4rem 0 0.8rem 0;line-height:1.5;">${issue.description}</p>
            ${issue.issueType === 'env_server' ? `
            <div style="margin: 0.8rem 0; padding: 1.2rem; background: rgba(15,23,42,0.7); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);">
                <div style="display:flex; justify-content:space-between; margin-bottom: 0.6rem; font-size: 0.85rem; color:#cbd5e1; font-weight:500;">
                    <span><span style="color:${issue.cpu > 85 ? '#ef4444' : '#fbbf24'};">ðŸ”¥</span> CPU Usage: ${issue.cpu}%</span>
                    <span><span style="color:${issue.ram > 85 ? '#ef4444' : '#a855f7'};">ðŸ§ </span> RAM Usage: ${issue.ram}%</span>
                </div>
                <div style="display:flex; gap: 1.5rem;">
                    <div style="flex:1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow:hidden;">
                        <div style="width: ${issue.cpu}%; height: 100%; background: ${issue.cpu > 85 ? '#ef4444' : '#fbbf24'}; border-radius: 4px;"></div>
                    </div>
                    <div style="flex:1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow:hidden;">
                        <div style="width: ${issue.ram}%; height: 100%; background: ${issue.ram > 85 ? '#ef4444' : '#a855f7'}; border-radius: 4px;"></div>
                    </div>
                </div>
                <div style="margin-top: 1.2rem; text-align: left;">
                    <button onclick="window.openEnvMonitoring('${issue.entryId}')" style="background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; padding: 0.5rem 1.2rem; border-radius: 6px; color: white; cursor: pointer; font-size: 0.8rem; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);">
                        <svg style="width:14px; height:14px; vertical-align:middle; margin-right:4px;" viewBox="0 0 24 24" fill="currentColor"><path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z"/></svg>
                        Buka Live Monitoring
                    </button>
                </div>
            </div>
            ` : ''}
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
                <span style="font-size:0.8rem;color:#64748b;">Quality Score: <strong style="color:${color};">${issue.qualityScore || 0}%</strong></span>
                <div id="mn-send-area-${idx}" style="display:flex;align-items:center;gap:0.5rem;">
                    ${sendBtn}
                </div>
            </div>
        </div>`;
    }).join('');
}

/** Send a specific issue to Intelligence Creation via backend API */
window.mnSendToIC = async function(idx) {
    const issue = _mnDetectedIssues[idx];
    if (!issue || issue.isSent) return;

    const sendArea = document.getElementById(`mn-send-area-${idx}`);
    const btn      = document.getElementById(`mn-send-btn-${idx}`);
    if (btn) { btn.disabled = true; btn.innerHTML = 'â³ Mengirimâ€¦'; }

    const sentBy = (currentUser && currentUser.username) ? currentUser.username : 'unknown';

    try {
        // Step 1: Simpan issue ke backend kita
        const createResp = await fetch(window.API_BASE + '/maintenance-issues/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': _getCSRF() },
            body: JSON.stringify({
                dataset_name:  issue.datasetName,
                issue_type:    issue.issueType,
                severity:      issue.severity,
                description:   issue.description,
                quality_score: issue.qualityScore,
                sent_by:       sentBy,
            })
        });

        if (!createResp.ok) throw new Error(`Backend error ${createResp.status}`);
        const created = await createResp.json();

        // Step 2: Kirim ke API Intelligence Creation
        const sendResp = await fetch(`/api/maintenance-issues/${created.id}/send_to_ic/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': _getCSRF() },
            body: JSON.stringify({ sent_by: sentBy })
        });

        const sendData = await sendResp.json();

        if (sendResp.ok && sendData.status === 'sent') {
            _mnDetectedIssues[idx].isSent     = true;
            _mnDetectedIssues[idx].sentAt     = sendData.sent_at;
            _mnDetectedIssues[idx].backendId  = created.id;
            _mnLog(`âœ… Issue "${issue.datasetName}" (${issue.issueType}) berhasil dikirim ke Intelligence Creation`, true);
            if (sendArea) sendArea.innerHTML = `<span style="font-size:0.82rem;color:#34d399;font-weight:600;">âœ… Terkirim ${new Date().toLocaleTimeString('id-ID')}</span>`;
        } else if (sendData.status === 'failed') {
            // IC belum online â€” tapi data sudah tersimpan di backend kita
            _mnDetectedIssues[idx].backendId = created.id;
            _mnLog(`âš ï¸ Data tersimpan (ID:${created.id}) tapi IC belum bisa dijangkau: ${sendData.error}`, false);
            if (sendArea) sendArea.innerHTML = `
                <span style="font-size:0.78rem;color:#f97316;">âš ï¸ Tersimpan, IC offline</span>
                <button onclick="window.mnRetrySend(${idx},${created.id},'${sentBy}')"
                    style="padding:0.35rem 0.7rem;background:#f97316;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.78rem;">
                    Coba Lagi
                </button>`;
        }
    } catch (err) {
        _mnLog(`âŒ Gagal mengirim issue "${issue.datasetName}": ${err.message}`, false);
        if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg> Kirim ke IC'; }
    }
};

/** Retry sending a stored issue to IC */
window.mnRetrySend = async function(idx, backendId, sentBy) {
    const issue = _mnDetectedIssues[idx];
    const sendArea = document.getElementById(`mn-send-area-${idx}`);
    if (sendArea) sendArea.innerHTML = '<span style="color:#94a3b8;font-size:0.82rem;">â³ Mencoba ulangâ€¦</span>';
    try {
        const resp = await fetch(`/api/maintenance-issues/${backendId}/send_to_ic/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': _getCSRF() },
            body: JSON.stringify({ sent_by: sentBy })
        });
        const data = await resp.json();
        if (resp.ok && (data.status === 'sent' || data.status === 'already_sent')) {
            _mnDetectedIssues[idx].isSent = true;
            _mnLog(`âœ… Retry berhasil â€” Issue ID:${backendId} terkirim ke IC`, true);
            if (sendArea) sendArea.innerHTML = `<span style="font-size:0.82rem;color:#34d399;">âœ… Terkirim ${new Date().toLocaleTimeString('id-ID')}</span>`;
        } else {
            _mnLog(`âŒ Retry gagal: ${data.error || 'Unknown error'}`, false);
            if (sendArea) sendArea.innerHTML = `<button onclick="window.mnRetrySend(${idx},${backendId},'${sentBy}')"
                style="padding:0.35rem 0.7rem;background:#f97316;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.78rem;">ðŸ”„ Coba Lagi</button>`;
        }
    } catch(e) {
        _mnLog(`âŒ Retry error: ${e.message}`, false);
    }
};

function _getCSRF() {
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='));
    return cookie ? cookie.trim().split('=')[1] : '';
}

/** Start the real-time scanner */
function _mnStartScanner() {
    if (_mnScannerInterval) clearInterval(_mnScannerInterval);
    _mnScanEntries(); // immediate first scan
    _mnScannerInterval = setInterval(() => {
        _mnScanEntries();
        _mnRenderIssues();
        // update pulse indicator
        const dot = document.getElementById('mn-scanner-dot');
        if (dot) { dot.style.opacity = '0'; setTimeout(() => { if(dot) dot.style.opacity = '1'; }, 300); }
    }, 5000);
    _mnLog('ðŸš€ Real-time scanner started (interval: 5s)', true);
}

function _mnStopScanner() {
    if (_mnScannerInterval) { clearInterval(_mnScannerInterval); _mnScannerInterval = null; }
    _mnLog('â¹ Scanner stopped', false);
    const dot = document.getElementById('mn-scanner-dot');
    if (dot) dot.style.background = '#64748b';
}

window.renderMaintainerNote = function() {
    const alertsView = document.getElementById('alerts-view');
    if (!alertsView) return;

    // Find or create the main container inside alerts-view
    let container = alertsView.querySelector('.alerts-container');
    if (!container) container = alertsView;

    container.innerHTML = `
    <div style="max-width:900px;margin:0 auto;padding:1.5rem 1rem;">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
            <div>
                <h2 style="margin:0;font-size:1.5rem;font-weight:700;color:#f1f5f9;">Maintenance Note</h2>
                <p style="margin:0.25rem 0 0 0;font-size:0.9rem;color:#64748b;">Real-time issue detection & reporting to Intelligence Creation</p>
            </div>
            <div style="display:flex;align-items:center;gap:0.75rem;">
                <div style="display:flex;align-items:center;gap:0.4rem;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.25);border-radius:20px;padding:0.35rem 0.85rem;">
                    <span id="mn-scanner-dot" style="width:8px;height:8px;border-radius:50%;background:#34d399;display:inline-block;animation:mn-pulse 1.5s ease infinite;"></span>
                    <span style="font-size:0.8rem;color:#34d399;font-weight:600;">Scanner Active</span>
                </div>
                <button onclick="_mnStopScanner()" id="mn-stop-btn"
                    style="padding:0.4rem 0.9rem;background:rgba(248,113,113,.15);color:#f87171;border:1px solid rgba(248,113,113,.3);border-radius:8px;cursor:pointer;font-size:0.82rem;font-weight:600;">
                    â¹ Stop
                </button>
                <button onclick="_mnStartScanner();_mnRenderIssues();"
                    style="padding:0.4rem 0.9rem;background:rgba(99,102,241,.2);color:#818cf8;border:1px solid rgba(99,102,241,.3);border-radius:8px;cursor:pointer;font-size:0.82rem;font-weight:600;">
                    ðŸ”„ Scan Now
                </button>
            </div>
        </div>

        <!-- Stats row -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;margin-bottom:1.5rem;">
            <div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);border-radius:10px;padding:0.85rem;text-align:center;">
                <div style="font-size:1.6rem;font-weight:700;color:#ef4444;" id="mn-critical-count">0</div>
                <div style="font-size:0.75rem;color:#94a3b8;margin-top:2px;">Critical</div>
            </div>
            <div style="background:rgba(249,115,22,.1);border:1px solid rgba(249,115,22,.25);border-radius:10px;padding:0.85rem;text-align:center;">
                <div style="font-size:1.6rem;font-weight:700;color:#f97316;" id="mn-high-count">0</div>
                <div style="font-size:0.75rem;color:#94a3b8;margin-top:2px;">High</div>
            </div>
            <div style="background:rgba(250,204,21,.1);border:1px solid rgba(250,204,21,.25);border-radius:10px;padding:0.85rem;text-align:center;">
                <div style="font-size:1.6rem;font-weight:700;color:#facc15;" id="mn-medium-count">0</div>
                <div style="font-size:0.75rem;color:#94a3b8;margin-top:2px;">Medium</div>
            </div>
            <div style="background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.25);border-radius:10px;padding:0.85rem;text-align:center;">
                <div style="font-size:1.6rem;font-weight:700;color:#34d399;" id="mn-sent-count">0</div>
                <div style="font-size:0.75rem;color:#94a3b8;margin-top:2px;">Sent to IC</div>
            </div>
        </div>

        <!-- Two-column: Issues + Log -->
        <div style="display:grid;grid-template-columns:1fr 320px;gap:1.25rem;align-items:start;">

            <!-- Issues panel -->
            <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
                    <h3 style="margin:0;font-size:1rem;font-weight:600;color:#e2e8f0;">
                        Detected Issues <span id="mn-issue-count" style="margin-left:6px;background:rgba(239,68,68,.2);color:#f87171;font-size:0.75rem;padding:2px 8px;border-radius:20px;">0</span>
                    </h3>
                    <button onclick="_mnDetectedIssues=[];_mnRenderIssues();_mnUpdateStats();"
                        style="font-size:0.75rem;color:#64748b;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:0.25rem 0.6rem;cursor:pointer;">
                        Clear All
                    </button>
                </div>
                <div id="mn-issue-list">
                    <div style="text-align:center;padding:2rem;color:#64748b;">
                        <div style="font-size:2rem;margin-bottom:0.5rem;">ðŸ”</div>
                        <p style="margin:0;font-size:0.9rem;">Starting scannerâ€¦</p>
                    </div>
                </div>
            </div>

            <!-- Activity Log -->
            <div style="position:sticky;top:1rem;">
                <h3 style="margin:0 0 0.75rem 0;font-size:0.9rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Activity Log</h3>
                <div id="mn-activity-log" style="background:rgba(15,23,42,0.7);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:0.75rem;height:360px;overflow-y:auto;font-family:monospace;">
                    <p style="color:#64748b;font-size:0.85rem;text-align:center;padding:1rem;">Initializingâ€¦</p>
                </div>
            </div>
        </div>
    </div>
    <style>
    @keyframes mn-pulse {
        0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(52,211,153,.4);}
        50%{opacity:.7;box-shadow:0 0 0 6px rgba(52,211,153,0);}
    }
    </style>
    `;

    // Start scanner & initial render
    _mnStartScanner();
    setTimeout(() => { _mnRenderIssues(); _mnUpdateStats(); }, 600);
};

function _mnUpdateStats() {
    const issues = _mnDetectedIssues;
    const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    setTxt('mn-critical-count', issues.filter(i => i.severity === 'critical').length);
    setTxt('mn-high-count',     issues.filter(i => i.severity === 'high').length);
    setTxt('mn-medium-count',   issues.filter(i => i.severity === 'medium' || i.severity === 'low').length);
    setTxt('mn-sent-count',     issues.filter(i => i.isSent).length);
    setTxt('mn-issue-count',    issues.length);
}

// Override interval to also call stats update
if (_mnScannerInterval) {
    clearInterval(_mnScannerInterval);
    _mnScannerInterval = setInterval(() => {
        _mnScanEntries();
        _mnRenderIssues();
        _mnUpdateStats();
    }, 5000);
}


window.renderImplementationActivity = function() {
    console.log("Render Implementation Activity View");
    const container = document.getElementById("activity-list");
    if (!container) return;
    const entries = (typeof currentUser !== "undefined" && currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
    if (entries.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--light-text-muted);">No recent activities.</p>';
        return;
    }
    container.innerHTML = entries.map((entry, idx) => {
        let seed = entry.id || (idx + 1);
        let act = entry.activity === 'in-progress' ? 'Model Training Started' : 'Deployment Successful';
        let color = entry.activity === 'in-progress' ? '#fbbf24' : '#34d399';
        return `
            <div class="card p-4" style="margin-bottom: 1rem; border-left: 4px solid ${color};">
                <div style="display:flex; justify-content: space-between; margin-bottom: 10px;">
                    <h4 style="margin:0;">${entry.name}</h4>
                    <span style="font-size: 0.8rem; color: var(--light-text-muted);">${new Date(entry.created_at || Date.now()).toISOString().split('T')[0]}</span>
                </div>
                <div style="display:flex; align-items: center;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; margin-right: 8px;"></div>
                    <span style="color: #e2e8f0;">${act}</span>
                </div>
            </div>
        `;
    }).join('');
};


/* ==========================================================================
   MODEL TRANSACTION MODAL LOGIC
   ========================================================================== */
let mtChartFeature = null;
let mtChartOutput = null;
let mtChartRadar = null;

window.closeModelDetails = function() {
    const modal = document.getElementById('mt-details-modal');
    if(modal) modal.style.display = 'none';
};

// Setup tabs

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
                    if (typeof currentUser !== 'undefined' && currentUser) {
        const sessionSnap = Object.assign({}, currentUser);
        delete sessionSnap.dataEntries;
        localStorage.setItem('insight_session_v2', JSON.stringify(sessionSnap));
    }
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
        
        if (typeof currentUser !== 'undefined' && currentUser) {
        const sessionSnap = Object.assign({}, currentUser);
        delete sessionSnap.dataEntries;
        localStorage.setItem('insight_session_v2', JSON.stringify(sessionSnap));
    }
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
            if (typeof currentUser !== 'undefined' && currentUser) {
        const sessionSnap = Object.assign({}, currentUser);
        delete sessionSnap.dataEntries;
        localStorage.setItem('insight_session_v2', JSON.stringify(sessionSnap));
    }
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


document.addEventListener('DOMContentLoaded', () => {
    // Notification UI Init
    if (typeof window.initNotificationUI === 'function') {
        window.initNotificationUI();
        window.renderNotifications();
    }

    document.body.addEventListener('click', (e) => {
        if(e.target.classList.contains('mt-tab-btn')) {
            const modal = document.getElementById('mt-details-modal');
            const btns = modal.querySelectorAll('.mt-tab-btn');
            const contents = modal.querySelectorAll('.mt-tab-content');
            
            btns.forEach(b => b.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            contents.forEach(c => c.style.display = 'none');
            
            e.target.classList.add('active');
            const targetId = e.target.getAttribute('data-target');
            const targetContent = document.getElementById(targetId);
            if(targetContent) {
                targetContent.classList.add('active');
                targetContent.style.display = 'block';
            }
        }
    });
});

// Helper: get dataUrl from entry (memory, IndexedDB, or server pdfUrl)
async function getDataUrlFromEntry(ent) {
    if (ent.pdfUrl) {
        try {
            const url = ent.pdfUrl;
            const res = await fetch(url);
            const blob = await res.blob();
            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch(e) { console.error("Failed to fetch pdfUrl", e); }
    }
    let dataUrl = ent.fileDataUrl || null;
    if (!dataUrl && ent._idbKey) {
        dataUrl = await getFileDataUrl(ent._idbKey).catch(() => null);
    }
    return dataUrl;
}

// Helper: parse JSON file content
async function tryParseJsonEntry(ent) {
    const dataUrl = await getDataUrlFromEntry(ent);
    if (!dataUrl) return null;
    try {
        const base64 = dataUrl.split(',')[1];
        const text = decodeURIComponent(escape(atob(base64)));
        const parsed = JSON.parse(text);
        return parsed;
    } catch (e) { return null; }
}

// Helper: extract text from PDF using PDF.js, then parse known fields
async function tryParsePdfEntry(ent) {
    const dataUrl = await getDataUrlFromEntry(ent);
    if (!dataUrl) return null;
    return new Promise(async (resolve) => {
        const requestedFields = [
            'nama barang', 'Harga Barang', 'waktu order barang', 'perkiraan waktu tiba',
            'Negara asal produk', 'Alamat Konsumen', 'Berat barang', 'Tingkat Kelangkaan barang',
            'Biaya Pajak Bea Cukai', 'Ongkos Kirim Domestik', 'Biaya Asuransi', 'Total harga'
        ];

        const finalFunctions = {};
        requestedFields.forEach(f => finalFunctions[f] = '-');
        let foundAny = false;

        const parseItemsArray = (arr) => {
            const fullText = arr.join(' ');
            
            for (const field of requestedFields) {
                let fieldRegexPattern = field.replace(/\s+/g, '\\s*');
                let splitParts = fullText.split(new RegExp(fieldRegexPattern, 'i'));
                
                if (splitParts.length === 1 && field.includes(' ')) {
                    const firstWord = field.split(' ')[0];
                    splitParts = fullText.split(new RegExp('\\b' + firstWord + '\\b', 'i'));
                }
                
                if (splitParts.length > 1) {
                    let bestVal = '';
                    let shortestLen = Infinity;
                    
                    for (let i = 1; i < splitParts.length; i++) {
                        if (splitParts[i].trim()) {
                            let val = splitParts[i].replace(/^[\s:=>|\-]+/, '').trim();
                            
                            // 1. Remove lingering words from partial match
                            const fieldWords = field.split(/\s+/);
                            for (let w = 1; w < fieldWords.length; w++) {
                                const wordRegex = new RegExp('^' + fieldWords[w] + '\\\\b', 'i');
                                if (wordRegex.test(val)) {
                                    val = val.replace(wordRegex, '').replace(/^[\s:=>|\-]+/, '').trim();
                                }
                            }
                            
                            // 2. Clean common units (multiple occurrences)
                            val = val.trim();
                            val = val.replace(/^((?:\(Rp\)|\[Rp\]|Rp\.?|RP\.?|\(IDR\)|\[IDR\]|IDR|\(Kg\)|\[Kg\]|Kg\.?|KG\.?|\(Level\)|\[Level\]|\(opsional\)|\[opsional\])\s*)+/i, '').replace(/^[\s:=>|\-,]+/, '').trim();
                            val = val.replace(/(\s*(?:\(Rp\)|\[Rp\]|Rp\.?|RP\.?|\(IDR\)|\[IDR\]|IDR|\(Kg\)|\[Kg\]|Kg\.?|KG\.?|\(Level\)|\[Level\]|\(opsional\)|\[opsional\]))+$/i, '').replace(/[\s:=>|\-,]+$/, '').trim();
                            
                            if (val) {
                                let earliestIdx = val.length;
                            
                                for (const otherField of requestedFields) {
                                    if (otherField.toLowerCase() !== field.toLowerCase()) {
                                        const otherFieldRegex = otherField.replace(/\s+/g, '\\s*');
                                        const firstWord = otherField.split(' ')[0];
                                        
                                        let otherMatch = val.match(new RegExp(otherFieldRegex, 'i'));
                                        if (!otherMatch && otherField.includes(' ')) {
                                            otherMatch = val.match(new RegExp('\\b' + firstWord + '\\b', 'i'));
                                        }
                                        
                                        if (otherMatch && otherMatch.index >= 0 && otherMatch.index < earliestIdx) {
                                            earliestIdx = otherMatch.index;
                                        }
                                    }
                                }
                            
                                const truncatedVal = val.substring(0, earliestIdx).replace(/[\s:=>|\-]+$/, '').trim();
                                
                                // Heuristic: skip false positive paragraph mentions
                                const hasDigit = /\d/.test(truncatedVal);
                                const isNumericField = /harga|biaya|berat|waktu|ongkos/i.test(field);
                                const alphaOnly = truncatedVal.replace(/[^a-zA-Z]/g, '');
                                
                                let isValid = true;
                                if (isNumericField && !hasDigit && !/gratis|free|\.\.\./i.test(truncatedVal)) isValid = false;
                                if (!isNumericField && !hasDigit && alphaOnly.length < 3 && !/\.\.\./.test(truncatedVal)) isValid = false;
                                
                                if (isValid && truncatedVal.length > 0 && truncatedVal.length < shortestLen) {
                                    shortestLen = truncatedVal.length;
                                    bestVal = truncatedVal;
                                }
                            }
                        }
                    }
                    
                    if (field.toLowerCase() === 'total harga') {
                        finalFunctions[field] = '-';
                        foundAny = true;
                    } else if (bestVal && !requestedFields.some(f => f.toLowerCase() === bestVal.toLowerCase())) {
                        finalFunctions[field] = bestVal;
                        foundAny = true;
                    }
                }
            }
        };

        let rawItems = [];
        
        try {
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc || !pdfjsLib.GlobalWorkerOptions.workerSrc.startsWith('blob:')) {
            try {
                const workerRes = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');
                const workerBlob = await workerRes.blob();
                pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);
            } catch (workerErr) {
                console.warn("Failed to load worker via blob, falling back to CDN directly", workerErr);
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
        }
        const base64 = dataUrl.split(',')[1];
        const binary = atob(base64);
        const buffer = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);

        const loadingTask = pdfjsLib.getDocument({
            data: buffer,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/'
        });
            const pdfDoc = await loadingTask.promise;

            for (let p = 1; p <= pdfDoc.numPages; p++) {
                const page = await pdfDoc.getPage(p);
                const textContent = await page.getTextContent();
                
                if (textContent.items && textContent.items.length > 0) {
                    const rows = {};
                    textContent.items.forEach(item => {
                        const str = item.str.trim();
                        if (!str) return;
                        const y = item.transform[5];
                        const x = item.transform[4];
                        const roundedY = Math.round(y / 5) * 5;
                        if (!rows[roundedY]) rows[roundedY] = [];
                        rows[roundedY].push({ str: str, x: x });
                    });
                    
                    const sortedY = Object.keys(rows).map(Number).sort((a, b) => b - a);
                    sortedY.forEach(y => {
                        const rowItems = rows[y].sort((a, b) => a.x - b.x);
                        const lineText = rowItems.map(ri => ri.str).join(' ').trim();
                        if (lineText) rawItems.push(lineText);
                    });
                }
            }

            if (rawItems.length > 0) {
                parseItemsArray(rawItems);
            }

            if (!foundAny && typeof Tesseract !== 'undefined') {
                console.warn("No text found in PDF. Attempting OCR...");
                const inputCountLabel = document.getElementById('mt-modal-input-count');
                if (inputCountLabel) inputCountLabel.textContent = 'Input Features (Memproses Gambar/Scan OCR...)';
                
                const worker = await Tesseract.createWorker('ind');
                let ocrWords = [];
                
                const pagesToScan = pdfDoc.numPages;
                for (let p = 1; p <= pagesToScan; p++) {
                    const page = await pdfDoc.getPage(p);
                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                    const imgData = canvas.toDataURL('image/png');

                    const ret = await worker.recognize(imgData);
                    
                    if (ret.data && ret.data.words) {
                        const rows = {};
                        ret.data.words.forEach(w => {
                            const str = w.text.trim();
                            if (!str) return;
                            const y = w.bbox.y0;
                            const x = w.bbox.x0;
                            const roundedY = Math.round(y / 10) * 10;
                            if (!rows[roundedY]) rows[roundedY] = [];
                            rows[roundedY].push({ str: str, x: x });
                        });
                        
                        const sortedY = Object.keys(rows).map(Number).sort((a, b) => a - b);
                        sortedY.forEach(y => {
                            const rowItems = rows[y].sort((a, b) => a.x - b.x);
                            const lineText = rowItems.map(ri => ri.str).join(' ');
                            ocrWords.push(lineText);
                        });
                    }
                }
                
                await worker.terminate();

                if (ocrWords.length > 0) {
                    parseItemsArray(ocrWords);
                }
            }

            if (!foundAny && rawItems.length > 0) {
                finalFunctions['Info Teks 1'] = 'Nama File: "' + (ent ? ent.name : 'Unknown') + '"';
                finalFunctions['Info Teks 2'] = 'Cuplikan isi: ' + rawItems.join(' ').substring(0, 150) + '...';
            } else if (!foundAny) {
                finalFunctions['Info Teks 1'] = 'Nama File: "' + (ent ? ent.name : 'Unknown') + '"';
                finalFunctions['Info Teks 2'] = 'File kosong atau tidak terbaca.';
            }

        } catch(e) {
            console.error("PDF parsing error:", e);
            finalFunctions['Error'] = 'Gagal membaca PDF.';
        }

        resolve(finalFunctions);
    });
}

async function tryParseImageEntry(ent) {
    const dataUrl = await getDataUrlFromEntry(ent);
    if (!dataUrl) return null;
    return new Promise(async (resolve) => {
        const requestedFields = [
            'nama barang', 'Harga Barang', 'waktu order barang', 'perkiraan waktu tiba',
            'Negara asal produk', 'Alamat Konsumen', 'Berat barang', 'Tingkat Kelangkaan barang',
            'Biaya Pajak Bea Cukai', 'Ongkos Kirim Domestik', 'Biaya Asuransi', 'Total harga'
        ];
        
        const finalFunctions = {};
        requestedFields.forEach(f => finalFunctions[f] = '-');
        let foundAny = false;

        try {
            if (typeof Tesseract === 'undefined') {
                finalFunctions['Error'] = 'Tesseract OCR tidak dimuat.';
                return resolve(finalFunctions);
            }

            const worker = await Tesseract.createWorker('ind');
            const ret = await worker.recognize(dataUrl);
            
            let ocrWords = [];
            if (ret.data && ret.data.words) {
                const rows = {};
                ret.data.words.forEach(w => {
                    const str = w.text.trim();
                    if (!str) return;
                    const y = w.bbox.y0;
                    const x = w.bbox.x0;
                    const roundedY = Math.round(y / 10) * 10;
                    if (!rows[roundedY]) rows[roundedY] = [];
                    rows[roundedY].push({ str: str, x: x });
                });
                
                const sortedY = Object.keys(rows).map(Number).sort((a, b) => a - b);
                sortedY.forEach(y => {
                    const rowItems = rows[y].sort((a, b) => a.x - b.x);
                    const lineText = rowItems.map(ri => ri.str).join(' ');
                    ocrWords.push(lineText);
                });
            }
            await worker.terminate();

            const parseItemsArray = (arr) => {
                const fullText = arr.join(' ');
                for (const field of requestedFields) {
                    let fieldRegexPattern = field.replace(/\s+/g, '\\s*');
                    let splitParts = fullText.split(new RegExp(fieldRegexPattern, 'i'));
                    
                    if (splitParts.length === 1 && field.includes(' ')) {
                        const firstWord = field.split(' ')[0];
                        splitParts = fullText.split(new RegExp('\\b' + firstWord + '\\b', 'i'));
                    }
                    
                    if (splitParts.length > 1) {
                        let bestVal = '';
                        let shortestLen = Infinity;
                        
                        for (let i = 1; i < splitParts.length; i++) {
                            if (splitParts[i].trim()) {
                                let val = splitParts[i].replace(/^[\s:=>|\-]+/, '').trim();
                                
                                // 1. Remove lingering words from partial match
                                const fieldWords = field.split(/\s+/);
                                for (let w = 1; w < fieldWords.length; w++) {
                                    const wordRegex = new RegExp('^' + fieldWords[w] + '\\\\b', 'i');
                                    if (wordRegex.test(val)) {
                                        val = val.replace(wordRegex, '').replace(/^[\s:=>|\-]+/, '').trim();
                                    }
                                }
                                
                                // 2. Clean common units (multiple occurrences)
                                val = val.trim();
                                val = val.replace(/^((?:\(Rp\)|\[Rp\]|Rp\.?|RP\.?|\(IDR\)|\[IDR\]|IDR|\(Kg\)|\[Kg\]|Kg\.?|KG\.?|\(Level\)|\[Level\]|\(opsional\)|\[opsional\])\s*)+/i, '').replace(/^[\s:=>|\-,]+/, '').trim();
                                val = val.replace(/(\s*(?:\(Rp\)|\[Rp\]|Rp\.?|RP\.?|\(IDR\)|\[IDR\]|IDR|\(Kg\)|\[Kg\]|Kg\.?|KG\.?|\(Level\)|\[Level\]|\(opsional\)|\[opsional\]))+$/i, '').replace(/[\s:=>|\-,]+$/, '').trim();
                                
                                if (val) {
                                    let earliestIdx = val.length;
                                
                                    for (const otherField of requestedFields) {
                                        if (otherField.toLowerCase() !== field.toLowerCase()) {
                                            const otherFieldRegex = otherField.replace(/\s+/g, '\\s*');
                                            const firstWord = otherField.split(' ')[0];
                                            
                                            let otherMatch = val.match(new RegExp(otherFieldRegex, 'i'));
                                            if (!otherMatch && otherField.includes(' ')) {
                                                otherMatch = val.match(new RegExp('\\b' + firstWord + '\\b', 'i'));
                                            }
                                            
                                            if (otherMatch && otherMatch.index >= 0 && otherMatch.index < earliestIdx) {
                                                earliestIdx = otherMatch.index;
                                            }
                                        }
                                    }
                                
                                    const truncatedVal = val.substring(0, earliestIdx).replace(/[\s:=>|\-]+$/, '').trim();
                                    
                                    // Heuristic: skip false positive paragraph mentions
                                    const hasDigit = /\d/.test(truncatedVal);
                                    const isNumericField = /harga|biaya|berat|waktu|ongkos/i.test(field);
                                    const alphaOnly = truncatedVal.replace(/[^a-zA-Z]/g, '');
                                    
                                    let isValid = true;
                                    if (isNumericField && !hasDigit && !/gratis|free|\.\.\./i.test(truncatedVal)) isValid = false;
                                    if (!isNumericField && !hasDigit && alphaOnly.length < 3 && !/\.\.\./.test(truncatedVal)) isValid = false;
                                    
                                    if (isValid && truncatedVal.length > 0 && truncatedVal.length < shortestLen) {
                                        shortestLen = truncatedVal.length;
                                        bestVal = truncatedVal;
                                    }
                                }
                            }
                        }
                        
                        if (field.toLowerCase() === 'total harga') {
                            finalFunctions[field] = '-';
                            foundAny = true;
                        } else if (bestVal && !requestedFields.some(f => f.toLowerCase() === bestVal.toLowerCase())) {
                            finalFunctions[field] = bestVal;
                            foundAny = true;
                        }
                    }
                }
            };

            if (ocrWords.length > 0) {
                parseItemsArray(ocrWords);
            }

            if (!foundAny && ocrWords.length > 0) {
                finalFunctions['Info Teks 1'] = 'Nama File: "' + (ent ? ent.name : 'Unknown') + '"';
                finalFunctions['Info Teks 2'] = 'Cuplikan isi: ' + ocrWords.join(' ').substring(0, 150) + '...';
            }

        } catch(e) {
            console.error("Image parsing error:", e);
            finalFunctions['Error'] = 'Gagal memproses gambar.';
        }

        resolve(finalFunctions);
    });
}

window.openModelDetails = function(entryId) {
    window.currentModelDetailsEntryId = entryId;
    const entries = (typeof currentUser !== 'undefined' && currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
    const entry = entries.find(e => String(e.id) === String(entryId)) || entries[0];
    if(!entry) return;
    
    // Seed and properties
    let seed = entry.id || 1;
    let status = entry.activity === 'in-progress' ? 'Training' : 'Deployed';
    let statusClass = status === 'Training' ? 'mt-status-training' : 'mt-status-deployed';
    let accuracyVal = entry ? window.getDatasetQualityInfo(entry).finalScore : parseFloat(getSeededRand(seed, 80, 99).toFixed(1));
    let context = window.getContextualFeatures(entry.name, seed);
    let modelType = context.type;
    let version = "v" + Math.floor(getSeededRand(seed + 2, 1, 4)) + "." + Math.floor(getSeededRand(seed + 3, 0, 9)) + ".0";
    let inputCount = context.features.length;
    let predictions = Math.floor(getSeededRand(seed + 6, 10, 800));
    
    // Header
    document.getElementById('mt-modal-title').textContent = entry.name;
    document.getElementById('mt-modal-status').textContent = status;
    document.getElementById('mt-modal-status').className = 'mt-status-badge ' + statusClass;
    document.getElementById('mt-modal-type').textContent = modelType;
    document.getElementById('mt-modal-version').textContent = version;
    document.getElementById('mt-modal-accuracy').textContent = accuracyVal + '%';
    
    async function loadInputFeatures() {
        if (!entry) return;

        let parsed = null;
    
        let isPdf = entry.fileType && entry.fileType.includes('pdf');
        let isImage = entry.fileType && entry.fileType.includes('image');
        let isJson = entry.fileType && entry.fileType.includes('json');

    // Tab 1: Inputs
    const featGrid = document.getElementById('mt-modal-features-list');
    const inputCountLabel = document.getElementById('mt-modal-input-count');
    inputCountLabel.textContent = `Input Features (Loading...)`;
    featGrid.innerHTML = '<p style="color: var(--light-text-muted);">Membaca file...</p>';

    // Helper: render function fields into the grid
    function renderInputGrid(functions) {
        const keys = Object.keys(functions);
        inputCountLabel.textContent = `Input Features (${keys.length})`;
        featGrid.innerHTML = Object.entries(functions).map(([k, v]) => `
            <div class="mt-feature-item" style="display: flex; justify-content: space-between; width: 100%;">
                <div><span class="mt-feature-hash">#</span> <strong>${k}</strong></div>
                <div style="color: var(--light-text);">${v}</div>
            </div>
        `).join('');
    }

        if (isJson) {
            parsed = await tryParseJsonEntry(entry);
        } else if (isPdf) {
            inputCountLabel.textContent = 'Input Features (Membaca PDF...)';
            parsed = await tryParsePdfEntry(entry);
        } else if (isImage) {
            inputCountLabel.textContent = 'Input Features (Memproses Gambar OCR...)';
            parsed = await tryParseImageEntry(entry);
        } else {
            // Try JSON anyway just in case
            parsed = await tryParseJsonEntry(entry);
        }

        if (parsed) {
            const funcObj = parsed.functions || parsed;
            window.parsedFunctionsCache = window.parsedFunctionsCache || {};
            window.parsedFunctionsCache[entry.id] = funcObj;
            renderInputGrid(funcObj);
            return;
        }

        // 4) Fallback: read from mock_transaction.json if parsing failed
        try {
            renderInputGrid({});
        } catch (err) {
            console.error("Gagal membaca file:", err);
            inputCountLabel.textContent = `Input Features (Error)`;
            featGrid.innerHTML = '<p style="color: #ef4444;">Gagal membaca file transkrip.</p>';
        }
    }

    loadInputFeatures();
        
    let selectedFeatures = context.features; // tetap ada untuk chart di bagian bawah
    
    // Tab 2: Outputs
    const outputsList = document.getElementById('mt-modal-outputs-list');
    let out1 = context.out1, out2 = context.out2;
    outputsList.innerHTML = `
        <div class="mt-output-item">
            <div class="mt-output-idx">1</div>
            <div class="mt-output-text">
                <span class="mt-output-lbl">Output Label</span>
                <span class="mt-output-val">${out1}</span>
            </div>
        </div>
        <div class="mt-output-item">
            <div class="mt-output-idx">2</div>
            <div class="mt-output-text">
                <span class="mt-output-lbl">Output Label</span>
                <span class="mt-output-val">${out2}</span>
            </div>
        </div>
    `;
    document.getElementById('mt-ps-total').textContent = (predictions * 1000).toLocaleString();
    document.getElementById('mt-ps-date').textContent = new Date(entry.created_at || Date.now()).toISOString().split('T')[0];
    document.getElementById('mt-ps-version').textContent = version;
    
    // Tab 3: Performance
    let prec = (accuracyVal - getSeededRand(seed, 1, 3)).toFixed(1);
    let rec = (accuracyVal - getSeededRand(seed+1, 2, 5)).toFixed(1);
    let f1 = (accuracyVal - getSeededRand(seed+2, 1, 4)).toFixed(1);
    
    document.getElementById('mt-pc-acc').textContent = accuracyVal + '%';
    document.getElementById('mt-pc-fill-acc').style.width = accuracyVal + '%';
    document.getElementById('mt-pc-prec').textContent = prec + '%';
    document.getElementById('mt-pc-fill-prec').style.width = prec + '%';
    document.getElementById('mt-pc-rec').textContent = rec + '%';
    document.getElementById('mt-pc-fill-rec').style.width = rec + '%';
    document.getElementById('mt-pc-f1').textContent = f1 + '%';
    document.getElementById('mt-pc-fill-f1').style.width = f1 + '%';
    
    // Render Charts
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";
    
    // Feature chart
    if(mtChartFeature) mtChartFeature.destroy();
    let featLabels = selectedFeatures.slice(0, 7);
    let featData = featLabels.map((_, i) => getSeededRand(seed+20+i, 0.05, 0.3));
    featData.sort((a,b)=>b-a);
    
    const ctxFeat = document.getElementById('mt-chart-feature').getContext('2d');
    mtChartFeature = new Chart(ctxFeat, {
        type: 'bar',
        data: {
            labels: featLabels,
            datasets: [{
                label: 'Importance',
                data: featData,
                backgroundColor: 'rgba(168, 85, 247, 0.8)',
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, max: 0.5 },
                y: { grid: { display: false } }
            }
        }
    });
    
    // Output pie chart
    if(mtChartOutput) mtChartOutput.destroy();
    const ctxOut = document.getElementById('mt-chart-output').getContext('2d');
    mtChartOutput = new Chart(ctxOut, {
        type: 'pie',
        data: {
            labels: [out1, out2],
            datasets: [{
                data: [50, 50],
                backgroundColor: ['#a855f7', '#ec4899'],
                borderWidth: 1,
                borderColor: '#1e293b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#cbd5e1', padding: 20 } }
            }
        }
    });
    
    // Radar chart
    if(mtChartRadar) mtChartRadar.destroy();
    const ctxRad = document.getElementById('mt-chart-radar').getContext('2d');
    mtChartRadar = new Chart(ctxRad, {
        type: 'radar',
        data: {
            labels: ['Accuracy', 'Precision', 'Recall', 'F1 Score'],
            datasets: [{
                label: 'Performance',
                data: [accuracyVal, prec, rec, f1],
                backgroundColor: 'rgba(74, 222, 128, 0.4)',
                borderColor: '#4ade80',
                pointBackgroundColor: '#4ade80',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255,255,255,0.1)' },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    pointLabels: { color: '#cbd5e1', font: { size: 12 } },
                    ticks: { display: false, min: 0, max: 100 }
                }
            },
            plugins: { legend: { display: false } }
        }
    });

        // Reset to first tab
    const modal = document.getElementById('mt-details-modal');
    modal.querySelectorAll('.mt-tab-btn').forEach(b => b.classList.remove('active'));
    modal.querySelectorAll('.mt-tab-content').forEach(c => { c.classList.remove('active'); c.style.display = 'none'; });
    modal.querySelector('.mt-tab-btn').classList.add('active');
    modal.querySelector('.mt-tab-content').classList.add('active');
    modal.querySelector('.mt-tab-content').style.display = 'block';


    const retrainBtn = document.getElementById('mt-btn-retrain');
    if(retrainBtn) {
        retrainBtn.onclick = () => window.retrainModel(entryId);
    }

    modal.style.display = 'flex';
};

window.retrainModel = async function(entryId) {
    if(!confirm("Are you sure you want to retrain this model? This will start a new training pipeline.")) return;
    
    try {
        const res = await fetch((window.API_BASE || '/api') + '/datasets/' + entryId + '/', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activity: 'in-progress' })
        });
        
        if (res.ok) {
            const entries = (typeof currentUser !== 'undefined' && currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
            const entry = entries.find(e => String(e.id) === String(entryId));
            if (entry) {
                entry.activity = 'in-progress';
                if(typeof currentUser !== 'undefined' && currentUser) {
                    localStorage.setItem('insight_session_v2', JSON.stringify(currentUser));
                    
                    // Also update users array if necessary
                    const users = JSON.parse(localStorage.getItem('insight_users_v2') || '[]');
                    const userIdx = users.findIndex(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
                    if (userIdx !== -1) {
                        users[userIdx].dataEntries = currentUser.dataEntries;
                        localStorage.setItem('insight_users_v2', JSON.stringify(users));
                    }
                }
            }
            
            closeModelDetails();
            if(typeof window.renderModelTransaction === 'function') window.renderModelTransaction();
            
            window.showCustomAlert("Success", "Model retraining started successfully! The model status is now 'Training'.", true);
            if(window.addNotification) window.addNotification("Model Retraining", "Model retraining started successfully.", "success");
        } else {
            alert("Failed to start retraining. Server returned " + res.status);
        }
    } catch(e) {
        console.error(e);
        alert("Error connecting to server to retrain.");
    }
};

/* ==========================================================================
   RUN PREDICTION MODAL LOGIC
   ========================================================================== */
let predChartPie = null;
let predChartBar = null;
let currentPredEntryId = null;

window.closePredictionModal = function() {
    const resultState = document.getElementById('pred-state-result');
    
    // Selalu pastikan proses training di-reset/dibatalkan saat modal ditutup
    if (window.log1Timeout) clearTimeout(window.log1Timeout);
    if (window.log2Timeout) clearTimeout(window.log2Timeout);
    if (window.log3Timeout) clearTimeout(window.log3Timeout);
    if (window.predictionTimeout) clearTimeout(window.predictionTimeout);
    
    // Jika proses sudah selesai dan hasil terlihat (Result State)
    if (resultState && resultState.style.display === 'flex') {
        const iconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="width: 20px; height: 20px;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
        
        window.showCustomConfirm(
            "Hentikan Training",
            "Sesi prediksi ini akan dibatalkan.",
            iconHtml,
            "Status",
            "Training Discarded",
            "Apakah Anda yakin ingin menghentikan proses training dan membuang hasil prediksi ini?",
            function() {
                const modal = document.getElementById('prediction-modal');
                if(modal) modal.style.display = 'none';
                currentPredEntryId = null;
            }
        );
    } else {
        // Jika di state lain, langsung tutup
        const modal = document.getElementById('prediction-modal');
        if(modal) modal.style.display = 'none';
        currentPredEntryId = null;
    }
};

window.resetPredictionModal = function() {
    document.getElementById('pred-state-initial').style.display = 'flex';
    document.getElementById('pred-state-loading').style.display = 'none';
    document.getElementById('pred-state-result').style.display = 'none';
    document.getElementById('pred-footer-initial').style.display = 'flex';
    document.getElementById('pred-footer-result').style.display = 'none';
};

window.openPredictionModal = function(entryId) {
    currentPredEntryId = entryId;
    const entries = (typeof currentUser !== 'undefined' && currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
    const entry = entries.find(e => String(e.id) === String(entryId)) || entries[0];
    if(!entry) return;

    let seed = entry.id || 1;
    let context = window.getContextualFeatures(entry.name, seed);
    let modelType = context.type;

    document.getElementById('pred-modal-subtitle').textContent = entry.name;
    document.getElementById('pred-modal-type').textContent = modelType;

    resetPredictionModal();
    const modal = document.getElementById('prediction-modal');
    modal.style.display = 'flex';
};

window.startPrediction = async function() {
    document.getElementById('pred-state-initial').style.display = 'none';
    document.getElementById('pred-state-loading').style.display = 'flex';
    document.getElementById('pred-footer-initial').style.display = 'none';

    // Reset logs
    const log1 = document.getElementById('pred-log-1');
    const log2 = document.getElementById('pred-log-2');
    const log3 = document.getElementById('pred-log-3');
    [log1, log2, log3].forEach(el => {
        if(el) {
            el.style.opacity = '0.5';
            el.style.color = '#cbd5e1';
        }
    });
    
    // Clear any existing timeouts to prevent overlapping animations
    if (window.log1Timeout) clearTimeout(window.log1Timeout);
    if (window.log2Timeout) clearTimeout(window.log2Timeout);
    if (window.log3Timeout) clearTimeout(window.log3Timeout);
    if (window.predictionTimeout) clearTimeout(window.predictionTimeout);
    
    // Pre-parse data outside of setTimeout to prevent browser worker restrictions
    const entries = (typeof currentUser !== 'undefined' && currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
    const entry = entries.find(e => String(e.id) === String(currentPredEntryId));
    if (entry) {
        window.parsedFunctionsCache = window.parsedFunctionsCache || {};
        if (!window.parsedFunctionsCache[entry.id] || Object.keys(window.parsedFunctionsCache[entry.id]).length === 0) {
            const isPdf = (entry.fileName && entry.fileName.toLowerCase().endsWith('.pdf')) || (entry.fileType && entry.fileType.includes('pdf'));
            const isImage = (entry.fileName && (entry.fileName.toLowerCase().endsWith('.png') || entry.fileName.toLowerCase().endsWith('.jpg') || entry.fileName.toLowerCase().endsWith('.jpeg'))) || (entry.fileType && entry.fileType.includes('image'));
            
            let parsed = null;
            try {
                if (isPdf) parsed = await tryParsePdfEntry(entry);
                else if (isImage) parsed = await tryParseImageEntry(entry);
                else parsed = await tryParseJsonEntry(entry);
            } catch(e) {}
            
            if (parsed) {
                const funcObj = parsed.functions || parsed;
                if (Object.keys(funcObj).length > 0) {
                    window.parsedFunctionsCache[entry.id] = funcObj;
                }
            }
        }
    }

    // Simulate steps
    window.log1Timeout = setTimeout(() => {
        if(log1) { log1.style.opacity = '1'; log1.style.color = '#4ade80'; }
    }, 800);
    
    window.log2Timeout = setTimeout(() => {
        if(log2) { log2.style.opacity = '1'; log2.style.color = '#4ade80'; }
    }, 1800);
    
    window.log3Timeout = setTimeout(() => {
        if(log3) { log3.style.opacity = '1'; log3.style.color = '#4ade80'; }
    }, 2800);
    
    // Capture current ID to prevent global mutation bugs
    const entryIdToPredict = currentPredEntryId;
    
    window.predictionTimeout = setTimeout(() => {
        window.showPredictionResult(entryIdToPredict);
    }, 3500);
};

window.showPredictionResult = async function(passedEntryId) {
    try {
        document.getElementById('pred-state-loading').style.display = 'none';
        document.getElementById('pred-state-result').style.display = 'flex';
        document.getElementById('pred-footer-result').style.display = 'flex';

        const entries = (typeof currentUser !== 'undefined' && currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
        const targetEntryId = passedEntryId || currentPredEntryId;
        const entry = entries.find(e => String(e.id) === String(targetEntryId));
        
        if (!entry) {
            document.getElementById('pred-recom-text').textContent = "Error: Data tidak ditemukan.";
            return;
        }

        let funcData = {};
        window.parsedFunctionsCache = window.parsedFunctionsCache || {};
        
        if (window.parsedFunctionsCache[entry.id] && Object.keys(window.parsedFunctionsCache[entry.id]).length > 0) {
            // DEEP COPY agar data prediksi tidak mencemari View Detail!
            funcData = JSON.parse(JSON.stringify(window.parsedFunctionsCache[entry.id]));
        } else {
            let parsed = null;
            const isPdf = (entry.fileName && entry.fileName.toLowerCase().endsWith('.pdf')) || (entry.fileType && entry.fileType.includes('pdf'));
            const isImage = (entry.fileName && (entry.fileName.toLowerCase().endsWith('.png') || entry.fileName.toLowerCase().endsWith('.jpg') || entry.fileName.toLowerCase().endsWith('.jpeg'))) || (entry.fileType && entry.fileType.includes('image'));

            try {
                if (isPdf) {
                    parsed = await tryParsePdfEntry(entry);
                } else if (isImage) {
                    parsed = await tryParseImageEntry(entry);
                } else {
                    parsed = await tryParseJsonEntry(entry);
                }
            } catch (err) {
                console.error("Gagal memparsing file untuk prediksi:", err);
            }

            if (parsed) {
                const funcObj = parsed.functions || parsed;
                if (Object.keys(funcObj).length > 0) {
                    // Simpan aslinya ke cache
                    window.parsedFunctionsCache[entry.id] = funcObj;
                    // Gunakan DEEP COPY untuk prediksi
                    funcData = JSON.parse(JSON.stringify(funcObj));
                } else {
                    funcData = {}; // Buat objek baru agar tidak ada shared reference
                    let seed = entry.id || 1;
                    let context = window.getContextualFeatures(entry.name, seed);
                    if (Array.isArray(context.features)) {
                        context.features.forEach(f => funcData[f] = '-');
                    }
                }
            } else {
                funcData = {}; // Buat objek baru agar tidak ada shared reference
                let seed = entry.id || 1;
                let context = window.getContextualFeatures(entry.name, seed);
                if (Array.isArray(context.features)) {
                    context.features.forEach(f => funcData[f] = '-');
                }
            }
        }
                
        // Parsing values
        const beratStr = funcData["Berat barang"] || "0 KG";
        const berat = parseFloat(String(beratStr).replace(/[^0-9.]/g, '')) || 0;
        
        const asal = String(funcData["Negara asal produk"] || "Unknown").toLowerCase();
        const tingkatKelangkaan = String(funcData["Tingkat Kelangkaan barang"] || "").toLowerCase();
        const langka = tingkatKelangkaan.includes("langka") && !tingkatKelangkaan.includes("sangat langka");
        const sangatLangka = tingkatKelangkaan.includes("sangat langka");
        
        const konsumen = String(funcData["Alamat Konsumen"] || "").trim();
        const waktuTibaInput = String(funcData["perkiraan waktu tiba"] || "").trim();

        const pajakStr = funcData["Biaya Pajak Bea Cukai"] || "0";
        const pajak = parseFloat(String(pajakStr).replace(/[^0-9]/g, '')) || 0;
        
        const ongkirStr = funcData["Ongkos Kirim Domestik"] || "0";
        const ongkir = parseFloat(String(ongkirStr).replace(/[^0-9]/g, '')) || 0;

        const hargaBarangStr = funcData["Harga Barang"] || "0";
        const hargaBarang = parseFloat(String(hargaBarangStr).replace(/[^0-9]/g, '')) || 0;

        const asuransiStr = funcData["Biaya Asuransi"] || "0";
        const asuransi = parseFloat(String(asuransiStr).replace(/[^0-9]/g, '')) || 0;

        const feeJastip = hargaBarang > 0 ? Math.ceil(hargaBarang / 200000) * 50000 : 0;
        const totalHargaCalculated = hargaBarang + pajak + ongkir + asuransi + feeJastip;

        if (totalHargaCalculated > 0) {
            funcData["Fee Penyedia Jasa"] = "Rp " + feeJastip.toLocaleString('id-ID');
            funcData["Total harga"] = "Rp " + totalHargaCalculated.toLocaleString('id-ID');
        }

        const waktuOrderStr = String(funcData["waktu order barang"] || "").toLowerCase();

        // 1. Detect Consumer Location
        let userLocText = konsumen || ((typeof currentUser !== 'undefined' && currentUser && currentUser.location && currentUser.location !== '-') ? currentUser.location : (Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown"));
        let userLocLower = userLocText.toLowerCase();

        let userContinent = "asia"; // default
        if(userLocLower.includes("europe") || ["jerman", "inggris", "prancis", "belanda", "italia", "spanyol"].includes(userLocLower)) userContinent = "europe";
        else if(userLocLower.includes("america") || ["usa", "amerika", "kanada"].includes(userLocLower)) userContinent = "america";
        else if(userLocLower.includes("australia") || userLocLower.includes("selandia")) userContinent = "australia";
        
        // Approximate source continent
        let sourceContinent = "asia";
        if(["jerman", "inggris", "prancis", "belanda", "italia", "spanyol"].includes(asal)) sourceContinent = "europe";
        else if(["usa", "amerika", "kanada", "meksiko", "amerika utara"].includes(asal)) sourceContinent = "north_america";
        else if(["brazil", "argentina", "chile", "peru", "kolombia", "amerika selatan"].includes(asal)) sourceContinent = "south_america";
        else if(["australia", "selandia baru"].includes(asal)) sourceContinent = "australia";
        else if(["mesir", "afrika selatan", "nigeria", "afrika"].includes(asal)) sourceContinent = "africa";
        
        // 1. Dapatkan Catatan Waktu Tunggu (TIDAK MASUK KALKULASI PREDIKSI)
        let delayMenungguKirim = 0; // Dipaksa 0 agar kalkulasi murni dari rute transit
        let waktuTungguText = "Normal";
        let orderDay = 1;
        let orderMonth = -1;
        let orderYear = new Date().getFullYear();
        
        let orderDayMatch = waktuOrderStr.match(/\d+/);
        if (orderDayMatch) orderDay = parseInt(orderDayMatch[0]);
        
        let yearMatch = waktuOrderStr.match(/\b(20\d{2})\b/);
        if (yearMatch) orderYear = parseInt(yearMatch[1]);
        
        const monthMap = ["jan", "feb", "mar", "apr", "mei", "jun", "jul", "agu", "sep", "okt", "nov", "des"];
        monthMap.forEach((m, i) => { if(waktuOrderStr.includes(m)) orderMonth = i; });
        
        if (orderDayMatch) {
            if (orderDay >= 1 && orderDay <= 25) {
                waktuTungguText = "Menunggu Jadwal Kirim Tgl 1 Bulan Depan (Tidak masuk hitungan)";
            } else if (orderDay >= 26 && orderDay <= 31) {
                waktuTungguText = "Menunggu Jadwal Kirim Tgl 1 Dua Bulan Depan (Di luar jadwal)";
            }
        }

        // 2. Ekstrak Target Hari (Estimasi PDF) dari Tanggal Tiba (Abaikan teks dalam kurung)
        let targetHari = 7;
        if(waktuTibaInput) {
            // Hapus semua teks yang ada di dalam kurung, misal "(3 Hari)"
            let teksLuarKurung = waktuTibaInput.replace(/\([^)]*\)/g, '');
            // Hapus juga indikator durasi seperti "3 hari" atau "3 days" tanpa kurung agar tidak dianggap sebagai tanggal
            teksLuarKurung = teksLuarKurung.replace(/\d+\s*(hari|day)s?/ig, '');
            // Ambil semua angka yang tersisa
            let tanggalTibaMatch = teksLuarKurung.match(/\d+/g);
            
            if (tanggalTibaMatch && tanggalTibaMatch.length > 0) {
                // Jika ada format "17-20", kita ambil angka terakhir sbg batas maksimal (20)
                // Filter agar hanya mengambil angka yang masuk akal sebagai tanggal (1-31)
                let validDates = tanggalTibaMatch.map(Number).filter(n => n >= 1 && n <= 31);
                if (validDates.length > 0) {
                    let arrivalDay = validDates[validDates.length - 1]; // Ambil yang paling belakang (misal 20)
                    // Sesuai logika pengiriman yang dijadwalkan serentak tanggal 1 bulan depannya,
                    // maka target kedatangan PDF dihitung sejak tanggal 1 tersebut.
                    // Oleh karena itu, target durasinya adalah sama dengan angka tanggal tibanya itu sendiri.
                    targetHari = arrivalDay;
                }
            }
        }

        // 3. Kalkulasi Delay Tambahan (Pajak, Transit, Bandara, Darat, Berat)
        let delayPajak = Math.floor(pajak / 500000);
        
        let delayTransit = 0;
        let infoTransit = "Direct";
        if (userContinent !== sourceContinent) {
            if (['europe', 'africa'].includes(sourceContinent)) {
                delayTransit = 2; // Transit 1 kali (+2 hari)
                infoTransit = "1 Transit";
            } else if (sourceContinent === 'north_america') {
                delayTransit = 4; // Transit 2 kali (+4 hari)
                infoTransit = "2 Transit";
            } else if (sourceContinent === 'south_america') {
                delayTransit = 6; // Transit 3 kali (+6 hari)
                infoTransit = "3 Transit";
            }
        }

        let delayBandara = 2; // Waktu proses domestik di bandara kedatangan

        // Ekspedisi Darat Domestik (Jarak KM)
        const cityDistances = {
            'jakarta': 20, 'bogor': 60, 'depok': 40, 'tangerang': 20, 'bekasi': 40,
            'bandung': 150, 'semarang': 450, 'yogyakarta': 500, 'solo': 530, 'surabaya': 780,
            'malang': 850, 'bali': 1200, 'denpasar': 1200, 'medan': 1400, 'padang': 1000,
            'palembang': 500, 'makassar': 1400, 'manado': 2200, 'jayapura': 3800, 'pontianak': 750,
            'balikpapan': 1200, 'samarinda': 1300, 'lembang': 160
        };
        let jarakKm = 50; // Default jika kota tidak ada di kamus
        for (const [city, dist] of Object.entries(cityDistances)) {
            if (userLocLower.includes(city)) {
                jarakKm = dist;
                break;
            }
        }
        let delayDarat = Math.floor(jarakKm / 65);

        let delayBerat = 0;
        if (berat > 10) {
            delayBerat = Math.floor((berat - 10) / 5);
        }

        let delayLangka = 0;
        if (sangatLangka) {
            delayLangka = 2;
        } else if (langka) {
            delayLangka = 1;
        }

        // 4. Kalkulasi Durasi Perjalanan Udara Murni
        let transitTime = 1;
        const seaRegion = ["singapore", "singapura", "malaysia", "thailand", "vietnam", "filipina", "philippines", "brunei", "indonesia"];
        // Jika negara asal masih dalam satu region (Asia Tenggara), durasi terbang murni = 0 hari (Tiba di hari yang sama)
        if (seaRegion.includes(asal.toLowerCase())) {
            transitTime = 0;
        }
        
        // Total Prediksi Hari yang dibutuhkan secara real
        let totalPrediksiHari = delayMenungguKirim + transitTime + delayTransit + delayBandara + delayDarat + delayPajak + delayBerat + delayLangka;

        // 5. Cek apakah Total Prediksi masih dalam batas Target Hari PDF
        let isTepatWaktu = totalPrediksiHari <= targetHari;

        // 6. Success Rate (Akurasi Kedatangan)
        let successRate = 95;
        if (!isTepatWaktu) {
            let selisihHari = totalPrediksiHari - targetHari;
            successRate = Math.max(10, 85 - (selisihHari * 5)); // Turun 5% setiap hari telat
        }
        
        // Penalti tambahan Risiko Eksternal
        if(langka) successRate -= 5;
        if(sangatLangka) successRate -= 8;
        if(pajak > 100000) successRate -= 2;

        // Update UI
        let resClass = isTepatWaktu ? "Tepat Waktu" : "Terlambat";
        let resColor = isTepatWaktu ? "#10b981" : "#ef4444";
        
        document.getElementById('pred-res-class').textContent = resClass;
        document.getElementById('pred-res-conf').textContent = successRate + '%';
        document.getElementById('pred-res-class').style.color = resColor;
        
        let recomText = 'Prediksi Real: ' + totalPrediksiHari + ' Hari vs Estimasi PDF: ' + targetHari + ' Hari. ' + 
                        (isTepatWaktu ? "Barang diprediksi tiba sesuai jadwal." : "Diprediksi terlambat karena rute logistik yang kompleks.");
        document.getElementById('pred-recom-text').textContent = recomText;
        
        window.lastPredictionMetrics = {
            totalHari: totalPrediksiHari,
            resClass: resClass
        };

        // Chart Pie
        if(typeof predChartPie !== 'undefined' && predChartPie) predChartPie.destroy();
        const ctxPie = document.getElementById('pred-chart-pie').getContext('2d');
        predChartPie = new Chart(ctxPie, {
            type: 'pie',
            data: {
                labels: ['Success', 'Risk/Delay'],
                datasets: [{
                    data: [successRate, 100 - successRate],
                    backgroundColor: ['#4ade80', '#ef4444'],
                    borderWidth: 1,
                    borderColor: '#1e293b'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'left', labels: { color: '#cbd5e1' } }
                }
            }
        });

        // Chart Bar
        if(typeof predChartBar !== 'undefined' && predChartBar) predChartBar.destroy();
        const ctxBar = document.getElementById('pred-chart-bar').getContext('2d');
        predChartBar = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ["Tunggu/Transit", "Beban/Pajak", "Darat (KM)"],
                datasets: [{
                    label: 'Faktor Pengaruh (%)',
                    data: [(delayMenungguKirim + delayTransit > 0 ? 30 : 10), (delayBerat + delayPajak > 0 ? 30 : 10), (delayDarat > 0 ? 20 : 10)],
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { grid: { display: false } }
                }
            }
        });

        const alist = document.getElementById('pred-analysis-list');
        alist.innerHTML = `
            <div class="pred-analysis-item">
                <div class="pred-ai-lbl">Jadwal Keberangkatan</div>
                <div class="pred-ai-val" style="color:#f59e0b; font-size:0.75rem;">` + waktuTungguText + `</div>
            </div>
            <div class="pred-analysis-item">
                <div class="pred-ai-lbl">Rute & Transit</div>
                <div class="pred-ai-val">` + (delayTransit > 0 ? ('+'+delayTransit+' Hr (Transit)') : 'Direct') + ` & ` + (delayBandara > 0 ? ('+'+delayBandara+' Hr (Bandara)') : '') + `</div>
            </div>
            <div class="pred-analysis-item">
                <div class="pred-ai-lbl">Jalur Darat (Est. ` + jarakKm + ` KM)</div>
                <div class="pred-ai-val">` + (delayDarat > 0 ? ('+' + delayDarat + ' Hr (Ekspedisi)') : 'Normal') + `</div>
            </div>
            <div class="pred-analysis-item">
                <div class="pred-ai-lbl">Penalti Khusus</div>
                <div class="pred-ai-val">` + (delayPajak > 0 ? '+'+delayPajak+' Hr (Pajak) ' : '') + (delayBerat > 0 ? '+'+delayBerat+' Hr (Berat) ' : '') + (delayLangka > 0 ? '+'+delayLangka+' Hr (Langka)' : '') + (!delayPajak && !delayBerat && !delayLangka ? 'Tidak Ada' : '') + `</div>
            </div>
            <div class="pred-analysis-item">
                <div class="pred-ai-lbl">Kalkulasi vs Target PDF</div>
                <div class="pred-ai-val" style="color:` + (isTepatWaktu ? '#4ade80' : '#ef4444') + `">` + totalPrediksiHari + ` Hari vs ` + targetHari + ` Hari</div>
            </div>
            <div class="pred-analysis-item">
                <div class="pred-ai-lbl" style="font-size:0.75rem; color:#64748b;">[DEBUG] RAW Text</div>
                <div class="pred-ai-val" style="font-size:0.75rem; color:#64748b; text-align:right;">Order: '${waktuOrderStr}'<br>Tiba: '${waktuTibaInput}'</div>
            </div>
        `;
        window.currentPredFuncData = funcData;
    } catch (e) {
        document.getElementById('pred-recom-text').textContent = "CRITICAL ERROR: " + e.message + " | " + e.stack;
        console.error("Prediction UI Error:", e);
    }
};
/* ==========================================================================
   CONTEXTUAL FEATURES HELPER
   ========================================================================== */
window.getContextualFeatures = function(datasetName, seed) {
    const name = (datasetName || '').toLowerCase();
    
    // Custom categories for Jastip Luar Negeri
    const categories = {
        shipping: {
            features: ["berat_barang_kg", "biaya_pajak_bea_cukai", "negara_asal", "ongkos_kirim_domestik", "tingkat_kelangkaan_barang", "biaya_asuransi_(opsional)", "harga_barang"],
            type: "Time Series Regression",
            out1: "Estimasi Tiba", out2: "Keterlambatan",
            resClass: "Tepat Waktu", oppClass: "Terlambat", resColor: "#34d399"
        },
        pricing: {
            features: ["harga_asli_valas", "kurs_mata_uang", "fee_jastip_persen", "biaya_packing", "kategori_barang", "harga_kompetitor"],
            type: "Regression",
            out1: "Harga Jual Final", out2: "Margin Profit",
            resClass: "Profit Tinggi", oppClass: "Rugi", resColor: "#3b82f6"
        },
        customs: {
            features: ["nilai_pabean", "hs_code_kategori", "status_lartas", "jalur_merah_prob", "frekuensi_importir", "dokumen_lengkap"],
            type: "Binary Classification",
            out1: "Lolos Otomatis", out2: "Tertahan",
            resClass: "Lolos", oppClass: "Pemeriksaan", resColor: "#ef4444"
        },
        demand: {
            features: ["search_volume", "tren_sosmed", "musim_liburan", "diskon_brand_asal", "stok_terbatas", "rating_produk"],
            type: "Classification",
            out1: "High Demand", out2: "Low Demand",
            resClass: "Laris", oppClass: "Sepi", resColor: "#f59e0b"
        }
    };
    
    let matchedCat = null;
    if(name.includes('kirim') || name.includes('ship') || name.includes('logistik') || name.includes('kurir')) matchedCat = categories.shipping;
    else if(name.includes('harga') || name.includes('price') || name.includes('uang') || name.includes('fee')) matchedCat = categories.pricing;
    else if(name.includes('pajak') || name.includes('cukai') || name.includes('customs') || name.includes('bea')) matchedCat = categories.customs;
    else if(name.includes('tren') || name.includes('demand') || name.includes('pasar') || name.includes('jual')) matchedCat = categories.demand;
    else matchedCat = categories.shipping; // Default fallback
    
    return matchedCat;
};







window.exportModelDetailsPdf = function() {
    if(!window.currentModelDetailsEntryId) return;
    
    const entries = (typeof currentUser !== 'undefined' && currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
    const entry = entries.find(e => String(e.id) === String(window.currentModelDetailsEntryId)) || entries[0];
    if(!entry) return;

    let seed = entry.id || 1;
    let status = entry.activity === 'in-progress' ? 'Training' : 'Deployed';
    let accuracyVal = entry ? window.getDatasetQualityInfo(entry).finalScore : parseFloat(getSeededRand(seed, 80, 99).toFixed(1));
    let context = window.getContextualFeatures(entry.name, seed);
    let modelType = context.type;
    let version = "v" + Math.floor(getSeededRand(seed + 2, 1, 4)) + "." + Math.floor(getSeededRand(seed + 3, 0, 9)) + ".0";
    let inputCount = context.features.length;
    let selectedFeatures = context.features;
    let out1 = context.out1, out2 = context.out2;
    let predictions = Math.floor(getSeededRand(seed + 6, 10, 800));
    
    // Performance
    let prec = parseFloat(getSeededRand(seed+10, 85, 98).toFixed(1));
    let rec = parseFloat(getSeededRand(seed+11, 80, 97).toFixed(1));
    let f1 = parseFloat(getSeededRand(seed+12, 82, 97).toFixed(1));

    const now = new Date().toLocaleString('id-ID');
    const w = window.open('', '_blank', 'width=960,height=900,scrollbars=yes');
    if(!w) {
        alert("Please allow popups to generate PDF.");
        return;
    }
    
    w.document.write(`
<html>
<head>
<title>Model Config Export - ${entry.name}</title>
<style>
  body { font-family: 'Inter', sans-serif; background: #fff; color: #1e293b; padding: 2rem; margin: 0; }
  h1 { font-size: 24px; color: #0f172a; margin-bottom: 5px; }
  .subtitle { font-size: 14px; color: #64748b; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
  .card-title { font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; }
  .item:last-child { border-bottom: none; }
  .item-lbl { color: #64748b; }
  .item-val { font-weight: 600; color: #0f172a; text-align: right; }
  .features-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .feat-tag { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 4px; font-size: 13px; font-family: monospace; color: #334155; }
  
  .perf-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 30px; }
  .perf-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
  .perf-lbl { font-size: 12px; color: #64748b; margin-bottom: 5px; }
  .perf-val { font-size: 20px; font-weight: 700; color: #0f172a; }
  
  .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; }
  .print-btn { display: block; margin: 0 auto 20px; padding: 10px 20px; background: #3b82f6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; }
  
  @media print {
    .print-btn { display: none !important; }
    body { padding: 0; }
    @page { margin: 1.5cm; }
  }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">&#128424; Cetak / Simpan PDF</button>

  <h1>Model Configuration Export</h1>
  <div class="subtitle">Dataset: <strong>${entry.name}</strong> &bull; Exported at ${now}</div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Model Identification</div>
      <div class="item"><span class="item-lbl">Model Type</span><span class="item-val">${modelType}</span></div>
      <div class="item"><span class="item-lbl">Status</span><span class="item-val">${status}</span></div>
      <div class="item"><span class="item-lbl">Version</span><span class="item-val">${version}</span></div>
      <div class="item"><span class="item-lbl">Last Trained</span><span class="item-val">${new Date(entry.created_at || Date.now()).toISOString().split('T')[0]}</span></div>
    </div>
    
    <div class="card">
      <div class="card-title">Output Configuration</div>
      <div class="item"><span class="item-lbl">Target 1</span><span class="item-val">${out1}</span></div>
      <div class="item"><span class="item-lbl">Target 2</span><span class="item-val">${out2}</span></div>
      <div class="item"><span class="item-lbl">Total Labels</span><span class="item-val">2</span></div>
      <div class="item"><span class="item-lbl">Total Predictions</span><span class="item-val">${(predictions * 1000).toLocaleString()}</span></div>
    </div>
  </div>

  <div class="card" style="margin-bottom: 20px;">
    <div class="card-title">Performance Metrics</div>
    <div class="perf-grid" style="margin-bottom: 0;">
      <div class="perf-box">
        <div class="perf-lbl">Accuracy</div>
        <div class="perf-val" style="color: #10b981;">${accuracyVal}%</div>
      </div>
      <div class="perf-box">
        <div class="perf-lbl">Precision</div>
        <div class="perf-val" style="color: #06b6d4;">${prec}%</div>
      </div>
      <div class="perf-box">
        <div class="perf-lbl">Recall</div>
        <div class="perf-val" style="color: #8b5cf6;">${rec}%</div>
      </div>
      <div class="perf-box">
        <div class="perf-lbl">F1 Score</div>
        <div class="perf-val" style="color: #eab308;">${f1}%</div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Input Features (${inputCount})</div>
    <div class="features-list">
      ${selectedFeatures.map(f => `<div class="feat-tag"># ${f}</div>`).join('')}
    </div>
  </div>

  <div class="footer">
    Generated by insight Data Platform &bull; ${now} &bull; ${typeof currentUser !== 'undefined' && currentUser ? currentUser.username : 'Admin'}
  </div>

  <script>
    setTimeout(() => window.print(), 500);
  </script>
</body>
</html>
    `);
    w.document.close();
};

// Use Case Modal functions
window.openUseCaseModal = function() {
    const modal = document.getElementById('usecase-modal');
    if(modal) {
        modal.style.display = 'flex';
        if (window.mermaid) {
            const container = document.getElementById('uc-mermaid-container');
            if (container && !container.hasAttribute('data-rendered')) {
                const graphDef = `
flowchart LR
    Admin(["Jastip Admin"])
    System(["AI Prediction System"])
    
    subgraph Validation["Jastip Prediction Validation"]
        direction TB
        UC1(["Input Data Ekspedisi (Negara, Ongkir, Cukai)"])
        UC2(["Jalankan Model Prediksi"])
        UC3(["Analisis Kontribusi Fitur"])
        UC4(["Validasi Hasil Prediksi"])
        UC5(["Terapkan Mitigasi Risiko"])
    end
    
    Admin --> UC1
    Admin --> UC2
    System --> UC3
    System --> UC4
    Admin --> UC5
    
    UC2 -. "include" .-> UC3
    UC3 -. "include" .-> UC4
    UC4 -. "extend" .-> UC5
                `;
                mermaid.render('theGraph', graphDef).then(({svg}) => {
                    container.innerHTML = svg;
                    container.setAttribute('data-rendered', 'true');
                }).catch(e => {
                    console.error("Mermaid render error", e);
                });
            }
        }
    }
};

window.closeUseCaseModal = function() {
    const modal = document.getElementById('usecase-modal');
    if(modal) modal.style.display = 'none';
};

window.downloadPredictionResult = function() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("Library PDF belum siap. Mohon tunggu beberapa saat atau refresh halaman.");
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const entries = (typeof currentUser !== 'undefined' && currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
    const entry = entries.find(e => String(e.id) === String(currentPredEntryId));
    if (!entry) return;

    const conf = document.getElementById('pred-res-conf').textContent || "0%";
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("LAPORAN DATA QUALITY & PREDICTION", 105, 15, { align: "center" });
    doc.setFontSize(14);
    doc.text(entry.name || "Dataset", 105, 22, { align: "center" });
    
    doc.setLineWidth(0.5);
    doc.line(14, 28, 196, 28);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("1. IDENTITAS DATASET", 14, 38);
    
    const createdDate = new Date(parseInt(entry.id) || Date.now()).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'});
    
    const metrics = window.lastPredictionMetrics || { totalHari: "-", resClass: "-" };
    const identityData = [
        ["File Name", entry.fileName || "-", "File Type", entry.fileType || "application/pdf"],
        ["Nama Dataset", entry.name || "-", "Versi", "1.0"],
        ["Tanggal Dibuat", createdDate, "Disubmit Pada", createdDate],
        ["Status / Activity", entry.activity || "In Progress", "Quality Score", conf + " Good"],
        ["Deskripsi", "Analisis Waktu Tiba (Jasa Titip)", "Total Prediksi", metrics.totalHari + " Hari"],
        ["Catatan", "Generated via Prediction Tool", "Status Prediksi", metrics.resClass]
    ];
    
    doc.autoTable({
        startY: 42,
        body: identityData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3, textColor: [0, 0, 0], lineColor: [200, 200, 200] },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 35 },
            1: { cellWidth: 70 },
            2: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 30 },
            3: { cellWidth: 45 }
        }
    });
    
    let finalY = doc.lastAutoTable.finalY + 15;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("2. DESKRIPSI & FUNGSI FITUR PREDIKSI", 14, finalY);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const descText = "Fitur Jasa Titip Predictor adalah sebuah pipeline otomatis yang dirancang khusus untuk menganalisis dan memprediksi probabilitas ketepatan waktu pengiriman barang lintas negara (Jastip). Fungsi utama fitur ini adalah memberikan visibilitas awal kepada pengguna terhadap potensi keterlambatan (delay) yang disebabkan oleh faktor eksternal, sehingga pengguna dapat memitigasi risiko logistik sedini mungkin.\n\nTeknologi yang Digunakan: Sistem ini memanfaatkan Optical Character Recognition (OCR) dari Tesseract.js dan PDF.js untuk mengekstrak data mentah dari dokumen faktur/manifest. Nilai tersebut kemudian diproses menggunakan model Time Series Regression yang dipadukan dengan Rule-Based Heuristics Logistics untuk mengkalkulasi bobot penalti waktu secara dinamis.";
    const splitDescText = doc.splitTextToSize(descText, 182);
    doc.text(splitDescText, 14, finalY + 6);
    
    finalY = finalY + 6 + (splitDescText.length * 5) + 10;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("3. METODE KALKULASI PENGHITUNGAN", 14, finalY);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const calcLines = [
        "Sistem memprediksi probabilitas ketepatan waktu pengiriman berdasarkan rumusan matematis berikut:",
        "",
        "  TOTAL ESTIMASI (Hari) = [Waktu Proses Asal] + [Waktu Rute & Transit] + [Proses Bandara/Bea Cukai] + [Jalur Darat Ekspedisi]",
        "",
        "Rincian Detail Penalti Waktu (Variabel Kalkulasi):",
        "1. Waktu Proses Asal & Jadwal Keberangkatan (Catatan Penting):",
        "   - Prediksi waktu di bawah ini murni dihitung SEJAK TANGGAL PENGIRIMAN (bukan sejak tanggal order).",
        "   - Order tgl 1-25: Akan mulai dikirim pada tgl 1 bulan depannya.",
        "   - Pengecualian Order tgl 26-31: Dimasukkan ke batch bulan berikutnya, dan mulai dikirim pada tgl 1 di dua bulan ke depan.",
        "   - Masa tunggu jadwal keberangkatan ini tidak ditambahkan ke dalam angka Estimasi Total Hari.",
        "2. Waktu Rute & Transit:",
        "   - ASEAN (Asia Tenggara) : 0 Hari perjalanan murni via udara.",
        "   - Beda Benua : Eropa/Afrika (+2 Hari), Amerika Utara (+4 Hari), Amerika Selatan (+6 Hari).",
        "3. Proses Bandara & Bea Cukai:",
        "   - Waktu bongkar muat bandara kedatangan : +2 Hari.",
        "   - Jika dikenakan Pajak Bea Cukai (> Rp 0) : +1 Hari.",
        "   - Jika tipe barang Langka : +1 Hari, Sangat Langka : +2 Hari.",
        "4. Jalur Darat Ekspedisi Domestik:",
        "   - Jarak Kota / 65 KM : +1 Hari (Misal: Jarak 130 KM = +2 Hari).",
        "   - Penalti Berat : Setiap kelipatan 5 Kg di atas 10 Kg = +1 Hari logistik.",
        "",
        "5. Kalkulasi Biaya Penyedia Jasa (Fee Jastip):",
        "   - Biaya jasa ditetapkan proporsional: Rp 50.000 untuk setiap nilai barang kelipatan Rp 200.000.",
        "   - Contoh: Jika Harga Barang = Rp 1.000.000, maka Biaya Jasa = Rp 250.000.",
        "",
        "Seluruh total akumulasi di atas dibandingkan dengan Perkiraan Waktu Tiba (PDF).",
        "Jika (TOTAL ESTIMASI > PERKIRAAN PDF), status pengiriman berisiko 'Terlambat'."
    ];
    
    const calcText = calcLines.join("\n");
    const splitCalcText = doc.splitTextToSize(calcText, 182);
    doc.text(splitCalcText, 14, finalY + 6);
    
    finalY = finalY + 6 + (splitCalcText.length * 5) + 10;
    
    // Check if new section exceeds page height and add new page if necessary
    if (finalY > 260) {
        doc.addPage();
        finalY = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("4. DATA FITUR INPUT", 14, finalY);
    
    const funcData = window.currentPredFuncData || {};
    const requestedFields = [
        'nama barang', 'Harga Barang', 'waktu order barang', 'perkiraan waktu tiba',
        'Negara asal produk', 'Alamat Konsumen', 'Berat barang', 'Tingkat Kelangkaan barang',
        'Biaya Pajak Bea Cukai', 'Ongkos Kirim Domestik', 'Biaya Asuransi', 'Fee Penyedia Jasa', 'Total harga'
    ];
    
    const inputData = [];
    for (let f of requestedFields) {
        inputData.push([f.charAt(0).toUpperCase() + f.slice(1), funcData[f] || "-"]);
    }
    
    doc.autoTable({
        startY: finalY + 4,
        body: inputData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3, textColor: [0, 0, 0], lineColor: [200, 200, 200] },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 70 },
            1: { cellWidth: 110 }
        }
    });
    
    // Extract blob and save to IndexedDB
    const filename = `Laporan_Prediksi_${entry.name || Date.now()}.pdf`;
    const pdfBlob = doc.output('blob');
    window.savePdfToDB(filename, 'Prediction Result', '3.1 MB', pdfBlob);
};

/* ==========================================================================
   PDF DOCUMENT STORAGE LOGIC
   ========================================================================== */


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
                    if (typeof currentUser !== 'undefined' && currentUser) {
        const sessionSnap = Object.assign({}, currentUser);
        delete sessionSnap.dataEntries;
        localStorage.setItem('insight_session_v2', JSON.stringify(sessionSnap));
    }
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
        
        if (typeof currentUser !== 'undefined' && currentUser) {
        const sessionSnap = Object.assign({}, currentUser);
        delete sessionSnap.dataEntries;
        localStorage.setItem('insight_session_v2', JSON.stringify(sessionSnap));
    }
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
            if (typeof currentUser !== 'undefined' && currentUser) {
        const sessionSnap = Object.assign({}, currentUser);
        delete sessionSnap.dataEntries;
        localStorage.setItem('insight_session_v2', JSON.stringify(sessionSnap));
    }
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


document.addEventListener('DOMContentLoaded', () => {
    // Notification UI Init
    if (typeof window.initNotificationUI === 'function') {
        window.initNotificationUI();
        window.renderNotifications();
    }

    // 1. Navigation hooking
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.link-to-pdf-storage')) {
            e.preventDefault();
            navigateTo('pdf-storage-view');
            renderPdfStorageCards();
        } else if (e.target.closest('.link-to-dashboard')) {
            e.preventDefault();
            // Try dashboard-view, if not, try data-entry-view
            if (document.getElementById('dashboard-view')) {
                navigateTo('dashboard-view');
            } else {
                navigateTo('data-entry-view');
            }
        }
    });

    // 2. View Toggle (Grid / List)
    const btnGrid = document.getElementById('btn-pdf-grid');
    const btnList = document.getElementById('btn-pdf-list');
    const pdfContainer = document.getElementById('pdf-cards-container');

    if (btnGrid && btnList && pdfContainer) {
        btnGrid.addEventListener('click', () => {
            btnGrid.classList.add('active');
            btnList.classList.remove('active');
            pdfContainer.classList.remove('list-view');
        });
        
        btnList.addEventListener('click', () => {
            btnList.classList.add('active');
            btnGrid.classList.remove('active');
            pdfContainer.classList.add('list-view');
        });
    }

    // 3. Filter buttons
    const filterBtns = document.querySelectorAll('.pdf-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderPdfStorageCards();
        });
    });

    // 4. Search and Sort
    const searchInput = document.getElementById('pdf-search-input');
    const sortSelect = document.querySelector('.pdf-sort-select');
    if (searchInput) searchInput.addEventListener('input', renderPdfStorageCards);
    if (sortSelect) sortSelect.addEventListener('change', renderPdfStorageCards);
});

window.saveToPdfStorage = function(filename, category, sizeStr) {
    let savedPdfs = [];
    try {
        const stored = localStorage.getItem('insight_pdf_storage');
        if (stored) savedPdfs = JSON.parse(stored);
    } catch(e) {}
    
    savedPdfs.unshift({
        id: Date.now(),
        title: filename,
        category: category,
        categoryColor: category === 'Report' ? 'pdf-theme-orange' : (category === 'Analysis' ? 'pdf-theme-blue' : (category === 'Validation' ? 'pdf-theme-red' : 'pdf-theme-green')),
        size: sizeStr || '2.1 MB',
        date: Date.now()
    });
    
    localStorage.setItem('insight_pdf_storage', JSON.stringify(savedPdfs));
    
    window.showSaveSuccessModal(filename);
    
    if (typeof window.renderPdfStorageCards === 'function') {
        window.renderPdfStorageCards();
    }
};

window.showSaveSuccessModal = function(filename) {
    let overlay = document.getElementById('save-success-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'save-success-modal-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.8)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '999999';
        overlay.style.backdropFilter = 'blur(4px)';
        document.body.appendChild(overlay);
    }
    
    overlay.innerHTML = `
        <div style="background: linear-gradient(145deg, #1e293b, #0f172a); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 32px 24px; width: 90%; max-width: 400px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); position: relative; font-family: 'Inter', sans-serif;">
            <div style="display: flex; flex-direction: column; align-items: center; text-align: center;">
                <div style="position: relative; width: 64px; height: 64px; border-radius: 16px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    <div style="position: absolute; top: -8px; right: -8px; background: #3b82f6; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" style="width: 12px; height: 12px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                </div>
                <h2 style="color: #f8fafc; margin: 0 0 8px 0; font-size: 1.25rem; font-weight: 700;">File Saved Successfully!</h2>
                <p style="color: #94a3b8; margin: 0 0 24px 0; font-size: 0.875rem;">Your document has been stored securely in the Staging Area.</p>
                
                <div style="width: 100%; text-align: left; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 12px 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px;">
                    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="width: 20px; height: 20px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    </div>
                    <div style="overflow: hidden;">
                        <div style="color: #f8fafc; font-size: 0.875rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${filename}</div>
                        <div style="color: #10b981; font-size: 0.75rem; font-weight: 500; margin-top: 2px;">Saved to PDF Storage</div>
                    </div>
                </div>
                
                <button onclick="document.getElementById('save-success-modal-overlay').style.display='none'" style="width: 100%; padding: 12px; border-radius: 8px; background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; color: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    Awesome!
                </button>
            </div>
        </div>
    `;
    overlay.style.display = 'flex';
};

window.initInsightDB = function() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('InsightDB', 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('pdfs')) {
                db.createObjectStore('pdfs', { keyPath: 'id', autoIncrement: true });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

window.savePdfToDB = async function(title, category, sizeStr, blob) {
    let catColor = 'pdf-theme-blue';
    const lowerCat = category.toLowerCase();
    if (lowerCat.includes('data quality') || lowerCat.includes('report')) catColor = 'pdf-theme-orange';
    else if (lowerCat.includes('prediction')) catColor = 'pdf-theme-green';
    else if (lowerCat.includes('validation')) catColor = 'pdf-theme-red';

    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', category);
    formData.append('category_color', catColor);
    formData.append('size', sizeStr);
    formData.append('file', blob, title);
    formData.append('user_email', (currentUser && currentUser.email) ? currentUser.email : '');

    try {
        const res = await fetch((window.API_BASE || '/api') + '/pdfs/', {
            method: 'POST',
            body: formData
        });
        if (!res.ok) throw new Error('API fetch failed');
        const result = await res.json();
        
        if(window.addNotification) window.addNotification("Report Saved", `Laporan PDF "${title}" berhasil disimpan di PDF Storage.`, "success");
        if (typeof window.showSaveSuccessModal === 'function') {
            window.showSaveSuccessModal(title);
        }
        if (typeof window.renderPdfStorageCards === 'function') {
            window.renderPdfStorageCards();
        }
        return result;
    } catch(e) {
        console.error(e);
        throw e;
    }
};

window.getAllPdfsFromDB = async function() {
    try {
        const emailParam = (currentUser && currentUser.email) ? ('?email=' + encodeURIComponent(currentUser.email)) : '';
        const res = await fetch((window.API_BASE || '/api') + '/pdfs/' + emailParam);
        if (!res.ok) throw new Error('API fetch failed');
        const data = await res.json();
        return data.map(d => ({
            id: d.id,
            title: d.title,
            category: d.category,
            categoryColor: d.category_color,
            date: new Date(d.date).getTime(),
            size: d.size,
            fileUrl: d.file
        }));
    } catch(e) {
        console.error(e);
        return [];
    }
};

window.getPdfBlobFromDB = async function(id) {
    try {
        const res = await fetch((window.API_BASE || '/api') + '/pdfs/' + id + '/');
        if (!res.ok) throw new Error('PDF not found');
        const data = await res.json();
        const fileRes = await fetch(data.file);
        if (!fileRes.ok) throw new Error('File fetch failed');
        return await fileRes.blob();
    } catch(e) {
        throw e;
    }
};

window.deletePdfFromDB = async function(id) {
    try {
        const res = await fetch((window.API_BASE || '/api') + '/pdfs/' + id + '/', { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
    } catch(e) {
        throw e;
    }
};

window.renderPdfStorageCards = async function() {
    let mockPdfData = [];
    try {
        mockPdfData = await window.getAllPdfsFromDB();
    } catch(err) {
        console.error("Failed to fetch from DB", err);
    }

    const container = document.getElementById('pdf-cards-container');
    if (!container) return;

    // Filters
    const searchInput = document.getElementById('pdf-search-input');
    const searchQuery = (searchInput ? searchInput.value : '').toLowerCase();
    const activeFilterBtn = document.querySelector('.pdf-filter-btn.active');
    const filterCategory = activeFilterBtn ? activeFilterBtn.dataset.filter.toLowerCase() : 'all';
    const sortSelect = document.querySelector('.pdf-sort-select');
    const sortBy = sortSelect ? sortSelect.value : 'newest';

    let filtered = mockPdfData.filter(pdf => {
        const matchSearch = pdf.title.toLowerCase().includes(searchQuery) || pdf.category.toLowerCase().includes(searchQuery);
        const matchCat = filterCategory === 'all' || pdf.category.toLowerCase() === filterCategory;
        return matchSearch && matchCat;
    });

    // Sorting
    filtered.sort((a, b) => {
        if (sortBy === 'newest') return b.date - a.date;
        if (sortBy === 'oldest') return a.date - b.date;
        const sizeA = parseFloat(a.size);
        const sizeB = parseFloat(b.size);
        if (sortBy === 'size-asc') return sizeA - sizeB;
        if (sortBy === 'size-desc') return sizeB - sizeA;
        return 0;
    });

    // Update count
    const countLabel = document.querySelector('.pdf-toolbar-count');
    if (countLabel) countLabel.textContent = `${filtered.length} files`;

    // Dynamic Bar Stats
    let totalSizeMB = 0;
    mockPdfData.forEach(pdf => {
        totalSizeMB += parseFloat(pdf.size) || 0;
    });
    
    const statNums = document.querySelectorAll('.pdf-stat-num');
    if(statNums.length >= 2) {
        statNums[0].textContent = mockPdfData.length;
        statNums[1].textContent = totalSizeMB.toFixed(1) + ' MB';
    }
    
    const statLabels = document.querySelectorAll('.pdf-stat-lbl small');
    if(statLabels.length >= 1) {
        statLabels[0].textContent = `${filtered.length} shown`;
    }
    
    const filterBtns = document.querySelectorAll('.pdf-filter-btn');
    filterBtns.forEach(btn => {
        const cat = btn.dataset.filter;
        if(cat && cat !== 'all') {
            const catCount = mockPdfData.filter(p => p.category === cat).length;
            btn.textContent = `${cat} (${catCount})`;
        }
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 2rem;">No matching PDF files found.</div>`;
        return;
    }

    container.innerHTML = filtered.map(pdf => {
        const dateStr = new Date(pdf.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        return `
        <div class="pdf-card ${pdf.categoryColor}">
            <div class="pdf-card-top" onclick="openPdfPreview(${pdf.id}, '${pdf.title}')">
                <div class="pdf-card-badge">${Math.floor(Math.random() * 50 + 5)}p</div>
                <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
            </div>
            <div class="pdf-card-bottom">
                <h4 class="pdf-card-title" title="${pdf.title}">${pdf.title}</h4>
                <div class="pdf-card-meta">
                    <span class="pdf-card-tag">
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                        ${pdf.category}
                    </span>
                </div>
                <div class="pdf-card-info">
                    <span>
                        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 9h-2V7h-2v5H6v2h2v5h2v-5h2v-2zm4 5h-2v-2h2v2zm0-4h-2v-2h2v2z"/></svg>
                        ${pdf.size}
                    </span>
                    <span>
                        <svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>
                        ${dateStr}
                    </span>
                </div>
                <div class="pdf-card-actions">
                    <button class="pdf-btn pdf-btn-sent" onclick="submitToIntRing('${pdf.title}', ${pdf.id})" title="Submit to IntRing PM">
                        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                    <button class="pdf-btn pdf-btn-download" onclick="downloadPdfStorage('${pdf.title}', ${pdf.id})" title="Download">
                        <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    </button>
                    <button class="pdf-btn pdf-btn-delete" onclick="deletePdfStorage('${pdf.title}', ${pdf.id})" title="Delete">
                        <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
};

window.openPdfPreview = async function(id, filename) {
    if (window.innerWidth <= 768) {
        // Mobile: Avoid OOM by opening PDF in external browser natively
        try {
            if(window.addNotification) window.addNotification("Opening PDF", "Membuka dokumen...", "info");
            const res = await fetch((window.API_BASE || '/api') + '/pdfs/' + id + '/');
            if (!res.ok) throw new Error('PDF not found');
            const data = await res.json();
            
            // Open in external browser
            window.open(data.file, '_blank');
        } catch (e) {
            console.error("Mobile PDF Error:", e);
            alert("Gagal membuka PDF: " + e.message);
        }
        return;
    }

    // Desktop: Show modal with iframe
    const modal = document.getElementById('pdf-preview-modal');
    const title = document.getElementById('pdf-preview-title');
    const content = document.getElementById('pdf-preview-content');
    
    if (modal && title && content) {
        title.textContent = "Preview: " + filename;
        
        // Show loading spinner
        content.innerHTML = `
            <p style="color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="2" x2="12" y2="6"><animate attributeName="opacity" values="1;0;0" dur="1s" repeatCount="indefinite" begin="0.1s"/></line>
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"><animate attributeName="opacity" values="1;0;0" dur="1s" repeatCount="indefinite" begin="0.2s"/></line>
                    <line x1="18" y1="12" x2="22" y2="12"><animate attributeName="opacity" values="1;0;0" dur="1s" repeatCount="indefinite" begin="0.3s"/></line>
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"><animate attributeName="opacity" values="1;0;0" dur="1s" repeatCount="indefinite" begin="0.4s"/></line>
                    <line x1="12" y1="18" x2="12" y2="22"><animate attributeName="opacity" values="1;0;0" dur="1s" repeatCount="indefinite" begin="0.5s"/></line>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"><animate attributeName="opacity" values="1;0;0" dur="1s" repeatCount="indefinite" begin="0.6s"/></line>
                    <line x1="2" y1="12" x2="6" y2="12"><animate attributeName="opacity" values="1;0;0" dur="1s" repeatCount="indefinite" begin="0.7s"/></line>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"><animate attributeName="opacity" values="1;0;0" dur="1s" repeatCount="indefinite" begin="0.8s"/></line>
                </svg>
                <span>Loading original Document from Secure Storage...</span>
            </p>
        `;
        modal.style.display = 'flex';

        try {
            let blobData = await window.getPdfBlobFromDB(id);
            const finalBlob = new Blob([blobData], { type: 'application/pdf' });
            
            if (finalBlob.size < 500) {
                const text = await finalBlob.text();
                content.innerHTML = `<div style="color: #ef4444; text-align: center; padding: 2rem;">
                    <h4>PDF Generation Failed</h4>
                    <p>The stored file is invalid or empty (${finalBlob.size} bytes).</p>
                </div>`;
                return;
            }

            const blobUrl = URL.createObjectURL(finalBlob);
            content.innerHTML = `<iframe src="${blobUrl}#toolbar=0" style="width:100%; height:100%; border:none; border-radius: 8px; background-color: #fff;"></iframe>`;
        } catch (err) {
            content.innerHTML = `<div style="color: #ef4444; text-align: center; padding: 2rem;">Failed to load PDF.<br><small>${err.message}</small></div>`;
        }
    }
};

window.showPdfActionModal = function(title, subtitle, iconHtml, targetTitle, targetName, infoText, actionText, actionColors, iconColor, mainIconSvg, onConfirm) {
    let overlay = document.getElementById('custom-action-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'custom-action-modal-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.8)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '999999';
        overlay.style.backdropFilter = 'blur(4px)';
        document.body.appendChild(overlay);
    }
    
    const rgbaBg = iconColor === '#f87171' ? 'rgba(239, 68, 68, 0.05)' : (iconColor === '#38bdf8' ? 'rgba(56, 189, 248, 0.05)' : 'rgba(16, 185, 129, 0.05)');
    const rgbaBorder = iconColor === '#f87171' ? 'rgba(239, 68, 68, 0.2)' : (iconColor === '#38bdf8' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(16, 185, 129, 0.2)');
    const textColor = iconColor === '#f87171' ? '#fca5a5' : (iconColor === '#38bdf8' ? '#7dd3fc' : '#6ee7b7');

    overlay.innerHTML = `
        <div style="background: linear-gradient(145deg, #1e293b, #0f172a); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 32px 24px; width: 90%; max-width: 440px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); position: relative; font-family: 'Inter', sans-serif; animation: fadeIn 0.2s ease-out;">
            <button onclick="document.getElementById('custom-action-modal-overlay').style.display='none'" style="position: absolute; top: 16px; right: 16px; background: transparent; border: none; color: #64748b; font-size: 1.5rem; cursor: pointer;">&times;</button>
            <div style="display: flex; flex-direction: column; align-items: center; text-align: center;">
                <div style="position: relative; width: 64px; height: 64px; border-radius: 16px; background: ${rgbaBg}; border: 1px solid ${rgbaBorder}; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                    ${mainIconSvg}
                </div>
                <h2 style="color: #f8fafc; margin: 0 0 8px 0; font-size: 1.25rem; font-weight: 700;">${title}</h2>
                <p style="color: #94a3b8; margin: 0 0 24px 0; font-size: 0.875rem;">${subtitle}</p>
                <div style="width: 100%; text-align: left; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 16px; margin-bottom: 16px; display: flex; align-items: center; gap: 16px;">
                    <div style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        ${iconHtml}
                    </div>
                    <div style="overflow: hidden;">
                        <div style="color: #94a3b8; font-size: 0.75rem; margin-bottom: 4px;">${targetTitle}</div>
                        <div style="color: #f8fafc; font-size: 0.875rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${targetName}</div>
                    </div>
                </div>
                <div style="width: 100%; text-align: left; background: ${rgbaBg}; border: 1px solid ${rgbaBorder}; border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; gap: 12px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" style="width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <p style="color: ${textColor}; margin: 0; font-size: 0.875rem; line-height: 1.5;">${infoText}</p>
                </div>
                <div style="display: flex; gap: 12px; width: 100%;">
                    <button onclick="document.getElementById('custom-action-modal-overlay').style.display='none'" style="flex: 1; padding: 12px; border-radius: 8px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); color: #e2e8f0; font-weight: 600; cursor: pointer;">Cancel</button>
                    <button id="custom-action-btn-yes" style="flex: 1; padding: 12px; border-radius: 8px; background: linear-gradient(135deg, ${actionColors[0]}, ${actionColors[1]}); border: none; color: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        ${actionText}
                    </button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('custom-action-btn-yes').onclick = async function() {
        const modalContent = overlay.children[0];
        modalContent.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2rem 1rem; min-height: 250px;">
                <div class="alerts-loading-spinner" style="border-top-color: ${iconColor}; margin: 0 auto 1.5rem auto; width: 48px; height: 48px; border-width: 4px;"></div>
                <h4 style="color: #f8fafc; font-size: 1.25rem; margin-bottom: 0.5rem;">Sedang Memproses...</h4>
                <p style="color: #94a3b8; line-height: 1.5;">Mohon tunggu sebentar.</p>
            </div>
        `;
        
        try {
            if (onConfirm) {
                const isPromise = onConfirm.constructor.name === 'AsyncFunction' || (typeof onConfirm === 'function' && onConfirm.toString().includes('async'));
                if (isPromise) {
                    await onConfirm();
                } else {
                    const result = onConfirm();
                    if (result instanceof Promise) await result;
                }
            }
        } finally {
            const el = document.getElementById('custom-action-modal-overlay');
            if (el) el.style.display = 'none';
        }
    };
    overlay.style.display = 'flex';
};

window.deletePdfStorage = function(filename, id) {
    const fileIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" style="width: 20px; height: 20px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
    const mainIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
    window.showPdfActionModal(
        "Delete Confirmation",
        "This action cannot be undone. Please confirm carefully.",
        fileIcon, "File to be deleted", filename,
        `Are you sure you want to delete "${filename}"? Once deleted, the file cannot be recovered.`,
        "Yes, Delete", ['#ef4444', '#ea580c'], '#f87171', mainIcon,
        function() {
            window.deletePdfFromDB(id).then(() => {
                if(window.addNotification) window.addNotification("Document Deleted", `Dokumen "${filename}" berhasil dihapus dari PDF Storage.`, "info");
                if (typeof window.renderPdfStorageCards === 'function') {
                    window.renderPdfStorageCards();
                }
            }).catch(err => {
                console.error(err);
                alert("Failed to delete PDF: " + err);
            });
        }
    );
};

window.downloadPdfStorage = function(filename, id) {
    const fileIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" style="width: 20px; height: 20px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
    const mainIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
    window.showPdfActionModal(
        "Download Document",
        "Save this file to your local device.",
        fileIcon, "File to be downloaded", filename,
        `This will initiate a download of "${filename}" to your computer.`,
        "Download Now", ['#3b82f6', '#2563eb'], '#38bdf8', mainIcon,
        async function() {
            try {
                const blob = await window.getPdfBlobFromDB(id);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                if(window.addNotification) window.addNotification("Data Exported", "You downloaded document: " + filename, "info");
            } catch(err) {
                alert("Download failed: " + err.message);
            }
        }
    );
};

window.showApiResponseModal = function(heading, message, isError) {
    const overlay = document.getElementById('api-response-modal-overlay');
    if (!overlay) return;
    
    document.getElementById('api-response-heading').textContent = heading;
    document.getElementById('api-response-message').innerHTML = message;
    
    const iconContainer = document.getElementById('api-response-icon-container');
    if (isError) {
        document.getElementById('api-response-heading').style.color = '#ef4444';
        iconContainer.innerHTML = `<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
        document.getElementById('api-response-heading').style.color = '#34d399';
        iconContainer.innerHTML = `<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 10 0 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    }
    
    overlay.style.display = 'flex';
};

window.submitToIntRing = async function(filename, id) {
    let loadingOverlay = null;
    try {
        let projectId = await new Promise((resolve) => {
            const overlay = document.createElement('div');
            Object.assign(overlay.style, {
                position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', zIndex: '99999', backdropFilter: 'blur(3px)'
            });

            const modal = document.createElement('div');
            Object.assign(modal.style, {
                backgroundColor: '#1E1E2D', padding: '24px', borderRadius: '12px',
                width: '400px', maxWidth: '90%', boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontFamily: 'Inter, sans-serif'
            });

            const title = document.createElement('h3');
            title.innerText = 'Kirim ke IntRing PM';
            title.style.margin = '0 0 10px 0';
            title.style.fontSize = '18px';

            const desc = document.createElement('p');
            desc.innerText = `Masukkan ID Proyek tujuan:`;
            desc.style.margin = '0 0 20px 0';
            desc.style.color = '#A0A0B5';
            desc.style.fontSize = '14px';

            const input = document.createElement('input');
            input.type = 'number';
            input.value = '1';
            Object.assign(input.style, {
                width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #3F3F5A',
                backgroundColor: '#151521', color: '#fff', marginBottom: '20px', boxSizing: 'border-box',
                fontSize: '15px'
            });

            const btnContainer = document.createElement('div');
            btnContainer.style.display = 'flex';
            btnContainer.style.justifyContent = 'flex-end';
            btnContainer.style.gap = '12px';

            const cancelBtn = document.createElement('button');
            cancelBtn.innerText = 'Batal';
            Object.assign(cancelBtn.style, {
                padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent',
                color: '#A0A0B5', cursor: 'pointer', fontWeight: '500', transition: '0.2s'
            });
            cancelBtn.onmouseover = () => cancelBtn.style.color = '#fff';
            cancelBtn.onmouseout = () => cancelBtn.style.color = '#A0A0B5';

            const submitBtn = document.createElement('button');
            submitBtn.innerText = 'Kirim';
            Object.assign(submitBtn.style, {
                padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#3699FF',
                color: '#fff', cursor: 'pointer', fontWeight: '600', transition: '0.2s'
            });
            submitBtn.onmouseover = () => submitBtn.style.backgroundColor = '#187DE4';
            submitBtn.onmouseout = () => submitBtn.style.backgroundColor = '#3699FF';

            btnContainer.append(cancelBtn, submitBtn);
            modal.append(title, desc, input, btnContainer);
            overlay.append(modal);
            document.body.append(overlay);

            setTimeout(() => input.focus(), 100);

            const close = (val) => {
                if (val === null) document.body.removeChild(overlay);
                resolve({ val, overlay, modal });
            };

            cancelBtn.onclick = () => close(null);
            submitBtn.onclick = () => close(input.value);
            input.onkeydown = (e) => {
                if (e.key === 'Enter') close(input.value);
                if (e.key === 'Escape') close(null);
            };
        });

        if (!projectId.val) return;
        loadingOverlay = projectId.overlay;

        projectId.modal.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2rem 1rem; min-height: 250px;">
                <div class="alerts-loading-spinner" style="border-top-color: #38bdf8; margin: 0 auto 1.5rem auto; width: 48px; height: 48px; border-width: 4px; border-radius: 50%; border-style: solid; border-right-color: transparent; border-bottom-color: transparent; border-left-color: transparent; animation: spin 1s linear infinite;"></div>
                <h4 style="color: #f8fafc; font-size: 1.25rem; margin-bottom: 0.5rem;">Sedang Memproses...</h4>
                <p style="color: #94a3b8; line-height: 1.5;">Mengirim file '${filename}' ke IntRing PM.</p>
            </div>
            <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
        `;

        if(window.addNotification) window.addNotification("Uploading", "Sedang mengirim ke IntRing PM...", "info");

        const blob = await window.getPdfBlobFromDB(id);
        let formData = new FormData();
        formData.append("project_id", parseInt(projectId.val, 10)); 
        formData.append("phase", "Implementation");
        formData.append("file", blob, filename);

        const response = await fetch("http://72.61.215.222/intelligence-engineering/api/external-submission/?token=INTRING_SECRET_123", {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errObj = await response.json().catch(()=>({}));
            throw new Error(errObj.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        fetch((window.API_BASE || '/api-content') + '/integration-logs/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action_type: 'Submit to IntRing PM',
                target_system: 'IntRing PM API',
                status: 'Success',
                details: `File: ${filename}, Project ID: ${projectId.val}, Response ID: ${data.submission_id}`
            })
        }).catch(e => console.error("Log error", e));

        if (loadingOverlay) document.body.removeChild(loadingOverlay);
        window.showApiResponseModal("Berhasil Terkirim", `File '${filename}' berhasil dikirim ke IntRing PM! (ID: ${data.submission_id})`, false);
        if(window.addNotification) window.addNotification("API Transfer", "Data successfully sent to IntRing PM.", "success");
    } catch (e) {
        fetch((window.API_BASE || '/api-content') + '/integration-logs/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action_type: 'Submit to IntRing PM',
                target_system: 'IntRing PM API',
                status: 'Failed',
                details: `File: ${filename}, Project ID: ${projectId?.val || 'N/A'}, Error: ${e.message}`
            })
        }).catch(err => console.error("Log error", err));

        if (loadingOverlay && loadingOverlay.parentNode) loadingOverlay.parentNode.removeChild(loadingOverlay);
        window.showApiResponseModal("Gagal Mengirim", "Failed to submit: " + e.message, true);
        if(window.addNotification) window.addNotification("Error", "Gagal mengirim ke IntRing PM: " + e.message, "error");
    }
};

window.togglePasswordVisibility = function(id) {
    console.log("Toggling password visibility for: " + id);
    const el = document.getElementById(id);
    if (el) {
        const currentType = el.getAttribute('type') || el.type;
        const isPassword = currentType === 'password';
        el.setAttribute('type', isPassword ? 'text' : 'password');
        
        const btn = el.parentElement.querySelector('.password-toggle');
        if (btn) {
            if (isPassword) {
                // Eye slashed
                btn.innerHTML = `<svg class="eye-icon" viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`;
            } else {
                // Eye open
                btn.innerHTML = `<svg class="eye-icon" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;
            }
        }
    }
};
