const G = `
@import url('https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=cabinet-grotesk@300,400,500,600,700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --ink:#09090e;--ink2:#0f0f17;--ink3:#16161f;--ink4:#1e1e2a;--ink5:#252534;
  --line:#2a2a3a;--line2:#363650;
  --gold:#e8b84b;--gold2:#f5d07a;--gold3:#c49a2e;
  --gold-glow:rgba(232,184,75,0.15);--gold-dim:rgba(232,184,75,0.08);
  --emerald:#2dd4a0;--rose:#f06b7a;--sky:#5ba8f5;--amber:#fb9f3a;
  --mist:#c8c8e0;--mist2:#8888a8;--mist3:#55556a;--white:#f0f0f8;
  --r-sm:8px;--r:14px;--r-lg:20px;
  --sh:0 8px 32px rgba(0,0,0,0.5);--sh-gold:0 0 24px rgba(232,184,75,0.12);
}
body.light{
  --ink:#f4f4f8;--ink2:#ffffff;--ink3:#eeeef4;--ink4:#e4e4ec;--ink5:#d8d8e4;
  --line:#d0d0de;--line2:#c0c0d0;
  --mist:#2a2a3a;--mist2:#555568;--mist3:#888898;--white:#0f0f1a;
}
html,body,#root{height:100%;background:var(--ink);color:var(--white);font-family:'Cabinet Grotesk',sans-serif;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--line2);border-radius:3px}
.d{font-family:'Clash Display',sans-serif}
.mono{font-family:'JetBrains Mono','Fira Code',monospace;font-size:0.9em}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
.fu{animation:fadeUp 0.35s cubic-bezier(.16,1,.3,1) both}
.fi{animation:fadeIn 0.2s ease both}
.fu1{animation-delay:.04s}.fu2{animation-delay:.08s}.fu3{animation-delay:.12s}
.fu4{animation-delay:.16s}.fu5{animation-delay:.20s}.fu6{animation-delay:.24s}
.grain::after{content:'';position:fixed;inset:0;pointer-events:none;opacity:0.018;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size:256px;z-index:9999}
button{cursor:pointer;border:none;outline:none;font-family:inherit}
input,select,textarea{font-family:inherit;outline:none}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes drawerIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
.mob-hide{display:block}.mob-show{display:none!important}
@media(max-width:768px){
  .mob-hide{display:none!important}
  .mob-show{display:flex!important}
  .mob-pad{padding:16px!important}
}
`

export default G
