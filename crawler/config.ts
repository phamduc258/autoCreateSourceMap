// =============================================================================
//  CAU HINH TOOL LAY DOM
//  Ban chi can sua file nay (+ file .env) de chay.
// =============================================================================

/** 1 buoc tuong tac de lo state an (vd: click mo modal/tab/dropdown roi chup). */
export interface ActionStep {
  /** Mo ta ngan, se ghi vao mapping cho AI doc. VD: "Mo modal Them nguoi dung" */
  label: string;
  /** Selector cua element can tac dong. Co the la CSS hoac text=... cua Playwright. */
  selector: string;
  /** Mac dinh 'click'. Dung 'fill' neu can nhap lieu truoc. */
  type?: 'click' | 'fill';
  /** Gia tri can nhap khi type='fill'. */
  value?: string;
  /** id cua state moi se chup sau khi thuc hien action. Bo trong neu khong can chup. */
  captureAs?: string;
}

/** 1 man hinh / URL can lay DOM. */
export interface PageTarget {
  /** Dinh danh state (dat ten thu muc output). VD: 'dashboard' */
  id: string;
  /** Duong dan (tuong doi voi baseUrl, vd '/dashboard') hoac URL tuyet doi. */
  url: string;
  /** (Tuy chon) Selector cho xuat hien truoc khi chup -> dam bao trang da load xong. */
  waitFor?: string;
  /** (Tuy chon) Cac action de lo state an. CHI cac action khai bao o day moi duoc click. */
  actions?: ActionStep[];
  /** (Tuy chon) false = crawl trang nay o che do AN DANH (khong dung session login).
   *  Dung cho trang public / login / signup. Mac dinh dung session (neu login.enabled=true). */
  auth?: boolean;
}

export interface Config {
  baseUrl: string;
  login: {
    enabled: boolean;
    url: string;             // trang login (tuong doi baseUrl hoac tuyet doi)
    userSelector: string;    // o nhap username/email
    passSelector: string;    // o nhap password
    submitSelector: string;  // nut dang nhap
    successSelector: string; // element xuat hien KHI login thanh cong (de verify). De '' neu khong chac.
  };
  pages: PageTarget[];
  output: string;            // thu muc output
  headless: boolean;         // true = khong hien trinh duyet; dat false de xem tan mat khi debug
}

export const config: Config = {
  baseUrl: process.env.BASE_URL ?? 'https://www.saucedemo.com',

  // saucedemo: dang nhap ngay tai trang goc '/'
  login: {
    enabled: true,
    url: '/',
    userSelector: '#user-name',
    passSelector: '#password',
    submitSelector: '#login-button',
    successSelector: '.inventory_list', // xuat hien sau khi login -> /inventory.html
  },

  pages: [
    // Trang login la PUBLIC -> auth:false de crawl o che do an danh (neu dang login se bi redirect di).
    { id: 'login-page', url: '/', waitFor: '#login-button', auth: false },
    {
      id: 'inventory',
      url: '/inventory.html',
      waitFor: '.inventory_list',
      actions: [
        { label: 'Mo menu (burger)', selector: '#react-burger-menu-btn', type: 'click', captureAs: 'inventory_menu' },
        { label: 'Them Backpack vao gio', selector: '#add-to-cart-sauce-labs-backpack', type: 'click', captureAs: 'inventory_added' },
      ],
    },
    { id: 'cart', url: '/cart.html', waitFor: '.cart_contents_container' },
    { id: 'checkout', url: '/checkout-step-one.html', waitFor: '#first-name' },
  ],

  output: 'output',
  headless: true,
};
