import json
import re
import os

base_dir = r"c:\Users\003\_MILANA-MATH\pidruchnyky-9"
books_file = os.path.join(base_dir, "books.json")
with open(books_file, "r", encoding="utf-8") as f:
    books_data = json.load(f)

for b in books_data["subjects"]:
    slug = b["slug"]
    offset = b.get("page_offset", 0)
    pages = b.get("pages", 0)
    if pages == 0:
        continue
    
    text_file = os.path.join(base_dir, "books", slug, "text.json")
    if not os.path.exists(text_file):
        print(f"[{slug}] No text.json")
        continue
    
    with open(text_file, "r", encoding="utf-8") as tf:
        text_data = json.load(tf)
    
    # Check 5 sample pages (e.g. PDF pages 5, 10, 15, 20, 30)
    sample_offsets = []
    for pdf_p in [5, 6, 7, 8, 9, 10, 15, 20]:
        if str(pdf_p) not in text_data:
            continue
        txt = text_data[str(pdf_p)].strip()
        lines = [l.strip() for l in txt.split("\n") if l.strip()]
        if not lines:
            continue
        
        # Check first line or last line for standalone number
        detected_p = None
        if re.match(r"^\d{1,3}$", lines[0]):
            detected_p = int(lines[0])
        elif re.match(r"^\d{1,3}$", lines[-1]):
            detected_p = int(lines[-1])
        else:
            # Check for pattern like "5 ПОВТОРЮЄМО" or "РОЗДІЛ 1 28"
            m1 = re.match(r"^(\d{1,3})\s+[А-ЯІЇЄA-Z]", lines[0])
            m2 = re.match(r"^(\d{1,3})\s+[А-ЯІЇЄA-Z]", lines[-1])
            m3 = re.search(r"\b(\d{1,3})\s*$", lines[0])
            if m1:
                detected_p = int(m1.group(1))
            elif m2:
                detected_p = int(m2.group(1))
            elif m3 and int(m3.group(1)) < 350:
                detected_p = int(m3.group(1))
        
        if detected_p is not None and abs(pdf_p - detected_p) < 10:
            sample_offsets.append((pdf_p, detected_p, pdf_p - detected_p))
    
    calced_offsets = [diff for _, _, diff in sample_offsets]
    most_common = max(set(calced_offsets), key=calced_offsets.count) if calced_offsets else "Unknown"
    
    status = "OK" if most_common == offset else f"MISMATCH! (config={offset}, detected={most_common})"
    print(f"[{slug}] config offset: {offset} | detected: {most_common} -> {status}")
    if status.startswith("MISMATCH"):
        print(f"   Samples: {sample_offsets[:5]}")
