# HANDOFF — Tool lấy DOM để AI sinh Playwright test

> File tóm tắt để **tiếp tục công việc ở một session Claude khác**.
> Session mới chỉ cần đọc file này là nắm đủ bối cảnh, không cần đọc lại hội thoại cũ.
> Ngày tạo: 2026-06-03.

---

## 1. Mục tiêu

Người dùng là **tester**, đang làm auto test. Muốn: đưa cho Claude **1 file test case** → Claude sinh
**Playwright test (TypeScript)** với selector chính xác.

Vấn đề cốt lõi: Claude cần "nhìn thấy" **DOM/selector** của từng màn hình để viết script cho chuẩn.

## 2. Ràng buộc (quan trọng)

- **Không có source code** của app.
- **Không dựng được môi trường local.**
- Chỉ có: **test case** + **1 site test chạy qua mạng** (môi trường đã deploy).

→ Hệ quả: bộ **Preview tích hợp của Claude Code KHÔNG dùng được** (nó chỉ preview dev server local).
Giải pháp đúng là dùng **Playwright** — nó chạy trên máy tester và kết nối tới site test qua mạng,
nên "không source / không local" hoàn toàn OK (đây đúng là cách E2E test chạy với môi trường deploy).

## 3. Phương án đã chốt — Phương án B: viết 1 tool crawler lấy DOM

Tool: cung cấp danh sách URL → đăng nhập nếu cần → truy cập từng trang → quét DOM/selector → lưu lại,
kèm **mapping DOM ↔ URL ↔ action** để AI đọc.

**3 lựa chọn thiết kế đã chốt (qua hỏi đáp với user):**

| Quyết định | Lựa chọn | Ý nghĩa |
|---|---|---|
| Cách click nút | **Theo cấu hình** | Chỉ click các action khai báo sẵn cho từng URL → an toàn nhất, không bấm nhầm nút Xóa/Gửi/Đăng xuất làm hỏng dữ liệu test |
| Lưu gì mỗi màn | **Catalog + a11y + ảnh** | JSON element + selector ứng viên, accessibility tree, screenshot, HTML đã làm sạch |
| Kiểu đăng nhập | **Form user/mật khẩu** | Nhập user+pass rồi submit ngay trên site |

## 4. Đã build gì (đã viết code, CHƯA chạy/CHƯA cài deps)

```
testCase/
  package.json          # deps: @playwright/test, tsx, typescript, dotenv
  tsconfig.json
  .gitignore            # ignore node_modules/, output/, .env
  .env.example          # mẫu: BASE_URL, TEST_USER, TEST_PASS
  README.md             # hướng dẫn dùng đầy đủ
  crawler/
    config.ts           # *** FILE DUY NHẤT USER CẦN SỬA *** — login + danh sách pages + actions
    crawl.ts            # tool chính: login (lưu storageState) → quét URL → xuất index.json
    extract.ts          # chạy trong browser: quét element + sinh selector ứng viên
```

**Logic chính (crawl.ts):**
1. Đăng nhập 1 lần → lưu `output/.auth/state.json` (tái dùng, khỏi login lại). `npm run relogin` để login lại.
2. Với mỗi `page` trong config: `goto(url)` → `captureState()`.
3. `captureState()` lưu: `catalog.json` (element + locator gợi ý), `a11y.yaml`, `dom.html` (đã bỏ script/style), `screenshot.png`.
4. Chỉ thực hiện các `actions` được khai báo (click/fill) → chụp thêm state ẩn (modal/dropdown), ghi cạnh `from → to`.
5. Gom tất cả vào **`output/index.json`** = bản đồ states + actions.

**Selector ưu tiên (extract.ts):** `data-testid` → `role` + tên → `label`/`placeholder` → `id` (nếu không phải hash tự sinh) → text. Bỏ qua class/id sinh tự động.

## 5. Trạng thái hiện tại

- ✅ Code viết xong.
- ❌ Chưa chạy `npm install` / `npx playwright install` (chờ user đồng ý cài deps).
- ❌ Chưa có thông tin thật để chạy: **URL site test, tài khoản test, selector login, file test case mẫu**.

## 6. Việc cần làm tiếp (cho session mới)

1. **Cài deps** (cần user đồng ý):
   ```bash
   npm install
   npx playwright install chromium
   ```
2. **Lấy thông tin từ user:** URL site test + 1 tài khoản test + (nếu có) file test case mẫu.
3. **Điền `.env`** (copy từ `.env.example`) và **sửa `crawler/config.ts`** (login selectors + `pages`).
   - Nếu chưa biết selector login: đặt tạm `login.enabled=false`, thêm trang login vào `pages`,
     chạy `npm run crawl`, đọc `output/states/login/catalog.json` để lấy đúng selector → điền lại → bật `enabled=true`.
4. **Chạy** `npm run crawl` → kiểm tra `output/index.json`. (Đặt `headless:false` để debug trực quan.)
5. **Verify tool** (lần chạy đầu — code chưa được test): đảm bảo login OK, catalog có element hợp lý.
6. **Sinh test:** đưa `output/index.json` + 1 test case → sinh `tests/*.spec.ts` theo Page Object Model.
   Dùng `storageState` để test khỏi login lại; tài khoản để trong `.env`.

## 7. Lưu ý kỹ thuật

- Project dùng ESM (`"type":"module"`) + chạy TS trực tiếp bằng `tsx`.
- `extract.ts::extractCatalog()` chạy trong context trình duyệt qua `page.evaluate` → chỉ dùng DOM API, không tham chiếu biến ngoài. Nếu `page.evaluate` lỗi serialize, cân nhắc inline hàm vào `crawl.ts`.
- a11y dùng `locator('body').ariaSnapshot()` (Playwright mới). Nếu bản Playwright quá cũ không có, đổi sang `page.accessibility.snapshot()`.
- Máy đã có Node v22.16.

---

### Prompt gợi ý để mở session mới

> "Đọc file `HANDOFF.md` trong project này và tiếp tục. Đây là URL site test: <...>, tài khoản test: <...>.
> Hãy cài Playwright, cấu hình rồi chạy thử tool crawler, sau đó sinh Playwright test từ test case mình gửi."
