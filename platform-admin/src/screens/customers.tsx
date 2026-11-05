import { useEffect, useState } from 'react'
import { Button, DataTable, Field, Modal, Pill, useToast, type Column, type PillTone } from '../ui'
import { formatDate, formatDay, formatINR, formatPaise } from '../api/formats'
import { useList, View } from '../api/list'
import {
  CRM_STATUSES, crmStats, growth,
  type CrmChannel, type CrmContact, type CrmContactDetail, type CrmContactPatchRequest,
  type CrmContactUpsertRequest, type CrmInteraction, type CrmOrderBrief,
  type CrmStatus, type CrmTask, type LoyaltyTransaction,
} from '../api/growth'
import { PanelTitle, SearchBox } from './shared'

const STATUS_TONE: Record<CrmStatus, PillTone> = {
  LEAD: 'slate', CONTACTED: 'forest', QUALIFIED: 'gold',
  ACTIVE: 'green', INACTIVE: 'plain', LOST: 'rust',
}

function statusTone(s: string): PillTone {
  return STATUS_TONE[s as CrmStatus] ?? 'plain'
}

/** A 24-hour customer-service window, per the Meta Cloud API session rules. */
function sessionOpenFor(interactions: CrmInteraction[] | undefined, channel: 'WHATSAPP' | 'INSTAGRAM'): boolean {
  const last = interactions
    ?.filter((i) => i.channel === channel && i.direction === 'INBOUND')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  if (!last) return false
  return Date.now() - new Date(last.createdAt).getTime() < 24 * 60 * 60 * 1000
}

