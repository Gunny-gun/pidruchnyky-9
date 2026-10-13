#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Конвеєр підготовки книги для читалки підручників 9 класу (pidruchnyky-9):
1. Нарізка PDF у WebP-сторінки (150 DPI, якість 82%)
2. Витягування повного текстового шару сторінок у text.json
3. Автоматична генерація конспектів сторінок (theses.json):
   - Розпізнавання типу сторінки (обкладинка, вступ, теорія, завдання, повторення, покажчик)
   - Витягування заголовка параграфа
   - Витягування ключових тез (points)
   - Витягування математичних формул (formulas)
   - Витягування термінів та означень (terms)
   - Фіксація номерів завдань
4. Оновлення books.json з точними метаданими.
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

def clean_text(text: str) -> str:
    """Очищення тексту сторінки від службових артефактів."""
    text = text.replace('\xa0', ' ').replace('\u202f', ' ')
    lines = [line.strip() for line in text.split('\n')]
    return '\n'.join([line for line in lines if line])

def analyze_page_theses(pdf_page_num: int, printed_page_num: int, text: str, syllabus_map: dict) -> dict:
    """Створення структурованих тез для конкретної сторінки."""
    # 1. Спеціальні сторінки (обкладинка, форзац, зміст)
    if pdf_page_num == 1:
        return {
            "kind": "cover",
            "title": "Титул та обкладинка підручника",
            "points": [
                "Підручник для 9 класу закладів загальної середньої освіти.",
                "Автори: Олександр Істер, Дмитро Істер.",
                "Видавництво «Генеза», відповідає модельній навчальній програмі НУШ."
            ]
        }
    
    if pdf_page_num in (2, 3, 4):
        # Форзаци з довідковими таблицями
        formulas = []
        for line in text.split('\n'):
            if any(sym in line for sym in ['=', '>', '<', '±', '√', '²', 'cos', 'sin', 'tg']):
                if len(line) < 120 and len(formulas) < 6:
                    formulas.append(line.strip())
        return {
            "kind": "intro",
            "title": "Довідковий форзац: основні формули та таблиці",
            "points": [
                "Довідковий матеріал підручника: опорні властивості, формули та тотожності.",
                "Використовується для швидкої самоперевірки та орієнтування в темах курсу."
            ],
            "formulas": formulas if formulas else None
        }

    # 2. Пошук відповідності у навчальній програмі (syllabus)
    title = None
    if printed_page_num in syllabus_map:
        item = syllabus_map[printed_page_num]
        sec = item.get("section", "")
        t_name = item.get("title", "")
        title = f"{sec}: {t_name}" if sec and sec != "-" else t_name

    # Якщо в syllabus немає прямої сторінки, шукаємо в тексті заголовки параграфів (§)
    if not title:
        para_match = re.search(r'(§\s*\d+[^.\n]*\.?[^\n]*)', text)
        if para_match:
            title = para_match.group(1).strip()
        else:
            # Шукаємо рубрики
            for rub in ["Повторюємо алгебру за 8 клас", "Повторюємо геометрію за 8 клас", 
                        "Домашня самостійна робота", "Завдання для перевірки знань", 
                        "Вправи для повторення", "Головне в розділі", "Відповіді та поради"]:
                if rub.lower() in text.lower():
                    title = rub
                    break

    if not title:
        first_lines = [l for l in text.split('\n')[:4] if len(l) > 4 and not l.isdigit()]
        title = first_lines[0] if first_lines else f"Сторінка {printed_page_num}"

    # 3. Визначення типу сторінки (kind)
    kind = "text"
    text_lower = text.lower()
    if "завдання для перевірки" in text_lower or "самостійна робота" in text_lower:
        kind = "exercises"
    elif "відповіді та поради" in text_lower or "відповіді до вправ" in text_lower:
        kind = "answers"
    elif "предметний покажчик" in text_lower:
        kind = "index"
    elif any(kw in text_lower for kw in ["розв’яжіть", "знайдіть", "обчисліть", "доведіть"]) and re.search(r'\b\d+\.\d+\.|\b\d+\.\s+', text):
        kind = "exercises"

    # 4. Витягування номерів вправ
    exercises_found = re.findall(r'(?:№\s*|\b)(\d+\.\d+|\b\d{1,4}\.)(?:\s+|\t+)', text)
    unique_exercises = []
    for ex in exercises_found:
        ex_clean = ex.strip().rstrip('.')
        if ex_clean not in unique_exercises and len(ex_clean) <= 6:
            unique_exercises.append(ex_clean)

    # 5. Витягування формул і правил
    formulas = []
    terms = []
    points = []

    # Шукаємо формули
    for line in text.split('\n'):
        if re.search(r'([a-zA-Zа-яА-Я0-9_]+\s*=\s*[^;\n]+|[a-zA-Z]\s*[><≥≤]\s*[^;\n]+)', line):
            if any(sym in line for sym in ['=', '>', '<', '≥', '≤', '±', '√', '²', '³']) and len(line) < 100:
                clean_f = line.strip()
                if clean_f and clean_f not in formulas and len(formulas) < 5:
                    formulas.append(clean_f)

    # Шукаємо означення й ключові тези (жирний шрифт, слова "Означення", "Теорема", "Властивість")
    for para in text.split('\n\n'):
        p_strip = para.strip().replace('\n', ' ')
        if any(kw in p_strip.lower() for kw in ["означення", "теорема", "називають", "якщо і тільки якщо", "властивість"]):
            if len(p_strip) > 20 and len(p_strip) < 260 and len(points) < 4:
                points.append(p_strip)

    # Якщо тез мало, формуємо стислий огляд сторінки
    if not points:
        if kind == "exercises" and unique_exercises:
            points.append(f"Завдання для закріплення та відпрацювання навичок: №№ {', '.join(unique_exercises[:8])}.")
        else:
            sentences = [s.strip() for s in re.split(r'[.!?]\s+', text) if len(s) > 25 and len(s) < 180]
            for s in sentences[:3]:
                if s not in points:
                    points.append(s + ".")

    if unique_exercises and kind == "exercises":
        points.append(f"Вправи на сторінці: № {', '.join(unique_exercises[:10])}.")

    # Гарантуємо наявність хоча б одного пункту
    if not points:
        points = [f"Матеріал сторінки {printed_page_num}: теоретичні відомості та навчальні приклади."]

    res = {
        "kind": kind,
        "title": title,
        "points": points
    }
    if formulas:
        res["formulas"] = formulas
    if terms:
        res["terms"] = terms

    return res

