import { useEffect } from 'react'

const CSS = `
/* Self-hosted. The previous landing pulled three families from Google Fonts via
   an @import inside a JS-injected <style>, which blocks rendering on exactly the
   slow connections this product gets opened on. These five faces are 60KB. */
@font-face { font-family: 'Clash Display'; src: url('/fonts/clash-600.woff2') format('woff2'); font-weight: 600; font-style: normal; font-display: swap; }
@font-face { font-family: 'Clash Display'; src: url('/fonts/clash-700.woff2') format('woff2'); font-weight: 700; font-style: normal; font-display: swap; }
@font-face { font-family: 'Poppins'; src: url('/fonts/poppins-400.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
@font-face { font-family: 'Poppins'; src: url('/fonts/poppins-500.woff2') format('woff2'); font-weight: 500; font-style: normal; font-display: swap; }
@font-face { font-family: 'Poppins'; src: url('/fonts/poppins-700.woff2') format('woff2'); font-weight: 700; font-style: normal; font-display: swap; }

:root {
    color-scheme: dark;
    --bg: #08080f;
    --bg-alt: #0c0c15;
    --surface: #12121d;
    --text: #f0f0fa;
    --muted: #a5a5b8;
    --dim: #6d6d80;
    --gold: #e8b84b;
    --gold-hi: #f5c84e;
    --gold-deep: #8a7434;
    --rule: #1c1c29;
    --display: 'Clash Display', 'Segoe UI', 'Helvetica Neue', sans-serif;
    --sans: 'Poppins', 'Segoe UI', Calibri, sans-serif;
    --mono: 'Cascadia Mono', Consolas, 'SF Mono', ui-monospace, monospace;
    --eo: cubic-bezier(.22, 1, .36, 1);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  html, body { background: var(--bg); }
  body {
    font-family: var(--sans); color: var(--text);
    font-size: 15.5px; line-height: 1.7; -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  .shell { max-width: 1200px; margin: 0 auto; padding: 0 32px; }
  ::selection { background: var(--gold); color: #08080f; }

  .label {
    font-family: var(--sans); font-size: 11px; font-weight: 500;
    letter-spacing: 0.32em; text-transform: uppercase; color: var(--gold);
  }
  .k::before {
    content: ''; display: inline-block; width: 28px; height: 1px;
    background: var(--gold-deep); margin-right: 14px; vertical-align: middle;
    transform: scaleX(0); transform-origin: left;
    transition: transform .8s var(--eo) .2s;
  }
  .k.in::before { transform: scaleX(1); }

  .rv { opacity: 0; transform: translateY(14px); transition: opacity .7s var(--eo), transform .7s var(--eo); }
  .rv.in { opacity: 1; transform: none; }
  .rv.d1 { transition-delay: .07s; } .rv.d2 { transition-delay: .14s; } .rv.d3 { transition-delay: .21s; }

  .masthead {
    position: sticky; top: 0; z-index: 50;
    background: transparent; border-bottom: 1px solid transparent;
    transition: background .4s, border-color .4s, backdrop-filter .4s;
  }
  .masthead.scrolled {
    background: rgba(8,8,15,0.82); border-bottom-color: var(--rule);
    backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
  }
  .masthead-inner { display: flex; align-items: center; justify-content: space-between; height: 72px; }
  .wordmark {
    display: flex; align-items: center; gap: 11px;
    font-family: var(--display); font-weight: 700; font-size: 24px;
    letter-spacing: 0.1em; color: var(--text); text-decoration: none;
  }
  .wordmark b { color: var(--gold); }
  /* The product's own mark, on a flat gold tile. The app draws this tile with a
     gradient and a warm glow; both are dropped here — this page's language is
     flat colour and hairlines, and the mark is the brand, not the sheen. */
  .mark {
    width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
    background: var(--gold); color: #08080f;
    display: flex; align-items: center; justify-content: center;
  }
  .mark svg { display: block; width: 17px; height: 17px; }
  footer .fm .mark { width: 26px; height: 26px; border-radius: 7px; }
  footer .fm .mark svg { width: 15px; height: 15px; }
  /* Inside the lens --gold is ink, which would leave an ink mark on an ink
     tile. Flip it explicitly so the lockup survives the inversion. */
  .lens .mark { background: #08080f; color: #e8b84b; }
  .masthead nav { display: flex; gap: 36px; align-items: center; }
  .masthead nav a {
    font-size: 11px; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase;
    color: var(--muted); text-decoration: none; padding: 6px 0; border-bottom: 2px solid transparent;
    transition: color .2s, border-color .2s;
  }
  .masthead nav a:hover, .masthead nav a:focus-visible { color: var(--text); border-bottom-color: var(--gold); }
  .masthead nav .nav-signin { display: none; color: var(--gold); border-bottom-color: var(--gold-deep); }

  .hero { padding: 120px 0 96px; position: relative; overflow: hidden; }
  .hero > .shell { position: relative; z-index: 1; }
  /* The inversion lens: a live clone of the whole page, re-themed to its gilt
     negative by flipping the design tokens, clipped to a circle that tracks the
     cursor. No transition on clip-path — the lens must never lag the pointer. */
  .lens {
    position: fixed; inset: 0; z-index: 80; pointer-events: none;
    background: #e8b84b; overflow: hidden;
    clip-path: circle(0px at 50% 50%);
    opacity: 0; transition: opacity .16s linear;
    will-change: clip-path;
    --bg: #e8b84b;
    --bg-alt: #e8b84b;
    --surface: rgba(8,8,15,0.06);
    --text: #08080f;
    --muted: rgba(8,8,15,0.72);
    --dim: rgba(8,8,15,0.55);
    --gold: #08080f;
    --gold-hi: #08080f;
    --gold-deep: rgba(8,8,15,0.45);
    --rule: rgba(8,8,15,0.20);
  }
  .lens.on { opacity: 1; }
  .lens-page { position: absolute; top: 0; left: 0; width: 100%; will-change: transform; }
  .lens-mast { position: absolute; top: 0; left: 0; width: 100%; }
  /* The clone is a still of the settled page: entry animations must not replay,
     and every animation here ends on its identity state anyway. */
  .lens *, .lens *::before, .lens *::after { animation: none !important; }
  /* Token flips can't reach these: hardcoded colours and clipped gradients. */
  .lens .masthead {
    background: transparent !important; border-bottom-color: rgba(8,8,15,0.20) !important;
    backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
  }
  .lens .gilt {
    background: none !important; -webkit-text-fill-color: #08080f !important; color: #08080f;
  }
  .lens .btn-gold { background: #08080f; color: #e8b84b; box-shadow: none !important; }
  .lens .btn-gold::after { display: none; }
  .hero .crest { display: flex; align-items: center; gap: 18px; margin-bottom: 44px; animation: fadeIn .6s ease-out both; }
  .hero .crest::before, .hero .crest::after {
    content: ''; height: 1px; background: var(--gold-deep); flex: 0 0 64px;
    transform-origin: left; animation: drawX .9s var(--eo) .15s both;
  }
  .hero .crest::after { flex: 1; }
  h1 {
    font-family: var(--display); font-weight: 600;
    font-size: clamp(44px, 8.4vw, 104px);
    line-height: 1.03; letter-spacing: -0.02em; text-wrap: balance;
    color: var(--text); max-width: 13ch;
    animation: rise .9s var(--eo) .3s both;
  }
  h1 .gilt {
    color: var(--gold);
    background: linear-gradient(110deg, var(--gold) 42%, #fff3c9 50%, var(--gold) 58%);
    background-size: 260% 100%; background-position: 120% 0;
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    animation: shimmer 1.4s ease-in-out 1.15s both;
  }
  .hero .lede-row {
    display: grid; grid-template-columns: minmax(0,1.4fr) minmax(0,1fr);
    gap: 64px; align-items: end; margin-top: 60px;
    animation: rise .9s var(--eo) .55s both;
  }
  .hero .lede { font-size: 16.5px; color: var(--muted); max-width: 52ch; font-weight: 400; }
  .hero .lede strong { color: var(--text); font-weight: 500; }
  .cta-col { display: flex; flex-direction: column; gap: 16px; align-items: flex-start; justify-self: end; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes drawX { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes rise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
  @keyframes shimmer { from { background-position: 120% 0; } to { background-position: -60% 0; } }

  .btn {
    display: inline-block; position: relative; overflow: hidden;
    font-family: var(--sans); font-size: 12px; font-weight: 700;
    letter-spacing: 0.18em; text-transform: uppercase; text-decoration: none;
    padding: 16px 38px; cursor: pointer; border: none; border-radius: 999px;
    transition: background .2s, color .2s, border-color .2s, box-shadow .25s, transform .2s;
  }
  .btn:active { transform: scale(.97); }
  .btn-gold { background: var(--gold); color: #08080f; }
  .btn-gold::after {
    content: ''; position: absolute; top: 0; bottom: 0; width: 44%;
    background: linear-gradient(105deg, transparent, rgba(255,255,255,0.45), transparent);
    transform: translateX(-180%) skewX(-18deg); transition: none; pointer-events: none;
  }
  .btn-gold:hover, .btn-gold:focus-visible {
    background: var(--gold-hi);
    box-shadow: 0 8px 24px rgba(232,184,75,0.28);
  }
  .btn-gold:hover::after { transform: translateX(340%) skewX(-18deg); transition: transform .7s ease; }
  .btn-line { border: 1px solid var(--rule); color: var(--muted); background: transparent; }
  .btn-line:hover, .btn-line:focus-visible { border-color: var(--gold-deep); color: var(--text); }

  .ticker-band {
    border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
    background: var(--bg-alt); overflow: hidden; padding: 18px 0;
  }
  .ticker { display: flex; width: max-content; will-change: transform; }
  .ticker-set { display: flex; align-items: center; flex-shrink: 0; }
  .ticker-item {
    display: flex; align-items: center; gap: 28px; padding: 0 28px;
    font-size: 11px; font-weight: 500; letter-spacing: 0.28em; text-transform: uppercase;
    color: var(--dim); white-space: nowrap;
  }
  .ticker-item::before { content: '◆'; font-size: 8px; color: var(--gold-deep); }

  h2 {
    font-family: var(--display); font-weight: 600; font-size: clamp(30px, 4.2vw, 52px);
    line-height: 1.08; letter-spacing: -0.015em; color: var(--text); text-wrap: balance;
  }
  h2, .ledger-cell h3, .step h3, .price-line, .fact .n, .roles-table td:first-child {
    transition: background-color .18s ease, color .18s ease;
    -webkit-box-decoration-break: clone; box-decoration-break: clone;
  }
  /* The heading highlight paints gold-ground/ink-text — the same treatment the
     lens uses. Once the lens is running (body.cursor-on) the two cancel out and
     the lens would vanish over every heading, so the lens takes precedence and
     the highlight stays for touch and reduced-motion users, who have no lens. */
  body:not(.cursor-on) h2:hover, body:not(.cursor-on) .ledger-cell h3:hover,
  body:not(.cursor-on) .step h3:hover, body:not(.cursor-on) .price-line:hover,
  body:not(.cursor-on) .roles-table td:first-child:hover {
    background: var(--gold); color: #08080f;
  }
  body:not(.cursor-on) .price-line:hover em { color: #08080f; }
  body:not(.cursor-on) .fact .n:hover { background: var(--gold); color: #08080f; }

  /* ---- Product screenshots -------------------------------------------------
     A scroll-snap track, not a JS-driven slider: the phone's own momentum and
     rubber-banding are smoother than anything simulated, and it still works as
     a plain scrollable strip if the JS never runs. The next slide deliberately
     peeks past the edge — that, not the dots, is what tells people there is
     more to see. */
  .shots { padding: 104px 0 96px; }
  .shots-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; flex-wrap: wrap; margin-bottom: 40px; }
  .shots h2 { margin-top: 18px; max-width: 17ch; }
  .sample-tag {
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em;
    color: var(--gold-deep); border: 1px solid var(--rule);
    border-radius: 999px; padding: 8px 15px; white-space: nowrap;
  }
  .shot-track {
    display: flex; gap: 26px; overflow-x: auto; overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory; scroll-behavior: smooth;
    scrollbar-width: none; -ms-overflow-style: none;
  }
  .shot-track::-webkit-scrollbar { display: none; }
  .shot-track:focus-visible { outline: 1px solid var(--gold); outline-offset: 6px; }
  /* Perspective sits on each slide rather than the track, so every frame turns
     about its own centre. On the track the vanishing point would be fixed at
     the viewport middle and slides would skew differently depending on where
     they happened to sit — the far one always distorted worst. */
  .shot {
    flex: 0 0 84%; scroll-snap-align: center; margin: 0; perspective: 1500px;
    transition: transform .42s var(--eo);
  }
  /* The lift rides on .shot, not .shot-frame: the frame's transform is rewritten
     from the scroll position on every frame, and a hover transform there would
     be overwritten mid-swipe — or worse, need a transition that would then lag
     the scroll-driven motion. Two concerns, two elements. */
  @media (hover: hover) {
    .shot.live:hover { transform: translateY(-12px); }
    .shot.live:hover .shot-frame { border-color: var(--gold-deep); }
    .shot.live:hover .shot-frame img { filter: brightness(1.06); }
  }
  /* Depth, parallax and the caption handoff are all written from the scroll
     position by JS, not played as fixed-duration animations — dragging halfway
     leaves everything halfway, so the motion follows the finger rather than
     running off on its own clock. Base state here is the settled one, which is
     also what a visitor with no JS gets. */
  .shot-frame {
    overflow: hidden; border: 1px solid var(--rule); border-radius: 12px;
    background: var(--surface); transform-origin: 50% 50%;
    transition: border-color .55s var(--eo);
  }
  /* Full width at rest — the parallax slack comes from scaling the image up
     while it moves, not from oversizing it permanently. An oversized image
     costs the outermost pixels on every slide at all times, and on a dense UI
     capture those pixels are the sidebar logo and the sign-out button. */
  .shot-frame img {
    display: block; width: 100%; height: auto; aspect-ratio: 1600 / 805;
    transition: filter .42s var(--eo);
  }
  /* Layers are promoted only while the track is actually moving — three 954px
     frames plus three oversized images held on the compositor permanently is a
     lot of texture memory to hold for an idle carousel. */
  .shot-track.moving .shot-frame, .shot-track.moving .shot-frame img { will-change: transform; }
  .shot-frame.settled { border-color: var(--gold-deep); }
  .shot figcaption {
    font-size: 14.5px; color: var(--muted); margin-top: 20px; max-width: 56ch;
  }
  .shot figcaption b { color: var(--text); font-weight: 500; }

  .price-more { margin-top: 14px; }
  .price-more a {
    font-family: var(--mono); font-size: 13px; color: var(--gold);
    text-decoration: none; border-bottom: 1px solid var(--gold-deep); padding-bottom: 2px;
    transition: color .2s, border-color .2s;
  }
  .price-more a:hover, .price-more a:focus-visible { color: var(--gold-hi); border-bottom-color: var(--gold); }

  .shot-bar { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 34px; }
  .shot-dots { display: flex; gap: 10px; }
  .shot-dot {
    width: 30px; height: 3px; padding: 0; border: none; cursor: pointer;
    background: var(--rule); transition: background .25s;
  }
  .shot-dot.on { background: var(--gold); }
  .shot-arrows { display: flex; gap: 10px; }
  .shot-arr {
    width: 44px; height: 44px; border-radius: 999px; cursor: pointer;
    background: transparent; border: 1px solid var(--rule); color: var(--muted);
    font-size: 15px; line-height: 1; transition: border-color .2s, color .2s;
  }
  .shot-arr:hover:not(:disabled), .shot-arr:focus-visible { border-color: var(--gold); color: var(--gold); }
  .shot-arr:disabled { opacity: 0.32; cursor: default; }

  .ledgers { padding: 116px 0; }
  .ledgers-head { max-width: 64ch; }
  .ledgers-head p { margin-top: 18px; font-size: 16px; color: var(--muted); }
  .ledger-grid { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--rule); border-left: 1px solid var(--rule); margin-top: 56px; }
  .ledger-cell {
    border-right: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
    padding: 38px 30px 44px; transition: background .25s;
  }
  .ledger-cell:hover { background: var(--surface); }
  .icon-frame {
    width: 48px; height: 48px; border: 1px solid var(--gold-deep);
    display: flex; align-items: center; justify-content: center;
    color: var(--gold); margin-bottom: 24px; transition: border-color .25s, background .25s;
  }
  .ledger-cell:hover .icon-frame { border-color: var(--gold); background: rgba(232,184,75,0.06); }
  .icon-frame svg { width: 22px; height: 22px; }
  .ledger-cell:hover .icon-frame :is(path, rect, circle) {
    stroke-dasharray: 100; animation: draw .55s ease forwards;
  }
  @keyframes draw { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
  .ledger-cell h3 { font-family: var(--display); font-weight: 600; font-size: 21px; color: var(--text); margin-bottom: 10px; }
  .ledger-cell p { font-size: 13.5px; color: var(--muted); }

  .facts-band { border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); background: var(--bg-alt); padding: 96px 0; }
  .facts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 48px; margin-top: 56px; }
  .fact { border-top: 1px solid var(--gold-deep); padding-top: 22px; }
  .fact .n {
    font-family: var(--display); font-weight: 700; font-size: clamp(58px, 7vw, 96px); line-height: 1;
    color: var(--gold); font-variant-numeric: tabular-nums; letter-spacing: -0.02em;
  }
  .fact .n .od { display: inline-block; height: 1em; overflow: hidden; vertical-align: top; }
  .fact .n .od-s { display: block; transition: transform 1.25s var(--eo); }
  .fact .n .od-s span { display: block; height: 1em; line-height: 1; }
  .fact .l { font-size: 13.5px; color: var(--muted); margin-top: 14px; max-width: 24ch; }

  .roles { padding: 116px 0; }
  .roles-head { max-width: 64ch; }
  .roles-head p { margin-top: 18px; font-size: 16px; color: var(--muted); }
  .roles-table { width: 100%; border-collapse: collapse; margin-top: 56px; font-size: 15px; }
  .roles-table th {
    font-size: 10.5px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--dim);
    font-weight: 500; text-align: left; border-bottom: 1px solid var(--gold-deep); padding: 0 20px 14px 0;
  }
  .roles-table td { padding: 20px 20px 20px 14px; border-bottom: 1px solid var(--rule); color: var(--muted); vertical-align: baseline; transition: color .2s, box-shadow .3s; }
  .roles-table tr:hover td { color: var(--text); }
  .roles-table tr:hover td:first-child { box-shadow: inset 3px 0 0 var(--gold); }
  .roles-table td:first-child { font-family: var(--display); font-weight: 600; font-size: 19px; color: var(--text); white-space: nowrap; width: 240px; }

  .start { padding: 116px 0 124px; border-top: 1px solid var(--rule); }
  .start-grid { display: grid; grid-template-columns: minmax(0,1.1fr) minmax(0,0.9fr); gap: 88px; align-items: start; }
  .price-line { font-family: var(--display); font-weight: 600; font-size: clamp(23px, 2.5vw, 30px); line-height: 1.3; color: var(--text); margin-top: 22px; }
  .price-line em { color: var(--gold); font-style: normal; }
  .start .cta-row { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; margin-top: 44px; }
  .placeholder { color: var(--gold-deep); font-family: var(--mono); font-size: 12px; }
  /* The phone sits beside Sign in as a real, dialable action rather than a
     decorative string — a head who wants to talk to a person can just tap it. */
  .btn-line {
    display: inline-flex; align-items: center; justify-content: center;
    font-family: var(--mono); font-size: 13px; letter-spacing: 0.01em;
    color: var(--gold); text-decoration: none;
    padding: 15px 26px; border: 1px solid var(--gold-deep); border-radius: 999px;
    transition: border-color .2s, background-color .2s, color .2s;
  }
  .btn-line:hover, .btn-line:focus-visible {
    border-color: var(--gold); background-color: rgba(232,184,75,0.08); color: var(--gold-hi);
  }
  .steps { border-top: 1px solid var(--rule); }
  .step { display: grid; grid-template-columns: 64px 1fr; gap: 8px; padding: 28px 0; border-bottom: 1px solid var(--rule); }
  .step .no { font-family: var(--display); font-weight: 700; font-size: 30px; color: var(--gold-deep); line-height: 1.1; }
  .step h3 { font-family: var(--display); font-weight: 600; font-size: 19px; color: var(--text); margin-bottom: 6px; }
  .step p { font-size: 13.5px; color: var(--muted); }

  footer { border-top: 1px solid var(--gold-deep); padding: 48px 0 64px; background: var(--bg-alt); }
  .foot-grid { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; align-items: baseline; }
  footer .fm { display: flex; align-items: center; gap: 10px; font-family: var(--display); font-weight: 700; font-size: 20px; letter-spacing: 0.08em; }
  footer .fm b { color: var(--gold); }
  footer p { font-size: 12.5px; color: var(--dim); margin-top: 8px; }
  footer p b { color: var(--muted); font-weight: 500; }
  footer .foot-contact { font-family: var(--mono); font-size: 12.5px; margin-top: 12px; }
  footer .foot-contact a {
    color: var(--muted); text-decoration: none;
    border-bottom: 1px solid var(--gold-deep); padding-bottom: 2px;
    transition: color .2s, border-color .2s;
  }
  footer .foot-contact a:hover, footer .foot-contact a:focus-visible { color: var(--gold-hi); border-bottom-color: var(--gold); }
  footer .foot-contact span { color: var(--gold-deep); margin: 0 12px; }


  .cur-dot, .cur-ring {
    position: fixed; top: 0; left: 0; pointer-events: none; z-index: 999;
    border-radius: 50%; display: none;
  }
  .cur-dot { width: 7px; height: 7px; background: var(--gold); }
  /* The ring is the rim of the inverted disc, so its size sets the effect's
     size — the disc is derived from it in JS at half its width minus the 1px
     border, which lands the hairline just outside the gold and keeps it legible
     against the dark page rather than gold-on-gold. */
  .cur-ring { width: 82px; height: 82px; border: 1px solid rgba(232,184,75,0.45); transition: width .25s, height .25s, border-color .25s; }
  .cur-ring.hot { width: 100px; height: 100px; border-color: var(--gold); }
  body.cursor-on .cur-dot, body.cursor-on .cur-ring { display: block; }
  body.cursor-on, body.cursor-on a, body.cursor-on button, body.cursor-on .btn { cursor: none; }

  @media (max-width: 940px) {
    .hero { padding: 80px 0 64px; }
    .hero .lede-row { grid-template-columns: 1fr; gap: 40px; }
    .cta-col { justify-self: start; flex-direction: row; flex-wrap: wrap; }
    .ledger-grid { grid-template-columns: 1fr 1fr; }
    .facts { grid-template-columns: 1fr 1fr; gap: 40px 28px; }
    .start-grid { grid-template-columns: 1fr; gap: 56px; }
    .masthead nav { gap: 22px; }
    .ledgers, .roles, .start, .facts-band { padding-top: 72px; padding-bottom: 72px; }
    .shots { padding: 72px 0 64px; }
  }
  @media (max-width: 640px) {
    .shell { padding: 0 22px; }
    .roles-table, .roles-table tbody { display: block; }
    .roles-table thead { display: none; }
    .roles-table tr { display: block; border: 1px solid var(--rule); padding: 18px 20px; margin-bottom: 14px; }
    .roles-table tr:hover td:first-child { box-shadow: none; }
    .roles-table td { display: block; border: none; padding: 0; width: auto; white-space: normal; }
    .roles-table td:first-child { margin-bottom: 6px; }
    .ticker-item { padding: 0 18px; gap: 18px; }
    /* A 1903px-wide desktop capture cannot be made legible on a 360px screen:
       even cropping to a quarter of it lands under 50% scale. So on a phone the
       frame reads as evidence the product exists and the caption carries the
       actual information. Phone captures are the only real fix. */
    .shot { flex: 0 0 87%; }
    .shot-frame { border-radius: 8px; }
    .shot figcaption { font-size: 13.5px; margin-top: 16px; }
    .shots-head { margin-bottom: 28px; }
    .sample-tag { font-size: 10px; padding: 7px 12px; }
  }
  @media (max-width: 560px) {
    .ledger-grid { grid-template-columns: 1fr; }
    .cta-col, .start .cta-row { width: 100%; }
    .cta-col .btn, .start .cta-row .btn { display: block; width: 100%; text-align: center; }
    /* The phone must stay a full-width 48px+ target on the phone it will
       actually be dialled from. It is already inline-flex/centred, so it only
       needs to go full width — not block, which would break that centring. */
    .start .cta-row .btn-line { width: 100%; padding: 16px 26px; }
    /* At 360px the two section anchors and the wordmark fight for ~316px and
       the nav wraps over the logo. The sticky bar earns its space better by
       carrying the one action a head actually wants there instead. */
    .masthead nav .nav-sec { display: none; }
    /* Padded to a 44px tap target — it only exists on touch, so it has to be
       thumb-sized rather than the 33px a desktop text link gets away with. */
    .masthead nav .nav-signin { display: inline-flex; align-items: center; min-height: 44px; padding: 6px 2px; }
  }

  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    *, *::before, *::after { animation: none !important; transition: none !important; }
    .rv { opacity: 1; transform: none; }
    .k::before { transform: scaleX(1); }
    .ticker { flex-wrap: wrap; width: auto; }
    h1 .gilt { background: none; -webkit-text-fill-color: var(--gold); }
    .lens { display: none; }
    /* The scroll-written effects are skipped entirely under reduced motion, so
       these stay at their settled values rather than being driven. */
    .shot-track { scroll-behavior: auto; }
    .shot figcaption { opacity: 1 !important; transform: none !important; }
    .shot-frame, .shot-frame img { transform: none !important; opacity: 1 !important; }
    .shot { transform: none !important; }
  }
`

