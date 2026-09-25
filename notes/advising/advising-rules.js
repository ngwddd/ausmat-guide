/* ============================================================================
 * advising-rules.js — the SINGLE SOURCE OF TRUTH for this advising engine.
 * ----------------------------------------------------------------------------
 * Every piece of advice lives here as data, not inside engine code. Adding,
 * editing, disabling, or citing a rule means editing THIS FILE ONLY.
 *
 * Architecture note: the engine never contains advice text. It walks this
 * table, evaluates each `when` expression against the student record, and
 * prints the `advice` of every rule that fires. That separation is the whole
 * point — it is what makes the advice auditable and diffable.
 *
 * CONTENT POLICY (read before editing):
 *   - Every string below is ORIGINALLY WRITTEN for this template. It is
 *     illustrative sample copy, not a policy source.
 *   - All numbers are PLACEHOLDERS. Verify against current official material
 *     before any real use, and update `verified` when you do.
 *   - `source` names where a claim must be confirmed. If a rule cannot be
 *     sourced, either find the source or delete the rule.
 * ==========================================================================*/

window.ADVISING = (function () {
  'use strict'

  /* --------------------------------------------------------------------------
   * 1. The catalog. `label` is what the advisor sees; `order` is sort order.
   * ------------------------------------------------------------------------*/
  const domains = [
    { id: 'completeness', label: 'Submission completeness', zhLabel: '填写完整度', order: 10 },
    { id: 'destination', label: 'Destination & applications', zhLabel: '升学方向与申请', order: 20 },
    { id: 'course', label: 'Course-specific requirements', zhLabel: '专业要求', order: 30 },
    { id: 'language', label: 'Language proficiency', zhLabel: '语言要求', order: 40 },
    { id: 'funding', label: 'Scholarships & funding', zhLabel: '奖学金与费用', order: 50 },
    { id: 'performance', label: 'Academic performance', zhLabel: '学业表现', order: 60 },
    { id: 'wellbeing', label: 'Study approach & wellbeing', zhLabel: '学习方式与状态', order: 70 },
  ]

  /* --------------------------------------------------------------------------
   * 2. Controlled vocabularies. Validation uses these, so a typo is caught
   *    instead of silently failing to match a rule. This replaces the original
   *    design's unguarded exact-string comparisons.
   * ------------------------------------------------------------------------*/
  const vocabularies = {
    countries: [
      'Australia', 'United Kingdom', 'United States', 'Canada',
      'Ireland', 'New Zealand', 'Malaysia', 'Singapore', 'Japan', 'Other',
    ],
    fields: [
      'Medicine', 'Dentistry', 'Law', 'Engineering', 'Computer Science',
      'Business', 'Psychology', 'Nursing', 'Architecture', 'Sciences',
      'Humanities', 'Education', 'Undecided',
    ],
    level: ['Year 11', 'September intake', 'January intake'],
  }

  /* --------------------------------------------------------------------------
   * 3. Thresholds. Named once, referenced by rules. Numbers scattered through
   *    conditions are how two rules end up disagreeing about what "weak" means
   *    — an inconsistency this catalog originally had, found by verification
   *    rather than by reading. Change a policy figure here, not in a rule.
   * ------------------------------------------------------------------------*/
  const thresholds = {
    weakMark: 60,          // a subject result at or below this is materially weak
    targetGapPoints: 5,    // standing this far below target is worth raising
    subjectsForAggregate: 4,
    heavyLoadSubjects: 6,
    priorIntakeWeakMark: 60,
    atarMarginPoints: 2,   // how close to a stated minimum counts as marginal
  }

  const zhMatrix = {
    1: { 1: '先放着，时间真的宽裕再看。', 2: '把材料归档，留一次短复习。', 3: '未来几周安排一次短回顾。', 4: '本周排一个专注时段。', 5: '排一次深度复习，这项分量很重。' },
    2: { 1: '这周清闲的话再扫一眼。', 2: '做一份能反复用的精简笔记。', 3: '下个主题开始前回顾课堂材料。', 4: '做练习题，不要只看。', 5: '本周定一个时段，别交给运气。' },
    3: { 1: '别的事都落空了再看。', 2: '用自己的笔记做一次短回顾。', 3: '针对性回顾，然后限时练习。', 4: '开始限时做真题。', 5: '现在就开始，这项拖不得。' },
    4: { 1: '主动推迟，它不是你的瓶颈。', 2: '专注一小时，之后再判断。', 3: '本周优先于常规作业。', 4: '今天完整做一套真题。', 5: '当作紧急事项：今天复习并自测。' },
    5: { 1: '只有它确实是你最轻的一项才碰。', 2: '把笔记压缩成一页回忆提纲。', 3: '立刻优先于大多数其他任务。', 4: '48 小时内做完整复习。', 5: '立刻集中复习，马上做一套模拟。' },
  }

  /* --------------------------------------------------------------------------
   * 4. Subject capabilities.
   *
   *    A "capability" is a kind of preparation a course can require, expressed
   *    against AUSMAT subject names. Rules ask for a capability; the mapping
   *    from capability to subjects lives here, once.
   *
   *    Why capabilities rather than a list of courses and their prerequisites:
   *    the institutional workbook carries a course database whose prerequisite
   *    column is free text. Profiling it found only a handful of rows in any
   *    machine-readable shape (English-YES Mathematics-YES Science/Other-NO)
   *    and a dozen more in prose ("Mathematics ... and at least one of
   *    Chemistry or Physics are formal prerequisites"). Parsing that prose into
   *    flags would manufacture certainty the source does not have. What the
   *    advisor actually needs is the capability question asked reliably, with
   *    the unmapped cases surfaced instead of guessed.
   *
   *    Extend `capabilities` as real prerequisites are confirmed. Every rule
   *    consuming a capability then covers the new subject automatically.
   * ------------------------------------------------------------------------*/
  const capabilities = {
    mathematics: {
      label: 'Mathematics', zhLabel: '数学',
      subjects: ['Mathematics', 'Mathematics Methods', 'Mathematics Specialist', 'Add Maths', 'Additional Mathematics'],
    },
    physicalScience: {
      label: 'a physical science', zhLabel: '物理或化学',
      subjects: ['Physics', 'Chemistry'],
    },
    chemistry: {
      label: 'Chemistry', zhLabel: '化学',
      subjects: ['Chemistry'],
    },
    biology: {
      label: 'Biology', zhLabel: '生物',
      subjects: ['Biology', 'Human Biology'],
    },
    english: {
      label: 'English', zhLabel: '英语',
      subjects: ['English', 'English as First Language', 'English as Second Language', 'English Literature'],
    },
    computing: {
      label: 'Computing', zhLabel: '计算机',
      subjects: ['Computer Science', 'Computing', 'Information Technology'],
    },
  }

  /* --------------------------------------------------------------------------
   * 5. Course expectations.
   *
   *    Per field of study, the capabilities it normally expects, optional extras
   *    worth raising, and — importantly — whether a minimum ATAR can be stated
   *    at all. `namedAtar` defaults to null, meaning "this tool has no current
   *    figure". A rule then says so rather than inventing a number.
   *
   *    Every entry carries `source` because a course expectation is a factual
   *    claim, and a stale one sends a student to the wrong programme.
   *    `verified: null` keeps it visible in the coverage view until a human
   *    checks it against the current institution page.
   * ------------------------------------------------------------------------*/
  const courseExpectations = {
    Engineering: {
      zhLabel: '工程',
      expects: ['mathematics', 'physicalScience'],
      optional: ['chemistry'],
      namedAtar: null,
      source: 'Confirm each programme’s assumed-knowledge statement',
      verified: null,
    },
    'Computer Science': {
      zhLabel: '计算机科学',
      expects: ['mathematics'],
      optional: ['computing', 'physicalScience'],
      namedAtar: null,
      source: 'Confirm each programme’s prerequisite statement',
      verified: null,
    },
    Medicine: {
      zhLabel: '医学',
      expects: ['chemistry', 'english'],
      optional: ['biology', 'mathematics'],
      namedAtar: null,
      source: 'Confirm prerequisites and admissions-test requirements per university',
      verified: null,
    },
    Dentistry: {
      zhLabel: '牙医',
      expects: ['chemistry'],
      optional: ['biology', 'mathematics'],
      namedAtar: null,
      source: 'Confirm prerequisites and admissions-test requirements per university',
      verified: null,
    },
    Nursing: {
      zhLabel: '护理',
      expects: ['english'],
      optional: ['biology', 'mathematics'],
      namedAtar: null,
      source: 'Confirm per-institution English and science requirements',
      verified: null,
    },
    Sciences: {
      zhLabel: '理科',
      expects: ['mathematics'],
      optional: ['chemistry', 'physicalScience', 'biology'],
      namedAtar: null,
      source: 'Confirm the prerequisites of the specific science programme',
      verified: null,
    },
    Psychology: {
      zhLabel: '心理学',
      expects: ['english'],
      optional: ['mathematics', 'biology'],
      namedAtar: null,
      source: 'Confirm per-institution prerequisites',
      verified: null,
    },
    Business: {
      zhLabel: '商科',
      expects: [],
      optional: ['mathematics'],
      namedAtar: null,
      source: 'Confirm per-institution prerequisites',
      verified: null,
    },
    Law: {
      zhLabel: '法律',
      expects: [],
      optional: ['english'],
      namedAtar: null,
      source: 'Confirm per-institution prerequisites and any admissions test',
      verified: null,
    },
    Architecture: {
      zhLabel: '建筑',
      expects: ['mathematics'],
      optional: ['physicalScience'],
      namedAtar: null,
      source: 'Confirm per-institution prerequisites, including any portfolio',
      verified: null,
    },
    Education: {
      zhLabel: '教育',
      expects: ['english'],
      optional: ['mathematics'],
      namedAtar: null,
      source: 'Confirm per-institution prerequisites',
      verified: null,
    },
    Humanities: {
      zhLabel: '人文',
      expects: ['english'],
      optional: [],
      namedAtar: null,
      source: 'Confirm per-institution prerequisites',
      verified: null,
    },
    Undecided: {
      zhLabel: '尚未确定',
      expects: [],
      optional: [],
      namedAtar: null,
      source: 'internal',
      verified: '2026-01-01',
    },
  }

  /* --------------------------------------------------------------------------
   * 6. Rules. Each rule is one condition + one piece of advice.
   *
   *    when    — expression over the student record. This is a small expression
   *              grammar, NOT JavaScript: no arrow functions, no statements, no
   *              assignments, no eval. Calling a callback is therefore
   *              impossible by design, which is why comparisons against list
   *              elements go through helpers that CONTAIN the path to compare:
   *
   *                anyInterest(path[, value])   any interests[] element matches
   *                                             `path` — a STRING naming the
   *                                             field — optionally against
   *                                             value (single value or array)
   *                countSubject(prefix)         subjects whose level starts with
   *                                             prefix
   *                anyScoreBelow(n)             any subject mark below n
   *                anyValueBelow(object, n)     any numeric value in an object
   *                                             below n
   *                hasSubject(name)             a subject with this name exists
   *                score(subject)               that subject's mark, or null
   *                anyInterestExpectationGap(path, subjects)
   *                                             a stated course expectation needs
   *                                             a capability the student lacks
   *                anyInterestOptionalGap(path, subjects)
   *                                             a recommended capability is missing
   *                                             while the required set is covered
   *                anyInterestMissing(path)     the field is null, empty or absent
   *                belowStatedMinimum(path, standing, margin)
   *                                             standing is within margin below a
   *                                             recorded minimum ATAR
   *                record                       the student record itself
   *                T                            the thresholds table above
   *
   *              The path is a plain STRING naming a field on the element. The
   *              helper resolves it per element, because the outer scope has no
   *              `i` and no other construct can bind one.
   *
   *              Examples:
   *                anyInterest("i.country", "Australia")
   *                anyInterest("i.field", ["Medicine", "Dentistry"])
   *                !anyInterest("i.country", ["Australia", "United Kingdom"])
   *                record.subjects.length >= T.subjectsForAggregate
   *                record.estimatedAtar < record.targetAtar - T.targetGapPoints
   *    advice  — shown when `when` is true. {{tokens}} interpolate from the
   *              record, e.g. {{fullName}} or {{targetAtar}}.
   *    source  — where a human must verify any factual claim, or 'internal'
   *              for process advice that is not a factual claim.
   *    verified— null, or an ISO date once a human confirmed the content.
   *
   *    A rule with `enabled: false` is kept for the record and shown in the
   *    coverage view as deliberately silent — never deleted just to hide it.
   * ------------------------------------------------------------------------*/
  const rules = [
    {
      id: 'form-incomplete',
      domain: 'completeness',
      title: 'Required fields outstanding',
      when: "!record.fullName || record.subjects.length === 0",
      advice: 'This report is provisional because required fields are still blank. ' +
        'Advisor guidance is only as good as the information behind it.',
      zh: '必填项还没填完，所以这份报告只是暂定的。建议的质量取决于你填进去的信息。',
      modes: ['student', 'guest'],
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'subjects-fewer-than-four',
      domain: 'completeness',
      title: 'Fewer than four ATAR subjects recorded',
      when: 'record.subjects.length > 0 && record.subjects.length < T.subjectsForAggregate',
      advice: 'You have recorded {{subjectCount}} ATAR subject(s). Most university ' +
        'aggregates are calculated from four or more, so confirm which subjects ' +
        'will count toward your aggregate.',
      zh: '你只记录了 {{subjectCount}} 门 ATAR 科目。多数大学的合成分按四门及以上计算，先确认你所在体系里哪几门会计入合成分。',
      modes: ['student', 'guest'],
      source: 'Confirm the aggregate rules for your qualification',
      verified: null,
    },

    {
      id: 'dest-none-stated',
      domain: 'destination',
      title: 'No destination country given',
      when: 'record.interests.length === 0',
      advice: 'No destination country has been recorded. Without one, visa timelines, ' +
        'language requirements and application deadlines cannot be assessed.',
      zh: '还没有填写任何目标国家。缺了这个，签证时间线、语言要求和申请截止日期都无从评估。',
      modes: ['student', 'guest'],
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'dest-uk',
      domain: 'destination',
      title: 'United Kingdom destination',
      when: 'anyInterest("i.country", "United Kingdom")',
      advice: 'Applications to the United Kingdom go through a central admissions ' +
        'service rather than directly to each university. Expect to supply an ' +
        'academic reference and a personal statement, and note that a single ' +
        'application covers several choices. Confirm the current cycle deadlines ' +
        'with your advisor before you start writing.',
      zh: '申请英国要通过统一的招生系统，而不是分别投递到各校。需要准备学术推荐信和个人陈述，一份申请可以包含多个志愿。动笔前先向顾问确认当轮的确切截止日期。',
      modes: ['student', 'guest'],
      source: 'Check the current admissions-service cycle deadlines',
      verified: null,
    },
    {
      id: 'dest-us',
      domain: 'destination',
      title: 'United States destination',
      when: 'anyInterest("i.country", "United States")',
      advice: 'United States applications typically require standardised testing, ' +
        'essays, and references requested months in advance. Each university ' +
        'has its own form, so plan for several parallel applications.',
      zh: '申请美国通常需要标准化考试、文书，以及提前数月联系的推荐人。每所大学各有自己的申请系统，要按并行多份申请来规划。',
      modes: ['student', 'guest'],
      source: 'Check each university’s admissions requirements',
      verified: null,
    },
    {
      id: 'dest-au',
      domain: 'destination',
      title: 'Australia destination',
      when: 'anyInterest("i.country", "Australia")',
      advice: 'Australian applications are generally made per institution or through ' +
        'a state admissions centre. Offer rounds are scheduled, so the timing of ' +
        'your results release matters as much as the marks themselves.',
      zh: '申请澳洲一般按院校分别递交，或通过所在州的招生中心。录取是分轮次放榜的，所以成绩公布的时间点和分数本身一样重要。',
      modes: ['student', 'guest'],
      source: 'Check the relevant state admissions centre schedule',
      verified: null,
    },

    {
      id: 'course-medicine',
      domain: 'course',
      title: 'Medicine or dentistry pathway',
      when: 'anyInterest("i.field", ["Medicine", "Dentistry"])',
      advice: 'Medical and dental programmes usually add an aptitude or admissions ' +
        'test on top of academic results, and some institutions also interview. ' +
        'Registration windows for those tests close well before the application ' +
        'deadline, so this is the earliest item on your timeline.',
      zh: '医学与牙医专业通常在学业成绩之外还要加考能力测试，部分院校还有面试。这类考试的报名窗口远早于申请截止日，是你整条时间线上最早的一项。',
      modes: ['student', 'guest'],
      source: 'Confirm test requirements and registration windows per university',
      verified: null,
    },
    {
      id: 'course-law',
      domain: 'course',
      title: 'Law pathway',
      when: 'anyInterest("i.field", "Law")',
      advice: 'Law programmes often have no fixed subject prerequisites, but some ' +
        'jurisdictions require an additional admissions test. Confirm whether ' +
        'the universities you are considering require one.',
      zh: '法律专业通常没有固定的先修科目，但部分地区要求额外的入学考试。先确认你考虑的那些院校是否需要。',
      modes: ['student', 'guest'],
      source: 'Confirm per-university admissions test requirements',
      verified: null,
    },
    {
      id: 'course-engineering',
      domain: 'course',
      title: 'Engineering pathway',
      when: 'anyInterest("i.field", "Engineering")',
      advice: 'Engineering degrees normally assume a strong mathematics background, ' +
        'and several expect physics as well. Check the assumed-knowledge ' +
        'statement for each programme rather than relying on the entry score alone.',
      zh: '工程学位一般以扎实的数学为基础，不少还要求物理。请逐个查阅课程的「假定知识」说明，不要只看录取分数线。',
      modes: ['student', 'guest'],
      source: 'Check each programme’s assumed knowledge statement',
      verified: null,
    },
    {
      id: 'course-undecided',
      domain: 'course',
      title: 'Field of study still undecided',
      when: 'record.interests.length === 0 || anyInterest("i.field", "Undecided") || record.stillDeciding === true',
      advice: 'Being undecided at this stage is normal and workable. The useful move ' +
        'is to narrow by constraint rather than by preference: which subjects you ' +
        'are strongest in, which countries you can fund, and which prerequisite ' +
        'subjects you would need to keep open. Narrowing those three usually ' +
        'removes most of the field.',
      zh: '这个阶段还没定方向很正常，也完全可以处理。更有效的做法是**按约束条件缩小范围**，而不是按喜好：你哪几门最强、能负担哪些国家、哪些先修科目需要继续保留。把这三条列出来，通常就能排除掉大部分选项。',
      modes: ['student', 'guest'],
      source: 'internal',
      verified: '2026-01-01',
    },

    {
      id: 'lang-non-english-destination',
      domain: 'language',
      title: 'Destination language may not be English',
      when: 'record.interests.length > 0 && !anyInterest("i.country", ["Australia","United Kingdom","United States","Canada","Ireland","New Zealand"])',
      advice: 'Your stated destinations are not predominantly English-speaking. ' +
        'Programmes taught in another language normally require a proficiency ' +
        'certificate in that language, which takes time to obtain.',
      zh: '你填的目标国家以非英语国家为主。用其他语言授课的项目通常要求该语言的等级证书，而考取证书需要时间。',
      modes: ['student', 'guest'],
      source: 'Confirm the language of instruction and required certificate',
      verified: null,
    },
    {
      id: 'lang-english-test',
      domain: 'language',
      title: 'English proficiency evidence may be required',
      when: 'anyInterest("i.country", ["Australia","United Kingdom","United States","Canada","Ireland","New Zealand"]) && record.englishFirstLanguage !== true',
      advice: 'Where English is not your first language, many institutions require a ' +
        'standardised English test, though some accept a qualifying result in an ' +
        'English subject instead. Requirements differ by institution and by ' +
        'course — clinical courses are usually the strictest.',
      zh: '如果英语不是你的母语，不少院校会要求标准化英语考试，也有院校接受英语科目成绩替代。要求因院校和课程而异——临床类专业通常最严。',
      modes: ['student', 'guest'],
      source: 'Confirm per-institution English requirements',
      verified: null,
    },

    {
      id: 'funding-not-recorded',
      domain: 'funding',
      title: 'Funding not recorded',
      when: 'record.fundingSecured !== true',
      advice: 'No funding arrangement has been recorded. Scholarship deadlines usually ' +
        'fall earlier than admission deadlines, so funding deserves its own ' +
        'timeline rather than being left until an offer arrives.',
      zh: '还没有记录任何学费来源安排。奖学金的截止日期通常早于录取截止日期，所以费用该有独立的时间线，而不是等拿到 offer 再说。',
      modes: ['student', 'guest'],
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'funding-west-au',
      domain: 'funding',
      title: 'A Western Australian institution is among the choices',
      zhTitle: '志愿中有西澳的院校',
      when: 'anyInterestMatching("i.university", ["Western Australia", "UWA", "Curtin", "Murdoch", "Edith Cowan", "Notre Dame"])',
      advice:
        'Western Australia appears among your recorded choices: ' +
        '{{waUniversities}}. That state runs scholarship and bursary programmes of ' +
        'its own for international graduates of its school qualification. Amounts, ' +
        'quotas and eligibility change between rounds, so treat any figure you have ' +
        'heard as unconfirmed until you read the current programme page.',
      zh:
        '你记录的志愿里出现了西澳的院校：{{waUniversities}}。' +
        '该州有专门面向本州高中毕业国际生的奖学金与助学金项目。' +
        '金额、名额与资格每轮都会变，听到的任何数字都当作未确认，以当前项目页面为准。',
      modes: ['student', 'guest'],
      source: 'Read the current state scholarship programme page',
      verified: null,
    },

    {
      id: 'perf-below-target',
      domain: 'performance',
      title: 'Current standing below stated target',
      when: 'record.targetAtar !== null && record.estimatedAtar !== null && record.estimatedAtar < record.targetAtar - T.targetGapPoints',
      advice: 'Your current standing places you below your stated target of ' +
        '{{targetAtar}}. This is a gap to plan around, not a verdict. The ' +
        'practical question is whether the remaining assessments carry enough ' +
        'weight for the target to remain reachable — if they do not, adjusting ' +
        'the target now is better than discovering it at results release.',
      zh: '按目前水平，你低于自己设定的目标 {{targetAtar}}。这是需要规划的差距，不是结论。关键问题是：剩下的考核权重够不够把目标拉回来。如果不够，现在调整目标，比成绩公布时才发现要好。',
      modes: ['student', 'guest'],
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'perf-subject-weak',
      domain: 'performance',
      title: 'A subject result is materially weak',
      when: 'anyScoreBelow(T.weakMark)',
      advice: 'At least one subject result sits below {{weakMark}}. Before adding study ' +
        'hours everywhere, identify whether the weakness is content knowledge, exam ' +
        'technique, or time management — each needs a different fix. Reviewing ' +
        'marked scripts usually answers this faster than more revision does.',
      zh: '至少有一门低于 {{weakMark}}。在全面增加学习时间之前，先分清问题出在知识本身、应试技巧，还是时间安排——三者的解法完全不同。看一遍批改过的卷子，通常比多刷题更快找到答案。',
      modes: ['student', 'guest'],
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'perf-high-at-load',
      domain: 'performance',
      title: 'Every recorded subject is an advanced-level subject',
      when: 'record.subjects.length >= T.subjectsForAggregate && countSubject("AT") === record.subjects.length',
      advice: 'All {{subjectCount}} of your recorded subjects are at the highest ' +
        'available level. That is a demanding load, and the aggregate advantage ' +
        'only materialises if the marks hold up across all of them. Watch for ' +
        'one subject degrading to protect the others.',
      zh: '你记录的全部 {{subjectCount}} 门都是最高难度科目。这是很重的负担，而合成分的优势只有在各门都稳得住时才成立。留意有没有哪一门在拖累其他几门。',
      modes: ['student', 'guest'],
      source: 'internal',
      verified: '2026-01-01',
    },

    {
      id: 'course-prereq-gap',
      domain: 'course',
      title: 'A stated prerequisite is not among the recorded subjects',
      zhTitle: '已记录科目中缺少某个方向通常要求的准备',
      when: 'anyInterestExpectationGap("i.field", record.subjects)',
      advice:
        'At least one of your chosen fields normally expects preparation you have ' +
        'not recorded. Specifically: ' +
        '{{gapFields}}. Requirements differ between institutions and between ' +
        'programmes inside one institution, so confirm the exact prerequisite for ' +
        'each course before assuming the gap is fatal — some accept a bridging unit.',
      zh:
        '你选的以下方向通常要求你尚未记录的科目准备：{{gapFields}}。' +
        '各院校之间、甚至同一所院校的不同专业之间要求都不同，所以先逐个确认具体课程的' +
        '先修要求，不要预设这个缺口无法弥补——有些学校接受衔接课程。',
      modes: ['student', 'guest'],
      source: 'Confirm the prerequisite for each specific programme',
      verified: null,
    },
    {
      id: 'course-prereq-optional-available',
      domain: 'course',
      title: 'A recommended subject is missing',
      zhTitle: '缺少一门常被建议修的科目',
      when: 'anyInterestOptionalGap("i.field", record.subjects)',
      advice:
        'Not required, but commonly recommended, and missing from your list: ' +
        '{{optionalFields}}. Recommended subjects rarely decide an offer on their ' +
        'own, but they reduce the chance of needing catch-up units in first year.',
      zh:
        '以下科目并非必修、但常被建议修，而你的清单里没有：{{optionalFields}}。' +
        '建议科目很少单独决定录取，但能减少大一需要补修学分的可能。',
      modes: ['student', 'guest'],
      source: 'Confirm the prerequisite for each specific programme',
      verified: null,
    },
    {
      id: 'atar-margin-thin',
      domain: 'performance',
      title: 'Standing is close to a stated minimum',
      when: 'belowStatedMinimum("i.atarRequirement", record.estimatedAtar, T.atarMarginPoints)',
      advice: 'Your current standing sits within {{atarMarginPoints}} points of a ' +
        'minimum you recorded for one of your choices. A margin that thin is ' +
        'the zone where a single assessment moves the outcome, so treat the ' +
        'next one as decisive rather than as practice.',
      zh: '按目前水平，你距离自己记录的某个最低分只差 {{atarMarginPoints}} 分以内。这么薄的余量，一次考核就能改变结果，所以把下一场当作决定性的，而不是练手。',
      modes: ['student', 'guest'],
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'atar-figure-not-recorded',
      domain: 'destination',
      title: 'No minimum ATAR recorded for a stated choice',
      when: 'anyInterestMissing("i.atarRequirement")',
      advice: 'No minimum ATAR is recorded against at least one of your choices. ' +
        'Stated minimums move between admission rounds and differ by campus, so ' +
        'this tool will not supply a figure — read the current course page and ' +
        'record it, and the comparison becomes meaningful.',
      zh: '至少有一个志愿没有记录最低 ATAR。最低分会随录取轮次变动，校区之间也不同，所以本工具不会替你给一个数字——去查当前课程页面并填上，比较才有意义。',
      modes: ['student', 'guest'],
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'atar-vs-recorded-minimum',
      domain: 'performance',
      title: 'Standing against the recorded minimums for the stated interests',
      zhTitle: '与所填方向已记录最低分的对照',
      when: 'anyReachableCourse()',
      advice:
        'Among the courses recorded for your stated interests, your current standing of ' +
        '{{standing}} reaches {{reachableCourse}}. The nearest one above you is ' +
        '{{nearestCourse}}, {{atarGap}} points away. Those minimums are a snapshot and move ' +
        'every intake, so treat them as a starting point.',
      zh:
        '在你填写方向的已记录课程里，你当前 {{standing}} 的水平够得上 {{reachableCourse}}；' +
        '最近的一门在你之上的是 {{nearestCourse}}，差 {{atarGap}} 分。' +
        '这些最低分是快照，每轮都会变，只作起点参考。',
      modes: ['student', 'guest'],
      source: 'Verify the current minimum on the institution course page',
      verified: null,
    },
    {
      id: 'atar-below-all-recorded',
      domain: 'performance',
      title: 'Standing below every recorded minimum for the stated interests',
      zhTitle: '低于所填方向的全部已记录最低分',
      when: 'anyInterestHasCourses() && !anyReachableCourse()',
      advice:
        'Your current standing of {{standing}} does not reach any of the {{courseCount}} ' +
        'recorded minimums for your stated interests. The closest is {{nearestCourse}}, ' +
        '{{atarGap}} points above you. Better to know now, while there is still time to move ' +
        'either the target or the study plan.',
      zh:
        '你当前 {{standing}} 的水平，与你所填方向已记录的 {{courseCount}} 门课程最低分都还差一点。' +
        '最近的是 {{nearestCourse}}，高出 {{atarGap}} 分。' +
        '现在知道比成绩出来后再知道要好——无论是调整目标还是调整复习计划，都还来得及。',
      modes: ['student', 'guest'],
      source: 'Verify the current minimum on the institution course page',
      verified: null,
    },
    {
      id: 'wellbeing-plan',
      domain: 'wellbeing',
      title: 'Standing study guidance',
      when: 'true',
      advice: 'Two habits reliably separate students who hold their marks from those ' +
        'who lose them late: a written plan with dates rather than intentions, ' +
        'and practice under timed conditions rather than re-reading notes. ' +
        'Neither requires more hours than you are already spending.',
      zh: '有两件事能稳定地把成绩守住：一份**写明日期的计划**而不是「打算」，以及在**限时条件下做题**而不是反复看笔记。两者都不需要比现在多花时间。',
      modes: ['student', 'guest'],
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'wellbeing-overload',
      domain: 'wellbeing',
      title: 'Load may be excessive',
      when: 'record.subjects.length >= T.heavyLoadSubjects',
      advice: 'You have recorded {{subjectCount}} subjects. At that load the usual ' +
        'failure mode is not laziness but cumulative fatigue, which shows up as ' +
        'declining accuracy in familiar material. Build recovery into the plan ' +
        'on purpose.',
      zh: '你记录了 {{subjectCount}} 门科目。这种负担下常见的失败方式不是懒，而是累积疲劳——表现为熟悉的内容也开始出错。请主动把恢复时间排进计划。',
      modes: ['student', 'guest'],
      source: 'internal',
      verified: '2026-01-01',
    },
  ]

  /* --------------------------------------------------------------------------
   * 4. Assessment prioritisation matrix.
   *
   *    The original reduced every assessment to one advisory action via a
   *    two-dimensional lookup of importance against urgency. The mechanism is
   *    sound; the content choices below are original. Importance is derived
   *    automatically from the assessment's weight, so it cannot drift out of
   *    sync with the number it is based on.
   * ------------------------------------------------------------------------*/
  const importanceBands = [
    { max: 5, label: '1 — Trivial', zhLabel: '1 — 可忽略', level: 1 },
    { max: 10, label: '2 — Minor', zhLabel: '2 — 次要', level: 2 },
    { max: 15, label: '3 — Moderate', zhLabel: '3 — 中等', level: 3 },
    { max: 20, label: '4 — Major', zhLabel: '4 — 重要', level: 4 },
    { max: Infinity, label: '5 — Critical', zhLabel: '5 — 关键', level: 5 },
  ]

  // matrix[urgency][importance] — urgency 1 (low) .. 5 (critical).
  const matrix = {
    1: {
      1: 'Leave it; revisit only if time genuinely allows.',
      2: 'File the material for a short later pass.',
      3: 'Plan a short review in the coming weeks.',
      4: 'Schedule a focused session this week.',
      5: 'Plan a deep session; this carries real weight.',
    },
    2: {
      1: 'Skim only if the week stays clear.',
      2: 'Make a compact summary you can reuse.',
      3: 'Review tutorial material before the next topic lands.',
      4: 'Do practice questions, not just reading.',
      5: 'Book a block this week; do not leave it to chance.',
    },
    3: {
      1: 'Review only if something else falls through.',
      2: 'Short recap from your own notes.',
      3: 'Targeted review, then timed practice.',
      4: 'Begin practice papers under time pressure.',
      5: 'Start now — this one cannot be absorbed late.',
    },
    4: {
      1: 'Defer deliberately; it is not your bottleneck.',
      2: 'One focused hour, then reassess.',
      3: 'Prioritise over routine homework this week.',
      4: 'Do a full practice paper today.',
      5: 'Treat as urgent: revise and test yourself today.',
    },
    5: {
      1: 'Only if this is genuinely your lightest item.',
      2: 'Convert notes into a one-page recall sheet.',
      3: 'Prioritise over most other tasks immediately.',
      4: 'Full revision session within 48 hours.',
      5: 'Immediate, concentrated revision; attempt a mock now.',
    },
  }

  /* --------------------------------------------------------------------------
   * 5. ATAR <-> aggregate conversion.
   *
   *    CALIBRATION REQUIRED. The original embedded a fitted six-term
   *    polynomial with hard-coded coefficients. Those coefficients are its
   *    author's calibration against a particular exam cycle, so they are NOT
   *    reproduced here. This is a documented placeholder instead.
   *
   *    Replace `coefficients` with your own values fitted to your own official
   *    tables, then set `calibration.verified`. Until then `verified` is null
   *    and every surface using this function must say so — an uncalibrated
   *    conversion silently producing confident numbers is the single most
   *    dangerous failure this kind of tool can have.
   *
   *    Model: atar = c0 + c1*x + c2*x^2 + ... over x = sum of the best N
   *    subject marks. `aggregateSize` and `aggregateMax` define that sum.
   * ------------------------------------------------------------------------*/
  const calibration = {
    label: 'UNVERIFIED PLACEHOLDER — not fitted to any official data',
    verified: null,
    aggregateSize: 4,
    aggregateMax: 100,
    coefficients: [0, 0.05, 0.00125, -0.0000015], // illustrative shaping only
    clamp: [0, 99.95],
    caveat:
      'This conversion is an uncalibrated placeholder. Do not present its ' +
      'output as an ATAR estimate until it has been fitted to official data.',
  }

  /* --------------------------------------------------------------------------
   * 6. Public surface. The engine consumes only what is exported here.
   * ------------------------------------------------------------------------*/
  const uiStrings = {"zh": {"app_sub": "规则驱动 · 建议是数据，不是代码 · 全部内容在 advising-rules.js", "tab_student": "1 · 学生情况", "tab_report": "2 · 建议报告", "tab_tracker": "3 · 考核追踪", "tab_coverage": "4 · 规则总览", "sec_identity": "身份与学业状况", "sec_interests": "升学意向", "sec_subjects": "选课与成绩", "label_name": "姓名", "label_sid": "学号", "label_school": "Year 11 就读学校", "label_efl": "英语为母语", "label_intake": "曾就读的预科班次", "label_target": "目标 ATAR", "label_est": "当前预估 ATAR", "label_deciding": "仍在犹豫选什么专业", "label_funding": "学费来源已落实", "opt_unstated": "— 未填写 —", "opt_none": "— 无 —", "opt_yes": "是", "opt_no": "否", "col_country": "国家/地区", "col_field": "专业方向", "col_uni": "目标大学", "col_level": "班次", "col_subject": "科目", "col_mark": "成绩 (%)", "col_assessed": "已考权重 (%)", "btn_add_interest": "+ 增加一行", "btn_add_subject": "+ 增加一门", "btn_generate": "生成报告 →", "btn_save": "保存到本浏览器", "btn_load": "读取已保存", "btn_clear": "全部清空", "btn_sample": "载入示例学生", "btn_print": "打印 / 存为 PDF", "btn_copy": "复制为文本", "btn_download": "下载 .md", "report_title": "建议报告", "col_assessment": "考核项目", "col_weight": "权重 (%)", "col_due": "日期", "col_importance": "重要度", "col_urgency": "紧急度", "col_done": "完成", "col_action": "建议动作", "btn_add_assess": "+ 增加一项考核", "coverage_title": "规则总览", "col_domain": "类别", "tab_courses": "课程参考", "courses_title": "课程最低分参考", "col_uni_name": "院校", "col_course": "专业", "col_min_atar": "最低分", "col_req": "除分数外的要求", "col_source": "来源", "col_rule": "规则", "col_fired": "命中", "col_verified": "核实状态", "label_y11": "Year 11 成绩（每行一条：科目: 分数）", "label_prior": "往期班次成绩（每行一条：科目: 分数）"}, "en": {"app_sub": "rules-driven · advice is data, not code · all copy lives in advising-rules.js", "tab_student": "1 · Student record", "tab_report": "2 · Advising report", "tab_tracker": "3 · Assessment tracker", "tab_coverage": "4 · Rule coverage", "sec_identity": "Identity & standing", "sec_interests": "Destinations & academic interests", "sec_subjects": "Subjects & results", "label_name": "Full name", "label_sid": "Student ID", "label_school": "Year 11 school", "label_efl": "English is first language", "label_intake": "Previous intake attended", "label_target": "Target ATAR", "label_est": "Current estimated ATAR", "label_deciding": "Still deciding on a course", "label_funding": "Funding arrangement confirmed", "opt_unstated": "— not stated —", "opt_none": "— none —", "opt_yes": "Yes", "opt_no": "No", "col_country": "Country", "col_field": "Field", "col_uni": "Target university", "col_level": "Level", "col_subject": "Subject", "col_mark": "Mark (%)", "col_assessed": "Assessed (%)", "btn_add_interest": "+ Add row", "btn_add_subject": "+ Add subject", "btn_generate": "Generate report →", "btn_save": "Save to this browser", "btn_load": "Restore saved", "btn_clear": "Clear all", "btn_sample": "Load sample student", "btn_print": "Print / save as PDF", "btn_copy": "Copy as text", "btn_download": "Download as .md", "report_title": "Advising report", "col_assessment": "Assessment", "col_weight": "Weight (%)", "col_due": "Due", "col_importance": "Importance", "col_urgency": "Urgency", "col_done": "Done", "col_action": "Action", "btn_add_assess": "+ Add assessment", "coverage_title": "Rule coverage", "col_domain": "Domain", "tab_courses": "Course reference", "courses_title": "Recorded minimums", "col_uni_name": "Institution", "col_course": "Course", "col_min_atar": "Min.", "col_req": "Requirements beyond the score", "col_source": "Source", "col_rule": "Rule", "col_fired": "Fired", "col_verified": "Verification", "label_y11": "Year 11 results (one per line: Subject: mark)", "label_prior": "Prior intake results (one per line: Subject: mark)"}}

  return {
    uiStrings,
    domains,
    vocabularies,
    rules,
    thresholds,
    capabilities,
    courseExpectations,
    importanceBands,
    matrix,
    zhMatrix,
    calibration,
    meta: {
      title: 'Student Advising Workbook',
      subtitle: 'Rules-driven advising report',
      version: '1.0.0',
      contentPolicy:
        'All advice text in this file is original sample copy. All figures are ' +
        'placeholders pending verification against official sources.',
    },
  }
})()
