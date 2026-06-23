Created At: 2026-06-14T12:34:56Z
Completed At: 2026-06-14T12:34:56Z
File Path: `file:///c:/Users/ASUS%20ROG/Project_anti_gravity/static/app.js`
Total Lines: 6005
Total Bytes: 300344
Showing lines 2560 to 2650
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
2560: 
2561:         const html = `<!DOCTYPE html>
2562: <html lang="id">
2563: <head>
2564: <meta charset="UTF-8">
2565: <title>Laporan Komprehensif - ${pipelineName} | insight Platform</title>
2566: <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
2567: <style>
2568:   *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
2569:   body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#1a1a1a;background:#fff;padding:18px 28px}
2570: 
2571:   /* Print header */
2572:   .print-header{display:flex;justify-content:space-between;font-size:8pt;color:#555;padding-bottom:5px;border-bottom:1px solid #aaa;margin-bottom:14px}
2573: 
2574:   /* Title */
2575:   .title-block{text-align:center;margin-bottom:18px}
2576:   .title-platform{font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;color:#333}
2577:   .title-main{font-size:22pt;font-weight:bold;color:#111;line-height:1.1;margin:4px 0}
2578:   .title-sub{font-size:12pt;font-weight:bold;color:#333}
2579: 
2580:   /* Info box */
2581:   .info-box{border:1px solid #b0b8c4;border-radius:4px;padding:10px 16px;margin-bottom:16px;font-size:10pt;line-height:1.9;background:#f9fbfd}
2582:   .info-box strong{font-weight:bold}
2583: 
2584:   /* KPI cards row */
2585:   .kpi-row{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:18px}
2586:   .kpi-card{border:1px solid #b0b8c4;border-radius:5px;padding:10px 8px;text-align:center;background:#f9fbfd}
2587:   .kpi-val{font-size:16pt;font-weight:bold;color:#1a6faf
<truncated 1253 bytes>
b0b8c4;border-radius:4px;padding:12px 14px;margin-bottom:14px;background:#fff;page-break-inside:avoid}
2611:   .chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
2612:   .chart-box-title{font-size:10pt;font-weight:bold;color:#333;margin-bottom:8px}
2613: 
2614:   /* Alert badges */
2615:   .badge-ok{color:#1a8a4a;font-weight:bold}
2616:   .badge-warn{color:#b85c00;font-weight:bold}
2617:   .badge-bad{color:#c0392b;font-weight:bold}
2618: 
2619:   /* Summary box */
2620:   .summary-box{background:#f0f5ff;border:1px solid #b0c8f0;border-radius:5px;padding:12px 16px;margin-bottom:16px;font-size:10pt;line-height:1.7}
2621: 
2622:   /* Print button */
2623:   .print-btn{position:fixed;top:14px;right:14px;background:#1a6faf;color:#fff;border:none;padding:9px 20px;border-radius:6px;cursor:pointer;font-size:11pt;font-weight:bold;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,.25)}
2624:   .print-btn:hover{background:#145a8f}
2625: 
2626:   .page-break{page-break-before:always}
2627: 
2628:   @media print{
2629:     .print-btn{display:none!important}
2630:     @page{margin:1.2cm 1.4cm;size:A4 portrait}
2631:     .no-break{page-break-inside:avoid}
2632:     .chart-box{page-break-inside:avoid}
2633:     .chart-grid{page-break-inside:avoid}
2634:     body{padding:0;font-size:9.5pt}
2635:     .kpi-row{grid-template-columns:repeat(5,1fr)}
2636:   }
2637: </style>
2638: </head>
2639: <body>
2640: <button class="print-btn" onclick="window.print()">🖨 Cetak / Simpan PDF</button>
2641: 
2642: <!-- — Header — -->
2643: <div class="print-header">
2644:   <span>${now}</span>
2645:   <span>Laporan Komprehensif Data Quality – insight Platform</span>
2646:   <span>Dataset: ${pipelineName}</span>
2647: </div>
2648: 
2649: <!-- — Title — -->
2650: <div class="title-block">
The above content does NOT show the entire file contents. If you need to view any lines of the file which were not shown to complete your task, call this tool again to view those lines.
