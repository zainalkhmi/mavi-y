import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    getProjectByName,
    saveProject as saveProjectToDb,
    updateProject
} from '../utils/database';
import { useNavigate } from 'react-router-dom';
import { useDialog } from './DialogContext';

const ProjectContext = createContext();

const normalizeProjectRecord = (project) => {
    if (!project) return null;

    return {
        ...project,
        id: project.id,
        projectName: project.projectName || project.project_name || '',
        videoName: project.videoName || project.video_name || '',
        videoUrl: project.videoUrl || project.video_url || null,
        videoBlob: project.videoBlob || null,
        folderId: project.folderId ?? project.folder_id ?? null,
        measurements: Array.isArray(project.measurements) ? project.measurements : [],
        lastModified: project.lastModified || project.last_modified || null
    };
};

const getProjectIdentifier = (project) => {
    if (!project) return null;
    return project.id || project.projectName || project.project_name || null;
};

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
};

export const ProjectProvider = ({ children }) => {
    const [currentProject, setCurrentProject] = useState(null);
    const [measurements, setMeasurements] = useState([]);
    const [videoSrc, setVideoSrc] = useState(null);
    const [videoName, setVideoName] = useState('');
    const [videoFile, setVideoFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const { showAlert } = useDialog();

    // Auto-save logic
    useEffect(() => {
        if (!currentProject) return;
        const saveTimer = setTimeout(async () => {
            try {
                const identifier = getProjectIdentifier(currentProject);
                if (!identifier) return;

                await updateProject(identifier, {
                    measurements,
                    lastModified: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error auto-saving project:', error);
            }
        }, 3000); // 3 seconds debounce for auto-save

        return () => clearTimeout(saveTimer);
    }, [measurements, currentProject]);

    const openProject = async (projectName, navigateTo = '/') => {
        setIsLoading(true);
        try {
            const project = await getProjectByName(projectName);
            if (!project) {
                throw new Error('Project not found');
            }

            // Cleanup old URL if it exists
            if (videoSrc && videoSrc.startsWith('blob:')) {
                URL.revokeObjectURL(videoSrc);
            }

            const normalizedProject = normalizeProjectRecord(project);
            const resolvedVideoSrc = normalizedProject.videoBlob
                ? URL.createObjectURL(normalizedProject.videoBlob)
                : normalizedProject.videoUrl;

            if (!resolvedVideoSrc) {
                await showAlert(
                    'LOAD PROJECT GAGAL',
                    'Video tidak ditemukan. Project berhasil dibuka, tetapi data video tidak tersedia di penyimpanan lokal. Silakan upload ulang video untuk project ini.'
                );
            }

            setCurrentProject(normalizedProject);
            setVideoSrc(resolvedVideoSrc);
            setVideoName(normalizedProject.videoName);
            setVideoFile(
                normalizedProject.videoBlob
                    ? new File([normalizedProject.videoBlob], normalizedProject.videoName || 'video.mp4', {
                        type: normalizedProject.videoBlob.type || 'video/mp4'
                    })
                    : null
            );
            setMeasurements(normalizedProject.measurements || []);

            if (navigateTo) {
                navigate(navigateTo);
            }
            return true;
        } catch (error) {
            console.error('Error opening project:', error);
            await showAlert('Error', 'Failed to open project: ' + error.message);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const newProject = async (name, videoFile, initialMeasurements = [], folderId = null) => {
        setIsLoading(true);
        try {
            await saveProjectToDb(
                name,
                videoFile,
                videoFile.name,
                initialMeasurements,
                null,
                null,
                folderId,
                null
            );

            const savedProject = await getProjectByName(name);
            const normalizedProject = normalizeProjectRecord(savedProject);
            const resolvedVideoSrc = normalizedProject?.videoBlob
                ? URL.createObjectURL(normalizedProject.videoBlob)
                : URL.createObjectURL(videoFile);

            setCurrentProject(normalizedProject);
            setVideoSrc(resolvedVideoSrc);
            setVideoName(videoFile.name);
            setVideoFile(videoFile);
            setMeasurements(initialMeasurements);

            navigate('/');
            return true;
        } catch (error) {
            console.error('Error creating project:', error);
            await showAlert('Error', 'Failed to create project: ' + error.message);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const closeProject = () => {
        if (videoSrc && videoSrc.startsWith('blob:')) {
            URL.revokeObjectURL(videoSrc);
        }
        setCurrentProject(null);
        setMeasurements([]);
        setVideoSrc(null);
        setVideoName('');
        setVideoFile(null);
    };

    const saveProject = async () => {
        if (!currentProject) {
            await showAlert('No Project', 'No project is currently open');
            return false;
        }

        try {
            const identifier = getProjectIdentifier(currentProject);
            if (!identifier) {
                throw new Error('Current project is missing a valid identifier.');
            }

            await updateProject(identifier, {
                measurements,
                lastModified: new Date().toISOString()
            });
            await showAlert('Success', 'Project saved successfully!');
            return true;
        } catch (error) {
            console.error('Error saving project:', error);
            await showAlert('Error', 'Failed to save project: ' + error.message);
            return false;
        }
    };

    const saveProjectAs = async (newName) => {
        if (!currentProject) {
            await showAlert('No Project', 'No project is currently open');
            return false;
        }

        if (!newName || newName.trim() === '') {
            await showAlert('Invalid Name', 'Project name cannot be empty');
            return false;
        }

        try {
            // Check if name already exists
            const existing = await getProjectByName(newName.trim());
            if (existing) {
                await showAlert('Name Conflict', 'A project with this name already exists');
                return false;
            }

            const sourceBlob = videoFile || currentProject.videoBlob || null;
            await saveProjectToDb(
                newName.trim(),
                sourceBlob,
                videoName,
                measurements,
                currentProject.swcsData || null,
                currentProject.standardWorkLayoutData || null,
                currentProject.folderId,
                currentProject.facilityLayoutData || null
            );

            const savedProject = await getProjectByName(newName.trim());
            const normalizedProject = normalizeProjectRecord(savedProject);
            const resolvedVideoSrc = normalizedProject?.videoBlob
                ? URL.createObjectURL(normalizedProject.videoBlob)
                : null;

            // Switch to the new project
            setCurrentProject(normalizedProject);
            setVideoSrc(resolvedVideoSrc);
            await showAlert('Success', 'Project saved as "' + newName + '" successfully!');
            return true;
        } catch (error) {
            console.error('Error saving project as:', error);
            await showAlert('Error', 'Failed to save project: ' + error.message);
            return false;
        }
    };

    const value = {
        currentProject,
        measurements,
        setMeasurements,
        videoSrc,
        setVideoSrc,
        videoName,
        setVideoName,
        videoFile,
        setVideoFile,
        openProject,
        newProject,
        closeProject,
        saveProject,
        saveProjectAs,
        isLoading
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
};
