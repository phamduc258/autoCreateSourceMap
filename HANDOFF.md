# HANDOFF — Tool lấy DOM để AI sinh Playwright test

> File tóm tắt để **tiếp tục công việc ở một session Claude khác**.
> Session mới chỉ cần đọc file này là nắm đủ bối cảnh, không cần đọc lại hội thoại cũ.
> Tạo: 2026-06-03 · **Cập nhật: 2026-06-04 (đã chạy thật, demo PASS trên saucedemo).**

---

## 1. Mục tiêu

Người dùng là **tester**. Muốn: đưa cho Claude **1 file test case** → Claude sinh **Playwright test (TypeScript)**
với selector chính xác. Vấn đề cốt lõi: Claude cần "nhìn thấy" **DOM/selector** của từng màn để viết script cho chuẩn.

## 2. Ràng buộc

- **Không có source code** app. **Không dựng được local.** Chỉ có **test case** + **1 site test chạy qua mạng** (đã deploy).
- → Preview tích hợp của Claude Code KHÔNG dùng được (chỉ preview dev server local). Dùng **Playwright** (chạy trên máy tester, nối site qua mạng) là đúng.

## 3. Phương án đã chốt — B: viết tool crawler lấy DOM

| Quyết định | Lựa chọn |
|---|---|
| Cách click nút | **Theo cấu hình** — chỉ click action khai báo sẵn cho từng URL (an toàn, không bấm nhầm nút phá hủy) |
| Lưu gì mỗi màn | **Catalog selector + a11y + ảnh** (sau nâng cấp: output 2 tầng gọn, xem mục 6) |
| Kiểu đăng nhập | **Form user/mật khẩu** |

## 4. TRẠNG THÁI HIỆN TẠI ✅

- ✅ Đã `npm install` + `npx playwright install chromium` (Node v22.16, Chromium 148).
- ✅ Crawler **chạy thật OK** trên `https://www.saucedemo.com` — quét 5 màn, verify selector, xuất `output/`.
- ✅ **Đã demo trọn vòng:** `testcases/TC001-checkout.md` → POM + `tests/checkout.spec.ts` → `npx playwright test` → **1 passed**.
- ⏳ Chưa cắm **site/test case THẬT** của user (đang dùng saucedemo làm demo).

## 5. Cấu trúc project

```
testCase/
  crawler/
    config.ts        # *** FILE USER SỬA *** — login + danh sách pages + actions (đang cấu hình cho saucedemo)
    crawl.ts         # tool chính: login → quét → VERIFY selector → xuất index.md + screens/*.md
    extract.ts       # chạy trong browser: quét element + sinh DANH SÁCH ứng viên selector
  output/            # (gitignored) kết quả crawl — xem mục 6
  testcases/
    TC001-checkout.md   # test case mẫu (input do người viết)
  tests/
    checkout.spec.ts    # test sinh ra (PASS)
    pages/              # Page Object Model: LoginPage, InventoryPage, CartPage, CheckoutPage
  playwright.config.ts  # baseURL lấy từ .env, reporter list
  .env                  # BASE_URL + TEST_USER + TEST_PASS (đang là saucedemo)
  package.json · tsconfig.json · README.md · .gitignore
```

## 6. Cách tool hoạt động (sau nâng cấp)

**Luồng (crawl.ts):** login 1 lần (lưu `output/.auth/state.json`, `npm run relogin` để login lại) → mỗi `page` trong config:
`goto(url)` → quét element → **VERIFY**: mỗi ứng viên locator chạy `count()`, chỉ giữ cái **khớp đúng 1** → chỉ click các `action` khai báo → ghi cạnh `from→to`.

**Output 2 tầng (để input cho AI luôn nhỏ):**
```
output/
  index.md          # TẦNG 1 (nhẹ): mỗi màn 1 dòng (id·url·title·#el). AI đọc trước để chọn màn.
  screens/<id>.md   # TẦNG 2 (gọn): bảng selector 1 màn, 1 dòng/element, ĐÃ verify
  raw/<id>/         # chi tiết tham khảo: catalog.json · a11y.yaml · dom.html · screenshot.png
```
Quy ước trong `screens/*.md`: `✓` khớp đúng 1 · `⚠N` khớp N>1 (cần `.nth()`/`.filter()`/thu hẹp) · `✗0` không khớp.
Element trùng locator (vd dòng bảng) gộp `(lap xN)`.

**Selector ưu tiên (extract.ts):** testid (`data-testid`→getByTestId; `data-test`/`data-cy`...→CSS attribute) → role+name → label/placeholder → id (bỏ hash tự sinh) → text. Có quét cả `[data-test*]`/`[data-cy]`/`[data-qa]`.

## 7. Demo đã làm (bằng chứng pipeline chạy được)

- `crawler/config.ts` cấu hình cho saucedemo: login `#user-name`/`#password`/`#login-button`, successSelector `.inventory_list`;
  pages: inventory (+2 action: mở burger menu, thêm Backpack), cart, checkout.
- `.env`: `standard_user` / `secret_sauce`.
- Test sinh ra dùng đúng locator đã verify (vd `[data-test="add-to-cart-sauce-labs-backpack"]`, `[data-test="shopping-cart-badge"]`, `[data-test="firstName"]`...).
- → Đây là **template POM** tái dùng cho site thật.

## 8. Áp dụng cho SITE THẬT — việc cần làm tiếp

1. Sửa `.env` (URL + tài khoản thật) và `crawler/config.ts` (login selectors thật + danh sách `pages` + `actions`).
   - Chưa biết selector login? Đặt tạm `login.enabled=false`, thêm trang login vào `pages`, `npm run crawl`, đọc `output/raw/<login>/catalog.json` lấy selector → điền lại → bật `enabled=true`.
2. `npm run crawl` → kiểm tra `output/index.md` + `screens/*.md` (đặt `headless:false` trong config để xem trực quan).
3. Sinh test: đưa test case thật + `screens/<màn liên quan>.md` cho Claude → sinh `tests/*.spec.ts` (POM) → `npx playwright test`.

## 9. Lưu ý kỹ thuật + các fix đã áp dụng

- ESM (`"type":"module"`) + chạy TS bằng `tsx`. Import file nội bộ dùng đuôi `.js` (tsx/Playwright tự map sang `.ts`).
- **Fix đã làm (đừng phá):**
  - `crawl.ts` có `page.addInitScript('window.__name = ...')` — vá lỗi `__name is not defined` do tsx/esbuild ("keepNames") chèn helper khi serialize hàm cho `page.evaluate`. **Bắt buộc giữ.**
  - `extract.ts` testid attribute-aware: app dùng `data-test` (không phải `data-testid`) → sinh CSS attribute, vì `getByTestId` mặc định chỉ tìm `data-testid`.
  - `extract.ts` có quét `[data-test*]`/`[data-cy]`/`[data-qa]` (để bắt cả link giỏ/badge không có href/role).
  - `<select>` không lấy text các option làm "tên".
- a11y dùng `locator('body').ariaSnapshot()`. Máy: Node v22.16, Chromium qua Playwright.

---

### Prompt gợi ý để mở session mới

> "Đọc `HANDOFF.md` trong project này và tiếp tục. Tool crawler + demo trên saucedemo đã chạy PASS rồi.
> Giờ mình muốn cắm site thật: URL `<...>`, tài khoản `<...>`. Hãy cấu hình `.env` + `crawler/config.ts`,
> chạy `npm run crawl`, rồi sinh Playwright test từ test case mình gửi (file `<...>`)."
