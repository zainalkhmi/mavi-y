import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('mavi_user');
        return saved ? JSON.parse(saved) : { id: 'local-user', email: 'user@local.app' };
    });

    const [userRole, setUserRole] = useState(() => localStorage.getItem('mavi_user_role') || 'standard_user');
    const [loading, setLoading] = useState(false);

    const signIn = async () => ({ data: { user: { id: 'local' } }, error: null });
    const signUp = async () => ({ data: { user: { id: 'local' } }, error: null });
    const signOut = async () => {
        setUser(null);
        setUserRole(null);
        localStorage.removeItem('mavi_user');
        localStorage.removeItem('mavi_user_role');
    };

    const adminLogin = (password) => {
        if (password === 'b6434eju') {
            setUserRole('admin');
            localStorage.setItem('mavi_user_role', 'admin');
            return true;
        }
        return false;
    };

    const value = {
        session: { user: { id: 'local-user' } },
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
