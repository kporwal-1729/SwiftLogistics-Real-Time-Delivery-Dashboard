import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import socket from '../services/socket'
import MapView from '../components/MapView'
import StatusBar from '../components/StatusBar'

export default function CustomerView() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const socketRef = useRef(socket)

    const [activeOrder, setActiveOrder] = useState(null)
    const [orderStatus, setOrderStatus] = useState('pending')
    const [creating, setCreating] = useState(false)
    const [clickStep, setClickStep] = useState(null)   // null | 'pickup' | 'dropoff'
    const [pickup, setPickup] = useState(null)
    const [dropoff, setDropoff] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [eta, setEta] = useState(null)
    const [driverMarkers, setDriverMarkers] = useState([])

    // Connect socket on mount
    useEffect(() => {
        socket.connect()
        return () => socket.disconnect()
    }, [])

    // Fetch active orders on load
    useEffect(() => {
        api.get('/api/orders/active').then(res => {
            if (res.data.length > 0) {
                const order = res.data[0]
                setActiveOrder(order)
                setOrderStatus(order.status)
                setDriverMarkers([{
                    id: order.driver_id || 'unknown',
                    lat: order.pickup_lat,
                    lng: order.pickup_lng,
                    type: 'driver',
                    name: 'Your Driver',
                }])
                // Join the order's socket room
                socket.emit('join_order_room', { order_id: order.id })
            }
        }).catch(console.error)
    }, [])

    // Socket listeners
    useEffect(() => {
        socket.on('status_change', ({ order_id, new_status }) => {
            if (activeOrder && order_id === activeOrder.id) {
                setOrderStatus(new_status)
            }
        })

        socket.on('location_update', ({ order_id, t }) => {
            if (activeOrder && order_id === activeOrder.id && t) {
                const minutesLeft = Math.max(0, Math.round((1 - t) * 8))
                setEta(minutesLeft === 0 ? 'Arriving!' : `~${minutesLeft} min`)
            }
        })

        return () => {
            socket.off('status_change')
            socket.off('location_update')
        }
    }, [activeOrder])

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const handleMapClick = (latlng) => {
        if (clickStep === 'pickup') {
            setPickup(latlng)
            setClickStep('dropoff')
        } else if (clickStep === 'dropoff') {
            setDropoff(latlng)
            setClickStep(null)
        }
    }

    const handleCreateOrder = async () => {
        if (!pickup || !dropoff) return
        setSubmitting(true)
        try {
            const res = await api.post('/api/orders', {
                pickup_lat: pickup.lat,
                pickup_lng: pickup.lng,
                dropoff_lat: dropoff.lat,
                dropoff_lng: dropoff.lng,
            })
            const order = res.data
            setActiveOrder(order)
            setOrderStatus(order.status)
            setCreating(false)
            setPickup(null)
            setDropoff(null)
            socket.emit('join_order_room', { order_id: order.id })
        } catch (err) {
            console.error('Create order error:', err)
        } finally {
            setSubmitting(false)
        }
    }

    const staticMarkers = []
    if (pickup) staticMarkers.push({ id: 'pickup', lat: pickup.lat, lng: pickup.lng, type: 'pickup', label: '📦 Pickup Point' })
    if (dropoff) staticMarkers.push({ id: 'dropoff', lat: dropoff.lat, lng: dropoff.lng, type: 'dropoff', label: '🏁 Drop-off Point' })

    return (
        <div className="page-layout">
            {/* Header */}
            <header className="page-header">
                <div className="header-brand">
                    <span className="logo-icon-sm">⚡</span>
                    <span>SwiftLogistics</span>
                </div>
                <div className="header-right">
                    <span className="user-chip">🛍️ {user?.name}</span>
                    {!activeOrder && !creating && (
                        <button className="btn-primary" onClick={() => setCreating(true)} id="create-order-btn">
                            + Create Order
                        </button>
                    )}
                    <button className="btn-ghost" onClick={handleLogout}>Logout</button>
                </div>
            </header>

            {/* Order creation panel */}
            {creating && (
                <div className="create-order-panel">
                    <h3>New Delivery Order</h3>
                    <div className="step-instructions">
                        {!pickup && <p className="instruction active">👆 Click on the map to set your <strong>Pickup</strong> location</p>}
                        {pickup && !dropoff && <p className="instruction active">👆 Now click to set the <strong>Drop-off</strong> location</p>}
                        {pickup && dropoff && <p className="instruction ready">✅ Locations set! Ready to place order.</p>}
                    </div>
                    <div className="create-actions">
                        <button className="btn-ghost" onClick={() => { setCreating(false); setPickup(null); setDropoff(null); setClickStep(null) }}>
                            Cancel
                        </button>
                        {!clickStep && !pickup && (
                            <button className="btn-primary" onClick={() => setClickStep('pickup')}>Select Pickup →</button>
                        )}
                        {pickup && dropoff && (
                            <button className="btn-primary" onClick={handleCreateOrder} disabled={submitting} id="confirm-order-btn">
                                {submitting ? <span className="spinner-sm" /> : 'Confirm Order 🚀'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Status bar */}
            {activeOrder && (
                <div className="status-bar-container">
                    <StatusBar status={orderStatus} eta={eta} />
                </div>
            )}

            {/* Map */}
            <div className="map-container">
                <MapView
                    center={[19.07, 72.88]}
                    zoom={12}
                    markers={[...staticMarkers, ...driverMarkers]}
                    onMapClick={clickStep ? handleMapClick : null}
                    socketRef={socketRef}
                    mode="customer"
                />
                {clickStep && (
                    <div className="map-overlay-hint">
                        {clickStep === 'pickup' ? '📦 Click to set Pickup' : '🏁 Click to set Drop-off'}
                    </div>
                )}
            </div>

            {/* No order placeholder */}
            {!activeOrder && !creating && (
                <div className="no-order-card">
                    <div className="no-order-icon">📦</div>
                    <h2>No Active Orders</h2>
                    <p>Place a new order and track your delivery in real-time.</p>
                    <button className="btn-primary" onClick={() => setCreating(true)}>Create My First Order</button>
                </div>
            )}
        </div>
    )
}