export function CustomersScreen() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [onlyTasks, setOnlyTasks] = useState(false)
  const contacts = useList<CrmContact>('/crm/contacts' +
    `${q || status ? '?' : ''}${q ? `q=${encodeURIComponent(q)}` : ''}${q && status ? '&' : ''}${status ? `status=${status}` : ''}`)
  const toast = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [detail, setDetail] = useState<CrmContactDetail | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const reloadDetail = () => {
    if (!email) return
    growth.crmContactDetail(email).then(setDetail).catch((e: unknown) =>
      toast('error', e instanceof Error ? e.message : 'Couldn’t load this contact'))
  }

  const openDetail = (c: CrmContact) => {
    setEmail(c.email); setDetail(null); setEditOpen(false)
    growth.crmContactDetail(c.email).then(setDetail).catch((e: unknown) => {
      setEmail(null)
      toast('error', e instanceof Error ? e.message : 'Couldn’t load this contact')
    })
  }

  const closeDetail = () => { setEmail(null); setDetail(null); setEditOpen(false) }

  const rows = (contacts.data ?? []).filter((c) => !onlyTasks || (c.openTasks ?? 0) > 0)
  const openTaskSum = (contacts.data ?? []).reduce((n, c) => n + (c.openTasks ?? 0), 0)
  const overdueSum = (contacts.data ?? []).reduce((n, c) => n + (c.overdueTasks ?? 0), 0)

  const cols: Column<never>[] = [
    { key: 'email', label: 'Contact', render: (c: CrmContact) => (
      <button className="linklike" onClick={() => openDetail(c)}>{c.email}</button>
    ) },
    { key: 'name', label: 'Name', render: (c: CrmContact) => c.name || '—' },
    { key: 'status', label: 'Status', render: (c: CrmContact) => <Pill tone={statusTone(c.status)}>{c.status}</Pill> },
    { key: 'tags', label: 'Tags', render: (c: CrmContact) =>
      c.tags?.length ? c.tags.map((t) => <Pill key={t} tone="plain">{t}</Pill>) : '—' },
    { key: 'channels', label: 'Channels', render: (c: CrmContact) => (
      <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
        <span title={c.whatsappOptIn ? `WhatsApp opted in${c.whatsappPhone ? ` — ${c.whatsappPhone}` : ''}`
          : c.whatsappPhone ? 'WhatsApp handle on file — no opt-in' : 'No WhatsApp'}
          style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block',
            background: c.whatsappOptIn ? 'var(--herb)' : c.whatsappPhone ? 'var(--muted)' : 'transparent',
            border: c.whatsappOptIn || c.whatsappPhone ? 'none' : '1.5px solid var(--hairline)' }} />
        {c.instagramHandle
          ? <span style={{ fontSize: 12, color: 'var(--muted)' }}>@{c.instagramHandle}</span>
          : <span style={{ color: 'var(--muted)' }}>—</span>}
      </span>
    ) },
    { key: 'ordersCount', label: 'Orders', numeric: true },
    { key: 'totalSpendPaise', label: 'Spend', numeric: true, render: (c: CrmContact) => formatPaise(c.totalSpendPaise) },
    { key: 'points', label: 'Points', numeric: true },
    { key: 'openTasks', label: 'Open tasks', render: (c: CrmContact) =>
      (c.openTasks ?? 0) === 0 ? '—' : (
        <Pill tone={(c.overdueTasks ?? 0) > 0 ? 'rust' : 'plain'}>
          {c.openTasks}{c.overdueTasks > 0 ? ` (${c.overdueTasks} overdue)` : ''}
        </Pill>
      ) },
    { key: 'lastOrderAt', label: 'Last order', render: (c: CrmContact) => c.lastOrderAt ? formatDay(c.lastOrderAt) : '—' },
  ] as never

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchBox placeholder="Search by email or name…" onSearch={setQ} />
        <Pill tone={onlyTasks ? 'forest' : 'plain'} selected={onlyTasks} onClick={() => setOnlyTasks((v) => !v)}>
          {`Open tasks: ${openTaskSum}${overdueSum > 0 ? ` (${overdueSum} overdue)` : ''}`}
        </Pill>
        <div className="spacer" />
        <Button variant="gold" small onClick={() => setAddOpen(true)}>+ Add contact</Button>
        <Button variant="ghost" small onClick={contacts.reload}>Refresh</Button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Pill tone={!status ? 'forest' : 'plain'} selected={!status} onClick={() => setStatus('')}>All</Pill>
        {CRM_STATUSES.map((s) => (
          <Pill key={s} tone={status === s ? 'forest' : 'plain'} selected={status === s}
            onClick={() => setStatus(s)}>{s}</Pill>
        ))}
      </div>

      <div className="card" data-testid="customers-table">
        <PanelTitle>CRM contacts</PanelTitle>
        <View loading={contacts.loading} error={contacts.error} rows={rows as never[] | null}
          cols={cols} empty={q || status ? 'No contacts match this filter.' : 'No contacts yet — add the first one.'}
          onRetry={contacts.reload} />
      </div>

      <ContactFormModal open={addOpen} onClose={() => setAddOpen(false)} mode="create"
        onSaved={() => { setAddOpen(false); contacts.reload() }} />

      <ContactDetailModal email={email} detail={detail} onClose={closeDetail}
        editOpen={editOpen} setEditOpen={setEditOpen} reloadDetail={reloadDetail}
        onMutated={() => contacts.reload()} />
    </div>
  )
}

/* ================= contact create / edit form ================= */

type ContactDraft = {
  email: string; name: string; phone: string
  whatsappPhone: string; whatsappOptIn: boolean; whatsappOptInSource: string
  instagramHandle: string; source: string; tags: string; status: CrmStatus
}

const EMPTY_DRAFT: ContactDraft = {
  email: '', name: '', phone: '', whatsappPhone: '', whatsappOptIn: false,
  whatsappOptInSource: '', instagramHandle: '', source: '', tags: '', status: 'LEAD',
}

function draftToRequest(d: ContactDraft): CrmContactUpsertRequest {
  return {
    email: d.email.trim(),
    name: d.name.trim() || undefined,
    phone: d.phone.trim() || undefined,
    whatsappPhone: d.whatsappPhone.trim() || undefined,
    whatsappOptIn: d.whatsappOptIn || undefined,
    whatsappOptInSource: d.whatsappOptIn ? d.whatsappOptInSource.trim() || undefined : undefined,
    instagramHandle: d.instagramHandle.trim() || undefined,
    source: d.source.trim() || undefined,
    tags: d.tags.split(',').map((t) => t.trim()).filter(Boolean),
    status: d.status,
  }
}

