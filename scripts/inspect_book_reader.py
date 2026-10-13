#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import ssl
import re
import urllib.request

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

url = 'https://shkola.in.ua/876-khimiia-9-klas-popel.html'
req = urllib.request.Request(url, headers=HEADERS)
html = urllib.request.urlopen(req, context=ctx).read().decode('utf-8', errors='ignore')

print('Title:', re.search(r'<title>([^<]+)</title>', html).group(1) if re.search(r'<title>([^<]+)</title>', html) else 'No title')
iframes = re.findall(r'<iframe[^>]+src="([^"]+)"', html)
print('Iframes:', iframes)
pdfs = re.findall(r'href="([^"]+\.pdf[^"]*)"', html)
print('PDFs:', pdfs)
embeds = re.findall(r'(https?://[^\s"\'<>]+(?:drive\.google|issuu|calameo|fliphtml5|pdf)[^\s"\'<>]*)', html)
print('Embeds:', set(embeds))
