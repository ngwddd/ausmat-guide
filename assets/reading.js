(() => {
  const en = document.documentElement.lang === 'en';
  const t = (zh, english) => en ? english : zh;
  const filter = document.querySelector('#assessment-subject');
  if (filter) {
    const rows = [...document.querySelectorAll('tr[data-due]')];
    const status = document.querySelector('#assessment-matches');
    const url = new URL(location.href);
    const subject = url.searchParams.get('subject');
    if ([...filter.options].some(option => option.value === subject)) filter.value = subject;
    function showMatches() {
      let shown = 0;
      for (const row of rows) {
        row.hidden = Boolean(filter.value && row.cells[0].textContent.trim() !== filter.value);
        if (!row.hidden) shown++;
      }
      status.textContent = t('显示 ' + shown + ' 项考核', shown + ' assessments');
    }
    showMatches();
    filter.addEventListener('change', () => {
      const current = new URL(location.href);
      if (filter.value) current.searchParams.set('subject', filter.value);
      else current.searchParams.delete('subject');
      try { history.replaceState(null, '', current); } catch {}
      showMatches();
    });
  }
  for (const wrap of document.querySelectorAll('.tw')) {
    if (!wrap.querySelector('table')) continue;
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', t('可横向滚动的表格', 'Horizontally scrollable table'));
  }
})();
