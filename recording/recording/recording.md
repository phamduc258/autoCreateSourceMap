# Recording: recording

Bat dau: https://www.saucedemo.com

> Selector deu on dinh (khong positional). 👍

n = so element khop. unique nen n=1. family = nhom item lap (n>=2) -> .filter({hasText}).

1. **navigate** -> https://www.saucedemo.com/
2. **fill** = `standard_user` — "Username" (input)
   - unique: `[data-test="username"]`
       . testId: `[data-test="username"]` (n=1)
       . css#id: `#user-name` (n=1)
       . xpath@id: `//input[@id="user-name"]` (n=1)
       . label→input: `(//*[normalize-space()="Swag Labs"])[1]/ancestor-or-self::*[.//input][1]/descendant::input[1]` (n=1)
       . placeholder: `getByPlaceholder('Username')` (n=1)
       . css[name]: `input[name="user-name"]` (n=1)
       . cssPath: `#user-name` (n=1)
       . xpathPath: `//*[@data-test='username']` (n=1)
       . css.class: `input.input_error.form_input` (n=2)
       . xpath@class: `//input[contains(concat(" ",normalize-space(@class)," ")," input_error ")]` (n=2)
   - family: `.form_group` x2  -> within: `.input_error`
       . css: `.form_group` (n=2)
3. **fill** = `secret_sauce` — "Password" (input)
   - unique: `[data-test="password"]`
       . testId: `[data-test="password"]` (n=1)
       . css#id: `#password` (n=1)
       . xpath@id: `//input[@id="password"]` (n=1)
       . placeholder: `getByPlaceholder('Password')` (n=1)
       . css[name]: `input[name="password"]` (n=1)
       . cssPath: `#password` (n=1)
       . xpathPath: `//*[@data-test='password']` (n=1)
       . css.class: `input.input_error.form_input` (n=2)
       . xpath@class: `//input[contains(concat(" ",normalize-space(@class)," ")," input_error ")]` (n=2)
   - family: `.form_group` x2  -> within: `.input_error`
       . css: `.form_group` (n=2)
4. **click** — (input)
   - unique: `[data-test="login-button"]`
       . testId: `[data-test="login-button"]` (n=1)
       . css#id: `#login-button` (n=1)
       . xpath@id: `//input[@id="login-button"]` (n=1)
       . css[name]: `input[name="login-button"]` (n=1)
       . css.class: `input.submit-button.btn_action` (n=1)
       . xpath@class: `//input[contains(concat(" ",normalize-space(@class)," ")," submit-button ")]` (n=1)
       . cssPath: `#login-button` (n=1)
       . xpathPath: `//*[@data-test='login-button']` (n=1)
5. **navigate** -> https://www.saucedemo.com/inventory.html
6. **click** — "Add to cart" (button)
   - unique: `[data-test="add-to-cart-sauce-labs-backpack"]`
       . testId: `[data-test="add-to-cart-sauce-labs-backpack"]` (n=1)
       . css#id: `#add-to-cart-sauce-labs-backpack` (n=1)
       . xpath@id: `//button[@id="add-to-cart-sauce-labs-backpack"]` (n=1)
       . css[name]: `button[name="add-to-cart-sauce-labs-backpack"]` (n=1)
       . cssPath: `#add-to-cart-sauce-labs-backpack` (n=1)
       . xpathPath: `//*[@data-test='add-to-cart-sauce-labs-backpack']` (n=1)
       . role: `getByRole('button', { name: 'Add to cart' })` (n=6)
       . text: `getByText('Add to cart', { exact: true })` (n=6)
       . xpath.text: `//button[normalize-space()="Add to cart"]` (n=6)
       . css.class: `button.btn.btn_primary.btn_small.btn_inventory` (n=6)
       . xpath@class: `//button[contains(concat(" ",normalize-space(@class)," ")," btn ")]` (n=6)
   - family: `.inventory_item` x6  -> within: `getByRole('button', { name: 'Add to cart' })`
       . css: `.inventory_item` (n=6)
       . testId: `[data-test="inventory-item"]` (n=6)
