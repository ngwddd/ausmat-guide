const monash = 'https://www.monash.edu.my/study/undergraduate/';
const computing = monash + 'information-technology/';
const math = ['Check the course’s higher-level mathematics and English requirements.', '请核对高等数学先修和英语要求。'];
const english = ['Check English and any subject prerequisites on the course page.', '请核对课程的英语和科目先修要求。'];
const engineering = ['Check Year 12 mathematics, Chemistry or Physics, and English requirements.', '请核对高三数学、化学或物理先修，以及英语要求。'];
const sunway = 'https://sunwayuniversity.edu.my/faculty-of-engineering-and-technology/courses/';
const auckland2026 = 'https://www.auckland.ac.nz/assets/study/applications-and-admissions/entry-requirements/undergraduate-entry-requirements/overseas-secondary-school-applicants/2026%20Undergraduate-programme-specific-entry-requirements-A-I.pdf';

// Benchmarks apply to the qualification route. Only program scores feed advising comparisons.
const programs = [
  ['Malaysia', 'Monash University Malaysia', 'Information tech', 'Computer Science', 80, computing + 'bachelor-computer-science', math],
  ['Malaysia', 'Monash University Malaysia', 'Information tech', 'Computer Science in Artificial Intelligence', 80, computing + 'bachelor-of-computer-science-in-artificial-intelligence', math],
  ['Malaysia', 'Monash University Malaysia', 'Information tech', 'Computer Science in Data Science', 80, computing + 'bachelor-of-computer-science-in-data-science', math],
  ['Malaysia', 'Monash University Malaysia', 'Engineering', 'Software Engineering (Honours)', 85, monash + 'engineering/bachelor-of-software-engineering-honours', engineering],
  ['Malaysia', 'Monash University Malaysia', 'Sciences', 'Bachelor of Science', 80, monash + 'science/bachelor-science/entry-score', english],
  ['Malaysia', 'Monash University Malaysia', 'Sciences', 'Applied Data Science', 80, monash + 'science/bachelor-of-applied-data-science/entry-requirements', english],
  ['Malaysia', 'Monash University Malaysia', 'Business', 'Digital Business', 75, monash + 'business/bachelor-of-digital-business/bachelor-of-digital-business-entry-requirements', english],
  ['Australia', 'Deakin University', 'Information tech', 'Computer Science', 50, 'https://www.deakin.edu.au/course/bachelor-computer-science-international', ['Unadjusted Year 12 minimum for consideration. English prerequisites apply. Ask about WACE equivalence.', '高三申请审理的未调整 ATAR 下限。另有英语先修，请核实 WACE 等值条件。']],
  ['Australia', 'Deakin University', 'Information tech', 'Computer Science (Honours)', 50, 'https://www.deakin.edu.au/course/bachelor-computer-science-honours-international', ['Unadjusted Year 12 minimum for consideration. English prerequisites apply. Ask about WACE equivalence.', '高三申请审理的未调整 ATAR 下限。另有英语先修，请核实 WACE 等值条件。']],
  ['Malaysia', 'Sunway University', 'Information tech', 'Computer Science (Honours)', 60, sunway + 'bachelor-of-science-honours-computer-science', ['Australian Matriculation score. Check Additional Mathematics or an accepted equivalent and the programme’s English conditions.', '澳洲预科对应分数。请查阅附加数学或等值先修，以及该专业的英语条件。']],
  ['Malaysia', 'Sunway University', 'Information tech', 'Information Technology (Honours)', 60, sunway + 'bachelor-of-science-honours-information-technology', english],
  ['Malaysia', 'Sunway University', 'Information tech', 'Information Systems (Data Analytics)', 60, sunway + 'bachelor-of-information-systems-honours-data', english],
];

const benchmarks = [
  ['Singapore', 'Singapore Management University', 'Australian High School Qualifications', 90, 'https://admissions.smu.edu.sg/admissions-requirements/international-and-other-qualifications', ['Application minimum. SMU lists WACE and requires final ATAR and scaled marks by the application deadline.', '最低申请门槛。SMU 明列 WACE，要求在申请截止前取得正式 ATAR 和换算成绩。']],
  ['Hong Kong SAR', 'The University of Hong Kong', 'International qualifications: Australian ATAR', 90, 'https://admissions.hku.hk/node/2208', ['Published lower boundary. Check programme and language requirements, and confirm your overseas WACE documentation.', '公布的申请下限。请核对专业、语言要求与海外 WACE 证件。']],
  ['United Kingdom', 'The University of Manchester', 'A-level AAA equivalence', 95, 'https://www.manchester.ac.uk/study/international/country-specific-information/australia/entry-requirements/', ['Example from the official ATAR conversion table. Use the A-level requirement for your chosen course and confirm offshore WACE.', '官网换算表中的示例。请以目标课程的 A-level 要求换算，并确认海外 WACE 适用性。']],
  ['United Kingdom', 'The University of Manchester', 'A-level AAB equivalence', 93, 'https://www.manchester.ac.uk/study/international/country-specific-information/australia/entry-requirements/', ['Example from the official ATAR conversion table. Use the A-level requirement for your chosen course and confirm offshore WACE.', '官网换算表中的示例。请以目标课程的 A-level 要求换算，并确认海外 WACE 适用性。']],
  ['United Kingdom', 'The University of Manchester', 'A-level ABB equivalence', 91, 'https://www.manchester.ac.uk/study/international/country-specific-information/australia/entry-requirements/', ['Example from the official ATAR conversion table. Use the A-level requirement for your chosen course and confirm offshore WACE.', '官网换算表中的示例。请以目标课程的 A-level 要求换算，并确认海外 WACE 适用性。']],
  ['United Kingdom', 'University of Cambridge', 'Typical Australian offer range', 98.5, 'https://www.undergraduate.study.cam.ac.uk/international-students/international-entry-requirements', ['Lower end of the published typical range of 98.5–99.5. Relevant subjects must show similar performance.', '公布的常见录取条件区间为 98.5–99.5。相关科目也应达到相应水平。']],
  ['New Zealand', 'University of Auckland', 'Bachelor of Commerce · 2026 guide', 77, auckland2026, ['Published 2026 international qualification reference. Check the edition for your intended entry year.', '2026 年国际学历入学参考。请核对目标入学年份对应的指南。']],
  ['New Zealand', 'University of Auckland', 'Bachelor of Engineering (Honours) · 2026 guide', 90, auckland2026, ['2026 Australian qualification reference. Mathematics with calculus and Physics conditions apply. Check the next entry-year guide.', '2026 年澳洲学历参考。另有含微积分的数学及物理先修条件，下一批次以新版指南为准。']],
];

export const checkedOn = '2026-11-25';
export const programRows = programs.map(([country, university, category, course, atar, url, [req, reqZh]]) =>
  ({country, university, category, course, atar, url, req, reqZh, needs: {}, link: 'ok', kind: 'program'}));
export const pathways = [...programRows, ...benchmarks.map(([country, university, course, atar, url, [req, reqZh]]) =>
  ({country, university, course, atar, url, req, reqZh, kind: 'benchmark'}))];
