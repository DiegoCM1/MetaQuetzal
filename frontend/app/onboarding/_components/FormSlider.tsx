import React from 'react';
import { View, Text } from 'react-native';
import Slider from '@react-native-community/slider';

interface FormSliderProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  minimumLabel?: string;
  maximumLabel?: string;
  showValue?: boolean;
  error?: string;
}

/**
 * Slider component with labels and current value display
 * Used for nervousness and weather info levels (1-10)
 */
export const FormSlider: React.FC<FormSliderProps> = ({
  label,
  value,
  onValueChange,
  minimumValue = 1,
  maximumValue = 10,
  step = 1,
  minimumLabel,
  maximumLabel,
  showValue = true,
  error,
}) => {
  return (
    <View className="mb-6">
      {/* Label with Value */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {label}
        </Text>
        {showValue && (
          <View className="bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full">
            <Text className="text-sm font-bold text-blue-700 dark:text-blue-300">
              {value}
            </Text>
          </View>
        )}
      </View>

      {/* Slider */}
      <Slider
        value={value}
        onValueChange={onValueChange}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        minimumTrackTintColor="#3B82F6" // blue-500
        maximumTrackTintColor="#D1D5DB" // gray-300
        thumbTintColor="#3B82F6" // blue-500
        accessibilityLabel={label}
        accessibilityValue={{
          min: minimumValue,
          max: maximumValue,
          now: value,
        }}
      />

      {/* Min/Max Labels */}
      {(minimumLabel || maximumLabel) && (
        <View className="flex-row justify-between mt-1">
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {minimumLabel || minimumValue}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {maximumLabel || maximumValue}
          </Text>
        </View>
      )}

      {/* Error Message */}
      {error && (
        <Text className="text-sm text-red-600 dark:text-red-400 mt-2">
          {error}
        </Text>
      )}
    </View>
  );
};
