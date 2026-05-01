# Widget: Countdown (`tp_countdown`)

**File:** `modules/widgets/tp_countdown.php`  
**Category:** Interactive

---

## Controls Under Test

| Control | Values to Test |
|---------|----------------|
| Countdown Style | style-1 … style-3 |
| Due Date | Past date, future date, today |
| Display | Days+Hours+Min+Sec, Hours+Min+Sec only |
| Labels | Default EN, custom labels, hidden |
| Expiry Action | None, Show Message, Redirect |
| Expiry Message | Custom HTML |
| Expiry Redirect URL | Valid URL |
| Timezone | UTC, specific timezone |

---

## Test Cases

| ID | Steps | Expected |
|----|-------|----------|
| CD-01 | Set due date 1 hour from now | Countdown ticking: days, hours, min, sec |
| CD-02 | Set due date in the past | Expiry action triggers immediately |
| CD-03 | Expiry Action = Show Message | Custom message appears when timer hits 0 |
| CD-04 | Expiry Action = Redirect | Browser redirects on expiry |
| CD-05 | Disable Days display | Only HH:MM:SS shown |
| CD-06 | Set custom labels (FR locale) | Custom label strings used |
| CD-07 | Hide labels | Numbers only, no label text |
| CD-08 | Timer reaches 00:00:00 in live browser | Transitions cleanly to 0, no negative numbers |
| CD-09 | Responsive 375px | Units don't overflow container |
