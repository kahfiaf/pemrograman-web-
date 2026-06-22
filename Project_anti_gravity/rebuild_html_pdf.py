import re

with open('static/app_v2.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_dso = """    window.dsoDownloadEntry = async function(idx) {
        try {
            const entries = (typeof currentUser !== 'undefined' && currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
            let mainE = entries[idx] || entries[0] || {};
            if (!mainE) {
                alert("Data tidak ditemukan.");
                return;
            }

            // 1. Temporarily unhide all chart containers to force Chart.js to render
            const canvasIds = [
                'dqa-trend-chart', 'dqa-dims-chart', 'dqa-freshness-chart', 'dqa-issues-chart',
                'pd-performance-chart', 'pd-quality-chart', 'pd-time-chart', 'pd-execution-chart',
                'envm-cpu-chart', 'envm-ram-chart', 'envm-network-chart', 'envm-resource-chart'
            ];
            const chartParents = [];
            canvasIds.forEach(id => {
                let el = document.getElementById(id);
                if (el) {
                    let p = el.parentElement;
                    while (p && p !== document.body) {
                        if (window.getComputedStyle(p).display === 'none' || p.style.display === 'none') {
                            if (!chartParents.includes(p)) chartParents.push(p);
                        }
                        p = p.parentElement;
                    }
                }
            });

            const oldStyles = chartParents.map(p => ({
                display: p.style.display, position: p.style.position,
                visibility: p.style.visibility, opacity: p.style.opacity, zIndex: p.style.zIndex
            }));

            chartParents.forEach(p => {
                p.style.display = 'block';
                p.style.position = 'absolute';
                p.style.visibility = 'hidden';
                p.style.opacity = '0';
                p.style.zIndex = '-9999';
            });

            // Wait for resize observer and rendering
            if (chartParents.length > 0) {
                await new Promise(r => setTimeout(r, 600));
            }

            // Capture images
            const imgs = {};
            canvasIds.forEach(id => {
                let el = document.getElementById(id);
                if (el) {
                    try { imgs[id] = el.toDataURL('image/png'); } catch(e) { imgs[id] = ''; }
                } else { imgs[id] = ''; }
            });

            // Restore hidden state
            chartParents.forEach((p, i) => {
                p.style.display = oldStyles[i].display;
                p.style.position = oldStyles[i].position;
                p.style.visibility = oldStyles[i].visibility;
                p.style.opacity = oldStyles[i].opacity;
                p.style.zIndex = oldStyles[i].zIndex;
            });

            // 2. Prepare Data
            const now = new Date();
            const dateStr = now.toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'});
            const timeStr = now.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'});
            let printBy = (typeof currentUser !== 'undefined' && currentUser ? currentUser.email : 'admin@domain.com').split('@')[0];
            let email = (typeof currentUser !== 'undefined' && currentUser ? currentUser.email : 'admin@domain.com');
            
            let totalScore = 0;
            let totalRecords = 0;
            let totalIssues = 0;
            let totalCritical = 0;
            entries.forEach(e => {
                let qi = window.getDatasetQualityInfo(e);
                totalScore += qi.finalScore;
                totalRecords += 121.5; // stub
                totalIssues += 4; // stub
                totalCritical += 2; // stub
            });
            let avgQuality = entries.length ? (totalScore / entries.length).toFixed(1) : 0;
            let currentQi = window.getDatasetQualityInfo(mainE);
            let dsRecords = "121.5K";
            
            let htmlTable2 = entries.map((e, i) => {
                let qi = window.getDatasetQualityInfo(e);
                let lat = Math.floor(getSeededRand(e.id+20, 100, 300));
                let tps = parseFloat(getSeededRand(e.id+21, 60, 150).toFixed(1));
                let err = parseFloat(getSeededRand(e.id+22, 0.1, 1.5).toFixed(2));
                let up = parseFloat(getSeededRand(e.id+23, 98.0, 99.9).toFixed(1));
                let stat = err > 0.8 ? "Perlu Perhatian" : "Sehat";
                return `<tr>
                    <td>${e.date || dateStr}</td>
                    <td style="color:#3b82f6;font-weight:bold;">${e.name}</td>
                    <td style="color:#f59e0b;font-weight:bold;">${qi.finalScore.toFixed(1)}%</td>
                    <td>${lat} ms</td>
                    <td>${tps} req/s</td>
                    <td>${err}%</td>
                    <td>${up}%</td>
                    <td style="color:${err > 0.8 ? '#ef4444' : '#10b981'};font-weight:bold;">${stat}</td>
                </tr>`;
            }).join('');

            let htmlTable3 = entries.map((e, i) => {
                let qi = window.getDatasetQualityInfo(e);
                return `<tr>
                    <td>${i+1}</td>
                    <td style="color:#3b82f6;font-weight:bold;">${e.name}</td>
                    <td style="color:#3b82f6;">${e.activity || 'In Progress'}</td>
                    <td>${e.version || '1.0'}</td>
                    <td>${e.date || dateStr}</td>
                    <td style="color:#f59e0b;font-weight:bold;">${qi.finalScore.toFixed(1)}%</td>
                    <td>${Math.floor(getSeededRand((e.id||0)+5, 10, 500))}.${Math.floor(getSeededRand((e.id||0)+6, 0, 9))}K</td>
                    <td style="color:${qi.finalScore >= 90 ? '#10b981' : '#f59e0b'};font-weight:bold;">&#11044; ${qi.finalScore >= 90 ? 'Excellent' : 'Good'}</td>
                </tr>`;
            }).join('');

            // 3. Build HTML
            const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Laporan Komprehensif - ${mainE.name || 'Platform'} | insight Platform</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10pt;color:#1a1a1a;background:#fff;padding:25px}
  .print-header{display:flex;justify-content:space-between;font-size:8pt;color:#555;padding-bottom:5px;border-bottom:1px solid #aaa;margin-bottom:15px}
  .title-block{text-align:center;margin-bottom:20px}
  .title-platform{font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;color:#333}
  .title-main{font-size:20pt;font-weight:bold;color:#111;margin:4px 0}
  .title-sub{font-size:12pt;font-weight:bold;color:#333}
  .info-box{border:1px solid #ccc;border-radius:4px;padding:12px;margin-bottom:15px;line-height:1.6;background:#f9fbfd;display:flex;flex-wrap:wrap;gap:15px;}
  .info-box div{min-width:30%;}
  .info-box strong{font-weight:bold}
  .kpi-row{display:flex;gap:10px;margin-bottom:20px}
  .kpi-card{flex:1;border:1px solid #ccc;border-radius:4px;padding:12px 5px;text-align:center;background:#f9fbfd}
  .kpi-val{font-size:16pt;font-weight:bold;color:#1a6faf;margin-bottom:4px}
  .kpi-lbl{font-size:7pt;color:#666;text-transform:uppercase;letter-spacing:0.5px}
  .section-title{font-size:12pt;font-weight:bold;border-left:4px solid #1a6faf;padding-left:8px;margin:25px 0 10px 0;text-transform:uppercase;color:#111;}
  table{width:100%;border-collapse:collapse;margin-bottom:15px;font-size:9.5pt}
  th,td{border:1px solid #ccc;padding:8px;text-align:left}
  th{background:#f0f5ff;font-weight:bold}
  .chart-grid{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:15px}
  .chart-box{flex:1;min-width:48%;border:1px solid #ccc;border-radius:4px;padding:10px;background:#fff;text-align:center;page-break-inside:avoid}
  .chart-box-title{font-size:9pt;font-weight:bold;margin-bottom:10px;text-align:left}
  .chart-box img{max-width:100%;max-height:220px;}
  .page-break{page-break-before:always}
  .no-break{page-break-inside:avoid}
  @media print {
    @page{margin:1.0cm;size:A4 portrait}
    body{padding:0}
    .kpi-row{display:flex}
  }
</style>
</head>
<body>
<div class="print-header">
  <span>${dateStr}, ${timeStr}</span>
  <span>Laporan Komprehensif Data Quality &amp; Platform &ndash; Insight Platform</span>
  <span>Dataset: ${mainE.name || 'Platform'}</span>
</div>

<div class="title-block">
  <div class="title-platform">Insight Data Quality Platform &bull; Laporan Komprehensif</div>
  <div class="title-main">LAPORAN DATA QUALITY &amp; PIPELINE</div>
  <div class="title-sub">${mainE.name || 'Platform'}</div>
</div>

<div class="info-box">
  <div><strong>ID Dataset:</strong> DS-${mainE.id || '001'}</div>
  <div><strong>Tanggal Cetak:</strong> ${dateStr}, ${timeStr}</div>
  <div><strong>Dicetak Oleh:</strong> ${printBy}</div>
  <div><strong>Email:</strong> ${email}</div>
  <div><strong>Total Data Source Platform:</strong> ${entries.length}</div>
</div>

<div class="kpi-row">
  <div class="kpi-card"><div class="kpi-val" style="color:#d97706">${avgQuality}%</div><div class="kpi-lbl">AVG. QUALITY PLATFORM</div></div>
  <div class="kpi-card"><div class="kpi-val" style="color:#2563eb">${entries.length}</div><div class="kpi-lbl">TOTAL DATA SOURCES</div></div>
  <div class="kpi-card"><div class="kpi-val" style="color:#2563eb">${entries.length}</div><div class="kpi-lbl">ACTIVE PIPELINES</div></div>
  <div class="kpi-card"><div class="kpi-val" style="color:#059669">0</div><div class="kpi-lbl">DONE PIPELINES</div></div>
  <div class="kpi-card"><div class="kpi-val" style="color:#059669">3</div><div class="kpi-lbl">ALERTS RESOLVED</div></div>
</div>
<div class="kpi-row">
  <div class="kpi-card"><div class="kpi-val" style="color:#d97706">${currentQi.finalScore.toFixed(1)}%</div><div class="kpi-lbl">SCORE DATASET INI</div></div>
  <div class="kpi-card"><div class="kpi-val" style="color:#2563eb">${dsRecords}</div><div class="kpi-lbl">TOTAL RECORDS (ALL)</div></div>
  <div class="kpi-card"><div class="kpi-val" style="color:#dc2626">${totalIssues}</div><div class="kpi-lbl">TOTAL ISSUES PLATFORM</div></div>
  <div class="kpi-card"><div class="kpi-val" style="color:#dc2626">${totalCritical}</div><div class="kpi-lbl">CRITICAL ISSUES</div></div>
  <div class="kpi-card"><div class="kpi-val" style="color:#059669">&#9650; +3.3%</div><div class="kpi-lbl">QUALITY TREND</div></div>
</div>

<div class="section-title">1. IDENTITAS DATASET</div>
<table>
  <tr><td><strong>Nama Dataset</strong></td><td style="color:#2563eb">${mainE.name}</td><td><strong>Versi</strong></td><td>${mainE.version || '1.0'}</td></tr>
  <tr><td><strong>Tanggal Dibuat</strong></td><td>${mainE.date || dateStr}</td><td><strong>File Type</strong></td><td>application/pdf</td></tr>
  <tr><td><strong>Status / Activity</strong></td><td style="color:#2563eb">${mainE.activity || 'In Progress'}</td><td><strong>Quality Score</strong></td><td style="color:#d97706;font-weight:bold;">${currentQi.finalScore.toFixed(1)}%</td></tr>
</table>

<div class="section-title">2. RINGKASAN KUALITAS &mdash; DATASET INI</div>
<table>
  <tr><th>Dimensi Kualitas</th><th>Skor</th><th>Dimensi Kualitas</th><th>Skor</th></tr>
  <tr><td><strong>Overall Score</strong></td><td style="color:#d97706;font-weight:bold;">${currentQi.finalScore.toFixed(1)}%</td><td><strong>Pipeline Status</strong></td><td style="color:#2563eb;">${mainE.activity || 'In Progress'}</td></tr>
  <tr><td>Completeness</td><td>${(currentQi.criteria.find(c=>c.label==='Completeness')||{val:0}).val.toFixed(1)}%</td><td>Accuracy</td><td>${(currentQi.criteria.find(c=>c.label==='Accuracy')||{val:0}).val.toFixed(1)}%</td></tr>
  <tr><td>Validity</td><td>${(currentQi.criteria.find(c=>c.label==='Validity')||{val:0}).val.toFixed(1)}%</td><td>Consistency</td><td>${(currentQi.criteria.find(c=>c.label==='Consistency')||{val:0}).val.toFixed(1)}%</td></tr>
  <tr><td>Timeliness</td><td>${(currentQi.criteria.find(c=>c.label==='Timeliness')||{val:0}).val.toFixed(1)}%</td><td>Quality Trend</td><td style="color:#059669">&#9650; +3.3%</td></tr>
</table>

<div class="page-break"></div>

<div class="section-title">3. DATA QUALITY DASHBOARD (GRAFIK)</div>
<div class="chart-grid">
  ${imgs['dqa-trend-chart'] ? `<div class="chart-box"><div class="chart-box-title">Grafik 3.1 &mdash; Quality Score Trend</div><img src="${imgs['dqa-trend-chart']}"></div>` : ''}
  ${imgs['dqa-dims-chart'] ? `<div class="chart-box"><div class="chart-box-title">Grafik 3.2 &mdash; Quality Dimensions</div><img src="${imgs['dqa-dims-chart']}"></div>` : ''}
  ${imgs['dqa-freshness-chart'] ? `<div class="chart-box"><div class="chart-box-title">Grafik 3.3 &mdash; Data Freshness</div><img src="${imgs['dqa-freshness-chart']}"></div>` : ''}
  ${imgs['dqa-issues-chart'] ? `<div class="chart-box"><div class="chart-box-title">Grafik 3.4 &mdash; Top Issues</div><img src="${imgs['dqa-issues-chart']}"></div>` : ''}
</div>

<div class="section-title">4. PIPELINE MONITORING &amp; PERFORMA</div>
<div class="chart-grid">
  ${imgs['pd-performance-chart'] ? `<div class="chart-box"><div class="chart-box-title">Grafik 4.1 &mdash; Pipeline Performance</div><img src="${imgs['pd-performance-chart']}"></div>` : ''}
  ${imgs['pd-quality-chart'] ? `<div class="chart-box"><div class="chart-box-title">Grafik 4.2 &mdash; Metrics Tracking</div><img src="${imgs['pd-quality-chart']}"></div>` : ''}
  ${imgs['pd-time-chart'] ? `<div class="chart-box"><div class="chart-box-title">Grafik 4.3 &mdash; Processing Time</div><img src="${imgs['pd-time-chart']}"></div>` : ''}
  ${imgs['pd-execution-chart'] ? `<div class="chart-box"><div class="chart-box-title">Grafik 4.4 &mdash; Execution Status</div><img src="${imgs['pd-execution-chart']}"></div>` : ''}
</div>

<div class="page-break"></div>

<div class="section-title">5. DATA PERFORMANCE MONITORING &mdash; SEMUA DATA SOURCE</div>
<table>
  <tr><th>Tanggal</th><th>Nama Dataset</th><th>Kualitas</th><th>Latency</th><th>Throughput</th><th>Error Rate</th><th>Uptime</th><th>Status</th></tr>
  ${htmlTable2}
</table>

<div class="section-title">6. DAFTAR PIPELINE &amp; STATUS</div>
<table>
  <tr><th>#</th><th>Nama Pipeline</th><th>Status</th><th>Versi</th><th>Tanggal</th><th>Accuracy</th><th>Records</th><th>Rating</th></tr>
  ${htmlTable3}
</table>

<div class="page-break"></div>

<div class="section-title">7. ENVIRONMENT &amp; RESOURCE DASHBOARD</div>
<div class="chart-grid">
  ${imgs['envm-cpu-chart'] ? `<div class="chart-box"><div class="chart-box-title">Grafik 7.1 &mdash; CPU Usage</div><img src="${imgs['envm-cpu-chart']}"></div>` : ''}
  ${imgs['envm-ram-chart'] ? `<div class="chart-box"><div class="chart-box-title">Grafik 7.2 &mdash; Memory Usage</div><img src="${imgs['envm-ram-chart']}"></div>` : ''}
  ${imgs['envm-network-chart'] ? `<div class="chart-box"><div class="chart-box-title">Grafik 7.3 &mdash; Network Traffic</div><img src="${imgs['envm-network-chart']}"></div>` : ''}
  ${imgs['envm-resource-chart'] ? `<div class="chart-box"><div class="chart-box-title">Grafik 7.4 &mdash; Resource Load</div><img src="${imgs['envm-resource-chart']}"></div>` : ''}
</div>

<div class="section-title">8. REKOMENDASI TINDAKAN</div>
<table>
  <tr><th style="width:30px">#</th><th>Rekomendasi Lanjutan untuk Platform</th></tr>
  <tr><td>1.</td><td>Tinjau aturan validasi data pada <strong>${mainE.name}</strong> untuk meningkatkan akurasi lebih lanjut.</td></tr>
  <tr><td>2.</td><td>Selidiki lonjakan CPU Usage pada hari-hari terakhir berdasarkan Environment Dashboard.</td></tr>
  <tr><td>3.</td><td>Tingkatkan frekuensi monitoring Pipeline menjadi mingguan untuk mencegah <em>bottleneck</em> data.</td></tr>
  <tr><td>4.</td><td>Aktifkan auto-alert untuk deteksi dini anomali kualitas data di semua <em>data sources</em>.</td></tr>
</table>

<div style="text-align:center; font-size:8pt; color:#aaa; margin-top:30px;">
  Generated by Insight Platform | ${dateStr}
</div>
</body>
</html>`;

            // 4. Create hidden iframe to print
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = 'none';
            document.body.appendChild(iframe);

            const docObj = iframe.contentWindow.document;
            docObj.open();
            docObj.write(htmlContent);
            docObj.close();

            setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                setTimeout(() => document.body.removeChild(iframe), 2000);
            }, 800);

        } catch (err) {
            alert("Terjadi kesalahan sistem saat memproses laporan: " + err.message);
            console.error("Print Error:", err);
        }
    };"""

match = re.search(r'window\.dsoDownloadEntry = async function\(idx\) \{.*?\}\s*;\s*', content, re.DOTALL)
if match:
    content = content.replace(match.group(0), new_dso)
    with open('static/app_v2.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Replaced dsoDownloadEntry successfully!')
else:
    match2 = re.search(r'window\.dsoDownloadEntry = function\(idx\) \{.*?\}\s*;\s*', content, re.DOTALL)
    if match2:
        content = content.replace(match2.group(0), new_dso)
        with open('static/app_v2.js', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Replaced sync dsoDownloadEntry successfully!')
    else:
        print('Could not find window.dsoDownloadEntry to replace.')
