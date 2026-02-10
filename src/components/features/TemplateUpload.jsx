import React, { useState } from 'react';
import { useDialog } from '../../contexts/DialogContext';
import { X, Upload, Video, FileText, Star, Tag, Save } from 'lucide-react';
import { addKnowledgeBaseItem, addTagsToItem } from '../../utils/knowledgeBaseDB';

function TemplateUpload({ onClose, onComplete }) {
    const { showAlert } = useDialog();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'template',
        category: '',
        industry: '',
        operationType: ''
    });
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [videoFile, setVideoFile] = useState(null);
    const [videoUrl, setVideoUrl] = useState('');

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
            setTags([...tags, tagInput.trim().toLowerCase()]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleVideoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setVideoFile(file);
            // Create local URL for preview
            const url = URL.createObjectURL(file);
            setVideoUrl(url);
        }
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.description) {
            await showAlert('Validation Error', 'Please fill in title and description');
            return;
        }

        try {
            // Prepare item data
            const itemData = {
                title: formData.title,
                description: formData.description,
                type: formData.type,
                category: formData.category,
                industry: formData.industry,
                operationType: formData.operationType,
                // Store the actual video Blob, not the URL
                videoBlob: videoFile || null,
                templateData: formData.type === 'template' ? {
                    // This would be populated from current project data
                    measurements: [],
                    totalTime: 0
                } : null,
                tags: tags
            };

            // Add to database
            const itemId = await addKnowledgeBaseItem(itemData);

            // Add tags
            if (tags.length > 0) {
                await addTagsToItem(itemId, tags);
            }

            await showAlert('Success', 'Item added successfully!');
            onComplete();
        } catch (error) {
            console.error('Error adding item:', error);
            await showAlert('Error', 'Error adding item. Please try again.');
        }
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
                maxWidth: '700px',
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
                    alignItems: 'center'
                }}>
                    <h2 style={{ margin: 0, color: '#fff', fontSize: '1.5rem' }}>Add New Item</h2>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {/* Title */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: '#ddd', marginBottom: '8px', fontWeight: 'bold' }}>
                            Title *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            placeholder="Enter a descriptive title..."
                            style={{
                                width: '100%',
                                padding: '10px',
                                backgroundColor: '#2a2a2a',
                                border: '1px solid #444',
                                borderRadius: '6px',
                                color: '#fff',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    {/* Description */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: '#ddd', marginBottom: '8px', fontWeight: 'bold' }}>
                            Description *
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            placeholder="Provide a detailed description..."
                            style={{
                                width: '100%',
                                minHeight: '100px',
                                padding: '10px',
                                backgroundColor: '#2a2a2a',
                                border: '1px solid #444',
                                borderRadius: '6px',
                                color: '#fff',
                                fontSize: '0.95rem',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    {/* Type */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: '#ddd', marginBottom: '8px', fontWeight: 'bold' }}>
                            Type
                        </label>
                        <select
                            value={formData.type}
                            onChange={(e) => handleInputChange('type', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                backgroundColor: '#2a2a2a',
                                border: '1px solid #444',
                                borderRadius: '6px',
                                color: '#fff',
                                fontSize: '0.95rem'
                            }}
                        >
                            <option value="template">Template</option>
                            <option value="video">Video</option>
                            <option value="document">Document</option>
                            <option value="best_practice">Best Practice</option>
                        </select>
                    </div>

                    {/* Video Upload (if type is video) */}
                    {formData.type === 'video' && (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#ddd', marginBottom: '8px', fontWeight: 'bold' }}>
                                Video File
                            </label>
                            <input
                                type="file"
                                accept="video/*"
                                onChange={handleVideoUpload}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #444',
                                    borderRadius: '6px',
                                    color: '#fff'
                                }}
                            />
                            {videoUrl && (
                                <video
                                    src={videoUrl}
                                    controls
                                    style={{
                                        width: '100%',
                                        maxHeight: '200px',
                                        marginTop: '10px',
                                        borderRadius: '6px',
                                        backgroundColor: '#000'
                                    }}
                                />
                            )}
                        </div>
                    )}

                    {/* Category & Industry */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', color: '#ddd', marginBottom: '8px', fontWeight: 'bold' }}>
                                Category
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => handleInputChange('category', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #444',
                                    borderRadius: '6px',
                                    color: '#fff'
                                }}
                            >
                                <option value="">Select Category</option>
                                <option value="Manufacturing">Manufacturing</option>
                                <option value="Assembly">Assembly</option>
                                <option value="Logistics">Logistics</option>
                                <option value="Quality Control">Quality Control</option>
                                <option value="Maintenance">Maintenance</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', color: '#ddd', marginBottom: '8px', fontWeight: 'bold' }}>
                                Industry
                            </label>
                            <select
                                value={formData.industry}
                                onChange={(e) => handleInputChange('industry', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #444',
                                    borderRadius: '6px',
                                    color: '#fff'
                                }}
                            >
                                <option value="">Select Industry</option>
                                <option value="Automotive">Automotive</option>
                                <option value="Electronics">Electronics</option>
                                <option value="Food & Beverage">Food & Beverage</option>
                                <option value="Pharmaceutical">Pharmaceutical</option>
                                <option value="Textile">Textile</option>
                            </select>
                        </div>
                    </div>

                    {/* Tags */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: '#ddd', marginBottom: '8px', fontWeight: 'bold' }}>
                            <Tag size={16} style={{ display: 'inline', marginRight: '6px' }} />
                            Tags
                        </label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                                placeholder="Add a tag..."
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #444',
                                    borderRadius: '4px',
                                    color: '#fff'
                                }}
                            />
                            <button
                                onClick={handleAddTag}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#00d2ff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: '#000',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Add
                            </button>
                        </div>
                        {tags.length > 0 && (
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
                                            color: '#00d2ff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        {tag}
                                        <X
                                            size={14}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => handleRemoveTag(tag)}
                                        />
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '20px',
                    borderTop: '1px solid #333',
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'flex-end'
                }}>
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
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#00d2ff',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#000',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Save size={18} /> Save Item
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TemplateUpload;
