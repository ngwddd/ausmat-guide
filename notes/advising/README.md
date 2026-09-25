# 升学自检 · Advising self-check

规则驱动的升学建议生成器。填一份学生情况，工具把适用的建议汇总成一篇报告，
每段都标出它来自哪条规则。

页面本身是中英成对的，和站内其他页面一样：

| 页面 | 语言 |
| --- | --- |
| `notes/advising/index.html` | 中文 |
| `notes/advising/en.html` | English |

切换是页头右上角的普通链接，**不需要 JavaScript**。语言由根元素的 `data-lang`
决定，站点样式表据此显示对应的文案。

## 文件构成

| 文件 | 作用 |
| --- | --- |
| `notes/advising/index.html` | 中文页：静态外壳（表单、页签、表头） |
| `notes/advising/en.html` | 英文页：同一外壳，英文文案 |
| `notes/advising/advising-rules.js` | **规则库**：类别、词表、阈值、能力表、规则、矩阵、换算参数，中英双语 |
| `assets/advising.js` | 引擎：表达式求值、校验、报告拼装、界面行为 |
| `assets/advising.css` | 仅本工具使用的样式，配色全部继承站点的变量 |

配色不在本工具里定义。改 `assets/style.css` 的 `:root` 变量即可换整站配色，
本工具不需要跟着改——唯一的例外是打印样式，那里刻意固定为白纸黑字。

## 一个决定性的架构选择

**建议是数据，引擎里一条建议都没有。**

所有话术都在 `advising-rules.js` 里，每条规则带一个条件。引擎遍历规则库、
对每条规则求值、把命中的建议按类别顺序拼成报告。于是：

- 改建议永远不用碰引擎代码
- 加一条规则＝在数组里加一项
- 全部规则能在一处读完，而不是散在几百个公式里
- 每条规则带 `source` 和 `verified`，未核实的表述**显示为未核实**，而不是与已核实的外观一样

**规则总览**页签就是这件事的回报：它列出每一条规则、是否命中、内容是否已核实。
当建议埋在公式里时，这个视图根本无法存在，因为没有可供渲染的清单。

## 规则语言

规则条件是一个**小程序语言**的表达式，**不是 JavaScript**。引擎里没有任何
`eval`，也没有 `new Function`。这是刻意的：用 `Function` 编译的表达式能够触达
整个全局作用域，包括 `record.constructor.constructor("...")()`，而文本扫描堵不住
这个洞——逃逸发生在语言运行时里，不在扫描器看得见的名字上。解析表达式、解释语法树，
是把问题**消除**而不是缓解。

由此带来的约束：

- 没有箭头函数、语句、赋值、循环、函数定义
- 针对列表元素的比较走助手函数，因为这门语言表达不了回调：

```js
anyInterest("i.country", "Australia")                  // 任一意向国家
anyInterest("i.field", ["Medicine", "Dentistry"])      // 命中多个之一
!anyInterest("i.country", ["Australia", "United Kingdom"])
anyScoreBelow(T.weakMark)                              // 用命名阈值
record.estimatedAtar < record.targetAtar - T.targetGapPoints
```

- 只有固定的一批标识符可解析：`record`、`T`、以及助手 `anyInterest`、
  `countSubject`、`anyScoreBelow`、`anyValueBelow`、`hasSubject`、`score`、
  `anyInterestExpectationGap`、`anyInterestOptionalGap`、`anyInterestMissing`、
  `belowStatedMinimum`。**拼错会变成一条点名该规则的编译错误**，而不会变成
  一条永远不触发的规则。
- 只有固定的方法可调用：`some`、`every`、`includes`、`indexOf`、`test`、
  `match`、`startsWith`、`endsWith`。
- 属性名 `constructor`、`__proto__`、`prototype`、`caller`、`callee`、
  `arguments` 在任何值上、以任何访问形式都被拒绝。

## 阈值

政策数字集中在一个 `thresholds` 对象里，规则以 `T.weakMark` 引用，而不是写 `60`；
建议正文用 `{{weakMark}}` 插值。所以**句子里写的数字和条件里测的数字不可能不一致**。

这不是洁癖。本工具所仿制的原始工作簿里，一条规则拿 `55` 做比较，而它自己的
文案暗示的是 `60`——两条规则对"偏弱"的定义互相矛盾，这是**验证发现的，不是读出来的**。

## 换算参数：用之前必读

规则库里的 `calibration` 是一个**未经核实的占位实现**。原始工作簿内嵌了一条
六次多项式，系数是其作者针对某一届考试成绩拟合的；那是他人的成果，此处**刻意没有复制**。

在本工具给出任何 ATAR 数字之前：

1. 对着你自己的官方换算表拟合 `coefficients`
2. 把 `calibration.verified` 设为日期
3. 从报告输出里移除那段免责声明，或者保留它并明确标注该数字仅为参考

在第 2 步完成之前，界面会在每一处标明该换算未经校准。一个未校准的换算却输出看起来
很确定的数字，是这类工具最危险的失效方式，所以这道闸门是故意留着的。

## 能力层，而不是一张专业清单

先修条件检查走的是**能力**层，而不是"专业＋要求"的对照表：

