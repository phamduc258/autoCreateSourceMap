# HANDOFF — Tool lấy DOM để AI sinh Playwright test

> File tóm tắt để **tiếp tục công việc ở một session Claude khác**. Đọc file này là nắm đủ bối cảnh.
> Tạo: 2026-06-03 · **Cập nhật: 2026-06-05.**
> Trạng thái: 2 tool (Crawler + Recorder) chạy được. **Đang cắm SITE THẬT (PORTERS HRBC staging) bằng RECORDER + Chrome hệ thống.**
> Đọc thêm `README.md` (đã đầy đủ: yêu cầu môi trường, cài đặt, .env, troubleshooting).

---

## 1. Mục tiêu

Người dùng là **tester**. Muốn: đưa cho Claude **1 file test case** → Claude sinh **Playwright test (TypeScript)** với selector chính xác. Vấn đề cốt lõi: Claude cần "nhìn thấy" **DOM/selector** của từng màn.

## 2. Ràng buộc

- **Không có source code** app. **Không dựng được local.** Chỉ có **test case** + **site test chạy qua mạng**.
- **Máy hiện tại (Windows):** ⚠️ `cdn.playwright.dev` **bị chặn** (không tải được Chromium đóng gói) + bản Chromium đóng gói (Chrome for Testing) **lỗi side-by-side (SxS)** khi chạy headed. → **Phải dùng TRÌNH DUYỆT HỆ THỐNG** (Chrome 148 cài sẵn) — xem mục 4 & 10.

## 3. Phương án đã chốt

