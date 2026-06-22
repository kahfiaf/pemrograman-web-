import re

with open('templates/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('<div class="logo">', '<div class="logo" onclick="if(window.handleLogoClick) window.handleLogoClick()" style="cursor: pointer;">')

with open('templates/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
