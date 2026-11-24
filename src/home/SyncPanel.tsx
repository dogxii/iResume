import {
  Cloud,
  CloudOff,
  Github,
  KeyRound,
  Loader2,
  LockKeyhole,
  RefreshCw,
} from 'lucide-react'
import { useRef, useState } from 'react'
import {
  connect,
  disconnect,
  importLegacyCloud,
  oauthClientId,
  setPassphrase,
  startOAuth,
  syncNow,
  useSync,
} from '../sync/controller'
import { Button } from '../ui/controls'
import { Popover } from '../ui/Popover'
import { ago } from '../ui/time'

/** 顶栏的同步按钮：状态一目了然，点开是完整面板 */
export function SyncButton() {
  const s = useSync()
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const icon =
    s.phase === 'busy' ? (
      <Loader2 size={15} className='u-spin' />
    ) : s.phase === 'ready' ? (
      <Cloud size={15} />
    ) : (
      <CloudOff size={15} />
    )
  const label =
    s.phase === 'ready'
      ? s.messageKind === 'error'
        ? '同步失败'
        : '已同步'
      : s.phase === 'busy'
        ? '同步中'
        : s.phase === 'needs-key'
          ? '待设置口令'
          : s.phase === 'error'
            ? '同步出错'
            : '同步'
  return (
    <>
      <button
        ref={ref}
        type='button'
        className={`u-btn is-ghost is-md h-sync-btn is-${s.phase} ${s.messageKind === 'error' ? 'is-warn' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {icon} {label}
      </button>
      <Popover
        anchor={ref.current}
        open={open}
        onClose={() => setOpen(false)}
        align='end'
        title='同步'
      >
        <SyncPanel />
      </Popover>
    </>
  )
}

function SyncPanel() {
  const s = useSync()
  const [token, setToken] = useState('')
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const busy = s.phase === 'busy'

  const message = s.message && (
    <p className={`h-sync-msg ${s.messageKind ? `is-${s.messageKind}` : ''}`}>
      {s.message}
    </p>
  )

  if (s.phase === 'off' || (busy && !s.login)) {
    return (
      <div className='h-sync'>
        <div className='h-sync-intro'>
          <LockKeyhole size={18} />
          <div>
            <strong>端到端加密同步</strong>
            <p>
              简历加密后存进你自己 GitHub 账号下的私密
              Gist。密钥由你的同步口令在本机生成，GitHub 和 iResume
              都无法读取内容。
            </p>
          </div>
        </div>
        {oauthClientId && (
          <Button variant='primary' onClick={startOAuth} disabled={busy}>
            <Github size={15} /> 使用 GitHub 登录
          </Button>
        )}
        <form
          className='h-sync-token'
          onSubmit={(e) => {
            e.preventDefault()
            if (token.trim()) void connect(token)
          }}
        >
          <label htmlFor='sync-token'>
            {oauthClientId ? '或使用' : '使用'}只勾选了 <code>gist</code> 权限的{' '}
            <a
              href='https://github.com/settings/tokens/new?scopes=gist&description=iResume%20sync'
              target='_blank'
              rel='noreferrer'
            >
              Personal access token
            </a>
          </label>
          <div>
            <input
              id='sync-token'
              type='password'
              autoComplete='off'
              value={token}
              placeholder='ghp_…'
              onChange={(e) => setToken(e.currentTarget.value)}
            />
            <Button size='sm' type='submit' disabled={busy || !token.trim()}>
              连接
            </Button>
          </div>
        </form>
        {message}
      </div>
    )
  }

  const account = (
    <div className='h-sync-account'>
      {s.avatarUrl ? <img src={s.avatarUrl} alt='' /> : <Github size={18} />}
      <div>
        <strong>{s.login}</strong>
        <span>
          {s.phase === 'ready'
            ? s.lastSyncAt
              ? `上次同步 ${ago(s.lastSyncAt)}`
              : '尚未同步'
            : s.phase === 'needs-key'
              ? '还差一步：同步口令'
              : s.phase === 'error'
                ? '连接异常'
                : '处理中…'}
        </span>
      </div>
      <button
        type='button'
        className='u-btn is-ghost is-sm'
        onClick={() => void disconnect()}
        disabled={busy}
      >
        断开
      </button>
    </div>
  )

  const legacy = s.legacy && (
    <div className='h-sync-legacy'>
      <span>发现 2.x 的云端数据</span>
      <Button
        size='sm'
        onClick={() => void importLegacyCloud()}
        disabled={busy}
      >
        导入为新简历
      </Button>
    </div>
  )

  if (s.phase === 'needs-key' || (busy && !s.lastSyncAt)) {
    const tooShort = pass.length > 0 && pass.length < 8
    const mismatch = !s.joining && confirm.length > 0 && confirm !== pass
    const canSubmit =
      pass.length >= 8 && (s.joining || confirm === pass) && !busy
    return (
      <div className='h-sync'>
        {account}
        <form
          className='h-sync-pass'
          onSubmit={(e) => {
            e.preventDefault()
            if (canSubmit) void setPassphrase(pass)
          }}
        >
          <p>
            {s.joining
              ? '云端已有同步数据。输入你在其他设备上设置的同步口令：'
              : '设置一个同步口令。其他设备加入时需要输入它；忘记口令将无法解密云端数据（本机数据不受影响）。'}
          </p>
          <input
            type='password'
            autoComplete={s.joining ? 'current-password' : 'new-password'}
            placeholder='同步口令（至少 8 位）'
            value={pass}
            onChange={(e) => setPass(e.currentTarget.value)}
            aria-invalid={tooShort}
          />
          {!s.joining && (
            <input
              type='password'
              autoComplete='new-password'
              placeholder='再输入一次'
              value={confirm}
              onChange={(e) => setConfirm(e.currentTarget.value)}
              aria-invalid={mismatch}
            />
          )}
          {(tooShort || mismatch) && (
            <p className='h-sync-msg is-error'>
              {tooShort ? '口令至少 8 位' : '两次输入不一致'}
            </p>
          )}
          <Button variant='primary' type='submit' disabled={!canSubmit}>
            {busy ? (
              <Loader2 size={15} className='u-spin' />
            ) : (
              <KeyRound size={15} />
            )}
            {s.joining ? '解锁并同步' : '设置口令并开始同步'}
          </Button>
        </form>
        {message}
        {legacy}
      </div>
    )
  }

  return (
    <div className='h-sync'>
      {account}
      <Button variant='primary' onClick={() => void syncNow()} disabled={busy}>
        {busy ? (
          <Loader2 size={15} className='u-spin' />
        ) : (
          <RefreshCw size={15} />
        )}{' '}
        立即同步
      </Button>
      {message}
      <p className='h-sync-note'>
        修改后约 15
        秒自动同步。两台设备改了同一份简历时保留较新的版本，另一版存进「历史版本」。
        {s.gistUrl && (
          <>
            {' '}
            <a href={s.gistUrl} target='_blank' rel='noreferrer'>
              查看 Gist
            </a>
          </>
        )}
      </p>
      {legacy}
    </div>
  )
}
