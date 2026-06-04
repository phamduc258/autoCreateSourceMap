# Recording: picker

Bat dau: https://www.saucedemo.com

> 🔴 1 action dung SELECTOR MONG MANH (positional path) -> nen them data-testid cho element do.

n = so element khop. unique nen n=1. family = nhom item lap (n>=2) -> .filter({hasText}).

1. **navigate** -> https://www.saucedemo.com/
2. **fill** = `standard_user` — "Username" (input)
   - unique: `[data-test="username"]`
       . testId: `[data-test="username"]` (n=1)
       . placeholder: `getByPlaceholder('Username')` (n=1)
       . id: `#user-name` (n=1)
       . name: `input[name="user-name"]` (n=1)
       . text: `getByText('Username', { exact: true })` (n=0)
       . cssPath: `#user-name` (n=1)
       . xpath: `//*[@data-test='username']` (n=1)
   - family: `.form_group` x2  -> within: `.input_error`
       . css: `.form_group` (n=2)
3. **fill** = `secret_sauce` — "Password" (input)
   - unique: `[data-test="password"]`
       . testId: `[data-test="password"]` (n=1)
       . placeholder: `getByPlaceholder('Password')` (n=1)
       . id: `#password` (n=1)
       . name: `input[name="password"]` (n=1)
       . text: `getByText('Password', { exact: true })` (n=0)
       . cssPath: `#password` (n=1)
       . xpath: `//*[@data-test='password']` (n=1)
   - family: `.form_group` x2  -> within: `.input_error`
       . css: `.form_group` (n=2)
4. **click** — (input)
   - unique: `[data-test="login-button"]`
       . testId: `[data-test="login-button"]` (n=1)
       . id: `#login-button` (n=1)
       . name: `input[name="login-button"]` (n=1)
       . cssPath: `#login-button` (n=1)
       . xpath: `//*[@data-test='login-button']` (n=1)
   - family: `div` x29  -> within: `.login_container > .login_wrapper > .login_wrapper-inner > .form_column > .login-box > form > .submit-button`
       . tag: `div` (n=29)
5. **navigate** -> https://www.saucedemo.com/inventory.html
6. **click** — "Add to cart" (button)
   - unique: `[data-test="add-to-cart-sauce-labs-backpack"]`
       . testId: `[data-test="add-to-cart-sauce-labs-backpack"]` (n=1)
       . role: `getByRole('button', { name: 'Add to cart' })` (n=6)
       . id: `#add-to-cart-sauce-labs-backpack` (n=1)
       . name: `button[name="add-to-cart-sauce-labs-backpack"]` (n=1)
       . text: `getByText('Add to cart', { exact: true })` (n=6)
       . cssPath: `#add-to-cart-sauce-labs-backpack` (n=1)
       . xpath: `//*[@data-test='add-to-cart-sauce-labs-backpack']` (n=1)
   - family: `.inventory_item` x6  -> within: `getByRole('button', { name: 'Add to cart' })`
       . css: `.inventory_item` (n=6)
       . testId: `[data-test="inventory-item"]` (n=6)
7. **pick** — "Add to cart" (button)
   - unique: `[data-test="add-to-cart-sauce-labs-bike-light"]`
       . testId: `[data-test="add-to-cart-sauce-labs-bike-light"]` (n=1)
       . role: `getByRole('button', { name: 'Add to cart' })` (n=5)
       . id: `#add-to-cart-sauce-labs-bike-light` (n=1)
       . name: `button[name="add-to-cart-sauce-labs-bike-light"]` (n=1)
       . text: `getByText('Add to cart', { exact: true })` (n=5)
       . cssPath: `#add-to-cart-sauce-labs-bike-light` (n=1)
       . xpath: `//*[@data-test='add-to-cart-sauce-labs-bike-light']` (n=1)
   - family: `.inventory_item` x6  -> within: `getByRole('button', { name: 'Add to cart' })`
       . css: `.inventory_item` (n=6)
       . testId: `[data-test="inventory-item"]` (n=6)
8. **assert visible** — "Sauce Labs Backpack" (div)  🔴 MONG MANH
   - unique: `#item_4_title_link > div`
       . testId: `[data-test="inventory-item-name"]` (n=6)
       . text: `getByText('Sauce Labs Backpack', { exact: true })` (n=2)
       . cssPath: `#item_4_title_link > div` (n=1)
       . xpath: `//*[@data-test='inventory-item-name']` (n=6)
   - family: `.inventory_item` x6  -> within: `.inventory_item_description > .inventory_item_label > a > .inventory_item_name`
       . css: `.inventory_item` (n=6)
       . testId: `[data-test="inventory-item"]` (n=6)
9. **dblclick** — "Add to cart" (button)
   - unique: `[data-test="add-to-cart-sauce-labs-onesie"]`
       . testId: `[data-test="add-to-cart-sauce-labs-onesie"]` (n=1)
       . role: `getByRole('button', { name: 'Add to cart' })` (n=5)
       . id: `#add-to-cart-sauce-labs-onesie` (n=1)
       . name: `button[name="add-to-cart-sauce-labs-onesie"]` (n=1)
       . text: `getByText('Add to cart', { exact: true })` (n=5)
       . cssPath: `#add-to-cart-sauce-labs-onesie` (n=1)
       . xpath: `//*[@data-test='add-to-cart-sauce-labs-onesie']` (n=1)
   - family: `.inventory_item` x6  -> within: `getByRole('button', { name: 'Add to cart' })`
       . css: `.inventory_item` (n=6)
       . testId: `[data-test="inventory-item"]` (n=6)
