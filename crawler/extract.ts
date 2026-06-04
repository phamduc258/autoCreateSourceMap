// =============================================================================
//  Quet element + sinh DANH SACH ung vien selector (theo thu tu uu tien).
//  Ham nay chay TRONG trinh duyet (page.evaluate) -> chi dung DOM API.
//  Viec KIEM CHUNG (locator khop dung 1 element) lam o phia Node (crawl.ts),
//  vi can goi API Playwright getByRole/getByLabel... -> khong lam duoc o day.
// =============================================================================

export type Candidate =
  | { type: 'testid'; value: string }
  | { type: 'role'; role: string; name: string }
  | { type: 'label'; value: string }
  | { type: 'placeholder'; value: string }
  | { type: 'text'; value: string }
  | { type: 'css'; value: string };

export interface CatalogElement {
  tag: string;
  role: string;
  name: string;
  testid: string | null;
  /** Ung vien selector, xep theo do uu tien (testid > role+name > label/placeholder > id > text). */
  candidates: Candidate[];
}

export interface Catalog {
  url: string;
  title: string;
  count: number;
  elements: CatalogElement[];
}

export function extractCatalog(): Catalog {
  const INTERACTIVE = [
    'a[href]', 'button', 'input', 'select', 'textarea', 'summary',
    '[role="button"]', '[role="link"]', '[role="tab"]', '[role="menuitem"]',
    '[role="checkbox"]', '[role="radio"]', '[role="switch"]', '[role="combobox"]',
    '[role="option"]', '[onclick]', '[contenteditable=""]', '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])',
    // Element duoc gan testid (du khong co href/role) -> thuong la muc tieu test.
    '[data-testid]', '[data-test]', '[data-test-id]', '[data-cy]', '[data-qa]',
  ].join(',');

  // Role co the dat ten -> hop voi getByRole({name}).
  const NAMED = new Set(['button', 'link', 'tab', 'menuitem', 'menuitemcheckbox',
    'menuitemradio', 'checkbox', 'radio', 'switch', 'option', 'treeitem']);
  // Role hop le khac (co the khong co ten, vd row/cell).
  const VALID = new Set([...NAMED, 'textbox', 'searchbox', 'combobox', 'spinbutton',
    'slider', 'row', 'cell', 'columnheader', 'rowheader', 'heading', 'listitem']);

  function isVisible(el: Element): boolean {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
  }

  // Chuoi co ve sinh tu dong (hash, css-modules, emotion...) -> khong dung lam selector.
  function looksGenerated(s: string): boolean {
    if (!s) return true;
    if (/^(css|sc|jss|emotion|svelte|glamor)[-_]/i.test(s)) return true; // KHONG chan Mui-* (class on dinh)
    if (/__[a-z0-9]*\d[a-z0-9]*$/i.test(s)) return true;                 // CSS-modules: ...__h4sh
    if (/[-_][0-9a-f]{5,}($|[-_])/i.test(s)) return true;
    if (/\d{4,}/.test(s)) return true;
    return false;
  }

  function getTestId(el: Element): { attr: string; value: string } | null {
    for (const a of ['data-testid', 'data-test', 'data-test-id', 'data-cy', 'data-qa']) {
      const v = el.getAttribute(a);
      if (v) return { attr: a, value: v };
    }
    return null;
  }

  function accessibleName(el: Element): string {
    const aria = el.getAttribute('aria-label');
    if (aria) return aria.trim();

    const labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
      const t = labelledby.split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' ').trim();
      if (t) return t.replace(/\s+/g, ' ');
    }

    if (el.id) {
      const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lab?.textContent) return lab.textContent.trim().replace(/\s+/g, ' ');
    }

    const wrap = el.closest('label');
    if (wrap?.textContent) return wrap.textContent.trim().replace(/\s+/g, ' ');

    const ph = el.getAttribute('placeholder');
    if (ph) return ph.trim();

    if (el.tagName.toLowerCase() === 'select') return ''; // tranh ghep het text cac option lam "ten"
    const txt = (el as HTMLElement).innerText || el.textContent || '';
    return txt.trim().replace(/\s+/g, ' '); // full text (truoc cat 80 -> text selector khong khop voi text dai)
  }

  function getRole(el: Element): string {
    const explicit = el.getAttribute('role');
    if (explicit) return explicit;
    const tag = el.tagName.toLowerCase();
    if (tag === 'a' && el.getAttribute('href')) return 'link';
    if (tag === 'button' || tag === 'summary') return 'button';
    if (tag === 'select') return 'combobox';
    if (tag === 'textarea') return 'textbox';
    if (tag === 'input') {
      const t = (el.getAttribute('type') || 'text').toLowerCase();
      const map: Record<string, string> = {
        checkbox: 'checkbox', radio: 'radio', submit: 'button', button: 'button',
        search: 'searchbox', number: 'spinbutton', range: 'slider',
      };
      return map[t] || 'textbox';
    }
    return tag;
  }

  function buildCandidates(el: Element, testid: { attr: string; value: string } | null, name: string, role: string): Candidate[] {
    const out: Candidate[] = [];
    const tag = el.tagName.toLowerCase();
    const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

    if (testid) {
      // getByTestId mac dinh dung 'data-testid'. Neu app dung 'data-test'/'data-cy'... -> CSS attribute cho chac.
      if (testid.attr === 'data-testid') out.push({ type: 'testid', value: testid.value });
      else out.push({ type: 'css', value: `[${testid.attr}="${testid.value}"]` });
    }

    if (name && NAMED.has(role)) out.push({ type: 'role', role, name });

    if (isInput) {
      const ph = el.getAttribute('placeholder');
      if (ph) out.push({ type: 'placeholder', value: ph });
      if (name) out.push({ type: 'label', value: name });
      const nm = el.getAttribute('name');
      if (nm && !looksGenerated(nm)) out.push({ type: 'css', value: `${tag}[name="${nm}"]` });
    }

    if (name && VALID.has(role) && !NAMED.has(role) && !isInput) {
      out.push({ type: 'role', role, name });
    }

    if (el.id && !looksGenerated(el.id)) out.push({ type: 'css', value: `#${CSS.escape(el.id)}` });

    if (name && !isInput && (NAMED.has(role) || tag === 'a' || tag === 'button')) {
      out.push({ type: 'text', value: name });
    }

    if (out.length === 0) {
      if (name) out.push({ type: 'text', value: name });
      else out.push({ type: 'css', value: tag });
    }
    return out;
  }

  const seen = new Set<Element>();
  const elements: CatalogElement[] = [];

  for (const el of Array.from(document.querySelectorAll(INTERACTIVE))) {
    if (seen.has(el)) continue;
    seen.add(el);
    if (!isVisible(el)) continue;

    const testid = getTestId(el);
    const name = accessibleName(el);
    const role = getRole(el);

    elements.push({
      tag: el.tagName.toLowerCase(),
      role,
      name,
      testid: testid ? testid.value : null,
      candidates: buildCandidates(el, testid, name, role),
    });
  }

  return { url: location.href, title: document.title, count: elements.length, elements };
}
