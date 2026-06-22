import re

with open('debug_dso.txt', 'r', encoding='utf-8') as f:
    text = f.read()

match = re.search(r'if \(typeof window\.jspdf === \'undefined\'\).*?doc\.save\(fileName\);', text, re.DOTALL)
if match:
    jspdf_code = match.group(0)
    
    # We need to construct the full function
    full_function = '''window.dsoDownloadEntry = async function(idx) {
    try {
        const entries = (typeof currentUser !== 'undefined' && currentUser && currentUser.dataEntries) ? currentUser.dataEntries : [];
        let mainE = entries[idx] || entries[0] || {};
        if (!mainE) {
            alert("Data tidak ditemukan.");
            return;
        }

''' + jspdf_code + '''

    } catch (err) {
        alert("Terjadi kesalahan sistem saat membuat laporan PDF: " + err.message);
        console.error("PDF Export Error:", err);
    }
};'''

    with open('static/app_v3.js', 'r', encoding='utf-8') as f:
        app_text = f.read()
    
    replace_match = re.search(r'window\.dsoDownloadEntry\s*=\s*(async\s*)?function.*?// =============================================\s*// DATA ENTRY WIZARD', app_text, re.DOTALL)
    if replace_match:
        app_text = app_text[:replace_match.start()] + full_function + '\n\n// =============================================\n// DATA ENTRY WIZARD' + app_text[replace_match.end():]
        with open('static/app_v3.js', 'w', encoding='utf-8') as f:
            f.write(app_text)
        print("jsPDF logic restored successfully!")
    else:
        print("Failed to match app_v3.js")
else:
    print("Failed to find jsPDF code in debug_dso.txt")
