# Widget: Plus Form (`tp_plus_form`)

**File:** `modules/widgets/tp_plus_form.php` (3,187 lines)  
**Category:** Forms  
**AJAX:** `tpae_form_submission` (nopriv + auth)

---

## Controls Under Test

| Control | Values to Test |
|---------|----------------|
| Form Fields (Repeater) | Text, Email, Textarea, Number, Select, Checkbox, Radio, Tel, Date, File |
| Required Fields | Yes, No per field |
| Email To | Admin email, custom email |
| Email Subject | Static string, `[field_id]` placeholder |
| Email From / Reply-To | Custom sender |
| Success Message | Custom text |
| Redirect URL | Internal URL, external URL, empty |
| Submit Button Label | Custom text |
| Form Layout | 1-column, 2-column |

---

## Test Cases

### Functional

| ID | Steps | Expected |
|----|-------|----------|
| PF-01 | Add widget, default fields (name, email, message) | Form renders with 3 inputs + submit button |
| PF-02 | Fill all fields correctly, submit | Success message shown / redirect fires |
| PF-03 | Leave required field empty, submit | Field highlighted with error, form not sent |
| PF-04 | Enter invalid email format | Validation error on email field |
| PF-05 | Set Redirect URL, submit | Browser navigates to that URL after success |
| PF-06 | Set custom Success Message, submit | Custom message displayed |
| PF-07 | Submit as unauthenticated (guest) visitor | Form submits successfully (nopriv handler) |
| PF-08 | Check browser network tab on submit | Single POST to `admin-ajax.php`, `action=tpae_form_submission` |
| PF-09 | Response body `success=1` | Form confirms success state |
| PF-10 | Add Textarea field with required=yes, leave blank | Error returned |
| PF-11 | Add Select field with empty default, submit | Validation triggers if required |
| PF-12 | Add Checkbox group, submit | Comma-joined values sent in email |

### Email

| ID | Steps | Expected |
|----|-------|----------|
| PF-E01 | Submit with valid data (check mail log / Mailtrap) | Email received at Email To address |
| PF-E02 | `[all-values]` message template | All field values in email body |
| PF-E03 | `[value_id='field_name']` in template | Specific field value injected |
| PF-E04 | Set Reply-To = submitted email field | Reply-To header set correctly |

### Edge Cases

| ID | Steps | Expected |
|----|-------|----------|
| PF-X01 | Submit with HTML in text field | HTML stripped by `sanitize_text_field`, plain text in email |
| PF-X02 | Submit with very long textarea (10,000 chars) | Submitted without error |
| PF-X03 | Submit form 10 times rapidly | All 10 processed (document rate-limit absence as known behaviour) |
