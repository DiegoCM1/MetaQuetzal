import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
 * Custom slider component using buttons (Expo Go compatible)
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
  const handleDecrease = () => {
    if (value > minimumValue) {
      onValueChange(value - step);
    }
  };

  const handleIncrease = () => {
    if (value < maximumValue) {
      onValueChange(value + step);
    }
  };

  // Calculate percentage for visual bars
  const percentage = ((value - minimumValue) / (maximumValue - minimumValue)) * 100;
  const totalBars = maximumValue - minimumValue + 1;

  return (
    <View className="mb-6">
      {/* Label */}
      <Text className="text-sm font-semibold text-gray-700 mb-3">
        {label}
      </Text>

      {/* Control Row */}
      <View className="flex-row items-center justify-between mb-3">
        {/* Decrease Button */}
        <TouchableOpacity
          onPress={handleDecrease}
          disabled={value <= minimumValue}
          className={`w-12 h-12 rounded-full items-center justify-center ${
            value <= minimumValue
              ? 'bg-gray-200'
              : 'bg-phase2Buttons'
          }`}
          accessibilityLabel="Disminuir valor"
        >
          <Ionicons
            name="remove"
            size={24}
            color={value <= minimumValue ? '#9CA3AF' : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* Value Display */}
        <View className="flex-1 mx-4 items-center">
          <View className="bg-phase2Cards px-6 py-3 rounded-2xl">
            <Text className="text-3xl font-bold text-phase2Buttons">
              {value}
            </Text>
          </View>
        </View>

        {/* Increase Button */}
        <TouchableOpacity
          onPress={handleIncrease}
          disabled={value >= maximumValue}
          className={`w-12 h-12 rounded-full items-center justify-center ${
            value >= maximumValue
              ? 'bg-gray-200'
              : 'bg-phase2Buttons'
          }`}
          accessibilityLabel="Aumentar valor"
        >
          <Ionicons
            name="add"
            size={24}
            color={value >= maximumValue ? '#9CA3AF' : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>

      {/* Visual Progress Bars */}
      <View className="flex-row justify-between mb-2" style={{ gap: 4 }}>
        {Array.from({ length: totalBars }).map((_, index) => {
          const barValue = minimumValue + index;
          const isActive = barValue <= value;
          return (
            <View
              key={index}
              className={`flex-1 h-2 rounded-full ${
                isActive
                  ? 'bg-phase2Buttons'
                  : 'bg-gray-200'
              }`}
            />
          );
        })}
      </View>

      {/* Min/Max Labels */}
      {(minimumLabel || maximumLabel) && (
        <View className="flex-row justify-between">
          <Text className="text-xs text-gray-500">
            {minimumLabel || minimumValue}
          </Text>
          <Text className="text-xs text-gray-500">
            {maximumLabel || maximumValue}
          </Text>
        </View>
      )}

      {/* Error Message */}
      {error && (
        <Text className="text-sm text-red-600 mt-2">
          {error}
        </Text>
      )}
    </View>
  );
};
