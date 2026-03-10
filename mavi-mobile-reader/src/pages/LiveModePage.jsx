import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, AlertCircle, CheckCircle2, ChevronRight, Activity, Clock, ArrowLeft } from 'lucide-react';
import { listPublishedManualSummaries, getPublishedManualById, extractSteps } from '../lib/manualApi';
import { supabase } from '../lib/supabase';

const LiveModePage = () => {
    const [manuals, setManuals] = useState([]);
    const [selectedManual, setSelectedManual] = useState(null);
    const [steps, setSteps] = useState([]);
    const [isLive, setIsLive] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [measurements, setMeasurements] = useState([]);
    const [loading, setLoading] = useState(true);
    const timerRef = useRef(null);

    useEffect(() => {
        const fetchManuals = async () => {
            try {
                const data = await listPublishedManualSummaries();
                setManuals(data);
            } catch (error) {
                console.error('Error fetching manuals:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchManuals();
    }, []);

    useEffect(() => {
        if (isLive) {
            timerRef.current = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isLive, startTime]);

    const handleSelectManual = async (manualSummary) => {
        setLoading(true);
        try {
            const fullManual = await getPublishedManualById(manualSummary.id);
            setSelectedManual(fullManual);
            setSteps(extractSteps(fullManual));
        } catch (error) {
            console.error('Error selecting manual:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStart = () => {
        setIsLive(true);
        setStartTime(Date.now());
        setElapsedTime(0);
        setCurrentStepIndex(0);
        setMeasurements([]);
    };

    const handleNextStep = () => {
        const now = Date.now();
        const lastTimestamp = measurements.length > 0
            ? measurements[measurements.length - 1].endTime
            : startTime;

        const duration = (now - lastTimestamp) / 1000;

        const newMeasurement = {
            stepName: steps[currentStepIndex]?.title || `Step ${currentStepIndex + 1}`,
            duration: duration,
            startTime: lastTimestamp,
            endTime: now
        };

        setMeasurements([...measurements, newMeasurement]);

        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = async () => {
        setIsLive(false);
        const finalSession = {
            manualId: selectedManual.id,
            manualTitle: selectedManual.title,
            totalDuration: elapsedTime,
            measurements: measurements,
            timestamp: new Date().toISOString(),
            is_live: true
        };

        try {
            const { error } = await supabase
                .from('measurements')
                .insert([{
                    video_name: `LIVE: ${selectedManual.title}`,
                    measurements: finalSession,
                    cycle_data: { cycles: [finalSession] },
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;
            alert('Session saved successfully!');
            setSelectedManual(null);
        } catch (error) {
            console.error('Error saving live session:', error);
            alert('Failed to save session');
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
                <Activity className="mr-2 animate-spin text-yellow-500" />
                <span>Loading Production Tools...</span>
            </div>
        );
    }

    if (!selectedManual) {
        return (
            <div className="min-h-screen bg-slate-950 px-4 pt-8 pb-32 text-slate-100">
                <h1 className="mb-6 text-2xl font-bold tracking-tight text-white">Select Production Line</h1>
                <div className="grid gap-3">
                    {manuals.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => handleSelectManual(m)}
                            className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900 p-5 text-left transition hover:bg-slate-800 active:scale-95"
                        >
                            <div>
                                <h3 className="font-semibold text-white">{m.title}</h3>
                                <p className="text-sm text-slate-500">{m.documentNumber || 'No Doc ID'}</p>
                            </div>
                            <ChevronRight className="text-slate-600" size={20} />
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-32 focus:outline-none">
            {/* Header */}
            <div className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/80 p-4 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setSelectedManual(null)}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 active:scale-90"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="text-center">
                        <span className="block text-xs font-medium uppercase tracking-widest text-yellow-500">Live Mode</span>
                        <h2 className="text-sm font-semibold text-white">{selectedManual.title}</h2>
                    </div>
                    <div className="w-10"></div>
                </div>
            </div>

            {/* Timer Section */}
            <div className="flex flex-col items-center justify-center p-8">
                <div className="relative mb-4 flex h-48 w-48 items-center justify-center rounded-full border-8 border-slate-900 bg-slate-900/50 shadow-2xl">
                    <div className="absolute inset-0 rounded-full border-4 border-yellow-500/20 blur-sm"></div>
                    <span className="text-5xl font-black tabular-nums text-white">
                        {formatTime(elapsedTime)}
                    </span>
                    {isLive && (
                        <div className="absolute -top-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 shadow-lg shadow-red-500/40">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-white"></span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Recording</span>
                        </div>
                    )}
                </div>

                {!isLive ? (
                    <button
                        onClick={handleStart}
                        className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-yellow-300 to-orange-400 px-10 py-5 text-lg font-bold text-slate-950 shadow-xl shadow-orange-500/20 active:scale-95"
                    >
                        <Play fill="currentColor" size={24} />
                        START RUN
                    </button>
                ) : (
                    <div className="flex w-full gap-4 px-4">
                        <button
                            onClick={() => setIsLive(false)}
                            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white/5 py-5 font-bold text-white active:scale-95"
                        >
                            <Square size={20} />
                            PAUSE
                        </button>
                    </div>
                )}
            </div>

            {/* Steps Section */}
            <div className="px-4">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-400">CURRENT OPERATION</h3>
                    <span className="text-xs text-slate-500">{currentStepIndex + 1} / {steps.length}</span>
                </div>

                <div className="space-y-3">
                    {steps.map((step, idx) => (
                        <div
                            key={idx}
                            className={`flex items-start gap-4 rounded-2xl border p-4 transition-all duration-300 ${idx === currentStepIndex
                                    ? 'border-yellow-500/50 bg-yellow-500/10 shadow-lg'
                                    : idx < currentStepIndex ? 'border-green-500/10 bg-green-500/5 opacity-50' : 'border-white/5 bg-white/5 opacity-30'
                                }`}
                        >
                            <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${idx === currentStepIndex ? 'bg-yellow-500 text-slate-950' : idx < currentStepIndex ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-500'
                                }`}>
                                {idx < currentStepIndex ? <CheckCircle2 size={14} /> : idx + 1}
                            </div>
                            <div className="flex-1">
                                <h4 className={`font-semibold ${idx === currentStepIndex ? 'text-white' : 'text-slate-400'}`}>
                                    {step.title || step.description}
                                </h4>
                                {idx === currentStepIndex && (
                                    <p className="mt-1 text-xs text-slate-400 leading-relaxed italic">
                                        Focus on the movement standard...
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Action Bar */}
            {isLive && (
                <div className="fixed bottom-24 inset-x-0 z-50 px-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { /* Log issue logic */ }}
                            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 active:scale-90"
                        >
                            <AlertCircle size={28} />
                        </button>
                        <button
                            onClick={handleNextStep}
                            className="flex-1 flex h-16 items-center justify-center gap-3 rounded-2xl bg-yellow-300 text-slate-950 font-black text-xl shadow-xl shadow-yellow-500/20 active:scale-95"
                        >
                            {currentStepIndex === steps.length - 1 ? 'COMPLETE' : 'NEXT STEP'}
                            <ChevronRight size={24} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveModePage;
