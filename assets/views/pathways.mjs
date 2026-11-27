import {checkedOn, pathways} from '../admission-data.mjs';

export default {
  en: '<div class="note-head"><h1>Where a WACE ATAR can take you</h1><p>Compare published course scores and country-specific application benchmarks. Check whether each institution accepts your offshore WACE documentation for your intake.</p></div><div id="pathway-filters" class="filters"></div><p id="pathway-status" role="status"></p><div id="pathway-results" class="cards-grid"></div>',
  zh: '<div class="note-head"><h1>用 WACE ATAR 申请哪些院校</h1><p>比较院校公布的专业分数和不同地区的申请门槛。请按入学批次确认院校是否接受你的海外 WACE 证件。</p></div><div id="pathway-filters" class="filters"></div><p id="pathway-status" role="status"></p><div id="pathway-results" class="cards-grid"></div>',
};

export function mount({root, lang}) {
  const en = lang === 'en';
  const t = (english, chinese) => en ? english : chinese;
  const names = new Map([['Australia','澳大利亚'],['Malaysia','马来西亚'],['Singapore','新加坡'],['Hong Kong SAR','中国香港'],['United Kingdom','英国'],['New Zealand','新西兰'],['Ireland','爱尔兰']]);
  const field = (label, input) => {
    const node = document.createElement('label');
    node.className = 'field';
    node.append(label, input);
    return node;
  };
  const countries = [...new Set(pathways.map(x => x.country))].sort();
  const country = document.createElement('select');
  country.append(new Option(t('All destinations','所有地区'), ''), ...countries.map(value => new Option(t(value,names.get(value) ?? value),value)));
  const search = document.createElement('input');
  search.type = 'search';
  const rank = document.createElement('input');
  rank.type = 'number';
  rank.min = '0';
  rank.max = '99.95';
  rank.step = '0.05';
  const results = root.querySelector('#pathway-results');
  const status = root.querySelector('#pathway-status');
  root.querySelector('#pathway-filters').append(field(t('Destination','留学地区'),country), field(t('Course or institution','专业或院校'),search), field(t('Maximum published ATAR','最高门槛 ATAR'),rank));
  function render() {
    const max = rank.valueAsNumber;
    if (rank.value && (!Number.isFinite(max) || max < 0 || max > 99.95)) {
      status.textContent = t('Enter an ATAR between 0 and 99.95.', '请输入 0 至 99.95 的 ATAR。');
      results.replaceChildren();
      return;
    }
    const phrase = search.value.trim().toLowerCase();
    const rows = pathways.filter(row => (!country.value || row.country === country.value) &&
      (!Number.isFinite(max) || row.atar <= max) && [row.course,row.university,row.country,names.get(row.country)].join(' ').toLowerCase().includes(phrase));
    status.textContent = t(`${rows.length} records · checked ${checkedOn}`, `${rows.length} 条记录 · 核对于 ${checkedOn}`);
    results.replaceChildren(...rows.map(row => {
      const card = document.createElement('article');
      card.className = 'panel resource';
      const title = document.createElement('h2');
      title.textContent = row.course;
      const place = document.createElement('p');
      place.textContent = row.university + ' · ' + t(row.country,names.get(row.country) ?? row.country);
      const score = document.createElement('strong');
      score.className = 'tag';
      score.textContent = 'ATAR ' + row.atar + ' · ' + (row.kind === 'program' ? t('Course threshold','专业门槛') : t('Qualification benchmark','学历申请参考'));
      const detail = document.createElement('p');
      detail.textContent = t(row.req,row.reqZh);
      const link = document.createElement('a');
      link.href = row.url;
      link.textContent = t('Check the university source','查看院校出处');
      card.append(title,place,score,detail,link);
      return card;
    }));
  }
  country.addEventListener('change',render);
  search.addEventListener('input',render);
  rank.addEventListener('input',render);
  render();
}
