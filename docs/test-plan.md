# TPAE Free — Master QA Test Plan

**Plugin:** The Plus Addons for Elementor (Free)  
**Version under test:** 6.4.14  
**Plan version:** 1.0  
**Date:** 2026-05-01

---

## 1. Objectives

- Verify all 61 free widgets render correctly and are interactive.
- Confirm AJAX-driven features (Load More, Form Submission) work for authenticated and unauthenticated users.
- Validate Elementor extensions (Animation, Copy-Paste, Dynamic Tags, Equal Height, Wrapper Link) integrate without regressions.
- Ensure responsive behaviour across Desktop / Tablet / Mobile breakpoints.
- Catch regressions introduced by version upgrades before release.

---

## 2. Scope

### In Scope
- All 61 widgets available in the free version
- 6 Elementor extensions bundled in the free version
- AJAX handlers: `tpae_form_submission`, `L_theplus_more_post`
- Admin dashboard: widget enable/disable toggle
- Performance cache: CSS/JS generation per page
- Elementor editor integration (widget panel, controls, preview)

### Out of Scope
- Pro-only widgets (audio player, chart, WooCommerce builders, etc.)
- License activation flow
- White-label settings
- Multisite environments
- Third-party plugin conflicts (WooCommerce, ACF, WPML) — covered separately

---

## 3. Test Environment

| Item | Requirement |
|------|-------------|
| WordPress | 6.0 – 6.9 |
| PHP | 7.4 – 8.3 |
| Elementor | Latest stable (3.x / 4.x) |
| TPAE Free | 6.4.14 |
| Theme | Hello Elementor (baseline) |
| Browsers | Chrome 120+, Firefox 120+, Safari 17+ (desktop); Chrome Mobile (responsive) |
| Devices | Desktop 1440px, Tablet 768px, Mobile 375px |

---

## 4. Test Types

| Type | Tool | When |
|------|------|------|
| Manual exploratory | Browser DevTools | Each release |
| Automated E2E | Playwright | Every push / PR via CI |
| Unit (JS helpers) | Vitest | Every push / PR via CI |
| Responsive | Playwright viewports | Every push / PR via CI |
| Regression | Full Playwright suite | Before release tag |
| Accessibility | axe-core via Playwright | Monthly / on new widgets |

---

## 5. Widget Coverage Matrix

### 5.1 Content Widgets

| # | Widget | Slug | Key Test Areas |
|---|--------|------|----------------|
| 1 | Heading Title | `tp_heading_title` | All styles, gradient text, highlight word, HTML tag selection, dynamic tag |
| 2 | Advanced Text Block | `tp_adv_text_block` | Typography, column layout, text limits |
| 3 | Blockquote | `tp_blockquote` | Quote styles, author display, border styles |
| 4 | Info Box | `tp_info_box` | Icon/image box type, hover effects, link behaviour |
| 5 | Message Box | `tp_messagebox` | Alert types, dismiss button, icon |
| 6 | Icon | `tp_icon` | Icon library selection, size, colour, link |

### 5.2 Blog / Listing Widgets

| # | Widget | Slug | Key Test Areas |
|---|--------|------|----------------|
| 7 | Blog Listout | `tp_blog_listout` | Grid/List/Carousel layout, load-more AJAX, filter, pagination, post type query |
| 8 | Clients Listout | `tp_clients_listout` | Grid/Carousel, logo hover, lightbox |
| 9 | Team Member | `tp_team_member_listout` | Card/Overlay styles, social icons, carousel |
| 10 | Testimonial | `tp_testimonial_listout` | Carousel/Grid, star rating, author |
| 11 | Gallery | `tp_gallery_listout` | Grid/Masonry/Carousel, lightbox, filter |
| 12 | Dynamic Categories | `tp_dynamic_categories` | Taxonomy listing, icon, count |

### 5.3 Interactive Widgets

