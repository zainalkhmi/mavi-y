import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    // Default to an admin user to bypass all login blocks
    const [user, setUser] = useState({ id: 'local-admin', email: 'admin@mavi.app' });
    const [userRole, setUserRole] = useState('admin');
    const [loading, setLoading] = useState(false);

    const signIn = async (email, password, role = 'admin') => {
        return { data: { user }, error: null };
    };

    const signUp = async (email, password) => {
        return { data: { user }, error: null };
    };

    const signOut = async () => {
        // Sign out does nothing in "no-login" mode
        console.log('Sign out disabled in this version');
    };

    const adminLogin = (password) => true;

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
