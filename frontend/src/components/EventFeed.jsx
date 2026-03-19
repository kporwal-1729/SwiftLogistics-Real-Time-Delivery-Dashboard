import { useEffect, useRef } from 'react'

export default function EventFeed({ events = [] }) {
    const feedRef = useRef(null)

    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight
        }
    }, [events])

    return (
        <div className="event-feed">
            <div className="event-feed-header">
                <span className="live-dot" />
                Live Event Feed
            </div>
            <div className="event-feed-list" ref={feedRef}>
                {events.length === 0 && (
                    <p className="event-empty">Waiting for events... Start simulation to see activity.</p>
                )}
                {events.map((evt, i) => (
                    <div key={i} className={`event-item event-${evt.type || 'info'}`}>
                        <span className="event-time">{evt.time}</span>
                        <span className="event-msg">{evt.message}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
