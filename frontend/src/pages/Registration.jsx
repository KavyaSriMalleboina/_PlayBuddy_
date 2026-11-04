import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import "../styles/global.css";
import "../styles/Registration.css";

function Registration() {

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        age: "",
        gender: "",
        email: "",
        phone: "",
        password: "",
        confirm_password: "",
        country: "",
        state: "",
        city: "",
        area: "",
        sports: {
            cricket: "",
            football: "",
            basketball: "",
            badminton: "",
            tennis: "",
            volleyball: "",
            table_tennis: "",
            other: ""
        }
    });

    const sports = [
        "cricket",
        "football",
        "basketball",
        "badminton",
        "tennis",
        "volleyball",
        "table_tennis",
        "other"
    ];

    const handleSportChange = (e) => {
        const { name, checked } = e.target;

        setFormData({
            ...formData,
            sports: {
                ...formData.sports,
                [name]: checked ? "beginner" : ""
            }
        });
    };

    const handleLevelChange = (e) => {
        const { name, value } = e.target;

        setFormData({
            ...formData,
            sports: {
                ...formData.sports,
                [name]: value
            }
        });
    };

    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Frontend validation
        if (formData.password !== formData.confirm_password) {
            alert("Passwords do not match");
            return;
        }

        const response = await apiFetch("auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            alert("Registration successful! Login using your credentials");
            navigate("/login");
        }

    };


    return (
        <main className="registration-page">

            <div className="registration-container">

                {/* Branding */}
                <div className="registration-brand">

                    <div className="registration-brand-icon">
                        {/* Replace with your actual PlayBuddy logo if available */}
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

                    <h1 className="registration-brand-text">
                        <span>Play</span><strong>Buddy</strong>
                    </h1>

                </div>

                {/* Page heading */}
                <div className="registration-heading">

                    <p className="registration-eyebrow">
                        FIND YOUR PEOPLE
                    </p>

                    <h2>Create your account</h2>

                    <p>
                        Meet players. Discover sports. Get out and play.
                    </p>

                </div>

                {/* Registration form */}
                <form
                    className="credentials registration-form"
                    onSubmit={handleSubmit}
                >

                    {/* Personal information */}
                    <section className="registration-section">

                        <div className="registration-section-heading">
                            <span className="registration-step">01</span>

                            <div>
                                <h3>Personal information</h3>
                                <p>Tell us a little about yourself.</p>
                            </div>
                        </div>

                        <div className="registration-grid">

                            <div className="registration-field">
                                <label htmlFor="first_name">
                                    First name
                                </label>

                                <input
                                    type="text"
                                    id="first_name"
                                    name="first_name"
                                    placeholder="Ex: Steve"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    autoComplete="given-name"
                                    required
                                />
                            </div>

                            <div className="registration-field">
                                <label htmlFor="last_name">
                                    Last name
                                </label>

                                <input
                                    type="text"
                                    id="last_name"
                                    name="last_name"
                                    placeholder="Ex: Harrington"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    autoComplete="family-name"
                                    required
                                />
                            </div>

                            <div className="registration-field">
                                <label htmlFor="age">Age</label>

                                <input
                                    type="number"
                                    id="age"
                                    name="age"
                                    placeholder="18"
                                    min="13"
                                    max="100"
                                    value={formData.age}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="registration-field">
                                <label htmlFor="gender">Gender</label>

                                <select
                                    id="gender"
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                    <option value="prefer_not_to_say">
                                        Prefer not to say
                                    </option>
                                </select>
                            </div>

                        </div>
                    </section>

                    {/* Contact and account */}
                    <section className="registration-section">

                        <div className="registration-section-heading">
                            <span className="registration-step">02</span>

                            <div>
                                <h3>Contact & account</h3>
                                <p>Set up your account credentials.</p>
                            </div>
                        </div>

                        <div className="registration-grid">

                            <div className="registration-field registration-full-width">
                                <label htmlFor="email">Email address</label>

                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    autoComplete="email"
                                    required
                                />
                            </div>

                            <div className="registration-field registration-full-width">
                                <label htmlFor="phone">Phone number</label>

                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    placeholder="9876543210"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    autoComplete="tel"
                                    required
                                />
                            </div>

                            <div className="registration-field">
                                <label htmlFor="password">Password</label>

                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    placeholder="Create a password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>

                            <div className="registration-field">
                                <label htmlFor="confirm_password">
                                    Confirm password
                                </label>

                                <input
                                    type="password"
                                    id="confirm_password"
                                    name="confirm_password"
                                    placeholder="Re-enter password"
                                    value={formData.confirm_password}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>

                        </div>
                    </section>

                    {/* Location */}
                    <section className="registration-section">

                        <div className="registration-section-heading">
                            <span className="registration-step">03</span>

                            <div>
                                <h3>Your location</h3>
                                <p>
                                    Help nearby players discover you.
                                </p>
                            </div>
                        </div>

                        <div className="registration-grid">

                            <div className="registration-field">
                                <label htmlFor="country">Country</label>

                                <input
                                    type="text"
                                    id="country"
                                    name="country"
                                    placeholder="Ex: India"
                                    value={formData.country}
                                    onChange={handleChange}
                                    autoComplete="country-name"
                                    required
                                />
                            </div>

                            <div className="registration-field">
                                <label htmlFor="state">State</label>

                                <input
                                    type="text"
                                    id="state"
                                    name="state"
                                    placeholder="Ex: Telangana"
                                    value={formData.state}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="registration-field">
                                <label htmlFor="city">City</label>

                                <input
                                    type="text"
                                    id="city"
                                    name="city"
                                    placeholder="Ex: Hyderabad"
                                    value={formData.city}
                                    onChange={handleChange}
                                    autoComplete="address-level2"
                                    required
                                />
                            </div>

                            <div className="registration-field">
                                <label htmlFor="area">
                                    Area / Landmark
                                </label>

                                <input
                                    type="text"
                                    id="area"
                                    name="area"
                                    placeholder="Ex: Vastunagar"
                                    value={formData.area}
                                    onChange={handleChange}
                                    autoComplete="street-address"
                                    required
                                />
                            </div>

                        </div>
                    </section>

                    {/* Sports preferences */}
                    <section className="registration-section registration-sports-section">

                        <div className="registration-section-heading">
                            <span className="registration-step">04</span>

                            <div>
                                <h3>Sports you play</h3>
                                <p>
                                    Select your sports and experience level.
                                </p>
                            </div>
                        </div>

                        <div className="registration-sports-list">

                            {sports.map((sport) => (
                                <div
                                    className="registration-sport-row"
                                    key={sport}
                                >

                                    <label className="registration-sport-label">

                                        <input
                                            type="checkbox"
                                            name={sport}
                                            checked={
                                                formData.sports[sport] !== ""
                                            }
                                            onChange={handleSportChange}
                                        />

                                        <span>
                                            {sport.replace("_", " ")}
                                        </span>

                                    </label>

                                    <select
                                        name={sport}
                                        aria-label={`${sport.replace("_", " ")} skill level`}
                                        value={formData.sports[sport]}
                                        onChange={handleLevelChange}
                                        disabled={
                                            formData.sports[sport] === ""
                                        }
                                    >
                                        <option value="">
                                            Select level
                                        </option>

                                        <option value="beginner">
                                            Beginner
                                        </option>

                                        <option value="intermediate">
                                            Intermediate
                                        </option>

                                        <option value="advanced">
                                            Advanced
                                        </option>
                                    </select>

                                </div>
                            ))}

                        </div>

                        <p className="registration-sports-note">
                            Choose all the sports you're interested in.
                        </p>

                    </section>

                    {/* Submit */}
                    <div className="registration-submit-area">

                        <button
                            type="submit"
                            className="registration-submit-btn"
                        >
                            Create Account
                            <span aria-hidden="true">→</span>
                        </button>

                        <p>
                            Already have an account?{" "}
                            <Link to="/login">
                                Login
                            </Link>
                        </p>

                    </div>

                </form>

                <div className="registration-footer">
                    <span></span>
                    <p>
                        Better games start with better connections.
                    </p>
                </div>

            </div>

        </main>
    );

}

export default Registration;