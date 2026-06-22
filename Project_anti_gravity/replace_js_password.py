import re
import sys

try:
    with open('static/app_v3.js', 'r', encoding='utf-8') as f:
        content = f.read()

    replacement = """    if (formChangePassword) {
        formChangePassword.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPwd = document.getElementById('pwd-current').value;
            const newPwd = document.getElementById('pwd-new').value;
            const confirmPwd = document.getElementById('pwd-confirm').value;
            
            if (newPwd.length < 6) {
                alert("Password baru minimal 6 karakter!");
                return;
            }
            
            if (newPwd !== confirmPwd) {
                alert("Konfirmasi password baru tidak cocok!");
                return;
            }
            
            try {
                const btn = formChangePassword.querySelector('button[type="submit"]');
                const origText = btn.textContent;
                btn.textContent = 'Saving...';
                btn.disabled = true;

                const res = await fetch((window.API_BASE || '/api') + '/change-password/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ current_password: currentPwd, new_password: newPwd })
                });

                const data = await res.json();
                if (!res.ok) {
                    alert(data.error || "Gagal mengganti password");
                } else {
                    alert("Password berhasil diubah!");
                    modalChangePassword.style.display = 'none';
                    formChangePassword.reset();
                }

                btn.textContent = origText;
                btn.disabled = false;
            } catch (err) {
                alert("Terjadi kesalahan jaringan.");
            }
        });
    }"""

    # We match the empty listener
    pattern = r"    if \(formChangePassword\) \{\s*formChangePassword\.addEventListener\('submit', async \(e\) => \{\s*e\.preventDefault\(\);\s*\}\);\s*\}"
    new_content, count = re.subn(pattern, replacement, content)

    if count > 0:
        with open('static/app_v3.js', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Successfully replaced logic ({count} occurrence).")
    else:
        print("Error: Target pattern not found in app_v3.js.")
        sys.exit(1)

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
