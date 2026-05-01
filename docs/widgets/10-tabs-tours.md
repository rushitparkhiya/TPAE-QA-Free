# Widget: Tabs & Tours (`tp_tabs_tours`)

**File:** `modules/widgets/tp_tabs_tours.php`  
**Category:** Interactive

---

## Controls Under Test

| Control | Values to Test |
|---------|----------------|
| Tab Style | Horizontal top, Horizontal bottom, Vertical left, Vertical right |
| Items (Repeater) | 2 tabs, 5 tabs |
| Tab Title | Text, icon + text |
| Tab Content | Text, HTML, shortcode |
| Active Tab | 1, 2, last |
| Icon Position | Before, after |

---

## Test Cases

| ID | Steps | Expected |
|----|-------|----------|
| TT-01 | Add 3 tabs, default settings | First tab active, content visible |
| TT-02 | Click tab 2 | Tab 2 becomes active, tab 1 deactivates |
| TT-03 | Vertical left layout | Tabs render on left, content on right |
| TT-04 | Active Tab = 3 | Third tab open on load |
| TT-05 | Tab content has shortcode | Shortcode rendered correctly |
| TT-06 | Keyboard Tab + Enter on tab header | Tab activates |
| TT-07 | Arrow key navigation (left/right) | Adjacent tab activates |
| TT-08 | `role="tab"` and `aria-selected` | Correct ARIA attributes present |
| TT-09 | 375px viewport | Tabs may stack vertically or scroll horizontally |
