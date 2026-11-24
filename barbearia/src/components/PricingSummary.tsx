import { formatPrice } from '../domain/schedule'
import type { DiscountType, PricingResult } from '../domain/pricing'

const DISCOUNT_LABELS: Record<DiscountType, string> = {
  combo: 'Combo Corte + Barba',
  vip: 'Clube VIP',
  coupon: 'Cupom'
}

export default function PricingSummary({ pricing }: { pricing: PricingResult }) {
  return (
    <dl className="summary" aria-label="Resumo do valor">
      <div>
        <dt>Subtotal</dt>
        <dd>{formatPrice(pricing.subtotalCents)}</dd>
      </div>
      {pricing.discounts.map((d) => (
        <div key={d.type}>
          <dt>
            {DISCOUNT_LABELS[d.type]} (-{d.percent}%)
          </dt>
          <dd>-{formatPrice(d.amountCents)}</dd>
        </div>
      ))}
      <div className="total">
        <dt>Total</dt>
        <dd>{formatPrice(pricing.totalCents)}</dd>
      </div>
    </dl>
  )
}
