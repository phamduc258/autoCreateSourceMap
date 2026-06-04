# DOM Crawler — lấy DOM/selector từ site test cho AI sinh Playwright test

Tool truy cập site test (qua mạng — **không cần source code, không cần dựng local**), đăng nhập,
quét từng màn hình và xuất ra **bản đồ DOM ↔ URL ↔ action** để AI đọc và sinh Playwright test với selector chuẩn.

> Repo có **2 công cụ**: **Crawler** (mục 1–5, quét tự động theo config) và **Recorder** kiểu Playwright codegen (mục 6, ghi thao tác tay → sinh code).

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
- **Trang public / không cần login:** thêm `auth: false` cho page đó → crawl ở chế độ **ẩn danh** (vd trang login, đăng ký — nếu đã đăng nhập sẽ bị redirect). Cả site public thì đặt `login.enabled = false`.

> 💡 **Chưa biết selector login?** Đặt tạm `login.enabled = false`, thêm trang login vào `pages`
> (vd `{ id: 'login', url: '/login' }`), chạy `npm run crawl`, rồi mở `output/raw/login/catalog.json`
> để lấy đúng selector của ô user/pass/nút. Sau đó điền vào `login` và bật lại `enabled = true`.

## 3. Chạy

```bash
npm run crawl       # dùng phiên đăng nhập đã lưu (nếu có)
npm run relogin     # xóa phiên cũ, đăng nhập lại (khi session hết hạn)
```

Mẹo debug: đặt `headless: false` trong `config.ts` để xem trình duyệt chạy tận mắt.

## 4. Kết quả — output 2 tầng (để input cho AI luôn nhỏ)

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

## 5. Bước tiếp theo — sinh test

Đưa cho Claude: **`output/index.md` → chọn màn liên quan → `output/screens/<id>.md` + file test case**
→ Claude đọc selector **đã kiểm chứng** và sinh `tests/*.spec.ts` (Page Object Model), input nhỏ gọn.
An toàn: tool **chỉ click những action bạn khai báo** trong `config.ts`, không tự bấm nút phá hủy dữ liệu.

## 6. Recorder — ghi thao tác kiểu Playwright codegen

Công cụ thứ 2: bạn *diễn* test case trên site, recorder ghi lại → sinh selector + code (không cần khai báo config trước như crawler).

```bash
npm run record -- <url> --name=TC001     # mở trình duyệt; thao tác; ĐÓNG cửa sổ app (hoặc Ctrl+C) để kết thúc
RECORD_STORAGE=output/.auth/state.json npm run record -- <url> --name=TC002   # dùng phiên login đã lưu (từ crawler)
RECORD_SELECTORS=css,xpath npm run record -- <url> --name=TC003               # chỉ giữ loại selector này trong 'unique'
```

**Toolbar (đầu trang khi headed):** ☰ kéo · **● Rec** (bật/tắt ghi) · **🎯 Pick** locator · **👁 Visible** · **🔤 Text** · **= Value** (assert) · **`</> Code`** (panel inline).
Pick/Assert là 1-lần: bật → click element → log → tự về chế độ ghi (Esc để hủy). Rec on/off + vị trí toolbar **giữ qua chuyển trang**.

**Chuột phải vào element** → menu **Choose action** (Click · Right click · Double click · Hover · Pick locator) → log đúng action đó.

**Cửa sổ code riêng** mở **bên phải** app (phủ kín phần còn lại của màn hình): hiện spec **live + syntax highlight**, cập nhật theo từng thao tác.

**Output** `recording/<name>/`:
- `<name>.spec.ts` — code Playwright **chạy được** (giống codegen).
- `<name>.json` — bản giàu cho **Claude**: mỗi action có `unique` (trỏ đúng 1) + `family` (nhóm item lặp + `within`) → viết assertion "data trong list": `locator.filter({ hasText }).<within>`.
- `<name>.md` — đọc cho người.

> Thư mục `recording/` chỉ là **output** → xóa thoải mái, tự tạo lại. (Đừng nhầm với `recorder/` = mã nguồn tool.)
