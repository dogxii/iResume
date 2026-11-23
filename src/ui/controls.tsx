import type { ButtonHTMLAttributes, ReactNode } from 'react'

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'soft'
  size?: 'sm' | 'md'
}

export function Button({
  variant = 'ghost',
  size = 'md',
  className,
  ...rest
}: BtnProps) {
  return (
    <button
      type='button'
      className={`u-btn is-${variant} is-${size} ${className ?? ''}`}
      {...rest}
    />
  )
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type='button'
      className={`u-icon-btn ${className ?? ''}`}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: ReactNode; title?: string }[]
  onChange(value: T): void
  label?: string
}) {
  return (
    <fieldset className='u-seg' aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type='button'
          aria-pressed={o.value === value}
          title={o.title}
          className={o.value === value ? 'is-on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format?(v: number): string
  onChange(v: number): void
}) {
  return (
    <label className='u-slider'>
      <span className='u-slider-head'>
        <span>{label}</span>
        <output>{format ? format(value) : value}</output>
      </span>
      <input
        type='range'
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
      />
    </label>
  )
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange(v: boolean): void
}) {
  return (
    <label className='u-toggle'>
      <span>{label}</span>
      <input
        type='checkbox'
        role='switch'
        aria-checked={checked}
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
      <i aria-hidden />
    </label>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className='u-field'>
      <div className='u-field-label'>{label}</div>
      {children}
    </div>
  )
}

export function MenuItem({
  icon,
  children,
  danger,
  hint,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode
  danger?: boolean
  hint?: string
}) {
  return (
    <button
      type='button'
      className={`u-menu-item ${danger ? 'is-danger' : ''}`}
      role='menuitem'
      {...rest}
    >
      {icon}
      <span>{children}</span>
      {hint && <kbd>{hint}</kbd>}
    </button>
  )
}

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <span
      className='u-logo'
      style={{
        width: size,
        height: size,
        fontSize: size * 0.54,
        borderRadius: size * 0.29,
      }}
      aria-hidden
    >
      i
    </span>
  )
}
