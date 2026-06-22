import re

with open('static/app_v2.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace global CSS selectors with scoped ones
text = text.replace('body{font-family', '#pdf-report-container{font-family')
text = text.replace('*,*::before,*::after{box-sizing', '#pdf-report-container *{box-sizing')
text = text.replace('.print-header{', '#pdf-report-container .print-header{')
text = text.replace('.title-block{', '#pdf-report-container .title-block{')
text = text.replace('.title-platform{', '#pdf-report-container .title-platform{')
text = text.replace('.title-main{', '#pdf-report-container .title-main{')
text = text.replace('.title-sub{', '#pdf-report-container .title-sub{')
text = text.replace('.info-box{', '#pdf-report-container .info-box{')
text = text.replace('.info-box div{', '#pdf-report-container .info-box div{')
text = text.replace('.info-box strong{', '#pdf-report-container .info-box strong{')
text = text.replace('.kpi-row{', '#pdf-report-container .kpi-row{')
text = text.replace('.kpi-card{', '#pdf-report-container .kpi-card{')
text = text.replace('.kpi-val{', '#pdf-report-container .kpi-val{')
text = text.replace('.kpi-lbl{', '#pdf-report-container .kpi-lbl{')
text = text.replace('.section-title{', '#pdf-report-container .section-title{')
text = text.replace('table{', '#pdf-report-container table{')
text = text.replace('th,td{', '#pdf-report-container th, #pdf-report-container td{')
text = text.replace('th{', '#pdf-report-container th{')
text = text.replace('.chart-grid{', '#pdf-report-container .chart-grid{')
text = text.replace('.chart-box{', '#pdf-report-container .chart-box{')
text = text.replace('.chart-box-title{', '#pdf-report-container .chart-box-title{')
text = text.replace('.chart-box img{', '#pdf-report-container .chart-box img{')
text = text.replace('.page-break{', '#pdf-report-container .page-break{')
text = text.replace('.no-break{', '#pdf-report-container .no-break{')

# Add the container div
text = text.replace('<body>\\n<div class="print-header">', '<body>\\n<div id="pdf-report-container">\\n<div class="print-header">')
text = text.replace('</div>\\n</body>', '</div>\\n</div>\\n</body>')

with open('static/app_v2.js', 'w', encoding='utf-8') as f:
    f.write(text)
print('Scoped CSS!')
