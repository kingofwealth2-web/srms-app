import { useState } from 'react'
import { supabase } from '../../supabase'
import { useIsMobile } from '../lib/hooks'
import { ROLE_META } from '../lib/constants'
import { fmtDate, canSeeAnnouncement } from '../lib/helpers'
import { auditLog } from '../lib/auditLog'
import Badge from '../components/Badge'
import Btn from '../components/Btn'
import Field from '../components/Field'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import SectionTitle from '../components/SectionTitle'
import Card from '../components/Card'

// ── ANNOUNCEMENTS ──────────────────────────────────────────────
export default function Announcements({profile,data,setData,toast,activeYear,isViewingPast}) {
  const {announcements=[]} = data
  const canManage = ['superadmin','admin'].includes(profile?.role)
  const [modal,setModal] = useState(false)
  const [form,setForm]   = useState({})
  const [saving,setSaving] = useState(false)
  const f = k=>v=>setForm(p=>({...p,[k]:v}))
  const visible = announcements.filter(a=>profile?.role==="superadmin" ? true : canSeeAnnouncement(profile?.role,a)).sort((a,b)=>b.created_at?.localeCompare(a.created_at))
  const openAdd = ()=>{setForm({title:'',body:'',target_role:'all'});setModal(true)}
  const save = async ()=>{
    if(!form.title||!form.body)return
    setSaving(true)
    const {data:row,error}=await supabase.from('announcements').insert({...form,school_id:profile?.school_id,active:true,posted_by_id:profile?.id,posted_by_name:profile?.full_name,academic_year:activeYear}).select().single()
    if(error)toast(error.message,'error')
    else{setData(p=>({...p,announcements:[row,...p.announcements]}));toast('Announcement posted');setModal(false)}
    setSaving(false)
  }
  const toggle = async id=>{
    const ann=announcements.find(a=>a.id===id)
    await supabase.from('announcements').update({active:!ann.active}).eq('id',id)
    setData(p=>({...p,announcements:p.announcements.map(a=>a.id===id?{...a,active:!a.active}:a)}))
  }
  const del = async id=>{
    if(!confirm('Delete this announcement?'))return
    await supabase.from('announcements').delete().eq('id',id)
    setData(p=>({...p,announcements:p.announcements.filter(a=>a.id!==id)}))
    toast('Announcement deleted')
  }
  const roleColor={all:'var(--gold)',teacher:'var(--sky)',admin:'var(--amber)'}
  return (
    <div>
      <PageHeader title='Announcements' sub={`${announcements.filter(a=>a.active).length} active`}>
        {canManage && !isViewingPast && <Btn onClick={openAdd}>+ Post Announcement</Btn>}
      </PageHeader>
      {visible.length===0 && <Card style={{textAlign:'center',padding:60}}><div style={{fontSize:32,marginBottom:12}}>◯</div><div style={{fontWeight:600,marginBottom:6}}>No announcements</div><div style={{color:'var(--mist3)',fontSize:13,marginBottom:20}}>Nothing posted yet.</div>{canManage&&<Btn onClick={openAdd}>Post First Announcement</Btn>}</Card>}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {visible.map((a,i)=>(
          <div key={a.id} className={`fu fu${Math.min(i+1,6)}`} style={{background:'var(--ink2)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:'20px 24px',opacity:a.active?1:0.5,borderLeft:`3px solid ${a.active?roleColor[a.target_role]||'var(--gold)':'var(--line)'}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,flexWrap:'wrap'}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:10}}>
                  <h3 style={{fontSize:15,fontWeight:600}}>{a.title}</h3>
                  <Badge color={roleColor[a.target_role]||'var(--mist2)'}>{a.target_role==='all'?'Everyone':a.target_role==='teacher'?'Teachers':'Admins'}</Badge>
                  {!a.active && <Badge color='var(--mist3)'>Inactive</Badge>}
                </div>
                <p style={{fontSize:13,color:'var(--mist2)',lineHeight:1.7}}>{a.body}</p>
                <div style={{fontSize:11,color:'var(--mist3)',marginTop:12}}>Posted by <strong style={{color:'var(--mist2)'}}>{a.posted_by_name}</strong> . {fmtDate(a.created_at)}</div>
              </div>
              {canManage && !isViewingPast && (
                <div style={{display:'flex',gap:8,flexShrink:0}}>
                  <Btn variant='ghost' size='sm' onClick={()=>toggle(a.id)}>{a.active?'Deactivate':'Activate'}</Btn>
                  <Btn variant='danger' size='sm' onClick={()=>del(a.id)}>Delete</Btn>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <Modal title='New Announcement' onClose={()=>setModal(false)}>
          <Field label='Title' value={form.title} onChange={f('title')} required/>
          <Field label='Message' value={form.body} onChange={f('body')} rows={4} required placeholder='Full announcement text...'/>
          <Field label='Target Audience' value={form.target_role} onChange={f('target_role')} options={[{value:'all',label:'Everyone'},{value:'teacher',label:'Teachers Only'},{value:'admin',label:'Admins Only'}]}/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving?<><Spinner/> Posting...</>:'Post Announcement'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}