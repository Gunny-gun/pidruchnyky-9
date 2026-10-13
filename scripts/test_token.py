#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import ssl
import json
import urllib.request

ctx = ssl._create_unverified_context()
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'https://pidruchnik.com/3255-fizyka-9-klas-bariakhtar-2026.html'
}

url = 'https://pidruchnik.com/pdf.php?token=1&id=3255&p=1&m=dl'
req = urllib.request.Request(url, headers=HEADERS)
try:
    resp = urllib.request.urlopen(req, context=ctx).read().decode('utf-8')
    print('Response:', resp)
except Exception as e:
    print('Error:', e)
