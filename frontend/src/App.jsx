import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import AppLayout from "./AppLayout/AppLayout";

import Registration from "./pages/Registration";
import Login from "./pages/Login";

import Home from "./pages/Home";
import Explore from "./pages/explore";
import Meetups from "./pages/Meetups";
import Profile from "./pages/Profile";
import Connections from "./pages/connections";
import Meetup_history from "./pages/meetup-history";
import PublicProfile from "./pages/PublicProfile";

import PublicRoute from "./session/PublicRoute";
import ProtectedRoute from "./session/ProtectedRoute";

import AuthProvider from "./session/AuthProvider";

function App() {
  return (
    <AuthProvider>

      <BrowserRouter>

        <Routes>

          <Route element={<PublicRoute />}>
            <Route path="/registration" element={<Registration />} />
            <Route path="/login" element={<Login />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>

              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/meetups" element={<Meetups />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/connections" element={<Connections />} />
              <Route path="/meetup-history" element={<Meetup_history />} />
              <Route path="/players/:playerId" element={<PublicProfile />}/>
            </Route>
          </Route>

        </Routes>

      </BrowserRouter>

    </AuthProvider>
  );
}

export default App;