| Quyết định | Lựa chọn |
|---|---|
| Crawler click nút | **Theo cấu hình** — chỉ click action khai báo (an toàn) |
| Lưu mỗi màn | **Output 2 tầng** (index.md + screens/*.md, đã verify) |
| Đăng nhập | **Form user/mật khẩu** (lưu storageState) |
| Trình duyệt (máy này) | **Chrome hệ thống** qua `BROWSER_CHANNEL=chrome` (không dùng Chromium đóng gói) |

## 4. TRẠNG THÁI HIỆN TẠI ✅

- ✅ `npm install` xong. Playwright `^1.49.0` (npm cài **1.60.x**). `package.json` để range, **không ghim** (dùng Chrome hệ thống nên không phụ thuộc browser đóng gói).
- ✅ **Trình duyệt = Chrome hệ thống cho TẤT CẢ tool.** `.env` có `BROWSER_CHANNEL=chrome` (Chrome 148.0.7778.217 đã cài). Lý do: CDN chặn + bản đóng gói lỗi SxS (xem mục 2). Recorder/crawler/test đều chạy qua Chrome này (headed + headless đều OK), **không cần** `npx playwright install chromium`.
- ✅ Crawler demo OK trên saucedemo (cũ). Recorder các tính năng đã verify (xem mục 9).
- 🔄 **ĐANG LÀM — site thật:** PORTERS HRBC staging `https://staging-hrbc-jp.porterscloud.com/index/login`. Dùng **RECORDER** (không phải crawler-config) vì form động. Form `求人` (job) là **SPA custom**: id dạng GUID, class dạng `jssNNN` — **đổi mỗi lần build/run** → selector trực tiếp vào id/class KHÔNG bền → dùng **`label→input`** (neo theo text label, xem mục 9).

## 5. Cấu trúc project

```
crawler/                  # TOOL A — crawl tự động theo config
  config.ts               # *** USER SỬA *** login + pages + actions (đang là saucedemo)
  crawl.ts                # login → quét → VERIFY count() → xuất index.md + screens/*.md
  extract.ts              # chạy trong browser: quét element + sinh ứng viên selector
recorder/                 # TOOL B — ghi thao tác kiểu codegen (xem mục 9)
  record.ts               # Node: bindings, specLines/currentSpec, cửa sổ code, dock, state, channel
  inject.js               # chạy trong trang: toolbar + sinh selector (unique/family/label→input) + picker
output/                   # (gitignored) kết quả crawl
recording/<name>/         # kết quả record: {.json, .md, .spec.ts, shots/} (output, xóa được)
tests/ + testcases/       # demo POM saucedemo (PASS) + test case mẫu
.env (gitignored)         # BROWSER_CHANNEL=chrome + (tùy) BASE_URL/TEST_USER/TEST_PASS
playwright.config.ts · package.json · tsconfig.json · README.md · .gitignore
```

## 6. Crawler (TOOL A) — tóm tắt

Login 1 lần (lưu `output/.auth/state.json`, `npm run relogin` để login lại) → mỗi `page`: `goto` (**`domcontentloaded`**, không `networkidle`) → quét → **VERIFY** mỗi locator bằng `count()`, giữ cái khớp đúng 1 → chỉ click `action` khai báo. Output 2 tầng: `output/index.md` (mỗi màn 1 dòng) + `output/screens/<id>.md` (bảng selector, `✓`/`⚠N`/`✗0`). Đọc `BROWSER_CHANNEL` để chọn trình duyệt.

## 7. Demo cũ (bằng chứng pipeline) — saucedemo

`crawler/config.ts` cấu hình saucedemo → `npm run crawl` → `output/` → từ `testcases/TC001-checkout.md` sinh `tests/checkout.spec.ts` (POM Login/Inventory/Cart/Checkout) → `npx playwright test` → **1 passed**. Là template POM tái dùng.

## 8. SITE THẬT (PORTERS HRBC) — cách làm tiếp

1. `.env`: `BROWSER_CHANNEL=chrome` (đã có). Site cần login → dùng recorder ghi cả bước login, hoặc tạo storageState rồi `RECORD_STORAGE=...`.
2. Chạy: `npm run record -- https://staging-hrbc-jp.porterscloud.com/index/login --name=TCxxx`
3. Thao tác trên Chrome mở ra → recorder ghi. Form custom → mở **🎯 Pick** / để **📋 List SL** ON → chọn selector **`label→input`** (⭐ đề xuất) cho các ô không có testid.
4. Đóng cửa sổ app (hoặc Ctrl+C) → ra `recording/TCxxx/` → đưa `.json`/`.spec.ts` cho Claude sinh test hoàn chỉnh.

## 9. RECORDER (TOOL B) — đầy đủ tính năng

**Chạy:**
```bash
npm run record -- <url> --name=TC001                 # ĐÓNG cửa sổ app hoặc Ctrl+C để kết thúc
RECORD_STORAGE=output/.auth/state.json npm run record -- <url> --name=TC002   # login sẵn
RECORD_TIMEOUT=120000 npm run record -- <url> --name=TC003                    # site rất chậm
```
(Trình duyệt: `.env` `BROWSER_CHANNEL=chrome` → mở Chrome hệ thống, headed.)

**Output `recording/<name>/`:** `.spec.ts` (chạy được) · `.json` (bản giàu cho Claude: mỗi action có `unique.best`/`unique.all` + `family`) · `.md` · `shots/`.

**Toolbar (chỉ ICON, hover ra tooltip giải thích):**
- **Chính (luôn hiện):** ☰ kéo · **●** Rec · **📋** List SL (ON = mở bảng chọn selector · OFF = tự lấy best) · **🎯** Pick · **⋯** More.
- **Nhóm ⋯ (tool phụ):** **👁** Visible · **🔤** Text · **=** Value · **🎨** CSS · **📷** Shot. Mở ⋯ **cố định mép trái → nở sang phải** (không nhảy); trạng thái mở giữ qua chuyển trang.
- Đã **bỏ nút `</> Code`** (đã có cửa sổ live code riêng).
- **Bền:** có trên **tab/popup mới** (re-inject khi `domcontentloaded`, guard chống nhân đôi) + **tự gắn lại** khi SPA re-render `<body>` (MutationObserver). State giữ qua chuyển trang.

**Bảng "Pick locator" — KÉO được (kéo header để di chuyển) — 2 mục tách biệt:**
- **SELECTOR CHO ELEMENT** — **sort theo độ uy tín + số khớp**: (1) khớp đúng 1 & không mong manh → (2) đúng 1 nhưng positional 🔴 → (3) `⚠N` → (4) không khớp; trong nhóm theo độ tin cậy loại (`testId`>`#id`>`role`>`label→input`>…>`class`>positional). Dòng đầu = **⭐ đề xuất**. Hiện số khớp mỗi dòng. Click để dùng + copy.
- **FAMILY — nhóm item lặp** (chỉ khi element trong list/bảng): selector cụm item + `within` → assertion "data trong list". Click để copy.
- **Auto-pick khi CLICK (và List SL OFF) dùng CÙNG xếp hạng** → selector ghi tự động == **⭐ đề xuất** (1 nguồn: `uniqueCandidates()` đã sort sẵn). Bảng CSS (🎨) cũng kéo được tương tự.

**`label→input` (CỐT LÕI cho form custom id/class đổi):** neo theo TEXT label → leo lên cụm cha chứa control → xuống control:
`(//*[normalize-space()="<label>"])[1]/ancestor-or-self::*[.//<tag>][1]/descendant::<tag>[1]`. **Tự kiểm chứng** (đánh giá xpath, so `=== el` đúng element vừa chọn); nếu trùng tên ở nơi khác (vd dropdown header ngoài modal) → **tự bọc scope** `aria-modal`/`role`/`aria-label`/`#id` rồi verify lại. Chỉ sinh cho **text/textarea/select** (radio/checkbox dùng `getByRole`).

**Cửa sổ code riêng** (context riêng, dock phải, **`viewport:null`**) — **1 EDITOR DUY NHẤT** (luôn sửa được; số dòng + syntax highlight overlay). **Bỏ tách Live/Edit + structured-delete.**
- **Tự sinh + sửa tay chung 1 chỗ:** action mới **tự chèn** (tại **dòng con trỏ** nếu con trỏ trong thân `=> {…});`, ngược lại **cuối thân**), **giữ nguyên** phần đang sửa + con trỏ (`setRangeText 'preserve'`).
- **AUTO-SAVE** vào `.spec.ts` sau 700ms ngừng (header "💾 Đã lưu ✔" / "✏️ chưa lưu…"). Không nút Save/Tạo lại; **Ctrl+S** lưu ngay.
- **Undo/redo TỰ QUẢN LÝ** (snapshot): phủ **cả sửa tay LẪN action chèn** (native bị `setRangeText` phá). ↶/↷ · Ctrl+Z/Ctrl+Y.
- **Phím tắt:** Tab/Shift+Tab thụt lề · Ctrl+/ comment · Ctrl+D nhân dòng · Alt+↑/↓ chuyển dòng · Ctrl+S lưu (hover tiêu đề xem list).
- **Nguồn sự thật = nội dung editor** → `.spec.ts` cuối = đúng editor (`actions` chỉ để sinh `.json`). Fragile → comment `// 🔴` inline. **Copy** (báo "Đã chép ✔").

**🎨 CSS (assert CSS):** bấm 🎨 → click element → bảng **thuộc tính CSS computed** (text-transform/color/font-size…) → chọn 1 → sinh `expect(...).toHaveCSS('prop','value')` (test kiểu hiển thị, vd chữ in HOA do `text-transform`). **Text assert lấy `textContent`** (không `innerText`) → khớp `toContainText`/`getByText` (không lệch khi CSS in HOA).

**Type action `.json`:** navigate · **goback · goforward** · click · rightclick · dblclick · hover · fill · select · press · pick · assert(visible/text/value/**css** kèm `cssProp`) · screenshot.
- **Điều hướng:** click link → `// -> URL` (comment) · **Back/Forward** trình duyệt → `page.goBack()`/`goForward()` · URL đầu → `page.goto()` · click mở **tab mới** → `page1`/`page2`… + `waitForEvent('popup')` (xem mục 10 · Đa tab).

**Độ bền selector:** positional (`cssPath`/`xpathPath`) gắn 🔴 *fragile*, cảnh báo trong `.md`/header `.spec.ts`. `looksGenerated` loại class tự sinh **kể cả `jssNNN`/`css-1a2`** (không chặn Mui-*/BEM).