7. **pick** — "Add to cart" (button)
   - unique: `[data-test="add-to-cart-sauce-labs-bike-light"]`
       . testId: `[data-test="add-to-cart-sauce-labs-bike-light"]` (n=1)
       . css#id: `#add-to-cart-sauce-labs-bike-light` (n=1)
       . xpath@id: `//button[@id="add-to-cart-sauce-labs-bike-light"]` (n=1)
       . css[name]: `button[name="add-to-cart-sauce-labs-bike-light"]` (n=1)
       . cssPath: `#add-to-cart-sauce-labs-bike-light` (n=1)
       . xpathPath: `//*[@data-test='add-to-cart-sauce-labs-bike-light']` (n=1)
       . role: `getByRole('button', { name: 'Add to cart' })` (n=5)
       . text: `getByText('Add to cart', { exact: true })` (n=5)
       . xpath.text: `//button[normalize-space()="Add to cart"]` (n=5)
       . css.class: `button.btn.btn_primary.btn_small.btn_inventory` (n=5)
       . xpath@class: `//button[contains(concat(" ",normalize-space(@class)," ")," btn ")]` (n=6)
   - family: `.inventory_item` x6  -> within: `getByRole('button', { name: 'Add to cart' })`
       . css: `.inventory_item` (n=6)
       . testId: `[data-test="inventory-item"]` (n=6)
8. **assert visible** — "Sauce Labs Backpack" (div)
   - unique: `//div[normalize-space()="Sauce Labs Backpack"]`
       . xpath.text: `//div[normalize-space()="Sauce Labs Backpack"]` (n=1)
       . cssPath: `#item_4_title_link > div` (n=1)
       . testId: `[data-test="inventory-item-name"]` (n=6)
       . text: `getByText('Sauce Labs Backpack', { exact: true })` (n=2)
       . css.class: `div.inventory_item_name` (n=6)
       . xpath@class: `//div[contains(concat(" ",normalize-space(@class)," ")," inventory_item_name ")]` (n=6)
       . xpathPath: `//*[@data-test='inventory-item-name']` (n=6)
   - family: `.inventory_item` x6  -> within: `.inventory_item_description > .inventory_item_label > a > .inventory_item_name`
       . css: `.inventory_item` (n=6)
       . testId: `[data-test="inventory-item"]` (n=6)
9. **dblclick** — "Add to cart" (button)
   - unique: `[data-test="add-to-cart-sauce-labs-onesie"]`
       . testId: `[data-test="add-to-cart-sauce-labs-onesie"]` (n=1)
       . css#id: `#add-to-cart-sauce-labs-onesie` (n=1)
       . xpath@id: `//button[@id="add-to-cart-sauce-labs-onesie"]` (n=1)
       . css[name]: `button[name="add-to-cart-sauce-labs-onesie"]` (n=1)
       . cssPath: `#add-to-cart-sauce-labs-onesie` (n=1)
       . xpathPath: `//*[@data-test='add-to-cart-sauce-labs-onesie']` (n=1)
       . role: `getByRole('button', { name: 'Add to cart' })` (n=5)
       . text: `getByText('Add to cart', { exact: true })` (n=5)
       . xpath.text: `//button[normalize-space()="Add to cart"]` (n=5)
       . css.class: `button.btn.btn_primary.btn_small.btn_inventory` (n=5)
       . xpath@class: `//button[contains(concat(" ",normalize-space(@class)," ")," btn ")]` (n=6)
   - family: `.inventory_item` x6  -> within: `getByRole('button', { name: 'Add to cart' })`
       . css: `.inventory_item` (n=6)
       . testId: `[data-test="inventory-item"]` (n=6)
10. **click** — "Add to cart" (button)
   - unique: `[data-test="add-to-cart-sauce-labs-fleece-jacket"]`
       . testId: `[data-test="add-to-cart-sauce-labs-fleece-jacket"]` (n=1)
       . css#id: `#add-to-cart-sauce-labs-fleece-jacket` (n=1)
       . xpath@id: `//button[@id="add-to-cart-sauce-labs-fleece-jacket"]` (n=1)
       . css[name]: `button[name="add-to-cart-sauce-labs-fleece-jacket"]` (n=1)
       . cssPath: `#add-to-cart-sauce-labs-fleece-jacket` (n=1)
       . xpathPath: `//*[@data-test='add-to-cart-sauce-labs-fleece-jacket']` (n=1)
       . role: `getByRole('button', { name: 'Add to cart' })` (n=5)
       . text: `getByText('Add to cart', { exact: true })` (n=5)
       . xpath.text: `//button[normalize-space()="Add to cart"]` (n=5)
       . css.class: `button.btn.btn_primary.btn_small.btn_inventory` (n=5)
       . xpath@class: `//button[contains(concat(" ",normalize-space(@class)," ")," btn ")]` (n=6)
   - family: `.inventory_item` x6  -> within: `getByRole('button', { name: 'Add to cart' })`
       . css: `.inventory_item` (n=6)
       . testId: `[data-test="inventory-item"]` (n=6)
