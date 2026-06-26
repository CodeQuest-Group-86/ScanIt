import React from 'react';
import { ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn, ZoomIn } from 'react-native-reanimated';

type Direction = 'up' | 'down' | 'fade' | 'zoom';
type Delay = number;

interface FadeSlideInProps {
  children: React.ReactNode;
  direction?: Direction;
  delay?: Delay;
  style?: ViewStyle;
}

export default function FadeSlideIn({
  children,
  direction = 'up',
  delay = 0,
  style,
}: FadeSlideInProps) {
  const entering = (() => {
    switch (direction) {
      case 'down':
        return FadeInDown.delay(delay).springify().damping(16).stiffness(100);
      case 'fade':
        return FadeIn.delay(delay).duration(400);
      case 'zoom':
        return ZoomIn.delay(delay).springify().damping(14);
      case 'up':
      default:
        return FadeInUp.delay(delay).springify().damping(16).stiffness(100);
    }
  })();

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
