

# Fix Testimonial Position and Speed

## Changes

### 1. Move testimonials below "Skip" button
Currently the testimonial ticker sits between the auth buttons and the step dots (line 159-178). Move it after the "Skip" button (line 226-231), so the layout order becomes: auth buttons -> step dots -> Skip -> testimonials.

### 2. Speed up marquee animation
Change the marquee duration from `25s` to `12s` in `src/index.css` so testimonials scroll noticeably faster.

### Files
| File | Change |
|------|--------|
| `src/components/EntryScreen.tsx` | Move testimonial block (lines 159-178) to after the Skip button (after line 231) |
| `src/index.css` | Change `marquee 25s` to `marquee 12s` |

