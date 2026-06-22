import sys
import re

try:
    with open('static/app_v3.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Password changed
    pwd_target = 'window.showCustomAlert("Success", "Password berhasil diubah!", true);'
    pwd_replacement = 'window.showCustomAlert("Success", "Password berhasil diubah!", true);\n                    if(window.addNotification) window.addNotification("Security Alert", "Your account password was recently changed.", "warning");'
    content = content.replace(pwd_target, pwd_replacement)

    # 2. Email Prefs
    email_target = 'window.showCustomAlert("Success", "Email Preferences disimpan!", true);'
    email_replacement = 'window.showCustomAlert("Success", "Email Preferences disimpan!", true);\n            if(window.addNotification) window.addNotification("Settings Updated", "Your email preferences have been saved successfully.", "success");'
    content = content.replace(email_target, email_replacement)

    # 3. Privacy Settings
    privacy_target = 'window.showCustomAlert("Success", "Privacy Settings disimpan!", true);'
    privacy_replacement = 'window.showCustomAlert("Success", "Privacy Settings disimpan!", true);\n            if(window.addNotification) window.addNotification("Settings Updated", "Your privacy settings were updated.", "success");'
    content = content.replace(privacy_target, privacy_replacement)

    # 4. Profile Edit
    # find where currentUser.username = newName is happening and saveCurrentUserToStorage() is called.
    # At line 1076: localStorage.setItem('insight_session_v2', JSON.stringify(currentUser));
    profile_target = "localStorage.setItem('insight_session_v2', JSON.stringify(currentUser));"
    # To be safe, we only replace the FIRST occurrence in the profile section, or do regex
    
    # 5. Data Upload (Add Entry)
    add_target = "saveCurrentUserToStorage();\n        renderDataEntryDashboard();"
    add_replacement = """saveCurrentUserToStorage();
        if(window.addNotification) window.addNotification("Data Uploaded", "A new dataset was manually uploaded: " + name, "success");
        renderDataEntryDashboard();"""
    content = content.replace(add_target, add_replacement)

    # 6. Data Delete (Delete Entry)
    delete_target = "targetEntries.splice(idx, 1);\n            saveCurrentUserToStorage();"
    delete_replacement = """const deletedName = targetEntries[idx].name;
            targetEntries.splice(idx, 1);
            saveCurrentUserToStorage();
            if(window.addNotification) window.addNotification("Data Deleted", "Dataset " + deletedName + " was deleted.", "info");"""
    content = content.replace(delete_target, delete_replacement)

    # 7. Download
    # search for document.body.appendChild(a); a.click();
    dl_target = "a.click();\n        a.remove();\n    };"
    dl_replacement = """a.click();
        a.remove();
        if(window.addNotification) window.addNotification("Data Exported", "You downloaded a dataset.", "info");
    };"""
    content = content.replace(dl_target, dl_replacement)

    # 8. Receive Data from API (Simulated IC data)
    ic_target = "alert(`File '${filename}' (${(blob.size/1024/1024).toFixed(1)}MB) was successfully sent to the IC team via API!`);"
    ic_replacement = "alert(`File '${filename}' (${(blob.size/1024/1024).toFixed(1)}MB) was successfully sent to the IC team via API!`);\n                    if(window.addNotification) window.addNotification(\"API Transfer\", \"Data successfully sent to Intelligence Creation via API.\", \"success\");"
    content = content.replace(ic_target, ic_replacement)

    with open('static/app_v3.js', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Injected notification triggers successfully.")

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
