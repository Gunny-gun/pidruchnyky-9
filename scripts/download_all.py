#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Пакетне завантаження підручників 9 класу за списком Мілани
"""
import os
import sys
import json
import ssl
import time
import urllib.request
import urllib.parse
from pathlib import Path

ctx = ssl._create_unverified_context()
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://pidruchnik.com/'
}

DL_DIR = Path("textbooks_dl")
DL_DIR.mkdir(exist_ok=True)

TARGETS = [
    {"slug": "ukr-mova", "id": 3251, "name": "Українська мова (Заболотний) 9 клас"},
    {"slug": "ukr-lit", "id": 3244, "name": "Українська література (Заболотний) 9 клас"},
    {"slug": "zar-lit", "id": 3178, "name": "Зарубіжна література (Ніколенко) 9 клас"},
    {"slug": "vsesvitnia", "id": 3160, "name": "Всесвітня історія (Щупак) 9 клас"},
    {"slug": "istoriia-ukr", "id": 3195, "name": "Історія України (Пометун) 9 клас"},
    {"slug": "biolohiia", "id": 3153, "name": "Біологія (Соболь) 9 клас"},
    {"slug": "khimiia", "id": 3262, "name": "Хімія (Попель) 9 клас"},
    {"slug": "heohrafiia", "id": 3163, "name": "Географія (Гільберг) 9 клас"},
    {"slug": "informatyka", "id": 3188, "name": "Інформатика (Коршунова) 9 клас"},
    {"slug": "english", "id": 3147, "name": "Англійська мова (Мітчелл) 9 клас"},
    {"slug": "pravoznavstvo", "id": 3233, "name": "Правознавство (Васильків, ТзОВ Астон) 9 клас"}
]

def get_dl_url(book_id):
    token_url = f"https://pidruchnik.com/pdf.php?token=1&id={book_id}&p=1&m=dl"
    req = urllib.request.Request(token_url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if "url" in data and data["url"]:
                return "https://pidruchnik.com" + data["url"]
            elif "legacy" in data and data["legacy"]:
                return data["legacy"]
    except Exception as e:
        print(f"[-] Помилка отримання токена для ID {book_id}: {e}")
    return None

def download_book(target):
    slug = target["slug"]
    bid = target["id"]
    name = target["name"]
    dest_path = DL_DIR / f"{slug}.pdf"

    if dest_path.exists() and dest_path.stat().st_size > 5_000_000:
        print(f"[✓] {name} вже завантажено ({dest_path.stat().st_size // 1024 // 1024} МБ)")
        return True

    print(f"\n[*] Отримуємо посилання для: {name} (ID: {bid})...")
    dl_url = get_dl_url(bid)
    if not dl_url:
        print(f"[-] Не вдалося отримати пряме посилання для {name}")
        return False

    print(f"    Пряме посилання отримано: {dl_url[:60]}...")
    req = urllib.request.Request(dl_url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=60) as resp, open(dest_path, 'wb') as out_f:
            total_read = 0
            while True:
                chunk = resp.read(1024 * 512) # 512 KB
                if not chunk:
                    break
                out_f.write(chunk)
                total_read += len(chunk)
                if total_read % (5 * 1024 * 1024) == 0:
                    print(f"    ...завантажено {total_read // 1024 // 1024} МБ")
        
        final_size = dest_path.stat().st_size
        print(f"[✓] Успішно завантажено {name}: {final_size // 1024 // 1024} МБ")
        return True
    except Exception as e:
        print(f"[-] Помилка завантаження {name}: {e}")
        if dest_path.exists():
            dest_path.unlink()
        return False

def main():
    print(f"=== Завантаження підручників 9 класу (усього {len(TARGETS)} книг) ===\n")
    success_count = 0
    for target in TARGETS:
        if download_book(target):
            success_count += 1
        time.sleep(1) # коротка пауза між запитами
    
    print(f"\n=== Завершено: успішно {success_count}/{len(TARGETS)} книг ===")

if __name__ == "__main__":
    main()
