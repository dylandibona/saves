'use client'

import { useState, useCallback, useRef } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/utils/time'
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

function makeSvgDataUrl(color: string) {
  const svg = `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="38%" cy="32%" r="62%">
          <stop offset="0%" stop-color="${color}" stop-opacity="1"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.7"/>
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="13" fill="url(#g)" stroke="${color}" stroke-width="1.2" stroke-opacity="0.6"/>
      <ellipse cx="13.5" cy="11.5" rx="4" ry="2.5" fill="white" opacity="0.24"/>
    </svg>
  `.trim()
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

// Save card popup — slides up from bottom
function SavePopup({ save, onClose }: { save: MapSave; onClose: () => void }) {
  const color = CATEGORY_COLORS[save.category] ?? '#888'
  const label = CATEGORY_LABELS[save.category] ?? save.category

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-sm z-[9999] pointer-events-auto"
      style={{ filter: 'drop-shadow(0 8px 40px rgba(0,0,0,0.7))' }}
    >
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'oklch(0.13 0.08 262 / 0.97)',
          border: '1px solid rgba(255,255,255,0.11)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {save.hero_image_url && (
          <div className="relative h-36 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={save.hero_image_url} alt={save.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.13_0.08_262)] via-transparent to-transparent" />
          </div>
        )}

        <div className="p-4 pt-3 space-y-1.5">
          <span
            className="inline-block font-mono text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: color + '22', border: `1px solid ${color}55`, color }}
          >
            {label}
          </span>
          <h3 className="font-serif text-xl text-white/90 leading-snug">{save.title}</h3>
          {(save.subtitle || save.location_address) && (
            <p className="font-mono text-[11px] text-white/38 leading-relaxed">
              {save.subtitle ?? save.location_address}
            </p>
          )}
        </div>

        <div className="px-4 pb-4 flex gap-2">
          <a
            href={`/saves/${save.id}`}
            className="flex-1 text-center font-mono text-[11px] py-2 rounded-xl transition-colors"
            style={{ background: color + '28', border: `1px solid ${color}50`, color }}
          >
            View →
          </a>
          {save.canonical_url && (
            <a
              href={`https://maps.google.com/maps?q=${save.lat},${save.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] px-3 py-2 rounded-xl text-white/38 border border-white/10 hover:text-white/70 transition-colors flex items-center gap-1.5"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Maps
            </a>
          )}
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/[0.09] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
        >
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
const LIBRARIES: ('places')[] = ['places']

export function MapClient({ saves }: { saves: MapSave[] }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [selectedSave, setSelectedSave] = useState<MapSave | null>(null)
  const [activeCategory, setActiveCategory] = useState<Cat | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const userMarkerRef = useRef<google.maps.Marker | null>(null)

  const availableCategories = [...new Set(saves.map(s => s.category))] as Cat[]
  const filteredSaves = activeCategory ? saves.filter(s => s.category === activeCategory) : saves

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance)

    if (saves.length > 1) {
      const bounds = new window.google.maps.LatLngBounds()
      saves.forEach(s => bounds.extend({ lat: s.lat, lng: s.lng }))
      mapInstance.fitBounds(bounds, 60)
    } else if (saves.length === 1) {
      mapInstance.setCenter({ lat: saves[0].lat, lng: saves[0].lng })
      mapInstance.setZoom(14)
    }
  }, [saves])

  // When filter changes, refit bounds
  const onCategoryChange = useCallback((cat: Cat | null) => {
    setActiveCategory(cat)
    setSelectedSave(null)
    if (!map) return
    const visible = cat ? saves.filter(s => s.category === cat) : saves
    if (visible.length > 1) {
      const bounds = new window.google.maps.LatLngBounds()
      visible.forEach(s => bounds.extend({ lat: s.lat, lng: s.lng }))
      map.fitBounds(bounds, 60)
    } else if (visible.length === 1) {
      map.panTo({ lat: visible[0].lat, lng: visible[0].lng })
      map.setZoom(14)
    }
  }, [map, saves])

  const flyToUser = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(pos => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setUserLocation(coords)
      map?.panTo(coords)
      map?.setZoom(15)
    })
  }, [map])

  if (loadError) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-2 px-6">
        <p className="font-serif text-lg text-white/70">Map unavailable</p>
        <p className="font-mono text-[11px] text-white/35">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local</p>
      </div>
    </div>
  )

  if (!isLoaded) return (
    <div className="flex items-center justify-center h-full">
      <p className="font-mono text-[11px] text-white/30 animate-pulse">Loading map…</p>
    </div>
  )

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={{ lat: 40.7128, lng: -74.006 }}
        zoom={11}
        onLoad={onMapLoad}
        options={{
          styles: MAP_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_CENTER },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          clickableIcons: false,
        }}
        onClick={() => setSelectedSave(null)}
      >
        {/* Save markers */}
        {filteredSaves.map(save => (
          <Marker
            key={save.id}
            position={{ lat: save.lat, lng: save.lng }}
            icon={{
              url: makeSvgDataUrl(CATEGORY_COLORS[save.category] ?? '#888'),
              scaledSize: new window.google.maps.Size(32, 32),
              anchor: new window.google.maps.Point(16, 16),
            }}
            onClick={() => setSelectedSave(prev => prev?.id === save.id ? null : save)}
            zIndex={selectedSave?.id === save.id ? 10 : 1}
          />
        ))}

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              url: makeSvgDataUrl('#00e5a0'),
              scaledSize: new window.google.maps.Size(26, 26),
              anchor: new window.google.maps.Point(13, 13),
            }}
            zIndex={20}
          />
        )}
      </GoogleMap>

      {/* Category filter strip */}
      {availableCategories.length > 0 && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex gap-1.5 px-3 py-2 rounded-2xl max-w-[90vw] overflow-x-auto"
          style={{
            background: 'oklch(0.10 0.08 262 / 0.88)',
            border: '1px solid rgba(255,255,255,0.11)',
            backdropFilter: 'blur(16px)',
            scrollbarWidth: 'none',
          }}
        >
          <button
            onClick={() => onCategoryChange(null)}
            className={`flex-none font-mono text-[10px] px-2.5 py-1 rounded-full transition-all duration-200 ease-in-out ${
              activeCategory === null ? 'bg-white/18 text-white/90' : 'text-white/38 hover:text-white/68'
            }`}
          >
            All
          </button>
          {availableCategories.map(cat => {
            const color = CATEGORY_COLORS[cat] ?? '#888'
            const active = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(activeCategory === cat ? null : cat)}
                className="flex-none font-mono text-[10px] px-2.5 py-1 rounded-full transition-all duration-200 ease-in-out"
                style={active
                  ? {
                      background: `linear-gradient(180deg, ${color}f0 0%, ${color}cc 100%)`,
                      border: `1px solid ${color}`,
                      color: 'oklch(0.10 0.09 262)',
                      boxShadow: `0 2px 0 rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.30)`,
                    }
                  : { color: 'rgba(255,255,255,0.38)' }
                }
              >
                {CATEGORY_LABELS[cat]}
              </button>
            )
          })}
        </div>
      )}

      {/* Near Me button */}
      <button
        onClick={flyToUser}
        className="absolute bottom-8 right-4 z-[1000] w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out"
        style={{
          background: 'oklch(0.10 0.08 262 / 0.92)',
          border: `1px solid ${userLocation ? '#00e5a0' : 'rgba(255,255,255,0.14)'}`,
          backdropFilter: 'blur(12px)',
          color: userLocation ? '#00e5a0' : 'rgba(255,255,255,0.45)',
          boxShadow: '0 3px 0 rgba(0,0,0,0.50), 0 5px 14px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.14)',
        }}
        title="Near Me"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
        </svg>
      </button>

      {/* Empty state */}
      {saves.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[1000] pointer-events-none">
          <div
            className="px-8 py-6 rounded-2xl text-center space-y-2 pointer-events-auto"
            style={{
              background: 'oklch(0.10 0.08 262 / 0.90)',
              border: '1px solid rgba(255,255,255,0.09)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" className="mx-auto">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <p className="font-serif text-lg text-white/75">No places saved yet</p>
            <p className="font-mono text-[11px] text-white/32">Paste a Google Maps link when adding a save</p>
            <a href="/add" className="inline-block mt-1 font-mono text-[11px] text-white/45 hover:text-white/75 transition-colors underline underline-offset-4 decoration-white/18">
              Add a place
            </a>
          </div>
        </div>
      )}

      {/* Selected save card */}
      {selectedSave && <SavePopup save={selectedSave} onClose={() => setSelectedSave(null)} />}
    </div>
  )
}
