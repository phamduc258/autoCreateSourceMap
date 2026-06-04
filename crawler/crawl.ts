// =============================================================================
//  TOOL LAY DOM (ban nang cap: VERIFY selector + output 2 tang gon)
//  - Dang nhap 1 lan (luu storageState de tai dung)
//  - Truy cap tung URL trong config, quet element + sinh ung vien selector
//  - VERIFY: moi locator chay thu tren trang that, chi giu cai khop DUNG 1 element
//  - Chi click cac action duoc khai bao (an toan)
//
//  Output 2 tang (AI chi can doc tang phu hop -> input nho):
//    output/index.md            <- TANG 1: moi man 1 dong (id/url/title). Vai KB.
//    output/screens/<id>.md     <- TANG 2: bang selector gon cua 1 man (1 dong/element)
//    output/raw/<id>/...        <- tham khao chi tiet (catalog.json, a11y.yaml, dom.html, anh)
//
//  Chay:  npm run crawl          (dung phien da luu neu co)
//         npm run relogin        (bo phien cu, dang nhap lai)
// =============================================================================

import 'dotenv/config';
import { chromium, type Browser, type Page, type Locator } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { extractCatalog, type Candidate } from './extract.js';

const OUT = path.resolve(process.cwd(), config.output);
const AUTH_FILE = path.join(OUT, '.auth', 'state.json');
const FORCE_LOGIN = process.argv.includes('--relogin');

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}
async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}
function abs(url: string): string {
  return new URL(url, config.baseUrl).href;
}
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '<svg></svg>')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

// --- KIEM CHUNG SELECTOR ----------------------------------------------------

interface Attempt { loc: Locator; str: string; }

// Tu 1 ung vien -> cac cach goi locator cu the de thu (uu tien exact truoc).
function attemptsFor(page: Page, c: Candidate): Attempt[] {
  switch (c.type) {
    case 'testid':
      return [{ loc: page.getByTestId(c.value), str: `getByTestId('${esc(c.value)}')` }];
    case 'role':
      if (!c.name) return [{ loc: page.getByRole(c.role as any), str: `getByRole('${c.role}')` }];
      return [
        { loc: page.getByRole(c.role as any, { name: c.name, exact: true }), str: `getByRole('${c.role}', { name: '${esc(c.name)}', exact: true })` },
        { loc: page.getByRole(c.role as any, { name: c.name }), str: `getByRole('${c.role}', { name: '${esc(c.name)}' })` },
      ];
    case 'label':
      return [
        { loc: page.getByLabel(c.value, { exact: true }), str: `getByLabel('${esc(c.value)}', { exact: true })` },
        { loc: page.getByLabel(c.value), str: `getByLabel('${esc(c.value)}')` },
      ];
    case 'placeholder':
      return [
        { loc: page.getByPlaceholder(c.value, { exact: true }), str: `getByPlaceholder('${esc(c.value)}', { exact: true })` },
        { loc: page.getByPlaceholder(c.value), str: `getByPlaceholder('${esc(c.value)}')` },
      ];
    case 'text':
      return [
        { loc: page.getByText(c.value, { exact: true }), str: `getByText('${esc(c.value)}', { exact: true })` },
        { loc: page.getByText(c.value), str: `getByText('${esc(c.value)}')` },
      ];
    case 'css':
      return [{ loc: page.locator(c.value), str: `locator('${esc(c.value)}')` }];
  }
}

interface Verified { locator: string; unique: boolean; matchCount: number; }

// Thu lan luot cac ung vien; giu cai dau tien khop DUNG 1. Neu khong co -> bao cao cai tot nhat.
async function verify(page: Page, candidates: Candidate[]): Promise<Verified> {
  const attempts = candidates.flatMap((c) => attemptsFor(page, c));
  let fallback: Verified | null = null;
  for (const a of attempts) {
    let n: number;
    try { n = await a.loc.count(); } catch { continue; }
    if (n === 1) return { locator: a.str, unique: true, matchCount: 1 };
    if (n > 1 && !fallback) fallback = { locator: a.str, unique: false, matchCount: n };
  }
  return fallback ?? { locator: attempts[0]?.str ?? "locator('body')", unique: false, matchCount: 0 };
}

