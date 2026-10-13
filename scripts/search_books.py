#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import ssl
import re
import json
import urllib.request
import urllib.parse

ctx = ssl._create_unverified_context()
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'https://pidruchnik.com/'
}

SEARCH_QUERIES = [
    ("ukr-mova", "Українська мова Заболотний 9"),
    ("ukr-lit", "Українська література Заболотний 9"),
    ("zar-lit", "Зарубіжна література Ніколенко 9"),
    ("vsesvitnia", "Всесвітня історія Щупак 9"),
    ("istoriia-ukr", "Історія України Пометун 9"),
    ("biolohiia", "Біологія Соболь 9"),
    ("khimiia", "Хімія Попель 9"),
    ("heohrafiia", "Географія Гільберг 9"),
    ("informatyka", "Інформатика Коршунова 9"),
    ("english", "Англійська мова Мітчелл 9"),
    ("english-alt", "Mitchell 9"),
    ("pravoznavstvo", "Правознавство 9")
]

results = {}

for slug, q in SEARCH_QUERIES:
    data = urllib.parse.urlencode({
        'do': 'search',
        'subaction': 'search',
        'story': q
    }).encode('utf-8')
    
    req = urllib.request.Request('https://pidruchnik.com/', data=data, headers=HEADERS)
    try:
        html = urllib.request.urlopen(req, context=ctx, timeout=15).read().decode('utf-8', errors='ignore')
        # Знаходимо посилання на пости: <h2 ...><a href="https://pidruchnik.com/(\d+)-([^.]+)\.html">([^<]+)</a>
        matches = re.findall(r'<h2[^>]*><a[^>]+href="https://pidruchnik\.com/(\d+)-([^.]+)\.html"[^>]*>([^<]+)</a>', html)
        print(f"\n[Пошук: {q}] Знайдено: {len(matches)}")
        for bid, bslug, title in matches[:4]:
            print(f"  ID: {bid} | {title.strip()} -> https://pidruchnik.com/{bid}-{bslug}.html")
            if slug not in results:
                results[slug] = []
            results[slug].append({"id": bid, "slug": bslug, "title": title.strip()})
    except Exception as e:
        print(f"Помилка пошуку {q}: {e}")

with open("pidruchnyky-9/scripts/found_books.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
