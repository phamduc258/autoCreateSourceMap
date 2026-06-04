# Recording: recording

Bat dau: http://127.0.0.1:8000/

n = so element khop. unique (cho thao tac) nen n=1. family = nhom item lap (n>=2) -> .filter({hasText}) theo data.

1. **navigate** -> http://127.0.0.1:8000/
2. **click** — "Khám phá khóa học" (a)
   - unique: `getByRole('link', { name: 'Khám phá khóa học' })`
       . role: `getByRole('link', { name: 'Khám phá khóa học' })` (n=1)
       . css: `body > section:nth-of-type(1) > div > div > a:nth-of-type(1)` (n=1)
       . xpath: `/html[1]/body[1]/section[1]/div[1]/div[1]/a[1]` (n=1)
       . text: `getByText('Khám phá khóa học', { exact: true })` (n=1)
   - family: `.btn` x2  -> within: `:scope`
       . css: `.btn` (n=2)
3. **navigate** -> http://127.0.0.1:8000/#courses
4. **pick** — "AI Tools" (h3)
   - unique: `#courses > div > div > a:nth-of-type(1) > h3`
       . css: `#courses > div > div > a:nth-of-type(1) > h3` (n=1)
       . xpath: `/html[1]/body[1]/section[2]/div[1]/div[1]/a[1]/h3[1]` (n=1)
       . text: `getByText('AI Tools', { exact: true })` (n=1)
   - family: `.course-card` x32  -> within: `.course-title`
       . css: `.course-card` (n=32)
5. **click** — "🐍 Python Programming Học Python từ cơ bản đến nâng cao - 84" (a)
   - unique: `getByRole('link', { name: '🐍 Python Programming Học Python từ cơ bản đến nâng cao - 84' })`
       . role: `getByRole('link', { name: '🐍 Python Programming Học Python từ cơ bản đến nâng cao - 84' })` (n=1)
       . css: `#courses > div > div > a:nth-of-type(2)` (n=1)
       . xpath: `/html[1]/body[1]/section[2]/div[1]/div[1]/a[2]` (n=1)
       . text: `getByText('🐍 Python Programming Học Python từ cơ bản đến nâng cao - 84', { exact: true })` (n=0)
   - family: `.course-card` x32  -> within: `:scope`
       . css: `.course-card` (n=32)
6. **navigate** -> http://127.0.0.1:8000/python
7. **click** — "Bắt Đầu Học" (a)
   - unique: `getByRole('link', { name: 'Bắt Đầu Học' })`
       . role: `getByRole('link', { name: 'Bắt Đầu Học' })` (n=1)
       . css: `body > div:nth-of-type(1) > div:nth-of-type(3) > a:nth-of-type(1)` (n=1)
       . xpath: `/html[1]/body[1]/div[1]/div[3]/a[1]` (n=1)
       . text: `getByText('Bắt Đầu Học', { exact: true })` (n=1)
8. **navigate** -> http://127.0.0.1:8000/python/lessons/lesson-01
