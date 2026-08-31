const G = `
@import url('https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=cabinet-grotesk@300,400,500,600,700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --ink:    #0c0c15;
  --ink2:   #11111c;
  --ink3:   #171724;
  --ink4:   #1e1e2e;
  --ink5:   #262638;
  --ink6:   #2f2f45;

  --line:   rgba(255,255,255,0.055);
  --line2:  rgba(255,255,255,0.09);
  --line3:  rgba(255,255,255,0.13);

  --gold:   #e8b84b;
  --gold2:  #f5d07a;
  --gold3:  #c49a2e;
  --gold-glow: rgba(232,184,75,0.15);
  /* Semantic tints — used for alert banners, badges, state rows */
  --rose-subtle:    rgba(240,107,122,0.07);
  --rose-line:      rgba(240,107,122,0.22);
  --amber-subtle:   rgba(251,159,58,0.07);
  --amber-line:     rgba(251,159,58,0.25);
  --emerald-subtle: rgba(45,212,160,0.10);
  --emerald-line:   rgba(45,212,160,0.25);
  --sky-subtle:     rgba(91,168,245,0.07);
  --sky-line:       rgba(91,168,245,0.22);
  --gold-subtle:    rgba(232,184,75,0.07);
  --gold-line:      rgba(232,184,75,0.20);

  --emerald:#2dd4a0;
  --rose:   #f06b7a;
  --sky:    #5ba8f5;
  --amber:  #fb9f3a;
  --violet: #a78bfa;

  --white:  #f0f0fa;
  --mist:   #c8c8e0;
  --mist2:  #8080a0;
  --mist3:  #50506a;

  --r-xs: 6px;
  --r-sm: 10px;
  --r:    14px;
  --r-lg: 20px;
  --r-xl: 28px;

  --t-snap: 0.12s cubic-bezier(.16,1,.3,1);
  --t-fast: 0.18s cubic-bezier(.16,1,.3,1);
  --t:      0.28s cubic-bezier(.16,1,.3,1);
  --t-slow: 0.45s cubic-bezier(.16,1,.3,1);
  --t-spring: 0.5s cubic-bezier(0.34,1.56,0.64,1);

  --shadow-sm: 0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05);
  --shadow-md: 0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05);
  --shadow-lg: 0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
  --shadow-gold: 0 4px 20px rgba(232,184,75,0.3);
}

/* ── Light theme ───────────────────────────────────────────── */
/*
   Design intent: warm paper whites, not inverted dark.
   Gold deepened for readability. Accents shifted for light bg.
   Text is warm charcoal — never purple or cold grey.
*/
body.light{
  /* Backgrounds — warm parchment, not cold lavender */
  --ink:    #f4f1ec;
  --ink2:   #ffffff;
  --ink3:   #edeae3;
  --ink4:   #e4e1da;
  --ink5:   #d8d5cd;
  --ink6:   #cbc8c0;

  /* Borders */
  --line:   rgba(0,0,0,0.08);
  --line2:  rgba(0,0,0,0.13);
  --line3:  rgba(0,0,0,0.20);

  /* Gold — deepened so it reads on light backgrounds */
  --gold:   #b8870c;
  --gold2:  #d4a020;
  --gold3:  #8c6508;
  --gold-glow: rgba(184,135,12,0.14);
  /* Semantic tints — light theme versions */
  --rose-subtle:    rgba(212,79,94,0.07);
  --rose-line:      rgba(212,79,94,0.22);
  --amber-subtle:   rgba(196,98,16,0.07);
  --amber-line:     rgba(196,98,16,0.22);
  --emerald-subtle: rgba(10,156,114,0.08);
  --emerald-line:   rgba(10,156,114,0.22);
  --sky-subtle:     rgba(34,114,204,0.07);
  --sky-line:       rgba(34,114,204,0.20);
  --gold-subtle:    rgba(184,135,12,0.07);
  --gold-line:      rgba(184,135,12,0.20);

  /* Semantic accents — all deepened ~20% for light bg contrast */
  --emerald: #0a9c72;
  --rose:    #d44f5e;
  --sky:     #2272cc;
  --amber:   #c46210;
  --violet:  #6e4dc4;

  /* Text — warm charcoal hierarchy, zero purple */
  --white:  #1a1710;
  --mist:   #2e2b24;
  --mist2:  #635e54;
  --mist3:  #9a9488;

  /* Shadows work differently in light — elevation via drop shadow */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.13), 0 4px 12px rgba(0,0,0,0.08);
  --shadow-gold: 0 4px 16px rgba(184,135,12,0.22);
  --modal-backdrop: rgba(60,55,45,0.45);
}

/* ── Light mode component-level overrides ────────────────── */
/* Cards get real shadow separation instead of the dark inner glow */
body.light .card-surface,
body.light [class*="card"] {
  box-shadow: var(--shadow-sm) !important;
}

/* Select option elements use light bg in light mode */
body.light select option {
  background: #ffffff;
  color: #1a1710;
}

/* Scrollbar for light mode */
body.light ::-webkit-scrollbar-thumb { background: var(--ink5); }
body.light ::-webkit-scrollbar-thumb:hover { background: var(--ink6); }

/* Date picker icon for light */
body.light input[type=date]::-webkit-calendar-picker-indicator {
  filter: none;
  opacity: 0.5;
}

/* Grain overlay — much lighter on light bg */
body.light .grain::after { opacity: 0.008; }

/* Sidebar in light gets a warm border */
body.light .srms-sidebar {
  border-right-color: rgba(0,0,0,0.1) !important;
}

/* Top bar border */
body.light .srms-topbar {
  border-bottom-color: rgba(0,0,0,0.1) !important;
}

/* Improve active nav item contrast in light */
body.light button[style*="rgba(232,184,75,0.1)"] {
  background: rgba(184,135,12,0.1) !important;
}

/* Ghost buttons need visible border in light */
body.light button {
  -webkit-font-smoothing: subpixel-antialiased;
}

html,body,#root{
  height:100%;
  background:var(--ink);
  color:var(--white);
  font-family:'Cabinet Grotesk',system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;
  font-size:14px;
  line-height:1.5;
}

::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--ink6);border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:var(--mist3)}

.d{font-family:'Clash Display',system-ui,sans-serif}
.mono{font-family:'JetBrains Mono',monospace;font-size:0.87em;letter-spacing:-0.02em}

/* ── Keyframes ─────────────────────────────────────────────── */
@keyframes fadeUp   {from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeDown {from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn   {from{opacity:0}to{opacity:1}}
@keyframes scaleIn  {from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
@keyframes slideUp  {from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes slideInL {from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
@keyframes spin     {to{transform:rotate(360deg)}}
@keyframes pageIn   {from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmer  {0%{background-position:-600px 0}100%{background-position:600px 0}}
@keyframes toastIn  {from{opacity:0;transform:translateY(10px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes drawerIn {from{transform:translateX(-100%)}to{transform:translateX(0)}}
@keyframes pulse    {0%,100%{opacity:1}50%{opacity:0.5}}
@keyframes srmsMarkDrawErase {
  0%,8%   {stroke-dashoffset:150}
  42%,68% {stroke-dashoffset:0}
  100%    {stroke-dashoffset:-150}
}

.srms-loading-mark {
  width:clamp(76px,8vw,88px);
  height:auto;
  overflow:visible;
  flex-shrink:0;
}
.srms-loading-mark__guide,
.srms-loading-mark__stroke {
  fill:none;
  stroke-width:5;
  stroke-linecap:round;
  stroke-linejoin:round;
}
.srms-loading-mark__guide {stroke:var(--ink4)}
.srms-loading-mark__stroke {
  stroke:var(--gold);
  stroke-dasharray:150 150;
  stroke-dashoffset:150;
  animation:srmsMarkDrawErase 2.8s cubic-bezier(.65,0,.35,1) infinite;
}
@media (prefers-reduced-motion:reduce) {
  .srms-loading-mark__stroke {
    animation:none;
    stroke-dashoffset:0;
  }
}

/* Golden Hinge universal select */
.srms-select{position:relative;display:inline-block;min-width:0;vertical-align:middle}
.srms-select__trigger{
  width:100%;min-height:40px;display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:8px 13px;background:var(--ink3);border:1px solid var(--line2);border-radius:var(--r-sm);
  color:var(--mist);font:inherit;font-size:13px;text-align:left;cursor:pointer;position:relative;overflow:hidden;
  transition:background var(--t-fast),border-color var(--t-fast),box-shadow var(--t-fast);
}
.srms-select__trigger::after{
  content:'';position:absolute;left:13px;bottom:6px;width:0;height:1px;background:var(--gold);
  transition:width .18s cubic-bezier(.22,.8,.22,1);
}
.srms-select__trigger:hover{background:var(--ink4);border-color:rgba(232,184,75,.45)}
.srms-select__trigger:hover::after,.srms-select.is-open .srms-select__trigger::after{width:34px}
.srms-select.is-open .srms-select__trigger{background:var(--ink4);border-color:var(--gold);box-shadow:0 0 0 3px rgba(232,184,75,.07)}
.srms-select__trigger:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.srms-select__trigger:disabled{opacity:.5;cursor:not-allowed}
.srms-select.is-error .srms-select__trigger{border-color:var(--rose);color:var(--rose)}
.srms-select__value{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.srms-select__value.is-placeholder{color:var(--mist3)}
.srms-select__chevron{width:16px;height:16px;flex:0 0 auto;color:var(--gold);transition:transform .18s cubic-bezier(.22,.8,.22,1)}
.srms-select__trigger:hover .srms-select__chevron{transform:translateY(2px)}
.srms-select.is-open .srms-select__chevron{transform:rotate(180deg)}
.srms-select.is-compact .srms-select__trigger{min-height:30px;padding:4px 10px;font-size:11px;font-weight:600;border-radius:8px}
.srms-select.is-amber .srms-select__trigger{color:var(--amber);background:rgba(251,159,58,.08);border-color:rgba(251,159,58,.3)}
.srms-select.is-amber .srms-select__chevron,.srms-select.is-amber .srms-select__trigger::after{color:var(--amber);background:var(--amber)}

.srms-select-menu{
  position:fixed;z-index:4000;background:var(--ink4);border:1px solid var(--line2);border-radius:10px;
  padding:6px;box-shadow:0 14px 34px rgba(0,0,0,.45);overflow:hidden;
  animation:srmsSelectOpen .18s cubic-bezier(.22,.8,.22,1) both;
}
.srms-select-menu.opens-up{transform-origin:bottom}
@keyframes srmsSelectOpen{from{opacity:0;transform:translateY(-6px) scaleY(.97)}to{opacity:1;transform:translateY(0) scaleY(1)}}
.srms-select-menu__header{height:34px;padding:0 9px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);color:var(--mist3);font-size:10px}
.srms-select-menu__group{padding:8px 10px 4px;color:var(--mist3);font-size:10px;font-weight:600}
.srms-select-menu__options{max-height:inherit;overflow-y:auto;overscroll-behavior:contain}
.srms-select-option{
  width:100%;min-height:42px;padding:8px 10px;border:0;border-radius:6px;background:transparent;color:var(--mist2);
  display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;font:inherit;font-size:13px;cursor:pointer;
  transition:background .11s ease,color .11s ease,padding-left .14s cubic-bezier(.22,.8,.22,1);
}
.srms-select-option:hover,.srms-select-option.is-active{background:var(--ink5);color:var(--white);padding-left:13px}
.srms-select-option.is-selected{color:var(--gold);background:rgba(232,184,75,.07)}
.srms-select-option:disabled{opacity:.4;cursor:not-allowed}
.srms-select-option__content{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis}
.srms-select-option__check{width:17px;height:17px;flex:0 0 auto;color:var(--gold);opacity:0;transform:scale(.7);transition:opacity .12s ease,transform .16s cubic-bezier(.22,.8,.22,1)}
.srms-select-option.is-selected .srms-select-option__check{opacity:1;transform:scale(1)}
.srms-select-menu.is-mobile{border-radius:14px;animation:srmsSelectSheet .22s cubic-bezier(.22,.8,.22,1) both;padding:8px;max-width:none}
.srms-select-menu__handle{width:34px;height:4px;border-radius:4px;background:var(--line2);margin:2px auto 8px}
@keyframes srmsSelectSheet{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:640px){
  .srms-select{display:block;width:100%}
  .srms-select__trigger{min-height:46px;font-size:16px}
  .srms-select.is-compact{display:inline-block;width:auto}
  .srms-select.is-compact .srms-select__trigger{min-height:26px;font-size:10px;padding:3px 8px}
  .srms-select-option{min-height:48px;font-size:16px}
}
@media(prefers-reduced-motion:reduce){.srms-select-menu{animation:none}.srms-select *{transition-duration:1ms!important}}

.srms-search-select{position:relative}
.srms-search-select__label{display:block;font-size:11px;font-weight:600;color:var(--mist2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;font-family:'Clash Display',sans-serif}
.srms-search-select__control{position:relative}
.srms-search-select__control::after{content:'';position:absolute;left:34px;bottom:6px;width:0;height:1px;background:var(--gold);transition:width .18s cubic-bezier(.22,.8,.22,1)}
.srms-search-select__control:hover::after,.srms-search-select.is-open .srms-search-select__control::after{width:34px}
.srms-search-select__input{width:100%;min-height:40px;background:var(--ink3);border:1px solid var(--line2);border-radius:var(--r-sm);padding:9px 34px;color:var(--white);font-size:13.5px;transition:background var(--t-fast),border-color var(--t-fast),box-shadow var(--t-fast)}
.srms-search-select__input:hover{background:var(--ink4);border-color:rgba(232,184,75,.45)}
.srms-search-select__input:focus{background:var(--ink4);border-color:var(--gold);box-shadow:0 0 0 3px rgba(232,184,75,.07)}
.srms-search-select__input:disabled{opacity:.5;cursor:not-allowed}
.srms-search-select__icon{position:absolute;z-index:1;left:11px;top:50%;width:16px;height:16px;transform:translateY(-50%);color:var(--mist3);pointer-events:none}
.srms-search-select__clear{position:absolute;right:8px;top:50%;width:28px;height:28px;transform:translateY(-50%);background:transparent;border:0;color:var(--mist3);font-size:17px;cursor:pointer}
.srms-search-select__menu{position:absolute;z-index:100;top:100%;left:0;right:0;margin-top:7px;max-height:260px;overflow-y:auto;background:var(--ink4);border:1px solid var(--line2);border-radius:10px;padding:6px;box-shadow:0 14px 34px rgba(0,0,0,.45);animation:srmsSelectOpen .18s cubic-bezier(.22,.8,.22,1) both}
.srms-search-select__header{height:32px;padding:0 9px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);color:var(--mist3);font-size:10px}
.srms-search-select__option{width:100%;min-height:44px;padding:8px 10px;border:0;border-radius:6px;background:transparent;display:flex;align-items:center;justify-content:space-between;gap:10px;color:var(--mist2);font:inherit;font-size:13px;text-align:left;cursor:pointer;transition:background .11s ease,color .11s ease,padding-left .14s cubic-bezier(.22,.8,.22,1)}
.srms-search-select__option:hover,.srms-search-select__option.is-active{background:var(--ink5);color:var(--white);padding-left:13px}
.srms-search-select__option.is-selected{color:var(--gold);background:rgba(232,184,75,.07)}
.srms-search-select__name{font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.srms-search-select__meta{font-size:11px;color:var(--mist3);white-space:nowrap;flex-shrink:0}
.srms-search-select__empty{padding:12px 10px;font-size:12px;color:var(--mist3)}
@media(max-width:640px){.srms-search-select__input{min-height:46px;font-size:16px}.srms-search-select__option{min-height:48px;font-size:16px}}
@media(prefers-reduced-motion:reduce){.srms-search-select *{transition-duration:1ms!important}.srms-search-select__menu{animation:none}}

/* ── Animation classes ─────────────────────────────────────── */
.fu  {animation:fadeUp  0.42s cubic-bezier(.16,1,.3,1) both}
.fi  {animation:fadeIn  0.22s ease both}
.si  {animation:scaleIn 0.3s  cubic-bezier(.16,1,.3,1) both}
.sil {animation:slideInL 0.35s cubic-bezier(.16,1,.3,1) both}
.page{animation:pageIn  0.4s  cubic-bezier(.16,1,.3,1) both}

.fu1{animation-delay:.04s}.fu2{animation-delay:.08s}.fu3{animation-delay:.12s}
.fu4{animation-delay:.16s}.fu5{animation-delay:.20s}.fu6{animation-delay:.24s}
.fu7{animation-delay:.28s}.fu8{animation-delay:.32s}

/* Scroll-reveal — add className="reveal" to any element */
.reveal{opacity:0;transform:translateY(24px);transition:opacity 0.5s cubic-bezier(.16,1,.3,1),transform 0.5s cubic-bezier(.16,1,.3,1)}
.reveal.visible{opacity:1;transform:translateY(0)}

/* ── Skeleton ──────────────────────────────────────────────── */
.skeleton{
  background:linear-gradient(90deg,var(--ink4) 25%,var(--ink5) 50%,var(--ink4) 75%);
  background-size:600px 100%;
  animation:shimmer 1.6s infinite linear;
  border-radius:var(--r-sm);
}

/* ── Utility ───────────────────────────────────────────────── */
button{cursor:pointer;border:none;outline:none;font-family:inherit}
input,select,textarea{font-family:inherit;outline:none}
::selection{background:rgba(232,184,75,0.25);color:var(--white)}

::placeholder{color:var(--mist3);opacity:1}

/* dark option elements */
select option{background:var(--ink4);color:var(--white)}

/* date picker icon tint */
input[type=date]::-webkit-calendar-picker-indicator{
  filter:invert(0.45) sepia(0.1);cursor:pointer;opacity:0.7;
}
input[type=date]::-webkit-calendar-picker-indicator:hover{opacity:1}

/* focus-visible ring */
:focus-visible{
  outline:2px solid rgba(232,184,75,0.55);
  outline-offset:2px;
  border-radius:4px;
}
button:focus-visible,a:focus-visible{border-radius:8px}

/* number input: hide spinners */
input[type=number]::-webkit-outer-spin-button,
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
input[type=number]{-moz-appearance:textfield}

/* link reset */
a{color:inherit;text-decoration:none}


/* subtle grain overlay */
.grain::after{
  content:'';position:fixed;inset:0;pointer-events:none;opacity:0.022;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size:200px;z-index:9999;
}

/* ── Responsive ────────────────────────────────────────────── */
.mob-hide{display:block}
.mob-show{display:none!important}
@media(max-width:768px){
  .mob-hide{display:none!important}
  .mob-show{display:flex!important}
  .mob-pad{padding:16px!important}
}
`
export default G

export function initScrollReveal() {
  if (typeof window === 'undefined') return
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target) } }),
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  )
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
  return observer
}
