# Student Advising Workbook

A rules-driven advising report generator. An advisor fills in one student
record; the engine emits the advice that applies to that student, each
paragraph tagged with the rule that produced it.

This is a **clean-room reimplementation of an architecture**, not a copy of any
existing workbook. See [Provenance](#provenance) for exactly what that means.

## Run it

Open `index.html` in any browser. No build step, no server, no dependencies, no
network access. The three shipped files are the whole application:

| File | Role |
| --- | --- |
| `advising-rules.js` | The catalog: domains, vocabularies, thresholds, capabilities, course expectations, rules, matrix, calibration |
| `index.html` | The engine: expression evaluator, validation, report assembly, UI |
| `verify-*.mjs` | Verification suites (Node, no dependencies) |

## The one architectural decision that matters

**Advice is data; the engine contains none of it.**

Every piece of advising text lives in `advising-rules.js` as a rule with a
condition. The engine walks the catalog, evaluates each condition against the
student record, and prints the advice of every rule that fires. So:

- Editing advice never means editing engine code.
- Adding a rule is one entry in one array.
- The full rule set is readable in one screen-ish document, instead of being
  scattered across hundreds of individual formulas.
- Every rule carries a `source` and a `verified` date, so an unverified claim
  is visible as unverified rather than indistinguishable from a checked one.

The **coverage view** (tab 4) is the payoff: it lists every rule, whether it
fired, and whether its content has been verified. That view cannot exist when
advice is embedded in formulas, because there is no list to render.

## Capabilities, not a course list

Prerequisite checking goes through a **capability** layer rather than a table of
courses and their requirements:

```
capabilities          mathematics -> [Mathematics, Mathematics Methods, ...]
                      physicalScience -> [Physics, Chemistry]
courseExpectations    Engineering -> expects [mathematics, physicalScience]
```

A rule then asks "does this student's recorded subject set satisfy what the
stated field normally expects?" and the mapping from capability to subject names
lives in exactly one place. Adding a newly recognised subject name to
`capabilities.mathematics` immediately affects every rule that consumes it.

This is a deliberate departure. The institutional workbook this reimplements
carries a course database whose prerequisite column is free text. Profiling it
found three rows in a machine-readable shape (`English-YES Mathematics-YES
Science/Other-NO`) and a further twelve written as prose — for example
"Mathematics (Australian Higher Year 12 equivalent) and at least one of
Chemistry or Physics (Australian Year 12 equivalent) are formal prerequisites
for the Bachelor of Engineering." Parsing that into YES/NO flags would
manufacture precision the source does not have, which is the failure mode this
project exists to avoid. So the tool asks the capability question reliably, and
where it has no figure it says so:

- `courseExpectations[*].namedAtar` is `null` for every field, meaning "no
  current figure is held". The `atar-figure-not-recorded` rule turns that into
  visible advice rather than letting a student assume a number.
- `anyInterestExpectationGap` reports only when a capability is genuinely
  absent; an unknown field returns no gap rather than guessing.
- `anyInterestOptionalGap` stays quiet while a required capability is still
  missing, so advice never competes with itself.

## Rule language

Rule conditions are expressions in a small grammar, **not JavaScript**. There is
no `eval` and no `new Function` anywhere in the engine. That is deliberate: an
expression compiled with `Function` can reach the whole global scope, including
`record.constructor.constructor("...")()`, and no amount of text scanning closes
that hole because the escape happens through the language runtime rather than
through a name a scanner can see. Parsing the expression and interpreting the
tree removes the problem instead of mitigating it.

Consequences worth knowing:

- No arrow functions, statements, assignments, loops, or function definitions.
- Comparisons against list elements go through helpers that contain the
  traversal, because the language cannot express a callback:

```js
anyInterest("i.country", "Australia")                  // any interest in AU
anyInterest("i.field", ["Medicine", "Dentistry"])      // any of several
!anyInterest("i.country", ["Australia", "United Kingdom"])
anyScoreBelow(T.weakMark)                              // uses a named threshold
record.estimatedAtar < record.targetAtar - T.targetGapPoints
```

- Only a fixed set of identifiers resolves: `record`, `T`, and the helpers
  `anyInterest`, `countSubject`, `anyScoreBelow`, `anyValueBelow`,
  `hasSubject`, `score`. A typo becomes a reported compile error naming the
  rule, never a rule that silently never fires.
- Only a fixed set of methods may be called: `some`, `every`, `includes`,
  `indexOf`, `test`, `match`, `startsWith`, `endsWith`.
- Property names `constructor`, `__proto__`, `prototype`, `caller`, `callee`,
  and `arguments` are refused on every value, by every access form.

## Thresholds

Policy numbers live in one `thresholds` object, and rules reference them as
`T.weakMark` rather than `60`. Advice text interpolates the same value with
`{{weakMark}}`, so the number stated in a sentence cannot drift away from the
number its condition tests.

This is not hypothetical tidiness. The design this reimplements compared marks
against a hard-coded `55` in one rule while its own prose implied `60` — two
rules disagreeing about what "weak" means, which verification caught and
reading did not.

## Calibration: read before using any ATAR figure

`calibration` in the catalog is an **unverified placeholder**. The design being
reimplemented embedded a fitted six-term polynomial with coefficients calibrated
against one particular exam cycle; those coefficients are another author's work
and are deliberately **not** reproduced here.

Before this tool states an ATAR anywhere:

1. Fit `coefficients` to your own official conversion tables.
2. Set `calibration.verified` to a date.
3. Remove the caveat from the report output, or keep it and label the figure
   as indicative.

Until step 2, the UI labels the conversion uncalibrated everywhere it appears.
An uncalibrated conversion emitting confident-looking numbers is the most
dangerous failure this kind of tool can have, and the guard is deliberate.

## Verification

```sh
node verify-rules.mjs   # rule language, catalog consistency, content policy
node verify-dom.mjs     # the real engine, driven against a DOM stub
```

`verify-rules.mjs` mirrors the engine's evaluator **textually** and checks it
against adversarial input: global access, `constructor` escape by dot and by
index, arrow functions, assignments, statements, unknown helpers, methods
outside the allow-list, unterminated strings. It also asserts catalog
invariants — every rule has a source and a title, no rule hard-codes a currency
figure, thresholds are consistent, the matrix is fully populated — and exercises
the capability layer case by case: a covered expected set, a missing physical
science, a missing mathematics, a field with no expectations claiming nothing,
an unknown field claiming nothing, and the optional-gap suppression rule.

`verify-dom.mjs` loads the **production engine out of `index.html`** and drives
it with a hand-written DOM stub, so it tests shipped code rather than a copy. It
covers record reading (an empty field is `null`, never `0`), validation,
rule firing on a realistic record, report assembly and provenance, threshold
interpolation, conversion clamping, and aggregate selection.

A browser-based suite was attempted and removed: Playwright launches Chromium
with `--remote-debugging-pipe`, Chrome's own mojo IPC needs named pipes, and the
environment this was built in denies named pipes. Widening the sandbox merely to
run a test was not a good trade, so the DOM stub covers the same ground without
weakening anything. **The UI has therefore not been rendered in a real browser**
— if you have one available, open `index.html` and click through the four tabs
once before trusting it with a real student.

## Deploying under the course-notes site

The template is built to sit under the same static site. What was checked and
what was changed:

**Already compatible**: no build step, no CDN, no network access; a classic
`<script src>` tag rather than an ES module, so there is no CORS or MIME issue
over HTTPS; `localStorage` works on GitHub Pages; the deployment workflow
uploads the whole repository directory, so a subdirectory is published without
touching the workflow.

**Changed to fit**: the palette now uses the site's token values, with a
`prefers-color-scheme: dark` block mirroring the site's own media query, so one
preference is honoured in both places. A real `@media print` block was added —
chrome removed, colours dropped to ink, advice paragraphs kept off page
boundaries — because a printed report is this tool's main output and it had only
a `window.print()` button before.

**Still to decide**: naming and placement. The site uses lowercase directories
(`notes/`, `assets/`) and a 780px reading column; this tool needs a wider
column, so it should keep its own max-width rather than inherit the notes one.

### Privacy: read before publishing this

The site's own home page states that it contains **no personal information**.
This tool exists to hold a student's record. Those two statements cannot both be
true once it is deployed to that site.

The repository is public, and the Pages workflow uploads everything not covered
by `.gitignore`, so any file added here becomes world-readable — including the
advice catalog, which would let a student read the exact rules they are being
assessed against. The tool itself keeps records only in the browser's
`localStorage` and makes no network request, so nothing is transmitted; the
exposure is the files, not the data flow.

Options, none of them fixed here because the choice is the site owner's:

1. **Keep it local.** Open `index.html` from disk. Nothing is published, the
   home page's statement stays true, and no hosting decision is needed.
2. **Publish it deliberately**, and amend the home page's statement so it is
   accurate rather than contradicted.
3. **Host it separately**, so the notes site's claim remains untouched.

GitHub Pages on the free tier cannot serve from a private repository, so
"publish but keep it private" is not available without changing host.

## Content policy

Every string in the catalog is originally written for this template and is
**illustrative sample copy**, not a policy source. All figures are placeholders.
Rules that make a factual claim point at where a human must confirm it, and show
as *verify* in the coverage view until someone does. The suite fails if a rule
states a currency amount, because amounts belong in a link to a current program
page, not in a string that will silently go stale.

## Provenance

The architecture was studied from an existing institutional workbook and
reimplemented from scratch. Specifically:

**Taken from the architecture** (ideas, not expression): the overall shape of
form → rule table → generated report; "emit only what applies, and let
non-matching rules produce nothing"; deriving each assessment's importance from
its own weight; a two-dimensional importance × urgency matrix returning one
advisory action; a single aggregate-to-ATAR conversion feeding a target
calculator.

**Not taken**: any advice text, any rule wording, any numeric coefficient, any
threshold value, any university or scholarship list, any figure or URL, and any
code. The workbook itself was never opened in Excel and its macros were never
executed. Its course database was read only to profile the *shape* of its
prerequisite data — the finding that it is mostly prose, which is why this
template uses a capability layer instead of copying the list.

**Deliberately changed** (each one is a defect the original design had):

| Original | Here |
| --- | --- |
| Advice embedded in individual formulas | Advice is data in one catalog |
| Unguarded exact-string comparisons, so a typo silently disabled advice | Controlled vocabularies plus validation that reports the problem |
| Validation attached to four cells out of fifteen sheets | Every field validated, with reasons |
| Rules scattered with no way to see the whole set | A coverage view listing every rule and its status |
| Thresholds hard-coded per rule | Named thresholds, referenced by conditions and prose alike |
| A course list whose prerequisites are free text, treated as if structured | A capability layer, with unheld figures surfaced rather than invented |
| Rules and student data in the same distributed file | Rules in the catalog, student data separate |
| Requires Excel 2021+ dynamic arrays, untested on older versions | Runs in any browser with no version dependency |
| A fitted conversion polynomial trusted outside its fitted range | An explicitly unverified placeholder that refuses to look confident |

## Known gaps

- The UI has not been exercised in a real browser (see Verification).
- `calibration` is unverified.
- Rules marked *verify* in the coverage view have unconfirmed factual claims.
- `courseExpectations[*].namedAtar` is `null` for every field, so the tool can
  compare a standing against a figure *you* record but supplies none itself.
- The capability mapping is a starting set of subject names. It is the first
  thing to correct against your actual subject catalogue.
- Storage is `localStorage` in one browser. There is no multi-advisor sync, no
  audit log, and no per-student file format yet.
- The report is exportable as Markdown and via the browser's print-to-PDF; there
  is no `.docx` output.
