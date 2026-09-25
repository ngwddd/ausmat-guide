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
    { id: 'completeness', label: 'Submission completeness', order: 10 },
    { id: 'destination', label: 'Destination & applications', order: 20 },
    { id: 'course', label: 'Course-specific requirements', order: 30 },
    { id: 'language', label: 'Language proficiency', order: 40 },
    { id: 'funding', label: 'Scholarships & funding', order: 50 },
    { id: 'performance', label: 'Academic performance', order: 60 },
    { id: 'wellbeing', label: 'Study approach & wellbeing', order: 70 },
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
      label: 'Mathematics',
      subjects: ['Mathematics', 'Mathematics Methods', 'Mathematics Specialist', 'Add Maths', 'Additional Mathematics'],
    },
    physicalScience: {
      label: 'a physical science',
      subjects: ['Physics', 'Chemistry'],
    },
    chemistry: {
      label: 'Chemistry',
      subjects: ['Chemistry'],
    },
    biology: {
      label: 'Biology',
      subjects: ['Biology', 'Human Biology'],
    },
    english: {
      label: 'English',
      subjects: ['English', 'English as First Language', 'English as Second Language', 'English Literature'],
    },
    computing: {
      label: 'Computing',
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
      expects: ['mathematics', 'physicalScience'],
      optional: ['chemistry'],
      namedAtar: null,
      source: 'Confirm each programme’s assumed-knowledge statement',
      verified: null,
    },
    'Computer Science': {
      expects: ['mathematics'],
      optional: ['computing', 'physicalScience'],
      namedAtar: null,
      source: 'Confirm each programme’s prerequisite statement',
      verified: null,
    },
    Medicine: {
      expects: ['chemistry', 'english'],
      optional: ['biology', 'mathematics'],
      namedAtar: null,
      source: 'Confirm prerequisites and admissions-test requirements per university',
      verified: null,
    },
    Dentistry: {
      expects: ['chemistry'],
      optional: ['biology', 'mathematics'],
      namedAtar: null,
      source: 'Confirm prerequisites and admissions-test requirements per university',
      verified: null,
    },
    Nursing: {
      expects: ['english'],
      optional: ['biology', 'mathematics'],
      namedAtar: null,
      source: 'Confirm per-institution English and science requirements',
      verified: null,
    },
    Sciences: {
      expects: ['mathematics'],
      optional: ['chemistry', 'physicalScience', 'biology'],
      namedAtar: null,
      source: 'Confirm the prerequisites of the specific science programme',
      verified: null,
    },
    Psychology: {
      expects: ['english'],
      optional: ['mathematics', 'biology'],
      namedAtar: null,
      source: 'Confirm per-institution prerequisites',
      verified: null,
    },
    Business: {
      expects: [],
      optional: ['mathematics'],
      namedAtar: null,
      source: 'Confirm per-institution prerequisites',
      verified: null,
    },
    Law: {
      expects: [],
      optional: ['english'],
      namedAtar: null,
      source: 'Confirm per-institution prerequisites and any admissions test',
      verified: null,
    },
    Architecture: {
      expects: ['mathematics'],
      optional: ['physicalScience'],
      namedAtar: null,
      source: 'Confirm per-institution prerequisites, including any portfolio',
      verified: null,
    },
    Education: {
      expects: ['english'],
      optional: ['mathematics'],
      namedAtar: null,
      source: 'Confirm per-institution prerequisites',
      verified: null,
    },
    Humanities: {
      expects: ['english'],
      optional: [],
      namedAtar: null,
      source: 'Confirm per-institution prerequisites',
      verified: null,
    },
    Undecided: {
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
      when: "!record.fullName || !record.year11School || record.subjects.length === 0",
      advice:
        'This report is provisional because required fields are still blank. ' +
        'Advisor guidance is only as good as the information behind it.',
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'subjects-fewer-than-four',
      domain: 'completeness',
      title: 'Fewer than four ATAR subjects recorded',
      when: 'record.subjects.length > 0 && record.subjects.length < T.subjectsForAggregate',
      advice:
        'You have recorded {{subjectCount}} ATAR subject(s). Most university ' +
        'aggregates are calculated from four or more, so confirm which subjects ' +
        'will count toward your aggregate.',
      source: 'Confirm the aggregate rules for your qualification',
      verified: null,
    },

    {
      id: 'dest-none-stated',
      domain: 'destination',
      title: 'No destination country given',
      when: 'record.interests.length === 0',
      advice:
        'No destination country has been recorded. Without one, visa timelines, ' +
        'language requirements and application deadlines cannot be assessed.',
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'dest-uk',
      domain: 'destination',
      title: 'United Kingdom destination',
      when: 'anyInterest("i.country", "United Kingdom")',
      advice:
        'Applications to the United Kingdom go through a central admissions ' +
        'service rather than directly to each university. Expect to supply an ' +
        'academic reference and a personal statement, and note that a single ' +
        'application covers several choices. Confirm the current cycle deadlines ' +
        'with your advisor before you start writing.',
      source: 'Check the current admissions-service cycle deadlines',
      verified: null,
    },
    {
      id: 'dest-us',
      domain: 'destination',
      title: 'United States destination',
      when: 'anyInterest("i.country", "United States")',
      advice:
        'United States applications typically require standardised testing, ' +
        'essays, and references requested months in advance. Each university ' +
        'has its own form, so plan for several parallel applications.',
      source: 'Check each university’s admissions requirements',
      verified: null,
    },
    {
      id: 'dest-au',
      domain: 'destination',
      title: 'Australia destination',
      when: 'anyInterest("i.country", "Australia")',
      advice:
        'Australian applications are generally made per institution or through ' +
        'a state admissions centre. Offer rounds are scheduled, so the timing of ' +
        'your results release matters as much as the marks themselves.',
      source: 'Check the relevant state admissions centre schedule',
      verified: null,
    },

    {
      id: 'course-medicine',
      domain: 'course',
      title: 'Medicine or dentistry pathway',
      when: 'anyInterest("i.field", ["Medicine", "Dentistry"])',
      advice:
        'Medical and dental programmes usually add an aptitude or admissions ' +
        'test on top of academic results, and some institutions also interview. ' +
        'Registration windows for those tests close well before the application ' +
        'deadline, so this is the earliest item on your timeline.',
      source: 'Confirm test requirements and registration windows per university',
      verified: null,
    },
    {
      id: 'course-law',
      domain: 'course',
      title: 'Law pathway',
      when: 'anyInterest("i.field", "Law")',
      advice:
        'Law programmes often have no fixed subject prerequisites, but some ' +
        'jurisdictions require an additional admissions test. Confirm whether ' +
        'the universities you are considering require one.',
      source: 'Confirm per-university admissions test requirements',
      verified: null,
    },
    {
      id: 'course-engineering',
      domain: 'course',
      title: 'Engineering pathway',
      when: 'anyInterest("i.field", "Engineering")',
      advice:
        'Engineering degrees normally assume a strong mathematics background, ' +
        'and several expect physics as well. Check the assumed-knowledge ' +
        'statement for each programme rather than relying on the entry score alone.',
      source: 'Check each programme’s assumed knowledge statement',
      verified: null,
    },
    {
      id: 'course-undecided',
      domain: 'course',
      title: 'Field of study still undecided',
      when: 'record.interests.length === 0 || anyInterest("i.field", "Undecided") || record.stillDeciding === true',
      advice:
        'Being undecided at this stage is normal and workable. The useful move ' +
        'is to narrow by constraint rather than by preference: which subjects you ' +
        'are strongest in, which countries you can fund, and which prerequisite ' +
        'subjects you would need to keep open. Narrowing those three usually ' +
        'removes most of the field.',
      source: 'internal',
      verified: '2026-01-01',
    },

    {
      id: 'lang-non-english-destination',
      domain: 'language',
      title: 'Destination language may not be English',
      when: 'record.interests.length > 0 && !anyInterest("i.country", ["Australia","United Kingdom","United States","Canada","Ireland","New Zealand"])',
      advice:
        'Your stated destinations are not predominantly English-speaking. ' +
        'Programmes taught in another language normally require a proficiency ' +
        'certificate in that language, which takes time to obtain.',
      source: 'Confirm the language of instruction and required certificate',
      verified: null,
    },
    {
      id: 'lang-english-test',
      domain: 'language',
      title: 'English proficiency evidence may be required',
      when: 'anyInterest("i.country", ["Australia","United Kingdom","United States","Canada","Ireland","New Zealand"]) && record.englishFirstLanguage !== true',
      advice:
        'Where English is not your first language, many institutions require a ' +
        'standardised English test, though some accept a qualifying result in an ' +
        'English subject instead. Requirements differ by institution and by ' +
        'course — clinical courses are usually the strictest.',
      source: 'Confirm per-institution English requirements',
      verified: null,
    },

    {
      id: 'funding-not-recorded',
      domain: 'funding',
      title: 'Funding not recorded',
      when: 'record.fundingSecured !== true',
      advice:
        'No funding arrangement has been recorded. Scholarship deadlines usually ' +
        'fall earlier than admission deadlines, so funding deserves its own ' +
        'timeline rather than being left until an offer arrives.',
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'funding-west-au',
      domain: 'funding',
      title: 'Western Australia institutions selected',
      when: 'anyInterest("i.country", "Australia")',
      advice:
        'Several Western Australian universities appear in your selections. ' +
        'That state operates scholarship and bursary programmes aimed at ' +
        'international graduates of its school qualification. Amounts, quotas ' +
        'and eligibility change between rounds — treat any figure you have heard ' +
        'as unconfirmed until you read the current program page.',
      source: 'Read the current state scholarship programme page',
      verified: null,
    },

    {
      id: 'perf-below-target',
      domain: 'performance',
      title: 'Current standing below stated target',
      when: 'record.targetAtar !== null && record.estimatedAtar !== null && record.estimatedAtar < record.targetAtar - T.targetGapPoints',
      advice:
        'Your current standing places you below your stated target of ' +
        '{{targetAtar}}. This is a gap to plan around, not a verdict. The ' +
        'practical question is whether the remaining assessments carry enough ' +
        'weight for the target to remain reachable — if they do not, adjusting ' +
        'the target now is better than discovering it at results release.',
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'perf-subject-weak',
      domain: 'performance',
      title: 'A subject result is materially weak',
      when: 'anyScoreBelow(T.weakMark)',
      advice:
        'At least one subject result sits below {{weakMark}}. Before adding study ' +
        'hours everywhere, identify whether the weakness is content knowledge, exam ' +
        'technique, or time management — each needs a different fix. Reviewing ' +
        'marked scripts usually answers this faster than more revision does.',
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'perf-prior-intake-underperformed',
      domain: 'performance',
      title: 'Prior intake result below 55',
      when: 'record.previousIntake !== null && anyValueBelow(record.priorResults, T.priorIntakeWeakMark)',
      advice:
        'A subject taken in an earlier intake came in below {{priorIntakeWeakMark}}. ' +
        'Note that an earlier intake usually covers only part of the full syllabus, so the ' +
        'result is not a projection of your final outcome — but the same subject ' +
        'in the main intake is the place to apply what that result taught you.',
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'perf-high-at-load',
      domain: 'performance',
      title: 'Every recorded subject is an advanced-level subject',
      when: 'record.subjects.length >= T.subjectsForAggregate && countSubject("AT") === record.subjects.length',
      advice:
        'All {{subjectCount}} of your recorded subjects are at the highest ' +
        'available level. That is a demanding load, and the aggregate advantage ' +
        'only materialises if the marks hold up across all of them. Watch for ' +
        'one subject degrading to protect the others.',
      source: 'internal',
      verified: '2026-01-01',
    },

    {
      id: 'course-prereq-gap',
      domain: 'course',
      title: 'A stated prerequisite is not among the recorded subjects',
      when: 'anyInterestExpectationGap("i.field", record.subjects)',
      advice:
        'At least one of your chosen fields normally expects preparation you ' +
        'have not recorded. Requirements differ between institutions and ' +
        'between programmes inside one institution, so confirm the exact ' +
        'prerequisite for each course you are considering before assuming the ' +
        'gap is fatal — some accept a bridging unit instead.',
      source: 'Confirm the prerequisite for each specific programme',
      verified: null,
    },
    {
      id: 'course-prereq-optional-available',
      domain: 'course',
      title: 'An optional subject would strengthen the application',
      when: 'anyInterestOptionalGap("i.field", record.subjects)',
      advice:
        'For at least one of your fields, a subject that is not required but is ' +
        'commonly recommended is missing from your list. Recommended subjects ' +
        'rarely decide an offer on their own, but they reduce the chance of ' +
        'needing catch-up units in first year.',
      source: 'Confirm whether the recommendation applies at your target institutions',
      verified: null,
    },
    {
      id: 'atar-margin-thin',
      domain: 'performance',
      title: 'Standing is close to a stated minimum',
      when: 'belowStatedMinimum("i.atarRequirement", record.estimatedAtar, T.atarMarginPoints)',
      advice:
        'Your current standing sits within {{atarMarginPoints}} points of a ' +
        'minimum you recorded for one of your choices. A margin that thin is ' +
        'the zone where a single assessment moves the outcome, so treat the ' +
        'next one as decisive rather than as practice.',
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'atar-figure-not-recorded',
      domain: 'destination',
      title: 'No minimum ATAR recorded for a stated choice',
      when: 'anyInterestMissing("i.atarRequirement")',
      advice:
        'No minimum ATAR is recorded against at least one of your choices. ' +
        'Stated minimums move between admission rounds and differ by campus, so ' +
        'this tool will not supply a figure — read the current course page and ' +
        'record it, and the comparison becomes meaningful.',
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'wellbeing-plan',
      domain: 'wellbeing',
      title: 'Standing study guidance',
      when: 'true',
      advice:
        'Two habits reliably separate students who hold their marks from those ' +
        'who lose them late: a written plan with dates rather than intentions, ' +
        'and practice under timed conditions rather than re-reading notes. ' +
        'Neither requires more hours than you are already spending.',
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'wellbeing-overload',
      domain: 'wellbeing',
      title: 'Load may be excessive',
      when: 'record.subjects.length >= T.heavyLoadSubjects',
      advice:
        'You have recorded {{subjectCount}} subjects. At that load the usual ' +
        'failure mode is not laziness but cumulative fatigue, which shows up as ' +
        'declining accuracy in familiar material. Build recovery into the plan ' +
        'on purpose.',
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
    { max: 5, label: '1 — Trivial', level: 1 },
    { max: 10, label: '2 — Minor', level: 2 },
    { max: 15, label: '3 — Moderate', level: 3 },
    { max: 20, label: '4 — Major', level: 4 },
    { max: Infinity, label: '5 — Critical', level: 5 },
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
  return {
    domains,
    vocabularies,
    rules,
    thresholds,
    capabilities,
    courseExpectations,
    importanceBands,
    matrix,
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
