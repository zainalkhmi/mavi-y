import React, { useState, useEffect } from 'react';
import { Search, Filter, Grid, List, Plus, Star, Eye, TrendingUp, Calendar, Tag, BookOpen } from 'lucide-react';
import {
    getAllKnowledgeBaseItems,
    searchKnowledgeBase,
    sortKnowledgeBase,
    getAllTags,
    incrementViewCount
} from '../utils/knowledgeBaseDB';
import KnowledgeBaseDetail from './features/KnowledgeBaseDetail';
import TemplateUpload from './features/TemplateUpload';

function KnowledgeBase({ onLoadVideo }) {
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedIndustry, setSelectedIndustry] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState('grid'); // grid or list
    const [showFilters, setShowFilters] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [allTags, setAllTags] = useState([]);

    // Load items on mount
    useEffect(() => {
        loadItems();
        loadTags();
    }, []);

    const loadItems = async () => {
        const allItems = await getAllKnowledgeBaseItems();
        // Create Blob URLs for video items
        const itemsWithUrls = allItems.map(item => {
            if (item.videoBlob && item.videoBlob instanceof Blob) {
                return {
                    ...item,
                    contentUrl: URL.createObjectURL(item.videoBlob)
                };
            }
            return item;
        });
        setItems(itemsWithUrls);
        setFilteredItems(sortKnowledgeBase(itemsWithUrls, sortBy));
    };

    const loadTags = async () => {
        const tags = await getAllTags();
        setAllTags(tags);
    };

    // Search and filter
    useEffect(() => {
        const performSearch = async () => {
            const results = await searchKnowledgeBase(searchQuery, {
                type: selectedType,
                category: selectedCategory,
                industry: selectedIndustry
            });
            setFilteredItems(sortKnowledgeBase(results, sortBy));
        };
        performSearch();
    }, [searchQuery, selectedType, selectedCategory, selectedIndustry, sortBy, items]);

    const handleItemClick = async (item) => {
        await incrementViewCount(item.id);
        setSelectedItem(item);
        loadItems(); // Refresh to update view count
    };

    const handleUploadComplete = () => {
        setShowUploadForm(false);
        loadItems();
        loadTags();
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'template': return '📋';
            case 'video': return '🎥';
            case 'document': return '📄';
            case 'best_practice': return '⭐';
            default: return '📚';
        }
    };

    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Star
                    key={i}
                    size={14}
                    fill={i <= rating ? '#ffd700' : 'none'}
                    stroke={i <= rating ? '#ffd700' : '#666'}
                />
            );
        }
        return stars;
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }} className="glass-panel">
            {/* Header */}
            <div style={{
                padding: '24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(0, 0, 0, 0.2)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ margin: 0, color: 'white', fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: 'linear-gradient(135deg, #0078d4 0%, #00b4d8 100%)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
                                <BookOpen size={24} color="white" />
                            </div>
                            Knowledge Base & Best Practices
                        </h1>
                        <p style={{ margin: '8px 0 0 0', color: '#aaa', fontSize: '0.95rem' }}>
                            Access templates, guides, and community insights to optimize your workflow.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowUploadForm(true)}
                        style={{
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #0078d4 0%, #00b4d8 100%)',
                            border: 'none',
                            borderRadius: '12px',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 15px rgba(0, 120, 212, 0.3)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Plus size={20} /> Add New Item
                    </button>
                </div>

                {/* Search and Controls */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search Bar */}
                    <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                        <input
                            type="text"
                            placeholder="Search templates, videos, best practices..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px 14px 14px 48px',
                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '0.95rem',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#0078d4'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                        />
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        style={{
                            padding: '14px 20px',
                            backgroundColor: showFilters ? 'rgba(0, 120, 212, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${showFilters ? '#0078d4' : 'rgba(255, 255, 255, 0.1)'}`,
                            borderRadius: '12px',
                            color: showFilters ? '#0078d4' : '#ccc',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            fontWeight: '500'
                        }}
                    >
                        <Filter size={18} /> Filters
                    </button>

                    {/* Sort */}
                    <div style={{ position: 'relative' }}>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{
                                appearance: 'none',
                                padding: '14px 40px 14px 20px',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                color: '#ccc',
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                outline: 'none',
                                minWidth: '160px'
                            }}
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="mostUsed">Most Used</option>
                            <option value="highestRated">Highest Rated</option>
                            <option value="title">Title (A-Z)</option>
                        </select>
                        <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#666' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                        </div>
                    </div>

                    {/* View Mode Toggle */}
                    <div style={{ display: 'flex', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{
                                padding: '10px',
                                backgroundColor: viewMode === 'grid' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                color: viewMode === 'grid' ? 'white' : '#888',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Grid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                padding: '10px',
                                backgroundColor: viewMode === 'list' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                color: viewMode === 'list' ? 'white' : '#888',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div style={{
                        marginTop: '16px',
                        padding: '20px',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        display: 'flex',
                        gap: '20px',
                        flexWrap: 'wrap',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        {[
                            {
                                label: 'Type', value: selectedType, setter: setSelectedType, options: [
                                    { val: '', txt: 'All Types' },
                                    { val: 'template', txt: 'Templates' },
                                    { val: 'video', txt: 'Videos' },
                                    { val: 'document', txt: 'Documents' },
                                    { val: 'best_practice', txt: 'Best Practices' }
                                ]
                            },
                            {
                                label: 'Category', value: selectedCategory, setter: setSelectedCategory, options: [
                                    { val: '', txt: 'All Categories' },
                                    { val: 'Manufacturing', txt: 'Manufacturing' },
                                    { val: 'Assembly', txt: 'Assembly' },
                                    { val: 'Logistics', txt: 'Logistics' },
                                    { val: 'Quality Control', txt: 'Quality Control' },
                                    { val: 'Maintenance', txt: 'Maintenance' }
                                ]
                            },
                            {
                                label: 'Industry', value: selectedIndustry, setter: setSelectedIndustry, options: [
                                    { val: '', txt: 'All Industries' },
                                    { val: 'Automotive', txt: 'Automotive' },
                                    { val: 'Electronics', txt: 'Electronics' },
                                    { val: 'Food & Beverage', txt: 'Food & Beverage' },
                                    { val: 'Pharmaceutical', txt: 'Pharmaceutical' },
                                    { val: 'Textile', txt: 'Textile' }
                                ]
                            }
                        ].map((filter, i) => (
                            <div key={i} style={{ flex: 1, minWidth: '200px' }}>
                                <label style={{ display: 'block', color: '#aaa', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '500' }}>{filter.label}</label>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={filter.value}
                                        onChange={(e) => filter.setter(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '10px',
                                            color: 'white',
                                            appearance: 'none',
                                            outline: 'none',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        {filter.options.map(opt => (
                                            <option key={opt.val} value={opt.val}>{opt.txt}</option>
                                        ))}
                                    </select>
                                    <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#666' }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                {filteredItems.length === 0 ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '60%',
                        color: '#666',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '20px',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                            <Search size={40} color="#444" />
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', color: 'white', fontSize: '1.2rem' }}>No items found</h3>
                        <p style={{ maxWidth: '400px', lineHeight: '1.5', margin: 0 }}>
                            Try adjusting your search or filters to find what you're looking for, or add a new item to get started.
                        </p>
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{
                                marginTop: '20px',
                                background: 'transparent',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#0078d4',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            Clear Search
                        </button>
                    </div>
                ) : (
                    <div style={{
                        display: viewMode === 'grid' ? 'grid' : 'flex',
                        gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(320px, 1fr))' : '1fr',
                        flexDirection: viewMode === 'list' ? 'column' : undefined,
                        gap: '24px'
                    }}>
                        {filteredItems.map(item => (
                            <div
                                key={item.id}
                                onClick={() => handleItemClick(item)}
                                className="glass-card"
                                style={{
                                    padding: '0',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: viewMode === 'list' ? 'row' : 'column',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                                    const overlay = e.currentTarget.querySelector('.card-overlay');
                                    if (overlay) overlay.style.opacity = '1';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                    const overlay = e.currentTarget.querySelector('.card-overlay');
                                    if (overlay) overlay.style.opacity = '0';
                                }}
                            >
                                {/* Type Badge */}
                                <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                    backdropFilter: 'blur(4px)',
                                    fontSize: '0.75rem',
                                    color: 'white',
                                    zIndex: 2,
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {item.type === 'best_practice' ? 'Best Practice' : item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                </div>

                                {/* Icon/Thumbnail Area */}
                                <div style={{
                                    height: viewMode === 'list' ? 'auto' : '160px',
                                    width: viewMode === 'list' ? '200px' : '100%',
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderBottom: viewMode === 'list' ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRight: viewMode === 'list' ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                                    position: 'relative'
                                }}>
                                    <div style={{ fontSize: '4rem', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))', transform: 'scale(1)', transition: 'transform 0.3s' }}>
                                        {getTypeIcon(item.type)}
                                    </div>
                                    <div className="card-overlay" style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: 'rgba(0,0,0,0.2)',
                                        opacity: 0,
                                        transition: 'opacity 0.3s'
                                    }} />
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: 'bold', lineHeight: '1.3' }}>{item.title}</h3>
                                    </div>

                                    <p style={{ margin: '0 0 16px 0', color: '#aaa', fontSize: '0.9rem', lineHeight: '1.5', flex: 1 }}>
                                        {item.description?.substring(0, 100)}{item.description?.length > 100 ? '...' : ''}
                                    </p>

                                    {/* Tags */}
                                    {item.tags && item.tags.length > 0 && (
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                            {item.tags.slice(0, 3).map((tag, idx) => (
                                                <span
                                                    key={idx}
                                                    style={{
                                                        padding: '4px 10px',
                                                        backgroundColor: 'rgba(0, 120, 212, 0.1)',
                                                        border: '1px solid rgba(0, 120, 212, 0.2)',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        color: '#4db2ff'
                                                    }}
                                                >
                                                    #{tag}
                                                </span>
                                            ))}
                                            {item.tags.length > 3 && (
                                                <span style={{ fontSize: '0.75rem', color: '#666', padding: '4px' }}>+{item.tags.length - 3}</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Stats Footer */}
                                    <div style={{
                                        display: 'flex',
                                        gap: '16px',
                                        fontSize: '0.85rem',
                                        color: '#888',
                                        paddingTop: '16px',
                                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                                        marginTop: 'auto'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ display: 'flex' }}>
                                                {renderStars(Math.round(item.averageRating || 0))}
                                            </div>
                                            <span style={{ color: '#666' }}>({item.ratingCount || 0})</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                                            <Eye size={14} />
                                            <span>{item.viewCount || 0}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <TrendingUp size={14} />
                                            <span>{item.usageCount || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedItem && (
                <KnowledgeBaseDetail
                    item={selectedItem}
                    onClose={() => {
                        setSelectedItem(null);
                        loadItems();
                    }}
                    onLoadVideo={onLoadVideo}
                />
            )}

            {/* Upload Form Modal */}
            {showUploadForm && (
                <TemplateUpload
                    onClose={() => setShowUploadForm(false)}
                    onComplete={handleUploadComplete}
                />
            )}
        </div>
    );
}

export default KnowledgeBase;
