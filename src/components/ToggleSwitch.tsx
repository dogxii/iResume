interface ToggleSwitchProps {
  id?: string
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}

const ToggleSwitch = ({ id, checked, label, onChange }: ToggleSwitchProps) => (
  <span className='relative inline-flex h-5 w-9 shrink-0 items-center'>
    <input
      id={id}
      type='checkbox'
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className='peer sr-only'
      aria-label={label}
    />
    <span className='absolute inset-0 rounded-full bg-slate-200/80 transition-colors peer-checked:bg-blue-500/85' />
    <span className='relative ml-0.5 h-4 w-4 rounded-full bg-white shadow-sm shadow-slate-900/10 transition-transform peer-checked:translate-x-4' />
  </span>
)

export default ToggleSwitch
