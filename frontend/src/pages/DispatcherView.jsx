import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import socket from '../services/socket'
import MapView from '../components/MapView'
import EventFeed from '../components/EventFeed'
import SimulationToggle from '../components/SimulationToggle'

export default function DispatcherView() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const socketRef = useRef(socket)

    const [events, setEvents] = useState([])
    const [driverMarkers, setDriverMarkers] = useState({})  // driver_id → {lat,lng,name}
    const [activeOrders, setActiveOrders] = useState([])
    const [simRunning, setSimRunning] = useState(false)

    const addEvent = (message, type = 'info') => {
        const time = new Date().toLocaleTimeString()
        setEvents(prev => [...prev.slice(-99), { message, time, type }])
    }

    // Connect socket on mount
    useEffect(() => {
        socket.connect()
        return () => socket.disconnect()
    }, [])

    // Load active orders
    useEffect(() => {
        api.get('/api/orders/active').then(res => setActiveOrders(res.data)).catch(console.error)
        api.get('/api/simulation/status').then(res => setSimRunning(res.data.running)).catch(console.error)
    }, [])

    // Socket listeners (admin auto-joins 'dispatcher' room on connect)
    useEffect(() => {
        socket.on('location_update', (data) => {
            const { driver_id, driver_name, lat, lng } = data
            setDriverMarkers(prev => ({
                ...prev,
                [driver_id]: { lat, lng, name: driver_name, id: driver_id }
            }))
        })

        socket.on('simulation_init', (data) => {
            const { driver_id, driver_name, lat, lng, order_id } = data
            setDriverMarkers(prev => ({
                ...prev,
                [driver_id]: { lat, lng, name: driver_name, id: driver_id }
            }))
            addEvent(`🚀 Simulation started – ${driver_name} on route to order ${order_id.slice(0, 8)}...`, 'start')
        })

        socket.on('status_change', (data) => {
            const { order_id, new_status, driver_name, event_label } = data
            addEvent(event_label || `Order ${order_id.slice(0, 8)}... → ${new_status}`, 'status')
            // Refresh orders
            api.get('/api/orders/active').then(res => setActiveOrders(res.data)).catch(console.error)
        })

        socket.on('simulation_new_order', (data) => {
            addEvent(data.event_label || `${data.driver_name} picked up new order`, 'pickup')
        })

        return () => {
            socket.off('location_update')
            socket.off('simulation_init')
            socket.off('status_change')
            socket.off('simulation_new_order')
        }
    }, [])

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const handleStatusOverride = async (orderId, newStatus) => {
        try {
            await api.patch(`/api/orders/${orderId}/status`, { status: newStatus })
            addEvent(`✏️ Manual override: Order ${orderId.slice(0, 8)}... → ${newStatus}`, 'manual')
        } catch (err) {
            console.error(err)
        }
    }

    const mapMarkers = Object.values(driverMarkers).map(d => ({
        id: d.id,
        lat: d.lat,
        lng: d.lng,
        type: 'driver',
        name: d.name,
    }))

    const VALID_STATUSES = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled']

    return (
        <div className="dispatcher-layout">
            {/* Sidebar */}
            <aside className="dispatcher-sidebar">
                <div className="sidebar-header">
                    <span className="logo-icon-sm">⚡</span>
                    <span className="sidebar-title">Dispatcher</span>
                </div>

                {/* Simulation toggle */}
                <div className="sidebar-section">
                    <SimulationToggle onToggle={(running) => {
                        setSimRunning(running)
                        addEvent(running ? '▶ Simulation STARTED' : '⏹ Simulation STOPPED', running ? 'start' : 'stop')
                    }} />
                    <div className={`sim-status-badge ${simRunning ? 'running' : 'stopped'}`}>
                        {simRunning ? '● LIVE' : '○ IDLE'}
                    </div>
                </div>

                {/* Active Orders Panel */}
                <div className="sidebar-section">
                    <h4 className="sidebar-section-title">Active Orders ({activeOrders.length})</h4>
                    <div className="orders-list">
                        {activeOrders.length === 0 && <p className="empty-msg">No active orders</p>}
                        {activeOrders.map(order => (
                            <div key={order.id} className="order-card-mini">
                                <div className="order-mini-header">
                                    <span className={`status-pill status-${order.status}`}>{order.status}</span>
                                    <span className="order-mini-id">#{order.id.slice(0, 6)}</span>
                                </div>
                                <div className="order-mini-info">
                                    Driver: {order.driver_id ? order.driver_id.slice(0, 8) + '...' : '—'}
                                </div>
                                <select
                                    className="status-override-select"
                                    value={order.status}
                                    onChange={(e) => handleStatusOverride(order.id, e.target.value)}
                                    id={`override-${order.id}`}
                                >
                                    {VALID_STATUSES.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Event Feed */}
                <div className="sidebar-section feed-section">
                    <EventFeed events={events} />
                </div>

                <button className="btn-ghost logout-btn" onClick={handleLogout}>Logout</button>
            </aside>

            {/* Main map */}
            <main className="dispatcher-map">
                <div className="map-header-bar">
                    <h2>🗺️ Live Dispatch Map</h2>
                    <span className="driver-count">{Object.keys(driverMarkers).length} drivers active</span>
                </div>
                <div className="map-container dispatcher-map-inner">
                    <MapView
                        center={[19.07, 72.88]}
                        zoom={11}
                        markers={mapMarkers}
                        socketRef={socketRef}
                        mode="dispatcher"
                    />
                </div>
            </main>
        </div>
    )
}
