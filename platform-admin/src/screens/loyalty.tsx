import { useState } from 'react'
import { Button, Field, Modal, Pill, useToast, type Column } from '../ui'
import { useList, View } from '../api/list'
import { currentUsername } from '../api/client'
import { growth, type LoyaltyAccount } from '../api/growth'
import { PanelTitle, SearchBox } from './shared'

export function LoyaltyScreen() {
  const [q, setQ] = useState('')
  const accounts = useList<LoyaltyAccount>(`/loyalty/accounts${q ? `?q=${encodeURIComponent(q)}` : ''}`)
  const toast = useToast()
  const [adjust, setAdjust] = useState<LoyaltyAccount | null>(null)
  const [points, setPoints] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const isAdmin = currentUsername() === 'admin'

  const openAdjust = (a: LoyaltyAccount) => {
    setAdjust(a); setPoints(''); setReason('')
  }

  const submit = async () => {
    if (!adjust) return
    setBusy(true)
    try {
      const updated = await growth.adjustLoyalty(adjust.id, {
        points: Number(points), reason: reason.trim(),
      })
      toast('success', `${updated.email} — new balance ${updated.balance} pts`)
      setAdjust(null)
      accounts.reload()
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Adjustment failed')
    } finally { setBusy(false) }
  }

  const valid = adjust !== null && points !== '' && Number(points) !== 0 && !!reason.trim()

  const cols: Column<never>[] = [
    { key: 'email', label: 'Customer' },
    { key: 'balance', label: 'Balance', numeric: true, render: (a: LoyaltyAccount) => (
      <Pill tone={a.balance > 0 ? 'forest' : 'plain'}>{a.balance} pts</Pill>
    ) },
    { key: 'lifetimeEarned', label: 'Lifetime earned', numeric: true, render: (a: LoyaltyAccount) => a.lifetimeEarned },
    { key: 'lifetimeRedeemed', label: 'Lifetime redeemed', numeric: true, render: (a: LoyaltyAccount) => a.lifetimeRedeemed },
    { key: 'adjust', label: '', render: (a: LoyaltyAccount) => isAdmin
      ? <Button variant="ghost" small onClick={() => openAdjust(a)}>Adjust</Button>
      : <Pill tone="slate">view only</Pill> },
  ] as never

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchBox placeholder="Search by email…" onSearch={setQ} />
        <div className="spacer" />
        <Button variant="ghost" small onClick={accounts.reload}>Refresh</Button>
      </div>

      <div className="card" data-testid="loyalty-table">
        <PanelTitle>Loyalty accounts</PanelTitle>
        <View loading={accounts.loading} error={accounts.error} rows={accounts.data as never[] | null}
          cols={cols} empty={q ? `No accounts matching “${q}”.` : 'No loyalty accounts yet — points accrue when orders are delivered.'}
          onRetry={accounts.reload} />
      </div>

      <Modal open={!!adjust} onClose={() => setAdjust(null)}
        title={adjust ? `Adjust points — ${adjust.email}` : 'Adjust points'}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          Current balance {adjust?.balance ?? 0} pts. Positive points credit the account, negative deduct.
          The adjustment is written to the append-only loyalty ledger.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Field label="Points (non-zero)">
            <input className="input" type="number" step="1" value={points} style={{ width: 160 }}
              onChange={(e) => setPoints(e.target.value)} placeholder="e.g. 100 or -50" />
          </Field>
        </div>
        <Field label="Reason (required)">
          <textarea className="input" rows={3} style={{ width: '100%' }} value={reason}
            placeholder="Why is this adjustment being made?" onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="modal-actions">
          <Button variant="ghost" onClick={() => setAdjust(null)}>Cancel</Button>
          <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Apply adjustment'}</Button>
        </div>
      </Modal>
    </div>
  )
}
