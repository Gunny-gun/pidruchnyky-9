#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import ssl
import re
import urllib.request

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

req = urllib.request.Request('https://shkola.in.ua/pidruchnyky/9-klas/khimiia/', headers=HEADERS)
html = urllib.request.urlopen(req, context=ctx).read().decode('utf-8', errors='ignore')

# Шукаємо всі посилання, які містять 'khimiia' або цифри
links = re.findall(r'href="([^"]+)"', html)
for l in links:
    if 'khimi' in l or 'popel' in l or '9-klas' in l:
        print(l)