// --- CHUP 1 MAN -------------------------------------------------------------

interface VElement { role: string; name: string; testid: string | null; locator: string; unique: boolean; matchCount: number; }

interface StateInfo {
  id: string; url: string; title: string;
  total: number; unique: number;
  reachedBy?: { from: string; action: string }[];
}

function screenSheet(s: StateInfo, els: VElement[]): string {
  const L: string[] = [];
  L.push(`# ${s.id} — ${s.title || '(no title)'}`);
  L.push(`URL: ${s.url}`);
  if (s.reachedBy?.length) L.push(`Den tu: ${s.reachedBy.map((r) => `${r.from} (${r.action})`).join(', ')}`);
  L.push(`Element: ${s.unique}/${s.total} co selector duy nhat (✓)`);
  L.push('');
  L.push('Quy uoc: ✓ khop dung 1 | ⚠N khop N (>1, can thu hep) | ✗0 khong khop. Locator dung voi page/locator goc.');
  L.push('');

  // Gop cac element trung locator (vd nhieu dong bang) thanh 1 dong "lap xN".
  const groups = new Map<string, { role: string; name: string; unique: boolean; matchCount: number; reps: number }>();
  for (const e of els) {
    const g = groups.get(e.locator);
    if (g) g.reps++;
    else groups.set(e.locator, { role: e.role, name: e.name, unique: e.unique, matchCount: e.matchCount, reps: 1 });
  }
  for (const [loc, g] of groups) {
    const mark = g.unique ? '✓' : g.matchCount > 1 ? `⚠${g.matchCount}` : '✗0';
    const reps = g.reps > 1 ? ` (lap x${g.reps})` : '';
    const name = g.name ? `"${g.name.slice(0, 50)}"` : '(no name)';
    L.push(`- [${g.role}] ${name}${reps}  ${mark}  ${loc}`);
  }
  return L.join('\n') + '\n';
}

async function captureState(page: Page, id: string, reachedBy?: StateInfo['reachedBy']): Promise<StateInfo> {
  const raw = path.join(OUT, 'raw', id);
  await ensureDir(raw);

  const catalog = await page.evaluate(extractCatalog);

  const els: VElement[] = [];
  for (const el of catalog.elements) {
    const v = await verify(page, el.candidates);
    els.push({ role: el.role, name: el.name, testid: el.testid, ...v });
  }
  const uniqueCount = els.filter((e) => e.unique).length;

  // Tham khao chi tiet (khong nap vao AI tru khi can).
  let a11y = '';
  try { a11y = await page.locator('body').ariaSnapshot(); } catch { /* ignore */ }
  await page.screenshot({ path: path.join(raw, 'screenshot.png'), fullPage: true });
  await fs.writeFile(path.join(raw, 'a11y.yaml'), a11y);
  await fs.writeFile(path.join(raw, 'dom.html'), cleanHtml(await page.content()));
  await fs.writeFile(path.join(raw, 'catalog.json'), JSON.stringify({ url: page.url(), title: catalog.title, count: els.length, elements: els }, null, 2));

  const info: StateInfo = { id, url: page.url(), title: catalog.title, total: els.length, unique: uniqueCount, reachedBy };

  // Tang 2: bang selector gon.
  await ensureDir(path.join(OUT, 'screens'));
  await fs.writeFile(path.join(OUT, 'screens', `${id}.md`), screenSheet(info, els));

  console.log(`  ✔ ${id}: ${uniqueCount}/${els.length} element co selector duy nhat`);
  return info;
}

// --- DANG NHAP --------------------------------------------------------------

async function login(browser: Browser): Promise<void> {
  console.log('→ Dang nhap...');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(abs(config.login.url), { waitUntil: 'networkidle' });
  await page.fill(config.login.userSelector, process.env.TEST_USER ?? '');
  await page.fill(config.login.passSelector, process.env.TEST_PASS ?? '');
  await page.click(config.login.submitSelector);
  if (config.login.successSelector) await page.waitForSelector(config.login.successSelector, { timeout: 30_000 });
  else await page.waitForLoadState('networkidle');
  await ensureDir(path.dirname(AUTH_FILE));
  await ctx.storageState({ path: AUTH_FILE });
  await ctx.close();
  console.log(`  ✔ Dang nhap OK, da luu phien: ${path.relative(process.cwd(), AUTH_FILE)}`);
}

