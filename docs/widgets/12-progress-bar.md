# Widget: Progress Bar (`tp_progress_bar`)

**File:** `modules/widgets/tp_progress_bar.php`  
**Category:** Interactive

---

## Test Cases

| ID | Steps | Expected |
|----|-------|----------|
| PB-01 | Default bar style, value 70 | Bar fills to 70% |
| PB-02 | Style = Circle | Circular progress ring at 70% |
| PB-03 | Style = Milestone | Stepped milestone markers shown |
| PB-04 | Scroll Trigger = Yes | Animation starts when element enters viewport |
| PB-05 | Value = 0 | Empty bar / 0% label |
| PB-06 | Value = 100 | Full bar / 100% label |
| PB-07 | Add multiple bars | Each animates independently |
| PB-08 | Show Percentage Label | Percentage text visible on/near bar |
| PB-09 | Custom colour gradient | Bar uses gradient fill |
| PB-10 | 375px viewport | Bar scales to container width |