## 10. Lưu ý kỹ thuật + FIX ĐỪNG PHÁ

- ESM (`"type":"module"`) + chạy TS bằng `tsx`. Import nội bộ dùng đuôi `.js`.
- **`__name` shim** (`window.__name = ...`) trong các context — vá lỗi tsx/esbuild keepNames khi `page.evaluate`. Giữ.
- **TRÌNH DUYỆT HỆ THỐNG (quan trọng — máy này không chạy được Chromium đóng gói):**
  - `record.ts` đọc `RECORD_CHANNEL || BROWSER_CHANNEL`; `crawl.ts` + `playwright.config.ts` đọc `BROWSER_CHANNEL` → truyền `channel` vào launch. `.env` có `BROWSER_CHANNEL=chrome`. **ĐỪNG xoá `.env` / channel.** (Nếu chuyển sang máy tải được Chromium thì bỏ trống là dùng bản đóng gói.)
  - SxS chỉ ảnh hưởng bản đóng gói chạy headed; headless-shell vẫn chạy. Chi tiết README mục 8.3.
- **`goto` dùng `domcontentloaded`** (không `load`/`networkidle` — SPA hay treo) + timeout `RECORD_TIMEOUT`/60s + `.catch` (không chết phiên). Đã đổi ở record.ts + crawl.ts.
- **`label→input` (inject.js):** `fieldLabel()` (đi lên ≤12 cấp, lấy text label ở anh-em-trước) → `labelAnchored()` dựng xpath + **verify `xfirst()===el`** + `scopeXPaths()` (bọc vùng khi trùng tên). Nhận diện xpath ở count (inject.js) và `asLocator` (record.ts) dùng `/^\(*\//`. `KEEP` mặc định có `label→input`.
- **Picker/CSS-pick + xếp hạng:** `uniqueCandidates()` trả về **đã sort** theo `rankCands` (TRUST+số khớp) → `showPicker()`, auto-pick (`__record`) và preview **dùng chung 1 thứ hạng** (click == ⭐). `showCssPick()` liệt kê CSS computed → `assert css` → `toHaveCSS`. Toolbar icon-only + nhóm `⋯` (state `more`). Cả 2 panel + toolbar KÉO được qua `makeDrag(handle,target)` (bỏ qua phần tử id `_x`).
- **Đa tab (popup) — TỰ ĐỘNG:** mỗi action gắn `pageIdx` (từ `source.page`): tab gốc 0→`page`, popup 1→`page1`, 2→`page2`… `ctx.on('page')` bắt tab mới → `p.opener()` tìm tab cha → đánh dấu `opensPopup` lên **click cha** → `specLines` sinh `const pageNPromise = <cha>.waitForEvent('popup')` TRƯỚC click + `const pageN = await …Promise` SAU; action sau prefix `pageN.` (`asLocator`/`bodyLine` nhận tham số biến tab). File: chưa sửa tay → ghi từ `currentSpec` (chắc đúng pattern); đã sửa tay (`window.__userEdited`) → giữ editor. Live: popup → `renderCode(true)` đồng bộ TOÀN BỘ (chỉ khi chưa sửa tay). Modal **cùng tab** giữ nguyên `page`.
- **Toolbar bền trên tab mới / SPA (PORTERS) — QUAN TRỌNG, ĐỪNG GỠ:** app SPA có thể reset/thay cả cây DOM sau render, xoá toolbar + listener cấp `document`. Nhiều lớp phòng tuyến: (1) `attachNav` re-inject `p.evaluate(inject)` ngay + `domcontentloaded`/`load` + retry 400/1200/2500ms (đảm bảo inject chạy ≥1 lần); (2) `ensureUI` bọc try/catch, lỗi → `ui=null` cho thử lại; (3) **gắn toolbar vào `document.documentElement` (`<html>`)** thay vì `<body>` → SPA re-render body không xoá; (4) **`keepAlive` `setInterval` 700ms** (KHÔNG dựa observer — observer "chết" theo documentElement cũ): mất toolbar → gắn lại từ `recNodes`; (5) **listener `document` tách hàm có tên** (`onClick`/`onChange`/`onKey`/`onMove`/`onContext`/`onUp`) + `attachDocListeners()` (removeEventListener rồi add → idempotent) gọi trong `keepAlive` → ghi click/fill/key **sống sót khi app reset document**. Guard `window.__recInjected` vẫn ở đầu IIFE.
- **Cửa sổ code (1 editor):** context riêng, dock CDP, **`viewport:null`**. `specLines()` sinh `{text,meta}` (`act`=index action, `fragile`) → `renderCode` → `window.__renderSpec`: lần đầu nạp full, sau đó **chèn action mới** (act ≥ `__applied`) qua `setRangeText(...,'preserve')` tại `insertPoint()` (con trỏ trong thân `=> {…});`? dòng con trỏ : cuối thân). Undo/redo = **stack snapshot tự quản** (`commit/flush/restore` quanh mọi mutation; chặn Ctrl+Z native). **Auto-save:** `scheduleSave()` debounce 700ms trong `sync()` → `__saveCode` ghi file; `writeOutput` kéo `#ed` làm `.spec.ts`. Đã bỏ `manualSpec`/`__recUndo`/`__recDeleteStep`/Edit-Live.
- **Back/Forward:** `pushNav` dùng `navState` (lịch sử URL mỗi tab) → URL khớp mục kề **và KHÔNG do click <1s** → `goback`/`goforward`; còn lại `navigate` (đầu→`goto`, sau→comment).
- **State recorder** giữ ở Node (`__recGetState`/`__recSetState`). Kết thúc: `page.on('close')` / `browser disconnected` / SIGINT (KHÔNG `waitForEvent('close')`).
- `extract.ts` (crawler) testid attribute-aware (`data-test`...) + quét `[data-test*]`/`[data-cy]`/`[data-qa]`; `looksGenerated` cũng đã sửa bắt `jssNNN`.

---

### Prompt gợi ý mở session mới

> "Đọc `HANDOFF.md`. Máy này dùng **Chrome hệ thống** (`.env` `BROWSER_CHANNEL=chrome`) vì CDN Playwright bị chặn + Chromium đóng gói lỗi SxS — đừng đụng vào.
> Đang dùng **recorder** trên site thật PORTERS HRBC (`https://staging-hrbc-jp.porterscloud.com/...`). Form custom (id/class `jssNNN`/GUID đổi mỗi lần) → dùng selector `label→input`.
> Mình muốn <ghi test case / màn cần ghi> — chạy `npm run record -- <url> --name=TCxxx`, rồi từ `recording/TCxxx/` sinh Playwright test."
