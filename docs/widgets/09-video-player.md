# Widget: Video Player (`tp_video_player`)

**File:** `modules/widgets/tp_video_player.php`  
**Category:** Media

---

## Controls Under Test

| Control | Values to Test |
|---------|----------------|
| Video Source | YouTube, Vimeo, Self-hosted |
| URL | Valid YT/Vimeo URL, invalid URL |
| Autoplay | Yes, No |
| Mute | Yes, No |
| Loop | Yes, No |
| Controls | Show, Hide |
| Poster Image | Set, empty |
| Aspect Ratio | 16:9, 4:3, 1:1 |
| Lightbox | Yes, No |
| Overlay Play Button | Yes, No |

---

## Test Cases

| ID | Steps | Expected |
|----|-------|----------|
| VP-01 | YouTube URL, default settings | YouTube embed renders, plays on click |
| VP-02 | Vimeo URL | Vimeo embed renders, plays on click |
| VP-03 | Self-hosted MP4 URL | HTML5 `<video>` renders |
| VP-04 | Autoplay + Mute = Yes | Video plays automatically on load (muted) |
| VP-05 | Lightbox = Yes, click poster/play | Lightbox overlay opens with video |
| VP-06 | Lightbox overlay click outside | Lightbox closes |
| VP-07 | Poster Image set | Poster shown before play |
| VP-08 | Controls = Hide | No playback bar shown (YouTube) |
| VP-09 | Aspect Ratio = 4:3 | Container maintains 4:3 ratio |
| VP-10 | Invalid YouTube URL | Graceful error or blank embed, no fatal |
| VP-11 | Responsive 375px | Video scales to full width, ratio preserved |