11. **assert css** text-transform = `none` — "Sauce Labs Backpack" (div)
   - unique: `//div[normalize-space()="Sauce Labs Backpack"]`
       . xpath.text: `//div[normalize-space()="Sauce Labs Backpack"]` (n=1)
       . cssPath: `#item_4_title_link > div` (n=1)
       . testId: `[data-test="inventory-item-name"]` (n=6)
       . text: `getByText('Sauce Labs Backpack', { exact: true })` (n=2)
       . css.class: `div.inventory_item_name` (n=6)
       . xpath@class: `//div[contains(concat(" ",normalize-space(@class)," ")," inventory_item_name ")]` (n=6)
       . xpathPath: `//*[@data-test='inventory-item-name']` (n=6)
   - family: `.inventory_item` x6  -> within: `.inventory_item_description > .inventory_item_label > a > .inventory_item_name`
       . css: `.inventory_item` (n=6)
       . testId: `[data-test="inventory-item"]` (n=6)
12. **navigate** -> https://www.saucedemo.com/?/inventory.html
13. **navigate** -> https://www.saucedemo.com/inventory.html
14. **click** — "Open Menu" (button)
   - unique: `#react-burger-menu-btn`
       . css#id: `#react-burger-menu-btn` (n=1)
       . xpath@id: `//button[@id="react-burger-menu-btn"]` (n=1)
       . role: `getByRole('button', { name: 'Open Menu' })` (n=1)
       . xpath.text: `//button[normalize-space()="Open Menu"]` (n=1)
       . cssPath: `#react-burger-menu-btn` (n=1)
       . xpathPath: `//*[@id="react-burger-menu-btn"]` (n=1)
       . text: `getByText('Open Menu', { exact: true })` (n=3)
   - family: `div` x92  -> within: `getByRole('button', { name: 'Open Menu' })`
       . tag: `div` (n=92)
15. **screenshot** -> `shots/shot-1.png`
16. **click** — "Add to cart" (button)
   - unique: `[data-test="add-to-cart-sauce-labs-bolt-t-shirt"]`
       . testId: `[data-test="add-to-cart-sauce-labs-bolt-t-shirt"]` (n=1)
       . css#id: `#add-to-cart-sauce-labs-bolt-t-shirt` (n=1)
       . xpath@id: `//button[@id="add-to-cart-sauce-labs-bolt-t-shirt"]` (n=1)
       . css[name]: `button[name="add-to-cart-sauce-labs-bolt-t-shirt"]` (n=1)
       . cssPath: `#add-to-cart-sauce-labs-bolt-t-shirt` (n=1)
       . xpathPath: `//*[@data-test='add-to-cart-sauce-labs-bolt-t-shirt']` (n=1)
       . role: `getByRole('button', { name: 'Add to cart' })` (n=5)
       . text: `getByText('Add to cart', { exact: true })` (n=5)
       . xpath.text: `//button[normalize-space()="Add to cart"]` (n=5)
       . css.class: `button.btn.btn_primary.btn_small.btn_inventory` (n=5)
       . xpath@class: `//button[contains(concat(" ",normalize-space(@class)," ")," btn ")]` (n=6)
   - family: `.inventory_item` x6  -> within: `getByRole('button', { name: 'Add to cart' })`
       . css: `.inventory_item` (n=6)
       . testId: `[data-test="inventory-item"]` (n=6)
17. **click** — "Add to cart" (button)
   - unique: `[data-test="add-to-cart-sauce-labs-bike-light"]`
       . testId: `[data-test="add-to-cart-sauce-labs-bike-light"]` (n=1)
       . css#id: `#add-to-cart-sauce-labs-bike-light` (n=1)
       . xpath@id: `//button[@id="add-to-cart-sauce-labs-bike-light"]` (n=1)
       . css[name]: `button[name="add-to-cart-sauce-labs-bike-light"]` (n=1)
       . cssPath: `#add-to-cart-sauce-labs-bike-light` (n=1)
       . xpathPath: `//*[@data-test='add-to-cart-sauce-labs-bike-light']` (n=1)
       . role: `getByRole('button', { name: 'Add to cart' })` (n=4)
       . text: `getByText('Add to cart', { exact: true })` (n=4)
       . xpath.text: `//button[normalize-space()="Add to cart"]` (n=4)
       . css.class: `button.btn.btn_primary.btn_small.btn_inventory` (n=4)
       . xpath@class: `//button[contains(concat(" ",normalize-space(@class)," ")," btn ")]` (n=6)
   - family: `.inventory_item` x6  -> within: `getByRole('button', { name: 'Add to cart' })`
       . css: `.inventory_item` (n=6)
       . testId: `[data-test="inventory-item"]` (n=6)
18. **goBack** -> https://www.saucedemo.com/
19. **goForward** -> https://www.saucedemo.com/inventory.html
