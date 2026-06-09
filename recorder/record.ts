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
import { fileURLToPath } from 'node:url';
// Thu muc chua CHINH file dang chay: record.ts (dev qua tsx) HOAC dist/cli.js (khi cai tu npm).
// inject.js LUON nam canh file nay -> resolve theo day, KHONG theo process.cwd() (chay duoc tu moi noi / khi la npm package).
const HERE = path.dirname(fileURLToPath(import.meta.url));

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const START_URL = positional[0] || process.env.RECORD_URL || process.env.BASE_URL || 'https://www.saucedemo.com';
const STORAGE = process.env.RECORD_STORAGE || ''; // path storageState neu muon login san
const NAV_TIMEOUT = Number(process.env.RECORD_TIMEOUT) || 60_000; // timeout (ms) cho page.goto; tang neu site rat cham
const SELF_TEST = process.argv.includes('--selftest');
const OUT = path.resolve(process.cwd(), 'recording');
// Ten file output theo test case: --name=TC001  hoac  RECORD_NAME=TC001  (mac dinh 'recording')
const nameArg = process.argv.find((a) => a.startsWith('--name='))?.slice(7);
const NAME = (nameArg || process.env.RECORD_NAME || 'recording').trim().replace(/[\\/:*?"<>|\s]+/g, '_') || 'recording';
const DIR = path.join(OUT, NAME); // moi test case 1 folder rieng: recording/<NAME>/
// === CHO CUSTOM FORMAT: chon loai selector giu lai trong output ===
const KEEP = (process.env.RECORD_SELECTORS || 'testId,role,placeholder,alt,title,text,label→input,css#id,css[name],css[href],css.class,cssPath,xpath@id,xpath@class,xpath.text,xpathPath').split(',');

// HTML cho CUA SO RIENG hien code (giong panel cua Playwright Inspector)
const CODE_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Recorder · spec</title>
<style>body{margin:0;background:#0b1020;color:#e5e7eb;font:13px/1.6 ui-monospace,Consolas,monospace}
header{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 12px;background:#111827;color:#9ca3af;font:13px sans-serif;position:sticky;top:0;z-index:2}
button{cursor:pointer;border:0;border-radius:6px;padding:5px 10px;background:#374151;color:#fff;font:12px sans-serif;margin-left:4px}
.wrap{position:relative;height:calc(100vh - 46px)}
#ln{position:absolute;left:0;top:0;width:46px;height:100%;padding:12px 6px 12px 0;box-sizing:border-box;text-align:right;color:#475569;font:13px/1.6 ui-monospace,Consolas,monospace;white-space:pre;overflow:hidden;user-select:none;background:#0b1020;z-index:1}
#hl,#ed{margin:0;padding:12px 14px 12px 54px;font:13px/1.6 ui-monospace,Consolas,monospace;white-space:pre;box-sizing:border-box;border:0}
#hl{position:absolute;inset:0;overflow:hidden;color:#e5e7eb}
#ed{position:absolute;inset:0;overflow:auto;background:transparent;color:transparent;caret-color:#e5e7eb;outline:0;resize:none}
.cm{color:#6b7280;font-style:italic}.st{color:#fbbf24}.kw{color:#c084fc}.id{color:#34d399}.fn{color:#60a5fa}</style></head>
<body><header><b id="title" title="Phim tat: Tab/Shift+Tab thut le · Ctrl+/ comment · Ctrl+D nhan dong · Alt+Up/Down chuyen dong · Ctrl+S luu · Ctrl+Z/Y undo">Code — sua truc tiep · thao tac moi tu dong chen</b><span><button id="bUndo" title="Hoan tac (Ctrl+Z)">↶</button><button id="bRedo" title="Lam lai (Ctrl+Y)">↷</button><span id="stat" title="Tu dong luu vao .spec.ts (Ctrl+S de luu ngay)" style="color:#34d399;font:12px sans-serif;padding:0 8px">💾 Da luu</span><button id="bCopy">Copy</button></span></header>
<div class="wrap"><div id="ln"></div><pre id="hl"></pre><textarea id="ed" spellcheck="false">// Chua co thao tac. Thao tac tren cua so trang ben canh (hoac go truc tiep o day).</textarea></div>
<script>
(function(){
  var $=function(id){return document.getElementById(id);};
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  window.__hl1=function(line){
    var h=esc(line);
    if(line.replace(/^\\s+/,'').indexOf('//')===0) return '<span class="cm">'+h+'</span>';
    h=h.replace(/('[^']*')/g,'<span class="st">$1</span>');
    h=h.replace(/\\b(import|from|test|async|await|const|let|return|true|false|null)\\b/g,'<span class="kw">$1</span>');
    h=h.replace(/\\b(page|expect)\\b/g,'<span class="id">$1</span>');
    h=h.replace(/\\.([a-zA-Z]\\w*)/g,'.<span class="fn">$1</span>');
    return h;
  };
  function hl(){ $('hl').innerHTML=String($('ed').value).split('\\n').map(window.__hl1).join('\\n'); }
  function gutter(){ var n=$('ed').value.split('\\n').length,g='',i; for(i=1;i<=n;i++)g+=i+'\\n'; $('ln').textContent=g; }
  var saveTimer=null;
  function setStat(s){ var el=$('stat'); if(!el)return; if(s==='dirty'){ el.textContent='✏️ chua luu…'; el.style.color='#fbbf24'; } else { el.textContent='💾 Da luu ✔'; el.style.color='#34d399'; } }
  function scheduleSave(){ setStat('dirty'); clearTimeout(saveTimer); saveTimer=setTimeout(doSave,700); } // AUTO-SAVE sau 700ms idle
  function sync(){ hl(); gutter(); var ta=$('ed'); $('hl').scrollTop=ta.scrollTop; $('hl').scrollLeft=ta.scrollLeft; $('ln').scrollTop=ta.scrollTop; scheduleSave(); }
  // === Undo/redo TU QUAN LY (native bi setRangeText pha) -> phu CA go tay LAN action chen ===
  var hist=[],hpos=-1,htimer=null;
  function snap(){ var ta=$('ed'); return {v:ta.value,s:ta.selectionStart,e:ta.selectionEnd}; }
  function commit(){ var cur=snap(); if(hpos>=0&&hist[hpos]&&hist[hpos].v===cur.v){ hist[hpos]=cur; return; } hist=hist.slice(0,hpos+1); hist.push(cur); hpos=hist.length-1; if(hist.length>300){ hist.shift(); hpos--; } }
  function flush(){ clearTimeout(htimer); htimer=null; commit(); }
  function restore(st){ var ta=$('ed'); ta.value=st.v; try{ ta.setSelectionRange(st.s,st.e); }catch(e){} sync(); }
  function undo(){ flush(); if(hpos>0){ hpos--; restore(hist[hpos]); } }
  function redo(){ if(hpos<hist.length-1){ hpos++; restore(hist[hpos]); } }
  function resetHist(){ hist=[snap()]; hpos=0; }
  function tabIndent(shift){ // Tab = 2 space (con tro) hoac indent/unindent cac dong da chon; KHONG nhay focus
    flush(); var ta=$('ed'), v=ta.value, s=ta.selectionStart, e=ta.selectionEnd, T='  ';
    if(s===e&&!shift){ ta.setRangeText(T,s,e,'end'); sync(); commit(); return; }
    var ls=v.lastIndexOf('\\n',s-1)+1, le=v.indexOf('\\n',e>s?e-1:e); if(le<0)le=v.length;
    var out=v.slice(ls,le).split('\\n').map(function(ln){ return shift?ln.replace(/^(\\t| {1,2})/,''):T+ln; }).join('\\n');
    ta.setRangeText(out,ls,le,'select'); sync(); commit();
  }
  function lineRange(){ var ta=$('ed'),v=ta.value,s=ta.selectionStart,e=ta.selectionEnd; var ls=v.lastIndexOf('\\n',s-1)+1, le=v.indexOf('\\n',e>s?e-1:e); if(le<0)le=v.length; return {v:v,ls:ls,le:le}; }
  function insertPoint(){ // chen action moi: tai DONG CON TRO neu con tro trong than test; nguoc lai -> cuoi than (truoc dong dong-cua)
    var ta=$('ed'), v=ta.value, cur=ta.selectionStart, endIdx=v.lastIndexOf('});'); if(endIdx<0)endIdx=v.length;
    var op=v.indexOf('=> {'), bodyStart=op>=0?v.indexOf('\\n',op)+1:-1;
    if(bodyStart>0&&cur>=bodyStart&&cur<=endIdx) return {at:v.lastIndexOf('\\n',cur-1)+1, mode:'end'};  // trong than -> dau dong con tro, con tro nhay xuong
    return {at:endIdx, mode:'preserve'};                                                                  // ngoai than -> cuoi than, giu con tro
  }
  function toggleComment(){ flush(); var r=lineRange(), L=r.v.slice(r.ls,r.le).split('\\n'), single=L.length===1; var consider=single?L:L.filter(function(ln){return ln.trim()!=='';}); if(!consider.length)consider=L; var allC=consider.every(function(ln){return /^\\s*\\/\\//.test(ln);}); var out=L.map(function(ln){ if(!single&&ln.trim()==='')return ln; return allC?ln.replace(/^(\\s*)\\/\\/ ?/,'$1'):ln.replace(/^(\\s*)/,'$1// '); }).join('\\n'); $('ed').setRangeText(out,r.ls,r.le,'select'); sync(); commit(); } // Ctrl+/ (1 dong: comment ca khi rong)
  function dupLine(){ flush(); var r=lineRange(); $('ed').setRangeText('\\n'+r.v.slice(r.ls,r.le), r.le, r.le, 'end'); sync(); commit(); } // Ctrl+D
  function moveLines(dir){ flush(); var ta=$('ed'),v=ta.value,s=ta.selectionStart,e=ta.selectionEnd,lines=v.split('\\n'); var a=v.slice(0,s).split('\\n').length-1, b=v.slice(0,e>s?e-1:e).split('\\n').length-1; if((dir<0&&a===0)||(dir>0&&b===lines.length-1))return; var blk=lines.splice(a,b-a+1); lines.splice.apply(lines,[a+dir,0].concat(blk)); ta.value=lines.join('\\n'); var na=a+dir, off=lines.slice(0,na).join('\\n').length+(na>0?1:0), bt=lines.slice(na,na+blk.length).join('\\n'); ta.selectionStart=off; ta.selectionEnd=off+bt.length; sync(); commit(); } // Alt+Up/Down
  function setDoc(text,count){ $('ed').value=String(text==null?'':text).replace(/\\n+$/,''); window.__applied=count||0; window.__docInit=true; window.__lastCode=$('ed').value; sync(); }
  window.__setFullDoc=setDoc;
  var titleBase='Code — sua truc tiep · thao tac moi tu dong chen';
  function flash(msg){ $('title').textContent=msg; clearTimeout(window.__tt); window.__tt=setTimeout(function(){ $('title').textContent=titleBase; },1700); }
  // Node goi moi khi co thay doi. Lan dau: nap toan bo. Sau do: chi CHEN action moi (act>=applied) vao truoc dong dong-cua, GIU sua tay + con tro.
  window.__renderSpec=function(text,meta){
    meta=meta||[]; var lines=String(text).split('\\n'); window.__lastCode=text;
    if(!window.__docInit){ var c=0,j; for(j=0;j<meta.length;j++){ if(meta[j]&&meta[j].act!=null&&meta[j].act+1>c)c=meta[j].act+1; } setDoc(text,c); resetHist(); return; }
    var add=[],maxA=window.__applied,i,m;
    for(i=0;i<meta.length;i++){ m=meta[i]; if(m&&m.act!=null&&m.act>=window.__applied){ add.push(lines[i]); if(m.act+1>maxA)maxA=m.act+1; } }
    if(add.length){
      window.__applied=maxA; flush();            // chot trang thai TRUOC khi chen -> 1 buoc undo
      var ta=$('ed'), ip=insertPoint();
      ta.setRangeText(add.join('\\n')+'\\n', ip.at, ip.at, ip.mode); sync(); commit();
      flash('⬇ +'+add.length+' thao tac moi'+(ip.mode==='end'?' (tai con tro)':'')+' · undo duoc');
    }
  };
  // Dong bo TOAN BO (dung khi co thay doi cau truc LUI ve truoc, vd wrapper popup). Chi khi CHUA sua tay -> khong mat sua tay.
  window.__resyncSpec=function(text,meta){
    if(window.__userEdited){ window.__renderSpec(text,meta); return; }   // da sua tay -> giu nguyen, chi chen-tang-dan
    meta=meta||[]; var c=0,j; for(j=0;j<meta.length;j++){ if(meta[j]&&meta[j].act!=null&&meta[j].act+1>c)c=meta[j].act+1; }
    setDoc(text,c); resetHist(); flash('↺ dong bo tab moi');
  };
  function copyFlash(){ var b=$('bCopy'),o=b.textContent; b.textContent='Da chep ✔'; setTimeout(function(){b.textContent=o;},1000); }
  $('bCopy').onclick=function(){ try{ navigator.clipboard.writeText($('ed').value); copyFlash(); }catch(e){} };
  $('bUndo').onclick=function(){ $('ed').focus(); undo(); };
  $('bRedo').onclick=function(){ $('ed').focus(); redo(); };
  function doSave(){ clearTimeout(saveTimer); if(window.__saveCode)window.__saveCode($('ed').value); setStat('saved'); } // tu dong goi (sync) + Ctrl+S
  $('ed').addEventListener('input',function(){ window.__userEdited=true; sync(); clearTimeout(htimer); htimer=setTimeout(commit,400); }); // go tay -> commit sau 400ms idle (danh dau da sua tay)
  $('ed').addEventListener('keydown',function(e){
    var k=e.key, ctrl=(e.ctrlKey||e.metaKey);
    if(k==='Tab'){ e.preventDefault(); tabIndent(e.shiftKey); return; }                 // thut le
    if(ctrl&&k==='/'){ e.preventDefault(); toggleComment(); return; }                    // comment //
    if(ctrl&&(k==='s'||k==='S')){ e.preventDefault(); doSave(); return; }                // luu
    if(ctrl&&(k==='d'||k==='D')){ e.preventDefault(); dupLine(); return; }               // nhan dong
    if(e.altKey&&k==='ArrowUp'){ e.preventDefault(); moveLines(-1); return; }            // chuyen dong len
    if(e.altKey&&k==='ArrowDown'){ e.preventDefault(); moveLines(1); return; }           // chuyen dong xuong
    var z=(k==='z'||k==='Z'),y=(k==='y'||k==='Y');
    if(ctrl&&z&&!e.shiftKey){ e.preventDefault(); undo(); }
    else if(ctrl&&(y||(z&&e.shiftKey))){ e.preventDefault(); redo(); }
  });
  $('ed').addEventListener('scroll',function(){ var ta=$('ed'); $('hl').scrollTop=ta.scrollTop; $('hl').scrollLeft=ta.scrollLeft; $('ln').scrollTop=ta.scrollTop; });
})();
</script></body></html>`;

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
  value?: string; key?: string; text?: string; assert?: string; cssProp?: string; file?: string; tag?: string; role?: string; name?: string;
  fragile?: boolean; chosenKind?: string; chosenValue?: string;
  pageIdx?: number;   // thao tac xay ra o tab nao: 0 = page (tab dau), 1 = page1, 2 = page2...
  opensPopup?: number; // click nay MO popup -> idx cua tab moi (de sinh waitForEvent('popup'))
  unique?: { best?: string; all: Cand[] };
  family?: null | { best?: string; count: number; all: Cand[]; within: string };
}

const escStr = (s: any) => String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const pageVar = (idx?: number): string => (idx ? 'page' + idx : 'page'); // 0/undefined -> 'page', 1 -> 'page1'...
function asLocator(best: string | undefined, v: string): string {
  if (!best) return `${v}.locator('body')`;
  if (/^getBy/.test(best)) return `${v}.` + best;                                          // getByRole/getByTestId/...
  if (/^\(*\//.test(best) || best.startsWith('xpath=')) return `${v}.locator('xpath=${escStr(best.replace(/^xpath=/, ''))}')`; // / // hoac (//..)[1]/..
  return `${v}.locator('${escStr(best)}')`;                                                // css: #id, .class, [data-test=...], path
}
// 1 dong code cho 1 action (gotoDone=true -> navigate thanh comment vi da co goto dau).
function bodyLine(a: Action, gotoDone: boolean, v: string): string {
  if (a.type === 'navigate') return gotoDone ? `  // -> ${a.url}` : `  await ${v}.goto('${escStr(a.url)}');`;
  if (a.type === 'goback') return `  await ${v}.goBack();   // -> ${a.url}`;
  if (a.type === 'goforward') return `  await ${v}.goForward();   // -> ${a.url}`;
  if (a.type === 'screenshot') return `  await ${v}.screenshot({ path: '${a.file}', fullPage: true });`;
  const t = asLocator(a.unique?.best, v);
  switch (a.type) {
    case 'fill': return `  await ${t}.fill('${escStr(a.value)}');`;
    case 'select': return `  await ${t}.selectOption('${escStr(a.value)}');`;
    case 'press': return `  await ${t}.press('${escStr(a.key)}');`;
    case 'click': return `  await ${t}.click();`;
    case 'rightclick': return `  await ${t}.click({ button: 'right' });`;
    case 'dblclick': return `  await ${t}.dblclick();`;
    case 'hover': return `  await ${t}.hover();`;
    case 'pick': return `  // pick locator: ${a.unique?.best ?? ''}`;
    case 'assert':
      if (a.assert === 'visible') return `  await expect(${t}).toBeVisible();`;
      if (a.assert === 'text') return `  await expect(${t}).toContainText('${escStr(a.text)}');`;
      if (a.assert === 'value') return `  await expect(${t}).toHaveValue('${escStr(a.value)}');`;
      if (a.assert === 'css') return `  await expect(${t}).toHaveCSS('${escStr(a.cssProp)}', '${escStr(a.value)}');`;
      return '';
    default: return '';
  }
}

// Sinh cac DONG spec + metadata (act = vi tri trong actions[] de XOA buoc, fragile) — dung chung cho text
// (currentSpec) va render co cau truc o cua so code (so dong / nut xoa / co fragile).
type SpecLine = { line: string; act: number | null; fragile: boolean };
function specLines(acts: Action[]): SpecLine[] {
  const out: SpecLine[] = [];
  const add = (line: string, act: number | null = null, fragile = false) => out.push({ line, act, fragile });
  const fragileN = acts.filter((a) => a.fragile).length;
  add(`import { test, expect } from '@playwright/test';`);
  add('');
  if (fragileN) { add(`// ⚠ ${fragileN} selector mong manh (🔴) — nen thay bang data-testid.`); add(''); }
  add(`test('${NAME}', async ({ page }) => {`);
  let gotoDone = false;
  acts.forEach((a, idx) => {
    const v = pageVar(a.pageIdx);
    // Click MO tab moi -> dat promise TRUOC click (giong Playwright codegen). 3 dong cung act=idx -> chen-tang-dan cung luc.
    if (a.opensPopup != null) add(`  const ${pageVar(a.opensPopup)}Promise = ${v}.waitForEvent('popup');`, idx);
    let line = bodyLine(a, gotoDone, v);
    if (a.type === 'navigate') gotoDone = true;
    if (line) { if (a.fragile) line += '  // 🔴 selector mong manh'; add(line, idx, !!a.fragile); } // act -> actions[idx]; fragile -> comment inline
    if (a.opensPopup != null) add(`  const ${pageVar(a.opensPopup)} = await ${pageVar(a.opensPopup)}Promise;`, idx); // SAU click -> nhan tab moi
  });
  add('});');
  add('');
  return out;
}

// Code TU SINH tu thao tac (cho lan nap dau + nut "Tao lai"). User sua truc tiep tren cua so -> textarea la nguon that.
function currentSpec(acts: Action[]): string {
  return specLines(acts).map((l) => l.line).join('\n');
}

async function writeOutput(actions: Action[], docText?: string | null, userEdited?: boolean): Promise<void> {
  await fs.writeFile(path.join(DIR, `${NAME}.json`), JSON.stringify(actions, null, 2));
  // SUA TAY -> ton trong noi dung editor; CHUA sua -> currentSpec (model, chac chan dung pattern popup page1/page2).
  const spec = (userEdited && docText && docText.trim()) ? docText : currentSpec(actions);
  await fs.writeFile(path.join(DIR, `${NAME}.spec.ts`), spec);

  const fragileN = actions.filter((a) => a.fragile).length;
  const L: string[] = [`# Recording: ${NAME}`, '', `Bat dau: ${START_URL}`, '',
    fragileN ? `> 🔴 ${fragileN} action dung SELECTOR MONG MANH (positional path) -> nen them data-testid cho element do.` : '> Selector deu on dinh (khong positional). 👍',
    '', 'n = so element khop. unique nen n=1. family = nhom item lap (n>=2) -> .filter({hasText}).', ''];
  for (const a of actions) {
    if (a.type === 'navigate') { L.push(`${a.i}. **navigate** -> ${a.url}`); continue; }
    if (a.type === 'goback') { L.push(`${a.i}. **goBack** -> ${a.url}`); continue; }
    if (a.type === 'goforward') { L.push(`${a.i}. **goForward** -> ${a.url}`); continue; }
    if (a.type === 'screenshot') { L.push(`${a.i}. **screenshot** -> \`${a.file}\``); continue; }
    let head;
    if (a.type === 'assert') {
      const ex = a.assert === 'text' ? ` "${a.text ?? ''}"` : a.assert === 'value' ? ` = \`${a.value ?? ''}\`` : a.assert === 'css' ? ` ${a.cssProp} = \`${a.value ?? ''}\`` : '';
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
  // RECORD_CHANNEL: dung trinh duyet HE THONG ('chrome'/'msedge') thay vi Chromium dong goi.
  // Can khi ban Chromium CfT dong goi khong chay duoc headed (vd loi side-by-side tren Windows).
  const CHANNEL = (process.env.RECORD_CHANNEL || process.env.BROWSER_CHANNEL || '').trim();
  const browser = await chromium.launch({ headless: SELF_TEST, ...(CHANNEL ? { channel: CHANNEL } : {}) }); // that: headed de user thao tac
  if (CHANNEL) console.log(`(dung trinh duyet he thong: channel='${CHANNEL}')`);
  // viewport: null -> trang co theo kich thuoc CUA SO THAT (khong cung 1280) de UI khop khi dock.
  const ctx: BrowserContext = await browser.newContext({ viewport: null, ...(STORAGE ? { storageState: STORAGE } : {}) });

  const actions: Action[] = [];
  let renderCode: (full?: boolean) => Promise<unknown> = async () => {}; // cap nhat cua so code (full=dong bo toan bo)
  const pageIndex = new Map<Page, number>(); // moi tab -> idx (tab dau 0 = 'page', popup 1,2.. = 'page1','page2')
  let pageSeq = 0;
  // Trang thai recorder GIU O NODE de khong bi reset khi chuyen trang (Rec on/off, vi tri toolbar)
  let recState: { paused: boolean; codeOpen?: boolean; chooseMode?: boolean; pos: { left: string; top: string } | null } = { paused: false, chooseMode: true, pos: null };
  await ctx.exposeBinding('__recGetState', () => ({ ...recState, code: currentSpec(actions) })); // tra ca state + code hien tai
  await ctx.exposeBinding('__recSetState', (_s, p: any) => { recState = { ...recState, ...p }; });

  // Node nhan tung thao tac tu trong trang
  await ctx.exposeBinding('__record', (source: any, a: any) => {
    if (recState.paused) return;             // Rec off -> khong ghi (ke ca ngay sau redirect)
    if (a.unique?.all) {
      const win = a.unique.all.find((s: Cand) => s.n === 1) || a.unique.all[0]; // all DA xep hang san (inject.js) -> day = ⭐ de xuat; chon TRUOC khi loc hien thi
      a.unique.best = win?.value;
      a.fragile = !!win?.fragile;                                               // best la selector positional?
      a.unique.all = a.unique.all.filter((s: Cand) => KEEP.includes(s.kind));   // RECORD_SELECTORS chi loc HIEN THI
    }
    if (a.chosenValue && a.unique) {                                            // user da chon selector trong picker (cho MOI action)
      a.unique.best = a.chosenValue;
      a.fragile = a.chosenKind === 'cssPath' || a.chosenKind === 'xpathPath';
    }
    if (a.family?.all) a.family.best = (a.family.all.find((s: Cand) => (s.n ?? 0) >= 2) || a.family.all[0])?.value;
    a.pageIdx = pageIndex.get(source.page) ?? 0;   // thao tac o tab nao -> bien page/page1...
    a.i = actions.length + 1;
    actions.push(a);
    const tl = a.type === 'assert' ? `assert:${a.assert}` : a.type;
    const v = a.value != null ? `="${a.value}"` : a.text != null ? `="${a.text}"` : '';
    const f = a.family ? `  | family: ${a.family.best} x${a.family.count}` : '';
    console.log(`#${a.i} ${tl}${v}  ${a.unique?.best || ''}${a.fragile ? ' ⚠FRAGILE' : ''}${f}`);
    source.page.evaluate((c: string) => (window as any).__recRenderCode && (window as any).__recRenderCode(c), currentSpec(actions)).catch(() => {}); // panel trong trang (neu bat)
    renderCode(); // cua so rieng (ngay lap tuc; popup se goi renderCode(true) sau)
  });

  let shotN = 0;
  await ctx.exposeBinding('__shot', async (source: any) => {
    const pg = source.page; shotN += 1; const rel = `shots/shot-${shotN}.png`;
    await fs.mkdir(path.join(DIR, 'shots'), { recursive: true });
    const ids = ['__rec_ui', '__rec_codebox', '__rec_menu', '__rec_picker', '__rec_csspick', '__rec_hl', '__rec_tip'];
    await pg.evaluate((list: string[]) => list.forEach((id) => { const e: any = document.getElementById(id); if (e) { e.__prev = e.style.display; e.style.display = 'none'; } }), ids).catch(() => {}); // an UI recorder
    await pg.screenshot({ path: path.join(DIR, rel), fullPage: true }).catch(() => {});
    await pg.evaluate((list: string[]) => list.forEach((id) => { const e: any = document.getElementById(id); if (e) e.style.display = e.__prev || ''; }), ids).catch(() => {}); // hien lai UI
    actions.push({ i: actions.length + 1, type: 'screenshot', file: rel, url: pg.url(), ts: 0, pageIdx: pageIndex.get(pg) ?? 0 });
    renderCode();
    console.log(`#${actions.length} screenshot -> ${rel}`);
  });

  const inject = await fs.readFile(path.join(HERE, 'inject.js'), 'utf8');
  await ctx.addInitScript({ content: inject });

  // Lich su URL moi tab -> phat hien nut Back/Forward (URL khop muc ke lich su + KHONG do click vua roi gay ra).
  const navState = new WeakMap<Page, { hist: string[]; idx: number }>();
  const pushNav = (p: Page, url: string) => {
    if (recState.paused) return;             // Rec off -> khong ghi navigate
    let st = navState.get(p); if (!st) { st = { hist: [], idx: -1 }; navState.set(p, st); }
    if (st.hist[st.idx] === url) return;     // dedupe (framenavigated co the ban nhieu lan cho 1 lan dieu huong)
    const last = actions[actions.length - 1];
    const clickInduced = !!last && ['click', 'dblclick', 'rightclick', 'press', 'fill', 'select'].includes(last.type) && (Date.now() - (last.ts || 0) < 1000);
    let type = 'navigate';
    if (!clickInduced && st.hist[st.idx - 1] === url) { st.idx--; type = 'goback'; }          // nut Back
    else if (!clickInduced && st.hist[st.idx + 1] === url) { st.idx++; type = 'goforward'; }   // nut Forward
    else { st.hist = st.hist.slice(0, st.idx + 1); st.hist.push(url); st.idx++; }              // dieu huong moi (do click hoac URL moi)
    actions.push({ i: actions.length + 1, type, url, ts: Date.now(), pageIdx: pageIndex.get(p) ?? 0 });
    console.log(`#${actions.length} ${type} ${url}`);
    renderCode();
  };
  const tracked = new WeakSet<Page>();
  const attachNav = (p: Page): void => {
    if (tracked.has(p)) return;
    tracked.add(p);
    if (!pageIndex.has(p)) pageIndex.set(p, pageSeq++); // tab dau = 0 (page), popup = 1,2.. (page1, page2)
    p.on('framenavigated', (f) => { if (f === p.mainFrame()) pushNav(p, f.url()); });
    // Re-inject MANH cho popup/tab moi: addInitScript doi khi MISS, hoac 'page' event toi SAU khi DCL da chay
    // (gan handler muon -> bo lo -> truoc day phai F5). Inject NGAY + tren ca domcontentloaded/load. Guard __recInjected -> idempotent.
    const reinject = () => p.evaluate(inject).catch(() => {});
    p.on('domcontentloaded', reinject);
    p.on('load', reinject);
    reinject(); // truong hop trang da load XONG truoc khi kip gan handler (race -> truoc day phai F5)
    [400, 1200, 2500].forEach((ms) => setTimeout(reinject, ms)); // du phong: popup redirect nhieu lan / SPA cham -> dam bao inject chay it nhat 1 lan
  };
  // Tab/popup moi: gan index + theo doi nav; neu la popup -> tim click cha gay ra no -> danh dau opensPopup.
  ctx.on('page', (p) => {
    attachNav(p);
    const idx = pageIndex.get(p);
    if (!idx) return;                              // idx 0 = tab dau, khong phai popup
    p.opener().then((opener) => {
      const openerIdx = opener && pageIndex.has(opener) ? (pageIndex.get(opener) as number) : 0;
      for (let k = actions.length - 1; k >= 0; k--) {  // click/dblclick GAN NHAT tren tab cha -> gan opensPopup
        const act = actions[k];
        if ((act.pageIdx ?? 0) === openerIdx && (act.type === 'click' || act.type === 'dblclick')) { act.opensPopup = idx; break; }
      }
      renderCode(true);                            // dong bo TOAN BO -> hien wrapper popup (chen lui ve truoc click)
    }).catch(() => {});
  });

  const page: Page = await ctx.newPage();
  attachNav(page);
  // 'domcontentloaded' (DOM san sang la du de thao tac) thay vi 'load' (cho HET tai nguyen -> SPA hay treo).
  // Timeout rong + .catch -> trang cham KHONG lam chet phien ghi (cu cho/F5 roi thao tac).
  await page.goto(START_URL, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
    .catch((e) => console.warn(`  ⚠ Tai trang cham/timeout: ${String(e.message).split('\n')[0]}\n     Trang co the van dung duoc — doi tai xong hoac F5 roi thao tac binh thuong.`));

  // CUA SO RIENG hien code (context rieng -> khong bi recorder chen UI, khong bi ghi)
  const codeCtx = await browser.newContext({ viewport: null }); // co theo cua so -> nut Edit/Save/Copy khong bi tran ra ngoai
  await codeCtx.addInitScript('window.__name = window.__name || function (f) { return f; };'); // tranh loi __name khi highlight
  await codeCtx.exposeBinding('__saveCode', async (_s: any, text: string) => { await fs.writeFile(path.join(DIR, `${NAME}.spec.ts`), text).catch(() => {}); }); // AUTO-SAVE (im lang; trang thai hien o cua so code)
  const codePage = await codeCtx.newPage();
  await codePage.setContent(CODE_HTML);
  renderCode = (full?: boolean) => {
    const sl = specLines(actions);
    const payload = { text: sl.map((l) => l.line).join('\n'), meta: sl.map((l) => ({ act: l.act, fragile: l.fragile })), full: !!full };
    return codePage.evaluate((d: { text: string; meta: { act: number | null; fragile: boolean }[]; full: boolean }) => {
      // full=true (vd vua mo popup -> can chen dong lui ve truoc click) -> dong bo TOAN BO neu chua sua tay; nguoc lai chen-tang-dan.
      if (d.full && (window as any).__resyncSpec) (window as any).__resyncSpec(d.text, d.meta);
      else if ((window as any).__renderSpec) (window as any).__renderSpec(d.text, d.meta);
      else (window as any).__lastCode = d.text;
    }, payload).catch(() => {});
  };
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
    await page.waitForLoadState('domcontentloaded');
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
    // Test assert CSS (List SL OFF -> best selector): css mode -> click element -> chon thuoc tinh dau
    await page.evaluate(() => (window as any).__recSetInspect && (window as any).__recSetInspect('css'));
    await page.click('.inventory_item_name'); // -> mo bang chon thuoc tinh CSS
    await page.click('#__rec_csspick .__rec_csr'); // chon thuoc tinh dau (text-transform) -> log assert css
    await page.waitForTimeout(200);
    // MULTI-TAB/POPUP: mo popup toi URL that (same-origin) -> kiem ctx.on('page') bat + TOOLBAR hien KHONG can reload
    const popupBefore = pageSeq;
    const [popupPg] = await Promise.all([
      ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null),
      page.evaluate(() => window.open('/inventory.html', '_blank')),
    ]);
    let toolbarOnPopup = false;
    if (popupPg) {
      await popupPg.waitForLoadState('domcontentloaded').catch(() => {});
      for (let r = 0; r < 6 && !toolbarOnPopup; r++) { // doi reinject (ngay/DCL/load) gan toolbar
        toolbarOnPopup = await popupPg.locator('#__rec_ui').count().then((c: number) => c > 0).catch(() => false);
        if (!toolbarOnPopup) await popupPg.waitForTimeout(300);
      }
    }
    console.log('POPUP: tab moi =', pageSeq > popupBefore, '| toolbar tab moi (khong reload) =', toolbarOnPopup);
    let recordedOnPopup = false;
    if (popupPg) { // thao tac THAT tren tab moi -> phai ghi action voi pageIdx=1 (khong can reload)
      const popActsBefore = actions.length;
      await popupPg.locator('#react-burger-menu-btn').first().click({ timeout: 5000 }).catch(() => {}); // nut hamburger luon co, khong doi gio/khong dieu huong
      await popupPg.waitForTimeout(400);
      recordedOnPopup = actions.slice(popActsBefore).some((a) => a.pageIdx === 1 && a.type === 'click');
    }
    console.log('POPUP-RECORD: thao tac tren tab moi ghi duoc (pageIdx=1) =', recordedOnPopup);
    // SPA mo phong: thay TOAN BO body (xoa toolbar) -> phai TU GAN LAI (reattach observer)
    let toolbarReattach = false;
    if (popupPg && toolbarOnPopup) {
      await popupPg.evaluate(() => { var d = document.createElement('div'); d.textContent = 'spa rerender'; document.body.replaceChildren(d); });
      for (let r = 0; r < 8 && !toolbarReattach; r++) {
        toolbarReattach = await popupPg.locator('#__rec_ui').count().then((c: number) => c > 0).catch(() => false);
        if (!toolbarReattach) await popupPg.waitForTimeout(250);
      }
    }
    console.log('POPUP-SURVIVE: toolbar con sau khi SPA thay toan bo body =', toolbarReattach);
    // POPUP (don vi code-gen): actions gia lap co opensPopup -> sinh page/page1 + waitForEvent('popup')
    const popupActs: Action[] = [
      { i: 1, type: 'click', url: '', ts: 0, pageIdx: 0, opensPopup: 1, unique: { best: "getByRole('button', { name: 'Open' })", all: [] } },
      { i: 2, type: 'click', url: '', ts: 0, pageIdx: 1, unique: { best: "getByRole('link', { name: 'Detail' })", all: [] } },
    ];
    const popGen = currentSpec(popupActs);
    console.log('POPUP-CODEGEN: wrapper =', popGen.includes("const page1Promise = page.waitForEvent('popup');") && popGen.includes('const page1 = await page1Promise;'), '| switch page1 =', popGen.includes("await page1.getByRole('link', { name: 'Detail' }).click();"));
    await page.evaluate(() => (window as any).__shot && (window as any).__shot()); // chup screenshot
    await page.waitForTimeout(300);
    // Auto-save: sua truc tiep -> TU DONG ghi file (khong bam Save)
    await codePage.fill('#ed', "import { test } from '@playwright/test';\ntest('x', async ({ page }) => {\n  // MANUAL EDIT\n});\n").catch(() => {});
    await page.waitForTimeout(900); // cho auto-save (debounce 700ms)
    const edited = await fs.readFile(path.join(DIR, `${NAME}.spec.ts`), 'utf8').catch(() => '');
    console.log('AUTO-SAVE: file co "// MANUAL EDIT" =', edited.includes('// MANUAL EDIT'));
    // Live action khi dang sua: click app -> CHEN dong moi vao editor, KHONG ghi de '// MANUAL EDIT'
    await page.click('[data-test="add-to-cart-sauce-labs-bolt-t-shirt"]').catch(() => {});
    await page.waitForTimeout(250);
    const av = await codePage.evaluate(() => (document.getElementById('ed') as HTMLTextAreaElement).value);
    console.log(`LIVE-INSERT: co 'bolt-t-shirt'=${av.includes('bolt-t-shirt')} | giu '// MANUAL EDIT'=${av.includes('// MANUAL EDIT')}`);
    // Undo/redo TU QUAN LY: undo bo action vua chen NHUNG giu sua tay; redo lay lai
    await page.waitForTimeout(450); // cho commit go tay (neu con)
    await codePage.click('#bUndo').catch(() => {});
    await page.waitForTimeout(120);
    const auv = await codePage.evaluate(() => (document.getElementById('ed') as HTMLTextAreaElement).value);
    console.log(`UNDO: bo 'bolt-t-shirt'=${!auv.includes('bolt-t-shirt')} | giu '// MANUAL EDIT'=${auv.includes('// MANUAL EDIT')}`);
    await codePage.click('#bRedo').catch(() => {});
    await page.waitForTimeout(120);
    const arv = await codePage.evaluate(() => (document.getElementById('ed') as HTMLTextAreaElement).value);
    console.log(`REDO: lay lai 'bolt-t-shirt'=${arv.includes('bolt-t-shirt')}`);
    // Chen TAI CON TRO: dat con tro o dong "// MANUAL EDIT" (trong than) roi ghi -> action chen TAI do (truoc), khong xuong cuoi
    await codePage.evaluate(() => { const t = document.getElementById('ed') as HTMLTextAreaElement; const i = t.value.indexOf('// MANUAL EDIT'); t.focus(); t.setSelectionRange(i, i); });
    await page.click('[data-test="add-to-cart-sauce-labs-bike-light"]').catch(() => {});
    await page.waitForTimeout(250);
    const cv = await codePage.evaluate(() => (document.getElementById('ed') as HTMLTextAreaElement).value);
    const iB = cv.indexOf('bike-light'), iM = cv.indexOf('// MANUAL EDIT');
    console.log(`CURSOR-INSERT: bike-light truoc // MANUAL EDIT = ${iB >= 0 && iB < iM} (tai con tro, khong xuong cuoi)`);
    // Phim Tab: chen 2 space tai con tro, KHONG nhay focus
    await codePage.evaluate(() => { const t = document.getElementById('ed') as HTMLTextAreaElement; t.value = 'AB'; t.focus(); t.setSelectionRange(1, 1); });
    await codePage.press('#ed', 'Tab').catch(() => {});
    await page.waitForTimeout(100);
    const tabv = await codePage.evaluate(() => ({ v: (document.getElementById('ed') as HTMLTextAreaElement).value, focused: document.activeElement?.id }));
    console.log(`TAB TEST: "AB"+Tab@1 -> "${tabv.v}" (ky vong "A  B") | con focus #ed=${tabv.focused === 'ed'}`);
    // Ctrl+/ comment toggle
    await codePage.evaluate(() => { const t = document.getElementById('ed') as HTMLTextAreaElement; t.value = 'hello'; t.focus(); t.setSelectionRange(0, 0); });
    await codePage.press('#ed', 'Control+/').catch(() => {});
    const cmt = await codePage.evaluate(() => (document.getElementById('ed') as HTMLTextAreaElement).value);
    await codePage.press('#ed', 'Control+/').catch(() => {});
    const uncmt = await codePage.evaluate(() => (document.getElementById('ed') as HTMLTextAreaElement).value);
    console.log(`COMMENT: "hello" -> "${cmt}" -> "${uncmt}" (ky vong "// hello" -> "hello")`);
    // Comment tren dong RONG (truoc bi loi)
    await codePage.evaluate(() => { const t = document.getElementById('ed') as HTMLTextAreaElement; t.value = ''; t.focus(); t.setSelectionRange(0, 0); });
    await codePage.press('#ed', 'Control+/').catch(() => {});
    const ecmt = await codePage.evaluate(() => (document.getElementById('ed') as HTMLTextAreaElement).value);
    console.log(`COMMENT EMPTY: "" -> "${ecmt}" (ky vong "// ")`);
    // Ctrl+D nhan dong
    await codePage.evaluate(() => { const t = document.getElementById('ed') as HTMLTextAreaElement; t.value = 'X'; t.focus(); t.setSelectionRange(0, 0); });
    await codePage.press('#ed', 'Control+d').catch(() => {});
    const dup = await codePage.evaluate(() => (document.getElementById('ed') as HTMLTextAreaElement).value);
    console.log(`DUP: "X"+Ctrl+D -> "${dup.replace(/\n/g, '\\\\n')}" (ky vong "X\\nX")`);
    // Back/Forward trinh duyet -> page.goBack()/goForward() (khong phai comment)
    await page.waitForTimeout(1100); // dam bao dieu huong KHONG bi tinh la do click vua roi
    await page.goBack().catch(() => {});     // inventory -> saucedemo (login)
    await page.waitForTimeout(500);
    await page.goForward().catch(() => {});  // saucedemo -> inventory
    await page.waitForTimeout(500);
    console.log(`BACK/FWD: goback=${actions.some((a) => a.type === 'goback')} goforward=${actions.some((a) => a.type === 'goforward')}`);
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
    const win = await codePage.evaluate(() => { const t = document.getElementById('ed') as HTMLTextAreaElement; t.value = "await page.locator('#x').click();"; t.dispatchEvent(new Event('input', { bubbles: true })); return { len: t.value.length, hl: (document.getElementById('hl')?.innerHTML || '').includes('<span'), ln: (document.getElementById('ln')?.textContent || '').trim().split('\n').length }; });
    console.log(`CODE WINDOW: ${win.len} ky tu, highlight=${win.hl}, gutter ${win.ln} so dong`);
    const cssA = actions.find((a) => a.type === 'assert' && a.assert === 'css');
    console.log('CSS ASSERT:', cssA ? `toHaveCSS('${cssA.cssProp}','${String(cssA.value || '').slice(0, 20)}')` : '(KHONG co)');
  } else {
    // Cho VO THOI HAN: ket thuc khi dong trinh duyet hoac Ctrl+C.
    // (Truoc day dung page.waitForEvent('close') -> co timeout mac dinh 30s nen tu dung.)
    await new Promise<void>((resolve) => {
      page.on('close', () => resolve());        // dong cua so trang app -> ket thuc (du cua so code con mo)
      browser.on('disconnected', () => resolve());
      process.on('SIGINT', () => resolve());
    });
  }

  const docText = await codePage.evaluate(() => { const e = document.getElementById('ed') as HTMLTextAreaElement | null; return e ? e.value : null; }).catch(() => null); // noi dung editor (nguon that)
  const userEdited = await codePage.evaluate(() => !!(window as any).__userEdited).catch(() => false); // user co go tay khong
  await writeOutput(actions, docText, userEdited);
  try { await browser.close(); } catch (e) { /* trinh duyet da dong */ }
  console.log(`\n✔ ${actions.length} thao tac -> recording/${NAME}/ { ${NAME}.json · ${NAME}.md · ${NAME}.spec.ts }`);
}

main().catch((e) => { console.error(e); process.exit(1); });
