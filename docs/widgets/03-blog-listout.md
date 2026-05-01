# Widget: Blog Listout (`tp_blog_listout`)

**File:** `modules/widgets/tp_blog_listout.php` (4,416 lines — largest widget)  
**Category:** Blog / Listing  
**AJAX:** Load More via `L_theplus_more_post` (nopriv)

---

## Controls Under Test

| Control | Type | Values to Test |
|---------|------|----------------|
| Layout | SELECT | grid, list, carousel, metro |
| Style | SELECT | style-1 … style-7 |
| Post Type | SELECT | post, page, custom CPT |
| Posts Per Page | NUMBER | 3, 6, 12 |
| Order By | SELECT | date, title, rand, modified |
| Load More Type | SELECT | button, scroll, none |
| Columns — Desktop | SELECT | 2, 3, 4 |
| Columns — Tablet | SELECT | 1, 2 |
| Columns — Mobile | SELECT | 1 |
| Category Filter | SELECT | Specific category, All |
| Exclude Posts | TEXT | Comma-separated post IDs |
| Display Excerpt | SWITCHER | Yes, No |
| Excerpt Length | NUMBER | 20, 50 |
| Featured Image | SWITCHER | Yes, No |
| Post Meta | SWITCHER | Date, Author, Categories |

---

## Test Cases

### Functional

| ID | Steps | Expected |
|----|-------|----------|
| BL-01 | Default settings (grid, 3 posts) | 3 most recent posts rendered in grid |
| BL-02 | Change to List layout | Posts stack vertically |
| BL-03 | Change to Carousel | Posts in carousel with nav arrows |
| BL-04 | Set Post Type = page | Pages listed, not posts |
| BL-05 | Set Order By = title | Posts sorted alphabetically |
| BL-06 | Set Load More = button | "Load More" button visible |
| BL-07 | Click Load More | Next batch appended without reload |
| BL-08 | Load More reaches end | Button disappears or disabled |
| BL-09 | Set Load More = infinite scroll | Posts load on scroll down |
| BL-10 | Set Exclude Posts with valid IDs | Those posts not shown |
| BL-11 | Set Display Excerpt = Yes | Excerpt shown below title |
| BL-12 | Set Featured Image = No | No images in listing |
| BL-13 | Category filter: select specific cat | Only posts of that category shown |
| BL-14 | Site has 0 posts matching query | "No posts found" or empty graceful state |

### AJAX (Load More)

| ID | Steps | Expected |
|----|-------|----------|
| BL-A01 | Load More with filter active | Only filtered category posts appended |
| BL-A02 | Load More with invalid nonce (DevTools edit) | Returns security error, no posts |
| BL-A03 | Load More on page 2 correctly offsets | Posts do not duplicate from page 1 |

### Responsive

| ID | Viewport | Expected |
|----|----------|----------|
| BL-R01 | 375px | Single column, no overflow |
| BL-R02 | 768px | 2-column layout |
| BL-R03 | 1440px | 3-column default layout |
