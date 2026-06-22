import codecs

with codecs.open('static/app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if '// Set text contents' in line:
        start_idx = i
        break

for i in range(start_idx, len(lines)):
    if 'let apiBadge = entry.source_type' in line or 'let apiBadge = (entry.sourceType' in line or 'let apiBadge' in lines[i]:
        # let's look for 'return '
        pass
    if 'return ' in lines[i] and 'mt-model-card' in lines[i+1]:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    print(f"Found block from {start_idx} to {end_idx}")
    
    replacement = '''    // Set text contents
    const iconClass = alert.severity.toLowerCase();
    
    const sevBadge = document.getElementById('ad-severity-badge');
    sevBadge.textContent = alert.severity;
    sevBadge.className = 'alert-severity-badge ' + iconClass;
    
    document.getElementById('ad-type-badge').textContent = alert.type;
    document.getElementById('ad-title').textContent = alert.title;
    document.getElementById('ad-dataset').textContent = 'Dataset: ' + alert.dataset + ' \u2022 ' + alert.records;
    
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
window.API_BASE = '/api';
window.apiSyncEntries = async function() {
    try {
        const res = await fetch(window.API_BASE + '/datasets/');
        if (!res.ok) throw new Error('API fetch failed');
        const data = await res.json();
        
        if (currentUser) {
            currentUser.dataEntries = data.map(d => ({
                id: d.id,
                name: d.name,
                fileName: d.file_name,
                fileType: d.file_type,
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
                ? Math.round(currentUser.dataEntries.reduce((s, e) => s + (e.qualityScore || 0), 0) / currentUser.dataEntries.length) + '%'
                : '0%';
                
            localStorage.setItem('insight_session_v2', JSON.stringify(currentUser));
            
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
    let x = Math.sin(seed * 9301 + 49297) * 233280;
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
        let accuracyVal = parseFloat(getSeededRand(seed, 80, 99).toFixed(1));
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
        
        let apiBadge = (entry.sourceType === 'api' || entry.source_type === 'api') ? '<span class=\"mt-api-badge\">API</span>' : '<span class=\"mt-manual-badge\">Manual</span>';

        return \n'''
    
    new_lines = lines[:start_idx] + [replacement] + lines[end_idx+1:]
    with codecs.open('static/app.js', 'w', encoding='utf-8') as f:
        f.write(''.join(new_lines))
    print("Repair successful.")
else:
    print("Could not find start or end strings.")
    print("Start found:", start_idx != -1)
    print("End found:", end_idx != -1)
