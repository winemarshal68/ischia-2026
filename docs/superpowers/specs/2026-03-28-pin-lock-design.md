# PIN Lock — Design Spec
**Date:** 2026-03-28
**Project:** Ischia 2026 (ischia-2026.pages.dev)

## Problem

The site is publicly accessible and contains personal information: full itinerary, hotel bookings, dinner reservations, and trip costs. The owners want to prevent casual visitors (e.g. someone who googles their names) from reading the content.

## Approach

Client-side PIN overlay with hashed PIN and localStorage expiry. A full-screen overlay covers all page content on load. The overlay is dismissed only by entering the correct PIN. The unlock state is saved to localStorage with a timestamp; after 60 minutes the page re-locks automatically.

This approach is appropriate for the threat model (casual deterrence) and requires no external services or backend changes to the existing static HTML file.

## Security Model

- The PIN (`53779`) is stored as a SHA-256 hash in the JavaScript. The raw digits do not appear in source.
- This is not cryptographically strong protection — a determined person who reads the source and knows to look for a hash could reverse a short numeric PIN via brute force. That is acceptable: the goal is deterring casual visitors, not adversaries.
- The site content remains in the HTML source. The overlay only prevents visual access in the browser.

## Components

### PIN overlay (`#pin-overlay`)
- Fixed, full-viewport `<div>` with `z-index: 9999`
- Background: dark navy (`#0d1f2d`) with radial gradients matching site hero
- `backdrop-filter: blur` applied to a pseudo-element behind the overlay so site content is visibly blurred but unreadable
- Contains: eyebrow label, title ("Marshal & Heidi"), subtitle, dot indicators, numpad, error message

### Dot indicators
- 5 dots (one per PIN digit), empty circles that fill as digits are entered
- Fill color: `#4a9fc8` (sea-light)

### Numpad
- 3×4 grid: digits 1–9, 0 (centered), delete (⌫)
- Keys styled with `Cormorant Garamond` serif for digits
- Keyboard input also accepted (digits + Backspace + Enter)

### Error state
- On wrong PIN: dots shake briefly, dots clear, error message "Incorrect PIN — try again" fades in for 1.5 seconds then fades out
- After 3 wrong attempts in a row: 10-second cooldown (button disabled, countdown shown)

### Unlock flow
1. User enters all 5 digits → auto-submits
2. SHA-256 hash of entered digits compared to stored hash
3. Correct: overlay fades out (`opacity 0`, then `display: none`), timestamp written to localStorage key `ischia_unlocked`
4. Wrong: shake animation, clear input, show error

### Re-lock logic
On every page load:
1. Read `ischia_unlocked` from localStorage
2. If absent or older than 3600 seconds → show overlay
3. If within 1 hour → hide overlay immediately, page loads normally

## Styling

Matches existing site aesthetic:
- Font: `Cormorant Garamond` (title), `DM Mono` (labels, keys)
- Colors from existing CSS variables: `--night`, `--sea`, `--sea-light`, `--sunset`, `--foam`
- Frosted-glass panel: `rgba(13,31,45,0.88)` + `backdrop-filter: blur(20px)`
- Blurred site preview visible behind overlay (opacity ~0.35, blur 6px)

## Implementation Notes

- All code added to the existing `index.html` — no new files
- PIN hash computed once at implementation time via `crypto.subtle.digest` and hardcoded as a hex string constant
- SHA-256 used via the browser's native `crypto.subtle` API (no external libraries)
- Overlay HTML injected at top of `<body>`; CSS added to the existing `<style>` block; JS added before closing `</script>`

## Out of Scope

- Server-side access control (Cloudflare Access)
- Multiple PINs or per-user auth
- PIN change UI
