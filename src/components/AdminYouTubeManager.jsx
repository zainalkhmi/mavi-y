import React, { useState, useEffect } from 'react';
import {
    Youtube,
    Plus,
    Edit2,
    Trash2,
    Search,
    Save,
    X,
    Loader,
    ExternalLink,
    Tag,
    BookOpen,
    RefreshCw,
    Play,
    Check
} from 'lucide-react';
import { modules as STATIC_MODULES } from '../data/maviClassData';
import {
    getAllYouTubeLinks,
    createYouTubeLink,
    updateYouTubeLink,
    deleteYouTubeLink,
    searchYouTubeLinks
} from '../utils/tursoAPI.js';
import { useDialog } from '../contexts/DialogContext.jsx';

function AdminYouTubeManager() {
    const { showAlert, showConfirm } = useDialog();
    const [links, setLinks] = useState([]);
    const [filteredLinks, setFilteredLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        url: '',
        description: '',
        category: '',
        lesson_id: '',
        module_id: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');

    // Derived state for lesson options based on selected module
    const [lessonOptions, setLessonOptions] = useState([]);

    const categories = ['Tutorial', 'Demo', 'Training', 'Documentation', 'Other'];

    // Update lesson options when module changes
    useEffect(() => {
        if (formData.module_id) {
            const selectedModule = STATIC_MODULES.find(m => m.id === formData.module_id);
            if (selectedModule) {
                setLessonOptions(selectedModule.lessons);
            } else {
                setLessonOptions([]);
            }
        } else {
            setLessonOptions([]);
        }
    }, [formData.module_id]);

    useEffect(() => {
        loadLinks();
    }, []);

    useEffect(() => {
        filterLinks();
    }, [searchQuery, selectedCategory, links]);

    useEffect(() => {
        if (formData.url) {
            const videoId = extractYouTubeId(formData.url);
            if (videoId) {
                setPreviewUrl(`https://www.youtube.com/embed/${videoId}`);
            } else {
                setPreviewUrl('');
            }
        } else {
            setPreviewUrl('');
        }
    }, [formData.url]);

    const loadLinks = async () => {
        setLoading(true);
        try {
            const data = await getAllYouTubeLinks();
            setLinks(data);
        } catch (error) {
            console.error('Failed to load YouTube links:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterLinks = () => {
        let filtered = links;

        if (selectedCategory !== 'all') {
            filtered = filtered.filter(link => link.category === selectedCategory);
        }

        if (searchQuery.trim() !== '') {
            filtered = filtered.filter(link =>
                link.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                link.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                link.category?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredLinks(filtered);
    };

    const extractYouTubeId = (url) => {
        if (!url) return null;

        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
            /youtube\.com\/embed\/([^&\s]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.url) {
            await showAlert('Warning', 'Please fill in title and URL');
            return;
        }

        const videoId = extractYouTubeId(formData.url);
        if (!videoId) {
            await showAlert('Invalid URL', 'Please enter a valid YouTube URL');
            return;
        }

        setIsSaving(true);
        try {
            if (editingId) {
                await updateYouTubeLink(editingId, formData);
            } else {
                await createYouTubeLink(formData);
            }

            resetForm();
            await loadLinks();
        } catch (error) {
            console.error('Failed to save YouTube link:', error);
            await showAlert('Error', 'Failed to save YouTube link');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (link) => {
        setEditingId(link.id);
        setFormData({
            title: link.title,
            url: link.url,
            description: link.description || '',
            category: link.category || '',
            lesson_id: link.lesson_id || '',
            module_id: link.module_id || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!await showConfirm('Delete Link', 'Are you sure you want to delete this YouTube link?')) {
            return;
        }

        try {
            await deleteYouTubeLink(id);
            await loadLinks();
        } catch (error) {
            console.error('Failed to delete YouTube link:', error);
            await showAlert('Error', 'Failed to delete YouTube link');
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            url: '',
            description: '',
            category: '',
            lesson_id: '',
            module_id: ''
        });
        setEditingId(null);
        setShowForm(false);
        setPreviewUrl('');
    };

    return (
        <div style={{ padding: '30px', height: '100%', overflowY: 'auto', backgroundColor: '#0a0a0a' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ color: 'white', fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Youtube size={32} color="#ff0000" />
                            YouTube Links Management
                        </h2>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={loadLinks}
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
                                onClick={() => setShowForm(!showForm)}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#ff0000',
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
                                Add YouTube Link
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Search size={20} color="#666" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by title, description, or category..."
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
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            style={{
                                padding: '14px 20px',
                                backgroundColor: '#1e1e1e',
                                border: '1px solid #333',
                                borderRadius: '10px',
                                color: 'white',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                minWidth: '200px'
                            }}
                        >
                            <option value="all">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Form */}
                {showForm && (
                    <div style={{
                        backgroundColor: '#1e1e1e',
                        padding: '30px',
                        borderRadius: '12px',
                        border: '1px solid #333',
                        marginBottom: '30px'
                    }}>
                        <h3 style={{ color: 'white', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Youtube size={24} color="#ff0000" />
                            {editingId ? 'Edit YouTube Link' : 'Add New YouTube Link'}
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ color: '#888', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Enter video title"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#0a0a0a',
                                        border: '1px solid #444',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>

                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ color: '#888', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                                    YouTube URL *
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Youtube size={18} color="#666" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        value={formData.url}
                                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                        placeholder="https://youtube.com/watch?v=..."
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

                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ color: '#888', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Enter video description"
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#0a0a0a',
                                        border: '1px solid #444',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '1rem',
                                        resize: 'vertical',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ color: '#888', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                                    Category
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#0a0a0a',
                                        border: '1px solid #444',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">Select category</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ color: '#888', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                                    Target Module
                                </label>
                                <select
                                    value={formData.module_id}
                                    onChange={(e) => {
                                        setFormData({
                                            ...formData,
                                            module_id: e.target.value,
                                            lesson_id: '' // Reset lesson when module changes
                                        });
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#0a0a0a',
                                        border: '1px solid #444',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">Select a Module</option>
                                    {STATIC_MODULES.map(module => (
                                        <option key={module.id} value={module.id}>
                                            {module.title} ({module.id})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ color: '#888', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                                    Target Lesson
                                </label>
                                <select
                                    value={formData.lesson_id}
                                    onChange={(e) => setFormData({ ...formData, lesson_id: e.target.value })}
                                    disabled={!formData.module_id}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#0a0a0a',
                                        border: '1px solid #444',
                                        borderRadius: '8px',
                                        color: formData.module_id ? 'white' : '#666',
                                        fontSize: '1rem',
                                        cursor: formData.module_id ? 'pointer' : 'not-allowed'
                                    }}
                                >
                                    <option value="">Select a Lesson (Optional)</option>
                                    {lessonOptions.map(lesson => (
                                        <option key={lesson.id} value={lesson.id}>
                                            {lesson.title}
                                        </option>
                                    ))}
                                </select>
                                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                    {formData.lesson_id ? 'Overrides default video for this lesson.' : 'Link behaves as general module resource.'}
                                </div>
                            </div>
                        </div>

                        {/* Preview */}
                        {previewUrl && (
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ color: '#888', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                                    Preview
                                </label>
                                <div style={{
                                    width: '100%',
                                    aspectRatio: '16/9',
                                    backgroundColor: '#000',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    border: '1px solid #333'
                                }}>
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={previewUrl}
                                        title="Video Preview"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={handleSubmit}
                                disabled={isSaving || !formData.title || !formData.url}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: '#ff0000',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: (isSaving || !formData.title || !formData.url) ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    opacity: (isSaving || !formData.title || !formData.url) ? 0.5 : 1
                                }}
                            >
                                {isSaving ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
                                {isSaving ? 'Saving...' : (editingId ? 'Update Link' : 'Add Link')}
                            </button>
                            <button
                                onClick={resetForm}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: '#333',
                                    color: 'white',
                                    border: '1px solid #444',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <X size={18} />
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Links Grid */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                        <Loader size={40} style={{ animation: 'spin 1s linear infinite', marginBottom: '20px' }} />
                        <p>Loading YouTube links...</p>
                    </div>
                ) : filteredLinks.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px',
                        backgroundColor: '#1e1e1e',
                        borderRadius: '12px',
                        border: '1px solid #333'
                    }}>
                        <Youtube size={60} color="#333" style={{ marginBottom: '20px' }} />
                        <h3 style={{ color: '#666', marginBottom: '10px' }}>No YouTube Links Found</h3>
                        <p style={{ color: '#555' }}>
                            {searchQuery || selectedCategory !== 'all' ? 'No links match your filters' : 'Add your first YouTube link to get started'}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                        {filteredLinks.map((link) => {
                            const videoId = extractYouTubeId(link.url);
                            const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;

                            return (
                                <div
                                    key={link.id}
                                    style={{
                                        backgroundColor: '#1e1e1e',
                                        borderRadius: '12px',
                                        border: '1px solid #333',
                                        overflow: 'hidden',
                                        transition: 'transform 0.2s, box-shadow 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    {/* Thumbnail */}
                                    {thumbnailUrl && (
                                        <div style={{ position: 'relative', paddingTop: '56.25%', backgroundColor: '#000' }}>
                                            <img
                                                src={thumbnailUrl}
                                                alt={link.title}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                            <div style={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                width: '60px',
                                                height: '60px',
                                                backgroundColor: 'rgba(255, 0, 0, 0.9)',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer'
                                            }}>
                                                <Play size={28} color="white" fill="white" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div style={{ padding: '20px' }}>
                                        <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '10px', lineHeight: '1.4' }}>
                                            {link.title}
                                        </h3>

                                        {link.description && (
                                            <p style={{
                                                color: '#888',
                                                fontSize: '0.9rem',
                                                marginBottom: '15px',
                                                lineHeight: '1.5',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden'
                                            }}>
                                                {link.description}
                                            </p>
                                        )}

                                        {/* Metadata */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
                                            {link.category && (
                                                <span style={{
                                                    padding: '4px 10px',
                                                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                                                    color: '#ff0000',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <Tag size={12} />
                                                    {link.category}
                                                </span>
                                            )}
                                            {link.module_id && (
                                                <span style={{
                                                    padding: '4px 10px',
                                                    backgroundColor: 'rgba(0, 120, 212, 0.1)',
                                                    color: '#0078d4',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <BookOpen size={12} />
                                                    {link.module_id}
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    flex: 1,
                                                    padding: '10px',
                                                    backgroundColor: '#ff0000',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    textDecoration: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                <ExternalLink size={16} />
                                                Watch
                                            </a>
                                            <button
                                                onClick={() => handleEdit(link)}
                                                style={{
                                                    padding: '10px',
                                                    backgroundColor: 'transparent',
                                                    color: '#0078d4',
                                                    border: '1px solid #0078d4',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer'
                                                }}
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(link.id)}
                                                style={{
                                                    padding: '10px',
                                                    backgroundColor: 'transparent',
                                                    color: '#f44336',
                                                    border: '1px solid #f44336',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer'
                                                }}
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Summary */}
                {!loading && links.length > 0 && (
                    <div style={{
                        marginTop: '20px',
                        padding: '16px',
                        backgroundColor: '#1e1e1e',
                        borderRadius: '8px',
                        border: '1px solid #333',
                        color: '#888',
                        fontSize: '0.9rem',
                        textAlign: 'center'
                    }}>
                        Showing {filteredLinks.length} of {links.length} YouTube links
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminYouTubeManager;
