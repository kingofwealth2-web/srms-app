// ── DESIGN TOKENS ──────────────────────────────────────────────
export const ROLE_META = {
  superadmin:  {label:'Super Admin',    color:'var(--gold)',    bg:'rgba(232,184,75,0.12)'},
  admin:       {label:'Administrator',  color:'var(--sky)',     bg:'rgba(91,168,245,0.12)'},
  classteacher:{label:'Class Teacher',  color:'var(--emerald)', bg:'rgba(45,212,160,0.12)'},
  teacher:     {label:'Subject Teacher',color:'var(--amber)',   bg:'rgba(251,159,58,0.12)'},
  parent:      {label:'Parent',          color:'var(--sky)',     bg:'rgba(91,168,245,0.12)'},
}

export const STATUS_META = {
  Present:{color:'var(--emerald)',bg:'rgba(45,212,160,0.12)'},
  Absent: {color:'var(--rose)',   bg:'rgba(240,107,122,0.12)'},
  Late:   {color:'var(--amber)',  bg:'rgba(251,159,58,0.12)'},
  Excused:{color:'var(--sky)',    bg:'rgba(91,168,245,0.12)'},
}

export const BEHAVIOUR_META = {
  Discipline:    {color:'var(--rose)',   icon:'⚡'},
  Achievement:   {color:'var(--emerald)',icon:'🏆'},
  'Club Activity':{color:'var(--sky)',   icon:'🎯'},
  Notes:         {color:'var(--mist2)', icon:'📎'},
}

export const LETTER_COLOR = {
  'A+':'var(--emerald)','A':'var(--emerald)',
  'B':'var(--sky)',
  'C':'var(--amber)','D':'var(--amber)',
  'F':'var(--rose)',
}

// Number grade colors (BECE-style 1–9)
export const NUMBER_GRADE_COLOR = {
  '1':'var(--emerald)', '2':'var(--emerald)',
  '3':'var(--sky)',
  '4':'var(--sky)',
  '5':'var(--amber)',
  '6':'var(--amber)',
  '7':'var(--rose)', '8':'var(--rose)', '9':'var(--rose)',
}

export const FEE_STATUS = {
  Paid:       {color:'var(--emerald)',bg:'rgba(45,212,160,0.12)'},
  Partial:    {color:'var(--amber)',  bg:'rgba(251,159,58,0.12)'},
  Outstanding:{color:'var(--rose)',   bg:'rgba(240,107,122,0.12)'},
}

export const CURRENCIES = [
  {code:'GHS',symbol:'₵', name:'Ghanaian Cedi',    position:'before', decimals:2},
  {code:'USD',symbol:'$', name:'US Dollar',         position:'before', decimals:2},
  {code:'GBP',symbol:'£', name:'British Pound',     position:'before', decimals:2},
  {code:'EUR',symbol:'€', name:'Euro',              position:'before', decimals:2},
  {code:'NGN',symbol:'₦', name:'Nigerian Naira',    position:'before', decimals:2},
  {code:'KES',symbol:'KSh',name:'Kenyan Shilling',  position:'before', decimals:2},
  {code:'ZAR',symbol:'R', name:'South African Rand',position:'before', decimals:2},
  {code:'TZS',symbol:'TSh',name:'Tanzanian Shilling',position:'before',decimals:0},
  {code:'UGX',symbol:'USh',name:'Ugandan Shilling', position:'before', decimals:0},
  {code:'XOF',symbol:'Fr', name:'West African CFA', position:'after',  decimals:0},
  {code:'ETB',symbol:'Br', name:'Ethiopian Birr',   position:'before', decimals:2},
  {code:'CAD',symbol:'CA$',name:'Canadian Dollar',  position:'before', decimals:2},
  {code:'AUD',symbol:'A$', name:'Australian Dollar',position:'before', decimals:2},
  {code:'INR',symbol:'₹', name:'Indian Rupee',      position:'before', decimals:2},
  {code:'JPY',symbol:'¥', name:'Japanese Yen',      position:'before', decimals:0},
  {code:'CNY',symbol:'¥', name:'Chinese Yuan',      position:'before', decimals:2},
  {code:'AED',symbol:'AED',name:'UAE Dirham',       position:'before', decimals:2},
]

