import re

file_path = r"c:\Users\ASUS ROG\Project_anti_gravity\static\app.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. getDatasetQualityInfo
old1 = """        const completeness  = Math.min(100, Math.round(finalScore + seededRand(seed * 2, -2, 2)));
        const accuracy      = Math.min(100, Math.round(finalScore + seededRand(seed * 5, -3, 3)));
        const validity      = Math.min(100, Math.round(finalScore + seededRand(seed * 8, -4, 4)));
        const consistency   = Math.min(100, Math.round(finalScore + seededRand(seed * 3, -3, 3)));
        const timeliness    = Math.min(100, Math.round(finalScore + seededRand(seed * 6, -5, 5)));
        
        const average = Math.round((completeness + accuracy + validity + consistency + timeliness) / 5);"""

new1 = """        const completeness  = Math.min(100, Math.round(finalScore + seededRand(seed * 2, -2, 2)));
        const accuracy      = finalScore;
        const validity      = Math.min(100, Math.round(finalScore + seededRand(seed * 8, -4, 4)));
        const consistency   = Math.min(100, Math.round(finalScore + seededRand(seed * 3, -3, 3)));
        const timeliness    = Math.min(100, Math.round(finalScore + seededRand(seed * 6, -5, 5)));
        
        const average = finalScore;"""
content = content.replace(old1, new1)

# 2. Duplicate generation with toFixed(1)
content = re.sub(
    r'const accuracy\s*=\s*Math\.min\(100,\s*finalScore\s*\+\s*seededRand\(seed\s*\*\s*5\s*,\s*-3\s*,\s*3\)\)\.toFixed\(1\);',
    r'const accuracy      = finalScore.toFixed(1);',
    content
)

# 3. Model Transaction generation
content = re.sub(
    r'let accuracyVal = parseFloat\(getSeededRand\(seed, 80, 99\)\.toFixed\(1\)\);',
    r'let accuracyVal = entry && entry.qualityScore ? parseFloat(Number(entry.qualityScore).toFixed(1)) : parseFloat(getSeededRand(seed, 80, 99).toFixed(1));',
    content
)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Unified accuracy successfully.")