| # | Widget | Slug | Key Test Areas |
|---|--------|------|----------------|
| 13 | Accordion | `tp_accordion` | Open/close, multiple open, icon, animation speed |
| 14 | Tabs & Tours | `tp_tabs_tours` | Horizontal/Vertical tabs, active tab, icon |
| 15 | Flip Box | `tp_flip_box` | Flip direction, front/back content, animation |
| 16 | Hover Card | `tp_hovercard` | Hover reveal, overlay content, link |
| 17 | Countdown | `tp_countdown` | Timer display, expiry action, format |
| 18 | Number Counter | `tp_number_counter` | Count animation, prefix/suffix, scroll trigger |
| 19 | Progress Bar | `tp_progress_bar` | Bar/Circle/Milestone style, animation on scroll |
| 20 | Switcher | `tp_switcher` | Toggle between two content blocks |
| 21 | Age Gate | `tp_age_gate` | Cookie persistence, redirect on fail, customisation |
| 22 | Dark Mode | `tp_dark_mode` | Toggle, persistence in localStorage |

### 5.4 Navigation Widgets

| # | Widget | Slug | Key Test Areas |
|---|--------|------|----------------|
| 23 | Navigation Menu Lite | `tp_navigation_menu_lite` | Horizontal/Vertical, dropdowns, mobile hamburger, mega menu placeholder |
| 24 | Breadcrumbs Bar | `tp_breadcrumbs_bar` | Separator, home icon, structured data |
| 25 | Scroll Navigation | `tp_scroll_navigation` | Dot nav, section links, active state on scroll |
| 26 | Page Scroll | `tp_page_scroll` | Full-page scroll sections, keyboard nav |
| 27 | Smooth Scroll | `tp_smooth_scroll` | Offset, scroll-to-section |

### 5.5 Media Widgets

| # | Widget | Slug | Key Test Areas |
|---|--------|------|----------------|
| 28 | Video Player | `tp_video_player` | YouTube/Vimeo/Self-hosted, autoplay, controls, poster |
| 29 | Social Embed | `tp_social_embed` | Twitter/X, Instagram embed, responsive sizing |
| 30 | Social Icon | `tp_social_icon` | Icon set, hover colour, target |
| 31 | Syntax Highlighter | `tp_syntax_highlighter` | Language selection, copy button, download button, themes |

### 5.6 Form Widgets

| # | Widget | Slug | Key Test Areas |
|---|--------|------|----------------|
| 32 | Plus Form | `tp_plus_form` | Field types, validation, submit AJAX, email dispatch, redirect |
| 33 | Contact Form 7 | `tp_contact_form_7` | Form selection, style overrides |
| 34 | Ninja Forms | `tp_ninja_form` | Form selection, style |
| 35 | WP Forms | `tp_wp_forms` | Form selection, style |
| 36 | Gravity Forms | `tp_gravity_form` | Form selection, style |
| 37 | Everest Forms | `tp_everest_form` | Form selection, style |
| 38 | Caldera Forms | `tp_caldera_forms` | Form selection, style |

### 5.7 Layout / Data Widgets

| # | Widget | Slug | Key Test Areas |
|---|--------|------|----------------|
| 39 | Carousel Anything | `tp_carousel_anything` | Slides, arrows, dots, autoplay, responsive columns |
| 40 | Style List | `tp_style_list` | Icon list, read-more expand, bullet styles |
| 41 | Table | `tp_table` | Headers, rows, sortable, CSV import |
| 42 | Pricing Table | `tp_pricing_table` | Single/Comparison/Ribbon, highlight, button |
| 43 | Process Steps | `tp_process_steps` | Horizontal/Vertical, connector line, icon |
| 44 | Heading Animation | `tp_heading_animation` | Typed/Rotation/Shine text effects |

### 5.8 Post Part Widgets

| # | Widget | Slug | Key Test Areas |
|---|--------|------|----------------|
| 45 | Post Title | `tp_post_title` | HTML tag, link, dynamic |
| 46 | Post Content | `tp_post_content` | Renders post_content |
| 47 | Post Featured Image | `tp_post_featured_image` | Size, overlay, lightbox |
| 48 | Post Author | `tp_post_author` | Avatar, name, bio, link |
| 49 | Post Meta | `tp_post_meta` | Date, category, tags, comment count |
| 50 | Post Comment | `tp_post_comment` | Comments list, form |
| 51 | Post Navigation | `tp_post_navigation` | Prev/Next, thumbnail, labels |
| 52 | Post Search | `tp_post_search` | AJAX search, post type scope |

### 5.9 Utility Widgets

