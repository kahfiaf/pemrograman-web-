    async function tryParsePdfEntry(ent) {
        return new Promise(async (resolve) => {
            const requestedFields = [
                'nama barang', 'Harga Barang', 'waktu order barang', 'perkiraan waktu tiba',
                'Negara asal produk', 'Alamat Konsumen', 'Berat barang', 'Tingkat Kelangkaan barang',
                'Biaya Pajak Bea Cukai', 'Ongkos Kirim Domestik', 'Biaya Asuransi', 'Total harga'
            ];

            const finalFunctions = {};
            requestedFields.forEach(f => finalFunctions[f] = '-');
            let foundAny = false;

            const parseItemsArray = (arr) => {
                const fullText = arr.join(' ');
                
                for (const field of requestedFields) {
                    let fieldRegexPattern = field.replace(/\s+/g, '\\s*');
                    let splitParts = fullText.split(new RegExp(fieldRegexPattern, 'i'));
                    
                    if (splitParts.length === 1 && field.includes(' ')) {
                        const firstWord = field.split(' ')[0];
                        splitParts = fullText.split(new RegExp('\\b' + firstWord + '\\b', 'i'));
                    }
                    
                    if (splitParts.length > 1) {
                        let bestVal = '';
                        let shortestLen = Infinity;
                        
                        for (let i = 1; i < splitParts.length; i++) {
                            if (splitParts[i].trim()) {
                                let val = splitParts[i].replace(/^[\s:=>|\-]+/, '').trim();
                                
                                if (val) {
                                    let earliestIdx = val.length;
                                
                                    for (const otherField of requestedFields) {
                                        if (otherField.toLowerCase() !== field.toLowerCase()) {
                                            const otherFieldRegex = otherField.replace(/\s+/g, '\\s*');
                                            const firstWord = otherField.split(' ')[0];
                                            
                                            let otherMatch = val.match(new RegExp(otherFieldRegex, 'i'));
                                            if (!otherMatch && otherField.includes(' ')) {
                                                otherMatch = val.match(new RegExp('\\b' + firstWord + '\\b', 'i'));
                                            }
                                            
                                            if (otherMatch && otherMatch.index >= 0 && otherMatch.index < earliestIdx) {
                                                earliestIdx = otherMatch.index;
                                            }
                                        }
                                    }
                                
                                    const truncatedVal = val.substring(0, earliestIdx).replace(/[\s:=>|\-]+$/, '').trim();
                                    
                                    if (truncatedVal.length > 0 && truncatedVal.length < shortestLen) {
                                        shortestLen = truncatedVal.length;
                                        bestVal = truncatedVal;
                                    }
                                }
                            }
                        }
                        
                        if (bestVal && !requestedFields.some(f => f.toLowerCase() === bestVal.toLowerCase())) {
                            finalFunctions[field] = bestVal;
                            foundAny = true;
                        }
                    }
                }
            };

            let rawItems = [];
            
            try {
                const loadingTask = pdfjsLib.getDocument(ent.fileDataUrl);
                const pdfDoc = await loadingTask.promise;

                for (let p = 1; p <= pdfDoc.numPages; p++) {
                    const page = await pdfDoc.getPage(p);
                    const textContent = await page.getTextContent();
                    
                    if (textContent.items && textContent.items.length > 0) {
                        const rows = {};
                        textContent.items.forEach(item => {
                            const str = item.str.trim();
                            if (!str) return;
                            const y = item.transform[5];
                            const x = item.transform[4];
                            const roundedY = Math.round(y / 5) * 5;
                            if (!rows[roundedY]) rows[roundedY] = [];
                            rows[roundedY].push({ str: str, x: x });
                        });
                        
                        const sortedY = Object.keys(rows).map(Number).sort((a, b) => b - a);
                        sortedY.forEach(y => {
                            const rowItems = rows[y].sort((a, b) => a.x - b.x);
                            const lineText = rowItems.map(ri => ri.str).join(' ').trim();
                            if (lineText) rawItems.push(lineText);
                        });
                    }
                }

                if (rawItems.length > 0) {
                    parseItemsArray(rawItems);
                }

                if (!foundAny && typeof Tesseract !== 'undefined') {
                    console.warn("No text found in PDF. Attempting OCR...");
                    const inputCountLabel = document.getElementById('mt-modal-input-count');
                    if (inputCountLabel) inputCountLabel.textContent = 'Input Features (Memproses Gambar/Scan OCR...)';
                    
                    const worker = await Tesseract.createWorker('ind');
                    let ocrWords = [];
                    
                    const pagesToScan = pdfDoc.numPages;
                    for (let p = 1; p <= pagesToScan; p++) {
                        const page = await pdfDoc.getPage(p);
                        const viewport = page.getViewport({ scale: 2.0 });
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                        const imgData = canvas.toDataURL('image/png');

                        const ret = await worker.recognize(imgData);
                        
                        if (ret.data && ret.data.words) {
                            const rows = {};
                            ret.data.words.forEach(w => {
                                const str = w.text.trim();
                                if (!str) return;
                                const y = w.bbox.y0;
                                const x = w.bbox.x0;
                                const roundedY = Math.round(y / 10) * 10;
                                if (!rows[roundedY]) rows[roundedY] = [];
                                rows[roundedY].push({ str: str, x: x });
                            });
                            
                            const sortedY = Object.keys(rows).map(Number).sort((a, b) => a - b);
                            sortedY.forEach(y => {
                                const rowItems = rows[y].sort((a, b) => a.x - b.x);
                                const lineText = rowItems.map(ri => ri.str).join(' ');
                                ocrWords.push(lineText);
                            });
                        }
                    }
                    
                    await worker.terminate();

                    if (ocrWords.length > 0) {
                        parseItemsArray(ocrWords);
                    }
                }

                if (!foundAny && rawItems.length > 0) {
                    finalFunctions['Info Teks 1'] = 'Nama File: "' + (ent ? ent.name : 'Unknown') + '"';
                    finalFunctions['Info Teks 2'] = 'Cuplikan isi: ' + rawItems.join(' ').substring(0, 150) + '...';
                } else if (!foundAny) {
                    finalFunctions['Info Teks 1'] = 'Nama File: "' + (ent ? ent.name : 'Unknown') + '"';
                    finalFunctions['Info Teks 2'] = 'File kosong atau tidak terbaca.';
                }

            } catch(e) {
                console.error("PDF parsing error:", e);
                finalFunctions['Error'] = 'Gagal membaca PDF.';
            }

            resolve(finalFunctions);
        });
    }

    async function tryParseImageEntry(ent) {
        return new Promise(async (resolve) => {
            const requestedFields = [
                'nama barang', 'Harga Barang', 'waktu order barang', 'perkiraan waktu tiba',
                'Negara asal produk', 'Alamat Konsumen', 'Berat barang', 'Tingkat Kelangkaan barang',
                'Biaya Pajak Bea Cukai', 'Ongkos Kirim Domestik', 'Biaya Asuransi', 'Total harga'
            ];
            
            const finalFunctions = {};
            requestedFields.forEach(f => finalFunctions[f] = '-');
            let foundAny = false;

            try {
                if (typeof Tesseract === 'undefined') {
                    finalFunctions['Error'] = 'Tesseract OCR tidak dimuat.';
                    return resolve(finalFunctions);
                }

                const worker = await Tesseract.createWorker('ind');
                const ret = await worker.recognize(ent.fileDataUrl);
                
                let ocrWords = [];
                if (ret.data && ret.data.words) {
                    const rows = {};
                    ret.data.words.forEach(w => {
                        const str = w.text.trim();
                        if (!str) return;
                        const y = w.bbox.y0;
                        const x = w.bbox.x0;
                        const roundedY = Math.round(y / 10) * 10;
                        if (!rows[roundedY]) rows[roundedY] = [];
                        rows[roundedY].push({ str: str, x: x });
                    });
                    
                    const sortedY = Object.keys(rows).map(Number).sort((a, b) => a - b);
                    sortedY.forEach(y => {
                        const rowItems = rows[y].sort((a, b) => a.x - b.x);
                        const lineText = rowItems.map(ri => ri.str).join(' ');
                        ocrWords.push(lineText);
                    });
                }
                await worker.terminate();

                const parseItemsArray = (arr) => {
                    const fullText = arr.join(' ');
                    for (const field of requestedFields) {
                        let fieldRegexPattern = field.replace(/\s+/g, '\\s*');
                        let splitParts = fullText.split(new RegExp(fieldRegexPattern, 'i'));
                        
                        if (splitParts.length === 1 && field.includes(' ')) {
                            const firstWord = field.split(' ')[0];
                            splitParts = fullText.split(new RegExp('\\b' + firstWord + '\\b', 'i'));
                        }
                        
                        if (splitParts.length > 1) {
                            let bestVal = '';
                            let shortestLen = Infinity;
                            
                            for (let i = 1; i < splitParts.length; i++) {
                                if (splitParts[i].trim()) {
                                    let val = splitParts[i].replace(/^[\s:=>|\-]+/, '').trim();
                                    
                                    if (val) {
                                        let earliestIdx = val.length;
                                    
                                        for (const otherField of requestedFields) {
                                            if (otherField.toLowerCase() !== field.toLowerCase()) {
                                                const otherFieldRegex = otherField.replace(/\s+/g, '\\s*');
                                                const firstWord = otherField.split(' ')[0];
                                                
                                                let otherMatch = val.match(new RegExp(otherFieldRegex, 'i'));
                                                if (!otherMatch && otherField.includes(' ')) {
                                                    otherMatch = val.match(new RegExp('\\b' + firstWord + '\\b', 'i'));
                                                }
                                                
                                                if (otherMatch && otherMatch.index >= 0 && otherMatch.index < earliestIdx) {
                                                    earliestIdx = otherMatch.index;
                                                }
                                            }
                                        }
                                    
                                        const truncatedVal = val.substring(0, earliestIdx).replace(/[\s:=>|\-]+$/, '').trim();
                                        
                                        if (truncatedVal.length > 0 && truncatedVal.length < shortestLen) {
                                            shortestLen = truncatedVal.length;
                                            bestVal = truncatedVal;
                                        }
                                    }
                                }
                            }
                            
                            if (bestVal && !requestedFields.some(f => f.toLowerCase() === bestVal.toLowerCase())) {
                                finalFunctions[field] = bestVal;
                                foundAny = true;
                            }
                        }
                    }
                };

                if (ocrWords.length > 0) {
                    parseItemsArray(ocrWords);
                }

                if (!foundAny && ocrWords.length > 0) {
                    finalFunctions['Info Teks 1'] = 'Nama File: "' + (ent ? ent.name : 'Unknown') + '"';
                    finalFunctions['Info Teks 2'] = 'Cuplikan isi: ' + ocrWords.join(' ').substring(0, 150) + '...';
                }

            } catch(e) {
                console.error("Image parsing error:", e);
                finalFunctions['Error'] = 'Gagal memproses gambar.';
            }

            resolve(finalFunctions);
        });
    }
