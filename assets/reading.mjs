export function enhanceReading(root, lang) {
  for (const region of root.querySelectorAll('.tw')) {
    if (!region.querySelector('table')) continue;
    region.tabIndex = 0;
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', lang === 'en' ? 'Horizontally scrollable table' : '可横向滚动的表格');
  }
}

export function mountAssessmentFilter({root, lang, href}) {
  const filter = root.querySelector('#assessment-subject');
  const status = root.querySelector('#assessment-matches');
  const rows = [...root.querySelectorAll('tr[data-due]')];
  let route;
  filter.addEventListener('change', () => {
    const params = new URLSearchParams(route.params);
    filter.value ? params.set('subject', filter.value) : params.delete('subject');
    location.hash = href('timetable', '', params);
  });
  return next => {
    route = next;
    const subject = route.params.get('subject') ?? '';
    filter.value = [...filter.options].some(option => option.value === subject) ? subject : '';
    let shown = 0;
    for (const row of rows) {
      row.hidden = Boolean(filter.value && row.cells[0].textContent.trim() !== filter.value);
      if (!row.hidden) shown++;
    }
    status.textContent = lang === 'en' ? shown + ' assessments' : '显示 ' + shown + ' 项考核';
  };
}
