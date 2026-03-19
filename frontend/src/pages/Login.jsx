import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [form, setForm] = useState({ email: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const user = await login(form.email, form.password)
            navigate(user.role === 'admin' ? '/dispatcher' : '/customer', { replace: true })
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid credentials')
        } finally {
            setLoading(false)
        }
    }

    const fillDemo = (role) => {
        if (role === 'admin') setForm({ email: 'admin@swift.com', password: 'admin123' })
        else setForm({ email: 'customer@swift.com', password: 'customer123' })
    }

    return (
        <div className="login-bg">
            <div className="login-card">
                {/* Logo */}
                <div className="login-logo">
                    <div className="logo-icon">⚡</div>
                    <h1 className="logo-text">SwiftLogistics</h1>
                    <p className="logo-tagline">Real-time delivery tracking platform</p>
                </div>

                {/* Demo shortcut pills */}
                <div className="demo-pills">
                    <span>Quick demo:</span>
                    <button className="pill pill-admin" onClick={() => fillDemo('admin')}>
                        👮 Admin Login
                    </button>
                    <button className="pill pill-customer" onClick={() => fillDemo('customer')}>
                        🛍️ Customer Login
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="field-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div className="field-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    {error && <div className="error-banner">⚠️ {error}</div>}

                    <button type="submit" className="btn-login" disabled={loading} id="login-submit">
                        {loading ? <span className="spinner-sm" /> : 'Sign In →'}
                    </button>
                </form>

                <p className="login-footer">
                    Role-based access: <strong>Admin</strong> → Dispatcher Dashboard &nbsp;|&nbsp;
                    <strong>Customer</strong> → Track Order
                </p>
            </div>
        </div>
    )
}
