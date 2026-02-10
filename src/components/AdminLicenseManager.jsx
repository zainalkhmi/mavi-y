import React, { useState, useEffect } from 'react';
import {
    Key,
    Mail,
    Monitor,
    ShieldCheck,
    Search,
    Plus,
    Edit2,
    Trash2,
    Copy,
    CheckCircle,
    XCircle,
    Loader,
    Download,
    RefreshCw
} from 'lucide-react';
import {
    getAllLicenses,
    createLicense,
    updateLicense,
    deleteLicense,
    searchLicenses
} from '../utils/tursoAPI.js';
import { generateLicenseKey } from '../utils/licenseUtils.js';
import { getTursoStatus } from '../utils/tursoClient.js';
import { useDialog } from '../contexts/DialogContext.jsx';

function AdminLicenseManager() {
    const { showAlert, showConfirm } = useDialog();
    const [licenses, setLicenses] = useState([]);
    const [filteredLicenses, setFilteredLicenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [dbStatus, setDbStatus] = useState(null);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        machineId: ''
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        loadLicenses();
        checkDatabaseStatus();
    }, []);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredLicenses(licenses);
        } else {
            const filtered = licenses.filter(license =>
                license.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                license.key_string?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                license.machine_id?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredLicenses(filtered);
        }
    }, [searchQuery, licenses]);

    const checkDatabaseStatus = async () => {
        const status = await getTursoStatus();
        setDbStatus(status);
    };

    const loadLicenses = async () => {
        setLoading(true);
        try {
            const data = await getAllLicenses();
            setLicenses(data);
            setFilteredLicenses(data);
        } catch (error) {
            console.error('Failed to load licenses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateLicense = async () => {
        if (!formData.email) {
            await showAlert('Warning', 'Please enter an email address');
            return;
        }

        setIsGenerating(true);
        try {
            const newKey = generateLicenseKey(formData.machineId);
            await createLicense(newKey, formData.email, formData.machineId);

            await showAlert('Success', `License Generated Successfully!\n\nEmail: ${formData.email}\nKey: ${newKey}\n\nThe license has been saved to the database.`);

            setFormData({ email: '', machineId: '' });
            setShowForm(false);
            await loadLicenses();
        } catch (error) {
            console.error('Failed to generate license:', error);
            await showAlert('Error', 'Failed to generate license. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await updateLicense(id, { status: newStatus });
            await loadLicenses();
        } catch (error) {
            console.error('Failed to update license:', error);
            await showAlert('Error', 'Failed to update license status');
        }
    };

    const handleDelete = async (id) => {
        if (!await showConfirm('Delete License', 'Are you sure you want to delete this license?')) {
            return;
        }

        try {
            await deleteLicense(id);
            await loadLicenses();
        } catch (error) {
            console.error('Failed to delete license:', error);
            await showAlert('Error', 'Failed to delete license');
        }
    };

    const copyToClipboard = async (text) => {
        navigator.clipboard.writeText(text);
        await showAlert('Success', 'Copied to clipboard!');
    };

    const exportToCSV = () => {
        const headers = ['ID', 'Email', 'License Key', 'Machine ID', 'Status', 'Created At'];
        const rows = licenses.map(l => [
            l.id,
            l.email || '',
            l.key_string,
            l.machine_id || '',
            l.status,
            new Date(l.created_at).toLocaleString()
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `licenses_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div style={{ padding: '30px', height: '100%', overflowY: 'auto', backgroundColor: '#0a0a0a' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h2 style={{ color: 'white', fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Key size={32} color="#0078d4" />
                            License Key Management
                        </h2>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={loadLicenses}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#333',
                                    color: 'white',
                                    border: '1px solid #444',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: '600'
                                }}
                            >
                                <RefreshCw size={18} />
                                Refresh
                            </button>
                            <button
                                onClick={exportToCSV}
                                disabled={licenses.length === 0}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#0078d4',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: licenses.length === 0 ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: '600',
                                    opacity: licenses.length === 0 ? 0.5 : 1
                                }}
                            >
                                <Download size={18} />
                                Export CSV
                            </button>
                            <button
                                onClick={() => setShowForm(!showForm)}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: '600'
                                }}
                            >
                                <Plus size={18} />
                                Generate New License
                            </button>
                        </div>
                    </div>

                    {/* Database Status */}
                    {dbStatus && (
                        <div style={{
                            padding: '12px 16px',
                            backgroundColor: dbStatus.connected ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                            border: `1px solid ${dbStatus.connected ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 152, 0, 0.3)'}`,
                            borderRadius: '8px',
                            color: dbStatus.connected ? '#4CAF50' : '#FF9800',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginTop: '10px'
                        }}>
                            {dbStatus.connected ? <CheckCircle size={18} /> : <XCircle size={18} />}
                            <span><strong>Database:</strong> {dbStatus.mode} - {dbStatus.message}</span>
                        </div>
                    )}
                </div>

                {/* Generate Form */}
                {showForm && (
                    <div style={{
                        backgroundColor: '#1e1e1e',
                        padding: '30px',
                        borderRadius: '12px',
                        border: '1px solid #333',
                        marginBottom: '30px'
                    }}>
                        <h3 style={{ color: 'white', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShieldCheck size={24} color="#4CAF50" />
                            Generate New License Key
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ color: '#888', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                                    Email Address *
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} color="#666" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="user@example.com"
                                        style={{
                                            width: '100%',
                                            padding: '12px 12px 12px 40px',
                                            backgroundColor: '#0a0a0a',
                                            border: '1px solid #444',
                                            borderRadius: '8px',
                                            color: 'white',
                                            fontSize: '1rem'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ color: '#888', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                                    Machine ID (Optional - for hardware lock)
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Monitor size={18} color="#666" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        value={formData.machineId}
                                        onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
                                        placeholder="Leave empty for universal license"
                                        style={{
                                            width: '100%',
                                            padding: '12px 12px 12px 40px',
                                            backgroundColor: '#0a0a0a',
                                            border: '1px solid #444',
                                            borderRadius: '8px',
                                            color: 'white',
                                            fontSize: '1rem'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={handleGenerateLicense}
                                disabled={isGenerating || !formData.email}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: (isGenerating || !formData.email) ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    opacity: (isGenerating || !formData.email) ? 0.5 : 1
                                }}
                            >
                                {isGenerating ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Key size={18} />}
                                {isGenerating ? 'Generating...' : 'Generate License'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowForm(false);
                                    setFormData({ email: '', machineId: '' });
                                }}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: '#333',
                                    color: 'white',
                                    border: '1px solid #444',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Search Bar */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={20} color="#666" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by email, license key, or machine ID..."
                            style={{
                                width: '100%',
                                padding: '14px 14px 14px 45px',
                                backgroundColor: '#1e1e1e',
                                border: '1px solid #333',
                                borderRadius: '10px',
                                color: 'white',
                                fontSize: '1rem'
                            }}
                        />
                    </div>
                </div>

                {/* Licenses Table */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                        <Loader size={40} style={{ animation: 'spin 1s linear infinite', marginBottom: '20px' }} />
                        <p>Loading licenses...</p>
                    </div>
                ) : filteredLicenses.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px',
                        backgroundColor: '#1e1e1e',
                        borderRadius: '12px',
                        border: '1px solid #333'
                    }}>
                        <Key size={60} color="#333" style={{ marginBottom: '20px' }} />
                        <h3 style={{ color: '#666', marginBottom: '10px' }}>No Licenses Found</h3>
                        <p style={{ color: '#555' }}>
                            {searchQuery ? 'No licenses match your search query' : 'Generate your first license to get started'}
                        </p>
                    </div>
                ) : (
                    <div style={{
                        backgroundColor: '#1e1e1e',
                        borderRadius: '12px',
                        border: '1px solid #333',
                        overflow: 'hidden'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#111', borderBottom: '1px solid #333' }}>
                                    <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>EMAIL</th>
                                    <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>LICENSE KEY</th>
                                    <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>MACHINE ID</th>
                                    <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>STATUS</th>
                                    <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>CREATED</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLicenses.map((license, index) => (
                                    <tr key={license.id} style={{ borderBottom: index < filteredLicenses.length - 1 ? '1px solid #2a2a2a' : 'none' }}>
                                        <td style={{ padding: '16px', color: 'white' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Mail size={16} color="#0078d4" />
                                                {license.email || '-'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <code style={{
                                                    backgroundColor: '#0a0a0a',
                                                    padding: '6px 10px',
                                                    borderRadius: '6px',
                                                    color: '#4CAF50',
                                                    fontSize: '0.85rem',
                                                    fontFamily: 'monospace'
                                                }}>
                                                    {license.key_string}
                                                </code>
                                                <button
                                                    onClick={() => copyToClipboard(license.key_string)}
                                                    style={{
                                                        padding: '6px',
                                                        backgroundColor: 'transparent',
                                                        border: '1px solid #444',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        color: '#888'
                                                    }}
                                                    title="Copy to clipboard"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px', color: '#888', fontSize: '0.9rem' }}>
                                            {license.machine_id ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Monitor size={14} />
                                                    {license.machine_id.substring(0, 12)}...
                                                </div>
                                            ) : (
                                                <span style={{ color: '#555' }}>Universal</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <select
                                                value={license.status}
                                                onChange={(e) => handleUpdateStatus(license.id, e.target.value)}
                                                style={{
                                                    padding: '6px 12px',
                                                    backgroundColor: license.status === 'active' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                                                    color: license.status === 'active' ? '#4CAF50' : '#f44336',
                                                    border: `1px solid ${license.status === 'active' ? '#4CAF50' : '#f44336'}`,
                                                    borderRadius: '6px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '16px', color: '#888', fontSize: '0.9rem' }}>
                                            {new Date(license.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleDelete(license.id)}
                                                style={{
                                                    padding: '8px 12px',
                                                    backgroundColor: 'transparent',
                                                    border: '1px solid #f44336',
                                                    borderRadius: '6px',
                                                    color: '#f44336',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                <Trash2 size={14} />
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Summary */}
                {!loading && licenses.length > 0 && (
                    <div style={{
                        marginTop: '20px',
                        padding: '16px',
                        backgroundColor: '#1e1e1e',
                        borderRadius: '8px',
                        border: '1px solid #333',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ color: '#888', fontSize: '0.9rem' }}>
                            Showing {filteredLicenses.length} of {licenses.length} licenses
                        </div>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div style={{ color: '#4CAF50', fontSize: '0.9rem' }}>
                                <strong>{licenses.filter(l => l.status === 'active').length}</strong> Active
                            </div>
                            <div style={{ color: '#f44336', fontSize: '0.9rem' }}>
                                <strong>{licenses.filter(l => l.status === 'inactive').length}</strong> Inactive
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminLicenseManager;
