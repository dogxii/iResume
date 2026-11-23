import { useEffect, useSyncExternalStore } from 'react'
import { Editor } from '../editor/Editor'
import { Home } from '../home/Home'
import { init, useApp } from '../store/store'
import { Logo } from '../ui/controls'
import { Toaster, toast } from '../ui/toast'

const subscribeHash = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
const getHash = () => window.location.hash

export const go = (path: string) => {
  window.location.hash = path
}

let started = false

export function App() {
  const hash = useSyncExternalStore(subscribeHash, getHash)
  const status = useApp((s) => s.status)
  const error = useApp((s) => s.error)
  const migrated = useApp((s) => s.migrated)
  const editId = hash.match(/^#\/edit\/([\w-]+)/)?.[1]
  const doc = useApp((s) => (editId ? s.docs[editId] : undefined))

  useEffect(() => {
    if (started) return
    started = true
    void init()
  }, [])

  useEffect(() => {
    if (migrated > 0)
      toast(`已从旧版导入 ${migrated} 份简历，原数据保持不变`, undefined, 6000)
  }, [migrated])

  useEffect(() => {
    if (status === 'ready' && editId && !doc) go('/')
  }, [status, editId, doc])

  if (status === 'loading') {
    return (
      <div className='app-splash'>
        <Logo size={32} />
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className='app-splash is-error'>
        <Logo size={32} />
        <p>无法打开本地数据库：{error}</p>
        <p>如果你在无痕模式下，请切换到普通窗口。</p>
      </div>
    )
  }
  return (
    <>
      {doc ? (
        <Editor key={doc.id} doc={doc} onExit={() => go('/')} />
      ) : (
        <Home onOpen={(id) => go(`/edit/${id}`)} />
      )}
      <Toaster />
    </>
  )
}