// ── NAV CONFIG ─────────────────────────────────────────────────
export const NAV_ITEMS = {
  superadmin:  ['dashboard','students','classes','grades','attendance','fees','behaviour','reports','announcements','users','settings','auditlog'],
  admin:       ['dashboard','students','classes','grades','attendance','fees','behaviour','reports','announcements','users'],
  classteacher:['dashboard','students','grades','attendance','behaviour','reports','announcements'],
  teacher:     ['dashboard','students','grades','reports','announcements'],
}

export const NAV_META = {
  dashboard:    {icon:'▦',   label:'Dashboard'},
  students:     {icon:'◉',   label:'Students'},
  classes:      {icon:'[=]', label:'Classes'},
  grades:       {icon:'◎',   label:'Grades'},
  attendance:   {icon:'◈',   label:'Attendance'},
  fees:         {icon:'◇',   label:'Fees'},
  behaviour:    {icon:'◐',   label:'Behaviour'},
  reports:      {icon:'⊞',   label:'Reports'},
  announcements:{icon:'◯',   label:'Announcements'},
  users:        {icon:'⊕',   label:'Users'},
  settings:     {icon:'◧',   label:'Settings'},
  auditlog:     {icon:'◫',   label:'Audit Log'},
}

// ── GHANA PUBLIC HOLIDAYS ──────────────────────────────────────
export const GHANA_PUBLIC_HOLIDAYS = [
  {id:'gh01', name:"New Year's Day",    month:1,  day:1},
  {id:'gh02', name:'Constitution Day',  month:1,  day:7},
  {id:'gh03', name:'Independence Day',  month:3,  day:6},
  {id:'gh04', name:"Workers' Day",      month:5,  day:1},
  {id:'gh05', name:'Africa Unity Day',  month:5,  day:25},
  {id:'gh06', name:'Republic Day',      month:7,  day:1},
  {id:'gh07', name:"Founders' Day",     month:8,  day:4},
  {id:'gh08', name:'Kwame Nkrumah Day', month:9,  day:21},
  {id:'gh09', name:"Farmers' Day",      month:12, day:6},
  {id:'gh10', name:'Christmas Day',     month:12, day:25},
  {id:'gh11', name:'Boxing Day',        month:12, day:26},
]

// ── PRICING PLANS ──────────────────────────────────────────────
// Edit amounts here — they update everywhere automatically.
export const PLANS = {
  starter: {
    key:            'starter',
    label:          'Starter',
    monthlyPrice:   150,
    annualPrice:    1500,
    annualMonths:   10,   // how many months annual covers (10 = 2 months free)
    studentLimit:   80,
    userLimit:      2,
    features: {
      yearSwitcher:     false,
      feeReceipts:      false,
      behaviour:        false,
      announcements:    false,
      reportsPDF:       true,
      reportsExcel:     false,
      parentPortal:     false,
      auditLog:         false,
    },
  },
  basic: {
    key:            'basic',
    label:          'Basic',
    monthlyPrice:   350,
    annualPrice:    3150,
    annualMonths:   9,   // 9 months paid = 3 months free
    studentLimit:   500,
    userLimit:      10,
    features: {
      yearSwitcher:     false,
      feeReceipts:      true,
      behaviour:        true,
      announcements:    true,
      reportsPDF:       true,
      reportsExcel:     true,
      parentPortal:     false,
      auditLog:         false,
    },
  },
  pro: {
    key:            'pro',
    label:          'Pro',
    monthlyPrice:   800,
    annualPrice:    7200,
    annualMonths:   9,   // 3 months free
    studentLimit:   null,   // null = unlimited
    userLimit:      null,
    features: {
      yearSwitcher:     true,
      feeReceipts:      true,
      behaviour:        true,
      announcements:    true,
      reportsPDF:       true,
      reportsExcel:     true,
      parentPortal:     true,
      auditLog:         true,
    },
  },
}

// Feedback webhook — paste a Formspree, Make, Zapier, or n8n URL here
// to get an email notification every time a school submits feedback.
// Leave as null to only save to the Supabase feedback table.
export const FEEDBACK_WEBHOOK_URL = null

// Overage grace period in days before new additions are blocked
export const OVERAGE_GRACE_DAYS = 7

// Days of read-only access after trial or plan expiry before full lock
export const EXPIRY_GRACE_DAYS = 7

// Days of read-only access after cancellation before data is archived
export const CANCELLATION_GRACE_DAYS = 30
