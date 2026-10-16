import type { OrderRow } from "@/lib/supabase";
import { confirmedPayments, historyDate, paymentMethod } from "@/lib/customerHistory";
import { formatPrice } from "@/lib/format";

export function PaymentHistory({ orders, demo = false }: { orders: OrderRow[]; demo?: boolean }) {
  const payments = confirmedPayments(orders);
  return <section>
    <h2 className="font-display text-2xl">Payment history</h2>
    <p className="mt-2 max-w-2xl text-sm text-muted">{demo ? "Illustrative payment records only. No money was received and no payment provider was contacted." : "Full-order payments recorded by OCTA. Ozow confirmations are verified by the payment service; EFT payments appear after our team confirms them."}</p>
    {payments.length === 0 ? <p className="mt-5 border-2 border-dashed border-ink p-5 text-ink-soft">No recorded payment confirmations in the loaded orders. Check Orders for pending payments or load older history below.</p> :
      <ul className="mt-5 space-y-4">{payments.map(order => <li key={order.id} className="border-2 border-ink bg-panel">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-ink bg-lime px-5 py-4">
          <div><p className="kicker">Payment confirmed / {paymentMethod(order)}</p><p className="num mt-1 font-display text-2xl">{order.ref}</p></div>
          <strong className="num font-display text-3xl">{formatPrice(Number(order.payment_confirmed_amount))}</strong>
        </div>
        <dl className="grid gap-4 px-5 py-4 text-sm sm:grid-cols-2">
          <div><dt className="kicker text-muted">Confirmation recorded</dt><dd className="mt-1">{historyDate(order.payment_confirmed_at, true)} SAST</dd></div>
          <div><dt className="kicker text-muted">Payment reference</dt><dd className="mt-1 break-all font-mono">{order.payment_reference || order.ref}</dd></div>
        </dl>
        <ul className="border-t border-line px-5 py-3 text-sm text-ink-soft">{order.items.map(item => <li key={item.sku} className="py-1"><span className="font-mono font-bold text-ink">{item.qty}×</span> {item.name} <span className="font-mono text-xs">{item.size}</span></li>)}</ul>
      </li>)}</ul>}
  </section>;
}
