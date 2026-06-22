window.dsoDownloadEntry = function(idx) {
    const entries = (typeof currentUser !== 'undefined' && currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
    let mainE = entries[idx] || entries[0] || {};
    const seed = mainE.id || 1;
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'});
    const timeStr = now.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'});

    // Collect base64 for canvases
    const canvases = [
        'dqa-trend-chart', 'dqa-dims-chart', 'dqa-freshness-chart', 'dqa-issues-chart',
        'pd-performance-chart', 'pd-quality-chart', 'pd-time-chart', 'pd-execution-chart',
        'envm-cpu-chart', 'envm-ram-chart', 'envm-disk-donut', 'envm-resource-chart'
    ];
    let imgs = {};
    canvases.forEach(id => {
        let el = document.getElementById(id);
        if(el) {
            try { imgs[id] = el.toDataURL('image/png'); } 
            catch(e) { imgs[id] = ''; }
        } else { imgs[id] = ''; }
    });

    // Calc overall stats
    let totalScore = 0;
    entries.forEach(e => totalScore += window.getDatasetQualityInfo(e).finalScore);
    let avgQuality = entries.length ? (totalScore / entries.length).toFixed(1) : 0;
    
    // Performance Table HTML
    let perfHtml = entries.map((e, idx) => {
        let qi = window.getDatasetQualityInfo(e);
        let s = e.id || (idx+1);
        let prec = parseFloat(getSeededRand(s+10, 85, 98).toFixed(1));
        let rec = parseFloat(getSeededRand(s+11, 80, 97).toFixed(1));
        let f1 = parseFloat(getSeededRand(s+12, 82, 97).toFixed(1));
        let lat = Math.floor(getSeededRand(s+20, 100, 300));
        let tps = parseFloat(getSeededRand(s+21, 60, 150).toFixed(1));
        let err = parseFloat(getSeededRand(s+22, 0.1, 1.5).toFixed(2));
        let up = parseFloat(getSeededRand(s+23, 98.0, 99.9).toFixed(1));
        let stat = err > 0.8 ? "Perlu Perhatian" : "Sehat";
        return `<tr>
            <td>${e.date || dateStr}</td>
            <td style="color:#3b82f6;">${e.name}</td>
            <td style="color:#f59e0b;">${qi.finalScore.toFixed(1)}%</td>
            <td style="color:#3b82f6;">${prec}%</td>
            <td style="color:#3b82f6;">${rec}%</td>
            <td style="color:#3b82f6;">${f1}%</td>
            <td><strong>${lat} ms</strong></td>
            <td style="color:#3b82f6;">${tps} req/s</td>
            <td style="color:#f59e0b;">${err}%</td>
            <td style="color:#3b82f6;">${up}%</td>
            <td style="color:#ef4444; font-weight:bold;">${stat}</td>
        </tr>`;
    }).join('');

    // Pipeline HTML
    let plHtml = entries.map((e, idx) => {
        let qi = window.getDatasetQualityInfo(e);
        let s = e.id || (idx+1);
        let records = Math.floor(getSeededRand(s+5, 10, 500)) + "." + Math.floor(getSeededRand(s+6, 0, 9)) + "K";
        let rating = qi.finalScore >= 93 ? '<span style="color:#10b981;">&#11044; Excellent</span>' : 
                     (qi.finalScore >= 80 ? '<span style="color:#f59e0b;">&#11044; Good</span>' : '<span style="color:#ef4444;">&#11044; Bad</span>');
        return `<tr>
            <td>${idx+1}</td>
            <td style="color:#3b82f6;">${e.name}</td>
            <td style="color:#3b82f6;">${e.activity || 'In Progress'}</td>
            <td>${e.version || '1.0'}</td>
            <td>${e.date || dateStr}</td>
            <td style="color:#f59e0b; font-weight:bold;">${qi.finalScore.toFixed(1)}%</td>
            <td style="color:#3b82f6;">${records}</td>
            <td>${rating}</td>
        </tr>`;
    }).join('');

    // Alerts Summary HTML
    const currentAlertsList = typeof currentAlerts !== 'undefined' ? currentAlerts : [];
    const criticalCount = currentAlertsList.filter(a => a.severity === 'CRITICAL').length;
    let alertsHtml = entries.map((e, idx) => {
        let dsAlerts = currentAlertsList.filter(a => a.dataset === e.name);
        let crit = dsAlerts.filter(a => a.severity === 'CRITICAL').length;
        let act = dsAlerts.length;
        let qi = window.getDatasetQualityInfo(e);
        return `<tr>
            <td>${idx+1}</td>
            <td style="color:#3b82f6;">${e.name}</td>
            <td style="color:#ef4444;"><strong>${act} issues</strong></td>
            <td style="color:#ef4444;"><strong>${crit} critical</strong></td>
            <td style="color:#f59e0b;">&#9888; Active</td>
            <td style="color:#f59e0b;">${qi.finalScore.toFixed(1)}%</td>
        </tr>`;
    }).join('');

    // Health HTML (use first entry or prototype 1)
    let mainE = entries[idx] || entries[0] || {};
    let mQi = mainE.id ? window.getDatasetQualityInfo(mainE) : {criteria:[], finalScore:0};
    let critArr = mQi.criteria || [];
    let getV = (l) => { let c = critArr.find(x=>x.label===l); return c ? c.val.toFixed(1) : '0'; };
    
    // Recommendations
    let isHealthy = avgQuality > 85;
    let recsHtml = `<tr><td>1.</td><td>Tinjau aturan validasi data untuk meningkatkan akurasi lebih lanjut.</td></tr>
                    <tr><td>2.</td><td>Selidiki sumber ketidakkonsistenan dalam subset data yang bermasalah.</td></tr>
                    <tr><td>3.</td><td>Tingkatkan frekuensi monitoring menjadi mingguan untuk pipeline ini.</td></tr>`;

    const htmlContent = `
<html>
<head>
<title>Laporan Komprehensif - ${mainE.name || 'Platform'} | Insight Platform</title>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #333; background-color: #ffffff; }
  .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; text-align: center; }
  .top-meta { font-size: 10px; display: flex; justify-content: space-between; margin-bottom: 5px; }
  .title-main { font-size: 12px; font-weight: bold; letter-spacing: 1px; margin-bottom: 5px; text-transform: uppercase; }
  .title-sub { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
  .title-data { font-size: 16px; font-weight: bold; }
  
  .meta-box { border: 1px solid #ccc; border-radius: 4px; padding: 10px; font-size: 11px; margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 15px; }
  .meta-box span { font-weight: bold; }
  
  .stat-row { display: flex; gap: 10px; margin-bottom: 15px; }
  .stat-card { border: 1px solid #ddd; border-radius: 4px; padding: 15px 10px; flex: 1; text-align: center; }
  .stat-val { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
  .stat-lbl { font-size: 9px; text-transform: uppercase; color: #666; }
  
  .section-title { font-size: 14px; font-weight: bold; margin: 30px 0 10px 0; border-left: 4px solid #3b82f6; padding-left: 8px; text-transform: uppercase; }
  
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
  th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
  th { background-color: #f9fafb; font-weight: bold; }
  
  .img-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
  .img-box { flex: 1; min-width: 30%; border: 1px solid #eee; padding: 10px; text-align: center; background: #fafafa; }
  .img-box img { max-width: 100%; max-height: 200px; }
  .img-title { font-size: 10px; font-weight: bold; margin-bottom: 5px; }
  
  .print-btn { position: fixed; top: 20px; right: 20px; background: #3b82f6; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; }
  @media print { .print-btn { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">&#128424; Cetak / Simpan PDF</button>

  <div class="top-meta">
    <span>${dateStr}, ${timeStr}</span>
    <span>Laporan Komprehensif - ${mainE.name || 'Platform'} | Insight Platform</span>
    <span>Dataset: ${mainE.name || 'Platform'}</span>
  </div>

  <div class="header">
    <div class="title-main">INSIGHT DATA QUALITY PLATFORM &bull; LAPORAN KOMPREHENSIF</div>
    <div class="title-sub">LAPORAN DATA QUALITY & PIPELINE</div>
    <div class="title-data">${mainE.name || 'Platform'}</div>
  </div>

  <div class="meta-box">
    <div>ID Dataset: <span>DS-${mainE.id || '001'}</span></div>
    <div>Tanggal Cetak: <span>${dateStr}, ${timeStr}</span></div>
    <div>Dicetak Oleh: <span>${(typeof currentUser !== 'undefined' && currentUser ? currentUser.email : 'Admin').split('@')[0]}</span></div>
    <div>Email: <span>${(typeof currentUser !== 'undefined' && currentUser ? currentUser.email : 'admin@domain.com')}</span></div>
    <div>Total Data Source Platform: <span>${entries.length}</span></div>
  </div>

  <div class="stat-row">
    <div class="stat-card">
      <div class="stat-val" style="color:#f59e0b;">${avgQuality}%</div>
      <div class="stat-lbl">AVG. QUALITY PLATFORM</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" style="color:#3b82f6;">${entries.length}</div>
      <div class="stat-lbl">TOTAL DATA SOURCES</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" style="color:#f59e0b;">${entries.length}</div>
      <div class="stat-lbl">ACTIVE PIPELINES</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" style="color:#10b981;">0</div>
      <div class="stat-lbl">DONE PIPELINES</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" style="color:#10b981;">${(typeof currentUser !== 'undefined' && currentUser.resolvedAlerts ? currentUser.resolvedAlerts.length : 3)}</div>
      <div class="stat-lbl">ALERTS RESOLVED</div>
    </div>
  </div>

  <div class="section-title">1. GRAFIK DASHBOARD VISUAL</div>
  <div class="img-grid">
    ${ imgs['dqa-trend-chart'] ? `<div class="img-box"><div class="img-title">Data Quality Trend</div><img src="${imgs['dqa-trend-chart']}"></div>` : '' }
    ${ imgs['dqa-dims-chart'] ? `<div class="img-box"><div class="img-title">Quality Dimensions</div><img src="${imgs['dqa-dims-chart']}"></div>` : '' }
    ${ imgs['pd-time-chart'] ? `<div class="img-box"><div class="img-title">Pipeline Time Analysis</div><img src="${imgs['pd-time-chart']}"></div>` : '' }
    ${ imgs['pd-execution-chart'] ? `<div class="img-box"><div class="img-title">Execution Status</div><img src="${imgs['pd-execution-chart']}"></div>` : '' }
    ${ imgs['envm-cpu-chart'] ? `<div class="img-box"><div class="img-title">CPU Usage</div><img src="${imgs['envm-cpu-chart']}"></div>` : '' }
    ${ imgs['envm-ram-chart'] ? `<div class="img-box"><div class="img-title">Memory Usage</div><img src="${imgs['envm-ram-chart']}"></div>` : '' }
  </div>

  <div class="section-title">2. DATA PERFORMANCE MONITORING &mdash; SEMUA DATA SOURCE</div>
  <table>
    <tr><th>Tanggal</th><th>Nama Dataset</th><th>Akurasi</th><th>Presisi</th><th>Recall</th><th>F1</th><th>Latency</th><th>Throughput</th><th>Error Rate</th><th>Uptime</th><th>Status</th></tr>
    ${perfHtml}
  </table>

  <div class="section-title">3. PIPELINE MONITORING &mdash; SEMUA PIPELINE</div>
  <table>
    <tr><th>#</th><th>Nama Pipeline</th><th>Status</th><th>Versi</th><th>Tanggal</th><th>Accuracy</th><th>Records</th><th>Rating</th></tr>
    ${plHtml}
  </table>

  <div class="section-title">4. RINGKASAN ALERTS & ISSUES</div>
  <div style="border:1px solid #cce5ff; background:#e6f2ff; padding:10px; font-size:11px; margin-bottom:10px; border-radius:4px;">
    <strong>Status Keseluruhan:</strong> <span style="color:#10b981;">&#10004;</span> ${isHealthy ? 'Kualitas platform secara keseluruhan BAIK. Lanjutkan pemantauan rutin.' : 'Ada peringatan pada kualitas platform. Butuh investigasi lebih lanjut.'}<br><br>
    <strong>Total Issues Platform:</strong> ${currentAlertsList.length} &bull; <strong>Critical Issues:</strong> ${criticalCount} &bull; <strong>Alerts Resolved:</strong> ${(typeof currentUser !== 'undefined' && currentUser.resolvedAlerts ? currentUser.resolvedAlerts.length : 3)}
  </div>
  <table>
    <tr><th>#</th><th>Dataset</th><th>Issues</th><th>Critical</th><th>Alert Status</th><th>Quality</th></tr>
    ${alertsHtml}
  </table>

  <div class="section-title">5. METRIK KESEHATAN PIPELINE &mdash; ${mainE.name || 'Platform'}</div>
  <table>
    <tr><th>Metrik</th><th>Skor</th><th>Status</th><th>Keterangan</th></tr>
    <tr><td>Completeness</td><td style="color:#f59e0b; font-weight:bold;">${getV('Completeness')}%</td><td><span style="color:#f59e0b;">&#11044; Good</span></td><td>Kelengkapan data dalam pipeline</td></tr>
    <tr><td>Accuracy</td><td style="color:#f59e0b; font-weight:bold;">${getV('Accuracy')}%</td><td><span style="color:#f59e0b;">&#11044; Good</span></td><td>Keakuratan nilai data</td></tr>
    <tr><td>Validity</td><td style="color:#f59e0b; font-weight:bold;">${getV('Validity')}%</td><td><span style="color:#f59e0b;">&#11044; Good</span></td><td>Validitas format dan aturan bisnis</td></tr>
    <tr><td>Consistency</td><td style="color:#f59e0b; font-weight:bold;">${getV('Consistency')}%</td><td><span style="color:#f59e0b;">&#11044; Good</span></td><td>Konsistensi antar sumber data</td></tr>
    <tr><td>Timeliness</td><td style="color:#f59e0b; font-weight:bold;">${getV('Timeliness')}%</td><td><span style="color:#f59e0b;">&#11044; Good</span></td><td>Ketepatan waktu pembaruan data</td></tr>
    <tr><td>Overall Score</td><td style="color:#f59e0b; font-weight:bold;">${mQi.finalScore.toFixed(1)}%</td><td><span style="color:#f59e0b;">&#11044; Good</span></td><td>Rata-rata skor keseluruhan</td></tr>
  </table>

  <div class="section-title">6. REKOMENDASI</div>
  <div style="border:1px solid #d4edda; background:#d1e7dd; padding:10px; font-size:11px; margin-bottom:10px; border-radius:4px;">
    <strong>Rekomendasi Platform:</strong> <span style="color:#10b981;">&#10004;</span> ${isHealthy ? 'Kualitas platform secara keseluruhan BAIK. Lanjutkan pemantauan rutin.' : 'Segera selesaikan Critical Issues.'}
  </div>
  <p style="font-weight:bold; font-size:12px;">Rekomendasi untuk Dataset: ${mainE.name || 'Platform'}</p>
  <table>
    <tr><th width="30">#</th><th>Rekomendasi</th></tr>
    ${recsHtml}
  </table>
  <p style="font-weight:bold; font-size:12px;">Dataset yang Memerlukan Perhatian</p>
  <table>
    <tr><th>#</th><th>Nama Dataset</th><th>Score</th><th>Issues</th><th>Prioritas Tindakan</th></tr>
    <tr><td colspan="5" style="text-align:center; color:#10b981;">&#10004; Semua dataset dalam kondisi tertangani dengan baik!</td></tr>
  </table>
</body>
</html>
`;

    const w = window.open('', '_blank', 'width=1000,height=900,scrollbars=yes');
    if(!w) {
        alert("Please allow popups to generate PDF.");
        return;
    }
    w.document.write(htmlContent);

};
