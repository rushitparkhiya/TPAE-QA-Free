# Extension: Cross-Domain Copy-Paste

**Files:** `modules/extensions/copy-paste/`  
**AJAX:** `plus_cross_cp_import` (edit_posts), `tpae_live_paste` (manage_options)

---

## Test Cases

| ID | Steps | Expected |
|----|-------|----------|
| CP-01 | Open Elementor editor, select a widget, use TPAE copy option | Widget JSON copied to clipboard |
| CP-02 | Paste on same domain in another page | Widget renders correctly |
| CP-03 | Paste widget containing an image | Image sideloaded to local media library |
| CP-04 | Paste widget that uses Pro widget | Warning dialog listing Pro widgets shown |
| CP-05 | Paste as subscriber (no edit_posts) | Permission denied error returned |
| CP-06 | Copy section with multiple widgets | All widgets pasted correctly |
| CP-07 | Paste with no data in clipboard / empty | Graceful error, no PHP notice |
