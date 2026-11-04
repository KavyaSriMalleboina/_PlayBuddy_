import { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { apiFetch } from "../services/api";
import PlayerCard from "../components/PlayerCard";
import "../styles/global.css";
import "../styles/connections.css";

function Connections() {
    const navigate = useNavigate();
    const initialLoadDone = useRef(false);

    // Active tab
    const [activeTab, setActiveTab] = useState("connections");

    // Data
    const [connections, setConnections] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);

    // Search and sorting
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("recent");

    // UI states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [processingId, setProcessingId] = useState(null);


    // --------------------------------------------------
    // FETCH DATA
    // --------------------------------------------------


    const fetchConnections = useCallback(async () => {
        const params = new URLSearchParams();

        if (search.trim()) {
            params.set("search", search.trim());
        }

        params.set("sort", sort);

        const response = await apiFetch(
            `connections?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error("Failed to load connections.");
        }

        const data = await response.json();

        setConnections(data.connections ?? []);
    }, [search, sort]);


    const fetchIncoming = useCallback(async () => {
        const response = await apiFetch("connections/incoming");

        if (!response.ok) {
            throw new Error("Failed to load incoming requests.");
        }

        const data = await response.json();

        setIncomingRequests(data.requests ?? []);
    }, []);


    const fetchSent = useCallback(async () => {
        const response = await apiFetch("connections/sent");

        if (!response.ok) {
            throw new Error("Failed to load sent requests.");
        }

        const data = await response.json();

        setSentRequests(data.requests ?? []);
    }, []);

    const fetchAllConnectionsData = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            await Promise.all([
                fetchConnections(),
                fetchIncoming(),
                fetchSent()
            ]);

        } catch (err) {
            setError(err.message || "Failed to load connections.");
        } finally {
            setLoading(false);
        }

    }, [fetchConnections, fetchIncoming, fetchSent]);


    // --------------------------------------------------
    // LOAD DATA FOR ACTIVE TAB
    // --------------------------------------------------

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            if (activeTab === "connections") {
                await fetchConnections();
            }

            if (activeTab === "incoming") {
                await fetchIncoming();
            }

            if (activeTab === "sent") {
                await fetchSent();
            }

        } catch (err) {
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }

    }, [
        activeTab,
        fetchConnections,
        fetchIncoming,
        fetchSent
    ]);


    useEffect(() => {
        if (initialLoadDone.current) return;

        initialLoadDone.current = true;

        fetchAllConnectionsData();
    }, [fetchAllConnectionsData]);


    // --------------------------------------------------
    // PROFILE NAVIGATION
    // --------------------------------------------------

    function openPlayerProfile(player) {
        navigate(`/players/${player.id}`);
    }


    // --------------------------------------------------
    // CONNECTION ACTIONS
    // --------------------------------------------------

    async function performAction({
        connectionId,
        endpoint,
        method,
        successMessage
    }) {
        if (processingId !== null) return;

        setProcessingId(connectionId);
        setActionError("");

        try {
            const response = await apiFetch(endpoint, {
                method
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.detail || "Action failed."
                );
            }

            // Reload current tab's data
            await fetchAllConnectionsData();
            // Brief confirmation through status message
            setActionError(successMessage);

        } catch (err) {
            setActionError(
                err.message || "Something went wrong."
            );
        } finally {
            setProcessingId(null);
        }
    }


    function acceptRequest(request) {
        performAction({
            connectionId: request.connection_id,
            endpoint: `connections/${request.connection_id}/accept`,
            method: "POST",
            successMessage: "Connection request accepted."
        });
    }


    function rejectRequest(request) {
        const confirmed = window.confirm(
            "Reject this connection request?"
        );

        if (!confirmed) return;

        performAction({
            connectionId: request.connection_id,
            endpoint: `connections/${request.connection_id}/reject`,
            method: "DELETE",
            successMessage: "Connection request rejected."
        });
    }


    function cancelRequest(request) {
        const confirmed = window.confirm(
            "Cancel this connection request?"
        );

        if (!confirmed) return;

        performAction({
            connectionId: request.connection_id,
            endpoint: `connections/${request.connection_id}/cancel`,
            method: "DELETE",
            successMessage: "Connection request cancelled."
        });
    }


    function removeConnection(connection) {
        const confirmed = window.confirm(
            `Remove ${connection.player.first_name} from your connections?`
        );

        if (!confirmed) return;

        performAction({
            connectionId: connection.connection_id,
            endpoint: `connections/${connection.connection_id}`,
            method: "DELETE",
            successMessage: "Connection removed."
        });
    }


    // --------------------------------------------------
    // PLAYER CARD RENDERING
    // --------------------------------------------------

    function renderPlayerCard(player, connectionId, actions) {
        return (
            <div
                className="connection-card-wrapper"
                key={connectionId}
            >
                <PlayerCard
                    player={player}
                    onClick={() => openPlayerProfile(player)}
                />

                {actions && (
                    <div className="connection-card-actions">
                        {actions}
                    </div>
                )}
            </div>
        );
    }


    // --------------------------------------------------
    // TAB CONTENT
    // --------------------------------------------------

    function renderConnections() {
        if (connections.length === 0) {
            return (
                <div className="connections-empty">
                    <h3>
                        {search.trim()
                            ? "No matching connections"
                            : "No connections yet"}
                    </h3>

                    <p>
                        {search.trim()
                            ? "Try searching with another name."
                            : "Explore players and find people to play with."}
                    </p>

                    {!search.trim() && (
                        <button
                            className="connections-primary-btn"
                            onClick={() => navigate("/explore")}
                        >
                            Explore Players
                        </button>
                    )}
                </div>
            );
        }

        return (
            <div className="player-grid connections-grid">
                {connections.map((connection) => (
                    renderPlayerCard(
                        connection.player,
                        connection.connection_id,
                        <button
                            type="button"
                            className="connection-danger-btn"
                            disabled={
                                processingId === connection.connection_id
                            }
                            onClick={() =>
                                removeConnection(connection)
                            }
                        >
                            {processingId === connection.connection_id
                                ? "Removing..."
                                : "Remove Connection"}
                        </button>
                    )
                ))}
            </div>
        );
    }


    function renderIncomingRequests() {
        if (incomingRequests.length === 0) {
            return (
                <div className="connections-empty">
                    <h3>No incoming requests</h3>
                    <p>
                        New connection requests will appear here.
                    </p>
                </div>
            );
        }

        return (
            <div className="player-grid connections-grid">
                {incomingRequests.map((request) => (
                    renderPlayerCard(
                        request.player,
                        request.connection_id,
                        <>
                            <button
                                type="button"
                                className="connection-primary-btn"
                                disabled={
                                    processingId === request.connection_id
                                }
                                onClick={() => acceptRequest(request)}
                            >
                                Accept
                            </button>

                            <button
                                type="button"
                                className="connection-secondary-btn"
                                disabled={
                                    processingId === request.connection_id
                                }
                                onClick={() => rejectRequest(request)}
                            >
                                Reject
                            </button>
                        </>
                    )
                ))}
            </div>
        );
    }


    function renderSentRequests() {
        if (sentRequests.length === 0) {
            return (
                <div className="connections-empty">
                    <h3>No pending sent requests</h3>
                    <p>
                        Connection requests you send will appear here.
                    </p>
                </div>
            );
        }

        return (
            <div className="player-grid connections-grid">
                {sentRequests.map((request) => (
                    renderPlayerCard(
                        request.player,
                        request.connection_id,
                        <button
                            type="button"
                            className="connection-secondary-btn"
                            disabled={
                                processingId === request.connection_id
                            }
                            onClick={() => cancelRequest(request)}
                        >
                            {processingId === request.connection_id
                                ? "Cancelling..."
                                : "Cancel Request"}
                        </button>
                    )
                ))}
            </div>
        );
    }


    // --------------------------------------------------
    // MAIN UI
    // --------------------------------------------------

    return (
        <main className="connections-page">

            {/* Header */}

            <section className="connections-header">
                <div>
                    <span className="connections-eyebrow">
                        YOUR SPORTS NETWORK
                    </span>

                    <h1>Connections</h1>

                    <p>
                        Manage your connections and meet the people
                        you play with.
                    </p>
                </div>

                <button
                    type="button"
                    className="connections-explore-btn"
                    onClick={() => navigate("/explore")}
                >
                    Explore Players
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M5 12h14" />
                        <path d="m13 6 6 6-6 6" />
                    </svg>
                </button>
            </section>


            {/* Tabs */}

            <section className="connections-panel">

                <div className="connections-tabs" role="tablist">

                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "connections"}
                        className={
                            activeTab === "connections"
                                ? "connections-tab active"
                                : "connections-tab"
                        }
                        onClick={() => {
                            setActiveTab("connections");
                            setActionError("");
                        }}
                    >
                        My Connections

                        <span className="connections-tab-count">
                            {connections.length}
                        </span>
                    </button>


                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "incoming"}
                        className={
                            activeTab === "incoming"
                                ? "connections-tab active"
                                : "connections-tab"
                        }
                        onClick={() => {
                            setActiveTab("incoming");
                            setActionError("");
                        }}
                    >
                        Incoming

                        <span className="connections-tab-count">
                            {incomingRequests.length}
                        </span>
                    </button>


                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "sent"}
                        className={
                            activeTab === "sent"
                                ? "connections-tab active"
                                : "connections-tab"
                        }
                        onClick={() => {
                            setActiveTab("sent");
                            setActionError("");
                        }}
                    >
                        Sent

                        <span className="connections-tab-count">
                            {sentRequests.length}
                        </span>
                    </button>

                </div>


                {/* Section Toolbar */}

                <div className="connections-toolbar">

                    <div className="connections-section-heading">
                        <h2>
                            {activeTab === "connections" &&
                                "My Connections"}

                            {activeTab === "incoming" &&
                                "Incoming Requests"}

                            {activeTab === "sent" &&
                                "Sent Requests"}
                        </h2>

                        <p>
                            {activeTab === "connections" &&
                                "Your sports buddies, all in one place."}

                            {activeTab === "incoming" &&
                                "People who want to connect with you."}

                            {activeTab === "sent" &&
                                "Requests waiting for a response."}
                        </p>
                    </div>


                    {/* Search and sorting only for accepted connections */}

                    {activeTab === "connections" && (
                        <div className="connections-controls">

                            <div className="connections-search">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <circle cx="11" cy="11" r="7" />
                                    <path d="m16 16 4.5 4.5" />
                                </svg>

                                <input
                                    type="search"
                                    placeholder="Search connections..."
                                    value={search}
                                    onChange={(e) =>
                                        setSearch(e.target.value)
                                    }
                                    aria-label="Search connections"
                                />

                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch("")}
                                        aria-label="Clear search"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>


                            <div className="connections-sort-wrapper">


                                <svg
                                    className="connections-sort-icon"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M4 6h16" />
                                    <path d="M7 12h10" />
                                    <path d="M10 18h4" />
                                    <path d="m18 9 3 3-3 3" />
                                </svg>

                                <select
                                    className="connections-sort"
                                    value={sort}
                                    onChange={(e) => setSort(e.target.value)}
                                    aria-label="Sort connections"
                                >
                                    <option value="recent">
                                        Recently connected
                                    </option>

                                    <option value="alphabetical">
                                        Name: A-Z
                                    </option>
                                </select>


                            </div>


                        </div>
                    )}

                </div>


                {/* Feedback */}

                {actionError && (
                    <div
                        className="connections-feedback"
                        role="status"
                    >
                        {actionError}
                    </div>
                )}

                {error && (
                    <div className="connections-feedback error">
                        <p>{error}</p>

                        <button
                            type="button"
                            onClick={loadData}
                        >
                            Retry
                        </button>
                    </div>
                )}


                {/* Content */}

                {loading ? (
                    <div className="connections-loading">
                        <div className="explore-spinner" />
                        <p>Loading connections...</p>
                    </div>
                ) : !error ? (
                    <div className="connections-content">

                        {activeTab === "connections" &&
                            renderConnections()}

                        {activeTab === "incoming" &&
                            renderIncomingRequests()}

                        {activeTab === "sent" &&
                            renderSentRequests()}

                    </div>
                ) : null}

            </section>

        </main>
    );

}

export default Connections;
