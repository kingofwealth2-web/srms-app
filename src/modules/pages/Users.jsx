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

  const [tempPassword,setTempPassword] = useState('')
  const f = k=>v=>setForm(p=>({...p,[k]:v}))

  useEffect(()=>{
    if(!profile?.school_id) return
    supabase.from('profiles').select('*').eq('school_id', profile?.school_id).then(({data})=>{ if(data) setUsers(data); setLoading(false) })
  },[profile?.school_id])

  const openAdd  = ()=>{setEdit(null);setForm({full_name:'',email:'',password:'',role:'teacher'});setModal(true)}
  const openEdit = u=>{setEdit(u);setForm({full_name:u.full_name,email:u.email,role:u.role,password:''});setModal(true)}



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
      auditLog(profile,'Users','Updated',`${form.full_name} · Role: ${edit.role}→${form.role}`,{},{...edit},{...form})
      toast('User updated')
      setModal(false)
    } else {
      if(!form.password)return
      // Use a throwaway client so signUp never touches the SA's current session
      const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
      const {data:authData,error:authErr} = await tempClient.auth.signUp({
        email: form.email,
        password: form.password,
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
      // Fetch the full profile row so all fields are present in local state
      const {data:newProf} = await supabase.from('profiles').select('*').eq('id',uid).single()
      setUsers(p=>[...p, newProf||{id:uid,full_name:form.full_name,email:form.email,role:form.role,locked:false}])
      auditLog(profile,'Users','Created',`${form.full_name} · ${form.role}`,{},null,{id:uid,full_name:form.full_name,email:form.email,role:form.role})
      toast('User created successfully')
      setModal(false)
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
          {key:'id',label:'',render:(v,r)=>(
            <div style={{display:'flex',gap:8}}>
              <Btn variant='ghost' size='sm' onClick={()=>openEdit(r)}>Edit</Btn>
              {r.id!==profile?.id && r.role!=='superadmin' &&
                <Btn variant='ghost' size='sm' onClick={()=>toggleLock(r.id)}>{r.locked?'Unlock':'Lock'}</Btn>
              }
            </div>
          )},
        ]}/>
      </Card>
      {modal && (
        <Modal title={edit?'Edit User':'Add New User'} subtitle={edit?`Editing ${edit.full_name}`:'Create a login account for a staff member.'} onClose={()=>setModal(false)}>
          <Field label='Full Name' value={form.full_name} onChange={f('full_name')} required/>
          <Field label='Email Address' value={form.email} onChange={f('email')} type='email' required/>
          {!edit && <Field label='Password' value={form.password} onChange={f('password')} type='password' required/>}
          {edit?.id===profile?.id
            ? <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6,fontFamily:"'Clash Display',sans-serif"}}>Role</div>
                <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'9px 14px',fontSize:13,color:'var(--mist3)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span>{ROLE_META[form.role]?.label||form.role}</span>
                  <span style={{fontSize:11,color:'var(--mist3)'}}>Cannot change your own role</span>
                </div>
              </div>
            : <Field label='Role' value={form.role} onChange={f('role')} options={[{value:'admin',label:'Administrator'},{value:'classteacher',label:'Class Teacher'},{value:'teacher',label:'Subject Teacher'}]}/>
          }
          {edit && <p style={{fontSize:12,color:'var(--mist3)',marginTop:-8,marginBottom:8}}>To change a password, contact your Super Admin.</p>}
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