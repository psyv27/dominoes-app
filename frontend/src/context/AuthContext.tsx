import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    // Initialize user synchronously to prevent early redirects on refresh
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Here we could fetch /me from the backend if we have a token
    }, []);

    const login = async (username, password) => {
        try {
            const res = await fetch('http://localhost:5001/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
                return { success: true };
            } else if (res.status === 403 && data.error === 'pending_verification') {
                return { success: false, pending_verification: true, error: data.error, email: data.email };
            } else {
                return { success: false, error: data.error };
            }
        } catch (err) {
            return { success: false, error: 'Network error' };
        }
    };

    const register = async (email, username, password, nickname) => {
        try {
            const res = await fetch('http://localhost:5001/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password, nickname })
            });

            const data = await res.json();
            if (res.status === 202 && data.status === 'pending_verification') {
                return { success: true, pending_verification: true, email: data.email };
            } else if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (err) {
            return { success: false, error: 'Network error' };
        }
    };

    const verifyOtp = async (email, otp) => {
        try {
            const res = await fetch('http://localhost:5001/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (err) {
            return { success: false, error: 'Network error' };
        }
    };

    const forgotPassword = async (email) => {
        try {
            const res = await fetch('http://localhost:5001/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            return res.ok ? { success: true } : { success: false, error: data.error };
        } catch (err) {
            return { success: false, error: 'Network error' };
        }
    };

    const resetPassword = async (email, otp, newPassword) => {
        try {
            const res = await fetch('http://localhost:5001/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword })
            });
            const data = await res.json();
            return res.ok ? { success: true } : { success: false, error: data.error };
        } catch (err) {
            return { success: false, error: 'Network error' };
        }
    };

    const playAsGuest = async () => {
        let deviceId = localStorage.getItem('guest_device_id');
        if (!deviceId) {
            deviceId = crypto.randomUUID ? crypto.randomUUID() : 'guest_' + Math.random().toString(36).substring(2);
            localStorage.setItem('guest_device_id', deviceId);
        }

        try {
            const res = await fetch('http://localhost:5001/auth/guest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device_id: deviceId })
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
            } else {
                console.error("Guest login failed:", data.error);
            }
        } catch (err) {
            console.error('Network error during guest login');
        }
    };

    const updateUser = (updates: any) => {
        setUser((prev: any) => {
            if (!prev) return null;
            const nextUser = { ...prev, ...updates };
            localStorage.setItem('user', JSON.stringify(nextUser));
            return nextUser;
        });
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ 
            user, loading, login, register, verifyOtp, 
            forgotPassword, resetPassword, playAsGuest, logout, updateUser 
        }}>
            {children}
        </AuthContext.Provider>
    );
};
