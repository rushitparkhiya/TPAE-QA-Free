# TPAE QA — Free Plugin Test Suite

Structured QA test plan and automated Playwright E2E tests for **The Plus Addons for Elementor** (free, v6.4.x).

---

## What's Inside

```
docs/
  test-plan.md          Master QA plan — scope, coverage matrix, test strategy
  widgets/              Per-widget test specs (all 61 free widgets)
  extensions/           Extension test specs (animation, copy-paste, dynamic tags, etc.)

tests/
  e2e/
    playwright.config.js
    helpers/            Reusable login, Elementor editor, and page helpers
    specs/
      widgets/          Playwright specs per widget
      ajax/             Load-more and form-submission AJAX tests
      extensions/       Copy-paste, dynamic tag, animation tests
  unit/                 Vitest unit tests for JS utility helpers

.github/
  workflows/
    playwright.yml      CI — runs E2E suite on push / PR
  ISSUE_TEMPLATE/       Bug report and widget test-fail templates
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| WordPress (local) | 6.0+ |
| Elementor | 3.x+ |
| TPAE Free | 6.4.x |

Recommended local WP stack: [LocalWP](https://localwp.com/), [wp-env](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/), or Docker.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install --with-deps chromium

# 3. Copy env config
cp .env.example .env
# Edit .env with your WP site URL, admin credentials, test page IDs

# 4. Run all E2E tests
npm test

# 5. Run a single widget suite
npx playwright test tests/e2e/specs/widgets/accordion.spec.js

# 6. Open interactive UI mode
npx playwright test --ui
```

---

## Environment Variables (`.env`)

```ini
WP_BASE_URL=http://localhost:10003
WP_ADMIN_USER=admin
WP_ADMIN_PASS=password
WP_BLOG_PAGE_ID=5
WP_FORM_PAGE_ID=8
WP_ACCORDION_PAGE_ID=10
```

---

## Test Coverage

| Category | Widgets | Specs |
|----------|---------|-------|
| Content | Heading Title, Adv Text Block, Blockquote, Info Box, Message Box, Icon | ✅ |
| Blog / Listing | Blog Listout, Clients Listout, Team Member, Testimonial, Gallery, Dynamic Categories | ✅ |
| Interactive | Accordion, Tabs & Tours, Flip Box, Hover Card, Countdown, Number Counter, Progress Bar | ✅ |
| Navigation | Navigation Menu Lite, Breadcrumbs Bar, Scroll Navigation, Page Scroll, Smooth Scroll | ✅ |
| Media | Video Player, Social Embed, Social Icon, Syntax Highlighter | ✅ |
| Forms | Plus Form, Contact Form 7, Ninja Form, WP Forms, Gravity Form, Everest Form, Caldera Forms | ✅ |
| Layout | Carousel Anything, Style List, Switcher, Table, Pricing Table, Process Steps | ✅ |
| Post Parts | Post Title, Post Content, Post Featured Image, Post Author, Post Meta, Post Comment, Post Navigation, Post Search | ✅ |
| Misc | Button, Age Gate, Dark Mode, Header Extras, Heading Animation, Meeting Scheduler | ✅ |
| Extensions | Animation, Copy-Paste, Dynamic Tags, Equal Height, Wrapper Link, Global Controls | ✅ |
| AJAX | Load More (Blog Listout), Form Submission (Plus Form) | ✅ |

---

## Docs

- [Master Test Plan](docs/test-plan.md)
- Widget specs in [docs/widgets/](docs/widgets/)
- Extension specs in [docs/extensions/](docs/extensions/)
