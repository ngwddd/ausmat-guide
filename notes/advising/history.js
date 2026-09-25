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
  "count": 61,
  "atarMin": 90.95,
  "atarMax": 99.65,
  "atarMean": 95.24,
  "bands": [
    {
      "label": "top 10%",
      "labelZh": "前 10%",
      "atar": 98.65
    },
    {
      "label": "top 25%",
      "labelZh": "前 25%",
      "atar": 97.35
    },
    {
      "label": "middle",
      "labelZh": "中间",
      "atar": 95.45
    },
    {
      "label": "bottom 25%",
      "labelZh": "后 25%",
      "atar": 92.8
    },
    {
      "label": "bottom 10%",
      "labelZh": "后 10%",
      "atar": 91.45
    }
  ],
  "examples": [
    {
      "atar": 99.4,
      "top4": 352.7,
      "marks": [
        84.0,
        74.5,
        91.0,
        87.0,
        90.7
      ],
      "codes": [
        "CHE",
        "ELD",
        "HBY",
        "MAM",
        "PHY"
      ]
    },
    {
      "atar": 98.25,
      "top4": 313.2,
      "marks": [
        74.0,
        57.4,
        86.1,
        79.9,
        73.2
      ],
      "codes": [
        "ACF",
        "ELD",
        "MAM",
        "MAS",
        "PHY"
      ]
    },
    {
      "atar": 97.15,
      "top4": 307.7,
      "marks": [
        77.9,
        82.6,
        74.1,
        73.1
      ],
      "codes": [
        "BME",
        "ELD",
        "MAM",
        "PHY"
      ]
    },
    {
      "atar": 95.45,
      "top4": 293.0,
      "marks": [
        66.8,
        75.5,
        75.0,
        75.7,
        65.4
      ],
      "codes": [
        "ACF",
        "BME",
        "ECO",
        "ELD",
        "MAM"
      ]
    },
    {
      "atar": 93.4,
      "top4": 288.6,
      "marks": [
        70.8,
        74.9,
        72.0,
        66.7,
        70.9,
        70.1,
        65.7,
        67.3
      ],
      "codes": [
        "ACF",
        "BME",
        "ECO",
        "ELD",
        "MAA",
        "MAM",
        "MAM",
        "PHY"
      ]
    },
    {
      "atar": 91.55,
      "top4": 266.4,
      "marks": [
        77.1,
        73.1,
        61.5,
        54.7,
        43.3
      ],
      "codes": [
        "BME",
        "CHE",
        "ELD",
        "MAM",
        "MAS"
      ]
    }
  ],
  "snapshotNote": "Recorded outcomes of a prior cohort, pasted into the source workbook rather than computed there. Their ATAR column is not a function of their marks: an ATAR is a rank within a cohort.",
  "cohortCaveat": {
    "en": "These are the students the workbook happens to record, and they are a high-attaining group: every one of them is between 90.95 and 99.65. The bands below are positions within THIS group, not within the state. A student at 80 would sit below everyone here, which says nothing about whether 80 is a good ATAR.",
    "zh": "这些只是工作簿恰好记录下来的学生，而且是一个高分群体：他们全部落在 90.95 到 99.65 之间。下面的分位是**这一组人内部**的位置，不是全州的位置。一个 80 分的学生会排在这里所有人之后，但这说明不了 80 分算不算好。"
  }
}
