# hexname

Find the name of any hex color. Paste a code, get a human-readable name — matched against 30,000+ named colors using Delta-E distance in the Lab color space.

**[hipuku.github.io/hexname](https://hipuku.github.io/hexname/)**

## Features

- Type or paste a hex code → instant name match
- Paste a comma-separated list to build a palette
- Export as CSS variables, JSON, Tailwind config, or plain list
- Shareable URLs — palette state lives in the hash
- Contrast ratio on each card (useful for accessibility checks)

## Stack

- React 19 + Vite
- Tailwind CSS v4
- [chroma-js](https://gka.github.io/chroma.js/) for color parsing and Lab distance
- ~30k color names from the [colornames](https://github.com/meodai/color-names) dataset

## Dev

```bash
npm install
npm run dev
```

Deploys to GitHub Pages automatically on push to `main` via GitHub Actions. Build output goes to `dist/`.
