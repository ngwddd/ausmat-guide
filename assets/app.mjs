import {parseRoute, routeHref, routes} from './routes.mjs';
import {enhanceReading} from './reading.mjs';

const outlet = document.querySelector('#main');
const nav = document.querySelector('#site-nav');
const locale = document.querySelector('#locale');
const status = document.querySelector('#route-status');
let current;
let request = 0;

function updateShell({lang, page, argument, params}) {
  const en = lang === 'en';
  document.documentElement.lang = en ? 'en' : 'zh-CN';
  document.title = (routes[page]?.[Number(en)] ?? (en ? 'Page not found' : '找不到页面')) + ' · AUSMAT';
  nav.setAttribute('aria-label', en ? 'Main navigation' : '主要导航');
  for (const link of nav.querySelectorAll('[data-route]')) {
    const target = link.dataset.route;
    link.textContent = routes[target][Number(en)];
    link.href = routeHref(lang, target);
    if (page === target) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.querySelector('.brand').href = routeHref(lang, 'home');
  document.querySelector('#brand-label').textContent = en ? 'AUSMAT Study Studio' : 'AUSMAT 学习工作台';
  document.querySelector('#about-link').href = routeHref(lang, 'about');
  document.querySelector('#about-link').textContent = routes.about[Number(en)];
  locale.textContent = en ? '中文' : 'EN';
  locale.lang = en ? 'zh-CN' : 'en';
  locale.href = routeHref(en ? 'zh' : 'en', page, argument, params);
}

async function loadRoute() {
  const id = ++request;
  const route = parseRoute(location.hash);
  const {page, lang, argument, params} = route;
  const modulePage = page === 'resources' ? 'home' : page;
  const key = modulePage + ':' + lang;
  const en = lang === 'en';
  const href = (target, value, query) => routeHref(lang, target, value, query);
  updateShell(route);
  status.textContent = '';
  try {
    if (current?.key !== key) {
      outlet.setAttribute('aria-busy', 'true');
      if (current) current.root.inert = true;
      const view = await import('./views/' + modulePage + '.mjs');
      if (id !== request) return;
      current?.controller.abort();
      current = null;
      const controller = new AbortController();
      const root = document.createElement('div');
      root.id = 'active-view';
      root.className = [modulePage === 'home' ? 'studio-view' : 'reading-view', view.className].filter(Boolean).join(' ');
      root.innerHTML = view.default[lang] ?? view.default.zh;
      outlet.replaceChildren(root);
      const options = {root, lang, signal: controller.signal, href};
      current = {key, root, controller, update: null};
      const update = await view.mount?.(options);
      if (id !== request) return;
      current.update = update;
      enhanceReading(root, lang);
    }
    current.root.inert = false;
    current.update?.(route);
    if (id !== request) return;
    const anchor = params.get('anchor');
    const heading = current.root.querySelector('h1:not([hidden])');
    const target = anchor && document.getElementById(anchor);
    if (target && current.root.contains(target)) target.scrollIntoView();
    else {
      window.scrollTo(0, 0);
      const visibleHeading = [...current.root.querySelectorAll('h1')].find(node => !node.closest('[hidden]')) ?? heading;
      if (visibleHeading) {
        visibleHeading.tabIndex = -1;
        visibleHeading.focus({preventScroll: true});
      }
    }
  } catch (error) {
    if (id !== request) return;
    current?.controller.abort();
    current = null;
    outlet.replaceChildren();
    status.textContent = en ? 'This page could not load. Reopen the link or refresh to retry.' : '页面加载失败。请重新打开链接或刷新后重试。';
    console.error(error);
  } finally {
    if (id === request) outlet.removeAttribute('aria-busy');
  }
}

window.addEventListener('hashchange', loadRoute);
loadRoute();
