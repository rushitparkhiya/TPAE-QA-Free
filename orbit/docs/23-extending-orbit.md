# Extending Orbit — How to Make It Better

> Orbit is not a finished product — it's a maintained framework. This doc shows
> you how to add your own checks, write Playwright specs, create custom Claude
> skills, and contribute back.

**Audience:** Developers who want to extend Orbit for their team or contribute
upstream. Assumes familiarity with bash, JS/Playwright, and WordPress basics.

---

## The three ways to extend Orbit

### 1. Add a new check script (easiest)
Add `scripts/check-<thing>.sh` — a standalone bash script that takes a plugin
path, checks one thing, exits 0/1. Wire it into `gauntlet.sh`. **90% of
extensions are this.**

### 2. Write a new Playwright spec
Add `tests/playwright/flows/<thing>.spec.js`. Configure it via env vars or
`qa.config.json`. Register it as a new project in `playwright.config.js`.
**Use this when a real browser is needed.**

### 3. Create a custom Claude skill
Add `~/.claude/skills/orbit-<thing>/SKILL.md`. Define what Claude should check,
what bad/good code looks like, what severity to assign. **Use for patterns too
subtle for grep — data flow, ownership, intent-aware reviews.**

---

## The ideation loop — how to decide what to build

Before writing code, answer these in order:

### A. Whose perspective does this serve?
From VISION.md's 6 personas: Dev / QA / PM / PA / Designer / End User. If the
new check doesn't help at least one of them, it doesn't belong in Orbit.

### B. What evidence says this matters?
One of:
- CVE or security report (Patchstack / Wordfence / NVD)
- WordPress.org plugin review team update
- Reddit / HN thread with ≥20 upvotes complaining about this
- PHP/WP version changelog you can link
- Real production postmortem from your own work

No evidence → don't build it. We're not guessing at problems.

### C. Can it be expressed as a grep pattern?
If yes → write a bash script. Ship in an hour.
If it needs AST parsing or data flow analysis → write a Claude skill.
If it needs a live browser → write a Playwright spec.

### D. Will it false-positive?
Run your check against 3 popular plugins from wp.org (pick different types —
SEO, e-commerce, Elementor addon). If >1 of them triggers a false positive,
tighten the pattern until it doesn't.

### E. Does it skip gracefully?
The plugin doesn't use WooCommerce → HPOS check should skip (exit 0), not fail.
The plugin has no blocks → block.json check should skip. Pattern: detect
applicability first, then run the real check.

---

## Template: adding a new check script

Copy this and fill in the blanks:

```bash
#!/usr/bin/env bash
# Orbit — <One-line what this checks>
#
# <Why this matters. Evidence: CVE / WP.org rule / changelog / etc.>

set -e

PLUGIN_PATH="${1:-}"
[ -z "$PLUGIN_PATH" ] && { echo "Usage: $0 /path/to/plugin"; exit 1; }
[ ! -d "$PLUGIN_PATH" ] && { echo "Not a dir: $PLUGIN_PATH"; exit 1; }

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

# 1. Applicability check — skip if not relevant
USES_THING=$(grep -rEl "some_indicator" "$PLUGIN_PATH" --include="*.php" \
  --exclude-dir=vendor --exclude-dir=node_modules 2>/dev/null | wc -l | tr -d ' ')
if [ "$USES_THING" -eq 0 ]; then
  echo "Plugin doesn't use <thing> — check not applicable"
  exit 0
fi

# 2. The real check
FAIL=0
HITS=$(grep -rEn "bad_pattern" "$PLUGIN_PATH" --include="*.php" \
  --exclude-dir=vendor --exclude-dir=node_modules 2>/dev/null | head -5 || true)
if [ -n "$HITS" ]; then
  echo -e "${RED}✗ <What's wrong>${NC}"
  echo "$HITS" | head -2 | sed 's/^/   /'
  echo "   Fix: <how>"
  FAIL=1
fi

# 3. Summary
if [ "$FAIL" -eq 1 ]; then
  echo -e "${RED}<Check name>: FAIL${NC}"
  exit 1
fi
echo -e "${GREEN}✓ <Check name>: PASS${NC}"
exit 0
```

Then wire into `gauntlet.sh`:

```bash
# Inside the release-gate block
if bash scripts/check-<thing>.sh "$PLUGIN_PATH" 2>&1; then
  log "- ✓ <Check name>"; ((PASS++))
else
  log "- ✗ <Check name>"; ((FAIL++))
fi
```