export default function Landing({ onEnter, onShowPlans }) {
  useEffect(() => {
    /* Ported from the standalone prototype. Every side effect is tracked so it
       can be undone: StrictMode mounts, tears down and mounts again against the
       same DOM, so a stray listener or a clone left appended shows up as a
       doubled effect rather than as an error. */
    const ac = new AbortController()
    const signal = ac.signal
    const rafIds = new Set()
    const timerIds = new Set()
    let observer = null
    let alive = true

    const on = (target, type, fn, opts) => target.addEventListener(type, fn, { ...opts, signal })
    const RAF = (fn) => {
      const id = requestAnimationFrame((t) => { rafIds.delete(id); if (alive) fn(t) })
      rafIds.add(id); return id
    }
    const TIMER = (fn, ms) => {
      const id = setTimeout(() => { timerIds.delete(id); if (alive) fn() }, ms)
      timerIds.add(id); return id
    }

      var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      var fine = matchMedia('(pointer: fine)').matches;

      var mh = document.querySelector('.masthead');
      var onScroll = function () { mh.classList.toggle('scrolled', scrollY > 24); };
      on(window, 'scroll', onScroll, { passive: true });
      onScroll();

      var rvs = [].slice.call(document.querySelectorAll('.rv'));
      var nums = [].slice.call(document.querySelectorAll('.fact .n'));

      if (reduced) {
        rvs.forEach(function (e) { e.classList.add('in'); });
      } else {
        nums.forEach(function (n) {
          var txt = (n.getAttribute('aria-label') || n.textContent).trim();
          n.setAttribute('aria-label', txt);
          n.textContent = '';
          [].forEach.call(txt, function (ch, i) {
            if (!/\d/.test(ch)) { var lit = document.createElement('span'); lit.textContent = ch; n.appendChild(lit); return; }
            var col = document.createElement('span'); col.className = 'od'; col.setAttribute('aria-hidden', 'true');
            col.dataset.d = ch;
            var strip = document.createElement('span'); strip.className = 'od-s';
            for (var d = 0; d <= 9; d++) { var dd = document.createElement('span'); dd.textContent = d; strip.appendChild(dd); }
            strip.style.transitionDelay = (i * 110) + 'ms';
            col.appendChild(strip); n.appendChild(col);
          });
        });

        var pending = rvs.slice();
        var sweeping = false;
        var sweep = function () {
          sweeping = false;
          if (!pending.length) return;
          var limit = innerHeight - 44;
          pending = pending.filter(function (el) {
            if (el.getBoundingClientRect().top > limit) return true;
            el.classList.add('in');
            [].forEach.call(el.querySelectorAll('.od'), function (col) {
              col.querySelector('.od-s').style.transform = 'translateY(-' + col.dataset.d + 'em)';
            });
            return false;
          });
        };
        var queueSweep = function () {
          if (!sweeping) { sweeping = true; TIMER(sweep, 16); }
        };
        on(window, 'scroll', queueSweep, { passive: true });
        on(window, 'resize', queueSweep, { passive: true });
        TIMER(sweep, 80);
        TIMER(sweep, 600);
      }

      var ticker = document.querySelector('.ticker');
      if (ticker && !reduced) {
        var x = 0, speed = 0.55, target = 0.55, half = 0;
        var band = document.querySelector('.ticker-band');
        var measure = function () { half = ticker.scrollWidth / 2; };
        measure(); on(window, 'resize', measure);
        on(band, 'mouseenter', function () { target = 0.12; });
        on(band, 'mouseleave', function () { target = 0.55; });
        (function tick() {
          speed += (target - speed) * 0.06;
          x -= speed;
          if (half > 0 && -x >= half) x += half;
          ticker.style.transform = 'translate3d(' + x + 'px,0,0)';
          RAF(tick);
        })();
      }

      /* ---- Screenshot carousel ------------------------------------------------
         The track scrolls natively; JS only reports which slide is centred so the
         caption can arrive with it and the dots stay honest. Runs for everyone,
         including touch and reduced-motion, because it drives no animation itself. */
      var track = document.querySelector('.shot-track');
      if (track) {
        var shots = [].slice.call(track.querySelectorAll('.shot'));
        var dotWrap = document.querySelector('.shot-dots');
        var arrows = [].slice.call(document.querySelectorAll('.shot-arr'));
        var active = 0;

        var dots = shots.map(function (s, i) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'shot-dot'; b.setAttribute('role', 'tab');
          b.setAttribute('aria-label', 'Screenshot ' + (i + 1) + ' of ' + shots.length);
          on(b, 'click', function () { go(i); });
          dotWrap.appendChild(b);
          return b;
        });

        /* Measured from rects, not offsetLeft: the slides' offset parent is the
           shell, not the track, so offsetLeft carries the shell's own inset and
           lands the target ~64px out. Scroll-snap would quietly absorb that, but
           relying on snap to correct arithmetic is how it breaks when the layout
           changes. */
        function delta(s) {
          return s.getBoundingClientRect().left - track.getBoundingClientRect().left;
        }
        /* Each slide's resting scroll position, clamped to the scrollable range.
           The first and last slides cannot reach the track's geometric centre —
           scrollLeft stops at 0 and at max — so progress has to be measured against
           where a slide actually comes to rest, or those two are scored as
           permanently off-centre and never finish arriving. */
        var rest = [];
        function layout() {
          var max = track.scrollWidth - track.clientWidth;
          rest = shots.map(function (s) {
            var ideal = track.scrollLeft + delta(s) - (track.clientWidth - s.clientWidth) / 2;
            return Math.max(0, Math.min(max, ideal));
          });
        }
        function go(i) {
          i = Math.max(0, Math.min(shots.length - 1, i));
          track.scrollTo({ left: rest[i], behavior: reduced ? 'auto' : 'smooth' });
        }
        function setActive(i) {
          active = i;
          shots.forEach(function (s, n) { s.classList.toggle('live', n === i); });
          dots.forEach(function (d, n) {
            d.classList.toggle('on', n === i);
            d.setAttribute('aria-selected', n === i ? 'true' : 'false');
          });
          arrows.forEach(function (a) {
            var d = +a.dataset.dir;
            a.disabled = (d < 0 && i === 0) || (d > 0 && i === shots.length - 1);
          });
        }
        arrows.forEach(function (a) {
          on(a, 'click', function () { go(active + (+a.dataset.dir)); });
        });

        var frames = shots.map(function (s) { return s.querySelector('.shot-frame'); });
        var pics = shots.map(function (s) { return s.querySelector('.shot-frame img'); });
        var caps = shots.map(function (s) { return s.querySelector('figcaption'); });

        /* Centre-most slide wins, rather than a raw intersection ratio — with a
           peeking neighbour two slides are visible at once and ratio alone flickers
           between them mid-swipe. Named syncShots, not measure: the ticker above
           already holds a function-scoped `measure`, and a function declared in a
           block still writes through to that binding in a sloppy-mode script. */
        var raf = 0, settleTimer = 0;
        function syncShots() {
          raf = 0;
          var best = 0, bestD = Infinity;
          var span = shots[0].clientWidth + 26;          // slide + gap
          var narrow = innerWidth <= 640;

          shots.forEach(function (s, i) {
            /* Positive means this slide has travelled off to the left. Measured
               from its resting position, so a settled slide is always exactly 0. */
            var n = Math.max(-1, Math.min(1, (track.scrollLeft - rest[i]) / span));
            var a = Math.abs(n);
            if (a < bestD) { bestD = a; best = i; }
            if (reduced) return;

            /* Smoothstep, not linear: the depth barely moves for the first sliver
               of travel, then falls away quickly, then eases as it settles. Linear
               progress is what makes a scroll-driven effect feel mechanical — the
               slide appears to change at a constant rate no matter where it is. */
            var e = a * a * (3 - 2 * a);

            /* Depth: off-slides turn away, sit back and dim. The turn is what reads
               as one screen handing off to the next rather than two flat cards
               sliding past; kept to 5 degrees, since anything more is coverflow.
               Skipped on phones, where the shot is only ~291px wide already and
               shrinking it costs legibility the effect does not earn back. */
            frames[i].style.transform = narrow ? ''
              : 'rotateY(' + (n * 5).toFixed(2) + 'deg) scale(' + (1 - 0.07 * e).toFixed(4) + ')';
            frames[i].style.opacity = (1 - 0.34 * e).toFixed(3);

            /* Parallax: the image lags its own frame, so the frame reads as a
               window onto the screenshot rather than a border painted around it.
               The slack is made by scaling the image up as it travels, so at rest
               the scale is exactly 1 and nothing is cropped.

               Travel rides the same eased curve as the scale, and must: the slack
               grows with e while a raw linear offset grows with a, and near centre
               e is the smaller of the two — a linear travel would outrun its own
               headroom and expose the edge. Eased, the ratio is a constant 0.84 of
               the available headroom at every point. */
            var dir = n < 0 ? -1 : 1;
            pics[i].style.transform =
              'scale(' + (1 + 0.055 * e).toFixed(4) + ') translate3d(' +
              (dir * e * 0.022 * s.clientWidth).toFixed(1) + 'px,0,0)';

            /* Handoff, not cross-fade: a caption is fully gone by |n| = 0.45, so
               the outgoing line has cleared before the incoming one begins. Both
               travel downward, so one sinks away as the next rises into place. */
            caps[i].style.opacity = Math.max(0, 1 - a * 2.2).toFixed(3);
            caps[i].style.transform = 'translate3d(0,' + (a * 16).toFixed(1) + 'px,0)';
          });

          if (best !== active || !shots[best].classList.contains('live')) setActive(best);
        }

        /* Native mandatory snap owns the settle curve and it is not author
           controllable, so rather than fake a different one, the landing is
           acknowledged: once movement stops, the settled frame's hairline warms to
           gold and fades back. It reads as arriving rather than merely stopping. */
        function onMove() {
          if (!raf) raf = RAF(syncShots);
          track.classList.add('moving');
          clearTimeout(settleTimer);
          settleTimer = TIMER(function () {
            track.classList.remove('moving');
            if (reduced) return;
            frames.forEach(function (f, i) { f.classList.toggle('settled', i === active); });
            TIMER(function () {
              frames.forEach(function (f) { f.classList.remove('settled'); });
            }, 60);
          }, 140);
        }
        on(track, 'scroll', onMove, { passive: true });
        on(window, 'resize', function () {
          layout();                                    // slide widths are percentages
          if (!raf) raf = RAF(syncShots);
        }, { passive: true });
        layout();
        setActive(0);
        syncShots();

      }

      if (fine && !reduced) {
        var dot = document.querySelector('.cur-dot');
        var ring = document.querySelector('.cur-ring');
        var mx = innerWidth / 2, my = innerHeight / 2, seen = false;
        on(window, 'mousemove', function (e) {
          mx = e.clientX; my = e.clientY;
          if (!seen) { seen = true; document.body.classList.add('cursor-on'); }
        }, { passive: true });
        /* The ring used to trail the dot with an eased lag. It cannot any more: it
           is now the rim of the inverted disc, and a rim that lags its own contents
           reads as a rendering fault rather than as weight. Dot, ring and lens are
           driven from one position in one loop so they can never disagree. */
        (function loop() {
          /* Measure before writing. The ring's size animates when it blooms over a
             link, so it has to be read live — but reading it after the transforms
             are written forces a reflow on every single frame. */
          var rw = ring.offsetWidth, rh = ring.offsetHeight;
          dot.style.transform = 'translate(' + (mx - 3.5) + 'px,' + (my - 3.5) + 'px)';
          ring.style.transform = 'translate(' + (mx - rw / 2) + 'px,' + (my - rh / 2) + 'px)';
          if (lens) lensTrack(rw);
          RAF(loop);
        })();
        var hotSel = 'a, button, .btn, .ledger-cell';
        on(document, 'mouseover', function (e) {
          if (e.target.closest(hotSel)) { ring.classList.add('hot'); dot.style.opacity = '0.55'; }
        });
        on(document, 'mouseout', function (e) {
          if (e.target.closest(hotSel)) { ring.classList.remove('hot'); dot.style.opacity = '1'; }
        });

        var mags = [].slice.call(document.querySelectorAll('.btn-gold'));
        on(window, 'mousemove', function (e) {
          mags.forEach(function (b) {
            var r = b.getBoundingClientRect();
            var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            var dx = e.clientX - cx, dy = e.clientY - cy;
            var dist = Math.hypot(dx, dy), range = 96;
            if (dist < range) {
              var f = (1 - dist / range) * 0.32;
              b.style.transform = 'translate(' + dx * f + 'px,' + dy * f + 'px)';
            } else if (b.style.transform) { b.style.transform = ''; }
          });
        }, { passive: true });

        /* ---- Page-wide inversion lens ----------------------------------------
           One clone of the live page, re-themed to its gilt negative. The masthead
           is cloned outside the scrolling wrapper so it stays pinned like the real
           sticky one; everything else rides a single translate matched to scrollY.
           A MutationObserver mirrors class and inline-style changes, so reveals,
           the odometer and the drifting ticker stay frame-exact inside the lens
           instead of desyncing from the page they are supposed to be inverting. */
        var lens = document.querySelector('.lens');
        var lensPage = document.querySelector('.lens-page');
        var lensMast = document.querySelector('.lens-mast');
        var srcNodes = [], cloneNodes = [];

        [[document.querySelector('.masthead'), lensMast],
         [document.querySelector('main'), lensPage],
         [document.querySelector('footer'), lensPage]].forEach(function (pair) {
          if (!pair[0]) return;
          var copy = pair[0].cloneNode(true);
          pair[1].appendChild(copy);
          /* The lens fades out over the screenshots, so the clone never needs their
             pixels — drop the sources and keep the boxes, which holds the layout
             in register without decoding three more copies of the images. */
          [].forEach.call(copy.querySelectorAll('img'), function (im) {
            im.removeAttribute('src'); im.removeAttribute('loading'); im.alt = '';
          });
          var a = [pair[0]], b = [copy];
          while (a.length) {
            var na = a.shift(), nb = b.shift();
            if (nb.id) nb.removeAttribute('id');
            na.__li = srcNodes.length;
            srcNodes.push(na); cloneNodes.push(nb);
            for (var i = 0; i < na.children.length; i++) { a.push(na.children[i]); b.push(nb.children[i]); }
          }
        });

        observer = new MutationObserver(function (muts) {
          for (var i = 0; i < muts.length; i++) {
            var t = muts[i].target, idx = t.__li;
            if (idx == null) continue;
            var cn = cloneNodes[idx];
            if (!cn) continue;
            if (muts[i].attributeName === 'class') cn.setAttribute('class', t.getAttribute('class') || '');
            else if (muts[i].attributeName === 'style') cn.style.cssText = t.style.cssText;
          }
        });
        /* The lens is faded out across the screenshots, so nothing in there needs
           mirroring — and swiping writes transforms to nine elements every frame,
           which would otherwise all be copied into a clone nobody can see. Clearing
           the index unsubscribes that subtree; only transform and opacity are ever
           written there, so the clone's layout stays in register regardless. */
        [].forEach.call(document.querySelectorAll('.shots, .shots *'), function (n) {
          n.__li = undefined;
        });
        /* Scoped to the real content only — observing body would fire on the lens's
           own clip-path write every single mousemove. */
        ['.masthead', 'main', 'footer'].forEach(function (sel) {
          var n = document.querySelector(sel);
          if (n) observer.observe(n, { subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
        });

        function lensScroll() {
          lensPage.style.transform = 'translate3d(0,' + -window.scrollY + 'px,0)';
        }
        /* .lens is fixed inset:0, so it spans the viewport *including* the
           scrollbar gutter — ~15px wider than the real content box. Left alone the
           clone wraps its text at a different width and the lens shows the page
           subtly out of register, so pin the clone to the true content width. */
        function lensWidth() {
          var w = document.documentElement.clientWidth + 'px';
          lensPage.style.width = w; lensMast.style.width = w;
          /* The masthead clone lives in its own pinned layer to mimic position:
             sticky, which leaves the cloned <main> starting at 0 instead of below
             the masthead's flow space. Re-seat it at main's real document offset. */
          var m = document.querySelector('main');
          if (m) lensPage.style.top = m.offsetTop + 'px';
        }
        on(window, 'scroll', lensScroll, { passive: true });
        on(window, 'resize', function () { lensWidth(); lensScroll(); }, { passive: true });
        lensWidth(); lensScroll();

        /* The inverted disc is now the ring's interior rather than a separate,
           larger circle — so its radius is derived from the ring instead of being
           its own number. One value controls both, and the disc grows with the ring
           when it blooms over a link. Inset by the 1px border so the gold hairline
           reads as the rim of the disc rather than sitting on top of it.

           The screenshots stay a quiet zone: a bitmap has no tokens to flip, so the
           lens would hand the same pixels back and appear to die over them — and a
           product shot is the one place the visitor should be looking at the
           product, not at the effect. */
        var quiet = document.querySelector('.shots');
        function lensTrack(ringW) {
          lens.style.clipPath = 'circle(' + (ringW / 2 - 1) + 'px at ' + mx + 'px ' + my + 'px)';
          var r = quiet && quiet.getBoundingClientRect();
          lens.classList.toggle('on', seen && !(r && my >= r.top && my <= r.bottom));
        }
        on(document.documentElement, 'mouseleave', function () {
          lens.classList.remove('on');
        });
      }

    return () => {
      alive = false
      ac.abort()
      rafIds.forEach(cancelAnimationFrame)
      timerIds.forEach(clearTimeout)
      if (observer) observer.disconnect()
      /* Appended by hand, so React will not clear them between passes. */
      document.querySelectorAll('.lens-page, .lens-mast, .shot-dots').forEach((n) => { n.textContent = '' })
      document.body.classList.remove('cursor-on')
    }
  }, [])

  return (
    <>
      <style>{CSS}</style>
      <div className="masthead">
        <div className="shell masthead-inner">
          <a className="wordmark" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
            <span className="mark" aria-hidden="true"><svg viewBox="0 0 100 100">
              <rect x="25" y="25" width="34" height="34" rx="4" fill="none" stroke="currentColor" strokeWidth="9" opacity="0.55" transform="rotate(45 42 42)"/>
              <rect x="41" y="41" width="34" height="34" rx="4" fill="none" stroke="currentColor" strokeWidth="9" transform="rotate(45 58 58)"/>
              <line x1="30" y1="58" x2="70" y2="42" stroke="currentColor" strokeWidth="2.2" opacity="0.5"/>
              <line x1="34" y1="66" x2="74" y2="50" stroke="currentColor" strokeWidth="2.2" opacity="0.5"/>
            </svg></span><span className="wm-text">SRMS<b>.</b></span></a>
          <nav>
            <a className="nav-sec" href="#records">The four ledgers</a>
            <a className="nav-sec" href="#roles">Who sees what</a>
            <a className="nav-sec" href="#" onClick={(e) => { e.preventDefault(); onShowPlans() }}>Pricing</a>
            <a className="nav-signin" href="#" onClick={(e) => { e.preventDefault(); onEnter() }}>Sign in</a>
          </nav>
        </div>
      </div>

      <main>
        <section className="hero">
          <div className="shell">
            <div className="crest"><span className="label">Student records · built for basic schools in Ghana</span></div>
            <h1>Every mark, every cedi, every child. <span className="gilt">Accounted for.</span></h1>
            <div className="lede-row">
              <p className="lede">SRMS keeps a school's records the way a good bursar keeps the books. Grades with weighted components, daily attendance, fee ledgers whose arrears carry over on their own, and a portal where parents see it all. <strong>Entered once. Impossible to lose.</strong></p>
              <div className="cta-col">
                <a className="btn btn-gold" href="#" onClick={(e) => { e.preventDefault(); onEnter() }}>Sign in</a>
              </div>
            </div>
          </div>
        </section>

        <div className="ticker-band" aria-hidden="true">
          <div className="ticker">
            <div className="ticker-set">
              <span className="ticker-item">Grades &amp; assessments</span><span className="ticker-item">Attendance tracking</span><span className="ticker-item">Fee management</span><span className="ticker-item">Parent portal</span><span className="ticker-item">PDF report cards</span><span className="ticker-item">Audit logging</span><span className="ticker-item">Multi-role access</span><span className="ticker-item">Academic year wizard</span><span className="ticker-item">Behaviour records</span><span className="ticker-item">Class broadsheet</span><span className="ticker-item">Subject reports</span><span className="ticker-item">Multi-school support</span>
            </div>
            <div className="ticker-set">
              <span className="ticker-item">Grades &amp; assessments</span><span className="ticker-item">Attendance tracking</span><span className="ticker-item">Fee management</span><span className="ticker-item">Parent portal</span><span className="ticker-item">PDF report cards</span><span className="ticker-item">Audit logging</span><span className="ticker-item">Multi-role access</span><span className="ticker-item">Academic year wizard</span><span className="ticker-item">Behaviour records</span><span className="ticker-item">Class broadsheet</span><span className="ticker-item">Subject reports</span><span className="ticker-item">Multi-school support</span>
            </div>
          </div>
        </div>

        <section className="shots" id="shots">
          <div className="shell">
            <div className="shots-head">
              <div className="rv">
                <span className="label k">Inside SRMS</span>
                <h2>The dashboard, the fee ledger, the register.</h2>
              </div>
              <span className="sample-tag">Sample school · demo data</span>
            </div>

            <div className="shot-track" tabIndex="0" role="region" aria-label="Product screenshots, scrollable">
              <figure className="shot">
                <div className="shot-frame"><img src="/shots/shot-dashboard.webp" width="1600" height="805" decoding="async"
                     alt="SRMS dashboard showing total pupils, attendance rate, average score and fee collection for the academic year, with a top performers list below." /></div>
                <figcaption>
                  <b>Dashboard.</b> The whole school on one screen — roll, attendance,
                  average score and fee collection for the year that is currently open.
                </figcaption>
              </figure>
              <figure className="shot">
                <div className="shot-frame"><img src="/shots/shot-fees.webp" width="1600" height="805" loading="lazy" decoding="async"
                     alt="SRMS fee management page showing total owed, collected, outstanding and collection rate, above a table of fee records with payment status and receipt numbers." /></div>
                <figcaption>
                  <b>Fees.</b> Every fee, payment and receipt in one ledger. Arrears follow
                  the pupil into the next year on their own — that is the orange tag.
                </figcaption>
              </figure>
              <figure className="shot">
                <div className="shot-frame"><img src="/shots/shot-attendance.webp" width="1600" height="805" loading="lazy" decoding="async"
                     alt="SRMS attendance page for a class, with present, absent, late and excused controls against each pupil and a save button." /></div>
                <figcaption>
                  <b>Attendance.</b> Mark a whole class in one pass. The register already
                  knows whether today has been marked, so nobody marks twice.
                </figcaption>
              </figure>
            </div>

            <div className="shot-bar">
              <div className="shot-dots" role="tablist" aria-label="Choose a screenshot"></div>
              <div className="shot-arrows">
                <button className="shot-arr" type="button" data-dir="-1" aria-label="Previous screenshot">&larr;</button>
                <button className="shot-arr" type="button" data-dir="1" aria-label="Next screenshot">&rarr;</button>
              </div>
            </div>
          </div>
        </section>

        <section className="ledgers" id="records">
          <div className="shell">
            <div className="ledgers-head rv">
              <span className="label k">The four ledgers</span>
              <h2 style={{ marginTop: '18px' }}>Everything the school records, in one set of books.</h2>
              <p>The exercise books, the spreadsheets, and the carbon-copy receipt book, replaced by four ledgers that talk to each other.</p>
            </div>
            <div className="ledger-grid">
              <div className="ledger-cell rv">
                <div className="icon-frame"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path pathLength="100" d="M12 5c-2-1.4-4.4-2-7-2v14c2.6 0 5 .6 7 2 2-1.4 4.4-2 7-2V3c-2.6 0-5 .6-7 2z"/><path pathLength="100" d="M12 5v14"/></svg></div>
                <h3>Grades &amp; reports</h3>
                <p>Weighted class and exam components, automatic totals, class rankings, and printable report cards generated in seconds.</p>
              </div>
              <div className="ledger-cell rv d1">
                <div className="icon-frame"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect pathLength="100" x="3" y="5" width="18" height="16"/><path pathLength="100" d="M3 9h18M8 3v4M16 3v4"/><path pathLength="100" d="M9 15l2 2 4-4"/></svg></div>
                <h3>Attendance</h3>
                <p>Daily batch marking for a whole class, with public-holiday detection, vacation blocking, and exportable history.</p>
              </div>
              <div className="ledger-cell rv d2">
                <div className="icon-frame"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path pathLength="100" d="M6 3h12v18l-2-1.5-2 1.5-2-1.5L10 21l-2-1.5L6 21V3z"/><path pathLength="100" d="M9 8h6M9 12h6"/></svg></div>
                <h3>Fees</h3>
                <p>Invoicing in cedis or any currency, payment recording with printed receipts, and arrears that carry forward on their own.</p>
              </div>
              <div className="ledger-cell rv d3">
                <div className="icon-frame"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle pathLength="100" cx="9" cy="8" r="3"/><path pathLength="100" d="M4 20c0-3 2.3-5 5-5s5 2 5 5"/><circle pathLength="100" cx="16.5" cy="9.5" r="2.5"/><path pathLength="100" d="M20 20c0-2.5-1.7-4.3-3.8-4.8"/></svg></div>
                <h3>Parent portal</h3>
                <p>Parents sign in and see their own child's grades, attendance, fee balance, and announcements, on the schedule the school decides.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="facts-band">
          <div className="shell">
            <span className="label k rv">On the record</span>
            <div className="facts">
              <div className="fact rv"><div className="n">365</div><div className="l">days of searchable audit history. Every change recorded with who, what, and when</div></div>
              <div className="fact rv d1"><div className="n">1</div><div className="l">click to print report cards for a whole class, formatted for A4</div></div>
              <div className="fact rv d2"><div className="n">5</div><div className="l">user roles with scoped access, from super admin to parent</div></div>
              <div className="fact rv d3"><div className="n">0</div><div className="l">data shared between schools. Row-level security on every table</div></div>
            </div>
          </div>
        </section>

        <section className="roles" id="roles">
          <div className="shell">
            <div className="roles-head rv">
              <span className="label k">Who sees what</span>
              <h2 style={{ marginTop: '18px' }}>Five roles, each with exactly the right keys.</h2>
              <p>Access is scoped by role and enforced in the database itself. One school's data never mixes with another's.</p>
            </div>
            <table className="roles-table rv d1">
              <thead>
                <tr><th>Role</th><th>What they can do</th></tr>
              </thead>
              <tbody>
                <tr><td>Super admin</td><td>Full oversight of the school: every record, every setting, every user.</td></tr>
                <tr><td>Admin</td><td>Day-to-day running: students, classes, fees, invoices, receipts, announcements.</td></tr>
                <tr><td>Class teacher</td><td>Their class register: attendance, behaviour records, class scores, and end-of-term remarks.</td></tr>
                <tr><td>Subject teacher</td><td>Marks entry for their own subjects only.</td></tr>
                <tr><td>Parent</td><td>A secure window into their own child's progress: grades, attendance, fee balance, and school announcements.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="start" id="start">
          <div className="shell start-grid">
            <div className="rv">
              <span className="label k">Getting started</span>
              <h2 style={{ marginTop: '18px' }}>Three steps, and your teachers can start marking.</h2>
              <p className="price-line">Priced <em>per school, not per pupil</em>. A school of 80 pays like a school of 800.</p>
              <p className="price-more"><a href="#" onClick={(e) => { e.preventDefault(); onShowPlans() }}>See the plans</a></p>
              <div className="cta-row">
                <a className="btn btn-gold" href="#" onClick={(e) => { e.preventDefault(); onEnter() }}>Sign in</a>
                <a className="btn-line" href="tel:+233536759120">Call or WhatsApp 053 675 9120</a>
              </div>
            </div>
            <div className="steps rv d1">
              <div className="step"><div className="no">1.</div><div><h3>Create your school</h3><p>Name, crest, academic year and terms. Works on a phone, and most heads set it up on one.</p></div></div>
              <div className="step"><div className="no">2.</div><div><h3>Add classes, subjects, and pupils</h3><p>Enter them directly or import from the registers you already keep.</p></div></div>
              <div className="step"><div className="no">3.</div><div><h3>Invite teachers and parents</h3><p>Each person gets their own sign-in with exactly the access their role allows.</p></div></div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="shell foot-grid">
          <div>
            <div className="fm">
              <span className="mark" aria-hidden="true"><svg viewBox="0 0 100 100">
                <rect x="25" y="25" width="34" height="34" rx="4" fill="none" stroke="currentColor" strokeWidth="9" opacity="0.55" transform="rotate(45 42 42)"/>
                <rect x="41" y="41" width="34" height="34" rx="4" fill="none" stroke="currentColor" strokeWidth="9" transform="rotate(45 58 58)"/>
                <line x1="30" y1="58" x2="70" y2="42" stroke="currentColor" strokeWidth="2.2" opacity="0.5"/>
                <line x1="34" y1="66" x2="74" y2="50" stroke="currentColor" strokeWidth="2.2" opacity="0.5"/>
              </svg></span><span className="wm-text">SRMS<b>.</b></span></div>
            <p>Student records management for basic schools. A product of <b>Prime Logic Softwares</b>.</p>
            <p className="foot-contact">
              <a href="tel:+233536759120">+233&nbsp;53&nbsp;675&nbsp;9120</a> <span>·</span> <a href="mailto:kofi.william2311@gmail.com">kofi.william2311@gmail.com</a>
            </p>
          </div>
        </div>
      </footer>

      <div className="lens" aria-hidden="true"><div className="lens-page"></div><div className="lens-mast"></div></div>
      <div className="cur-dot" aria-hidden="true"></div>
      <div className="cur-ring" aria-hidden="true"></div>
    </>
  )
}
