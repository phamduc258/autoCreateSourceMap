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
  record.ts               # Node: bindings, toSpec/currentSpec, cửa sổ code, dock, state, channel
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

**Toolbar:** ☰ kéo · ● Rec · 📋 List SL (ON = mở bảng chọn selector) · 🎯 Pick · 👁 Visible · 🔤 Text · = Value · 📷 Shot · `</> Code`.
- **Bền:** có trên **tab/popup mới** (re-inject khi `domcontentloaded`, guard chống nhân đôi) + **tự gắn lại** khi SPA re-render `<body>` (MutationObserver). State giữ qua chuyển trang.

**Bảng "Pick locator" (đã NÂNG CẤP) — 2 mục tách biệt:**
- **SELECTOR CHO ELEMENT** — **sort theo độ uy tín + số khớp**: (1) khớp đúng 1 & không mong manh → (2) đúng 1 nhưng positional 🔴 → (3) `⚠N` → (4) không khớp; trong nhóm theo độ tin cậy loại (`testId`>`#id`>`role`>`label→input`>…>`class`>positional). Dòng đầu = **⭐ đề xuất**. Hiện số khớp mỗi dòng. Click để dùng + copy.
- **FAMILY — nhóm item lặp** (chỉ khi element trong list/bảng): selector cụm item + `within` → assertion "data trong list". Click để copy.

**`label→input` (CỐT LÕI cho form custom id/class đổi):** neo theo TEXT label → leo lên cụm cha chứa control → xuống control:
`(//*[normalize-space()="<label>"])[1]/ancestor-or-self::*[.//<tag>][1]/descendant::<tag>[1]`. **Tự kiểm chứng** (đánh giá xpath, so `=== el` đúng element vừa chọn); nếu trùng tên ở nơi khác (vd dropdown header ngoài modal) → **tự bọc scope** `aria-modal`/`role`/`aria-label`/`#id` rồi verify lại. Chỉ sinh cho **text/textarea/select** (radio/checkbox dùng `getByRole`).

**Cửa sổ code riêng** (context riêng, dock phải, **`viewport:null`** nên nút không bị cắt):
- **✏️ Edit** → sửa tay **có syntax highlight** (overlay) · **💾 Save** → ghi file + **về khung hiển thị**, và **thao tác mới ghi sau vẫn NỐI TIẾP** vào bản sửa (chèn trước `});`) · **↺ Live** → bỏ bản sửa, về tự sinh · **Copy**.

**Type action `.json`:** navigate · click · rightclick · dblclick · hover · fill · select · press · pick · assert(visible/text/value) · screenshot.

**Độ bền selector:** positional (`cssPath`/`xpathPath`) gắn 🔴 *fragile*, cảnh báo trong `.md`/header `.spec.ts`. `looksGenerated` loại class tự sinh **kể cả `jssNNN`/`css-1a2`** (không chặn Mui-*/BEM).

## 10. Lưu ý kỹ thuật + FIX ĐỪNG PHÁ

- ESM (`"type":"module"`) + chạy TS bằng `tsx`. Import nội bộ dùng đuôi `.js`.
- **`__name` shim** (`window.__name = ...`) trong các context — vá lỗi tsx/esbuild keepNames khi `page.evaluate`. Giữ.
- **TRÌNH DUYỆT HỆ THỐNG (quan trọng — máy này không chạy được Chromium đóng gói):**
  - `record.ts` đọc `RECORD_CHANNEL || BROWSER_CHANNEL`; `crawl.ts` + `playwright.config.ts` đọc `BROWSER_CHANNEL` → truyền `channel` vào launch. `.env` có `BROWSER_CHANNEL=chrome`. **ĐỪNG xoá `.env` / channel.** (Nếu chuyển sang máy tải được Chromium thì bỏ trống là dùng bản đóng gói.)
  - SxS chỉ ảnh hưởng bản đóng gói chạy headed; headless-shell vẫn chạy. Chi tiết README mục 8.3.
- **`goto` dùng `domcontentloaded`** (không `load`/`networkidle` — SPA hay treo) + timeout `RECORD_TIMEOUT`/60s + `.catch` (không chết phiên). Đã đổi ở record.ts + crawl.ts.
- **`label→input` (inject.js):** `fieldLabel()` (đi lên ≤12 cấp, lấy text label ở anh-em-trước) → `labelAnchored()` dựng xpath + **verify `xfirst()===el`** + `scopeXPaths()` (bọc vùng khi trùng tên). Nhận diện xpath ở count (inject.js) và `asLocator` (record.ts) dùng `/^\(*\//`. `KEEP` mặc định có `label→input`.
- **Picker:** `showPicker()` sort + 2 mục (element/family).
- **Toolbar bền:** guard `window.__recInjected` (đầu IIFE inject.js); recorder re-inject `p.on('domcontentloaded', () => p.evaluate(inject))` trong `attachNav`; `MutationObserver` cuối `ensureUI` tự gắn lại UI khi mất.
- **Cửa sổ code:** context riêng (không bị ghi), dock qua CDP (maximize đo work-area), **`viewport:null`** cả app + code context. `currentSpec()` = `manualSpec` + action ghi sau `manualSavePoint` (chèn trước `});`); `renderCode` chỉ skip khi `window.__editMode`.
- **State recorder** giữ ở Node (`__recGetState`/`__recSetState`). Kết thúc: `page.on('close')` / `browser disconnected` / SIGINT (KHÔNG `waitForEvent('close')`).
- `extract.ts` (crawler) testid attribute-aware (`data-test`...) + quét `[data-test*]`/`[data-cy]`/`[data-qa]`; `looksGenerated` cũng đã sửa bắt `jssNNN`.

---

### Prompt gợi ý mở session mới

> "Đọc `HANDOFF.md`. Máy này dùng **Chrome hệ thống** (`.env` `BROWSER_CHANNEL=chrome`) vì CDN Playwright bị chặn + Chromium đóng gói lỗi SxS — đừng đụng vào.
> Đang dùng **recorder** trên site thật PORTERS HRBC (`https://staging-hrbc-jp.porterscloud.com/...`). Form custom (id/class `jssNNN`/GUID đổi mỗi lần) → dùng selector `label→input`.
> Mình muốn <ghi test case / màn cần ghi> — chạy `npm run record -- <url> --name=TCxxx`, rồi từ `recording/TCxxx/` sinh Playwright test."
