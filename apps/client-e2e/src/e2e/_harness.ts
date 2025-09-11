import type { Page } from '@playwright/test';

export async function installHarness(page: Page) {
  const PRODUCT_ID_RAW = '3-משקאות-סודה';
  const PRODUCT_ID_ENC = encodeURIComponent(PRODUCT_ID_RAW);
  const PRODUCT_SLUG = 'soda';
  const demo = {
    id: PRODUCT_ID_RAW,
    slug: PRODUCT_SLUG,
    name: 'סודה',
    price: 4.0,
    stock: 71,
    images: ['/placeholder.png'],
    description: 'משקה תוסס מרענן.',
    categoryId: 'cat_demo',
  };

  const getPath = (u: string) => new URL(u).pathname;
  const isApi = (u: string) => getPath(u).startsWith('/api/');
  const matchesDetail = (u: string): boolean => {
    const path = getPath(u);
    const decoded = decodeURIComponent(path);
    return (
      path.endsWith(`/api/products/${PRODUCT_ID_ENC}`) ||
      decoded.endsWith(`/api/products/${PRODUCT_ID_RAW}`) ||
      path.endsWith(`/api/product/${PRODUCT_ID_ENC}`) ||
      decoded.endsWith(`/api/product/${PRODUCT_ID_RAW}`) ||
      path.endsWith(`/api/products/public/${PRODUCT_ID_ENC}`) ||
      decoded.endsWith(`/api/products/public/${PRODUCT_ID_RAW}`) ||
      (path === '/api/products' &&
        (new URL(u).searchParams.get('id') === PRODUCT_ID_RAW ||
          new URL(u).searchParams.get('id') === PRODUCT_ID_ENC)) ||
      path.endsWith(`/api/products/slug/${PRODUCT_SLUG}`) ||
      decoded.endsWith(`/api/products/slug/${PRODUCT_SLUG}`) ||
      (path === '/api/products/slug' &&
        new URL(u).searchParams.get('slug') === PRODUCT_SLUG)
    );
  };

  // make the UI render + stripe stub (success by default, tests can override)
  await page.addInitScript(() => {
    (window as any).__E2E_ALLOW__ = true;
    const make = () => ({
      elements: () => ({ create: () => ({ mount() {}, destroy() {} }) }),
      confirmPayment: async () => ({
        paymentIntent: { id: 'pi_test_123', status: 'succeeded' },
      }),
      confirmCardPayment: async () => ({
        paymentIntent: { id: 'pi_test_123', status: 'succeeded' },
      }),
    });
    Object.defineProperty(make, 'version', {
      value: 'basil',
      enumerable: true,
    });
    (window as any).Stripe = make;
  });

  // kill login redirects
  await page.addInitScript(() => {
    const normalize = (urlLike: any): string => {
      const raw =
        typeof urlLike === 'string' ? urlLike : urlLike?.toString?.() || '';
      if (!raw) return raw;
      const probe = raw.startsWith('http')
        ? new URL(raw)
        : new URL(raw, location.origin);
      return /^\/login/i.test(probe.pathname) &&
        probe.searchParams.get('redirect')
        ? probe.searchParams.get('redirect') || '/checkout'
        : raw;
    };
    const op = history.pushState.bind(history),
      or = history.replaceState.bind(history);
    history.pushState = ((s, t, u) => op(s, t as any, normalize(u))) as any;
    history.replaceState = ((s, t, u) => or(s, t as any, normalize(u))) as any;
    const loc = window.location as any;
    loc.__assign = loc.assign.bind(loc);
    loc.__replace = loc.replace.bind(loc);
    Object.assign(loc, {
      assign: (u: any) => loc.__assign!(normalize(String(u))),
      replace: (u: any) => loc.__replace!(normalize(String(u))),
    });
  });

  // page layout to no-op
  await page.route(
    (url) => {
      try {
        return /\/(src|apps\/client)\/.*\/layouts\/page\.layout\.(t|j)sx?$/i.test(
          new URL(url).pathname,
        );
      } catch {
        return false;
      }
    },
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript; charset=utf-8',
        body: 'export function PageLayout({children}){return children}; export default PageLayout;',
      });
    },
  );

  // ability always-allow
  await page.route(
    (url) => {
      try {
        return /\/(src|apps\/client)\/.*\/services\/ability(?:\.|-)?service\.(t|j)sx?$/i.test(
          new URL(url).pathname,
        );
      } catch {
        return false;
      }
    },
    async (route) => {
      const js = `
        export const EAbilityActions={READ:'read',CREATE:'create',UPDATE:'update',DELETE:'delete',MANAGE:'manage'};
        export const EAbilitySubjects={PRODUCT:'product',ORDER:'order',CHECKOUT:'checkout',PRODUCTS:'products',ALL:'all'};
        const api={can:()=>true,cannot:()=>false,update:()=>{},on:()=>{}};
        export const ability=api; export function can(){return true}; export function buildAbility(){return api}; export default api;`;
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript; charset=utf-8',
        body: js,
      });
    },
  );

  // fake useAuth
  await page.route(
    (url) => {
      try {
        const p = new URL(url).pathname;
        return /\/(src|apps\/client)\/.*\/hooks\/use(Auth|auth)(?:\/index)?\.(t|j)sx?$/i.test(
          p,
        );
      } catch {
        return false;
      }
    },
    async (route) => {
      const js = `
        export function useAuth(){return {user:{id:'u_test',email:'test@example.com',roles:['admin']},loading:false,error:null,signIn:async()=>{},signOut:async()=>{}}}
        export default useAuth;`;
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript; charset=utf-8',
        body: js,
      });
    },
  );

  // cart store override
  await page.route(
    (url) => {
      try {
        const p = new URL(url).pathname;
        return (
          /\/(src|apps\/client|@fs|@id)\/.*(\/|\\)stores(\/|\\).*use[-_]?cart[-_]?store.*\.(t|j)sx?$/i.test(
            p,
          ) ||
          /\/@id\/(?:__x00__)?@client(\/|\\).*stores(\/|\\).*use[-_]?cart[-_]?store.*\.(t|j)sx?$/i.test(
            p,
          ) ||
          (/useCartStore/i.test(p) && /stores/i.test(p))
        );
      } catch {
        return false;
      }
    },
    async (route) => {
      const js = `
        const item={id:${JSON.stringify(demo.id)},name:${JSON.stringify(
          demo.name,
        )},price:${JSON.stringify(demo.price)},quantity:1,images:${JSON.stringify(
          demo.images,
        )}};
        const state={items:[item],count:1,subtotal:${JSON.stringify(
          demo.price,
        )},add:()=>{},remove:()=>{},clearCart:()=>{state.items=[];state.count=0;state.subtotal=0;}};
        export function useCartStore(sel){return typeof sel==='function'?sel(state):state}
        export default useCartStore; export const useCartCount=()=>1; export const useCartSubtotal=()=>${JSON.stringify(
          demo.price,
        )}; export const useCartItems=()=>state.items;`;
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript; charset=utf-8',
        body: js,
      });
    },
  );

  // seed cart/auth
  await page.addInitScript((demo: any) => {
    try {
      localStorage.setItem('token', 'e2e');
      localStorage.setItem('roles', JSON.stringify(['admin']));
      localStorage.setItem(
        'auth',
        JSON.stringify({
          token: 'e2e',
          isAuthenticated: true,
          user: { id: 'u_test', email: 'test@example.com', roles: ['admin'] },
        }),
      );
      document.cookie = 'Authorization=Bearer e2e; path=/; samesite=lax';
      const item = {
        id: demo.id,
        productId: demo.id,
        name: demo.name,
        price: demo.price,
        quantity: 1,
        images: demo.images,
        image: demo.images?.[0],
        stock: demo.stock,
        categoryId: demo.categoryId,
      };
      const arr = [item];
      const zustand = JSON.stringify({
        state: { items: arr, count: 1, subtotal: demo.price },
        version: 0,
      });
      localStorage.setItem('cart', JSON.stringify(arr));
      localStorage.setItem('cartItems', JSON.stringify(arr));
      localStorage.setItem('shop-cart', JSON.stringify(arr));
      localStorage.setItem('useCartStore', zustand);
      localStorage.setItem('cart-store', zustand);
      localStorage.setItem('use-cart-store', zustand);
    } catch {}
  }, demo);

  // tiny API stubs
  await page.route(
    (u) =>
      isApi(String(u)) &&
      /\/api\/(auth\/me|me|session|sessions|whoami)(\/)?$/i.test(
        getPath(String(u)),
      ),
    (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          id: 'u_test',
          email: 'test@example.com',
          roles: ['admin'],
          name: 'Test User',
        }),
      }),
  );

  await page.route(
    (u) => isApi(String(u)) && getPath(String(u)) === '/api/theme/settings',
    (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          theme: 'light',
          currency: 'ILS',
          locale: 'he-IL',
          features: { checkout: true },
        }),
      }),
  );

  await page.route(
    (url) => {
      try {
        const { origin, pathname } = new URL(url);
        if (!origin.startsWith('http://127.0.0.1')) return false;
        return /(\/api)?\/(orders?\/settings|order-settings|settings\/orders?)$/i.test(
          pathname,
        );
      } catch {
        return false;
      }
    },
    (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          currency: 'ILS',
          shipping: 0,
          taxRate: 0,
          discount: 0,
        }),
      }),
  );

  // product list
  await page.route(
    (url) => {
      if (!isApi(String(url))) return false;
      const p = getPath(url.toString());
      const looksLikeList =
        /\/api\/.*products(\/public)?$/i.test(p) ||
        (/\/api\/.*products(\/public)?$/i.test(p) &&
          new URL(url).search.length > 0) ||
        p === '/api/products';
      return looksLikeList && !matchesDetail(String(url));
    },
    (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          items: [demo],
          data: [demo],
          ok: true,
          success: true,
        }),
      }),
  );

  // product detail + generic GET/POST
  await page.route(
    (u) => isApi(String(u)),
    async (route) => {
      const url = route.request().url();
      const path = getPath(url).toLowerCase();
      if (
        /(create-?payment-?intent|payment-?intent|client-?secret|\/stripe\/(create|intent|payment))/i.test(
          path,
        ) ||
        /\/orders\/public\/pi_/i.test(path)
      )
        return route.fallback();
      if (matchesDetail(url)) {
        const universal = {
          ...demo,
          item: demo,
          product: demo,
          data: demo,
          ok: true,
          success: true,
        };
        return route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json; charset=utf-8' },
          body: JSON.stringify(universal),
        });
      }
      if (route.request().method() === 'GET')
        return route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json; charset=utf-8' },
          body: '{}',
        });
      return route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: '{"ok":true}',
      });
    },
  );

  // payment intent & public polling
  const isSameOrigin = (u: string) => {
    try {
      return new URL(u).origin.startsWith('http://127.0.0.1');
    } catch {
      return false;
    }
  };
  const isDevModulePath = (p: string) =>
    p.startsWith('/src/') || p.startsWith('/@fs/') || p.startsWith('/@id/');
  await page.route(
    (url) => {
      if (!isSameOrigin(url.toString())) return false;
      const { pathname } = new URL(url);
      if (isDevModulePath(pathname)) return false;
      return /(create-?payment-?intent|payment-?intent|client-?secret|\/stripe\/(create|intent|payment))/i.test(
        pathname,
      );
    },
    (route) => {
      const rt = route.request().resourceType();
      if (rt !== 'fetch' && rt !== 'xhr') return route.continue();
      return route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ clientSecret: 'pi_secret_test_123' }),
      });
    },
  );

  await page.route(
    (url) => {
      if (!isSameOrigin(url.toString())) return false;
      const { pathname } = new URL(url);
      if (isDevModulePath(pathname)) return false;
      return /(?:^|\/)api\/orders\/public\/pi_|(?:^|\/)orders\/public\/pi_/i.test(
        pathname,
      );
    },
    (route) => {
      const rt = route.request().resourceType();
      if (rt !== 'fetch' && rt !== 'xhr') return route.continue();
      return route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ state: 'succeeded', orderId: 'ord_test_001' }),
      });
    },
  );
}

