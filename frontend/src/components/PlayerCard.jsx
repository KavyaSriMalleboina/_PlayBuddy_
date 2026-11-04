import "../styles/explore.css";

function PlayerCard({ player, onClick }) {
    const fullName = [
        player.first_name,
        player.last_name
    ].filter(Boolean).join(" ");

    const initial = player.first_name?.charAt(0)?.toUpperCase() || "?";

    return (
        <div
            className="explore-player-card"
            onClick={onClick}
            role="link"
            tabIndex={0}
            aria-label={`View ${fullName || "Player"}'s profile`}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            {/* Card Header */}
            <div className="player-card-header">

                {/* Avatar */}
                <div className="player-avatar">
                    {initial}
                </div>

                {/* Player Information */}
                <div className="player-info">
                    <h3>
                        {fullName || "Player"}
                    </h3>

                    <div className="player-city">

                        {/* Location Icon */}
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                            <circle cx="12" cy="10" r="2.5" />
                        </svg>

                        <span>
                            {player.city || "Location unavailable"}
                        </span>

                    </div>
                </div>

            </div>

            {/* Sports */}
            {player.sports?.length > 0 && (
                <div className="player-sports">
                    {player.sports.map((sport) => (
                        <span
                            className="sport-tag"
                            key={sport}
                        >
                            {sport}
                        </span>
                    ))}
                </div>
            )}

            {/* Bio */}
            <div className="player-card-body">
                {player.bio ? (
                    <p className="player-bio">
                        {player.bio}
                    </p>
                ) : (
                    <p className="player-bio player-bio-empty">
                        No bio available.
                    </p>
                )}
            </div>

            {/* Footer */}
            <div className="player-card-footer">

                <span>
                    View Profile
                </span>

                {/* Arrow Icon */}
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

            </div>

        </div>
    );
}

export default PlayerCard;