import os
import json

base_dir = r"c:\Users\003\_MILANA-MATH\pidruchnyky-9"
manifest_path = os.path.join(base_dir, "manifest.json")

manifest = {}
if os.path.exists(manifest_path):
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

books_info = {b["slug"]: b for b in manifest.get("books", [])}

books_dir = os.path.join(base_dir, "books")
for slug in sorted(os.listdir(books_dir)):
    hdz_file = os.path.join(books_dir, slug, "hdz.json")
    binfo = books_info.get(slug, {})
    title = binfo.get("title", slug)
    author = binfo.get("author", "N/A")
    pages_count = binfo.get("pages_count", "N/A")

    if os.path.exists(hdz_file):
        try:
            with open(hdz_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                total = data.get("total_tasks", len(data.get("tasks", [])))
                sources = data.get("source_urls", [data.get("source_url", "N/A")])
                offset = data.get("page_offset", 0)
                pages_with_tasks = len(data.get("pages", {}))
                print(f"[{slug}] {title} ({author})")
                print(f"  Pages in book: {pages_count} | Pages with HDZ: {pages_with_tasks} | Total tasks: {total}")
                print(f"  Page offset: {offset}")
                print(f"  Sources: {', '.join(sources)}")
        except Exception as e:
            print(f"[{slug}] Error reading HDZ: {e}")
    else:
        print(f"[{slug}] {title} ({author}) -> NO HDZ FILE")
    print("-" * 50)
