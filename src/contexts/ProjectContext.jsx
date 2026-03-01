import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    getProjectByName,
    saveProject as saveProjectToDb,
    updateProject,
    uploadVideo
} from '../utils/supabaseProjectDB';
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
            setVideoSrc(project.video_url); // Use remote URL
            setVideoName(project.video_name);
            setVideoFile(null); // We don't have the File object locally anymore
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
            // 1. Upload video to Supabase Storage
            const videoUrl = await uploadVideo(videoFile, videoFile.name);

            // 2. Save project metadata to Supabase DB
            const projectData = {
                projectName: name,
                videoName: videoFile.name,
                videoUrl: videoUrl,
                measurements: initialMeasurements,
                folderId: folderId
            };

            const savedProject = await saveProjectToDb(projectData);

            setCurrentProject(savedProject);
            setVideoSrc(videoUrl);
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

            // 1. Reuse video URL
            const videoUrl = currentProject.video_url;

            // 2. Save as new project
            const projectData = {
                projectName: newName.trim(),
                videoName: videoName,
                videoUrl: videoUrl,
                measurements: measurements,
                folderId: currentProject.folderId
            };

            const savedProject = await saveProjectToDb(projectData);

            // Switch to the new project
            setCurrentProject(savedProject);
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
