import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const createDriverIcon = (color = '#00d4aa', label = '') => L.divIcon({
    className: '',
    html: `<div style="
    background:${color};
    border:3px solid white;
    border-radius:50%;
    width:36px;height:36px;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 12px ${color}88;
    font-size:16px;
  ">🛵</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
})

const createPickupIcon = () => L.divIcon({
    className: '',
    html: `<div style="background:#4ade80;border:3px solid white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px #4ade8088;font-size:14px;">📦</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
})

const createDropoffIcon = () => L.divIcon({
    className: '',
    html: `<div style="background:#f97316;border:3px solid white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px #f9731688;font-size:14px;">🏁</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
})

// Component to move markers imperatively (bypassing React state for 60fps)
function ImperativeMarkers({ markersRef, onMapClick }) {
    const map = useMap()

    useEffect(() => {
        if (!onMapClick) return
        const handler = (e) => onMapClick(e.latlng)
        map.on('click', handler)
        return () => map.off('click', handler)
    }, [map, onMapClick])

    return null
}

export default function MapView({
    center = [19.07, 72.88],
    zoom = 12,
    markers = [],          // static initial markers [{id, lat, lng, type}]
    onMapClick = null,
    socketRef = null,      // optional: if provided, listens for location_update
    mode = 'customer',     // 'customer' | 'dispatcher'
}) {
    const markerRefs = useRef({})   // driver_id → L.Marker instance
    const mapRef = useRef(null)

    // Set up imperative live marker updates via socket
    useEffect(() => {
        if (!socketRef?.current) return

        const handleLocationUpdate = (data) => {
            const { driver_id, lat, lng } = data
            if (markerRefs.current[driver_id]) {
                markerRefs.current[driver_id].setLatLng([lat, lng])
            }
        }

        socketRef.current.on('location_update', handleLocationUpdate)
        return () => socketRef.current?.off('location_update', handleLocationUpdate)
    }, [socketRef])

    // Initialize driver markers when map is ready
    const onMapReady = useCallback((map) => {
        mapRef.current = map
        // Create markers for ghost drivers (dispatcher mode)
        markers.forEach(m => {
            if (m.type === 'driver') {
                const marker = L.marker([m.lat, m.lng], { icon: createDriverIcon() })
                    .addTo(map)
                    .bindPopup(`<b>🛵 ${m.name || 'Driver'}</b><br/>Driver ID: ${m.id}`)
                markerRefs.current[m.id] = marker
            }
        })
    }, [markers])

    return (
        <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: '100%', width: '100%', borderRadius: '12px' }}
            ref={mapRef}
            whenReady={(mapInstance) => onMapReady(mapInstance.target)}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Static labeled markers (pickup, dropoff, initial driver) */}
            {markers.filter(m => m.type !== 'driver').map(m => (
                <Marker
                    key={m.id}
                    position={[m.lat, m.lng]}
                    icon={m.type === 'pickup' ? createPickupIcon() : m.type === 'dropoff' ? createDropoffIcon() : createDriverIcon()}
                >
                    <Popup>{m.label || m.type}</Popup>
                </Marker>
            ))}

            <ImperativeMarkers onMapClick={onMapClick} />
        </MapContainer>
    )
}
