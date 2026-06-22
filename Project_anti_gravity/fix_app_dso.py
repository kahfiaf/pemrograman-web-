import re
with open('static/app_v2.js', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'(window\.dsoDownloadEntry = function\(idx\) \{.*?w\.document\.write\(htmlContent\);\n)(.*?\}\s*;)', content, re.DOTALL)
if match:
    new_end = '\n  } catch (err) {\n    alert("Terjadi kesalahan saat memproses laporan: " + err.message);\n    console.error(err);\n  }\n' + match.group(2)
    content = content.replace(match.group(0), match.group(1) + new_end)
    with open('static/app_v2.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Added catch block successfully')
else:
    print('Function end not found')
