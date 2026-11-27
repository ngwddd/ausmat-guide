// Public-safe summary of a May 2026 cohort notice. One task, two sessions.
export const physicsLab = {
  partA: '2026-11-27',
  partB: '2026-12-09',
  weight: '10%',
  en: {
    a: 'Task 4A · Physics lab and data collection',
    b: 'Task 4B · Physics written assessment',
    aNote: 'Experiment and data collection. Prepare the results table and check the programme notice for session logistics. The 10% covers both parts.',
    bNote: 'Written assessment. Bring the completed lab report and results table as instructed. Task 4A and 4B together carry 10%.',
  },
  zh: {
    a: '任务 4A · 物理实验与数据采集',
    b: '任务 4B · 物理笔试',
    aNote: '当天做实验、采集数据。准备实验结果表，具体安排以校方通知为准。两部分合计 10%。',
    bNote: '笔试。按通知携带已完成的实验报告与结果表。任务 4A 和 4B 合计 10%。',
  },
};

export function applyAssessmentUpdates(rows, lang) {
  const {partA, partB, weight} = physicsLab;
  const label = physicsLab[lang];
  const old = rows.find(row => row.subject === 'PHY' && row.date === partB && row.title === 'Task 4');
  if (!old || old.weight !== weight) throw new Error('The Physics Lab Assessment source row changed.');
  const makeRow = (date, title, score, note, type) => ({
    date,
    subject: 'PHY',
    title,
    weight: score,
    row: `<tr data-due="${date}"><td>PHY</td><td>${title}</td><td>${type}</td><td>${score}</td><td>${date}<br><small>${note}</small><span class="due"></span></td></tr>`,
  });
  return rows.filter(row => row !== old).concat([
    makeRow(partA, label.a, '—', label.aNote, lang === 'en' ? 'Practical' : '实验'),
    makeRow(partB, label.b, weight, label.bNote, lang === 'en' ? 'Written' : '笔试'),
  ]).sort((a,b) => a.date.localeCompare(b.date));
}
