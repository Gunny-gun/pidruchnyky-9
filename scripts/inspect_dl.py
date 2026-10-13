#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import ssl
import re
import urllib.request

ctx = ssl._create_unverified_context()
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

url = 'https://pidruchnik.com/3255-fizyka-9-klas-bariakhtar-2026.html'
req = urllib.request.Request(url, headers=HEADERS)
html = urllib.request.urlopen(req, context=ctx).read().decode('utf-8', errors='ignore')

# Шукаємо скрипти
scripts = re.findall(r'<script[^>]+src="([^"]+)"', html)
print('Scripts:')
for s in scripts:
    print(' ', s)

# Шукаємо функції download або pdfdl
inline_scripts = re.findall(r'<script>([\s\S]*?)</script>', html)
for sc in inline_scripts:
    if 'pdfdl' in sc or 'pdf' in sc.lower():
        print('\nInline script match:')
        print(sc[:500])
