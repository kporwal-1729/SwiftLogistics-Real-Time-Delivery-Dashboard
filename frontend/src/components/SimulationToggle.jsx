import { useState } from 'react'
import api from '../services/api'

export default function SimulationToggle({ onToggle }) {
    const [running, setRunning] = useState(false)
    const [loading, setLoading] = useState(false)

    const toggle = async () => {
        setLoading(true)
        try {
            if (running) {
                await api.post('/api/simulation/stop')
                setRunning(false)
                onToggle?.(false)
            } else {
                await api.post('/api/simulation/start')
                setRunning(true)
                onToggle?.(true)
            }
        } catch (err) {
            console.error('Simulation toggle error:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            className={`sim-toggle ${running ? 'sim-running' : 'sim-stopped'}`}
            onClick={toggle}
            disabled={loading}
            id="simulation-toggle"
        >
            {loading ? (
                <span className="spinner-sm" />
            ) : running ? (
                '⏹ Stop Simulation'
            ) : (
                '▶ Start Simulation'
            )}
        </button>
    )
}
