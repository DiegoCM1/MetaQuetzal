import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

export const FormSlider: React.FC<FormSliderProps> = ({
  label,
  value,
  onValueChange,
  minimumValue = 1,
  maximumValue = 10,
  step = 1,
  minimumLabel,
  maximumLabel,
  error,
}) => {
  const handleDecrease = () => {
    if (value > minimumValue) onValueChange(value - step);
  };

  const handleIncrease = () => {
    if (value < maximumValue) onValueChange(value + step);
  };

  const totalBars = maximumValue - minimumValue + 1;

  return (
    <View className="mb-6">
      {label ? (
        <Text className="text-sm font-semibold text-white mb-3">{label}</Text>
      ) : null}

      <View className="flex-row items-center justify-between mb-3">
        <TouchableOpacity
          onPress={handleDecrease}
          disabled={value <= minimumValue}
          className={`w-12 h-12 rounded-full items-center justify-center ${
            value <= minimumValue ? 'bg-white/20' : 'bg-brand-blue'
          }`}
          accessibilityLabel="Disminuir valor"
        >
          <MaterialCommunityIcons
            name="minus"
            size={24}
            color={value <= minimumValue ? 'rgba(255,255,255,0.4)' : '#FFFFFF'}
          />
        </TouchableOpacity>

        <View className="flex-1 mx-4 items-center">
          <View className="bg-white/10 px-6 py-3 rounded-2xl">
            <Text className="text-3xl font-bold text-brand-cyan">
              {value}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleIncrease}
          disabled={value >= maximumValue}
          className={`w-12 h-12 rounded-full items-center justify-center ${
            value >= maximumValue ? 'bg-white/20' : 'bg-brand-blue'
          }`}
          accessibilityLabel="Aumentar valor"
        >
          <MaterialCommunityIcons
            name="plus"
            size={24}
            color={value >= maximumValue ? 'rgba(255,255,255,0.4)' : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>

      <View className="flex-row justify-between mb-2" style={{ gap: 4 }}>
        {Array.from({ length: totalBars }).map((_, index) => {
          const barValue = minimumValue + index;
          const isActive = barValue <= value;
          return (
            <View
              key={index}
              className={`flex-1 h-2 rounded-full ${isActive ? 'bg-brand-blue' : 'bg-white/20'}`}
            />
          );
        })}
      </View>

      {(minimumLabel || maximumLabel) && (
        <View className="flex-row justify-between">
          <Text className="text-xs text-white/50">{minimumLabel || minimumValue}</Text>
          <Text className="text-xs text-white/50">{maximumLabel || maximumValue}</Text>
        </View>
      )}

      {error && (
        <Text className="text-sm text-red-400 mt-2">{error}</Text>
      )}
    </View>
  );
};
