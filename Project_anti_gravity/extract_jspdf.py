import re

with open('jspdf_snippet.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Try to find the patch that introduced jsPDF or the snippet containing it
# In snippet 1, we have a unified diff that shows the original code.
lines = text.split('\n')
extracted = []
capturing = False
for line in lines:
    if 'window.dsoDownloadEntry = function(idx)' in line:
        capturing = True
        # remove the + or - prefix if any
        if line.startswith('+') or line.startswith('-'):
            line = line[1:]
        elif line.startswith(' '):
            line = line[1:]
        extracted.append(line)
        continue
    
    if capturing:
        if line.startswith('+'):
            extracted.append(line[1:])
        elif line.startswith(' '):
            extracted.append(line[1:])
        elif line.startswith('-'):
            pass # ignore removed lines
        else:
            # might be diff metadata, stop if we reach diff_block_end
            if '[diff_block_end]' in line:
                break

with open('static/original_dso.js', 'w', encoding='utf-8') as outf:
    outf.write('\n'.join(extracted).replace('\\r\\n', '\n').replace('\\n', '\n').replace('\\"', '"').replace('\\\'', "'"))
print('Done extracting diff to static/original_dso.js')
