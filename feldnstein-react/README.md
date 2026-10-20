# FELD·N·STEIN — Premium Store (React)

The FELD·N·STEIN artisanal oils store, migrated from plain HTML/CSS/JS to **React 19 + Vite 5 + Tailwind CSS 3**. Fully self-contained — all images and videos live in `public/assets/`, no dependency on any other project folder.

## Prerequisites

- **Node.js 18 or newer** (Node 20+ recommended) — check with `node -v`
- **npm** — comes with Node, check with `npm -v`

## Run the project

```bash
# 1. Go into the project folder
cd feldnstein-react

# 2. Install dependencies (first time only, ~1–2 min)
npm install

# 3. Start the dev server
npm run dev
```

Then open **http://localhost:5173** in your browser. The page reloads automatically whenever you edit a file in `src/`.

## Other commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload → http://localhost:5173 |
| `npm run build` | Production build → output in `dist/` |
| `npm run preview` | Serve the production build locally (after `npm run build`) |
| `npm run test:smoke` | Automated end-to-end check of 24 behaviors (sections, carousel, cart, modal, animations) |

## Trying out the app

- Scroll — the header shrinks and nav links highlight per section (scrollspy)
- **Process** section — the bull walks circles around the press; click steps 01–05
- **Collection** section — filter pills, carousel arrows/dots, **Quick View** modal, **Add to Reserve Cart** (watch the cart badge and toast)
- Narrow the browser window to see the mobile hamburger menu

## Project structure

```
feldnstein-react/
├── index.html                  # HTML shell (fonts, meta, #root mount point)
├── public/assets/              # all images & videos (self-contained copy)
├── src/
│   ├── main.jsx                # entry — mounts <App/> in #root
│   ├── App.jsx                 # page composition
│   ├── index.css               # Tailwind + custom styles
│   ├── components/             # Header, Hero, ProcessSection, CollectionSection, ...
│   ├── context/CartContext.jsx # cart count + toast state
│   ├── hooks/                  # useScrollSpy, usePrefersReducedMotion
│   └── data/products.js        # product catalog
├── tailwind.config.js          # brand colors & fonts
└── smoke-test.mjs              # automated checks (npm run test:smoke)
```

## Notes

- **Smoke test** requires Google Chrome installed. If Chrome lives elsewhere on your machine, update the `executablePath` at the top of `smoke-test.mjs`.
- Fonts (Newsreader, Plus Jakarta Sans, Material Symbols icons) load from the Google Fonts CDN at runtime, so an internet connection is needed for correct styling.
