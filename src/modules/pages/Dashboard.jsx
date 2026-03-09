import { useState, useEffect } from 'react'
import { useIsMobile } from '../lib/hooks'
import { ROLE_META, BEHAVIOUR_META } from '../lib/constants'
import { fmtDate, getLetter, calcTotal, getGradeComponents, canSeeAnnouncement, getCurrency, fmtMoney , fullName } from '../lib/helpers'
import Avatar from '../components/Avatar'
import Card from '../components/Card'
import KPI from '../components/KPI'
import SectionTitle from '../components/SectionTitle'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import Badge from '../components/Badge'

export default function Dashboard({profile,data,settings,onNav,onNavFees,activeYear,isViewingPast}) {
  const isMobile = useIsMobile()
  const {students=[],classes=[],fees=[],attendance=[],grades=[],announcements=[],subjects=[],enrolments=[],payments=[]} = data
  // When viewing past year, use enrolment records to know which students were enrolled
  const enrolledStudentIds = enrolments.length>0 ? new Set(enrolments.map(e=>e.student_id)) : null
  const yearStudents = enrolledStudentIds
    ? students.filter(s=>enrolledStudentIds.has(s.id))
    : students.filter(s=>!s.archived)
  const today = new Date().toISOString().split('T')[0]
  const scale = settings?.grading_scale || []
  const gradeComps = getGradeComponents(settings)
  const currency = getCurrency(settings)
  const myClass = profile?.role==='classteacher' ? classes.find(c=>c.id===profile.class_id) : null
  const todayMarked = myClass ? attendance.some(a=>a.class_id===myClass.id&&a.date===today) : true
  const totalFees = fees.reduce((s,f)=>s+Number(f.amount||0),0)
  const totalPaid = fees.reduce((s,f)=>s+Number(f.paid||0),0)
  const isAdmin   = ['superadmin','admin'].includes(profile?.role)
  const overdueFeesCount = isAdmin ? fees.filter(fee2=>{
    const feePs = payments.filter(pmt=>pmt.fee_id===fee2.id)
    const pmtTotal = feePs.reduce((sum,pmt)=>sum+Number(pmt.amount||0),0)
    const bal = Number(fee2.amount||0) - Math.max(Number(fee2.paid||0), pmtTotal)
    return fee2.due_date && fee2.due_date < today && bal > 0
  }).length : 0
  const myClassStudents = myClass ? students.filter(s=>s.class_id===myClass.id) : []

  // Helper: average of per-student averages (correct school-wide or scoped avg)
  // period: if provided, only grades from that period are included
  const calcStats = (studentIds, subjectIds, period) => {
    const sidSet = subjectIds ? new Set(subjectIds) : null
    const perStudent = studentIds.map(sid => {
      const sg = grades.filter(g =>
        g.student_id===sid &&
        (!sidSet || sidSet.has(g.subject_id)) &&
        (!period || g.period===period)
      )
      if(!sg.length) return null
      const totals = sg.map(g=>calcTotal(g,gradeComps))
      return totals.reduce((a,b)=>a+b,0)/totals.length
    }).filter(v=>v!==null)
    if(!perStudent.length) return {avg:0, passRate:0}
    const avg      = Math.round(perStudent.reduce((a,b)=>a+b,0)/perStudent.length)
    const passRate = Math.round(perStudent.filter(v=>v>=50).length/perStudent.length*100)
    return {avg, passRate}
  }

  // Latest period that has grade data
  const periodOrder     = Array.from({length:settings?.period_count||2},(_,i)=>`${settings?.period_type==='term'?'Term':'Semester'} ${i+1}`)
  const periodsWithData = periodOrder.filter(p=>grades.some(g=>g.period===p))
  const latestPeriod    = periodsWithData.length>0 ? periodsWithData[periodsWithData.length-1] : periodOrder[periodOrder.length-1]

  // Admin/superadmin: school-wide average of per-student averages (latest period only)
  const schoolStats     = calcStats(yearStudents.map(s=>s.id), null, latestPeriod)
  const avgScore        = schoolStats.avg
  const passRate        = schoolStats.passRate

  // Class teacher: scoped to their class students only
  const myClassStats    = myClass ? calcStats(myClassStudents.map(s=>s.id), null, latestPeriod) : {avg:0, passRate:0}
  const myClassPassRate = myClassStats.passRate

  // Subject teacher: scoped to their subjects and the students in those subjects
  const mySubjectIds        = subjects.filter(s=>s.teacher_id===profile?.id).map(s=>s.id)
  const mySubjectStudentIds = [...new Set(grades.filter(g=>mySubjectIds.includes(g.subject_id)).map(g=>g.student_id))]
  const mySubjectStats      = calcStats(mySubjectStudentIds, mySubjectIds, latestPeriod)
  const mySubjectAvg        = mySubjectStats.avg
  const activeAnn = announcements.filter(a=>canSeeAnnouncement(profile?.role,a)).slice(0,4)

  // ── Top Performers ──

  // Teacher: top 3 per subject (latest period)
  const topPerSubject = (profile?.role==='teacher' || profile?.role==='classteacher')
    ? subjects.filter(s=>s.teacher_id===profile.id).map(sub=>{
        const subGrades = grades.filter(g=>g.subject_id===sub.id && g.period===latestPeriod)
        const ranked = subGrades
          .map(g=>({g, student:students.find(s=>s.id===g.student_id), total:calcTotal(g,gradeComps)}))
          .filter(x=>x.student&&!x.student.archived)
          .sort((a,b)=>b.total-a.total)
          .slice(0,3)
        return {subject:sub, top:ranked}
      }).filter(x=>x.top.length>0)
    : []

  // Admin: top 3 per class (latest period, average across subjects)
  const topPerClass = isAdmin
    ? classes.map(cls=>{
        const clsStudents = students.filter(s=>s.class_id===cls.id&&!s.archived)
        const clsSubjectIds = subjects.filter(s=>s.class_id===cls.id).map(s=>s.id)
        const ranked = clsStudents.map(s=>{
          const sg = grades.filter(g=>g.student_id===s.id && clsSubjectIds.includes(g.subject_id) && g.period===latestPeriod)
          if(!sg.length) return null
          const total = sg.reduce((sum,g)=>sum+calcTotal(g,gradeComps),0)
          return {student:s, total}
        }).filter(Boolean).sort((a,b)=>b.total-a.total).slice(0,3)
        return {cls, top:ranked}
      }).filter(x=>x.top.length>0)
    : []

  // Attendance rate calculations
  const schoolAttTotal   = attendance.length
  const schoolAttPresent = attendance.filter(a=>a.status==='Present').length
  const schoolAttRate    = schoolAttTotal ? Math.round(schoolAttPresent/schoolAttTotal*100) : 0
  const myClassAtt       = myClass ? attendance.filter(a=>a.class_id===myClass.id) : []
  const myClassPresent   = myClassAtt.filter(a=>a.status==='Present').length
  const myClassAttRate   = myClassAtt.length ? Math.round(myClassPresent/myClassAtt.length*100) : 0

  const unassignedClasses = profile?.role==='superadmin'
    ? classes.filter(c=>!c.class_teacher_id)
    : []

  return (
    <div>
      {profile?.role==='superadmin' && unassignedClasses.length>0 && (
        <div style={{marginBottom:16,display:'flex',flexDirection:'column',gap:8}}>
          {unassignedClasses.map(cls=>(
            <div key={cls.id} style={{background:'rgba(240,107,122,0.06)',border:'1px solid rgba(240,107,122,0.25)',borderRadius:'var(--r)',padding:'14px 20px',display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(240,107,122,0.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>(!)</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:14,color:'var(--rose)'}}>No Teacher Assigned</div>
                <div style={{fontSize:12,color:'var(--mist2)',marginTop:2}}><strong>{cls.name}</strong> has no class teacher. Assign one to restore full functionality.</div>
              </div>
              <Btn size='sm' onClick={()=>onNav('classes')}>Assign Teacher &rarr;</Btn>
            </div>
          ))}
        </div>
      )}
      {profile?.role==='classteacher' && !todayMarked && (
        <div className='fu' style={{background:'rgba(251,159,58,0.08)',border:'1px solid rgba(251,159,58,0.25)',borderRadius:'var(--r)',padding:'14px 20px',marginBottom:24,display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(251,159,58,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>(!)</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:14,color:'var(--amber)'}}>Attendance Not Marked Today</div>
            <div style={{fontSize:12,color:'var(--mist2)',marginTop:2}}>{myClass?.name} . {fmtDate(today)}</div>
          </div>
          <Btn size='sm' onClick={()=>onNav('attendance')}>Mark Now &rarr;</Btn>
        </div>
      )}
      {isAdmin && !isViewingPast && overdueFeesCount>0 && (
        <div style={{background:'rgba(240,107,122,0.06)',border:'1px solid rgba(240,107,122,0.25)',borderRadius:'var(--r)',padding:'14px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(240,107,122,0.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>⚠</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:14,color:'var(--rose)'}}>{overdueFeesCount} Fee{overdueFeesCount!==1?'s':''} Overdue</div>
            <div style={{fontSize:12,color:'var(--mist2)',marginTop:2}}>Past their due date and still unpaid. Review and follow up.</div>
          </div>
          <Btn size='sm' onClick={()=>onNavFees('Overdue')}>View Fees &rarr;</Btn>
        </div>
      )}
      {isViewingPast && (
        <div style={{background:'rgba(251,159,58,0.08)',border:'1px solid rgba(251,159,58,0.3)',borderRadius:'var(--r)',padding:'12px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:16}}>(!)</span>
          <span style={{fontSize:13,color:'var(--amber)'}}>You are viewing <strong>{activeYear}</strong> -- this is a read-only archive. Switch to the current year in the topbar to make changes.</span>
        </div>
      )}
      <PageHeader title={`Good ${new Date().getHours()<12?'morning':'afternoon'}, ${profile?.full_name?.split(' ')[0]||'there'}.`} sub={`${settings?.school_name||'SRMS'} . ${activeYear}`}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom: isMobile?20:28}}>
        {isAdmin && <>
          <KPI label='Total Students'   value={yearStudents.length}      color='var(--gold)'    sub={`${classes.length} classes`} index={0}/>
          <KPI label='Attendance Rate'  value={`${schoolAttRate}%`}  color='var(--emerald)' sub={`${schoolAttPresent} of ${schoolAttTotal} records`} index={1}/>
          <KPI label='Average Score'    value={avgScore}             color='var(--sky)'     sub={`Pass rate: ${passRate}%`} index={2}/>
          <KPI label='Fee Collection'   value={`${totalFees?Math.round(totalPaid/totalFees*100):0}%`} color='var(--amber)' sub={overdueFeesCount>0?`${fmtMoney(totalPaid,currency)} collected · ${overdueFeesCount} overdue`:`${fmtMoney(totalPaid,currency)} collected`} index={3}/>
        </>}
        {profile?.role==='classteacher' && <>
          <KPI label='My Class'         value={myClass?.name||'--'}   color='var(--gold)'    sub='Your assigned class' index={0}/>
          <KPI label='Students'         value={myClassStudents.length} color='var(--sky)'   sub='In your class' index={1}/>
          <KPI label='Attendance Rate'  value={myClassAtt.length?`${myClassAttRate}%`:'--'} color='var(--emerald)' sub={todayMarked?'Today marked':'Not marked today'} index={2}/>
          <KPI label='Pass Rate'        value={`${myClassPassRate}%`} color='var(--amber)'   sub='This semester' index={3}/>
        </>}
        {profile?.role==='teacher' && <>
          <KPI label='Subjects'        value={subjects.filter(s=>s.teacher_id===profile.id).length} color='var(--gold)'  sub='Assigned to you' index={0}/>
          <KPI label='Grades Entered'  value={grades.filter(g=>subjects.some(s=>s.id===g.subject_id&&s.teacher_id===profile.id)).length} color='var(--sky)' sub='Total records' index={1}/>
          <KPI label='Avg Score'       value={mySubjectAvg}         color='var(--emerald)' sub='Your subjects' index={2}/>
          <KPI label='Announcements'   value={activeAnn.length}     color='var(--amber)'   sub='Active' index={3}/>
        </>}
      </div>
      {/* ── Teacher: Top Performers per Subject ── */}
      {(profile?.role==='teacher' || profile?.role==='classteacher') && topPerSubject.length>0 && (
        <Card style={{marginBottom:16}}>
          <SectionTitle>Top Performers · {latestPeriod}</SectionTitle>
          <div style={{display:'flex',flexDirection:'column',gap:16,marginTop:4}}>
            {topPerSubject.map(({subject,top})=>(
              <div key={subject.id}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>{subject.name}</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {top.map(({student,total},i)=>(
                    <div key={student.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'var(--ink3)',borderRadius:'var(--r-sm)',borderLeft:`3px solid ${['var(--gold)','var(--mist2)','var(--amber)'][i]}`}}>
                      <div style={{width:20,height:20,borderRadius:'50%',background:['rgba(232,184,75,0.15)','var(--ink5)','rgba(251,159,58,0.12)'][i],display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:['var(--gold)','var(--mist2)','var(--amber)'][i],flexShrink:0}}>{i+1}</div>
                      <Avatar name={fullName(student)} size={26} photo={student.photo}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:'var(--white)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{fullName(student,true)}</div>
                        <div style={{fontSize:11,color:'var(--mist3)'}}>{getLetter(total,scale)} · {classes.find(c=>c.id===student.class_id)?.name||'--'}</div>
                      </div>
                      <div style={{fontSize:16,fontWeight:700,color:['var(--gold)','var(--mist)','var(--amber)'][i],flexShrink:0}}>{total}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Btn variant='ghost' size='sm' onClick={()=>onNav('grades')} style={{marginTop:12}}>View Grades &rarr;</Btn>
        </Card>
      )}

      {/* ── Admin: Top Performers per Class ── */}
      {isAdmin && topPerClass.length>0 && (
        <Card style={{marginBottom:16}}>
          <SectionTitle>Top Performers · {latestPeriod}</SectionTitle>
          <div style={{display:'flex',flexDirection:'column',gap:16,marginTop:4}}>
            {topPerClass.map(({cls,top})=>(
              <div key={cls.id}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>{cls.name}</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {top.map(({student,total},i)=>(
                    <div key={student.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'var(--ink3)',borderRadius:'var(--r-sm)',borderLeft:`3px solid ${['var(--gold)','var(--mist2)','var(--amber)'][i]}`}}>
                      <div style={{width:20,height:20,borderRadius:'50%',background:['rgba(232,184,75,0.15)','var(--ink5)','rgba(251,159,58,0.12)'][i],display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:['var(--gold)','var(--mist2)','var(--amber)'][i],flexShrink:0}}>{i+1}</div>
                      <Avatar name={fullName(student)} size={26} photo={student.photo}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:'var(--white)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{fullName(student,true)}</div>
                        <div style={{fontSize:11,color:'var(--mist3)'}}>total across subjects</div>
                      </div>
                      <div style={{fontSize:16,fontWeight:700,color:['var(--gold)','var(--mist)','var(--amber)'][i],flexShrink:0}}>{total}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Btn variant='ghost' size='sm' onClick={()=>onNav('grades')} style={{marginTop:12}}>View Grades &rarr;</Btn>
        </Card>
      )}

      <Card>
        <SectionTitle>Recent Announcements</SectionTitle>
        {activeAnn.length===0 && <div style={{padding:32,textAlign:'center',color:'var(--mist3)',fontSize:13}}>No announcements posted yet.</div>}
        {activeAnn.map(a=>(
          <div key={a.id} style={{padding:14,background:'var(--ink3)',borderRadius:'var(--r-sm)',marginBottom:10,borderLeft:`3px solid ${{all:'var(--gold)',teacher:'var(--sky)'}[a.target_role]||'var(--line)'}`,transition:'background 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--ink4)'}
            onMouseLeave={e=>e.currentTarget.style.background='var(--ink3)'}>
            <div style={{display:'flex',justifyContent:'space-between',gap:12}}>
              <div>
                <div style={{fontWeight:600,fontSize:13,marginBottom:5}}>{a.title}</div>
                <div style={{fontSize:12,color:'var(--mist2)',lineHeight:1.5}}>{a.body}</div>
                <div style={{fontSize:11,color:'var(--mist3)',marginTop:8}}>Posted by {a.posted_by_name} . {fmtDate(a.created_at)}</div>
              </div>
              <div style={{fontSize:11,color:'var(--mist3)',whiteSpace:'nowrap'}}>{fmtDate(a.created_at)}</div>
            </div>
          </div>
        ))}
        <Btn variant='ghost' size='sm' onClick={()=>onNav('announcements')} style={{marginTop:4}}>View all &rarr;</Btn>
      </Card>
      <div style={{marginTop:40,paddingTop:20,borderTop:'1px solid var(--line)',textAlign:'center'}}>
        <div style={{fontSize:12,color:'var(--mist3)'}}>Designed &amp; developed by <span style={{color:'var(--white)',fontWeight:600}}>Prince William Kofi Anquandah</span></div>
        <div style={{fontSize:11,color:'var(--mist3)',marginTop:5,letterSpacing:'0.08em'}}><span style={{color:'var(--gold)',fontWeight:600,letterSpacing:'0.12em'}}>ZELVA STUDIOS</span> . {new Date().getFullYear()}</div>
      </div>
    </div>
  )
}