import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthProvider";


function PublicRoute() {

    const { user, loading } = useAuth();

    if (loading) {
        return <p>Loading...</p>;
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}


export default PublicRoute;