function ContactFormModal({ open, onClose, mode, initial, onSaved }: {
  open: boolean; onClose: () => void
  mode: 'create' | 'edit'
  initial?: CrmContactDetail
  onSaved: () => void
}) {
  const toast = useToast()
  const [draft, setDraft] = useState<ContactDraft>(EMPTY_DRAFT)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setDraft(!initial ? EMPTY_DRAFT : {
      email: initial.email ?? '',
      name: initial.name ?? '',
      phone: initial.phone ?? '',
      whatsappPhone: initial.whatsappPhone ?? '',
      whatsappOptIn: initial.whatsappOptIn ?? false,
      whatsappOptInSource: initial.whatsappOptInSource ?? '',
      instagramHandle: initial.instagramHandle ?? '',
      source: initial.source ?? '',
      tags: (initial.tags ?? []).join(', '),
      status: initial.status ?? 'LEAD',
    })
  }, [open, initial])

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())
  const valid = emailValid && (!draft.whatsappOptIn || !!draft.whatsappPhone.trim())

  const submit = async () => {
    setBusy(true); setError(null)
    try {
      const req = draftToRequest(draft)
      if (mode === 'edit') {
        const { email: _email, ...patch } = req
        await growth.patchCrmContact(initial!.email, patch as CrmContactPatchRequest)
        toast('success', `${initial!.email} updated`)
      } else {
        await growth.upsertCrmContact(req)
        toast('success', `${req.email} saved`)
      }
      onSaved()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      toast('error', msg)
    } finally { setBusy(false) }
  }

  const set = (patch: Partial<ContactDraft>) => setDraft((d) => ({ ...d, ...patch }))

  return (
    <Modal open={open} onClose={onClose}
      title={mode === 'edit' ? `Edit ${initial?.email ?? 'contact'}` : 'Add contact'}
      sub="Email is the contact key — adding an existing email updates that contact.">
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field label="Email *">
          <input className="input" type="email" style={{ width: 260 }} value={draft.email} disabled={mode === 'edit'}
            onChange={(e) => set({ email: e.target.value })} />
        </Field>
        <Field label="Name"><input className="input" style={{ width: 200 }} value={draft.name}
          onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Phone"><input className="input" style={{ width: 160 }} value={draft.phone}
          onChange={(e) => set({ phone: e.target.value })} /></Field>
        <Field label="Source"><input className="input" style={{ width: 160 }} value={draft.source}
          placeholder="e.g. instagram, referral" onChange={(e) => set({ source: e.target.value })} /></Field>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field label="WhatsApp number">
          <input className="input" style={{ width: 180 }} value={draft.whatsappPhone} placeholder="+91…"
            onChange={(e) => set({ whatsappPhone: e.target.value })} />
        </Field>
        <Field label="Instagram handle">
          <input className="input" style={{ width: 180 }} value={draft.instagramHandle} placeholder="username (no @)"
            onChange={(e) => set({ instagramHandle: e.target.value })} />
        </Field>
        <Field label="Tags (comma-separated)">
          <input className="input" style={{ width: 220 }} value={draft.tags} placeholder="vip, d2c, repeat"
            onChange={(e) => set({ tags: e.target.value })} />
        </Field>
        <Field label="Status">
          <select className="input" style={{ width: 150 }} value={draft.status}
            onChange={(e) => set({ status: e.target.value as CrmStatus })}>
            {CRM_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 600 }}>
        <input type="checkbox" checked={draft.whatsappOptIn}
          onChange={(e) => set({ whatsappOptIn: e.target.checked })} />
        WhatsApp opt-in granted
      </label>
      {draft.whatsappOptIn && (
        <Field label="Opt-in source">
          <input className="input" style={{ width: 260 }} value={draft.whatsappOptInSource}
            placeholder="e.g. checkout tick, in-store form" onChange={(e) => set({ whatsappOptInSource: e.target.value })} />
        </Field>
      )}
      {!emailValid && draft.email.trim() !== '' && (
        <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600, margin: 0 }}>Enter a valid email address.</p>
      )}
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>
          {busy ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add contact'}
        </Button>
      </div>
    </Modal>
  )
}

