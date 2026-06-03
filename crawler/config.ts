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
  baseUrl: process.env.BASE_URL ?? 'https://your-test-site.example.com',

  login: {
    enabled: true,
    url: '/login',
    userSelector: '#username',
    passSelector: '#password',
    submitSelector: 'button[type="submit"]',
    successSelector: '', // vd: '[data-testid="user-menu"]' hoac 'text=Trang chu'
  },

  // Danh sach man hinh can lay DOM. Them bao nhieu tuy y.
  pages: [
    { id: 'dashboard', url: '/dashboard', waitFor: 'main' },

    // --- Vi du man hinh co action de chup them state an ---
    // {
    //   id: 'users',
    //   url: '/users',
    //   waitFor: 'table',
    //   actions: [
    //     { label: 'Mo modal Them nguoi dung', selector: 'text=Them nguoi dung', type: 'click', captureAs: 'users__add-modal' },
    //   ],
    // },
  ],

  output: 'output',
  headless: true,
};
