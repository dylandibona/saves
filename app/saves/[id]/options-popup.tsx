'use client'

import { useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { deleteSave, reEnrichSave } from './actions'

type Props = {
  saveId: string
  saveTitle: string
  canonicalUrl: string | null
  categoryTone: string
}

type IconKey = 'share' | 'list' | 'copy' | 'edit' | 'refresh' | 'trash'

function OptionIcon({ kind }: { kind: IconKey }) {
  switch (kind) {
    case 'share':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="4" cy="7" r="1.7" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="10.5" cy="3.5" r="1.7" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="10.5" cy="10.5" r="1.7" stroke="currentColor" strokeWidth="1.1" />
          <path d="M5.5 6.2l3.6-1.9M5.5 7.8l3.6 1.9" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      )
    case 'list':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 4h8M3 7h8M3 10h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          <path d="M11 10.5l1.2 1.2 2-2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'copy':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="4" y="4" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.1" />
          <path d="M3 9.5V3a1 1 0 011-1h6.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      )
    case 'edit':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M9.5 2.5l2 2-7 7H2.5v-2l7-7zM8 4l2 2"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'refresh':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M2 7a5 5 0 019.2-2.7M12 7a5 5 0 01-9.2 2.7M11.5 1.5v3h-3M2.5 12.5v-3h3"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'trash':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3.5 4.5h7l-.6 7.2a1 1 0 01-1 .8H5.1a1 1 0 01-1-.8L3.5 4.5zM2 4.5h10M5.5 4.5V3a1 1 0 011-1h1a1 1 0 011 1v1.5"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
  }
}

