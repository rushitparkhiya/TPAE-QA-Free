# Widget: Accordion (`tp_accordion`)

**File:** `modules/widgets/tp_accordion.php`  
**Category:** Interactive

---

## Controls Under Test

| Control | Type | Values to Test |
|---------|------|----------------|
| Accordion Style | SELECT | style-1 … style-5 |
| Items (Repeater) | REPEATER | 1 item, 3 items, 10 items |
| Item Title | TEXT | Short, long, HTML |
| Item Content | WYSIWYG | Text, images, nested shortcodes |
| Default Active Tab | NUMBER | None, 1, 3 |
| Allow Multiple Open | SWITCHER | Yes, No |
| Toggle Speed | NUMBER | 100ms, 500ms |
| Icon — Open / Close | ICONS | Present, absent |
| Animation Effect | SELECT | No-animation, fadeIn, slideInUp |

---

## Test Cases

### Functional

| ID | Steps | Expected |
|----|-------|----------|
| AC-01 | Add widget with 3 items, default settings | First item open, others closed |
| AC-02 | Click closed item header | Item expands, content visible |
| AC-03 | Click open item header | Item collapses |
| AC-04 | Set "Allow Multiple Open" = No, click 2nd item | 1st item closes, 2nd opens |
| AC-05 | Set "Allow Multiple Open" = Yes, click 2nd item | Both items remain open |
| AC-06 | Set Default Active Tab = 2 | Second item open on load |
| AC-07 | Set Default Active Tab = 0 (none) | All items closed on load |
| AC-08 | Add 10 items | All render, no layout overflow |
| AC-09 | Put a video embed in item content | Video plays after item opens |
| AC-10 | Keyboard: Tab to header, press Enter | Item toggles |
| AC-11 | Keyboard: Tab to open item, press Space | Item toggles |
| AC-12 | Check `aria-expanded` on open item | `aria-expanded="true"` |
| AC-13 | Check `aria-expanded` on closed item | `aria-expanded="false"` |

### Responsive

| ID | Viewport | Expected |
|----|----------|----------|
| AC-R01 | 375px | Items full width, no horizontal scroll |
| AC-R02 | 768px | Icons and text not clipped |

### Animation

| ID | Steps | Expected |
|----|-------|----------|
| AC-A01 | Set animation = slideInUp, scroll to widget | Widget animates in once on scroll |
| AC-A02 | Set animation = no-animation | No animation class applied |
