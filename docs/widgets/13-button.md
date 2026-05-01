# Widget: Button (`tp_button`)

**File:** `modules/widgets/tp_button.php`  
**Category:** Utility

---

## Test Cases

| ID | Steps | Expected |
|----|-------|----------|
| BT-01 | Default button | Renders `<a>` with default text and style |
| BT-02 | Change text | Updated text shown |
| BT-03 | Set link + target = blank | Opens in new tab |
| BT-04 | Set link + nofollow | `rel="nofollow"` on anchor |
| BT-05 | Add icon before text | Icon renders left of text |
| BT-06 | Add icon after text | Icon renders right of text |
| BT-07 | Hover style | CSS hover transition applies |
| BT-08 | Alignment = center | Button centred in container |
| BT-09 | Full width = yes | Button stretches to 100% |
| BT-10 | Enter URL with XSS `javascript:alert(1)` | URL sanitized by `esc_url()`, link inert |
