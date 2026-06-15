# DOM Crawler — lấy DOM/selector từ site test cho AI sinh Playwright test

Tool truy cập site test (qua mạng — **không cần source code, không cần dựng local**), đăng nhập,
quét từng màn hình và xuất ra **bản đồ DOM ↔ URL ↔ action** để AI đọc và sinh Playwright test với selector chuẩn.

> Repo có **2 công cụ**: **Crawler** (mục 3–6, quét tự động theo config) và **Recorder** kiểu Playwright codegen (mục 7, ghi thao tác tay → sinh code).

---

## 0. Yêu cầu môi trường

| Thành phần | Yêu cầu |
|---|---|
| **Node.js** | ≥ 18 (khuyến nghị LTS 20/22; đã chạy thực tế trên Node 22 & 24) |
| **npm** | đi kèm Node |
| **Hệ điều hành** | Windows / macOS / Linux |
| **Playwright** | `^1.49.0` (mặc định cài bản mới nhất — hiện 1.60.x) |
| **Trình duyệt** | Chromium do Playwright tải **HOẶC** Google Chrome / Microsoft Edge cài sẵn trên máy (đặt `BROWSER_CHANNEL`) |
| **Mạng** | Vào được site test. Tải browser của Playwright cần vào `cdn.playwright.dev` — nếu bị chặn → dùng trình duyệt hệ thống (mục **8.3**) hoặc cài offline (mục **8.2**) |

> 💡 **Không tải được Chromium đóng gói?** (CDN bị chặn, hoặc bản đóng gói lỗi side-by-side trên Windows)
> → đặt `BROWSER_CHANNEL=chrome` trong `.env` để **dùng Google Chrome / Edge cài sẵn** cho mọi công cụ; khi đó không cần bản Chromium đóng gói. Xem mục **8.3**.
> Nếu muốn dùng đúng Chromium đóng gói nhưng đổi bản Playwright, lưu ý mỗi bản gắn cứng 1 build Chromium (bảng ở mục **8.4**).

---

## 1. Cài đặt (chạy 1 lần)

### 1.1 Cài dependencies

```bash
npm install
```

> Nếu chạy lệnh mà báo `'tsx' is not recognized ...` nghĩa là chưa cài (thiếu `node_modules`) → chạy `npm install`. (Xem **8.1**.)

### 1.2 Cài trình duyệt cho Playwright

```bash
npx playwright install chromium
```

Lệnh này tải **2 thứ**:
- **Chromium đầy đủ** → dùng cho chế độ **headed** (recorder, debug bằng mắt).
- **Chrome Headless Shell** → dùng cho chế độ **headless** (crawler, `npx playwright test`).

> 🌐 Tải **lỗi/timeout** (CDN bị chặn)? → cài **offline** theo mục **8.2**.
> 💻 Máy đã có **Google Chrome / Edge**? → có thể **bỏ qua bước này** và dùng trình duyệt hệ thống cho mọi công cụ (đặt `BROWSER_CHANNEL=chrome`, mục **2** + **8.3**).

---

## 2. Cấu hình môi trường — file `.env`

Copy `.env.example` thành `.env` rồi điền theo nhu cầu. `.env` đã được `.gitignore` (không push lên repo).

| Biến | Dùng cho | Ý nghĩa |
|---|---|---|
| `BASE_URL` | crawler | URL gốc của site test (vd `https://site-test.example.com`) |
| `TEST_USER` / `TEST_PASS` | crawler | Tài khoản đăng nhập |
| `BROWSER_CHANNEL` | **crawler + test + recorder** | Dùng **trình duyệt hệ thống** cho TẤT CẢ: `chrome` hoặc `msedge`. Bỏ trống = dùng Chromium đóng gói của Playwright. |
| `RECORD_CHANNEL` | recorder | Như trên nhưng **chỉ cho recorder** (ưu tiên hơn `BROWSER_CHANNEL` nếu đặt cả hai). |
| `RECORD_STORAGE` | recorder | Đường dẫn `storageState` để **login sẵn** (vd `output/.auth/state.json` lấy từ crawler) |
| `RECORD_TIMEOUT` | recorder | Timeout (ms) cho `page.goto` lúc mở trang. Mặc định `60000`. Tăng nếu site rất chậm. |
| `RECORD_SELECTORS` | recorder | Lọc loại selector giữ trong `unique` (vd `css,xpath,testId`) |
| `RECORD_NAME` / `RECORD_URL` | recorder | Tên / URL mặc định (thay cho tham số dòng lệnh) |

