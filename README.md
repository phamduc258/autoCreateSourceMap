# DOM Crawler — lấy DOM/selector từ site test cho AI sinh Playwright test

Tool truy cập site test (qua mạng — **không cần source code, không cần dựng local**), đăng nhập,
quét từng màn hình và xuất ra **bản đồ DOM ↔ URL ↔ action** để AI đọc và sinh Playwright test với selector chuẩn.

## 1. Cài đặt (chạy 1 lần)

```bash
npm install
npx playwright install chromium
```

## 2. Cấu hình

**a) Tạo file `.env`** (copy từ `.env.example`) và điền thông tin thật:

```
BASE_URL=https://site-test-cua-ban.com
TEST_USER=tai_khoan_test
TEST_PASS=mat_khau
```

**b) Sửa `crawler/config.ts`:**
- `login`: selector của ô user / ô password / nút đăng nhập, và `successSelector` (1 element chỉ xuất hiện sau khi login thành công — để kiểm tra login OK).
- `pages`: danh sách màn hình cần lấy. Mỗi màn có `id`, `url`, `waitFor`, và (tùy chọn) `actions` để mở modal/dropdown rồi chụp thêm.

> 💡 **Chưa biết selector login?** Đặt tạm `login.enabled = false`, thêm trang login vào `pages`
> (vd `{ id: 'login', url: '/login' }`), chạy `npm run crawl`, rồi mở `output/states/login/catalog.json`
> để lấy đúng selector của ô user/pass/nút. Sau đó điền vào `login` và bật lại `enabled = true`.

## 3. Chạy

```bash
npm run crawl       # dùng phiên đăng nhập đã lưu (nếu có)
npm run relogin     # xóa phiên cũ, đăng nhập lại (khi session hết hạn)
```

Mẹo debug: đặt `headless: false` trong `config.ts` để xem trình duyệt chạy tận mắt.

## 4. Kết quả (thư mục `output/`)

```
output/
  index.json                 # BẢN ĐỒ tổng: states + actions, trỏ tới các file bên dưới
  states/<id>/
    catalog.json             # danh sách element + selector ứng viên (testid/role/label...)
    a11y.yaml                # accessibility tree (role + tên) — rất hợp để viết getByRole
    dom.html                 # HTML đã làm sạch (bỏ script/style)
    screenshot.png           # ảnh màn hình
```

`index.json` mỗi state gồm: `url`, `reachedBy` (action nào dẫn tới), `files`, và `elements`
(name / role / testid / locator gợi ý sẵn dạng Playwright).

## 5. Bước tiếp theo — sinh test

Đưa cho Claude: **`output/index.json` + file test case** → Claude đọc selector từ mapping và sinh
`tests/*.spec.ts` (Page Object Model). An toàn: tool **chỉ click những action bạn khai báo** trong
`config.ts`, không tự động bấm nút phá hủy dữ liệu.