| # | Widget | Slug | Key Test Areas |
|---|--------|------|----------------|
| 53 | Button | `tp_button` | Styles, hover, icon, link |
| 54 | Header Extras | `tp_header_extras` | Cart icon, search, social, phone |
| 55 | Meeting Scheduler | `tp_meeting_scheduler` | Calendly/Cal.com embed |

---

## 6. Extension Coverage

| Extension | Key Test Areas |
|-----------|----------------|
| Scroll Animation (GSAP) | Trigger on scroll, delay, duration, out-animation, mobile disable |
| Copy-Paste (Cross-Domain) | Copy widget from Elementor editor, paste on same domain, paste detects pro widgets |
| Dynamic Tags | Text tags (post title, author, category), Image tags (featured image, avatar), URL tags (post URL, term URL) |
| Equal Height | Columns equalise height, responsive breakpoints |
| Wrapper Link | Wraps section/column with `<a>`, respects target/nofollow |
| Global Controls | Gradient colour, box shadow, dimensions, button style inherit across widgets |

---

## 7. AJAX Test Cases

### 7.1 Blog Load More (`L_theplus_more_post`)

| # | Test | Expected |
|---|------|----------|
| A1 | Click "Load More" button on blog grid | Next batch of posts appended without page reload |
| A2 | Load more with active category filter | Only posts matching filter are loaded |
| A3 | Load more reaches last post | Button hidden or "No more posts" message shown |
| A4 | Invalid nonce (tampered request) | Returns "Security checked!" error |
| A5 | Empty `loadattr` payload | Handler exits silently, no PHP error |
| A6 | Network offline — click load more | Graceful failure, no JS exception |

### 7.2 Form Submission (`tpae_form_submission`)

| # | Test | Expected |
|---|------|----------|
| F1 | Submit valid form | Success response, redirect or success message |
| F2 | Submit with empty required field | Validation error returned, form not submitted |
| F3 | Submit with invalid email | Sanitized, `sanitize_email()` fails gracefully |
| F4 | Submit with tampered `email_data` | Decryption fails, handler exits |
| F5 | Submit correct form unauthenticated (guest) | Works — handler is nopriv |
| F6 | Rapid repeat submission (same nonce) | All submissions processed (nonces are reusable — document behaviour) |

---

## 8. Responsive Test Cases

For every widget with visual output:

| Breakpoint | Width | Test |
|-----------|-------|------|
| Desktop | 1440px | Default layout renders correctly |
| Tablet | 768px | Responsive columns stack / reflow |
| Mobile | 375px | No overflow, hamburger menus work |

---

## 9. Accessibility Checklist (per widget)

- [ ] Interactive elements reachable by keyboard (Tab, Enter, Space, Escape)
- [ ] `aria-expanded` on accordion/tabs toggles correctly
- [ ] Images have `alt` text (or empty `alt=""` for decorative)
- [ ] Colour contrast ≥ 4.5:1 (WCAG AA) — check default styles
- [ ] No duplicate `id` attributes per page
- [ ] Form labels associated with inputs

---

## 10. Performance Checklist

- [ ] Cache mode "separate file" — per-page CSS/JS generated to `wp-uploads/theplus-addons/`
- [ ] Cache mode "inline" — no external file, styles are inline `<style>` in `<head>`
- [ ] Cache clears after saving post in Elementor
- [ ] Admin-bar "Clear Cache" button removes cached files

---

## 11. Pass/Fail Criteria

| Severity | Criterion |
|----------|-----------|
| **Blocker** | Widget does not render / PHP fatal error / JS uncaught exception |
| **Critical** | Core functionality broken (AJAX fails, form not submitting, load-more not working) |
| **Major** | Visual breakage at any breakpoint, wrong content output |
| **Minor** | Cosmetic issue, non-blocking JS warning |

A build is **not release-ready** if any Blocker or Critical issues remain unresolved.

---

## 12. Defect Reporting

Use the [Widget Test Fail](.github/ISSUE_TEMPLATE/widget_test_fail.yml) or [Bug Report](.github/ISSUE_TEMPLATE/bug_report.yml) issue templates.

Required fields:
- Widget name + slug
- TPAE version
- WordPress + Elementor version
- Steps to reproduce
- Expected vs actual result
- Screenshot / screen recording
