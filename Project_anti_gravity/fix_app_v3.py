import re

with open('static/app_v3.js', 'r', encoding='utf-8') as f:
    text = f.read()

# The clean dsoDownloadEntry function
clean_func = '''window.dsoDownloadEntry = async function(idx) {
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

        // Restore hidden state IMMEDIATELY
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
<div id="pdf-report-container">
<style>
  #pdf-report-container *{box-sizing:border-box;margin:0;padding:0}
  #pdf-report-container{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10pt;color:#1a1a1a;background:#fff;padding:25px}
  #pdf-report-container .print-header{display:flex;justify-content:space-between;font-size:8pt;color:#555;padding-bottom:5px;border-bottom:1px solid #aaa;margin-bottom:15px}
  #pdf-report-container .title-block{text-align:center;margin-bottom:20px}
  #pdf-report-container .title-platform{font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;color:#333}
  #pdf-report-container .title-main{font-size:20pt;font-weight:bold;color:#111;margin:4px 0}
  #pdf-report-container .title-sub{font-size:12pt;font-weight:bold;color:#333}
  #pdf-report-container .info-box{border:1px solid #ccc;border-radius:4px;padding:12px;margin-bottom:15px;line-height:1.6;background:#f9fbfd;display:flex;flex-wrap:wrap;gap:15px;}
  #pdf-report-container .info-box div{min-width:30%;}
  #pdf-report-container .info-box strong{font-weight:bold}
  #pdf-report-container .kpi-row{display:flex;gap:10px;margin-bottom:20px}
  #pdf-report-container .kpi-card{flex:1;border:1px solid #ccc;border-radius:4px;padding:12px 5px;text-align:center;background:#f9fbfd}
  #pdf-report-container .kpi-val{font-size:16pt;font-weight:bold;color:#1a6faf;margin-bottom:4px}
  #pdf-report-container .kpi-lbl{font-size:7pt;color:#666;text-transform:uppercase;letter-spacing:0.5px}
  #pdf-report-container .section-title{font-size:12pt;font-weight:bold;border-left:4px solid #1a6faf;padding-left:8px;margin:25px 0 10px 0;text-transform:uppercase;color:#111;}
  #pdf-report-container table{width:100%;border-collapse:collapse;margin-bottom:15px;font-size:9.5pt}
  #pdf-report-container th, #pdf-report-container td{border:1px solid #ccc;padding:8px;text-align:left}
  #pdf-report-container th{background:#f0f5ff;font-weight:bold}
  #pdf-report-container .chart-grid{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:15px}
  #pdf-report-container .chart-box{flex:1;min-width:48%;border:1px solid #ccc;border-radius:4px;padding:10px;background:#fff;text-align:center;page-break-inside:avoid}
  #pdf-report-container .chart-box-title{font-size:9pt;font-weight:bold;margin-bottom:10px;text-align:left}
  #pdf-report-container .chart-box img{max-width:100%;max-height:220px;}
  #pdf-report-container .page-break{page-break-before:always}
  #pdf-report-container .no-break{page-break-inside:avoid}
</style>
<div class="print-header">
  <span>${dateStr}, ${timeStr}</span>
  <span>Laporan Komprehensif Data Quality &amp; Platform</span>
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
  <div class="kpi-card"><div class="kpi-val" style="color:#d97706">${avgQuality}%</div><div class="kpi-lbl">AVG. QUALITY</div></div>
  <div class="kpi-card"><div class="kpi-val" style="color:#2563eb">${entries.length}</div><div class="kpi-lbl">DATA SOURCES</div></div>
  <div class="kpi-card"><div class="kpi-val" style="color:#2563eb">${entries.length}</div><div class="kpi-lbl">ACTIVE PIPELINES</div></div>
  <div class="kpi-card"><div class="kpi-val" style="color:#059669">0</div><div class="kpi-lbl">DONE PIPELINES</div></div>
</div>

<div class="section-title">1. IDENTITAS DATASET</div>
<table>
  <tr><td><strong>Nama Dataset</strong></td><td style="color:#2563eb">${mainE.name}</td><td><strong>Versi</strong></td><td>${mainE.version || '1.0'}</td></tr>
  <tr><td><strong>Tanggal Dibuat</strong></td><td>${mainE.date || dateStr}</td><td><strong>Quality Score</strong></td><td style="color:#d97706;font-weight:bold;">${currentQi.finalScore.toFixed(1)}%</td></tr>
</table>

<div class="section-title">2. DATA QUALITY DASHBOARD (GRAFIK)</div>
<div class="chart-grid">
  ${imgs['dqa-trend-chart'] ? `<div class="chart-box"><div class="chart-box-title">Quality Score Trend</div><img src="${imgs['dqa-trend-chart']}"></div>` : ''}
  ${imgs['dqa-dims-chart'] ? `<div class="chart-box"><div class="chart-box-title">Quality Dimensions</div><img src="${imgs['dqa-dims-chart']}"></div>` : ''}
</div>

<div class="section-title">3. PIPELINE MONITORING &amp; PERFORMA</div>
<div class="chart-grid">
  ${imgs['pd-performance-chart'] ? `<div class="chart-box"><div class="chart-box-title">Pipeline Performance</div><img src="${imgs['pd-performance-chart']}"></div>` : ''}
  ${imgs['pd-quality-chart'] ? `<div class="chart-box"><div class="chart-box-title">Metrics Tracking</div><img src="${imgs['pd-quality-chart']}"></div>` : ''}
</div>

<div class="page-break"></div>

<div class="section-title">4. DATA PERFORMANCE MONITORING</div>
<table>
  <tr><th>Tanggal</th><th>Nama Dataset</th><th>Kualitas</th><th>Latency</th><th>Throughput</th><th>Error Rate</th><th>Uptime</th><th>Status</th></tr>
  ${htmlTable2}
</table>

<div class="section-title">5. DAFTAR PIPELINE &amp; STATUS</div>
<table>
  <tr><th>#</th><th>Nama Pipeline</th><th>Status</th><th>Versi</th><th>Tanggal</th><th>Accuracy</th><th>Records</th><th>Rating</th></tr>
  ${htmlTable3}
</table>

<div class="page-break"></div>

<div class="section-title">6. ENVIRONMENT DASHBOARD</div>
<div class="chart-grid">
  ${imgs['envm-cpu-chart'] ? `<div class="chart-box"><div class="chart-box-title">CPU Usage</div><img src="${imgs['envm-cpu-chart']}"></div>` : ''}
  ${imgs['envm-ram-chart'] ? `<div class="chart-box"><div class="chart-box-title">Memory Usage</div><img src="${imgs['envm-ram-chart']}"></div>` : ''}
  ${imgs['envm-network-chart'] ? `<div class="chart-box"><div class="chart-box-title">Network Traffic</div><img src="${imgs['envm-network-chart']}"></div>` : ''}
  ${imgs['envm-resource-chart'] ? `<div class="chart-box"><div class="chart-box-title">Resource Load</div><img src="${imgs['envm-resource-chart']}"></div>` : ''}
</div>
</div>`;

        // 4. Use html2pdf for silent PDF generation
        const container = document.createElement('div');
        container.innerHTML = htmlContent;
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        container.style.width = '210mm'; 
        container.style.backgroundColor = '#ffffff';
        document.body.appendChild(container);

        const fileName = 'Laporan_Komprehensif_' + String(mainE.name || 'Platform').replace(/\s+/g, '_') + '.pdf';

        const opt = {
            margin:       10,
            filename:     fileName,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        window.html2pdf().set(opt).from(container).save().then(() => {
            document.body.removeChild(container);
        });

    } catch (err) {
        alert("Terjadi kesalahan sistem saat memproses laporan: " + err.message);
        console.error("Print Error:", err);
    }
};
'''

match = re.search(r'window\.dsoDownloadEntry\s*=\s*(async\s*)?function.*?// =============================================\s*// DATA ENTRY WIZARD', text, re.DOTALL)

if match:
    new_text = text[:match.start()] + clean_func + '\n\n// =============================================\n// DATA ENTRY WIZARD' + text[match.end():]
    with open('static/app_v3.js', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Replaced catastrophic duplicate code with clean function!")
else:
    print("Failed to match section")
