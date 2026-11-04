import { Outlet } from "react-router-dom";

import Navigation from "../components/Navigation";

function AppLayout() {
  return (
    <div className="app">

      <Navigation/>

      <main className="content">
        <Outlet />
      </main>

    </div>
  );
}

export default AppLayout;