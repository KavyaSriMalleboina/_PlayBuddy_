import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { apiFetch } from "../services/api";
import { useAuth } from "../session/AuthProvider";

import ReviewsSection from "../components/ReviewsSection";

import "../styles/global.css";
import "../styles/PublicProfile.css";

function PublicProfile() {


const { playerId } = useParams();
const navigate = useNavigate();

const { user } = useAuth();

const [profile, setProfile] = useState(null);

const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

const [busy, setBusy] = useState(false);
const [actionMessage, setActionMessage] = useState("");

const [showMutuals, setShowMutuals] = useState(false);


// --------------------------------------------------
// FETCH PROFILE
// --------------------------------------------------

const fetchProfile = useCallback(async () => {

    setLoading(true);
    setError("");

    try {

        const response = await apiFetch(
            `players/${playerId}/profile`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Unable to load player profile."
            );
        }

        setProfile(data);

    } catch (err) {

        setError(err.message);

    } finally {

        setLoading(false);

    }

}, [playerId]);


useEffect(() => {

    fetchProfile();

}, [fetchProfile]);


// --------------------------------------------------
// CONNECTION ACTIONS
// --------------------------------------------------

async function performConnectionAction(
    endpoint,
    method,
    successMessage
) {

    if (busy) return;

    setBusy(true);
    setActionMessage("");
    setError("");

    try {

        const response = await apiFetch(endpoint, {
            method
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.detail || "Connection action failed."
            );
        }

        setActionMessage(successMessage);

        await fetchProfile();

    } catch (err) {

        setError(err.message);

    } finally {

        setBusy(false);

    }

}


function handleConnectionAction() {

    const relationship = profile.relationship;

    switch (relationship.status) {

        case "not_connected":

            performConnectionAction(
                `connections/request/${playerId}`,
                "POST",
                "Connection request sent."
            );

            break;


        case "request_sent":

            if (!window.confirm(
                "Cancel your connection request?"
            )) return;

            performConnectionAction(
                `connections/${relationship.connection_id}/cancel`,
                "DELETE",
                "Connection request cancelled."
            );

            break;


        case "request_received":

            performConnectionAction(
                `connections/${relationship.connection_id}/accept`,
                "POST",
                "Connection request accepted."
            );

            break;


        case "connected":

            if (!window.confirm(
                "Remove this player from your connections?"
            )) return;

            performConnectionAction(
                `connections/${relationship.connection_id}`,
                "DELETE",
                "Connection removed."
            );

            break;


        default:
            break;

    }

}


function declineRequest() {

    const connectionId = profile.relationship.connection_id;

    if (!window.confirm(
        "Decline this connection request?"
    )) return;

    performConnectionAction(
        `connections/${connectionId}/reject`,
        "DELETE",
        "Connection request declined."
    );

}


// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function getInitials(firstName, lastName) {

    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`
        .toUpperCase();

}


function getLocation(info) {

    return [
        info.area,
        info.city,
        info.state
    ].filter(Boolean).join(", ");

}


function getConnectionButton(status) {

    switch (status) {

        case "not_connected":
            return "Send Connection Request";

        case "request_sent":
            return "Cancel Request";

        case "request_received":
            return "Accept Request";

        case "connected":
            return "Remove Connection";

        default:
            return "";

    }

}


// --------------------------------------------------
// LOADING / ERROR
// --------------------------------------------------

if (loading) {

    return (
        <main className="public-profile-page">
            <p className="public-profile-loading">
                Loading player profile...
            </p>
        </main>
    );

}


if (error && !profile) {

    return (
        <main className="public-profile-page">
            <p className="public-profile-error">{error}</p>

            <button
                className="public-back-btn"
                onClick={() => navigate(-1)}
            >
                Go Back
            </button>
        </main>
    );

}


if (!profile) return null;


// --------------------------------------------------
// PROFILE DATA
// --------------------------------------------------

const info = profile.basic_info;

const stats = profile.statistics;

const reviews = profile.reviews;

const relationship = profile.relationship;

const mutualPlayers =
    profile.mutual_connections.players || [];

const mutualCount =
    profile.mutual_connections.count || 0;

const totalReviews = reviews.total || 0;

const isSelf = relationship.status === "self";


// --------------------------------------------------
// RENDER
// --------------------------------------------------

return (

    <main className="public-profile-page">

        {/* BACK BUTTON */}

        <button
            className="public-back-btn"
            onClick={() => navigate(-1)}
        >
            ← Back
        </button>


        {error && (
            <div className="public-profile-alert error">
                {error}
            </div>
        )}

        {actionMessage && (
            <div className="public-profile-alert success">
                {actionMessage}
            </div>
        )}


        {/* ==========================================
            PROFILE HEADER
        ========================================== */}

        <section className="public-profile-header">

            <div className="public-profile-avatar">
                {getInitials(
                    info.first_name,
                    info.last_name
                )}
            </div>


            <div className="public-profile-identity">

                <span className="public-profile-eyebrow">
                    PLAYBUDDY PLAYER
                </span>

                <h1>
                    {info.first_name} {info.last_name}
                </h1>

                <p className="public-profile-location">
                    {getLocation(info) || "Location not specified"}
                </p>

                <p className="public-profile-bio">
                    {info.bio || "This player hasn't added a bio yet."}
                </p>

            </div>


            {/* CONNECTION ACTIONS */}

            {!isSelf && (

                <div className="public-profile-actions">

                    {relationship.status === "request_received" ? (

                        <>
                            <button
                                className="public-primary-btn"
                                disabled={busy}
                                onClick={handleConnectionAction}
                            >
                                {busy ? "Please wait..." : "Accept Request"}
                            </button>

                            <button
                                className="public-danger-btn"
                                disabled={busy}
                                onClick={declineRequest}
                            >
                                Decline
                            </button>
                        </>

                    ) : (

                        <button
                            className={
                                relationship.status === "connected"
                                    ? "public-danger-btn"
                                    : "public-primary-btn"
                            }
                            disabled={busy}
                            onClick={handleConnectionAction}
                        >
                            {busy
                                ? "Please wait..."
                                : getConnectionButton(relationship.status)
                            }
                        </button>

                    )}

                </div>

            )}

        </section>


        {/* ==========================================
            PLAYER STATISTICS
        ========================================== */}

        <section className="public-profile-statistics">

            <article className="public-stat-card">

                <span>MEETUPS</span>

                <strong>
                    {stats.meetup_count}
                </strong>

                <p>Meetups participated in</p>

            </article>


            <article className="public-stat-card">

                <span>CONNECTIONS</span>

                <strong>
                    {stats.connection_count}
                </strong>

                <p>PlayBuddy connections</p>

            </article>


            <article className="public-stat-card mutual-stat-card">

                <span>MUTUAL CONNECTIONS</span>

                <button
                    className="mutual-count-btn"
                    disabled={mutualCount === 0}
                    onClick={() => setShowMutuals(true)}
                >
                    {mutualCount}
                </button>

                <p>
                    {mutualCount === 1
                        ? "Connection in common"
                        : "Connections in common"
                    }
                </p>

            </article>

        </section>


        {/* ==========================================
            PREFERRED SPORTS
        ========================================== */}

        <section className="public-profile-section">

            <div className="public-section-heading">

                <div>
                    <span>PLAYING INTERESTS</span>
                    <h2>Preferred Sports</h2>
                </div>

                <span className="public-section-count">
                    {profile.sports.length} sports
                </span>

            </div>


            {profile.sports.length === 0 ? (

                <p className="public-empty-state">
                    No sports added yet.
                </p>

            ) : (

                <div className="public-sports-grid">

                    {profile.sports.map(sport => (

                        <article
                            className="public-sport-card"
                            key={sport.sport_id}
                        >

                            <h3>
                                {sport.sport_name}
                            </h3>

                            <span className="public-sport-level">
                                {sport.playing_level}
                            </span>

                        </article>

                    ))}

                </div>

            )}

        </section>


        {/* ==========================================
            REVIEW STATISTICS
        ========================================== */}

        <section className="public-profile-section">

            <div className="public-section-heading">

                <div>
                    <span>COMMUNITY FEEDBACK</span>
                    <h2>Player Reviews</h2>
                </div>

            </div>


            <article className="public-review-card">

                {totalReviews > 0 ? (

                    <div className="public-review-chart-layout">

                        <div
                            className="public-review-doughnut"
                            style={{
                                "--positive":
                                    `${reviews.positive / totalReviews * 100}%`,

                                "--neutral":
                                    `${reviews.neutral / totalReviews * 100}%`
                            }}
                            role="img"
                            aria-label={
                                `${totalReviews} reviews: ` +
                                `${reviews.positive} positive, ` +
                                `${reviews.neutral} neutral, ` +
                                `${reviews.negative} negative`
                            }
                        >

                            <div className="public-doughnut-center">

                                <strong>{totalReviews}</strong>

                                <span>Reviews</span>

                            </div>

                        </div>


                        <div className="public-review-legend">

                            <div>
                                <span className="public-legend-dot positive-dot"></span>
                                Positive
                                <strong>{reviews.positive}</strong>
                            </div>

                            <div>
                                <span className="public-legend-dot neutral-dot"></span>
                                Neutral
                                <strong>{reviews.neutral}</strong>
                            </div>

                            <div>
                                <span className="public-legend-dot negative-dot"></span>
                                Negative
                                <strong>{reviews.negative}</strong>
                            </div>

                        </div>

                    </div>

                ) : (

                    <p className="public-empty-state">
                        This player hasn't received any reviews yet.
                    </p>

                )}

            </article>

        </section>


        {/* ==========================================
            INDIVIDUAL REVIEWS
        ========================================== */}

        {!isSelf && (

            <section className="public-profile-section">

                <ReviewsSection playerId={Number(playerId)} />

            </section>

        )}


        {/* ==========================================
            MUTUAL CONNECTIONS MODAL
        ========================================== */}

        {showMutuals && (

            <div
                className="public-modal-backdrop"
                onMouseDown={e => {
                    if (e.target === e.currentTarget) {
                        setShowMutuals(false);
                    }
                }}
            >

                <section
                    className="public-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="mutual-modal-title"
                >

                    <div className="public-modal-header">

                        <div>
                            <span>YOUR SHARED NETWORK</span>

                            <h2 id="mutual-modal-title">
                                Mutual Connections
                            </h2>
                        </div>

                        <button
                            className="public-modal-close"
                            onClick={() => setShowMutuals(false)}
                            aria-label="Close"
                        >
                            ×
                        </button>

                    </div>


                    <p className="public-modal-description">
                        Players connected with both you and {info.first_name}.
                    </p>


                    <div className="public-mutual-list">

                        {mutualPlayers.map(player => (

                            <button
                                className="public-mutual-player"
                                key={player.id}
                                onClick={() => {
                                    setShowMutuals(false);
                                    navigate(`/players/${player.id}`);
                                }}
                            >

                                <span className="public-mutual-avatar">
                                    {getInitials(
                                        player.first_name,
                                        player.last_name
                                    )}
                                </span>

                                <div>
                                    <strong>
                                        {player.first_name} {player.last_name}
                                    </strong>

                                    <span>
                                        {player.city || "Location not specified"}
                                    </span>
                                </div>

                                <span className="public-mutual-arrow">
                                    →
                                </span>

                            </button>

                        ))}

                    </div>

                </section>

            </div>

        )}

    </main>

);

}

export default PublicProfile;
