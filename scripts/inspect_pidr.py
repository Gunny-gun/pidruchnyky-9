#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import ssl
import re
import urllib.request

ctx = ssl._create_unverified_context()
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

url = 'https://pidruchnik.com/templates/study_adaptive/js/pidr.js?v=52'
req = urllib.request.Request(url, headers=HEADERS)
js = urllib.request.urlopen(req, context=ctx).read().decode('utf-8', errors='ignore')

idx = js.find('function pdfToken')
if idx != -1:
    print(js[idx:idx+600])
else:
    matches = re.findall(r'pdfToken[\s\S]{0,400}', js)
    for m in matches:
        print(m)
