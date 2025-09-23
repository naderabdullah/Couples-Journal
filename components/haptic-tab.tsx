// components/haptic-tab.tsx
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <Pressable
      android_ripple={{
        color: 'rgba(236, 72, 153, 0.1)',
        borderless: true,
        radius: 50,
      }}
      style={({ pressed }) => [
        props.style,
        styles.tabButton,
        {
          opacity: pressed ? 0.7 : 1,
          transform: pressed ? [{ scale: 0.95 }] : [{ scale: 1 }],
        },
      ]}
      onPressIn={(ev) => {
        if (Platform.OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
      onPress={props.onPress}
      accessibilityLabel={props.accessibilityLabel}
      testID={props.testID}
      disabled={props.disabled}
    >
      {props.children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
});