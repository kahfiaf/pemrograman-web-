import re

with open('static/app_v3.js', 'r', encoding='utf-8') as f:
    text = f.read()

new_func = '''window.dsoDownloadEntry = async function(idx) {
    // TAMPILKAN OVERLAY LOADING AGAR USER TIDAK BINGUNG DAN LAYOUT CHART.JS SEMPURNA
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

    try {
        const entries = (typeof currentUser !== 'undefined' && currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
        let mainE = entries[idx] || entries[0] || {};
        if (!mainE) {
            document.body.removeChild(overlay);
            alert("Data tidak ditemukan.");
            return;
        }

        if (typeof window.jspdf === 'undefined') {
            document.body.removeChild(overlay);
            alert("Library PDF belum siap. Pastikan koneksi internet aktif lalu refresh halaman.");
            return;
        }

        const canvases = [
            { id: 'dqa-trend-chart', title: 'Quality Score Trend' },
            { id: 'dqa-dims-chart', title: 'Quality Dimensions' },
            { id: 'pd-performance-chart', title: 'Pipeline Performance' },
            { id: 'pd-quality-chart', title: 'Metrics Tracking' },
            { id: 'envm-cpu-chart', title: 'CPU Usage' },
            { id: 'envm-ram-chart', title: 'RAM Usage' },
            { id: 'envm-network-chart', title: 'Network Traffic' },
            { id: 'envm-resource-chart', title: 'Resource Load' }
        ];

        // --- UNHIDE CHARTS UNDERNEATH OVERLAY ---
        // We set visibility to visible and opacity to 1 so the browser DEFINITELY renders it!
        // We set zIndex to 999998 so it's just under the overlay, so the user doesn't see it jumping around.
        const chartParents = [];
        canvases.forEach(c => {
            let el = document.getElementById(c.id);
            if(el) {
                let p = el.parentElement;
                while(p && p !== document.body) {
                    if(window.getComputedStyle(p).display === 'none' || p.style.display === 'none') {
                        if(!chartParents.includes(p)) chartParents.push(p);
                    }
                    p = p.parentElement;
                }
            }
        });
        
        const oldStyles = chartParents.map(p => ({
            display: p.style.display, position: p.style.position,
            visibility: p.style.visibility, opacity: p.style.opacity,
            zIndex: p.style.zIndex, width: p.style.width, height: p.style.height
        }));
        
        chartParents.forEach(p => {
            p.style.display = 'block';
            p.style.position = 'fixed'; // fixed so it stays in viewport to ensure rendering
            p.style.top = '0';
            p.style.left = '0';
            p.style.visibility = 'visible'; // MUST BE VISIBLE
            p.style.opacity = '1';          // MUST BE VISIBLE
            p.style.zIndex = '999998';      // Behind overlay
            p.style.width = '1000px';       // Force huge width for Chart.js
            p.style.height = '600px';       // Force height
        });
        
        // Wait 1.5s for Chart.js ResizeObserver & Animations to fully render!
        if (chartParents.length > 0) {
            await new Promise(r => setTimeout(r, 1500));
        }

        const imgs = {};
        canvases.forEach((c) => {
            let el = document.getElementById(c.id);
            if(el) {
                try {
                    let imgData = el.toDataURL('image/png');
                    imgs[c.id] = (imgData && imgData.length > 50) ? imgData : null;
                } catch(e) { imgs[c.id] = null; }
            } else { imgs[c.id] = null; }
        });

        // Restore hidden state
        chartParents.forEach((p, i) => {
            p.style.display = oldStyles[i].display;
            p.style.position = oldStyles[i].position;
            p.style.visibility = oldStyles[i].visibility;
            p.style.opacity = oldStyles[i].opacity;
            p.style.zIndex = oldStyles[i].zIndex;
            p.style.width = oldStyles[i].width;
            p.style.height = oldStyles[i].height;
        });
        // --- END UNHIDE ---

        // Prepare Data
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        
        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'});
        const timeStr = now.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'});

        let totalScore = 0;
        entries.forEach(e => totalScore += getDatasetQualityInfo(e).finalScore);
        let avgQuality = entries.length ? (totalScore / entries.length).toFixed(1) : 0;
        let qi = getDatasetQualityInfo(mainE);

        const W = 210; // A4 width
        let y = 15;

        // Header Section
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text('INSIGHT DATA QUALITY PLATFORM - LAPORAN KOMPREHENSIF', W/2, y, { align: 'center' });
        
        y += 8;
        doc.setFontSize(12);
        doc.setTextColor(71, 85, 105);
        doc.text('LAPORAN DATA QUALITY & PIPELINE', W/2, y, { align: 'center' });
        
        y += 6;
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(mainE.name || 'Project1', W/2, y, { align: 'center' });
        
        y += 10;
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.5);
        doc.line(14, y, W-14, y);
        
        y += 8;
        
        // Meta Information
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        let userEmail = (typeof currentUser !== 'undefined' && currentUser && currentUser.email) ? currentUser.email : 'admin@domain.com';
        let printBy = userEmail.split('@')[0];
        
        doc.text(`ID Dataset: DS-${mainE.id || '1781450995470'}`, 14, y);
        doc.text(`Tanggal Cetak: ${dateStr}, ${timeStr}`, 70, y);
        doc.text(`Dicetak Oleh: ${printBy}`, 140, y);
        
        y += 6;
        doc.text(`Email: ${userEmail}`, 14, y);
        doc.text(`Total Data Source Platform: ${entries.length}`, 70, y);
        
        y += 10;
        
        // 4 KPI Cards (Drawn manually)
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(250, 250, 250);
        let kpiW = 42;
        let kpiSpacing = 4.5;
        let kpiH = 15;
        
        // Card 1
        doc.roundedRect(14, y, kpiW, kpiH, 1, 1, 'FD');
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(217, 119, 6);
        doc.text(`${avgQuality}%`, 14 + kpiW/2, y+7, {align: 'center'});
        doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
        doc.text('AVG. QUALITY', 14 + kpiW/2, y+12, {align: 'center'});
        
        // Card 2
        let cx2 = 14 + kpiW + kpiSpacing;
        doc.roundedRect(cx2, y, kpiW, kpiH, 1, 1, 'FD');
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
        doc.text(`${entries.length}`, cx2 + kpiW/2, y+7, {align: 'center'});
        doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
        doc.text('DATA SOURCES', cx2 + kpiW/2, y+12, {align: 'center'});
        
        // Card 3
        let cx3 = cx2 + kpiW + kpiSpacing;
        doc.roundedRect(cx3, y, kpiW, kpiH, 1, 1, 'FD');
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
        let activePl = entries.filter(e => e.activity === 'in-progress').length;
        doc.text(`${activePl}`, cx3 + kpiW/2, y+7, {align: 'center'});
        doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
        doc.text('ACTIVE PIPELINES', cx3 + kpiW/2, y+12, {align: 'center'});
        
        // Card 4
        let cx4 = cx3 + kpiW + kpiSpacing;
        doc.roundedRect(cx4, y, kpiW, kpiH, 1, 1, 'FD');
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(5, 150, 105);
        doc.text('0', cx4 + kpiW/2, y+7, {align: 'center'});
        doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
        doc.text('DONE PIPELINES', cx4 + kpiW/2, y+12, {align: 'center'});
        
        y += 25;
        
        // Section 1: Identitas Dataset
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
        doc.text('1. IDENTITAS DATASET & METRIK', 14, y);
        y += 4;
        
        let completeness = (qi.criteria.find(c=>c.label==='Completeness')||{val:0}).val.toFixed(1) + '%';
        let accuracy = (qi.criteria.find(c=>c.label==='Accuracy')||{val:0}).val.toFixed(1) + '%';
        let validity = (qi.criteria.find(c=>c.label==='Validity')||{val:0}).val.toFixed(1) + '%';
        let consistency = (qi.criteria.find(c=>c.label==='Consistency')||{val:0}).val.toFixed(1) + '%';

        doc.autoTable({
            startY: y,
            showHead: 'never',
            body: [
                ['Nama Dataset', mainE.name, 'Versi', mainE.version || '1.0'],
                ['Tanggal Dibuat', mainE.date || dateStr, 'Quality Score', qi.finalScore.toFixed(1) + '%'],
                ['Completeness', completeness, 'Accuracy', accuracy],
                ['Validity', validity, 'Consistency', consistency]
            ],
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { fontStyle: 'bold', fillColor: [248, 250, 252] },
                2: { fontStyle: 'bold', fillColor: [248, 250, 252] },
                3: { textColor: [217, 119, 6], fontStyle: 'bold' } // orange for score column
            }
        });
        
        y = doc.lastAutoTable.finalY + 10;
        
        function drawChartSection(title, chartIds) {
            if (y > 230) { doc.addPage(); y = 20; }
            doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
            doc.text(title, 14, y);
            y += 5;
            
            let cx = 14;
            let imgW = 88;
            let imgH = 50;
            
            chartIds.forEach(id => {
                let imgData = imgs[id];
                let titleObj = canvases.find(c => c.id === id);
                if (cx + imgW > W) { cx = 14; y += imgH + 10; }
                if (y + imgH > 280) { doc.addPage(); y = 20; cx = 14; }
                
                doc.setDrawColor(226, 232, 240);
                doc.rect(cx, y, imgW, imgH);
                doc.setFontSize(8); doc.setFont('helvetica', 'bold');
                doc.text(titleObj.title, cx + 2, y + 4);
                
                if (imgData) doc.addImage(imgData, 'PNG', cx+1, y + 5, imgW-2, imgH-6);
                
                cx += imgW + 5;
            });
            if(cx > 14) y += imgH + 10;
        }

        drawChartSection('2. DATA QUALITY DASHBOARD (GRAFIK)', ['dqa-trend-chart', 'dqa-dims-chart']);
        drawChartSection('3. PIPELINE MONITORING & PERFORMA', ['pd-performance-chart', 'pd-quality-chart']);
        drawChartSection('4. ENVIRONMENT DASHBOARD', ['envm-cpu-chart', 'envm-ram-chart', 'envm-network-chart', 'envm-resource-chart']);

        if (y > 250) { doc.addPage(); y = 20; }

        // Section 5: Data Performance Monitoring
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text('5. DATA PERFORMANCE MONITORING', 14, y);
        y += 4;

        let perfBody = entries.map((e, idx) => {
            let eqi = getDatasetQualityInfo(e);
            let err = parseFloat(getSeededRand(e.id+22, 0.1, 1.5).toFixed(2));
            let stat = err > 0.8 ? 'Perlu Perhatian' : 'Sehat';
            return [
                e.date || dateStr,
                e.name,
                eqi.finalScore.toFixed(1) + '%',
                Math.floor(getSeededRand(e.id+20, 100, 300)) + ' ms',
                parseFloat(getSeededRand(e.id+21, 60, 150).toFixed(1)) + ' req/s',
                err + '%',
                parseFloat(getSeededRand(e.id+23, 98.0, 99.9).toFixed(1)) + '%',
                stat
            ];
        });

        doc.autoTable({
            startY: y,
            head: [['Tanggal', 'Nama Dataset', 'Kualitas', 'Latency', 'Throughput', 'Error Rate', 'Uptime', 'Status']],
            body: perfBody,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            didParseCell: function(data) {
                if(data.column.index === 7 && data.cell.section === 'body') {
                    if (data.cell.raw === 'Perlu Perhatian') data.cell.styles.textColor = [220, 38, 38];
                    else data.cell.styles.textColor = [5, 150, 105];
                }
            }
        });

        y = doc.lastAutoTable.finalY + 10;
        if (y > 250) { doc.addPage(); y = 20; }

        // Section 6: Daftar Pipeline & Status
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text('6. DAFTAR PIPELINE & STATUS', 14, y);
        y += 4;

        let pipeBody = entries.map((e, idx) => {
            let eqi = getDatasetQualityInfo(e);
            let rating = eqi.finalScore >= 90 ? 'Excellent' : 'Good';
            return [
                idx+1,
                e.name,
                e.activity || 'in-progress',
                e.version || '1.0',
                e.date || dateStr,
                eqi.finalScore.toFixed(1) + '%',
                Math.floor(getSeededRand((e.id||0)+5, 10, 500)) + '.' + Math.floor(getSeededRand((e.id||0)+6, 0, 9)) + 'K',
                rating
            ];
        });

        doc.autoTable({
            startY: y,
            head: [['#', 'Nama Pipeline', 'Status', 'Versi', 'Tanggal', 'Accuracy', 'Records', 'Rating']],
            body: pipeBody,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            didParseCell: function(data) {
                if(data.column.index === 7 && data.cell.section === 'body') {
                    if (data.cell.raw === 'Excellent') data.cell.styles.textColor = [5, 150, 105];
                    else data.cell.styles.textColor = [217, 119, 6];
                }
            }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(`${dateStr}, ${timeStr}`, 14, 10);
            doc.text(`Laporan Komprehensif Data Quality & Platform`, W/2, 10, {align: 'center'});
            doc.text(`Halaman ${i}`, W-20, 10);
            doc.setDrawColor(226, 232, 240);
            doc.line(14, 12, W-14, 12);
        }

        // Save the PDF
        const fileName = 'Laporan_Komprehensif_' + String(mainE.name).replace(/\s+/g, '_') + '.pdf';
        doc.save(fileName);
        
        // Remove overlay
        document.body.removeChild(overlay);

    } catch (err) {
        if(document.body.contains(overlay)) document.body.removeChild(overlay);
        alert("Terjadi kesalahan sistem saat membuat laporan PDF: " + err.message);
        console.error("PDF Export Error:", err);
    }
};'''

replace_match = re.search(r'window\.dsoDownloadEntry\s*=\s*(async\s*)?function.*?// =============================================\s*// DATA ENTRY WIZARD', text, re.DOTALL)
if replace_match:
    text = text[:replace_match.start()] + new_func + '\n\n// =============================================\n// DATA ENTRY WIZARD' + text[replace_match.end():]
    with open('static/app_v3.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print("jsPDF logic written successfully!")
else:
    print("Could not find dsoDownloadEntry to replace.")
