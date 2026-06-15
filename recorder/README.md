# @tayphuong7bai/pw-recorder

Playwright **test recorder** — mở trình duyệt thật, ghi lại thao tác của bạn rồi sinh ra
`recording/<TÊN>/` gồm **`.spec.ts`** (Playwright test), **`.json`** (thao tác + nhiều loại
selector cho AI) và **`.md`**. Có cửa sổ code live (sửa tay, undo/redo, phím tắt), bảng chọn
selector theo độ tin cậy, công cụ Assert (visible/text/value/CSS) và **lấy + lưu HTML element**
(format đẹp, tên file gợi ý theo id/class) vào `recording/<TÊN>/html/`.

**Đa tab (popup):** click mở tab mới → tự sinh `const page1Promise = page.waitForEvent('popup')`
+ `const page1 = await page1Promise`, các thao tác ở tab mới dùng `page1.…` (tab thứ 3 → `page2`…).
Toolbar tự bám trên tab mới kể cả với app SPA "dọn" DOM (không cần F5).

> ℹ️ Scope đã đặt sẵn `@tayphuong7bai` (theo tài khoản npm của bạn). Nếu publish bằng tài
> khoản npm khác, đổi field `name` trong `package.json` cho khớp.

---

## 👤 Dành cho người dùng

### 1) Cài (vào dự án test của bạn, dạng devDependency)
```bash
npm i -D @tayphuong7bai/pw-recorder
```

### 2) Cài trình duyệt (1 lần)
```bash
npx playwright install chromium
```
> Nếu máy **không tải được Chromium** (vd CDN bị chặn): bỏ qua bước trên và dùng **Chrome/Edge
> hệ thống** bằng cách đặt `BROWSER_CHANNEL=chrome` (xem dưới).

### 3) Chạy
```bash
npx pw-recorder <url> --name=TC001
# vd:
npx pw-recorder https://www.saucedemo.com --name=TC001
```
Trình duyệt mở ra kèm toolbar → thao tác → **đóng cửa sổ** để kết thúc. File ghi ra
`recording/TC001/` ngay trong thư mục bạn đang chạy.

Tiện hơn thì thêm script vào `package.json` của bạn:
```jsonc
"scripts": { "record": "pw-recorder" }
```
→ `npm run record -- https://site --name=TC001`

### Biến môi trường / cờ (tùy chọn)
| Biến / cờ | Ý nghĩa |
|---|---|
| `<url>` (vị trí đầu) hoặc `RECORD_URL` / `BASE_URL` | URL mở đầu |
| `--name=TC001` hoặc `RECORD_NAME` | Tên test case → thư mục `recording/<tên>/` |
| `RECORD_STORAGE=.auth/state.json` | Login sẵn (storageState) → record màn sau đăng nhập |
| `BROWSER_CHANNEL=chrome` (hoặc `RECORD_CHANNEL`) | Dùng trình duyệt hệ thống thay vì Chromium |
| `RECORD_TIMEOUT=90000` | Timeout `page.goto` (ms) khi site chậm |
| `RECORD_SELECTORS=role,testId,css#id` | Giới hạn loại selector giữ lại trong output |

Có thể đặt sẵn trong file `.env` của dự án (recorder tự đọc) — xem `.env.example`.

### Output (`recording/<tên>/`)
- `<tên>.spec.ts` — Playwright test chạy được ngay (`npx playwright test`)
- `<tên>.json` — thao tác + danh sách selector ứng viên (cho AI)
- `<tên>.md` — mô tả người-đọc-được
- `shots/` — ảnh chụp (nếu dùng nút 📷)

---

## 🛠️ Dành cho tác giả (build & publish)

### Build
```bash
cd recorder
npm i           # cài esbuild/tsx... (1 lần)
npm run build   # -> dist/cli.js + dist/inject.js
```

### Publish — npm registry PUBLIC
```bash
npm login
npm publish        # publishConfig.access=public da set san cho package scoped
```

### Publish — registry PRIVATE (npm org trả phí / GitHub Packages / Verdaccio…)
```bash
# 1) Tro scope toi registry private (vd GitHub Packages):
#    .npmrc:  @tayphuong7bai:registry=https://npm.pkg.github.com
# 2) Dang nhap registry do roi:
npm publish
```
> Khi đó người dùng cũng cần `.npmrc` trỏ scope + token để `npm i` được.

### Ra phiên bản mới
```bash
npm version patch   # hoac minor / major  -> tu tang version + tao git tag
npm publish         # prepublishOnly tu chay build truoc khi day
```
Người dùng cập nhật bằng `npm update @tayphuong7bai/pw-recorder` (theo semver trong `package.json` của họ).

### Phát triển / chạy thử bản nguồn (không cần build)
```bash
npm start -- <url> --name=TC001     # = tsx record.ts
```

---

## Ghi chú kỹ thuật
- `dist/cli.js` (ESM, có shebang) là entry CLI; `inject.js` được copy cạnh nó và `record.ts`
  đọc qua `import.meta.url` → chạy đúng dù cài ở `node_modules` bất kỳ.
- `@playwright/test` & `dotenv` là **dependencies** (cài kèm khi `npm i`); `esbuild`/`tsx` chỉ
  là **devDependencies** (build-time, không ship cho người dùng).
- Output luôn ghi theo **thư mục đang chạy** (`process.cwd()`) → rơi vào dự án người dùng.