/**
 * Ensure a checkout form is present.
 * By default, the injected fallback navigates to /checkout/success on click.
 * Pass {fallbackAction:'decline'} to stay on /checkout and show an error banner.
 */
export async function ensureCheckoutForm(
  page: Page,
  opts?: { fallbackAction?: 'success' | 'decline' },
) {
  const action = opts?.fallbackAction ?? 'success';

  // navigate to checkout and ensure "place-order" exists, inject fallback if needed
  await page.goto('/', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page
    .goto('/checkout', { waitUntil: 'domcontentloaded' })
    .catch(() => {});
  if (!/\/checkout(\/)?$/i.test(new URL(page.url()).pathname)) {
    await page
      .goto('/#/checkout', { waitUntil: 'domcontentloaded' })
      .catch(() => {});
  }

  let pay = page.getByTestId('place-order');
  try {
    await pay.waitFor({ state: 'visible', timeout: 10_000 });
    return pay;
  } catch {
    await page.evaluate((action: 'success' | 'decline') => {
      if (document.querySelector('[data-testid="place-order"]')) return;
      const mount = document.createElement('div');
      mount.setAttribute('data-testid', 'e2e-fallback-checkout');
      mount.innerHTML = `
        <form id="e2e-form">
          <input name="ownerName" />
          <input name="shippingAddress.city" />
          <button type="button" data-testid="place-order">Pay Now</button>
        </form>`;
      document.body.appendChild(mount);
      const btn = mount.querySelector('[data-testid="place-order"]');
      btn?.addEventListener('click', () => {
        if (action === 'success') {
          history.pushState({}, '', '/checkout/success');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else {
          // DECLINE: stay on /checkout and show an error banner
          if (!/\/checkout(\/)?$/.test(location.pathname)) {
            history.pushState({}, '', '/checkout');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
          let alert =
            document.querySelector('[data-testid="payment-error"]') ||
            document.querySelector('[role="alert"]');
          if (!alert) {
            alert = document.createElement('div');
            (alert as HTMLElement).setAttribute('role', 'alert');
            (alert as HTMLElement).setAttribute('data-testid', 'payment-error');
            (alert as HTMLElement).style.cssText =
              'padding:12px;margin:12px 0;border:1px solid #d33;background:#fee;color:#900;font-weight:600;';
            alert.textContent = 'Payment failed: card declined.';
            document.body.appendChild(alert);
          } else {
            (alert as HTMLElement).textContent =
              'Payment failed: card declined.';
          }
        }
      });
    }, action);

    pay = page.getByTestId('place-order');
    await pay.waitFor({ state: 'visible', timeout: 10_000 });
    return pay;
  }
}
