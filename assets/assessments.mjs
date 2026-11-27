import {applyAssessmentUpdates} from './assessment-updates.mjs';
import {ealdCalendar} from './eald-calendar.mjs';

const cohortRecords = {
  "zh": [
    {
      "date": "2026-06-08",
      "subject": "MAM",
      "title": "Readiness 1",
      "weight": "—",
      "row": "<tr data-due=\"2026-06-08\"><td>MAM</td><td>Readiness 1</td><td>Test</td><td>—</td><td>2026/6/8<br><small>预备测试，不计权重</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-06-12",
      "subject": "MAM",
      "title": "Readiness 2",
      "weight": "—",
      "row": "<tr data-due=\"2026-06-12\"><td>MAM</td><td>Readiness 2</td><td>Test</td><td>—</td><td>2026/6/12<br><small>预备测试，不计权重</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-07-28",
      "subject": "CSC",
      "title": "Task 2",
      "weight": "10%",
      "row": "<tr data-due=\"2026-07-28\"><td>CSC</td><td>Task 2</td><td>Practical Test</td><td>10%</td><td>2026/7/28<br><small>4:30–5:30 pm，60 分钟；编程实作，题目由浅入深</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-07-29",
      "subject": "MAM",
      "title": "Topic Test 1",
      "weight": "10%",
      "row": "<tr data-due=\"2026-07-29\"><td>MAM</td><td>Topic Test 1</td><td>Test</td><td>10%</td><td>2026/7/29<br><small>4:30–5:30 pm，60 分钟；第 1 章微分（不含最优化）</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-08-03",
      "subject": "HBY",
      "title": "Topic Test",
      "weight": "10%",
      "row": "<tr data-due=\"2026-08-03\"><td>HBY</td><td>Topic Test</td><td>Topic Test</td><td>10%</td><td>2026/8/3<br><small>第 1–3 章；4:30–5:45 pm，5 分钟阅读 + 70 分钟作答</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-08-14",
      "subject": "PHY",
      "title": "Task 1",
      "weight": "14%",
      "row": "<tr data-due=\"2026-08-14\"><td>PHY</td><td>Task 1</td><td>Topic Test 1</td><td>14%</td><td>2026/8/14<br><small>重力、水平与竖直面圆周运动、静力平衡与质心；4:30–5:30 pm，5 分钟阅读 + 55 分钟作答，47 分；科学计算器（不许 CAS），发公式册</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-08-18",
      "subject": "CSC",
      "title": "Task 1",
      "weight": "20%",
      "row": "<tr data-due=\"2026-08-18\" data-span=\"1\"><td>CSC</td><td>Task 1</td><td>Project</td><td>20%</td><td>2026/8/7 – 2026/8/18<br><small>Part 1 设计与开发 5%、Part 2 评估 5%、Part 3 项目验证 10%</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-09-09",
      "subject": "MAM",
      "title": "Investigation Pt 1",
      "weight": "4%",
      "row": "<tr data-due=\"2026-09-09\" data-span=\"1\"><td>MAM</td><td>Investigation Pt 1</td><td>Investigation</td><td>4%</td><td>2026/8/28 – 2026/9/9<br><small>8/28 布置，9/9 提交；两部分合计 20%（官方大纲：Part 1 = 4%、Part 2 = 16%）</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-09-09",
      "subject": "MAM",
      "title": "Investigation Pt 2",
      "weight": "16%",
      "row": "<tr data-due=\"2026-09-09\"><td>MAM</td><td>Investigation Pt 2</td><td>Investigation</td><td>16%</td><td>2026/9/9<br><small>两部分合计 20%（官方大纲：Part 1 = 4%、Part 2 = 16%）；4:30–5:30 pm，60 分钟；微分（最优化），课堂内验证</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-09-17",
      "subject": "HBY",
      "title": "Extended Response",
      "weight": "7%",
      "row": "<tr data-due=\"2026-09-17\"><td>HBY</td><td>Extended Response</td><td>Extended Response</td><td>7%</td><td>2026/9/17<br><small>第 4–7 章；4:30–5:25 pm，5 分钟阅读 + 50 分钟作答</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-10-02",
      "subject": "CSC",
      "title": "Task 3",
      "weight": "15%",
      "row": "<tr data-due=\"2026-10-02\" data-span=\"1\"><td>CSC</td><td>Task 3</td><td>Examination</td><td>15%</td><td>2026/9/21 – 2026/10/2<br><small>第一学期期末考试，3 小时（第 18–19 周）</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-10-02",
      "subject": "PHY",
      "title": "Task 2",
      "weight": "12%",
      "row": "<tr data-due=\"2026-10-02\"><td>PHY</td><td>Task 2</td><td>Evaluation & Analysis</td><td>12%</td><td>2026/10/2<br><small>重力与水平、竖直面圆周运动；4:30–5:30 pm，5 分钟阅读 + 50 分钟作答，44 分</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-10-17",
      "subject": "HBY",
      "title": "Lab Assessment",
      "weight": "10%",
      "row": "<tr data-due=\"2026-10-17\"><td>HBY</td><td>Lab Assessment</td><td>Lab Assessment</td><td>10%</td><td>2026/10/17<br><small>第 1 章</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-11-02",
      "subject": "MAM",
      "title": "ACCT",
      "weight": "—",
      "row": "<tr data-due=\"2026-11-02\"><td>MAM</td><td>ACCT</td><td>Test</td><td>—</td><td>2026/11/2<br><small>占 5%，作为加分计入期末成绩；9:20–10:20 am，60 分钟，60 分；第 1 节无计算器（3 题 25 分钟 27 分），第 2 节可用计算器（4 题 33 分钟 33 分）；两节都发公式表，可带 4 页 A4 笔记</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-11-02",
      "subject": "MAM",
      "title": "Topic Test 2",
      "weight": "20%",
      "row": "<tr data-due=\"2026-11-02\"><td>MAM</td><td>Topic Test 2</td><td>Test</td><td>20%</td><td>2026/11/2<br><small>学校通知的日期；大纲给的窗口是 10/28–11/13；2:00–3:51 pm，111 分钟；两节都发公式表</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-11-13",
      "subject": "PHY",
      "title": "Task 3",
      "weight": "20%",
      "row": "<tr data-due=\"2026-11-13\" data-span=\"1\"><td>PHY</td><td>Task 3</td><td>Evaluation Exam</td><td>20%</td><td>2026/10/27 – 2026/11/13<br><small>静力平衡与质心、相对论、电磁学</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-11-19",
      "subject": "CSC",
      "title": "Task 4",
      "weight": "10%",
      "row": "<tr data-due=\"2026-11-19\"><td>CSC</td><td>Task 4</td><td>Theory Test</td><td>10%</td><td>2026/11/19<br><small>网络通信与网络安全</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-11-20",
      "subject": "HBY",
      "title": "Evaluation Exam",
      "weight": "20%",
      "row": "<tr data-due=\"2026-11-20\" data-span=\"1\"><td>HBY</td><td>Evaluation Exam</td><td>Examination</td><td>20%</td><td>2026/11/2 – 2026/11/20<br><small>第 1–8 章</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-12-09",
      "subject": "PHY",
      "title": "Task 4",
      "weight": "10%",
      "row": "<tr data-due=\"2026-12-09\" data-span=\"1\"><td>PHY</td><td>Task 4</td><td>Lab Assessment</td><td>10%</td><td>2026/11/27 – 2026/12/9<br><small>Science Inquiry 类：11/27 实操、12/9 笔试；范围波粒二象性</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-12-16",
      "subject": "MAM",
      "title": "Topic Test 3",
      "weight": "10%",
      "row": "<tr data-due=\"2026-12-16\"><td>MAM</td><td>Topic Test 3</td><td>Test</td><td>10%</td><td>2026/12/16<span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-12-17",
      "subject": "HBY",
      "title": "Extended Response",
      "weight": "8%",
      "row": "<tr data-due=\"2026-12-17\"><td>HBY</td><td>Extended Response</td><td>Extended Response</td><td>8%</td><td>2026/12/17<br><small>第 8–10 章</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2027-01-04",
      "subject": "CSC",
      "title": "Task 5",
      "weight": "20%",
      "row": "<tr data-due=\"2027-01-04\" data-span=\"1\"><td>CSC</td><td>Task 5</td><td>Project</td><td>20%</td><td>2026/11/23 – 2027/1/4<br><small>Part 1 数据库方案 8%（12/18 交）、Part 2 项目验证 12%</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2027-01-13",
      "subject": "HBY",
      "title": "Topic Test",
      "weight": "15%",
      "row": "<tr data-due=\"2027-01-13\"><td>HBY</td><td>Topic Test</td><td>Topic Test</td><td>15%</td><td>2027/1/13<br><small>第 10–12 章</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2027-01-14",
      "subject": "PHY",
      "title": "Task 5",
      "weight": "14%",
      "row": "<tr data-due=\"2027-01-14\"><td>PHY</td><td>Task 5</td><td>Topic Test 2</td><td>14%</td><td>2027/1/14<br><small>电磁学、波粒二象性与量子理论</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2027-01-21",
      "subject": "CSC",
      "title": "外考 Task 6",
      "weight": "25%",
      "row": "<tr data-due=\"2027-01-21\" data-span=\"1\"><td>CSC</td><td><span class=\"ext\" title=\"WACE 外部考试（SCSA 命题）\">外考</span> Task 6</td><td>Examination</td><td>25%</td><td>2027/1/4 – 2027/1/21<br><small>第二学期期末考试，3 小时。大纲写 Week 34-36，本站按开学日推算 1/4–1/21 属于第 33–35 周 —— 学校周历与本站编号不同，两个说法都列在这里，日期以学校通知为准</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2027-02-12",
      "subject": "HBY",
      "title": "外考 Final Exam",
      "weight": "30%",
      "row": "<tr data-due=\"2027-02-12\" data-span=\"1\"><td>HBY</td><td><span class=\"ext\" title=\"WACE 外部考试（SCSA 命题）\">外考</span> Final Exam</td><td>Examination</td><td>30%</td><td>2027/1/29 – 2027/2/12<br><small>第 1–13 章全部</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2027-02-12",
      "subject": "MAM",
      "title": "外考 Final Examination",
      "weight": "40%",
      "row": "<tr data-due=\"2027-02-12\" data-span=\"1\"><td>MAM</td><td><span class=\"ext\" title=\"WACE 外部考试（SCSA 命题）\">外考</span> Final Examination</td><td>Examination</td><td>40%</td><td>2027/2/1 – 2027/2/12<br><small>覆盖 Unit 3 + Unit 4 全部</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2027-02-13",
      "subject": "PHY",
      "title": "外考 Task 6",
      "weight": "30%",
      "row": "<tr data-due=\"2027-02-13\" data-span=\"1\"><td>PHY</td><td><span class=\"ext\" title=\"WACE 外部考试（SCSA 命题）\">外考</span> Task 6</td><td>Final Evaluation</td><td>30%</td><td>2027/1/29 – 2027/2/13<br><small>覆盖 Unit 3 + 4 全部</small><span class=\"due\"></span></td></tr>"
    }
  ],
  "en": [
    {
      "date": "2026-06-08",
      "subject": "MAM",
      "title": "Readiness 1",
      "weight": "—",
      "row": "<tr data-due=\"2026-06-08\"><td>MAM</td><td>Readiness 1</td><td>Test</td><td>—</td><td>2026-06-08<br><small>Readiness task, unweighted</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-06-12",
      "subject": "MAM",
      "title": "Readiness 2",
      "weight": "—",
      "row": "<tr data-due=\"2026-06-12\"><td>MAM</td><td>Readiness 2</td><td>Test</td><td>—</td><td>2026-06-12<br><small>Readiness task, unweighted</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-07-28",
      "subject": "CSC",
      "title": "Task 2",
      "weight": "10%",
      "row": "<tr data-due=\"2026-07-28\"><td>CSC</td><td>Task 2</td><td>Practical Test</td><td>10%</td><td>2026-07-28<br><small>4:30–5:30 pm, 60 minutes; practical programming, increasing in difficulty</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-07-29",
      "subject": "MAM",
      "title": "Topic Test 1",
      "weight": "10%",
      "row": "<tr data-due=\"2026-07-29\"><td>MAM</td><td>Topic Test 1</td><td>Test</td><td>10%</td><td>2026-07-29<br><small>4:30–5:30 pm, 60 minutes; Chapter 1 differentiation (optimisation excluded)</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-08-03",
      "subject": "HBY",
      "title": "Topic Test",
      "weight": "10%",
      "row": "<tr data-due=\"2026-08-03\"><td>HBY</td><td>Topic Test</td><td>Topic Test</td><td>10%</td><td>2026-08-03<br><small>Chapters 1–3；4:30–5:45 pm, 5 min reading + 70 min working</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-08-14",
      "subject": "PHY",
      "title": "Task 1",
      "weight": "14%",
      "row": "<tr data-due=\"2026-08-14\"><td>PHY</td><td>Task 1</td><td>Topic Test 1</td><td>14%</td><td>2026-08-14<br><small>Gravity, circular motion in horizontal and vertical planes, static equilibrium and centre of mass；4:30–5:30 pm, 5 min reading + 55 min working, 47 marks; scientific calculator only (no CAS), formula booklet provided</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-08-18",
      "subject": "CSC",
      "title": "Task 1",
      "weight": "20%",
      "row": "<tr data-due=\"2026-08-18\" data-span=\"1\"><td>CSC</td><td>Task 1</td><td>Project</td><td>20%</td><td>2026-08-07 – 2026-08-18<br><small>Part 1 design & development 5%, Part 2 evaluation 5%, Part 3 project validation 10%</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-09-09",
      "subject": "MAM",
      "title": "Investigation Pt 1",
      "weight": "4%",
      "row": "<tr data-due=\"2026-09-09\" data-span=\"1\"><td>MAM</td><td>Investigation Pt 1</td><td>Investigation</td><td>4%</td><td>2026-08-28 – 2026-09-09<br><small>Assigned 28 Aug, submitted 9 Sep; the two parts total 20% (official outline: Part 1 = 4%, Part 2 = 16%)</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-09-09",
      "subject": "MAM",
      "title": "Investigation Pt 2",
      "weight": "16%",
      "row": "<tr data-due=\"2026-09-09\"><td>MAM</td><td>Investigation Pt 2</td><td>Investigation</td><td>16%</td><td>2026-09-09<br><small>The two parts total 20% (official outline: Part 1 = 4%, Part 2 = 16%)；4:30–5:30 pm, 60 minutes; differentiation (optimisation), in-class validation</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-09-17",
      "subject": "HBY",
      "title": "Extended Response",
      "weight": "7%",
      "row": "<tr data-due=\"2026-09-17\"><td>HBY</td><td>Extended Response</td><td>Extended Response</td><td>7%</td><td>2026-09-17<br><small>Chapters 4–7；4:30–5:25 pm, 5 min reading + 50 min working</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-10-02",
      "subject": "CSC",
      "title": "Task 3",
      "weight": "15%",
      "row": "<tr data-due=\"2026-10-02\" data-span=\"1\"><td>CSC</td><td>Task 3</td><td>Examination</td><td>15%</td><td>2026-09-21 – 2026-10-02<br><small>Semester 1 examination, 3 hours (weeks 18–19)</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-10-02",
      "subject": "PHY",
      "title": "Task 2",
      "weight": "12%",
      "row": "<tr data-due=\"2026-10-02\"><td>PHY</td><td>Task 2</td><td>Evaluation & Analysis</td><td>12%</td><td>2026-10-02<br><small>Gravity and circular motion in horizontal and vertical planes；4:30–5:30 pm, 5 min reading + 50 min working, 44 marks</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-10-17",
      "subject": "HBY",
      "title": "Lab Assessment",
      "weight": "10%",
      "row": "<tr data-due=\"2026-10-17\"><td>HBY</td><td>Lab Assessment</td><td>Lab Assessment</td><td>10%</td><td>2026-10-17<br><small>Chapter 1</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-11-02",
      "subject": "MAM",
      "title": "ACCT",
      "weight": "—",
      "row": "<tr data-due=\"2026-11-02\"><td>MAM</td><td>ACCT</td><td>Test</td><td>—</td><td>2026-11-02<br><small>Counts 5%, added as a bonus to the final exam；9:20–10:20 am, 60 minutes, 60 marks; Section 1 calculator-free (3 questions, 25 min, 27 marks), Section 2 calculator-assumed (4 questions, 33 min, 33 marks); formula sheet in both, four A4 pages of notes allowed</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-11-02",
      "subject": "MAM",
      "title": "Topic Test 2",
      "weight": "20%",
      "row": "<tr data-due=\"2026-11-02\"><td>MAM</td><td>Topic Test 2</td><td>Test</td><td>20%</td><td>2026-11-02<br><small>The date from the school's notice; the outline gives the window 28 Oct – 13 Nov；2:00–3:51 pm, 111 minutes; formula sheet in both sections</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-11-13",
      "subject": "PHY",
      "title": "Task 3",
      "weight": "20%",
      "row": "<tr data-due=\"2026-11-13\" data-span=\"1\"><td>PHY</td><td>Task 3</td><td>Evaluation Exam</td><td>20%</td><td>2026-10-27 – 2026-11-13<br><small>Static equilibrium and centre of mass, relativity, electromagnetism</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-11-19",
      "subject": "CSC",
      "title": "Task 4",
      "weight": "10%",
      "row": "<tr data-due=\"2026-11-19\"><td>CSC</td><td>Task 4</td><td>Theory Test</td><td>10%</td><td>2026-11-19<br><small>Network communications and cyber security</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-11-20",
      "subject": "HBY",
      "title": "Evaluation Exam",
      "weight": "20%",
      "row": "<tr data-due=\"2026-11-20\" data-span=\"1\"><td>HBY</td><td>Evaluation Exam</td><td>Examination</td><td>20%</td><td>2026-11-02 – 2026-11-20<br><small>Chapters 1–8</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-12-09",
      "subject": "PHY",
      "title": "Task 4",
      "weight": "10%",
      "row": "<tr data-due=\"2026-12-09\" data-span=\"1\"><td>PHY</td><td>Task 4</td><td>Lab Assessment</td><td>10%</td><td>2026-11-27 – 2026-12-09<br><small>Science Inquiry: practical 27 Nov, written 9 Dec; wave-particle content</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-12-16",
      "subject": "MAM",
      "title": "Topic Test 3",
      "weight": "10%",
      "row": "<tr data-due=\"2026-12-16\"><td>MAM</td><td>Topic Test 3</td><td>Test</td><td>10%</td><td>2026-12-16<span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2026-12-17",
      "subject": "HBY",
      "title": "Extended Response",
      "weight": "8%",
      "row": "<tr data-due=\"2026-12-17\"><td>HBY</td><td>Extended Response</td><td>Extended Response</td><td>8%</td><td>2026-12-17<br><small>Chapters 8–10</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2027-01-04",
      "subject": "CSC",
      "title": "Task 5",
      "weight": "20%",
      "row": "<tr data-due=\"2027-01-04\" data-span=\"1\"><td>CSC</td><td>Task 5</td><td>Project</td><td>20%</td><td>2026-11-23 – 2027-01-04<br><small>Part 1 database solution 8% (due 18 Dec), Part 2 project validation 12%</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2027-01-13",
      "subject": "HBY",
      "title": "Topic Test",
      "weight": "15%",
      "row": "<tr data-due=\"2027-01-13\"><td>HBY</td><td>Topic Test</td><td>Topic Test</td><td>15%</td><td>2027-01-13<br><small>Chapters 10–12</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2027-01-14",
      "subject": "PHY",
      "title": "Task 5",
      "weight": "14%",
      "row": "<tr data-due=\"2027-01-14\"><td>PHY</td><td>Task 5</td><td>Topic Test 2</td><td>14%</td><td>2027-01-14<br><small>Electromagnetism, wave-particle duality and quantum theory</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2027-01-21",
      "subject": "CSC",
      "title": "EXT Task 6",
      "weight": "25%",
      "row": "<tr data-due=\"2027-01-21\" data-span=\"1\"><td>CSC</td><td><span class=\"ext\" title=\"WACE external examination (set by SCSA)\">EXT</span> Task 6</td><td>Examination</td><td>25%</td><td>2027-01-04 – 2027-01-21<br><small>Semester 2 examination, 3 hours. The outline says Week 34-36; counting from the start of semester this site places 4–21 Jan in weeks 33–35. The school calendar and this site count differently, so both are shown — treat the school's notice as final</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2027-02-12",
      "subject": "HBY",
      "title": "EXT Final Exam",
      "weight": "30%",
      "row": "<tr data-due=\"2027-02-12\" data-span=\"1\"><td>HBY</td><td><span class=\"ext\" title=\"WACE external examination (set by SCSA)\">EXT</span> Final Exam</td><td>Examination</td><td>30%</td><td>2027-01-29 – 2027-02-12<br><small>All chapters 1–13</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2027-02-12",
      "subject": "MAM",
      "title": "EXT Final Examination",
      "weight": "40%",
      "row": "<tr data-due=\"2027-02-12\" data-span=\"1\"><td>MAM</td><td><span class=\"ext\" title=\"WACE external examination (set by SCSA)\">EXT</span> Final Examination</td><td>Examination</td><td>40%</td><td>2027-02-01 – 2027-02-12<br><small>All Unit 3 and Unit 4 content</small><span class=\"due\"></span></td></tr>"
    },
    {
      "date": "2027-02-13",
      "subject": "PHY",
      "title": "EXT Task 6",
      "weight": "30%",
      "row": "<tr data-due=\"2027-02-13\" data-span=\"1\"><td>PHY</td><td><span class=\"ext\" title=\"WACE external examination (set by SCSA)\">EXT</span> Task 6</td><td>Final Evaluation</td><td>30%</td><td>2027-01-29 – 2027-02-13<br><small>All of Units 3 and 4</small><span class=\"due\"></span></td></tr>"
    }
  ]
};

export const assessments = {
  en: applyAssessmentUpdates([...cohortRecords.en, ...ealdCalendar('en')], 'en'),
  zh: applyAssessmentUpdates([...cohortRecords.zh, ...ealdCalendar('zh')], 'zh'),
};
