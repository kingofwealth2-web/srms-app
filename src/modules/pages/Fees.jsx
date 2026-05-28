import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useIsMobile } from '../lib/hooks'
import { ROLE_META, FEE_STATUS, CURRENCIES } from '../lib/constants'
import PlanGate from '../components/PlanGate'
import { fmtDate, fmtMoney, getCurrency, genRCP, csvEscape, fullName } from '../lib/helpers'
import { auditLog } from '../lib/auditLog'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Btn from '../components/Btn'
import Field from '../components/Field'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import SectionTitle from '../components/SectionTitle'
import Card from '../components/Card'
import ConfirmModal from '../components/ConfirmModal'
import DataTable from '../components/DataTable'
import KPI from '../components/KPI'

// ── RECEIPT PRINTER ────────────────────────────────────────────
function printReceipt({fee, feePayments, student, cls, settings, currency}) {
  const schoolName  = settings?.school_name  || 'School'
  const schoolMotto = settings?.motto         || ''
  const schoolLogo  = settings?.school_logo   || null
  const totalPaid   = feePayments.reduce((a,p)=>a+Number(p.amount||0),0)
  // legacy: any paid amount on fee record not covered by payments table
  const legacyPaid  = Math.max(0, Number(fee.paid||0) - totalPaid)
  const allPaid     = legacyPaid + totalPaid
  const balance     = Number(fee.amount||0) - allPaid
  const isPaidFull  = balance <= 0
  const lastPayment = [...feePayments].sort((a,b)=>b.created_at?.localeCompare(a.created_at))[0]
  const receiptNo   = lastPayment?.receipt_no || fee.receipt_no || '--'
  const fmtD        = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '--'
  const fmtT        = d => d ? new Date(d).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : ''

  const logoTag = schoolLogo
    ? `<img src="${schoolLogo}" style="width:52px;height:52px;object-fit:contain;border-radius:6px;" />`
    : `<div style="width:52px;height:52px;border-radius:10px;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-family:'Arial Black',sans-serif;font-size:22px;font-weight:900;color:#e8b84b;flex-shrink:0;">S</div>`

  const paymentRows = feePayments.length > 0
    ? feePayments.map((p,i) => `
        <tr>
          <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#444;">${fmtD(p.created_at)} ${fmtT(p.created_at)}</td>
          <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#444;font-family:monospace;">${p.receipt_no||'--'}</td>
          <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#444;">${p.recorded_by_name||'--'}</td>
          <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:700;color:#1a7a4a;text-align:right;">${fmtMoney(p.amount,currency)}</td>
        </tr>`).join('')
    : `<tr><td colspan="4" style="padding:10px 0;font-size:12px;color:#aaa;text-align:center;">No payment transactions recorded</td></tr>`

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Receipt ${receiptNo}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#e8e8e8;font-family:'Helvetica Neue',Arial,sans-serif;display:flex;justify-content:center;align-items:flex-start;min-height:100vh;padding:32px 16px}
  .card{width:420px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,0.18)}
  @media print{
    body{background:#fff;padding:0;display:block}
    .card{width:100%;box-shadow:none;border-radius:0}
    .no-print{display:none!important}
  }
</style>
</head>
<body>
<div class="card">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0f0f1a 0%,#1a1a2e 60%,#0f2027 100%);padding:24px 24px 0 24px;position:relative;overflow:hidden;">
    <!-- Decorative circles -->
    <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(232,184,75,0.08);pointer-events:none;"></div>
    <div style="position:absolute;bottom:-20px;left:-20px;width:80px;height:80px;border-radius:50%;background:rgba(232,184,75,0.05);pointer-events:none;"></div>

    <!-- Logo + school info -->
    <div style="display:flex;align-items:flex-start;gap:14px;position:relative;z-index:1;">
      ${logoTag}
      <div style="flex:1;min-width:0;">
        <div style="font-size:15px;font-weight:800;color:#fff;letter-spacing:-0.02em;line-height:1.2;">${schoolName}</div>
        ${schoolMotto ? `<div style="font-size:10px;color:#e8b84b;margin-top:3px;font-style:italic;opacity:0.9;">"${schoolMotto}"</div>` : ''}
        <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:4px;letter-spacing:0.06em;text-transform:uppercase;">Official Payment Receipt</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="background:rgba(232,184,75,0.15);border:1px solid rgba(232,184,75,0.4);border-radius:8px;padding:6px 10px;">
          <div style="font-size:9px;color:rgba(232,184,75,0.7);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:2px;">Receipt No.</div>
          <div style="font-size:13px;font-weight:800;color:#e8b84b;font-family:monospace;letter-spacing:0.05em;">${receiptNo}</div>
        </div>
      </div>
    </div>

    <!-- Gold divider wave -->
    <div style="margin-top:20px;height:3px;background:linear-gradient(90deg,transparent,#e8b84b,#f5d07a,#e8b84b,transparent);border-radius:2px;"></div>

    <!-- Status ribbon -->
    <div style="background:${isPaidFull?'rgba(45,212,160,0.12)':'rgba(251,159,58,0.12)'};padding:10px 0;text-align:center;margin-top:0;">
      <span style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${isPaidFull?'#2dd4a0':'#fb9f3a'};">
        ${isPaidFull ? '✓ Fully Paid' : `Balance Remaining: ${fmtMoney(balance,currency)}`}
      </span>
    </div>
  </div>

  <!-- Body -->
  <div style="padding:20px 24px;">

    <!-- Student info -->
    <div style="background:#f8f8fc;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
      <div style="font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Student Information</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>
          <div style="font-size:10px;color:#999;margin-bottom:2px;">Full Name</div>
          <div style="font-size:13px;font-weight:700;color:#111;">${student?fullName(student):''}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#999;margin-bottom:2px;">Student ID</div>
          <div style="font-size:13px;font-weight:700;color:#111;font-family:monospace;">${student?.student_id||'--'}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#999;margin-bottom:2px;">Class</div>
          <div style="font-size:13px;font-weight:600;color:#111;">${cls?.name||'--'}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#999;margin-bottom:2px;">Academic Year</div>
          <div style="font-size:13px;font-weight:600;color:#111;">${fee.academic_year||'--'}</div>
        </div>
      </div>
    </div>

    <!-- Fee details -->
    <div style="margin-bottom:16px;">
      <div style="font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Fee Details</div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#f8f8fc;border-radius:8px;margin-bottom:6px;">
        <div>
          <div style="font-size:13px;font-weight:700;color:#111;">${fee.fee_type||'Fee'}</div>
          ${fee.period?`<div style="font-size:11px;color:#888;margin-top:2px;">${fee.period}</div>`:''}
        </div>
        <div style="font-size:15px;font-weight:800;color:#111;">${fmtMoney(fee.amount,currency)}</div>
      </div>

      <!-- Balance breakdown -->
      <div style="border:1px solid #eee;border-radius:8px;overflow:hidden;">
        ${[
          ['Total Fee', fmtMoney(fee.amount,currency), '#111', false],
          ['Total Paid', fmtMoney(allPaid,currency), '#1a7a4a', false],
          ['Balance', fmtMoney(Math.max(0,balance),currency), isPaidFull?'#1a7a4a':'#c0392b', true],
        ].map(([l,v,c,bold])=>`
          <div style="display:flex;justify-content:space-between;padding:9px 14px;border-bottom:1px solid #f5f5f5;">
            <span style="font-size:12px;color:#666;">${l}</span>
            <span style="font-size:13px;font-weight:${bold?800:600};color:${c};">${v}</span>
          </div>`).join('')}
      </div>
    </div>

    <!-- Payment history -->
    <div style="margin-bottom:16px;">
      <div style="font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Payment History</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8f8fc;">
            <th style="padding:7px 0;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.08em;text-align:left;">Date</th>
            <th style="padding:7px 0;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.08em;text-align:left;">Receipt</th>
            <th style="padding:7px 0;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.08em;text-align:left;">Recorded By</th>
            <th style="padding:7px 0;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.08em;text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>${paymentRows}</tbody>
      </table>
    </div>

    ${isPaidFull ? `
    <!-- PAID watermark -->
    <div style="text-align:center;margin-bottom:14px;">
      <div style="display:inline-block;border:3px solid #2dd4a0;border-radius:8px;padding:6px 20px;transform:rotate(-2deg);">
        <span style="font-size:22px;font-weight:900;color:#2dd4a0;letter-spacing:0.2em;">PAID</span>
      </div>
    </div>` : ''}

    <!-- Footer -->
    <div style="border-top:1px solid #eee;padding-top:12px;text-align:center;">
      <div style="font-size:10px;color:#bbb;">Generated ${fmtD(new Date())} ${fmtT(new Date())}</div>
      <div style="font-size:10px;color:#ccc;margin-top:3px;letter-spacing:0.06em;">${schoolName} · SRMS</div>
    </div>
  </div>

  <!-- Print button -->
  <div class="no-print" style="padding:0 24px 20px;text-align:center;">
    <button onclick="window.print()" style="width:100%;padding:12px;background:linear-gradient(135deg,#e8b84b,#f5d07a);border:none;border-radius:10px;font-size:14px;font-weight:700;color:#1a1a2e;cursor:pointer;letter-spacing:0.02em;">
      ⎙ Print Receipt
    </button>
  </div>
</div>
</body>
</html>`

  const w = window.open('','_blank','width=500,height=800')
  if(w){ w.document.write(html); w.document.close() }
}

// ── FEES ───────────────────────────────────────────────────────
export default function Fees({profile,data,setData,toast,settings,activeYear,isViewingPast,initialFeeFilter,onFilterConsumed,planHook}) {
  const {fees=[],students=[],classes=[],payments=[],fee_templates=[],fee_periods=[]} = data
  const currency = getCurrency(settings)
  const isMobile = useIsMobile()
  const canBulk = ['superadmin','admin'].includes(profile?.role)

  // ── Tab ──
  const [feeActiveTab, setFeeActiveTab] = useState('fees')

  // ── Single add / pay state ──
  const [search,setSearch]     = useState('')
  const [fstatus,setFstatus]   = useState(initialFeeFilter||'')
  const [fFeeType,setFFeeType] = useState('')
  const [fPeriod,setFPeriod]   = useState('')
  useEffect(()=>{ if(initialFeeFilter){setFstatus(initialFeeFilter);if(onFilterConsumed)onFilterConsumed()} },[])
  const [fClassId,setFClassId] = useState(profile?.role==='classteacher' ? (profile?.class_id||'') : '')
  const [modal,setModal]       = useState(false)
  const [payModal,setPayModal] = useState(false)
  const [editFee,setEditFee]   = useState(null)
  const [form,setForm]         = useState({})
  const [payForm,setPayForm]   = useState({})
  const [saving,setSaving]     = useState(false)
  const f  = k=>v=>setForm(p=>({...p,[k]:v}))
  const pf = k=>v=>setPayForm(p=>({...p,[k]:v}))

  // ── Bulk add state ──
  const [bulkModal,setBulkModal]   = useState(false)
  const [bulkStep,setBulkStep]     = useState(1)
  const [bulkSaving,setBulkSaving] = useState(false)
  const feePeriods = settings?.period_type==='term'
    ? Array.from({length:settings?.period_count||2},(_,i)=>`Term ${i+1}`)
    : Array.from({length:settings?.period_count||2},(_,i)=>`Semester ${i+1}`)
  const BULK_INIT = {fee_type:'',period:feePeriods[0]||'Semester 1',default_amount:'',due_date:'',selected_classes:[]}
  const [bulk,setBulk]             = useState(BULK_INIT)
  // Per-class amounts: { classId: amount string }
  const [classAmounts,setClassAmounts] = useState({})
  const bf = k=>v=>setBulk(p=>({...p,[k]:v}))

  // ── Recurring state ──
  const [selectedTemplate, setSelectedTemplate]     = useState(null) // fee_template row
  const [selectedPeriod, setSelectedPeriod]         = useState(null) // fee_period row for register
  const [regClassFilter, setRegClassFilter]         = useState('')
  const [regStatusFilter, setRegStatusFilter]       = useState('')
  const [tmplModal, setTmplModal]                   = useState(false) // new template modal
  const [tmplForm, setTmplForm]                     = useState({name:'',amount_per_period:'',class_ids:[]})
  const [tmplSaving, setTmplSaving]                 = useState(false)
  const [confirmTmplDelete, setConfirmTmplDelete]   = useState(null)
  const [editPeriodModal, setEditPeriodModal]       = useState(null) // period row being edited
  const [editPeriodForm, setEditPeriodForm]         = useState({label:'',period_date:''})
  const [editPeriodSaving, setEditPeriodSaving]     = useState(false)
  const tf = k=>v=>setTmplForm(p=>({...p,[k]:v}))

  // ── Bulk Record Payment state ──
  const BRP_INIT = {template_id:'',label:'',period_date:new Date().toISOString().split('T')[0],class_ids:[],mode:'same',same_amount:''}
  const [brpModal, setBrpModal]       = useState(false)
  const [brpStep, setBrpStep]         = useState(1)
  const [brp, setBrp]                 = useState(BRP_INIT)
  const [brpRows, setBrpRows]         = useState([]) // {student, state:'paid'|'owes'|'excluded', amount, existingBalance, isNew}
  const [brpSaving, setBrpSaving]     = useState(false)
  const [brpDone, setBrpDone]         = useState(null) // {count, feeRows, payRows, periodRow} after confirm
  const brf = k=>v=>setBrp(p=>({...p,[k]:v}))

  // ── Bulk Collect Payment state (one-time fees) ──
  const BCP_INIT = {fee_type:'',class_ids:[],period:'',same_amount:'',mode:'balance'}
  const [bcpModal, setBcpModal]   = useState(false)
  const [bcpStep, setBcpStep]     = useState(1)
  const [bcpRows, setBcpRows]     = useState([])
  const [bcpSaving, setBcpSaving] = useState(false)
  const [bcpDone, setBcpDone]     = useState(null)
  const [bcp, setBcp]             = useState(BCP_INIT)
  const bcf = k=>v=>setBcp(p=>({...p,[k]:v}))

  // ── Derived: eligible classes (have at least 1 active non-withdrawn student) ──
  const activeStudents = students.filter(s=>!s.archived)
  const classesWithStudents = classes.filter(c=>activeStudents.some(s=>s.class_id===c.id))
  const hiddenClassCount = classes.length - classesWithStudents.length
  const myClasses = profile?.role==='classteacher' ? classes.filter(c=>c.id===profile.class_id) : classesWithStudents
  const studentsInClass = fClassId ? activeStudents.filter(s=>s.class_id===fClassId) : activeStudents

  // ── Toggle class pill ──
  const toggleClass = cid => {
    setBulk(p=>{
      const sel = p.selected_classes.includes(cid)
        ? p.selected_classes.filter(x=>x!==cid)
        : [...p.selected_classes, cid]
      return {...p, selected_classes: sel}
    })
  }

  const [bulkStudentRows, setBulkStudentRows] = useState([]) // {student, checked, class_id}

  // ── Go to student step: build student list from selected classes ──
  const goToStudentStep = () => {
    if(!bulk.fee_type||!bulk.period||!bulk.default_amount||bulk.selected_classes.length===0) return
    const rows = []
    bulk.selected_classes.forEach(cid=>{
      activeStudents.filter(s=>s.class_id===cid).forEach(s=>{
        rows.push({student:s, checked:true, class_id:cid})
      })
    })
    setBulkStudentRows(rows)
    setBulkStep(2)
  }

  // ── Go to amount step: seed classAmounts using only checked students ──
  const goToAmountStep = () => {
    if(bulkStudentRows.filter(r=>r.checked).length===0){
      toast('Select at least one student','error'); return
    }
    const init = {}
    bulk.selected_classes.forEach(cid=>{ init[cid] = bulk.default_amount })
    setClassAmounts(init)
    setBulkStep(3)
  }

  const checkedStudents = bulkStudentRows.filter(r=>r.checked).map(r=>r.student)

  // ── Step 3 totals (uses checked students only) ──
  const step2Rows = bulk.selected_classes.map(cid=>{
    const cls = classes.find(c=>c.id===cid)
    const count = checkedStudents.filter(s=>s.class_id===cid).length
    return {cid, cls, count, amount: classAmounts[cid]||''}
  }).filter(r=>r.count>0)
  const step2TotalStudents = step2Rows.reduce((a,r)=>a+r.count,0)
  const step2TotalAmount   = step2Rows.reduce((a,r)=>a+(parseFloat(r.amount)||0)*r.count,0)

  // ── Step 4: compute duplicates (checked students only) ──
  const computeBulkPreview = () => {
    let toCreate = 0, toSkip = 0
    checkedStudents.forEach(s=>{
      const already = fees.some(f=>
        f.student_id===s.id &&
        f.fee_type===bulk.fee_type &&
        f.period===bulk.period &&
        f.academic_year===activeYear
      )
      if(already) toSkip++; else toCreate++
    })
    return {toCreate, toSkip}
  }

  // ── Confirm bulk add (checked students only) ──
  const confirmBulk = async () => {
    setBulkSaving(true)
    try {
      const rows = []
      checkedStudents.forEach(s=>{
        const amount = parseFloat(classAmounts[s.class_id])||0
        const already = fees.some(f=>
          f.student_id===s.id &&
          f.fee_type===bulk.fee_type &&
          f.period===bulk.period &&
          f.academic_year===activeYear
        )
        if(!already) rows.push({
          school_id:  profile?.school_id,
          student_id: s.id,
          fee_type:   bulk.fee_type,
          amount,
          paid:       0,
          period:     bulk.period,
          academic_year: activeYear,
          ...(bulk.due_date ? {due_date: bulk.due_date} : {}),
        })
      })
      if(rows.length===0){
        toast('All selected students already have this fee — nothing to add.','error')
        setBulkSaving(false)
        return
      }
      const {data:inserted,error} = await supabase.from('fees').insert(rows).select()
      if(error) throw error
      setData(p=>({...p, fees:[...p.fees,...(inserted||[])]}))
      const {toSkip} = computeBulkPreview()
      const skippedNote = toSkip>0 ? ` (${toSkip} skipped — already existed)` : ''
      auditLog(profile,'Fees','Bulk Created',`${rows.length} fee record${rows.length!==1?'s':''} · ${bulk.fee_type}${skippedNote}`,{fee_type:bulk.fee_type,count:rows.length},null,null)
      toast(`${rows.length} fee record${rows.length!==1?'s':''} added${skippedNote}`)
      setBulkModal(false)
      setBulkStep(1)
      setBulk(BULK_INIT)
      setClassAmounts({})
    } catch(err) {
      toast(err.message,'error')
    }
    setBulkSaving(false)
  }

  const closeBulk = () => { setBulkModal(false); setBulkStep(1); setBulk(BULK_INIT); setClassAmounts({}); setBulkStudentRows([]) }

  // ── Existing fee helpers ──
  const today = new Date().toISOString().split('T')[0]
  const enriched = fees.filter(fee=>!students.find(s=>s.id===fee.student_id)?.archived).map(fee=>{
    const s=students.find(x=>x.id===fee.student_id)
    const feePayments = payments.filter(p=>p.fee_id===fee.id)
    const paymentsPaid = feePayments.reduce((a,p)=>a+Number(p.amount||0),0)
    // Use whichever is higher — payments table total or legacy fee.paid
    const effectivePaid = Math.max(Number(fee.paid||0), paymentsPaid)
    const bal=Number(fee.amount||0)-effectivePaid
    const status=bal<=0?'Paid':effectivePaid>0?'Partial':'Outstanding'
    const isOverdue = !!(fee.due_date && fee.due_date < today && bal > 0)
    const latestPayment = feePayments.sort((a,b)=>b.created_at?.localeCompare(a.created_at))[0]
    const latestReceipt = latestPayment?.receipt_no || fee.receipt_no || null
    return{...fee,student_name:s?fullName(s,true):'--',balance:bal,effectivePaid,status,isOverdue,hasPayments:feePayments.length>0||effectivePaid>0,receipt_no:latestReceipt}
  })
  const filtered = enriched.filter(r=>{
    if(fClassId){
      const s = activeStudents.find(x=>x.id===r.student_id)
      if(!s || s.class_id!==fClassId) return false
    }
    if(fFeeType && r.fee_type!==fFeeType) return false
    if(fPeriod && r.period!==fPeriod) return false
    if(!r.student_name.toLowerCase().includes(search.toLowerCase())) return false
    if(fstatus==='Overdue' && !r.isOverdue) return false
    else if(fstatus && fstatus!=='Overdue' && r.status!==fstatus) return false
    return true
  })
  const overdueCount = enriched.filter(r=>r.isOverdue).length
  const totalOwed = enriched.reduce((s,r)=>s+Number(r.amount||0),0)
  const totalPaid = enriched.reduce((s,r)=>s+r.effectivePaid,0)
  const openAdd = ()=>{ window.scrollTo({top:0,behavior:'smooth'}); setForm({student_id:'',fee_type:'',amount:'',due_date:'',period:''}); setModal(true) }
  const [editFeeModal,setEditFeeModal] = useState(false)
  const [editFeeRow,setEditFeeRow]     = useState(null)
  const [editFeeForm,setEditFeeForm]   = useState({})
  const eff = k=>v=>setEditFeeForm(p=>({...p,[k]:v}))
  const openEditFee = r=>{setEditFeeRow(r);setEditFeeForm({fee_type:r.fee_type,amount:r.amount,due_date:r.due_date||'',period:r.period||''});setEditFeeModal(true)}
  const saveEditFee = async ()=>{
    if(!editFeeForm.fee_type||!editFeeForm.amount){toast('Fee type and amount are required','error');return}
    if(parseFloat(editFeeForm.amount)<=0){toast('Amount must be greater than zero','error');return}
    setSaving(true)
    const {error}=await supabase.from('fees').update({
      fee_type: editFeeForm.fee_type,
      amount:   parseFloat(editFeeForm.amount),
      due_date: editFeeForm.due_date||null,
      period:   editFeeForm.period||null,
    }).eq('id',editFeeRow.id).eq('school_id',profile?.school_id)
    if(error){toast(error.message,'error');setSaving(false);return}
    setData(p=>({...p,fees:p.fees.map(f=>f.id===editFeeRow.id?{...f,...editFeeForm,amount:parseFloat(editFeeForm.amount)}:f)}))
    auditLog(profile,'Fees','Edited',`${editFeeRow.student_name} · ${editFeeForm.fee_type} · ${fmtMoney(parseFloat(editFeeForm.amount),currency)}`,{},{...editFeeRow},{...editFeeForm})
    toast('Fee updated')
    setSaving(false)
    setEditFeeModal(false)
  }
  const openPay = fee=>{setEditFee(fee);setPayForm({amount:fee.balance>0?fee.balance:''});setPayModal(true)}

  const saveFee = async ()=>{
    if(!form.student_id||!form.amount){toast('Please select a student and enter an amount.','error');return}
    setSaving(true)
    const {data:row,error}=await supabase.from('fees').insert({school_id:profile?.school_id,student_id:form.student_id,fee_type:form.fee_type,amount:parseFloat(form.amount),paid:0,due_date:form.due_date||null,period:form.period||null,academic_year:activeYear}).select().single()
    if(error)toast(error.message,'error')
    else{setData(p=>({...p,fees:[...p.fees,row]}));const s=students.find(x=>x.id===form.student_id);auditLog(profile,'Fees','Created',`${fullName(s)} · ${form.fee_type} · ${fmtMoney(parseFloat(form.amount),currency)}`,{},null,row);toast('Fee record added');setModal(false)}
    setSaving(false)
  }

  const delFee = async id=>{
    setConfirmState({title:'Remove fee record?',body:'This will also delete all payment history for this fee.',icon:'🗑',danger:true,onConfirm:async()=>{
    const {error}=await supabase.from('fees').delete().eq('id',id).eq('school_id',profile?.school_id)
    if(error)toast(error.message,'error')
    else{const fee=fees.find(x=>x.id===id);const s=students.find(x=>x.id===fee?.student_id);setData(p=>({...p,fees:p.fees.filter(f=>f.id!==id),payments:p.payments.filter(p=>p.fee_id!==id)}));auditLog(profile,'Fees','Deleted',`${fullName(s)} · ${fee?.fee_type}`,{},fee,null);toast('Fee record removed')}
    }})
  }

  const recordPayment = async () => {
    if(!editFee || saving) return
    setSaving(true)
    const feePayments = payments.filter(p=>p.fee_id===editFee.id)
    const alreadyPaid = feePayments.reduce((a,p)=>a+Number(p.amount||0),0)
    const legacyPaid  = Math.max(0, Number(editFee.paid||0) - alreadyPaid)
    const currentPaid = alreadyPaid + legacyPaid
    const currentBalance = Number(editFee.amount||0) - currentPaid
    const amt = parseFloat(payForm.amount)||0
    if(amt<=0){ toast('Amount must be greater than zero','error'); setSaving(false); return }
    if(amt>currentBalance){ toast(`Amount exceeds balance of ${fmtMoney(currentBalance,currency)}`,'error'); setSaving(false); return }
    const newCumPaid = currentPaid + amt
    // Generate receipt number atomically in the DB to avoid race conditions
    const {data:rcptData, error:rcptErr} = await supabase.rpc('generate_receipt_no', { p_school_id: profile?.school_id })
    if(rcptErr){ toast(rcptErr.message,'error'); setSaving(false); return }
    const rcpt = rcptData
    // Insert payment record
    const {data:payRow, error:payErr} = await supabase.from('payments').insert({
      school_id:       profile?.school_id,
      academic_year:   activeYear,
      fee_id:          editFee.id,
      student_id:      editFee.student_id,
      amount:          amt,
      receipt_no:      rcpt,
      recorded_by_id:  profile?.id,
      recorded_by_name:profile?.full_name,
    }).select().single()
    if(payErr){ toast(payErr.message,'error'); setSaving(false); return }
    // Update cumulative paid on fee record
    const {error:feeErr} = await supabase.from('fees').update({paid:newCumPaid}).eq('id',editFee.id).eq('school_id',profile?.school_id)
    if(feeErr){ toast(feeErr.message,'error'); setSaving(false); return }
    const updatedFee = {...editFee, paid:newCumPaid}
    setData(p=>({
      ...p,
      fees:     p.fees.map(f=>f.id===editFee.id ? updatedFee : f),
      payments: [payRow, ...p.payments],
    }))
    const pStudent=students.find(s=>s.id===editFee.student_id);auditLog(profile,'Fees','Payment',`${fullName(pStudent)} · ${fmtMoney(amt,currency)} · ${editFee.fee_type}`,{amount:amt,receipt:rcpt},null,null)
    toast('Payment recorded')
    setSaving(false)
    setPayModal(false)
    // Auto-open receipt (plan-gated)
    if (planHook.can('feeReceipts')) {
      const student = students.find(s=>s.id===editFee.student_id)
      const cls     = classes.find(c=>c.id===student?.class_id)
      printReceipt({
        fee:         updatedFee,
        feePayments: [payRow, ...feePayments],
        student, cls, settings, currency,
      })
    }
  }

  const openReceipt = (fee) => {
    const feePayments = payments.filter(p=>p.fee_id===fee.id)
    const student = students.find(s=>s.id===fee.student_id)
    const cls     = classes.find(c=>c.id===student?.class_id)
    printReceipt({fee, feePayments, student, cls, settings, currency})
  }

  // ── Step 3 preview values ──
  const {toCreate, toSkip} = bulkStep===4 ? computeBulkPreview() : {toCreate:0,toSkip:0}
  const step3TotalAmount = step2Rows.reduce((a,r)=>a+(parseFloat(r.amount)||0)*r.count, 0)

  const step1Valid = bulk.fee_type && bulk.period && bulk.default_amount && bulk.selected_classes.length>0
  const step2Valid = step2Rows.every(r=>r.amount!==''&&parseFloat(r.amount)>0)

  const exportFeesCsv = () => {
    try {
      if(feeActiveTab!=='fees'){
        toast('Switch to the Fees tab to export fee records.','error'); return
      }
      if(filtered.length===0){ toast('No fee records to export','error'); return }
      const esc = v => {
        if(v===null||v===undefined) return ''
        return String(v).replace(/"/g,'""')
      }
      const currency = getCurrency(settings)
      let csv = 'Student ID,Student,Class,Fee Type,Period,Amount,Paid,Balance,Status,Due Date,Receipt\n'
      filtered.forEach(r=>{
        const s   = students.find(x=>x.id===r.student_id)
        const cls = s ? classes.find(c=>c.id===s.class_id)?.name || '' : ''
        const sName = s ? fullName(s,true) : ''
        csv += `"${esc(s?.student_id)}","${esc(sName)}","${esc(cls)}","${esc(r.fee_type)}","${esc(r.period)}","${esc(fmtMoney(r.amount,currency))}","${esc(fmtMoney(r.effectivePaid,currency))}","${esc(fmtMoney(r.balance,currency))}","${esc(r.status)}","${esc(r.due_date)}","${esc(r.receipt_no)}"\n`
      })
      const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `SRMS_Fees_${activeYear}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch(e){
      toast('Export failed. Please try again.','error')
    }
  }

  // ── Payment History derived data ──
  const phClassId   = feeActiveTab==='history' ? fClassId : fClassId
  const [phSearch,  setPhSearch]   = useState('')
  const [phClass,   setPhClass]    = useState('')
  const [phStudent, setPhStudent]  = useState('')
  const [phFeeType, setPhFeeType]  = useState('')
  const [phDateFrom,setPhDateFrom] = useState('')
  const [phDateTo,  setPhDateTo]   = useState('')
  const [phDetail,  setPhDetail]   = useState(null)  // payment row for detail modal
  const [confirmState,setConfirmState] = useState(null)

  // Enrich payments with student/fee/class info
  const enrichedPayments = payments.map(p => {
    const fee     = fees.find(f=>f.id===p.fee_id)
    const student = students.find(s=>s.id===fee?.student_id)
    const cls     = classes.find(c=>c.id===student?.class_id)
    return {
      ...p,
      fee_type:     fee?.fee_type||'--',
      period:       fee?.period||'',
      fee_amount:   fee?.amount||0,
      student_name: student ? fullName(student,true) : '--',
      student_id_no:student?.student_id||'',
      student_photo:student?.photo||null,
      class_name:   cls?.name||'--',
      class_id:     student?.class_id||null,
      fee_obj:      fee,
      student_obj:  student,
      cls_obj:      cls,
      academic_year:fee?.academic_year||'',
    }
  })

  // Filter payments — default to current academic year
  const phFiltered = enrichedPayments.filter(p => {
    if(p.academic_year !== activeYear) return false
    if(phClass   && p.class_id!==phClass) return false
    if(phStudent && p.fee_obj?.student_id!==phStudent) return false
    if(phFeeType && p.fee_type!==phFeeType) return false
    if(phDateFrom && p.created_at && p.created_at<phDateFrom) return false
    if(phDateTo   && p.created_at && p.created_at.slice(0,10)>phDateTo) return false
    if(phSearch) {
      const q=phSearch.toLowerCase()
      if(!(p.student_name.toLowerCase().includes(q)||
           (p.receipt_no||'').toLowerCase().includes(q)||
           (p.recorded_by_name||'').toLowerCase().includes(q)||
           p.fee_type.toLowerCase().includes(q))) return false
    }
    return true
  })

  const phTotalCollected = phFiltered.reduce((a,p)=>a+Number(p.amount||0),0)
  const phReceiptsIssued = phFiltered.filter(p=>p.receipt_no).length
  const phFeeTypes = [...new Set(enrichedPayments.map(p=>p.fee_type).filter(Boolean))]
  const phStudentsInClass = phClass
    ? students.filter(s=>!s.archived&&s.class_id===phClass)
    : students.filter(s=>!s.archived)

  // ── Recurring helpers ──
  const saveTmpl = async () => {
    if(!tmplForm.name.trim()||!tmplForm.amount_per_period){toast('Name and amount are required','error');return}
    if(parseFloat(tmplForm.amount_per_period)<=0){toast('Amount must be greater than zero','error');return}
    if(tmplForm.class_ids.length===0){toast('Select at least one class','error');return}
    setTmplSaving(true)
    const {data:row,error}=await supabase.from('fee_templates').insert({
      school_id:profile?.school_id,
      name:tmplForm.name.trim(),
      amount_per_period:parseFloat(tmplForm.amount_per_period),
      class_ids:tmplForm.class_ids,
      academic_year:activeYear,
      created_by:profile?.id,
    }).select().single()
    if(error){toast(error.message,'error');setTmplSaving(false);return}
    setData(p=>({...p,fee_templates:[...p.fee_templates,row]}))
    auditLog(profile,'Fees','Recurring Fee Created',`${row.name} · ${fmtMoney(row.amount_per_period,currency)}/period`,{},null,row)
    toast('Recurring fee created')
    setTmplSaving(false)
    setTmplModal(false)
    setTmplForm({name:'',amount_per_period:'',class_ids:[]})
    setSelectedTemplate(row)
  }

  const deleteTmpl = async (tmpl) => {
    const hasPeriods = fee_periods.some(p=>p.template_id===tmpl.id)
    if(hasPeriods){toast('Cannot delete — this fee has existing periods. Remove all periods first.','error');return}
    setConfirmTmplDelete({
      title:'Delete recurring fee?',
      body:`"${tmpl.name}" will be permanently deleted. No periods exist yet so no data will be lost.`,
      icon:'🗑',danger:true,
      onConfirm:async()=>{
        const {error}=await supabase.from('fee_templates').delete().eq('id',tmpl.id).eq('school_id',profile?.school_id)
        if(error){toast(error.message,'error');return}
        setData(p=>({...p,fee_templates:p.fee_templates.filter(t=>t.id!==tmpl.id)}))
        if(selectedTemplate?.id===tmpl.id) setSelectedTemplate(null)
        auditLog(profile,'Fees','Recurring Fee Deleted',tmpl.name,{},tmpl,null)
        toast('Recurring fee deleted')
      }
    })
  }

  // Build BRP student rows when template + class changes
  const buildBrpRows = (templateId, classIds) => {
    const tmpl = fee_templates.find(t=>t.id===templateId)
    if(!tmpl) return []
    // Start with students in the template's assigned classes
    const tmplClassIds = tmpl.class_ids||[]
    let pool = activeStudents.filter(s=>tmplClassIds.includes(s.class_id))
    // Further filter by selected classes if bursar picks a sub-filter
    if(classIds && classIds.length>0) pool = pool.filter(s=>classIds.includes(s.class_id))
    return pool.map(s=>{
      const studentFees = fees.filter(f=>f.student_id===s.id && f.template_id===templateId)
      const totalCharged = studentFees.reduce((a,f)=>a+Number(f.amount||0),0)
      const totalPaidAmt = studentFees.reduce((a,f)=>{
        const feePayments = payments.filter(p=>p.fee_id===f.id)
        const paymentsPaid = feePayments.reduce((s,p)=>s+Number(p.amount||0),0)
        return a + Math.max(Number(f.paid||0), paymentsPaid)
      },0)
      const existingBalance = Math.max(0, totalCharged - totalPaidAmt)
      // Flag students enrolled after template was created
      const isNew = tmpl.created_at && s.created_at && new Date(s.created_at) > new Date(tmpl.created_at)
      return {student:s, state:'paid', amount:String(tmpl.amount_per_period), existingBalance, isNew}
    })
  }

  const openBrpModal = (tmpl) => {
    setBrp({...BRP_INIT, template_id:tmpl.id, same_amount:String(tmpl.amount_per_period)})
    setBrpRows(buildBrpRows(tmpl.id,[]))
    setBrpStep(1)
    setBrpDone(null)
    setBrpModal(true)
  }

  const closeBrp = () => {setBrpModal(false);setBrpStep(1);setBrp(BRP_INIT);setBrpRows([]);setBrpDone(null);setBrpDupWarning(false)}

  const [brpDupWarning, setBrpDupWarning] = useState(false)

  const brpGoStep2 = () => {
    if(!brp.label.trim()||!brp.period_date){toast('Period label and date are required','error');return}
    const tmpl = fee_templates.find(t=>t.id===brp.template_id)
    if(!tmpl) return
    // Check for duplicate period on same date
    const dup = fee_periods.some(p=>p.template_id===brp.template_id && p.period_date===brp.period_date)
    setBrpDupWarning(dup)
    // Rebuild rows
    const rows = buildBrpRows(brp.template_id, brp.class_ids||[])
    const finalRows = brp.mode==='same'
      ? rows.map(r=>({...r, amount:brp.same_amount||String(tmpl.amount_per_period)}))
      : rows
    setBrpRows(finalRows)
    setBrpStep(2)
  }

  const confirmBrp = async () => {
    const tmpl = fee_templates.find(t=>t.id===brp.template_id)
    if(!tmpl){toast('Template not found','error');return}
    const paidRows  = brpRows.filter(r=>r.state==='paid' && parseFloat(r.amount)>0)
    const owesRows  = brpRows.filter(r=>r.state==='owes' && parseFloat(r.amount)>0)
    const chargedRows = [...paidRows, ...owesRows]
    if(chargedRows.length===0){toast('No students selected','error');return}
    setBrpSaving(true)
    try {
      // 1 — create the fee_period row
      const {data:periodRow,error:pErr}=await supabase.from('fee_periods').insert({
        school_id:    profile?.school_id,
        template_id:  tmpl.id,
        label:        brp.label.trim(),
        period_date:  brp.period_date,
        academic_year:activeYear,
        created_by:   profile?.id,
      }).select().single()
      if(pErr) throw pErr

      // 2 — create one fee row per charged student at FULL template amount
      const feeRows = chargedRows.map(r=>({
        school_id:    profile?.school_id,
        student_id:   r.student.id,
        fee_type:     tmpl.name,
        amount:       tmpl.amount_per_period, // always full amount
        paid:         0,
        period:       brp.label.trim(),
        academic_year:activeYear,
        template_id:  tmpl.id,
        fee_period_id:periodRow.id,
      }))
      const {data:insertedFees,error:fErr}=await supabase.from('fees').insert(feeRows).select()
      if(fErr) throw fErr

      // 3 — record payments only for 'paid' students
      const payRows = []
      let currentPayments = [...payments]
      for(const r of paidRows){
        const feeRow = insertedFees.find(f=>f.student_id===r.student.id)
        if(!feeRow) continue
        const amt = parseFloat(r.amount)
        const rcpt = genRCP(currentPayments)
        const {data:payRow,error:payErr}=await supabase.from('payments').insert({
          school_id:        profile?.school_id,
          academic_year:    activeYear,
          fee_id:           feeRow.id,
          student_id:       r.student.id,
          amount:           amt,
          receipt_no:       rcpt,
          recorded_by_id:   profile?.id,
          recorded_by_name: profile?.full_name,
          fee_period_id:    periodRow.id,
        }).select().single()
        if(payErr) throw payErr
        await supabase.from('fees').update({paid:amt}).eq('id',feeRow.id).eq('school_id',profile?.school_id)
        currentPayments = [payRow, ...currentPayments]
        payRows.push(payRow)
      }

      // 4 — update local state
      setData(p=>({
        ...p,
        fee_periods:[...p.fee_periods, periodRow],
        fees:[...p.fees, ...(insertedFees||[]).map(f=>{
          const paidRow = paidRows.find(r=>r.student.id===f.student_id)
          return {...f, amount: tmpl.amount_per_period, paid: paidRow ? parseFloat(paidRow.amount) : 0}
        })],
        payments:[...payRows.reverse(), ...p.payments],
      }))

      auditLog(profile,'Fees','Bulk Payment Recorded',
        `${tmpl.name} · ${brp.label} · ${paidRows.length} paid · ${owesRows.length} outstanding · ${brpRows.filter(r=>r.state==='excluded').length} excluded`,
        {},{},{}
      )
      toast(`${paidRows.length} paid · ${owesRows.length} outstanding · ${brpRows.filter(r=>r.state==='excluded').length} excluded`)
      setBrpDone({count:paidRows.length, owesCount:owesRows.length, feeRows:insertedFees, payRows, periodRow, selected:paidRows, tmpl})
      setBrpStep(3)
    } catch(err){
      toast(err.message,'error')
    }
    setBrpSaving(false)
  }

  // Print combined receipt for bulk batch
  const deletePeriod = (period) => {
    const periodFees    = fees.filter(f=>f.fee_period_id===period.id)
    const periodPayments = payments.filter(p=>p.fee_period_id===period.id)
    setConfirmTmplDelete({
      title:'Delete this period?',
      body:`"${period.label}" will be permanently deleted along with ${periodFees.length} fee record${periodFees.length!==1?'s':''} and ${periodPayments.length} payment${periodPayments.length!==1?'s':''}.`,
      icon:'🗑', danger:true,
      onConfirm: async () => {
        try {
          // Delete payments first (FK constraint)
          if(periodPayments.length>0){
            const {error:payErr}=await supabase.from('payments').delete().eq('fee_period_id',period.id).eq('school_id',profile?.school_id)
            if(payErr) throw payErr
          }
          // Delete fee rows
          if(periodFees.length>0){
            const {error:feeErr}=await supabase.from('fees').delete().eq('fee_period_id',period.id).eq('school_id',profile?.school_id)
            if(feeErr) throw feeErr
          }
          // Delete period
          const {error:pErr}=await supabase.from('fee_periods').delete().eq('id',period.id).eq('school_id',profile?.school_id)
          if(pErr) throw pErr
          // Update local state
          setData(p=>({
            ...p,
            fee_periods: p.fee_periods.filter(x=>x.id!==period.id),
            fees:        p.fees.filter(f=>f.fee_period_id!==period.id),
            payments:    p.payments.filter(x=>x.fee_period_id!==period.id),
          }))
          auditLog(profile,'Fees','Period Deleted',`${period.label}`,{},period,null)
          toast('Period deleted')
        } catch(err){
          toast(err.message,'error')
        }
      }
    })
  }

  const printBulkCombined = (done) => {
    const schoolName = settings?.school_name||'School'
    const schoolLogo = settings?.school_logo||null
    const logoTag = schoolLogo
      ? `<img src="${schoolLogo}" style="width:44px;height:44px;object-fit:contain;border-radius:6px;"/>`
      : `<div style="width:44px;height:44px;border-radius:8px;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#e8b84b;">S</div>`
    const fmtD = d=>d?new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'--'
    const rows = done.selected.map(r=>{
      const pay = done.payRows.find(p=>p.student_id===r.student.id)
      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#111;">${fullName(r.student,true)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#555;">${classes.find(c=>c.id===r.student.class_id)?.name||'--'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:12px;font-weight:700;color:#1a7a4a;text-align:right;">${fmtMoney(parseFloat(r.amount),currency)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:11px;font-family:monospace;color:#888;">${pay?.receipt_no||'--'}</td>
      </tr>`
    }).join('')
    const total = done.selected.reduce((a,r)=>a+parseFloat(r.amount||0),0)
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Bulk Receipt — ${done.tmpl.name}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#e8e8e8;font-family:'Helvetica Neue',Arial,sans-serif;display:flex;justify-content:center;padding:32px 16px}
    .card{width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,0.18)}
    @media print{body{background:#fff;padding:0;display:block}.card{width:100%;box-shadow:none;border-radius:0}.no-print{display:none!important}}</style></head>
    <body><div class="card">
    <div style="background:linear-gradient(135deg,#0f0f1a,#1a1a2e);padding:24px;">
      <div style="display:flex;align-items:center;gap:14px;">${logoTag}
        <div><div style="font-size:15px;font-weight:800;color:#fff;">${schoolName}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:4px;text-transform:uppercase;letter-spacing:0.06em;">Bulk Payment Receipt</div></div>
      </div>
      <div style="margin-top:16px;height:2px;background:linear-gradient(90deg,transparent,#e8b84b,transparent);"></div>
      <div style="margin-top:14px;display:flex;gap:24px;flex-wrap:wrap;">
        <div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">Fee Type</div><div style="font-size:13px;font-weight:700;color:#fff;">${done.tmpl.name}</div></div>
        <div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">Period</div><div style="font-size:13px;font-weight:700;color:#e8b84b;">${done.periodRow.label}</div></div>
        <div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">Date</div><div style="font-size:13px;font-weight:700;color:#fff;">${fmtD(done.periodRow.period_date)}</div></div>
        <div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">Recorded By</div><div style="font-size:13px;font-weight:700;color:#fff;">${profile?.full_name||'--'}</div></div>
      </div>
    </div>
    <div style="padding:20px 24px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#f8f8fc;">
          <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;text-align:left;">Student</th>
          <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;text-align:left;">Class</th>
          <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;text-align:right;">Amount</th>
          <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;text-align:left;">Receipt</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="background:#f8f8fc;">
          <td colspan="2" style="padding:10px;font-size:13px;font-weight:700;color:#111;">Total (${done.count} students)</td>
          <td style="padding:10px;font-size:15px;font-weight:800;color:#1a7a4a;text-align:right;">${fmtMoney(total,currency)}</td>
          <td></td>
        </tr></tfoot>
      </table>
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid #eee;text-align:center;">
        <div style="font-size:10px;color:#bbb;">Generated ${fmtD(new Date())} · ${schoolName} · SRMS</div>
      </div>
    </div>
    <div class="no-print" style="padding:0 24px 20px;">
      <button onclick="window.print()" style="width:100%;padding:12px;background:linear-gradient(135deg,#e8b84b,#f5d07a);border:none;border-radius:10px;font-size:14px;font-weight:700;color:#1a1a2e;cursor:pointer;">⎙ Print Receipt</button>
    </div>
    </div></body></html>`
    const w=window.open('','_blank','width=620,height=800')
    if(w){w.document.write(html);w.document.close()}
  }

  const printBulkIndividual = (done) => {
    const schoolName = settings?.school_name||'School'
    const schoolLogo = settings?.school_logo||null
    const logoTag = schoolLogo
      ? `<img src="${schoolLogo}" style="width:36px;height:36px;object-fit:contain;border-radius:5px;"/>`
      : `<div style="width:36px;height:36px;border-radius:6px;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#e8b84b;">S</div>`
    const fmtD = d=>d?new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'--'
    const pages = done.selected.map(r=>{
      const feeRow = done.feeRows?.find(f=>f.student_id===r.student.id)
      const payRow = done.payRows.find(p=>p.student_id===r.student.id)
      if(!payRow) return ''
      const cls = classes.find(c=>c.id===r.student.class_id)
      const sName = fullName(r.student,true)
      const amtFormatted = fmtMoney(parseFloat(r.amount||0), currency)
      return `<div style="page-break-after:always;padding:32px 24px;max-width:480px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#0f0f1a,#1a1a2e);border-radius:12px;padding:20px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:12px;">${logoTag}
            <div><div style="font-size:14px;font-weight:800;color:#fff;">${schoolName}</div>
            <div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.06em;margin-top:2px;">Payment Receipt</div></div>
            <div style="margin-left:auto;text-align:right;">
              <div style="font-size:10px;color:rgba(255,255,255,0.4);">Receipt No.</div>
              <div style="font-size:13px;font-weight:700;color:#e8b84b;font-family:monospace;">${payRow.receipt_no||'--'}</div>
            </div>
          </div>
        </div>
        <div style="border:1px solid #eee;border-radius:10px;padding:16px;font-family:'Helvetica Neue',Arial,sans-serif;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
            <div><div style="font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;margin-bottom:3px;">Student</div><div style="font-size:13px;font-weight:600;color:#111;">${sName}</div></div>
            <div><div style="font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;margin-bottom:3px;">Class</div><div style="font-size:13px;color:#333;">${cls?.name||'--'}</div></div>
            <div><div style="font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;margin-bottom:3px;">Fee Type</div><div style="font-size:13px;color:#333;">${feeRow.fee_type}</div></div>
            <div><div style="font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;margin-bottom:3px;">Date</div><div style="font-size:13px;color:#333;">${fmtD(payRow.created_at)}</div></div>
          </div>
          <div style="height:1px;background:#eee;margin-bottom:12px;"></div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:12px;font-weight:600;color:#555;">Amount Paid</div>
            <div style="font-size:20px;font-weight:800;color:#1a7a4a;">${amtFormatted}</div>
          </div>
          <div style="margin-top:12px;font-size:10px;color:#bbb;text-align:center;">Recorded by ${payRow.recorded_by_name||'--'} · ${schoolName} · SRMS</div>
        </div>
      </div>`
    }).filter(Boolean).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Receipts</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#e8e8e8;font-family:'Helvetica Neue',Arial,sans-serif;}
    @media print{body{background:#fff;}div[style*="page-break-after:always"]:last-child{page-break-after:avoid!important}}</style></head>
    <body>${pages}</body></html>`
    const w = window.open('','_blank','width=600,height=800')
    if(w){w.document.write(html);w.document.close()}
  }

  // ── Bulk Collect Payment helpers ──
  const feeTypes = [...new Set(fees.filter(f=>f.academic_year===activeYear&&!f.template_id).map(f=>f.fee_type))].sort()
  const allFeeTypes = [...new Set(fees.filter(f=>f.academic_year===activeYear).map(f=>f.fee_type))].sort()
  // Period labels filtered by selected fee type so bursar only sees relevant periods
  const feePeriodLabels = [...new Set(
    fees.filter(f=>f.academic_year===activeYear && (!bcp.fee_type || f.fee_type===bcp.fee_type) && f.period)
      .map(f=>f.period)
  )].sort()

  const buildBcpRows = (feeType, classIds, period) => {
    let pool = activeStudents
    if(classIds && classIds.length>0) pool = pool.filter(s=>classIds.includes(s.class_id))
    return pool.map(s=>{
      const studentFees = fees.filter(f=>
        f.student_id===s.id &&
        f.fee_type===feeType &&
        f.academic_year===activeYear &&
        (!period || f.period===period)
      )
      const totalCharged = studentFees.reduce((a,f)=>a+Number(f.amount||0),0)
      // Use effectivePaid (same as enriched) — max of fee.paid vs payments sum
      const totalPaid = studentFees.reduce((a,f)=>{
        const feePayments = payments.filter(p=>p.fee_id===f.id)
        const paymentsPaid = feePayments.reduce((s,p)=>s+Number(p.amount||0),0)
        return a + Math.max(Number(f.paid||0), paymentsPaid)
      },0)
      const balance = Math.max(0, totalCharged - totalPaid)
      const feeId   = studentFees[0]?.id || null
      if(balance===0 || !feeId) return null
      return {student:s, checked:true, amount:String(balance), balance, feeId}
    }).filter(Boolean)
  }

  const openBcpModal = () => {
    setBcp(BCP_INIT); setBcpRows([]); setBcpStep(1); setBcpDone(null); setBcpModal(true)
  }

  const closeBcp = () => { setBcpModal(false); setBcpStep(1); setBcp(BCP_INIT); setBcpRows([]); setBcpDone(null); setBrpDupWarning(false) }

  const bcpGoStep2 = () => {
    if(!bcp.fee_type){toast('Select a fee type','error');return}
    if(!bcp.period){toast('Please select a period to avoid misallocation of payments','error');return}
    const rows = buildBcpRows(bcp.fee_type, bcp.class_ids, bcp.period)
    if(rows.length===0){toast('No students with outstanding balances for this fee and period','error');return}
    setBcpRows(rows)
    setBcpStep(2)
  }

  const confirmBcp = async () => {
    const selected = bcpRows.filter(r=>r.checked && parseFloat(r.amount)>0)
    if(selected.length===0){toast('No students selected','error');return}
    const overpaying = selected.filter(r=>parseFloat(r.amount)>r.balance)
    if(overpaying.length>0){toast(`${overpaying.length} student${overpaying.length!==1?'s':''} have amounts exceeding their balance. Please correct before confirming.`,'error');return}
    setBcpSaving(true)
    try {
      const payRows = []
      let currentPayments = [...payments]
      for(const r of selected){
        const amt = parseFloat(r.amount)
        const rcpt = genRCP(currentPayments)
        const {data:payRow,error:payErr}=await supabase.from('payments').insert({
          school_id:        profile?.school_id,
          academic_year:    activeYear,
          fee_id:           r.feeId,
          student_id:       r.student.id,
          amount:           amt,
          receipt_no:       rcpt,
          recorded_by_id:   profile?.id,
          recorded_by_name: profile?.full_name,
        }).select().single()
        if(payErr) throw payErr
        // Update fee.paid
        const fee = fees.find(f=>f.id===r.feeId)
        const newPaid = Number(fee?.paid||0) + amt
        await supabase.from('fees').update({paid:newPaid}).eq('id',r.feeId).eq('school_id',profile?.school_id)
        currentPayments = [payRow, ...currentPayments]
        payRows.push({...payRow, student:r.student, amount:amt, feeId:r.feeId})
      }
      // Update local state
      setData(p=>({
        ...p,
        payments: [...payRows.map(r=>({...r})).reverse(), ...p.payments],
        fees: p.fees.map(f=>{
          const match = selected.find(r=>r.feeId===f.id)
          if(!match) return f
          return {...f, paid: Number(f.paid||0) + parseFloat(match.amount)}
        })
      }))
      auditLog(profile,'Fees','Bulk Payment Collected',
        `${bcp.fee_type} · ${selected.length} students · ${fmtMoney(selected.reduce((a,r)=>a+parseFloat(r.amount||0),0),currency)}`,{},{},{}
      )
      toast(`Payments recorded for ${selected.length} student${selected.length!==1?'s':''}`)
      setBcpDone({count:selected.length, payRows, selected, feeType:bcp.fee_type})
      setBcpStep(3)
    } catch(err){
      toast(err.message,'error')
    }
    setBcpSaving(false)
  }

  const printBcpCombined = (done) => {
    const schoolName = settings?.school_name||'School'
    const schoolLogo = settings?.school_logo||null
    const logoTag = schoolLogo
      ? `<img src="${schoolLogo}" style="width:44px;height:44px;object-fit:contain;border-radius:6px;"/>`
      : `<div style="width:44px;height:44px;border-radius:8px;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#e8b84b;">S</div>`
    const fmtD = d=>d?new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'--'
    const rows = done.selected.map(r=>{
      const pay = done.payRows.find(p=>p.student_id===r.student.id)
      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#111;">${fullName(r.student,true)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#555;">${classes.find(c=>c.id===r.student.class_id)?.name||'--'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:12px;font-weight:700;color:#1a7a4a;text-align:right;">${fmtMoney(parseFloat(r.amount),currency)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:11px;font-family:monospace;color:#888;">${pay?.receipt_no||'--'}</td>
      </tr>`
    }).join('')
    const total = done.selected.reduce((a,r)=>a+parseFloat(r.amount||0),0)
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Bulk Collection — ${done.feeType}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#e8e8e8;font-family:'Helvetica Neue',Arial,sans-serif;display:flex;justify-content:center;padding:32px 16px}
    .card{width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,0.18)}
    @media print{body{background:#fff;padding:0;display:block}.card{width:100%;box-shadow:none;border-radius:0}.no-print{display:none!important}}</style></head>
    <body><div class="card">
    <div style="background:linear-gradient(135deg,#0f0f1a,#1a1a2e);padding:24px;">
      <div style="display:flex;align-items:center;gap:14px;">${logoTag}
        <div><div style="font-size:15px;font-weight:800;color:#fff;">${schoolName}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:4px;text-transform:uppercase;letter-spacing:0.06em;">Bulk Collection Receipt</div></div>
      </div>
      <div style="margin-top:16px;height:2px;background:linear-gradient(90deg,transparent,#e8b84b,transparent);"></div>
      <div style="margin-top:14px;display:flex;gap:24px;flex-wrap:wrap;">
        <div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">Fee Type</div><div style="font-size:13px;font-weight:700;color:#fff;">${done.feeType}</div></div>
        <div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">Date</div><div style="font-size:13px;font-weight:700;color:#fff;">${fmtD(new Date())}</div></div>
        <div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">Recorded By</div><div style="font-size:13px;font-weight:700;color:#fff;">${profile?.full_name||'--'}</div></div>
      </div>
    </div>
    <div style="padding:20px 24px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#f8f8fc;">
          <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;text-align:left;">Student</th>
          <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;text-align:left;">Class</th>
          <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;text-align:right;">Amount</th>
          <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;text-align:left;">Receipt</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="background:#f8f8fc;">
          <td colspan="2" style="padding:10px;font-size:13px;font-weight:700;color:#111;">Total (${done.count} students)</td>
          <td style="padding:10px;font-size:15px;font-weight:800;color:#1a7a4a;text-align:right;">${fmtMoney(total,currency)}</td>
          <td></td>
        </tr></tfoot>
      </table>
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid #eee;text-align:center;">
        <div style="font-size:10px;color:#bbb;">Generated ${fmtD(new Date())} · ${schoolName} · SRMS</div>
      </div>
    </div>
    <div class="no-print" style="padding:0 24px 20px;">
      <button onclick="window.print()" style="width:100%;padding:12px;background:linear-gradient(135deg,#e8b84b,#f5d07a);border:none;border-radius:10px;font-size:14px;font-weight:700;color:#1a1a2e;cursor:pointer;">⎙ Print Receipt</button>
    </div>
    </div></body></html>`
    const w=window.open('','_blank','width=620,height=800')
    if(w){w.document.write(html);w.document.close()}
  }

  const printBcpIndividual = (done) => {
    const schoolName = settings?.school_name||'School'
    const schoolLogo = settings?.school_logo||null
    const logoTag = schoolLogo
      ? `<img src="${schoolLogo}" style="width:36px;height:36px;object-fit:contain;border-radius:5px;"/>`
      : `<div style="width:36px;height:36px;border-radius:6px;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#e8b84b;">S</div>`
    const fmtD = d=>d?new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'--'
    const pages = done.selected.map(r=>{
      const fee = fees.find(f=>f.id===r.feeId)
      const payRow = done.payRows.find(p=>p.student_id===r.student.id)
      if(!payRow) return ''
      const cls = classes.find(c=>c.id===r.student.class_id)
      const sName = fullName(r.student,true)
      const amtFormatted = fmtMoney(parseFloat(r.amount||0), currency)
      return `<div style="page-break-after:always;padding:32px 24px;max-width:480px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#0f0f1a,#1a1a2e);border-radius:12px;padding:20px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:12px;">${logoTag}
            <div><div style="font-size:14px;font-weight:800;color:#fff;">${schoolName}</div>
            <div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.06em;margin-top:2px;">Payment Receipt</div></div>
            <div style="margin-left:auto;text-align:right;">
              <div style="font-size:10px;color:rgba(255,255,255,0.4);">Receipt No.</div>
              <div style="font-size:13px;font-weight:700;color:#e8b84b;font-family:monospace;">${payRow.receipt_no||'--'}</div>
            </div>
          </div>
        </div>
        <div style="border:1px solid #eee;border-radius:10px;padding:16px;font-family:'Helvetica Neue',Arial,sans-serif;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
            <div><div style="font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;margin-bottom:3px;">Student</div><div style="font-size:13px;font-weight:600;color:#111;">${sName}</div></div>
            <div><div style="font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;margin-bottom:3px;">Class</div><div style="font-size:13px;color:#333;">${cls?.name||'--'}</div></div>
            <div><div style="font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;margin-bottom:3px;">Fee Type</div><div style="font-size:13px;color:#333;">${fee?.fee_type||done.feeType}</div></div>
            <div><div style="font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;margin-bottom:3px;">Date</div><div style="font-size:13px;color:#333;">${fmtD(payRow.created_at)}</div></div>
          </div>
          <div style="height:1px;background:#eee;margin-bottom:12px;"></div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:12px;font-weight:600;color:#555;">Amount Paid</div>
            <div style="font-size:20px;font-weight:800;color:#1a7a4a;">${amtFormatted}</div>
          </div>
          <div style="margin-top:12px;font-size:10px;color:#bbb;text-align:center;">Recorded by ${payRow.recorded_by_name||'--'} · ${schoolName} · SRMS</div>
        </div>
      </div>`
    }).filter(Boolean).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Receipts</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#e8e8e8;font-family:'Helvetica Neue',Arial,sans-serif;}
    @media print{body{background:#fff;}div[style*="page-break-after:always"]:last-child{page-break-after:avoid!important}}</style></head>
    <body>${pages}</body></html>`
    const w = window.open('','_blank','width=600,height=800')
    if(w){w.document.write(html);w.document.close()}
  }

  const savePeriodEdit = async () => {
    if(!editPeriodForm.label.trim()||!editPeriodForm.period_date){toast('Label and date are required','error');return}
    setEditPeriodSaving(true)
    const {error} = await supabase.from('fee_periods')
      .update({label:editPeriodForm.label.trim(), period_date:editPeriodForm.period_date})
      .eq('id',editPeriodModal.id).eq('school_id',profile?.school_id)
    if(error){toast(error.message,'error');setEditPeriodSaving(false);return}
    setData(p=>({...p, fee_periods:p.fee_periods.map(x=>x.id===editPeriodModal.id?{...x,label:editPeriodForm.label.trim(),period_date:editPeriodForm.period_date}:x)}))
    // Also update the period label on linked fees
    await supabase.from('fees').update({period:editPeriodForm.label.trim()}).eq('fee_period_id',editPeriodModal.id).eq('school_id',profile?.school_id)
    setData(p=>({...p, fees:p.fees.map(f=>f.fee_period_id===editPeriodModal.id?{...f,period:editPeriodForm.label.trim()}:f)}))
    auditLog(profile,'Fees','Period Edited',`${editPeriodModal.label} → ${editPeriodForm.label.trim()}`,{},{...editPeriodModal},{...editPeriodForm})
    toast('Period updated')
    setEditPeriodSaving(false)
    if(selectedPeriod?.id===editPeriodModal.id) setSelectedPeriod(p=>({...p,label:editPeriodForm.label.trim(),period_date:editPeriodForm.period_date}))
    setEditPeriodModal(null)
  }

  const tabStyle = (active) => ({
    padding:'8px 22px',borderRadius:10,fontSize:13,fontWeight:600,
    background:active?'var(--ink4)':'transparent',
    color:active?'var(--white)':'var(--mist2)',
    border:active?'1px solid var(--line)':'1px solid transparent',
    transition:'all 0.15s',cursor:'pointer',fontFamily:"'Cabinet Grotesk',sans-serif"
  })


  return (
    <div>
      <PageHeader title='Fee Management' sub='Track payments, balances and receipts'>
        {['superadmin','admin'].includes(profile?.role) && (
          <Btn variant='ghost' onClick={exportFeesCsv}>⬇ Export CSV</Btn>
        )}
        {feeActiveTab==='fees' && !isViewingPast && canBulk && (
          <Btn variant='secondary' onClick={()=>{ window.scrollTo({top:0,behavior:'smooth'}); setBulkModal(true);setBulkStep(1);setBulk(BULK_INIT)}}>⊞ Bulk Add Fee</Btn>
        )}
        {feeActiveTab==='fees' && !isViewingPast && canBulk && (
          <Btn variant='secondary' onClick={openBcpModal}>💰 Bulk Collect Payment</Btn>
        )}
        {feeActiveTab==='recurring' && !isViewingPast && canBulk && selectedTemplate && (
          <Btn variant='secondary' onClick={()=>openBrpModal(selectedTemplate)}>⊞ Bulk Record Payment</Btn>
        )}
        {feeActiveTab==='recurring' && !isViewingPast && canBulk && (
          <Btn onClick={()=>{setTmplForm({name:'',amount_per_period:'',class_ids:[]});setTmplModal(true)}}>+ New Recurring Fee</Btn>
        )}
        {feeActiveTab==='fees' && !isViewingPast && <Btn onClick={openAdd}>+ Add Fee Record</Btn>}
      </PageHeader>

      {/* ── Tab switcher ── */}
      <div style={{display:'flex',gap:6,marginBottom:20,background:'var(--ink3)',borderRadius:12,padding:5,width:'fit-content',border:'1px solid var(--line)'}}>
        <button style={tabStyle(feeActiveTab==='fees')}      onClick={()=>setFeeActiveTab('fees')}>💳 Fees</button>
        <button style={tabStyle(feeActiveTab==='recurring')} onClick={()=>setFeeActiveTab('recurring')}>🔁 Recurring</button>
        <button style={tabStyle(feeActiveTab==='history')}   onClick={()=>setFeeActiveTab('history')}>🧾 Payment History</button>
      </div>

      {/* ══════════════ FEES TAB ══════════════ */}
      {feeActiveTab==='fees' && (<>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16,marginBottom:24}}>
        <KPI label='Total Owed'      value={fmtMoney(totalOwed,currency)} color='var(--mist)'    sub='All fees' index={0}/>
        <KPI label='Collected'       value={fmtMoney(totalPaid,currency)} color='var(--emerald)' sub='Payments received' index={1}/>
        <KPI label='Outstanding'     value={fmtMoney(totalOwed-totalPaid,currency)} color='var(--rose)' sub='Awaiting payment' index={2}/>
        <KPI label='Collection Rate' value={`${totalOwed?Math.round(totalPaid/totalOwed*100):0}%`} color='var(--gold)' sub='Of total owed' index={3}/>
        {overdueCount>0 && <KPI label='Overdue' value={overdueCount} color='var(--rose)' sub='Past due date, unpaid' index={4}/>}
      </div>

      <Card style={{marginBottom:16,padding:'14px 20px'}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          <div style={{position:'relative',flex:'1 1 200px'}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--mist3)',fontSize:14}}>⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Search student...' style={{width:'100%',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px 8px 36px',color:'var(--white)',fontSize:13}}/>
          </div>
          <select value={fClassId} onChange={e=>setFClassId(e.target.value)} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',flex:'1 1 140px'}}>
            <option value=''>All Classes</option>
            {myClasses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={fFeeType} onChange={e=>{setFFeeType(e.target.value);setFPeriod('')}} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',flex:'1 1 140px'}}>
            <option value=''>All Fee Types</option>
            {allFeeTypes.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <select value={fPeriod} onChange={e=>setFPeriod(e.target.value)} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',flex:'1 1 140px'}}>
            <option value=''>All Periods</option>
            {[...new Set(fees.filter(f=>f.academic_year===activeYear&&(!fFeeType||f.fee_type===fFeeType)&&f.period).map(f=>f.period))].sort().map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <select value={fstatus} onChange={e=>setFstatus(e.target.value)} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer'}}>
            <option value=''>All Status</option>
            <option>Paid</option><option>Partial</option><option>Outstanding</option><option value='Overdue'>Overdue</option>
          </select>
        </div>
      </Card>

      <Card>
        <DataTable data={filtered} columns={[
          {key:'student_name',label:'Student',render:(v,r)=>{const s=students.find(x=>x.id===r.student_id);return(<div style={{display:'flex',alignItems:'center',gap:10}}>{s&&<Avatar name={v} size={28}/>}<span style={{fontWeight:600}}>{v}</span></div>)}},
          {key:'fee_type',label:'Fee Type',render:(v,r)=>{const displayType=r.is_arrear?v.replace(/\s*\(Arrears from [^)]+\)/,''):v;return(<div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}><span>{displayType}</span>{r.period&&<Badge color='var(--sky)' bg='rgba(91,168,245,0.08)'>{r.period}</Badge>}{r.is_arrear&&<Badge color='var(--amber)' bg='rgba(251,159,58,0.1)'>Arrear from {r.arrear_from_year}</Badge>}{r.isOverdue&&<Badge color='var(--rose)' bg='rgba(240,107,122,0.1)'>Overdue</Badge>}</div>)}},
          {key:'amount', label:'Amount',  render:v=><span className='mono'>{fmtMoney(v,currency)}</span>},
          {key:'paid',   label:'Paid',    render:(_,r)=><span className='mono' style={{color:'var(--emerald)'}}>{fmtMoney(r.effectivePaid,currency)}</span>},
          {key:'balance',label:'Balance', render:v=><span className='mono' style={{color:v>0?'var(--rose)':'var(--emerald)'}}>{fmtMoney(v,currency)}</span>},
          {key:'status', label:'Status',  render:v=><Badge color={FEE_STATUS[v]?.color} bg={FEE_STATUS[v]?.bg}>{v}</Badge>},
          {key:'receipt_no',label:'Receipt',render:v=>v?<span className='mono' style={{fontSize:12,color:'var(--mist2)'}}>{v}</span>:'--'},
          {key:'id',label:'',render:(_,r)=>isViewingPast?null:(
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}} onClick={e=>e.stopPropagation()}>
              {r.balance>0 && <Btn size='sm' onClick={()=>openPay(r)}>Record Payment</Btn>}
              {r.hasPayments && <PlanGate planHook={planHook} feature='feeReceipts' mode='inline'><Btn variant='ghost' size='sm' onClick={()=>openReceipt(r)}>⎙ Receipt</Btn></PlanGate>}
              {r.balance<=0 && !r.hasPayments && <Badge color='var(--emerald)'>Paid</Badge>}
              <Btn variant='ghost' size='sm' onClick={()=>openEditFee(r)}>Edit</Btn>
              {canBulk && <Btn variant='danger' size='sm' onClick={()=>delFee(r.id)}>Remove</Btn>}
            </div>
          )},
        ]}/>
      </Card>

      </>)}

      {/* ══════════════ RECURRING TAB ══════════════ */}
      {feeActiveTab==='recurring' && (<>

        {/* Template list */}
        <SectionTitle>Recurring Fee Types</SectionTitle>
        {fee_templates.filter(t=>t.academic_year===activeYear).length===0 ? (
          <Card style={{textAlign:'center',padding:'40px 24px',marginBottom:24}}>
            <div style={{fontSize:32,marginBottom:12}}>🔁</div>
            <div style={{fontSize:15,fontWeight:600,color:'var(--mist)',marginBottom:6}}>No recurring fees set up yet</div>
            <div style={{fontSize:13,color:'var(--mist3)',marginBottom:20}}>Create a recurring fee type for things like feeding, transport or hostel charges.</div>
            {canBulk && !isViewingPast && (
              <Btn onClick={()=>{setTmplForm({name:'',amount_per_period:'',class_ids:[]});setTmplModal(true)}}>+ New Recurring Fee</Btn>
            )}
          </Card>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12,marginBottom:24}}>
            {fee_templates.filter(t=>t.academic_year===activeYear).map(tmpl=>{
              const tmplPeriods  = fee_periods.filter(p=>p.template_id===tmpl.id)
              const tmplFees     = fees.filter(f=>f.template_id===tmpl.id && !students.find(s=>s.id===f.student_id)?.archived)
              const tmplPaid     = tmplFees.reduce((a,f)=>a+Number(f.paid||0),0)
              const isSelected   = selectedTemplate?.id===tmpl.id
              const tmplClasses  = (tmpl.class_ids||[]).map(id=>classes.find(c=>c.id===id)?.name).filter(Boolean)
              return (
                <div key={tmpl.id}
                  onClick={()=>setSelectedTemplate(isSelected?null:tmpl)}
                  style={{background:isSelected?'var(--ink4)':'var(--ink3)',border:`1px solid ${isSelected?'var(--gold)':'var(--line)'}`,borderRadius:'var(--r)',padding:'16px 18px',cursor:'pointer',transition:'all 0.15s'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:'var(--white)',marginBottom:4}}>{tmpl.name}</div>
                      <div style={{fontSize:12,color:'var(--gold)',fontWeight:600}}>{fmtMoney(tmpl.amount_per_period,currency)} / period</div>
                    </div>
                    {canBulk && !isViewingPast && (
                      <Btn size='sm' variant='ghost' onClick={e=>{e.stopPropagation();deleteTmpl(tmpl)}}>🗑</Btn>
                    )}
                  </div>
                  {/* Class badges */}
                  {tmplClasses.length>0 && (
                    <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:10}}>
                      {tmplClasses.map(name=>(
                        <span key={name} style={{fontSize:10,fontWeight:600,color:'var(--sky)',background:'rgba(91,168,245,0.1)',border:'1px solid rgba(91,168,245,0.2)',borderRadius:4,padding:'2px 7px'}}>{name}</span>
                      ))}
                    </div>
                  )}
                  <div style={{display:'flex',gap:16,marginTop:10}}>
                    <div style={{fontSize:11,color:'var(--mist3)'}}>
                      <span style={{fontWeight:700,color:'var(--mist)',fontSize:14}}>{tmplPeriods.length}</span> period{tmplPeriods.length!==1?'s':''}
                    </div>
                    <div style={{fontSize:11,color:'var(--mist3)'}}>
                      <span style={{fontWeight:700,color:'var(--emerald)',fontSize:14}}>{fmtMoney(tmplPaid,currency)}</span> collected
                    </div>
                  </div>
                  {isSelected && <div style={{marginTop:10,fontSize:11,color:'var(--gold)'}}>▼ Showing periods below</div>}
                </div>
              )
            })}
          </div>
        )}

        {/* Period breakdown for selected template */}
        {selectedTemplate && (() => {
          const tmplPeriods = fee_periods.filter(p=>p.template_id===selectedTemplate.id).sort((a,b)=>b.period_date.localeCompare(a.period_date))
          const tmpl = fee_templates.find(t=>t.id===selectedTemplate.id)
          return (
            <>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <SectionTitle style={{margin:0}}>{tmpl?.name} — Periods</SectionTitle>
                {canBulk && !isViewingPast && (
                  <Btn variant='secondary' onClick={()=>openBrpModal(selectedTemplate)}>⊞ Bulk Record Payment</Btn>
                )}
              </div>
              {tmplPeriods.length===0 ? (
                <Card style={{textAlign:'center',padding:'32px 24px',marginBottom:24}}>
                  <div style={{fontSize:13,color:'var(--mist3)'}}>No periods yet. Click <strong>Bulk Record Payment</strong> to add the first one.</div>
                </Card>
              ) : (
                <div style={{overflowX:'auto',marginBottom:24}}>
                  <table style={{width:'100%',borderCollapse:'collapse',minWidth:480}}>
                    <thead>
                      <tr>
                        {['Period','Date','Students Charged','Collected','Outstanding',''].map(h=>(
                          <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',borderBottom:'1px solid var(--line)',whiteSpace:'nowrap'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tmplPeriods.map(period=>{
                        const periodFees  = fees.filter(f=>f.fee_period_id===period.id && !students.find(s=>s.id===f.student_id)?.archived)
                        const charged     = periodFees.length
                        const collected   = periodFees.reduce((a,f)=>a+Number(f.paid||0),0)
                        const outstanding = periodFees.reduce((a,f)=>a+Math.max(0,Number(f.amount||0)-Number(f.paid||0)),0)
                        const tmpl        = fee_templates.find(t=>t.id===period.template_id)
                        const totalInClasses = activeStudents.filter(s=>(tmpl?.class_ids||[]).includes(s.class_id)).length
                        const excluded    = Math.max(0, totalInClasses - charged)
                        const isSelected  = selectedPeriod?.id===period.id
                        const fmtD = d=>d?new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'--'
                        return (
                          <tr key={period.id}
                            onClick={()=>{setSelectedPeriod(isSelected?null:period);setRegClassFilter('');setRegStatusFilter('')}}
                            style={{borderBottom:'1px solid var(--line)',cursor:'pointer',background:isSelected?'rgba(232,184,75,0.04)':'transparent',transition:'background 0.15s'}}>
                            <td style={{padding:'12px 14px'}}>
                              <div style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{period.label}</div>
                              {isSelected&&<div style={{fontSize:10,color:'var(--gold)',marginTop:2}}>▼ Register open below</div>}
                            </td>
                            <td style={{padding:'12px 14px'}}>
                              <div style={{fontSize:12,color:'var(--mist2)'}}>{fmtD(period.period_date)}</div>
                            </td>
                            <td style={{padding:'12px 14px'}}>
                              <div style={{fontSize:13,color:'var(--mist)'}}>{charged} charged{excluded>0&&<span style={{fontSize:11,color:'var(--mist3)',marginLeft:6}}>· {excluded} excluded</span>}</div>
                            </td>
                            <td style={{padding:'12px 14px'}}>
                              <span style={{fontWeight:700,color:'var(--emerald)',fontFamily:'monospace',fontSize:13}}>{fmtMoney(collected,currency)}</span>
                            </td>
                            <td style={{padding:'12px 14px'}}>
                              {outstanding>0
                                ? <span style={{fontWeight:700,color:'var(--rose)',fontFamily:'monospace',fontSize:13}}>{fmtMoney(outstanding,currency)}</span>
                                : charged>0
                                  ? <Badge color='var(--emerald)' bg='rgba(52,199,89,0.08)'>Fully collected</Badge>
                                  : <span style={{fontSize:12,color:'var(--mist3)'}}>—</span>}
                            </td>
                            <td style={{padding:'12px 14px'}} onClick={e=>e.stopPropagation()}>
                              {canBulk && !isViewingPast && (<>
                                <Btn size='sm' variant='ghost' onClick={()=>{setEditPeriodForm({label:period.label,period_date:period.period_date});setEditPeriodModal(period)}}>✏️</Btn>
                                <Btn size='sm' variant='ghost' onClick={()=>deletePeriod(period)}>🗑</Btn>
                              </>)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )
        })()}

        {/* ── Period Register ── */}
        {selectedPeriod && selectedTemplate && (() => {
          const tmpl       = fee_templates.find(t=>t.id===selectedTemplate.id)
          const periodFees = fees.filter(f=>f.fee_period_id===selectedPeriod.id && !students.find(s=>s.id===f.student_id)?.archived)
          const tmplClassIds = tmpl?.class_ids||[]
          // All students in template's classes
          const allStudents  = activeStudents.filter(s=>tmplClassIds.includes(s.class_id))
          const fmtD = d=>d?new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'--'

          const registerRows = allStudents.map(s=>{
            const feeRow  = periodFees.find(f=>f.student_id===s.id)
            const charged = Number(feeRow?.amount||0)
            const paid    = Number(feeRow?.paid||0)
            const balance = Math.max(0, charged - paid)
            const status  = !feeRow ? 'Excluded' : balance===0 ? 'Paid' : paid>0 ? 'Partial' : 'Outstanding'
            return {student:s, feeRow, charged, paid, balance, status}
          }).filter(r=>{
            if(regClassFilter && r.student.class_id!==regClassFilter) return false
            if(regStatusFilter && r.status!==regStatusFilter) return false
            return true
          })

          const totalCharged    = registerRows.filter(r=>r.status!=='Excluded').reduce((a,r)=>a+r.charged,0)
          const totalCollected  = registerRows.reduce((a,r)=>a+r.paid,0)
          const totalOutstanding= registerRows.reduce((a,r)=>a+r.balance,0)
          const paidCount       = registerRows.filter(r=>r.status==='Paid').length
          const outCount        = registerRows.filter(r=>r.status==='Outstanding').length
          const partialCount    = registerRows.filter(r=>r.status==='Partial').length
          const excludedCount   = registerRows.filter(r=>r.status==='Excluded').length

          const statusColor = s => s==='Paid'?'var(--emerald)':s==='Partial'?'var(--amber)':s==='Outstanding'?'var(--rose)':'var(--mist3)'
          const statusBg    = s => s==='Paid'?'rgba(52,199,89,0.08)':s==='Partial'?'rgba(251,159,58,0.08)':s==='Outstanding'?'rgba(240,107,122,0.08)':'rgba(255,255,255,0.04)'

          const printRegister = () => {
            const schoolName = settings?.school_name||'School'
            const schoolLogo = settings?.school_logo||null
            const logoTag = schoolLogo
              ? `<img src="${schoolLogo}" style="width:40px;height:40px;object-fit:contain;border-radius:5px;"/>`
              : `<div style="width:40px;height:40px;border-radius:7px;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#e8b84b;">S</div>`
            const allRegRows = allStudents.map(s=>{
              const feeRow  = periodFees.find(f=>f.student_id===s.id)
              const charged = Number(feeRow?.amount||0)
              const paid    = Number(feeRow?.paid||0)
              const balance = Math.max(0, charged - paid)
              const status  = !feeRow ? 'Excluded' : balance===0 ? 'Paid' : paid>0 ? 'Partial' : 'Outstanding'
              const cls     = classes.find(c=>c.id===s.class_id)
              const sColor  = status==='Paid'?'#1a7a4a':status==='Partial'?'#b45309':status==='Outstanding'?'#c0392b':'#999'
              const fmtCharged = charged>0 ? fmtMoney(charged,currency) : '—'
              const fmtPaid    = paid>0    ? fmtMoney(paid,currency)    : '—'
              const fmtBal     = balance>0 ? fmtMoney(balance,currency) : '—'
              return `<tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:7px 10px;font-size:12px;color:#111;">${fullName(s,true)}</td>
                <td style="padding:7px 10px;font-size:12px;color:#555;">${cls?.name||'--'}</td>
                <td style="padding:7px 10px;font-size:12px;text-align:right;color:#333;">${fmtCharged}</td>
                <td style="padding:7px 10px;font-size:12px;text-align:right;color:#1a7a4a;font-weight:600;">${fmtPaid}</td>
                <td style="padding:7px 10px;font-size:12px;text-align:right;color:#c0392b;font-weight:600;">${fmtBal}</td>
                <td style="padding:7px 10px;font-size:11px;font-weight:700;color:${sColor};">${status}</td>
              </tr>`
            }).join('')
            const grandTotal = allStudents.reduce((a,s)=>{const f=periodFees.find(x=>x.student_id===s.id);return a+Number(f?.paid||0)},0)
            const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Period Register — ${selectedPeriod.label}</title>
            <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#e8e8e8;font-family:'Helvetica Neue',Arial,sans-serif;display:flex;justify-content:center;padding:32px 16px}
            .card{width:680px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,0.18)}
            @media print{body{background:#fff;padding:0;display:block}.card{width:100%;box-shadow:none;border-radius:0}.no-print{display:none!important}}</style></head>
            <body><div class="card">
            <div style="background:linear-gradient(135deg,#0f0f1a,#1a1a2e);padding:24px;">
              <div style="display:flex;align-items:center;gap:14px;">${logoTag}
                <div><div style="font-size:15px;font-weight:800;color:#fff;">${schoolName}</div>
                <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:3px;text-transform:uppercase;letter-spacing:0.06em;">Period Payment Register</div></div>
              </div>
              <div style="margin-top:14px;height:2px;background:linear-gradient(90deg,transparent,#e8b84b,transparent);"></div>
              <div style="margin-top:14px;display:flex;gap:24px;flex-wrap:wrap;">
                <div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">Fee</div><div style="font-size:13px;font-weight:700;color:#fff;">${tmpl?.name}</div></div>
                <div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">Period</div><div style="font-size:13px;font-weight:700;color:#e8b84b;">${selectedPeriod.label}</div></div>
                <div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">Date</div><div style="font-size:13px;font-weight:700;color:#fff;">${fmtD(selectedPeriod.period_date)}</div></div>
                <div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">Total Collected</div><div style="font-size:13px;font-weight:700;color:#2dd4a0;">${fmtMoney(grandTotal,currency)}</div></div>
              </div>
            </div>
            <div style="padding:20px 24px;">
              <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#f8f8fc;">
                  <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;text-align:left;">Student</th>
                  <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;text-align:left;">Class</th>
                  <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;text-align:right;">Charged</th>
                  <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;text-align:right;">Paid</th>
                  <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;text-align:right;">Balance</th>
                  <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;">Status</th>
                </tr></thead>
                <tbody>${allRegRows}</tbody>
              </table>
              <div style="margin-top:16px;padding:12px 10px;background:#f8f8fc;border-radius:8px;display:flex;gap:24px;flex-wrap:wrap;">
                <div style="font-size:12px;color:#555;">Total collected: <strong style="color:#1a7a4a;">${fmtMoney(grandTotal,currency)}</strong></div>
                <div style="font-size:12px;color:#555;">Paid: <strong>${allStudents.filter(s=>{const f=periodFees.find(x=>x.student_id===s.id);const b=Math.max(0,Number(f?.amount||0)-Number(f?.paid||0));return f&&b===0}).length}</strong></div>
                <div style="font-size:12px;color:#555;">Outstanding: <strong style="color:#c0392b;">${allStudents.filter(s=>{const f=periodFees.find(x=>x.student_id===s.id);return f&&Number(f.paid||0)===0}).length}</strong></div>
                <div style="font-size:12px;color:#555;">Excluded: <strong>${allStudents.filter(s=>!periodFees.find(x=>x.student_id===s.id)).length}</strong></div>
              </div>
              <div style="margin-top:12px;text-align:center;font-size:10px;color:#bbb;">Generated ${fmtD(new Date())} · ${schoolName} · SRMS</div>
            </div>
            <div class="no-print" style="padding:0 24px 20px;">
              <button onclick="window.print()" style="width:100%;padding:12px;background:linear-gradient(135deg,#e8b84b,#f5d07a);border:none;border-radius:10px;font-size:14px;font-weight:700;color:#1a1a2e;cursor:pointer;">⎙ Print Register</button>
            </div>
            </div></body></html>`
            const w=window.open('','_blank','width=720,height=900')
            if(w){w.document.write(html);w.document.close()}
          }

          return (
            <div style={{marginTop:8,marginBottom:24,background:'var(--ink3)',border:'1px solid var(--gold)',borderRadius:'var(--r)',overflow:'hidden'}}>
              {/* Register header */}
              <div style={{background:'rgba(232,184,75,0.06)',borderBottom:'1px solid var(--line)',padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--white)'}}>{selectedPeriod.label} — Register</div>
                  <div style={{fontSize:11,color:'var(--mist3)',marginTop:2}}>{fmtD(selectedPeriod.period_date)} · {tmpl?.name}</div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                  {/* Class filter */}
                  <select value={regClassFilter} onChange={e=>setRegClassFilter(e.target.value)}
                    style={{background:'var(--ink)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'6px 10px',color:'var(--mist)',fontSize:12,cursor:'pointer'}}>
                    <option value=''>All Classes</option>
                    {tmplClassIds.map(id=>{const c=classes.find(x=>x.id===id);return c?<option key={id} value={id}>{c.name}</option>:null})}
                  </select>
                  {/* Status filter */}
                  <select value={regStatusFilter} onChange={e=>setRegStatusFilter(e.target.value)}
                    style={{background:'var(--ink)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'6px 10px',color:'var(--mist)',fontSize:12,cursor:'pointer'}}>
                    <option value=''>All Statuses</option>
                    {['Paid','Partial','Outstanding','Excluded'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                  <Btn size='sm' onClick={printRegister}>⎙ Print</Btn>
                  <Btn size='sm' variant='ghost' onClick={()=>setSelectedPeriod(null)}>✕</Btn>
                </div>
              </div>
              {/* Summary pills */}
              <div style={{padding:'10px 18px',display:'flex',gap:12,flexWrap:'wrap',borderBottom:'1px solid var(--line)'}}>
                {[
                  {label:'Paid',count:paidCount,color:'var(--emerald)'},
                  {label:'Partial',count:partialCount,color:'var(--amber)'},
                  {label:'Outstanding',count:outCount,color:'var(--rose)'},
                  {label:'Excluded',count:excludedCount,color:'var(--mist3)'},
                ].map(p=>(
                  <div key={p.label} style={{fontSize:12,color:'var(--mist3)'}}>
                    <span style={{fontWeight:700,color:p.color,fontSize:15}}>{p.count}</span> {p.label}
                  </div>
                ))}
                <div style={{marginLeft:'auto',fontSize:12,color:'var(--mist3)'}}>
                  Collected: <span style={{fontWeight:700,color:'var(--emerald)'}}>{fmtMoney(totalCollected,currency)}</span>
                  {totalOutstanding>0&&<> · Outstanding: <span style={{fontWeight:700,color:'var(--rose)'}}>{fmtMoney(totalOutstanding,currency)}</span></>}
                </div>
              </div>
              {/* Register rows */}
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',minWidth:520}}>
                  <thead>
                    <tr>
                      {['Student','Class','Charged','Paid','Balance','Status'].map(h=>(
                        <th key={h} style={{padding:'10px 14px',textAlign:h==='Student'||h==='Class'?'left':'right',fontSize:10,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',borderBottom:'1px solid var(--line)',whiteSpace:'nowrap',
                          ...(h==='Status'?{textAlign:'center'}:{})}}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {registerRows.map(r=>{
                      const cls = classes.find(c=>c.id===r.student.class_id)
                      return (
                        <tr key={r.student.id} style={{borderBottom:'1px solid var(--line)',opacity:r.status==='Excluded'?0.5:1}}>
                          <td style={{padding:'10px 14px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <Avatar name={fullName(r.student,true)} photo={r.student.photo} size={24}/>
                              <span style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{fullName(r.student,true)}</span>
                            </div>
                          </td>
                          <td style={{padding:'10px 14px'}}>
                            <span style={{fontSize:12,color:'var(--mist2)'}}>{cls?.name||'--'}</span>
                          </td>
                          <td style={{padding:'10px 14px',textAlign:'right'}}>
                            <span style={{fontSize:13,color:'var(--mist)',fontFamily:'monospace'}}>{r.charged>0?fmtMoney(r.charged,currency):'—'}</span>
                          </td>
                          <td style={{padding:'10px 14px',textAlign:'right'}}>
                            <span style={{fontSize:13,fontWeight:r.paid>0?700:400,color:r.paid>0?'var(--emerald)':'var(--mist3)',fontFamily:'monospace'}}>{r.paid>0?fmtMoney(r.paid,currency):'—'}</span>
                          </td>
                          <td style={{padding:'10px 14px',textAlign:'right'}}>
                            <span style={{fontSize:13,fontWeight:r.balance>0?700:400,color:r.balance>0?'var(--rose)':'var(--mist3)',fontFamily:'monospace'}}>{r.balance>0?fmtMoney(r.balance,currency):'—'}</span>
                          </td>
                          <td style={{padding:'10px 14px',textAlign:'center'}}>
                            <span style={{fontSize:11,fontWeight:700,color:statusColor(r.status),background:statusBg(r.status),padding:'3px 10px',borderRadius:20}}>{r.status}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}

        {/* Period Edit Modal */}
        {editPeriodModal && (
          <Modal title='Edit Period' onClose={()=>setEditPeriodModal(null)}>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <Field label='Period Label' value={editPeriodForm.label} onChange={v=>setEditPeriodForm(p=>({...p,label:v}))} placeholder='e.g. Monday 19 May, Week 3'/>
              <Field label='Period Date' type='date' value={editPeriodForm.period_date} onChange={v=>setEditPeriodForm(p=>({...p,period_date:v}))}/>
              <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:4}}>
                <Btn variant='ghost' onClick={()=>setEditPeriodModal(null)}>Cancel</Btn>
                <Btn onClick={savePeriodEdit} disabled={editPeriodSaving}>{editPeriodSaving?<><Spinner/> Saving...</>:'Save Changes'}</Btn>
              </div>
            </div>
          </Modal>
        )}

        {/* New Template Modal */}
        {tmplModal && (
          <Modal title='New Recurring Fee' onClose={()=>setTmplModal(false)}>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <Field label='Fee Name' placeholder='e.g. Feeding Fee, Transport Fee' value={tmplForm.name} onChange={tf('name')}/>
              <Field label='Amount per Period' type='number' placeholder='e.g. 5.00' value={tmplForm.amount_per_period} onChange={tf('amount_per_period')}/>
              {/* Class selector */}
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'var(--mist2)',marginBottom:8}}>Applies to Classes ✦</div>
                <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:180,overflowY:'auto',padding:'2px 0'}}>
                  {classesWithStudents.map(c=>{
                    const checked = tmplForm.class_ids.includes(c.id)
                    return (
                      <label key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:checked?'var(--ink4)':'var(--ink3)',border:`1px solid ${checked?'var(--gold)':'var(--line)'}`,borderRadius:'var(--r-sm)',cursor:'pointer',transition:'all 0.15s'}}>
                        <input type='checkbox' checked={checked}
                          onChange={e=>tf('class_ids')(e.target.checked ? [...tmplForm.class_ids,c.id] : tmplForm.class_ids.filter(id=>id!==c.id))}
                          style={{accentColor:'var(--gold)',width:15,height:15,cursor:'pointer',flexShrink:0}}/>
                        <span style={{fontSize:13,fontWeight:checked?600:400,color:checked?'var(--white)':'var(--mist2)'}}>{c.name}</span>
                      </label>
                    )
                  })}
                </div>
                {tmplForm.class_ids.length===0 && <div style={{fontSize:11,color:'var(--rose)',marginTop:6}}>At least one class is required</div>}
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:4}}>
                <Btn variant='ghost' onClick={()=>setTmplModal(false)}>Cancel</Btn>
                <Btn onClick={saveTmpl} disabled={tmplSaving}>{tmplSaving?<><Spinner/> Saving...</>:'Create Recurring Fee'}</Btn>
              </div>
            </div>
          </Modal>
        )}

        {/* Bulk Record Payment Modal */}
        {brpModal && (
          <Modal title={brpDone?'Payments Recorded':brpStep===1?'Bulk Record Payment — Setup':brpStep===2?'Bulk Record Payment — Students':''}
            onClose={closeBrp}>
            {/* Step 1 — Setup */}
            {brpStep===1 && (
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                {/* Template selector */}
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'var(--mist2)',marginBottom:6}}>Recurring Fee</div>
                  <select value={brp.template_id} onChange={e=>{brf('template_id')(e.target.value);const t=fee_templates.find(x=>x.id===e.target.value);if(t)brf('same_amount')(String(t.amount_per_period))}}
                    style={{width:'100%',padding:'10px 12px',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',color:'var(--white)',fontSize:13}}>
                    <option value=''>Select fee type…</option>
                    {fee_templates.filter(t=>t.academic_year===activeYear).map(t=>(
                      <option key={t.id} value={t.id}>{t.name} — {fmtMoney(t.amount_per_period,currency)}/period</option>
                    ))}
                  </select>
                </div>
                <Field label='Period Label' placeholder='e.g. Monday 19 May, Week 3, Day 12' value={brp.label} onChange={brf('label')}/>
                <Field label='Period Date' type='date' value={brp.period_date} onChange={brf('period_date')}/>
                {/* Class filter — multi-pill, scoped to template's classes */}
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'var(--mist2)',marginBottom:8}}>Class Filter <span style={{color:'var(--mist3)',fontWeight:400}}>(optional — leave blank for all)</span></div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{
                    (() => {
                      const tmpl = fee_templates.find(t=>t.id===brp.template_id)
                      const tmplClassIds = tmpl?.class_ids||[]
                      const tmplClasses = classesWithStudents.filter(c=>tmplClassIds.includes(c.id))
                      return tmplClasses.map(c=>{
                        const sel = (brp.class_ids||[]).includes(c.id)
                        return (
                          <button key={c.id} onClick={()=>brf('class_ids')(sel?(brp.class_ids||[]).filter(x=>x!==c.id):[...(brp.class_ids||[]),c.id])}
                            style={{padding:'6px 14px',borderRadius:20,fontSize:13,fontWeight:600,cursor:'pointer',transition:'all 0.15s',
                              background:sel?'rgba(232,184,75,0.15)':'var(--ink4)',
                              color:sel?'var(--gold)':'var(--mist2)',
                              border:`1px solid ${sel?'var(--gold)':'var(--line)'}`}}>
                            {c.name}
                          </button>
                        )
                      })
                    })()
                  }</div>
                  {(brp.class_ids||[]).length>0 && (
                    <div style={{fontSize:11,color:'var(--mist3)',marginTop:6}}>{(brp.class_ids||[]).length} class{(brp.class_ids||[]).length!==1?'es':''} selected · leave blank to include all template classes</div>
                  )}
                </div>
                {/* Mode toggle */}
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'var(--mist2)',marginBottom:8}}>Payment Mode</div>
                  <div style={{display:'flex',gap:8}}>
                    {[{v:'same',label:'Same amount for all'},{v:'per',label:'Per student'}].map(opt=>(
                      <button key={opt.v} onClick={()=>brf('mode')(opt.v)}
                        style={{flex:1,padding:'10px',borderRadius:'var(--r-sm)',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.15s',
                          background:brp.mode===opt.v?'var(--ink4)':'transparent',
                          border:`1px solid ${brp.mode===opt.v?'var(--gold)':'var(--line)'}`,
                          color:brp.mode===opt.v?'var(--gold)':'var(--mist2)'}}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {brp.mode==='same' && (
                  <Field label='Amount per Student' type='number' value={brp.same_amount} onChange={brf('same_amount')}/>
                )}
                <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:4}}>
                  <Btn variant='ghost' onClick={closeBrp}>Cancel</Btn>
                  <Btn onClick={brpGoStep2} disabled={!brp.template_id}>Next →</Btn>
                </div>
              </div>
            )}

            {/* Step 2 — Student list */}
            {brpStep===2 && (
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={{fontSize:12,color:'var(--mist3)',marginBottom:4}}>
                  <strong style={{color:'var(--gold)'}}>{brp.label}</strong> · {brp.period_date}
                  <span style={{marginLeft:8}}>
                    <span style={{color:'var(--emerald)',fontWeight:600}}>{brpRows.filter(r=>r.state==='paid').length} paid</span>
                    {brpRows.filter(r=>r.state==='owes').length>0&&<span style={{color:'var(--amber)',fontWeight:600,marginLeft:6}}>{brpRows.filter(r=>r.state==='owes').length} owes</span>}
                    {brpRows.filter(r=>r.state==='excluded').length>0&&<span style={{color:'var(--mist3)',marginLeft:6}}>{brpRows.filter(r=>r.state==='excluded').length} excluded</span>}
                  </span>
                </div>
                {/* Duplicate warning */}
                {brpDupWarning && (
                  <div style={{background:'rgba(251,159,58,0.1)',border:'1px solid rgba(251,159,58,0.3)',borderRadius:'var(--r-sm)',padding:'10px 14px',display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:16}}>⚠️</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:'var(--amber)'}}>Possible duplicate</div>
                      <div style={{fontSize:11,color:'var(--mist3)'}}>A period already exists for this date. You can still proceed if this is intentional.</div>
                    </div>
                  </div>
                )}
                {/* Legend */}
                <div style={{display:'flex',gap:16,fontSize:11,color:'var(--mist3)',padding:'4px 0'}}>
                  <span><span style={{color:'var(--emerald)',fontWeight:700}}>Paid</span> — present & paid</span>
                  <span><span style={{color:'var(--amber)',fontWeight:700}}>Owes</span> — present, didn't pay</span>
                  <span><span style={{color:'var(--mist3)',fontWeight:700}}>Out</span> — absent</span>
                </div>
                {brp.mode==='same' && (
                  <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'10px 14px',display:'flex',alignItems:'center',gap:12,marginBottom:4}}>
                    <span style={{fontSize:12,color:'var(--mist2)',flex:1}}>Amount for all charged students</span>
                    <input type='number' value={brp.same_amount}
                      onChange={e=>{brf('same_amount')(e.target.value);setBrpRows(p=>p.map(r=>r.state!=='excluded'?{...r,amount:e.target.value}:r))}}
                      style={{width:100,padding:'6px 10px',background:'var(--ink)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',color:'var(--white)',fontSize:13,textAlign:'right'}}/>
                  </div>
                )}
                <div style={{maxHeight:360,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
                  {brpRows.map((r,i)=>{
                    const cls = classes.find(c=>c.id===r.student.class_id)
                    const isExcluded = r.state==='excluded'
                    const borderColor = r.state==='paid'?'var(--line)':r.state==='owes'?'rgba(251,159,58,0.3)':'rgba(255,255,255,0.04)'
                    return (
                      <div key={r.student.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'var(--ink3)',borderRadius:'var(--r-sm)',border:`1px solid ${borderColor}`,opacity:isExcluded?0.5:1}}>
                        <Avatar name={fullName(r.student,true)} photo={r.student.photo} size={28}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:isExcluded?'var(--mist3)':'var(--white)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{fullName(r.student,true)}</div>
                          <div style={{fontSize:11,color:'var(--mist3)'}}>{cls?.name||'--'}{r.existingBalance>0&&<span style={{color:'var(--rose)',marginLeft:6}}>Prev. owes {fmtMoney(r.existingBalance,currency)}</span>}{r.isNew&&<span style={{color:'var(--sky)',marginLeft:6,fontWeight:600}}>New</span>}</div>
                        </div>
                        {/* 3-way toggle */}
                        <div style={{display:'flex',borderRadius:8,overflow:'hidden',border:'1px solid var(--line)',flexShrink:0}}>
                          {[{v:'paid',label:'Paid',color:'var(--emerald)'},{v:'owes',label:'Owes',color:'var(--amber)'},{v:'excluded',label:'Out',color:'var(--mist3)'}].map(opt=>(
                            <button key={opt.v} onClick={()=>setBrpRows(p=>p.map((x,j)=>j===i?{...x,state:opt.v}:x))}
                              style={{padding:'5px 10px',fontSize:11,fontWeight:700,cursor:'pointer',transition:'all 0.15s',border:'none',
                                background:r.state===opt.v?opt.color:'var(--ink)',
                                color:r.state===opt.v?'var(--ink)':'var(--mist3)'}}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {r.state==='paid' && (
                          <input type='number' value={r.amount}
                            onChange={e=>setBrpRows(p=>p.map((x,j)=>j===i?{...x,amount:e.target.value}:x))}
                            style={{width:80,padding:'5px 8px',background:'var(--ink)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',color:'var(--white)',fontSize:13,textAlign:'right'}}/>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:4}}>
                  <div style={{fontSize:12,color:'var(--mist3)'}}>
                    Collecting: <strong style={{color:'var(--emerald)'}}>{fmtMoney(brpRows.filter(r=>r.state==='paid').reduce((a,r)=>a+parseFloat(r.amount||0),0),currency)}</strong>
                    {brpRows.filter(r=>r.state==='owes').length>0&&<span style={{marginLeft:8}}>Outstanding: <strong style={{color:'var(--amber)'}}>{fmtMoney(brpRows.filter(r=>r.state==='owes').reduce((a,r)=>a+parseFloat(r.amount||0),0),currency)}</strong></span>}
                  </div>
                  <div style={{display:'flex',gap:10}}>
                    <Btn variant='ghost' onClick={()=>setBrpStep(1)}>← Back</Btn>
                    <Btn onClick={confirmBrp} disabled={brpSaving||brpRows.filter(r=>r.state!=='excluded').length===0}>
                      {brpSaving?<><Spinner/> Recording...</>:`Confirm — ${brpRows.filter(r=>r.state!=='excluded').length} Student${brpRows.filter(r=>r.state!=='excluded').length!==1?'s':''}`}
                    </Btn>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 — Done + receipt prompt */}
            {brpStep===3 && brpDone && (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:'8px 0'}}>
                <div style={{fontSize:40}}>✅</div>
                <div style={{fontSize:16,fontWeight:700,color:'var(--white)',textAlign:'center'}}>
                  {brpDone.count} paid{brpDone.owesCount>0?` · ${brpDone.owesCount} outstanding`:''}
                </div>
                <div style={{fontSize:13,color:'var(--mist3)',textAlign:'center'}}>
                  <strong style={{color:'var(--gold)'}}>{brpDone.periodRow.label}</strong> · {brpDone.tmpl.name}
                </div>
                <div style={{fontSize:13,color:'var(--mist2)',fontWeight:600,marginTop:4}}>Print receipts?</div>
                <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
                  <Btn variant='secondary' onClick={()=>printBulkCombined(brpDone)}>⎙ Combined Receipt</Btn>
                  <PlanGate planHook={planHook} feature='feeReceipts' mode='inline'>
                    <Btn variant='secondary' onClick={()=>printBulkIndividual(brpDone)}>⎙ Individual Receipts</Btn>
                  </PlanGate>
                </div>
                <Btn variant='ghost' onClick={closeBrp} style={{marginTop:4}}>Done</Btn>
              </div>
            )}
          </Modal>
        )}

        {confirmTmplDelete && <ConfirmModal {...confirmTmplDelete} onClose={()=>setConfirmTmplDelete(null)}/>}
      </>)}

      {/* ══════════════ PAYMENT HISTORY TAB ══════════════ */}
      {feeActiveTab==='history' && (<>

        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16,marginBottom:24}}>
          <KPI label='Total Collected' value={fmtMoney(phTotalCollected,currency)} color='var(--emerald)' sub={`${phFiltered.length} payment${phFiltered.length!==1?'s':''}`} index={0}/>
          <KPI label='Receipts Issued' value={phReceiptsIssued} color='var(--gold)' sub='With receipt number' index={1}/>
          <KPI label='Students Paid'   value={[...new Set(phFiltered.map(p=>p.fee_obj?.student_id).filter(Boolean))].length} color='var(--sky)' sub='Unique students' index={2}/>
          <KPI label='Classes'         value={[...new Set(phFiltered.map(p=>p.class_id).filter(Boolean))].length} color='var(--mist)' sub='Represented' index={3}/>
        </div>

        {/* Filters */}
        <Card style={{marginBottom:16,padding:'14px 20px'}}>
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
            <div style={{position:'relative',flex:'1 1 200px'}}>
              <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--mist3)',fontSize:14}}>⌕</span>
              <input value={phSearch} onChange={e=>setPhSearch(e.target.value)} placeholder='Search student, receipt, recorder...'
                style={{width:'100%',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px 8px 36px',color:'var(--white)',fontSize:13}}/>
            </div>
            <select value={phClass} onChange={e=>{setPhClass(e.target.value);setPhStudent('')}}
              style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',flex:'1 1 130px'}}>
              <option value=''>All Classes</option>
              {myClasses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={phStudent} onChange={e=>setPhStudent(e.target.value)}
              style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',flex:'1 1 140px'}}>
              <option value=''>All Students</option>
              {phStudentsInClass.sort((a,b)=>(a.last_name||'').localeCompare(b.last_name||'')).map(s=><option key={s.id} value={s.id}>{fullName(s,true)}</option>)}
            </select>
            <select value={phFeeType} onChange={e=>setPhFeeType(e.target.value)}
              style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',flex:'1 1 130px'}}>
              <option value=''>All Fee Types</option>
              {phFeeTypes.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            <input type='date' value={phDateFrom} onChange={e=>setPhDateFrom(e.target.value)}
              title='From date'
              style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 12px',color:'var(--mist)',fontSize:13,flex:'1 1 120px'}}/>
            <input type='date' value={phDateTo} onChange={e=>setPhDateTo(e.target.value)}
              title='To date'
              style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 12px',color:'var(--mist)',fontSize:13,flex:'1 1 120px'}}/>
            {(phSearch||phClass||phStudent||phFeeType||phDateFrom||phDateTo) && (
              <button onClick={()=>{setPhSearch('');setPhClass('');setPhStudent('');setPhFeeType('');setPhDateFrom('');setPhDateTo('')}}
                style={{background:'transparent',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 12px',color:'var(--mist3)',fontSize:12,cursor:'pointer'}}>
                ✕ Clear
              </button>
            )}
          </div>
        </Card>

        {/* Payment History Table */}
        <Card>
          {phFiltered.length===0
            ? <div style={{padding:'40px 0',textAlign:'center',color:'var(--mist3)',fontSize:14}}>No payment records found.</div>
            : (
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr>
                      {['Date / Time','Receipt No','Student','Fee Type','Amount','Recorded By',''].map(h=>(
                        <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',borderBottom:'1px solid var(--line)',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...phFiltered].sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||'')).map((p,i)=>{
                      const dt = p.created_at ? new Date(p.created_at) : null
                      const dateStr  = dt ? dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '--'
                      const timeStr  = dt ? dt.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : ''
                      return (
                        <tr key={p.id} style={{borderBottom:'1px solid var(--line)',transition:'background 0.12s',cursor:'pointer'}}
                          onMouseEnter={e=>e.currentTarget.style.background='var(--ink3)'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                          onClick={()=>setPhDetail(p)}>
                          {/* Date */}
                          <td style={{padding:'12px 14px',whiteSpace:'nowrap'}}>
                            <div style={{fontSize:13,fontWeight:600,color:'var(--mist)'}}>{dateStr}</div>
                            <div style={{fontSize:11,color:'var(--mist3)',marginTop:2}}>{timeStr}</div>
                          </td>
                          {/* Receipt */}
                          <td style={{padding:'12px 14px'}}>
                            {p.receipt_no
                              ? <span style={{fontFamily:'monospace',fontSize:12,fontWeight:700,color:'var(--gold)',background:'rgba(232,184,75,0.1)',border:'1px solid rgba(232,184,75,0.25)',borderRadius:4,padding:'3px 8px'}}>{p.receipt_no}</span>
                              : <span style={{color:'var(--mist3)',fontSize:12}}>—</span>}
                          </td>
                          {/* Student */}
                          <td style={{padding:'12px 14px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <Avatar name={p.student_name} size={26} photo={p.student_photo}/>
                              <div>
                                <div style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{p.student_name}</div>
                                <Badge color='var(--sky)' bg='rgba(91,168,245,0.08)'>{p.class_name}</Badge>
                              </div>
                            </div>
                          </td>
                          {/* Fee Type */}
                          <td style={{padding:'12px 14px'}}>
                            <div style={{fontSize:13,color:'var(--mist)'}}>{p.fee_type}</div>
                            {p.period && <Badge color='var(--mist2)' bg='rgba(255,255,255,0.05)'>{p.period}</Badge>}
                          </td>
                          {/* Amount */}
                          <td style={{padding:'12px 14px'}}>
                            <span style={{fontFamily:'monospace',fontSize:14,fontWeight:700,color:'var(--emerald)'}}>{fmtMoney(Number(p.amount||0),currency)}</span>
                          </td>
                          {/* Recorded By */}
                          <td style={{padding:'12px 14px'}}>
                            <div style={{fontSize:12,color:'var(--mist2)'}}>{p.recorded_by_name||'--'}</div>
                          </td>
                          {/* Actions */}
                          <td style={{padding:'12px 14px'}} onClick={e=>e.stopPropagation()}>
                            <div style={{display:'flex',gap:6}}>
                              <Btn size='sm' variant='ghost' onClick={()=>setPhDetail(p)}>Details</Btn>
                              {p.fee_obj && (
                                <PlanGate planHook={planHook} feature='feeReceipts' mode='inline'>
                                  <Btn size='sm' variant='ghost' onClick={()=>{
                                    const feePayments=payments.filter(x=>x.fee_id===p.fee_id)
                                    printReceipt({fee:p.fee_obj,feePayments,student:p.student_obj,cls:p.cls_obj,settings,currency})
                                  }}>⎙</Btn>
                                </PlanGate>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          }
        </Card>

        {/* ── Payment Detail Modal ── */}
        {phDetail && (()=>{
          const p      = phDetail
          const feePs  = payments.filter(x=>x.fee_id===p.fee_id)
          const totalFeeP = feePs.reduce((a,x)=>a+Number(x.amount||0),0)
          const balance   = Math.max(0, Number(p.fee_obj?.amount||0) - Math.max(Number(p.fee_obj?.paid||0), totalFeeP))
          const dt = p.created_at ? new Date(p.created_at) : null
          return (
            <Modal title='Payment Details' onClose={()=>setPhDetail(null)} width={500}>
              {/* Student + class */}
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r)',marginBottom:20}}>
                <Avatar name={p.student_name} size={44} photo={p.student_photo}/>
                <div>
                  <div style={{fontSize:16,fontWeight:700,color:'var(--white)'}}>{p.student_name}</div>
                  <div style={{display:'flex',gap:8,marginTop:4,flexWrap:'wrap',alignItems:'center'}}>
                    <Badge color='var(--sky)' bg='rgba(91,168,245,0.08)'>{p.class_name}</Badge>
                    {p.student_id_no && <span style={{fontFamily:'monospace',fontSize:11,color:'var(--gold)',background:'rgba(232,184,75,0.08)',border:'1px solid rgba(232,184,75,0.2)',borderRadius:4,padding:'2px 7px'}}>{p.student_id_no}</span>}
                  </div>
                </div>
              </div>

              {/* Fee info */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10,marginBottom:16}}>
                {[
                  ['Fee Type',   p.fee_type,                                      'var(--mist)'],
                  ['Period',     p.period||'--',                                  'var(--sky)'],
                  ['Fee Amount', fmtMoney(Number(p.fee_obj?.amount||0),currency), 'var(--mist)'],
                  ['Total Paid', fmtMoney(Math.max(Number(p.fee_obj?.paid||0),totalFeeP),currency), 'var(--emerald)'],
                  ['Balance',    fmtMoney(balance,currency),                      balance>0?'var(--rose)':'var(--emerald)'],
                  ['Payments',   feePs.length+' payment'+(feePs.length!==1?'s':''), 'var(--mist2)'],
                ].map(([l,v,c])=>(
                  <div key={l} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'10px 14px'}}>
                    <div style={{fontSize:10,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>{l}</div>
                    <div style={{fontSize:14,fontWeight:700,color:c,fontFamily:l==='Fee Type'||l==='Period'||l==='Payments'?'inherit':'monospace'}}>{v}</div>
                  </div>
                ))}
              </div>

              {/* This payment */}
              <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:'14px 16px',marginBottom:16}}>
                <div style={{fontSize:10,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:12}}>This Payment</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <span style={{fontSize:13,color:'var(--mist2)'}}>Amount Paid</span>
                  <span style={{fontFamily:'monospace',fontSize:20,fontWeight:800,color:'var(--emerald)'}}>{fmtMoney(Number(p.amount||0),currency)}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <span style={{fontSize:12,color:'var(--mist3)'}}>Receipt No</span>
                  {p.receipt_no
                    ? <span style={{fontFamily:'monospace',fontSize:13,fontWeight:700,color:'var(--gold)',background:'rgba(232,184,75,0.1)',border:'1px solid rgba(232,184,75,0.25)',borderRadius:4,padding:'3px 10px'}}>{p.receipt_no}</span>
                    : <span style={{color:'var(--mist3)',fontSize:12}}>Not issued</span>}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <span style={{fontSize:12,color:'var(--mist3)'}}>Recorded By</span>
                  <span style={{fontSize:13,color:'var(--mist2)'}}>{p.recorded_by_name||'--'}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:12,color:'var(--mist3)'}}>Date & Time</span>
                  <span style={{fontSize:12,color:'var(--mist2)'}}>{dt?dt.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'--'}</span>
                </div>
              </div>

              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                {p.fee_obj && (
                  <PlanGate planHook={planHook} feature='feeReceipts' mode='inline'>
                    <Btn variant='ghost' onClick={()=>{
                      printReceipt({fee:p.fee_obj,feePayments:feePs,student:p.student_obj,cls:p.cls_obj,settings,currency})
                    }}>⎙ Print Receipt</Btn>
                  </PlanGate>
                )}
                <Btn onClick={()=>setPhDetail(null)}>Close</Btn>
              </div>
            </Modal>
          )
        })()}

      </>)}

      {/* ── Single Add Fee Modal ── */}
      {modal && (
        <Modal title='Add Fee Record' onClose={()=>setModal(false)}>
          <Field label='Student' value={form.student_id} onChange={f('student_id')} required options={studentsInClass.map(s=>({value:s.id,label:`${fullName(s,true)} · ${classes.find(c=>c.id===s.class_id)?.name||''}`}))}/>
          <Field label='Fee Type' value={form.fee_type} onChange={f('fee_type')} placeholder='e.g. Tuition, Activity Fee' required/>
          <Field label='Period' value={form.period} onChange={f('period')} options={feePeriods.map(p=>({value:p,label:p}))}/>
          <Field label='Amount' value={form.amount} onChange={f('amount')} type='number' required/>
          <Field label='Due Date (optional)' value={form.due_date} onChange={f('due_date')} type='date'/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={saveFee} disabled={saving}>{saving?<><Spinner/> Saving...</>:'Save'}</Btn>
          </div>
        </Modal>
      )}

      {/* ── Edit Fee Modal ── */}
      {editFeeModal && editFeeRow && (
        <Modal title='Edit Fee Record' subtitle={editFeeRow.student_name} onClose={()=>setEditFeeModal(false)}>
          {editFeeRow.effectivePaid>0 && (
            <div style={{fontSize:12,color:'var(--amber)',background:'rgba(251,159,58,0.08)',border:'1px solid rgba(251,159,58,0.2)',borderRadius:'var(--r-sm)',padding:'8px 12px',marginBottom:16}}>
              ⚠ This fee has existing payments ({fmtMoney(editFeeRow.effectivePaid,currency)} paid). Editing the amount will affect the balance.
            </div>
          )}
          <Field label='Fee Type' value={editFeeForm.fee_type} onChange={eff('fee_type')} placeholder='e.g. Tuition, Activity Fee' required/>
          <Field label='Period' value={editFeeForm.period} onChange={eff('period')} options={feePeriods.map(p=>({value:p,label:p}))}/>
          <Field label='Amount' value={editFeeForm.amount} onChange={eff('amount')} type='number' required/>
          <Field label='Due Date (optional)' value={editFeeForm.due_date} onChange={eff('due_date')} type='date'/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setEditFeeModal(false)}>Cancel</Btn>
            <Btn onClick={saveEditFee} disabled={saving}>{saving?<><Spinner/> Saving...</>:'Save Changes'}</Btn>
          </div>
        </Modal>
      )}

      {/* ── Record Payment Modal ── */}
      {payModal && editFee && (
        <Modal title='Record Payment' subtitle={`${editFee.student_name} · ${editFee.fee_type}${editFee.period?' · '+editFee.period:''}`} onClose={()=>setPayModal(false)}>
          <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:18,marginBottom:20,display:'flex',gap:24,flexWrap:'wrap'}}>
            {[['Total',fmtMoney(editFee.amount,currency),'var(--mist)'],['Paid',fmtMoney(editFee.effectivePaid,currency),'var(--emerald)'],['Balance',fmtMoney(editFee.balance,currency),'var(--rose)']].map(([l,v,c])=>(
              <div key={l}><div className='d' style={{fontSize:10,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>{l}</div><div className='d' style={{fontSize:20,fontWeight:700,color:c}}>{v}</div></div>
            ))}
          </div>
          <Field label='Payment Amount' value={payForm.amount} onChange={pf('amount')} type='number'/>
          {parseFloat(payForm.amount)>editFee.balance && (
            <div style={{fontSize:12,color:'var(--rose)',background:'rgba(240,107,122,0.08)',border:'1px solid rgba(240,107,122,0.2)',borderRadius:'var(--r-sm)',padding:'8px 12px',marginTop:-10,marginBottom:12}}>
              ⚠ Amount exceeds balance of {fmtMoney(editFee.balance,currency)}
            </div>
          )}
          <p style={{fontSize:11,color:'var(--mist3)',marginTop:-10,marginBottom:16}}>A receipt will open automatically after saving.</p>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setPayModal(false)}>Cancel</Btn>
            <Btn onClick={recordPayment} disabled={saving}>{saving?<><Spinner/> Saving...</>:'Confirm Payment'}</Btn>
          </div>
        </Modal>
      )}

      {/* ── Bulk Add Fee Modal ── */}
      {bulkModal && (
        <Modal title='Bulk Add Fee' subtitle={`Step ${bulkStep} of 4`} onClose={closeBulk} width={560}>

          {/* ── STEP 1 ── */}
          {bulkStep===1 && (
            <div>
              <Field label='Fee Type' value={bulk.fee_type} onChange={bf('fee_type')} placeholder='e.g. Tuition, Feeding Fee, Books' required/>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'0 16px'}}>
                <Field label='Period' value={bulk.period} onChange={bf('period')} options={feePeriods.map(p=>({value:p,label:p}))}/>
                <Field label='Default Amount' value={bulk.default_amount} onChange={bf('default_amount')} type='number' placeholder='0.00' required/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'0 16px'}}>
                <Field label='Due Date (optional)' value={bulk.due_date} onChange={bf('due_date')} type='date'/>
                <div/>
              </div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10,fontFamily:"'Clash Display',sans-serif"}}>
                  Select Classes <span style={{color:'var(--gold)',marginLeft:3}}>*</span>
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {classesWithStudents.map(c=>{
                    const sel = bulk.selected_classes.includes(c.id)
                    const cnt = activeStudents.filter(s=>s.class_id===c.id).length
                    return (
                      <button key={c.id} onClick={()=>toggleClass(c.id)}
                        style={{
                          padding:'7px 14px',borderRadius:20,fontSize:13,fontWeight:600,cursor:'pointer',
                          transition:'all 0.15s',fontFamily:"'Cabinet Grotesk',sans-serif",
                          background: sel ? 'rgba(232,184,75,0.15)' : 'var(--ink4)',
                          color:      sel ? 'var(--gold)'           : 'var(--mist2)',
                          border:     `1px solid ${sel ? 'var(--gold)' : 'var(--line)'}`,
                          boxShadow:  sel ? '0 0 0 1px rgba(232,184,75,0.2)' : 'none',
                        }}>
                        {c.name}
                        <span style={{fontSize:10,marginLeft:6,opacity:0.7,fontWeight:400}}>({cnt})</span>
                      </button>
                    )
                  })}
                </div>
                {hiddenClassCount>0 && (
                  <div style={{marginTop:10,fontSize:11,color:'var(--mist3)'}}>
                    {hiddenClassCount} class{hiddenClassCount!==1?'es':''} hidden — no active students.
                  </div>
                )}
                {bulk.selected_classes.length>0 && (
                  <div style={{marginTop:10,fontSize:12,color:'var(--mist2)'}}>
                    <strong style={{color:'var(--white)'}}>{bulk.selected_classes.length}</strong> class{bulk.selected_classes.length!==1?'es':''} selected
                    {' · '}<strong style={{color:'var(--white)'}}>{activeStudents.filter(s=>bulk.selected_classes.includes(s.class_id)).length}</strong> students
                  </div>
                )}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
                <Btn variant='ghost' onClick={closeBulk}>Cancel</Btn>
                <Btn onClick={goToStudentStep} disabled={!step1Valid}>Next — Select Students &rarr;</Btn>
              </div>
            </div>
          )}

          {/* ── STEP 2 — Student Ticker ── */}
          {bulkStep===2 && (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{fontSize:12,color:'var(--mist3)',marginBottom:4}}>
                <strong style={{color:'var(--white)'}}>{bulkStudentRows.filter(r=>r.checked).length}</strong> of <strong style={{color:'var(--white)'}}>{bulkStudentRows.length}</strong> students selected · Uncheck anyone to exclude from this fee
              </div>
              <div style={{maxHeight:400,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
                {bulk.selected_classes.map(cid=>{
                  const cls = classes.find(c=>c.id===cid)
                  const clsRows = bulkStudentRows.filter(r=>r.class_id===cid)
                  return (
                    <div key={cid}>
                      <div style={{fontSize:10,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',padding:'8px 2px 6px',fontFamily:"'Clash Display',sans-serif"}}>{cls?.name}</div>
                      {clsRows.map((r,i)=>{
                        const globalIdx = bulkStudentRows.indexOf(r)
                        return (
                          <div key={r.student.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'var(--ink3)',borderRadius:'var(--r-sm)',border:`1px solid ${r.checked?'var(--line)':'rgba(255,255,255,0.04)'}`,marginBottom:4}}>
                            <input type='checkbox' checked={r.checked}
                              onChange={e=>setBulkStudentRows(p=>p.map((x,j)=>j===globalIdx?{...x,checked:e.target.checked}:x))}
                              style={{accentColor:'var(--gold)',width:16,height:16,cursor:'pointer',flexShrink:0}}/>
                            <Avatar name={fullName(r.student,true)} photo={r.student.photo} size={28}/>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:13,fontWeight:600,color:r.checked?'var(--white)':'var(--mist3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{fullName(r.student,true)}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',gap:10,marginTop:4}}>
                <Btn variant='ghost' onClick={()=>setBulkStep(1)}>&larr; Back</Btn>
                <Btn onClick={goToAmountStep} disabled={bulkStudentRows.filter(r=>r.checked).length===0}>Next — Set Amounts &rarr;</Btn>
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {bulkStep===3 && (
            <div>
              <p style={{fontSize:13,color:'var(--mist2)',marginBottom:16,lineHeight:1.6}}>
                Each class has been pre-filled with your default amount. Adjust any that differ.
              </p>
              <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
                {step2Rows.map(({cid,cls,count,amount})=>(
                  <div key={cid} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'14px 16px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap: isMobile?'wrap':'nowrap'}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:14}}>{cls?.name||'--'}</div>
                        <div style={{fontSize:12,color:'var(--mist3)',marginTop:2}}>{count} active student{count!==1?'s':''}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                        <span style={{fontSize:12,color:'var(--mist3)',whiteSpace:'nowrap'}}>{currency.position==='before'?currency.symbol:''}</span>
                        <input
                          type='number'
                          value={amount}
                          onChange={e=>setClassAmounts(p=>({...p,[cid]:e.target.value}))}
                          style={{width:120,background:'var(--ink4)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 12px',color:'var(--white)',fontSize:14,textAlign:'right',fontFamily:"'Cabinet Grotesk',sans-serif"}}
                          onFocus={e=>{e.target.style.borderColor='var(--gold)';e.target.style.boxShadow='0 0 0 3px rgba(232,184,75,0.08)'}}
                          onBlur={e=>{e.target.style.borderColor='var(--line)';e.target.style.boxShadow='none'}}
                        />
                        {currency.position==='after'&&<span style={{fontSize:12,color:'var(--mist3)'}}>{currency.symbol}</span>}
                      </div>
                    </div>
                    {amount&&parseFloat(amount)>0&&(
                      <div style={{marginTop:8,fontSize:11,color:'var(--mist3)'}}>
                        Subtotal: <span style={{color:'var(--mist)'}}>{fmtMoney(parseFloat(amount)*count,currency)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Running total */}
              <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'14px 18px',marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
                <div>
                  <div style={{fontSize:11,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:2,fontFamily:"'Clash Display',sans-serif"}}>Total Obligation</div>
                  <div className='d' style={{fontSize:22,fontWeight:700,color:'var(--gold)'}}>{fmtMoney(step2TotalAmount,currency)}</div>
                </div>
                <div style={{fontSize:12,color:'var(--mist3)',textAlign:'right'}}>
                  <div><strong style={{color:'var(--white)'}}>{step2TotalStudents}</strong> students</div>
                  <div><strong style={{color:'var(--white)'}}>{step2Rows.length}</strong> classes</div>
                </div>
              </div>

              <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
                <Btn variant='ghost' onClick={()=>setBulkStep(2)}>&larr; Back</Btn>
                <Btn onClick={()=>setBulkStep(4)} disabled={!step2Valid}>Next — Preview &rarr;</Btn>
              </div>
            </div>
          )}

          {/* ── STEP 4 ── */}
          {bulkStep===4 && (
            <div>
              {/* Summary card */}
              <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:20,marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14,fontFamily:"'Clash Display',sans-serif"}}>Summary</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'10px 20px'}}>
                  {[
                    ['Fee Type',   bulk.fee_type],
                    ['Period',     bulk.period],
                    ['Year',       activeYear],
                    ['Due Date',   bulk.due_date || 'Not set'],
                    ['Classes',    `${bulk.selected_classes.length} selected`],
                  ].map(([l,v])=>(
                    <div key={l}>
                      <div style={{fontSize:10,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:3}}>{l}</div>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid var(--line)',display:'flex',gap:24,flexWrap:'wrap'}}>
                  <div>
                    <div style={{fontSize:10,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4,fontFamily:"'Clash Display',sans-serif"}}>Records to Create</div>
                    <div className='d' style={{fontSize:26,fontWeight:700,color:'var(--emerald)'}}>{toCreate}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4,fontFamily:"'Clash Display',sans-serif"}}>Total Amount</div>
                    <div className='d' style={{fontSize:26,fontWeight:700,color:'var(--gold)'}}>{fmtMoney(step3TotalAmount,currency)}</div>
                  </div>
                </div>
              </div>

              {/* Per-class breakdown */}
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8,fontFamily:"'Clash Display',sans-serif"}}>Per Class</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {step2Rows.map(({cid,cls,count,amount})=>(
                    <div key={cid} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'var(--ink3)',borderRadius:'var(--r-sm)',fontSize:13}}>
                      <span style={{fontWeight:500}}>{cls?.name}</span>
                      <span style={{color:'var(--mist3)'}}>{count} students · <span style={{color:'var(--mist)'}}>{fmtMoney(parseFloat(amount)||0,currency)} each</span></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duplicate warning */}
              {toSkip>0 && (
                <div style={{background:'rgba(251,159,58,0.06)',border:'1px solid rgba(251,159,58,0.25)',borderRadius:'var(--r-sm)',padding:'10px 14px',marginBottom:16,fontSize:12,color:'var(--amber)',display:'flex',gap:8,alignItems:'flex-start'}}>
                  <span style={{flexShrink:0}}>(!)</span>
                  <span><strong>{toSkip} student{toSkip!==1?'s':''}</strong> already have <em>{bulk.fee_type}</em> for {bulk.period} and will be skipped.</span>
                </div>
              )}

              {toCreate===0 && (
                <div style={{background:'rgba(240,107,122,0.06)',border:'1px solid rgba(240,107,122,0.25)',borderRadius:'var(--r-sm)',padding:'10px 14px',marginBottom:16,fontSize:12,color:'var(--rose)',display:'flex',gap:8}}>
                  <span>(!)</span>
                  <span>All selected students already have this fee. Nothing will be created.</span>
                </div>
              )}

              <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
                <Btn variant='ghost' onClick={()=>setBulkStep(3)}>&larr; Back</Btn>
                <Btn onClick={confirmBulk} disabled={bulkSaving||toCreate===0}>
                  {bulkSaving?<><Spinner/> Adding...</>:`Confirm — Add ${toCreate} Record${toCreate!==1?'s':''}`}
                </Btn>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ── Bulk Collect Payment Modal ── */}
      {bcpModal && (
        <Modal title='Bulk Collect Payment' subtitle={`Step ${bcpStep} of 3`} onClose={closeBcp} width={560}>

          {/* Step 1 — Fee type + filters */}
          {bcpStep===1 && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'var(--mist2)',marginBottom:6}}>Fee Type ✦</div>
                <select value={bcp.fee_type} onChange={e=>{bcf('fee_type')(e.target.value);bcf('period')('')}}
                  style={{width:'100%',padding:'10px 12px',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',color:bcp.fee_type?'var(--white)':'var(--mist3)',fontSize:13}}>
                  <option value=''>Select fee type…</option>
                  {feeTypes.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'var(--mist2)',marginBottom:6}}>Period ✦</div>
                <select value={bcp.period} onChange={e=>bcf('period')(e.target.value)}
                  style={{width:'100%',padding:'10px 12px',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',color:bcp.period?'var(--white)':'var(--mist3)',fontSize:13}}>
                  <option value=''>Select a period…</option>
                  {feePeriodLabels.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'var(--mist2)',marginBottom:8}}>Classes <span style={{color:'var(--mist3)',fontWeight:400}}>(optional — leave blank for all)</span></div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {classesWithStudents.map(c=>{
                    const sel = (bcp.class_ids||[]).includes(c.id)
                    return (
                      <button key={c.id} onClick={()=>bcf('class_ids')(sel?(bcp.class_ids||[]).filter(x=>x!==c.id):[...(bcp.class_ids||[]),c.id])}
                        style={{padding:'6px 14px',borderRadius:20,fontSize:13,fontWeight:600,cursor:'pointer',transition:'all 0.15s',
                          background:sel?'rgba(232,184,75,0.15)':'var(--ink4)',
                          color:sel?'var(--gold)':'var(--mist2)',
                          border:`1px solid ${sel?'var(--gold)':'var(--line)'}`}}>
                        {c.name}
                      </button>
                    )
                  })}
                </div>
                {(bcp.class_ids||[]).length>0 && (
                  <div style={{fontSize:11,color:'var(--mist3)',marginTop:6}}>{(bcp.class_ids||[]).length} class{(bcp.class_ids||[]).length!==1?'es':''} selected</div>
                )}
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:4}}>
                <Btn variant='ghost' onClick={closeBcp}>Cancel</Btn>
                <Btn onClick={bcpGoStep2} disabled={!bcp.fee_type}>Next — Select Students &rarr;</Btn>
              </div>
            </div>
          )}

          {/* Step 2 — Student list */}
          {bcpStep===2 && (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{fontSize:12,color:'var(--mist3)',marginBottom:4}}>
                Showing <strong style={{color:'var(--white)'}}>{bcpRows.length}</strong> students with outstanding balances for <strong style={{color:'var(--gold)'}}>{bcp.fee_type}</strong>
              </div>
              {/* Same amount override */}
              <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'10px 14px',display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:12,color:'var(--mist2)',flex:1}}>Override amount for all <span style={{color:'var(--mist3)'}}>(capped at each student's balance)</span></span>
                <input type='number' value={bcp.same_amount} placeholder='—'
                  onChange={e=>{
                    const val = e.target.value
                    bcf('same_amount')(val)
                    setBcpRows(p=>p.map(r=>{
                      const capped = val ? Math.min(parseFloat(val)||0, r.balance) : r.balance
                      return {...r, amount:String(capped)}
                    }))
                  }}
                  style={{width:100,padding:'6px 10px',background:'var(--ink)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',color:'var(--white)',fontSize:13,textAlign:'right'}}/>
              </div>
              <div style={{maxHeight:360,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
                {bcpRows.map((r,i)=>{
                  const cls = classes.find(c=>c.id===r.student.class_id)
                  const isOverpaying = parseFloat(r.amount||0) > r.balance
                  return (
                    <div key={r.student.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'var(--ink3)',borderRadius:'var(--r-sm)',border:`1px solid ${isOverpaying?'var(--rose)':r.checked?'var(--line)':'rgba(255,255,255,0.04)'}`}}>
                      <input type='checkbox' checked={r.checked}
                        onChange={e=>setBcpRows(p=>p.map((x,j)=>j===i?{...x,checked:e.target.checked}:x))}
                        style={{accentColor:'var(--gold)',width:16,height:16,cursor:'pointer',flexShrink:0}}/>
                      <Avatar name={fullName(r.student,true)} photo={r.student.photo} size={28}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:r.checked?'var(--white)':'var(--mist3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{fullName(r.student,true)}</div>
                        <div style={{fontSize:11,color:'var(--mist3)'}}>{cls?.name||'--'} · <span style={{color:'var(--rose)'}}>Owes {fmtMoney(r.balance,currency)}</span>{isOverpaying&&<span style={{color:'var(--rose)',marginLeft:6,fontWeight:700}}>⚠ Exceeds balance</span>}</div>
                      </div>
                      <input type='number' value={r.amount} disabled={!r.checked}
                        onChange={e=>{
                          const val = parseFloat(e.target.value)||0
                          const capped = Math.min(val, r.balance)
                          setBcpRows(p=>p.map((x,j)=>j===i?{...x,amount:String(capped)}:x))
                        }}
                        style={{width:90,padding:'5px 8px',background:'var(--ink)',border:`1px solid ${isOverpaying?'var(--rose)':'var(--line)'}`,borderRadius:'var(--r-sm)',color:'var(--white)',fontSize:13,textAlign:'right',opacity:r.checked?1:0.4}}/>
                    </div>
                  )
                })}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:4}}>
                <div style={{fontSize:12,color:'var(--mist3)'}}>Total: <strong style={{color:'var(--emerald)'}}>{fmtMoney(bcpRows.filter(r=>r.checked).reduce((a,r)=>a+parseFloat(r.amount||0),0),currency)}</strong></div>
                <div style={{display:'flex',gap:10}}>
                  <Btn variant='ghost' onClick={()=>setBcpStep(1)}>← Back</Btn>
                  <Btn onClick={confirmBcp} disabled={bcpSaving||bcpRows.filter(r=>r.checked).length===0}>
                    {bcpSaving?<><Spinner/> Recording...</>:`Confirm — ${bcpRows.filter(r=>r.checked).length} Student${bcpRows.filter(r=>r.checked).length!==1?'s':''}`}
                  </Btn>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Done + receipt prompt */}
          {bcpStep===3 && bcpDone && (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:'8px 0'}}>
              <div style={{fontSize:40}}>✅</div>
              <div style={{fontSize:16,fontWeight:700,color:'var(--white)',textAlign:'center'}}>
                Payments recorded for {bcpDone.count} student{bcpDone.count!==1?'s':''}
              </div>
              <div style={{fontSize:13,color:'var(--mist3)',textAlign:'center'}}>
                <strong style={{color:'var(--gold)'}}>{bcpDone.feeType}</strong> · {fmtMoney(bcpDone.selected.reduce((a,r)=>a+parseFloat(r.amount||0),0),currency)} total
              </div>
              <div style={{fontSize:13,color:'var(--mist2)',fontWeight:600,marginTop:4}}>Print receipts?</div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
                <Btn variant='secondary' onClick={()=>printBcpCombined(bcpDone)}>⎙ Combined Receipt</Btn>
                <PlanGate planHook={planHook} feature='feeReceipts' mode='inline'>
                  <Btn variant='secondary' onClick={()=>printBcpIndividual(bcpDone)}>⎙ Individual Receipts</Btn>
                </PlanGate>
              </div>
              <Btn variant='ghost' onClick={closeBcp} style={{marginTop:4}}>Done</Btn>
            </div>
          )}
        </Modal>
      )}

      {confirmState && <ConfirmModal {...confirmState} onClose={()=>setConfirmState(null)}/>}
    </div>
  )
}