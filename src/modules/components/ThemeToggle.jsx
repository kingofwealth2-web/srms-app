import { Moon, Sun } from '@phosphor-icons/react'

export default function ThemeToggle({ isDark, onToggle, size = 'md' }) {
  return (
    <button
      type='button'
      className={`srms-theme-toggle is-${size}${isDark ? ' is-dark' : ' is-light'}`}
      onClick={onToggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      role='switch'
      aria-checked={!isDark}
    >
      <span className='srms-theme-toggle__disc' aria-hidden='true'>
        <Moon className='srms-theme-toggle__moon' weight='bold'/>
        <Sun className='srms-theme-toggle__sun' weight='bold'/>
      </span>
    </button>
  )
}
