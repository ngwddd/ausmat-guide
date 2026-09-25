
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
      compiled[rule.id] = function (record, helpers) {
        return evaluateAst(ast, Object.assign({ record: record, T: R.thresholds }, helpers))
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
      anyInterestMissing: function (currentScope, args) {
        var path = evaluateAst(args[0], currentScope)
        return record.interests.some(function (interest) {
          var value = resolvePath({ i: interest, item: interest }, path)
          return value === null || value === undefined || value === ''
        })
      },
      // fieldPath -> a capability field the stated course expectation requires.
      anyInterestExpectationGap: function (currentScope, args) {
        if (args.length < 2) {
          throw new Error('anyInterestExpectationGap needs a field path and the subjects, e.g. anyInterestExpectationGap("i.field", record.subjects)')
        }
        var path = evaluateAst(args[0], currentScope)
        var subjects = evaluateAst(args[1], currentScope)
        return record.interests.some(function (interest) {
          var field = resolvePath({ i: interest, item: interest }, path)
          var expectation = expectationFor(field)
          if (!expectation) return false
          return expectation.expects.some(function (key) { return !hasCapability(subjects, key) })
        })
      },
      // fieldPath -> an optional capability that would strengthen the case. Only
      // reported once the required set is covered, so it never competes with the
      // prerequisite-gap message for the same field.
      anyInterestOptionalGap: function (currentScope, args) {
        if (args.length < 2) {
          throw new Error('anyInterestOptionalGap needs a field path and the subjects, e.g. anyInterestOptionalGap("i.field", record.subjects)')
        }
        var path = evaluateAst(args[0], currentScope)
        var subjects = evaluateAst(args[1], currentScope)
        return record.interests.some(function (interest) {
          var field = resolvePath({ i: interest, item: interest }, path)
          var expectation = expectationFor(field)
          if (!expectation || !expectation.optional.length) return false
          if (expectation.expects.some(function (key) { return !hasCapability(subjects, key) })) return false
          return expectation.optional.some(function (key) { return !hasCapability(subjects, key) })
        })
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
  function interpolate(text, record) {
    return String(text).replace(/\{\{(\w+)\}\}/g, function (whole, key) {
      if (key === 'subjectCount') return String(record.subjects.length)
      if (Object.prototype.hasOwnProperty.call(R.thresholds, key)) return String(R.thresholds[key])
      var value = record[key]
      return value === undefined || value === null || value === '' ? '—' : String(value)
    })
  }

  /* -------------------------- DOM plumbing ---------------------------- */
  function $(id) { return document.getElementById(id) }
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
      previousIntake: $('previousIntake').value || null,
      targetAtar: numOrNull($('targetAtar').value),
      estimatedAtar: numOrNull($('estimatedAtar').value),
      stillDeciding: $('stillDeciding').value === 'true',
      fundingSecured: boolOrNull($('fundingSecured').value),
      interests: interests,
      subjects: subjects,
    }
  }

  function writeRecord(rec) {
    $('fullName').value = rec.fullName || ''
    $('englishFirstLanguage').value = rec.englishFirstLanguage === null || rec.englishFirstLanguage === undefined ? '' : String(rec.englishFirstLanguage)
    $('previousIntake').value = rec.previousIntake || ''
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
        outcome.fired = !!compiled[rule.id](rec, helpers)
      } catch (error) {
        outcome.reason = pick('threw: ', '求值出错：') + error.message
      }
      return outcome
    })
  }

  /* ---------------------------------------------------------------------
   * ATAR conversion. Deliberately refuses to imply confidence it does not
   * have: while the calibration is unverified, the number is labelled as
   * such everywhere it appears.
   * -------------------------------------------------------------------*/
  function aggregateToAtar(sum) {
    var c = R.calibration.coefficients
    var value = 0
    for (var i = 0; i < c.length; i++) value += c[i] * Math.pow(sum, i)
    return Math.max(R.calibration.clamp[0], Math.min(R.calibration.clamp[1], value))
  }

  function bestAggregate(rec) {
    var marks = rec.subjects
      .map(function (s) { return s.mark })
      .filter(function (m) { return typeof m === 'number' })
      .sort(function (a, b) { return b - a })
    var n = R.calibration.aggregateSize
    if (marks.length < n) return null
    var top = marks.slice(0, n)
    return top.reduce(function (a, b) { return a + b }, 0)
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
      lines.push(interpolate(pick(item.rule.advice, item.rule.zh), rec))
      lines.push('   [rule: ' + item.rule.id + ' · source: ' + item.rule.source + ']')
    })

    if (fired.length === 0) lines.push(pick('No rule conditions were met. The record may be too sparse to advise on.', '没有命中任何规则，可能是记录信息太少，不足以给出建议。'))

    var agg = bestAggregate(rec)
    if (agg !== null) {
      lines.push('')
      lines.push(LANG === 'zh' ? '— 合成分换算 —' : '— AGGREGATE CONVERSION —')
      lines.push('')
      lines.push(LANG === 'zh' ? ('最好的 ' + R.calibration.aggregateSize + ' 门科目合计 ' + agg.toFixed(1) + '。') : ('Best ' + R.calibration.aggregateSize + ' subject marks total ' + agg.toFixed(1) + '.'))
      lines.push((LANG === 'zh' ? '参考 ATAR：' : 'Indicative ATAR: ') + aggregateToAtar(agg).toFixed(2))
      lines.push('   [' + R.calibration.caveat + ']')
    }

    return { text: lines.join('\n'), fired: fired }
  }

  function renderReport() {
    var rec = readRecord()
    var check = validate(rec)

    var box = $('validationBox')
    box.innerHTML = ''
    if (check.errors.length) {
      box.appendChild(el('div', { 'class': 'note err', html: '<strong>Cannot generate a report:</strong><ul style="margin:6px 0 0 18px">' +
        check.errors.map(function (e) { return '<li>' + escapeHtml(e) + '</li>' }).join('') + '</ul>' }))
    } else if (check.warnings.length) {
      box.appendChild(el('div', { 'class': 'note', html: '<strong>Worth checking:</strong><ul style="margin:6px 0 0 18px">' +
        check.warnings.map(function (e) { return '<li>' + escapeHtml(e) + '</li>' }).join('') + '</ul>' }))
    } else {
      box.appendChild(el('div', { 'class': 'note ok', text: 'Record passes validation.' }))
    }

    var results = evaluate(rec)
    var report = buildReport(rec, results)
    generated = { record: rec, report: report, results: results, check: check }

    // Report tab
    $('reportBody').innerHTML = ''
    report.fired.forEach(function (item) {
      var d = R.domains.filter(function (x) { return x.id === item.rule.domain })[0]
      $('reportBody').appendChild(el('p', { 'class': 'advice', html:
        '<span class="badge">' + escapeHtml(d ? domainLabel(d) : item.rule.domain) + '</span>' +
        escapeHtml(interpolate(pick(item.rule.advice, item.rule.zh), rec)) }))
      $('reportBody').appendChild(el('span', { 'class': 'src',
        text: 'rule: ' + item.rule.id + ' · source: ' + item.rule.source +
              (item.rule.verified ? ' · verified ' + item.rule.verified : ' · NOT VERIFIED') }))
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
    $('reportWarnings').innerHTML = check.errors.length
      ? '<div class="note err">This report was generated from a record with ' + check.errors.length + ' validation error(s). Treat it as a draft.</div>'
      : ''

    showTab('report')
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
    $('trackerSummary').textContent = outstanding === 0
      ? (LANG === 'zh' ? '没有未完成的考核。' : 'No outstanding assessments recorded.')
      : (LANG === 'zh'
          ? (outstanding + ' 项未完成 · ' + critical + ' 项为重要及以上。已过日期的行会加底色。')
          : (outstanding + ' outstanding · ' + critical + ' at major-or-critical weight. Rows past their due date are shaded.'))
  }

  /* -------------------------- tabs, storage, export ------------------- */
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
  $('addInterest').addEventListener('click', function () { addInterestRow() })
  $('addSubject').addEventListener('click', function () { addSubjectRow() })
  $('addAssess').addEventListener('click', function () { addAssessRow() })
  $('btnGenerate').addEventListener('click', renderReport)
  $('btnSample').addEventListener('click', function () { writeRecord(sample()); renderReport() })
  $('btnClear').addEventListener('click', function () { writeRecord({ interests: [], subjects: [] }); $('validationBox').innerHTML = '' })
  $('btnSave').addEventListener('click', function () {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readRecord()))
      $('validationBox').innerHTML = '<div class="note ok">Saved to this browser only. Nothing was sent anywhere.</div>'
    } catch (e) {
      $('validationBox').innerHTML = '<div class="note err">Could not save: ' + escapeHtml(e.message) + '</div>'
    }
  })
  $('btnLoad').addEventListener('click', function () {
    var raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) { $('validationBox').innerHTML = '<div class="note">Nothing saved in this browser yet.</div>'; return }
    writeRecord(JSON.parse(raw))
  })
  $('btnPrint').addEventListener('click', function () { window.print() })
  $('btnCopy').addEventListener('click', function () {
    if (generated) navigator.clipboard.writeText(generated.report.text)
  })
  $('btnDownload').addEventListener('click', function () {
    if (!generated) return
    var blob = new Blob([generated.report.text], { type: 'text/markdown' })
    var a = el('a', { href: URL.createObjectURL(blob), download: 'advising-report.md' })
    document.body.appendChild(a); a.click(); a.remove()
  })
  Array.prototype.forEach.call(document.querySelectorAll('nav.tabs button'), function (b) {
    b.addEventListener('click', function () { showTab(b.dataset.tab) })
  })

  // appTitle/appSub are baked into the page shell, not set here.

  writeRecord({ interests: [], subjects: [] })
  addAssessRow({ name: 'Sample assessment', weight: 15, urgency: 4, due: '' })
})()
