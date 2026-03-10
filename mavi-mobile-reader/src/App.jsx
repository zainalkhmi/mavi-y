import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import MobileLayout from './components/MobileLayout';
import HomePage from './pages/HomePage';
import ScanPage from './pages/ScanPage';
import SopListPage from './pages/SopListPage';
import SopViewerPage from './pages/SopViewerPage';
import LiveModePage from './pages/LiveModePage';

const App = () => {
    return (
        <Routes>
            <Route element={<MobileLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/scan" element={<ScanPage />} />
                <Route path="/live" element={<LiveModePage />} />
                <Route path="/sop" element={<SopListPage />} />
                <Route path="/sop/:manualId" element={<SopViewerPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default App;
