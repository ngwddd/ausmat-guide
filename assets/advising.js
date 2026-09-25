
/* ============================================================================
 * The engine.
 *
 * This file contains NO advice text. It reads the catalog, evaluates each
 * rule's `when` expression against the student record through a validating
 * evaluator, and assembles the report. Editing advice never means editing here.
 * ==========================================================================*/
(function () {
  'use strict'

  var R = window.ADVISING

  /* ── language and mode ───────────────────────────────────────────────
   * Both come from the page, not from runtime state: the site pairs pages and
   * switches with a plain link, so there is nothing to keep in sync and no
   * JavaScript needed to change either one. Everything user-visible that the
   * engine generates resolves through the helpers below, so no branch further
   * down tests the language, and no rule tests the mode.
   * ------------------------------------------------------------------*/
  var LANG = (function () {
    var v = document.documentElement.dataset.lang || 'en'
    return (v === 'zh' || v === 'zh-CN') ? 'zh' : 'en'
  })()
  var MODE = (function () {
    var v = document.documentElement.dataset.mode || 'student'
    return v === 'guest' ? 'guest' : 'student'
  })()
  var U = R.uiStrings[LANG] || R.uiStrings.en
  function pick(en, zh) { return LANG === 'zh' && zh ? zh : en }
  function domainLabel(d) { return (LANG === 'zh' && d.zhLabel) ? d.zhLabel : d.label }
  function bandLabel(b) { return (LANG === 'zh' && b.zhLabel) ? b.zhLabel : b.label }

  /* ── course library ──────────────────────────────────────────────────
   * Course facts from the workbook's database, with a link check this project
   * performed (see courses.js). The engine matches them against what the student
   * entered and compares the student's standing against the recorded minimums.
   * Nothing here hard-codes a course: the library is data.
   * ------------------------------------------------------------------*/
  var LIBRARY = (typeof window !== 'undefined' && window.COURSES)
    ? window.COURSES
    : { rows: [], snapshot: '', count: 0 }

  var ROADMAP = R.roadmap || {}
  var OPPORTUNITIES = R.opportunities || { pathways: {}, timelines: {} }
  function roadmapRow(rec) {
    for (var i = 0; i < rec.interests.length; i++) {
      var f = rec.interests[i].field
      if (f && ROADMAP[f]) return { field: f, row: ROADMAP[f][LANG] || ROADMAP[f].en }
    }
    return null
  }
  function timelineParts(rec) {
    var out = []
    for (var i = 0; i < rec.interests.length; i++) {
      var c = rec.interests[i].country
      var t = c ? OPPORTUNITIES.timelines[c] : null
      if (!t) continue
      var text = t[LANG] || t.en
      if (out.indexOf(text) === -1) out.push(text)
    }
    return out
  }
  function optionParts() {
    var list = OPPORTUNITIES.pathways[LANG] || OPPORTUNITIES.pathways.en || []
    return list.map(function (p) {
      var labels = (p.links || []).map(function (l) { return l.label }).join(', ')
      return p.text + (labels ? ' (' + labels + ')' : '')
    })
  }
  // Which named prerequisites the recorded courses ask for and the
  // student has not taken. Reads the requirement lines the workbook
  // itself carries; a course that names no subject contributes nothing.
  function namedPrereqGaps(rec) {
    var taken = {}
    ;(rec.subjects || []).forEach(function (s) {
      if (s.subject) taken[String(s.subject).toUpperCase()] = true
    })
    var groups = {}
    matchingCourses(rec).forEach(function (c) {
      var needs = c.needs || {}
      Object.keys(needs).forEach(function (name) {
        var codes = needs[name] || []
        var have = codes.some(function (code) { return taken[code] })
        if (have) return
        var label = c.university + ' ' + c.course
        if (!groups[name]) groups[name] = []
        if (groups[name].indexOf(label) === -1) groups[name].push(label)
      })
    })
    return groups
  }
  // Rendered the same way the field-expectation gaps are, so both read
  // alike in the report.
  function namedPrereqParts(rec) {
    var groups = namedPrereqGaps(rec)
    return Object.keys(groups).map(function (name) {
      return name + ' (' + groups[name].join(LANG === 'zh' ? '、' : '; ') + ')'
    })
  }
  // Fills the module tokens for one record. Deliberately NOT done inside the
  // helpers: a helper returns its own boolean, so anything after that return
  // is dead code, and the first version of this shipped em dashes in the
  // prose for exactly that reason. Named rather than inlined so a test can
  // call it and prove the tokens actually get set.
  function primeModuleScope(rec, ruleScope) {
    var road = roadmapRow(rec)
    if (road) {
      ruleScope.roadmapField = road.field
      ruleScope.roadmapCareers = road.row.careers
      ruleScope.roadmapActivities = road.row.activities
      ruleScope.roadmapSkills = road.row.skills
      ruleScope.roadmapWhy = road.row.why
    }
    var times = timelineParts(rec)
    if (times.length) ruleScope.timelineList = times.join(' ')
    var opts = optionParts()
    if (opts.length) ruleScope.optionsList = opts.join(' ')
    var named = namedPrereqParts(rec)
    if (named.length) ruleScope.namedPrereqGaps = named.join('; ')
    return ruleScope
  }

  function fieldWords(text) {
    return String(text || '').toLowerCase().split(/[^a-z]+/).filter(function (w) { return w.length > 3 })
  }
  function countryMatches(courseCountry, interestCountry) {
    if (!interestCountry) return false
    var a = String(courseCountry || '').toLowerCase()
    var b = String(interestCountry).toLowerCase()
    if (a === b) return true
    // The library writes 'UK' where the form writes 'United Kingdom'.
    if ((a === 'uk' || a === 'united kingdom') && (b === 'uk' || b === 'united kingdom')) return true
    return false
  }
  function fieldMatches(course, interestField) {
    if (!interestField) return false
    var want = String(interestField).toLowerCase()
    var cat = String(course.category || '').toLowerCase()
    var name = String(course.course || '').toLowerCase()
    // A course with no stated category is not restricted to a field, so it
    // matches whatever field the student named, including "Undecided" — a
    // student who has not chosen yet is exactly who a course named "ANY
    // offered" is for. The source workbook records the National University of
    // Singapore that way, with a blank category, and the blank was being read as
    // "matches nothing": the row was reachable by country and invisible to every
    // field. Absence of a restriction is not a restriction.
    if (!cat) return true
    if (cat && (cat.indexOf(want) !== -1 || want.indexOf(cat) !== -1)) return true
    if (name.indexOf(want) !== -1) return true
    // Word overlap, but only on words that carry meaning here. A first attempt
    // matched any shared word longer than three characters, which let 'Computer
    // Science' match 'Zoology and Animal Science' and 'Environmental Science' —
    // 'science' is shared by half the catalogue and distinguishes nothing. The
    // stop list names the words that appear across unrelated fields; a synonym
    // map carries the cases where the form and the catalogue use different words
    // for the same thing.
    var STOP = { science: 1, sciences: 1, studies: 1, study: 1, general: 1, other: 1, health: 1, arts: 1 }
    var SYNONYM = {
      'computer science': ['computing', 'information tech', 'information technology', 'software', 'cyber'],
      'business': ['business', 'commerce', 'finance', 'accounting', 'marketing', 'management'],
      'sciences': ['science', 'sciences', 'biology', 'chemistry', 'physics', 'biomedical'],
      'humanities': ['arts', 'humanities', 'history', 'literature'],
      'psychology': ['psychology', 'psychological'],
      'engineering': ['engineering', 'engineer'],
      'law': ['law', 'legal'],
      'nursing': ['nursing', 'nurse'],
      'medicine': ['medicine', 'medical', 'surgery'],
      'dentistry': ['dentistry', 'dental'],
      'architecture': ['architecture', 'architectural'],
      'education': ['education', 'teaching'],
    }
    // Aliases are matched per WORD, not as substrings. A substring check is how
    // 'Medicine' matched 'BioMedical Engineering': indexOf('medical') finds a hit
    // inside 'biomedical', so an engineering degree was offered as a medical
    // option. Matching whole words costs a little recall and removes that class of
    // error entirely.
    var hayWords = fieldWords(cat + ' ' + name)
    var aliases = SYNONYM[want] || [want]
    for (var i = 0; i < aliases.length; i++) {
      var alias = String(aliases[i]).toLowerCase()
      var aliasWords = alias.split(/[^a-z]+/).filter(function (w) { return w.length > 2 })
      var every = aliasWords.length > 0 && aliasWords.every(function (aw) {
        return hayWords.some(function (hw) { return hw === aw || hw === aw + 's' || hw + 's' === aw })
      })
      if (every) return true
    }
    // Word overlap on the words the INTEREST carries and the course NAME carries.
    // An earlier attempt let the category contribute too, which is how 'Medicine'
    // reached 'Biomedical Engineering' — both sit in 'Health Sciences'.
    var words = fieldWords(interestField).filter(function (w) { return !STOP[w] })
    if (!words.length) return false
    var nameWords = fieldWords(course.course)
    return words.some(function (w) {
      return nameWords.some(function (cw) {
        return cw === w || cw === w + 's' || cw + 's' === w
      })
    })
  }
  function universityMatches(course, interestUniversity) {
    if (!interestUniversity) return true
    var a = String(course.university || '').toLowerCase()
    var b = String(interestUniversity).toLowerCase()
    if (a.indexOf(b) !== -1 || b.indexOf(a) !== -1) return true
    var wsp = fieldWords(interestUniversity)
    return fieldWords(course.university).some(function (w) { return wsp.indexOf(w) !== -1 })
  }
  function matchingCourses(record) {
    var out = []
    ;(record.interests || []).forEach(function (interest) {
      ;(LIBRARY.rows || []).forEach(function (course) {
        if (!countryMatches(course.country, interest.country)) return
        if (!fieldMatches(course, interest.field)) return
        if (!universityMatches(course, interest.university)) return
        if (out.indexOf(course) === -1) out.push(course)
      })
    })
    return out.sort(function (a, b) { return a.atar - b.atar })
  }
  // The nearest recorded minimum at or below the student's standing, and the
  // nearest above it. Both are what an advisor would actually say out loud.
  function atarComparison(record, courses) {
    var standing = record.estimatedAtar
    if (standing === null || standing === undefined || !courses.length) return null
    var reachable = courses.filter(function (c) { return c.atar <= standing })
    var above = courses.filter(function (c) { return c.atar > standing })
    return {
      standing: standing,
      reachable: reachable.length ? reachable[reachable.length - 1] : null,
      nearest: above.length ? above[0] : null,
      count: courses.length,
    }
  }
  function courseLabel(c) {
    return c.university + ' ' + c.course + ' (' + c.atar + ')'
  }
  // A rule with no `modes` applies everywhere; one that declares modes applies
  // only there. The catalog is filtered once, so every later pass — evaluation,
  // the report, the coverage view — sees the same set.
  var ACTIVE_RULES = R.rules.filter(function (r) {
    return !r.modes || r.modes.indexOf(MODE) !== -1
  })

  /* ---------------------------------------------------------------------
   * A small, self-contained expression evaluator — no new Function, no eval.
   *
   * Why not compile the rule expressions with Function(): doing so exposes the
   * whole global scope to the expression. `record.constructor.constructor(...)`
   * and a bare `globalThis` are both reachable, and neither can be excluded by
   * scanning the text, because the escape happens through the language runtime
   * rather than through a name the scanner can see. Wrapping the scope in a
   * Proxy narrows it but cannot close it, since a `with` block's scope chain
   * still terminates at the global object.
   *
   * Parsing the expression and evaluating the tree removes the problem instead
   * of mitigating it: there is no global scope to reach, `this` and `new` are
   * not part of the grammar, and a mistyped helper is a plain error naming the
   * rule. The catalog stays data, and the engine stays in charge.
   * -------------------------------------------------------------------*/
  var OPERATORS = [
    '===', '!==', '==', '!=', '<=', '>=', '&&', '||',
    '<', '>', '+', '-', '*', '/', '%', '!', '(', ')', '[', ']', '.', ',', '?', ':',
  ]

  function tokenize(input) {
    var tokens = []
    var i = 0
    while (i < input.length) {
      var ch = input[i]
      if (/\s/.test(ch)) { i++; continue }
      if (ch === '"' || ch === "'") {
        var quote = ch
        var value = ''
        i++
        while (i < input.length && input[i] !== quote) {
          if (input[i] === '\\') { value += input[i + 1]; i += 2; continue }
          value += input[i++]
        }
        if (input[i] !== quote) throw new Error('unterminated string literal')
        i++
        tokens.push({ type: 'string', value: value })
        continue
      }
      if (/[0-9]/.test(ch)) {
        var num = ''
        while (i < input.length && /[0-9.]/.test(input[i])) num += input[i++]
        tokens.push({ type: 'number', value: Number(num) })
        continue
      }
      if (/[A-Za-z_$]/.test(ch)) {
        var name = ''
        while (i < input.length && /[A-Za-z0-9_$]/.test(input[i])) name += input[i++]
        tokens.push({ type: 'name', value: name })
        continue
      }
      var matched = null
      for (var o = 0; o < OPERATORS.length; o++) {
        if (input.substr(i, OPERATORS[o].length) === OPERATORS[o]) { matched = OPERATORS[o]; break }
      }
      if (!matched) throw new Error('unexpected character "' + ch + '"')
      tokens.push({ type: 'op', value: matched })
      i += matched.length
    }
    tokens.push({ type: 'eof', value: '' })
    return tokens
  }

  function parseExpression(source) {
    var tokens = tokenize(source)
    var pos = 0
    function peek() { return tokens[pos] }
    function eat(value) {
      var t = tokens[pos]
      if (t.type === 'op' && t.value === value) { pos++; return true }
      return false
    }
    function expect(value) {
      if (!eat(value)) throw new Error('expected "' + value + '"')
    }
    function parsePrimary() {
      var t = peek()
      if (t.type === 'number') { pos++; return { kind: 'literal', value: t.value } }
      if (t.type === 'string') { pos++; return { kind: 'literal', value: t.value } }
      if (t.type === 'name') {
        pos++
        if (t.value === 'true') return { kind: 'literal', value: true }
        if (t.value === 'false') return { kind: 'literal', value: false }
        if (t.value === 'null') return { kind: 'literal', value: null }
        return { kind: 'name', name: t.value }
      }
      if (eat('[')) {
        // Array literal, used to compare one path against several values:
        // anyInterest('i.country', ['Australia', 'United Kingdom'])
        var items = []
        if (!eat(']')) {
          do { items.push(parseTernary()) } while (eat(','))
          expect(']')
        }
        // Elements must be constants. Evaluating with an empty scope makes any
        // reference to a record field a parse-time error rather than a value
        // silently captured before the student's data exists.
        return { kind: 'literal', value: items.map(constantOf) }
      }
      if (eat('(')) { var inner = parseTernary(); expect(')'); return inner }
      throw new Error('unexpected token "' + t.value + '"')
    }
    function parsePostfix() {
      var node = parsePrimary()
      for (;;) {
        if (eat('.')) {
          var prop = peek()
          if (prop.type !== 'name') throw new Error('expected a property name after "."')
          pos++
          node = { kind: 'member', object: node, property: prop.value }
          continue
        }
        if (peek().type === 'op' && peek().value === '[') {
          pos++
          var index = parseTernary()
          expect(']')
          node = { kind: 'computed', object: node, index: index }
          continue
        }
        if (peek().type === 'op' && peek().value === '(') {
          pos++
          var args = []
          if (!eat(')')) {
            do { args.push(parseTernary()) } while (eat(','))
            expect(')')
          }
          node = { kind: 'call', callee: node, args: args }
          continue
        }
        return node
      }
    }
    function parseUnary() {
      if (eat('!')) return { kind: 'unary', op: '!', argument: parseUnary() }
      if (eat('-')) return { kind: 'unary', op: '-', argument: parseUnary() }
      return parsePostfix()
    }
    function binaryLevel(ops, next) {
      return function () {
        var node = next()
        for (;;) {
          var t = peek()
          if (t.type !== 'op' || ops.indexOf(t.value) === -1) return node
          pos++
          node = { kind: 'binary', op: t.value, left: node, right: next() }
        }
      }
    }
    var parseMul = binaryLevel(['*', '/', '%'], parseUnary)
    var parseAdd = binaryLevel(['+', '-'], parseMul)
    var parseRel = binaryLevel(['<', '>', '<=', '>='], parseAdd)
    var parseEq = binaryLevel(['==', '!=', '===', '!=='], parseRel)
    var parseAnd = binaryLevel(['&&'], parseEq)
    var parseOr = binaryLevel(['||'], parseAnd)
    function parseTernary() {
      var node = parseOr()
      if (eat('?')) {
        var consequent = parseTernary()
        expect(':')
        var alternate = parseTernary()
        return { kind: 'conditional', test: node, consequent: consequent, alternate: alternate }
      }
      return node
    }
    var ast = parseTernary()
    if (peek().type !== 'eof') {
      throw new Error('unexpected trailing token "' + peek().value + '"')
    }
    return ast
  }

  // Only these object methods may be called from a rule. An expression cannot
  // reach a method that is not on this list, so a callback cannot be handed to
  // something that would run it outside the evaluator.
  var METHOD_ALLOWLIST = ['some', 'every', 'includes', 'indexOf', 'test', 'match', 'startsWith', 'endsWith']

  // Property names that must never resolve, on any value, by any access form.
  // Comments in this template use the word "constructor" several times, but the
  // real blocking is deliberately structural: the obvious form
  // `record.constructor.constructor(...)()` is blocked by the call rule, yet
  // `record["constructor"]` still reaches the Function constructor, and that is
  // both a real reflective escape and, in a rule, always a typo.
  var DENIED_PROPERTIES = ['constructor', '__proto__', 'prototype', 'caller', 'callee', 'arguments']

  function readProperty(target, key) {
    if (typeof key === 'string' && DENIED_PROPERTIES.indexOf(key) !== -1) {
      throw new Error('property "' + key + '" is not available to a rule')
    }
    return target[key]
  }

  // Only constant sub-expressions may appear inside an array literal.
  function constantOf(node) {
    if (node.kind === 'literal') return node.value
    throw new Error('array literal elements must be constants')
  }

  function evaluateAst(node, scope) {
    switch (node.kind) {
      case 'literal':
        return node.value
      case 'name':
        if (Object.prototype.hasOwnProperty.call(scope, node.name)) return scope[node.name]
        throw new Error('unknown name "' + node.name + '"')
      case 'member': {
        var target = evaluateAst(node.object, scope)
        if (target === null || target === undefined) return undefined
        return readProperty(target, node.property)
      }
      case 'computed': {
        var owner = evaluateAst(node.object, scope)
        if (owner === null || owner === undefined) return undefined
        return readProperty(owner, evaluateAst(node.index, scope))
      }
      case 'call': {
        if (node.callee.kind === 'name') {
          var helper = scope[node.callee.name]
          if (typeof helper !== 'function') throw new Error('"' + node.callee.name + '" is not a helper function')
          // Helper arguments are passed UNEVALUATED. A helper such as
          // anyInterest binds `i` per element, so the path argument must not be
          // resolved against the outer scope, where `i` does not exist yet.
          return helper.apply(null, [scope, node.args])
        }
        var receiver = evaluateAst(node.callee.object, scope)
        var method = node.callee.property
        if (METHOD_ALLOWLIST.indexOf(method) === -1) {
          throw new Error('method "' + method + '" is not permitted in a rule')
        }
        var fn = receiver[method]
        if (typeof fn !== 'function') throw new Error('"' + method + '" is not callable here')
        return fn.apply(receiver, node.args.map(function (a) { return evaluateAst(a, scope) }))
      }
      case 'unary':
        return node.op === '!' ? !evaluateAst(node.argument, scope) : -evaluateAst(node.argument, scope)
      case 'binary': {
        // Short-circuit rather than evaluating both sides.
        if (node.op === '&&') return evaluateAst(node.left, scope) ? evaluateAst(node.right, scope) : false
        if (node.op === '||') { var l = evaluateAst(node.left, scope); return l ? l : evaluateAst(node.right, scope) }
        var a = evaluateAst(node.left, scope)
        var b = evaluateAst(node.right, scope)
        switch (node.op) {
          case '+': return a + b
          case '-': return a - b
          case '*': return a * b
          case '/': return a / b
          case '%': return a % b
          case '==': return a == b // eslint-disable-line eqeqeq
          case '!=': return a != b // eslint-disable-line eqeqeq
          case '===': return a === b
          case '!==': return a !== b
          case '<': return a < b
          case '>': return a > b
          case '<=': return a <= b
          case '>=': return a >= b
        }
        throw new Error('unsupported operator "' + node.op + '"')
      }
      case 'conditional':
        return evaluateAst(node.test, scope) ? evaluateAst(node.consequent, scope) : evaluateAst(node.alternate, scope)
    }
    throw new Error('unsupported expression form "' + node.kind + '"')
  }

  var compiled = {}
  var compileErrors = {}
  R.rules.forEach(function (rule) {
    try {
      var ast = parseExpression(rule.when)
      compiled[rule.id] = function (record, helpers, ruleScope) {
        var scope = Object.assign({ record: record, T: R.thresholds }, helpers)
        scope.__gapFields = null
        scope.__matched = null
        scope.__standing = null
        scope.__reachable = null
        scope.__nearest = null
        scope.__gap = null
        scope.__courseCount = null
        scope.__roadmapField = null
        scope.__roadmapCareers = null
        scope.__roadmapActivities = null
        scope.__roadmapSkills = null
        scope.__roadmapWhy = null
        scope.__timelineList = null
        scope.__optionsList = null
        scope.__optionalFields = null
        var result = evaluateAst(ast, scope)
        if (ruleScope) {
          if (scope.__gapFields) ruleScope.gapFields = scope.__gapFields
          if (scope.__matched) ruleScope.waUniversities = scope.__matched
          if (scope.__standing !== null && scope.__standing !== undefined) ruleScope.standing = scope.__standing
          if (scope.__reachable) ruleScope.reachableCourse = scope.__reachable
          if (scope.__nearest) ruleScope.nearestCourse = scope.__nearest
          if (scope.__gap !== null && scope.__gap !== undefined) ruleScope.atarGap = scope.__gap
          if (scope.__courseCount) ruleScope.courseCount = scope.__courseCount
          if (scope.__roadmapField) ruleScope.roadmapField = scope.__roadmapField
          if (scope.__roadmapCareers) ruleScope.roadmapCareers = scope.__roadmapCareers
          if (scope.__roadmapActivities) ruleScope.roadmapActivities = scope.__roadmapActivities
          if (scope.__roadmapSkills) ruleScope.roadmapSkills = scope.__roadmapSkills
          if (scope.__roadmapWhy) ruleScope.roadmapWhy = scope.__roadmapWhy
          if (scope.__timelineList) ruleScope.timelineList = scope.__timelineList
          if (scope.__optionsList) ruleScope.optionsList = scope.__optionsList
          if (scope.__optionalFields) ruleScope.optionalFields = scope.__optionalFields
        }
        return result
      }
    } catch (error) {
      compileErrors[rule.id] = error.message
    }
  })

  /* -------------------------- helpers the rules may use ---------------
   * Comparisons against list elements take a field expression plus an optional
   * expected value. The rule language has no function syntax, so anyInterest
   * contains the traversal: the rule names the field, the engine binds `i`.
   * -------------------------------------------------------------------*/
  function resolvePath(start, path) {
    return String(path).split('.').reduce(function (value, key) {
      return value === null || value === undefined ? undefined : value[key]
    }, start)
  }

  function pathMatches(pathValue, expected) {
    if (expected === undefined) return !!pathValue
    if (Array.isArray(expected)) return expected.indexOf(pathValue) !== -1
    return pathValue === expected
  }

  // Capability lookup: the catalog owns the mapping from a capability key to the
  // subject names that satisfy it, so a rule asks "does this student have the
  // mathematics a course expects" without enumerating subject names itself.
  function hasCapability(subjects, key) {
    var cap = R.capabilities && R.capabilities[key]
    if (!cap) return false
    return (subjects || []).some(function (s) {
      return cap.subjects.indexOf(s.subject) !== -1
    })
  }

  // The label a reader recognises, in their language. Both halves of a
  // gap phrase go through here, or the advice reads "Engineering / 物理或化学"
  // with the two languages spliced together.
  function capabilityLabel(key) {
    // Standalone noun for the "field / capability" phrase: the English
    // label 'a physical science' reads as half a sentence there.
    var standalone = { physicalScience: { en: 'Physics or Chemistry', zh: '物理或化学' } }
    var fixed = standalone[key]
    if (fixed) return LANG === 'zh' ? fixed.zh : fixed.en
    var cap = R.capabilities && R.capabilities[key]
    if (!cap) return key
    return (LANG === 'zh' && cap.zhLabel) ? cap.zhLabel : cap.label
  }
  // A capability nobody defined is skipped, never treated as missing:
  // hasCapability answers false for an unknown key, so a typo in an
  // expectation would otherwise report every subject as a gap.
  function capabilityKnown(key) {
    var cap = R.capabilities && R.capabilities[key]
    return !!(cap && cap.subjects && cap.subjects.length)
  }
  function fieldLabel(key) {
    var exp = expectationFor(key)
    if (exp && LANG === 'zh' && exp.zhLabel) return exp.zhLabel
    var zh = (R.fieldLabelsZh && R.fieldLabelsZh[key])
    if (LANG === 'zh' && zh) return zh
    return key
  }
  // Gaps are collected as field<NUL>capability so two interests in the
  // same field collapse to one phrase. Keying on the finished phrase
  // failed: the phrase carries the field name, so a repeat never looks
  // like a duplicate of itself.
  function renderGaps(list) {
    var seen = {}
    var parts = []
    list.forEach(function (entry) {
      if (seen[entry]) return
      seen[entry] = true
      var bits = entry.split('\u0000')
      parts.push(fieldLabel(bits[0]) + ' / ' + capabilityLabel(bits[1]))
    })
    return parts.join(LANG === 'zh' ? '、' : '; ')
  }

  function expectationFor(field) {
    return (R.courseExpectations && R.courseExpectations[field]) || null
  }

  // Helper contract for every anyInterest* helper: the FIRST argument is a path
  // string resolved per element, so the helper can reach a field on the element;
  // every remaining argument is evaluated once in the caller's scope. One rule
  // for all of them, because a mixed convention is how a condition ends up
  // calling a helper with the wrong kind of argument.
  function buildHelpers(record, scope) {
    return {
      anyInterest: function (currentScope, args) {
        if (args.length === 0) {
          throw new Error('anyInterest needs a field path, e.g. anyInterest("i.country", "Australia")')
        }
        var path = evaluateAst(args[0], currentScope)
        var expected = args.length > 1 ? evaluateAst(args[1], currentScope) : undefined
        return record.interests.some(function (interest) {
          var elementScope = Object.assign({}, currentScope, { i: interest, item: interest })
          return pathMatches(resolvePath(elementScope, path), expected)
        })
      },
      // Explicit "this field is absent" predicate. anyInterest(path, null) would
      // NOT mean this: a null second argument is indistinguishable from an
      // omitted one, where the comparison falls back to truthiness. Naming the
      // intent avoids a trap the language cannot express clearly.
      // Substring match over a field, recording what matched so the
      // advice can name it instead of alluding to it.
      // True when the recorded interests match at least one library row.
      anyInterestHasCourses: function (currentScope, args) {
        var cmp = atarComparison(currentScope.record, matchingCourses(currentScope.record))
        if (!cmp) return false
        currentScope.__standing = cmp.standing
        currentScope.__courseCount = cmp.count
        if (cmp.nearest) {
          currentScope.__nearest = courseLabel(cmp.nearest)
          currentScope.__gap = Math.round((cmp.nearest.atar - cmp.standing) * 10) / 10
        }
        return cmp.count > 0
      },
      // True when the standing reaches at least one recorded minimum.
      anyReachableCourse: function (currentScope, args) {
        var cmp = atarComparison(currentScope.record, matchingCourses(currentScope.record))
        if (!cmp) return false
        currentScope.__standing = cmp.standing
        currentScope.__courseCount = cmp.count
        if (cmp.reachable) currentScope.__reachable = courseLabel(cmp.reachable)
        if (cmp.nearest) {
          currentScope.__nearest = courseLabel(cmp.nearest)
          currentScope.__gap = Math.round((cmp.nearest.atar - cmp.standing) * 10) / 10
        }
        return !!cmp.reachable
      },
      // The field roadmap. True only when the student named a field the
      // roadmap covers, so the rule stays silent rather than printing a
      // generic paragraph — filler advice in a report is worse than a gap.
      // The scope slots are filled by primeRoadmap() BEFORE evaluation:
      // these helpers return their own boolean, so nothing after that
      // return would ever run, and a first version of this that set the
      // slots here instead produced '—' in the prose.
      roadmapFor: function (currentScope, args) {
        return roadmapRow(currentScope.record) !== null
      },
      timelineFor: function (currentScope, args) {
        return timelineParts(currentScope.record).length > 0
      },
      optionsFor: function (currentScope, args) {
        return optionParts().length > 0
      },
      // True when at least one recorded course for the stated interest
      // names a prerequisite subject the student has not taken. The prose
      // value is primed by primeModuleScope, for the same reason as the
      // others: a helper's own return makes later statements dead code.
      anyNamedPrereqMissing: function (currentScope, args) {
        return namedPrereqParts(currentScope.record).length > 0
      },

      anyInterestMatching: function (currentScope, args) {
        var path = evaluateAst(args[0], currentScope)
        var needles = evaluateAst(args[1], currentScope)
        var list = Array.isArray(needles) ? needles : [needles]
        var hits = []
        record.interests.forEach(function (interest) {
          var value = String(resolvePath({ i: interest, item: interest }, path) || '')
          list.forEach(function (needle) {
            if (value && value.toLowerCase().indexOf(String(needle).toLowerCase()) !== -1
                && hits.indexOf(value) === -1) hits.push(value)
          })
        })
        if (hits.length) currentScope.__matched = hits.join(LANG === 'zh' ? '、' : '; ')
        return hits.length > 0
      },

      anyInterestMissing: function (currentScope, args) {
        var path = evaluateAst(args[0], currentScope)
        return record.interests.some(function (interest) {
          var value = resolvePath({ i: interest, item: interest }, path)
          return value === null || value === undefined || value === ''
        })
      },
      // fieldPath -> a capability field the stated course expectation requires.
      anyInterestExpectationGap: function (currentScope, args) {
        var __gaps = []
        if (args.length < 2) {
          throw new Error('anyInterestExpectationGap needs a field path and the subjects, e.g. anyInterestExpectationGap("i.field", record.subjects)')
        }
        var path = evaluateAst(args[0], currentScope)
        var subjects = evaluateAst(args[1], currentScope)
        record.interests.forEach(function (interest) {
          var field = resolvePath({ i: interest, item: interest }, path)
          var expectation = expectationFor(field)
          if (!expectation) return
          expectation.expects.forEach(function (key) {
            if (capabilityKnown(key) && !hasCapability(subjects, key))
              __gaps.push(field + ' ' + key)
          })
        })
        if (__gaps.length) currentScope.__gapFields = renderGaps(__gaps)
        return __gaps.length > 0
      },
      // fieldPath -> an optional capability that would strengthen the case. Only
      // reported once the required set is covered, so it never competes with the
      // prerequisite-gap message for the same field.
      anyInterestOptionalGap: function (currentScope, args) {
        var __opts = []
        if (args.length < 2) {
          throw new Error('anyInterestOptionalGap needs a field path and the subjects, e.g. anyInterestOptionalGap("i.field", record.subjects)')
        }
        var path = evaluateAst(args[0], currentScope)
        var subjects = evaluateAst(args[1], currentScope)
        record.interests.forEach(function (interest) {
          var field = resolvePath({ i: interest, item: interest }, path)
          var expectation = expectationFor(field)
          if (!expectation || !expectation.optional.length) return
          // Silent while a required capability is still missing: the gap
          // message is the one that matters, two hints read as noise.
          if (expectation.expects.some(function (key) { return !hasCapability(subjects, key) })) return
          expectation.optional.forEach(function (key) {
            // A capability nobody defined is skipped, never reported as a
            // gap: hasCapability answers false for an unknown key, so a
            // typo would otherwise name every subject as missing.
            if (capabilityKnown(key) && !hasCapability(subjects, key))
              __opts.push(field + ' ' + key)
          })
        })
        if (__opts.length) currentScope.__optionalFields = renderGaps(__opts)
        return __opts.length > 0
      },
      // atarPath, standing, margin -> true when standing is within `margin` BELOW
      // a stated minimum. Blowing past the minimum is a different message, and a
      // standing far above it is not worth mentioning at all.
      belowStatedMinimum: function (currentScope, args) {
        if (args.length < 3) {
          throw new Error('belowStatedMinimum needs a path, the standing, and a margin, e.g. belowStatedMinimum("i.atarRequirement", record.estimatedAtar, T.atarMarginPoints)')
        }
        var path = evaluateAst(args[0], currentScope)
        var standing = evaluateAst(args[1], currentScope)
        var margin = Number(evaluateAst(args[2], currentScope))
        if (standing === null || standing === undefined || isNaN(margin)) return false
        return record.interests.some(function (interest) {
          var minimum = resolvePath({ i: interest, item: interest }, path)
          if (typeof minimum !== 'number') return false
          return standing >= minimum - margin && standing < minimum
        })
      },
      countSubject: function (currentScope, args) {
        var prefix = evaluateAst(args[0], currentScope)
        return record.subjects.filter(function (s) {
          return s.level && s.level.indexOf(prefix) === 0
        }).length
      },
      anyScoreBelow: function (currentScope, args) {
        var n = evaluateAst(args[0], currentScope)
        return record.subjects.some(function (s) {
          return typeof s.mark === 'number' && s.mark < n
        })
      },
      anyValueBelow: function (currentScope, args) {
        var container = evaluateAst(args[0], currentScope)
        var n = evaluateAst(args[1], currentScope)
        if (!container || typeof container !== 'object') return false
        return Object.keys(container).some(function (k) {
          return typeof container[k] === 'number' && container[k] < n
        })
      },
      hasSubject: function (currentScope, args) {
        var name = evaluateAst(args[0], currentScope)
        return record.subjects.some(function (s) { return s.subject === name })
      },
      score: function (currentScope, args) {
        var subject = evaluateAst(args[0], currentScope)
        var hit = record.subjects.filter(function (s) { return s.subject === subject })[0]
        return hit && typeof hit.mark === 'number' ? hit.mark : null
      },
    }
  }

  /* -------------------------- token interpolation ---------------------
   * Thresholds are interpolated from the catalog, not the record, so advice
   * text can state the same figure its condition tests. That is what keeps
   * "below 60" in the prose and `anyScoreBelow(T.weakMark)` in the condition
   * from drifting apart.
   * -------------------------------------------------------------------*/
  function interpolate(text, record, extra) {
    var scope = extra || {}
    // Optional clauses. A rule may fire in a case where one of its tokens
    // has nothing to say — reaching a course with no course above you is
    // the ordinary case, not an error — and substituting '—' there leaves
    // half a sentence behind ("the nearest one above you is —, — points
    // away"). {{#if key}} … {{/if}} drops the clause entirely when the key
    // is absent, empty, or false. Unmatched markers are stripped so a
    // typo shows up as missing text, not as braces on the page.
    text = String(text).replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      function (whole, key, body) {
        var v = Object.prototype.hasOwnProperty.call(scope, key) ? scope[key] : null
        if (v === null || v === undefined || v === '' || v === false) return ''
        return body
      })
    text = String(text).replace(/\{\{[#/]if \w+\}\}|\{\{\/if\}\}/g, '')
    return String(text).replace(/\{\{(\w+)\}\}/g, function (whole, key) {
      if (Object.prototype.hasOwnProperty.call(scope, key)) return String(scope[key])
      if (key === 'subjectCount') return String(record.subjects.length)
      if (Object.prototype.hasOwnProperty.call(R.thresholds, key)) return String(R.thresholds[key])
      var value = record[key]
      return value === undefined || value === null || value === '' ? '—' : String(value)
    })
  }

  /* -------------------------- DOM plumbing ---------------------------- */
  function $(id) { return document.getElementById(id) || null }
  // Wires a listener only if the control is on this page.
  function on(id, event, handler) {
    var node = $(id)
    if (node && node.addEventListener) node.addEventListener(event, handler)
    return node
  }
  function el(tag, attrs, kids) {
    var node = document.createElement(tag)
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k]
      else if (k === 'html') node.innerHTML = attrs[k]
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k])
      else node.setAttribute(k, attrs[k])
    })
    ;(kids || []).forEach(function (kid) { node.appendChild(kid) })
    return node
  }
  function options(list, selected, blankLabel) {
    var frag = document.createDocumentFragment()
    if (blankLabel !== undefined) {
      var b = el('option', { value: '' }, [])
      b.textContent = blankLabel
      frag.appendChild(b)
    }
    list.forEach(function (value) {
      var o = el('option', { value: value }, [])
      o.textContent = value
      if (value === selected) o.selected = true
      frag.appendChild(o)
    })
    return frag
  }

  /* ---------------------------------------------------------------------
   * Record construction. A blank mark is null, never 0 — conflating "not yet
   * assessed" with "scored zero" is a data-modelling error that changes what
   * the advice says.
   * -------------------------------------------------------------------*/
  function numOrNull(v) {
    if (v === '' || v === null || v === undefined) return null
    var n = Number(v)
    return isNaN(n) ? null : n
  }
  function boolOrNull(v) {
    if (v === '') return null
    return v === 'true'
  }
  function parsePairs(text) {
    var out = {}
    String(text || '').split('\n').forEach(function (line) {
      var m = /^\s*([^:]+):\s*(-?[\d.]+)\s*$/.exec(line)
      if (m) out[m[1].trim()] = Number(m[2])
    })
    return out
  }

  function readRecord() {
    var interests = []
    Array.prototype.forEach.call($('interestRows').querySelectorAll('tr'), function (tr) {
      var country = tr.querySelector('.i-country').value
      var field = tr.querySelector('.i-field').value
      var uni = tr.querySelector('.i-uni').value
      if (country || field || uni) {
        interests.push({ country: country, field: field, university: uni, atarRequirement: null })
      }
    })
    var subjects = []
    Array.prototype.forEach.call($('subjectRows').querySelectorAll('tr'), function (tr) {
      var level = tr.querySelector('.s-level').value
      var subject = tr.querySelector('.s-subject').value.trim()
      var mark = numOrNull(tr.querySelector('.s-mark').value)
      var assessed = numOrNull(tr.querySelector('.s-assessed').value)
      if (subject || level) {
        subjects.push({ level: level, subject: subject, mark: mark, assessed: assessed, credits: null })
      }
    })
    return {
      fullName: $('fullName').value.trim(),
      englishFirstLanguage: boolOrNull($('englishFirstLanguage').value),
      targetAtar: numOrNull($('targetAtar').value),
      estimatedAtar: numOrNull($('estimatedAtar').value),
      stillDeciding: $('stillDeciding').value === 'true',
      fundingSecured: boolOrNull($('fundingSecured').value),
      interests: interests,
      subjects: subjects,
      notes: $('notes') ? $('notes').value : '',
    }
  }

  function writeRecord(rec) {
    if ($('notes')) $('notes').value = rec.notes || ''
    $('fullName').value = rec.fullName || ''
    $('englishFirstLanguage').value = rec.englishFirstLanguage === null || rec.englishFirstLanguage === undefined ? '' : String(rec.englishFirstLanguage)
    $('targetAtar').value = rec.targetAtar === null || rec.targetAtar === undefined ? '' : rec.targetAtar
    $('estimatedAtar').value = rec.estimatedAtar === null || rec.estimatedAtar === undefined ? '' : rec.estimatedAtar
    $('stillDeciding').value = rec.stillDeciding ? 'true' : 'false'
    $('fundingSecured').value = rec.fundingSecured === null || rec.fundingSecured === undefined ? '' : String(rec.fundingSecured)

    $('interestRows').innerHTML = ''
    ;(rec.interests && rec.interests.length ? rec.interests : [{}]).forEach(addInterestRow)
    $('subjectRows').innerHTML = ''
    ;(rec.subjects && rec.subjects.length ? rec.subjects : [{}]).forEach(addSubjectRow)
  }

  function addInterestRow(preset) {
    preset = preset || {}
    var tr = el('tr')
    var country = el('select', { 'class': 'i-country' }, [])
    country.appendChild(options(R.vocabularies.countries, preset.country, '— country —'))
    var field = el('select', { 'class': 'i-field' }, [])
    field.appendChild(options(R.vocabularies.fields, preset.field, '— field —'))
    var uni = el('input', { 'class': 'i-uni', type: 'text', placeholder: 'optional' })
    uni.value = preset.university || ''
    var bin = el('button', { 'class': 'ghost mini', text: '×' })
    bin.addEventListener('click', function () { tr.remove() })
    tr.appendChild(el('td', {}, [country]))
    tr.appendChild(el('td', {}, [field]))
    tr.appendChild(el('td', {}, [uni]))
    tr.appendChild(el('td', {}, [bin]))
    $('interestRows').appendChild(tr)
  }

  function addSubjectRow(preset) {
    preset = preset || {}
    var tr = el('tr')
    var level = el('select', { 'class': 's-level' }, [])
    level.appendChild(options(R.vocabularies.level, preset.level, '— level —'))
    var subject = el('input', { 'class': 's-subject', type: 'text', placeholder: 'e.g. Mathematics' })
    subject.value = preset.subject || ''
    var mark = el('input', { 'class': 's-mark', type: 'number', min: '0', max: '100' })
    mark.value = preset.mark === null || preset.mark === undefined ? '' : preset.mark
    var assessed = el('input', { 'class': 's-assessed', type: 'number', min: '0', max: '100' })
    assessed.value = preset.assessed === null || preset.assessed === undefined ? '' : preset.assessed
    var bin = el('button', { 'class': 'ghost mini', text: '×' })
    bin.addEventListener('click', function () { tr.remove() })
    tr.appendChild(el('td', {}, [level]))
    tr.appendChild(el('td', {}, [subject]))
    tr.appendChild(el('td', {}, [mark]))
    tr.appendChild(el('td', {}, [assessed]))
    tr.appendChild(el('td', {}, [bin]))
    $('subjectRows').appendChild(tr)
  }

  /* ---------------------------------------------------------------------
   * Validation. Returns problems, each naming the field and the reason.
   * The engine refuses to generate a report while any error stands, rather
   * than emitting advice computed from bad input.
   * -------------------------------------------------------------------*/
  function validate(rec) {
    var errors = []
    var warnings = []
    if (!rec.fullName) errors.push(pick('Full name is required — the report is addressed to the student.', '请填写姓名——报告是出具给这位学生的。'))
    if (rec.subjects.length === 0) errors.push(pick('At least one subject is required.', '至少需要填写一门科目。'))
    rec.subjects.forEach(function (s, i) {
      if (!s.level) errors.push('Subject ' + (i + 1) + pick(': level not selected.', '：未选择班次。'))
      if (!s.subject) errors.push('Subject ' + (i + 1) + pick(': subject name is empty.', '：科目名为空。'))
      if (s.mark !== null && (s.mark < 0 || s.mark > 100)) errors.push('Subject ' + (i + 1) + pick(': mark must be between 0 and 100.', '：成绩必须在 0 到 100 之间。'))
      if (s.assessed !== null && (s.assessed < 0 || s.assessed > 100)) warnings.push('Subject ' + (i + 1) + pick(': assessed weight is outside 0–100%.', '：已考权重超出 0–100%。'))
    })
    var seen = {}
    rec.subjects.forEach(function (s) {
      var key = s.level + '|' + s.subject
      if (s.subject && seen[key]) warnings.push(pick('Duplicate subject recorded: ', '科目重复：') + s.subject + ' (' + s.level + ').')
      seen[key] = true
    })
    rec.interests.forEach(function (it, i) {
      if (!it.country) warnings.push('Interest ' + (i + 1) + pick(': no country selected, so destination rules cannot fire.', '：未选择国家，方向类规则不会触发。'))
      if (!it.field) warnings.push('Interest ' + (i + 1) + pick(': no field selected, so course rules cannot fire.', '：未选择专业方向，专业类规则不会触发。'))
    })
    if (rec.targetAtar !== null && rec.estimatedAtar !== null && rec.estimatedAtar > rec.targetAtar + 20) {
      warnings.push('The estimated ATAR exceeds the target by more than 20 points — confirm both were entered in the same direction.')
    }
    Object.keys(compileErrors).forEach(function (id) {
      errors.push(pick('Rule "' + id + '" cannot be evaluated: ', '规则「' + id + '」无法求值：') + compileErrors[id] + '.')
    })
    return { errors: errors, warnings: warnings }
  }

  /* ---------------------------------------------------------------------
   * Evaluation.
   * -------------------------------------------------------------------*/
  function evaluate(rec) {
    var scope = { record: rec }
    var helpers = buildHelpers(rec, scope)
    return ACTIVE_RULES.map(function (rule) {
      var outcome = { rule: rule, fired: false, reason: '' }
      if (rule.enabled === false) { outcome.reason = pick('disabled in catalog', '规则库中已停用'); return outcome }
      if (compileErrors[rule.id]) { outcome.reason = pick('compile error: ', '编译错误：') + compileErrors[rule.id]; return outcome }
      try {
        var ruleScope = primeModuleScope(rec, {})
        outcome.fired = !!compiled[rule.id](rec, helpers, ruleScope)
        outcome.scope = ruleScope
      } catch (error) {
        outcome.reason = pick('threw: ', '求值出错：') + error.message
      }
      return outcome
    })
  }

  /* ---------------------------------------------------------------------
   * ATAR conversion.
   *
   * Two things this refuses to do, both because the alternative is a confident
   * wrong number:
   *   - It will not answer outside the calibrated span. The curve turns over at
   *     the top, so a perfect aggregate would otherwise convert DOWN to ~97.9.
   *     Returning null lets the page say "outside the calibrated range".
   *   - It will not print a figure without the caveat. `calibrationCheck` runs at
   *     load; if it failed, `atarAvailable()` is false and every caller must
   *     handle that rather than falling through to arithmetic on a bad curve.
   * -------------------------------------------------------------------*/
  function atarAvailable() {
    return !!(R.calibrationCheck && R.calibrationCheck.ok)
  }

  function aggregateToAtar(sum) {
    if (!atarAvailable()) return null
    var range = R.calibration.saneRange
    if (!(sum >= range[0] && sum <= range[1])) return null
    var c = R.calibration.coefficients
    var value = 0
    for (var i = 0; i < c.length; i++) value += c[i] * Math.pow(sum, i)
    if (isNaN(value)) return null
    return Math.max(R.calibration.clamp[0], Math.min(R.calibration.clamp[1], value))
  }

  /* The inverse: what aggregate does a target ATAR need? Solved by bisection
   * rather than algebra — inverting a degree-6 polynomial in closed form is more
   * code and more ways to be wrong, and the curve is monotonic where we allow it.
   * Returns null when the target is not reachable inside the calibrated span. */
  function atarToAggregate(target) {
    if (!atarAvailable()) return null
    if (typeof target !== 'number' || isNaN(target)) return null
    var lo = R.calibration.saneRange[0]
    var hi = R.calibration.saneRange[1]
    var atLo = aggregateToAtar(lo)
    var atHi = aggregateToAtar(hi)
    if (atLo === null || atHi === null) return null
    if (target < atLo || target > atHi) return null
    for (var i = 0; i < 80; i++) {
      var mid = (lo + hi) / 2
      if (aggregateToAtar(mid) < target) lo = mid
      else hi = mid
    }
    return (lo + hi) / 2
  }

  /* The best aggregate: the top N marks, only from subjects that count. A mark
   * entered as a percentage of a different maximum is not comparable, so
   * `aggregateMax` defines what a full mark is and anything above it is a likely
   * data-entry error rather than a very good student. */
  function bestAggregate(rec) {
    var n = R.calibration.aggregateSize
    var marks = rec.subjects
      .map(function (s) { return s.mark })
      .filter(function (m) {
        return typeof m === 'number' && !isNaN(m) && m >= 0 && m <= R.calibration.aggregateMax
      })
      .sort(function (a, b) { return b - a })
    if (marks.length < n) return null
    return marks.slice(0, n).reduce(function (a, b) { return a + b }, 0)
  }

  /* Everything the ATAR panel and the rules both need, computed once. `status`
   * is the honest word for what happened, so the UI never has to infer it. */
  function atarPicture(rec) {
    var agg = bestAggregate(rec)
    if (!atarAvailable()) {
      return { status: 'unavailable', aggregate: agg, atar: null, reason: 'calibration failed its own check' }
    }
    if (agg === null) {
      return {
        status: 'insufficient', aggregate: null, atar: null,
        reason: 'need ' + R.calibration.aggregateSize + ' countable subject marks',
      }
    }
    var atar = aggregateToAtar(agg)
    if (atar === null) {
      var range = R.calibration.saneRange
      return {
        status: 'out-of-range', aggregate: agg, atar: null,
        reason: 'aggregate ' + agg.toFixed(1) + ' is outside the calibrated span ' +
          range[0] + '-' + range[1],
      }
    }
    var target = rec.targetAtar
    var needed = typeof target === 'number' ? atarToAggregate(target) : null
    var perSubject = needed === null ? null : needed / R.calibration.aggregateSize
    return {
      status: 'ok',
      aggregate: agg,
      atar: atar,
      target: target,
      neededAggregate: needed,
      neededPerSubject: perSubject,
      gapToTarget: needed === null ? null : needed - agg,
    }
  }

  /* ---------------------------------------------------------------------
   * The record as a spreadsheet row.
   *
   * The original keeps one workbook per student, so a teacher's normal move is
   * to open a spreadsheet. A markdown report cannot be sorted or filtered across
   * a cohort; a CSV can. This is the export that makes the tool usable in the
   * workflow the original lived in, without asking anyone to hand-write JSON.
   * -------------------------------------------------------------------*/
  function recordToRow(rec) {
    var interest = (rec.interests && rec.interests[0]) || {}
    var marks = (rec.subjects || []).map(function (s) { return s.mark })
      .filter(function (m) { return typeof m === 'number' })
      .sort(function (a, b) { return b - a })
    var agg = marks.length >= R.calibration.aggregateSize
      ? marks.slice(0, R.calibration.aggregateSize).reduce(function (a, b) { return a + b }, 0)
      : null
    var atar = agg === null ? null : aggregateToAtar(agg)
    return {
      name: rec.fullName || '',
      country: interest.country || '',
      field: interest.field || '',
      university: interest.university || '',
      targetAtar: rec.targetAtar === null || rec.targetAtar === undefined ? '' : rec.targetAtar,
      estimatedAtar: rec.estimatedAtar === null || rec.estimatedAtar === undefined ? '' : rec.estimatedAtar,
      subjectCount: (rec.subjects || []).length,
      aggregate: agg === null ? '' : agg.toFixed(1),
      convertedAtar: atar === null ? '' : atar.toFixed(2),
      subjects: (rec.subjects || []).map(function (s) {
        return s.subject + ':' + (typeof s.mark === 'number' ? s.mark : '')
      }).join(' '),
      notes: rec.notes || '',
    }
  }

  var CSV_HEADERS = ['name', 'country', 'field', 'university', 'targetAtar',
                     'estimatedAtar', 'subjectCount', 'aggregate', 'convertedAtar',
                     'subjects', 'notes']

  /* RFC 4180 quoting: wrap when the value contains a comma, quote, CR or LF, and
   * double any inner quote. A name with a comma in it silently shifting every
   * later column is the classic way a CSV export corrupts a dataset. */
  function csvCell(value) {
    var s = value === null || value === undefined ? '' : String(value)
    if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }

  function recordToCsv(rec) {
    var row = recordToRow(rec)
    return CSV_HEADERS.map(function (h) { return csvCell(row[h]) }).join(',') + '\r\n'
  }

  /* ---------------------------------------------------------------------
   * Report assembly. Same principle as the original — emit only what fired,
   * in domain order — plus one thing it lacked: every paragraph carries the
   * id of the rule that produced it.
   * -------------------------------------------------------------------*/
  var generated = null

  function buildReport(rec, results) {
    var order = {}
    R.domains.forEach(function (d) { order[d.id] = d.order })
    var fired = results.filter(function (r) { return r.fired }).sort(function (a, b) {
      var da = order[a.rule.domain] || 999
      var db = order[b.rule.domain] || 999
      return da - db
    })

    var lines = []
    lines.push(LANG === 'zh' ? '升学自检报告' : R.meta.title.toUpperCase())
    lines.push((LANG === 'zh' ? '学生：' : 'Advising report for ') + (rec.fullName || (LANG === 'zh' ? '（未填姓名）' : '(unnamed)')))
    if (rec.studentId) lines.push('Student ID: ' + rec.studentId)
    lines.push((LANG === 'zh' ? '生成时间：' : 'Generated: ') + new Date().toLocaleString())
    lines.push('')

    var currentDomain = null
    fired.forEach(function (item) {
      var d = R.domains.filter(function (x) { return x.id === item.rule.domain })[0]
      var label = d ? domainLabel(d) : item.rule.domain
      if (label !== currentDomain) {
        lines.push('')
        lines.push('— ' + (LANG === 'zh' ? label : label.toUpperCase()) + ' —')
        currentDomain = label
      }
      lines.push('')
      lines.push(stripEmphasis(interpolate(pick(item.rule.advice, item.rule.zh), rec, item.scope)))
      lines.push(LANG === 'zh'
        ? ('   [规则：' + item.rule.id + ' · 依据：' + sourceLabel(item.rule.source) + ']')
        : ('   [rule: ' + item.rule.id + ' · source: ' + item.rule.source + ']'))
    })

    if (fired.length === 0) lines.push(pick('No rule conditions were met. The record may be too sparse to advise on.', '没有命中任何规则，可能是记录信息太少，不足以给出建议。'))

    var picture = atarPicture(rec)
    if (picture.status !== 'insufficient') {
      lines.push('')
      lines.push(LANG === 'zh' ? '— 合成分换算 —' : '— AGGREGATE CONVERSION —')
      lines.push('')
      lines.push(LANG === 'zh'
        ? ('最好的 ' + R.calibration.aggregateSize + ' 门科目合计 ' +
           (picture.aggregate === null ? '（无法计入）' : picture.aggregate.toFixed(1)) + '。')
        : ('Best ' + R.calibration.aggregateSize + ' subject marks total ' +
           (picture.aggregate === null ? '(not countable)' : picture.aggregate.toFixed(1)) + '.'))
      if (picture.status === 'ok') {
        lines.push(LANG === 'zh' ? ('参考 ATAR：' + picture.atar.toFixed(2))
                                : ('Indicative ATAR: ' + picture.atar.toFixed(2)))
        if (picture.neededAggregate !== null) {
          lines.push(LANG === 'zh'
            ? ('目标 ' + picture.target + ' 需要合成分 ' + picture.neededAggregate.toFixed(1) +
               '（' + R.calibration.aggregateSize + ' 门平均 ' + picture.neededPerSubject.toFixed(1) + '）。')
            : ('Target ' + picture.target + ' needs an aggregate of ' +
               picture.neededAggregate.toFixed(1) + ' (' + picture.neededPerSubject.toFixed(1) +
               ' per subject across ' + R.calibration.aggregateSize + ').'))
          lines.push(picture.gapToTarget > 0
            ? (LANG === 'zh' ? ('比你现在高 ' + picture.gapToTarget.toFixed(1) + '。')
                             : ('That is ' + picture.gapToTarget.toFixed(1) + ' above where you are.'))
            : (LANG === 'zh' ? ('你已经比这个目标需要的水平高 ' + Math.abs(picture.gapToTarget).toFixed(1) + '。')
                             : ('You are already ' + Math.abs(picture.gapToTarget).toFixed(1) + ' above what that target needs.')))
        } else if (typeof picture.target === 'number') {
          lines.push(LANG === 'zh'
            ? ('目标 ' + picture.target + ' 超出这个换算能回答的范围。')
            : ('Target ' + picture.target + ' is outside the range this conversion can answer for.'))
        }
        lines.push('   [' + R.calibration.caveat + ']')
      } else {
        lines.push(LANG === 'zh' ? ('不给 ATAR 数字：' + picture.reason + '。')
                                : ('No ATAR is reported: ' + picture.reason + '.'))
        lines.push(LANG === 'zh'
          ? '   [这里拒绝猜是有意的——给个数字会显得权威，而且是错的。]'
          : '   [Refusing to guess is the point — a number here would look authoritative and be wrong.]')
      }
    }

    // Whatever the adviser wrote lands at the end, after every generated
    // paragraph, so it reads as an addition to the report rather than as one of
    // the tool's own claims. That distinction matters: the notes are a person's
    // words, and the report labels everything else with the rule that produced it.
    if (rec.notes && String(rec.notes).trim()) {
      lines.push('')
      lines.push(LANG === 'zh' ? '— 备注 —' : '— NOTES —')
      lines.push('')
      lines.push(String(rec.notes).trim())
    }

    return { text: lines.join('\n'), fired: fired }
  }

  function renderReport() {
    var rec = readRecord()
    var check = validate(rec)

    var box = $('validationBox')
    box.innerHTML = ''
    if (check.errors.length) {
      box.appendChild(el('div', { 'class': 'note err', html: '<strong>' + pick('Cannot generate a report:', '无法生成报告：') + '</strong><ul style="margin:6px 0 0 18px">' +
        check.errors.map(function (e) { return '<li>' + escapeHtml(e) + '</li>' }).join('') + '</ul>' }))
    } else if (check.warnings.length) {
      box.appendChild(el('div', { 'class': 'note', html: '<strong>' + pick('Worth checking:', '有几处值得核对：') + '</strong><ul style="margin:6px 0 0 18px">' +
        check.warnings.map(function (e) { return '<li>' + escapeHtml(e) + '</li>' }).join('') + '</ul>' }))
    } else {
      box.appendChild(el('div', { 'class': 'note ok', text: pick('Record passes validation.', '记录通过校验。') }))
    }

    var results = evaluate(rec)
    var report = buildReport(rec, results)
    generated = { record: rec, report: report, results: results, check: check }

    // Report tab
    if ($('reportBody')) $('reportBody').innerHTML = ''
    report.fired.forEach(function (item) {
      var d = R.domains.filter(function (x) { return x.id === item.rule.domain })[0]
      $('reportBody').appendChild(el('p', { 'class': 'advice', html:
        '<span class="badge">' + escapeHtml(d ? domainLabel(d) : item.rule.domain) + '</span>' +
        emphasise(escapeHtml(interpolate(pick(item.rule.advice, item.rule.zh), rec, item.scope))) }))
        var srcLine = LANG === 'zh'
          ? ('规则：' + item.rule.id + ' · 依据：' + sourceLabel(item.rule.source) +
             (item.rule.verified ? ' · 核实于 ' + item.rule.verified : ' · 待核实'))
          : ('rule: ' + item.rule.id + ' · source: ' + item.rule.source +
             (item.rule.verified ? ' · verified ' + item.rule.verified : ' · NOT VERIFIED'))
        $('reportBody').appendChild(el('span', { 'class': 'src', text: srcLine }))
    })
    $('reportStamp').textContent = '(' + report.fired.length + ' of ' + ACTIVE_RULES.length + ' rules fired)'

    // Coverage tab
    var rows = $('coverageRows')
    rows.innerHTML = ''
    results.forEach(function (item) {
      var tr = el('tr')
      var d = R.domains.filter(function (x) { return x.id === item.rule.domain })[0]
      tr.appendChild(el('td', { text: d ? domainLabel(d) : item.rule.domain }))
      var cell = el('td')
      cell.appendChild(el('div', { text: pick(item.rule.title, item.rule.zhTitle) || item.rule.id }))
      cell.appendChild(el('div', { 'class': 'muted', html: '<code>' + escapeHtml(item.rule.id) + '</code> · ' + escapeHtml(item.rule.when) }))
      if (item.reason) cell.appendChild(el('div', { 'class': 'muted', text: '→ ' + localiseReason(item.reason) }))
      tr.appendChild(cell)
      tr.appendChild(el('td', { html: item.fired ? '<span class="badge">' + (LANG === 'zh' ? '是' : 'yes') + '</span>' : '<span class="badge off">' + (LANG === 'zh' ? '否' : 'no') + '</span>' }))
      tr.appendChild(el('td', { html: item.rule.verified
        ? '<span class="badge">' + escapeHtml(item.rule.verified) + '</span>'
        : '<span class="badge warn">' + (LANG === 'zh' ? '待核实' : 'verify') + '</span>' }))
      rows.appendChild(tr)
    })

    var unverified = ACTIVE_RULES.filter(function (r) { return !r.verified }).length
    var disabled = ACTIVE_RULES.filter(function (r) { return r.enabled === false }).length
    var summaryLine = LANG === 'zh'
      ? ('规则库共 ' + ACTIVE_RULES.length + ' 条 · ' + report.fired.length + ' 条命中 · ' + unverified + ' 条待核实 · ' + disabled + ' 条已停用。')
      : (ACTIVE_RULES.length + ' rules in catalog · ' + report.fired.length + ' fired · ' + unverified + ' awaiting verification · ' + disabled + ' disabled.')
    var verifyNote = LANG === 'zh'
      ? '标记为「待核实」的规则含有尚未对照当前来源确认的事实性表述。'
      : ' Rules marked <em>verify</em> make a factual claim that a human has not yet confirmed against a current source.'
    $('coverageSummary').innerHTML =
      '<div class="note' + (unverified ? '' : ' ok') + '"><strong>' + summaryLine + '</strong>' +
      (unverified ? verifyNote : '') + '</div>'
    var draftWarning = LANG === 'zh'
      ? ('这份报告基于一份有 ' + check.errors.length + ' 处校验错误的记录生成，请当作草稿。')
      : ('This report was generated from a record with ' + check.errors.length + ' validation error(s). Treat it as a draft.')
    $('reportWarnings').innerHTML = check.errors.length
      ? '<div class="note err">' + draftWarning + '</div>'
      : ''

    showTab('report')
  }

  function emphasise(escaped) {
    return String(escaped).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  }
  function stripEmphasis(text) {
    return String(text).replace(/\*\*([^*]+)\*\*/g, '$1')
  }

  // Some sources are internal markers; the rest are instructions telling a
  // human where to look, so they stay as written. Translating those would
  // hide the only actionable part of the line.
  function sourceLabel(src) {
    if (src === 'internal') return LANG === 'zh' ? '站内判断' : 'internal'
    return src
  }

  function localiseReason(reason) {
    if (LANG !== 'zh') return reason
    return reason
      .replace(/^disabled in catalog/, '规则库中已停用')
      .replace(/^compile error: /, '编译错误：')
      .replace(/^threw: /, '求值出错：')
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  /* -------------------------- assessment tracker ---------------------- */
  function importanceFor(weight) {
    if (typeof weight !== 'number') return null
    for (var i = 0; i < R.importanceBands.length; i++) {
      if (weight < R.importanceBands[i].max) return R.importanceBands[i]
    }
    return R.importanceBands[R.importanceBands.length - 1]
  }

  function addAssessRow(preset) {
    preset = preset || {}
    var tr = el('tr')
    var name = el('input', { type: 'text', 'class': 'a-name', placeholder: 'e.g. Topic test 2' })
    name.value = preset.name || ''
    var weight = el('input', { type: 'number', 'class': 'a-weight', min: '0', max: '100' })
    weight.value = preset.weight === undefined ? '' : preset.weight
    var due = el('input', { type: 'date', 'class': 'a-due' })
    due.value = preset.due || ''
    var imp = el('td', { 'class': 'muted', text: '—' })
    var urg = el('select', { 'class': 'a-urg' }, [])
    urg.appendChild(options(['1', '2', '3', '4', '5'], String(preset.urgency || '3'), undefined))
    var done = el('input', { type: 'checkbox', 'class': 'a-done' })
    done.checked = !!preset.done
    var action = el('td', { 'class': 'muted', text: '—' })
    var bin = el('button', { 'class': 'ghost mini', text: '×' })

    function refresh() {
      var w = numOrNull(weight.value)
      var band = importanceFor(w)
      imp.textContent = band ? bandLabel(band) : '—'
      var level = band ? band.level : null
      var u = Number(urg.value)
      if (done.checked) {
        action.textContent = LANG === 'zh' ? '已完成。' : 'Completed.'
        action.className = 'muted'
      } else if (level) {
        var urgencyRow = R.matrix[u] || R.matrix[3]
        action.textContent = (LANG === 'zh' && R.zhMatrix[u] && R.zhMatrix[u][level]) || urgencyRow[level]
        action.className = ''
      } else {
        action.textContent = LANG === 'zh' ? '填入权重后会给出建议动作。' : 'Enter a weight to get an action.'
        action.className = 'muted'
      }
      summariseAssessments()
    }
    ;[weight, urg, done].forEach(function (node) { node.addEventListener('input', refresh) })
    bin.addEventListener('click', function () { tr.remove(); summariseAssessments() })

    tr.appendChild(el('td', {}, [name]))
    tr.appendChild(el('td', {}, [weight]))
    tr.appendChild(el('td', {}, [due]))
    tr.appendChild(imp)
    tr.appendChild(el('td', {}, [urg]))
    tr.appendChild(el('td', {}, [done]))
    tr.appendChild(action)
    tr.appendChild(el('td', {}, [bin]))
    $('assessRows').appendChild(tr)
    refresh()
  }

  function summariseAssessments() {
    var rows = $('assessRows').querySelectorAll('tr')
    var outstanding = 0
    var critical = 0
    var now = Date.now()
    Array.prototype.forEach.call(rows, function (tr) {
      if (tr.querySelector('.a-done').checked) return
      var w = numOrNull(tr.querySelector('.a-weight').value)
      var band = importanceFor(w)
      if (!band) return
      outstanding++
      if (band.level >= 4 && Number(tr.querySelector('.a-urg').value) >= 4) critical++
      else if (band.level >= 4) critical++
      var due = tr.querySelector('.a-due').value
      if (due && new Date(due).getTime() < now) tr.style.background = 'var(--bad-soft)'
      else tr.style.background = ''
    })
    if (!$('trackerSummary')) return
    $('trackerSummary').textContent = outstanding === 0
      ? (LANG === 'zh' ? '没有未完成的考核。' : 'No outstanding assessments recorded.')
      : (LANG === 'zh'
          ? (outstanding + ' 项未完成 · ' + critical + ' 项为重要及以上。已过日期的行会加底色。')
          : (outstanding + ' outstanding · ' + critical + ' at major-or-critical weight. Rows past their due date are shaded.'))
  }

  /* -------------------------- tabs, storage, export ------------------- */
  function atarRow(label, value, cls) {
    var tr = el('tr')
    tr.appendChild(el('th', { 'class': 'atar-key', text: label }))
    tr.appendChild(el('td', { 'class': 'num ' + (cls || ''), text: value }))
    return tr
  }
  function renderAtar() {
    var box = $('atarBox')
    if (!box) return
    var rec = readRecord()
    var p = atarPicture(rec)
    box.innerHTML = ''
    var n = R.calibration.aggregateSize
    if (p.status === 'unavailable') {
      box.appendChild(el('p', { 'class': 'warn', text: U.atar_unavailable }))
      atarMethod()
      return
    }
    if (p.status === 'insufficient') {
      box.appendChild(el('p', { 'class': 'warn',
        text: U.atar_insufficient.replace('{n}', String(n)) }))
      atarMethod()
      return
    }
    var table = el('table', { 'class': 'atar-table' })
    table.appendChild(atarRow(U.atar_row_agg.replace('{n}', String(n)), p.aggregate.toFixed(1)))
    if (p.status === 'out-of-range') {
      box.appendChild(table)
      var range = R.calibration.saneRange
      box.appendChild(el('p', { 'class': 'warn', text: U.atar_out_of_range
        .replace('{agg}', p.aggregate.toFixed(1))
        .replace('{lo}', String(range[0])).replace('{hi}', String(range[1])) }))
      atarMethod()
      return
    }
    table.appendChild(atarRow(U.atar_row_atar, p.atar.toFixed(2), 'big'))
    if (typeof p.target === 'number') {
      table.appendChild(atarRow(U.atar_row_target, String(p.target)))
      if (p.neededAggregate !== null) {
        table.appendChild(atarRow(U.atar_row_needed, p.neededAggregate.toFixed(1)))
      }
    }
    box.appendChild(table)
    var line = el('p')
    if (p.neededAggregate !== null) {
      line.appendChild(el('span', { text: U.atar_need
        .replace('{target}', String(p.target))
        .replace('{agg}', p.neededAggregate.toFixed(1))
        .replace('{per}', p.neededPerSubject.toFixed(1)) + ' ' }))
      var gap = Math.abs(p.gapToTarget)
      line.appendChild(el('strong', { text: p.gapToTarget > 0
        ? U.atar_above.replace('{gap}', gap.toFixed(1))
        : U.atar_below.replace('{gap}', gap.toFixed(1)) }))
    } else {
      line.appendChild(el('span', { 'class': 'muted', text: U.atar_no_target }))
    }
    box.appendChild(line)
    var caveat = el('p', { 'class': 'muted', text: R.calibration.caveat })
    box.appendChild(caveat)
    atarMethod()
  }
  function atarMethod() {
    var el2 = $('atarMethod')
    if (!el2) return
    var check = R.calibrationCheck || { ok: false, reference: 0 }
    el2.textContent = U.atar_method
      .replace('{n}', String(R.calibration.aggregateSize))
      .replace('{ref}', '239.1')
      .replace('{got}', check.reference ? check.reference.toFixed(2) : '—')
  }
  on('btnAtar', 'click', renderAtar)
  // The prior-cohort panel. Its whole value is context, so the cohort
  // caveat is rendered with the numbers rather than tucked away: these
  // students are a narrow high band, and a band label without that
  // sentence reads as a position in the population.
  function renderHistory() {
    var box = $('historyBox')
    if (!box) return
    box.innerHTML = ''
    var H = (typeof window !== 'undefined' && window.HISTORY) ? window.HISTORY : null
    if (!H || !H.count) {
      box.appendChild(el('p', { 'class': 'muted', text: U.atar_unavailable }))
      return
    }
    box.appendChild(el('p', { text: U.history_intro }))
    box.appendChild(el('p', { text: U.history_range
      .replace('{count}', String(H.count))
      .replace('{lo}', String(H.atarMin)).replace('{hi}', String(H.atarMax)) }))
    var caveat = H.cohortCaveat || {}
    box.appendChild(el('p', { 'class': 'warn',
      text: (LANG === 'zh' ? caveat.zh : caveat.en) || '' }))
    box.appendChild(el('p', { 'class': 'muted', text: U.history_bands }))
    var bandTable = el('table', { 'class': 'atar-table' })
    ;(H.bands || []).forEach(function (b) {
      bandTable.appendChild(atarRow(LANG === 'zh' ? (b.labelZh || b.label) : b.label,
        String(b.atar)))
    })
    box.appendChild(bandTable)
    box.appendChild(el('p', { 'class': 'muted', text: U.history_examples }))
    var table = el('table')
    var head = el('tr')
    ;[U.history_col_atar, U.history_col_top4, U.history_col_marks].forEach(function (h) {
      head.appendChild(el('th', { text: h }))
    })
    table.appendChild(head)
    ;(H.examples || []).forEach(function (e) {
      var tr = el('tr')
      tr.appendChild(el('td', { 'class': 'num', text: String(e.atar) }))
      tr.appendChild(el('td', { 'class': 'num', text: String(e.top4) }))
      var cell = el('td')
      ;(e.marks || []).forEach(function (m, i) {
        cell.appendChild(el('span', { 'class': 'mark-chip',
          text: ((e.codes || [])[i] || '?') + ' ' + m }))
      })
      tr.appendChild(cell)
      table.appendChild(tr)
    })
    box.appendChild(table)
  }
  on('btnHistory', 'click', renderHistory)

  function renderCourses() {
    var body = $('courseRows')
    if (!body) return
    var rec = readRecord()
    var matched = matchingCourses(rec)
    var list = matched.length ? matched : LIBRARY.rows.slice(0, 25)
    body.innerHTML = ''
    list.forEach(function (c) {
      var tr = el('tr')
      tr.appendChild(el('td', { text: c.university }))
      tr.appendChild(el('td', { text: c.course }))
      tr.appendChild(el('td', { 'class': 'num', text: String(c.atar) }))
      tr.appendChild(el('td', { text: c.req || '—' }))
      var cell = el('td')
      if (c.url) {
        var mark = c.link === 'ok' ? ''
          : (c.link === 'blocked' ? pick(' (not verified)', '（未验证）') : pick(' (section page)', '（院系入口）'))
        cell.appendChild(el('a', { href: c.url, target: '_blank',
          rel: 'noopener noreferrer', text: pick('verify', '去核对') + mark }))
      } else {
        cell.appendChild(el('span', { 'class': 'muted',
          text: pick('search the institution site', '请在院校官网搜索') }))
      }
      tr.appendChild(cell)
      body.appendChild(tr)
    })
    var note = $('courseNote')
    if (note) {
      var total = LIBRARY.count || (LIBRARY.rows || []).length
      note.textContent = LANG === 'zh'
        ? ('共 ' + total + ' 条课程记录，数据截至 ' + LIBRARY.snapshot + '。' +
           (matched.length ? ('已按你填写的方向筛出 ' + matched.length + ' 条。')
                           : '你还没有填写方向，先列出前 25 条。') +
           '最低分每轮都会变，请以院校官网为准。')
        : (total + ' course records, snapshot ' + LIBRARY.snapshot + '. ' +
           (matched.length ? (matched.length + ' match what you entered.')
                           : 'No field entered yet, so the first 25 are listed.') +
           ' Minimums change every intake; verify at the institution.')
    }
  }
  on('navcourses', 'click', renderCourses)
  on('btnCourses', 'click', renderCourses)

  function showTab(which) {
    ['student', 'report', 'tracker', 'coverage'].forEach(function (t) {
      var node = $('tab-' + t)
      if (!node) return
      node.classList.toggle('hidden', t !== which)
    })
    Array.prototype.forEach.call(document.querySelectorAll('nav.tabs button'), function (b) {
      b.setAttribute('aria-selected', String(b.dataset.tab === which))
    })
  }

  var STORAGE_KEY = 'advising-workbook-record-v1-' + LANG + '-' + MODE

  function sample() {
    return {
      fullName: 'Sample Student',
      englishFirstLanguage: false,
      previousIntake: 'September intake',
      targetAtar: 88,
      estimatedAtar: 79.5,
      stillDeciding: false,
      fundingSecured: false,
      interests: [
        { country: 'Australia', field: 'Engineering', university: 'Curtin University' },
        { country: 'United Kingdom', field: 'Engineering', university: 'University of Manchester' },
      ],
      subjects: [
        { level: 'Year 11', subject: 'Mathematics', mark: 82, assessed: 45 },
        { level: 'Year 11', subject: 'Physics', mark: 74, assessed: 40 },
        { level: 'Year 11', subject: 'Chemistry', mark: 58, assessed: 35 },
        { level: 'Year 11', subject: 'English', mark: 71, assessed: 50 },
        { level: 'Year 11', subject: 'Psychology', mark: 66, assessed: 30 },
      ],
    }
  }

  /* -------------------------- wiring ---------------------------------- */
  on('addInterest', 'click', function () { addInterestRow() })
  on('addSubject', 'click', function () { addSubjectRow() })
  on('addAssess', 'click', function () { addAssessRow() })
  on('btnGenerate', 'click', renderReport)
  on('btnSample', 'click', function () { writeRecord(sample()); renderReport() })
  on('btnClear', 'click', function () { writeRecord({ interests: [], subjects: [] }); $('validationBox').innerHTML = '' })
  on('btnSave', 'click', function () {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readRecord()))
      if ($('validationBox')) $('validationBox').innerHTML = '<div class="note ok">' + pick('Saved to this browser only. Nothing was sent anywhere.', '只保存在本浏览器里，没有发送到任何地方。') + '</div>'
    } catch (e) {
      if ($('validationBox')) $('validationBox').innerHTML = '<div class="note err">' + pick('Could not save: ', '保存失败：') + escapeHtml(e.message) + '</div>'
    }
  })
  on('btnLoad', 'click', function () {
    var raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) { $('validationBox').innerHTML = '<div class="note">' + pick('Nothing saved in this browser yet.', '本浏览器里还没有保存过记录。') + '</div>'; return }
    writeRecord(JSON.parse(raw))
  })
  on('btnPrint', 'click', function () { window.print() })
  on('btnCopy', 'click', function () {
    if (generated) navigator.clipboard.writeText(generated.report.text)
  })
  on('btnDownload', 'click', function () {
    if (!generated) return
    var blob = new Blob([generated.report.text], { type: 'text/markdown' })
    var a = el('a', { href: URL.createObjectURL(blob), download: 'advising-report.md' })
    document.body.appendChild(a); a.click(); a.remove()
  })
  // The record as one spreadsheet row. Header included so a cohort of these can
  // be concatenated into a single CSV a teacher can sort and filter.
  //
  // Wired through on(), not addEventListener: the report tab exists on both
  // pages but the guest page has no CSV button, and an unguarded listener on a
  // missing node is what once killed the whole engine on the guest page.
  on('btnCsv', 'click', function () {
    var rec = readRecord()
    var csv = CSV_HEADERS.join(',') + '\r\n' + recordToCsv(rec)
    // The BOM is what makes Excel open UTF-8 correctly; without it a Chinese
    // name arrives as mojibake, which is the one thing that would make this
    // export useless for the people most likely to use it.
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    var a = el('a', { href: URL.createObjectURL(blob), download: 'advising-record.csv' })
    document.body.appendChild(a); a.click(); a.remove()
  })
  Array.prototype.forEach.call(document.querySelectorAll('nav.tabs button'), function (b) {
    b.addEventListener('click', function () { showTab(b.dataset.tab) })
  })

  if ($('appTitle')) $('appTitle').textContent = R.meta.title
  if ($('appSub')) $('appSub').textContent = R.meta.subtitle + ' · v' + R.meta.version + ' · ' + R.meta.contentPolicy

  writeRecord({ interests: [], subjects: [] })
  if ($('assessRows')) addAssessRow({ name: 'Sample assessment', weight: 15, urgency: 4, due: '' })
})()
