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
    if (!cache.has(url)) cache.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(r.status + ' ' + url); return r.json(); }));
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

  function renderReader() {
    const b = state.book;
    document.title = `${b.subject} · 9 клас`;
    app.innerHTML = `
      <div class="reader" style="--n:${NEON[b.group] || '#00f0ff'}">
        <div class="cy-sky" aria-hidden="true"></div>
        <header class="bar">
          <button class="back" id="back" title="До списку предметів">← Предмети</button>
          <div class="title"><span class="dot"></span><b>${esc(b.title || b.subject)}</b></div>
          <nav class="pager" aria-label="Сторінки">
            <button id="prev" aria-label="Попередня сторінка">‹</button>
            <input id="pnum" type="text" inputmode="numeric" aria-label="Номер сторінки, як надруковано в підручнику">
            <span class="of">з ${lastLabel(b)}</span>
            <button id="next" aria-label="Наступна сторінка">›</button>
          </nav>
        </header>
        <div class="split">
          <section class="stage" id="stage" aria-label="Сторінка підручника">
            <div class="sheet" id="sheet"><img id="img" alt=""></div>
            <button class="hit l" id="hitl" aria-label="Попередня сторінка"></button>
            <button class="hit r" id="hitr" aria-label="Наступна сторінка"></button>
            <div class="stage-tools"><button id="zoom">Збільшити сторінку</button></div>
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
          ${tasks.map((t, i) => `<button class="hdz-pill ${i === activeIdx ? 'active' : ''}" data-idx="${i}">№ ${esc(t.task)}</button>`).join('')}
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

    // Збільшення розв'язку
    const zoomBtn = document.getElementById('hdz-zoom-btn');
    if (zoomBtn) {
      zoomBtn.onclick = () => {
        const box = document.getElementById('hdz-img-box');
        const isZ = box.classList.toggle('zoomed');
        zoomBtn.textContent = isZ ? 'Зменшити' : 'Збільшити';
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
        <b>Завдання ${esc(t.task)}</b>
        <button class="hdz-zoom-btn" id="hdz-zoom-btn">Збільшити</button>
      </div>
      <div class="hdz-img-box" id="hdz-img-box">
        <img src="${esc(t.img)}" alt="${esc(t.title || t.task)}" class="hdz-img" id="hdz-img" loading="lazy">
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
  const NATIVE = 'input, textarea, select, [contenteditable="true"]';
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
