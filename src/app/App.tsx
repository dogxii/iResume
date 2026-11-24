import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { Editor } from '../editor/Editor'
import { Home } from '../home/Home'
import { defineMessages, tr, useT } from '../i18n'
import { init, useApp } from '../store/store'
import { initSync } from '../sync/controller'
import { decodeTheme, THEME_ROUTE } from '../theme/share'
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

const M = defineMessages(
  {
    migrated: (n: number) => `已从旧版导入 ${n} 份简历，原数据保持不变`,
    dbError: (error: string) => `无法打开本地数据库：${error}`,
    privateHint: '如果你在无痕模式下，请切换到普通窗口。',
  },
  {
    migrated: (n: number) =>
      `Imported ${n} ${n === 1 ? 'resume' : 'resumes'} from the previous version. Your original data is untouched.`,
    dbError: (error: string) => `Couldn’t open the local database: ${error}`,
    privateHint: 'If you’re in a private window, switch to a regular one.',
  }
)

export function App() {
  const hash = useSyncExternalStore(subscribeHash, getHash)
  const status = useApp((s) => s.status)
  const error = useApp((s) => s.error)
  const migrated = useApp((s) => s.migrated)
  const editId = hash.match(/^#\/edit\/([\w-]+)/)?.[1]
  const incoming = useMemo(
    () =>
      hash.startsWith(THEME_ROUTE)
        ? decodeTheme(hash.slice(THEME_ROUTE.length))
        : null,
    [hash]
  )
  const doc = useApp((s) => (editId ? s.docs[editId] : undefined))
  const t = useT(M)

  useEffect(() => {
    if (started) return
    started = true
    void init()
  }, [])

  useEffect(() => {
    if (status === 'ready') void initSync()
  }, [status])

  useEffect(() => {
    if (migrated > 0) toast(tr(M).migrated(migrated), undefined, 6000)
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
        <p>{t.dbError(error ?? '')}</p>
        <p>{t.privateHint}</p>
      </div>
    )
  }
  return (
    <>
      {doc ? (
        <Editor key={doc.id} doc={doc} onExit={() => go('/')} />
      ) : (
        <Home
          onOpen={(id) => go(`/edit/${id}`)}
          incoming={incoming}
          onDismissIncoming={() => go('/')}
        />
      )}
      <Toaster />
    </>
  )
}
