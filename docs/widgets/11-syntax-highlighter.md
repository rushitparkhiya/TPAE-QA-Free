# Widget: Syntax Highlighter (`tp_syntax_highlighter`)

**File:** `modules/widgets/tp_syntax_highlighter.php`  
**Category:** Media / Developer

---

## Test Cases

| ID | Steps | Expected |
|----|-------|----------|
| SH-01 | Paste PHP code, select PHP language | Code rendered with PHP syntax colours |
| SH-02 | Select JavaScript language | JS keywords highlighted |
| SH-03 | Enable Copy button | "Copy" button visible; click copies to clipboard |
| SH-04 | Enable Download button | "Download" button visible; click downloads `.txt` |
| SH-05 | Select Dark theme | Dark background applied |
| SH-06 | Select Light theme | Light background applied |
| SH-07 | Set Language Label text | Custom label shown in corner |
| SH-08 | Paste code with `<script>` tags | Tags rendered as literal text, not executed |
| SH-09 | Line numbers enabled | Left gutter with line numbers |
| SH-10 | 375px viewport | Code block scrolls horizontally, does not break layout |