**Ví dụ `.env`:**

```bash
BASE_URL=https://site-test.example.com
TEST_USER=tai_khoan_test
TEST_PASS=mat_khau

# Dùng Chrome hệ thống cho CẢ crawler + test + recorder.
# Bật khi: không tải được Chromium đóng gói (CDN bị chặn) HOẶC nó lỗi side-by-side trên Windows. Xem mục 8.3.
BROWSER_CHANNEL=chrome
```

---

## 3. Cấu hình crawler — `crawler/config.ts`

- `login`: selector của ô user / ô password / nút đăng nhập, và `successSelector` (1 element chỉ xuất hiện sau khi login thành công — để kiểm tra login OK).
- `pages`: danh sách màn hình cần lấy. Mỗi màn có `id`, `url`, `waitFor`, và (tùy chọn) `actions` để mở modal/dropdown rồi chụp thêm.
- **Trang public / không cần login:** thêm `auth: false` cho page đó → crawl ở chế độ **ẩn danh** (vd trang login, đăng ký — nếu đã đăng nhập sẽ bị redirect). Cả site public thì đặt `login.enabled = false`.
- `headless`: `true` (mặc định) chạy ngầm; đặt `false` để xem trình duyệt khi debug (chế độ này cần Chromium chạy được headed — xem **8.3** nếu lỗi).

> 💡 **Chưa biết selector login?** Đặt tạm `login.enabled = false`, thêm trang login vào `pages`
> (vd `{ id: 'login', url: '/login' }`), chạy `npm run crawl`, rồi mở `output/raw/login/catalog.json`
> để lấy đúng selector của ô user/pass/nút. Sau đó điền vào `login` và bật lại `enabled = true`.

---

## 4. Chạy crawler

```bash
npm run crawl       # dùng phiên đăng nhập đã lưu (nếu có)
npm run relogin     # xóa phiên cũ, đăng nhập lại (khi session hết hạn)
```

Mẹo debug: đặt `headless: false` trong `config.ts` để xem trình duyệt chạy tận mắt.

---

## 5. Kết quả — output 2 tầng (để input cho AI luôn nhỏ)

```
output/
  index.md                 # TẦNG 1 (nhẹ): mỗi màn 1 dòng — id · url · title · #element. AI luôn nạp được.
  screens/<id>.md          # TẦNG 2 (gọn): bảng selector của 1 màn, 1 dòng/element, ĐÃ kiểm chứng
  raw/<id>/                # tham khảo chi tiết (KHÔNG nạp vào AI trừ khi cần)
    catalog.json · a11y.yaml · dom.html · screenshot.png
```

Mỗi locator trong `screens/<id>.md` đã được **chạy thử trên trang thật** (`count()`):
- `✓` = khớp **đúng 1** element → dùng an toàn.
- `⚠N` = khớp N (>1) → cần thu hẹp (`.filter()` / `.nth()` / thêm ngữ cảnh).
- `✗0` = không khớp (cần xem lại).

Element trùng locator (vd nhiều dòng bảng) được gộp thành 1 dòng `(lap x N)` → tránh phình file.

---

## 6. Bước tiếp theo — sinh test

Đưa cho Claude: **`output/index.md` → chọn màn liên quan → `output/screens/<id>.md` + file test case**
→ Claude đọc selector **đã kiểm chứng** và sinh `tests/*.spec.ts` (Page Object Model), input nhỏ gọn.
An toàn: tool **chỉ click những action bạn khai báo** trong `config.ts`, không tự bấm nút phá hủy dữ liệu.

> Chạy test sinh ra: `npx playwright test` (cấu hình ở `playwright.config.ts`, chạy headless).

---

## 7. Recorder — ghi thao tác kiểu Playwright codegen

Công cụ thứ 2: bạn *diễn* test case trên site, recorder ghi lại → sinh selector + code (không cần khai báo config trước như crawler).

