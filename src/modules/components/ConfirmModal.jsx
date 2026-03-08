import Btn from './Btn'

// ── CONFIRM MODAL ──────────────────────────────────────────────
// Replaces browser confirm() with an in-app styled dialog.
// Usage:
//   const [confirmState, setConfirmState] = useState(null)
//   setConfirmState({ title, body, icon, danger, onConfirm })
//   {confirmState && <ConfirmModal {...confirmState} onClose={()=>setConfirmState(null)}/>}

export default function ConfirmModal({ title, body, icon, danger = false, confirmLabel, onConfirm, onClose }) {
  const handleConfirm = () => { onClose(); onConfirm() }
  return (
    <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}>
      <div style={{background:'var(--ink2)',border:`1px solid ${danger?'rgba(240,107,122,0.3)':'var(--line)'}`,borderRadius:'var(--r)',padding:'28px 28px 24px',width:'100%',maxWidth:400,boxShadow:'0 24px 64px rgba(0,0,0,0.5)',animation:'fadeUp 0.15s ease'}}>
        {/* Icon + Title */}
        <div style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:16}}>
          {icon && (
            <div style={{width:40,height:40,borderRadius:'var(--r-sm)',background:danger?'rgba(240,107,122,0.12)':'var(--ink3)',border:`1px solid ${danger?'rgba(240,107,122,0.25)':'var(--line)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
              {icon}
            </div>
          )}
          <div>
            <div style={{fontWeight:700,fontSize:15,color:'var(--white)',marginBottom:body?6:0}}>{title}</div>
            {body && <div style={{fontSize:13,color:'var(--mist2)',lineHeight:1.6}}>{body}</div>}
          </div>
        </div>
        {/* Actions */}
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:20}}>
          <Btn variant='ghost' onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleConfirm}
            style={danger?{background:'var(--rose)',borderColor:'var(--rose)',color:'white'}:{}}>
            {confirmLabel || (danger ? 'Delete' : 'Confirm')}
          </Btn>
        </div>
      </div>
    </div>
  )
}
