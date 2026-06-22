import re

with open('static/app_v2.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_dso = """    window.dsoDownloadEntry = function(idx) {
        try {
            const entries = (typeof currentUser !== 'undefined' && currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
            let mainE = entries[idx] || entries[0] || {};
            if (!mainE) {
                alert("Data tidak ditemukan.");
                return;
            }

            if (typeof window.jspdf === 'undefined') {
                alert("Library PDF belum siap. Pastikan koneksi internet aktif lalu refresh halaman.");
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            
            const now = new Date();
            const dateStr = now.toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'});
            const timeStr = now.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'});

            let totalScore = 0;
            entries.forEach(e => totalScore += getDatasetQualityInfo(e).finalScore);
            let avgQuality = entries.length ? (totalScore / entries.length).toFixed(1) : 0;

            const W = 210; // A4 width
            let y = 15;

            // Header Section (White theme)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(30, 41, 59);
            doc.text('INSIGHT DATA QUALITY PLATFORM - LAPORAN KOMPREHENSIF', W/2, y, { align: 'center' });
            
            y += 8;
            doc.setFontSize(12);
            doc.setTextColor(71, 85, 105);
            doc.text('Laporan Data Quality & Pipeline | ' + dateStr, W/2, y, { align: 'center' });
            
            y += 15;
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.5);
            doc.line(14, y, W-14, y);
            
            y += 10;
            
            // Meta Information
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('Informasi Platform', 14, y);
            
            y += 6;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(51, 65, 85);
            
            let userEmail = (typeof currentUser !== 'undefined' && currentUser && currentUser.email) ? currentUser.email : 'admin@domain.com';
            let printBy = userEmail.split('@')[0];
            
            doc.text(`Dicetak Oleh: ${printBy}`, 14, y);
            doc.text(`Email: ${userEmail}`, 14, y+6);
            doc.text(`Total Data Sources: ${entries.length}`, 100, y);
            doc.text(`Avg. Quality Platform: ${avgQuality}%`, 100, y+6);
            
            y += 15;

            // Section 1: Visual Charts
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text('1. GRAFIK DASHBOARD VISUAL', 14, y);
            y += 8;

            const canvases = [
                { id: 'dqa-trend-chart', title: 'Data Quality Trend' },
                { id: 'pd-time-chart', title: 'Pipeline Time' },
                { id: 'envm-cpu-chart', title: 'CPU Usage' },
                { id: 'envm-ram-chart', title: 'RAM Usage' }
            ];

            let cx = 14;
            let imgW = 85;
            let imgH = 50;

            canvases.forEach((c) => {
                let el = document.getElementById(c.id);
                if(el) {
                    try {
                        let imgData = el.toDataURL('image/png');
                        if (cx + imgW > W) { cx = 14; y += imgH + 10; }
                        if (y + imgH > 280) { doc.addPage(); y = 20; cx = 14; }
                        
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(8);
                        doc.text(c.title, cx, y);
                        doc.addImage(imgData, 'PNG', cx, y + 3, imgW, imgH);
                        cx += imgW + 5;
                    } catch(e) { }
                }
            });

            // Adjust Y after images
            if(cx > 14) { y += imgH + 15; } else { y += 5; }

            // Check if we need new page for tables
            if (y > 220) { doc.addPage(); y = 20; }

            // Section 2: Data Performance Monitoring
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text('2. DATA PERFORMANCE MONITORING', 14, y);
            y += 5;

            // Performance Table using autoTable
            let perfBody = entries.map((e, idx) => {
                let qi = getDatasetQualityInfo(e);
                let stat = qi.finalScore < 80 ? 'Perlu Perhatian' : 'Sehat';
                return [
                    e.date || dateStr,
                    e.name,
                    qi.finalScore.toFixed(1) + '%',
                    Math.floor(getSeededRand(e.id+20, 100, 300)) + ' ms',
                    parseFloat(getSeededRand(e.id+22, 0.1, 1.5).toFixed(2)) + '%',
                    stat
                ];
            });

            doc.autoTable({
                startY: y,
                head: [['Tanggal', 'Nama Dataset', 'Kualitas', 'Latency', 'Error Rate', 'Status']],
                body: perfBody,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [250, 250, 250] }
            });

            y = doc.lastAutoTable.finalY + 15;
            if (y > 250) { doc.addPage(); y = 20; }

            // Section 3: Recommendations
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text('3. REKOMENDASI PLATFORM', 14, y);
            y += 5;
            
            let recs = [
                ['1', 'Tinjau aturan validasi data untuk meningkatkan akurasi lebih lanjut.'],
                ['2', 'Selidiki sumber ketidakkonsistenan dalam subset data yang bermasalah.'],
                ['3', 'Tingkatkan frekuensi monitoring menjadi mingguan untuk pipeline ini.']
            ];

            doc.autoTable({
                startY: y,
                head: [['No', 'Rekomendasi / Tindakan Lanjutan']],
                body: recs,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold' },
                columnStyles: { 0: { cellWidth: 15 } }
            });

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text(`Generated by Insight Platform | Halaman ${i} dari ${pageCount}`, W / 2, 290, { align: 'center' });
            }

            // Save the PDF
            const fileName = 'Laporan_Komprehensif_' + String(mainE.name).replace(/\s+/g, '_') + '.pdf';
            doc.save(fileName);

        } catch (err) {
            alert("Terjadi kesalahan sistem saat membuat laporan PDF: " + err.message);
            console.error("PDF Export Error:", err);
        }
    };"""

match = re.search(r'(window\.dsoDownloadEntry = function\(idx\).*?\}\n\s*\};\n)', content, re.DOTALL)
if match:
    content = content.replace(match.group(1), new_dso + '\n')
    with open('static/app_v2.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Replaced dsoDownloadEntry successfully!')
else:
    print('Could not find window.dsoDownloadEntry to replace.')
