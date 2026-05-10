'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { deleteSave } from './actions'

export function DeleteButton({
  saveId,
  saveTitle,
}: {
  saveId: string
  saveTitle: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function confirm() {
    startTransition(async () => {
      await deleteSave(saveId)
      // The action redirects on success; if we get here the modal can stay open
      setOpen(false)
    })
  }

  return (
    <>
      {/* Trigger — subtle text-style button to keep delete from competing visually */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-[11px] px-3 py-1.5 rounded-full text-white/30 border border-white/10 hover:text-rose-300/90 hover:border-rose-500/30 transition-colors duration-150 inline-flex items-center gap-1.5"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        </svg>
        Delete
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={() => !pending && setOpen(false)}
              className="fixed inset-0 z-[9998] bg-black/55 backdrop-blur-sm"
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6 pointer-events-none">
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="pointer-events-auto w-full max-w-sm rounded-2xl overflow-hidden"
                style={{
                  background: 'oklch(0.13 0.08 262 / 0.98)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  boxShadow: '0 16px 60px rgba(0,0,0,0.65)',
                }}
              >
                <div className="px-6 pt-6 pb-2 space-y-2">
                  <p className="font-mono text-[10px] tracking-widest text-rose-300/70">
                    Delete save
                  </p>
                  <h2 className="font-serif text-xl text-white/92 leading-snug">
                    Delete &ldquo;{saveTitle}&rdquo;?
                  </h2>
                  <p className="text-[13px] text-white/50 leading-relaxed">
                    It will be archived and removed from your feed and map. The captures stay
                    in case you want it back later.
                  </p>
                </div>
                <div className="px-6 py-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={pending}
                    className="font-mono text-[11px] px-4 py-2 rounded-full text-white/55 hover:text-white/85 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirm}
                    disabled={pending}
                    className="font-mono text-[11px] px-4 py-2 rounded-full transition-all disabled:opacity-60"
                    style={{
                      background: 'linear-gradient(180deg, rgba(244,63,94,0.95) 0%, rgba(190,18,60,0.92) 100%)',
                      border: '1px solid rgba(244,63,94,0.95)',
                      color: 'oklch(0.10 0.09 262)',
                      boxShadow: '0 2px 0 rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.36)',
                    }}
                  >
                    {pending ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
