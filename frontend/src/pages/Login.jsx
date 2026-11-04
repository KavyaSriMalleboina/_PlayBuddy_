import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../session/AuthProvider";
import { apiFetch } from "../services/api";
import "../styles/global.css";
import "../styles/Login.css";


function Login() {
    const navigate = useNavigate();

    const { checkAuthentication } = useAuth();

    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    function handleChange(event) {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await apiFetch("auth/login", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                credentials: "include",

                body: JSON.stringify({
                    username: formData.username.trim(),
                    password: formData.password,
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    typeof data.detail === "string"
                        ? data.detail
                        : "Invalid username or password."
                );
            }

            // Fetch the authenticated user's details.
            await checkAuthentication();

            // Navigate to Home.
            navigate("/", { replace: true });

        } catch (error) {
            console.error("Login failed:", error);

            setError(
                error.message || "Unable to log in. Please try again."
            );

        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="login-page">

            <div className="login-container">

                {/* Branding */}
                <div className="login-brand">

                    {/* PlayBuddy icon */}
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

                    {/* Brand name */}
                    <h1 className="login-brand-text">
                        <span className="brand-play">Play</span>
                        <span className="brand-buddy">Buddy</span>
                    </h1>

                </div>

                {/* Heading */}
                <div className="login-heading">

                    <p className="login-eyebrow">
                        YOUR GAME. YOUR PEOPLE.
                    </p>

                    <h2>
                        Welcome back
                    </h2>

                    <p>
                        Find your people. Get back in the game.
                    </p>

                </div>

                {/* Login form */}
                <form
                    className="login-form"
                    onSubmit={handleSubmit}
                >

                    {/* Username */}
                    <div className="login-field">

                        <label htmlFor="login-username">
                            Username
                        </label>

                        <input
                            id="login-username"
                            type="text"
                            name="username"
                            placeholder="Enter your username"
                            value={formData.username}
                            onChange={handleChange}
                            autoComplete="username"
                            required
                            disabled={loading}
                        />

                    </div>

                    {/* Password */}
                    <div className="login-field">

                        <label htmlFor="login-password">
                            Password
                        </label>

                        <input
                            id="login-password"
                            type="password"
                            name="password"
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={handleChange}
                            autoComplete="current-password"
                            required
                            disabled={loading}
                        />

                    </div>

                    {/* Error message */}
                    {error && (
                        <div
                            className="login-error"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>

                </form>

                {/* Registration */}
                <div className="login-register">

                    <p>
                        Don't have an account?
                        {" "}

                        <Link to="/registration">
                            Sign up
                        </Link>
                    </p>

                </div>

                {/* Footer note */}
                <div className="login-footer">

                    <span className="login-footer-dot"></span>

                    <p>
                        Better games start with better connections.
                    </p>

                </div>

            </div>

        </main>
    );
}

export default Login;