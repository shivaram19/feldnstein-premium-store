import { useCallback, useEffect, useRef, useState } from 'react'
import { api, getAuth } from './api'
import { Button, ConfirmModal, Field, LoadingRows, Modal, Pill, useToast, type PillTone } from './ui'

export interface GMediaAsset {
  id: number
  assetKey: string
  originalFilename: string
  contentType: string
  sizeBytes: number
  altText: string
  status: 'DRAFT' | 'PROCESSING' | 'READY' | 'PUBLISHED' | 'ERROR'
  finalized: boolean
  errorNote: string
  variants: Record<string, string>
  createdBy: string
}

const STATUS_TONE: Record<string, PillTone> = {
  DRAFT: 'slate', PROCESSING: 'gold', READY: 'forest', PUBLISHED: 'green', ERROR: 'rust',
}

const SLOT_HINTS = ['product:groundnut:card', 'product:coconut:card', 'product:sesame:card', 'hero:main', 'banner:main', 'misc:']

const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

export function GMedia() {
  const [assets, setAssets] = useState<GMediaAsset[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<GMediaAsset | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [tick, setTick] = useState(0)
  const toast = useToast()

  const load = useCallback(() => {
    setError(null)
    api.list<GMediaAsset>('/g/media')
      .then(setAssets)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t) }, [load, tick])

  const togglePublish = async (a: GMediaAsset) => {
    try {
      await api.post(a.status === 'PUBLISHED' ? `/g/media/${a.id}/unpublish` : `/g/media/${a.id}/publish`)
      toast('success', a.status === 'PUBLISHED' ? 'Unpublished' : 'Published')
      load()
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) }
  }

  const doDelete = async () => {
    if (!pendingDelete) return
    setDeleteBusy(true)
    try {
      await api.post(`/g/media/${pendingDelete.id}/unpublish`).catch(() => undefined)
      await api.delete(`/g/media/${pendingDelete.id}`)
      toast('success', 'Asset deleted')
      setPendingDelete(null)
      load()
    } catch (e) {
      toast('error', e instanceof Error ? e.message : String(e))
    } finally { setDeleteBusy(false) }
  }

  const saveAlt = async (a: GMediaAsset, altText: string) => {
    try {
      await api.update(`/g/media/${a.id}`, { assetKey: a.assetKey, altText })
      toast('success', 'Alt text saved')
      load()
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) }
  }

  return (
    <section>
      <div className="toolbar">
        <Pill tone="forest">{assets?.length ?? 0} assets</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={load}>Refresh</Button>
        <Button variant="gold" small onClick={() => setOpen(true)}>+ Upload</Button>
      </div>
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      {!assets && !error && <LoadingRows cols={4} />}
      {assets && assets.length === 0 && (
        <div className="card" style={{ padding: 24, color: 'var(--muted)' }}>No media yet — upload the first asset.</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {assets?.map((a) => (
          <div key={a.id} className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {a.variants.thumb
              ? <img src={a.variants.thumb} alt={a.altText || a.assetKey} style={{ width: '100%', borderRadius: 6, aspectRatio: '4 / 5', objectFit: 'cover' }} />
              : <div style={{ aspectRatio: '4 / 5', borderRadius: 6, background: 'var(--cream)', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 12 }}>no preview</div>}
            <div style={{ fontSize: 12, fontWeight: 700 }}>{a.assetKey}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <Pill tone={STATUS_TONE[a.status] ?? 'plain'}>{a.status}</Pill>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{(a.sizeBytes / 1024).toFixed(0)} KB</span>
            </div>
            {a.errorNote && <div style={{ fontSize: 11, color: 'var(--rust)' }}>{a.errorNote}</div>}
            <input className="input" style={{ fontSize: 12 }} placeholder="Alt text" defaultValue={a.altText}
              onBlur={(e) => { if (e.target.value !== a.altText) saveAlt(a, e.target.value) }} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(a.status === 'READY' || a.status === 'PUBLISHED') && (
                <Button variant="ghost" small onClick={() => togglePublish(a)}>{a.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}</Button>
              )}
              {a.status === 'ERROR' && (
                <Button variant="ghost" small onClick={async () => {
                  try {
                    await api.post(`/g/media/${a.id}/retry`)
                    toast('success', 'Retry queued')
                    setTick((t) => t + 1)
                  } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) }
                }}>Retry</Button>
              )}
              <Button variant="ghost" small onClick={() => setPendingDelete(a)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
      <UploadModal open={open} onClose={() => setOpen(false)} onDone={() => { setOpen(false); setTick((t) => t + 1) }} />
      <ConfirmModal open={!!pendingDelete}
        title={`Delete ${pendingDelete?.assetKey ?? ''}`}
        sub="This removes the stored files and all generated variants."
        confirmLabel="Delete asset" busy={deleteBusy}
        onClose={() => setPendingDelete(null)} onConfirm={doDelete} />
    </section>
  )
}

function UploadModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [assetKey, setAssetKey] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const runId = useRef(0)
  const toast = useToast()

  useEffect(() => {
    if (open) { setBusy(false); setPhase(''); setError(null) }
  }, [open])

  const valid = assetKey.trim().length >= 3 && !!file

  const submit = async () => {
    if (!file) return
    const myRun = ++runId.current
    setBusy(true); setError(null); setPhase('Requesting upload…')
    try {
      const presigned = await api.create<{ assetId: number; uploadUrl: string; method: string; headers: Record<string, string> }>(
        '/g/media/presign', {
          assetKey: assetKey.trim(), filename: file.name, contentType: file.type, sizeBytes: file.size,
        })
      setPhase('Uploading…')
      const url = presigned.uploadUrl.startsWith('http') ? presigned.uploadUrl : API_BASE + presigned.uploadUrl
      const res = await fetch(url, {
        method: presigned.method,
        headers: { ...presigned.headers, Authorization: getAuth() ?? '' },
        body: file,
      })
      if (!res.ok) throw new Error(`Upload failed (${res.status})`)
      setPhase('Processing variants…')
      await api.post(`/g/media/${presigned.assetId}/finalize`)
      let ready = false
      for (let i = 0; i < 20; i++) {
        if (runId.current !== myRun) return
        await new Promise((r) => setTimeout(r, 2000))
        const rows = await api.list<GMediaAsset>('/g/media')
        const row = rows.find((r) => r.id === presigned.assetId)
        if (row?.status === 'READY') { ready = true; break }
        if (row?.status === 'ERROR') throw new Error(row.errorNote || 'variant generation failed')
      }
      if (runId.current !== myRun) return
      if (ready) toast('success', 'Uploaded — variants ready')
      else toast('info', 'Uploaded — still processing, watch the grid')
      onDone()
    } catch (e) {
      if (runId.current === myRun) setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (runId.current === myRun) { setBusy(false); setPhase('') }
    }
  }

  return (
    <Modal title="Upload media" sub="Auto-cropped to card 4:5, hero 16:9, banner 21:9, thumb 4:5. JPEG, PNG, or WebP up to 10 MB." open={open} onClose={onClose}>
      <Field label="Asset key (slot)">
        <input className="input" style={{ width: '100%' }} value={assetKey} onChange={(e) => setAssetKey(e.target.value)}
          placeholder="product:groundnut:card" list="slot-hints" autoFocus />
        <datalist id="slot-hints">{SLOT_HINTS.map((s) => <option key={s} value={s} />)}</datalist>
      </Field>
      <Field label="Image file">
        <input type="file" accept="image/jpeg,image/png,image/webp" className="input" style={{ width: '100%' }}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </Field>
      {phase && <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{phase}</p>}
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Working…' : 'Upload'}</Button>
      </div>
    </Modal>
  )
}
