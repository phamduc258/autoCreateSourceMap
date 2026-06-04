// =============================================================================
//  IN-PAGE RECORDER (plain JS, doc dang text roi addInitScript -> ne loi __name cua tsx)
//  Moi thao tac sinh 2 tang selector:
//    unique = tro DUNG 1 element (cho thao tac)
//    family = nhom "anh chi em cung ho" (item lap, khop NHIEU) + within (element tuong doi trong 1 item)
//             -> de viet assertion kieu "data co trong list khong": family.filter({hasText}).<within>
//
//  *** CUSTOM: sua uniqueCandidates() / findFamily() ben duoi. ***
// =============================================================================
(() => {
  const looksGenerated = (s) => !s || /^(css|sc|jss|emotion|Mui)[-_]/.test(s) ||
    /[-_][0-9a-f]{6,}($|[-_])/i.test(s) || /\d{4,}/.test(s);
  const q = (s) => (s || '').replace(/'/g, "\\'");
  const countCss = (sel) => { try { return document.querySelectorAll(sel).length; } catch (e) { return -1; } };
  const countXpath = (xp) => {
    try { return document.evaluate(xp, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength; }
    catch (e) { return -1; }
  };
  const ROLE_CSS = {
    button: 'button,[role=button],input[type=submit],input[type=button],summary',
    link: 'a[href],[role=link]', checkbox: 'input[type=checkbox],[role=checkbox]',
    radio: 'input[type=radio],[role=radio]', tab: '[role=tab]', menuitem: '[role=menuitem]',
    option: 'option,[role=option]', switch: '[role=switch]', row: 'tr,[role=row]', listitem: 'li,[role=listitem]',
  };
  const countRoleName = (role, name) => {
    const sel = ROLE_CSS[role]; if (!sel) return -1;
    let n = 0; try { for (const el of document.querySelectorAll(sel)) if (accName(el) === name) n++; } catch (e) { return -1; }
    return n;
  };
  const countText = (name) => {
    let n = 0; try { for (const el of document.querySelectorAll('body *')) { if ((el.textContent || '').trim().replace(/\s+/g, ' ') === name) n++; } } catch (e) { return -1; }
    return n;
  };
  const LIST_ROLE = { TR: 'row', LI: 'listitem', OPTION: 'option' };

  function testId(el) {
    for (const a of ['data-testid', 'data-test', 'data-cy', 'data-qa']) { const v = el.getAttribute(a); if (v) return { attr: a, value: v }; }
    return null;
  }
  function accName(el) {
    const a = el.getAttribute('aria-label'); if (a) return a.trim();
    if (el.id) { const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]'); if (l && l.textContent) return l.textContent.trim().replace(/\s+/g, ' '); }
    const w = el.closest('label'); if (w && w.textContent) return w.textContent.trim().replace(/\s+/g, ' ');
    const ph = el.getAttribute('placeholder'); if (ph) return ph.trim();
    if (el.tagName.toLowerCase() === 'select') return '';
    return (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  }
  function roleOf(el) {
    const r = el.getAttribute('role'); if (r) return r;
    const t = el.tagName.toLowerCase();
    if (t === 'a' && el.getAttribute('href')) return 'link';
    if (t === 'button' || t === 'summary') return 'button';
    if (t === 'select') return 'combobox';
    if (t === 'textarea') return 'textbox';
    if (t === 'input') { const ty = (el.getAttribute('type') || 'text').toLowerCase(); return ({ checkbox: 'checkbox', radio: 'radio', submit: 'button', button: 'button', search: 'searchbox' })[ty] || 'textbox'; }
    return t;
  }
  function cssPath(el) {
    if (el.id && !looksGenerated(el.id)) return '#' + CSS.escape(el.id);
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.documentElement) {
      if (cur.id && !looksGenerated(cur.id)) { parts.unshift('#' + CSS.escape(cur.id)); break; }
      let part = cur.tagName.toLowerCase();
      const sibs = cur.parentNode ? Array.from(cur.parentNode.children).filter((s) => s.tagName === cur.tagName) : [];
      if (sibs.length > 1) part += ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')';
      parts.unshift(part);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }
  function xpath(el) {
    const ti = testId(el);
    if (ti) return "//*[@" + ti.attr + "='" + ti.value + "']";
    if (el.id && !looksGenerated(el.id)) return '//*[@id="' + el.id + '"]';
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1) {
      let i = 1, s = cur.previousElementSibling;
      while (s) { if (s.tagName === cur.tagName) i++; s = s.previousElementSibling; }
      parts.unshift(cur.tagName.toLowerCase() + '[' + i + ']');
      cur = cur.parentElement;
    }
    return '/' + parts.join('/');
  }

  // === (1) UNIQUE: cac ung vien tro dung 1 element + so khop (n) ===
  function uniqueCandidates(el) {
    const ti = testId(el), name = accName(el), role = roleOf(el);
    const out = [];
    if (ti) { const c = '[' + ti.attr + '="' + ti.value + '"]'; out.push({ kind: 'testId', value: ti.attr === 'data-testid' ? "getByTestId('" + q(ti.value) + "')" : c, css: c }); }
    if (name && ['button', 'link', 'tab', 'menuitem', 'checkbox', 'radio', 'switch', 'option'].includes(role)) out.push({ kind: 'role', value: "getByRole('" + role + "', { name: '" + q(name) + "' })" });
    const ph = el.getAttribute('placeholder'); if (ph) out.push({ kind: 'placeholder', value: "getByPlaceholder('" + q(ph) + "')", css: '[placeholder="' + ph + '"]' });
    out.push({ kind: 'css', value: cssPath(el) });
    out.push({ kind: 'xpath', value: xpath(el) });
    if (name) out.push({ kind: 'text', value: "getByText('" + q(name) + "', { exact: true })" });
    for (const s of out) {
      if (s.kind === 'xpath') s.n = countXpath(s.value);
      else if (s.css) s.n = countCss(s.css);
      else if (s.kind === 'css') s.n = countCss(s.value);
      else if (s.kind === 'role') s.n = countRoleName(role, name);
      else if (s.kind === 'text') s.n = countText(name);
      else s.n = -1;
      delete s.css;
    }
    return out;
  }

  // === (2) FAMILY: nhom item lap "anh chi em cung ho" ===
  // Gom theo CLASS (tranh nham sibling div trong cung 1 item); khong class thi theo tag.
  function siblingGroup(cur) {
    const parent = cur.parentElement; if (!parent) return [];
    const cls = Array.from(cur.classList || []).filter((c) => !looksGenerated(c));
    if (cls.length) return Array.from(parent.children).filter((s) => s.tagName === cur.tagName && cls.some((c) => s.classList.contains(c)));
    return Array.from(parent.children).filter((s) => s.tagName === cur.tagName);
  }
  function relCss(root, el) {
    const parts = [];
    let cur = el;
    while (cur && cur !== root && cur.nodeType === 1) {
      let part = cur.tagName.toLowerCase();
      const cls = Array.from(cur.classList || []).find((c) => !looksGenerated(c));
      if (cls) part = '.' + CSS.escape(cls);
      else { const sibs = cur.parentNode ? Array.from(cur.parentNode.children).filter((s) => s.tagName === cur.tagName) : []; if (sibs.length > 1) part += ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')'; }
      parts.unshift(part);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }
  function withinSelector(item, el) {
    if (el === item) return ':scope';
    const name = accName(el), role = roleOf(el);
    if (name && ['button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'option'].includes(role)) return "getByRole('" + role + "', { name: '" + q(name) + "' })";
    return relCss(item, el) || el.tagName.toLowerCase();
  }
  function findFamily(el) {
    let cur = el, found = null;
    while (cur && cur.nodeType === 1 && cur !== document.body) {
      const grp = siblingGroup(cur);
      if (grp.length >= 2) { found = { item: cur, siblings: grp }; break; }
      cur = cur.parentElement;
    }
    if (!found) return null;
    const it = found.item, sibs = found.siblings, cands = [];

    const roleAttr = it.getAttribute('role');
    const listRole = (roleAttr && ['row', 'listitem', 'option', 'treeitem', 'gridcell'].includes(roleAttr) && roleAttr) || LIST_ROLE[it.tagName];
    if (listRole) cands.push({ kind: 'role', value: "getByRole('" + listRole + "')", _css: ROLE_CSS[listRole] || it.tagName.toLowerCase() });

    for (const c of Array.from(it.classList || [])) {
      if (looksGenerated(c)) continue;
      if (sibs.filter((s) => s.classList && s.classList.contains(c)).length >= 2) { cands.push({ kind: 'css', value: '.' + CSS.escape(c) }); break; }
    }
    const ti = testId(it);
    if (ti) {
      const m = ti.value.match(/^(.*[-_])\d+$/); // testid co duoi so (user-row-7) -> prefix; khong thi -> exact
      cands.push({ kind: 'testId', value: m ? '[' + ti.attr + '^="' + m[1] + '"]' : '[' + ti.attr + '="' + ti.value + '"]' });
    }
    if (!cands.length) cands.push({ kind: 'tag', value: it.tagName.toLowerCase() }); // tag chi la fallback cuoi

    for (const s of cands) { s.n = countCss(s._css || s.value); delete s._css; }
    return { count: (cands.find((s) => s.n >= 2) || cands[0]).n, all: cands, within: withinSelector(it, el) };
  }

  function buildEntry(el) {
    return { tag: el.tagName.toLowerCase(), role: roleOf(el), name: accName(el), unique: { all: uniqueCandidates(el) }, family: findFamily(el) };
  }

  const INTERACTIVE = 'a[href],button,input,select,textarea,summary,[role],[onclick],[data-test],[data-testid],[data-cy],[data-qa],[tabindex]:not([tabindex="-1"])';
  const pick = (el) => (el && el.closest && el.closest(INTERACTIVE)) || el;
  const send = (a) => { try { window.__record(Object.assign({ url: location.href, ts: Date.now() }, a)); } catch (e) { /* binding chua san sang */ } };

  // ---------- Toolbar day du (giong Playwright codegen) ----------
  // Trang thai: paused (Record on/off), inspect = null|'pick'|'visible'|'text'|'value'
  let paused = false, inspect = null, codeOpen = false, ui, hl, tip, dragging = null;
  const isUI = (el) => el && el.closest && (el.closest('#__rec_ui') || el.closest('#__rec_codebox') || el.closest('#__rec_menu'));
  window.__recRenderCode = (code) => { const p = document.getElementById('__rec_code'); if (p) p.textContent = code; };
  const bestUnique = (el) => { const c = uniqueCandidates(el); const u = c.find((s) => s.n === 1) || c[0]; return u ? u.value : ''; };
  const visibleText = (el) => (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);

  function render() {
    if (!ui) return;
    const set = (id, on, col) => { const b = document.getElementById(id); if (b) b.style.background = on ? (col || '#ef4444') : '#374151'; };
    set('__rec_rec', !paused, '#16a34a');
    set('__rec_pick', inspect === 'pick'); set('__rec_av', inspect === 'visible'); set('__rec_at', inspect === 'text'); set('__rec_aval', inspect === 'value');
    const l = document.getElementById('__rec_lbl');
    if (l) l.textContent = inspect ? ('INSPECT ' + inspect + ': click element · Esc thoat') : (paused ? 'TAM DUNG ghi' : 'dang ghi thao tac');
    document.documentElement.style.cursor = inspect ? 'crosshair' : '';
    if (!inspect && hl) { hl.style.display = 'none'; tip.style.display = 'none'; }
  }
  function setInspect(k) { inspect = k; render(); }
  var menuTarget = null;
  function showMenu(x, y) { var m = document.getElementById('__rec_menu'); if (!m) return; m.style.display = 'block'; m.style.left = Math.min(x, innerWidth - m.offsetWidth - 8) + 'px'; m.style.top = Math.min(y, innerHeight - m.offsetHeight - 8) + 'px'; }
  function hideMenu() { var m = document.getElementById('__rec_menu'); if (m) m.style.display = 'none'; menuTarget = null; }
  function chooseAction(kind) { var t = menuTarget; hideMenu(); if (t) send(Object.assign({ type: kind }, buildEntry(t))); } // kind: click/rightclick/dblclick/hover/pick
  function syncState() { try { window.__recSetState && window.__recSetState({ paused: paused, codeOpen: codeOpen, pos: ui ? { left: ui.style.left, top: ui.style.top } : null }); } catch (e) {} }
  function showCode(v) { codeOpen = v; const b = document.getElementById('__rec_codebox'); if (b) b.style.display = v ? 'block' : 'none'; }
  function applyState(s) {
    if (!s) return;
    paused = !!s.paused;
    if (s.pos && s.pos.left && ui) { ui.style.left = s.pos.left; ui.style.top = s.pos.top; ui.style.transform = 'none'; }
    showCode(!!s.codeOpen);
    if (typeof s.code === 'string') window.__recRenderCode(s.code);
    render();
  }
  function togglePause() { paused = !paused; render(); syncState(); }
  window.__recSetInspect = setInspect;                                        // cho test/keyboard
  window.__recTogglePick = () => setInspect(inspect === 'pick' ? null : 'pick');
  window.__recTogglePause = togglePause;

  function ensureUI() {
    if (ui || !document.body) return;
    const BTN = 'cursor:pointer;border:0;border-radius:6px;padding:4px 9px;background:#374151;color:#fff;font:12px sans-serif';
    ui = document.createElement('div'); ui.id = '__rec_ui';
    ui.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;gap:6px;align-items:center;background:#1f2937;color:#fff;padding:6px 10px;border-radius:8px;font:12px/1.4 sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.35)';
    ui.innerHTML =
      '<span id="__rec_drag" title="Keo de di chuyen" style="cursor:move;padding:0 4px;color:#9ca3af">☰</span>' +
      '<button id="__rec_rec"  title="Bat/tat ghi"   style="' + BTN + '">● Rec</button>' +
      '<button id="__rec_pick" title="Pick locator"  style="' + BTN + '">🎯 Pick</button>' +
      '<button id="__rec_av"   title="Assert visible" style="' + BTN + '">👁 Visible</button>' +
      '<button id="__rec_at"   title="Assert text"    style="' + BTN + '">🔤 Text</button>' +
      '<button id="__rec_aval" title="Assert value"   style="' + BTN + '">= Value</button>' +
      '<button id="__rec_code_btn" title="Hien/an code" style="' + BTN + '">&lt;/&gt; Code</button>' +
      '<span id="__rec_lbl" style="margin-left:4px">dang ghi thao tac</span>';
    document.body.appendChild(ui);
    const on = (id, fn) => document.getElementById(id).addEventListener('click', (e) => { e.stopPropagation(); fn(); });
    on('__rec_rec', togglePause);
    on('__rec_pick', () => setInspect(inspect === 'pick' ? null : 'pick'));
    on('__rec_av', () => setInspect(inspect === 'visible' ? null : 'visible'));
    on('__rec_at', () => setInspect(inspect === 'text' ? null : 'text'));
    on('__rec_aval', () => setInspect(inspect === 'value' ? null : 'value'));
    on('__rec_code_btn', () => { showCode(!codeOpen); syncState(); });
    document.getElementById('__rec_drag').addEventListener('mousedown', (e) => { e.preventDefault(); const r = ui.getBoundingClientRect(); dragging = { dx: e.clientX - r.left, dy: e.clientY - r.top }; });

    hl = document.createElement('div'); hl.id = '__rec_hl';
    hl.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #ef4444;background:rgba(239,68,68,.12);display:none';
    tip = document.createElement('div'); tip.id = '__rec_tip';
    tip.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;background:#111827;color:#a7f3d0;font:12px monospace;padding:3px 6px;border-radius:4px;display:none;max-width:70vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    document.body.appendChild(hl); document.body.appendChild(tip);
    const box = document.createElement('div'); box.id = '__rec_codebox';
    box.style.cssText = 'position:fixed;top:48px;right:8px;width:min(560px,46vw);max-height:62vh;overflow:auto;z-index:2147483646;background:#0b1020;border:1px solid #374151;border-radius:8px;display:none;box-shadow:0 4px 16px rgba(0,0,0,.45)';
    box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:#111827;position:sticky;top:0"><b style="font:12px sans-serif;color:#9ca3af">Generated spec (live)</b><button id="__rec_copy" style="cursor:pointer;border:0;border-radius:5px;padding:2px 9px;background:#374151;color:#fff;font:11px sans-serif">Copy</button></div><pre id="__rec_code" style="margin:0;padding:8px;font:12px/1.5 monospace;white-space:pre;color:#d1fae5"></pre>';
    document.body.appendChild(box);
    document.getElementById('__rec_copy').addEventListener('click', (e) => { e.stopPropagation(); try { navigator.clipboard.writeText(document.getElementById('__rec_code').textContent || ''); } catch (x) {} });

    var menu = document.createElement('div'); menu.id = '__rec_menu';
    menu.style.cssText = 'position:fixed;z-index:2147483647;background:#1f2937;color:#fff;border:1px solid #374151;border-radius:8px;padding:4px;display:none;font:13px sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.5);min-width:150px';
    menu.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;color:#9ca3af;font-size:11px">Choose action<span id="__rec_menu_x" style="cursor:pointer">×</span></div>' +
      '<div class="__rec_mi" data-k="click">Click</div><div class="__rec_mi" data-k="rightclick">Right click</div>' +
      '<div class="__rec_mi" data-k="dblclick">Double click</div><div class="__rec_mi" data-k="hover">Hover</div>' +
      '<div class="__rec_mi" data-k="pick">Pick locator</div>';
    document.body.appendChild(menu);
    Array.prototype.forEach.call(menu.querySelectorAll('.__rec_mi'), function (mi) {
      mi.style.cssText = 'padding:6px 10px;border-radius:5px;cursor:pointer';
      mi.addEventListener('mouseenter', function () { mi.style.background = '#374151'; });
      mi.addEventListener('mouseleave', function () { mi.style.background = ''; });
      mi.addEventListener('click', function (e) { e.stopPropagation(); chooseAction(mi.getAttribute('data-k')); });
    });
    document.getElementById('__rec_menu_x').addEventListener('click', function (e) { e.stopPropagation(); hideMenu(); });
    render();
    if (window.__recGetState) window.__recGetState().then(applyState).catch(function () {}); // khoi phuc trang thai sau khi chuyen trang
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureUI); else ensureUI();

  function preview(el) {
    const loc = bestUnique(el);
    if (inspect === 'visible') return 'toBeVisible() <- ' + loc;
    if (inspect === 'text') return "toContainText('" + visibleText(el).slice(0, 40) + "')";
    if (inspect === 'value') return "toHaveValue('" + (el.value != null ? String(el.value).slice(0, 40) : '') + "')";
    return loc;
  }
  document.addEventListener('mousemove', (e) => {
    if (dragging) { ui.style.left = (e.clientX - dragging.dx) + 'px'; ui.style.top = (e.clientY - dragging.dy) + 'px'; ui.style.transform = 'none'; return; }
    if (!inspect || isUI(e.target)) { if (hl) { hl.style.display = 'none'; tip.style.display = 'none'; } return; }
    const el = e.target, r = el.getBoundingClientRect();
    hl.style.display = 'block'; hl.style.left = r.left + 'px'; hl.style.top = r.top + 'px'; hl.style.width = r.width + 'px'; hl.style.height = r.height + 'px';
    tip.textContent = preview(el); tip.style.display = 'block';
    tip.style.left = Math.min(e.clientX + 12, innerWidth - 12 - tip.offsetWidth) + 'px'; tip.style.top = (r.bottom + 4) + 'px';
  }, true);
  document.addEventListener('mouseup', () => { if (dragging) { dragging = null; syncState(); } }, true);

  // ---------- Ghi thao tac ----------
  document.addEventListener('contextmenu', (e) => {       // chuot phai -> menu "Choose action"
    if (paused || isUI(e.target)) return;                 // Rec off / tren UI -> menu trinh duyet binh thuong
    e.preventDefault(); menuTarget = e.target; showMenu(e.clientX, e.clientY);
  }, true);
  document.addEventListener('click', (e) => {
    var m = document.getElementById('__rec_menu');
    if (m && m.style.display === 'block' && !isUI(e.target)) { e.preventDefault(); e.stopPropagation(); hideMenu(); return; } // click ngoai -> dong menu, khong ghi
    if (isUI(e.target)) return;                          // bo qua toolbar/menu
    if (inspect) {                                       // che do inspect: chan action, log pick/assert
      e.preventDefault(); e.stopPropagation();
      const el = e.target, entry = buildEntry(el);
      if (inspect === 'pick') send(Object.assign({ type: 'pick' }, entry));
      else {
        const a = { type: 'assert', assert: inspect };
        if (inspect === 'text') a.text = visibleText(el);
        if (inspect === 'value') a.value = el.value != null ? el.value : '';
        send(Object.assign(a, entry));
      }
      setInspect(null);                                  // 1 lan roi ve che do ghi (giong codegen)
      return;
    }
    if (paused) return;
    send(Object.assign({ type: 'click' }, buildEntry(pick(e.target))));
  }, true);
  document.addEventListener('change', (e) => {
    if (isUI(e.target) || inspect || paused) return;
    const el = e.target; send(Object.assign({ type: el.tagName.toLowerCase() === 'select' ? 'select' : 'fill', value: el.value }, buildEntry(el)));
  }, true);
  document.addEventListener('keydown', (e) => {
    var mn = document.getElementById('__rec_menu');
    if (mn && mn.style.display === 'block') { if (e.key === 'Escape') { e.preventDefault(); hideMenu(); } return; }
    if (inspect) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setInspect(null); } return; }
    if (paused) return;
    if (['Enter', 'Tab', 'Escape'].includes(e.key)) send(Object.assign({ type: 'press', key: e.key }, buildEntry(pick(e.target))));
  }, true);
})();
