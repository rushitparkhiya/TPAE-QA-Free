# Widget: Flip Box (`tp_flip_box`)

**File:** `modules/widgets/tp_flip_box.php` (2,678 lines)  
**Category:** Interactive

---

## Controls Under Test

| Control | Values to Test |
|---------|----------------|
| Flip Direction | Left, Right, Top, Bottom |
| Flip Trigger | Hover, Click |
| Front — Icon / Image / None | Each type |
| Front — Title, Description | Text content |
| Back — Title, Description, Button | All populated |
| Equal Height | Yes, No |
| Link | Entire box, button only |
| 3D Flip | Yes, No |

---

## Test Cases

| ID | Steps | Expected |
|----|-------|----------|
| FB-01 | Hover over box (default settings) | Box flips to back face |
| FB-02 | Mouse out | Box flips back to front |
| FB-03 | Set Trigger = Click | Only mouse click triggers flip |
| FB-04 | Flip Direction = Top | Box flips top-to-bottom |
| FB-05 | Flip Direction = Left | Box flips left-to-right |
| FB-06 | Back has CTA button | Button clickable on back face |
| FB-07 | Link = Entire Box | Clicking anywhere on front = navigate |
| FB-08 | Set 3D Flip = No | Flat/fade transition instead of 3D |
| FB-09 | Keyboard Tab to box, press Enter | Flip triggers (accessibility) |
| FB-10 | Responsive 375px | Card aspect ratio maintained |
