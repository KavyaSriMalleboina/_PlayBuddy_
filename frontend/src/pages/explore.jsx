import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import PlayerCard from "../components/PlayerCard";
import "../styles/global.css";
import "../styles/explore.css";

const API_URL = import.meta.env.VITE_API_BASE_URL;

function Explore() {
    const navigate = useNavigate();

    // Search
    const [search, setSearch] = useState("");

    // Filters
    const [city, setCity] = useState("");
    const [sport, setSport] = useState("");
    const [skillLevel, setSkillLevel] = useState("");

    // Results
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const isSearching = search.trim().length > 0;

    const hasFilters = Boolean(
        city.trim() || sport || skillLevel
    );

    // Fetch recommendations or search results
    useEffect(() => {
        let cancelled = false;

        const controller = new AbortController();

        const timer = setTimeout(async () => {
            if (cancelled) return;

            setLoading(true);
            setError("");

            try {
                let endpoint;

                if (isSearching) {
                    const params = new URLSearchParams();

                    params.set("search", search.trim());
                    params.set("limit", "20");

                    if (city.trim()) {
                        params.set("city", city.trim());
                    }

                    if (sport) {
                        params.set("sport", sport);
                    }

                    if (skillLevel) {
                        params.set("skill_level", skillLevel);
                    }

                    endpoint = `players?${params.toString()}`;

                } else {
                    endpoint = "players/recommendations";
                }

                const response = await apiFetch(endpoint, {
                    signal: controller.signal
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error(
                            "Please log in to explore players."
                        );
                    }

                    throw new Error(
                        "Failed to fetch players."
                    );
                }

                const data = await response.json();

                if (cancelled) return;

                setPlayers(data.players ?? []);

            } catch (err) {
                if (
                    cancelled ||
                    err.name === "AbortError"
                ) {
                    return;
                }

                setError(
                    err.message || "Something went wrong."
                );

                setPlayers([]);

            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }, isSearching ? 300 : 0);

        return () => {
            cancelled = true;
            clearTimeout(timer);
            controller.abort();
        };

    }, [search, city, sport, skillLevel, isSearching]);

    // Clear filters without clearing search
    function clearFilters() {
        setCity("");
        setSport("");
        setSkillLevel("");
    }

    // Navigate to public player profile
    function openPlayerProfile(player) {
        navigate(`/players/${player.id}`);
    }

    return (
        <div className="explore-page">

            {/* Search Section */}
            <section className="explore-search-section">

                <div className="explore-search-container">

                    {/* Search Bar */}
                    <div className="explore-search-bar">

                        {/* Search Icon */}
                        <span
                            className="search-icon"
                            aria-hidden="true"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="11" cy="11" r="7" />
                                <path d="m16 16 4.5 4.5" />
                            </svg>
                        </span>

                        <input
                            type="search"
                            placeholder="Search players by name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="Search players by name"
                        />

                        {search && (
                            <button
                                type="button"
                                className="clear-search"
                                onClick={() => setSearch("")}
                                aria-label="Clear search"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                >
                                    <path d="m6 6 12 12" />
                                    <path d="M18 6 6 18" />
                                </svg>
                            </button>
                        )}

                    </div>

                    {/* Filters */}
                    <div className="explore-filters">

                        {/* City */}
                        <div className="filter-group city-filter">

                            <input
                                type="text"
                                placeholder="City"
                                aria-label="Filter by city"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                disabled={!isSearching}
                            />

                        </div>

                        {/* Sport */}
                        <div className="filter-group">

                            <select
                                aria-label="Filter by sport"
                                value={sport}
                                onChange={(e) => setSport(e.target.value)}
                                disabled={!isSearching}
                            >
                                <option value="">All Sports</option>
                                <option value="Badminton">Badminton</option>
                                <option value="Cricket">Cricket</option>
                                <option value="Football">Football</option>
                                <option value="Basketball">Basketball</option>
                                <option value="Tennis">Tennis</option>
                                <option value="Volleyball">Volleyball</option>
                            </select>

                        </div>

                        {/* Skill Level */}
                        <div className="filter-group">

                            <select
                                aria-label="Filter by skill level"
                                value={skillLevel}
                                onChange={(e) => setSkillLevel(e.target.value)}
                                disabled={!isSearching}
                            >
                                <option value="">All Levels</option>
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                            </select>

                        </div>

                        {/* Clear Filters */}
                        {isSearching && hasFilters && (
                            <button
                                type="button"
                                className="clear-filters-btn"
                                onClick={clearFilters}
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M3 6h18" />
                                    <path d="m8 6 .7 14h6.6L16 6" />
                                    <path d="M9 6V4h6v2" />
                                </svg>

                                <span>Clear filters</span>
                            </button>
                        )}

                    </div>

                </div>

            </section>

            {/* Results */}
            <main className="explore-results">

                {/* Results Header */}
                <div className="results-header">

                    <div>
                        <h2>
                            {isSearching
                                ? "Search Results"
                                : "Recommended Players"}
                        </h2>

                        <p className="results-subtitle">
                            {isSearching
                                ? "Find players who match your interests."
                                : "Discover players and find your next sports buddy."}
                        </p>
                    </div>

                    {!loading && !error && (
                        <span className="results-count">
                            {players.length}{" "}
                            {players.length === 1 ? "player" : "players"}
                        </span>
                    )}

                </div>

                {/* Loading */}
                {loading && (
                    <div className="explore-message">

                        <div
                            className="explore-spinner"
                            aria-hidden="true"
                        />

                        <p>
                            {isSearching
                                ? "Searching players..."
                                : "Finding players for you..."}
                        </p>

                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="explore-message explore-error">

                        <div className="status-icon">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 7v5" />
                                <path d="M12 16h.01" />
                            </svg>
                        </div>

                        <h3>Couldn't load players</h3>

                        <p>{error}</p>

                    </div>
                )}

                {/* Empty Results */}
                {!loading && !error && players.length === 0 && (
                    <div className="explore-empty">

                        <div className="status-icon">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <circle cx="11" cy="11" r="7" />
                                <path d="m16 16 4.5 4.5" />
                            </svg>
                        </div>

                        <h3>
                            {isSearching
                                ? "No players found"
                                : "No recommendations available"}
                        </h3>

                        <p>
                            {isSearching
                                ? "Try another name or adjust your filters."
                                : "Check back later for players to connect with."}
                        </p>

                    </div>
                )}

                {/* Player Cards */}
                {!loading && !error && players.length > 0 && (
                    <div className="player-grid">

                        {players.map((player) => (
                            <PlayerCard
                                key={player.id}
                                player={player}
                                onClick={() => openPlayerProfile(player)}
                            />
                        ))}

                    </div>
                )}

            </main>

        </div>
    );
}

export default Explore;