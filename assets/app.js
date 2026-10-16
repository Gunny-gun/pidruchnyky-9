/* Читалка підручників 9 класу з інтегрованими розв'язками (ГДЗ) */
(() => {
  'use strict';
  const app = document.getElementById('app');
  const state = { books: null, book: null, hdz: null, page: 1, activeTask: 0, busy: false };
  const cache = new Map();

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem('p9:' + k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem('p9:' + k, JSON.stringify(v)); } catch { /* приватний режим */ } },
  };

  const getJSON = async url => {
    const freshUrl = url.includes('?') ? url : `${url}?v=${Date.now()}`;
    if (!cache.has(url)) cache.set(url, fetch(freshUrl, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(r.status + ' ' + url); return r.json(); }));
    try { return await cache.get(url); } catch (e) { cache.delete(url); throw e; }
  };

  const pageUrl = (slug, n) => `books/${slug}/pages/${String(n).padStart(4, '0')}.webp`;
  const ready = b => (b.pages || 0) > 0;

  // Номер, НАДРУКОВАНИЙ у книжці (page_offset/page_scale); адреса й файли — за номером PDF.
  const label = (b, i) => {
    if (b.page_offset == null) return String(i);
    const s = b.page_scale || 1, p = s * i - b.page_offset;
    if (p < 1) return '';
    return s === 2 ? `${p}–${p + 1}` : String(p);
  };
  const fromLabel = (b, x) => (b.page_offset == null ? x : Math.floor((x + b.page_offset) / (b.page_scale || 1)));
  const lastLabel = b => { const l = label(b, b.pages); return l.includes('–') ? l.split('–')[1] : l; };

  function parseHash() {
    const m = location.hash.slice(1).match(/^([a-z0-9-]+)(?:\.(\d+))?$/i);
    return m ? { slug: m[1], page: m[2] ? +m[2] : null } : null;
  }
  function go(slug, page) {
    const h = slug ? `#${slug}.${page}` : '#';
    if (location.hash !== h) history.replaceState(null, '', h === '#' ? location.pathname + location.search : h);
  }

  /* Вибір предмета */
  const NEON = { 
    'Математика': '#ff2bd6', 
    'Мови й література': '#00f0ff', 
    'Природничі науки': '#7dff4d', 
    'Суспільство': '#ffe14d', 
    'Технології': '#ff8a3d', 
    "Мистецтво й здоров'я": '#b77dff' 
  };
  const CODE = {
    algebra: 'АЛГ', geometria: 'ГЕО',
    'ukr-mova': 'УКР', 'ukr-lit': 'ЛІТ', 'zar-lit': 'ЗАР', english: 'ENG',
    fizyka: 'ФІЗ', khimiia: 'ХІМ', biolohiia: 'БІО', heohrafiia: 'ГЕОГ',
    'istoriia-ukr': 'ІСТ', vsesvitnia: 'ВСЕС', pravoznavstvo: 'ПРАВ',
    informatyka: 'ІНФ', tekhnolohii: 'ТЕХ', mystetstvo: 'МИСТ', zdorovia: 'БЕЗП',
  };
  const ACC = {
    algebra: 'алгебру', geometria: 'геометрію',
    'ukr-mova': 'українську мову', 'ukr-lit': 'українську літературу', 'zar-lit': 'зарубіжну літературу', english: 'англійську',
    fizyka: 'фізику', khimiia: 'хімію', biolohiia: 'біологію', heohrafiia: 'географію',
    'istoriia-ukr': 'історію України', vsesvitnia: 'всесвітню історію', pravoznavstvo: 'правознавство',
    informatyka: 'інформатику', tekhnolohii: 'технології', mystetstvo: 'мистецтво', zdorovia: "«Основи здоров'я»",
  };
  const num = n => n.toLocaleString('uk-UA');

  function renderHome() {
    document.title = 'Підручники 9 клас';
    const all = state.books.subjects;
    const groups = new Map();
    for (const b of all) {
      if (!groups.has(b.group)) groups.set(b.group, []);
      groups.get(b.group).push(b);
    }
    const nReady = all.filter(ready).length;
    const nPages = all.reduce((s, b) => s + (b.pages || 0), 0);
    const rb = all.find(b => b.slug === store.get('recent') && ready(b));
    const rp = rb && Math.min(store.get('last:' + rb.slug) || 1, rb.pages);
    const hello = rb
      ? `<div><div class="cy-sys">// система готова · ${nReady} підручників · ${num(nPages)} сторінок · база розв'язків</div>
          <h2>Продовжити вивчення: <span>${esc(ACC[rb.slug] || rb.subject)}</span><i class="cy-cur" aria-hidden="true"></i></h2>
          <p>${label(rb, rp) ? `Закладка на сторінці ${label(rb, rp)} з ${lastLabel(rb)}.` : 'Закладка на початку книги.'} Розв'язки синхронізовано з номерами.</p>
          <div class="cy-bar" role="progressbar" aria-label="Прочитано" aria-valuemin="0" aria-valuemax="${rb.pages}" aria-valuenow="${rp}"><i style="width:${Math.round(rp / rb.pages * 100)}%"></i></div></div>
        <button class="cy-go" data-slug="${esc(rb.slug)}">Відкрити підручник →</button>`
      : `<div><div class="cy-sys">// система готова · ${nReady} з ${all.length} підручників · ${num(nPages)} сторінок</div>
          <h2>Оберіть <span>предмет</span><i class="cy-cur" aria-hidden="true"></i></h2>
          <p>Ліворуч — автентична сторінка підручника, праворуч — розв'язки (ГДЗ) до номерів поточної сторінки.</p></div>
        <button class="cy-go" id="to-list">До списку книг ↓</button>`;
    app.innerHTML = `
      <main class="cy">
        <div class="cy-sky" aria-hidden="true"></div><div class="cy-floor" aria-hidden="true"></div>
        <div class="cy-wrap">
          <header class="cy-top"><h1>Підручники</h1><span class="cy-lv">${state.books.grade} клас</span><span class="cy-me" aria-hidden="true">${state.books.grade}</span></header>
          <section class="cy-hello">${hello}</section>
          ${[...groups].map(([g, list], i) => `
            <section class="cy-group" style="--n:${NEON[g] || '#00f0ff'}" aria-label="${esc(g)}"${i ? '' : ' id="list"'}>
              <h3>${esc(g)}</h3>
              <div class="cy-grid">
                ${list.map(b => {
                  const last = store.get('last:' + b.slug);
                  const meta = ready(b)
                    ? `<span>${b.pages} с. · розв'язки</span>${last > 1 && label(b, last) ? `<span class="res">▶ с. ${label(b, last)}</span>` : ''}`
                    : `<span>${esc(b.note || 'готується')}</span>`;
                  return `<button class="cy-card" data-slug="${esc(b.slug)}" ${ready(b) ? '' : 'disabled'}>
                      <span class="cy-ico" aria-hidden="true">${CODE[b.slug] || 'КН'}</span>
                      <span><b>${esc(b.subject)}</b><span class="cy-meta">${meta}</span></span>
                      <span class="cy-arr" aria-hidden="true">→</span>
                    </button>`;
                }).join('')}\n              </div>\n            </section>`).join('')}
        </div>
      </main>`;
    app.querySelectorAll('.cy-card:not([disabled]), .cy-go[data-slug]').forEach(el =>
      el.addEventListener('click', () => openBook(el.dataset.slug)));
    document.getElementById('to-list')?.addEventListener('click', () => document.getElementById('list')?.scrollIntoView({ behavior: 'smooth' }));
  }

  /* Читалка */
  async function openBook(slug, page) {
    const b = state.books.subjects.find(x => x.slug === slug);
    if (!b || !ready(b)) { go(); renderHome(); return; }
    state.book = b;
    state.page = Math.min(Math.max(page || store.get('last:' + slug) || 1, 1), b.pages);
    state.activeTask = 0;
    try {
      state.hdz = await getJSON(`books/${slug}/hdz.json`);
    } catch {
      state.hdz = null;
    }
    renderReader();
  }


  /* ---------- Інтерактивний робочий зошит (Huion Canvas) ---------- */
  const canvasBook = {
    canvas: null,
    ctx: null,
    viewport: null,
    wrap: null,
    dpr: 1,
    activeTool: 'pen', // 'pen', 'eraser', 'marker'
    activeColor: '#eaf6ff',
    activeSize: 4,
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    lastMid: null,
    undoStack: [],
    redoStack: [],
    saveTimer: null,
    prevToolBeforeRight: null,

    init(panelEl) {
      if (!panelEl) return;
      this.canvas = document.getElementById('c-canvas');
      this.viewport = document.getElementById('c-viewport');
      this.wrap = document.getElementById('c-sheet-wrap');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      this.dpr = Math.max(window.devicePixelRatio || 1, 1);

      this.setupDimensions();
      this.bindToolbar();
      this.bindPointer();
      this.bindShortcuts();
      this.loadPage(state.book?.slug, state.page);
    },

    setupDimensions() {
      if (!this.canvas || !this.wrap) return;
      const rect = this.wrap.getBoundingClientRect();
      const w = Math.max(Math.round(rect.width), 700);
      const h = 2600;

      // Збереження існуючого зображення при зміні розміру
      let tempImg = null;
      if (this.canvas.width > 0 && this.canvas.height > 0) {
        tempImg = document.createElement('canvas');
        tempImg.width = this.canvas.width;
        tempImg.height = this.canvas.height;
        tempImg.getContext('2d').drawImage(this.canvas, 0, 0);
      }

      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';

      this.ctx.scale(this.dpr, this.dpr);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      if (tempImg) {
        this.ctx.drawImage(tempImg, 0, 0, tempImg.width / this.dpr, tempImg.height / this.dpr);
      }
    },

    resize() {
      this.setupDimensions();
    },

    bindToolbar() {
      // Інструменти
      const setTool = tool => {
        this.activeTool = tool;
        document.querySelectorAll('.c-tool-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        if (this.canvas) {
          this.canvas.classList.toggle('tool-eraser', tool === 'eraser');
        }
      };
      this.setTool = setTool;

      document.getElementById('c-tool-pen')?.addEventListener('click', () => setTool('pen'));
      document.getElementById('c-tool-eraser')?.addEventListener('click', () => setTool('eraser'));
      document.getElementById('c-tool-marker')?.addEventListener('click', () => setTool('marker'));

      // Кольори
      document.querySelectorAll('.c-color-btn').forEach(btn => {
        btn.onclick = () => {
          this.activeColor = btn.dataset.color;
          document.querySelectorAll('.c-color-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (this.activeTool === 'eraser') setTool('pen');
        };
      });

      // Розміри
      document.querySelectorAll('.c-size-btn').forEach(btn => {
        btn.onclick = () => {
          this.activeSize = parseInt(btn.dataset.size, 10) || 4;
          document.querySelectorAll('.c-size-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        };
      });

      // Дії
      document.getElementById('c-undo')?.addEventListener('click', () => this.undo());
      document.getElementById('c-redo')?.addEventListener('click', () => this.redo());
      document.getElementById('c-clear')?.addEventListener('click', () => this.clear());
      document.getElementById('c-download')?.addEventListener('click', () => this.downloadPNG());
    },

    pushUndo() {
      if (!this.canvas) return;
      if (this.undoStack.length >= 30) this.undoStack.shift();
      this.undoStack.push(this.canvas.toDataURL());
      this.redoStack = [];
      this.updateUndoButtons();
    },

    updateUndoButtons() {
      const u = document.getElementById('c-undo');
      const r = document.getElementById('c-redo');
      if (u) u.disabled = this.undoStack.length === 0;
      if (r) r.disabled = this.redoStack.length === 0;
    },

    undo() {
      if (this.undoStack.length === 0 || !this.canvas) return;
      this.redoStack.push(this.canvas.toDataURL());
      const prev = this.undoStack.pop();
      this.renderDataURL(prev);
      this.updateUndoButtons();
      this.scheduleSave();
    },

    redo() {
      if (this.redoStack.length === 0 || !this.canvas) return;
      this.undoStack.push(this.canvas.toDataURL());
      const next = this.redoStack.pop();
      this.renderDataURL(next);
      this.updateUndoButtons();
      this.scheduleSave();
    },

    renderDataURL(dataUrl) {
      if (!dataUrl) {
        this.ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
        return;
      }
      const img = new Image();
      img.onload = () => {
        this.ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
        this.ctx.drawImage(img, 0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
      };
      img.src = dataUrl;
    },

    clear() {
      if (!this.canvas) return;
      this.pushUndo();
      this.ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
      this.scheduleSave();
    },

    bindPointer() {
      if (!this.canvas) return;

      const getPos = e => {
        const rect = this.canvas.getBoundingClientRect();
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      };

      this.canvas.addEventListener('contextmenu', e => e.preventDefault());

      this.canvas.addEventListener('pointerdown', e => {
        if (e.target !== this.canvas) return;
        this.canvas.setPointerCapture(e.pointerId);

        // Права кнопка миші або бічна кнопка пера Huion вмикає ластик
        if (e.button === 2 || e.buttons === 2) {
          this.prevToolBeforeRight = this.activeTool;
          this.activeTool = 'eraser';
        }

        this.pushUndo();
        this.isDrawing = true;
        const pos = getPos(e);
        this.lastX = pos.x;
        this.lastY = pos.y;
        this.lastMid = { x: pos.x, y: pos.y };

        this.drawStroke(e, pos.x, pos.y, pos.x, pos.y);
      });

      this.canvas.addEventListener('pointermove', e => {
        if (!this.isDrawing) return;
        const pos = getPos(e);
        const mid = { x: (this.lastX + pos.x) / 2, y: (this.lastY + pos.y) / 2 };

        this.drawSmoothSegment(e, this.lastMid, this.lastX, this.lastY, mid);

        this.lastX = pos.x;
        this.lastY = pos.y;
        this.lastMid = mid;
      });

      const onPointerEnd = e => {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        try { this.canvas.releasePointerCapture(e.pointerId); } catch {}

        if (this.prevToolBeforeRight) {
          this.setTool(this.prevToolBeforeRight);
          this.prevToolBeforeRight = null;
        }

        this.scheduleSave();
      };

      this.canvas.addEventListener('pointerup', onPointerEnd);
      this.canvas.addEventListener('pointercancel', onPointerEnd);
    },

    drawStroke(e, x1, y1, x2, y2) {
      const ctx = this.ctx;
      ctx.save();
      this.applyToolStyle(ctx, e);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    },

    drawSmoothSegment(e, startMid, ctrlX, ctrlY, endMid) {
      const ctx = this.ctx;
      ctx.save();
      this.applyToolStyle(ctx, e);

      ctx.beginPath();
      ctx.moveTo(startMid.x, startMid.y);
      ctx.quadraticCurveTo(ctrlX, ctrlY, endMid.x, endMid.y);
      ctx.stroke();
      ctx.restore();
    },

    applyToolStyle(ctx, e) {
      if (this.activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 32;
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else if (this.activeTool === 'marker') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = this.activeColor;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = this.activeSize * 4.5;
        ctx.lineCap = 'round';
      } else {
        // Ручка (B) з підтримкою тиску пера Huion
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = this.activeColor;
        ctx.globalAlpha = 1.0;
        let w = this.activeSize;
        if (e.pointerType === 'pen' && e.pressure > 0) {
          w = this.activeSize * (0.35 + 1.25 * e.pressure);
        }
        ctx.lineWidth = Math.max(w, 1.2);
        ctx.lineCap = 'round';
      }
    },

    bindShortcuts() {
      window.addEventListener('keydown', e => {
        if (e.target.closest('input, textarea, [contenteditable="true"]')) return;
        // Ctrl+Z / Ctrl+Y незалежно від мовної розкладки клавіатури
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
          if (e.shiftKey) this.redo(); else this.undo();
          e.preventDefault();
        } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
          this.redo();
          e.preventDefault();
        } else if (e.code === 'KeyB' || e.code === 'KeyP') {
          this.setTool('pen');
        } else if (e.code === 'KeyE') {
          this.setTool('eraser');
        } else if (e.code === 'KeyV') {
          this.setTool('marker');
        }
      });
    },

    scheduleSave() {
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.saveCurrentPage(), 400);
    },

    saveCurrentPage() {
      if (!this.canvas || !state.book) return;
      const key = `p9:draw:${state.book.slug}:${state.page}`;
      try {
        const data = this.canvas.toDataURL('image/webp', 0.88);
        store.set(key, data);
      } catch (err) {
        /* сховище переповнене */
      }
    },

    loadPage(slug, page) {
      if (!this.canvas || !slug || !page) return;
      const key = `p9:draw:${slug}:${page}`;
      const saved = store.get(key);
      this.undoStack = [];
      this.redoStack = [];
      this.updateUndoButtons();
      this.renderDataURL(saved);
    },

    downloadPNG() {
      if (!this.canvas || !state.book) return;
      const b = state.book, p = state.page, lb = label(b, p);
      const w = this.canvas.width;
      const h = this.canvas.height;
      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      const g = out.getContext('2d');

      // 1. Темний зошитовий фон
      g.fillStyle = '#0c101d';
      g.fillRect(0, 0, w, h);

      // 2. Клітинка 24px (5мм)
      const step = 24 * this.dpr;
      g.strokeStyle = 'rgba(0, 240, 255, 0.07)';
      g.lineWidth = 1;
      for (let x = 0; x < w; x += step) {
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
      }
      for (let y = 0; y < h; y += step) {
        g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
      }

      // 3. Поля — маджента
      const marginX = 48 * this.dpr;
      g.strokeStyle = 'rgba(255, 43, 214, 0.35)';
      g.lineWidth = 1.5 * this.dpr;
      g.beginPath(); g.moveTo(marginX, 0); g.lineTo(marginX, h); g.stroke();

      // 4. Шапка на аркуші
      g.fillStyle = '#00f0ff';
      g.font = `bold ${Math.round(13 * this.dpr)}px "JetBrains Mono", monospace`;
      g.fillText(`МАТЕМАТИКА 9 КЛАС // ${b.title || b.subject} · Сторінка ${lb || p} · Зошит Мілани`, (marginX + 14 * this.dpr), 32 * this.dpr);

      // 5. Рукописні записи
      g.drawImage(this.canvas, 0, 0);

      // Завантаження файлу
      const a = document.createElement('a');
      a.download = `zoshyt-${b.slug}-storinka-${lb || p}.png`;
      a.href = out.toDataURL('image/png');
      a.click();
    }
  };


  function renderReader() {
    const b = state.book;
    document.title = `${b.subject} · 9 клас`;
    app.innerHTML = `
      <div class="reader" style="--n:${NEON[b.group] || '#00f0ff'}">
        <div class="cy-sky" aria-hidden="true"></div>
        <header class="bar">
          <button class="back" id="back" title="До списку предметів">← Предмети</button>
          <div class="title"><span class="dot"></span><b>${esc(b.title || b.subject)}</b></div>
          <div class="view-modes" id="view-modes" role="group" aria-label="Режими перегляду розвороту">
            <button class="mode-btn active" data-mode="book-canvas" title="Підручник зліва, зошит для письма пером справа">
              <span>Книга + Зошит</span>
            </button>
            <button class="mode-btn" data-mode="book-gdz" title="Підручник зліва, розв'язки ГДЗ справа">
              <span>Книга + ГДЗ</span>
            </button>
            <button class="mode-btn" data-mode="3col" title="3 колонки: підручник, зошит для письма і ГДЗ поруч">
              <span>3 Колонки</span>
            </button>
          </div>
          <button class="split-toggle-btn" id="split-50-btn" title="Режим 50 / 50: порівну підручник і розв'язки">50 / 50</button>
          <nav class="pager" aria-label="Сторінки">
            <button id="prev" aria-label="Попередня сторінка">‹</button>
            <input id="pnum" type="text" inputmode="numeric" aria-label="Номер сторінки, як надруковано в підручнику">
            <span class="of">з ${lastLabel(b)}</span>
            <button id="next" aria-label="Наступна сторінка">›</button>
          </nav>
        </header>
        <div class="split mode-book-canvas">
          <section class="stage" id="stage" aria-label="Сторінка підручника">
            <div class="sheet" id="sheet"><img id="img" alt=""></div>
            <button class="hit l" id="hitl" aria-label="Попередня сторінка"></button>
            <button class="hit r" id="hitr" aria-label="Наступна сторінка"></button>
            <div class="stage-tools"><button id="zoom">Збільшити сторінку</button></div>
          </section>
          <section class="canvas-panel" id="canvas-panel" aria-label="Робочий зошит для письма">
            <header class="canvas-bar">
              <div class="canvas-tools-group">
                <span class="canvas-tag">Зошит</span>
                <button class="c-tool-btn active" id="c-tool-pen" data-tool="pen" title="Ручка (B або P)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path></svg>
                  <span>Ручка <kbd>B</kbd></span>
                </button>
                <button class="c-tool-btn" id="c-tool-eraser" data-tool="eraser" title="Ластик (E або права кнопка пера)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 20H7L2 15c-1-1-1-2.5 0-3.5L12 2l10 10-5 5"></path></svg>
                  <span>Ластик <kbd>E</kbd></span>
                </button>
                <button class="c-tool-btn" id="c-tool-marker" data-tool="marker" title="Маркер (V)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16 3l5 5L8 21H3v-5L16 3z"></path></svg>
                  <span>Маркер <kbd>V</kbd></span>
                </button>
              </div>
              <div class="canvas-colors" id="c-colors" role="radiogroup" aria-label="Палітра кольорів">
                <button class="c-color-btn active" data-color="#eaf6ff" style="--c:#eaf6ff" title="Білий"></button>
                <button class="c-color-btn" data-color="#00f0ff" style="--c:#00f0ff" title="Неоновий циан"></button>
                <button class="c-color-btn" data-color="#10b981" style="--c:#10b981" title="Смарагдовий"></button>
                <button class="c-color-btn" data-color="#ff2bd6" style="--c:#ff2bd6" title="Маджента"></button>
                <button class="c-color-btn" data-color="#ffe14d" style="--c:#ffe14d" title="Жовтий"></button>
              </div>
              <div class="canvas-sizes" id="c-sizes" role="group" aria-label="Товщина">
                <button class="c-size-btn" data-size="2" title="Тонка (2px)">•</button>
                <button class="c-size-btn active" data-size="4" title="Звичайна (4px)">●</button>
                <button class="c-size-btn" data-size="8" title="Товста (8px)">⬤</button>
              </div>
              <div class="canvas-actions">
                <button class="c-act-btn" id="c-undo" title="Скасувати (Ctrl+Z)" aria-label="Скасувати">↶</button>
                <button class="c-act-btn" id="c-redo" title="Повернути (Ctrl+Y)" aria-label="Повернути">↷</button>
                <button class="c-act-btn c-act-clear" id="c-clear" title="Очистити зошит">Очистити</button>
                <button class="c-act-btn c-act-save" id="c-download" title="Завантажити малюнок у PNG">PNG</button>
              </div>
            </header>
            <div class="canvas-viewport" id="c-viewport">
              <div class="canvas-sheet-wrap" id="c-sheet-wrap">
                <canvas id="c-canvas" class="paint-canvas"></canvas>
              </div>
            </div>
          </section>
          <aside class="notebook" id="notes" aria-label="Розв'язки та відповіді">
            <button class="nb-toggle" id="nbtoggle" aria-controls="nbbody"><i aria-hidden="true">‹</i><span>Розв'язки</span></button>
            <div id="nbbody" aria-live="polite"></div>
          </aside>
        </div>
      </div>`;
    const $ = id => document.getElementById(id);
    $('back').onclick = () => { go(); renderHome(); };
    $('prev').onclick = $('hitl').onclick = () => turn(-1);
    $('next').onclick = $('hitr').onclick = () => turn(1);
    $('pnum').onchange = e => { const x = parseInt(e.target.value, 10); show(Number.isFinite(x) ? fromLabel(b, x) : state.page, 0); };
    $('nbtoggle').onclick = () => { store.set('nbClosed', !store.get('nbClosed')); applyNotebook(); };
    applyNotebook();

    const applySplit50 = () => {
      const is50 = !!store.get('split50');
      const splitEl = document.querySelector('.split');
      const btn50 = document.getElementById('split-50-btn');
      if (splitEl) splitEl.classList.toggle('split-50', is50);
      if (btn50) {
        btn50.classList.toggle('active', is50);
        btn50.title = is50 ? 'Повернути стандартний вигляд' : 'Режим 50 / 50: порівну підручник і розв\'язки';
      }
    };
    const btn50 = $('split-50-btn');
    if (btn50) {
      btn50.onclick = () => {
        store.set('split50', !store.get('split50'));
        applySplit50();
      };
    }
    applySplit50();

    $('zoom').onclick = () => {
      const z = $('stage').classList.toggle('zoom');
      $('zoom').textContent = z ? 'Вмістити' : 'Збільшити сторінку';
    };

    let x0 = null, y0 = null;
    $('stage').addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    $('stage').addEventListener('touchend', e => {
      if (x0 == null || $('stage').classList.contains('zoom')) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) turn(dx < 0 ? 1 : -1);
      x0 = null;
    }, { passive: true });


    // Перемикач режимів розвороту
    const applyViewMode = mode => {
      const splitEl = document.querySelector('.split');
      if (!splitEl) return;
      splitEl.classList.remove('mode-book-canvas', 'mode-book-gdz', 'mode-3col');
      splitEl.classList.add(`mode-${mode}`);
      document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
      });
      store.set('viewMode', mode);
      if (mode !== 'book-gdz') {
        setTimeout(() => canvasBook.resize(), 60);
      }
    };

    const initialMode = store.get('viewMode') || 'book-canvas';
    applyViewMode(initialMode);

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.onclick = () => applyViewMode(btn.dataset.mode);
    });

    // Ініціалізація робочого канвасу
    canvasBook.init(document.getElementById('canvas-panel'));

    show(state.page, 0);
  }

  function turn(d) { show(state.page + d, d); }

  function applyNotebook() {
    const el = document.getElementById('notes');
    if (!el) return;
    const closed = !!store.get('nbClosed');
    el.closest('.split').classList.toggle('nb-closed', closed);
    el.classList.toggle('closed', closed);
    const t = document.getElementById('nbtoggle');
    t.setAttribute('aria-expanded', String(!closed));
    t.title = closed ? 'Показати розв\'язки' : 'Сховати розв\'язки';
    t.setAttribute('aria-label', t.title);
  }

  function show(n, dir) {
    if (canvasBook.saveCurrentPage) canvasBook.saveCurrentPage();
    const b = state.book;
    n = Math.min(Math.max(n, 1), b.pages);
    const img = document.getElementById('img');
    if (!img) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (dir && n !== state.page && img.complete && img.naturalWidth && !reduce) {
      document.querySelectorAll('.flip').forEach(f => f.remove());
      const flip = document.createElement('div');
      flip.className = 'flip ' + (dir > 0 ? 'next' : 'prev');
      flip.innerHTML = `<img src="${img.src}" alt="">`;
      document.getElementById('sheet').appendChild(flip);
      flip.addEventListener('animationend', () => flip.remove());
    }
    state.page = n;
    state.activeTask = 0;
    img.src = pageUrl(b.slug, n);
    const lb = label(b, n);
    img.alt = `${b.subject}, сторінка ${lb || n}`;
    const pn = document.getElementById('pnum');
    pn.value = lb;
    pn.placeholder = lb ? '' : 'обкл.';
    document.getElementById('prev').disabled = n <= 1;
    document.getElementById('next').disabled = n >= b.pages;
    store.set('last:' + b.slug, n);
    store.set('recent', b.slug);
    go(b.slug, n);
    renderSolutions();
    if (canvasBook.loadPage) canvasBook.loadPage(b.slug, n);
    for (const k of [n + 1, n + 2, n - 1]) if (k >= 1 && k <= b.pages) new Image().src = pageUrl(b.slug, k);
  }

  function getPageTasks(b, pageNum) {
    if (!state.hdz || !state.hdz.pages) return [];
    const lb = label(b, pageNum);
    // Шукаємо за надрукованим номером сторінки (lb), або номером PDF
    const candidates = [String(lb), String(pageNum)];
    if (lb && lb.includes('–')) {
      lb.split('–').forEach(p => candidates.push(p.trim()));
    }
    for (const k of candidates) {
      if (state.hdz.pages[k] && state.hdz.pages[k].length > 0) {
        return state.hdz.pages[k];
      }
    }
    return [];
  }

  function renderSolutions(overrideTask) {
    const el = document.getElementById('nbbody');
    if (!el) return;
    const b = state.book, n = state.page, lb = label(b, n);
    const tasks = getPageTasks(b, n);

    let html = `<div class="hdz-head">
      <span class="hdz-tag">Розв'язки ГДЗ</span>
      <span class="hdz-page-badge">Стор. ${lb || n}</span>
    </div>`;

    if (overrideTask) {
      // Показуємо результат прямого пошуку
      html += `<div class="hdz-search-current">
        <button id="hdz-back-page" class="hdz-back-btn">← Повернутися до сторінки ${lb || n}</button>
      </div>`;
      html += renderTaskCard(overrideTask);
    } else if (tasks.length > 0) {
      const activeIdx = Math.min(state.activeTask || 0, tasks.length - 1);
      const cur = tasks[activeIdx];

      html += `<div class="hdz-pills-wrap">
        <span class="hdz-pills-label">Завдання на с. ${lb || n} (${tasks.length}):</span>
        <div class="hdz-pills">
          ${tasks.map((t, i) => {
            const raw = (t.task || '').trim();
            const lbl = (/^[0-9]+(\.[0-9]+)?$/.test(raw)) ? ('№ ' + raw) : raw;
            return `<button class="hdz-pill ${i === activeIdx ? 'active' : ''}" data-idx="${i}">${esc(lbl)}</button>`;
          }).join('')}
        </div>
      </div>`;

      html += renderTaskCard(cur);
    } else {
      const hasCoverage = state.hdz?.coverage_note;
      const hasBookNote = state.hdz?.note;
      const noHdzAtAll = !state.hdz || !state.hdz.total_tasks;
      let emptyTitle = 'Теоретичний блок';
      let msg = '';
      if (hasBookNote) {
        emptyTitle = 'Розв\'язник відсутній';
        msg = esc(hasBookNote);
      } else if (hasCoverage) {
        msg = `На сторінці ${lb || n} окремих завдань немає. ${esc(hasCoverage)}`;
      } else if (noHdzAtAll) {
        emptyTitle = 'Розв\'язник відсутній';
        msg = `Для цього підручника розв'язник наразі відсутній у відкритому доступі. Ліворуч подано оригінальний текст підручника.`;
      } else {
        msg = `На сторінці ${lb || n} окремих номерів завдань не виявлено. Розділ призначено для читання матеріалу ліворуч.`;
      }
      html += `<div class="hdz-empty">
        <div class="hdz-empty-title">${emptyTitle}</div>
        <p>${msg}</p>
      </div>`;
    }

    if (state.hdz?.coverage_note && tasks.length > 0) {
      html += `<div class="hdz-coverage-info">${esc(state.hdz.coverage_note)}</div>`;
    }

    // Блок швидкого пошуку будь-якого номера в підручнику
    html += `<div class="hdz-search-box">
      <label for="hdz-find">Швидкий пошук номера в підручнику:</label>
      <div class="hdz-search-row">
        <input id="hdz-find" type="text" placeholder="напр. 1.23, 14, повт. 5...">
        <button id="hdz-find-btn">Знайти</button>
      </div>
      <div id="hdz-search-res" class="hdz-search-res"></div>
    </div>`;

    if (state.hdz?.source_urls?.length) {
      html += `<a href="${esc(state.hdz.source_urls[0])}" target="_blank" rel="noopener" class="hdz-src-link">
        Повний розділ на shkola.in.ua →
      </a>`;
    }

    el.innerHTML = html;
    document.getElementById('notes').scrollTop = 0;

    // Обробка кліків по пігулках завдань
    el.querySelectorAll('.hdz-pill').forEach(btn => {
      btn.onclick = () => {
        state.activeTask = parseInt(btn.dataset.idx, 10);
        renderSolutions();
      };
    });

    // Збільшення розв'язку в оригінальному розмірі (100%) та перетягування мишкою
    const zoomBtn = document.getElementById('hdz-zoom-btn');
    const box = document.getElementById('hdz-img-box');
    const hdzImg = document.getElementById('hdz-img');

    const toggleZoom = () => {
      if (!box) return;
      const isZ = box.classList.toggle('zoomed');
      if (zoomBtn) {
        zoomBtn.textContent = isZ ? 'Вписати' : 'Збільшити';
        zoomBtn.title = isZ ? 'Вписати зображення в картку' : 'Показати в оригінальному розмірі (100%)';
      }
      if (hdzImg) {
        hdzImg.title = isZ ? 'Клікніть, щоб вписати' : 'Клікніть для оригінального розміру (100%)';
      }
    };

    if (zoomBtn) zoomBtn.onclick = toggleZoom;

    if (box && hdzImg) {
      let isDown = false, startX, startY, sLeft, sTop, moved = false;
      box.addEventListener('mousedown', e => {
        if (!box.classList.contains('zoomed')) return;
        isDown = true;
        moved = false;
        box.classList.add('panning');
        startX = e.pageX - box.offsetLeft;
        startY = e.pageY - box.offsetTop;
        sLeft = box.scrollLeft;
        sTop = box.scrollTop;
      });
      window.addEventListener('mouseup', () => {
        if (isDown) {
          isDown = false;
          box.classList.remove('panning');
        }
      });
      box.addEventListener('mousemove', e => {
        if (!isDown) return;
        const x = e.pageX - box.offsetLeft;
        const y = e.pageY - box.offsetTop;
        if (Math.abs(x - startX) > 4 || Math.abs(y - startY) > 4) moved = true;
        box.scrollLeft = sLeft - (x - startX);
        box.scrollTop = sTop - (y - startY);
      });
      hdzImg.onclick = () => {
        if (moved) return;
        toggleZoom();
      };
    }

    // Повернення до завдань сторінки
    const backBtn = document.getElementById('hdz-back-page');
    if (backBtn) {
      backBtn.onclick = () => renderSolutions();
    }

    // Пошук номерів
    const findBtn = document.getElementById('hdz-find-btn');
    const findInput = document.getElementById('hdz-find');
    const findRes = document.getElementById('hdz-search-res');

    const doSearch = () => {
      const q = (findInput.value || '').trim().toLowerCase();
      if (!q || !state.hdz || !state.hdz.pages) return;
      const found = [];
      for (const [p, list] of Object.entries(state.hdz.pages)) {
        for (const it of list) {
          if (it.task.toLowerCase().includes(q) || (it.title && it.title.toLowerCase().includes(q))) {
            found.push({ ...it, page: p });
            if (found.length >= 8) break;
          }
        }
        if (found.length >= 8) break;
      }
      if (found.length === 0) {
        findRes.innerHTML = `<span class="hdz-no-res">Номер "${esc(q)}" не знайдено.</span>`;
      } else {
        findRes.innerHTML = found.map(f => `
          <button class="hdz-res-item" data-img="${esc(f.img)}" data-task="${esc(f.task)}" data-page="${esc(f.page)}">
            <b>№ ${esc(f.task)}</b> <span>${f.page !== '0' ? `(с. ${f.page})` : ''}</span>
          </button>
        `).join('');
        findRes.querySelectorAll('.hdz-res-item').forEach(bItem => {
          bItem.onclick = () => {
            renderSolutions({
              task: bItem.dataset.task,
              img: bItem.dataset.img,
              title: `Завдання ${bItem.dataset.task} (с. ${bItem.dataset.page})`
            });
          };
        });
      }
    };

    if (findBtn && findInput) {
      findBtn.onclick = doSearch;
      findInput.onkeydown = e => { if (e.key === 'Enter') doSearch(); };
    }
  }

  function renderTaskCard(t) {
    return `<div class="hdz-card">
      <div class="hdz-card-head">
        <b>${(t.task || '').startsWith('Завдання') || (t.task || '').startsWith('§') ? esc(t.task) : (/^[0-9]+(\.[0-9]+)?$/.test((t.task || '').trim()) ? 'Завдання № ' + esc(t.task) : esc(t.task))}</b>
        <button class="hdz-zoom-btn" id="hdz-zoom-btn" title="Оригінальний розмір (100%)">Збільшити</button>
      </div>
      <div class="hdz-img-box" id="hdz-img-box">
        <img src="${esc(t.img)}" alt="${esc(t.title || t.task)}" class="hdz-img" id="hdz-img" title="Клікніть для оригінального розміру (100%)" loading="lazy">
      </div>
    </div>`;
  }

  document.addEventListener('keydown', e => {
    if (!state.book || !document.getElementById('img') || e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { turn(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { turn(-1); e.preventDefault(); }
    else if (e.key === 'Home') show(1, -1);
    else if (e.key === 'End') show(state.book.pages, 1);
  });

  function route() {
    const h = parseHash();
    if (h) openBook(h.slug, h.page); else { state.book = null; renderHome(); }
  }

  getJSON('books.json').then(data => { state.books = data; route(); })
    .catch(() => { app.innerHTML = '<p class="loading">Не вдалося завантажити список предметів (books.json). Оновіть сторінку.</p>'; });
  window.addEventListener('hashchange', () => { if (state.books) route(); });
})();

/* Неоновий курсор */
(() => {
  'use strict';
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const HOT = 'a, button, [role="button"], summary, label, .hit';
  const NATIVE = 'input, textarea, select, [contenteditable="true"], canvas, .paint-canvas, .canvas-viewport, .c-tool-btn, .c-color-btn, .c-size-btn, .c-act-btn';
  const cv = document.createElement('canvas');
  cv.className = 'neon-cursor'; cv.setAttribute('aria-hidden', 'true');
  document.body.append(cv);
  document.documentElement.classList.add('has-neon-cursor');
  const g = cv.getContext('2d');
  const pts = [];
  let x = 0, y = 0, on = false, hot = false, native = false, still = 0, raf = 0;

  const fit = () => {
    const r = devicePixelRatio || 1, w = Math.round(innerWidth * r), h = Math.round(innerHeight * r);
    if (cv.width === w && cv.height === h) return;
    cv.width = w; cv.height = h; g.setTransform(r, 0, 0, r, 0, 0); wake();
  };
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };

  function frame() {
    raf = 0;
    const max = reduce.matches ? 1 : 22;
    g.clearRect(0, 0, innerWidth, innerHeight);
    if (!on || native) { pts.length = 0; return; }
    pts.push({ x, y });
    while (pts.length > max) pts.shift();
    g.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
      const k = i / pts.length;
      g.strokeStyle = `rgba(${Math.round(255 * (1 - k))}, ${Math.round(43 + 197 * k)}, ${Math.round(214 + 41 * k)}, ${k})`;
      g.lineWidth = 1 + 5 * k; g.shadowBlur = 12 * k; g.shadowColor = g.strokeStyle;
      g.beginPath(); g.moveTo(pts[i - 1].x, pts[i - 1].y); g.lineTo(pts[i].x, pts[i].y); g.stroke();
    }
    g.shadowBlur = 14; g.shadowColor = '#00f0ff'; g.fillStyle = hot ? '#ff2bd6' : '#eaffff';
    g.beginPath(); g.arc(x, y, hot ? 5 : 3.5, 0, Math.PI * 2); g.fill();
    if (still++ < max + 2) wake();
  }

  fit();
  addEventListener('resize', fit);
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY; on = true; still = 0;
    const t = e.target instanceof Element ? e.target : null;
    native = !!t?.closest(NATIVE); hot = !native && !!t?.closest(HOT);
    wake();
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { on = false; wake(); });
})();
