import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FormDropdownProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  error?: string;
  required?: boolean;
}

/**
 * Custom dropdown/picker component
 * Native Picker has poor styling control, this gives better UX
 */
export const FormDropdown: React.FC<FormDropdownProps> = ({
  label,
  value,
  onValueChange,
  options,
  placeholder = 'Selecciona una opción',
  error,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setIsOpen(false);
  };

  return (
    <View className="mb-4">
      {/* Label */}
      <Text className="text-sm font-semibold text-gray-700 mb-2">
        {label}
        {required && <Text className="text-red-500"> *</Text>}
      </Text>

      {/* Trigger Button */}
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        className={`px-4 py-3 rounded-lg flex-row items-center justify-between ${
          error
            ? 'border-2 border-red-500 bg-red-50'
            : 'border border-gray-300 bg-white'
        }`}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityHint="Abre el selector de opciones"
      >
        <Text
          className={
            value
              ? 'text-base text-gray-900'
              : 'text-base text-gray-400'
          }
        >
          {value || placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          color="#9CA3AF"
        />
      </TouchableOpacity>

      {/* Error Message */}
      {error && (
        <Text className="text-sm text-red-600 mt-1">
          {error}
        </Text>
      )}

      {/* Modal Picker */}
      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          className="flex-1 justify-end bg-black/50"
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View className="bg-white rounded-t-3xl max-h-96">
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-gray-900">
                {label}
              </Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Options List */}
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  className="px-6 py-4 border-b border-gray-100"
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`text-base ${
                        item === value
                          ? 'font-semibold text-phase2Buttons'
                          : 'text-gray-900'
                      }`}
                    >
                      {item}
                    </Text>
                    {item === value && (
                      <Ionicons name="checkmark" size={20} color="rgb(50, 180, 200)" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
