import React, { useEffect, useRef } from 'react';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useLanguage } from '../../contexts/LanguageContext';

const TourGuide = () => {
    const { t, currentLanguage } = useLanguage();
    const driverObj = useRef(null);

    useEffect(() => {
        // Define tour steps based on language
        const steps = [
            {
                element: '.workspace-area',
                popover: {
                    title: currentLanguage === 'id' ? 'Selamat Datang di MAVi! 🚀' : 'Welcome to MAVi! 🚀',
                    description: currentLanguage === 'id'
                        ? 'Aplikasi analisis gerakan cerdas Anda. Mari kita mulai tur singkat.'
                        : 'Your intelligent motion analysis app. Let\'s start a quick tour.',
                    side: "left",
                    align: 'start'
                }
            },
            {
                element: 'button[title="Upload Video"], .upload-area', // Adjust selector as needed
                popover: {
                    title: currentLanguage === 'id' ? 'Langkah 1: Upload Video' : 'Step 1: Upload Video',
                    description: currentLanguage === 'id'
                        ? 'Mulai dengan mengupload video proses kerja Anda di sini.'
                        : 'Start by uploading your work process video here.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '.element-editor-panel', // Need to ensure this class exists in VideoWorkspace/ElementEditor
                popover: {
                    title: currentLanguage === 'id' ? 'Langkah 2: Analisis Elemen' : 'Step 2: Analysis Elements',
                    description: currentLanguage === 'id'
                        ? 'Gunakan editor ini untuk memecah video menjadi elemen kerja (Work Elements).'
                        : 'Use this editor to break down the video into Work Elements.',
                    side: "left",
                    align: 'start'
                }
            },
            {
                element: 'button[title="Start Measurement"], .measurement-controls',
                popover: {
                    title: currentLanguage === 'id' ? 'Langkah 3: Ukur Waktu' : 'Step 3: Measure Time',
                    description: currentLanguage === 'id'
                        ? 'Gunakan tombol ini (atau tekan "S") untuk memulai pengukuran waktu.'
                        : 'Use this button (or press "S") to start time measurement.',
                    side: "top",
                    align: 'start'
                }
            },
            {
                element: '.sidebar-toggle',
                popover: {
                    title: currentLanguage === 'id' ? 'Langkah 4: Menu Navigasi' : 'Step 4: Navigation Menu',
                    description: currentLanguage === 'id'
                        ? 'Akses fitur lanjutan seperti Yamazumi, VSM, dan AI Studio di sini.'
                        : 'Access advanced features like Yamazumi, VSM, and AI Studio here.',
                    side: "right",
                    align: 'start'
                }
            },
            {
                element: '.mavi-sensei-help', // Need to add this class/id to header help icon or specific help button
                popover: {
                    title: currentLanguage === 'id' ? 'Butuh Bantuan?' : 'Need Help?',
                    description: currentLanguage === 'id'
                        ? 'Klik di sini untuk bertanya pada MAVi Sensei kapan saja.'
                        : 'Click here to ask MAVi Sensei anytime.',
                    side: "bottom",
                    align: 'end'
                }
            }
        ];

        driverObj.current = driver({
            showProgress: true,
            steps: steps,
            nextBtnText: currentLanguage === 'id' ? 'Lanjut' : 'Next',
            prevBtnText: currentLanguage === 'id' ? 'Kembali' : 'Previous',
            doneBtnText: currentLanguage === 'id' ? 'Selesai' : 'Done',
            allowClose: true,
            overlayClickNext: false
        });

        // Listen for custom event to start tour
        const handleStartTour = () => {
            driverObj.current.drive();
        };

        window.addEventListener('start-interactive-tour', handleStartTour);

        // Auto-start for first time users (can be commented out if too intrusive)
        const hasSeenTour = localStorage.getItem('mavi_has_seen_tour');
        if (!hasSeenTour) {
            // Delay slightly to ensure UI is ready
            setTimeout(() => {
                driverObj.current.drive();
                localStorage.setItem('mavi_has_seen_tour', 'true');
            }, 1500);
        }

        return () => {
            window.removeEventListener('start-interactive-tour', handleStartTour);
            driverObj.current.destroy();
        };

    }, [currentLanguage]);

    return null; // This component doesn't render DOM elements itself
};

export default TourGuide;
