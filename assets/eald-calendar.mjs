// May 2026 cohort. Each row contains a date, task number, weight and external-exam flag.
const dates = [
  [
    "2026-07-08",
    "1",
    "10%",
    false
  ],
  [
    "2026-08-07",
    "2A",
    "5%",
    false
  ],
  [
    "2026-09-18",
    "3",
    "10%",
    false
  ],
  [
    "2026-11-20",
    "4",
    "7%",
    false
  ],
  [
    "2026-11-20",
    "5",
    "8%",
    false
  ],
  [
    "2026-12-09",
    "6",
    "10%",
    false
  ],
  [
    "2027-01-08",
    "7",
    "10%",
    false
  ],
  [
    "2027-01-08",
    "2B",
    "10%",
    false
  ],
  [
    "2027-02-12",
    "8",
    "30%",
    true
  ]
];

export function ealdCalendar(lang) {
  return dates.map(([date, task, weight, external]) => {
    const title = lang === 'en' ? 'Task ' + task : '任务 ' + task;
    const type = external ? (lang === 'en' ? 'External exam' : '校外考试') : (lang === 'en' ? 'School assessment' : '校内考核');
    return {
      date, subject:'EALD', title, weight,
      row: `<tr data-due="${date}" data-subject="EALD"><td>EAL/D</td><td>${title}</td><td>${type}</td><td>${weight}</td><td>${date}<span class="due"></span></td></tr>`,
    };
  });
}
