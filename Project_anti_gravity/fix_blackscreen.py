import re

with open('static/app_v2.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_iframe = """            // 4. Create hidden iframe to print
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
            }, 800);"""

new_html2pdf = """            // 4. Use html2pdf for silent PDF generation (No popups, no print dialog, no blackscreen!)
            const container = document.createElement('div');
            container.innerHTML = htmlContent;
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '-9999px';
            container.style.width = '210mm'; // A4 width
            container.style.backgroundColor = '#ffffff';
            document.body.appendChild(container);

            const fileName = 'Laporan_Komprehensif_' + String(mainE.name || 'Platform').replace(/\\s+/g, '_') + '.pdf';

            // Configure html2pdf options
            const opt = {
                margin:       10,
                filename:     fileName,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Remove print button from html since it's going straight to PDF
            const printBtn = container.querySelector('.print-btn');
            if (printBtn) printBtn.style.display = 'none';

            // Generate the PDF
            window.html2pdf().set(opt).from(container).save().then(() => {
                document.body.removeChild(container);
            });"""

if old_iframe in content:
    content = content.replace(old_iframe, new_html2pdf)
    with open('static/app_v2.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Replaced iframe logic with html2pdf successfully!')
else:
    print('Could not find old iframe logic!')
