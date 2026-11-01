import { useState } from 'react'
import { Pill } from '../ui'
import { formatDay, formatINR } from '../api/formats'
import { type NamedRef, type Bull, type Operator, type BullWorkLog } from '../api/types'
import { useList, View } from '../api/list'

const BP_TABS = ['Bulls', 'Work Logs', 'Presses', 'Operators'] as const



export function BullPressScreen() {
  const [sub, setSub] = useState<(typeof BP_TABS)[number]>('Bulls')
  return (
    <section>
      <div className="toolbar">
        <div className="filter-row">
          {BP_TABS.map((t) => (
            <Pill key={t} tone={sub === t ? 'forest' : 'plain'} selected={sub === t} onClick={() => setSub(t)}>{t}</Pill>
          ))}
        </div>
      </div>
      {sub === 'Bulls' && <BullTable />}
      {sub === 'Work Logs' && <WorkLogTable />}
      {sub === 'Presses' && <PressTable />}
      {sub === 'Operators' && <OperatorTable />}
    </section>
  )
}

function OperatorTable() {
  const { data, error, loading, reload } = useList<Operator>('/press-operators?size=500')
  return <div className="card"><View loading={loading} error={error} rows={data as never[] | null} empty="No operators registered." onRetry={reload}
    cols={[
      { key: 'code', label: 'Code', render: (o: Operator) => <Pill tone="forest">{o.code}</Pill> },
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'wage', label: 'Wage', render: (o: Operator) => `${o.wageType} · ${formatINR(o.rate)}` },
    ] as never} /></div>
}

function BullTable() {
  const { data, error, loading, reload } = useList<Bull>('/bulls')
  return <div className="card"><View loading={loading} error={error} rows={data as never[] | null} empty="No bulls registered." onRetry={reload}
    cols={[
      { key: 'code', label: 'Code', render: (b: Bull) => <Pill tone="forest">{b.code}</Pill> },
      { key: 'name', label: 'Name' },
      { key: 'breed', label: 'Breed' },
      { key: 'health', label: 'Health', render: (b: Bull) =>
        <Pill tone={b.healthStatus === 'FIT' ? 'green' : b.healthStatus === 'RESTING' ? 'gold' : 'rust'}>{b.healthStatus}</Pill> },
      { key: 'limit', label: 'Daily limit (h)', numeric: true, render: (b: Bull) => b.dailyWorkLimitHrs },
      { key: 'vet', label: 'Next vet check', render: (b: Bull) => (b as unknown as { nextVetCheck?: string }).nextVetCheck ?? '—' },
    ] as never} /></div>
}

function WorkLogTable() {
  const { data, error, loading, reload } = useList<BullWorkLog>('/bull-work-logs?size=500')
  return <div className="card"><View loading={loading} error={error} rows={data as never[] | null} empty="No work sessions logged." onRetry={reload}
    cols={[
      { key: 'workDate', label: 'Date', render: (w: BullWorkLog) => formatDay(w.workDate) },
      { key: 'bull', label: 'Bull', render: (w: BullWorkLog) => w.bull?.name },
      { key: 'batch', label: 'Batch', render: (w: BullWorkLog) => w.batch?.code ?? '—' },
      { key: 'hours', label: 'Hours worked', numeric: true, render: (w: BullWorkLog) =>
        <Pill tone={w.hoursWorked > 4 ? 'rust' : 'green'}>{w.hoursWorked}</Pill> },
      { key: 'health', label: 'Observation', render: (w: BullWorkLog) => w.healthObservation ?? '—' },
    ] as never} /></div>
}

type PressRow = NamedRef & { type?: string; beamCondition: string; status: string; nextMaintenanceDue?: string }

function PressTable() {
  const { data, error, loading, reload } = useList<PressRow>('/presses')
  return <div className="card"><View loading={loading} error={error} rows={data as never[] | null} empty="No presses registered." onRetry={reload}
    cols={[
      { key: 'code', label: 'Code', render: (p: PressRow) => <Pill tone="forest">{p.code}</Pill> },
      { key: 'type', label: 'Type' },
      { key: 'beam', label: 'Beam', render: (p: PressRow) => <Pill tone={p.beamCondition === 'GOOD' ? 'green' : p.beamCondition === 'FAIR' ? 'gold' : 'rust'}>{p.beamCondition}</Pill> },
      { key: 'maintenance', label: 'Next maintenance', render: (p: PressRow) => p.nextMaintenanceDue ?? '—' },
      { key: 'status', label: 'Status', render: (p: PressRow) => <Pill tone={p.status === 'ACTIVE' ? 'green' : 'slate'}>{p.status.replace(/_/g, ' ')}</Pill> },
    ] as never} /></div>
}