```bash
npm run record -- <url> --name=TC001     # mở trình duyệt; thao tác; ĐÓNG cửa sổ app (hoặc Ctrl+C) để kết thúc
RECORD_STORAGE=output/.auth/state.json npm run record -- <url> --name=TC002   # dùng phiên login đã lưu (từ crawler)
RECORD_SELECTORS=css,xpath npm run record -- <url> --name=TC003               # chỉ giữ loại selector này trong 'unique'
RECORD_CHANNEL=chrome npm run record -- <url> --name=TC004                    # dùng Google Chrome hệ thống (xem 8.3)
```

> 💡 Các biến trên cũng có thể đặt cố định trong `.env` để khỏi gõ lại mỗi lần (vd `RECORD_CHANNEL=chrome`).

**Toolbar (đầu trang khi headed) — chỉ ICON, hover ra tooltip giải thích:**
- **Chính (luôn hiện):** ☰ kéo · **●** Rec · **📋** List SL · **🎯** Pick · **⋯** More.
- **Bấm ⋯ → nhóm tool phụ:** **👁** Visible · **🔤** Text · **=** Value · **🎨** CSS · `</>` HTML · **📷** Shot. (Mở ⋯ nở **sang phải**, không làm toolbar nhảy; trạng thái mở giữ qua chuyển trang.)
- Đã **bỏ nút `</> Code`** vì có **cửa sổ live code** riêng (xem dưới).
- **📋 List SL** (toggle, mặc định ON): ON = thao tác nhắm element (Pick/Assert/menu chuột phải) **mở bảng chọn selector**; OFF = **tự động lấy `best`** (== ⭐ đề xuất).
- **🎨 CSS:** click element → bảng **thuộc tính CSS computed** (text-transform/color/font-size…) → chọn 1 → sinh `expect(...).toHaveCSS('prop','value')` (test kiểu hiển thị, vd chữ in HOA do `text-transform`).
- **📷 Shot:** chụp full-page → `recording/<name>/shots/shot-N.png` (tự ẩn UI khi chụp) + log step `screenshot` (spec sinh `page.screenshot(...)`).
- **`</>` HTML:** click element → panel: chọn **outerHTML/innerHTML**, **Copy**, hoặc đặt tên file rồi **💾 Lưu** → HTML (**format đẹp** 2-space) vào `recording/<name>/html/<tên>.html`. Tên file gợi ý theo **id → class** (bỏ class tự sinh, sửa được). Công cụ inspect — không sinh test step.
- Assert/Pick: click element → (List SL ON) bảng chọn / (OFF) auto best. Esc hủy. Rec + List SL + vị trí toolbar + cửa sổ code **giữ qua chuyển trang**.
- Toolbar bền trên **tab/popup mới** (link `target=_blank`): recorder **re-inject khi `domcontentloaded`** (phòng `addInitScript` bị miss → khỏi phải F5), có guard chống nhân đôi; và **tự gắn lại** nếu app SPA re-render `<body>` làm mất nó (MutationObserver).

**Chuột phải vào element** → menu **Choose action** (Click · Right click · Double click · Hover · Pick locator) → log đúng action đó.

**Pick locator = bảng liệt kê MỌI selector:** click element (nút 🎯 hoặc chuột phải → Pick locator) → hiện bảng mọi cách select element đó. Các loại: **Playwright** (`testId/role/placeholder/alt/title/text`) · **`label→input`** (neo theo text label) · **CSS** (`#id/[name]/[href]/.class/path`) · **XPath** (`@id/@class/text/path`).

Bảng chia **2 mục tách biệt**:
- **SELECTOR CHO ELEMENT** — **tự sort theo độ uy tín + số khớp**: ưu tiên (1) khớp đúng 1 & không mong manh → (2) khớp đúng 1 nhưng positional 🔴 → (3) khớp nhiều `⚠N` → (4) không khớp; trong mỗi nhóm xếp theo độ tin cậy của *loại* selector (`testId` > `#id` > `role` > `label→input` > … > `class` > positional). Dòng đầu (tốt nhất) gắn **⭐ đề xuất**. Mỗi dòng hiển thị **số phần tử khớp** (`✓ 1` / `⚠ N` / `✗ 0` / `🔴 mong manh`). **Click 1 dòng để dùng** (+ copy).
- **FAMILY — nhóm item lặp** (chỉ hiện khi element nằm trong list/bảng lặp): selector của *cụm item* (vd `.inventory_item`, `[data-test="inventory-item"]`) + `within` → để viết assertion "data có trong list": `locator(family).filter({ hasText: '…' }).<within>`. **Click để copy**.

