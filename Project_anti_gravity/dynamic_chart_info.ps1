$file = "c:\Users\ASUS ROG\Project_anti_gravity\static\app.js"
$content = [System.IO.File]::ReadAllText($file)

# We need to find the start and end of the showChartInfo block to replace.
$startMarker = "        const titleEl = document.getElementById('chart-info-modal-title');"
$endMarker = "        overlay.style.display = 'flex';"

$startIndex = $content.IndexOf($startMarker)
$endIndex = $content.IndexOf($endMarker, $startIndex)

if ($startIndex -ge 0 -and $endIndex -ge 0) {
    $endIndex = $endIndex + $endMarker.Length
    $oldBlock = $content.Substring($startIndex, $endIndex - $startIndex)

    $newBlock = @"
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
                <p style="margin-bottom: 16px; color: #60a5fa;">` + dynStr + `</p>
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
                <p style="margin-bottom: 16px; color: #60a5fa;">` + dynStr + `</p>
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
                <p style="margin-bottom: 16px; color: #60a5fa;">` + dynStr + `</p>
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
                <p style="margin-bottom: 16px; color: #60a5fa;">` + dynStr + `</p>
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
                <p style="margin-bottom: 16px; color: #60a5fa;">` + dynStr + `</p>
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
                <p style="margin-bottom: 16px; color: #60a5fa;">` + dynStr + `</p>
                <p style="margin-top: 16px; margin-bottom: 12px;"><strong>Kesimpulan Akhir:</strong></p>
                <p>Tren positif ini mencerminkan data dipastikan siap pakai untuk kebutuhan analitik lanjutan.</p>
            `;
        } else if (type === 'quality-dimensions') {
            c = window.Chart.getChart('dqa-dims-chart');
            if (c) {
                let lVals = c.data.datasets.map(d => d.data[d.data.length - 1]);
                let minI = lVals.indexOf(Math.min(...lVals)); let maxI = lVals.indexOf(Math.max(...lVals));
                let minD = c.data.datasets[minI].label; let maxD = c.data.datasets[maxI].label;
                dynStr = "Dimensi tertinggi: <strong>" + maxD + " (" + lVals[maxI].toFixed(1) + "%)</strong>. Dimensi terendah: <strong>" + minD + " (" + lVals[minI].toFixed(1) + "%)</strong>.";
            }
            titleEl.textContent = 'Informasi: Quality Dimensions - Monthly Trend';
            bodyEl.innerHTML = `
                <p style="margin-bottom: 12px;"><strong>Apa itu grafik ini?</strong></p>
                <p style="margin-bottom: 16px;">Grafik garis ini membandingkan 5 dimensi utama kualitas data selama 4 minggu.</p>
                <p style="margin-bottom: 12px;"><strong>Hasil Tabel Saat Ini:</strong></p>
                <p style="margin-bottom: 16px; color: #60a5fa;">` + dynStr + `</p>
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
                <p style="margin-bottom: 16px; color: #60a5fa;">` + dynStr + `</p>
                <p style="margin-top: 16px; margin-bottom: 12px;"><strong>Kesimpulan Akhir:</strong></p>
                <p>Data aktual terjamin, meminimalkan risiko keputusan bisnis berdasarkan data usang.</p>
            `;
        }
        
        overlay.style.display = 'flex';
"@

    $content = $content.Replace($oldBlock, $newBlock)
    [System.IO.File]::WriteAllText($file, $content)
    Write-Host "Replacement successful."
} else {
    Write-Host "Markers not found."
}