/* ================= contact detail ================= */

function ContactDetailModal({ email, detail, onClose, editOpen, setEditOpen, reloadDetail, onMutated }: {
  email: string | null
  detail: CrmContactDetail | null
  onClose: () => void
  editOpen: boolean
  setEditOpen: (open: boolean) => void
  reloadDetail: () => void
  onMutated: () => void
}) {
  return (
    <>
      <Modal open={email !== null && !editOpen} onClose={onClose} wide
        title={detail?.name || detail?.email || email || 'Contact'}>
        {!detail ? <p>Loading…</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Pill tone={statusTone(detail.status)}>{detail.status}</Pill>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{detail.email}</span>
              <span style={{ marginLeft: 'auto' }}>
                <Button variant="ghost" small onClick={() => setEditOpen(true)}>Edit</Button>
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(detail.tags ?? []).map((t) => <Pill key={t} tone="plain">{t}</Pill>)}
              {detail.source && <Pill tone="forest">source: {detail.source}</Pill>}
            </div>

            <ContactStatsRow detail={detail} />

            <SendMessagePanel detail={detail} onSent={reloadDetail} />

            <InteractionsPanel detail={detail} onChanged={reloadDetail} />

            <TasksPanel detail={detail} onChanged={() => { reloadDetail(); onMutated() }} />

            <CompactHistory detail={detail} />
          </div>
        )}
      </Modal>

      <ContactFormModal open={email !== null && editOpen} onClose={() => setEditOpen(false)} mode="edit"
        initial={detail ?? undefined}
        onSaved={() => { setEditOpen(false); reloadDetail(); onMutated() }} />
    </>
  )
}

function ContactStatsRow({ detail }: { detail: CrmContactDetail }) {
  const s = crmStats(detail)
  const stats: [string, React.ReactNode][] = [
    ['Orders', s.ordersCount],
    ['Total spend', formatPaise(s.totalSpendPaise)],
    ['Points', s.points],
    ['Subscribed', <Pill key="sub" tone={s.subscribed ? 'green' : 'slate'}>{s.subscribed ? 'yes' : 'no'}</Pill>],
    ['Last order', s.lastOrderAt ? formatDay(s.lastOrderAt) : '—'],
  ]
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {stats.map(([label, value]) => (
        <div key={label} className="kpi" style={{ flex: '1 1 120px', minWidth: 110 }}>
          <div className="kpi-label">{label}</div>
          <div className="kpi-value" style={{ fontSize: 15 }}>{value}</div>
        </div>
      ))}
    </div>
  )
}

/* ================= send message ================= */