> 🖱️ **Bảng selector (và bảng 🎨 CSS) KÉO di chuyển được** — kéo phần **header**. **Selector lấy tự động khi click** (và khi List SL OFF) dùng **đúng thứ hạng** trên → trùng với **⭐ đề xuất** (1 nguồn duy nhất). Text trong assert lấy **`textContent`** nên khớp `toContainText`/`getByText` (không lệch khi trang dùng CSS `text-transform` in HOA).

> 🏷️ **`label→input` — cho form custom (id/class đổi mỗi lần):** với ô nhập (text/textarea/select) không có `data-testid`/label chuẩn, tool tự sinh selector **neo theo TEXT của label** → leo lên cụm cha chứa control → đi xuống control:
> ```
> (//*[normalize-space()="企業"])[1]/ancestor-or-self::*[.//input][1]/descendant::input[1]
> ```
> → `page.locator('xpath=...')`. Cách "lên cha → xuống con" này luôn ra **đúng 1 element** (không như `following::` bị neo vào nhiều element label rồi nhảy sang field kế / bị DevTools đếm trùng). `(…)[1]` lấy 1 element label ngoài cùng; `ancestor-or-self::*[.//input][1]` = field-group gần nhất chứa control; `descendant::input[1]` = control đầu tiên bên trong.
>
> **Tự kiểm chứng + thu hẹp vùng (chống trùng tên ngoài modal):** sau khi dựng selector, tool **chạy thử ngay trong trang** và so xem có trỏ **đúng element vừa chọn** không. Nếu sai (vd chữ "企業" còn xuất hiện ở dropdown search trên header, ngoài modal → bị nhắm nhầm), tool **tự bọc thêm vùng cha** bao element — ưu tiên `aria-modal` → `role` → `aria-label` → `#id`/class ổn định — rồi kiểm chứng lại, đến khi trỏ đúng:
> ```
> (//*[@aria-modal='true']//*[normalize-space()="企業"])[1]/ancestor-or-self::*[.//input][1]/descendant::input[1]
> ```
> Selector này **chỉ phụ thuộc chữ trên label** (bền khi id/class/vị trí đổi giữa các lần run hoặc giữa các form custom khác nhau), chạy cho cả layout **bảng lẫn div-grid**, kể cả input nằm rất sâu trong cụm và field có annotation. Khi ô không có `#id`/`[name]` ổn định, đây là lựa chọn **"đề xuất"** (ưu tiên hơn `.class`/positional). *(radio/checkbox dùng `getByRole` chứ không dùng cách này. Class kiểu `jss378`/`css-1a2` bị coi là tự sinh → không dùng làm neo.)*

