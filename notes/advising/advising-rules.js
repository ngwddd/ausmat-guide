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
    { id: 'skills', label: 'Skills & readiness', zhLabel: '技能与准备度', order: 70 },
    { id: 'wellbeing', label: 'Study approach & wellbeing', zhLabel: '学习方式与状态', order: 80 },
  ]

  /* --------------------------------------------------------------------------
   * 1b. Field roadmap.
   *
   *    The source workbook has a SKILLS ROADMAP sheet shaped as one template per
   *    field: careers, supercurricular activities, the skills that matter, and
   *    why the field is future-proof. Only one field is filled in there. This is
   *    the same SHAPE with our own copy for the fields the form offers, so the
   *    module is general rather than a single worked example.
   *
   *    Entries are keyed by the same field vocabulary the form uses, so a typo in
   *    a key means the module goes silent for that field. The build asserts every
   *    vocabulary field has an entry.
   * ------------------------------------------------------------------------*/
  const roadmap = {
    "Medicine": {
      "en": {
        "careers": "clinical practice, surgery, general practice, medical research, public health, and the specialties that branch off each of them.",
        "activities": "first-aid and St John qualifications, volunteering in a care setting, hospital or hospice observation weeks, and any sustained commitment where you are responsible for someone else.",
        "skills": "scientific reasoning under uncertainty, communication with people who are frightened, and the stamina to keep studying for a decade.",
        "why": "Demand is driven by population ageing and it is one of the few fields where the qualification travels across borders."
      },
      "zh": {
        "careers": "临床、外科、全科、医学研究、公共卫生，以及从这些方向分出去的各个专科。",
        "activities": "急救与 St John 证书、在照护机构做志愿者、医院或临终关怀机构的见习周，以及任何一段你真正对别人负责的长期投入。",
        "skills": "在信息不全时做科学判断、和害怕的人沟通，以及能连续读十年书的耐力。",
        "why": "需求由人口老龄化推动，而且它是少数几个资格能跨国使用的领域之一。"
      }
    },
    "Dentistry": {
      "en": {
        "careers": "general dental practice, orthodontics, oral surgery, paediatric dentistry, and dental public health.",
        "activities": "manual dexterity work you can show (instrument, craft or model-making), shadowing a practice, and health volunteering.",
        "skills": "fine motor control, working seated at close range for long stretches, and explaining procedures to nervous patients.",
        "why": "Small cohorts and high demand keep it competitive, but the work is steady and largely independent of economic cycles."
      },
      "zh": {
        "careers": "全科牙医、正畸、口腔外科、儿童牙科，以及口腔公共卫生。",
        "activities": "能拿得出手的手工精细活（乐器、手作或模型制作）、在牙科诊所见习、医疗类志愿服务。",
        "skills": "精细动作控制、长时间近距离坐姿操作，以及向紧张的病人解释治疗过程。",
        "why": "招生人数少、需求高，所以竞争激烈；但执业稳定，基本不受经济周期影响。"
      }
    },
    "Law": {
      "en": {
        "careers": "solicitor or barrister work, in-house counsel, policy, regulation, and the compliance side of any large organisation.",
        "activities": "mooting, debating, a school or community legal centre, and reading a judgment properly rather than a summary of it.",
        "skills": "reading a dense document and extracting what actually matters, writing an argument someone can follow, and disagreeing without escalating.",
        "why": "The core skill is applied reasoning on text, which moves easily into policy, technology regulation and management."
      },
      "zh": {
        "careers": "事务律师或出庭律师、企业法务、政策、监管，以及任何大型机构的合规岗位。",
        "activities": "模拟法庭、辩论、学校或社区法律中心，以及完整读一份判决书而不是读摘要。",
        "skills": "从冗长文件里读出真正要紧的部分、把论证写到别人能跟上，以及在对立中不升级冲突。",
        "why": "核心能力是对文本做应用推理，这套能力转向政策、技术监管和管理都很顺。"
      }
    },
    "Engineering": {
      "en": {
        "careers": "design and build roles across civil, mechanical, electrical, chemical and biomedical work, plus project and systems engineering.",
        "activities": "a physical project you finished and can talk about (robotics, Arduino, a repair, a build), and maths or physics competitions.",
        "skills": "turning a vague requirement into a specification, estimating before measuring, and documenting your own work so someone else can use it.",
        "why": "It is the most directly transferable technical degree: the same modelling skills apply to infrastructure, energy and medicine."
      },
      "zh": {
        "careers": "土木、机械、电气、化工、生物医学等方向的设计与建造岗，以及项目与系统工程。",
        "activities": "一个你真做完并能讲清楚的项目（机器人、Arduino、一次维修或搭建），以及数学或物理竞赛。",
        "skills": "把模糊需求变成规格书、先估算再测量，以及把自己做的东西写成别人能接着用的文档。",
        "why": "它是最容易迁移的技术学位：同一套建模能力可以用在基础设施、能源和医疗上。"
      }
    },
    "Computer Science": {
      "en": {
        "careers": "software engineering, data and machine learning, security, infrastructure, and research.",
        "activities": "a public repository with real commit history, a project that other people actually use, and competitive programming if you enjoy it.",
        "skills": "breaking an ambiguous problem into parts you can test, reading code you did not write, and finishing things.",
        "why": "The demand is broad rather than deep, so the field absorbs people with strong fundamentals even when specific tools change."
      },
      "zh": {
        "careers": "软件工程、数据与机器学习、安全、基础设施，以及研究岗。",
        "activities": "一个有真实提交记录的公开仓库、一个真有人用的项目，以及你确实喜欢的算法竞赛。",
        "skills": "把模糊问题拆成可测试的小块、读别人写的代码，以及把东西做完。",
        "why": "需求广而不窄，所以只要基本功扎实，具体工具换代也不影响你被需要。"
      }
    },
    "Business": {
      "en": {
        "careers": "accounting and finance, consulting, operations, marketing, and general management.",
        "activities": "running something with a budget or a team, a part-time job with real responsibility, and any competition where you had to present or defend a number.",
        "skills": "reading a set of accounts, writing persuasively in plain language, and building a spreadsheet that someone else can audit.",
        "why": "It is a generalist degree whose value comes from what you do alongside it, so the activities matter more here than the marks."
      },
      "zh": {
        "careers": "会计与金融、咨询、运营、市场，以及综合管理。",
        "activities": "管过一笔预算或一个团队、一份真有责任的兼职，以及任何需要你讲清或守住一个数字的比赛。",
        "skills": "看懂一套账、用平实语言写出有说服力的文字，以及做出别人能复核的表格。",
        "why": "它是通识型学位，价值来自你在它之外做了什么，所以这个领域里经历比分数更被看。"
      }
    },
    "Psychology": {
      "en": {
        "careers": "clinical and counselling psychology, organisational psychology, research, and the behavioural side of policy and product work.",
        "activities": "volunteering that involves listening to people in difficulty, and reading a study properly enough to say what it does not show.",
        "skills": "statistical literacy, interviewing without leading, and holding your own reaction back while someone describes something hard.",
        "why": "Behavioural evidence is now expected in policy, health and product design, which widened the field beyond clinical practice."
      },
      "zh": {
        "careers": "临床与咨询心理、组织心理、研究，以及政策与产品里的行为科学岗位。",
        "activities": "需要倾听困境中的人的志愿服务，以及能把一篇研究读到说得出「它没有证明什么」。",
        "skills": "统计素养、不带引导地访谈，以及在别人讲述难事时稳住自己的反应。",
        "why": "现在政策、健康和产品设计都要行为证据，这个领域早已超出临床执业的范围。"
      }
    },
    "Nursing": {
      "en": {
        "careers": "hospital and community nursing, midwifery, critical care, mental health nursing, and clinical education.",
        "activities": "a care-related volunteering role, first aid training, and any job where you handled a shift roster and did not drop it.",
        "skills": "prioritising several urgent things at once, recording accurately under time pressure, and recovering between difficult shifts.",
        "why": "Consistently short-staffed, geographically mobile, and one of the fastest routes from a degree to secure professional work."
      },
      "zh": {
        "careers": "医院与社区护理、助产、重症护理、精神科护理，以及临床教学。",
        "activities": "与照护相关的志愿岗位、急救培训，以及任何需要你顶住排班且没有掉链子的工作。",
        "skills": "同时处理多件急事时的排序能力、在时间压力下准确记录，以及在难熬的班次之间恢复。",
        "why": "长期缺人、地点流动性强，而且是从学位到稳定专业工作最快的路径之一。"
      }
    },
    "Architecture": {
      "en": {
        "careers": "architectural practice, urban design and planning, heritage and conservation, and construction project leadership.",
        "activities": "a portfolio, not a certificate: drawings, models, photographs of a space you designed, and a build you helped on.",
        "skills": "drawing to explain rather than to decorate, spatial reasoning, and taking criticism on work you spent weeks on.",
        "why": "Cities are being retrofitted rather than only expanded, which keeps the work close to energy, planning and policy."
      },
      "zh": {
        "careers": "建筑设计、城市设计与规划、遗产保护，以及建造项目的带队工作。",
        "activities": "作品集而不是证书：图纸、模型、你设计过的空间的照片，以及你参与过的实际建造。",
        "skills": "用图解释而不是用图装饰、空间推理，以及承受别人对你做了几周的东西提出批评。",
        "why": "城市正在被改造而不只是扩张，这让这份工作紧贴能源、规划和政策。"
      }
    },
    "Sciences": {
      "en": {
        "careers": "laboratory and field research, data science, medical and environmental technology, and science communication.",
        "activities": "a sustained investigation of your own (even a small one), and reading primary papers rather than textbooks alone.",
        "skills": "designing a fair test, quantifying your own uncertainty, and writing up a result that did not go the way you wanted.",
        "why": "The degree is a method rather than a job title, which is why it converts into research, industry and teaching alike."
      },
      "zh": {
        "careers": "实验室与野外研究、数据科学、医疗与环境技术，以及科学传播。",
        "activities": "一次属于你自己的持续探究（哪怕很小），以及读原始论文而不只是读教材。",
        "skills": "设计公平的对照、量化你自己的不确定度，以及把一个没做出预期结果的实验写清楚。",
        "why": "这个学位给的是一套方法而不是一个职位名，所以它同样能转向研究、产业和教学。"
      }
    },
    "Humanities": {
      "en": {
        "careers": "policy and public administration, law, journalism and editing, teaching, and cultural institutions.",
        "activities": "editing or running a publication, a long essay you are proud of, and debate or model UN if the speaking appeals to you.",
        "skills": "arguing from evidence rather than assertion, reading a whole book closely, and writing to a length limit without padding.",
        "why": "It trains judgement on ambiguous material, which is the part of white-collar work least likely to be automated away."
      },
      "zh": {
        "careers": "政策与公共行政、法律、新闻与编辑、教学，以及文化机构。",
        "activities": "编辑或运营一份刊物、一篇你自己满意的长文，以及如果你喜欢表达就去辩论或模联。",
        "skills": "用证据支撑观点而不是断言、把一整本书读细，以及在字数限制内写完不注水。",
        "why": "它训练的是面对模糊材料时的判断力，而这正是白领工作里最不容易被自动化取代的部分。"
      }
    },
    "Education": {
      "en": {
        "careers": "school teaching, curriculum and assessment design, educational psychology, and learning technology.",
        "activities": "tutoring or coaching that lasted a term or more, and any role where you were responsible for a group of younger people.",
        "skills": "explaining one idea three different ways, managing a room, and assessing what someone actually misunderstood.",
        "why": "Shortages are structural in most systems, and the qualification transfers across countries more easily than most."
      },
      "zh": {
        "careers": "学校教学、课程与评估设计、教育心理，以及学习技术。",
        "activities": "持续一个学期以上的家教或带训，以及任何你真正对一群更年轻的人负责的角色。",
        "skills": "把同一个概念用三种方式讲清楚、管理一间教室，以及判断对方到底哪里理解错了。",
        "why": "多数体系里师资短缺是结构性的，而且这个资格比大多数专业更容易跨国使用。"
      }
    }
  }

  /* --------------------------------------------------------------------------
   * 1c. Pathways and timelines.
   *
   *    The source workbook's OPTIONS AND OPPORTUNITIES sheet is a set of pathway
   *    blocks (study in Australia, TAFE, UK applications), each with a short
   *    orientation and a "useful links" column pointing at the official service.
   *    The links are the useful part and they are public services, so they are
   *    reproduced here as entry points; the surrounding prose is ours.
   *
   *    Every link below was requested and checked. Dead ones are removed rather
   *    than shipped hopeful — a broken official link is worse than no link.
   * ------------------------------------------------------------------------*/
  const opportunities = {
    "pathways": {
      "en": [
        {
          "key": "foundation",
          "text": "A foundation or pathway year at the destination institution, which is the usual route when the qualification you hold is not recognised directly.",
          "links": [
            {
              "label": "Studies in Australia",
              "url": "https://www.studiesinaustralia.com/",
              "check": "ok"
            }
          ]
        },
        {
          "key": "tafe",
          "text": "A vocational or diploma route into a degree, which often carries credit and can be entered with lower academic requirements.",
          "links": [
            {
              "label": "TAFE International WA",
              "url": "https://www.tafeinternational.wa.edu.au/",
              "check": "ok"
            }
          ]
        },
        {
          "key": "course-search",
          "text": "Searching by the published admission criteria rather than by course name, so you compare the actual numbers instead of the marketing.",
          "links": [
            {
              "label": "Course Seeker",
              "url": "https://www.courseseeker.edu.au/",
              "check": "ok"
            }
          ]
        }
      ],
      "zh": [
        {
          "key": "foundation",
          "text": "在目标院校读预科或衔接年——当你手上的学历不被直接承认时，这是通常的路径。",
          "links": [
            {
              "label": "Studies in Australia",
              "url": "https://www.studiesinaustralia.com/",
              "check": "ok"
            }
          ]
        },
        {
          "key": "tafe",
          "text": "先读职业或文凭课程再进学位——通常能带学分，入学学术要求也更低。",
          "links": [
            {
              "label": "TAFE International WA",
              "url": "https://www.tafeinternational.wa.edu.au/",
              "check": "ok"
            }
          ]
        },
        {
          "key": "course-search",
          "text": "按公布的录取标准而不是按专业名称去搜，这样你比较的是真实数字而不是宣传语。",
          "links": [
            {
              "label": "Course Seeker",
              "url": "https://www.courseseeker.edu.au/",
              "check": "ok"
            }
          ]
        }
      ]
    },
    "timelines": {
      "Australia": {
        "en": "Australia: applications go through the state admissions centre or the institution directly, and offers are released in rounds, so the timing of your results matters as much as the marks.",
        "zh": "澳洲：申请走州招生中心或直接向院校递交，录取是分轮次放榜的，所以成绩出来的时间点和分数本身一样重要。"
      },
      "United Kingdom": {
        "en": "United Kingdom: one application through UCAS covers five choices, the personal statement is written months ahead, and there is a firm deadline rather than rolling offers.",
        "zh": "英国：通过 UCAS 一份申请填五个志愿，个人陈述要提前几个月写，而且是有硬性截止日期的，不像滚动录取。"
      },
      "United States": {
        "en": "United States: each institution has its own application, early rounds close in November, and testing and essays are prepared the year before.",
        "zh": "美国：每所院校各自一套申请，早申轮次在 11 月截止，考试和文书要提前一年准备。"
      },
      "Malaysia": {
        "en": "Malaysia: intakes are usually January and September, and institutions assess directly, so the timeline is driven by the intake you target.",
        "zh": "马来西亚：入学通常是 1 月和 9 月，由院校直接审核，所以时间线取决于你瞄准哪一季入学。"
      },
      "Canada": {
        "en": "Canada: provincial systems differ, most deadlines fall between January and March, and some programmes require supplementary applications.",
        "zh": "加拿大：各省体系不同，多数截止日期在 1 月到 3 月之间，部分专业还要额外面试或补充申请。"
      }
    }
  }

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
    /* ── prerequisites named by an actual course ───────────────────────────
     * The generic prereq rule above works from a field-level expectation table.
     * This one is narrower and stronger: it reads the subject names that the
     * institution's own requirement line states, so the gap it reports is the
     * one that course documents rather than one this project assumed. Only 8 of
     * the 54 recorded courses name a subject at all, which is why this reports
     * nothing for most fields — silence here is the honest answer, not a gap. */
    {
      id: 'course-prereq-named',
      domain: 'course',
      title: 'A recorded course names a subject you have not taken',
      when: 'anyNamedPrereqMissing()',
      advice: 'Some courses recorded for your stated interest name a specific subject ' +
        'as a prerequisite, and your subject list does not include it: ' +
        '{{namedPrereqGaps}} This is the institution\'s own wording rather than a ' +
        'general expectation, so it is worth confirming on the course page before ' +
        'you change anything.',
      zh: '你所填方向里已记录的课程中，有几门**明确点名了先修科目**，而你的选课里没有：{{namedPrereqGaps}}这是院校自己写的措辞，不是本工具的通用推测，所以改选课之前值得先去课程页确认一遍。',
      modes: ['student', 'guest'],
      source: 'The requirement line on each institution course page',
      verified: null,
    },

    /* ── the skills and readiness module ───────────────────────────────────
     * Replaces the workbook's SKILLS ROADMAP sheet. It fires only when the
     * student has named a field, because a roadmap is per-field by construction;
     * with no field there is nothing specific and true to say, and a generic
     * paragraph would be filler. */
    {
      id: 'skills-roadmap',
      domain: 'skills',
      title: 'Careers, activities and skills for the stated field',
      when: 'roadmapFor()',
      advice: '{{roadmapField}} — what the work actually involves: {{roadmapCareers}} ' +
        'Beyond marks, these are what distinguish applicants: {{roadmapActivities}} ' +
        'Skills worth building deliberately: {{roadmapSkills}} {{roadmapWhy}}',
      zh: '{{roadmapField}}——这份工作实际在做什么：{{roadmapCareers}}分数之外，区分申请人的是这些：{{roadmapActivities}}值得刻意培养的能力：{{roadmapSkills}}{{roadmapWhy}}',
      modes: ['student', 'guest'],
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'skills-narrowness',
      domain: 'skills',
      title: 'A single narrow interest deserves a second option',
      when: 'record.interests.length === 1 && !!record.interests[0].field && record.interests[0].field !== "Undecided"',
      advice: 'You have recorded one field of interest. That is not a problem, but a ' +
        'single narrow target is the plan most likely to need a fallback: ' +
        'admissions are decided by cohorts you cannot see, and a course that is ' +
        'reachable this year may not be next. Name one adjacent field you would ' +
        'also accept, and check that your subjects keep it open.',
      zh: '你只记录了一个专业方向。这本身没问题，但单一而窄的目标恰恰是最需要备选方案的：录取由你看不见的那一届人决定，今年够得上的课程，明年不一定。再写一个你同样能接受的相邻方向，并确认你的选课没有把它关掉。',
      modes: ['student', 'guest'],
      source: 'internal',
      verified: '2026-01-01',
    },
    {
      id: 'options-pathways',
      domain: 'destination',
      title: 'Routes that are not the direct degree',
      when: 'true',
      advice: 'A direct degree entry is one route, not the only one. {{optionsList}} ' +
        'The reason to look now rather than in August is that these routes have ' +
        'their own deadlines, and several of them start earlier than the degree ' +
        'application does.',
      zh: '直接读学位是一条路，不是唯一一条。{{optionsList}}建议现在就看而不是等到八月：这些路径有自己的截止日期，其中几条比学位申请开始得更早。',
      modes: ['student', 'guest'],
      source: 'Verify each service page; links are entry points, not deadlines',
      verified: null,
    },
    {
      id: 'options-timeline',
      domain: 'destination',
      title: 'Application timelines for the stated destinations',
      when: 'timelineFor()',
      advice: '{{timelineList}} Deadlines move every cycle, so treat these as the ' +
        'shape of the year rather than the dates: the point is that the work ' +
        'starts well before the application does.',
      zh: '{{timelineList}}截止日期每轮都会变，所以把这些当成一年的形状而不是具体日子：要紧的是这份工作远早于申请本身开始。',
      modes: ['student', 'guest'],
      source: 'Verify dates on the official service each cycle',
      verified: null,
    },

    {
      id: 'atar-vs-recorded-minimum',
      domain: 'performance',
      title: 'Standing against the recorded minimums for the stated interests',
      zhTitle: '与所填方向已记录最低分的对照',
      when: 'anyReachableCourse()',
      advice:
        'Among the courses recorded for your stated interests, your current standing of ' +
        '{{standing}} reaches {{reachableCourse}}.{{#if nearestCourse}} The nearest one ' +
        'above you is {{nearestCourse}}, {{atarGap}} points away.{{/if}} Those minimums ' +
        'are a snapshot and move every intake, so treat them as a starting point.',
      zh:
        '在你填写方向的已记录课程里，你当前 {{standing}} 的水平够得上 {{reachableCourse}}。' +
        '{{#if nearestCourse}}最近的一门在你之上的是 {{nearestCourse}}，差 {{atarGap}} 分。{{/if}}' +
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
   *    HOW THIS WAS CALIBRATED, stated plainly so nobody has to guess.
   *
   *    The source workbook's TARGET CALCULATOR sheet states the relationship it
   *    uses as an expression over the sum of the best four subject marks:
   *
   *        ATAR = -135.443857026292
   *             + 5.0308281258900    * x
   *             - 0.0677052181977123 * x^2
   *             + 0.000468402019173927 * x^3
   *             - 1.64654759191973e-06 * x^4
   *             + 2.84286953057e-09    * x^5
   *             - 1.92463295e-12       * x^6
   *
   *    and its own worked example is an aggregate of 239.12838737245087 giving
   *    an ATAR of 80. These six numbers are a refit of that same curve through
   *    the workbook's own reference points, checked at load time against the
   *    reference value it states. They agree with the workbook's expression to
   *    the precision shown because it is the same curve — this is a
   *    re-derivation of the workbook's own calibration, NOT an independent
   *    calibration, and it is labelled that way rather than dressed up.
   *
   *    WHAT THIS MEANS FOR THE STUDENT. This is one institution's conversion for
   *    one intake, worked through one student's example. It is not an official
   *    ATAR statement. Every surface printing a number from this function prints
   *    the caveat with it, and `verifiedAgainst` records what was actually
   *    checked rather than claiming general validity.
   *
   *    `saneRange` is the span over which the curve is monotonic. Outside it the
   *    conversion returns null instead of a number: the polynomial turns over
   *    above roughly 373, and a tool that reported "ATAR 97.85" for a perfect
   *    aggregate because of a curve artefact would be worse than one that says
   *    it cannot answer.
   *
   *    Model: atar = c0 + c1*x + ... over x = sum of the best N subject marks.
   * ------------------------------------------------------------------------*/
  const calibration = {
    label: 'Source workbook curve — one institution, one intake',
    verified: '2026-09-25',
    verifiedAgainst:
      'the workbook states aggregate 239.12838737245087 -> ATAR 80; this curve ' +
      'reproduces 80.00 there and is monotonic across the whole stated range',
    aggregateSize: 4,
    aggregateMax: 100,
    coefficients: [
      -135.443857026292,
      5.03082812589,
      -0.0677052181977123,
      0.000468402019173927,
      -1.64654759191973e-06,
      2.84286953057e-09,
      -1.92463295e-12,
    ],
    // Monotonic and meaningful between 4x50 and 4x93.2. Above the top the curve
    // turns over, so that input is refused rather than clamped to a wrong answer.
    saneRange: [200, 373],
    maxAtar: 99.95,
    clamp: [0, 99.95],
    caveat:
      'One institution\'s conversion for one intake, taken from the source ' +
      'workbook. Not an official ATAR statement — treat it as an estimate and ' +
      'confirm against your own admissions centre.',
  }

  /* The curve is only usable if it is monotonic and reproduces the reference the
   * workbook states. Both are cheap to check and expensive to get wrong, so they
   * are checked on every load rather than trusted. A failure disables the
   * conversion instead of printing a wrong number. */
  const calibrationCheck = (function () {
    function f(x) {
      var v = 0
      for (var i = 0; i < calibration.coefficients.length; i++) {
        v += calibration.coefficients[i] * Math.pow(x, i)
      }
      return v
    }
    var problems = []
    var reference = f(239.12838737245087)
    if (Math.abs(reference - 80) > 0.01) {
      problems.push('reference aggregate gives ' + reference.toFixed(4) + ', expected 80')
    }
    var lo = calibration.saneRange[0]
    var hi = calibration.saneRange[1]
    var prev = f(lo)
    for (var x = lo + 1; x <= hi; x += 1) {
      var now = f(x)
      if (now < prev - 1e-9) {
        problems.push('curve is not monotonic at aggregate ' + x)
        break
      }
      prev = now
    }
    var top = f(hi)
    if (top < 90 || top > calibration.maxAtar + 0.001) {
      problems.push('top of range gives ' + top.toFixed(2) + ', expected near ' + calibration.maxAtar)
    }
    return { ok: problems.length === 0, problems: problems, reference: reference, top: top }
  })()

  /* --------------------------------------------------------------------------
   * 6. Public surface. The engine consumes only what is exported here.
   * ------------------------------------------------------------------------*/
  const uiStrings = {"zh": {"app_sub": "规则驱动 · 建议是数据，不是代码 · 全部内容在 advising-rules.js", "tab_student": "1 · 学生情况", "tab_report": "2 · 建议报告", "tab_tracker": "3 · 考核追踪", "tab_coverage": "4 · 规则总览", "sec_identity": "身份与学业状况", "sec_interests": "升学意向", "sec_subjects": "选课与成绩", "label_name": "姓名", "label_sid": "学号", "label_school": "Year 11 就读学校", "label_efl": "英语为母语", "label_intake": "曾就读的预科班次", "label_target": "目标 ATAR", "label_est": "当前预估 ATAR", "label_deciding": "仍在犹豫选什么专业", "label_funding": "学费来源已落实", "opt_unstated": "— 未填写 —", "opt_none": "— 无 —", "opt_yes": "是", "opt_no": "否", "col_country": "国家/地区", "col_field": "专业方向", "col_uni": "目标大学", "col_level": "班次", "col_subject": "科目", "col_mark": "成绩 (%)", "col_assessed": "已考权重 (%)", "btn_add_interest": "+ 增加一行", "btn_add_subject": "+ 增加一门", "sec_atar": "ATAR 估算", "atar_intro": "按你上面填的成绩算：取最高的四门合计成合成分，再换算成 ATAR。换算式来自源工作簿，是某一所院校某一个招生轮次的换算，不是官方 ATAR 成绩单——只当估算，并以你自己的招生中心为准。", "btn_atar": "算一下", "atar_need": "目标 {target} 需要合成分 {agg}（四门平均 {per}）。", "atar_above": "比你现在高 {gap}。", "atar_below": "你已经比这个目标需要的水平高 {gap}。", "atar_no_target": "填一个目标 ATAR，就能算出还差多少。", "atar_out_of_range": "合成分 {agg} 超出这套换算能回答的区间（{lo}–{hi}）。这里不给数字——给一个会显得权威，而且是错的。", "atar_insufficient": "至少要 {n} 门有成绩的科目才能算合成分。", "atar_unavailable": "换算式自检没通过，所以不输出数字。", "atar_row_agg": "合成分（最高 {n} 门合计）", "atar_row_atar": "换算 ATAR", "atar_row_target": "目标 ATAR", "atar_row_needed": "目标所需合成分", "atar_method": "方法：最高的 {n} 门成绩相加得合成分，代入源工作簿标定的曲线。曲线在合成分约 373 以上会掉头向下，所以超出区间时本工具拒绝给数。自检：合成分 {ref} 应对应 ATAR 80，实测 {got}。", "sec_history": "往届参考", "btn_history": "看往届分布", "sec_notes": "备注（给你的顾问或自己）", "notes_intro": "写在这里的内容会随记录一起保存和导出，打印时会印在报告末尾。常用的说法可以存在这里重复使用。", "notes_heading": "备注", "history_intro": "下面是工作簿里记录的往届学生结果，用来参照你估算出来的位置。", "history_range": "共 {count} 名学生，ATAR 落在 {lo} 到 {hi} 之间。", "history_bands": "这组人内部的位置：", "history_examples": "几位往届学生的成绩与结果：", "history_col_atar": "记录的 ATAR", "history_col_top4": "最高四门合计", "history_col_marks": "各科成绩", "btn_generate": "生成报告 →", "btn_save": "保存到本浏览器", "btn_load": "读取已保存", "btn_clear": "全部清空", "btn_sample": "载入示例学生", "btn_print": "打印 / 存为 PDF", "btn_copy": "复制为文本", "btn_download": "下载 .md", "btn_csv": "下载记录表 (.csv)", "report_title": "建议报告", "col_assessment": "考核项目", "col_weight": "权重 (%)", "col_due": "日期", "col_importance": "重要度", "col_urgency": "紧急度", "col_done": "完成", "col_action": "建议动作", "btn_add_assess": "+ 增加一项考核", "coverage_title": "规则总览", "col_domain": "类别", "tab_courses": "课程参考", "courses_title": "课程最低分参考", "col_uni_name": "院校", "col_course": "专业", "col_min_atar": "最低分", "col_req": "除分数外的要求", "col_source": "来源", "col_rule": "规则", "col_fired": "命中", "col_verified": "核实状态", "label_y11": "Year 11 成绩（每行一条：科目: 分数）", "label_prior": "往期班次成绩（每行一条：科目: 分数）"}, "en": {"app_sub": "rules-driven · advice is data, not code · all copy lives in advising-rules.js", "tab_student": "1 · Student record", "tab_report": "2 · Advising report", "tab_tracker": "3 · Assessment tracker", "tab_coverage": "4 · Rule coverage", "sec_identity": "Identity & standing", "sec_interests": "Destinations & academic interests", "sec_subjects": "Subjects & results", "label_name": "Full name", "label_sid": "Student ID", "label_school": "Year 11 school", "label_efl": "English is first language", "label_intake": "Previous intake attended", "label_target": "Target ATAR", "label_est": "Current estimated ATAR", "label_deciding": "Still deciding on a course", "label_funding": "Funding arrangement confirmed", "opt_unstated": "— not stated —", "opt_none": "— none —", "opt_yes": "Yes", "opt_no": "No", "col_country": "Country", "col_field": "Field", "col_uni": "Target university", "col_level": "Level", "col_subject": "Subject", "col_mark": "Mark (%)", "col_assessed": "Assessed (%)", "btn_add_interest": "+ Add row", "btn_add_subject": "+ Add subject", "sec_atar": "ATAR estimate", "atar_intro": "Computed from the marks above: the best four are summed into an aggregate, and the aggregate is converted to an ATAR. The conversion comes from the source workbook and is the curve of one institution for one intake — not an official ATAR statement. Treat it as an estimate and confirm against your own admissions centre.", "btn_atar": "Calculate", "atar_need": "Target {target} needs an aggregate of {agg} ({per} per subject across four).", "atar_above": "That is {gap} above where you are.", "atar_below": "You are already {gap} above what that target needs.", "atar_no_target": "Enter a target ATAR to see how far off it is.", "atar_out_of_range": "Aggregate {agg} is outside the span this conversion can answer for ({lo}–{hi}). No number is given here — a number would look authoritative and be wrong.", "atar_insufficient": "At least {n} subjects with marks are needed for an aggregate.", "atar_unavailable": "The conversion failed its own load-time check, so no number is produced.", "atar_row_agg": "Aggregate (best {n} summed)", "atar_row_atar": "Converted ATAR", "atar_row_target": "Target ATAR", "atar_row_needed": "Aggregate the target needs", "atar_method": "Method: the best {n} marks are summed, then put through the curve the source workbook is calibrated to. That curve turns over above an aggregate of about 373, so outside the span the tool refuses to answer. Check: an aggregate of {ref} should read ATAR 80; it reads {got}.", "sec_history": "Prior cohorts", "btn_history": "Show prior outcomes", "sec_notes": "Notes (for your adviser, or yourself)", "notes_intro": "Whatever you write here is saved and exported with the record, and printed at the end of the report. Reusable wording can be kept here.", "notes_heading": "Notes", "history_intro": "Recorded outcomes of the students in the source workbook, for reference against your own estimate.", "history_range": "{count} students in total, with ATARs from {lo} to {hi}.", "history_bands": "Positions within this group:", "history_examples": "A few prior students, their marks and their result:", "history_col_atar": "Recorded ATAR", "history_col_top4": "Best four summed", "history_col_marks": "Subject marks", "btn_generate": "Generate report →", "btn_save": "Save to this browser", "btn_load": "Restore saved", "btn_clear": "Clear all", "btn_sample": "Load sample student", "btn_print": "Print / save as PDF", "btn_copy": "Copy as text", "btn_download": "Download as .md", "btn_csv": "Download record (.csv)", "report_title": "Advising report", "col_assessment": "Assessment", "col_weight": "Weight (%)", "col_due": "Due", "col_importance": "Importance", "col_urgency": "Urgency", "col_done": "Done", "col_action": "Action", "btn_add_assess": "+ Add assessment", "coverage_title": "Rule coverage", "col_domain": "Domain", "tab_courses": "Course reference", "courses_title": "Recorded minimums", "col_uni_name": "Institution", "col_course": "Course", "col_min_atar": "Min.", "col_req": "Requirements beyond the score", "col_source": "Source", "col_rule": "Rule", "col_fired": "Fired", "col_verified": "Verification", "label_y11": "Year 11 results (one per line: Subject: mark)", "label_prior": "Prior intake results (one per line: Subject: mark)"}}

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
    roadmap,
    opportunities,
    calibration,
    calibrationCheck,
    meta: {
      title: 'AUSMAT Guide',
      subtitle: 'Rules-driven advising report',
      version: '2.0.0',
      contentPolicy:
        'All advice text in this file is original sample copy. All figures are ' +
        'placeholders pending verification against official sources.',
    },
  }
})()
