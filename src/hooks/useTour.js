import { useRef, useEffect } from 'react';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { TOUR_STEPS } from '../components/tours/tourConfig';
import { useNavigate } from 'react-router-dom';

export const useTour = () => {
    const driverObj = useRef(null);
    const navigate = useNavigate();

    const startTour = (tourId) => {
        const steps = TOUR_STEPS[tourId];
        if (!steps) {
            console.warn(`Tour ${tourId} not found`);
            return;
        }

        // Initialize driver
        driverObj.current = driver({
            showProgress: true,
            animate: true,
            steps: steps,
            onDestroy: () => {
                // Optional: cleanup or logging
            }
        });

        // Handle navigation requirements before starting
        if (tourId === 'vsm-tour') {
            navigate('/value-stream-map');
            setTimeout(() => driverObj.current.drive(), 500); // Wait for nav
        } else if (tourId === 'video-workspace-tour') {
            navigate('/');
            setTimeout(() => driverObj.current.drive(), 500);
        } else {
            driverObj.current.drive();
        }
    };

    return { startTour };
};
