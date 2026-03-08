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

::-webkit-scrollbar{width:3px;height:3px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--ink6);border-radius:3px}
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

/* ── Animation classes ─────────────────────────────────────── */
.fu  {animation:fadeUp  0.42s cubic-bezier(.16,1,.3,1) both}
.fi  {animation:fadeIn  0.22s ease both}
.si  {animation:scaleIn 0.3s  cubic-bezier(.16,1,.3,1) both}
.sil {animation:slideInL 0.35s cubic-bezier(.16,1,.3,1) both}
.page{animation:pageIn  0.4s  cubic-bezier(.16,1,.3,1) both}

.fu1{animation-delay:.04s}.fu2{animation-delay:.08s}.fu3{animation-delay:.12s}
.fu4{animation-delay:.16s}.fu5{animation-delay:.20s}.fu6{animation-delay:.24s}
.fu7{animation-delay:.28s}.fu8{animation-delay:.32s}

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
::selection{background:rgba(232,184,75,0.2);color:var(--white)}

/* subtle grain overlay */
.grain::after{
  content:'';position:fixed;inset:0;pointer-events:none;opacity:0.014;
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