import { TouchableOpacity, View, StyleSheet, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { colors } from "@/lib/theme";

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function ToggleSwitch({
  value,
  onValueChange,
  disabled = false,
  style,
}: ToggleSwitchProps) {
  const offset = useSharedValue(value ? 22 : 2);
  const bgColor = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    offset.value = withTiming(value ? 22 : 2, { duration: 200 });
    bgColor.value = withTiming(value ? 1 : 0, { duration: 200 });
  }, [value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor:
      bgColor.value > 0.5 ? colors.primary : colors.surfaceLight,
  }));

  return (
    <TouchableOpacity
      onPress={() => !disabled && onValueChange(!value)}
      activeOpacity={0.8}
      disabled={disabled}
      style={style}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
});
