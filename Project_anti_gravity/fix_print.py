import re

with open('static/app_v3.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the html string wrapper
old_html_start = '<div id="pdf-container" style="width: 800px; font-family: Arial, sans-serif; font-size: 8pt; color: #111; background: #fff; padding: 20px;">'
new_html_start = '<div id="pdf-container" style="width: 100%; max-width: 800px; margin: 0 auto; font-family: Arial, sans-serif; font-size: 8pt; color: #111; background: #fff; padding: 20px;">'
text = text.replace(old_html_start, new_html_start)

# Replace the PDF call
old_pdf_call = '''        const opt = {
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
            if(document.body.contains(hiddenWrapper)) document.body.removeChild(hiddenWrapper);
            if(document.body.contains(overlay)) document.body.removeChild(overlay);
            alert("Error: " + err.message);
        });'''

new_pdf_call = '''        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const docObj = iframe.contentWindow.document;
        docObj.open();
        const printHtml = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Laporan Komprehensif - ${mainE.name || 'Platform'} | insight Platform</title>
<style>
  @media print {
    @page { margin: 1.0cm; size: A4 portrait; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
  }
</style>
</head>
<body>
${htmlContent}
</body>
</html>`;
        docObj.write(printHtml);
        docObj.close();

        setTimeout(() => {
            if(document.body.contains(hiddenWrapper)) document.body.removeChild(hiddenWrapper);
            if(document.body.contains(overlay)) document.body.removeChild(overlay);
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => {
                if(document.body.contains(iframe)) document.body.removeChild(iframe);
            }, 3000);
        }, 500);'''

text = text.replace(old_pdf_call, new_pdf_call)

with open('static/app_v3.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Replaced html2pdf with native iframe print successfully!')