Then add an entry to `docs/18-release-checklist.md`.

---

## Template: adding a new Playwright spec

```javascript
// @ts-check
/**
 * Orbit — <What this verifies>
 *
 * <Why this matters>
 *
 * Usage:
 *   PLUGIN_SLUG=my-plugin npx playwright test <thing>.spec.js
 */

const { test, expect } = require('@playwright/test');
const { attachConsoleErrorGuard, assertPageReady } = require('../helpers');

const PLUGIN_SLUG = (process.env.PLUGIN_SLUG || '').replace(/[^a-zA-Z0-9_-]/g, '');
const SOMETHING   = process.env.PLUGIN_SOMETHING;

// Serialize if the spec mutates shared WP state (user creation, plugin activation,
// options, locale, admin color scheme, etc.)
test.describe.configure({ mode: 'serial' });

test.describe('<what>', () => {
  test.skip(!PLUGIN_SLUG || !SOMETHING,
    'Set PLUGIN_SLUG + PLUGIN_SOMETHING to run this spec');

  test('does the thing', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);

    await page.goto(`/wp-admin/admin.php?page=${SOMETHING}`);
    await assertPageReady(page, 'context description');

    // Your assertions here
    await expect(page.locator('#wpbody-content')).toBeVisible();

    guard.assertClean('<test name>');
  });
});
```

Then add a project to `playwright.config.js`:

```javascript
{
  name: 'my-project',
  use: {
    ...devices['Desktop Chrome'],
    storageState: AUTH_FILE,
  },
  testMatch: '**/flows/<thing>.spec.js',
  dependencies: ['setup'],
},
```

---

## Template: creating a custom Claude skill

```markdown
---
name: orbit-<thing>
description: <What this reviews. When to invoke it. What it will NOT do.>
---

# Orbit <Thing> Reviewer

You are a **<specific role — reviewer, not generator>**. You read <files> to
find <issues>. You do NOT <anti-goal>.

## Your Task

Read the <language> files. Find every <thing>. For each finding:
- Severity: Critical / High / Medium / Low
- File and line number
- The problematic code
- The corrected code
- Why it matters

## Patterns to Check

### 1. <Pattern name>

\`\`\`<lang>
// BAD
<bad code>

// CORRECT
<good code>
\`\`\`

**Flag every <specific trigger>.** <Severity> severity.

[...repeat for 10+ patterns...]

## Report Format

\`\`\`
# <Plugin> — <Skill> Audit

## Summary Table

| Severity | Count |
|---|---|
| Critical | X |
| High | X |

---

## Critical Findings

### <Finding title>
**File:** path/file.php:LN
**Pattern:** <Pattern N>
**Code:** [snippet]
**Fix:** [snippet]
\`\`\`
```

Rules for skill design:
- **Define negative scope first** — what the skill is NOT
- **Bad code + good code + severity** for every pattern
- **Cite sources** in the SKILL.md preamble (CVE, Patchstack article, WP.org handbook link)
- **Structure the output** — severity table first, then findings, always

---

## Creating a new test pattern for a plugin type

If you're adding support for a new WP plugin category (say, membership
plugins), follow this flow:

### Step 1: Research the category's unique failure modes
Spend 1-2 hours reading:
- Top 3 membership plugin GitHub issues
- r/ProWordPress threads on membership plugins
- WP.org plugin review rejections for that category

Document the unique failure patterns.

### Step 2: Map to Orbit's structure
Each unique pattern gets one of:
- Grep rule → `scripts/check-membership.sh`
- Runtime check → `tests/playwright/flows/membership-<scenario>.spec.js`
- Code review → add section to an existing skill (or new skill if broad)

### Step 3: Add fixture data
Membership plugins need fake users / subscription tiers. Create a
`tests/fixtures/seed-membership.sh` that sets up the data.

### Step 4: Document the plugin type in `docs/07-test-templates.md`
Show the template specs, the fixtures, the gotchas.

### Step 5: Announce in VISION.md coverage matrix
Add the row.

---

## How to write Playwright specs that are actually useful

### Principles

1. **Every spec asserts ONE behavior.** Not "it works" — "settings form saves when email contains +".
2. **Use `getByRole` and `getByLabel` before CSS selectors.** Accessible queries are readable and resilient.
3. **Always attach `attachConsoleErrorGuard`.** Silent JS errors are the #1 missed bug.
4. **Always call `assertPageReady`** at the start — fails fast on permission errors instead of recording a broken screen.
5. **Serialize when mutating shared state.** Parallel tests activating plugins / switching locale / clobbering options will flake.
6. **Clean up in `afterAll`.** Users created, options set, cron scheduled — restore the starting state.

