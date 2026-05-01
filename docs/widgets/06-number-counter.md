# Widget: Number Counter (`tp_number_counter`)

**File:** `modules/widgets/tp_number_counter.php` (2,566 lines)  
**Category:** Interactive

---

## Controls Under Test

| Control | Values to Test |
|---------|----------------|
| Counter Style | style-1 … style-5 |
| Starting Number | 0, 100, negative |
| Ending Number | 100, 10000, decimal |
| Prefix / Suffix | $, %, K, empty |
| Duration | 1s, 3s, 5s |
| Scroll Trigger | Yes, No |
| Thousand Separator | comma, dot, none |

---

## Test Cases

| ID | Steps | Expected |
|----|-------|----------|
| NC-01 | Default: 0 → 100 | Animates from 0 to 100 on load |
| NC-02 | Scroll Trigger = Yes | Animates only when element enters viewport |
| NC-03 | Prefix = "$", Suffix = "K" | Displays "$100K" at end |
| NC-04 | Ending = 10000 with separator = comma | "10,000" displayed |
| NC-05 | Ending = 3.14 (decimal) | Decimal value handled |
| NC-06 | Duration = 5s | Animation visibly slower |
| NC-07 | Multiple counters on same page | Each animates independently |
| NC-08 | Page reload — counters restart | Animation plays again from 0 |
