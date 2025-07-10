# export_cookies.py
import browser_cookie3

def export_chrome_cookies_to_txt(output_file='cookies.txt'):
    try:
        cj = browser_cookie3.chrome()
        with open(output_file, 'w', encoding='utf-8') as f:
            for cookie in cj:
                if not cookie.expires:
                    continue
                f.write(f"{cookie.domain}\tTRUE\t{cookie.path}\t{'TRUE' if cookie.secure else 'FALSE'}\t{int(cookie.expires)}\t{cookie.name}\t{cookie.value}\n")
        print("✅ تم استخراج الكوكيز بنجاح.")
    except Exception as e:
        print(f"❌ فشل استخراج الكوكيز: {e}")

if __name__ == "__main__":
    export_chrome_cookies_to_txt()
