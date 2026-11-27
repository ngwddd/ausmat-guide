const monash = 'https://www.monash.edu.my/study/undergraduate/';
const computing = monash + 'information-technology/';
const math = ['Check the course’s higher-level mathematics and English requirements.', '请核对高等数学先修和英语要求。'];
const english = ['Check English and any subject prerequisites on the course page.', '请核对课程的英语和科目先修要求。'];
const engineering = ['Check Year 12 mathematics, Chemistry or Physics, and English requirements.', '请核对高三数学、化学或物理先修，以及英语要求。'];
const sunway = 'https://sunwayuniversity.edu.my/faculty-of-engineering-and-technology/courses/';
const auckland2026 = 'https://www.auckland.ac.nz/assets/study/applications-and-admissions/entry-requirements/undergraduate-entry-requirements/overseas-secondary-school-applicants/2026%20Undergraduate-programme-specific-entry-requirements-A-I.pdf';
const oxford = 'https://www.ox.ac.uk/admissions/undergraduate/courses/admissions-requirements/international-qualifications';
const oxfordConditions = ['Use the A-level offer specified by the course. The Australian table lists Western Australian subject grades. Confirm offshore WACE documentation.', '按专业的 A-level 录取要求换算。澳洲学历表列有西澳对应科目等级，请确认海外 WACE 证件。'];

