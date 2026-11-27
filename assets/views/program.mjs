import {additionalSubjects, electiveSubjects, studentDiscussion, studyReview, studyTutorial, sunwayBrochure, syllabus} from '../subject-guide.mjs';

function page(en) {
  const t = (english, chinese) => en ? english : chinese;
  const hash = en ? '#en/' : '#';
  const tips = [
    t('Start with the unit and assessment outline. Practise with SCSA questions from the corresponding course and use the marking guide to identify the missing step.', '先找准课程单元和考核范围，再做 SCSA 对应课程的题，用评分指南定位漏写的步骤。'),
    t('Close the notes. Recall a definition, draw a diagram or solve one problem, then check your answer and repeat on another day.', '合上笔记，回忆一个定义、画一张图或做一道题。核对后，隔一两天再测。'),
    t('Mix problem types after you can solve them separately. Explain what feature of the question tells you which method to use.', '先分别练会各题型，再混合练习。说明题干里哪个条件提示你该用哪种方法。'),
    t('One Sunway graduate reported using lecturer-provided past papers. Treat this as an example of a study routine. Ask your own teachers what is available and use official SCSA material for shared links.', '一位 Sunway 毕业生提到用老师提供的历年题复习。这是个人经验。请询问自己的老师有哪些练习可用，对外分享时优先链接 SCSA 官方资料。'),
  ];
  return `<div class="note-head"><h1>${t('AUSMAT and WACE study guide','AUSMAT 与 WACE 学习指南')}</h1><p>${t('Sunway AUSMAT is a pre-university pathway under Western Australia’s WACE. WACE is the qualification and ATAR is a rank used for undergraduate admission. Confirm the subjects and calendar for your own intake.', 'Sunway AUSMAT 是西澳 WACE 体系下的大学预科课程。WACE 是学历证书，ATAR 是本科招生采用的排名。选科和考试安排以本人批次公告为准。')}</p></div>
    <nav class="reading-links"><a href="${hash}resources">${t('Search subject resources','搜索科目资料')}</a><a href="${hash}pathways">${t('Compare ATAR admission pathways','比较 ATAR 升学路径')}</a><a href="${syllabus}">${t('SCSA syllabuses','SCSA 官方大纲')}</a></nav>
    <h2>${t('Intakes and subject choices','入学批次与选科')}</h2>
    <p>${t('Sunway’s 2026 brochure lists January, May and September options for these AT subjects. The site’s dated assessment calendar is the May 2026 cohort record.', 'Sunway 2026 简章为下列 AT 科目列出 1 月、5 月和 9 月批次。本站带日期的考核表是 2026 年 5 月批次记录。')}</p>
    <p><a href="${sunwayBrochure}">${t('Sunway brochure and elective availability','Sunway 简章与选修开课表')}</a></p>
    <ul class="cards"><li><a href="${hash}subjects">${t('Mathematics Methods, Physics, Human Biology, English EAL/D and Computer Science','数学方法、物理、人体生物学、英语 EAL/D 和计算机科学')}</a></li>
    ${additionalSubjects.map(([code,zh,english,topicZh,topicEn,taskEn,taskZh]) => `<li><a href="${hash}resources/${code}"><strong class="t">${t(english,zh)}</strong><span class="d">${t(topicEn,topicZh)} · ${t(taskEn,taskZh)}</span></a></li>`).join('')}</ul>
    <h2>${t('Professional electives','专业选修')}</h2><ul>${electiveSubjects.map(([english,zh,availabilityEn,availabilityZh]) => `<li><strong>${t(english,zh)}</strong> · ${t(availabilityEn,availabilityZh)}</li>`).join('')}</ul>
    <h2>${t('How to study','学习方法')}</h2><ol>${tips.map(tip => `<li>${tip}</li>`).join('')}</ol>
    <nav class="reading-links"><a href="${studyReview}">${t('Review of spacing and retrieval practice','间隔学习与检索练习综述')}</a><a href="${studyTutorial}">${t('Research-backed classroom strategies','学习策略研究教程')}</a><a href="${studentDiscussion}">${t('Student discussion','学生经验原帖')}</a></nav>`;
}

export default {en: page(true), zh: page(false)};
