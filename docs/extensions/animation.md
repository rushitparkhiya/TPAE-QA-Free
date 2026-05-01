# Extension: Scroll Animation (GSAP)

**Files:** `modules/extensions/animation/`  
**Applied via:** Widget panel → Advanced → Plus Extras → Animation

---

## Test Cases

| ID | Steps | Expected |
|----|-------|----------|
| AN-01 | Apply `fadeIn` to any widget, scroll to it | Widget fades in once on enter viewport |
| AN-02 | Apply `slideInLeft` | Widget slides from left |
| AN-03 | Set delay = 300ms | Animation starts 300ms after trigger |
| AN-04 | Set duration = 1.5s | Animation visibly takes 1.5 seconds |
| AN-05 | Set out-animation = fadeOut | Widget fades out when leaving viewport |
| AN-06 | Disable animation on mobile | No animation class on 375px viewport |
| AN-07 | Multiple animated widgets in sequence | Each animates individually as it enters view |
| AN-08 | Stagger = yes on listing widget | List items animate in one by one |
| AN-09 | No-animation selected | No animation classes, no GSAP initialisation |
