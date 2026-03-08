const G = `
@import url('https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=cabinet-grotesk@300,400,500,600,700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --ink:#0b0b12;
  --ink2:#10101a;
  --ink3:#161620;
  --ink4:#1d1d2a;
  --ink5:#242434;
  --ink6:#2c2c3e;
  --line:rgba(255,255,255,0.06);
  --line2:rgba(255,255,255,0.10);
  --gold:#e8b84b;--gold2:#f5d07a;--gold3:#c49a2e;
  --gold-glow:rgba(232,184,75,0.12);--gold-dim:rgba(232,184,75,0.06);
  --emerald:#2dd4a0;--rose:#f06b7a;--sky:#5ba8f5;--amber:#fb9f3a;--violet:#a78bfa;
  --mist:#d4d4e8;--mist2:#8e8ea8;--mist3:#52526a;--white:#f2f2fa;
  --r-xs:6px;--r-sm:10px;--r:16px;--r-lg:22px;--r-xl:28px;
  --sh:0 4px 24px rgba(0,0,0,0.4);
  --sh-md:0 8px 40px rgba(0,0,0,0.5);
  --sh-lg:0 20px 60px rgba(0,0,0,0.6);
  --sh-gold:0 0 32px rgba(232,184,75,0.1);
  --t-fast:0.15s cubic-bezier(.16,1,.3,1);
  --t:0.25s cubic-bezier(.16,1,.3,1);
  --t-slow:0.4s cubic-bezier(.16,1,.3,1);
  --t-bounce:0.5s cubic-bezier(0.34,1.56,0.64,1);
}

html,body,#root{height:100%;background:var(--ink);color:var(--white);font-family:'Cabinet Grotesk',sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}

::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--ink6);border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:var(--mist3)}

.d{font-family:'Clash Display',sans-serif}
.mono{font-family:'JetBrains Mono','Fira Code',monospace;font-size:0.88em;letter-spacing:-0.01em}

@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}
@keyframes slideInLeft{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideInRight{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
@keyframes pageIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
@keyframes pulseGlow{0%,100%{opacity:1}50%{opacity:0.6}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes drawerIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
@keyframes numberPop{0%{transform:scale(1)}50%{transform:scale(1.04)}100%{transform:scale(1)}}

.fu{animation:fadeUp 0.4s cubic-bezier(.16,1,.3,1) both}
.fi{animation:fadeIn 0.25s ease both}
.si{animation:scaleIn 0.3s cubic-bezier(.16,1,.3,1) both}
.sil{animation:slideInLeft 0.35s cubic-bezier(.16,1,.3,1) both}
.sir{animation:slideInRight 0.35s cubic-bezier(.16,1,.3,1) both}
.page{animation:pageIn 0.38s cubic-bezier(.16,1,.3,1) both}

.fu1{animation-delay:.05s}.fu2{animation-delay:.10s}.fu3{animation-delay:.15s}
.fu4{animation-delay:.20s}.fu5{animation-delay:.25s}.fu6{animation-delay:.30s}
.fu7{animation-delay:.35s}.fu8{animation-delay:.40s}

.hover-lift{transition:transform var(--t),box-shadow var(--t)}
.hover-lift:hover{transform:translateY(-3px);box-shadow:0 16px 48px rgba(0,0,0,0.5)}
.hover-scale{transition:transform var(--t-fast)}
.hover-scale:hover{transform:scale(1.015)}
.hover-glow{transition:box-shadow var(--t)}
.hover-glow:hover{box-shadow:0 0 0 1px rgba(232,184,75,0.2),0 8px 32px rgba(232,184,75,0.06)}
.row-hover{transition:background var(--t-fast),transform var(--t-fast);border-radius:var(--r-sm)}
.row-hover:hover{background:rgba(255,255,255,0.03) !important;transform:translateX(2px)}

.skeleton{background:linear-gradient(90deg,var(--ink4) 25%,var(--ink5) 50%,var(--ink4) 75%);background-size:400px 100%;animation:shimmer 1.5s infinite;border-radius:var(--r-sm)}

button{cursor:pointer;border:none;outline:none;font-family:inherit}
input,select,textarea{font-family:inherit;outline:none;transition:border-color var(--t-fast),box-shadow var(--t-fast)}
input:focus,select:focus,textarea:focus{border-color:rgba(232,184,75,0.4) !important;box-shadow:0 0 0 3px rgba(232,184,75,0.06) !important}

.grain::after{content:'';position:fixed;inset:0;pointer-events:none;opacity:0.012;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:256px;z-index:9999}

::selection{background:rgba(232,184,75,0.18);color:var(--white)}

.mob-hide{display:block}.mob-show{display:none!important}
@media(max-width:768px){.mob-hide{display:none!important}.mob-show{display:flex!important}.mob-pad{padding:16px!important}}
`
export default G