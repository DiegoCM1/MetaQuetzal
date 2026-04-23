import React, { ReactNode } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProgressIndicator } from './ProgressIndicator';

interface WizardContainerProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  isLoading?: boolean;
}

/**
 * Reusable wizard container with progress indicator and navigation
 * Handles keyboard, safe areas, and consistent layout
 */
export const WizardContainer: React.FC<WizardContainerProps> = ({
  currentStep,
  totalSteps,
  title,
  subtitle,
  children,
  onNext,
  onBack,
  nextLabel = 'Continuar',
  backLabel = 'Atrás',
  nextDisabled = false,
  isLoading = false,
}) => {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header with Progress */}
        <View className="bg-phase2Cards border-b border-gray-200">
          <ProgressIndicator totalSteps={totalSteps} currentStep={currentStep} />
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title Section */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              {title}
            </Text>
            {subtitle && (
              <Text className="text-base text-gray-600">
                {subtitle}
              </Text>
            )}
          </View>

          {/* Form Content */}
          {children}
        </ScrollView>

        {/* Footer with Navigation Buttons */}
        <View className="px-6 py-4 bg-white border-t border-gray-200">
          <View className="flex-row gap-3">
            {/* Back Button (conditional) */}
            {onBack && (
              <TouchableOpacity
                onPress={onBack}
                disabled={isLoading}
                className="flex-1 py-4 bg-gray-200 rounded-lg items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={backLabel}
              >
                <Text className="text-base font-semibold text-gray-700">
                  {backLabel}
                </Text>
              </TouchableOpacity>
            )}

            {/* Next/Continue Button */}
            <TouchableOpacity
              onPress={onNext}
              disabled={nextDisabled || isLoading}
              className={`py-4 rounded-lg items-center justify-center ${
                onBack ? 'flex-1' : 'w-full'
              } ${
                nextDisabled || isLoading
                  ? 'bg-gray-300'
                  : 'bg-phase2Buttons'
              }`}
              accessibilityRole="button"
              accessibilityLabel={nextLabel}
              accessibilityState={{ disabled: nextDisabled || isLoading }}
            >
              <Text
                className={`text-base font-semibold ${
                  nextDisabled || isLoading
                    ? 'text-gray-500'
                    : 'text-white'
                }`}
              >
                {isLoading ? 'Cargando...' : nextLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
