#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Пакетна компіляція всіх підручників 9 класу в формат читалки pidruchnyky-9:
- Нарізка сторінок у WebP (150 DPI, якість 80%)
- Витягування тексту в text.json
- Генерація конспектів і тез у theses.json
- Оновлення books.json
"""
import os
import sys
import json
import re
from pathlib import Path
from PIL import Image
import pymupdf

ROOT_DIR = Path(__file__).resolve().parent.parent
BOOKS_DIR = ROOT_DIR / "books"
BOOKS_JSON = ROOT_DIR / "books.json"
DL_DIR = ROOT_DIR.parent / "textbooks_dl"

BOOKS_TO_PROCESS = [
    {
        "slug": "fizyka",
        "pdf": DL_DIR / "fizyka-dovhyi-9-klas.pdf",
        "title": "Фізика 9 клас (Бар'яхтар, за ред. С. О. Довгого)",
        "subject": "Фізика",
        "default_offset": 2
    },
    {
        "slug": "khimiia",
        "pdf": DL_DIR / "khimiia.pdf",
        "title": "Хімія 9 клас (П. П. Попель, Л. С. Крикля)",
        "subject": "Хімія",
        "default_offset": 2
    },
    {
        "slug": "biolohiia",
        "pdf": DL_DIR / "biolohiia.pdf",
        "title": "Біологія 9 клас (В. І. Соболь)",
        "subject": "Біологія",
        "default_offset": 2
    },
    {
        "slug": "ukr-mova",
        "pdf": DL_DIR / "ukr-mova.pdf",
        "title": "Українська мова 9 клас (О. В. Заболотний, В. В. Заболотний)",
        "subject": "Українська мова",
        "default_offset": 2
    },
    {
        "slug": "ukr-lit",
        "pdf": DL_DIR / "ukr-lit.pdf",
        "title": "Українська література 9 клас (О. В. Заболотний, В. В. Заболотний)",
        "subject": "Українська література",
        "default_offset": 2
    },
    {
        "slug": "zar-lit",
        "pdf": DL_DIR / "zar-lit.pdf",
        "title": "Зарубіжна література 9 клас (О. М. Ніколенко)",
        "subject": "Зарубіжна література",
        "default_offset": 2
    },
    {
        "slug": "vsesvitnia",
        "pdf": DL_DIR / "vsesvitnia.pdf",
        "title": "Всесвітня історія 9 клас (І. Я. Щупак)",
        "subject": "Всесвітня історія",
        "default_offset": 2
    },
    {
        "slug": "istoriia-ukr",
        "pdf": DL_DIR / "istoriia-ukr.pdf",
        "title": "Історія України 9 клас (О. І. Пометун)",
        "subject": "Історія України",
        "default_offset": 2
    },
    {
        "slug": "heohrafiia",
        "pdf": DL_DIR / "heohrafiia.pdf",
        "title": "Географія 9 клас (Т. Г. Гільберг)",
        "subject": "Географія",
        "default_offset": 2
    },
    {
        "slug": "informatyka",
        "pdf": DL_DIR / "informatyka.pdf",
        "title": "Інформатика 9 клас (О. В. Коршунова)",
        "subject": "Інформатика",
        "default_offset": 2
    },
    {
        "slug": "english",
        "pdf": DL_DIR / "english.pdf",
        "title": "Англійська мова 9 клас (H. Q. Mitchell)",
        "subject": "Англійська мова",
        "default_offset": 2
    },
    {
        "slug": "pravoznavstvo",
        "pdf": DL_DIR / "pravoznavstvo.pdf",
        "title": "Основи правознавства 9 клас (Васильків, ТзОВ «Астон»)",
        "subject": "Основи правознавства",
        "default_offset": 2
    }
]

def clean_text(text: str) -> str:
    text = text.replace('\xa0', ' ').replace('\u202f', ' ')
    lines = [line.strip() for line in text.split('\n')]
    return '\n'.join([line for line in lines if line])

def analyze_page(pdf_page_num: int, printed_page_num: int, text: str, book_title: str) -> dict:
    if pdf_page_num == 1:
        return {
            "kind": "cover",
            "title": f"Титул та обкладинка: {book_title}",
            "points": [
                f"Офіційне видання підручника для 9 класу закладів загальної середньої освіти.",
                "Відповідає державній модельній навчальній програмі НУШ."
            ]
        }
    
    if pdf_page_num in (2, 3):
        return {
            "kind": "intro",
            "title": "Довідковий форзац та звернення до учнів",
            "points": [
                "Довідкові таблиці, умовні позначення та структура навчального матеріалу.",
                "Опорні пам'ятки та навігація розділами книги."
            ]
        }

    # Пошук заголовків параграфів чи тем (§)
    title = None
    para_match = re.search(r'(§\s*\d+[^.\n]*\.?[^\n]*)', text)
    if para_match:
        title = para_match.group(1).strip()
    else:
        for kw in ["Тема", "Розділ", "ПРАКТИЧНА РОБОТА", "ЛАБОРАТОРНА РОБОТА", "ПОВТОРЕННЯ", "САМОСТІЙНА РОБОТА", "ТЕСТОВІ ЗАВДАННЯ", "ПІДСУМКИ"]:
            m = re.search(rf'({kw}\s*\d*[^.\n]*\.?[^\n]*)', text, re.IGNORECASE)
            if m:
                title = m.group(1).strip()
                break

    if not title:
        first_lines = [l for l in text.split('\n')[:4] if len(l) > 4 and not l.isdigit()]
        title = first_lines[0] if first_lines else f"Сторінка {printed_page_num}"

    # Визначення типу сторінки
    kind = "text"
    text_lower = text.lower()
    if any(k in text_lower for k in ["завдання", "вправи", "питання до теми", "перевірте себе", "тестові завдання"]):
        kind = "exercises"
    elif "покажчик" in text_lower or "термінологічний словник" in text_lower:
        kind = "index"
    elif "зміст" in text_lower:
        kind = "toc"

    # Формули або ключові закони
    formulas = []
    for line in text.split('\n'):
        if any(sym in line for sym in ['=', '>', '<', '±', '√', '²', '³', '→', '⇌']) and len(line) < 100:
            if re.search(r'[A-Za-zА-Яа-я0-9]', line):
                clean_f = line.strip()
                if clean_f not in formulas and len(formulas) < 4:
                    formulas.append(clean_f)

    # Витягування ключових тез
    points = []
    for para in text.split('\n\n'):
        p_strip = para.strip().replace('\n', ' ')
        if any(kw in p_strip.lower() for kw in ["означення", "правило", "закон", "важливо", "запам'ятайте", "висновок"]):
            if 20 < len(p_strip) < 250 and len(points) < 4:
                points.append(p_strip)

    if not points:
        sentences = [s.strip() for s in re.split(r'[.!?]\s+', text) if 25 < len(s) < 180]
        for s in sentences[:3]:
            if s not in points:
                points.append(s + ".")

    if not points:
        points = [f"Матеріал сторінки {printed_page_num}: теоретичні відомості та практичні завдання."]

    res = {
        "kind": kind,
        "title": title,
        "points": points
    }
    if formulas:
        res["formulas"] = formulas
    return res

def process_single_book(item):
    slug = item["slug"]
    pdf_path = Path(item["pdf"])
    if not pdf_path.exists():
        print(f"[-] Файл відсутній: {pdf_path}")
        return False

    out_dir = BOOKS_DIR / slug
    pages_dir = out_dir / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n==================================================")
    print(f"[*] Обробка: {item['title']}")
    print(f"[*] Файл: {pdf_path.name}")
    doc = pymupdf.open(str(pdf_path))
    total_pages = len(doc)
    offset = item["default_offset"]
    print(f"[*] Сторінок: {total_pages}, offset: {offset}")

    text_dict = {}
    theses_dict = {}

    for i in range(total_pages):
        pdf_page_num = i + 1
        printed_page_num = pdf_page_num - offset
        page = doc[i]

        # 1. Рендеринг у WebP
        webp_path = pages_dir / f"{pdf_page_num:04d}.webp"
        if not webp_path.exists():
            pix = page.get_pixmap(dpi=150)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            img.save(webp_path, "WEBP", quality=80)

        # 2. Текст
        raw_text = clean_text(page.get_text())
        text_dict[str(pdf_page_num)] = raw_text

        # 3. Тези
        theses_dict[str(pdf_page_num)] = analyze_page(pdf_page_num, printed_page_num, raw_text, item["title"])

        if pdf_page_num % 50 == 0 or pdf_page_num == total_pages:
            print(f"    ...оброблено {pdf_page_num}/{total_pages} сторінок")

    # Збереження
    with open(out_dir / "text.json", "w", encoding="utf-8") as f:
        json.dump(text_dict, f, ensure_ascii=False, indent=1)

    with open(out_dir / "theses.json", "w", encoding="utf-8") as f:
        json.dump({"pages": theses_dict}, f, ensure_ascii=False, indent=1)

    ack_file = out_dir / "check-ack.json"
    if not ack_file.exists():
        with open(ack_file, "w", encoding="utf-8") as f:
            json.dump({}, f, indent=1)

    # Оновлення books.json
    if BOOKS_JSON.exists():
        with open(BOOKS_JSON, "r", encoding="utf-8") as f:
            b_manifest = json.load(f)
        for subj in b_manifest.get("subjects", []):
            if subj.get("slug") == slug:
                subj["pages"] = total_pages
                subj["page_offset"] = offset
                subj["title"] = item["title"]
                if "note" in subj:
                    del subj["note"]
        with open(BOOKS_JSON, "w", encoding="utf-8") as f:
            json.dump(b_manifest, f, ensure_ascii=False, indent=2)

    print(f"[✓] Успішно зібрано: {slug} ({total_pages} сторінок)")
    return True

def main():
    print("=== Запуск компіляції всіх підручників 9 класу ===")
    for item in BOOKS_TO_PROCESS:
        process_single_book(item)
    print("\n=== Компіляція всіх підручників завершена! ===")

if __name__ == "__main__":
    main()
