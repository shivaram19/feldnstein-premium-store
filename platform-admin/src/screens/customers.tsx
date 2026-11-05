import { useState } from 'react'
import { Button, DataTable, Modal, Pill, useToast, type Column } from '../ui'
import { formatDate, formatDay, formatINR, formatPaise } from '../api/formats'
import { useList, View } from '../api/list'
import { growth, type CrmCustomer, type CrmCustomerDetail, type CrmOrderBrief, type LoyaltyTransaction } from '../api/growth'
import { PanelTitle, SearchBox } from './shared'

export function CustomersScreen() {
  const [q, setQ] = useState('')
  const customers = useList<CrmCustomer>(`/crm/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`)
  const toast = useToast()
  const [email, setEmail] = useState<string | null>(null)
  const [detail, setDetail] = useState<CrmCustomerDetail | null>(null)

  const openDetail = (cust: CrmCustomer) => {
    setEmail(cust.email); setDetail(null)
    growth.crmCustomer(cust.email).then(setDetail).catch((e: unknown) => {
      setEmail(null)
      toast('error', e instanceof Error ? e.message : 'Couldn’t load this customer')
    })
  }

  const cols: Column<never>[] = [
    { key: 'email', label: 'Customer', render: (c: CrmCustomer) => (
      <button className="linklike" onClick={() => openDetail(c)}>{c.email}</button>
    ) },
    { key: 'name', label: 'Name', render: (c: CrmCustomer) => c.name || '—' },
    { key: 'ordersCount', label: 'Orders', numeric: true },
    { key: 'totalSpendPaise', label: 'Total spend', numeric: true, render: (c: CrmCustomer) => formatPaise(c.totalSpendPaise) },
    { key: 'points', label: 'Points', numeric: true, render: (c: CrmCustomer) => (
      <Pill tone={c.points > 0 ? 'forest' : 'plain'}>{c.points} pts</Pill>
    ) },
    { key: 'subscribed', label: 'Subscribed', render: (c: CrmCustomer) => (
      <Pill tone={c.subscribed ? 'green' : 'slate'}>{c.subscribed ? 'YES' : 'no'}</Pill>
    ) },
    { key: 'lastOrderAt', label: 'Last order', render: (c: CrmCustomer) => c.lastOrderAt ? formatDay(c.lastOrderAt) : '—' },
  ] as never

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchBox placeholder="Search by email or name…" onSearch={setQ} />
        <div className="spacer" />
        <Button variant="ghost" small onClick={customers.reload}>Refresh</Button>
      </div>

      <div className="card" data-testid="customers-table">
        <PanelTitle>Customers</PanelTitle>
        <View loading={customers.loading} error={customers.error} rows={customers.data as never[] | null}
          cols={cols} empty={q ? `No customers matching “${q}”.` : 'No customers yet.'}
          onRetry={customers.reload} />
      </div>

      <Modal open={email !== null} onClose={() => setEmail(null)}
        title={detail?.profile?.name || email || 'Customer'}>
        {!detail ? <p>Loading…</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Pill tone={detail.subscription?.subscribed ? 'green' : 'slate'}>
                {detail.subscription?.subscribed ? 'subscribed' : 'not subscribed'}
              </Pill>
              {detail.subscription?.source && <Pill tone="plain">{detail.subscription.source}</Pill>}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
              {detail.profile?.email}<br />
              {detail.profile?.phone && <>{detail.profile.phone} · </>}
              {detail.profile?.joinedAt && <>joined {formatDay(detail.profile.joinedAt)}</>}
              {detail.subscription?.createdAt && <><br />subscribed {formatDate(detail.subscription.createdAt)}</>}
            </p>

            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                Orders ({detail.orders?.length ?? 0})
              </div>
              {detail.orders?.length ? (
                <DataTable columns={[
                  { key: 'order', label: 'Order', render: (o: CrmOrderBrief) => o.orderNo ?? o.orderCode ?? '—' },
                  { key: 'status', label: 'Status', render: (o: CrmOrderBrief) => o.status ? <Pill tone="plain">{o.status}</Pill> : '—' },
                  { key: 'total', label: 'Total', numeric: true, render: (o: CrmOrderBrief) =>
                    o.grandTotalPaise !== undefined ? formatPaise(o.grandTotalPaise) : o.grandTotal !== undefined ? formatINR(o.grandTotal) : '—' },
                  { key: 'createdAt', label: 'Placed', render: (o: CrmOrderBrief) => o.createdAt ? formatDay(o.createdAt) : '—' },
                ] as never} rows={detail.orders as never[]} />
              ) : <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>No orders on record.</p>}
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                Loyalty ledger ({detail.loyaltyTransactions?.length ?? 0})
              </div>
              {detail.loyaltyTransactions?.length ? (
                <DataTable columns={[
                  { key: 'createdAt', label: 'When', render: (t: LoyaltyTransaction) => formatDate(t.createdAt) },
                  { key: 'type', label: 'Type', render: (t: LoyaltyTransaction) => <Pill tone="plain">{t.type}</Pill> },
                  { key: 'points', label: 'Points', numeric: true, render: (t: LoyaltyTransaction) => (
                    <span style={{ color: t.points >= 0 ? 'var(--forest)' : 'var(--rust)', fontWeight: 600 }}>
                      {t.points >= 0 ? `+${t.points}` : t.points}
                    </span>
                  ) },
                  { key: 'balanceAfter', label: 'Balance after', numeric: true, render: (t: LoyaltyTransaction) => t.balanceAfter },
                  { key: 'reason', label: 'Reason', render: (t: LoyaltyTransaction) => t.reason || '—' },
                ] as never} rows={detail.loyaltyTransactions as never[]} />
              ) : <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>No loyalty activity yet.</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
