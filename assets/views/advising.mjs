import {R} from '../atar-config.mjs';
import {createAtarCalculator} from '../atar.mjs';
import {makeScoreRows} from '../score-input.mjs';

const tisc = 'https://www.tisc.edu.au/static/guide/atar-about.tisc';
const example = [['ATMAM',78],['ATCSC',84],['ATHBY',76],['ATPHY',70]];
let draft;

function page(en) {
  const t = (english, chinese) => en ? english : chinese;
  const link = en ? '#en/pathways' : '#pathways';
  return `<div class="note-head"><h1>${t('ATAR calculator','ATAR 计算器')}</h1><p>${t('Enter four or more subject marks. The estimate updates as you type.', '填入四门或以上的科目成绩，结果会自动更新。')}</p></div>
  <div class="score-layout">
    <section class="panel"><h2>${t('Subjects and marks','科目与成绩')}</h2><form id="score-form" novalidate>
      <div id="score-rows"></div>
      <div class="reading-links"><button class="button" id="add-score" type="button">${t('Add subject','增加科目')}</button><button class="button" id="score-example" type="button">${t('Try example','载入示例')}</button><button class="button" id="score-clear" type="button">${t('Clear','清空')}</button></div>
      <label class="field">${t('Target ATAR (optional)','目标 ATAR（选填）')}<input id="score-target" type="number" min="0" max="99.95" step="any" inputmode="decimal" placeholder="80"></label>
      <label class="score-save"><input type="checkbox" id="remember-scores"> ${t('Remember scores on this device','在此设备保存成绩')}</label>
      <button type="button" class="button" id="load-scores" hidden>${t('Restore saved scores','读取已保存的成绩')}</button>
      <p id="score-storage" class="hint" role="status"></p>
    </form></section>
    <section class="panel"><h2>${t('Your estimate','估算结果')}</h2>
      <p id="score-result" role="status" aria-live="polite"></p>
      <dl id="score-details" class="score-details"></dl>
      <p class="hint">${t('This estimate uses the site’s calibrated model and the best four marks you enter. TISC uses scaled scores and applies its own eligibility and aggregation rules.', '本站按你输入的最高四科和既有校准模型估算。TISC 正式排名使用换算成绩和官方资格、计分规则。')}</p>
      <div class="reading-links"><a href="${tisc}">${t('TISC official ATAR rules','TISC 官方 ATAR 规则')}</a><a href="${link}">${t('Find courses in Global admissions','去国际升学库查专业')}</a></div>
    </section>
  </div>`;
}
export default {en:page(true),zh:page(false)};