```
capabilities          mathematics     -> [Mathematics, Mathematics Methods, ...]
                      physicalScience -> [Physics, Chemistry]
courseExpectations    Engineering     -> expects [mathematics, physicalScience]
```

规则问的是"这位学生记录的科目是否满足该方向通常要求的准备"，而能力到科目名的映射
只存在一处。把新确认的科目名加进 `capabilities.mathematics`，所有消费它的规则**立刻**
跟着生效。

这是刻意的取舍。原始工作簿的课程库里，先修要求那一列是自由文本：全表 124 行里，
只有 3 行是机器可读的形状（`English-YES Mathematics-YES Science/Other-NO`），
另有 12 行写成散文，例如 "Mathematics (Australian Higher Year 12 equivalent) and at
least one of Chemistry or Physics are formal prerequisites for the Bachelor of
Engineering"。把那种散文解析成 YES/NO 标记，等于**制造源数据并不具备的精确性**，
而这正是本项目要避免的失效方式。所以工具可靠地问出能力层面的问题，而在没有依据的地方
它说没有：

- `courseExpectations[*].namedAtar` 一律为 `null`，意思是"没有现成数字"。
  `atar-figure-not-recorded` 规则把这件事变成可见的建议，而不是让学生自行假设一个数字。
- `anyInterestExpectationGap` 只在能力**确实缺失**时才报告；未知方向不报缺口。
- `anyInterestOptionalGap` 在必需能力仍缺失时保持沉默，所以建议之间不会互相打架。

## 验证

验证脚本不在本目录内，也不随站点发布（本仓库曾因此泄露过一次脚本）。它们在本地运行，
覆盖：包结构、规则语言安全、目录一致性、内容政策、能力层逐例判定，以及
**把生产引擎本身**在 DOM 桩上跑一遍。

一个浏览器端套件曾被尝试并放弃：Playwright 用 `--remote-debugging-pipe` 启动 Chromium，
而 Chrome 自身的 mojo IPC 也需要命名管道，构建此工具的环境禁止命名管道。为了跑一个测试
去放宽沙箱不是划算的交换，所以 DOM 桩覆盖了同样的逻辑。**因此本页面的渲染从未在真实
浏览器里验证过**——如果你有浏览器，打开这两个页面把四个页签各点一遍。

## 内容政策

规则库里的每一句话都是为本模板**原创撰写**的示例文案，不是政策来源。所有数字都是占位值。
做事实性主张的规则会指出人类需要在何处核实，并在核实之前显示为"待核实"。
验证套件会在规则写出货币金额时报错，因为金额应当指向当前项目页面的链接，
而不是一个会悄悄过期的字符串。

## 来源与边界

架构研究自一份机构工作簿，并从零重新实现。具体而言：

**取用的架构**（想法，不是表达）：表单 → 规则表 → 生成报告的整体形状；
"只输出命中的内容，未命中的规则不产生任何输出"；由考核自身的权重推导其重要度；
用重要度×紧急度的二维矩阵给出单一建议动作；用一次合成分换算出目标计算器所需的 ATAR。

**未取用**：任何建议文案、任何规则措辞、任何数值系数、任何阈值、任何大学或奖学金名单、
任何金额或网址、任何代码。原件从未在 Excel 中打开过，其宏从未被执行。其课程库只被读取
以**测量其先修数据的形态**——发现它主要是散文，这正是本模板改用能力层而不复制清单的原因。

**刻意改动**（每一条都是原设计真实存在的缺陷）：

| 原始设计 | 本实现 |
| --- | --- |
| 建议嵌在各条公式里 | 建议是规则库里的数据 |
| 无保护的精确字符串比较，打错一个字建议就静默消失 | 受控词表＋会报出问题的校验 |
| 15 张表只挂了 4 处数据验证 | 每个字段都校验，并说明原因 |
| 规则散落，无法看到全集 | 规则总览视图列出每条规则及其状态 |
| 阈值硬编码在各条规则里 | 命名阈值，条件与文案引用同一个值 |
| 课程库的先修要求是自由文本，却当作结构化数据使用 | 能力层；没有依据的数字显式暴露而非编造 |
| 规则与学生数据在同一份分发文件里 | 规则在规则库，学生数据独立 |
| 依赖 Excel 2021+ 的动态数组函数，未测旧版本 | 任意浏览器可运行，无版本依赖 |
| 拟合多项式在其拟合区间外仍被信任 | 显式标注未经核实的占位实现，拒绝显得确定 |

## 已知缺口

- **本页面未在真实浏览器中渲染验证过**（见"验证"）。
- `calibration` 未经校准。
- 规则总览里标为"待核实"的规则，含有尚未对照当前来源确认的事实性表述。
- `courseExpectations[*].namedAtar` 全部为 `null`，所以工具能拿你记录的数字作比较，
  但自己不提供任何数字。
- 能力层的科目名映射是一个起点，应当第一个按你实际的科目目录校正。
- 存储只有浏览器 `localStorage`，且**按语言分开保存**。没有多顾问同步、没有审计日志、
  没有单个学生的文件格式。
- 报告可导出为 Markdown，或经浏览器打印为 PDF；没有 `.docx` 输出。
