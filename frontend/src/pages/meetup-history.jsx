import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../session/AuthProvider";
import { apiFetch } from "../services/api";
import "../styles/global.css";
import "../styles/meetup-history.css";

const fmt = (value) =>
    new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });

function Meetup_history() {
    const { user } = useAuth();
    const [meetups, setMeetups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all"); // "all" | "hosted" | "joined"

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await apiFetch("meetups/history?limit=50");
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.detail || "Failed to load meetup history.");
            }
            const list = Array.isArray(data) ? data : data.meetups ?? [];
            setMeetups(list);
        } catch (err) {
            setError(err.message || "Unable to load history.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Meetups where the user is either host or participant
    const userMeetups = meetups;

    const hostedMeetups = userMeetups.filter(
        (m) => m.user_role === "host"
    );

    const joinedMeetups = userMeetups.filter(
        (m) => m.user_role === "participant"
    );

    const displayedMeetups =
        filter === "hosted"
            ? hostedMeetups
            : filter === "joined"
                ? joinedMeetups
                : userMeetups;

    // Unique sports count
    const uniqueSports = new Set(
        userMeetups.map((m) => m.sport_name).filter(Boolean)
    ).size;

    return (
        <main className="history-page">
            <div className="history-container">
                {/* Back navigation */}
                <div className="history-nav-bar">
                    <Link to="/profile" className="history-back-btn">
                        <span aria-hidden="true">←</span> Back to Profile
                    </Link>
                </div>

                {/* Header */}
                <header className="history-header">
                    <div>
                        <span className="history-eyebrow">YOUR SPORTS JOURNEY</span>
                        <h1>Meetup History</h1>
                        <p className="history-subtitle">
                            Track all the games you've organized, joined, and played.
                        </p>
                    </div>

                    <Link to="/meetups" className="history-primary-action">
                        <span>+</span> Find New Game
                    </Link>
                </header>

                {/* Overview Stats */}
                <section className="history-stats-grid">
                    <article className="history-stat-card">
                        <div className="history-stat-icon">🏸</div>
                        <div className="history-stat-content">
                            <span className="history-stat-label">TOTAL GAMES</span>
                            <h2 className="history-stat-number">{userMeetups.length}</h2>
                            <p className="history-stat-desc">Meetups recorded in your circle</p>
                        </div>
                    </article>

                    <article className="history-stat-card">
                        <div className="history-stat-icon">👑</div>
                        <div className="history-stat-content">
                            <span className="history-stat-label">HOSTED BY YOU</span>
                            <h2 className="history-stat-number">{hostedMeetups.length}</h2>
                            <p className="history-stat-desc">Games you brought to life</p>
                        </div>
                    </article>

                    <article className="history-stat-card">
                        <div className="history-stat-icon">⚡</div>
                        <div className="history-stat-content">
                            <span className="history-stat-label">SPORTS PLAYED</span>
                            <h2 className="history-stat-number">{uniqueSports}</h2>
                            <p className="history-stat-desc">Different sports explored</p>
                        </div>
                    </article>
                </section>

                {/* Filter Tabs */}
                <section className="history-tabs-bar">
                    <div className="history-tabs">
                        <button
                            type="button"
                            className={`history-tab ${filter === "all" ? "active" : ""}`}
                            onClick={() => setFilter("all")}
                        >
                            All Games <span className="tab-count">{userMeetups.length}</span>
                        </button>

                        <button
                            type="button"
                            className={`history-tab ${filter === "hosted" ? "active" : ""}`}
                            onClick={() => setFilter("hosted")}
                        >
                            Hosted by Me <span className="tab-count">{hostedMeetups.length}</span>
                        </button>

                        <button
                            type="button"
                            className={`history-tab ${filter === "joined" ? "active" : ""}`}
                            onClick={() => setFilter("joined")}
                        >
                            Joined Games <span className="tab-count">{joinedMeetups.length}</span>
                        </button>
                    </div>

                    <span className="history-showing-count">
                        Showing {displayedMeetups.length}{" "}
                        {displayedMeetups.length === 1 ? "meetup" : "meetups"}
                    </span>
                </section>

                {/* Content */}
                {loading ? (
                    <div className="history-loading-state">
                        <div className="history-spinner" aria-hidden="true" />
                        <p>Loading your sports history...</p>
                    </div>
                ) : error ? (
                    <div className="history-error-state">
                        <p>{error}</p>
                        <button type="button" onClick={fetchHistory} className="history-retry-btn">
                            Try Again
                        </button>
                    </div>
                ) : displayedMeetups.length === 0 ? (
                    <div className="history-empty-state">
                        <div className="history-empty-icon">🏸</div>
                        <h3>No meetup history yet</h3>
                        <p>
                            {filter === "hosted"
                                ? "You haven't hosted any meetups yet. Host a game and invite your connections!"
                                : filter === "joined"
                                    ? "You haven't joined any meetups yet. Explore meetups to jump into the action!"
                                    : "You haven't participated in any meetups yet. Start your journey by creating or joining a game."}
                        </p>
                        <div className="history-empty-actions">
                            <Link to="/meetups" className="history-cta-primary">
                                Browse Meetups →
                            </Link>
                            <Link to="/explore" className="history-cta-secondary">
                                Find Players →
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="history-grid">
                        {displayedMeetups.map((m) => {
                            const isPast = new Date(m.meetup_time).getTime() < Date.now();
                            return (
                                <article className="history-card" key={m.id}>
                                    <div className="history-card-top">
                                        <span className="history-sport-badge">
                                            {m.sport_name || "Sport"}
                                        </span>
                                        <span
                                            className={`history-status-pill ${isPast ? "completed" : "upcoming"
                                                }`}
                                        >
                                            <span className="status-dot" />
                                            {isPast ? "Completed" : "Upcoming"}
                                        </span>
                                    </div>

                                    <h3 className="history-card-title">{m.title}</h3>

                                    <p className="history-card-host">
                                        {m.user_role === "host" ? (
                                            <span className="host-tag-you">👑 You hosted</span>
                                        ) : (
                                            <span>
                                                Hosted by <strong>{m.host_name}</strong>
                                            </span>
                                        )}
                                    </p>

                                    <div className="history-card-meta">
                                        <div className="meta-row">
                                            <span className="meta-icon">◷</span>
                                            <span>{fmt(m.meetup_time)}</span>
                                        </div>
                                        <div className="meta-row">
                                            <span className="meta-icon">⌖</span>
                                            <span>{m.area}</span>
                                        </div>
                                        <div className="meta-row">
                                            <span className="meta-icon">⏱</span>
                                            <span>{m.duration_minutes} minutes</span>
                                        </div>
                                    </div>

                                    <div className="history-card-footer">
                                        <span className="history-players-badge">
                                            {m.participant_count}/{m.max_participants} players
                                        </span>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}

export default Meetup_history;
