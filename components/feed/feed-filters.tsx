'use client'

import { motion } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import { useTransition, useState } from 'react'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/utils/time'
import type { Database } from '@/lib/types/supabase'

type SaveCategory = Database['public']['Enums']['save_category']

export function FeedFilters({
  categories,
  activeCategory,
  query,
}: {
  categories: SaveCategory[]
  activeCategory?: string
  query?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState(query ?? '')

  function setParam(key: string, value: string | undefined) {
    const params = new URLSearchParams(window.location.search)
    if (value) params.set(key, value)
    else params.delete(key)
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setSearch(val)
    setParam('q', val || undefined)
  }

  function toggleCategory(cat: SaveCategory) {
    setParam('category', activeCategory === cat ? undefined : cat)
  }

  return (
    <div className="space-y-3 pb-2">
      {/* Search */}
      <div className="relative">
        <input
          type="search"
          placeholder="Search saves…"
          value={search}
          onChange={handleSearch}
          className="w-full h-10 px-4 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/25 focus:bg-white/[0.08] transition-all duration-200"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-1.5 flex-wrap">
        {categories.map(cat => {
          const isActive = activeCategory === cat
          const accentColor = CATEGORY_COLORS[cat]
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className="relative text-[11px] px-3 py-1.5 rounded-full border transition-colors duration-150"
              style={{
                borderColor: isActive ? `${accentColor}55` : 'rgba(255,255,255,0.1)',
                color: isActive ? accentColor : 'rgba(255,255,255,0.4)',
              }}
            >
              {isActive && (
                <motion.span
                  layoutId="active-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: `${accentColor}18` }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10">{CATEGORY_LABELS[cat]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
