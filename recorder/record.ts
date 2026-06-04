// =============================================================================
//  RECORDER giong codegen, NHUNG xuat JSON cho Claude (khong phai code tho).
//  Ghi lai thao tac user + NHIEU loai selector (testId/role/placeholder/css/xpath/text).
//
//  Chay:  npm run record -- <url>                    (vd: npm run record -- https://www.saucedemo.com)
//         npm run record -- <url> --name=TC001       (-> recording/TC001/TC001.json + .md)
//         RECORD_STORAGE=output/.auth/state.json npm run record -- <url> --name=TC001   (login san)
//  Tuy chinh loai selector giu lai:  RECORD_SELECTORS=css,xpath,testId npm run record -- <url>
// =============================================================================

import 'dotenv/config';
import { chromium, type BrowserContext, type Page } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const START_URL = positional[0] || process.env.RECORD_URL || process.env.BASE_URL || 'https://www.saucedemo.com';
const STORAGE = process.env.RECORD_STORAGE || ''; // path storageState neu muon login san
const SELF_TEST = process.argv.includes('--selftest');
const OUT = path.resolve(process.cwd(), 'recording');
// Ten file output theo test case: --name=TC001  hoac  RECORD_NAME=TC001  (mac dinh 'recording')
const nameArg = process.argv.find((a) => a.startsWith('--name='))?.slice(7);
const NAME = (nameArg || process.env.RECORD_NAME || 'recording').trim().replace(/[\\/:*?"<>|\s]+/g, '_') || 'recording';
const DIR = path.join(OUT, NAME); // moi test case 1 folder rieng: recording/<NAME>/
// === CHO CUSTOM FORMAT: chon loai selector giu lai trong output ===
const KEEP = (process.env.RECORD_SELECTORS || 'testId,role,placeholder,alt,title,text,css#id,css[name],css[href],css.class,cssPath,xpath@id,xpath@class,xpath.text,xpathPath').split(',');

// HTML cho CUA SO RIENG hien code (giong panel cua Playwright Inspector)
const CODE_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Recorder · spec</title>
<style>body{margin:0;background:#0b1020;color:#e5e7eb;font:13px/1.6 ui-monospace,Consolas,monospace}
header{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 12px;background:#111827;color:#9ca3af;font:13px sans-serif;position:sticky;top:0}
button{cursor:pointer;border:0;border-radius:6px;padding:5px 10px;background:#374151;color:#fff;font:12px sans-serif;margin-left:4px}
pre{margin:0;padding:12px 14px;white-space:pre-wrap;word-break:break-word}
textarea{display:none;width:100%;height:calc(100vh - 46px);box-sizing:border-box;border:0;outline:0;background:#0b1020;color:#e5e7eb;font:13px/1.6 ui-monospace,Consolas,monospace;padding:12px;resize:none}
.cm{color:#6b7280;font-style:italic}.st{color:#fbbf24}.kw{color:#c084fc}.id{color:#34d399}.fn{color:#60a5fa}</style></head>
<body><header><b id="title">Generated spec (live)</b><span><button id="btnEdit">✏️ Edit</button><button id="btnSave" style="display:none">💾 Save</button><button id="btnLive" style="display:none">↺ Live</button><button id="btnCopy">Copy</button></span></header>
<pre id="code">// Chua co thao tac. Hay thao tac tren cua so trang ben canh...</pre>
<textarea id="codeEdit" spellcheck="false"></textarea>
<script>
(function(){
  var $=function(id){return document.getElementById(id);};
  $('btnCopy').onclick=function(){try{navigator.clipboard.writeText(window.__editMode?$('codeEdit').value:$('code').textContent);}catch(e){}};
  $('btnEdit').onclick=function(){window.__editMode=true;$('codeEdit').value=window.__lastCode||$('code').textContent||'';$('code').style.display='none';$('codeEdit').style.display='block';$('btnEdit').style.display='none';$('btnSave').style.display='';$('btnLive').style.display='';$('title').textContent='Edit spec (sua tay) - auto-update tam dung';$('codeEdit').focus();};
  $('btnSave').onclick=function(){if(window.__saveCode)window.__saveCode($('codeEdit').value);$('title').textContent='Da luu .spec.ts ✔';};
  $('btnLive').onclick=function(){window.__editMode=false;$('codeEdit').style.display='none';$('code').style.display='block';$('btnSave').style.display='none';$('btnLive').style.display='none';$('btnEdit').style.display='';$('title').textContent='Generated spec (live)';if(window.__resetCode)window.__resetCode();};
})();
</script></body></html>`;
let manualSpec: string | null = null; // code user sua tay -> ghi de generated

// Xep vi tri/kich thuoc 1 cua so (Chromium, qua CDP). Headless thi bo qua.
async function dock(pg: Page, b: { left: number; top: number; width: number; height: number }): Promise<void> {
  try {
    const cdp = await pg.context().newCDPSession(pg);
    const win: any = await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds', { windowId: win.windowId, bounds: { windowState: 'normal', ...b } });
  } catch (e) { /* headless / khong ho tro CDP */ }
}

interface Cand { kind: string; value: string; n?: number; fragile?: boolean; }
interface Action {
  i: number; type: string; url: string; ts: number;
  value?: string; key?: string; text?: string; assert?: string; file?: string; tag?: string; role?: string; name?: string;
  fragile?: boolean; chosenKind?: string; chosenValue?: string;
  unique?: { best?: string; all: Cand[] };
  family?: null | { best?: string; count: number; all: Cand[]; within: string };
}

const escStr = (s: any) => String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
function asLocator(best?: string): string {
  if (!best) return "page.locator('body')";
  if (/^getBy/.test(best)) return 'page.' + best;                                          // getByRole/getByTestId/...
  if (best.startsWith('//') || best.startsWith('xpath=')) return `page.locator('xpath=${escStr(best.replace(/^xpath=/, ''))}')`;
  return `page.locator('${escStr(best)}')`;                                                // css: #id, .class, [data-test=...], path
}
// Sinh Playwright spec tu cac action da ghi (dung selector unique.best, giong codegen).
function toSpec(actions: Action[]): string {
  const fragileN = actions.filter((a) => a.fragile).length;
  const L = [`import { test, expect } from '@playwright/test';`, ''];
  if (fragileN) L.push(`// ⚠ ${fragileN} selector mong manh (positional) — nen thay bang data-testid. Chi tiet o file .md.`, '');
  L.push(`test('${NAME}', async ({ page }) => {`);
  let gotoDone = false;
  for (const a of actions) {
    if (a.type === 'navigate') {
      if (!gotoDone) { L.push(`  await page.goto('${escStr(a.url)}');`); gotoDone = true; }
      else L.push(`  // -> ${a.url}`);                                                     // dieu huong do click o tren
      continue;
    }
    if (a.type === 'screenshot') { L.push(`  await page.screenshot({ path: '${a.file}', fullPage: true });`); continue; }
    const t = asLocator(a.unique?.best);
    if (a.type === 'fill') L.push(`  await ${t}.fill('${escStr(a.value)}');`);
    else if (a.type === 'select') L.push(`  await ${t}.selectOption('${escStr(a.value)}');`);
    else if (a.type === 'press') L.push(`  await ${t}.press('${escStr(a.key)}');`);
    else if (a.type === 'click') L.push(`  await ${t}.click();`);
    else if (a.type === 'rightclick') L.push(`  await ${t}.click({ button: 'right' });`);
    else if (a.type === 'dblclick') L.push(`  await ${t}.dblclick();`);
    else if (a.type === 'hover') L.push(`  await ${t}.hover();`);
    else if (a.type === 'pick') L.push(`  // pick locator: ${a.unique?.best ?? ''}`);
    else if (a.type === 'assert') {
      if (a.assert === 'visible') L.push(`  await expect(${t}).toBeVisible();`);
      else if (a.assert === 'text') L.push(`  await expect(${t}).toContainText('${escStr(a.text)}');`);
      else if (a.assert === 'value') L.push(`  await expect(${t}).toHaveValue('${escStr(a.value)}');`);
    }
  }
  L.push('});', '');
  return L.join('\n');
}

async function writeOutput(actions: Action[]): Promise<void> {
  await fs.writeFile(path.join(DIR, `${NAME}.json`), JSON.stringify(actions, null, 2));
  await fs.writeFile(path.join(DIR, `${NAME}.spec.ts`), manualSpec != null ? manualSpec : toSpec(actions)); // manual edit (neu co) > generated

  const fragileN = actions.filter((a) => a.fragile).length;
  const L: string[] = [`# Recording: ${NAME}`, '', `Bat dau: ${START_URL}`, '',
    fragileN ? `> 🔴 ${fragileN} action dung SELECTOR MONG MANH (positional path) -> nen them data-testid cho element do.` : '> Selector deu on dinh (khong positional). 👍',
    '', 'n = so element khop. unique nen n=1. family = nhom item lap (n>=2) -> .filter({hasText}).', ''];
  for (const a of actions) {
    if (a.type === 'navigate') { L.push(`${a.i}. **navigate** -> ${a.url}`); continue; }
    if (a.type === 'screenshot') { L.push(`${a.i}. **screenshot** -> \`${a.file}\``); continue; }
    let head;
    if (a.type === 'assert') {
      const ex = a.assert === 'text' ? ` "${a.text ?? ''}"` : a.assert === 'value' ? ` = \`${a.value ?? ''}\`` : '';
      head = `**assert ${a.assert}**${ex}`;
    } else {
      const val = a.value != null ? ` = \`${a.value}\`` : a.key ? ` [${a.key}]` : '';
      head = `**${a.type}**${val}`;
    }
    L.push(`${a.i}. ${head} — ${a.name ? `"${a.name}" ` : ''}(${a.tag})${a.fragile ? '  🔴 MONG MANH' : ''}`);
    if (a.unique?.best) L.push(`   - unique: \`${a.unique.best}\``);
    for (const s of a.unique?.all || []) L.push(`       . ${s.kind}: \`${s.value}\` (n=${s.n})`);
    if (a.family) {
      L.push(`   - family: \`${a.family.best}\` x${a.family.count}  -> within: \`${a.family.within}\``);
      for (const s of a.family.all || []) L.push(`       . ${s.kind}: \`${s.value}\` (n=${s.n})`);
    }
  }
  await fs.writeFile(path.join(DIR, `${NAME}.md`), L.join('\n') + '\n');
}

async function main(): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  const browser = await chromium.launch({ headless: SELF_TEST }); // that: headed de user thao tac
  const ctx: BrowserContext = await browser.newContext(STORAGE ? { storageState: STORAGE } : {});

  const actions: Action[] = [];
  let renderCode: () => Promise<unknown> = async () => {}; // cap nhat cua so code (gan that sau khi mo cua so)
  // Trang thai recorder GIU O NODE de khong bi reset khi chuyen trang (Rec on/off, vi tri toolbar)
  let recState: { paused: boolean; codeOpen?: boolean; chooseMode?: boolean; pos: { left: string; top: string } | null } = { paused: false, chooseMode: true, pos: null };
  await ctx.exposeBinding('__recGetState', () => ({ ...recState, code: toSpec(actions) })); // tra ca state + code hien tai
  await ctx.exposeBinding('__recSetState', (_s, p: any) => { recState = { ...recState, ...p }; });

  // Node nhan tung thao tac tu trong trang
  await ctx.exposeBinding('__record', (source: any, a: any) => {
    if (recState.paused) return;             // Rec off -> khong ghi (ke ca ngay sau redirect)
    if (a.unique?.all) {
      const win = a.unique.all.find((s: Cand) => s.n === 1) || a.unique.all[0]; // chon TRUOC khi loc hien thi
      a.unique.best = win?.value;
      a.fragile = !!win?.fragile;                                               // best la selector positional?
      a.unique.all = a.unique.all.filter((s: Cand) => KEEP.includes(s.kind));   // RECORD_SELECTORS chi loc HIEN THI
    }
    if (a.chosenValue && a.unique) {                                            // user da chon selector trong picker (cho MOI action)
      a.unique.best = a.chosenValue;
      a.fragile = a.chosenKind === 'cssPath' || a.chosenKind === 'xpathPath';
    }
    if (a.family?.all) a.family.best = (a.family.all.find((s: Cand) => (s.n ?? 0) >= 2) || a.family.all[0])?.value;
    a.i = actions.length + 1;
    actions.push(a);
    const tl = a.type === 'assert' ? `assert:${a.assert}` : a.type;
    const v = a.value != null ? `="${a.value}"` : a.text != null ? `="${a.text}"` : '';
    const f = a.family ? `  | family: ${a.family.best} x${a.family.count}` : '';
    console.log(`#${a.i} ${tl}${v}  ${a.unique?.best || ''}${a.fragile ? ' ⚠FRAGILE' : ''}${f}`);
    source.page.evaluate((c: string) => (window as any).__recRenderCode && (window as any).__recRenderCode(c), toSpec(actions)).catch(() => {}); // panel trong trang (neu bat)
    renderCode(); // cua so rieng
  });

  let shotN = 0;
  await ctx.exposeBinding('__shot', async (source: any) => {
    const pg = source.page; shotN += 1; const rel = `shots/shot-${shotN}.png`;
    await fs.mkdir(path.join(DIR, 'shots'), { recursive: true });
    const ids = ['__rec_ui', '__rec_codebox', '__rec_menu', '__rec_picker', '__rec_hl', '__rec_tip'];
    await pg.evaluate((list: string[]) => list.forEach((id) => { const e: any = document.getElementById(id); if (e) { e.__prev = e.style.display; e.style.display = 'none'; } }), ids).catch(() => {}); // an UI recorder
    await pg.screenshot({ path: path.join(DIR, rel), fullPage: true }).catch(() => {});
    await pg.evaluate((list: string[]) => list.forEach((id) => { const e: any = document.getElementById(id); if (e) e.style.display = e.__prev || ''; }), ids).catch(() => {}); // hien lai UI
    actions.push({ i: actions.length + 1, type: 'screenshot', file: rel, url: pg.url(), ts: 0 });
    renderCode();
    console.log(`#${actions.length} screenshot -> ${rel}`);
  });

  const inject = await fs.readFile(path.join(process.cwd(), 'recorder', 'inject.js'), 'utf8');
  await ctx.addInitScript({ content: inject });

  const pushNav = (url: string) => {
    if (recState.paused) return;             // Rec off -> khong ghi navigate
    const last = actions[actions.length - 1];
    if (last && last.type === 'navigate' && last.url === url) return; // dedupe URL lien tiep
    actions.push({ i: actions.length + 1, type: 'navigate', url, ts: Date.now() });
    console.log(`#${actions.length} navigate ${url}`);
    renderCode();
  };
  const tracked = new WeakSet<Page>();
  const attachNav = (p: Page): void => {
    if (tracked.has(p)) return;
    tracked.add(p);
    p.on('framenavigated', (f) => { if (f === p.mainFrame()) pushNav(f.url()); });
  };
  ctx.on('page', attachNav); // bat ca tab/popup moi

  const page: Page = await ctx.newPage();
  attachNav(page);
  await page.goto(START_URL);

  // CUA SO RIENG hien code (context rieng -> khong bi recorder chen UI, khong bi ghi)
  const codeCtx = await browser.newContext();
  await codeCtx.addInitScript('window.__name = window.__name || function (f) { return f; };'); // tranh loi __name khi highlight
  await codeCtx.exposeBinding('__saveCode', async (_s: any, text: string) => { manualSpec = text; await fs.writeFile(path.join(DIR, `${NAME}.spec.ts`), text).catch(() => {}); console.log(`✔ Da luu code sua tay -> ${NAME}.spec.ts`); });
  await codeCtx.exposeBinding('__resetCode', async () => { manualSpec = null; await renderCode(); }); // ve auto-gen
  const codePage = await codeCtx.newPage();
  await codePage.setContent(CODE_HTML);
  renderCode = () => codePage.evaluate((c: string) => {
    (window as any).__lastCode = c;
    if ((window as any).__editMode) return;            // dang sua tay -> khong ghi de
    var html = c.split('\n').map(function (line) {
      var h = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (line.replace(/^\s+/, '').indexOf('//') === 0) return '<span class="cm">' + h + '</span>'; // ca dong comment
      h = h.replace(/('[^']*')/g, '<span class="st">$1</span>');                                    // chuoi
      h = h.replace(/\b(import|from|test|async|await|const|let|return)\b/g, '<span class="kw">$1</span>'); // tu khoa
      h = h.replace(/\b(page|expect)\b/g, '<span class="id">$1</span>');
      h = h.replace(/\.([a-zA-Z]\w*)/g, '.<span class="fn">$1</span>');                              // .method()
      return h;
    }).join('\n');
    var p = document.getElementById('code'); if (p) p.innerHTML = html;
  }, toSpec(actions)).catch(() => {});
  await renderCode();

  // Xep 2 cua so phu KIN man hinh. Do full work-area bang cach MAXIMIZE roi doc lai bounds
  // -> chinh xac tuyet doi, khong phu thuoc DPI/scale (Playwright ep deviceScaleFactor=1 nen khong the doan).
  try {
    const cdp = await page.context().newCDPSession(page);
    const wt: any = await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds', { windowId: wt.windowId, bounds: { windowState: 'maximized' } });
    const gb: any = await cdp.send('Browser.getWindowBounds', { windowId: wt.windowId });
    const f = gb.bounds; // {left, top, width, height} = full work-area (dung don vi CDP that)
    const availW = await page.evaluate(() => window.screen.availWidth);
    const codeW = Math.min(Math.round(availW * 0.42), Math.round(f.width * 0.5)); // giu do rong code (toi da 50%)
    const appW = f.width - codeW;                                                 // app lay phan con lai
    await dock(page, { left: f.left, top: f.top, width: appW, height: f.height });           // app trai (bo maximize)
    await dock(codePage, { left: f.left + appW, top: f.top, width: codeW, height: f.height }); // code phai -> tong = 100%
  } catch (e) { /* headless / khong CDP */ }

  console.log('\n▶ Dang ghi. Thao tac thoai mai (chuyen trang OK). Ket thuc: DONG cua so trang hoac nhan Ctrl+C.\n');

  if (SELF_TEST) {
    await page.fill('#user-name', 'standard_user');
    await page.fill('#password', 'secret_sauce');
    await page.click('#login-button');
    await page.waitForLoadState('networkidle');
    // kiem chung fix full-text: pick footer (text dai) -> ung vien getByText phai LAY DU + khop (khong con ✗0)
    await page.evaluate(() => { (document.querySelector('.footer_copy') || document.body).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 })); });
    await page.click('#__rec_menu [data-k="pick"]').catch(() => {});
    const ftxt = await page.evaluate(() => { const rows = Array.prototype.slice.call(document.querySelectorAll('#__rec_picker .__rec_pi')); const r = rows.find((x: any) => x.textContent.indexOf('getByText') >= 0); return r ? r.textContent.replace(/\s+/g, ' ').trim() : '(khong co text candidate)'; });
    console.log('FOOTER TEXT CANDIDATE:', ftxt);
    await page.click('#__rec_picker_x').catch(() => {});
    await page.click('[data-test="add-to-cart-sauce-labs-backpack"]'); // nut trong list -> kiem thu family
    await page.evaluate(() => (window as any).__recTogglePick && (window as any).__recTogglePick()); // bat Pick mode
    await page.click('[data-test="add-to-cart-sauce-labs-bike-light"]'); // Pick -> mo BANG CHON selector
    await page.click('#__rec_picker .__rec_pi'); // chon selector dau tien -> log 'pick'
    await page.evaluate(() => (window as any).__recSetInspect && (window as any).__recSetInspect('visible')); // Assert visible
    await page.click('.inventory_item_name'); // -> mo picker (chon selector cho assert)
    await page.click('#__rec_picker .__rec_pi'); // chon selector -> log assert visible
    await page.waitForTimeout(300); // cho binding flush
    // Test menu chuot phai: dispatch contextmenu -> chon "Double click"
    await page.evaluate(() => { (document.querySelector('[data-test="add-to-cart-sauce-labs-onesie"]') || document.body).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 120, clientY: 120 })); });
    await page.click('#__rec_menu [data-k="dblclick"]').catch(() => {});  // chon action -> mo picker
    await page.click('#__rec_picker .__rec_pi').catch(() => {});          // chon selector -> log dblclick
    await page.waitForTimeout(200);
    // Tat toggle List SL -> action tu dong lay best (KHONG mo picker)
    await page.evaluate(() => (window as any).__recToggleChoose && (window as any).__recToggleChoose());
    await page.evaluate(() => { (document.querySelector('[data-test="add-to-cart-sauce-labs-fleece-jacket"]') || document.body).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 140, clientY: 140 })); });
    await page.click('#__rec_menu [data-k="click"]').catch(() => {});     // OFF -> log click NGAY, khong picker
    await page.waitForTimeout(200);
    await page.evaluate(() => (window as any).__shot && (window as any).__shot()); // chup screenshot
    await page.waitForTimeout(300);
    // Kiem thu SUA CODE truc tiep tren cua so live code
    await codePage.click('#btnEdit').catch(() => {});
    await codePage.fill('#codeEdit', '// MANUAL EDIT\n').catch(() => {});
    await codePage.click('#btnSave').catch(() => {});
    await page.waitForTimeout(200);
    const edited = await fs.readFile(path.join(DIR, `${NAME}.spec.ts`), 'utf8').catch(() => '');
    console.log('EDIT TEST: spec bat dau bang "' + edited.slice(0, 14).replace(/\n/g, ' ') + '"');
    await codePage.click('#btnLive').catch(() => {}); // ve live -> reset manualSpec
    await page.waitForTimeout(200);
    // --- Kiem thu: tat Rec -> chuyen trang -> van giu trang thai (khong ghi them) ---
    await page.evaluate(() => (window as any).__recTogglePause && (window as any).__recTogglePause()); // tat Rec
    await page.waitForTimeout(200); // cho state ve Node
    const n0 = actions.length;
    await page.goto(new URL('/cart.html', START_URL).href); // chuyen trang khi da tat Rec
    await page.click('[data-test="continue-shopping"]').catch(() => {});
    await page.waitForTimeout(400);
    console.log(`PAUSE TEST: ${n0} -> ${actions.length} action (Rec off => phai GIU NGUYEN)`);
    const codeLen = await page.evaluate(() => (document.getElementById('__rec_code')?.textContent || '').length);
    console.log(`PANEL CODE: ${codeLen} ky tu (panel trong trang)`);
    const winLen = await codePage.evaluate(() => (document.getElementById('code')?.textContent || '').length);
    const hasHl = await codePage.evaluate(() => (document.getElementById('code')?.innerHTML || '').includes('<span'));
    console.log(`CODE WINDOW: ${winLen} ky tu, highlight=${hasHl}`);
  } else {
    // Cho VO THOI HAN: ket thuc khi dong trinh duyet hoac Ctrl+C.
    // (Truoc day dung page.waitForEvent('close') -> co timeout mac dinh 30s nen tu dung.)
    await new Promise<void>((resolve) => {
      page.on('close', () => resolve());        // dong cua so trang app -> ket thuc (du cua so code con mo)
      browser.on('disconnected', () => resolve());
      process.on('SIGINT', () => resolve());
    });
  }

  await writeOutput(actions);
  try { await browser.close(); } catch (e) { /* trinh duyet da dong */ }
  console.log(`\n✔ ${actions.length} thao tac -> recording/${NAME}/ { ${NAME}.json · ${NAME}.md · ${NAME}.spec.ts }`);
}

main().catch((e) => { console.error(e); process.exit(1); });
