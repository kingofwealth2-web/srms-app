import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useIsMobile } from '../lib/hooks'
import { ROLE_META, FEE_STATUS, CURRENCIES } from '../lib/constants'
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
export default function Fees({profile,data,setData,toast,settings,activeYear,isViewingPast,initialFeeFilter,onFilterConsumed}) {
  const {fees=[],students=[],classes=[],payments=[]} = data
  const currency = getCurrency(settings)
  const isMobile = useIsMobile()
  const canBulk = ['superadmin','admin'].includes(profile?.role)

  // ── Tab ──
  const [feeActiveTab, setFeeActiveTab] = useState('fees')

  // ── Single add / pay state ──
  const [search,setSearch]     = useState('')
  const [fstatus,setFstatus]   = useState(initialFeeFilter||'')
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

  // ── Go to step 2: seed classAmounts with default ──
  const goToStep2 = () => {
    if(!bulk.fee_type||!bulk.period||!bulk.default_amount||bulk.selected_classes.length===0) return
    const init = {}
    bulk.selected_classes.forEach(cid=>{ init[cid] = bulk.default_amount })
    setClassAmounts(init)
    setBulkStep(2)
  }

  // ── Step 2 totals ──
  const step2Rows = bulk.selected_classes.map(cid=>{
    const cls = classes.find(c=>c.id===cid)
    const count = activeStudents.filter(s=>s.class_id===cid).length
    return {cid, cls, count, amount: classAmounts[cid]||''}
  })
  const step2TotalStudents = step2Rows.reduce((a,r)=>a+r.count,0)
  const step2TotalAmount   = step2Rows.reduce((a,r)=>a+(parseFloat(r.amount)||0)*r.count,0)

  // ── Step 3: compute duplicates ──
  const computeBulkPreview = () => {
    let toCreate = 0, toSkip = 0
    bulk.selected_classes.forEach(cid=>{
      activeStudents.filter(s=>s.class_id===cid).forEach(s=>{
        const already = fees.some(f=>
          f.student_id===s.id &&
          f.fee_type===bulk.fee_type &&
          f.period===bulk.period &&
          f.academic_year===activeYear
        )
        if(already) toSkip++; else toCreate++
      })
    })
    return {toCreate, toSkip}
  }

  // ── Confirm bulk add ──
  const confirmBulk = async () => {
    setBulkSaving(true)
    try {
      const rows = []
      bulk.selected_classes.forEach(cid=>{
        const amount = parseFloat(classAmounts[cid])||0
        activeStudents.filter(s=>s.class_id===cid).forEach(s=>{
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

  const closeBulk = () => { setBulkModal(false); setBulkStep(1); setBulk(BULK_INIT); setClassAmounts({}) }

  // ── Existing fee helpers ──
  const today = new Date().toISOString().split('T')[0]
  const enriched = fees.map(fee=>{
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
    if(!r.student_name.toLowerCase().includes(search.toLowerCase())) return false
    if(fstatus==='Overdue' && !r.isOverdue) return false
    else if(fstatus && fstatus!=='Overdue' && r.status!==fstatus) return false
    return true
  })
  const overdueCount = enriched.filter(r=>r.isOverdue).length
  const totalOwed = fees.reduce((s,f)=>s+Number(f.amount||0),0)
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
    // Auto-open receipt
    const student = students.find(s=>s.id===editFee.student_id)
    const cls     = classes.find(c=>c.id===student?.class_id)
    printReceipt({
      fee:         updatedFee,
      feePayments: [payRow, ...feePayments],
      student, cls, settings, currency,
    })
  }

  const openReceipt = (fee) => {
    const feePayments = payments.filter(p=>p.fee_id===fee.id)
    const student = students.find(s=>s.id===fee.student_id)
    const cls     = classes.find(c=>c.id===student?.class_id)
    printReceipt({fee, feePayments, student, cls, settings, currency})
  }

  // ── Step 3 preview values ──
  const {toCreate, toSkip} = bulkStep===3 ? computeBulkPreview() : {toCreate:0,toSkip:0}
  const step3TotalAmount = step2Rows.reduce((a,r)=>a+(parseFloat(r.amount)||0)*activeStudents.filter(s=>s.class_id===r.cid).filter(s=>{
    return !fees.some(f=>f.student_id===s.id&&f.fee_type===bulk.fee_type&&f.period===bulk.period&&f.academic_year===activeYear)
  }).length, 0)

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
        {feeActiveTab==='fees' && !isViewingPast && <Btn onClick={openAdd}>+ Add Fee Record</Btn>}
      </PageHeader>

      {/* ── Tab switcher ── */}
      <div style={{display:'flex',gap:6,marginBottom:20,background:'var(--ink3)',borderRadius:12,padding:5,width:'fit-content',border:'1px solid var(--line)'}}>
        <button style={tabStyle(feeActiveTab==='fees')}    onClick={()=>setFeeActiveTab('fees')}>💳 Fees</button>
        <button style={tabStyle(feeActiveTab==='history')} onClick={()=>setFeeActiveTab('history')}>🧾 Payment History</button>
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
          <select value={fClassId} onChange={e=>setFClassId(e.target.value)} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:180}}>
            <option value=''>All Classes</option>
            {myClasses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
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
          {key:'fee_type',label:'Fee Type',render:(v,r)=>(<div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}><span>{v}</span>{r.period&&<Badge color='var(--sky)' bg='rgba(91,168,245,0.08)'>{r.period}</Badge>}{r.is_arrear&&<Badge color='var(--amber)' bg='rgba(251,159,58,0.1)'>Arrear from {r.arrear_from_year}</Badge>}{r.isOverdue&&<Badge color='var(--rose)' bg='rgba(240,107,122,0.1)'>Overdue</Badge>}</div>)},
          {key:'amount', label:'Amount',  render:v=><span className='mono'>{fmtMoney(v,currency)}</span>},
          {key:'paid',   label:'Paid',    render:(_,r)=><span className='mono' style={{color:'var(--emerald)'}}>{fmtMoney(r.effectivePaid,currency)}</span>},
          {key:'balance',label:'Balance', render:v=><span className='mono' style={{color:v>0?'var(--rose)':'var(--emerald)'}}>{fmtMoney(v,currency)}</span>},
          {key:'status', label:'Status',  render:v=><Badge color={FEE_STATUS[v]?.color} bg={FEE_STATUS[v]?.bg}>{v}</Badge>},
          {key:'receipt_no',label:'Receipt',render:v=>v?<span className='mono' style={{fontSize:12,color:'var(--mist2)'}}>{v}</span>:'--'},
          {key:'id',label:'',render:(_,r)=>isViewingPast?null:(
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}} onClick={e=>e.stopPropagation()}>
              {r.balance>0 && <Btn size='sm' onClick={()=>openPay(r)}>Record Payment</Btn>}
              {r.hasPayments && <Btn variant='ghost' size='sm' onClick={()=>openReceipt(r)}>⎙ Receipt</Btn>}
              {r.balance<=0 && !r.hasPayments && <Badge color='var(--emerald)'>Paid</Badge>}
              <Btn variant='ghost' size='sm' onClick={()=>openEditFee(r)}>Edit</Btn>
              {canBulk && <Btn variant='danger' size='sm' onClick={()=>delFee(r.id)}>Remove</Btn>}
            </div>
          )},
        ]}/>
      </Card>

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
              style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:160}}>
              <option value=''>All Classes</option>
              {myClasses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={phStudent} onChange={e=>setPhStudent(e.target.value)}
              style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:180}}>
              <option value=''>All Students</option>
              {phStudentsInClass.sort((a,b)=>a.last_name.localeCompare(b.last_name)).map(s=><option key={s.id} value={s.id}>{fullName(s,true)}</option>)}
            </select>
            <select value={phFeeType} onChange={e=>setPhFeeType(e.target.value)}
              style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:160}}>
              <option value=''>All Fee Types</option>
              {phFeeTypes.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            <input type='date' value={phDateFrom} onChange={e=>setPhDateFrom(e.target.value)}
              title='From date'
              style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 12px',color:'var(--mist)',fontSize:13,minWidth:140}}/>
            <input type='date' value={phDateTo} onChange={e=>setPhDateTo(e.target.value)}
              title='To date'
              style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 12px',color:'var(--mist)',fontSize:13,minWidth:140}}/>
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
                                <Btn size='sm' variant='ghost' onClick={()=>{
                                  const feePayments=payments.filter(x=>x.fee_id===p.fee_id)
                                  printReceipt({fee:p.fee_obj,feePayments,student:p.student_obj,cls:p.cls_obj,settings,currency})
                                }}>⎙</Btn>
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
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
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
                  <Btn variant='ghost' onClick={()=>{
                    printReceipt({fee:p.fee_obj,feePayments:feePs,student:p.student_obj,cls:p.cls_obj,settings,currency})
                  }}>⎙ Print Receipt</Btn>
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
        <Modal title='Bulk Add Fee' subtitle={`Step ${bulkStep} of 3`} onClose={closeBulk} width={560}>

          {/* ── STEP 1 ── */}
          {bulkStep===1 && (
            <div>
              <Field label='Fee Type' value={bulk.fee_type} onChange={bf('fee_type')} placeholder='e.g. Tuition, Feeding Fee, Books' required/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                <Field label='Period' value={bulk.period} onChange={bf('period')} options={feePeriods.map(p=>({value:p,label:p}))}/>
                <Field label='Default Amount' value={bulk.default_amount} onChange={bf('default_amount')} type='number' placeholder='0.00' required/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
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
                <Btn onClick={goToStep2} disabled={!step1Valid}>Next — Set Amounts &rarr;</Btn>
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {bulkStep===2 && (
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
                <Btn variant='ghost' onClick={()=>setBulkStep(1)}>&larr; Back</Btn>
                <Btn onClick={()=>setBulkStep(3)} disabled={!step2Valid}>Next — Preview &rarr;</Btn>
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {bulkStep===3 && (
            <div>
              {/* Summary card */}
              <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:20,marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14,fontFamily:"'Clash Display',sans-serif"}}>Summary</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 20px'}}>
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
                <Btn variant='ghost' onClick={()=>setBulkStep(2)}>&larr; Back</Btn>
                <Btn onClick={confirmBulk} disabled={bulkSaving||toCreate===0}>
                  {bulkSaving?<><Spinner/> Adding...</>:`Confirm — Add ${toCreate} Record${toCreate!==1?'s':''}`}
                </Btn>
              </div>
            </div>
          )}
        </Modal>
      )}
      {confirmState && <ConfirmModal {...confirmState} onClose={()=>setConfirmState(null)}/>}
    </div>
  )
}