**Cửa sổ code riêng** mở **bên phải** app — **1 EDITOR DUY NHẤT** (luôn sửa được; số dòng + syntax highlight). Không còn tách Live/Edit.
- **Vừa tự sinh vừa sửa tay:** thao tác mới **tự chèn** vào editor — tại **dòng con trỏ** nếu con trỏ đang trong thân test (`=> { … });`), ngược lại **chèn cuối thân** — **không ghi đè** phần bạn đang sửa, giữ nguyên con trỏ.
- **TỰ ĐỘNG LƯU** vào `<name>.spec.ts` sau ~700ms ngừng gõ (header hiện **"💾 Đã lưu ✔"** / **"✏️ chưa lưu…"**). Không cần bấm Save; **Ctrl+S** để lưu ngay.
- **Undo/Redo** (↶/↷ hoặc **Ctrl+Z / Ctrl+Y**): tự quản lý lịch sử → hoàn tác được **cả phần sửa tay LẪN action vừa chèn** (kể cả "lỡ ghi nhầm 1 thao tác").
- **Phím tắt:** **Tab/Shift+Tab** thụt lề · **Ctrl+/** comment · **Ctrl+D** nhân dòng · **Alt+↑/↓** chuyển dòng (hover tiêu đề xem danh sách).
- **Copy** → chép nội dung (báo **"Đã chép ✔"**). Dòng selector **positional** đánh dấu bằng comment **`// 🔴 selector mong manh`**.

> 🧭 **Điều hướng:** click link → `// -> URL` (comment, vì click đã điều hướng) · bấm **Back/Forward** trình duyệt → `await page.goBack()` / `page.goForward()` · URL đầu → `page.goto(...)`.

> 🗂️ **Đa tab (popup) — tự động:** click mở **tab mới** → recorder tự sinh `const page1Promise = page.waitForEvent('popup')` + `const page1 = await page1Promise`, mọi thao tác ở tab mới dùng **`page1.…`** (tab gốc là `page`; tab thứ 3 → `page2`…). Toolbar **tự bám trên tab mới** kể cả app SPA "dọn" DOM — không cần F5.

**Output** `recording/<name>/`:
- `<name>.spec.ts` — code Playwright **chạy được** (giống codegen).
- `<name>.json` — bản giàu cho **Claude**: mỗi action có `unique` (`best` = selector dùng, `all` = mọi biến thể kèm `n`/`fragile`) + `family` (nhóm item lặp + `within`) → assertion "data trong list": `locator.filter({ hasText }).<within>`. Action `pick` lưu `chosenKind`/`chosenValue`; action `assert` có `assert` = `visible`/`text`/`value`/`css` (css kèm `cssProp`).
- `<name>.md` — đọc cho người.
- `shots/shot-N.png` — ảnh chụp khi bấm 📷 Shot (nếu có).

> **Độ bền selector:** ưu tiên neo theo định danh ổn định/nội dung; selector **theo vị trí** (`cssPath`/`xpathPath`) bị gắn 🔴 *mong manh*. Tool cảnh báo "🔴 N action mong manh → nên thêm data-testid" trong `.md` + header `.spec.ts`. `looksGenerated` loại class tự sinh.
> Thư mục `recording/` chỉ là **output** → xóa thoải mái, tự tạo lại. (Đừng nhầm với `recorder/` = mã nguồn tool.)

---

## 8. Khắc phục sự cố (Troubleshooting)

### 8.1 `'tsx' is not recognized as an internal or external command`

Chưa cài dependencies (thiếu `node_modules`). Chạy:

```bash
npm install
```

### 8.2 Tải browser lỗi/timeout (CDN `cdn.playwright.dev` bị chặn) → cài offline

Một số mạng công ty chặn `cdn.playwright.dev`. Vì các build là **Chrome for Testing**, có thể tải bản **y hệt** từ Google (host này thường vào được):

1. **Xem build cần** cho bản Playwright đang dùng:
   ```bash
   npx playwright install chromium --dry-run
   ```
   Ghi lại **version** (vd `145.0.7632.6`), **revision** (vd `chromium-1208`) và đường dẫn `Install location`.

2. **Tải 2 file** từ Google Chrome for Testing (đổi `win64` → `mac-x64` / `mac-arm64` / `linux64` theo OS):
   ```
   https://storage.googleapis.com/chrome-for-testing-public/<VERSION>/win64/chrome-win64.zip
   https://storage.googleapis.com/chrome-for-testing-public/<VERSION>/win64/chrome-headless-shell-win64.zip
   ```

3. **Giải nén vào cache** của Playwright (`ms-playwright`):
   - Windows: `%LOCALAPPDATA%\ms-playwright\`
   - macOS: `~/Library/Caches/ms-playwright/`
   - Linux: `~/.cache/ms-playwright/`

   Sao cho thành:
   ```
   ms-playwright/
     chromium-<REV>/chrome-win64/                       (giải nén từ chrome-win64.zip)
     chromium_headless_shell-<REV>/chrome-headless-shell-win64/
   ```

4. **Tạo file rỗng** `INSTALLATION_COMPLETE` trong mỗi thư mục `chromium-<REV>` và `chromium_headless_shell-<REV>` (Playwright kiểm tra marker này).

5. **Kiểm tra:** chạy lại `npx playwright install chromium --dry-run` — `Install location` trỏ đúng thư mục vừa tạo là OK.

> Mẹo: nếu chỉ chạy **headless** (crawler / `playwright test`) thì chỉ bắt buộc `chromium_headless_shell-<REV>`. Nếu cần **headed** mà bản đóng gói lỗi → xem **8.3**.

### 8.3 `spawn UNKNOWN` / "side-by-side configuration is incorrect" (Windows, chế độ headed)

**Triệu chứng:** recorder (headed) báo `browserType.launch: spawn UNKNOWN`; chạy trực tiếp `chrome.exe` báo *"The application has failed to start because its side-by-side configuration is incorrect"*.

**Nguyên nhân:** trên một số máy Windows, bản **Chromium đóng gói (Chrome for Testing)** không khởi động được ở chế độ **headed** do lỗi side-by-side (SxS) ở mức hệ điều hành — **dù file đã đầy đủ và không hỏng**. Chế độ **headless** (Headless Shell) vẫn chạy bình thường, nên **crawler và `playwright test` không bị ảnh hưởng**.

**Cách xử lý (đơn giản nhất):** dùng **trình duyệt hệ thống** (Google Chrome / Edge cài sẵn) cho **cả 3 công cụ**. Đặt trong `.env`:

```bash
BROWSER_CHANNEL=chrome     # hoặc msedge — áp dụng cho crawler + test + recorder
```

Khi đó **không cần tới bản Chromium đóng gói** nữa (kể cả khi CDN bị chặn không tải được) — mọi thứ chạy bằng Chrome/Edge của máy (đã cài đúng nên không dính lỗi SxS, chạy được cả headed lẫn headless). Vì vậy có thể để `package.json` ở bản Playwright mới nhất mà không cần tải browser.

> Muốn fix triệt để bản đóng gói (chạy được headed) thì cần quyền **Administrator** để chẩn đoán bằng `sxstrace` / sửa Windows component store — nhưng **không cần thiết** nếu đã dùng trình duyệt hệ thống.

### 8.4 Bản Playwright ↔ build Chromium đi theo cặp

Đổi bản Playwright thì **phải có đúng build Chromium** tương ứng (online tải tự động; offline làm theo **8.2**). Bảng tham chiếu nhanh:

| Playwright | Chromium revision | Chrome version |
|---|---|---|
| 1.57.x | `chromium-1200` | — |
| 1.58.x | `chromium-1208` | 145.0.7632.6 |
| 1.59.x | `chromium-1217` | — |
| **1.60.x (hiện tại)** | **`chromium-1223`** | **148.0.7778.96** |

> Revision lấy bằng `npx playwright install chromium --dry-run`; Chrome version hiện đầy đủ trong output dry-run của từng bản.
> Repo để `package.json` ở `^1.49.0` (cài bản mới nhất) và dùng `BROWSER_CHANNEL=chrome` nên **không phụ thuộc** build Chromium đóng gói.

### 8.5 `page.goto: Timeout ... exceeded` khi mở trang (site nặng / SPA)

**Triệu chứng:** recorder/crawler báo `page.goto: Timeout 30000ms exceeded ... waiting until "load"` (hoặc `"networkidle"`).

**Nguyên nhân:** app nặng (SPA, có kết nối nền liên tục) → sự kiện `load`/`networkidle` rất lâu hoặc **không bao giờ** xảy ra.

**Đã xử lý sẵn trong tool:** cả recorder lẫn crawler giờ chờ **`domcontentloaded`** (DOM sẵn sàng là đủ) thay vì `load`/`networkidle`, timeout rộng (60s), và recorder **không chết phiên** nếu trang chậm (chỉ cảnh báo — cứ đợi tải xong/F5 rồi thao tác).

Nếu site CỰC chậm, tăng thêm: `RECORD_TIMEOUT=120000 npm run record -- <url> --name=TC001`.

> Nếu thấy lỗi kiểu *"Executable doesn't exist at ...chromium-XXXX..."* nghĩa là build Chromium không khớp bản Playwright — cài đúng build (8.2) hoặc đưa Playwright về `1.58.0`.
