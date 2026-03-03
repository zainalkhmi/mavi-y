import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState('guest');
    const [loading, setLoading] = useState(false);

    const signIn = async (email, password, role = 'admin') => {
        return { data: { user }, error: null };
    };

    const signUp = async (email, password) => {
        return { data: { user }, error: null };
    };

    const signOut = async () => {
        setUser(null);
        setUserRole('guest');
    };

    const adminLogin = (password) => {
        if (!password || !String(password).trim()) return false;
        setUser({ id: 'local-admin', email: 'admin@mavi.app' });
        setUserRole('admin');
        return true;
    };

    const value = {
        session: user ? { user } : null,
        user,
        userRole,
        roleError: null,
        signIn,
        signUp,
        signOut,
        adminLogin,
        refreshRole: () => { },
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
