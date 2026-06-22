import re

with open('static/app_v3.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_html_start = '<div id="pdf-container" style="width: 800px; max-width: 800px; margin: 0 auto; font-family: Arial, sans-serif; font-size: 8pt; color: #111; background: #fff; padding: 20px;">'
new_html_start = '<div style="font-family: Arial, sans-serif; font-size: 8pt; color: #111; background: #fff;">'
text = text.replace(old_html_start, new_html_start)

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
            document.body.removeChild(hiddenWrapper);
            document.body.removeChild(overlay);
            alert("Error: " + err.message);
        });'''

new_pdf_call = '''        const pdfNode = document.createElement('div');
        pdfNode.style.width = '800px';
        pdfNode.style.padding = '20px';
        pdfNode.style.backgroundColor = '#ffffff';
        pdfNode.innerHTML = htmlContent;
        
        // Temporarily add to DOM so html2canvas renders perfectly
        pdfNode.style.position = 'fixed';
        pdfNode.style.top = '0';
        pdfNode.style.left = '0';
        pdfNode.style.zIndex = '999998'; // Behind overlay
        document.body.appendChild(pdfNode);

        const opt = {
            margin:       10,
            filename:     'Laporan_Komprehensif_' + String(mainE.name).replace(/\s+/g, '_') + '.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        window.html2pdf().set(opt).from(pdfNode).save().then(() => {
            document.body.removeChild(pdfNode);
            document.body.removeChild(hiddenWrapper);
            document.body.removeChild(overlay);
        }).catch(err => {
            if(document.body.contains(pdfNode)) document.body.removeChild(pdfNode);
            if(document.body.contains(hiddenWrapper)) document.body.removeChild(hiddenWrapper);
            if(document.body.contains(overlay)) document.body.removeChild(overlay);
            alert("Error: " + err.message);
        });'''

text = text.replace(old_pdf_call, new_pdf_call)

with open('static/app_v3.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated html2pdf logic to use a real DOM node!')
