import { useState } from 'react'
import { supabase } from '../../supabase'
import { useIsMobile } from '../lib/hooks'
import { ROLE_META, FEE_STATUS, LETTER_COLOR } from '../lib/constants'
import { fmtDate, calcTotal, getGradeComponents, getLetter, getCurrency, fmtMoney, genSID, fullName } from '../lib/helpers'
import { auditLog } from '../lib/auditLog'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Btn from '../components/Btn'
import Card from '../components/Card'
import Field from '../components/Field'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import SectionTitle from '../components/SectionTitle'
import DataTable from '../components/DataTable'
import ConfirmModal from '../components/ConfirmModal'

// ── STUDENTS ───────────────────────────────────────────────────
export default function Students({profile,data,setData,toast,settings,activeYear,isViewingPast}) {
  const {students=[],classes=[]} = data
  const [search,setSearch] = useState('')
  const [fc,setFc]         = useState('')
  const [modal,setModal]   = useState(false)
  const [confirmState,setConfirmState] = useState(null)
  const [edit,setEdit]     = useState(null)
  const [form,setForm]     = useState({})
  const [saving,setSaving] = useState(false)
  const [showArchived,setShowArchived]     = useState(false)
  const [fyear,setFyear]                   = useState('')
  const [unarchiveModal,setUnarchiveModal] = useState(null)
  const [unarchiveClass,setUnarchiveClass] = useState('')
  const [archiveModal,setArchiveModal]     = useState(null)
  const [archiveForm,setArchiveForm]       = useState({reason:'Withdrawn',notes:''})
  const [fReason,setFReason]               = useState('')
  const f = k => v => setForm(p=>({...p,[k]:v}))
  const [viewStudent, setViewStudent] = useState(null)
  const canEdit = ['superadmin','admin'].includes(profile?.role) && !isViewingPast

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if(!file) return
    if(!file.type.startsWith('image/')) { toast('Please upload an image file','error'); return }
    if(file.size > 2*1024*1024) { toast('Image must be under 2MB','error'); return }
    const reader = new FileReader()
    reader.onload = ev => setForm(p=>({...p, photo: ev.target.result}))
    reader.readAsDataURL(file)
  }
  const activeStudents   = students.filter(s=>!s.archived)
  const archivedStudents = students.filter(s=>s.archived)
  const graduationYears  = [...new Set(archivedStudents.map(s=>s.graduation_year).filter(Boolean))].sort((a,b)=>b.localeCompare(a))
  const leavingReasons   = ['Graduated','Transferred','Withdrawn']
  // Subject teacher: view students in classes they teach
  const teacherSubjectClassIds = profile?.role==='teacher'
    ? [...new Set(data.subjects?.filter(s=>s.teacher_id===profile?.id).map(s=>s.class_id)||[])]
    : []
  const pool = showArchived
    ? archivedStudents
    : profile?.role==='classteacher'
      ? activeStudents.filter(s=>s.class_id===profile.class_id)
      : profile?.role==='teacher'
        ? activeStudents.filter(s=>teacherSubjectClassIds.includes(s.class_id))
        : activeStudents
  const filtered = pool.filter(s=>{
    const q=search.toLowerCase()
    if(!(`${s.first_name} ${s.last_name} ${s.student_id}`).toLowerCase().includes(q)) return false
    if(showArchived && fyear && s.graduation_year!==fyear) return false
    if(showArchived && fReason && s.leaving_reason!==fReason) return false
    if(!showArchived && fc && s.class_id!==fc) return false
    return true
  })
  const unarchive = async (student, classId) => {
    if(!classId){ toast('Please select a class to re-enrol the student into','error'); return }
    setSaving(true)
    const {error} = await supabase.from('students').update({archived:false, class_id:classId, graduation_year:null, leaving_reason:null, leaving_notes:null}).eq('id',student.id).eq('school_id',profile?.school_id)
    if(error){ toast(error.message,'error'); setSaving(false); return }
    setData(p=>({...p, students:p.students.map(s=>s.id===student.id?{...s,archived:false,class_id:classId,graduation_year:null,leaving_reason:null,leaving_notes:null}:s)}))
    auditLog(profile,'Students','Unarchived',`${fullName(student)} → ${classes.find(c=>c.id===classId)?.name}`,{},{...student},{archived:false,class_id:classId})
    toast(`${fullName(student)} re-enrolled`)
    setUnarchiveModal(null)
    setUnarchiveClass('')
    setSaving(false)
  }
  const archiveStudent = async () => {
    const student = archiveModal
    if(!student) return
    if(!archiveForm.reason){ toast('Please select a reason','error'); return }
    setSaving(true)
    const {error} = await supabase.from('students').update({
      archived: true,
      class_id: null,
      graduation_year: activeYear,
      leaving_reason: archiveForm.reason,
      leaving_notes: archiveForm.notes||null,
    }).eq('id', student.id).eq('school_id', profile?.school_id)
    if(error){ toast(error.message,'error'); setSaving(false); return }
    setData(p=>({...p, students:p.students.map(s=>s.id===student.id
      ? {...s, archived:true, class_id:null, graduation_year:activeYear, leaving_reason:archiveForm.reason, leaving_notes:archiveForm.notes||null}
      : s
    )}))
    auditLog(profile,'Students','Archived',`${fullName(student)} · ${archiveForm.reason}`,{reason:archiveForm.reason},{...student},{archived:true,leaving_reason:archiveForm.reason})
    toast(`${fullName(student)} archived`)
    setArchiveModal(null)
    setArchiveForm({reason:'Withdrawn',notes:''})
    setViewStudent(null)  // close profile modal if open
    setSaving(false)
  }
  const openAdd = ()=>{setEdit(null);setForm({first_name:'',middle_name:'',last_name:'',class_id:'',dob:'',gender:'',phone:'',email:'',address:'',medical_info:'',guardian_name:'',guardian_relation:'',guardian_phone:'',guardian_email:''});setModal(true)}
  const openEdit = s=>{setEdit(s);setForm({...s});setModal(true)}
  const save = async ()=>{
    if(!form.first_name||!form.last_name||!form.class_id||!form.dob){toast(!form.dob?'Please enter a date of birth ✦':'Please fill all required fields','error');return}
    if(!form.guardian_name||!form.guardian_phone){toast('Please add at least one parent or guardian with a name and phone number','error');return}
    setSaving(true)
    if(edit){
      const {error} = await supabase.from('students').update({...form,updated_at:new Date()}).eq('id',edit.id)
      if(error){toast(error.message,'error')}else{setData(p=>({...p,students:p.students.map(s=>s.id===edit.id?{...s,...form}:s)}));auditLog(profile,'Students','Updated',`${fullName(form)}`,{},{...edit},{...form});toast('Student updated');setModal(false)}
    } else {
      const sid = genSID(students)
      const {data:row,error} = await supabase.from('students').insert({...form,school_id:profile?.school_id,student_id:sid,created_at:new Date(),entry_year:activeYear}).select().single()
      if(error){toast(error.message,'error')}else{setData(p=>({...p,students:[...p.students,row]}));auditLog(profile,'Students','Created',`${fullName(form)}`,{},null,row);toast('Student added');setModal(false)}
    }
    setSaving(false)
  }
  const del = async id=>{
    setConfirmState({title:'Remove student?',body:'This action is permanent and cannot be undone.',icon:'🗑',danger:true,onConfirm:async()=>{
      const {error} = await supabase.from('students').delete().eq('id',id).eq('school_id',profile?.school_id)
      if(error)toast(error.message,'error')
      else{const s=students.find(x=>x.id===id);setData(p=>({...p,students:p.students.filter(s=>s.id!==id)}));auditLog(profile,'Students','Deleted',`${fullName(s)}`,{},s||null,null);toast('Student removed')}
    }})
  }

  const exportStudentsCsv = () => {
    try {
      if(filtered.length===0){ toast('No students to export','error'); return }
      const esc = v => {
        if(v===null||v===undefined) return ''
        return String(v).replace(/"/g,'""')
      }
      let csv = 'Student ID,First Name,Middle Name,Last Name,Class,Gender,DOB,Phone,Email,Guardian Name,Guardian Phone,Guardian Email,Archived,Graduation Year,Leaving Reason,Leaving Notes\n'
      filtered.forEach(s=>{
        const clsName = classes.find(c=>c.id===s.class_id)?.name || ''
        const fmtPhone = v => v ? `="${esc(v)}"` : '""'  
        csv += `"${esc(s.student_id)}","${esc(s.first_name)}","${esc(s.last_name)}","${esc(clsName)}","${esc(s.gender)}","${esc(s.dob)}",${fmtPhone(s.phone)},"${esc(s.email)}","${esc(s.guardian_name)}",${fmtPhone(s.guardian_phone)},"${esc(s.guardian_email)}","${s.archived?'Yes':'No'}","${esc(s.graduation_year)}","${esc(s.leaving_reason)}","${esc(s.leaving_notes)}"\n`
      })
      const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = showArchived ? 'SRMS_Students_Archived.csv' : 'SRMS_Students_Active.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch(e){
      console.error(e)
      toast('Export failed. Please try again.','error')
    }
  }

  // ── PRINT STUDENT PROFILE ──────────────────────────────────────
  const printStudentProfile = (s) => {
    const cls            = classes.find(c => c.id === s.class_id)
    const subjectsForCls = data.subjects?.filter(sub => sub.class_id === s.class_id) || []
    const studentGrades  = data.grades?.filter(g => g.student_id === s.id) || []
    const gradeComps     = getGradeComponents(settings)
    const scale          = settings?.grading_scale || []
    const attRecs        = data.attendance?.filter(a => a.student_id === s.id) || []
    const behRecs        = data.behaviour?.filter(b => b.student_id === s.id) || []

    const present = attRecs.filter(a => a.status === 'Present').length
    const absent  = attRecs.filter(a => a.status === 'Absent').length
    const late    = attRecs.filter(a => a.status === 'Late').length
    const excused = attRecs.filter(a => a.status === 'Excused').length
    const attRate = attRecs.length ? Math.round(present / attRecs.length * 100) : null

    const schoolName  = settings?.school_name  || 'SRMS'
    const schoolMotto = settings?.motto         || ''
    const schoolLogo  = settings?.school_logo   || null
    const yearLabel   = activeYear || ''
    const ptLabel     = settings?.period_type === 'term' ? 'Terms' : 'Semesters'

    const fmtD = d => d ? new Date(d).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}) : '\u2014'

    const logoTag = schoolLogo
      ? `<img src="${schoolLogo}" style="width:56px;height:56px;object-fit:contain;border-radius:8px;flex-shrink:0;" />`
      : `<div style="width:56px;height:56px;border-radius:10px;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#e8b84b;flex-shrink:0;">${schoolName.charAt(0)}</div>`

    const photoTag = s.photo
      ? `<img src="${s.photo}" style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:3px solid #e8b84b;flex-shrink:0;" />`
      : `<div style="width:84px;height:84px;border-radius:50%;background:rgba(232,184,75,0.12);border:3px solid rgba(232,184,75,0.3);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#e8b84b;flex-shrink:0;">${(s.first_name||'?')[0]}${(s.last_name||'?')[0]}</div>`

    const periodOrder = Array.from({length:settings?.period_count||2},(_,i)=>`${settings?.period_type==='term'?'Term':'Semester'} ${i+1}`)
    const latestGrade = subjectId => {
      const matches = studentGrades.filter(g => g.subject_id === subjectId)
      if (!matches.length) return null
      return matches.reduce((best, g) => {
        const bi = periodOrder.indexOf(best.period)
        const gi = periodOrder.indexOf(g.period)
        return gi > bi ? g : best
      })
    }

    const subjectRows = subjectsForCls.map(sub => {
      const g      = latestGrade(sub.id)
      const total  = g ? calcTotal(g, gradeComps) : null
      const letter = total !== null ? (scale.find(sc => total >= sc.min && total <= sc.max)?.letter || '--') : '--'
      const remark = total !== null ? (scale.find(sc => total >= sc.min && total <= sc.max)?.remark || '')  : ''
      const scoreC = total === null ? '#9ca3af' : total < 50 ? '#dc2626' : total >= 75 ? '#16a34a' : '#1d4ed8'
      const ltC    = letter==='--' ? '#9ca3af' : letter==='A+'||letter==='A' ? '#16a34a' : letter==='B' ? '#1d4ed8' : letter==='C'||letter==='D' ? '#d97706' : '#dc2626'
      return `<tr>
        <td style="padding:9px 14px;font-size:13px;border-bottom:1px solid #f3f4f6;color:#111827;">${sub.name}</td>
        <td style="padding:9px 10px;text-align:center;font-size:16px;font-weight:800;border-bottom:1px solid #f3f4f6;color:${scoreC};">${total !== null ? total : '\u2014'}</td>
        <td style="padding:9px 10px;text-align:center;border-bottom:1px solid #f3f4f6;"><span style="display:inline-block;padding:2px 8px;background:${ltC}18;border:1px solid ${ltC}40;border-radius:5px;font-size:12px;font-weight:700;color:${ltC};">${letter}</span></td>
        <td style="padding:9px 14px;font-size:11px;border-bottom:1px solid #f3f4f6;color:#6b7280;">${remark}</td>
      </tr>`
    }).join('')

    const scored      = subjectsForCls.map(sub => { const g = latestGrade(sub.id); return g ? calcTotal(g, gradeComps) : null }).filter(t => t !== null)
    const grandAvg    = scored.length ? scored.reduce((a,b)=>a+b,0) / scored.length : null
    const grandLetter = grandAvg !== null ? (scale.find(sc=>grandAvg>=sc.min&&grandAvg<=sc.max)?.letter||'--') : '--'
    const grandRemark = grandAvg !== null ? (scale.find(sc=>grandAvg>=sc.min&&grandAvg<=sc.max)?.remark||'')  : ''
    const gradeC      = grandAvg===null?'#6b7280':grandAvg>=75?'#16a34a':grandAvg>=50?'#1d4ed8':'#dc2626'

    const recentBeh = [...behRecs].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,6)
    const behTC = t => t==='Discipline'?'#f06b7a':t==='Achievement'?'#2dd4a0':t==='Club Activity'?'#5ba8f5':t==='Notes'?'#a0a0ac':'#6b7280'
    const behRows = recentBeh.map(b => `<tr>
        <td style="padding:8px 12px;font-size:11px;border-bottom:1px solid #f3f4f6;color:#6b7280;white-space:nowrap;">${fmtD(b.date||b.created_at)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;"><span style="display:inline-block;padding:1px 7px;background:${behTC(b.type)}15;border:1px solid ${behTC(b.type)}35;border-radius:4px;font-size:10px;font-weight:700;color:${behTC(b.type)};text-transform:uppercase;letter-spacing:0.06em;">${b.type}</span></td>
        <td style="padding:8px 12px;font-size:12px;font-weight:600;border-bottom:1px solid #f3f4f6;color:#111827;">${b.title||'\u2014'}</td>
        <td style="padding:8px 12px;font-size:11px;border-bottom:1px solid #f3f4f6;color:#6b7280;">${b.recorded_by_name||'\u2014'}</td>
      </tr>`).join('')

    const statusBadge = s.archived
      ? (() => {
          const rc = s.leaving_reason||'Archived'
          const c  = rc==='Graduated'?'#1d4ed8':rc==='Transferred'?'#d97706':'#dc2626'
          const bg = rc==='Graduated'?'#dbeafe':rc==='Transferred'?'#fef3c7':'#fee2e2'
          return `<span style="display:inline-block;padding:3px 10px;background:${bg};border-radius:20px;font-size:10px;font-weight:700;color:${c};">${rc} \u00b7 ${s.graduation_year||'\u2014'}</span>`
        })()
      : cls ? `<span style="display:inline-block;padding:3px 10px;background:#dbeafe;border-radius:20px;font-size:10px;font-weight:700;color:#1d4ed8;">${cls.name}</span>` : ''

    const row = (label, val) => val
      ? `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:7px 0;border-bottom:1px solid #f3f4f6;gap:10px;"><span style="font-size:11px;color:#9ca3af;white-space:nowrap;">${label}</span><span style="font-size:12px;color:#374151;font-weight:600;text-align:right;">${val}</span></div>`
      : ''

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Student Profile \u2014 ${s.first_name} ${s.last_name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#f0f2f5;color:#1a1a2e;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  table{border-collapse:collapse;width:100%}
  .wrap{background:#fff;border-radius:14px;overflow:hidden;max-width:820px;margin:0 auto 24px;box-shadow:0 4px 32px rgba(0,0,0,0.10);}
  .sec{font-size:8.5px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:12px;display:flex;align-items:center;gap:7px;}
  .sec::before{content:'';width:3px;height:11px;background:#1e3a8a;border-radius:2px;flex-shrink:0;display:inline-block;}
  .no-print{display:block}
  @media print{@page{size:A4 portrait;margin:10mm}.no-print{display:none!important}body{background:#fff}.wrap{box-shadow:none;border-radius:0;max-width:100%;margin:0}}
  @media screen{body{padding:20px}}
</style></head><body>
<div class="wrap">
  <div style="height:5px;background:linear-gradient(90deg,#1e3a8a,#3b82f6,#1e3a8a);"></div>
  <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#1e40af 100%);padding:20px 28px;display:flex;align-items:center;gap:18px;">
    ${logoTag}
    <div style="flex:1;text-align:center;">
      <div style="font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:#fff;">${schoolName}</div>
      ${schoolMotto ? `<div style="font-size:10px;color:#93c5fd;margin-top:3px;font-style:italic;">"${schoolMotto}"</div>` : ''}
      <div style="display:inline-block;margin-top:8px;padding:3px 16px;background:rgba(232,184,75,0.15);border:1px solid rgba(232,184,75,0.3);border-radius:20px;"><span style="font-size:9px;font-weight:700;color:#e8b84b;text-transform:uppercase;letter-spacing:0.14em;">Student Profile</span></div>
    </div>
    ${photoTag}
  </div>
  <div style="background:#f8fafc;border-bottom:2px solid #e5e7eb;padding:14px 28px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
    <div style="flex:1;min-width:180px;">
      <div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:#111827;">${s.first_name} ${s.last_name}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap;">
        <span style="font-family:monospace;font-size:11px;color:#d97706;background:#fef3c7;border:1px solid #fde68a;border-radius:4px;padding:2px 8px;font-weight:600;">${s.student_id}</span>
        ${statusBadge}
        ${s.gender ? `<span style="font-size:11px;color:#6b7280;">${s.gender}</span>` : ''}
      </div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      ${grandAvg !== null ? `<div style="text-align:center;padding:8px 14px;background:#fff;border:1.5px solid ${gradeC};border-radius:10px;min-width:72px;"><div style="font-size:8px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px;">Avg Score</div><div style="font-size:22px;font-weight:900;color:${gradeC};line-height:1;">${grandAvg}</div><div style="font-size:9px;font-weight:700;color:${gradeC};margin-top:1px;">${grandLetter}${grandRemark ? ' \u00b7 '+grandRemark : ''}</div></div>` : ''}
      ${attRate !== null ? `<div style="text-align:center;padding:8px 14px;background:#fff;border:1.5px solid #0ea5e9;border-radius:10px;min-width:72px;"><div style="font-size:8px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px;">Attendance</div><div style="font-size:22px;font-weight:900;color:#0ea5e9;line-height:1;">${attRate}%</div><div style="font-size:9px;color:#0ea5e9;margin-top:1px;">${present} present</div></div>` : ''}
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #f3f4f6;">
    <div style="padding:20px 18px 20px 28px;border-right:1px solid #f3f4f6;">
      <div class="sec">Personal Details</div>
      ${row('Date of Birth', fmtD(s.dob))}
      ${row('Gender',     s.gender)}
      ${row('Phone',      s.phone)}
      ${row('Email',      s.email)}
      ${row('Address',    s.address)}
      ${row('Entry Year', s.entry_year ? String(s.entry_year) : null)}
      ${s.archived ? row('Left In',  s.graduation_year ? String(s.graduation_year) : null) : ''}
      ${s.archived && s.leaving_reason ? row('Reason', s.leaving_reason) : ''}
      ${s.archived && s.leaving_notes  ? row('Notes',  s.leaving_notes)  : ''}
      ${(s.guardian_name || s.guardian_phone) ? `
        <div class="sec" style="margin-top:18px;">Parent / Guardian</div>
        ${row('Name', s.guardian_name)}
        ${row('Relationship', s.guardian_relation)}
        ${row('Phone', s.guardian_phone)}
        ${row('Email', s.guardian_email)}` : ''}
      ${s.medical_info && s.medical_info !== 'None' ? `
        <div style="margin-top:14px;padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
          <div style="font-size:8px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">\u2695 Medical Information</div>
          <div style="font-size:12px;color:#374151;line-height:1.5;">${s.medical_info}</div>
        </div>` : ''}
    </div>
    <div style="padding:20px 28px 20px 18px;">
      <div class="sec">Academic Summary <span style="font-size:9px;font-weight:400;color:#9ca3af;text-transform:none;letter-spacing:0;margin-left:4px;">Latest period \u00b7 ${yearLabel}</span></div>
      ${subjectsForCls.length === 0
        ? `<div style="font-size:13px;color:#9ca3af;padding:10px 0;">No subjects assigned to this class.</div>`
        : `<table style="margin-bottom:4px;">
            <thead><tr style="background:#f8fafc;">
              <th style="padding:7px 14px;text-align:left;font-size:8px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #1e3a8a;">Subject</th>
              <th style="padding:7px 8px;text-align:center;font-size:8px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #1e3a8a;">Score</th>
              <th style="padding:7px 8px;text-align:center;font-size:8px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #1e3a8a;">Grade</th>
              <th style="padding:7px 14px;text-align:left;font-size:8px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #1e3a8a;">Remark</th>
            </tr></thead>
            <tbody>${subjectRows}</tbody>
          </table>`}
      <div class="sec" style="margin-top:18px;">Attendance</div>
      ${attRecs.length === 0
        ? `<div style="font-size:13px;color:#9ca3af;">No attendance records yet.</div>`
        : `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px;">
            ${[['Present',present,'#16a34a'],['Absent',absent,'#dc2626'],['Late',late,'#d97706'],['Excused',excused,'#0ea5e9']].map(([l,n,c])=>
              `<div style="text-align:center;padding:8px 4px;background:${c}0d;border:1px solid ${c}28;border-radius:8px;"><div style="font-size:19px;font-weight:800;color:${c};">${n}</div><div style="font-size:9px;color:#9ca3af;margin-top:2px;">${l}</div></div>`
            ).join('')}
          </div>`}
    </div>
  </div>
  ${behRecs.length > 0 ? `
  <div style="padding:18px 28px;border-bottom:1px solid #f3f4f6;">
    <div class="sec">Behaviour Records <span style="font-size:9px;font-weight:400;color:#9ca3af;text-transform:none;letter-spacing:0;margin-left:4px;">${behRecs.length} total \u00b7 showing ${recentBeh.length} most recent</span></div>
    <table>
      <thead><tr style="background:#f8fafc;">
        <th style="padding:7px 12px;text-align:left;font-size:8px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1.5px solid #e5e7eb;">Date</th>
        <th style="padding:7px 12px;text-align:left;font-size:8px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1.5px solid #e5e7eb;">Type</th>
        <th style="padding:7px 12px;text-align:left;font-size:8px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1.5px solid #e5e7eb;">Title</th>
        <th style="padding:7px 12px;text-align:left;font-size:8px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1.5px solid #e5e7eb;">Recorded By</th>
      </tr></thead>
      <tbody>${behRows}</tbody>
    </table>
  </div>` : ''}
  <div style="padding:12px 28px;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
    <div style="font-size:10px;color:#9ca3af;">Generated ${fmtD(new Date())}</div>
    <div style="font-size:10px;color:#9ca3af;">${schoolName} \u00b7 SRMS</div>
  </div>
  <div style="height:4px;background:linear-gradient(90deg,#1e3a8a,#3b82f6,#1e3a8a);"></div>
</div>
<div class="no-print" style="max-width:820px;margin:0 auto;text-align:center;padding:14px 0 20px;">
  <button onclick="window.print()" style="padding:12px 36px;background:linear-gradient(135deg,#1e3a8a,#3b82f6);border:none;border-radius:10px;font-size:14px;font-weight:700;color:#fff;cursor:pointer;box-shadow:0 4px 12px rgba(30,58,138,0.3);">\u2389\u00a0 Print Student Profile</button>
</div>
</body></html>`

    const w = window.open('', '_blank', 'width=860,height=960')
    if (w) { w.document.write(html); w.document.close() }
  }


  return (
    <div>
      <PageHeader
        title={showArchived?'Archived Students':'Students'}
        sub={showArchived
          ? `${filtered.length} of ${archivedStudents.length} archived${fyear?' · '+fyear:''}`
          : `${filtered.length} of ${activeStudents.length} students`}>
        {canEdit && !showArchived && <Btn onClick={openAdd}>+ New Student</Btn>}
        {['superadmin','admin'].includes(profile?.role) && (
          <Btn variant='ghost' onClick={exportStudentsCsv}>⬇ Export CSV</Btn>
        )}
        {canEdit && (
          <Btn variant='ghost' onClick={()=>{setShowArchived(v=>!v);setSearch('');setFc('');setFyear('');setFReason('')}}>
            {showArchived?'← Back to Students':'⊡ Archived Students'}
          </Btn>
        )}
      </PageHeader>
      <Card style={{marginBottom:16,padding:'14px 20px'}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{position:'relative',flex:'1 1 240px'}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--mist3)',fontSize:14}}>⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder={showArchived?'Search archived students by name or ID...':'Search by name or ID...'}
              style={{width:'100%',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px 8px 36px',color:'var(--white)',fontSize:13}}/>
          </div>
          {showArchived ? (
            <>
            <select value={fyear} onChange={e=>setFyear(e.target.value)}
              style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:140}}>
              <option value=''>All Years</option>
              {graduationYears.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
            <select value={fReason} onChange={e=>setFReason(e.target.value)}
              style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:150}}>
              <option value=''>All Reasons</option>
              {leavingReasons.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
            </>
          ) : (
            (canEdit || profile?.role==='teacher') && (
              <select value={fc} onChange={e=>setFc(e.target.value)}
                style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer'}}>
                <option value=''>All Classes</option>
                {(profile?.role==='teacher' ? classes.filter(c=>teacherSubjectClassIds.includes(c.id)) : classes).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )
          )}
        </div>
      </Card>
      <Card>
        <DataTable onRow={s=>setViewStudent(s)} data={filtered} columns={[
          {key:'student_id',label:'ID',render:v=><span className='mono' style={{color:'var(--gold2)',fontSize:12}}>{v}</span>},
          {key:'first_name',label:'Student',render:(v,r)=>(
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <Avatar name={`${r.first_name} ${r.last_name}`} size={30} photo={r.photo}/>
              <div>
                <div style={{fontWeight:600}}>{r.first_name} {r.last_name}</div>
                <div style={{fontSize:11,color:'var(--mist3)'}}>{r.email||'--'}</div>
              </div>
            </div>
          )},
          showArchived
            ? {key:'leaving_reason',label:'Reason',render:(v,r)=>{
                const color = v==='Graduated'?'var(--sky)':v==='Transferred'?'var(--amber)':'var(--rose)'
                const bg    = v==='Graduated'?'rgba(91,168,245,0.1)':v==='Transferred'?'rgba(251,159,58,0.1)':'rgba(240,107,122,0.1)'
                const border= v==='Graduated'?'rgba(91,168,245,0.2)':v==='Transferred'?'rgba(251,159,58,0.2)':'rgba(240,107,122,0.2)'
                return <div style={{display:'flex',flexDirection:'column',gap:3}}>
                  <span style={{fontSize:12,fontWeight:600,color,background:bg,border:`1px solid ${border}`,borderRadius:4,padding:'2px 8px',width:'fit-content'}}>{v||'--'}</span>
                  {r.graduation_year&&<span style={{fontSize:11,color:'var(--mist3)'}}>{r.graduation_year}</span>}
                </div>
              }}
            : {key:'class_id',label:'Class',render:v=>classes.find(c=>c.id===v)?.name||'--'},
          {key:'gender',label:'Gender'},
          {key:'dob',label:'Date of Birth',render:v=>fmtDate(v)},
          {key:'medical_info',label:'Medical',render:v=>v&&v!=='None'?<Badge color='var(--rose)'>{v}</Badge>:<span style={{color:'var(--mist3)'}}>None</span>},
          showArchived
            ? (profile?.role==='superadmin'||profile?.role==='admin')
              ? {key:'id',label:'',render:(v,r)=>(
                  <div style={{display:'flex',gap:6}} onClick={e=>e.stopPropagation()}>
                    <Btn variant='ghost' size='sm' onClick={()=>{setUnarchiveModal(r);setUnarchiveClass('')}}>Re-enrol</Btn>
                  </div>
                )}
              : {key:'id',label:'',render:()=>null}
            : canEdit&&!isViewingPast
              ? {key:'id',label:'',render:(v,r)=>(
                  <div style={{display:'flex',gap:6}} onClick={e=>e.stopPropagation()}>
                    <Btn variant='ghost' size='sm' onClick={()=>openEdit(r)}>Edit</Btn>
                    <Btn variant='ghost' size='sm' onClick={()=>{setArchiveModal(r);setArchiveForm({reason:'Withdrawn',notes:''})}} style={{color:'var(--amber)',borderColor:'rgba(251,159,58,0.3)'}}>Archive</Btn>
                    <Btn variant='danger' size='sm' onClick={()=>del(r.id)}>Remove</Btn>
                  </div>
                )}
              : {key:'id',label:'',render:()=>null},
        ]}/>
      </Card>
      {modal && (
        <Modal title={edit?'Edit Student':'New Student'} subtitle={edit?`ID: ${edit.student_id}`:'A Student ID will be generated automatically.'} onClose={()=>setModal(false)} width={580}>
          {/* Photo upload */}
          <div style={{display:'flex',alignItems:'center',gap:16,padding:'14px 16px',background:'var(--ink3)',borderRadius:'var(--r-sm)',marginBottom:20,border:'1px solid var(--line)'}}>
            <div style={{position:'relative',flexShrink:0}}>
              <Avatar name={fullName(form)||'?'} size={56} photo={form.photo}/>
              {form.photo && (
                <button onClick={()=>setForm(p=>({...p,photo:null}))}
                  style={{position:'absolute',top:-4,right:-4,width:18,height:18,borderRadius:'50%',background:'var(--rose)',color:'white',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'none'}}>×</button>
              )}
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'var(--white)',marginBottom:2}}>Student Photo</div>
              <div style={{fontSize:11,color:'var(--mist3)',marginBottom:8}}>JPG or PNG, max 2MB</div>
              <label style={{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 12px',background:'var(--ink4)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',cursor:'pointer',fontSize:12,color:'var(--mist)',fontWeight:500}}>
                ⬆ Upload Photo
                <input type='file' accept='.jpg,.jpeg,.png' onChange={handlePhotoUpload} style={{display:'none'}}/>
              </label>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Field label='First Name' value={form.first_name} onChange={f('first_name')} required/>
            <Field label='Middle Name' value={form.middle_name||''} onChange={f('middle_name')} placeholder='Optional'/>
            <Field label='Last Name'  value={form.last_name}  onChange={f('last_name')}  required/>
            <Field label='Class' value={form.class_id} onChange={f('class_id')} required options={classes.map(c=>({value:c.id,label:c.name}))}/>
            <Field label='Gender' value={form.gender} onChange={f('gender')} options={['Male','Female']}/>
            <Field label='Date of Birth ✦' value={form.dob} onChange={f('dob')} type='date' required style={!form.dob&&saving?{borderColor:'var(--rose)'}:{}}/>
            <Field label='Phone' value={form.phone} onChange={f('phone')}/>
            <Field label='Email' value={form.email} onChange={f('email')} type='email'/>
            <Field label='Address' value={form.address} onChange={f('address')}/>
          </div>
          <Field label='Medical Information' value={form.medical_info} onChange={f('medical_info')} placeholder='Known conditions, allergies...'/>
          <div style={{margin:'16px 0 10px',paddingTop:16,borderTop:'1px solid var(--line)'}}>
            <div style={{fontSize:12,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
              <span>Parent / Guardian</span>
              <span style={{fontSize:10,color:'var(--rose)',background:'rgba(240,107,122,0.1)',border:'1px solid rgba(240,107,122,0.2)',padding:'2px 8px',borderRadius:10}}>Required</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
              <Field label='Guardian Name' value={form.guardian_name} onChange={f('guardian_name')} required placeholder='Full name'/>
              <Field label='Relationship' value={form.guardian_relation} onChange={f('guardian_relation')} options={['','Mother','Father','Grandmother','Grandfather','Uncle','Aunt','Sibling','Legal Guardian','Other']}/>
              <Field label='Guardian Phone' value={form.guardian_phone} onChange={f('guardian_phone')} required placeholder='Primary contact number'/>
              <Field label='Guardian Email' value={form.guardian_email} onChange={f('guardian_email')} type='email' placeholder='Optional'/>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving?<><Spinner/> Saving...</>:'Save Student'}</Btn>
          </div>
        </Modal>
      )}

      {/* Archive Student Modal */}
      {archiveModal && (
        <Modal title='Archive Student' subtitle='This student will be moved to Archived Students.' onClose={()=>{setArchiveModal(null);setArchiveForm({reason:'Withdrawn',notes:''})}} width={440}>
          <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'var(--ink3)',borderRadius:'var(--r-sm)',marginBottom:20,border:'1px solid var(--line)'}}>
            <Avatar name={fullName(archiveModal)} size={44} photo={archiveModal.photo}/>
            <div>
              <div style={{fontWeight:600,fontSize:14}}>{fullName(archiveModal)}</div>
              <div style={{fontSize:12,color:'var(--mist3)',marginTop:2}}>ID: {archiveModal.student_id} · {classes.find(c=>c.id===archiveModal.class_id)?.name||'--'}</div>
            </div>
          </div>
          <Field label='Reason for Leaving' value={archiveForm.reason} onChange={v=>setArchiveForm(p=>({...p,reason:v}))} required
            options={[
              {value:'Graduated',label:'Graduated — completed the programme'},
              {value:'Transferred',label:'Transferred — moved to another school'},
              {value:'Withdrawn',label:'Withdrawn — left before completing'},
            ]}/>
          <Field label='Notes (optional)' value={archiveForm.notes} onChange={v=>setArchiveForm(p=>({...p,notes:v}))} placeholder='Any additional context...' rows={2}/>
          <div style={{background:'rgba(251,159,58,0.06)',border:'1px solid rgba(251,159,58,0.2)',borderRadius:'var(--r-sm)',padding:'10px 14px',marginBottom:16}}>
            <div style={{fontSize:12,color:'var(--amber)',lineHeight:1.6}}>Their grades, attendance and fee records are fully preserved. You can re-enrol them at any time.</div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>{setArchiveModal(null);setArchiveForm({reason:'Withdrawn',notes:''})}}>Cancel</Btn>
            <Btn onClick={archiveStudent} disabled={saving||!archiveForm.reason} style={{background:'var(--amber)',borderColor:'var(--amber)',color:'var(--ink)'}}>
              {saving?<><Spinner/> Archiving...</>:'Archive Student'}
            </Btn>
          </div>
        </Modal>
      )}

      {/* Unarchive / Re-enrol Modal */}
      {unarchiveModal && (
        <Modal title='Re-enrol Student' onClose={()=>{setUnarchiveModal(null);setUnarchiveClass('')}} width={420}>
          <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'var(--ink3)',borderRadius:'var(--r-sm)',marginBottom:20,border:'1px solid var(--line)'}}>
            <Avatar name={fullName(unarchiveModal)} size={44} photo={unarchiveModal.photo}/>
            <div>
              <div style={{fontWeight:600,fontSize:14}}>{fullName(unarchiveModal)}</div>
              <div style={{fontSize:12,color:'var(--mist3)',marginTop:2}}>ID: {unarchiveModal.student_id} · {unarchiveModal.leaving_reason||'Archived'} {unarchiveModal.graduation_year||'--'}</div>
            </div>
          </div>
          <p style={{fontSize:13,color:'var(--mist2)',marginBottom:16,lineHeight:1.6}}>
            This will restore the student as active and assign them to a class. Their full history (grades, fees, attendance) is preserved.
          </p>
          <Field label='Assign to Class' value={unarchiveClass} onChange={setUnarchiveClass} required
            options={[{value:'',label:'Select a class...'},...classes.map(c=>({value:c.id,label:c.name}))]}/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:8}}>
            <Btn variant='ghost' onClick={()=>{setUnarchiveModal(null);setUnarchiveClass('')}}>Cancel</Btn>
            <Btn onClick={()=>unarchive(unarchiveModal,unarchiveClass)} disabled={!unarchiveClass||saving}>
              {saving?<><Spinner/> Re-enrolling...</>:'Confirm Re-enrolment'}
            </Btn>
          </div>
        </Modal>
      )}

      {/* Student Profile View */}
      {viewStudent && (() => {
        const s = viewStudent
        const cls = classes.find(c=>c.id===s.class_id)
        const subjectsForClass = data.subjects?.filter(sub=>sub.class_id===s.class_id)||[]
        const studentGrades = data.grades?.filter(g=>g.student_id===s.id)||[]
        const gradeComps = getGradeComponents(settings)
        const scale = settings?.grading_scale||[]
        const attRecs = data.attendance?.filter(a=>a.student_id===s.id)||[]
        const present = attRecs.filter(a=>a.status==='Present').length
        const absent  = attRecs.filter(a=>a.status==='Absent').length
        const late    = attRecs.filter(a=>a.status==='Late').length
        const attRate = attRecs.length ? Math.round(present/attRecs.length*100) : null
        // Pick the latest-period grade for a given subject
        const periodOrder = Array.from({length:settings?.period_count||2},(_,i)=>`${settings?.period_type==='term'?'Term':'Semester'} ${i+1}`)
        const latestGrade = subjectId => {
          const matches = studentGrades.filter(g=>g.subject_id===subjectId)
          if(!matches.length) return null
          return matches.reduce((best,g)=>{
            const bi = periodOrder.indexOf(best.period)
            const gi = periodOrder.indexOf(g.period)
            return gi > bi ? g : best
          })
        }
        return (
          <Modal title='' onClose={()=>setViewStudent(null)} width={780}>
            {/* Header */}
            <div style={{display:'flex',alignItems:'flex-start',gap:20,marginBottom:24,paddingBottom:20,borderBottom:'1px solid var(--line)'}}>
              <div style={{position:'relative',flexShrink:0}}>
                <Avatar name={`${s.first_name} ${s.last_name}`} size={80} photo={s.photo}/>
                <div style={{position:'absolute',bottom:4,right:4,width:12,height:12,borderRadius:'50%',background:s.archived?'var(--mist3)':'var(--emerald)',border:'2px solid var(--ink3)'}}/>
              </div>
              <div style={{flex:1}}>
                <h2 className='d' style={{fontSize:22,fontWeight:700,letterSpacing:'-0.02em',marginBottom:8}}>{fullName(s)}</h2>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                  <span className='mono' style={{fontSize:12,color:'var(--gold)',background:'rgba(232,184,75,0.1)',border:'1px solid rgba(232,184,75,0.25)',borderRadius:4,padding:'2px 8px'}}>{s.student_id}</span>
                  {s.archived ? (() => {
                    const rc = s.leaving_reason||'Archived'
                    const color  = rc==='Graduated'?'var(--sky)':rc==='Transferred'?'var(--amber)':'var(--rose)'
                    const bg     = rc==='Graduated'?'rgba(91,168,245,0.1)':rc==='Transferred'?'rgba(251,159,58,0.1)':'rgba(240,107,122,0.1)'
                    const border = rc==='Graduated'?'rgba(91,168,245,0.2)':rc==='Transferred'?'rgba(251,159,58,0.2)':'rgba(240,107,122,0.2)'
                    return <span style={{fontSize:12,color,background:bg,border:`1px solid ${border}`,borderRadius:4,padding:'2px 8px'}}>{rc} · {s.graduation_year||'--'}</span>
                  })()
                  : cls && <span style={{fontSize:12,color:'var(--sky)',background:'rgba(91,168,245,0.1)',border:'1px solid rgba(91,168,245,0.2)',borderRadius:4,padding:'2px 8px'}}>{cls.name}</span>
                  }
                  {s.gender && <span style={{fontSize:12,color:'var(--mist2)'}}>{s.gender}</span>}
                </div>
              </div>
              {canEdit && (
                <button onClick={()=>{setViewStudent(null);openEdit(s)}}
                  style={{width:34,height:34,borderRadius:'50%',background:'rgba(232,184,75,0.12)',border:'1px solid rgba(232,184,75,0.3)',color:'var(--gold)',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>✎</button>
              )}
              <button onClick={()=>printStudentProfile(s)} title='Print Student Profile'
                style={{width:34,height:34,borderRadius:'50%',background:'rgba(91,168,245,0.12)',border:'1px solid rgba(91,168,245,0.3)',color:'var(--sky)',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>⎙</button>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
              {/* Left col */}
              <div>
                <div style={{fontSize:10,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:12}}>Personal Details</div>
                {[
                  ['Date of Birth', fmtDate(s.dob)],
                  ['Gender', s.gender||'--'],
                  ['Phone', s.phone||'--'],
                  ['Email', s.email||'--'],
                  ['Address', s.address||'--'],
                  ['Entry Year', s.entry_year||'--'],
                  ...(s.archived ? [
                    ['Left In', s.graduation_year||'--'],
                    ['Reason', s.leaving_reason||'--'],
                    ...(s.leaving_notes ? [['Notes', s.leaving_notes]] : []),
                  ] : []),
                ].map(([label,value])=>(
                  <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--line)'}}>
                    <span style={{fontSize:12,color:'var(--mist3)'}}>{label}</span>
                    <span style={{fontSize:12,color:'var(--mist)',textAlign:'right',maxWidth:'60%'}}>{value}</span>
                  </div>
                ))}
                {(s.guardian_name||s.guardian_phone) && <>
                  <div style={{fontSize:10,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginTop:20,marginBottom:12}}>Parent / Guardian</div>
                  {[
                    ['Name', s.guardian_name||'--'],
                    ['Relationship', s.guardian_relation||'--'],
                    ['Phone', s.guardian_phone||'--'],
                    ['Email', s.guardian_email||'--'],
                  ].map(([label,value])=>(
                    <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--line)'}}>
                      <span style={{fontSize:12,color:'var(--mist3)'}}>{label}</span>
                      <span style={{fontSize:12,color:'var(--mist)',textAlign:'right',maxWidth:'60%'}}>{value}</span>
                    </div>
                  ))}
                </>}
                {s.medical_info && s.medical_info!=='None' && (
                  <div style={{marginTop:12,padding:'10px 14px',background:'rgba(240,107,122,0.06)',border:'1px solid rgba(240,107,122,0.2)',borderRadius:'var(--r-sm)'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'var(--rose)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>Medical Info</div>
                    <div style={{fontSize:12,color:'var(--mist2)'}}>{s.medical_info}</div>
                  </div>
                )}
              </div>

              {/* Right col */}
              <div>
                <div style={{fontSize:10,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:12}}>Academic Summary <span style={{fontWeight:400,color:'var(--mist3)',textTransform:'none',letterSpacing:0,fontSize:10}}>(latest period)</span></div>
                {subjectsForClass.length===0
                  ? <div style={{fontSize:13,color:'var(--mist3)',padding:'12px 0'}}>No subjects for this class.</div>
                  : subjectsForClass.map(sub=>{
                      const g = latestGrade(sub.id)
                      const total = g ? calcTotal(g, gradeComps) : null
                      const grade = total!==null ? (scale.find(s=>total>=s.min&&total<=s.max)?.letter||'--') : '--'
                      const gradeColor = LETTER_COLOR[grade]||'var(--mist3)'
                      return (
                        <div key={sub.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'var(--ink3)',borderRadius:'var(--r-sm)',marginBottom:6,border:'1px solid var(--line)'}}>
                          <span style={{fontSize:13,color:'var(--mist)'}}>{sub.name}</span>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <span style={{fontSize:13,fontWeight:700,color:'var(--white)'}}>{total!==null?total:'--'}</span>
                            <span style={{fontSize:11,fontWeight:700,color:gradeColor,background:`${gradeColor}20`,border:`1px solid ${gradeColor}40`,borderRadius:4,padding:'1px 6px'}}>{grade}</span>
                          </div>
                        </div>
                      )
                    })
                }

                <div style={{fontSize:10,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginTop:20,marginBottom:12}}>Attendance</div>
                {attRecs.length===0
                  ? <div style={{fontSize:13,color:'var(--mist3)'}}>No attendance records yet.</div>
                  : <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                      {[['Present',present,'var(--emerald)'],['Absent',absent,'var(--rose)'],['Late',late,'var(--amber)']].map(([label,count,color])=>(
                        <div key={label} style={{flex:1,minWidth:70,padding:'10px 14px',background:'var(--ink3)',borderRadius:'var(--r-sm)',border:`1px solid ${color}30`,textAlign:'center'}}>
                          <div style={{fontSize:18,fontWeight:700,color}}>{count}</div>
                          <div style={{fontSize:10,color:'var(--mist3)',marginTop:2}}>{label}</div>
                        </div>
                      ))}
                      {attRate!==null && (
                        <div style={{flex:1,minWidth:70,padding:'10px 14px',background:'var(--ink3)',borderRadius:'var(--r-sm)',border:'1px solid var(--line)',textAlign:'center'}}>
                          <div style={{fontSize:18,fontWeight:700,color:'var(--sky)'}}>{attRate}%</div>
                          <div style={{fontSize:10,color:'var(--mist3)',marginTop:2}}>Rate</div>
                        </div>
                      )}
                    </div>
                }
              </div>
            </div>

          {/* ── Fees Section ── */}
          {(() => {
            const currency = getCurrency(settings)
            const today    = new Date().toISOString().split('T')[0]
            const stuFees  = (data.fees||[]).filter(f=>f.student_id===s.id)
            if(stuFees.length===0) return null
            const stuPayments = data.payments||[]
            const enrichedFees = stuFees.map(fee=>{
              const feePayments   = stuPayments.filter(p=>p.fee_id===fee.id)
              const paymentsPaid  = feePayments.reduce((a,p)=>a+Number(p.amount||0),0)
              const effectivePaid = Math.max(Number(fee.paid||0), paymentsPaid)
              const bal           = Number(fee.amount||0)-effectivePaid
              const status        = bal<=0?'Paid':effectivePaid>0?'Partial':'Outstanding'
              const isOverdue     = !!(fee.due_date && fee.due_date < today && bal > 0)
              return {...fee, effectivePaid, balance:bal, status, isOverdue}
            })
            const totalOwed    = enrichedFees.reduce((a,f)=>a+Number(f.amount||0),0)
            const totalPaid    = enrichedFees.reduce((a,f)=>a+f.effectivePaid,0)
            const totalBalance = enrichedFees.reduce((a,f)=>a+f.balance,0)
            const hasOverdue   = enrichedFees.some(f=>f.isOverdue)
            return (
              <div style={{marginTop:24,paddingTop:20,borderTop:'1px solid var(--line)'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',fontFamily:"'Clash Display',sans-serif"}}>Fee Summary</div>
                  {hasOverdue && (
                    <span style={{fontSize:10,fontWeight:700,color:'var(--rose)',background:'rgba(240,107,122,0.1)',border:'1px solid rgba(240,107,122,0.25)',borderRadius:4,padding:'2px 8px'}}>⚠ Overdue</span>
                  )}
                </div>
                <div style={{display:'flex',gap:8,marginBottom:14}}>
                  {[
                    ['Total Billed', fmtMoney(totalOwed,currency),    'var(--mist2)'],
                    ['Total Paid',   fmtMoney(totalPaid,currency),    'var(--emerald)'],
                    ['Balance',      fmtMoney(totalBalance,currency), totalBalance>0?'var(--rose)':'var(--emerald)'],
                  ].map(([label,value,color])=>(
                    <div key={label} style={{flex:1,padding:'10px 14px',background:'var(--ink3)',borderRadius:'var(--r-sm)',border:'1px solid var(--line)',textAlign:'center'}}>
                      <div style={{fontSize:15,fontWeight:700,color}}>{value}</div>
                      <div style={{fontSize:10,color:'var(--mist3)',marginTop:2}}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {enrichedFees.map(fee=>{
                    const sc = FEE_STATUS[fee.status]||{color:'var(--mist2)',bg:'var(--ink4)'}
                    return (
                      <div key={fee.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--ink3)',borderRadius:'var(--r-sm)',border:`1px solid ${fee.isOverdue?'rgba(240,107,122,0.25)':'var(--line)'}`}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                            <span style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{fee.fee_type||'Fee'}</span>
                            {fee.period && <span style={{fontSize:10,color:'var(--mist3)'}}>{fee.period}</span>}
                            {fee.isOverdue && <span style={{fontSize:10,color:'var(--rose)',fontWeight:600}}>Overdue</span>}
                          </div>
                          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                            <span style={{fontSize:11,color:'var(--mist3)'}}>Billed: <span style={{color:'var(--mist)'}}>{fmtMoney(fee.amount,currency)}</span></span>
                            <span style={{fontSize:11,color:'var(--mist3)'}}>Paid: <span style={{color:'var(--emerald)'}}>{fmtMoney(fee.effectivePaid,currency)}</span></span>
                            {fee.due_date && <span style={{fontSize:11,color:'var(--mist3)'}}>Due: <span style={{color:fee.isOverdue?'var(--rose)':'var(--mist)'}}>{fee.due_date}</span></span>}
                          </div>
                        </div>
                        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,flexShrink:0}}>
                          <span style={{fontSize:11,fontWeight:700,color:sc.color,background:sc.bg,border:`1px solid ${sc.color}30`,borderRadius:4,padding:'2px 8px'}}>{fee.status}</span>
                          <span style={{fontSize:12,fontWeight:700,color:fee.balance>0?'var(--rose)':'var(--emerald)'}}>{fmtMoney(fee.balance,currency)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
          </Modal>
        )
      })()}
      {confirmState && <ConfirmModal {...confirmState} onClose={()=>setConfirmState(null)}/>}
    </div>
  )
}