import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '@/src/lib/constants';

interface ProgressRingProps {
  current: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function ProgressRing({ current, target, size = 180, strokeWidth = 12, label }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / target, 1.5);
  const strokeDashoffset = circumference * (1 - progress);
  const isOver = current > target;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={COLORS.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isOver ? COLORS.danger : COLORS.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.value, isOver && { color: COLORS.danger }]}>
          {current.toLocaleString()}
        </Text>
        <Text style={styles.target}>/ {target.toLocaleString()} kcal</Text>
        {label && <Text style={styles.label}>{label}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  value: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  target: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  label: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
});
