import { Link } from "react-router-dom";
import "../styles/global.css";
import "../styles/Home.css";

function Home() {
    return (
        <div className="home-page">

            {/* ================= HERO SECTION ================= */}

            <section className="home-hero">

                <div className="hero-content">

                    <span className="hero-badge">
                        <span className="badge-dot"></span>
                        YOUR GAME. YOUR PEOPLE.
                    </span>

                    <h1>
                        Good games.
                        <br />
                        <span>Great buddies.</span>
                    </h1>

                    <p className="hero-description">
                        Love playing sports but tired of asking everyone
                        if they're free?

                        <br />

                        Find your people, discover local games, and turn
                        free time into game time.
                    </p>

                    <div className="hero-actions">
                        <Link
                            to="/explore"
                            className="hero-primary-btn"
                        >
                            Find Players <span>→</span>
                        </Link>
                    </div>

                    <p className="hero-tagline">
                        ⚡ Less scrolling. More playing.
                    </p>

                </div>


                {/* ANIMATED SPORTS ILLUSTRATION */}

                <div className="hero-visual">

                    <div className="sports-orbit orbit-one"></div>
                    <div className="sports-orbit orbit-two"></div>
                    <div className="sports-orbit orbit-three"></div>

                    <div className="main-sport-icon">
                        🏸
                    </div>

                    <div className="floating-sport sport-football">
                        ⚽
                    </div>

                    <div className="floating-sport sport-basketball">
                        🏀
                    </div>

                    <div className="floating-sport sport-tennis">
                        🎾
                    </div>

                    <div className="floating-sport sport-volleyball">
                        🏐
                    </div>

                    <div className="floating-note note-top">
                        <span className="note-icon">🎯</span>

                        <div>
                            <strong>Find your match</strong>
                            <small>Your next teammate awaits.</small>
                        </div>
                    </div>

                    <div className="floating-note note-bottom">
                        <span className="note-icon">✓</span>

                        <div>
                            <strong>Game on!</strong>
                            <small>Make every game count.</small>
                        </div>
                    </div>

                </div>

            </section>


            {/* ================= INTRODUCTION ================= */}

            <section className="home-intro">

                <div className="section-heading">
                    <span className="section-eyebrow">
                        SO, WHAT IS PLAYBUDDY?
                    </span>

                    <h2>
                        Your sport.
                        <span> Your people.</span>
                    </h2>

                    <p>
                        PlayBuddy helps you find people who enjoy the
                        same sports as you. Discover players, build
                        connections, and make plans to play together.
                    </p>
                </div>


                <div className="feature-grid">

                    {/* FEATURE 1 */}

                    <article className="feature-card">

                        <div className="feature-icon">
                            🏃
                        </div>

                        <h3>Find your people</h3>

                        <p>
                            Discover players based on their sports,
                            skill levels, and location. Your next
                            teammate might be closer than you think.
                        </p>

                        <Link
                            to="/explore"
                            className="feature-link"
                        >
                            Explore players <span>→</span>
                        </Link>

                    </article>


                    {/* FEATURE 2 */}

                    <article className="feature-card">

                        <div className="feature-icon">
                            🤝
                        </div>

                        <h3>Build your circle</h3>

                        <p>
                            Send connection requests, meet fellow
                            players, and grow your sports community.
                            Friendship is a bonus. Good teamwork too.
                        </p>

                        <Link
                            to="/connections"
                            className="feature-link"
                        >
                            Meet players <span>→</span>
                        </Link>

                    </article>


                    {/* FEATURE 3 */}

                    <article className="feature-card">

                        <div className="feature-icon">
                            📅
                        </div>

                        <h3>Make game plans</h3>

                        <p>
                            Discover meetups and find opportunities
                            to play together. Because "we should play
                            sometime" deserves an actual date.
                        </p>

                        <Link
                            to="/meetups"
                            className="feature-link"
                        >
                            Explore meetups <span>→</span>
                        </Link>

                    </article>

                </div>

            </section>


            {/* ================= PLAYBUDDY PHILOSOPHY ================= */}

            <section className="home-philosophy">

                <div className="philosophy-heading">

                    <span className="section-eyebrow">
                        A FRIENDLY REMINDER
                    </span>

                    <h2>
                        Life's better
                        <br />
                        <span>outside the group chat.</span>
                    </h2>

                    <p>
                        You don't need to be a professional athlete.
                        You don't need a perfect game plan.
                        You just need people willing to show up.
                    </p>

                </div>


                <div className="funny-points">

                    <div className="funny-point">
                        <span>01</span>

                        <p>
                            <strong>Less scrolling. More playing.</strong>
                            <br />
                            Your screen time can survive a little competition.
                        </p>
                    </div>

                    <div className="funny-point">
                        <span>02</span>

                        <p>
                            <strong>Skills are welcome. Beginners too.</strong>
                            <br />
                            Everyone starts somewhere. Even the person
                            who eventually beats you.
                        </p>
                    </div>

                    <div className="funny-point">
                        <span>03</span>

                        <p>
                            <strong>Plans that leave the group chat.</strong>
                            <br />
                            "Let's play tomorrow" is not a calendar event.
                        </p>
                    </div>

                    <div className="funny-point">
                        <span>04</span>

                        <p>
                            <strong>Good sports. Better company.</strong>
                            <br />
                            Play hard, respect everyone, and remember
                            it's a game.
                        </p>
                    </div>

                </div>

            </section>


            {/* ================= FINAL MESSAGE ================= */}

            <section className="home-ending">

                <div className="ending-icon">
                    🏸
                </div>

                <h2>
                    Your next game
                    <span> starts with a hello.</span>
                </h2>

                <p>
                    Somewhere nearby, someone is looking for a teammate.
                    Make it easier for them to find you.
                </p>

                <span className="ending-tagline">
                    Find your people. Play your game.
                </span>

                <button
                    type="button"
                    className="back-to-top"
                    onClick={() => {
                        window.scrollTo({
                            top: 0,
                            behavior: "smooth"
                        });
                    }}
                >
                    <span aria-hidden="true">↑</span>
                    Back to top
                </button>

            </section>

        </div>
    );
}

export default Home;