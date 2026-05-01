# Extension: Dynamic Tags

**Files:** `modules/extensions/dynamic-tag/`  
**Integrated into:** Elementor Dynamic Tags panel

---

## Available Tags

### Text Tags
`post-title`, `post-author`, `post-date`, `post-time`, `post-excerpt`, `post-content`, `post-category`, `post-tag`, `post-id`, `post-type`, `post-status`, `post-slug`, `site-title`, `site-tagline`, `site-current-date-time`, `post-cat-desc`, `post-cat-post-count`, `post-tag-desc`, `post-tag-post-count`, `post-terms`

### Image Tags
`post-featured-image`, `post-author-avatar`, `post-cat-image`, `site-icon`, `site-logo`

### URL Tags
`post-url`, `post-author-url`, `post-term-url`, `site-url`

---

## Test Cases

| ID | Tag | Steps | Expected |
|----|-----|-------|----------|
| DT-01 | post-title | Apply to Heading Title widget on single post | Renders post title |
| DT-02 | post-author | Apply to text widget on single post | Renders post author name |
| DT-03 | post-date | Apply to text widget | Renders formatted post date |
| DT-04 | post-featured-image | Apply to Image widget | Renders featured image |
| DT-05 | post-author-avatar | Apply to Image widget | Renders author gravatar |
| DT-06 | post-url | Apply to Button URL | Button links to current post |
| DT-07 | site-title | Apply to Heading on any page | Renders site name |
| DT-08 | site-current-date-time | Apply to text widget | Shows current server date/time |
| DT-09 | post-category | On post with multiple categories | Comma-joined category names |
| DT-10 | Any tag on a Page (not post) | Tags without post context | Return empty or fallback gracefully |
| DT-11 | Pro dummy tag in free version | Shows "Pro" label/lock in editor | Does not output value on frontend |