export function mount({root, lang}) {
  const en = lang === 'en';
  const t = (english, chinese) => en ? english : chinese;
  const el = id => root.querySelector('#' + id);
  const target = el('score-target');
  const result = el('score-result');
  const details = el('score-details');
  const remember = el('remember-scores');
  const restore = el('load-scores');
  const storageKey = 'ausmat-scores-v1';
  const calc = createAtarCalculator(R, () => true);
  const needed = R.calibration.aggregateSize;
  const form = makeScoreRows({list:el('score-rows'), lang, subjects:R.vocabularies.subjects, change:update});
  const format = (n, digits=1) => n.toFixed(digits);

  function append(label, value) {
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = value;
    details.append(dt,dd);
  }
  function update() {
    const {rows, error} = form.read();
    const goal = target.valueAsNumber;
    const marks = rows.filter(row => row.subject && Number.isFinite(row.mark));
    const ranked = [...marks].sort((a,b) => b.mark-a.mark);
    let aggregate = null;
    form.setCounted(error ? [] : ranked.slice(0,needed));
    details.replaceChildren();
    const badTarget = Boolean(target.value && (!Number.isFinite(goal) || goal < 0 || goal > 99.95) || target.validity.badInput);
    draft = {subjects:rows, targetAtar:badTarget ? null : goal, remember:remember.checked};
    target.setAttribute('aria-invalid', String(badTarget));
    if (error) result.textContent = error;
    else if (marks.length < needed) result.textContent = t(`Add ${needed-marks.length} more subject marks to calculate.`, `还需填写 ${needed-marks.length} 门科目的成绩。`);
    else {
      const estimate = calc.atarPicture({subjects:marks, targetAtar:null});
      aggregate = estimate.aggregate;
      result.textContent = estimate.status === 'ok'
        ? t('Estimated ATAR ', '估算 ATAR ') + format(estimate.atar,R.calibration.display.atar)
        : t('The best-four total is outside the calibrated range.', '最高四科合计超出模型校准区间。');
      if (Number.isFinite(estimate.aggregate)) append(t('Best-four total','最高四科合计'),format(estimate.aggregate,2));
      if (marks.length > needed) append(t('Other subject marks','其余科目成绩'),ranked.slice(needed).map(row => row.subject).join(', '));
    }
    if (badTarget) append(t('Target','目标'), t('Enter a value from 0 to 99.95.','请输入 0 至 99.95。'));
    else if (Number.isFinite(goal)) {
      const required = calc.atarToAggregate(goal);
      if (required === null) append(t('Target','目标'),t('Outside the calibrated ATAR range.','目标超出模型校准区间。'));
      else {
        append(t('Target best-four total','目标四科合计'),format(required,2));
        append(t('Average across four subjects','四科平均目标'),format(required/needed) + '%');
        if (aggregate !== null) {
          const gap = required - aggregate;
          append(t('Points short of target total','距目标四科合计还差'),gap > 0 ? format(Math.ceil(gap*100)/100,2) : t('Target reached','已达到'));
        }
        if (!error && marks.length === needed-1) {
          const gap = required - marks.reduce((sum,row) => sum+row.mark,0);
          append(t('Mark needed in the fourth subject','第四科还需'),
            gap > 100 ? t('Above 100%', '高于 100%') : format(Math.max(0,Math.ceil(gap*10)/10)) + '%');
        }
      }
    }
    el('add-score').disabled = rows.length >= R.vocabularies.subjects.length;
    if (remember.checked) save(rows, goal);
  }
  function save(rows, goal) {
    try {
      localStorage.setItem(storageKey,JSON.stringify({subjects: rows, targetAtar: Number.isFinite(goal) ? goal : null}));
      el('score-storage').textContent = '';
    } catch {el('score-storage').textContent = t('This browser could not save the scores.','浏览器无法保存成绩。');}
  }
  function readSaved() {
    try {
      for (const key of [storageKey,'advising-workbook-record-v3','advising-workbook-record-v2-'+lang,'advising-workbook-record-v2-'+(en?'zh':'en')]) {
        try {
          const record = JSON.parse(localStorage.getItem(key) || 'null');
          if (Array.isArray(record?.subjects) && record.subjects.length) return record;
        } catch {}
      }
    } catch {}
    return null;
  }
  function fill(rows=[], goal=null) {
    form.fill(rows,needed);
    target.value = Number.isFinite(goal) && goal >= 0 && goal <= 99.95 ? goal : '';
    update();
  }
  el('score-form').addEventListener('submit',event => event.preventDefault());
  target.addEventListener('input',update);
  el('add-score').addEventListener('click',() => {form.add().focus(); update();});
  el('score-example').addEventListener('click',() => fill(example.map(([subject,mark])=>({subject,mark})),80));
  el('score-clear').addEventListener('click',() => fill());
  remember.addEventListener('change',() => {
    if (remember.checked) update();
    else try { localStorage.removeItem(storageKey); } catch {}
  });
  restore.hidden = !readSaved();
  restore.addEventListener('click',() => {
    const saved = readSaved();
    if (saved) fill(saved.subjects,saved.targetAtar);
  });
  remember.checked = draft?.remember ?? false;
  fill(draft?.subjects, draft?.targetAtar);
}
