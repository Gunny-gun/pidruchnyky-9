#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import re
import json
import ssl
import urllib.request

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

CATEGORIES = {
    "ukr-mova": ("/pidruchnyky/9-klas/ukrainska-mova/", ["заболотн"]),
    "ukr-lit": ("/pidruchnyky/9-klas/ukrainska-literatura/", ["заболотн"]),
    "zar-lit": ("/pidruchnyky/9-klas/zarubizhna-literatura/", ["ніколенк", "nikolenko"]),
    "vsesvitnia": ("/pidruchnyky/9-klas/vsesvitnia-istoriia/", ["щупак", "shchupak"]),
    "istoriia-ukr": ("/pidruchnyky/9-klas/istoriia-ukrainy/", ["пометун", "pometun"]),
    "biolohiia": ("/pidruchnyky/9-klas/biolohiia/", ["соболь", "sobol"]),
    "khimiia": ("/pidruchnyky/9-klas/khimiia/", ["попель", "popel"]),
    "heohrafiia": ("/pidruchnyky/9-klas/heohrafiia/", ["гільберг", "hilberg", "gilberg"]),
    "informatyka": ("/pidruchnyky/9-klas/informatika/", ["коршунов", "korshunova"]),
    "english": ("/pidruchnyky/9-klas/anglijska-mova/", ["мітчелл", "mitchell"]),
    "pravoznavstvo": ("/pidruchnyky/9-klas/pravoznavstvo/", ["тзов", "васильків", "наровлянськ", "ремех", "пометун", "філіпенко"])
}

def fetch_html(url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            return resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return ""

def search_target_books():
    found_books = {}
    for key, (path, keywords) in CATEGORIES.items():
        url = f"https://shkola.in.ua{path}"
        html = fetch_html(url)
        # Знаходимо посилання на сторінки підручників
        # Зазвичай у блоках <div class="page-header"> або подібних
        links = re.findall(r'<a[^>]+href="(/pidruchnyky/9-klas/[^"]+)"[^>]*>([^<]+)</a>', html)
        matched = []
        for l, text in links:
            t_lower = text.lower()
            l_lower = l.lower()
            for kw in keywords:
                if kw in t_lower or kw in l_lower:
                    matched.append((text.strip(), f"https://shkola.in.ua{l}"))
                    break
        
        # Видаляємо дублікати
        unique_matches = list(dict.fromkeys(matched))
        found_books[key] = unique_matches
        print(f"\n[{key}] Знайдено збігів: {len(unique_matches)}")
        for t, link in unique_matches[:3]:
            print(f"   -> {t}: {link}")

    with open("pidruchnyky-9/scripts/matched_links.json", "w", encoding="utf-8") as f:
        json.dump(found_books, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    search_target_books()
