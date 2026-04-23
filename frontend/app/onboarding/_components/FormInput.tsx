import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
}

/**
 * Styled text input with label and error handling
 * Matches app's design system with dark mode support
 */
export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  required = false,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'words',
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="mb-4">
      {/* Label */}
      <Text className="text-sm font-semibold text-gray-700 mb-2">
        {label}
        {required && <Text className="text-red-500"> *</Text>}
      </Text>

      {/* Input */}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`px-4 py-3 rounded-lg text-base text-gray-900 ${
          error
            ? 'border-2 border-red-500 bg-red-50'
            : isFocused
            ? 'border-2 border-phase2Buttons bg-white'
            : 'border border-gray-300 bg-white'
        }`}
        accessibilityLabel={label}
        accessibilityHint={placeholder}
        {...rest}
      />

      {/* Error Message */}
      {error && (
        <Text className="text-sm text-red-600 mt-1">
          {error}
        </Text>
      )}
    </View>
  );
};
