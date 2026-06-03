// =============================================================================
//  TOOL LAY DOM
//  - Dang nhap 1 lan (luu storageState de tai dung)
//  - Truy cap tung URL trong config, quet element + selector
//  - Chi click cac action duoc khai bao (an toan, khong dong cham du lieu test)
//  - Xuat: output/states/<id>/{dom.html, catalog.json, a11y.yaml, screenshot.png}
//          output/index.json  <- ban do DOM <-> URL <-> action cho AI doc
//
//  Chay:  npm run crawl          (dung phien da luu neu co)
//         npm run relogin        (bo phien cu, dang nhap lai)
// =============================================================================

import 'dotenv/config';
import { chromium, type Browser, type Page } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { extractCatalog, type CatalogElement } from './extract.js';

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

// Bo script/style/svg/comment de file DOM nhe va de doc.
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

async function login(browser: Browser): Promise<void> {
  console.log('→ Dang nhap...');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(abs(config.login.url), { waitUntil: 'networkidle' });

  await page.fill(config.login.userSelector, process.env.TEST_USER ?? '');
  await page.fill(config.login.passSelector, process.env.TEST_PASS ?? '');
  await page.click(config.login.submitSelector);

  if (config.login.successSelector) {
    await page.waitForSelector(config.login.successSelector, { timeout: 30_000 });
  } else {
    await page.waitForLoadState('networkidle');
  }

  await ensureDir(path.dirname(AUTH_FILE));
  await ctx.storageState({ path: AUTH_FILE });
  await ctx.close();
  console.log(`  ✔ Dang nhap thanh cong, da luu phien: ${path.relative(process.cwd(), AUTH_FILE)}`);
}

interface ElementSummary {
  name: string;
  role: string;
  testid: string | null;
  locator: string;
}

interface CapturedState {
  id: string;
  url: string;
  title: string;
  reachedBy?: { from: string; action: string }[];
  files: { dom: string; catalog: string; a11y: string; screenshot: string };
  elements: ElementSummary[];
}

async function captureState(page: Page, id: string): Promise<CapturedState> {
  const dir = path.join(OUT, 'states', id);
  await ensureDir(dir);

  const catalog = await page.evaluate(extractCatalog);
  let a11y = '';
  try { a11y = await page.locator('body').ariaSnapshot(); } catch { /* ignore */ }
  const html = cleanHtml(await page.content());

  await page.screenshot({ path: path.join(dir, 'screenshot.png'), fullPage: true });
  await fs.writeFile(path.join(dir, 'catalog.json'), JSON.stringify(catalog, null, 2));
  await fs.writeFile(path.join(dir, 'a11y.yaml'), a11y);
  await fs.writeFile(path.join(dir, 'dom.html'), html);

  const rel = (f: string) => path.relative(OUT, path.join(dir, f)).replace(/\\/g, '/');
  console.log(`  ✔ ${id}: ${catalog.count} element`);

  return {
    id,
    url: page.url(),
    title: catalog.title,
    files: {
      dom: rel('dom.html'),
      catalog: rel('catalog.json'),
      a11y: rel('a11y.yaml'),
      screenshot: rel('screenshot.png'),
    },
    elements: catalog.elements.map((e: CatalogElement): ElementSummary => ({
      name: e.name,
      role: e.role,
      testid: e.testid,
      locator: e.suggestedLocator,
    })),
  };
}

async function main(): Promise<void> {
  await ensureDir(OUT);
  const browser = await chromium.launch({ headless: config.headless });

  if (config.login.enabled) {
    if (FORCE_LOGIN && (await exists(AUTH_FILE))) await fs.rm(AUTH_FILE);
    if (FORCE_LOGIN || !(await exists(AUTH_FILE))) await login(browser);
  }

  const ctx = await browser.newContext(
    config.login.enabled ? { storageState: AUTH_FILE } : {},
  );
  const page = await ctx.newPage();

  const states: CapturedState[] = [];
  const actions: { from: string; to: string; type: string; label: string; selector: string }[] = [];

  for (const target of config.pages) {
    const url = abs(target.url);
    console.log(`→ ${target.id} (${url})`);
    await page.goto(url, { waitUntil: 'networkidle' });
    if (target.waitFor) {
      await page.waitForSelector(target.waitFor, { timeout: 30_000 }).catch(() => {});
    }
    states.push(await captureState(page, target.id));

    for (const act of target.actions ?? []) {
      try {
        if (act.type === 'fill') await page.fill(act.selector, act.value ?? '');
        else await page.click(act.selector);
        await page.waitForLoadState('networkidle').catch(() => {});

        if (act.captureAs) {
          const s = await captureState(page, act.captureAs);
          s.reachedBy = [{ from: target.id, action: act.label }];
          states.push(s);
          actions.push({
            from: target.id, to: act.captureAs,
            type: act.type ?? 'click', label: act.label, selector: act.selector,
          });
        }
        // Quay lai trang goc de cac action sau doc lap voi nhau.
        await page.goto(url, { waitUntil: 'networkidle' });
        if (target.waitFor) {
          await page.waitForSelector(target.waitFor, { timeout: 30_000 }).catch(() => {});
        }
      } catch (e) {
        console.warn(`  ⚠ Action "${act.label}" loi: ${(e as Error).message}`);
      }
    }
  }

  const index = {
    baseUrl: config.baseUrl,
    note: 'Ban do DOM <-> URL <-> action. AI doc file nay (cung cac file trong states/) de hieu cau truc man hinh va sinh Playwright test.',
    states,
    actions,
  };
  await fs.writeFile(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2));

  await ctx.close();
  await browser.close();
  console.log(`\n✔ Hoan tat: ${states.length} state -> ${path.join(config.output, 'index.json')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
