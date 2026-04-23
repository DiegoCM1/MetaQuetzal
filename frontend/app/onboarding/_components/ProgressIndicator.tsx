import React from 'react';
import { View } from 'react-native';

interface ProgressIndicatorProps {
  totalSteps: number;
  currentStep: number;
}

/**
 * Progress indicator showing current step in wizard
 * Displays dots with fill state based on completion
 */
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  totalSteps,
  currentStep,
}) => {
  return (
    <View className="flex-row items-center justify-center gap-3 py-4">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <View
            key={stepNumber}
            className={`h-3 rounded-full ${
              isCompleted || isActive
                ? 'w-4 bg-phase2Buttons'
                : 'w-3 bg-gray-300'
            }`}
            accessibilityLabel={`Paso ${stepNumber} de ${totalSteps}`}
            accessibilityRole="progressbar"
          />
        );
      })}
    </View>
  );
};
