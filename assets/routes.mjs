export const routes = {
  home: ['学习面板', 'Dashboard'],
  resources: ['资料库', 'Resources'],
  timetable: ['考试日程', 'Assessments'],
  subjects: ['五科要点', 'Subject notes'],
  mindmap: ['思维导图', 'Mind map'],
  advising: ['ATAR 与升学', 'ATAR & advising'],
  glossary: ['术语表', 'Glossary'],
  timeline: ['学期时间线', 'Term timeline'],
  papers: ['历年真题', 'Past exams'],
  about: ['关于本站', 'About'],
};

export function parseRoute(hash) {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/');
  const lang = parts[0] === 'en' ? parts.shift() : 'zh';
  const [page = '', argument = ''] = parts;
  return {
    lang,
    page: page === '' ? 'home' : Object.hasOwn(routes, page) ? page : 'missing',
    argument,
    params: new URLSearchParams(query),
  };
}

export function routeHref(lang, page, argument = '', params = '') {
  return '#' + (lang === 'en' ? 'en/' : '') + page + (argument ? '/' + argument : '') + (String(params) ? '?' + params : '');
}
