# Widget: Navigation Menu Lite (`tp_navigation_menu_lite`)

**File:** `modules/widgets/tp_navigation_menu_lite.php` (2,745 lines)  
**Category:** Navigation

---

## Controls Under Test

| Control | Values to Test |
|---------|----------------|
| Menu | Any registered WP menu |
| Layout | Horizontal, Vertical |
| Submenu Trigger | Hover, Click |
| Mobile Breakpoint | 767px, 991px |
| Mobile Menu Type | Dropdown, Slide, Full Screen |
| Hamburger Icon | Hamburger, X/close |
| Indicator | Arrow, Plus, None |

---

## Test Cases

### Desktop

| ID | Steps | Expected |
|----|-------|----------|
| NM-01 | Select menu with 3 top-level items | 3 items rendered inline |
| NM-02 | Menu item has children | Submenu indicator shown |
| NM-03 | Hover parent item (trigger=hover) | Submenu drops down |
| NM-04 | Click parent item (trigger=click) | Submenu appears on click |
| NM-05 | Click outside open submenu | Submenu closes |
| NM-06 | Active page item | Active class applied to correct item |
| NM-07 | Menu item with custom link | Navigates correctly |
| NM-08 | Vertical layout selected | Items stack vertically |

### Mobile

| ID | Steps | Expected |
|----|-------|----------|
| NM-M01 | Viewport ≤ breakpoint | Hamburger button appears, menu hidden |
| NM-M02 | Click hamburger | Mobile menu opens |
| NM-M03 | Click item with children in mobile | Submenu expands inline |
| NM-M04 | Click X / hamburger again | Menu closes |
| NM-M05 | Mobile menu = Full Screen | Menu covers full viewport |

### Accessibility

| ID | Steps | Expected |
|----|-------|----------|
| NM-A01 | Tab through menu items | Each item focusable |
| NM-A02 | Press Enter on item with submenu | Submenu opens |
| NM-A03 | Press Escape | Open submenu closes |