// Benchmarks describe a qualification route or an A-level equivalence.
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
  ['Singapore', 'National University of Singapore', 'Australian High School Qualifications', 90, 'https://nus.edu.sg/oam/admissions/international-qualifications-for-foreigners/international-qualifications/australian-high-school', ['WACE is listed. Apply with final results, ATAR and scaled scores. Check course and English requirements.', '官方明列 WACE。申请需提交正式成绩、ATAR 和换算分数。请核对专业和英语要求。']],
  ['Singapore', 'Nanyang Technological University', 'Australia qualifications', 95, 'https://www.ntu.edu.sg/admissions/undergraduate/admissions/general-admission-requirements/international-qualifications/australia-qualifications', ['WACE is listed. This is the general application minimum with strong subject grades. Check the English rules if EAL/D appears on your transcript.', '官方明列 WACE。此为通用申请门槛，相关科目也须达到要求。若成绩单有 EAL/D，请核对英语要求。']],
  ['Hong Kong SAR', 'City University of Hong Kong', 'Australian Year 12 · first-year entry', 80, 'https://www.cityu.edu.hk/admo/admissions/international-admissions', ['General international application benchmark. Check major prerequisites, English and offshore WACE documentation.', '国际生一般申请门槛。请核对专业先修、英语和海外 WACE 证件要求。']],
  ['Australia', 'The University of Western Australia', 'Australian Year 12 · general entry', 75, 'https://www.uwa.edu.au/study/how-to-apply/pathways-and-eligibility/entry-standards', ['General minimum with the relevant state certificate. Select your course for its own minimum and prerequisites.', '须具备对应州的毕业证书。此为通用下限，另查具体专业门槛与先修。']],
  ['United Kingdom', 'University of Oxford', 'A-level AAA equivalence', 98, oxford, oxfordConditions],
  ['United Kingdom', 'University of Oxford', 'A-level A*AA equivalence', 98.5, oxford, oxfordConditions],
  ['United Kingdom', 'University of Oxford', 'A-level A*A*A equivalence', 99, oxford, oxfordConditions],
  ['New Zealand', 'University of Canterbury', 'Australian Year 12 · 2026 prospectus', 74, 'https://www.canterbury.ac.nz/content/dam/uoc-main-site/documents/pdfs/c-brochures/international-students/international-prospectus-uc.pdf.coredownload.pdf', ['General undergraduate benchmark with a Year 12 certificate. Check programme and target-year requirements.', '持澳洲高三证书的本科通用参考门槛。请核对具体专业和目标入学年份。']],
  ['New Zealand', 'University of Otago', 'Australian Year 12', 69.6, 'https://www.otago.ac.nz/study/entry-requirements/international-entrance-requirements', ['General university entrance with successful completion of Australian Year 12. Some programmes impose further entry conditions.', '澳洲高三毕业生的大学通用入学门槛。部分专业另有要求。']],
  ['Ireland', 'Trinity College Dublin', 'Australian ATAR · published range 90–99', 90, 'https://www.tcd.ie/study/country/australia/', ['90 is the lower end of the published range. The university’s non-EU admission guide lists WACE subject equivalences. Check your course and confirm offshore eligibility.', '90 是官网公布区间的下限。该校非欧盟本科指南列出 WACE 科目换算。请核对目标专业并确认海外证件适用性。']],
  ['Singapore', 'Singapore Management University', 'Australian High School Qualifications', 90, 'https://admissions.smu.edu.sg/admissions-requirements/international-and-other-qualifications', ['Application minimum. SMU lists WACE and requires final ATAR and scaled marks by the application deadline.', '最低申请门槛。SMU 明列 WACE，要求在申请截止前取得正式 ATAR 和换算成绩。']],
  ['Hong Kong SAR', 'The University of Hong Kong', 'International qualifications: Australian ATAR', 90, 'https://admissions.hku.hk/node/2208', ['Published lower boundary. Check programme and language requirements, and confirm your overseas WACE documentation.', '公布的申请下限。请核对专业、语言要求与海外 WACE 证件。']],
  ['United Kingdom', 'The University of Manchester', 'A-level AAA equivalence', 95, 'https://www.manchester.ac.uk/study/international/country-specific-information/australia/entry-requirements/', ['Example from the official ATAR conversion table. Use the A-level requirement for your chosen course and confirm offshore WACE.', '官网换算表中的示例。请以目标课程的 A-level 要求换算，并确认海外 WACE 适用性。']],
  ['United Kingdom', 'The University of Manchester', 'A-level AAB equivalence', 93, 'https://www.manchester.ac.uk/study/international/country-specific-information/australia/entry-requirements/', ['Example from the official ATAR conversion table. Use the A-level requirement for your chosen course and confirm offshore WACE.', '官网换算表中的示例。请以目标课程的 A-level 要求换算，并确认海外 WACE 适用性。']],
  ['United Kingdom', 'The University of Manchester', 'A-level ABB equivalence', 91, 'https://www.manchester.ac.uk/study/international/country-specific-information/australia/entry-requirements/', ['Example from the official ATAR conversion table. Use the A-level requirement for your chosen course and confirm offshore WACE.', '官网换算表中的示例。请以目标课程的 A-level 要求换算，并确认海外 WACE 适用性。']],
  ['United Kingdom', 'University of Cambridge', 'Typical Australian offer range', 98.5, 'https://www.undergraduate.study.cam.ac.uk/international-students/international-entry-requirements', ['Lower end of the published typical range of 98.5–99.5. Relevant subjects must show similar performance.', '公布的常见录取条件区间为 98.5–99.5。相关科目也应达到相应水平。']],
  ['New Zealand', 'University of Auckland', 'Bachelor of Commerce · 2026 guide', 77, auckland2026, ['Published 2026 international qualification reference. Check the edition for your intended entry year.', '2026 年国际学历入学参考。请核对目标入学年份对应的指南。']],
  ['New Zealand', 'University of Auckland', 'Bachelor of Engineering (Honours) · 2026 guide', 90, auckland2026, ['2026 Australian qualification reference. Mathematics with calculus and Physics conditions apply. Check the next entry-year guide.', '2026 年澳洲学历参考。另有含微积分的数学及物理先修条件，下一批次以新版指南为准。']],
];

export const checkedOn = '2026-11-26';
const qualification = new Map([
  ['Sunway University','ausmat'], ['The University of Western Australia','wace'],
  ['Singapore Management University','wace'], ['National University of Singapore','wace'],
  ['University of Oxford','wace'], ['Trinity College Dublin','wace'],
  ['Nanyang Technological University','wace'],
]);
const credentials = university => qualification.get(university) ?? 'atar';
export const pathways = [
  ...programs.map(([country, university, , course, atar, url, [req, reqZh]]) =>
    ({country, university, course, atar, url, req, reqZh, kind:'program', qualification:credentials(university)})),
  ...benchmarks.map(([country, university, course, atar, url, [req, reqZh]]) =>
    ({country, university, course, atar, url, req, reqZh, kind:'benchmark', qualification:credentials(university)})),
];
