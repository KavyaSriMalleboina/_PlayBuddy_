import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../session/AuthProvider";
import "../styles/Navigation.css";


function Navigation({ onLogout }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const closeMenu = () => setProfileOpen(false);

  const handleLogout = async () => {
    closeMenu();

    await logout();

    navigate("/login", { replace: true });

  };

  return (
    <nav className="pb-navbar">
      {/* BRAND */}
      <NavLink to="/" className="pb-brand">
        <div className="login-brand-icon">

          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect
              width="64"
              height="64"
              rx="18"
              fill="#103D2C"
            />

            {/* Stylized connected players */}
            <circle
              cx="24"
              cy="22"
              r="7"
              fill="#43C17C"
            />

            <circle
              cx="41"
              cy="22"
              r="7"
              fill="#F3FAF4"
            />

            <path
              d="M12 48C12 38.5 17.5 33 25 33C32.5 33 37 38.5 37 48"
              stroke="#43C17C"
              strokeWidth="6"
              strokeLinecap="round"
            />

            <path
              d="M29 48C29 38.5 34.5 33 42 33C46 33 49.5 35 52 39"
              stroke="#F3FAF4"
              strokeWidth="6"
              strokeLinecap="round"
            />

          </svg>

        </div>

        <span className="pb-brand-name">
          Play<span>Buddy</span>
        </span>
      </NavLink>

      {/* MAIN NAVIGATION */}
      <div className="pb-nav-links">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `pb-nav-link ${isActive ? "active" : ""}`
          }
        >
          Home
        </NavLink>

        <NavLink
          to="/explore"
          className={({ isActive }) =>
            `pb-nav-link ${isActive ? "active" : ""}`
          }
        >
          Explore Players
        </NavLink>

        <NavLink
          to="/meetups"
          className={({ isActive }) =>
            `pb-nav-link ${isActive ? "active" : ""}`
          }
        >
          Meetups
        </NavLink>
      </div>

      {/* PROFILE DROPDOWN */}
      <div className="pb-profile-container" ref={profileRef}>
        <button
          className={`pb-avatar-button ${profileOpen ? "open" : ""
            }`}
          onClick={() => setProfileOpen((prev) => !prev)}
          aria-label="Open profile menu"
          aria-expanded={profileOpen}
          aria-haspopup="true"
        >
          {/* Professional SVG avatar icon */}
          <svg
            viewBox="0 0 24 24"
            width="23"
            height="23"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
          </svg>
        </button>

        {profileOpen && (
          <div className="pb-profile-dropdown">
            <div className="pb-dropdown-heading">
              <span className="pb-dropdown-label">
                YOUR ACCOUNT
              </span>
            </div>

            <NavLink
              to="/profile"
              className="pb-dropdown-item"
              onClick={closeMenu}
            >
              <span className="pb-dropdown-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
                </svg>
              </span>

              <span>My Profile</span>
            </NavLink>

            <NavLink
              to="/connections"
              className="pb-dropdown-item"
              onClick={closeMenu}
            >
              <span className="pb-dropdown-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="8" r="3.5" />
                  <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
                  <path d="M16 5.5a3.5 3.5 0 0 1 0 6.8" />
                  <path d="M18 14a6 6 0 0 1 3.5 5.5" />
                </svg>
              </span>

              <span>Connections</span>
            </NavLink>

            <NavLink
              to="/meetup-history"
              className="pb-dropdown-item"
              onClick={closeMenu}
            >
              <span className="pb-dropdown-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M16 3v4M8 3v4M3 10h18" />
                  <path d="m9 15 2 2 4-4" />
                </svg>
              </span>

              <span>Meetup History</span>
            </NavLink>

            <div className="pb-dropdown-divider" />

            <button
              className="pb-dropdown-item pb-logout-item"
              onClick={handleLogout}
            >
              <span className="pb-dropdown-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                  <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
                </svg>
              </span>

              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navigation;