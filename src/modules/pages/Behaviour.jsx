import { useState } from 'react'
import { supabase } from '../../supabase'
import { useIsMobile } from '../lib/hooks'
import { ROLE_META, BEHAVIOUR_META } from '../lib/constants'
import { fmtDate, fullName } from '../lib/helpers'
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

// ── BEHAVIOUR ──────────────────────────────────────────────────
export default function Behaviour({profile,data,setData,toast,settings,activeYear,isViewingPast}) {
  const {behaviour=[],students=[],classes=[]} = data
  const activeStudents = students.filter(s=>!s.archived)
  const myClasses = profile?.role==='classteacher' ? classes.filter(c=>c.id===profile.class_id) : classes
  const [fClassId,setFClassId] = useState(profile?.role==='classteacher' ? (profile?.class_id||'') : '')
  const [ftype,setFtype] = useState('')
  const [fsid,setFsid]   = useState('')
  const [modal,setModal] = useState(false)
  const [form,setForm]   = useState({})
  const [saving,setSaving] = useState(false)
  const [confirmState,setConfirmState] = useState(null)
  const f = k=>v=>setForm(p=>({...p,[k]:v}))
  const types = ['Discipline','Achievement','Club Activity','Notes']
  const studentsInClass = fClassId ? activeStudents.filter(s=>s.class_id===fClassId) : activeStudents
  const filtered = behaviour.filter(b=>{
    if(ftype&&b.type!==ftype) return false
    if(fsid&&b.student_id!==fsid) return false
    if(fClassId){const s=activeStudents.find(x=>x.id===b.student_id); if(!s||s.class_id!==fClassId) return false}
    return true
  }).sort((a,b)=>b.created_at?.localeCompare(a.created_at))
  const counts   = types.reduce((acc,t)=>({...acc,[t]:behaviour.filter(b=>b.type===t).length}),{})
  const openAdd  = ()=>{setEditRow(null);setForm({student_id:'',type:'Achievement',title:'',description:'',date:new Date().toISOString().split('T')[0]});setModal(true)}
  const save = async ()=>{
    if(!form.student_id||!form.title)return
    setSaving(true)
    if(editRow){
      const {error}=await supabase.from('behaviour').update({type:form.type,title:form.title,description:form.description,date:form.date}).eq('id',editRow.id).eq('school_id',profile?.school_id)
      if(error){toast(error.message,'error');setSaving(false);return}
      const updated={...editRow,...form}
      setData(p=>({...p,behaviour:p.behaviour.map(b=>b.id===editRow.id?updated:b)}))
      const s=students.find(x=>x.id===form.student_id)
      auditLog(profile,'Behaviour','Edited',`${fullName(s)} · ${form.type} · ${form.title}`,{},{...editRow},{...form})
      toast('Record updated');setModal(false);setEditRow(null)
    } else {
      const {data:row,error}=await supabase.from('behaviour').insert({...form,school_id:profile?.school_id,recorded_by_id:profile?.id,recorded_by_name:profile?.full_name,academic_year:activeYear}).select().single()
      if(error)toast(error.message,'error')
      else{setData(p=>({...p,behaviour:[row,...p.behaviour]}));const s=students.find(x=>x.id===form.student_id);auditLog(profile,'Behaviour','Created',`${fullName(s)} · ${form.type} · ${form.title}`,{},null,row);toast('Record added');setModal(false)}
    }
    setSaving(false)
  }
  const [editRow,setEditRow] = useState(null)
  const openEdit = r=>{setEditRow(r);setForm({student_id:r.student_id,type:r.type,title:r.title,description:r.description||'',date:r.date||new Date().toISOString().split('T')[0]});setModal(true)}
  const del = async id=>{
    setConfirmState({title:'Remove record?',body:'This behaviour record will be permanently deleted.',icon:'🗑',danger:true,onConfirm:async()=>{
      const {error}=await supabase.from('behaviour').delete().eq('id',id).eq('school_id',profile?.school_id)
      if(error)toast(error.message,'error')
      else{const rec=behaviour.find(x=>x.id===id);const s=students.find(x=>x.id===rec?.student_id);setData(p=>({...p,behaviour:p.behaviour.filter(b=>b.id!==id)}));auditLog(profile,'Behaviour','Deleted',`${fullName(s)} · ${rec?.type} · ${rec?.title}`,{},rec,null);toast('Record removed')}
    }})
  }

  const exportBehaviourCsv = () => {
    try{
      if(filtered.length===0){ toast('No behaviour records to export','error'); return }
      const esc = v => {
        if(v===null||v===undefined) return ''
        return String(v).replace(/"/g,'""')
      }
      let csv = 'Date,Class,Student ID,Student,Type,Title,Description,Recorded By\n'
      filtered.forEach(b=>{
        const s   = students.find(x=>x.id===b.student_id)
        const cls = s ? classes.find(c=>c.id===s.class_id)?.name || '' : ''
        const bName = s ? s.first_name+' '+s.last_name : ''
        csv += `"${esc(b.date||b.created_at)}","${esc(cls)}","${esc(s?.student_id)}","${esc(bName)}","${esc(b.type)}","${esc(b.title)}","${esc(b.description)}","${esc(b.recorded_by_name)}"\n`
      })
      const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `SRMS_Behaviour_${activeYear}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch(e){
      toast('Export failed. Please try again.','error')
    }
  }

  return (
    <div>
      <PageHeader title='Behaviour & Extracurricular' sub='Discipline, achievements and co-curricular records'>
        {!isViewingPast && <Btn onClick={openAdd}>+ Add Record</Btn>}
        {['superadmin','admin'].includes(profile?.role) && (
          <Btn variant='ghost' onClick={exportBehaviourCsv}>⬇ Export CSV</Btn>
        )}
      </PageHeader>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
        {types.map((t,i)=>{
          const m=BEHAVIOUR_META[t];const isAct=ftype===t
          return(
            <div key={t} className={`fu fu${i+1}`} onClick={()=>setFtype(isAct?'':t)}
              style={{background:isAct?`${m.color}10`:'var(--ink2)',border:`1px solid ${isAct?m.color:'var(--line)'}`,borderRadius:'var(--r)',padding:18,cursor:'pointer',transition:'all 0.15s'}}>
              <div style={{fontSize:22,marginBottom:8}}>{m.icon}</div>
              <div className='d' style={{fontSize:24,fontWeight:700,color:m.color}}>{counts[t]}</div>
              <div style={{fontSize:12,color:'var(--mist2)',marginTop:4}}>{t}</div>
            </div>
          )
        })}
      </div>
      <Card style={{marginBottom:16,padding:'14px 20px'}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          <select value={fClassId} onChange={e=>{setFClassId(e.target.value);setFsid('')}} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:180}}>
            <option value=''>All Classes</option>
            {myClasses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={fsid} onChange={e=>setFsid(e.target.value)} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:200}}>
            <option value=''>All Students</option>
            {studentsInClass.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
          </select>
          <select value={ftype} onChange={e=>setFtype(e.target.value)} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer'}}>
            <option value=''>All Types</option>
            {types.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
      </Card>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {filtered.length===0 && <div style={{padding:48,textAlign:'center',color:'var(--mist3)',fontSize:13}}>No records found.</div>}
        {filtered.map(b=>{
          const s=students.find(x=>x.id===b.student_id)
          const m=BEHAVIOUR_META[b.type]||{color:'var(--mist2)',icon:'◎'}
          return(
            <div key={b.id} style={{background:'var(--ink2)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:'18px 20px',display:'flex',gap:14,alignItems:'flex-start',transition:'border-color 0.15s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor='var(--line2)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--line)'}>
              <div style={{width:4,borderRadius:2,alignSelf:'stretch',background:m.color,flexShrink:0}}/>
              <div style={{width:36,height:36,borderRadius:'50%',background:`${m.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{m.icon}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                  <div>
                    <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:6}}>
                      <Badge color={m.color} bg={`${m.color}15`}>{b.type}</Badge>
                      <span style={{fontWeight:600,fontSize:14}}>{b.title}</span>
                    </div>
                    <p style={{fontSize:13,color:'var(--mist2)',lineHeight:1.6}}>{b.description}</p>
                    <div style={{fontSize:11,color:'var(--mist3)',marginTop:8}}>
                      {s&&<><span style={{color:'var(--mist2)',fontWeight:500}}>{fullName(s,true)}</span> . </>}
                      Recorded by {b.recorded_by_name} . {fmtDate(b.date||b.created_at)}
                    </div>
                  </div>
                  {!isViewingPast && (
                    <div style={{display:'flex',gap:6,flexShrink:0}}>
                      <Btn variant='ghost' size='sm' onClick={()=>openEdit(b)}>Edit</Btn>
                      <Btn variant='ghost' size='sm' onClick={()=>del(b.id)}
                        style={{color:'var(--rose)',borderColor:'rgba(240,107,122,0.25)'}}>
                        Delete
                      </Btn>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {modal && (
        <Modal title={editRow?'Edit Behaviour Record':'New Behaviour Record'} onClose={()=>{setModal(false);setEditRow(null)}}>
          <Field label='Student' value={form.student_id} onChange={f('student_id')} required options={studentsInClass.map(s=>({value:s.id,label:`${fullName(s,true)} · ${classes.find(c=>c.id===s.class_id)?.name||''}`}))}/>
          <Field label='Record Type' value={form.type} onChange={f('type')} options={types}/>
          <Field label='Title' value={form.title} onChange={f('title')} placeholder='Brief descriptive title' required/>
          <Field label='Description' value={form.description} onChange={f('description')} rows={3} placeholder='Provide full details...'/>
          <Field label='Date' value={form.date} onChange={f('date')} type='date'/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving?<><Spinner/> Saving...</>:'Save Record'}</Btn>
          </div>
        </Modal>
      )}
      {confirmState && <ConfirmModal {...confirmState} onClose={()=>setConfirmState(null)}/>}
    </div>
  )
}

// ── ORDINAL HELPER ─────────────────────────────────────────────
const ordinal = n => {
  if(n===null||n===undefined||isNaN(n)) return '--'
  const s=['th','st','nd','rd'], v=n%100
  return n+(s[(v-20)%10]||s[v]||s[0])
}
// Auto-abbreviate subject names: multi-word → initials, single-word → first 4 chars
const abbrSubject = name => {
  if(!name) return '?'
  const words = name.trim().split(/\s+/).filter(Boolean)
  if(words.length>=2) return words.map(w=>w[0].toUpperCase()).join('')
  return name.slice(0,4).toUpperCase()
}