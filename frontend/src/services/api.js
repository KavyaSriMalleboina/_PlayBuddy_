const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiFetch(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        credentials: "include",
        ...options
    });

    return response;
}