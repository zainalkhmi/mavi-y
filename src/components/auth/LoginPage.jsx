import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Mail, Lock, LogIn, CheckCircle2, UserCircle } from 'lucide-react';

const LoginPage = () => {
    const { signIn } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState('drafter');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const from = location.state?.from?.pathname || "/";

    const roles = [
        { id: 'admin', label: 'Admin', description: 'Full System Access', icon: <Shield size={20} /> },
        { id: 'drafter', label: 'Drafter', description: 'Create & Edit Manuals', icon: <UserCircle size={20} /> },
        { id: 'checker', label: 'Checker', description: 'Review Work Instructions', icon: <CheckCircle2 size={20} /> },
        { id: 'approval', label: 'Approval', description: 'Release & Approve', icon: <LogIn size={20} /> }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const result = await signIn(email, password, selectedRole);
        if (result.error) {
            setError('Login failed. Please check your credentials.');
        } else {
            navigate(from, { replace: true });
        }
        setIsLoading(false);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top left, #1a1a2e 0%, #0f0f1a 100%)',
            padding: '20px',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Ambient Background Glows */}
            <div style={{
                position: 'fixed',
                top: '-10%',
                left: '-10%',
                width: '40%',
                height: '40%',
                background: 'rgba(59, 130, 246, 0.1)',
                filter: 'blur(100px)',
                borderRadius: '50%',
                zIndex: 0
            }} />
            <div style={{
                position: 'fixed',
                bottom: '-10%',
                right: '-10%',
                width: '40%',
                height: '40%',
                background: 'rgba(139, 92, 246, 0.1)',
                filter: 'blur(100px)',
                borderRadius: '50%',
                zIndex: 0
            }} />

            <div style={{
                width: '100%',
                maxWidth: '480px',
                zIndex: 1,
                animation: 'fadeInUp 0.8s ease-out'
            }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '24px',
                    padding: '48px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '64px',
                            height: '64px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            borderRadius: '16px',
                            marginBottom: '20px',
                            boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)'
                        }}>
                            <Shield size={32} color="white" />
                        </div>
                        <h1 style={{
                            fontSize: '2rem',
                            fontWeight: '800',
                            color: '#ffffff',
                            margin: '0 0 8px 0',
                            letterSpacing: '-0.025em'
                        }}>MAVi Portal</h1>
                        <p style={{
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: '1rem',
                            margin: 0
                        }}>Secure access to motion analysis</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ color: '#e5e7eb', fontSize: '0.875rem', fontWeight: '500' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px 14px 48px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        color: '#ffffff',
                                        fontSize: '1rem',
                                        transition: 'all 0.2s ease',
                                        outline: 'none'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ color: '#e5e7eb', fontSize: '0.875rem', fontWeight: '500' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px 14px 48px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        color: '#ffffff',
                                        fontSize: '1rem',
                                        transition: 'all 0.2s ease',
                                        outline: 'none'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <label style={{ color: '#e5e7eb', fontSize: '0.875rem', fontWeight: '500' }}>Select Access Role</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {roles.map((role) => (
                                    <div
                                        key={role.id}
                                        onClick={() => setSelectedRole(role.id)}
                                        style={{
                                            padding: '12px',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            border: '1px solid',
                                            borderColor: selectedRole === role.id ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)',
                                            background: selectedRole === role.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <div style={{ color: selectedRole === role.id ? '#3b82f6' : 'rgba(255, 255, 255, 0.4)' }}>
                                                {role.icon}
                                            </div>
                                            <span style={{ color: '#ffffff', fontSize: '0.875rem', fontWeight: '600' }}>{role.label}</span>
                                        </div>
                                        <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.7rem', margin: 0 }}>{role.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div style={{
                                padding: '12px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '8px',
                                color: '#ef4444',
                                fontSize: '0.875rem',
                                textAlign: 'center'
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                marginTop: '8px',
                                padding: '14px',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#ffffff',
                                fontSize: '1rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            {isLoading ? 'Authenticating...' : (
                                <>
                                    <span>Sign In</span>
                                    <LogIn size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p style={{
                    textAlign: 'center',
                    marginTop: '24px',
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '0.875rem'
                }}>
                    Role-based access powered by MAVi Identity
                </p>
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default LoginPage;
