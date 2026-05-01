# Widget: Heading Title (`tp_heading_title`)

**File:** `modules/widgets/tp_heading_title.php` (2,810 lines)  
**Category:** Content

---

## Controls Under Test

| Control | Type | Values to Test |
|---------|------|----------------|
| Heading Style | SELECT | style-1 … style-13 |
| Title | TEXT | Short, long, HTML entities, emoji |
| HTML Tag | SELECT | h1–h6, div, span, p |
| Highlight Word | TEXT | Single word, multiple words, none |
| Sub Title | TEXT | Present, absent |
| Separator | SELECT | None, solid, dashed |
| Link | URL | Internal, external, empty |
| Alignment | CHOOSE | Left, center, right |
| Dynamic Tag on Title | DYNAMIC | Post Title, Site Title |

---

## Test Cases

### Functional

| ID | Steps | Expected |
|----|-------|----------|
| HT-01 | Add widget → default settings | "Heading" text renders in `<h2>` |
| HT-02 | Change HTML Tag to `h1` | Output wraps in `<h1>` |
| HT-03 | Set Highlight Word matching a word in Title | That word gets highlight span |
| HT-04 | Enable Separator → set to dashed | Dashed line renders below heading |
| HT-05 | Add URL link | Heading wrapped in `<a href>` |
| HT-06 | Set alignment to right | `text-align:right` applied |
| HT-07 | Apply Dynamic Tag "Post Title" | Renders current post title |
| HT-08 | Enter `<script>alert(1)</script>` in Title | Script tags stripped, no alert fires |
| HT-09 | Enter very long title (500 chars) | Renders without layout break |
| HT-10 | Cycle through all 13 styles | Each style applies correct CSS class |

### Responsive

| ID | Viewport | Expected |
|----|----------|----------|
| HT-R01 | 375px | Font size responsive, no overflow |
| HT-R02 | 768px | Sub-heading visible |

### Editor

| ID | Steps | Expected |
|----|-------|----------|
| HT-E01 | Edit title in editor | Live preview updates in real time |
| HT-E02 | Open widget help link | Opens TPAE docs URL |
