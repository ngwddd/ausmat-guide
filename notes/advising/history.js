/* Prior-cohort outcomes from the source workbook, published as a reference.
 *
 * WHAT IS HERE: ATARs and subject marks of students who already finished,
 * used so a current student can see where an estimate sits among real
 * outcomes. The workbook's sheet holds no names, ids or schools and none
 * were added here.
 *
 * WHAT THIS IS NOT: a lookup table. An ATAR is a rank within a cohort, so
 * these figures describe those students in those years, not you in yours.
 */
window.HISTORY = {
  "source": "source workbook, sheet 'Historical data'",
  "count": 321,
  "atarMin": 21.6,
  "atarMax": 99.65,
  "atarMean": 70.95,
  "bands": [
    {
      "label": "top 10%",
      "labelZh": "前 10%",
      "atar": 95.05
    },
    {
      "label": "top 25%",
      "labelZh": "前 25%",
      "atar": 88.55
    },
    {
      "label": "middle",
      "labelZh": "中间",
      "atar": 72.9
    },
    {
      "label": "bottom 25%",
      "labelZh": "后 25%",
      "atar": 57.05
    },
    {
      "label": "bottom 10%",
      "labelZh": "后 10%",
      "atar": 42.8
    }
  ],
  "examples": [],
  "examplesOmitted": "the sheet has no student-boundary column, so individual rows cannot be reconstructed reliably; only the distribution is shown",
  "snapshotNote": "Recorded outcomes of a prior cohort, pasted into the source workbook rather than computed there. Their ATAR column is not a function of their marks: an ATAR is a rank within a cohort.",
  "cohortCaveat": {
    "en": "These are the students the workbook happens to record: 321 of them, spanning ATAR 21.6 to 99.65. That span is wide enough to be worth reading, but it is one institution's records and not the population. There is also a known defect in the source: the sheet has no column marking where one student's rows end and the next begins, so the distribution below is sound while individual rows are not reconstructable. That is why no example students are listed.",
    "zh": "这些是工作簿恰好记录下来的学生：共 321 人，ATAR 从 21.6 到 99.65。这个跨度够宽，值得一看；但它只是一所院校的记录，不是全体考生。源表另有一个已知缺陷：没有任何一列标记某位学生的行到哪里结束，所以下面的分布是可信的，而单独某一行无法可靠还原——这也是这里不列往届样例的原因。"
  }
}