### Anti-patterns

```javascript
// BAD — vague
test('dashboard works', async ({ page }) => {
  await page.goto('/wp-admin/');
  await expect(page.locator('#wpbody-content')).toBeVisible();
});

// GOOD — specific + verifiable
test('plugin settings save persists after reload', async ({ page }) => {
  const guard = attachConsoleErrorGuard(page);
  await page.goto(`/wp-admin/admin.php?page=${ADMIN_SLUG}`);
  await assertPageReady(page);
  await page.fill('input[name="api_key"]', 'test_12345');
  await page.click('button[type="submit"]');
  await page.waitForSelector('.notice-success');
  await page.reload();
  await expect(page.locator('input[name="api_key"]')).toHaveValue('test_12345');
  guard.assertClean('settings persistence');
});
```

### Choosing what to test

Use the scaffolder output as your starting point:

```bash
bash scripts/scaffold-tests.sh ~/plugins/my-plugin
cat scaffold-out/my-plugin/qa-scenarios.md
```

For each scaffolded scenario:
- **Smoke-level** (exists, loads, doesn't fatal) → generic Orbit specs cover this
- **Business-logic** (discount applies, report emails, form submits correctly) → write a custom spec

Everything in between: judgment call. Ask "would I ship a release without knowing this works?"

---

## Contributing back to Orbit

If you've written an extension that's plugin-agnostic, send a PR:

### Checklist before PR
- [ ] Script/spec works on at least 3 plugins from different categories
- [ ] Skips gracefully when not applicable (exits 0, not 1)
- [ ] Cited source in the top comment (CVE, WP.org handbook, etc.)
- [ ] No plugin brand names in code
- [ ] Added to `gauntlet.sh` with appropriate mode gate (`full` / `release` / `quick`)
- [ ] Entry in `docs/18-release-checklist.md`
- [ ] Row in `VISION.md` coverage matrix
- [ ] Test output example in PR description
- [ ] Syntax-validated (`bash -n`, `node --check`, `python3 -m json.tool`)

### What we reject
- Plugin-specific logic
- Checks without a real-world source cited
- Duplication with existing checks
- Features that require paid APIs
- Runtime monitoring / WAF / live-site pen-testing (those are different product categories — see VISION.md anti-goals)

### What we love
- New attack pattern detection with cited CVE
- Performance benchmarks with source data
- Accessibility checks beyond axe-core
- Coverage for new WP/PHP versions
- Better error messages in existing scripts

---

## Roadmap — what we're watching

The [evergreen security log](21-evergreen-security.md) tracks security. For
feature extensions, these are open research items (as of April 2026):

1. **Mutation testing via Infection PHP** — real value for plugins that already have PHPUnit tests. Waiting on adoption before shipping.
2. **REST/AJAX fuzz testing from scaffolder data** — spray malformed payloads at every discovered endpoint. Research-grade, needs design.
3. **Cross-plugin conflict aggregation** — if N users run Orbit, we know which plugin-pair combos break. Needs opt-in telemetry we don't want to build.
4. **Site Health test plugin-self-registration** — warn if plugins with external deps don't register `site_status_tests`.
5. **Block Bindings API correctness** — for plugins that expose data sources.

File a PR with a proposal (not code yet) before starting work on any of these.

---

## How to keep Orbit honest over time

This is the single-most-important extension practice. Orbit gets stale
fast because WordPress ships fast.

**Every 90 days:**
1. Re-read the evergreen security log (`docs/21-evergreen-security.md`)
2. Check Patchstack, Wordfence, NVD for new vuln categories — promote WATCHING → RESEARCHING → SHIPPED
3. Check WP release notes for new core APIs — add to `check-wp-compat.sh` + `check-modern-wp.sh`
4. Check PHP release notes — add to `check-php-compat.sh`
5. Read 5 GitHub issues on top plugins — what breaks? Is it something Orbit should catch?
6. Update `VISION.md` "current state" table

If no one does this, Orbit becomes a 2024 tool pretending to be current. The
quarterly cadence is what keeps it real.

---

## References

- `VISION.md` — 6 perspectives + principles this doc depends on
- `docs/21-evergreen-security.md` — security research log
- `docs/19-business-logic-guide.md` — per-plugin test writing
- `docs/20-auto-test-generation.md` — scaffolder deep-dive
- `AGENTS.md` — skill orchestration
