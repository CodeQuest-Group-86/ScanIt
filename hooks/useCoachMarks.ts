import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'scanit_coach_marks_seen';

export type CoachMarkId =
  | 'home_welcome'
  | 'home_scan_cta'
  | 'tab_scan'
  | 'tab_saved'
  | 'tab_history';

export interface CoachStep {
  id: CoachMarkId;
  title: string;
  body: string;
  lottie?: 'scan' | 'shopping' | 'smart' | 'loading';
}

export const HOME_COACH_STEPS: CoachStep[] = [
  {
    id: 'home_welcome',
    title: 'Welcome to ScanIt',
    body: 'Your AI-powered scanner for Ghana. Compare prices, verify authenticity, and find sellers instantly.',
    lottie: 'smart',
  },
  {
    id: 'home_scan_cta',
    title: 'Tap to scan',
    body: 'Point your camera at any product — no barcode needed. Get prices from Jumia, Tonaton, and local markets.',
    lottie: 'scan',
  },
  {
    id: 'tab_scan',
    title: 'Quick scan button',
    body: 'The centre tab is always one tap away. Use barcode mode for packaged goods or photo mode for anything else.',
    lottie: 'scan',
  },
  {
    id: 'tab_saved',
    title: 'Save products',
    body: 'Bookmark items to track prices over time. Tap the bookmark icon on any scan result.',
    lottie: 'shopping',
  },
];

export function useCoachMarks(steps: CoachStep[]) {
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      const parsed: string[] = raw ? JSON.parse(raw) : [];
      setSeen(new Set(parsed));
      setReady(true);
    });
  }, []);

  const pendingSteps = steps.filter(s => !seen.has(s.id));

  const startTour = useCallback(() => {
    if (pendingSteps.length > 0) setActiveIndex(0);
  }, [pendingSteps.length]);

  useEffect(() => {
    if (ready && pendingSteps.length > 0) {
      const t = setTimeout(() => setActiveIndex(0), 600);
      return () => clearTimeout(t);
    }
  }, [ready, pendingSteps.length]);

  const dismiss = useCallback(async () => {
    if (activeIndex === null) return;
    const step = pendingSteps[activeIndex];
    if (!step) return;

    const nextSeen = new Set([...seen, step.id]);
    setSeen(nextSeen);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...nextSeen]));

    if (activeIndex + 1 < pendingSteps.length) {
      setActiveIndex(activeIndex + 1);
    } else {
      setActiveIndex(null);
    }
  }, [activeIndex, pendingSteps, seen]);

  const skipAll = useCallback(async () => {
    const allIds = steps.map(s => s.id);
    const nextSeen = new Set([...seen, ...allIds]);
    setSeen(nextSeen);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...nextSeen]));
    setActiveIndex(null);
  }, [steps, seen]);

  const activeStep =
    activeIndex !== null && pendingSteps[activeIndex] ? pendingSteps[activeIndex] : null;

  const stepNumber = activeIndex !== null ? activeIndex + 1 : 0;
  const totalSteps = pendingSteps.length;

  return {
    ready,
    activeStep,
    stepNumber,
    totalSteps,
    isVisible: activeStep !== null,
    dismiss,
    skipAll,
    startTour,
    hasPending: pendingSteps.length > 0,
  };
}
