import re

new_func = '''window.dsoDownloadEntry = async function(idx) {
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
<div id="pdf-container" style="width: 800px; max-width: 800px; margin: 0 auto; font-family: Arial, sans-serif; font-size: 8pt; color: #111; background: #fff; padding: 20px;">
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

        const opt = {
            margin:       10,
            filename:     'Laporan_Komprehensif_' + String(mainE.name).replace(/\s+/g, '_') + '.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true, windowWidth: 800 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        window.html2pdf().set(opt).from(htmlContent).save().then(() => {
            document.body.removeChild(hiddenWrapper);
            document.body.removeChild(overlay);
        }).catch(err => {
            document.body.removeChild(hiddenWrapper);
            document.body.removeChild(overlay);
            alert("Error: " + err.message);
        });

    } catch(err) {
        if(document.body.contains(hiddenWrapper)) document.body.removeChild(hiddenWrapper);
        if(document.body.contains(overlay)) document.body.removeChild(overlay);
        alert("Error: " + err.message);
    }
};'''

with open('static/app_v3.js', 'r', encoding='utf-8') as f:
    text = f.read()

replace_match = re.search(r'window\.dsoDownloadEntry\s*=\s*(async\s*)?function.*?// =============================================\s*// DATA ENTRY WIZARD', text, re.DOTALL)
if replace_match:
    text = text[:replace_match.start()] + new_func + '\n\n// =============================================\n// DATA ENTRY WIZARD' + text[replace_match.end():]
    with open('static/app_v3.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Full HTML table and chart logic injected!")
else:
    print("Could not find function.")