// --- TANG 1: index.md -------------------------------------------------------

function indexMd(states: StateInfo[], actions: { from: string; to: string; type: string; label: string; selector: string }[]): string {
  const L: string[] = [];
  L.push(`# Site map — ${config.baseUrl}`);
  L.push('');
  L.push('AI chi can doc dong cua man lien quan toi test case, roi mo `screens/<id>.md` tuong ung (KHONG nap het).');
  L.push('Cot "el" = so element co selector duy nhat / tong so.');
  L.push('');
  L.push('| id | url | title | el | sheet |');
  L.push('|----|-----|-------|----|-------|');
  for (const s of states) {
    const title = (s.title || '').replace(/\|/g, '\\|').slice(0, 40);
    L.push(`| ${s.id} | ${s.url} | ${title} | ${s.unique}/${s.total} | screens/${s.id}.md |`);
  }
  if (actions.length) {
    L.push('');
    L.push('## Luong (action dan sang state khac)');
    for (const a of actions) L.push(`- ${a.from} → ${a.to} : ${a.label} (${a.type} \`${a.selector}\`)`);
  }
  return L.join('\n') + '\n';
}

// --- MAIN -------------------------------------------------------------------

async function main(): Promise<void> {
  await ensureDir(OUT);
  const browser = await chromium.launch({ headless: config.headless });

  if (config.login.enabled) {
    if (FORCE_LOGIN && (await exists(AUTH_FILE))) await fs.rm(AUTH_FILE);
    if (FORCE_LOGIN || !(await exists(AUTH_FILE))) await login(browser);
  }

  const SHIM = 'window.__name = window.__name || ((f) => f);'; // va loi __name khi page.evaluate (tsx keepNames)

  // Trang dung SESSION da login (chi tao neu co login).
  let authPage: Page | null = null;
  if (config.login.enabled) {
    const c = await browser.newContext({ storageState: AUTH_FILE });
    authPage = await c.newPage();
    await authPage.addInitScript(SHIM);
  }
  // Trang AN DANH (khong login) -- tao khi can: page co auth:false, hoac khi login.enabled=false.
  let anonPage: Page | null = null;
  const getAnonPage = async (): Promise<Page> => {
    if (!anonPage) {
      const c = await browser.newContext();
      anonPage = await c.newPage();
      await anonPage.addInitScript(SHIM);
    }
    return anonPage;
  };

  const states: StateInfo[] = [];
  const actions: { from: string; to: string; type: string; label: string; selector: string }[] = [];

  for (const target of config.pages) {
    // target.auth === false -> an danh; mac dinh dung session (neu login.enabled = true).
    const useAuth = target.auth !== false && config.login.enabled;
    const page = useAuth ? authPage! : await getAnonPage();

    const url = abs(target.url);
    console.log(`→ ${target.id} (${url})${useAuth ? '' : ' [public]'}`);
    await page.goto(url, { waitUntil: 'networkidle' });
    if (target.waitFor) await page.waitForSelector(target.waitFor, { timeout: 30_000 }).catch(() => {});
    states.push(await captureState(page, target.id));

    for (const act of target.actions ?? []) {
      try {
        if (act.type === 'fill') await page.fill(act.selector, act.value ?? '');
        else await page.click(act.selector);
        await page.waitForLoadState('networkidle').catch(() => {});

        if (act.captureAs) {
          states.push(await captureState(page, act.captureAs, [{ from: target.id, action: act.label }]));
          actions.push({ from: target.id, to: act.captureAs, type: act.type ?? 'click', label: act.label, selector: act.selector });
        }
        await page.goto(url, { waitUntil: 'networkidle' });
        if (target.waitFor) await page.waitForSelector(target.waitFor, { timeout: 30_000 }).catch(() => {});
      } catch (e) {
        console.warn(`  ⚠ Action "${act.label}" loi: ${(e as Error).message}`);
      }
    }
  }

  await fs.writeFile(path.join(OUT, 'index.md'), indexMd(states, actions));
  await browser.close();
  console.log(`\n✔ Hoan tat: ${states.length} man -> ${path.join(config.output, 'index.md')} + ${path.join(config.output, 'screens')}/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
