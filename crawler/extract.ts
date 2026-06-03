// =============================================================================
//  Quet element + sinh selector ung vien.
//  Ham nay chay TRONG trinh duyet (page.evaluate) -> chi dung DOM API,
//  khong dung bien/import ben ngoai.
// =============================================================================

export interface CatalogElement {
  tag: string;
  role: string;
  name: string;
  testid: string | null;
  id: string | null;
  attrs: Record<string, string | null>;
  /** Locator Playwright goi y (uu tien: testid > role+name > label/placeholder > id > text). */
  suggestedLocator: string;
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
    '[onclick]', '[contenteditable=""]', '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  function isVisible(el: Element): boolean {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
  }

  // Doan chuoi co ve sinh tu dong (hash, css-modules, emotion...) -> khong dung lam selector.
  function looksGenerated(s: string): boolean {
    if (!s) return true;
    if (/^(css|sc|jss|emotion|Mui)[-_]/.test(s)) return true;
    if (/[-_][0-9a-f]{6,}($|[-_])/i.test(s)) return true;
    if (/\d{4,}/.test(s)) return true;
    return false;
  }

  function getTestId(el: Element): string | null {
    for (const a of ['data-testid', 'data-test', 'data-test-id', 'data-cy', 'data-qa']) {
      const v = el.getAttribute(a);
      if (v) return v;
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

    const txt = (el as HTMLElement).innerText || el.textContent || '';
    return txt.trim().replace(/\s+/g, ' ').slice(0, 80);
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

  function q(s: string): string {
    return s.replace(/'/g, "\\'");
  }

  function suggest(el: Element, testid: string | null, name: string, role: string): string {
    if (testid) return `getByTestId('${q(testid)}')`;

    const NAMED_ROLES = ['button', 'link', 'tab', 'menuitem', 'checkbox', 'radio', 'switch'];
    if (name && NAMED_ROLES.includes(role)) {
      return `getByRole('${role}', { name: '${q(name)}' })`;
    }

    const tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      const ph = el.getAttribute('placeholder');
      if (ph) return `getByPlaceholder('${q(ph)}')`;
      if (name) return `getByLabel('${q(name)}')`;
      const nm = el.getAttribute('name');
      if (nm && !looksGenerated(nm)) return `locator('${tag}[name="${nm}"]')`;
    }

    if (el.id && !looksGenerated(el.id)) return `locator('#${CSS.escape(el.id)}')`;
    if (name) return `getByText('${q(name)}')`;
    return `locator('${tag}')`;
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
      testid,
      id: el.id && !looksGenerated(el.id) ? el.id : null,
      attrs: {
        type: el.getAttribute('type'),
        name: el.getAttribute('name'),
        placeholder: el.getAttribute('placeholder'),
        ariaLabel: el.getAttribute('aria-label'),
        href: el.getAttribute('href'),
      },
      suggestedLocator: suggest(el, testid, name, role),
    });
  }

  return { url: location.href, title: document.title, count: elements.length, elements };
}
