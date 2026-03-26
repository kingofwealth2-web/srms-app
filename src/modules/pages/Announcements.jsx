import { useState } from 'react'
import { supabase } from '../../supabase'
import { useIsMobile, usePlan } from '../lib/hooks'
import { ROLE_META } from '../lib/constants'
import { fmtDate, canSeeAnnouncement } from '../lib/helpers'
import { auditLog } from '../lib/auditLog'
import Badge from '../components/Badge'
import Btn from '../components/Btn'
import Field from '../components/Field'
import Modal from '../components/Modal'
import PlanGate from '../components/PlanGate'
import ConfirmModal from '../components/ConfirmModal'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import SectionTitle from '../components/SectionTitle'
import Card from '../components/Card'

// ── ANNOUNCEMENTS ──────────────────────────────────────────────
export default function Announcements({profile,data,setData,toast,settings,activeYear,isViewingPast}) {
  const planHook = usePlan(settings)
  if (!planHook.can('announcements')) return (
    <div style={{padding:'40px 24px'}}>
      <PlanGate planHook={planHook} feature='announcements' mode='block'><></></PlanGate>
    </div>
  )
  const {announcements=[]} = data
  const canManage = ['superadmin','admin'].includes(profile?.role)
  const [modal,setModal] = useState(false)
  const [form,setForm]   = useState({})
  const [confirmState,setConfirmState] = useState(null)
  const [saving,setSaving] = useState(false)
  const f = k=>v=>setForm(p=>({...p,[k]:v}))
  const visible = announcements.filter(a=>['superadmin','admin'].includes(profile?.role) ? true : canSeeAnnouncement(profile?.role,a)).sort((a,b)=>b.created_at?.localeCompare(a.created_at))
  const [editRow,setEditRow] = useState(null)
  const openAdd  = ()=>{setEditRow(null);setForm({title:'',body:'',target_role:'all'});setModal(true)}
  const openEdit = a=>{setEditRow(a);setForm({title:a.title,body:a.body,target_role:a.target_role});setModal(true)}
  const save = async ()=>{
    if(!form.title?.trim()||!form.body?.trim()){ toast('Please fill in Title and Body before posting.','error'); return }
    setSaving(true)
    if(editRow){
      const {error}=await supabase.from('announcements').update({title:form.title,body:form.body,target_role:form.target_role}).eq('id',editRow.id).eq('school_id',profile?.school_id)
      if(error){toast(error.message,'error');setSaving(false);return}
      setData(p=>({...p,announcements:p.announcements.map(a=>a.id===editRow.id?{...a,...form}:a)}))
      auditLog(profile,'Announcements','Edited',form.title,{},{...editRow},{...form})
      toast('Announcement updated');setModal(false);setEditRow(null)
    } else {
      const {data:row,error}=await supabase.from('announcements').insert({...form,school_id:profile?.school_id,active:true,posted_by_id:profile?.id,posted_by_name:profile?.full_name,academic_year:activeYear}).select().single()
      if(error)toast(error.message,'error')
      else{setData(p=>({...p,announcements:[row,...p.announcements]}));auditLog(profile,'Announcements','Created',`"${form.title}"`,{},null,row);toast('Announcement posted');setModal(false)}
    }
    setSaving(false)
  }
  const toggle = async id=>{
    const ann=announcements.find(a=>a.id===id)
    const {error}=await supabase.from('announcements').update({active:!ann.active}).eq('id',id).eq('school_id',profile?.school_id)
    if(error){toast(error.message,'error');return}
    setData(p=>({...p,announcements:p.announcements.map(a=>a.id===id?{...a,active:!a.active}:a)}))
    auditLog(profile,'Announcements',ann.active?'Deactivated':'Activated',`"${ann.title}"`,{},{...ann},{...ann,active:!ann.active})
    toast(ann.active ? 'Announcement deactivated.' : 'Announcement activated.')
  }
  const del = async id=>{
    setConfirmState({title:'Delete announcement?',body:'This will permanently remove the announcement for all users.',icon:'🗑',danger:true,onConfirm:async()=>{
      const ann=announcements.find(a=>a.id===id)
      const {error}=await supabase.from('announcements').delete().eq('id',id).eq('school_id',profile?.school_id)
      if(error){toast(error.message,'error');return}
      setData(p=>({...p,announcements:p.announcements.filter(a=>a.id!==id)}))
      auditLog(profile,'Announcements','Deleted',`"${ann?.title}"`,{},ann,null)
      toast('Announcement deleted')
    }})
  }
  const roleColor={all:'var(--gold)',teacher:'var(--sky)',admin:'var(--amber)'}
  return (
    <div>
      <PageHeader title='Announcements' sub={`${announcements.filter(a=>a.active).length} active`}>
        {canManage && !isViewingPast && <Btn onClick={openAdd}>+ Post Announcement</Btn>}
      </PageHeader>
      {visible.length===0 && <Card style={{textAlign:'center',padding:60}}><div style={{fontSize:32,marginBottom:12}}>◯</div><div style={{fontWeight:600,marginBottom:6}}>No announcements</div><div style={{color:'var(--mist3)',fontSize:13,marginBottom:20}}>Nothing posted yet.</div>{canManage&&<Btn onClick={openAdd}>Post First Announcement</Btn>}</Card>}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {visible.map((a,i)=>{
          const rc=roleColor[a.target_role]||'var(--gold)'
          const isOwner=a.posted_by_id===profile?.id||profile?.role==='superadmin'
          const audienceLabel=a.target_role==='all'?'Everyone':a.target_role==='teacher'?'Teachers':'Admins'
          return (
          <div key={a.id} className={`fu fu${Math.min(i+1,6)}`}
            style={{background:'var(--ink2)',border:'1px solid var(--line)',borderRadius:'var(--r)',overflow:'hidden',opacity:a.active?1:0.55,transition:'opacity 0.2s',borderLeft:`3px solid ${a.active?rc:'var(--line)'}`}}>
            <div style={{display:'flex'}}>
              <div style={{width:52,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-start',padding:'18px 0',background:`${rc}08`,borderRight:`1px solid ${rc}20`,flexShrink:0}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:`${rc}20`,border:`1px solid ${rc}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:rc}}>
                  {(a.posted_by_name||'?')[0].toUpperCase()}
                </div>
              </div>
              <div style={{flex:1,padding:'16px 18px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:8}}>
                      <Badge color={rc} bg={`${rc}15`}>{audienceLabel}</Badge>
                      {!a.active&&<Badge color='var(--mist3)' bg='var(--ink3)'>Inactive</Badge>}
                      <span style={{fontSize:11,color:'var(--mist3)'}}>{fmtDate(a.created_at)}</span>
                    </div>
                    <h3 style={{fontSize:14,fontWeight:700,marginBottom:6,color:'var(--white)'}}>{a.title}</h3>
                    <p style={{fontSize:13,color:'var(--mist2)',lineHeight:1.7,margin:0}}>{a.body}</p>
                    <div style={{fontSize:11,color:'var(--mist3)',marginTop:10}}>Posted by <strong style={{color:'var(--mist2)'}}>{a.posted_by_name}</strong></div>
                  </div>
                  {canManage&&!isViewingPast&&(
                    <div style={{display:'flex',gap:6,flexShrink:0,alignItems:'center'}}>
                      {isOwner&&<Btn variant='ghost' size='sm' onClick={()=>openEdit(a)}>Edit</Btn>}
                      {isOwner&&(
                        <Btn variant='ghost' size='sm' onClick={()=>toggle(a.id)}
                          style={{color:a.active?'var(--amber)':'var(--emerald)',borderColor:a.active?'rgba(251,159,58,0.3)':'rgba(45,212,160,0.3)'}}>
                          {a.active?'Deactivate':'Activate'}
                        </Btn>
                      )}
                      {isOwner&&<Btn variant='danger' size='sm' onClick={()=>del(a.id)}>Delete</Btn>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          )
        })}
      </div>
      {modal && (
        <Modal title={editRow?'Edit Announcement':'New Announcement'} onClose={()=>{setModal(false);setEditRow(null)}}>
          <Field label='Title' value={form.title} onChange={f('title')} required/>
          <Field label='Message' value={form.body} onChange={f('body')} rows={4} required placeholder='Full announcement text...'/>
          <Field label='Target Audience' value={form.target_role} onChange={f('target_role')} options={[{value:'all',label:'Everyone'},{value:'teacher',label:'Teachers Only'},{value:'admin',label:'Admins Only'}]}/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving?<><Spinner/> Saving...</>:editRow?'Save Changes':'Post Announcement'}</Btn>
          </div>
        </Modal>
      )}
      {confirmState && <ConfirmModal {...confirmState} onClose={()=>setConfirmState(null)}/>}
    </div>
  )
}