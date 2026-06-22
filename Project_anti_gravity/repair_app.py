import re

with open("static/app.js", "r", encoding="utf-8") as f:
    content = f.read()

# The start marker inside renderModelTransaction
start_marker = "let apiBadge = (entry.sourceType === 'api' || entry.source_type === 'api') ? '<span class=\"mt-api-badge\">API</span>' : '<span class=\"mt-manual-badge\">Manual</span>';\n\n        return `"

# The end marker (start of next good function)
end_marker = "window.renderImplementationActivity = function() {"

start_idx = content.find(start_marker) + len(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found")
else:
    replacement = """
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
                <button class="mt-btn mt-btn-purple" onclick="openModelDetails(${entry.id})">
                    <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                    View Details
                </button>
                <button class="mt-btn mt-btn-green" onclick="openPredictionModal(${entry.id})">
                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    Run Prediction
                </button>
                <button class="mt-btn mt-btn-yellow">
                    <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/></svg>
                    Test Model
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
    const entries = (typeof currentUser !== "undefined" && currentUser && currentUser.dataEntries) ? window.currentUser.dataEntries : [];
    if (entries.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--light-text-muted);">No environments to monitor.</p>';
        return;
    }
    container.innerHTML = entries.map((entry, idx) => {
        let seed = entry.id || (idx + 1);
        let cpu = getSeededRand(seed, 10, 85).toFixed(1);
        let mem = getSeededRand(seed + 1, 1, 15).toFixed(1);
        let disk = getSeededRand(seed + 2, 20, 95).toFixed(1);
        return `
            <div class="card p-4 stat-card" style="margin-bottom: 1rem;">
                <h4 style="color: #60a5fa; margin-bottom: 10px;">${entry.name} Server Environment</h4>
                <div style="display:flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>CPU Usage</span>
                    <strong>${cpu}%</strong>
                </div>
                <div style="display:flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>Memory</span>
                    <strong>${mem} GB</strong>
                </div>
                <div style="display:flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>Disk</span>
                    <strong>${disk}%</strong>
                </div>
            </div>
        `;
    }).join('');
};

// ============================================================
// MAINTENANCE NOTE — Real-Time Issue Detection Engine
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
        quality:      '📉', pipeline: '⚙️',
        missing_data: '🗂️', schema_error: '⚠️', drift: '📊'
    };
    return icons[type] || '🔔';
}
function _mnIssueLabel(type) {
    return { quality: 'Low Quality Score', pipeline: 'Pipeline Error', missing_data: 'Missing Data', schema_error: 'Schema Error', drift: 'Data Drift' }[type] || type;
}

/** Detect issues from user's data entries */
function _mnScanEntries() {
    const entries = (currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
    const newIssues = [];

    entries.forEach((entry, idx) => {
        const score = entry.qualityScore || 0;
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
    });

    if (newIssues.length > 0) {
        _mnDetectedIssues = [..._mnDetectedIssues, ...newIssues];
        _mnLog(`🔍 Scanner detected ${newIssues.length} new issue(s)`, true);
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
        logEl.innerHTML = '<p style="color:#64748b;font-size:0.85rem;text-align:center;padding:1rem;">Activity log will appear here…</p>';
        return;
    }
    logEl.innerHTML = _mnActivityLog.map(l => `
        <div style="display:flex;gap:0.5rem;align-items:flex-start;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.82rem;">
            <span style="color:${l.ok?'#34d399':'#f87171'};flex-shrink:0;">${l.ok?'✓':'✗'}</span>
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
                <div style="font-size:2.5rem;margin-bottom:0.5rem;">✅</div>
                <p style="font-size:1rem;margin:0;">No issues detected. Scanner is running…</p>
                <p style="font-size:0.85rem;margin-top:0.25rem;">Next scan in a few seconds.</p>
            </div>`;
        return;
    }

    listEl.innerHTML = _mnDetectedIssues.map((issue, idx) => {
        const color = _mnSeverityColor(issue.severity);
        const bg    = _mnSeverityBg(issue.severity);
        const sentBadge = issue.isSent
            ? `<span style="font-size:0.72rem;padding:2px 8px;border-radius:20px;background:rgba(52,211,153,.2);color:#34d399;font-weight:600;">✅ Terkirim ke IC</span>`
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
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Mengirim…'; }

    const sentBy = (currentUser && currentUser.username) ? currentUser.username : 'unknown';

    try {
        // Step 1: Simpan issue ke backend kita
        const createResp = await fetch('/api/maintenance-issues/', {
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
            _mnLog(`✅ Issue "${issue.datasetName}" (${issue.issueType}) berhasil dikirim ke Intelligence Creation`, true);
            if (sendArea) sendArea.innerHTML = `<span style="font-size:0.82rem;color:#34d399;font-weight:600;">✅ Terkirim ${new Date().toLocaleTimeString('id-ID')}</span>`;
        } else if (sendData.status === 'failed') {
            // IC belum online — tapi data sudah tersimpan di backend kita
            _mnDetectedIssues[idx].backendId = created.id;
            _mnLog(`⚠️ Data tersimpan (ID:${created.id}) tapi IC belum bisa dijangkau: ${sendData.error}`, false);
            if (sendArea) sendArea.innerHTML = `
                <span style="font-size:0.78rem;color:#f97316;">⚠️ Tersimpan, IC offline</span>
                <button onclick="window.mnRetrySend(${idx},${created.id},'${sentBy}')"
                    style="padding:0.35rem 0.7rem;background:#f97316;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.78rem;">
                    Coba Lagi
                </button>`;
        }
    } catch (err) {
        _mnLog(`❌ Gagal mengirim issue "${issue.datasetName}": ${err.message}`, false);
        if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg> Kirim ke IC'; }
    }
};

/** Retry sending a stored issue to IC */
window.mnRetrySend = async function(idx, backendId, sentBy) {
    const issue = _mnDetectedIssues[idx];
    const sendArea = document.getElementById(`mn-send-area-${idx}`);
    if (sendArea) sendArea.innerHTML = '<span style="color:#94a3b8;font-size:0.82rem;">⏳ Mencoba ulang…</span>';
    try {
        const resp = await fetch(`/api/maintenance-issues/${backendId}/send_to_ic/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': _getCSRF() },
            body: JSON.stringify({ sent_by: sentBy })
        });
        const data = await resp.json();
        if (resp.ok && (data.status === 'sent' || data.status === 'already_sent')) {
            _mnDetectedIssues[idx].isSent = true;
            _mnLog(`✅ Retry berhasil — Issue ID:${backendId} terkirim ke IC`, true);
            if (sendArea) sendArea.innerHTML = `<span style="font-size:0.82rem;color:#34d399;">✅ Terkirim ${new Date().toLocaleTimeString('id-ID')}</span>`;
        } else {
            _mnLog(`❌ Retry gagal: ${data.error || 'Unknown error'}`, false);
            if (sendArea) sendArea.innerHTML = `<button onclick="window.mnRetrySend(${idx},${backendId},'${sentBy}')"
                style="padding:0.35rem 0.7rem;background:#f97316;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.78rem;">🔄 Coba Lagi</button>`;
        }
    } catch(e) {
        _mnLog(`❌ Retry error: ${e.message}`, false);
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
    _mnLog('🚀 Real-time scanner started (interval: 5s)', true);
}

function _mnStopScanner() {
    if (_mnScannerInterval) { clearInterval(_mnScannerInterval); _mnScannerInterval = null; }
    _mnLog('⏹ Scanner stopped', false);
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
                    ⏹ Stop
                </button>
                <button onclick="_mnStartScanner();_mnRenderIssues();"
                    style="padding:0.4rem 0.9rem;background:rgba(99,102,241,.2);color:#818cf8;border:1px solid rgba(99,102,241,.3);border-radius:8px;cursor:pointer;font-size:0.82rem;font-weight:600;">
                    🔄 Scan Now
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
                        <div style="font-size:2rem;margin-bottom:0.5rem;">🔍</div>
                        <p style="margin:0;font-size:0.9rem;">Starting scanner…</p>
                    </div>
                </div>
            </div>

            <!-- Activity Log -->
            <div style="position:sticky;top:1rem;">
                <h3 style="margin:0 0 0.75rem 0;font-size:0.9rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Activity Log</h3>
                <div id="mn-activity-log" style="background:rgba(15,23,42,0.7);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:0.75rem;height:360px;overflow-y:auto;font-family:monospace;">
                    <p style="color:#64748b;font-size:0.85rem;text-align:center;padding:1rem;">Initializing…</p>
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

"""
    content = content[:start_idx] + replacement + "\n" + content[end_idx:]

    with open("static/app.js", "w", encoding="utf-8") as f:
        f.write(content)
    print("Repaired app.js")