function OptionRow({
  icon,
  label,
  onClick,
  danger,
  disabled,
  status,
}: {
  icon: IconKey
  label: string
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
  status?: string | null
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-[4px] transition-colors duration-150 disabled:opacity-50"
      style={{
        color: danger ? 'var(--color-danger)' : 'var(--color-paper)',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
        fontSize: 12.5,
        fontWeight: 400,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = 'rgba(244,243,239,0.06)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <span className="w-4 inline-flex items-center justify-center">
        <OptionIcon kind={icon} />
      </span>
      <span className="flex-1">{label}</span>
      {status && (
        <span
          className="font-mono"
          style={{ fontSize: 9, color: 'var(--color-mute)', letterSpacing: '0.14em' }}
        >
          {status}
        </span>
      )}
    </button>
  )
}

export function OptionsPopup({ saveId, saveTitle, canonicalUrl, categoryTone }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmingRefresh, setConfirmingRefresh] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [refreshing, startRefresh] = useTransition()

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1400)
    return () => clearTimeout(t)
  }, [copied])

  function close() {
    if (!pending && !refreshing) {
      setOpen(false)
      setConfirmingRefresh(false)
      setRefreshError(null)
    }
  }

  function handleRefresh() {
    setRefreshError(null)
    startRefresh(async () => {
      try {
        await reEnrichSave(saveId)
        setConfirmingRefresh(false)
        setOpen(false)
      } catch (e) {
        setRefreshError(e instanceof Error ? e.message : 'Refresh failed')
      }
    })
  }

  function copyAsText() {
    const text = canonicalUrl ? `${saveTitle}\n${canonicalUrl}` : saveTitle
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => setCopied(true),
        () => setCopied(false),
      )
    }
  }

  function shareWithSomeone() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      navigator
        .share({
          title: saveTitle,
          url: canonicalUrl ?? undefined,
        })
        .catch(() => {
          /* user cancelled or unsupported */
        })
    }
    setOpen(false)
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteSave(saveId)
    })
  }

  return (
    <div
      className="absolute left-0 right-0 bottom-0"
      style={{
        padding: '24px 14px 16px',
        background: 'linear-gradient(180deg, transparent 0%, var(--color-bg) 40%)',
      }}
    >
      <AnimatePresence>
        {open && (
          <>
            {/* click-outside catcher */}
            <motion.div
              key="opt-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={close}
              className="fixed inset-0 z-[40]"
              style={{ background: 'transparent' }}
            />
            <motion.div
              key="opt-popup"
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute z-[50]"
              style={{
                right: 14,
                bottom: 72,
                minWidth: 220,
                background: 'rgba(15,15,20,0.92)',
                backdropFilter: 'blur(28px) saturate(170%)',
                WebkitBackdropFilter: 'blur(28px) saturate(170%)',
                border: '0.5px solid rgba(244,243,239,0.16)',
                borderRadius: 4,
                padding: 4,
                boxShadow:
                  '0 16px 36px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.06) inset',
              }}
            >
              <OptionRow
                icon="share"
                label="Share with someone"
                onClick={shareWithSomeone}
              />
              <OptionRow
                icon="list"
                label="Add to grocery list"
                disabled
              />
              <OptionRow
                icon="copy"
                label="Copy as text"
                onClick={copyAsText}
                status={copied ? 'COPIED' : null}
              />
              <OptionRow icon="edit" label="Edit" disabled />
              <OptionRow
                icon="refresh"
                label={refreshing ? 'Refreshing…' : 'Refresh from source'}
                onClick={() => {
                  if (!canonicalUrl) return
                  setConfirmingRefresh(true)
                }}
                disabled={!canonicalUrl || refreshing}
              />
              <div
                style={{
                  height: 1,
                  background: 'rgba(244,243,239,0.1)',
                  margin: '4px 8px',
                }}
              />
              <OptionRow
                icon="trash"
                label={pending ? 'Deleting…' : 'Delete this find'}
                onClick={handleDelete}
                danger
                disabled={pending}
              />
            </motion.div>

            {/* Refresh confirmation modal — sits above the popup; tapping
                outside or Cancel closes it without running enrichment. */}
            {confirmingRefresh && (
              <motion.div
                key="refresh-confirm"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                className="fixed inset-0 z-[60] flex items-center justify-center px-6"
                style={{ background: 'rgba(8,8,11,0.66)' }}
                onClick={() => {
                  if (!refreshing) setConfirmingRefresh(false)
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: 'rgba(15,15,20,0.96)',
                    border: '0.5px solid rgba(244,243,239,0.16)',
                    borderRadius: 4,
                    padding: 20,
                    maxWidth: 320,
                    width: '100%',
                    boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
                  }}
                >
                  <p
                    className="font-mono"
                    style={{
                      fontSize: 9,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: 'var(--color-mute)',
                    }}
                  >
                    Refresh from source
                  </p>
                  <h3
                    className="font-display"
                    style={{
                      marginTop: 6,
                      fontSize: 17,
                      lineHeight: 1.25,
                      letterSpacing: '-0.01em',
                      color: 'var(--color-paper)',
                    }}
                  >
                    Replace this find with fresh data?
                  </h3>
                  <p
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: 'var(--color-mute)',
                      letterSpacing: '-0.005em',
                    }}
                  >
                    The title, image, category, and extracted fields will be
                    re-pulled from the source URL. Any edits you made here will
                    be overwritten.
                  </p>
                  {refreshError && (
                    <p
                      className="font-mono"
                      style={{
                        marginTop: 10,
                        fontSize: 11,
                        color: 'var(--color-danger)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {refreshError}
                    </p>
                  )}
                  <div
                    className="flex gap-2 justify-end"
                    style={{ marginTop: 18 }}
                  >
                    <button
                      type="button"
                      onClick={() => setConfirmingRefresh(false)}
                      disabled={refreshing}
                      className="font-mono"
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        padding: '8px 14px',
                        borderRadius: 4,
                        background: 'rgba(244,243,239,0.04)',
                        border: '0.5px solid rgba(244,243,239,0.12)',
                        color: 'var(--color-mute)',
                        cursor: refreshing ? 'default' : 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="font-mono"
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        padding: '8px 14px',
                        borderRadius: 4,
                        background:
                          'linear-gradient(180deg, var(--color-bone) 0%, oklch(0.92 0.01 80) 100%)',
                        border: 0,
                        color: 'var(--color-bg)',
                        cursor: refreshing ? 'default' : 'pointer',
                        opacity: refreshing ? 0.7 : 1,
                      }}
                    >
                      {refreshing ? 'Refreshing…' : 'Replace'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Category-tinted top rule */}
      <div
        style={{
          height: 2,
          background: categoryTone,
          boxShadow: `0 0 12px ${categoryTone}`,
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
        }}
      />
      {/* Glass capsule */}
      <div
        className="relative"
        style={{
          display: 'flex',
          gap: 4,
          background: 'rgba(244,243,239,0.06)',
          border: '0.5px solid rgba(244,243,239,0.12)',
          borderTop: 0,
          borderBottomLeftRadius: 4,
          borderBottomRightRadius: 4,
          padding: 4,
          zIndex: 60,
        }}
      >
        {canonicalUrl ? (
          <a
            href={canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-[7px]"
            style={{
              padding: '11px 0',
              borderRadius: 4,
              color: 'var(--color-paper)',
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path
                d="M5 7l-2 2a2.1 2.1 0 11-3-3l2-2M7 5l2-2a2.1 2.1 0 113 3l-2 2M4 8l4-4"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Open original
          </a>
        ) : (
          <span
            className="flex-1 inline-flex items-center justify-center"
            style={{
              padding: '11px 0',
              color: 'var(--color-mute)',
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            No source
          </span>
        )}

        <div style={{ width: 1, background: 'rgba(244,243,239,0.12)' }} />

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center justify-center gap-1.5"
          style={{
            width: 70,
            padding: '11px 0',
            borderRadius: 4,
            background: open ? 'rgba(244,243,239,0.08)' : 'transparent',
            color: 'var(--color-paper)',
            fontSize: 12.5,
            fontWeight: 500,
            transition: 'background 0.18s ease',
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 14 14"
            fill="none"
            style={{
              transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
              transition: 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            <path d="M2.5 7h9M7 2.5v9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          Options
        </button>
      </div>
    </div>
  )
}
