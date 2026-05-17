'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/utils/time'
import { Sigil } from '@/components/wordmark'
import type { MapSave } from '@/lib/data/map-saves'
import type { Database } from '@/lib/types/supabase'

type Cat = Database['public']['Enums']['save_category']

// Deep sapphire dark map style — matches the app palette
const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0a0f1c' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: 'rgba(255,255,255,0.42)' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0f1c' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#162038' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: 'rgba(255,255,255,0.52)' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: 'rgba(255,255,255,0.28)' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0c1c16' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: 'rgba(255,255,255,0.22)' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#172236' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0e1828' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: 'rgba(255,255,255,0.38)' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1e304a' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#152438' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: 'rgba(255,255,255,0.52)' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#0f1b2e' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: 'rgba(255,255,255,0.32)' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#081422' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: 'rgba(255,255,255,0.26)' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#081422' }] },
]

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
const LIBRARIES: ('places')[] = ['places']

// Default center — NYC if no geolocation permission
const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 }

/**
 * Build a teardrop pin SVG, category-toned, with a darker dot bullseye.
 * Mirrors the prototype's pin geometry (26×32).
 */
function makePinSvg(color: string, selected: boolean): string {
  const scale = selected ? 1.15 : 1
  const w = Math.round(26 * scale)
  const h = Math.round(32 * scale)
  const svg = `
    <svg width="${w}" height="${h}" viewBox="0 0 26 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 30 C 4 22, 1 16, 1 11 A 12 12 0 1 1 25 11 C 25 16, 22 22, 13 30 Z"
            fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="0.6"/>
      <circle cx="13" cy="11" r="4" fill="rgba(0,0,0,0.55)"/>
    </svg>
  `.trim()
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

/** Haversine distance in miles between two lat/lng pairs. */
function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 3958.8 // Earth radius in miles
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  return R * c
}

