import { Children, Fragment, isValidElement, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const LAYOUT_STYLE_KEYS = new Set([
  'alignSelf', 'flex', 'flexBasis', 'flexGrow', 'flexShrink', 'gridArea', 'gridColumn', 'gridRow',
  'margin', 'marginBottom', 'marginLeft', 'marginRight', 'marginTop', 'maxWidth', 'minWidth', 'width',
])
const CONTROL_STYLE_KEYS = new Set(['fontFamily', 'fontSize', 'height', 'maxHeight', 'minHeight'])

function splitStyle(style = {}) {
  const layout = {}
  const control = {}
  Object.entries(style).forEach(([key, val]) => {
    if (LAYOUT_STYLE_KEYS.has(key)) layout[key] = val
    else if (CONTROL_STYLE_KEYS.has(key)) control[key] = val
  })
  return { layout, control }
}

function optionsFromChildren(children, group) {
  const result = []
  Children.forEach(children, child => {
    if (!isValidElement(child)) return
    if (child.type === Fragment) {
      result.push(...optionsFromChildren(child.props.children, group))
    } else if (child.type === 'optgroup') {
      result.push(...optionsFromChildren(child.props.children, child.props.label))
    } else if (child.type === 'option') {
      const implicitValue = ['string', 'number'].includes(typeof child.props.children)
        ? child.props.children
        : ''
      result.push({
        value: String(child.props.value ?? implicitValue),
        label: child.props.children,
        disabled: !!child.props.disabled,
        group,
      })
    }
  })
  return result
}

export default function Select({
  value = '', onChange, children, options: optionItems, disabled = false,
  id, name, title, style, className = '', menuLabel, placeholder = 'Select…',
  compact = false, accent = 'gold', renderOption, onFocus, onBlur,
  'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy,
}) {
  const generatedId = useId()
  const selectId = id || `srms-select-${generatedId.replace(/:/g, '')}`
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [menuPos, setMenuPos] = useState(null)
  const parsedOptions = useMemo(() => optionItems
    ? optionItems.map(o => typeof o === 'object' ? { ...o, value: String(o.value ?? '') } : { value: String(o), label: o })
    : optionsFromChildren(children), [children, optionItems])
  const selectedIndex = parsedOptions.findIndex(o => o.value === String(value ?? ''))
  const selected = parsedOptions[selectedIndex]
  const { layout, control } = splitStyle(style)

  const positionMenu = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const mobile = window.innerWidth <= 640
    if (mobile) {
      setMenuPos({ mobile: true, left: 12, right: 12, bottom: 12, width: 'auto', maxHeight: Math.min(420, window.innerHeight - 32) })
      return
    }
    const desired = Math.min(320, Math.max(160, parsedOptions.length * 43 + (menuLabel ? 42 : 12)))
    const roomBelow = window.innerHeight - rect.bottom - 12
    const opensUp = roomBelow < Math.min(desired, 220) && rect.top > roomBelow
    setMenuPos({
      mobile: false,
      left: rect.left,
      top: opensUp ? Math.max(8, rect.top - Math.min(desired, rect.top - 12) - 7) : rect.bottom + 7,
      width: rect.width,
      maxHeight: opensUp ? Math.max(140, rect.top - 20) : Math.max(140, roomBelow - 4),
      opensUp,
    })
  }

  const openMenu = () => {
    if (disabled) return
    positionMenu()
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : parsedOptions.findIndex(o => !o.disabled))
    setOpen(true)
    onFocus?.()
  }

  const closeMenu = ({ focus = false } = {}) => {
    setOpen(false)
    onBlur?.()
    if (focus) requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const choose = option => {
    if (!option || option.disabled) return
    onChange?.({ target: { value: option.value, name }, currentTarget: { value: option.value, name } })
    closeMenu({ focus: true })
  }

  useEffect(() => {
    if (!open) return
    const reposition = () => positionMenu()
    const outside = e => {
      if (!triggerRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) closeMenu()
    }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open, parsedOptions.length])

  useEffect(() => {
    if (!open) return
    const el = menuRef.current?.querySelector(`[data-option-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  const move = delta => {
    if (!parsedOptions.length) return
    let next = activeIndex
    for (let i = 0; i < parsedOptions.length; i++) {
      next = (next + delta + parsedOptions.length) % parsedOptions.length
      if (!parsedOptions[next].disabled) break
    }
    setActiveIndex(next)
  }

  const onKeyDown = e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) openMenu()
      else move(e.key === 'ArrowDown' ? 1 : -1)
    } else if ((e.key === 'Enter' || e.key === ' ') && open) {
      e.preventDefault()
      choose(parsedOptions[activeIndex])
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); openMenu()
    } else if (e.key === 'Escape' && open) {
      e.preventDefault(); closeMenu({ focus: true })
    } else if (e.key === 'Home' && open) {
      e.preventDefault(); setActiveIndex(parsedOptions.findIndex(o => !o.disabled))
    } else if (e.key === 'End' && open) {
      e.preventDefault(); setActiveIndex(parsedOptions.map(o => !o.disabled).lastIndexOf(true))
    }
  }

  const menu = open && menuPos && createPortal(
    <div
      ref={menuRef}
      id={`${selectId}-menu`}
      role="listbox"
      aria-label={menuLabel || ariaLabel || title || 'Select option'}
      className={`srms-select-menu ${menuPos.mobile ? 'is-mobile' : ''} ${menuPos.opensUp ? 'opens-up' : ''}`}
      style={menuPos.mobile
        ? { left: menuPos.left, right: menuPos.right, bottom: menuPos.bottom, maxHeight: menuPos.maxHeight }
        : { left: menuPos.left, top: menuPos.top, width: menuPos.width, maxHeight: menuPos.maxHeight }}
    >
      {menuPos.mobile && <div className="srms-select-menu__handle" />}
      {menuLabel && (
        <div className="srms-select-menu__header">
          <span>{menuLabel}</span>
          <span>{parsedOptions.length} option{parsedOptions.length === 1 ? '' : 's'}</span>
        </div>
      )}
      <div className="srms-select-menu__options">
        {parsedOptions.map((option, index) => {
          const isSelected = index === selectedIndex
          const content = renderOption ? renderOption(option, { selected: isSelected, active: index === activeIndex }) : option.label
          const showGroup = option.group && option.group !== parsedOptions[index - 1]?.group
          return (
            <Fragment key={`${option.value}-${index}`}>
              {showGroup && <div className="srms-select-menu__group">{option.group}</div>}
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                data-option-index={index}
                className={`srms-select-option ${isSelected ? 'is-selected' : ''} ${index === activeIndex ? 'is-active' : ''}`}
                onPointerEnter={() => !option.disabled && setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                <span className="srms-select-option__content">{content}</span>
                <svg className="srms-select-option__check" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="m4 10 4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </Fragment>
          )
        })}
      </div>
    </div>,
    document.body,
  )

  return (
    <div className={`srms-select ${compact ? 'is-compact' : ''} ${open ? 'is-open' : ''} is-${accent} ${className}`} style={layout}>
      <button
        ref={triggerRef}
        id={selectId}
        name={name}
        type="button"
        title={title}
        disabled={disabled}
        className="srms-select__trigger"
        style={control}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${selectId}-menu`}
        aria-label={ariaLabel || (!ariaLabelledBy ? menuLabel || title || 'Select option' : undefined)}
        aria-labelledby={ariaLabelledBy}
        onClick={() => open ? closeMenu() : openMenu()}
        onKeyDown={onKeyDown}
      >
        <span className={`srms-select__value ${selected ? '' : 'is-placeholder'}`}>{selected?.label ?? placeholder}</span>
        <svg className="srms-select__chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {menu}
    </div>
  )
}
