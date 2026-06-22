content = open(r'c:\Users\ASUS ROG\Project_anti_gravity\static\app.js', encoding='utf-8').read()

# Check blob line specifically
idx = content.find("text/csv;charset=utf-8")
snippet = content[idx-50 : idx+150]
print("=== Blob line ===")
print(repr(snippet))

# Also check if there's a carriage return embedded in string
blob_idx = content.find("new Blob")
blob_snippet = content[blob_idx:blob_idx+200]
print("\n=== new Blob ===")
print(repr(blob_snippet))
