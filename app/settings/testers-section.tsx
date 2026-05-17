type TesterRow = {
  code: string
  redeemer_email: string | null
  redeemer_display_name: string | null
  subscription_status: string | null
  subscription_plan: string | null
  subscription_current_period_end: string | null
  days_until_expiry: number | null
  warning_level: string | null
}

type Props = { rows: TesterRow[] }

const URGENCY_STYLE: Record<string, { ink: string; bg: string; border: string; label: string }> = {
  urgent:   { ink: '#fb7185', bg: 'rgba(244,63,94,0.10)',   border: 'rgba(244,63,94,0.30)',  label: 'Expiring this week' },
  soon:     { ink: '#fbbf24', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)', label: 'Three weeks or less' },
  expired:  { ink: '#fb7185', bg: 'rgba(244,63,94,0.10)',   border: 'rgba(244,63,94,0.30)',  label: 'Expired' },
  inactive: { ink: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', label: 'Inactive' },
  unknown:  { ink: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', label: 'No end date' },
  ok:       { ink: '#00e5a0', bg: 'rgba(0,229,160,0.06)',  border: 'rgba(0,229,160,0.20)', label: 'Active' },
}

export function TestersSection({ rows }: Props) {
  if (rows.length === 0) return null  // nothing to surface until someone redeems

  const needsAttention = rows.filter(r =>
    r.warning_level === 'urgent' || r.warning_level === 'soon' || r.warning_level === 'expired'
  )

  return (
    <section className="space-y-4">
      <header className="space-y-1.5">
        <p className="font-mono text-[10px] tracking-widest text-white/30">Testers</p>
        <p className="text-[13px] text-white/55 leading-relaxed max-w-prose">
          People who signed up using one of your beta codes. Each is on a 90-day
          comp Personal trial. When their trial ends they revert to free (12-save
          cap) unless you issue a fresh discount code.
        </p>
      </header>

      {needsAttention.length > 0 && (
        <div
          className="rounded-xl px-4 py-3"
          style={{
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.22)',
          }}
        >
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#fbbf24' }}>
            Conversion moment approaching
          </p>
          <p className="text-[13px] text-white/80 mt-1 leading-relaxed">
            {needsAttention.length} tester{needsAttention.length === 1 ? '' : 's'} need attention.
            Reach out before their trial ends with a fresh discount code, or let them
            revert to the free tier.
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {rows.map(r => {
          const style = URGENCY_STYLE[r.warning_level ?? 'unknown'] ?? URGENCY_STYLE.unknown
          const name =
            r.redeemer_display_name?.trim() ||
            r.redeemer_email?.split('@')[0] ||
            '(unknown)'
          const endDate = r.subscription_current_period_end
            ? new Date(r.subscription_current_period_end).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : '—'
          return (
            <li
              key={`${r.code}-${r.redeemer_email}`}
              className="rounded-xl px-3.5 py-3 space-y-1.5"
              style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
              }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[14px] text-white/90 truncate">{name}</p>
                  <p className="font-mono text-[10px] text-white/40 truncate">
                    {r.redeemer_email ?? ''}
                  </p>
                </div>
                <span
                  className="font-mono text-[10px] uppercase tracking-widest shrink-0"
                  style={{ color: style.ink }}
                >
                  {r.warning_level === 'inactive' || r.warning_level === 'unknown'
                    ? style.label
                    : r.days_until_expiry !== null
                      ? `${r.days_until_expiry} ${r.days_until_expiry === 1 ? 'day' : 'days'} left`
                      : style.label}
                </span>
              </div>
              <p className="font-mono text-[10px] text-white/35">
                Code <span className="text-white/65 tracking-[0.18em]">{r.code}</span>
                {' · '}Trial ends {endDate}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
