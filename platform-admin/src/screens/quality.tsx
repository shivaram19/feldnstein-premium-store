import { useState, useEffect } from 'react'
import { Button, Field, Modal, OptionsError, Pill, useToast } from '../ui'
import { currentUsername } from '../api/client'
import { formatDate } from '../api/formats'
import { type ProductionBatch, type QualityCheck, gaanugu } from '../api/types'
import { useList, View } from '../api/list'

export function QualityScreen() {
  const { data, error, loading, reload } = useList<QualityCheck>('/quality-checks?size=500')
  const [open, setOpen] = useState(false)
  const toast = useToast()
  return (
    <section>
      <div className="toolbar">
        <Pill tone="forest">{data?.filter((c) => c.overallPass).length ?? 0} passed</Pill>
        <Pill tone="rust">{data?.filter((c) => !c.overallPass).length ?? 0} failed / quarantine</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
        <Button variant="gold" small onClick={() => setOpen(true)}>+ Record check</Button>
      </div>
      <div className="card">
        <View loading={loading} error={error} rows={data as never[] | null} empty="No quality checks recorded." onRetry={reload}
          cols={[
            { key: 'batch', label: 'Batch', render: (c: QualityCheck) => c.batch?.code },
            { key: 'stage', label: 'Stage', render: (c: QualityCheck) => <Pill tone="plain">{c.stage.replace('_', ' ')}</Pill> },
            { key: 'aflatoxin', label: 'Aflatoxin (ppb)', numeric: true, render: (c: QualityCheck) => c.aflatoxinPpb ?? '—' },
            { key: 'temp', label: 'Oil temp (°C)', numeric: true, render: (c: QualityCheck) =>
              c.oilTempCelsius == null ? '—' :
                <Pill tone={c.oilTempCelsius < 40 ? 'green' : 'rust'}>{c.oilTempCelsius}°{c.oilTempCelsius < 40 ? ' cold-press ✓' : ' TOO HOT'}</Pill> },
            { key: 'result', label: 'Result', render: (c: QualityCheck) => <Pill tone={c.overallPass ? 'green' : 'rust'}>{c.overallPass ? 'PASS' : 'FAIL'}</Pill> },
            { key: 'checkedBy', label: 'By' },
            { key: 'checkedAt', label: 'When', render: (c: QualityCheck) => formatDate(c.checkedAt) },
          ] as never} />
      </div>
      <QualityModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Check recorded'); reload() }} />
    </section>
  )
}

function QualityModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [batches, setBatches] = useState<ProductionBatch[]>([])
  const [form, setForm] = useState({ batchId: '', stage: 'PRE_RELEASE', moisturePct: '', aflatoxinPpb: '', oilTempCelsius: '', notes: '', pass: 'true' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optionsError, setOptionsError] = useState(false)
  const loadOptions = () => {
    setOptionsError(false)
    gaanugu.list<ProductionBatch>('/production-batches?size=500').then(setBatches).catch(() => setOptionsError(true))
  }
  useEffect(() => { if (open) loadOptions() }, [open])
  const valid = form.batchId
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await gaanugu.create('/quality-checks?size=500', {
        batch: { id: Number(form.batchId) }, stage: form.stage,
        moisturePct: form.moisturePct ? Number(form.moisturePct) : null,
        aflatoxinPpb: form.aflatoxinPpb ? Number(form.aflatoxinPpb) : null,
        oilTempCelsius: form.oilTempCelsius ? Number(form.oilTempCelsius) : null,
        overallPass: form.pass === 'true', notes: form.notes.trim() || null, checkedBy: currentUsername(),
      })
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title="Record quality check" sub="FSSAI panel — aflatoxin, temperature, seal. Temp under 40°C proves cold-press." open={open} onClose={onClose}>
      <Field label="Batch">
        <select className="input" style={{ width: '100%' }} value={form.batchId} onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))}>
          <option value="">Select batch…</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.batchCode} — {b.product?.name}</option>)}
        </select>
      </Field>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field label="Stage">
          <select className="input" value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}>
            {['PRE_PRESS', 'POST_PRESS', 'PRE_RELEASE'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Moisture %"><input className="input" type="number" step="0.01" value={form.moisturePct} onChange={(e) => setForm((f) => ({ ...f, moisturePct: e.target.value }))} /></Field>
        <Field label="Aflatoxin ppb"><input className="input" type="number" step="0.01" value={form.aflatoxinPpb} onChange={(e) => setForm((f) => ({ ...f, aflatoxinPpb: e.target.value }))} /></Field>
        <Field label="Oil temp °C"><input className="input" type="number" step="0.1" value={form.oilTempCelsius} onChange={(e) => setForm((f) => ({ ...f, oilTempCelsius: e.target.value }))} /></Field>
        <Field label="Result">
          <select className="input" value={form.pass} onChange={(e) => setForm((f) => ({ ...f, pass: e.target.value }))}>
            <option value="true">PASS</option><option value="false">FAIL</option>
          </select>
        </Field>
      </div>
      <Field label="Notes"><input className="input" style={{ width: '100%' }} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Field>
      {optionsError && <OptionsError onRetry={loadOptions} />}
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Record check'}</Button>
      </div>
    </Modal>
  )
}
