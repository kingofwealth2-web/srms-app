import { useState } from 'react'
import { supabase } from '../../supabase'
import { useIsMobile } from '../lib/hooks'
import { ROLE_META } from '../lib/constants'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Btn from '../components/Btn'
import Field from '../components/Field'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import SectionTitle from '../components/SectionTitle'
import Card from '../components/Card'

export default function MyProfile({profile, setProfile, toast}) {
  const rm = ROLE_META[profile?.role] || {}
  const [nameForm,  setNameForm]  = useState(profile?.full_name || '')
  const [passForm,  setPassForm]  = useState({current:'', next:'', confirm:''})
  const [savingName, setSavingName] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext,    setShowNext]    = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const saveName = async () => {
    const trimmed = nameForm.trim()
    if(!trimmed) return toast('Name cannot be empty.', 'error')
    if(trimmed === profile?.full_name) return toast('No changes to save.', 'error')
    setSavingName(true)
    const {error} = await supabase.from('profiles').update({full_name: trimmed}).eq('id', profile.id)
    if(error) { toast(error.message, 'error') }
    else {
      setProfile(p => ({...p, full_name: trimmed}))
      toast('Display name updated.')
    }
    setSavingName(false)
  }

  const savePass = async () => {
    if(!passForm.current) return toast('Please enter your current password.', 'error')
    if(!passForm.next) return toast('New password cannot be empty.', 'error')
    if(passForm.next.length < 8) return toast('Password must be at least 8 characters.', 'error')
    if(passForm.next !== passForm.confirm) return toast('Passwords do not match.', 'error')
    if(passForm.next === passForm.current) return toast('New password must differ from your current password.', 'error')
    setSavingPass(true)
    try {
      // Re-authenticate to verify current password before allowing change
      const {error: reAuthError} = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: passForm.current,
      })
      if(reAuthError) {
        toast('Current password is incorrect.', 'error')
        setSavingPass(false)
        return
      }
      const {error} = await supabase.auth.updateUser({password: passForm.next})
      if(error) { toast(error.message, 'error') }
      else {
        setPassForm({current:'', next:'', confirm:''})
        toast('Password changed successfully.')
      }
    } catch(err) {
      toast('An unexpected error occurred. Please try again.', 'error')
    }
    setSavingPass(false)
  }

  const pf = k => v => setPassForm(p => ({...p, [k]: v}))

  const eyeBtn = (show, toggle) => (
    <button onClick={toggle} type='button'
      style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',color:'var(--mist3)',fontSize:14,padding:2,lineHeight:1}}>
      {show ? '◡' : '○'}
    </button>
  )

  const inputStyle = {
    width:'100%', background:'var(--ink3)', border:'1px solid var(--line)',
    borderRadius:'var(--r-sm)', padding:'9px 14px', color:'var(--white)', fontSize:13
  }

  return (
    <div>
      <PageHeader title='My Profile' sub='Manage your display name and password'/>

      {/* Identity card */}
      <Card style={{marginBottom:20}}>
        <div style={{display:'flex',alignItems:'center',gap:16,padding:'4px 0 8px'}}>
          <Avatar name={profile?.full_name} size={56} color={rm.bg}/>
          <div>
            <div style={{fontSize:18,fontWeight:700,letterSpacing:'-0.01em',color:'var(--white)'}}>{profile?.full_name}</div>
            <div style={{display:'flex',gap:8,marginTop:6,alignItems:'center'}}>
              <Badge color={rm.color} bg={rm.bg}>{rm.label}</Badge>
              <span style={{fontSize:12,color:'var(--mist3)'}}>{profile?.email}</span>
            </div>
          </div>
        </div>
      </Card>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>

        {/* ── Change Name ── */}
        <Card>
          <SectionTitle>Display Name</SectionTitle>
          <p style={{fontSize:12,color:'var(--mist3)',marginBottom:16,lineHeight:1.6}}>
            This is how your name appears across the system — on report cards, announcements, and records you create.
          </p>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:6}}>Full Name</label>
            <input
              value={nameForm}
              onChange={e=>setNameForm(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&saveName()}
              style={inputStyle}
              placeholder='Your full name'
            />
          </div>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:6}}>Email</label>
            <input value={profile?.email||''} disabled style={{...inputStyle,opacity:0.5,cursor:'not-allowed'}}/>
            <div style={{fontSize:11,color:'var(--mist3)',marginTop:5}}>Email cannot be changed here. Contact your administrator.</div>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:6}}>Role</label>
            <input value={rm.label||profile?.role||''} disabled style={{...inputStyle,opacity:0.5,cursor:'not-allowed'}}/>
            <div style={{fontSize:11,color:'var(--mist3)',marginTop:5}}>Role is assigned by an administrator.</div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <Btn onClick={saveName} disabled={savingName||!nameForm.trim()||nameForm.trim()===profile?.full_name}>
              {savingName?<><Spinner/> Saving...</>:'Save Name'}
            </Btn>
          </div>
        </Card>

        {/* ── Change Password ── */}
        <Card>
          <SectionTitle>Change Password</SectionTitle>
          <p style={{fontSize:12,color:'var(--mist3)',marginBottom:16,lineHeight:1.6}}>
            Choose a strong password of at least 8 characters. You will stay signed in after changing it.
          </p>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:6}}>Current Password</label>
            <div style={{position:'relative'}}>
              <input
                type={showCurrent?'text':'password'}
                value={passForm.current}
                onChange={e=>pf('current')(e.target.value)}
                style={{...inputStyle,paddingRight:36}}
                placeholder='Your current password'
              />
              {eyeBtn(showCurrent,()=>setShowCurrent(v=>!v))}
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:6}}>New Password</label>
            <div style={{position:'relative'}}>
              <input
                type={showNext?'text':'password'}
                value={passForm.next}
                onChange={e=>pf('next')(e.target.value)}
                style={{...inputStyle,paddingRight:36}}
                placeholder='At least 8 characters'
              />
              {eyeBtn(showNext,()=>setShowNext(v=>!v))}
            </div>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:6}}>Confirm New Password</label>
            <div style={{position:'relative'}}>
              <input
                type={showConfirm?'text':'password'}
                value={passForm.confirm}
                onChange={e=>pf('confirm')(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&savePass()}
                style={{
                  ...inputStyle, paddingRight:36,
                  borderColor: passForm.confirm && passForm.next !== passForm.confirm ? 'var(--rose)' : undefined
                }}
                placeholder='Repeat new password'
              />
              {eyeBtn(showConfirm,()=>setShowConfirm(v=>!v))}
            </div>
            {passForm.confirm && passForm.next !== passForm.confirm && (
              <div style={{fontSize:11,color:'var(--rose)',marginTop:5}}>Passwords do not match.</div>
            )}
          </div>
          {/* Strength indicator */}
          {passForm.next && (() => {
            const len = passForm.next.length
            const strength = len < 8 ? 0 : len < 12 ? 1 : len < 16 ? 2 : 3
            const labels = ['Too short','Fair','Good','Strong']
            const colors = ['var(--rose)','var(--amber)','var(--sky)','var(--emerald)']
            return (
              <div style={{marginBottom:16}}>
                <div style={{display:'flex',gap:4,marginBottom:5}}>
                  {[0,1,2,3].map(i=>(
                    <div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=strength?colors[strength]:'var(--line)',transition:'background 0.2s'}}/>
                  ))}
                </div>
                <div style={{fontSize:11,color:colors[strength]}}>{labels[strength]}</div>
              </div>
            )
          })()}
          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <Btn onClick={savePass} disabled={savingPass||!passForm.current||!passForm.next||passForm.next!==passForm.confirm||passForm.next.length<8}>
              {savingPass?<><Spinner/> Changing...</>:'Change Password'}
            </Btn>
          </div>
        </Card>

      </div>
    </div>
  )
}

// ── AUDIT LOG ──────────────────────────────────────────────────
const MODULE_META = {
  Grades:     { icon:'◎', color:'var(--sky)' },
  Students:   { icon:'◈', color:'var(--emerald)' },
  Fees:       { icon:'◈', color:'var(--gold)' },
  Attendance: { icon:'◉', color:'var(--amber)' },
  Behaviour:  { icon:'◐', color:'var(--rose)' },
  Users:      { icon:'◈', color:'var(--sky)' },
  Settings:   { icon:'◧', color:'var(--mist2)' },
}
const ACTION_COLOR = {
  Created: 'var(--emerald)',
  Updated: 'var(--amber)',
  Deleted: 'var(--rose)',
  Marked:  'var(--sky)',
  Payment: 'var(--gold)',
  Locked:  'var(--rose)',
  Unlocked:'var(--emerald)',
}

