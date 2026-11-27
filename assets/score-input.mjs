import {courses} from './catalog.mjs';
import {additionalSubjects} from './subject-guide.mjs';

const labels = new Map([...courses,...additionalSubjects].map(([code,zh,en])=>['AT'+code,[zh,en]]));
labels.set('ATEALD',['英语 EAL/D','English EAL/D']);

export function makeScoreRows({list,lang,subjects,change}) {
  const en = lang === 'en';
  const t = (english,chinese) => en ? english : chinese;
  const fields = [];
  function add(row={}) {
    const line = document.createElement('div');
    line.className = 'score-row';
    const select = document.createElement('select');
    select.setAttribute('aria-label',t('Subject','科目'));
    select.append(new Option(t('Select subject','选择科目'),''));
    for (const code of subjects) select.append(new Option(labels.get(code)?.[Number(en)] ?? code,code));
    select.value = subjects.includes(row?.subject) ? row.subject : '';
    const mark = document.createElement('input');
    Object.assign(mark,{type:'number',min:'0',max:'100',step:'any',inputMode:'decimal',placeholder:'0–100'});
    mark.setAttribute('aria-label',t('Mark (%)','成绩 (%)'));
    mark.value = Number.isFinite(row?.mark) && row.mark>=0 && row.mark<=100 ? row.mark : '';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label',t('Remove subject','移除科目'));
    const counted = document.createElement('span');
    counted.className = 'score-counted';
    const field = {select,mark,counted};
    fields.push(field);
    select.addEventListener('change',change);
    mark.addEventListener('input',change);
    remove.addEventListener('click',() => {fields.splice(fields.indexOf(field),1);line.remove();change();});
    line.append(select,mark,remove,counted);
    list.append(line);
    return select;
  }
  function read() {
    const seen = new Set();
    let error = '';
    const rows = fields.map(({select,mark}) => {
      const value = mark.valueAsNumber;
      const selected = select.value;
      const invalidMark = mark.validity.badInput || (mark.value !== '' && (!Number.isFinite(value) || value < 0 || value > 100));
      const duplicate = Boolean(selected && seen.has(selected));
      const missing = Boolean(!selected && mark.value !== '');
      select.setAttribute('aria-invalid',String(duplicate || missing));
      mark.setAttribute('aria-invalid',String(invalidMark));
      if (selected) seen.add(selected);
      if (!error && (duplicate || missing || invalidMark)) error = duplicate
        ? t('Use each subject only once.','每门科目只能填写一次。')
        : missing ? t('Choose a subject for each mark.','请为已填的成绩选择科目。')
          : t('Enter marks from 0 to 100.','请输入 0 至 100 的成绩。');
      return {subject:selected,mark:Number.isFinite(value) ? value : null};
    });
    return {rows,error};
  }
  function fill(rows, minimum) {
    fields.length=0;
    list.replaceChildren();
    for (let i=0;i<Math.min(subjects.length,Math.max(minimum,rows.length));i++) add(rows[i]);
  }
  function setCounted(rows) {
    const ids = new Set(rows.map(row=>row.subject));
    const complete = rows.length === 4;
    for (const {select,mark,counted} of fields) {
      counted.textContent = complete && ids.has(select.value) && mark.value !== '' ? t('Counted in best four','计入最高四科') : '';
    }
  }
  return {add,read,fill,setCounted};
}
