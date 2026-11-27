import {courses, resources} from './catalog.mjs';
import {assessments} from './assessments.mjs';

export function mountStudio({root, lang, href}) {
  const en = lang === 'en';
  const t = (zh, english) => en ? english : zh;
  const locale = en ? 'en-MY' : 'zh-MY';
  const categories = {
    guide: t('课程导读', 'Course guide'), drill: t('复习练习', 'Revision'),
    official: t('官方资料', 'Official resource'), admission: t('升学申请', 'Admissions'),
  };
  const byId = id => root.querySelector('#' + id);
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function link(text, href, className) {
    const anchor = el('a', className, text);
    anchor.href = href;
    return anchor;
  }

  function option(value, label) {
    const item = el('option', '', label);
    item.value = value;
    return item;
  }

  function label(text, field) {
    const node = el('label', 'field', text);
    node.append(field);
    return node;
  }

  function codeChip(code) {
    const chip = el('span', 'code', code);
    chip.dataset.code = code;
    return chip;
  }

  function localDate() {
    const date = new Date();
    return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
      .map((value, index) => String(value).padStart(index === 0 ? 4 : 2, '0')).join('-');
  }

  function dateLabel(date) {
    return new Intl.DateTimeFormat(locale, {month:'short', day:'numeric', year:'numeric', timeZone:'UTC'})
      .format(new Date(date + 'T00:00:00Z'));
  }

  function courseLabel(code) {
    return courses.find(course => course[0] === code)?.[en ? 2 : 1] ?? t('通用','General');
  }

  function buildHome() {
    const subjects = byId('subjects');
    for (const [code, zh, english, topicZh, topicEn] of courses) {
      const entry = link('', href('resources', code), 'course');
      const name = el('span');
      name.append(el('strong','', t(zh, english)), el('small','', t(topicZh, topicEn)));
      entry.append(codeChip(code), name);
      const row = el('li');
      row.append(entry);
      subjects.append(row);
    }
    const events = assessments[lang];
    const upcoming = events.filter(event => event.date >= localDate()).slice(0, 4);
    const due = byId('upcoming');
    for (const {date, subject: code, title: name, weight} of upcoming) {
      const card = el('li', 'due-row');
      const title = el('span');
      const assessment = link(name, href('timetable', '', new URLSearchParams({subject: code, anchor: 'assessments'})), 'assessment-prepare');
      title.append(assessment);
      if (/\d/.test(weight)) title.append(el('small','',weight));
      const time = el('time','',dateLabel(date));
      time.dateTime = date;
      card.append(codeChip(code), title, time);
      due.append(card);
    }
    if (!upcoming.length) due.append(el('li','hint',t('这批日程没有即将到期的考核。','This cohort schedule has no upcoming assessments.')));
  }

  const query = el('input');
  query.type = 'search';
  query.placeholder = t('例如：积分、Physics、Monash','For example: calculus, Physics, Monash');
  const courseFilter = el('select');
  const typeFilter = el('select');
  courseFilter.append(option('',t('全部科目','All subjects')), ...courses.map(([code]) => option(code, courseLabel(code))));
  typeFilter.append(option('',t('全部类型','All types')), ...Object.entries(categories).map(([key, name]) => option(key,name)));
  const searchLabel = label(t('搜索资料','Search resources'), query);
  searchLabel.classList.add('grow');
  byId('resource-filters').append(searchLabel, label(t('科目','Subject'), courseFilter), label(t('类型','Type'), typeFilter));

  const examPaths = {
    MAM:'mathematics-methods', HBY:'human-biology', PHY:'physics',
    ELD:'english-as-an-additional-languagedialect', CSC:'computer-science',
  };
  const exams = 'https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/';
  function renderSubjectLinks() {
    const box = byId('subject-links');
    const code = courseFilter.value;
    box.replaceChildren();
    box.hidden = !code;
    if (!code) return;
    const subject = courseLabel(code);
    const paper = link(t(subject + ' · SCSA 真题与评分指南', subject + ' · SCSA exams and marking keys'), exams + examPaths[code] + '-past-atar-course-exams', 'button');
    paper.target = '_blank';
    paper.rel = 'noopener noreferrer';
    box.append(
      link(t(subject + ' · 考核范围与权重', subject + ' · Scope and weights'), href('subjects', '', new URLSearchParams({anchor: code})), 'button'),
      link(t(subject + ' · 考试日程', subject + ' · Assessment dates'), href('timetable', '', new URLSearchParams({subject: code, anchor: 'assessments'})), 'button'),
      paper,
    );
  }

  function renderResources() {
    renderSubjectLinks();
    const words = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const grid = byId('resource-grid');
    grid.replaceChildren();
    for (const [code, type, titleZh, titleEn, descZh, descEn, notesZh, notesEn, ...urls] of resources) {
      if (courseFilter.value && code !== courseFilter.value && !(code === 'all' && (typeFilter.value || words.length))) continue;
      if (typeFilter.value && type !== typeFilter.value) continue;
      const searchable = [code, titleZh, titleEn, descZh, descEn, ...notesZh, ...notesEn, categories[type]].join(' ').toLowerCase();
      if (!words.every(word => searchable.includes(word))) continue;
      const item = el('article', 'panel resource');
      item.append(el('span','tag',(code === 'all' ? '' : code + ' · ') + categories[type]),
        el('h2','',t(titleZh,titleEn)), el('p','',t(descZh,descEn)));
      const notes = t(notesZh, notesEn);
      if (notes.length) {
        const more = el('details');
        const list = el('ul');
        for (const note of notes) list.append(el('li','',note));
        more.append(el('summary','',t('查看要点','View notes')), list);
        item.append(more);
      }
      for (const url of urls) {
        const source = link(t('打开', 'Open ') + (urls.length === 1 ? t(titleZh,titleEn) : new URL(url).hostname.replace(/^www\./,'')), url);
        source.target = '_blank';
        source.rel = 'noopener noreferrer';
        item.append(source);
      }
      grid.append(item);
    }
    byId('resource-status').textContent = grid.childElementCount
      ? t(grid.childElementCount + ' 项资料', grid.childElementCount + ' resources')
      : t('没有匹配的资料。试试其他关键词或清除筛选。','No matching resources. Try another search or clear a filter.');
  }

  query.addEventListener('input', renderResources);
  typeFilter.addEventListener('change', renderResources);
  courseFilter.addEventListener('change', () => {
    const hash = href('resources', courseFilter.value);
    if (location.hash === hash) renderResources();
    else location.hash = hash;
  });

  buildHome();
  return ({page, argument}) => {
    byId('view-home').hidden = page !== 'home';
    byId('view-resources').hidden = page !== 'resources';
    if (page !== 'resources') return;
    courseFilter.value = courses.some(([code]) => code === argument) ? argument : '';
    renderResources();
  };
}