def process_pdf(slug: str, pdf_path: str, page_offset: int = 2, syllabus_items: list = None, max_pages: int = None):
    """Повна обробка PDF-книги."""
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        print(f"[-] Файл не знайдено: {pdf_path}")
        return False

    out_book_dir = BOOKS_DIR / slug
    pages_dir = out_book_dir / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)

    print(f"[*] Відкриваємо: {pdf_path.name}")
    doc = pymupdf.open(str(pdf_path))
    total_pages = len(doc)
    if max_pages:
        total_pages = min(total_pages, max_pages)

    print(f"[*] Усього сторінок для обробки: {total_pages} (page_offset = {page_offset})")

    # Створюємо мапу syllabus за надрукованими сторінками
    syllabus_map = {}
    if syllabus_items:
        for item in syllabus_items:
            p = item.get("page")
            if p and isinstance(p, int):
                syllabus_map[p] = item

    text_dict = {}
    theses_dict = {}

    for i in range(total_pages):
        pdf_page_num = i + 1
        printed_page_num = pdf_page_num - page_offset
        page = doc[i]

        # 1. Рендеринг у WebP (150 DPI)
        webp_name = f"{pdf_page_num:04d}.webp"
        webp_path = pages_dir / webp_name
        if not webp_path.exists():
            pix = page.get_pixmap(dpi=150)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            img.save(webp_path, "WEBP", quality=82)

        # 2. Витягування тексту
        raw_text = clean_text(page.get_text())
        text_dict[str(pdf_page_num)] = raw_text

        # 3. Генерація тез
        theses_dict[str(pdf_page_num)] = analyze_page_theses(
            pdf_page_num, printed_page_num, raw_text, syllabus_map
        )

        if pdf_page_num % 25 == 0 or pdf_page_num == total_pages:
            print(f"    ...оброблено {pdf_page_num}/{total_pages} сторінок")

    # 4. Збереження text.json
    with open(out_book_dir / "text.json", "w", encoding="utf-8") as f:
        json.dump(text_dict, f, ensure_ascii=False, indent=1)

    # 5. Збереження theses.json
    with open(out_book_dir / "theses.json", "w", encoding="utf-8") as f:
        json.dump({"pages": theses_dict}, f, ensure_ascii=False, indent=1)

    # 6. Створення базового check-ack.json
    ack_path = out_book_dir / "check-ack.json"
    if not ack_path.exists():
        with open(ack_path, "w", encoding="utf-8") as f:
            json.dump({}, f, indent=1)

    # 7. Оновлення books.json
    if BOOKS_JSON.exists():
        with open(BOOKS_JSON, "r", encoding="utf-8") as f:
            b_manifest = json.load(f)
        for subj in b_manifest.get("subjects", []):
            if subj.get("slug") == slug:
                subj["pages"] = total_pages
                subj["page_offset"] = page_offset
                if "note" in subj:
                    del subj["note"]
        with open(BOOKS_JSON, "w", encoding="utf-8") as f:
            json.dump(b_manifest, f, ensure_ascii=False, indent=2)

    print(f"[✓] Книга {slug} успішно зібрана: {total_pages} сторінок, text.json та theses.json готові.\n")
    return True

if __name__ == "__main__":
    # Завантажуємо навчальну програму для звірки
    curriculum_path = ROOT_DIR.parent / "curriculum" / "ister_curriculum_index.json"
    curr_data = {}
    if curriculum_path.exists():
        with open(curriculum_path, "r", encoding="utf-8") as f:
            curr_data = json.load(f)

    # 1. Алгебра 9 клас
    alg_pdf = ROOT_DIR.parent / "textbooks" / "09_klas" / "Algebra_9_klas_Ister_2026.pdf"
    alg_syl = curr_data.get("grade_9_algebra", {}).get("syllabus", [])
    process_pdf("algebra", str(alg_pdf), page_offset=2, syllabus_items=alg_syl)

    # 2. Геометрія 9 клас
    geom_pdf = ROOT_DIR.parent / "textbooks" / "09_klas" / "Geometriya_9_klas_Ister_2026.pdf"
    geom_syl = curr_data.get("grade_9_geometriya", {}).get("syllabus", [])
    process_pdf("geometria", str(geom_pdf), page_offset=2, syllabus_items=geom_syl)
