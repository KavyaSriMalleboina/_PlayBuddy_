import { useState, useEffect } from "react";
import { useAuth } from "../session/AuthProvider";
import { apiFetch } from "../services/api";
import { useNavigate } from "react-router-dom";
import "../styles/global.css";
import "../styles/Profile.css";

function Profile() {
    const { user, loading, setUser } = useAuth();
    const [connectionCount, setConnectionCount] = useState(0);
    const [connectionsLoading, setConnectionsLoading] = useState(true);

    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);

    const [availableSports, setAvailableSports] = useState([]);

    const [userSports, setUserSports] = useState([]);

    const [selectedSportId, setSelectedSportId] = useState("");

    const [newSkillLevel, setNewSkillLevel] = useState("Beginner");

    const [sportsLoading, setSportsLoading] = useState(false);
    const [sportsSaving, setSportsSaving] = useState(false);

    // Error message for sports operations
    const [sportsError, setSportsError] = useState("");

    // Review statistics fetched from the backend
    const [reviews, setReviews] = useState({
        positive: 0,
        neutral: 0,
        negative: 0,
    });

    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [reviewsError, setReviewsError] = useState("");

    // Profile edit form
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        city: "",
        area: "",
        bio: "",
    });

    const totalReviews =
        reviews.positive +
        reviews.neutral +
        reviews.negative;

    const fullName = user
        ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
        : "";


    async function loadSports() {
        try {
            setSportsLoading(true);
            setSportsError("");

            const [allSportsResponse, userSportsResponse] =
                await Promise.all([
                    apiFetch("sports"),
                    apiFetch("users/current/sports")
                ]);

            const [allSportsData, userSportsData] =
                await Promise.all([
                    allSportsResponse.json(),
                    userSportsResponse.json()
                ]);

            if (!allSportsResponse.ok) {
                throw new Error(
                    allSportsData.detail ||
                    "Failed to load available sports."
                );
            }

            if (!userSportsResponse.ok) {
                throw new Error(
                    userSportsData.detail ||
                    "Failed to load your sports."
                );
            }

            setAvailableSports(allSportsData.sports ?? []);
            setUserSports(userSportsData.sports ?? []);

        } catch (error) {
            console.error("Failed to load sports:", error);

            setSportsError(
                error.message || "Unable to load sports."
            );
        } finally {
            setSportsLoading(false);
        }
    }

    // Fetch review statistics for the authenticated user
    useEffect(() => {
        async function fetchReviewStats() {
            try {
                setReviewsLoading(true);
                setReviewsError("");

                const response = await apiFetch(
                    "users/current/reviews-stats"
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.detail || "Failed to fetch review statistics."
                    );
                }

                setReviews({
                    positive: data.positive ?? 0,
                    neutral: data.neutral ?? 0,
                    negative: data.negative ?? 0,
                });
            } catch (error) {
                console.error(
                    "Failed to fetch review statistics:",
                    error
                );

                setReviewsError(
                    "Unable to load review statistics."
                );
            } finally {
                setReviewsLoading(false);
            }
        }

        if (user) {
            fetchReviewStats();
        } else if (!loading) {
            setReviewsLoading(false);
        }
    }, [user?.id, loading]);


    // Fetch accepted connection count
    useEffect(() => {

        async function fetchConnectionCount() {

            try {
                setConnectionsLoading(true);

                const response = await apiFetch("connections/");

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.detail || "Failed to fetch connections."
                    );
                }

                setConnectionCount(data.total ?? 0);

            } catch (error) {
                console.error("Failed to fetch connection count:", error);

            } finally {
                setConnectionsLoading(false);
            }
        }

        fetchConnectionCount();

    }, []);

    function handleAddSport() {
        if (!selectedSportId) {
            return;
        }

        const sportId = Number(selectedSportId);

        const alreadySelected = userSports.some(
            (sport) => sport.sport_id === sportId
        );

        if (alreadySelected) {
            setSportsError("You have already selected this sport.");
            return;
        }

        const selectedSport = availableSports.find(
            (sport) => sport.id === sportId
        );

        if (!selectedSport) {
            setSportsError("Invalid sport selection.");
            return;
        }

        setUserSports((previousSports) => [
            ...previousSports,
            {
                sport_id: selectedSport.id,
                sport_name: selectedSport.name,
                playing_level: newSkillLevel,
            },
        ]);

        setSelectedSportId("");
        setNewSkillLevel("Beginner");
        setSportsError("");
    }

    function handleSkillLevelChange(sportId, skillLevel) {
        setUserSports((previousSports) =>
            previousSports.map((sport) =>
                sport.sport_id === sportId
                    ? { ...sport, playing_level: skillLevel }
                    : sport
            )
        );
    }

    function handleRemoveSport(sportId) {
        setUserSports((previousSports) =>
            previousSports.filter(
                (sport) => sport.sport_id !== sportId
            )
        );

        setSportsError("");
    }



    // Enter profile edit mode
    async function handleEdit() {
        setFormData({
            first_name: user.first_name || "",
            last_name: user.last_name || "",
            email: user.email || "",
            phone: user.phone || "",
            city: user.city || "",
            area: user.area || "",
            bio: user.bio || "",
        });

        setUserSports([]);
        setSelectedSportId("");
        setNewSkillLevel("Beginner");
        setSportsError("");

        setIsEditing(true);

        await loadSports();
    }

    async function saveSports() {
        const payload = {
            sports: userSports.map((sport) => ({
                sport_id: sport.sport_id,
                playing_level: sport.playing_level,
            })),
        };

        const response = await apiFetch(
            "users/current/sports",
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(payload),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = Array.isArray(data.detail)
                ? data.detail.map((error) =>
                    `${error.loc.join(".")}: ${error.msg}`
                ).join("\n")
                : data.detail || "Something went wrong";

            alert(errorMessage);
            return;
        }

        return data;
    }

    // Update form state when an input changes
    function handleChange(event) {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    // Cancel editing
    function handleCancel() {
        setIsEditing(false);
    }

    // Save profile changes
    async function handleSubmit(event) {
        event.preventDefault();

        try {
            const response = await apiFetch(
                "users/current",
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        first_name: formData.first_name.trim(),
                        last_name: formData.last_name.trim(),
                        phone: formData.phone.trim(),
                        city: formData.city.trim(),
                        area: formData.area.trim(),
                        bio: formData.bio.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail || "Failed to update your profile."
                );
            }

            // Preserve existing context properties while updating the profile.
            setUser((previousUser) => ({
                ...previousUser,
                ...(data.user ?? data),
            }));

            await saveSports();

            setIsEditing(false);


        } catch (error) {
            console.error("Profile update failed:", error);
            alert(error.message || "Something went wrong.");
        }
    }

    // Wait for authentication to finish
    if (loading) {
        return (
            <div className="profile-loading">
                <div className="profile-spinner"></div>
                <p>Loading your profile...</p>
            </div>
        );
    }

    // Handle unauthenticated users
    if (!user) {
        return (
            <div className="profile-loading">
                <p>Please log in to view your profile.</p>
            </div>
        );
    }

    return (
        <main className="profile-page">

            {/* Page heading */}
            <section className="profile-heading">
                <div>
                    <p className="profile-eyebrow">
                        YOUR PLAYBUDDY SPACE
                    </p>

                    <h1>My Profile</h1>

                    <p className="profile-subtitle">
                        Your game, your people, your community.
                    </p>
                </div>

                {!isEditing && (
                    <button
                        type="button"
                        className="edit-profile-btn"
                        onClick={handleEdit}
                    >
                        <span className="edit-icon">✎</span>
                        Edit Profile
                    </button>
                )}
            </section>

            {isEditing ? (

                /* ================= EDIT MODE ================= */

                <section className="profile-edit-card">

                    <div className="section-heading">
                        <p className="profile-eyebrow">
                            PERSONAL INFORMATION
                        </p>

                        <h2>Edit your profile</h2>

                        <p>
                            Keep your information up to date.
                        </p>
                    </div>

                    <form
                        className="profile-form"
                        onSubmit={handleSubmit}
                    >
                        <div className="profile-form-grid">

                            {/* First name */}
                            <div className="form-field">
                                <label htmlFor="first_name">
                                    First name
                                </label>

                                <input
                                    id="first_name"
                                    name="first_name"
                                    type="text"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Last name */}
                            <div className="form-field">
                                <label htmlFor="last_name">
                                    Last name
                                </label>

                                <input
                                    id="last_name"
                                    name="last_name"
                                    type="text"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Email */}
                            <div className="form-field">
                                <label htmlFor="email">
                                    Email address
                                </label>

                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Phone */}
                            <div className="form-field">
                                <label htmlFor="phone">
                                    Phone number
                                </label>

                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* City */}
                            <div className="form-field">
                                <label htmlFor="city">
                                    City
                                </label>

                                <input
                                    id="city"
                                    name="city"
                                    type="text"
                                    value={formData.city}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Area */}
                            <div className="form-field">
                                <label htmlFor="area">
                                    Area
                                </label>

                                <input
                                    id="area"
                                    name="area"
                                    type="text"
                                    value={formData.area}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Bio */}
                            <div className="form-field full-width">
                                <label htmlFor="bio">
                                    About me
                                </label>

                                <textarea
                                    id="bio"
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleChange}
                                    placeholder="Tell other players about yourself, your interests, and the sports you enjoy..."
                                    rows={5}
                                    maxLength={500}
                                />

                                <span className="character-count">
                                    {formData.bio.length}/500 characters
                                </span>
                            </div>

                            {/* Sports preferences */}
                            <div className="form-field full-width sports-editor">

                                <label>My Sports</label>

                                <p className="sports-description">
                                    Choose the sports you play and update your skill levels.
                                </p>

                                {sportsLoading ? (

                                    <p>Loading your sports...</p>

                                ) : (

                                    <>
                                        {/* Current selected sports */}
                                        <div className="selected-sports-list">

                                            {userSports.length === 0 ? (

                                                <p className="empty-sports">
                                                    You haven't selected any sports yet.
                                                </p>

                                            ) : (

                                                userSports.map((sport) => (

                                                    <div
                                                        className="sport-row"
                                                        key={sport.sport_id}
                                                    >

                                                        <span className="sport-name">
                                                            {sport.sport_name}
                                                        </span>

                                                        <select
                                                            aria-label={
                                                                `Skill level for ${sport.sport_name}`
                                                            }
                                                            value={sport.playing_level}
                                                            onChange={(event) =>
                                                                handleSkillLevelChange(
                                                                    sport.sport_id,
                                                                    event.target.value
                                                                )
                                                            }
                                                        >
                                                            <option value="Beginner">
                                                                Beginner
                                                            </option>

                                                            <option value="Intermediate">
                                                                Intermediate
                                                            </option>

                                                            <option value="Advanced">
                                                                Advanced
                                                            </option>
                                                        </select>

                                                        <button
                                                            type="button"
                                                            className="remove-sport-btn"
                                                            onClick={() =>
                                                                handleRemoveSport(sport.sport_id)
                                                            }
                                                            aria-label={
                                                                `Remove ${sport.sport_name}`
                                                            }
                                                            title="Remove sport"
                                                        >
                                                            ×
                                                        </button>

                                                    </div>

                                                ))

                                            )}

                                        </div>

                                        {/* Add another sport */}
                                        <div className="add-sport-row">

                                            <select
                                                aria-label="Choose a sport to add"
                                                value={selectedSportId}
                                                onChange={(event) => {
                                                    setSelectedSportId(event.target.value);
                                                    setSportsError("");
                                                }}
                                            >
                                                <option value="">
                                                    Select a sport
                                                </option>

                                                {availableSports
                                                    .filter(
                                                        (sport) =>
                                                            !userSports.some(
                                                                (selected) =>
                                                                    selected.sport_id === sport.id
                                                            )
                                                    )
                                                    .map((sport) => (

                                                        <option
                                                            key={sport.id}
                                                            value={sport.id}
                                                        >
                                                            {sport.name}
                                                        </option>

                                                    ))
                                                }

                                            </select>

                                            <select
                                                aria-label="Skill level for new sport"
                                                value={newSkillLevel}
                                                onChange={(event) =>
                                                    setNewSkillLevel(event.target.value)
                                                }
                                            >
                                                <option value="Beginner">
                                                    Beginner
                                                </option>

                                                <option value="Intermediate">
                                                    Intermediate
                                                </option>

                                                <option value="Advanced">
                                                    Advanced
                                                </option>
                                            </select>

                                            <button
                                                type="button"
                                                className="add-sport-btn"
                                                onClick={handleAddSport}
                                                disabled={!selectedSportId}
                                            >
                                                + Add
                                            </button>

                                        </div>

                                    </>

                                )}

                                {sportsError && (
                                    <p className="sports-error" role="alert">
                                        {sportsError}
                                    </p>
                                )}

                            </div>

                        </div>

                        {/* Form actions */}
                        <div className="profile-form-actions">

                            <button
                                type="button"
                                className="cancel-btn"
                                onClick={handleCancel}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="save-profile-btn"
                                disabled={sportsSaving || sportsLoading}
                            >
                                {sportsSaving ? "Saving..." : "Save Changes"}
                            </button>

                        </div>
                    </form>

                </section>

            ) : (

                /* ================= VIEW MODE ================= */

                <>

                    {/* Profile identity */}
                    <section className="profile-identity-card">

                        <div className="profile-avatar">
                            {fullName
                                ? fullName.charAt(0).toUpperCase()
                                : "?"}
                        </div>

                        <div className="profile-identity-details">

                            <h2>{fullName || "Player"}</h2>

                            <p className="profile-email">
                                {user.email}
                            </p>

                            {(user.area || user.city) && (
                                <p className="profile-location">
                                    <span aria-hidden="true">⌖</span>

                                    {[user.area, user.city]
                                        .filter(Boolean)
                                        .join(", ")}
                                </p>
                            )}

                            <div className="profile-member-label">
                                <span className="status-dot"></span>
                                PlayBuddy member
                            </div>

                        </div>

                    </section>

                    {/* Activity dashboard */}
                    <section className="profile-dashboard">

                        {/* Meetup count */}
                        <article className="profile-stat-card meetup-card" onClick={() => navigate("/meetup-history")}>

                            <div className="stat-card-top">
                                <span className="stat-icon">
                                    🏸
                                </span>

                                <span className="stat-label">
                                    YOUR ACTIVITY
                                </span>
                            </div>

                            <h2 className="stat-number">
                                {user.meetup_count ?? 0}
                            </h2>

                            <p className="stat-title">
                                Meetups
                            </p>

                            <p className="stat-description">
                                Your sports journey, one game at a time.
                            </p>

                        </article>

                        {/* Buddy count */}
                        <article className="profile-stat-card buddy-card" onClick={() => navigate("/connections")}>

                            <div className="stat-card-top">
                                <span className="stat-icon">
                                    🤝
                                </span>

                                <span className="stat-label">
                                    YOUR COMMUNITY
                                </span>
                            </div>

                            <h2 className="stat-number">
                                {connectionsLoading ? "..." : connectionCount}
                            </h2>

                            <p className="stat-title">
                                Buddies
                            </p>

                            <p className="stat-description">
                                Players you've connected with on PlayBuddy.
                            </p>

                        </article>

                        {/* Review statistics */}
                        <article className="profile-stat-card review-card">

                            <div className="stat-card-top">
                                <span className="stat-icon">
                                    ◉
                                </span>

                                <span className="stat-label">
                                    COMMUNITY FEEDBACK
                                </span>
                            </div>

                            <h3 className="review-card-title">
                                Player reviews
                            </h3>

                            {reviewsLoading ? (

                                <p>Loading review statistics...</p>

                            ) : reviewsError ? (

                                <p>{reviewsError}</p>

                            ) : totalReviews > 0 ? (

                                <div className="review-chart-layout">

                                    {/* Doughnut chart */}
                                    <div
                                        className="review-doughnut"
                                        style={{
                                            "--positive":
                                                `${reviews.positive / totalReviews * 100}%`,

                                            "--neutral":
                                                `${reviews.neutral / totalReviews * 100}%`,
                                        }}
                                        role="img"
                                        aria-label={
                                            `${totalReviews} reviews: ` +
                                            `${reviews.positive} positive, ` +
                                            `${reviews.neutral} neutral, ` +
                                            `${reviews.negative} negative`
                                        }
                                    >
                                        <div className="doughnut-center">

                                            <strong>
                                                {totalReviews}
                                            </strong>

                                            <span>
                                                reviews
                                            </span>

                                        </div>
                                    </div>

                                    {/* Chart legend */}
                                    <div className="review-legend">

                                        <div className="legend-item">
                                            <span className="legend-dot positive-dot"></span>

                                            <span>Positive</span>

                                            <strong>
                                                {reviews.positive}
                                            </strong>
                                        </div>

                                        <div className="legend-item">
                                            <span className="legend-dot neutral-dot"></span>

                                            <span>Neutral</span>

                                            <strong>
                                                {reviews.neutral}
                                            </strong>
                                        </div>

                                        <div className="legend-item">
                                            <span className="legend-dot negative-dot"></span>

                                            <span>Negative</span>

                                            <strong>
                                                {reviews.negative}
                                            </strong>
                                        </div>

                                    </div>

                                </div>

                            ) : (

                                <div className="empty-reviews">
                                    <p>No reviews yet.</p>

                                    <span>
                                        Your review statistics will appear here.
                                    </span>
                                </div>

                            )}

                        </article>

                    </section>

                    {/* About me */}
                    <section className="profile-about-card">

                        <div className="section-heading">

                            <p className="profile-eyebrow">
                                GET TO KNOW ME
                            </p>

                            <h2>About me</h2>

                        </div>

                        {user.bio ? (

                            <p className="profile-bio">
                                {user.bio}
                            </p>

                        ) : (

                            <div className="empty-bio">

                                <span className="empty-bio-icon">
                                    ✎
                                </span>

                                <div>
                                    <h3>Your story starts here.</h3>

                                    <p>
                                        Tell other players about yourself,
                                        your interests, and the games you love.
                                    </p>
                                </div>

                            </div>

                        )}

                    </section>

                </>
            )}

        </main>
    );
}

export default Profile;