import re

with open('static/app_v3.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_logic = '''        // 4. Use html2pdf for silent PDF generation
        const fileName = 'Laporan_Komprehensif_' + String(mainE.name || 'Platform').replace(/\s+/g, '_') + '.pdf';

        const opt = {
            margin:       10,
            filename:     fileName,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true, windowWidth: 800 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Pass htmlContent string directly. html2pdf will safely render it in an isolated iframe internally!
        window.html2pdf().set(opt).from(htmlContent).save();'''

new_logic = '''        // 4. Use html2pdf for silent PDF generation
        // TAMPILKAN OVERLAY LOADING AGAR USER TIDAK BINGUNG DAN LAYOUT HTML2CANVAS SEMPURNA
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
        overlay.innerHTML = '<div style="width:50px;height:50px;border:5px solid #3b82f6;border-top:5px solid transparent;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:20px"></div><h2>Memproses Laporan PDF...</h2><p style="color:#94a3b8">Harap tunggu sebentar, sedang merangkum grafik dan data.</p><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>';
        document.body.appendChild(overlay);

        const container = document.createElement('div');
        container.innerHTML = htmlContent;
        // Kita letakkan tepat di top-left agar html2canvas merekam ukurannya dengan BENAR
        // Dan kita tutupi dengan overlay agar user tidak melihatnya!
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '210mm'; 
        container.style.backgroundColor = '#ffffff';
        container.style.zIndex = '999998'; // Di bawah overlay
        document.body.appendChild(container);

        const fileName = 'Laporan_Komprehensif_' + String(mainE.name || 'Platform').replace(/\s+/g, '_') + '.pdf';

        const opt = {
            margin:       10,
            filename:     fileName,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true, windowWidth: 800 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        window.html2pdf().set(opt).from(container).save().then(() => {
            document.body.removeChild(container);
            document.body.removeChild(overlay);
        }).catch(err => {
            document.body.removeChild(container);
            document.body.removeChild(overlay);
            alert("Terjadi kesalahan saat memproses PDF: " + err.message);
        });'''

if old_logic in text:
    text = text.replace(old_logic, new_logic)
    with open('static/app_v3.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Overlay fix applied successfully!")
else:
    print("Could not find old logic string! Let's try Regex.")
    match = re.search(r'// 4\. Use html2pdf.*?window\.html2pdf\(\)\.set\(opt\)\.from\(htmlContent\)\.save\(\);', text, re.DOTALL)
    if match:
        text = text.replace(match.group(0), new_logic)
        with open('static/app_v3.js', 'w', encoding='utf-8') as f:
            f.write(text)
        print("Overlay fix applied via regex!")
    else:
        print("Regex failed too!")
