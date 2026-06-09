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
  if (window.__recInjected) return; // tranh inject 2 lan (addInitScript + re-inject du phong)
  window.__recInjected = true;
  const looksGenerated = (s) => !s ||
    /^(css|sc|jss|emotion|svelte|glamor|makeStyles)([-_]|\d)/i.test(s) || // jss378 / css-1a2 / sc-xxx (KHONG chan Mui-*)
    /__[a-z0-9]*\d[a-z0-9]*$/i.test(s) ||                 // CSS-modules: Block_el__h4sh (duoi co chu so)
    /[-_][0-9a-f]{5,}($|[-_])/i.test(s) ||                // doan hash hex sau dau gach
    /\d{4,}/.test(s);                                     // >=4 chu so lien tiep
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
    return (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' '); // full text (truoc cat 60 -> getByText/xpath.text exact khong khop)
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
  // Text LABEL "ben canh" 1 control: di len tung cap, xet anh em TRUOC co text ngan & khong chua control.
  // Dung cho form custom (id/class doi) -> neo selector theo text label thay vi id/class/vi tri.
  function fieldLabel(el) {
    var cur = el;
    // Di len nhieu cap (input co the nam RAT SAU trong "value cell"); dung som khi gap label.
    // Cum "label" thuong la ANH EM TRUOC cua cum "value": text ngan, khong chua control nhap lieu.
    for (var up = 0; up < 12 && cur && cur !== document.body; up++) {
      var sib = cur.previousElementSibling;
      while (sib) {
        var hasCtrl = sib.querySelector && sib.querySelector('input,textarea,select,button,a[href]');
        var t = (sib.innerText || sib.textContent || '').trim().replace(/\s+/g, ' ');
        if (t && t.length <= 40 && !hasCtrl) return t;
        sib = sib.previousElementSibling;
      }
      cur = cur.parentElement;
    }
    return null;
  }
  // String literal an toan cho XPath (xu ly dau nhay " va ').
  function xpLit(s) {
    if (s.indexOf('"') < 0) return '"' + s + '"';
    if (s.indexOf("'") < 0) return "'" + s + "'";
    return 'concat(' + s.split('"').map(function (p) { return '"' + p + '"'; }).join(",'\"',") + ')';
  }
  // Element DAU TIEN khop xpath (de KIEM CHUNG selector co tro dung element vua chon khong).
  function xfirst(xp) {
    try { return document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; } catch (e) { return null; }
  }
  // Cac "vung" bao el (modal/dialog/region/id-class on dinh) -> scope selector khi label trung ten o noi khac.
  // Uu tien tu trong ra: aria-modal/role/aria-label/id-on-dinh/class-on-dinh. (Vung gan el truoc.)
  function scopeXPaths(el) {
    var out = [], seen = {}, cur = el.parentElement, n = 0;
    function add(x) { if (!seen[x]) { seen[x] = 1; out.push(x); } }
    while (cur && cur !== document.documentElement && n < 60) {
      n++;
      var g = function (a) { return cur.getAttribute ? cur.getAttribute(a) : null; };
      if (g('aria-modal') === 'true') add("//*[@aria-modal='true']");
      var role = g('role'); if (role) add('//*[@role=' + xpLit(role) + ']');
      var al = g('aria-label'); if (al && al.length <= 60) add('//*[@aria-label=' + xpLit(al) + ']');
      if (cur.id && !looksGenerated(cur.id)) add('//*[@id=' + xpLit(cur.id) + ']');
      var cls = Array.prototype.slice.call(cur.classList || []).filter(function (c) { return !looksGenerated(c); });
      for (var j = 0; j < cls.length; j++) add("//*[contains(concat(' ',normalize-space(@class),' '),' " + cls[j] + " ')]");
      cur = cur.parentElement;
    }
    return out;
  }
  // Selector label-anchored DA KIEM CHUNG tro dung `el`: thu toan trang -> neu trung ten o noi khac
  // thi scope dan vao modal/vung bao el. Tra null neu khong cach nao tro dung el.
  function labelAnchored(el, tag, lab) {
    var lit = xpLit(lab);
    var tail = '[1]/ancestor-or-self::*[.//' + tag + '][1]/descendant::' + tag + '[1]';
    var base = '(//*[normalize-space()=' + lit + '])' + tail;
    if (xfirst(base) === el) return base;
    var scopes = scopeXPaths(el);
    for (var i = 0; i < scopes.length; i++) {
      var s = '(' + scopes[i] + '//*[normalize-space()=' + lit + '])' + tail;
      if (xfirst(s) === el) return s;
    }
    return null;
  }

  // === Xep hang selector — DUNG CHUNG cho auto-pick (click/fill/...) VA bang Pick ===
  // TRUST = do tin cay theo LOAI selector (so nho = tot hon). penalty = theo so khop + fragile.
  // Thu tu: n=1&ben < n=1&mong manh < n>1 < n<=0; cung nhom -> theo TRUST. Phan tu [0] = "de xuat".
  const TRUST = { testId: 0, 'css#id': 1, 'xpath@id': 1, role: 2, 'label→input': 3, placeholder: 4, label: 4, alt: 4, title: 4, 'css[name]': 5, 'css[href]': 6, text: 7, 'xpath.text': 7, 'css.class': 8, 'xpath@class': 8, cssPath: 9, xpathPath: 9 };
  const trustOf = (c) => (TRUST[c.kind] != null ? TRUST[c.kind] : 5);
  const penaltyOf = (c) => (c.n === 1 ? (c.fragile ? 1 : 0) : (c.n > 1 ? 2 : 3));
  const rankCands = (list) => list.slice().sort((a, b) => (penaltyOf(a) * 100 + trustOf(a)) - (penaltyOf(b) * 100 + trustOf(b)));

  // === (1) UNIQUE: cac ung vien tro dung 1 element + so khop (n) ===
  function uniqueCandidates(el) {
    const ti = testId(el), name = accName(el), role = roleOf(el);
    const tag = el.tagName.toLowerCase();
    const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
    const classes = Array.prototype.slice.call(el.classList || []).filter(function (c) { return !looksGenerated(c); });
    const out = [];
    // --- Playwright getBy* (ben) ---
    if (ti) { const c = '[' + ti.attr + '="' + ti.value + '"]'; out.push({ kind: 'testId', value: ti.attr === 'data-testid' ? "getByTestId('" + q(ti.value) + "')" : c, css: c }); }
    if (name && ['button', 'link', 'tab', 'menuitem', 'checkbox', 'radio', 'switch', 'option'].includes(role)) out.push({ kind: 'role', value: "getByRole('" + role + "', { name: '" + q(name) + "' })", roleName: true });
    const ph = el.getAttribute('placeholder'); if (ph) out.push({ kind: 'placeholder', value: "getByPlaceholder('" + q(ph) + "')", css: '[placeholder="' + ph + '"]' });
    const alt = el.getAttribute('alt'); if (alt) out.push({ kind: 'alt', value: "getByAltText('" + q(alt) + "')", css: '[alt="' + alt + '"]' });
    const ttl = el.getAttribute('title'); if (ttl) out.push({ kind: 'title', value: "getByTitle('" + q(ttl) + "')", css: '[title="' + ttl + '"]' });
    if (name && !isInput) out.push({ kind: 'text', value: "getByText('" + q(name) + "', { exact: true })", textName: true });
    // --- CSS (nhieu kieu) ---
    if (el.id && !looksGenerated(el.id)) out.push({ kind: 'css#id', value: '#' + CSS.escape(el.id), css: '#' + CSS.escape(el.id) });
    const nm = el.getAttribute('name'); if (nm && !looksGenerated(nm)) out.push({ kind: 'css[name]', value: tag + '[name="' + nm + '"]', css: tag + '[name="' + nm + '"]' });
    const href = el.getAttribute('href'); if (href && !/^#|^javascript:/i.test(href)) out.push({ kind: 'css[href]', value: tag + '[href="' + href + '"]', css: tag + '[href="' + href + '"]' });
    // --- Label-anchored: neo theo TEXT label roi tro sang control ke tiep. Dat SAU #id/[name] on dinh,
    //     nhung TRUOC .class/positional -> ben cho form custom (id/class doi moi lan).
    //     Chi cho o nhap TEXT/textarea/select (radio/checkbox da co getByRole lo). ---
    var itype = (el.getAttribute('type') || '').toLowerCase();
    var textLike = tag === 'textarea' || tag === 'select' || (tag === 'input' && ['', 'text', 'search', 'email', 'tel', 'url', 'password', 'number'].indexOf(itype) >= 0);
    if (textLike) {
      var lab = fieldLabel(el);
      // Neo TEXT label -> leo LEN cum cha chua control -> di XUONG control. DA KIEM CHUNG tro dung el;
      // neu label trung ten ngoai modal thi tu scope vao vung/modal bao el. null = bo qua (khong neo duoc).
      var lx = lab ? labelAnchored(el, tag, lab) : null;
      if (lx) out.push({ kind: 'label→input', value: lx });
    }
    if (classes.length) { const cc = tag + '.' + classes.map(function (x) { return CSS.escape(x); }).join('.'); out.push({ kind: 'css.class', value: cc, css: cc }); }
    out.push({ kind: 'cssPath', value: cssPath(el), css: cssPath(el), fragile: true }); // theo vi tri (mong manh)
    // --- XPath (nhieu kieu) ---
    if (el.id && !looksGenerated(el.id)) out.push({ kind: 'xpath@id', value: '//' + tag + '[@id="' + el.id + '"]' });
    if (classes.length) out.push({ kind: 'xpath@class', value: '//' + tag + '[contains(concat(" ",normalize-space(@class)," ")," ' + classes[0] + ' ")]' });
    if (name && !isInput) out.push({ kind: 'xpath.text', value: '//' + tag + '[normalize-space()="' + name + '"]' });
    out.push({ kind: 'xpathPath', value: xpath(el), fragile: true }); // tuyet doi theo vi tri (mong manh)
    // --- dem so khop + danh dau ---
    for (const s of out) {
      if (!s.fragile) s.fragile = false;
      if (/^\(*\//.test(s.value)) s.n = countXpath(s.value); // xpath: bat dau bang / // hoac (// (vd /html.., (//..)[1]/..)
      else if (s.css) s.n = countCss(s.css);
      else if (s.roleName) s.n = countRoleName(role, name);
      else if (s.textName) s.n = countText(name);
      else s.n = -1;
      delete s.css; delete s.roleName; delete s.textName;
    }
    return rankCands(out); // sort theo TRUST+so khop -> [0] = "de xuat" (auto-pick & bang Pick dung chung 1 thu hang)
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
  let paused = false, inspect = null, codeOpen = false, chooseMode = true, moreOpen = false, ui, hl, tip, dragging = null;
  const isUI = (el) => el && el.closest && (el.closest('#__rec_ui') || el.closest('#__rec_codebox') || el.closest('#__rec_menu') || el.closest('#__rec_picker') || el.closest('#__rec_csspick') || el.closest('#__rec_htmlpick'));
  window.__recRenderCode = (code) => { const p = document.getElementById('__rec_code'); if (p) p.textContent = code; };
  const bestUnique = (el) => { const c = uniqueCandidates(el); const u = c.find((s) => s.n === 1) || c[0]; return u ? u.value : ''; };
  // textContent (KHONG ap CSS text-transform) de KHOP voi toContainText cua Playwright (innerText bi in HOA do CSS -> lech).
  const visibleText = (el) => (el.textContent || el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80);

  function render() {
    if (!ui) return;
    const set = (id, on, col) => { const b = document.getElementById(id); if (b) b.style.background = on ? (col || '#ef4444') : '#374151'; };
    set('__rec_rec', !paused, '#16a34a');
    set('__rec_choose', chooseMode, '#16a34a');
    set('__rec_more', moreOpen, '#4b5563');
    set('__rec_pick', inspect === 'pick'); set('__rec_av', inspect === 'visible'); set('__rec_at', inspect === 'text'); set('__rec_aval', inspect === 'value'); set('__rec_acss', inspect === 'css'); set('__rec_ahtml', inspect === 'html');
    const l = document.getElementById('__rec_lbl');
    if (l) l.textContent = inspect ? (inspect + ': click element · Esc') : (paused ? 'tam dung' : ''); // gon: dang ghi -> de trong (nut ● mau xanh da bao)
    document.documentElement.style.cursor = inspect ? 'crosshair' : '';
    if (!inspect && hl) { hl.style.display = 'none'; tip.style.display = 'none'; }
  }
  function setInspect(k) { inspect = k; render(); }
  var menuTarget = null, menuX = 0, menuY = 0, pickerTarget = null, pickerAction = 'pick', pendingExtra = null, cssPickTarget = null, htmlPickTarget = null, htmlMode = 'outer';
  function showMenu(x, y) { var m = document.getElementById('__rec_menu'); if (!m) return; m.style.display = 'block'; m.style.left = Math.min(x, innerWidth - m.offsetWidth - 8) + 'px'; m.style.top = Math.min(y, innerHeight - m.offsetHeight - 8) + 'px'; }
  function hideMenu() { var m = document.getElementById('__rec_menu'); if (m) m.style.display = 'none'; menuTarget = null; }
  function chooseAction(kind) { var t = menuTarget, mx = menuX, my = menuY; hideMenu(); if (!t) return; if (chooseMode) { pickerAction = kind; pendingExtra = null; showPicker(t, mx, my); } else send(Object.assign({ type: kind }, buildEntry(t))); } // ON: bang chon · OFF: tu dong best
  // PICK LOCATOR: liet ke MOI selector chon duoc element -> user click cai muon dung (va copy)
  function showPicker(el, x, y) {
    var p = document.getElementById('__rec_picker'); if (!p) return;
    pickerTarget = el;
    var ttlEl = document.getElementById('__rec_picker_title');
    if (ttlEl) { var lbl = (pickerAction === 'assert' && pendingExtra) ? ('Assert ' + pendingExtra.assert) : ({ click: 'Click', rightclick: 'Right click', dblclick: 'Double click', hover: 'Hover', pick: 'Pick (lay locator)' }[pickerAction] || pickerAction); ttlEl.textContent = 'Chon selector de ' + lbl; }
    // === SELECTOR ELEMENT: uniqueCandidates() DA sort san theo TRUST+so khop (dong bo voi auto-pick khi click) ===
    var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
    var markOf = function (c) { return c.n === 1 ? (c.fragile ? '🔴 1 khop (mong manh)' : '✓ 1 khop') : (c.n > 1 ? '⚠ ' + c.n + ' khop' : (c.n === 0 ? '✗ 0 khop' : '? khong dem duoc')); };
    var cands = uniqueCandidates(el);                 // [0] = de xuat (cung thu hang voi luc click)
    var bestI = (cands.length && penaltyOf(cands[0]) === 0) ? 0 : -1;
    var html = '<div style="padding:5px 10px;color:#cbd5e1;font:11px sans-serif;background:#0b1220;border-bottom:1px solid #374151">SELECTOR CHO ELEMENT — sort theo do uy tin &amp; so khop</div>';
    html += cands.map(function (c, i) {
      var rec = (i === bestI) ? ' · <b style="color:#34d399">⭐ de xuat</b>' : '';
      return '<div class="__rec_pi" data-i="' + i + '" style="padding:7px 10px;border-radius:5px;cursor:pointer">' +
        '<span style="color:#9ca3af">[' + c.kind + ']</span> <code style="color:#a7f3d0">' + esc(c.value) + '</code>' +
        '<br><span style="font-size:11px;color:#9ca3af">' + markOf(c) + rec + '</span></div>';
    }).join('') || '<div style="padding:8px;color:#9ca3af">Khong co selector</div>';
    // === SELECTOR FAMILY (nhom item lap) — hien TACH BIET ben duoi ===
    var fam = findFamily(el);
    var famReal = (fam && fam.all) ? fam.all.filter(function (c) { return c.kind !== 'tag'; }) : [];
    if (famReal.length) {
      html += '<div style="padding:5px 10px;margin-top:4px;color:#fcd34d;font:11px sans-serif;background:#0b1220;border-top:2px solid #4b5563;border-bottom:1px solid #374151">FAMILY — nhom item lap → assertion "co trong list": <code style="color:#fde68a">locator(family).filter({hasText:\'…\'}).&lt;within&gt;</code></div>';
      html += famReal.map(function (c, j) {
        return '<div class="__rec_pf" data-f="' + j + '" style="padding:7px 10px;border-radius:5px;cursor:pointer">' +
          '<span style="color:#fcd34d">[family:' + c.kind + ']</span> <code style="color:#fde68a">' + esc(c.value) + '</code>' +
          '<br><span style="font-size:11px;color:#9ca3af">' + (c.n >= 2 ? '✓ ' + c.n + ' item' : (c.n + ' item')) + ' · within: <code style="color:#a7f3d0">' + esc(fam.within || ':scope') + '</code> · (click de copy)</span></div>';
      }).join('');
    }
    p.querySelector('#__rec_picker_body').innerHTML = html;
    p.style.display = 'block';
    p.style.left = Math.min(x || 80, innerWidth - p.offsetWidth - 8) + 'px';
    p.style.top = Math.min(y || 80, innerHeight - p.offsetHeight - 8) + 'px';
    Array.prototype.forEach.call(p.querySelectorAll('.__rec_pi'), function (row) {
      row.addEventListener('mouseenter', function () { row.style.background = '#374151'; });
      row.addEventListener('mouseleave', function () { row.style.background = ''; });
      row.addEventListener('click', function (e) { e.stopPropagation(); choosePicker(cands[+row.getAttribute('data-i')]); });
    });
    Array.prototype.forEach.call(p.querySelectorAll('.__rec_pf'), function (row) {
      row.addEventListener('mouseenter', function () { row.style.background = '#374151'; });
      row.addEventListener('mouseleave', function () { row.style.background = ''; });
      row.addEventListener('click', function (e) {
        e.stopPropagation();
        try { navigator.clipboard.writeText(famReal[+row.getAttribute('data-f')].value); } catch (x) {}
        var t = document.getElementById('__rec_picker_title'); if (t) { var o = t.textContent; t.textContent = 'Da copy family selector ✔'; setTimeout(function () { t.textContent = o; }, 900); }
      });
    });
  }
  function hidePicker() { var p = document.getElementById('__rec_picker'); if (p) p.style.display = 'none'; pickerTarget = null; }
  function choosePicker(c) {
    var el = pickerTarget, act = pickerAction, extra = pendingExtra; hidePicker();
    if (!el || !c) return;
    try { navigator.clipboard && navigator.clipboard.writeText(c.value); } catch (x) {}
    var a = Object.assign({ type: act, chosenKind: c.kind, chosenValue: c.value }, buildEntry(el));
    if (act === 'assert' && extra) { a.assert = extra.assert; if (extra.text != null) a.text = extra.text; if (extra.value != null) a.value = extra.value; if (extra.cssProp) a.cssProp = extra.cssProp; }
    send(a);
  }
  // === ASSERT CSS: liet ke thuoc tinh CSS (computed) cua element -> chon 1 cai de sinh toHaveCSS ===
  var CSS_PROPS = ['text-transform', 'color', 'background-color', 'font-size', 'font-weight', 'font-family', 'text-align', 'display', 'visibility', 'opacity', 'text-decoration-line', 'border'];
  function showCssPick(el, x, y) {
    var p = document.getElementById('__rec_csspick'); if (!p) return;
    cssPickTarget = el;
    var cs = getComputedStyle(el);
    var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
    p.querySelector('#__rec_csspick_body').innerHTML = CSS_PROPS.map(function (prop) {
      var v = cs.getPropertyValue(prop).trim();
      return '<div class="__rec_csr" data-prop="' + esc(prop) + '" data-val="' + esc(v) + '" style="padding:7px 10px;border-radius:5px;cursor:pointer"><span style="color:#9ca3af">' + prop + ':</span> <code style="color:#a7f3d0">' + (esc(v) || '(rong)') + '</code></div>';
    }).join('');
    p.style.display = 'block';
    p.style.left = Math.min(x || 80, innerWidth - p.offsetWidth - 8) + 'px';
    p.style.top = Math.min(y || 80, innerHeight - p.offsetHeight - 8) + 'px';
    Array.prototype.forEach.call(p.querySelectorAll('.__rec_csr'), function (row) {
      row.addEventListener('mouseenter', function () { row.style.background = '#374151'; });
      row.addEventListener('mouseleave', function () { row.style.background = ''; });
      row.addEventListener('click', function (e) {
        e.stopPropagation();
        var prop = row.getAttribute('data-prop'), val = row.getAttribute('data-val'), t = cssPickTarget; hideCssPick();
        if (!t) return;
        if (chooseMode) { pickerAction = 'assert'; pendingExtra = { assert: 'css', cssProp: prop, value: val }; showPicker(t, e.clientX, e.clientY); } // ON: chon them selector
        else send(Object.assign({ type: 'assert', assert: 'css', cssProp: prop, value: val }, buildEntry(t)));                                       // OFF: best selector
      });
    });
  }
  function hideCssPick() { var p = document.getElementById('__rec_csspick'); if (p) p.style.display = 'none'; cssPickTarget = null; }
  // === LAY HTML: hien outerHTML/innerHTML cua element + auto-copy clipboard (cong cu INSPECT, KHONG sinh test step) ===
  function htmlText() { var t = htmlPickTarget; if (!t) return ''; return htmlMode === 'inner' ? (t.innerHTML || '') : (t.outerHTML || ''); }
  function copyHtml() { try { navigator.clipboard && navigator.clipboard.writeText(htmlText()); } catch (x) {} }
  function renderHtmlBody() {
    var p = document.getElementById('__rec_htmlpick'); if (!p) return;
    var raw = htmlText(), esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    var mb = document.getElementById('__rec_html_mode'); if (mb) mb.textContent = htmlMode === 'inner' ? 'innerHTML' : 'outerHTML';
    p.querySelector('#__rec_htmlpick_body').innerHTML =
      '<div style="padding:4px 10px;color:#9ca3af;font:11px sans-serif;background:#0b1220;border-bottom:1px solid #374151">' + (htmlMode === 'inner' ? 'innerHTML' : 'outerHTML') + ' · ' + raw.length + ' ky tu · da copy clipboard</div>' +
      '<pre style="margin:0;padding:8px;font:12px/1.5 monospace;white-space:pre-wrap;word-break:break-all;color:#d1fae5">' + (esc(raw) || '(rong)') + '</pre>';
  }
  function showHtmlPick(el, x, y) {
    var p = document.getElementById('__rec_htmlpick'); if (!p) return;
    htmlPickTarget = el; htmlMode = 'outer';
    renderHtmlBody(); copyHtml();
    p.style.display = 'block';
    p.style.left = Math.min(x || 80, innerWidth - p.offsetWidth - 8) + 'px';
    p.style.top = Math.min(y || 80, innerHeight - p.offsetHeight - 8) + 'px';
  }
  function hideHtmlPick() { var p = document.getElementById('__rec_htmlpick'); if (p) p.style.display = 'none'; htmlPickTarget = null; }
  function syncState() { try { window.__recSetState && window.__recSetState({ paused: paused, codeOpen: codeOpen, chooseMode: chooseMode, more: moreOpen, pos: ui ? { left: ui.style.left, top: ui.style.top } : null }); } catch (e) {} }
  function showCode(v) { codeOpen = v; const b = document.getElementById('__rec_codebox'); if (b) b.style.display = v ? 'block' : 'none'; }
  function showExtra(v) { // nhom tool phu (assert/shot)
    moreOpen = v;
    // Khi MO: neu toolbar dang can giua (transform translateX) -> co dinh left hien tai de no ra PHAI, khong bi day lai giua.
    if (v && ui && /translateX/.test(ui.style.transform || '')) { const r = ui.getBoundingClientRect(); ui.style.left = r.left + 'px'; ui.style.top = r.top + 'px'; ui.style.transform = 'none'; }
    const e = document.getElementById('__rec_extra'); if (e) e.style.display = v ? 'inline-flex' : 'none';
  }
  function applyState(s) {
    if (!s) return;
    paused = !!s.paused;
    if (s.pos && s.pos.left && ui) { ui.style.left = s.pos.left; ui.style.top = s.pos.top; ui.style.transform = 'none'; }
    showCode(!!s.codeOpen);
    showExtra(!!s.more);
    if (typeof s.chooseMode === 'boolean') chooseMode = s.chooseMode;
    if (typeof s.code === 'string') window.__recRenderCode(s.code);
    render();
  }
  function togglePause() { paused = !paused; render(); syncState(); }
  function setChoose(v) { chooseMode = v; render(); syncState(); } // ON = hien list selector · OFF = tu dong lay best
  window.__recToggleChoose = () => setChoose(!chooseMode);
  window.__recSetInspect = setInspect;                                        // cho test/keyboard
  window.__recTogglePick = () => setInspect(inspect === 'pick' ? null : 'pick');
  window.__recTogglePause = togglePause;

  // Cho phep KEO `target` bang `handle` (vd keo header de di chuyen ca panel). Dung chung: toolbar, picker, csspick.
  function makeDrag(handle, target) {
    if (!handle) return;
    handle.addEventListener('mousedown', function (e) {
      if (e.target && e.target.id && /_x$/.test(e.target.id)) return; // bo qua nut × (dong) -> khong keo
      if (e.target && e.target.tagName === 'BUTTON') return;          // bo qua nut trong header (mode/copy) -> khong keo
      e.preventDefault();
      var r = target.getBoundingClientRect();
      dragging = { el: target, dx: e.clientX - r.left, dy: e.clientY - r.top };
    });
  }

  function ensureUI() {
    if (ui || !document.body) return;
    const IC = 'cursor:pointer;border:0;border-radius:6px;padding:5px 0;min-width:32px;text-align:center;background:#374151;color:#fff;font:16px/1 sans-serif';
    ui = document.createElement('div'); ui.id = '__rec_ui';
    ui.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;gap:6px;align-items:center;white-space:nowrap;background:#1f2937;color:#fff;padding:6px 8px;border-radius:8px;font:12px/1.4 sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.35)';
    ui.innerHTML =
      '<span id="__rec_drag" title="Keo de di chuyen toolbar" style="cursor:move;padding:0 3px;color:#9ca3af">☰</span>' +
      '<button id="__rec_rec"  title="Bat/tat ghi (Record)" style="' + IC + '">●</button>' +
      '<button id="__rec_choose" title="List Selector — ON: hien bang chon selector · OFF: tu lay selector tot nhat" style="' + IC + '">📋</button>' +
      '<button id="__rec_pick" title="Pick locator — lay selector cua 1 element" style="' + IC + '">🎯</button>' +
      '<button id="__rec_more" title="Them cong cu (Assert / Screenshot)" style="' + IC + '">⋯</button>' +
      '<span id="__rec_extra" style="display:none;gap:6px;align-items:center">' +
        '<button id="__rec_av"   title="Assert visible — kiem tra element co hien thi" style="' + IC + '">👁</button>' +
        '<button id="__rec_at"   title="Assert text — kiem tra noi dung text (toContainText)" style="' + IC + '">🔤</button>' +
        '<button id="__rec_aval" title="Assert value — kiem tra gia tri input (toHaveValue)" style="' + IC + '">=</button>' +
        '<button id="__rec_acss" title="Assert CSS — kiem tra thuoc tinh CSS nhu text-transform (toHaveCSS)" style="' + IC + '">🎨</button>' +
        '<button id="__rec_ahtml" title="Lay HTML cua element (outerHTML/innerHTML) -> copy clipboard" style="' + IC + '">&lt;/&gt;</button>' +
        '<button id="__rec_shot" title="Chup anh man hinh (full page)" style="' + IC + '">📷</button>' +
      '</span>' +
      '<span id="__rec_lbl" style="margin-left:2px;white-space:nowrap;color:#9ca3af;font:11px sans-serif"></span>';
    document.body.appendChild(ui);
    const on = (id, fn) => document.getElementById(id).addEventListener('click', (e) => { e.stopPropagation(); fn(); });
    on('__rec_rec', togglePause);
    on('__rec_choose', () => setChoose(!chooseMode));
    on('__rec_pick', () => setInspect(inspect === 'pick' ? null : 'pick'));
    on('__rec_av', () => setInspect(inspect === 'visible' ? null : 'visible'));
    on('__rec_at', () => setInspect(inspect === 'text' ? null : 'text'));
    on('__rec_aval', () => setInspect(inspect === 'value' ? null : 'value'));
    on('__rec_acss', () => setInspect(inspect === 'css' ? null : 'css')); // assert CSS
    on('__rec_ahtml', () => setInspect(inspect === 'html' ? null : 'html')); // lay HTML element
    on('__rec_shot', () => { if (window.__shot) window.__shot(); }); // chup screenshot (Node xu ly)
    on('__rec_more', () => { showExtra(!moreOpen); syncState(); }); // mo/dong nhom tool phu
    makeDrag(document.getElementById('__rec_drag'), ui);

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

    var picker = document.createElement('div'); picker.id = '__rec_picker';
    picker.style.cssText = 'position:fixed;z-index:2147483647;background:#1f2937;color:#fff;border:1px solid #374151;border-radius:8px;display:none;font:12px sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.55);min-width:420px;max-width:72vw;max-height:60vh;overflow:auto';
    picker.innerHTML = '<div id="__rec_picker_hdr" style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:#111827;color:#9ca3af;position:sticky;top:0;cursor:move"><span><b id="__rec_picker_title">Chon selector</b> (click de dung) · keo de di chuyen</span><span id="__rec_picker_x" style="cursor:pointer;font-size:16px">×</span></div><div id="__rec_picker_body"></div>';
    document.body.appendChild(picker);
    document.getElementById('__rec_picker_x').addEventListener('click', function (e) { e.stopPropagation(); hidePicker(); });

    var csspick = document.createElement('div'); csspick.id = '__rec_csspick';
    csspick.style.cssText = 'position:fixed;z-index:2147483647;background:#1f2937;color:#fff;border:1px solid #374151;border-radius:8px;display:none;font:12px sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.55);min-width:300px;max-width:60vw;max-height:60vh;overflow:auto';
    csspick.innerHTML = '<div id="__rec_csspick_hdr" style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:#111827;color:#9ca3af;position:sticky;top:0;cursor:move"><span><b>Chon thuoc tinh CSS</b> -> toHaveCSS · keo de di chuyen</span><span id="__rec_csspick_x" style="cursor:pointer;font-size:16px">×</span></div><div id="__rec_csspick_body"></div>';
    document.body.appendChild(csspick);
    document.getElementById('__rec_csspick_x').addEventListener('click', function (e) { e.stopPropagation(); hideCssPick(); });

    var htmlpick = document.createElement('div'); htmlpick.id = '__rec_htmlpick';
    htmlpick.style.cssText = 'position:fixed;z-index:2147483647;background:#1f2937;color:#fff;border:1px solid #374151;border-radius:8px;display:none;font:12px sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.55);min-width:340px;max-width:72vw;max-height:62vh;overflow:auto';
    htmlpick.innerHTML = '<div id="__rec_htmlpick_hdr" style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 10px;background:#111827;color:#9ca3af;position:sticky;top:0;cursor:move"><span><b>HTML cua element</b> · keo de di chuyen</span><span style="display:flex;gap:6px;align-items:center"><button id="__rec_html_mode" title="Chuyen outerHTML / innerHTML" style="cursor:pointer;border:0;border-radius:5px;padding:2px 9px;background:#374151;color:#fff;font:11px sans-serif">outerHTML</button><button id="__rec_html_copy" style="cursor:pointer;border:0;border-radius:5px;padding:2px 9px;background:#374151;color:#fff;font:11px sans-serif">Copy</button><span id="__rec_htmlpick_x" style="cursor:pointer;font-size:16px">×</span></span></div><div id="__rec_htmlpick_body"></div>';
    document.body.appendChild(htmlpick);
    document.getElementById('__rec_htmlpick_x').addEventListener('click', function (e) { e.stopPropagation(); hideHtmlPick(); });
    document.getElementById('__rec_html_mode').addEventListener('click', function (e) { e.stopPropagation(); htmlMode = htmlMode === 'inner' ? 'outer' : 'inner'; renderHtmlBody(); copyHtml(); });
    document.getElementById('__rec_html_copy').addEventListener('click', function (e) { e.stopPropagation(); copyHtml(); var b = document.getElementById('__rec_html_copy'); if (b) { var o = b.textContent; b.textContent = 'Da copy ✔'; setTimeout(function () { b.textContent = o; }, 900); } });

    makeDrag(document.getElementById('__rec_picker_hdr'), picker);   // keo bang chon selector
    makeDrag(document.getElementById('__rec_csspick_hdr'), csspick); // keo bang chon CSS
    makeDrag(document.getElementById('__rec_htmlpick_hdr'), htmlpick); // keo bang HTML
    render();
    if (window.__recGetState) window.__recGetState().then(applyState).catch(function () {}); // khoi phuc trang thai sau khi chuyen trang
    // App SPA hay re-render document.body -> toolbar (con cua body) bi xoa. Tu GAN LAI khi mat.
    var reattach = function () {
      if (document.body && ui && !document.getElementById('__rec_ui')) {
        [ui, hl, tip, box, menu, picker, csspick, htmlpick].forEach(function (nd) { if (nd) document.body.appendChild(nd); });
        render();
      }
    };
    try { new MutationObserver(reattach).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureUI); else ensureUI();

  function preview(el) {
    const loc = bestUnique(el);
    if (inspect === 'visible') return 'toBeVisible() <- ' + loc;
    if (inspect === 'text') return "toContainText('" + visibleText(el).slice(0, 40) + "')";
    if (inspect === 'value') return "toHaveValue('" + (el.value != null ? String(el.value).slice(0, 40) : '') + "')";
    if (inspect === 'css') return 'toHaveCSS(...) <- ' + loc;
    if (inspect === 'html') return '</> lay HTML cua <' + el.tagName.toLowerCase() + '> -> copy';
    return loc;
  }
  document.addEventListener('mousemove', (e) => {
    if (dragging) { var dt = dragging.el; dt.style.left = (e.clientX - dragging.dx) + 'px'; dt.style.top = (e.clientY - dragging.dy) + 'px'; if (dt === ui) dt.style.transform = 'none'; return; }
    if (!inspect || isUI(e.target)) { if (hl) { hl.style.display = 'none'; tip.style.display = 'none'; } return; }
    const el = e.target, r = el.getBoundingClientRect();
    hl.style.display = 'block'; hl.style.left = r.left + 'px'; hl.style.top = r.top + 'px'; hl.style.width = r.width + 'px'; hl.style.height = r.height + 'px';
    tip.textContent = preview(el); tip.style.display = 'block';
    tip.style.left = Math.min(e.clientX + 12, innerWidth - 12 - tip.offsetWidth) + 'px'; tip.style.top = (r.bottom + 4) + 'px';
  }, true);
  document.addEventListener('mouseup', () => { if (dragging) { var wasUI = dragging.el === ui; dragging = null; if (wasUI) syncState(); } }, true); // chi luu vi tri toolbar

  // ---------- Ghi thao tac ----------
  document.addEventListener('contextmenu', (e) => {       // chuot phai -> menu "Choose action"
    if (paused || isUI(e.target)) return;                 // Rec off / tren UI -> menu trinh duyet binh thuong
    e.preventDefault(); menuTarget = e.target; menuX = e.clientX; menuY = e.clientY; showMenu(e.clientX, e.clientY);
  }, true);
  document.addEventListener('click', (e) => {
    var pk = document.getElementById('__rec_picker'), m = document.getElementById('__rec_menu'), cp = document.getElementById('__rec_csspick'), hp = document.getElementById('__rec_htmlpick');
    if (hp && hp.style.display === 'block' && !isUI(e.target)) { e.preventDefault(); e.stopPropagation(); hideHtmlPick(); return; } // click ngoai -> dong htmlpick
    if (cp && cp.style.display === 'block' && !isUI(e.target)) { e.preventDefault(); e.stopPropagation(); hideCssPick(); return; } // click ngoai -> dong csspick
    if (pk && pk.style.display === 'block' && !isUI(e.target)) { e.preventDefault(); e.stopPropagation(); hidePicker(); return; } // click ngoai -> dong picker
    if (m && m.style.display === 'block' && !isUI(e.target)) { e.preventDefault(); e.stopPropagation(); hideMenu(); return; }     // click ngoai -> dong menu
    if (isUI(e.target)) return;                          // bo qua toolbar/menu/picker
    if (inspect) {                                       // che do inspect (Pick/Assert tu toolbar)
      e.preventDefault(); e.stopPropagation();
      var iel = e.target, mode = inspect;
      setInspect(null);
      if (mode === 'pick') {
        if (chooseMode) { pickerAction = 'pick'; pendingExtra = null; showPicker(iel, e.clientX, e.clientY); }
        else send(Object.assign({ type: 'pick' }, buildEntry(iel)));            // OFF: tu dong lay best
      } else if (mode === 'css') {
        showCssPick(iel, e.clientX, e.clientY);                                  // chon thuoc tinh CSS -> toHaveCSS
      } else if (mode === 'html') {
        showHtmlPick(iel, e.clientX, e.clientY);                                 // lay outerHTML/innerHTML -> copy
      } else {
        if (chooseMode) { pickerAction = 'assert'; pendingExtra = { assert: mode }; if (mode === 'text') pendingExtra.text = visibleText(iel); if (mode === 'value') pendingExtra.value = iel.value != null ? iel.value : ''; showPicker(iel, e.clientX, e.clientY); }
        else { var aa = { type: 'assert', assert: mode }; if (mode === 'text') aa.text = visibleText(iel); if (mode === 'value') aa.value = iel.value != null ? iel.value : ''; send(Object.assign(aa, buildEntry(iel))); }
      }
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
    var hp = document.getElementById('__rec_htmlpick');
    if (hp && hp.style.display === 'block') { if (e.key === 'Escape') { e.preventDefault(); hideHtmlPick(); } return; }
    var cp = document.getElementById('__rec_csspick');
    if (cp && cp.style.display === 'block') { if (e.key === 'Escape') { e.preventDefault(); hideCssPick(); } return; }
    var pk = document.getElementById('__rec_picker');
    if (pk && pk.style.display === 'block') { if (e.key === 'Escape') { e.preventDefault(); hidePicker(); } return; }
    var mn = document.getElementById('__rec_menu');
    if (mn && mn.style.display === 'block') { if (e.key === 'Escape') { e.preventDefault(); hideMenu(); } return; }
    if (inspect) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setInspect(null); } return; }
    if (paused) return;
    if (['Enter', 'Tab', 'Escape'].includes(e.key)) send(Object.assign({ type: 'press', key: e.key }, buildEntry(pick(e.target))));
  }, true);
})();
