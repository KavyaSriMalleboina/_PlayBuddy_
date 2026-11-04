# PlayBuddy 🏸⚽🏀🎾

**PlayBuddy** is a full-stack sports networking and meetup platform designed to connect athletes and recreational players. Find local games, discover players matching your skill level, organize meetups, and expand your sports network.

---

## 🚀 Features

- **User Authentication**: Secure signup and login powered by Argon2 password hashing and JWT access tokens.
- **Custom Player Profiles**: Manage your sports, skill levels, locations, and personal bios.
- **Player Discovery & Exploration**: Search and filter players by sport, skill level, and location.
- **Connection System**: Send, accept, or manage connection requests with fellow players.
- **Meetup Organizing & Invitations**: Create game sessions, invite connections, track responses, and manage participant rosters.
- **Meetup Lifecycle & History**: Automated meetup lifecycle reconciler with historical match outcomes and participant reviews.
- **Modular Design**: Cleanly partitioned styles and modular component architecture.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- **ORM**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/)
- **Database**: [PostgreSQL 16](https://www.postgresql.org/)
- **Security**: [pwdlib (Argon2)](https://github.com/frankie567/pwdlib) & [PyJWT](https://pyjwt.readthedocs.io/)
- **Validation**: [Pydantic v2](https://docs.pydantic.dev/) & [email-validator](https://github.com/JoshData/python-email-validator)

### Frontend
- **Library**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Styling**: Scoped, modular CSS architecture (`frontend/src/styles/`)

### Infrastructure & DevOps
- **Containerization**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- **Web Server / Reverse Proxy**: [Nginx](https://www.nginx.com/)

---

## 📁 Project Structure

```text
playbuddy/
├── .env.example                  # Environment configuration template
├── .gitignore                    # Git ignore specifications
├── docker-compose.yml            # Multi-container orchestration (DB, API, Web)
├── README.md                     # Project documentation
│
├── backend/
│   ├── Dockerfile                # Backend container build instructions
│   ├── requirements.txt          # Python dependencies
│   └── app/
│       ├── core/                 # Security, tokens, and dependencies
│       ├── db/                   # Database engine and base models
│       ├── models/               # SQLAlchemy ORM models
│       ├── routes/               # API route handlers
│       ├── schemas/              # Pydantic request/response schemas
│       ├── services/             # Background services (meetup reconciler)
│       └── main.py               # FastAPI application entry point
│
├── frontend/
│   ├── Dockerfile                # Multi-stage frontend container (Node + Nginx)
│   ├── nginx.conf                # Nginx SPA fallback configuration
│   ├── package.json              # NPM dependencies & scripts
│   ├── index.html                # HTML template
│   └── src/
│       ├── App.jsx               # Application route definitions
│       ├── main.jsx              # Client entry point
│       ├── components/           # Reusable UI components (Navigation, PlayerCard)
│       ├── pages/                # Route pages (Home, Login, Profile, etc.)
│       ├── services/             # API client utilities
│       ├── session/              # Authentication context & route guards
│       └── styles/               # Modular page & global stylesheets
│
└── ml/                           # Future Machine Learning modules
    ├── recommendation/           # Matchmaking recommendations
    └── sentiment/                # Player review sentiment analysis
```

---

## 🏁 Getting Started

### 1. Prerequisites
- [Git](https://git-scm.com/)
- [Python 3.11+](https://www.python.org/)
- [Node.js 20+](https://nodejs.org/) & `npm`
- [PostgreSQL](https://www.postgresql.org/) (or [Docker Desktop](https://www.docker.com/products/docker-desktop/))

---

### 2. Quickstart with Docker Compose (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/playbuddy.git
   cd playbuddy
   ```

2. **Copy environment template**:
   ```bash
   cp .env.example .env
   ```

3. **Start services**:
   ```bash
   docker compose up --build
   ```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- PostgreSQL: `localhost:5432`

---

### 3. Manual Local Setup

#### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure `.env` in the project root:
   ```env
   DB_URL=postgresql://<user>:<password>@localhost:5432/<database_name>
   SECRET_KEY=your_generated_secret_key
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   ```

5. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Verify `frontend/.env`:
   ```env
   VITE_API_BASE_URL="http://localhost:8000/"
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📖 API Documentation

Once the backend is running, explore the interactive API documentation at:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🔮 Roadmap

- [ ] Complete Public Player Profile page (`publicprofile.jsx`)
- [ ] Implement ML-driven Player Matchmaking & Suggestions (`ml/recommendation`)
- [ ] Review sentiment analysis for player reputations (`ml/sentiment`)
- [ ] In-app direct messaging between connected buddies