function SendMessagePanel({ detail, onSent }: { detail: CrmContactDetail; onSent: () => void }) {
  const toast = useToast()
  const [channel, setChannel] = useState<'WHATSAPP' | 'INSTAGRAM'>('WHATSAPP')
  const [text, setText] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { setText(''); setTemplateName('') }, [channel, detail.email])

  const handle = channel === 'WHATSAPP' ? detail.whatsappPhone : detail.instagramHandle
  const needsOptIn = channel === 'WHATSAPP' && !detail.whatsappOptIn
  const sessionOpen = sessionOpenFor(detail.interactions, channel)
  const sendable = !needsOptIn && !!text.trim() && (sessionOpen || !!templateName.trim())

  const send = async () => {
    setBusy(true)
    try {
      const res = await growth.sendCrmMessage({
        channel, email: detail.email, text: text.trim(),
        templateName: sessionOpen ? undefined : templateName.trim() || undefined,
      })
      toast('success', `Sent via ${res.provider}`)
      setText('')
      onSent()
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Send failed')
    } finally { setBusy(false) }
  }

  return (
    <div>
      <SectionTitle>Send message</SectionTitle>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        {(['WHATSAPP', 'INSTAGRAM'] as const).map((c) => (
          <Pill key={c} tone={channel === c ? 'forest' : 'plain'} selected={channel === c}
            onClick={() => setChannel(c)}>{c === 'WHATSAPP' ? 'WhatsApp' : 'Instagram'}</Pill>
        ))}
        {sessionOpen
          ? <Pill tone="green">Session open</Pill>
          : <Pill tone="gold">Session closed — template required</Pill>}
      </div>
      <Field label={`To (${channel === 'WHATSAPP' ? 'WhatsApp' : 'Instagram'})`}>
        <input className="input" style={{ width: '100%' }} value={handle ?? ''} disabled
          placeholder={channel === 'WHATSAPP' ? 'No WhatsApp number on file' : 'No Instagram handle on file'} />
      </Field>
      {needsOptIn ? (
        <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--rust)', fontWeight: 600 }}>
          Opt-in required — enable it in Edit.
        </p>
      ) : (
        <>
          {!sessionOpen && (
            <Field label="Template name * (required outside the 24-hour session window)">
              <input className="input" style={{ width: '100%' }} value={templateName}
                placeholder="e.g. order_update_v1" onChange={(e) => setTemplateName(e.target.value)} />
            </Field>
          )}
          <Field label="Message">
            <textarea className="input" rows={3} style={{ width: '100%' }} value={text}
              onChange={(e) => setText(e.target.value)} />
          </Field>
          <div className="modal-actions" style={{ marginTop: 8 }}>
            <Button variant="gold" small disabled={!sendable || busy} onClick={send}>
              {busy ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

/* ================= interactions timeline ================= */

const INTERACTION_CHANNELS: CrmChannel[] = ['NOTE', 'CALL', 'EMAIL', 'VISIT', 'WHATSAPP', 'INSTAGRAM']

function InteractionsPanel({ detail, onChanged }: { detail: CrmContactDetail; onChanged: () => void }) {
  const toast = useToast()
  const [channel, setChannel] = useState<CrmChannel>('NOTE')
  const [direction, setDirection] = useState<'OUTBOUND' | 'INBOUND'>('OUTBOUND')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { setChannel('NOTE'); setDirection('OUTBOUND'); setBody('') }, [detail.email])

  const timeline = [...(detail.interactions ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const add = async () => {
    setBusy(true)
    try {
      await growth.addCrmInteraction(detail.email, { channel, direction, body: body.trim() })
      setBody('')
      onChanged()
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Couldn’t log the interaction')
    } finally { setBusy(false) }
  }

  return (
    <div>
      <SectionTitle>Interactions ({timeline.length})</SectionTitle>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
        <Field label="Channel">
          <select className="input" style={{ width: 130 }} value={channel}
            onChange={(e) => setChannel(e.target.value as CrmChannel)}>
            {INTERACTION_CHANNELS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Direction">
          <select className="input" style={{ width: 120 }} value={direction}
            onChange={(e) => setDirection(e.target.value as 'OUTBOUND' | 'INBOUND')}>
            <option>OUTBOUND</option>
            <option>INBOUND</option>
          </select>
        </Field>
        <Field label="Note / message" >
          <input className="input" style={{ width: 320 }} value={body}
            onChange={(e) => setBody(e.target.value)} placeholder="What happened?" />
        </Field>
        <Button variant="ghost" small disabled={!body.trim() || busy} onClick={add}>
          {busy ? 'Saving…' : 'Log'}
        </Button>
      </div>
      {timeline.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>No interactions yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
          {timeline.map((i) => (
            <div key={i.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ color: i.direction === 'INBOUND' ? 'var(--herb)' : 'var(--muted)', fontWeight: 800, marginTop: 1 }}
                title={i.direction === 'INBOUND' ? 'Inbound' : 'Outbound'}>
                {i.direction === 'INBOUND' ? '↓' : '↑'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Pill tone="plain">{i.channel}</Pill>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {i.author || 'unknown'} · {formatDate(i.createdAt)}
                  </span>
                </div>
                <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{i.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ================= follow-up tasks ================= */

function TasksPanel({ detail, onChanged }: { detail: CrmContactDetail; onChanged: () => void }) {
  const toast = useToast()
  const [subject, setSubject] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { setSubject(''); setDueAt('') }, [detail.email])

  const openTasks = (detail.tasks ?? []).filter((t) => !t.done)

  const add = async () => {
    setBusy(true)
    try {
      await growth.createCrmTask({ email: detail.email, subject: subject.trim(), dueAt: dueAt || undefined })
      setSubject(''); setDueAt('')
      onChanged()
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Couldn’t add the task')
    } finally { setBusy(false) }
  }

  const complete = async (t: CrmTask) => {
    setBusy(true)
    try {
      await growth.completeCrmTask(t.id)
      onChanged()
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Couldn’t complete the task')
    } finally { setBusy(false) }
  }

  return (
    <div>
      <SectionTitle>Open tasks ({openTasks.length})</SectionTitle>
      {openTasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {openTasks.map((t) => (
            <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button variant="ghost" small disabled={busy} onClick={() => complete(t)}>Done</Button>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{t.subject}</span>
              {t.dueAt && <span style={{ fontSize: 12, color: 'var(--muted)' }}>due {formatDay(t.dueAt)}</span>}
              {t.overdue && <Pill tone="rust">overdue</Pill>}
              {t.createdBy && <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {t.createdBy}</span>}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <Field label="New task">
          <input className="input" style={{ width: 260 }} value={subject} placeholder="Follow up on…"
            onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Due (optional)">
          <input className="input" type="datetime-local" style={{ width: 210 }} value={dueAt}
            onChange={(e) => setDueAt(e.target.value)} />
        </Field>
        <Button variant="ghost" small disabled={!subject.trim() || busy} onClick={add}>
          {busy ? 'Saving…' : 'Add task'}
        </Button>
      </div>
    </div>
  )
}

/* ================= compact history ================= */

function CompactHistory({ detail }: { detail: CrmContactDetail }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <SectionTitle>Orders ({detail.orders?.length ?? 0})</SectionTitle>
        {detail.orders?.length ? (
          <DataTable columns={[
            { key: 'order', label: 'Order', render: (o: CrmOrderBrief) => o.orderNo ?? o.orderCode ?? '—' },
            { key: 'status', label: 'Status', render: (o: CrmOrderBrief) => o.status ? <Pill tone="plain">{o.status}</Pill> : '—' },
            { key: 'total', label: 'Total', numeric: true, render: (o: CrmOrderBrief) =>
              o.grandTotalPaise !== undefined ? formatPaise(o.grandTotalPaise)
                : o.grandTotal !== undefined ? formatINR(o.grandTotal) : '—' },
            { key: 'createdAt', label: 'Placed', render: (o: CrmOrderBrief) => o.createdAt ? formatDay(o.createdAt) : '—' },
          ] as never} rows={detail.orders as never[]} />
        ) : <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>No orders on record.</p>}
      </div>

      <div>
        <SectionTitle>Loyalty ledger ({detail.loyaltyTransactions?.length ?? 0})</SectionTitle>
        {detail.loyaltyTransactions?.length ? (
          <DataTable columns={[
            { key: 'createdAt', label: 'When', render: (t: LoyaltyTransaction) => formatDate(t.createdAt) },
            { key: 'type', label: 'Type', render: (t: LoyaltyTransaction) => <Pill tone="plain">{t.type}</Pill> },
            { key: 'points', label: 'Points', numeric: true, render: (t: LoyaltyTransaction) => (
              <span style={{ color: t.points >= 0 ? 'var(--forest)' : 'var(--rust)', fontWeight: 600 }}>
                {t.points >= 0 ? `+${t.points}` : t.points}
              </span>
            ) },
            { key: 'reason', label: 'Reason', render: (t: LoyaltyTransaction) => t.reason || '—' },
          ] as never} rows={detail.loyaltyTransactions as never[]} />
        ) : <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>No loyalty activity yet.</p>}
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
        Subscription:{' '}
        {detail.subscription?.subscribed
          ? <>subscribed{detail.subscription.source ? ` via ${detail.subscription.source}` : ''}
            {detail.subscription.createdAt ? ` on ${formatDate(detail.subscription.createdAt)}` : ''}</>
          : 'not subscribed'}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
      color: 'var(--muted)', marginBottom: 6, borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
      {children}
    </div>
  )
}
