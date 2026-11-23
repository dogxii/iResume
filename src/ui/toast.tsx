import { useSyncExternalStore } from 'react'

interface Toast {
  id: number
  text: string
  action?: { label: string; run(): void }
}
let toasts: Toast[] = []
let seq = 0
const listeners = new Set<() => void>()
const emit = () => {
  for (const l of listeners) l()
}

export function toast(text: string, action?: Toast['action'], ms = 3200) {
  const id = ++seq
  toasts = [...toasts.slice(-2), { id, text, action }]
  emit()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, ms)
}

export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => toasts
  )
  return (
    <div className='u-toasts' aria-live='polite'>
      {list.map((t) => (
        <div key={t.id} className='u-toast'>
          <span>{t.text}</span>
          {t.action && (
            <button
              type='button'
              onClick={() => {
                t.action?.run()
                toasts = toasts.filter((x) => x.id !== t.id)
                emit()
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
