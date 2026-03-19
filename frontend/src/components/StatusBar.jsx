const STATUS_STEPS = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered']
const STATUS_LABELS = {
    pending: 'Order Placed',
    assigned: 'Driver Assigned',
    picked_up: 'Picked Up',
    in_transit: 'On the Way',
    delivered: 'Delivered 🎉',
}

export default function StatusBar({ status = 'pending', eta = null }) {
    const currentIndex = STATUS_STEPS.indexOf(status)

    return (
        <div className="status-bar-wrap">
            <div className="status-steps">
                {STATUS_STEPS.map((step, i) => (
                    <div key={step} className={`status-step ${i <= currentIndex ? 'active' : ''} ${i === currentIndex ? 'current' : ''}`}>
                        <div className="step-dot">
                            {i < currentIndex ? '✓' : i + 1}
                        </div>
                        <span className="step-label">{STATUS_LABELS[step]}</span>
                        {i < STATUS_STEPS.length - 1 && (
                            <div className={`step-line ${i < currentIndex ? 'filled' : ''}`} />
                        )}
                    </div>
                ))}
            </div>
            {eta && (
                <div className="eta-badge">
                    🕐 ETA: <strong>{eta}</strong>
                </div>
            )}
        </div>
    )
}
