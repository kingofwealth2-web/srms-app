import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../supabase'

const SUPABASE_URL      = 'https://kfcqkgvuluftnwzeqzmw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmY3FrZ3Z1bHVmdG53emVxem13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NzkwMTUsImV4cCI6MjA4NzQ1NTAxNX0.dOW3c8XIfFbIq2ls9gEjgowWguIlWLVflR7nErXojDI'
import { useIsMobile } from '../lib/hooks'
import { ROLE_META } from '../lib/constants'
import { fmtDate } from '../lib/helpers'
import { auditLog } from '../lib/auditLog'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Btn from '../components/Btn'
import Field from '../components/Field'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import SectionTitle from '../components/SectionTitle'
import DataTable from '../components/DataTable'
import Card from '../components/Card'
import LoadingScreen from '../components/LoadingScreen'

// ── USERS MODULE ───────────────────────────────────────────────

export default function Users({profile,toast}) {
  const [users,setUsers]       = useState([])
  const [loading,setLoading]   = useState(true)
  const [modal,setModal]       = useState(false)
  const [edit,setEdit]         = useState(null)
  const [form,setForm]         = useState({})
  const [saving,setSaving]     = useState(false)

  const [createdUser,setCreatedUser]   = useState(null)  // {name,email,pw} shown in overlay
  const [students,setStudents]         = useState([])
  const [parentLinks,setParentLinks]   = useState([])   // student IDs linked to a parent
  const [stuSearch,setStuSearch]       = useState('')
  const f = k=>v=>setForm(p=>({...p,[k]:v}))

  useEffect(()=>{
    if(!profile?.school_id) return
    Promise.all([
      supabase.from('profiles').select('*').eq('school_id', profile?.school_id),
      supabase.from('students').select('id,first_name,middle_name,last_name,student_id,class_id').eq('school_id', profile?.school_id).eq('archived', false).order('last_name'),
    ]).then(([{data:usrs},{data:studs}])=>{
      if(usrs) setUsers(usrs)
      if(studs) setStudents(studs)
      setLoading(false)
    })
  },[profile?.school_id])

  const genPw = ()=>'SRMS'+Math.floor(1000+Math.random()*9000)+'!'
  const openAdd  = ()=>{setEdit(null);setForm({full_name:'',email:'',role:'teacher'});setParentLinks([]);setStuSearch('');setModal(true)}
  const openEdit = async u=>{
    setEdit(u)
    setForm({full_name:u.full_name,email:u.email,role:u.role})
    setStuSearch('')
    if(u.role==='parent'){
      const {data:links} = await supabase.from('parent_students').select('student_id').eq('parent_id',u.id)
      setParentLinks((links||[]).map(l=>l.student_id))
    } else {
      setParentLinks([])
    }
    setModal(true)
  }



  const save = async ()=>{
    if(!form.full_name||!form.email)return
    setSaving(true)
    if(edit){
      const {error} = await supabase.from('profiles').update({full_name:form.full_name,email:form.email,role:form.role}).eq('id',edit.id).eq('school_id',profile?.school_id)
      if(error){ toast(error.message,'error'); setSaving(false); return }
      // If switching away from class teacher, unlink from class
      if(edit.role==='classteacher' && form.role!=='classteacher'){
        await supabase.from('profiles').update({class_id:null}).eq('id',edit.id)
        await supabase.from('classes').update({class_teacher_id:null}).eq('class_teacher_id',edit.id).eq('school_id',profile?.school_id)
      }
      // Re-fetch from DB to confirm the change actually saved
      const {data:refreshed} = await supabase.from('profiles').select('*').eq('id',edit.id).single()
      if(refreshed){
        setUsers(p=>p.map(u=>u.id===edit.id?refreshed:u))
      }
      // Handle parent link changes on edit
      if(form.role==='parent'){
        await supabase.from('parent_students').delete().eq('parent_id',edit.id).eq('school_id',profile?.school_id)
        if(parentLinks.length>0){
          await supabase.from('parent_students').insert(parentLinks.map(sid=>({parent_id:edit.id,student_id:sid,school_id:profile?.school_id})))
        }
      }
      auditLog(profile,'Users','Updated',`${form.full_name} · Role: ${edit.role}→${form.role}`,{},{...edit},{...form})
      toast('User updated')
      setModal(false)
    } else {
      // Use a throwaway client so signUp never touches the SA's current session
      const pw = genPw()
      const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
      const {data:authData,error:authErr} = await tempClient.auth.signUp({
        email: form.email,
        password: pw,
        options: { data: { full_name: form.full_name, role: form.role } }
      })
      await tempClient.auth.signOut()
      if(authErr){ toast(authErr.message,'error'); setSaving(false); return }
      const uid = authData?.user?.id
      if(!uid){ toast('User account created but could not get ID.','error'); setSaving(false); return }
      const {error:profErr} = await supabase.rpc('create_school_user', {
        p_user_id:   uid,
        p_full_name: form.full_name,
        p_email:     form.email,
        p_role:      form.role,
        p_school_id: profile?.school_id,
      })
      if(profErr){ toast(profErr.message,'error'); setSaving(false); return }
      // Flag this account for forced password change on first login
      await supabase.from('profiles').update({must_change_password:true}).eq('id',uid)
      // Fetch the full profile row so all fields are present in local state
      const {data:newProf} = await supabase.from('profiles').select('*').eq('id',uid).single()
      setUsers(p=>[...p, newProf||{id:uid,full_name:form.full_name,email:form.email,role:form.role,locked:false}])
      // Insert parent-student links if parent role
      if(form.role==='parent' && parentLinks.length>0){
        await supabase.from('parent_students').insert(parentLinks.map(sid=>({parent_id:uid,student_id:sid,school_id:profile?.school_id})))
      }
      auditLog(profile,'Users','Created',`${form.full_name} · ${form.role}`,{},null,{id:uid,full_name:form.full_name,email:form.email,role:form.role})
      setCreatedUser({name:form.full_name,email:form.email,pw})
    }
    setSaving(false)
  }

  const toggleLock = async id=>{
    const u=users.find(x=>x.id===id)
    if(!u) return
    if(u.id===profile?.id){toast('You cannot lock your own account.','error');return}
    if(u.role==='superadmin'){toast('Super Admin accounts cannot be locked.','error');return}
    const {error} = await supabase.from('profiles').update({locked:!u.locked}).eq('id',id).eq('school_id',profile?.school_id)
    if(error){toast('Failed to update -- check Supabase RLS policies.','error');return}
    setUsers(p=>p.map(x=>x.id===id?{...x,locked:!x.locked}:x))
    auditLog(profile,'Users',u.locked?'Unlocked':'Locked',`${u.full_name} · ${u.email}`,{},{...u},null)
    toast(u.locked ? 'Account unlocked.' : 'Account locked.')
  }

  if(loading) return <LoadingScreen msg='Loading users...'/>
  return (
    <div>
      <PageHeader title='User Management' sub={`${users.length} system users`}>
        <Btn onClick={openAdd}>+ Add User</Btn>
      </PageHeader>
      <Card>
        <DataTable data={users} columns={[
          {key:'full_name',label:'User',render:(v,r)=>(
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <Avatar name={v} size={36} color={ROLE_META[r.role]?.bg}/>
              <div>
                <div style={{fontWeight:600}}>{v}{r.id===profile?.id&&<span style={{fontSize:10,color:'var(--gold)',marginLeft:8,fontFamily:"'Clash Display',sans-serif"}}>YOU</span>}</div>
                <div style={{fontSize:11,color:'var(--mist3)'}}>{r.email}</div>
              </div>
            </div>
          )},
          {key:'role',label:'Role',render:v=>{const m=ROLE_META[v]||{};return<Badge color={m.color} bg={m.bg}>{m.label||v}</Badge>}},
          {key:'locked',label:'Status',render:v=><Badge color={v?'var(--rose)':'var(--emerald)'} bg={v?'rgba(240,107,122,0.1)':'rgba(45,212,160,0.1)'}>{v?'Locked':'Active'}</Badge>},
          {key:'id',label:'',render:(v,r)=>{
            const isSelf = r.id===profile?.id
            const viewerIsAdmin = profile?.role==='admin'
            const targetIsPrivileged = r.role==='superadmin'||r.role==='admin'
            const canEdit = !viewerIsAdmin || !targetIsPrivileged
            const canLock = !isSelf && r.role!=='superadmin' && !(viewerIsAdmin && r.role==='admin')
            return(
            <div style={{display:'flex',gap:8}}>
              {canEdit && <Btn variant='ghost' size='sm' onClick={()=>openEdit(r)}>Edit</Btn>}
              {canLock && <Btn variant='ghost' size='sm' onClick={()=>toggleLock(r.id)}>{r.locked?'Unlock':'Lock'}</Btn>}
            </div>
          )}},
        ]}/>
      </Card>
      {createdUser && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'var(--ink2)',border:'1px solid var(--line)',borderRadius:16,padding:32,maxWidth:440,width:'100%',boxShadow:'0 24px 80px rgba(0,0,0,0.5)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
              <div style={{width:44,height:44,borderRadius:10,background:'rgba(45,212,160,0.1)',border:'1px solid rgba(45,212,160,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>✓</div>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>Account created</div>
                <div style={{fontSize:12,color:'var(--mist3)',marginTop:2}}>{createdUser.name} · {createdUser.email}</div>
              </div>
            </div>
            <div style={{marginBottom:8,fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',fontFamily:"'Clash Display',sans-serif"}}>Temporary Password</div>
            <div style={{background:'var(--ink)',border:'1px solid var(--gold)',borderRadius:10,padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,gap:12}}>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,fontWeight:700,letterSpacing:'0.08em',color:'var(--gold)'}}>{createdUser.pw}</span>
              <button onClick={()=>{navigator.clipboard.writeText(createdUser.pw).then(()=>{})}}
                style={{background:'rgba(232,184,75,0.12)',border:'1px solid rgba(232,184,75,0.3)',borderRadius:7,padding:'7px 14px',color:'var(--gold)',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',fontFamily:"'Cabinet Grotesk',sans-serif"}}>
                Copy
              </button>
            </div>
            <div style={{background:'rgba(240,107,122,0.07)',border:'1px solid rgba(240,107,122,0.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'var(--rose)',lineHeight:1.6,marginBottom:24}}>
              ⚠ This password will not be shown again. Share it with the user now via WhatsApp or SMS. They will be prompted to change it on first login.
            </div>
            <button onClick={()=>{setCreatedUser(null);setModal(false)}}
              style={{width:'100%',background:'var(--gold)',border:'none',borderRadius:9,padding:'12px',fontSize:14,fontWeight:700,color:'var(--ink)',cursor:'pointer',fontFamily:"'Cabinet Grotesk',sans-serif"}}>
              Done
            </button>
          </div>
        </div>
      )}
      {modal && (
        <Modal title={edit?'Edit User':'Add New User'} subtitle={edit?`Editing ${edit.full_name}`:'Create a login account for a staff member.'} onClose={()=>{ setModal(false); setCreatedUser(null) }}>
          <Field label='Full Name' value={form.full_name} onChange={f('full_name')} required/>
          <Field label='Email Address' value={form.email} onChange={f('email')} type='email' required/>
          {edit?.id===profile?.id
            ? <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6,fontFamily:"'Clash Display',sans-serif"}}>Role</div>
                <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'9px 14px',fontSize:13,color:'var(--mist3)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span>{ROLE_META[form.role]?.label||form.role}</span>
                  <span style={{fontSize:11,color:'var(--mist3)'}}>Cannot change your own role</span>
                </div>
              </div>
            : <Field label='Role' value={form.role} onChange={f('role')} options={
                profile?.role === 'admin'
                  ? [{value:'classteacher',label:'Class Teacher'},{value:'teacher',label:'Subject Teacher'},{value:'parent',label:'Parent / Guardian'}]
                  : [{value:'admin',label:'Administrator'},{value:'classteacher',label:'Class Teacher'},{value:'teacher',label:'Subject Teacher'},{value:'parent',label:'Parent / Guardian'}]
              }/>
          }

          {form.role==='parent' && (
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8,fontFamily:"'Clash Display',sans-serif"}}>
                Linked Children {parentLinks.length>0&&<span style={{color:'var(--gold)'}}>({parentLinks.length} selected)</span>}
              </div>
              <input value={stuSearch} onChange={e=>setStuSearch(e.target.value)}
                placeholder='Search students...'
                style={{width:'100%',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 12px',color:'var(--white)',fontSize:13,marginBottom:8,fontFamily:"'Cabinet Grotesk',sans-serif"}}/>
              <div style={{maxHeight:200,overflowY:'auto',display:'flex',flexDirection:'column',gap:4,border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:8,background:'var(--ink3)'}}>
                {students.filter(s=>{
                  const q=stuSearch.toLowerCase()
                  return !q||(s.first_name+' '+(s.middle_name||'')+' '+s.last_name+' '+s.student_id).toLowerCase().includes(q)
                }).map(s=>{
                  const checked=parentLinks.includes(s.id)
                  return(
                    <label key={s.id} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 8px',borderRadius:6,cursor:'pointer',background:checked?'var(--gold-dim)':'transparent',border:`1px solid ${checked?'rgba(232,184,75,0.25)':'transparent'}`}}>
                      <input type='checkbox' checked={checked}
                        onChange={()=>setParentLinks(p=>checked?p.filter(x=>x!==s.id):[...p,s.id])}
                        style={{accentColor:'var(--gold)',width:14,height:14}}/>
                      <div>
                        <div style={{fontSize:13,fontWeight:600}}>{s.first_name} {s.middle_name||''} {s.last_name}</div>
                        <div style={{fontSize:11,color:'var(--mist3)',fontFamily:"'JetBrains Mono',monospace"}}>{s.student_id}</div>
                      </div>
                    </label>
                  )
                })}
                {students.filter(s=>{const q=stuSearch.toLowerCase();return !q||(s.first_name+' '+(s.middle_name||'')+' '+s.last_name+' '+s.student_id).toLowerCase().includes(q)}).length===0&&(
                  <div style={{fontSize:12,color:'var(--mist3)',textAlign:'center',padding:8}}>No students found</div>
                )}
              </div>
            </div>
          )}
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving?<><Spinner/> Saving...</>:edit?'Save Changes':'Create User'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}


// ── MY PROFILE ─────────────────────────────────────────────────