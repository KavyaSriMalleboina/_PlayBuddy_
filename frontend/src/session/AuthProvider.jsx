import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../services/api";

const AuthContext = createContext(null);

function AuthProvider({ children }) {

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuthentication = async () => {

        try {

            const response = await apiFetch(
                "users/current",
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
            }
            else {
                setUser(null);
            }

        }
        catch (error) {
            console.error("Authentication check failed:", error);
            setUser(null);
        }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuthentication();
    }, []);

    const logout = async () => {

    try {

        await apiFetch(
            "auth/logout",
            {
                method: "POST",
                credentials: "include"
            }
        );

    }
    catch (error) {

        console.error("Logout failed:", error);

    }
    finally {

        setUser(null);
    }
};

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                loading,
                checkAuthentication,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

export default AuthProvider;