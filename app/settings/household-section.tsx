'use client'

import { useState, useTransition } from 'react'
import { renameHousehold } from './actions'

type Props = {
  initialName: string
  isOwner: boolean
  memberCount: number
}

export function HouseholdSection({ initialName, isOwner, memberCount }: Props) {
  const [name, setName] = useState(initialName)
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function save() {
    setError(null)
    startTransition(async () => {
      try {
        const updated = await renameHousehold(name)
        setName(updated)
        setEditing(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save')
      }
    })
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1.5">
        <p className="font-mono text-[10px] tracking-widest text-white/30">Household</p>
        <p className="text-[13px] text-white/55 leading-relaxed max-w-prose">
          The shared library you and {memberCount > 1 ? 'your family' : 'invited family'}{' '}
          {memberCount > 1 ? 'see together' : 'will see together'}. Name it whatever feels
          right — &ldquo;Family,&rdquo; &ldquo;Us,&rdquo; your last name, whatever.
        </p>
      </header>

      {error && (
        <div
          className="rounded-xl px-4 py-3"
          style={{
            background: 'rgba(255,100,100,0.06)',
            border: '1px solid rgba(255,100,100,0.18)',
          }}
        >
          <p className="font-mono text-[11px] text-white/70">{error}</p>
        </div>
      )}

      <div
        className="rounded-xl px-4 py-3.5"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {editing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={60}
              autoFocus
              className="w-full h-11 rounded-lg px-3 text-[16px] text-white/95 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setName(initialName); setEditing(false); setError(null) }}
                disabled={pending}
                className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending || !name.trim() || name.trim() === initialName}
                className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full disabled:opacity-50"
                style={{
                  background: 'rgba(0,229,160,0.08)',
                  border: '1px solid rgba(0,229,160,0.22)',
                  color: '#00e5a0',
                }}
              >
                {pending ? 'Saving' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-[22px] text-white/95">
              {name}
            </p>
            {isOwner && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'rgba(255,255,255,0.65)',
                }}
              >
                Rename
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
