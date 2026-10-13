#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import ssl
import re
import urllib.request

ctx = ssl._create_unverified_context()
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

url = 'https://lib.imzo.gov.ua/'
try:
    req = urllib.request.Request(url, headers=HEADERS)
    html = urllib.request.urlopen(req, context=ctx, timeout=15).read().decode('utf-8', errors='ignore')
    print('IMZO root loaded! HTML length:', len(html))
    links = re.findall(r'<a[^>]+href="([^"]+)"[^>]*>([^<]+)</a>', html)
    for l, text in links:
        if '9' in text or '9' in l or 'клас' in text.lower():
            print(f'  {text.strip()}: {l}')
except Exception as e:
    print('Error loading IMZO root:', e)
