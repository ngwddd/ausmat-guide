(() => {
  const {home, route} = document.currentScript.dataset;
  const params = new URLSearchParams(location.search);
  const [language, page] = route.startsWith('en/') ? route.split('/') : ['zh', route];
  const lang = page === 'mindmap' && params.has('lang') ? params.get('lang') : language;
  if (page === 'mindmap') params.delete('lang');
  if (location.hash.length > 1) {
    let anchor = location.hash.slice(1);
    try { anchor = decodeURIComponent(anchor); } catch {}
    if (page === 'home' && /^(home|resources)(\/[A-Z]+)?$/.test(anchor)) {
      location.replace(home + '#' + (lang === 'en' ? 'en/' : '') + anchor);
      return;
    }
    params.set('anchor', anchor);
  }
  location.replace(home + '#' + (lang === 'en' ? 'en/' : '') + page + (params.size ? '?' + params : ''));
})();
