#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import ssl
import re
import urllib.request

ctx = ssl._create_unverified_context()
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for bid in [3237, 3236, 3235, 3234, 3233]:
    url = f"https://pidruchnik.com/{bid}-.html"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        html = urllib.request.urlopen(req, context=ctx, timeout=10).read().decode('utf-8', errors='ignore')
        title_m = re.search(r'<h1>([^<]+)</h1>', html)
        title = title_m.group(1) if title_m else str(bid)
        
        # Шукаємо згадку видавництва в тексті сторінки
        pub = re.findall(r'(?:видавництв[а-я]|ТзОВ|ТОВ)[^<\n]{0,80}', html, re.IGNORECASE)
        print(f"ID {bid}: {title}")
        if pub:
            print(f"   Видавництво: {pub[:2]}")
        else:
            print("   Видавництво: не вказано в тексті")
    except Exception as e:
        print(f"ID {bid}: помилка {e}")
