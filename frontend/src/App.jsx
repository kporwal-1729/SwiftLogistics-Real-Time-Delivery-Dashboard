import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import CustomerView from './pages/CustomerView'
import DispatcherView from './pages/DispatcherView'

function ProtectedRoute({ children, requiredRole }) {
    const { user, loading } = useAuth()
    if (loading) return <div className="loading-screen"><div className="spinner" /></div>
    if (!user) return <Navigate to="/login" replace />
    if (requiredRole && user.role !== requiredRole) return <Navigate to="/login" replace />
    return children
}

function RoleRedirect() {
    const { user, loading } = useAuth()
    if (loading) return <div className="loading-screen"><div className="spinner" /></div>
    if (!user) return <Navigate to="/login" replace />
    return <Navigate to={user.role === 'admin' ? '/dispatcher' : '/customer'} replace />
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/customer" element={
                        <ProtectedRoute requiredRole="customer">
                            <CustomerView />
                        </ProtectedRoute>
                    } />
                    <Route path="/dispatcher" element={
                        <ProtectedRoute requiredRole="admin">
                            <DispatcherView />
                        </ProtectedRoute>
                    } />
                    <Route path="*" element={<RoleRedirect />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    )
}