/** Stratum category-word with chromatic underline (Library-style). */
function MapCatWord({
  active,
  tone,
  label,
  onClick,
}: {
  active: boolean
  tone: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: '0 0 auto',
        background: 'transparent',
        border: 0,
        padding: '2px 0',
        margin: 0,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans), Instrument Sans, system-ui, sans-serif',
        fontSize: 13.5,
        fontWeight: active ? 500 : 400,
        color: active ? 'var(--color-paper)' : 'rgba(244,243,239,0.5)',
        letterSpacing: '-0.005em',
        borderBottom: active ? `1.5px solid ${tone}` : '1.5px solid transparent',
        transition: 'color 0.24s var(--ease-strat), border-color 0.24s var(--ease-strat)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

export function MapClient({ saves }: { saves: MapSave[] }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  })

  const router = useRouter()
  const mapRef = useRef<google.maps.Map | null>(null)

  // Card is hidden by default — only appears after a pin tap.
  const [selectedSave, setSelectedSave] = useState<MapSave | null>(null)
  const [activeCategory, setActiveCategory] = useState<Cat | 'all'>('all')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  const availableCategories = useMemo(
    () => Array.from(new Set(saves.map(s => s.category))) as Cat[],
    [saves]
  )

  const filteredSaves = useMemo(
    () => (activeCategory === 'all' ? saves : saves.filter(s => s.category === activeCategory)),
    [saves, activeCategory]
  )

  const onMapLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      mapRef.current = mapInstance

      // Try geolocation first — center on the user if we get it.
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
            setUserLocation(coords)
            // Only re-center on the user if we don't have a tighter pin-fit below.
            if (saves.length === 0) {
              mapInstance.setCenter(coords)
              mapInstance.setZoom(12)
            }
          },
          () => {
            /* permission denied — keep default center */
          },
          { maximumAge: 60_000, timeout: 4000 }
        )
      }

      // Fit to pins if we have them.
      if (saves.length > 1) {
        const bounds = new window.google.maps.LatLngBounds()
        saves.forEach(s => bounds.extend({ lat: s.lat, lng: s.lng }))
        mapInstance.fitBounds(bounds, 80)
      } else if (saves.length === 1) {
        mapInstance.setCenter({ lat: saves[0].lat, lng: saves[0].lng })
        mapInstance.setZoom(14)
      }
    },
    [saves]
  )

  const onCategoryChange = useCallback(
    (cat: Cat | 'all') => {
      setActiveCategory(cat)
      setSelectedSave(null)
      const map = mapRef.current
      if (!map) return
      const visible = cat === 'all' ? saves : saves.filter(s => s.category === cat)
      if (visible.length > 1) {
        const bounds = new window.google.maps.LatLngBounds()
        visible.forEach(s => bounds.extend({ lat: s.lat, lng: s.lng }))
        map.fitBounds(bounds, 80)
      } else if (visible.length === 1) {
        map.panTo({ lat: visible[0].lat, lng: visible[0].lng })
        map.setZoom(14)
      }
    },
    [saves]
  )

  const zoomIn = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const z = map.getZoom() ?? 11
    map.setZoom(z + 1)
  }, [])

  const zoomOut = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const z = map.getZoom() ?? 11
    map.setZoom(Math.max(2, z - 1))
  }, [])

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2 px-6">
          <p
            style={{
              fontFamily: 'var(--font-serif-display), Instrument Serif, ui-serif, serif',
              fontStyle: 'italic',
              fontSize: 18,
              color: 'var(--color-paper)',
            }}
          >
            Map unavailable
          </p>
          <p className="font-mono text-[11px]" style={{ color: 'var(--color-mute)' }}>
            Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local
          </p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <p
          className="font-mono text-[11px] animate-pulse"
          style={{ color: 'var(--color-mute)' }}
        >
          Loading map…
        </p>
      </div>
    )
  }

  const selCategoryColor = selectedSave
    ? CATEGORY_COLORS[selectedSave.category] ?? 'var(--color-bone)'
    : 'var(--color-bone)'
  const selCategoryLabel = selectedSave
    ? CATEGORY_LABELS[selectedSave.category] ?? selectedSave.category
    : ''
  const selDistance =
    selectedSave && userLocation
      ? distanceMiles(userLocation, { lat: selectedSave.lat, lng: selectedSave.lng })
      : null

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={DEFAULT_CENTER}
        zoom={11}
        onLoad={onMapLoad}
        options={{
          styles: MAP_STYLE,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          clickableIcons: false,
        }}
        // Tapping the map background dismisses the card.
        onClick={() => setSelectedSave(null)}
      >
        {filteredSaves.map(save => {
          const isSel = selectedSave?.id === save.id
          const color = CATEGORY_COLORS[save.category] ?? '#888'
          const w = isSel ? 30 : 26
          const h = isSel ? 37 : 32
          return (
            <Marker
              key={save.id}
              position={{ lat: save.lat, lng: save.lng }}
              icon={{
                url: makePinSvg(color, isSel),
                scaledSize: new window.google.maps.Size(w, h),
                anchor: new window.google.maps.Point(w / 2, h),
              }}
              onClick={() => setSelectedSave(prev => (prev?.id === save.id ? null : save))}
              zIndex={isSel ? 100 : 10}
            />
          )
        })}

        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              url:
                'data:image/svg+xml;charset=UTF-8,' +
                encodeURIComponent(`
                <svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="9" fill="rgba(0,229,160,0.18)" stroke="rgba(0,229,160,0.7)" stroke-width="0.8"/>
                  <circle cx="11" cy="11" r="3.5" fill="#00e5a0" stroke="rgba(8,8,11,0.6)" stroke-width="1"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(22, 22),
              anchor: new window.google.maps.Point(11, 11),
            }}
            zIndex={5}
          />
        )}
      </GoogleMap>

      {/* Header — glass overlay at top */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 14,
          right: 14,
          zIndex: 10,
          background: 'rgba(8,8,11,0.55)',
          backdropFilter: 'blur(24px) saturate(170%)',
          WebkitBackdropFilter: 'blur(24px) saturate(170%)',
          border: '0.5px solid rgba(244,243,239,0.14)',
          borderRadius: 4,
          padding: '10px 14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Sigil size={20} />
          </div>
          <span
            style={{
              fontFamily: 'var(--font-serif-display), Instrument Serif, ui-serif, serif',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 18,
              color: 'var(--color-paper)',
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}
          >
            map
          </span>
        </div>

        {/* Category word-strip — drag-scroll, chromatic underlines */}
        <div
          className="map-cat-strip"
          style={{
            marginTop: 8,
            display: 'flex',
            gap: 14,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <MapCatWord
            active={activeCategory === 'all'}
            tone="var(--color-paper)"
            label="all"
            onClick={() => onCategoryChange('all')}
          />
          {availableCategories.map(cat => {
            const tone = CATEGORY_COLORS[cat] ?? '#888'
            const label = (CATEGORY_LABELS[cat] ?? cat).toLowerCase()
            return (
              <MapCatWord
                key={cat}
                active={activeCategory === cat}
                tone={tone}
                label={label}
                onClick={() => onCategoryChange(activeCategory === cat ? 'all' : cat)}
              />
            )
          })}
        </div>
      </div>

      {/* Zoom controls — small flat squares, right edge */}
      <div
        style={{
          position: 'absolute',
          right: 14,
          top: 'calc(50% - 32px)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <button
          type="button"
          onClick={zoomIn}
          aria-label="Zoom in"
          style={{
            width: 32,
            height: 32,
            borderRadius: 4,
            background: 'rgba(8,8,11,0.65)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '0.5px solid rgba(244,243,239,0.14)',
            color: 'var(--color-paper)',
            fontFamily: 'var(--font-mono), Martian Mono, ui-monospace, monospace',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
          }}
        >
          +
        </button>
        <button
          type="button"
          onClick={zoomOut}
          aria-label="Zoom out"
          style={{
            width: 32,
            height: 32,
            borderRadius: 4,
            background: 'rgba(8,8,11,0.65)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '0.5px solid rgba(244,243,239,0.14)',
            color: 'var(--color-paper)',
            fontFamily: 'var(--font-mono), Martian Mono, ui-monospace, monospace',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
          }}
        >
          −
        </button>
      </div>

      {/* Near-me button — small flat square below the zoom controls */}
      <button
        type="button"
        onClick={() => {
          if (!navigator.geolocation) return
          navigator.geolocation.getCurrentPosition(pos => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
            setUserLocation(coords)
            mapRef.current?.panTo(coords)
            mapRef.current?.setZoom(15)
          })
        }}
        aria-label="Near me"
        style={{
          position: 'absolute',
          right: 14,
          top: 'calc(50% + 40px)',
          zIndex: 10,
          width: 32,
          height: 32,
          borderRadius: 4,
          background: 'rgba(8,8,11,0.65)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `0.5px solid ${userLocation ? 'rgba(0,229,160,0.55)' : 'rgba(244,243,239,0.14)'}`,
          color: userLocation ? '#00e5a0' : 'rgba(244,243,239,0.78)',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      </button>

      {/* Empty state — no saves with coords at all */}
      {saves.length === 0 && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ zIndex: 8 }}
        >
          <div
            className="px-8 py-6 text-center space-y-2 pointer-events-auto"
            style={{
              background: 'rgba(8,8,11,0.85)',
              border: '0.5px solid rgba(244,243,239,0.14)',
              borderRadius: 4,
              backdropFilter: 'blur(28px) saturate(170%)',
              WebkitBackdropFilter: 'blur(28px) saturate(170%)',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-serif-display), Instrument Serif, ui-serif, serif',
                fontStyle: 'italic',
                fontSize: 20,
                color: 'var(--color-paper)',
              }}
            >
              no places yet
            </p>
            <p
              className="font-mono text-[10.5px]"
              style={{
                color: 'var(--color-mute)',
                letterSpacing: '0.06em',
              }}
            >
              paste a google maps link when adding a find
            </p>
          </div>
        </div>
      )}

      {/* Selected save card — only when a pin is tapped */}
      {selectedSave && (
        <div
          style={{
            position: 'absolute',
            left: 14,
            right: 14,
            bottom: 76,
            zIndex: 12,
            background: 'rgba(8,8,11,0.85)',
            backdropFilter: 'blur(28px) saturate(170%)',
            WebkitBackdropFilter: 'blur(28px) saturate(170%)',
            border: '0.5px solid rgba(244,243,239,0.14)',
            borderRadius: 4,
            padding: '12px 14px',
            display: 'flex',
            gap: 12,
            animation: 'mapCardIn 0.36s var(--ease-strat) both',
          }}
        >
          {/* Category-toned leading edge */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 12,
              bottom: 12,
              width: 2,
              borderRadius: 999,
              background: selCategoryColor,
              boxShadow: `0 0 8px ${selCategoryColor}`,
            }}
          />

          {/* Thumbnail */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 4,
              flex: '0 0 auto',
              background: selectedSave.hero_image_url
                ? `center / cover no-repeat url(${JSON.stringify(selectedSave.hero_image_url)})`
                : 'rgba(244,243,239,0.06)',
              boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.08)',
            }}
          />

          {/* Text column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'var(--font-mono), Martian Mono, ui-monospace, monospace',
                fontSize: 8.5,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ color: selCategoryColor }}>{selCategoryLabel}</span>
              {selDistance != null && (
                <>
                  <span style={{ color: 'rgba(244,243,239,0.25)' }}>·</span>
                  <span style={{ color: 'var(--color-mute)' }}>
                    {selDistance < 10
                      ? `${selDistance.toFixed(1)} mi`
                      : `${Math.round(selDistance)} mi`}
                  </span>
                </>
              )}
            </div>
            <div
              style={{
                marginTop: 3,
                fontFamily: 'var(--font-sans), Instrument Sans, system-ui, sans-serif',
                fontSize: 13.5,
                fontWeight: 500,
                lineHeight: 1.2,
                letterSpacing: '-0.012em',
                color: 'var(--color-paper)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {selectedSave.title}
            </div>
            {(selectedSave.location_address || selectedSave.subtitle) && (
              <div
                style={{
                  marginTop: 2,
                  fontFamily: 'var(--font-sans), Instrument Sans, system-ui, sans-serif',
                  fontSize: 11,
                  color: 'var(--color-mute)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedSave.location_address ?? selectedSave.subtitle}
              </div>
            )}
          </div>

          {/* Chevron expand chip — go to detail */}
          <button
            type="button"
            aria-label={`Open ${selectedSave.title}`}
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/saves/${selectedSave.id}`)
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 4,
              alignSelf: 'center',
              background: 'rgba(244,243,239,0.06)',
              border: '0.5px solid rgba(244,243,239,0.14)',
              cursor: 'pointer',
              padding: 0,
              marginLeft: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-paper)',
              flex: '0 0 auto',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M5 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      <style>{`
        @keyframes mapCardIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .map-cat-strip::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
