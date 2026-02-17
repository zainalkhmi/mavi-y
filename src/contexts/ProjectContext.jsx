import React, { createContext, useContext, useState, useEffect } from 'react';
import { getProjectByName, saveProject as saveProjectToDb, updateProject } from '../utils/database';
import { useNavigate } from 'react-router-dom';
import { useDialog } from './DialogContext';

const ProjectContext = createContext();

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
                await updateProject(currentProject.projectName, {
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

            setCurrentProject(project);
            setVideoSrc(URL.createObjectURL(project.videoBlob));
            setVideoName(project.videoName);
            setVideoFile(project.videoBlob); // Store the blob for AI processing
            setMeasurements(project.measurements || []);

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
            const videoBlob = new Blob([await videoFile.arrayBuffer()], { type: videoFile.type });
            const projectId = await saveProjectToDb(
                name,
                videoBlob,
                videoFile.name,
                initialMeasurements,
                null,
                null,
                folderId
            );

            setCurrentProject({ id: projectId, projectName: name, folderId: folderId });
            setVideoSrc(URL.createObjectURL(videoBlob));
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
            await updateProject(currentProject.projectName, {
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

            // Get current video blob
            const videoBlob = currentProject.videoBlob || new Blob([await fetch(videoSrc).then(r => r.arrayBuffer())], { type: 'video/mp4' });

            // Save as new project
            const projectId = await saveProjectToDb(
                newName.trim(),
                videoBlob,
                videoName,
                measurements,
                null,
                null,
                currentProject.folderId
            );

            // Switch to the new project
            setCurrentProject({ id: projectId, projectName: newName.trim(), folderId: currentProject.folderId });
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
