# Ischia 2026 🌊

**Marshal Walker & Heidi Melbostad — June/July 2026**

A personal trip itinerary dashboard for 10 nights in Naples and Forio d'Ischia, Italy.

## Live site

Deployed on Cloudflare Pages → https://ischia-2026.pages.dev

## Structure

```
ischia-2026/
├── index.html          # The entire dashboard — single self-contained file
└── README.md
```

## Updating the itinerary

The whole dashboard lives in `index.html`. To add a new booking, restaurant, or event:

1. Open `index.html` in VS Code
2. Find the relevant day in the `days` array (around line 450 in the `<script>` block)
3. Add or edit an event object following the existing pattern
4. Commit and push — Cloudflare Pages auto-deploys on every push to `main`

### Event object format

```js
{
  cls: 'confirmed',       // 'confirmed' | 'tbd' | 'dinner-res' | 'hl' | ''
  icon: '🍽',
  icn: 'idinner',         // CSS class for icon bg colour
  title: 'Restaurant name',
  who: 'both',            // 'm' | 'h' | 'both'
  sub: 'Address · time',
  detail: 'Extra line of detail',
  tbd: false,             // true adds the orange "To book" badge
  exp: {                  // Expandable detail drawer (click to open)
    info: [
      ['Label', 'Value'],
    ],
    links: [
      ['↗ Link text', 'https://url.com', ''],   // '' | 'd' (dusk/orange) | 'g' (green)
    ]
  }
}
```

### Icon background classes

| Class | Colour | Use for |
|-------|--------|---------|
| `im` | Blue | Marshal flights |
| `ih` | Green | Heidi flights |
| `ihotel` | Green | Hotels |
| `itbd` | Amber | To-book items |
| `iferry` | Teal | Ferries |
| `iboat` | Blue | Boat/activities |
| `idinner` | Amber | Restaurants |
| `ibus` | Amber | Transport |
| `ifree` | Pale | Free days |

## Deploy manually

```bash
cd /Users/marshalwalker/Projects/ischia-2026
git add -A && git commit -m "Update: [describe change]" && git push origin main
```

Cloudflare Pages will auto-deploy within ~30 seconds.

## Asking Claude to update

In any Claude conversation with Desktop Commander access, paste this prompt:

> "Update the Ischia 2026 website. Open /Users/marshalwalker/Projects/ischia-2026/index.html,
> make the following changes: [describe your change], then commit and push to GitHub."

Claude can read the file, make the edit, commit, and push — Cloudflare Pages handles the rest.
