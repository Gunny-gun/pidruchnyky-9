#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import ssl
import json
import urllib.request
from pathlib import Path

ctx = ssl._create_unverified_context()
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'https://pidruchnik.com/'
}

DL_DIR = Path("textbooks_dl")

# Тестуємо можливі ID для Щупака: 988, 3192, та для Гільберг: 994
test_ids = [
    ("vsesvitnia", [988, 3192, 1145, 960], "Всесвітня історія Щупак"),
    ("heohrafiia", [994, 995, 1020], "Географія Гільберг")
]

for slug, ids, name in test_ids:
    dest = DL_DIR / f"{slug}.pdf"
    if dest.exists() and dest.stat().st_size > 5_000_000:
        print(f"[✓] {name} вже є")
        continue

    for bid in ids:
        url = f"https://pidruchnik.com/pdf.php?token=1&id={bid}&p=1&m=dl"
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            resp = urllib.request.urlopen(req, context=ctx, timeout=10).read().decode('utf-8')
            data = json.loads(resp)
            dl = data.get("url") or data.get("legacy")
            if dl:
                full_url = "https://pidruchnik.com" + dl if dl.startswith("/") else dl
                print(f"[+] Знайдено URL для {name} (ID {bid}): {full_url[:60]}")
                dl_req = urllib.request.Request(full_url, headers=HEADERS)
                with urllib.request.urlopen(dl_req, context=ctx, timeout=60) as dl_resp, open(dest, 'wb') as f:
                    f.write(dl_resp.read())
                print(f"[✓] Успішно збережено {name}: {dest.stat().st_size // 1024 // 1024} МБ")
                break
        except Exception as e:
            print(f"[-] ID {bid}: {e}")
