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
import { defineMessages, useT } from '../i18n'
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

const M = defineMessages(
  {
    title: '同步',
    failed: '同步失败',
    synced: '已同步',
    syncing: '同步中',
    needsKey: '待设置口令',
    error: '同步出错',
    introTitle: '端到端加密同步',
    intro:
      '简历加密后存进你自己 GitHub 账号下的私密 Gist。密钥由你的同步口令在本机生成，GitHub 和 iResume 都无法读取内容。',
    signIn: '使用 GitHub 登录',
    tokenOr: '或使用只勾选了 ',
    tokenUse: '使用只勾选了 ',
    tokenScope: ' 权限的 ',
    connect: '连接',
    lastSync: (when: string) => `上次同步 ${when}`,
    never: '尚未同步',
    oneMore: '还差一步：同步口令',
    connError: '连接异常',
    working: '处理中…',
    disconnect: '断开',
    legacyFound: '发现 2.x 的云端数据',
    legacyImport: '导入为新简历',
    joinHint: '云端已有同步数据。输入你在其他设备上设置的同步口令：',
    createHint:
      '设置一个同步口令。其他设备加入时需要输入它；忘记口令将无法解密云端数据（本机数据不受影响）。',
    passPlaceholder: '同步口令（至少 8 位）',
    confirmPlaceholder: '再输入一次',
    tooShort: '口令至少 8 位',
    mismatch: '两次输入不一致',
    unlock: '解锁并同步',
    start: '设置口令并开始同步',
    syncNow: '立即同步',
    note: '修改后约 15 秒自动同步。两台设备改了同一份简历时保留较新的版本，另一版存进「历史版本」。',
    viewGist: '查看 Gist',
  },
  {
    title: 'Sync',
    failed: 'Sync failed',
    synced: 'Synced',
    syncing: 'Syncing',
    needsKey: 'Set passphrase',
    error: 'Sync error',
    introTitle: 'End-to-end encrypted sync',
    intro:
      'Resumes are encrypted and stored in a secret Gist under your own GitHub account. The key is derived on this device from your sync passphrase — neither GitHub nor iResume can read your data.',
    signIn: 'Sign in with GitHub',
    tokenOr: 'Or use a ',
    tokenUse: 'Use a ',
    tokenScope: '-scoped ',
    connect: 'Connect',
    lastSync: (when: string) => `Last synced ${when}`,
    never: 'Not synced yet',
    oneMore: 'One more step: sync passphrase',
    connError: 'Connection problem',
    working: 'Working…',
    disconnect: 'Disconnect',
    legacyFound: 'Found cloud data from iResume 2.x',
    legacyImport: 'Import as new resumes',
    joinHint:
      'Sync data already exists. Enter the passphrase you set on your other device:',
    createHint:
      'Set a sync passphrase. Other devices need it to join. If you forget it, the cloud copy can’t be decrypted (data on this device is unaffected).',
    passPlaceholder: 'Sync passphrase (8+ characters)',
    confirmPlaceholder: 'Enter it again',
    tooShort: 'At least 8 characters',
    mismatch: 'Passphrases don’t match',
    unlock: 'Unlock and sync',
    start: 'Set passphrase and start syncing',
    syncNow: 'Sync now',
    note: 'Changes sync automatically after about 15 seconds. If two devices edit the same resume, the newer version wins and the other is kept in Version history.',
    viewGist: 'View Gist',
  }
)

/** 顶栏的同步按钮：状态一目了然，点开是完整面板 */
export function SyncButton() {
  const s = useSync()
  const t = useT(M)
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
        ? t.failed
        : t.synced
      : s.phase === 'busy'
        ? t.syncing
        : s.phase === 'needs-key'
          ? t.needsKey
          : s.phase === 'error'
            ? t.error
            : t.title
  return (
    <>
      <button
        ref={ref}
        type='button'
        className={`u-btn is-ghost is-md h-sync-btn is-${s.phase} ${s.messageKind === 'error' ? 'is-warn' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {icon} <span className='h-label'>{label}</span>
      </button>
      <Popover
        anchor={ref.current}
        open={open}
        onClose={() => setOpen(false)}
        align='end'
        title={t.title}
      >
        <SyncPanel />
      </Popover>
    </>
  )
}

function SyncPanel() {
  const s = useSync()
  const t = useT(M)
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
            <strong>{t.introTitle}</strong>
            <p>{t.intro}</p>
          </div>
        </div>
        {oauthClientId && (
          <Button variant='primary' onClick={startOAuth} disabled={busy}>
            <Github size={15} /> {t.signIn}
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
            {oauthClientId ? t.tokenOr : t.tokenUse}
            <code>gist</code>
            {t.tokenScope}
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
              {t.connect}
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
              ? t.lastSync(ago(s.lastSyncAt))
              : t.never
            : s.phase === 'needs-key'
              ? t.oneMore
              : s.phase === 'error'
                ? t.connError
                : t.working}
        </span>
      </div>
      <button
        type='button'
        className='u-btn is-ghost is-sm'
        onClick={() => void disconnect()}
        disabled={busy}
      >
        {t.disconnect}
      </button>
    </div>
  )

  const legacy = s.legacy && (
    <div className='h-sync-legacy'>
      <span>{t.legacyFound}</span>
      <Button
        size='sm'
        onClick={() => void importLegacyCloud()}
        disabled={busy}
      >
        {t.legacyImport}
      </Button>
    </div>
  )

  if (s.phase === 'needs-key' || s.unlocking) {
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
          <p>{s.joining ? t.joinHint : t.createHint}</p>
          <input
            type='password'
            autoComplete={s.joining ? 'current-password' : 'new-password'}
            placeholder={t.passPlaceholder}
            value={pass}
            onChange={(e) => setPass(e.currentTarget.value)}
            aria-invalid={tooShort}
          />
          {!s.joining && (
            <input
              type='password'
              autoComplete='new-password'
              placeholder={t.confirmPlaceholder}
              value={confirm}
              onChange={(e) => setConfirm(e.currentTarget.value)}
              aria-invalid={mismatch}
            />
          )}
          {(tooShort || mismatch) && (
            <p className='h-sync-msg is-error'>
              {tooShort ? t.tooShort : t.mismatch}
            </p>
          )}
          <Button variant='primary' type='submit' disabled={!canSubmit}>
            {busy ? (
              <Loader2 size={15} className='u-spin' />
            ) : (
              <KeyRound size={15} />
            )}
            {s.joining ? t.unlock : t.start}
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
        {t.syncNow}
      </Button>
      {message}
      <p className='h-sync-note'>
        {t.note}
        {s.gistUrl && (
          <>
            {' '}
            <a href={s.gistUrl} target='_blank' rel='noreferrer'>
              {t.viewGist}
            </a>
          </>
        )}
      </p>
      {legacy}
    </div>
  )
}
