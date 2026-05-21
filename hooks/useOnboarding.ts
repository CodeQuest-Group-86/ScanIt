import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'scanit_onboarding_complete';

export function useOnboarding() {
  const [isComplete, setIsComplete] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then(val => {
      setIsComplete(val === 'true');
    });
  }, []);

  const complete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setIsComplete(true);
  };

  const reset = async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setIsComplete(false);
  };

  return { isComplete, complete, reset };
}
