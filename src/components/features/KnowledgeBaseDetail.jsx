import React, { useState, useEffect } from 'react';
import { X, Star, ThumbsUp, Download, Play, ExternalLink, TrendingUp, Eye, Calendar, Tag, Trash } from 'lucide-react';
import {
    getKnowledgeBaseItem,
    getTagsForItem,
    getRatingsForItem,
    addRating,
    incrementUsageCount,
    deleteKnowledgeBaseItem
} from '../../utils/knowledgeBaseDB';

function KnowledgeBaseDetail({ item, onClose, onLoadVideo }) {
    const [tags, setTags] = useState([]);
    const [ratings, setRatings] = useState([]);
    const [userRating, setUserRating] = useState(0);
    const [userFeedback, setUserFeedback] = useState('');
    const [showRatingForm, setShowRatingForm] = useState(false);
    const [videoUrl, setVideoUrl] = useState(item.contentUrl || null);

    useEffect(() => {
        loadDetails();
        // Create Blob URL if video has Blob but no URL
        if (item.videoBlob && item.videoBlob instanceof Blob && !item.contentUrl) {
            const url = URL.createObjectURL(item.videoBlob);
            setVideoUrl(url);
        }
    }, [item.id]);

    const loadDetails = async () => {
        const itemTags = await getTagsForItem(item.id);
        const itemRatings = await getRatingsForItem(item.id);
        setTags(itemTags);
        setRatings(itemRatings);
    };

    const handleSubmitRating = async () => {
        if (userRating > 0) {
            await addRating(item.id, userRating, userFeedback);
            setUserRating(0);
            setUserFeedback('');
            setShowRatingForm(false);
            loadDetails();
            onClose(); // Refresh parent
        }
    };

    const handleUseTemplate = async () => {
        if (item.type === 'template' && item.templateData) {
            // Increment usage count
            await incrementUsageCount(item.id);

            // Create new project with template data
            // This would integrate with your existing project creation flow
            alert('Template loaded! Creating new project...');
            // TODO: Implement actual template loading logic
            onClose();
        }
    };

    const handleDelete = async () => {
        if (confirm(`Are you sure you want to delete "${item.title}"? This action cannot be undone.`)) {
            try {
                await deleteKnowledgeBaseItem(item.id);
                alert('Item deleted successfully!');
                onClose(); // This will trigger parent to reload items
            } catch (error) {
                console.error('Error deleting item:', error);
                alert('Error deleting item. Please try again.');
            }
        }
    };

    const renderStars = (rating, interactive = false) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Star
                    key={i}
                    size={interactive ? 24 : 16}
                    fill={i <= rating ? '#ffd700' : 'none'}
                    stroke={i <= rating ? '#ffd700' : '#666'}
                    style={{ cursor: interactive ? 'pointer' : 'default' }}
                    onClick={() => interactive && setUserRating(i)}
                />
            );
        }
        return stars;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: '#1a1a1a',
                borderRadius: '12px',
                maxWidth: '900px',
                width: '100%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid #333'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid #333',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                }}>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '1.5rem' }}>{item.title}</h2>
                        <div style={{ display: 'flex', gap: '15px', fontSize: '0.85rem', color: '#888' }}>
                            <span>{item.category}</span>
                            {item.industry && <span>• {item.industry}</span>}
                            <span>• {item.type}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            borderRadius: '4px'
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {/* Description */}
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ color: '#00d2ff', fontSize: '1rem', marginBottom: '10px' }}>Description</h3>
                        <p style={{ color: '#ddd', lineHeight: '1.6' }}>{item.description}</p>
                    </div>

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: '#00d2ff', fontSize: '1rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Tag size={16} /> Tags
                            </h3>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {tags.map((tag, idx) => (
                                    <span
                                        key={idx}
                                        style={{
                                            padding: '6px 12px',
                                            backgroundColor: '#2a2a2a',
                                            border: '1px solid #00d2ff',
                                            borderRadius: '16px',
                                            fontSize: '0.85rem',
                                            color: '#00d2ff'
                                        }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Video Player */}
                    {item.type === 'video' && videoUrl && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: '#00d2ff', fontSize: '1rem', marginBottom: '10px' }}>Video</h3>
                            <video
                                src={videoUrl}
                                controls
                                style={{
                                    width: '100%',
                                    maxHeight: '400px',
                                    backgroundColor: '#000',
                                    borderRadius: '8px'
                                }}
                            />
                        </div>
                    )}

                    {/* Template Preview */}
                    {item.type === 'template' && item.templateData && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: '#00d2ff', fontSize: '1rem', marginBottom: '10px' }}>Template Info</h3>
                            <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '8px' }}>
                                <p style={{ color: '#ddd', margin: '0 0 10px 0' }}>
                                    <strong>Elements:</strong> {item.templateData.measurements?.length || 0}
                                </p>
                                <p style={{ color: '#ddd', margin: 0 }}>
                                    <strong>Total Time:</strong> {item.templateData.totalTime || 'N/A'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ color: '#00d2ff', fontSize: '1rem', marginBottom: '10px' }}>Statistics</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                            <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', color: '#00d2ff', marginBottom: '5px' }}>
                                    {renderStars(Math.round(item.averageRating || 0))}
                                </div>
                                <div style={{ color: '#888', fontSize: '0.85rem' }}>
                                    {(item.averageRating || 0).toFixed(1)} ({item.ratingCount || 0} ratings)
                                </div>
                            </div>
                            <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', color: '#00d2ff', marginBottom: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <TrendingUp size={24} /> {item.usageCount || 0}
                                </div>
                                <div style={{ color: '#888', fontSize: '0.85rem' }}>Times Used</div>
                            </div>
                            <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', color: '#00d2ff', marginBottom: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <Eye size={24} /> {item.viewCount || 0}
                                </div>
                                <div style={{ color: '#888', fontSize: '0.85rem' }}>Views</div>
                            </div>
                        </div>
                    </div>

                    {/* Ratings & Feedback */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ color: '#00d2ff', fontSize: '1rem', margin: 0 }}>User Feedback</h3>
                            <button
                                onClick={() => setShowRatingForm(!showRatingForm)}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#00d2ff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: '#000',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                {showRatingForm ? 'Cancel' : 'Rate This Item'}
                            </button>
                        </div>

                        {/* Rating Form */}
                        {showRatingForm && (
                            <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ display: 'block', color: '#ddd', marginBottom: '8px' }}>Your Rating:</label>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        {renderStars(userRating, true)}
                                    </div>
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ display: 'block', color: '#ddd', marginBottom: '8px' }}>Feedback (optional):</label>
                                    <textarea
                                        value={userFeedback}
                                        onChange={(e) => setUserFeedback(e.target.value)}
                                        placeholder="Share your experience with this item..."
                                        style={{
                                            width: '100%',
                                            minHeight: '80px',
                                            padding: '10px',
                                            backgroundColor: '#1a1a1a',
                                            border: '1px solid #444',
                                            borderRadius: '4px',
                                            color: '#fff',
                                            resize: 'vertical'
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleSubmitRating}
                                    disabled={userRating === 0}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: userRating === 0 ? '#555' : '#00d2ff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        color: userRating === 0 ? '#888' : '#000',
                                        cursor: userRating === 0 ? 'not-allowed' : 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Submit Rating
                                </button>
                            </div>
                        )}

                        {/* Existing Ratings */}
                        {ratings.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {ratings.slice(0, 5).map((rating, idx) => (
                                    <div key={idx} style={{ backgroundColor: '#2a2a2a', padding: '12px', borderRadius: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {renderStars(rating.rating)}
                                            </div>
                                            <span style={{ color: '#888', fontSize: '0.8rem' }}>
                                                {formatDate(rating.createdAt)}
                                            </span>
                                        </div>
                                        {rating.feedback && (
                                            <p style={{ color: '#ddd', margin: 0, fontSize: '0.9rem' }}>{rating.feedback}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
                                No ratings yet. Be the first to rate this item!
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div style={{
                    padding: '20px',
                    borderTop: '1px solid #333',
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'flex-end'
                }}>
                    {item.type === 'video' && onLoadVideo && (
                        <button
                            onClick={() => {
                                const urlToUse = videoUrl || item.contentUrl;
                                if (urlToUse) {
                                    onLoadVideo(urlToUse, item.title);
                                    onClose();
                                } else {
                                    alert('Video URL not available. Please re-upload the video.');
                                }
                            }}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: (videoUrl || item.contentUrl) ? '#4da6ff' : '#666',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#fff',
                                cursor: (videoUrl || item.contentUrl) ? 'pointer' : 'not-allowed',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <Play size={18} /> Open in Video Workspace
                        </button>
                    )}
                    {item.type === 'template' && (
                        <button
                            onClick={handleUseTemplate}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#00d2ff',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#000',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '1rem'
                            }}
                        >
                            Use This Template
                        </button>
                    )}
                    <button
                        onClick={handleDelete}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#dc3545',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Trash size={18} /> Delete
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#2a2a2a',
                            border: '1px solid #444',
                            borderRadius: '6px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default KnowledgeBaseDetail;
