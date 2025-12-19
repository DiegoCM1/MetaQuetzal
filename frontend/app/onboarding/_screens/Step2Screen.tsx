import React, { useState } from 'react';
import { Alert } from 'react-native';
import { WizardContainer } from '../_components/WizardContainer';
import { FormSlider } from '../_components/FormSlider';
import { FormDropdown } from '../_components/FormDropdown';
import { useOnboarding } from '../_context/OnboardingContext';
import { validateStep2 } from '../_validation';
import { AGE_RANGES } from '../_types';
import { track } from '../../../utils/analytics';
import { useRouter } from 'expo-router';

/**
 * Step 2: User Preferences Collection
 * Collects nervousness level, age range, and weather info preferences
 */
export const Step2Screen: React.FC = () => {
  const router = useRouter();
  const { data, updateField, submitOnboarding } = useOnboarding();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleFinish = async () => {
    // Validate form
    const validation = validateStep2(data);

    if (!validation.isValid) {
      setErrors(validation.errors);
      // Show first error as alert
      const firstError = Object.values(validation.errors)[0];
      Alert.alert('Error de validación', firstError);
      return;
    }

    // Clear errors and submit
    setErrors({});
    setIsSubmitting(true);

    try {
      track('onboarding_step2_completed');
      await submitOnboarding();
      // Navigation handled by submitOnboarding in context
    } catch (error) {
      console.error('Error submitting onboarding:', error);
      Alert.alert(
        'Error',
        'Hubo un problema al guardar tu información. Por favor intenta de nuevo.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <WizardContainer
      currentStep={2}
      totalSteps={2}
      title="Preferencias"
      subtitle="Personaliza tu experiencia con BluEye"
      onNext={handleFinish}
      onBack={handleBack}
      nextLabel="Finalizar"
      backLabel="Atrás"
      isLoading={isSubmitting}
    >
      {/* Nervousness Level Slider */}
      <FormSlider
        label="¿Qué tan nervioso eres del 1 al 10?"
        value={data.nervousnessLevel}
        onValueChange={(value) => updateField('nervousnessLevel', value)}
        minimumValue={1}
        maximumValue={10}
        minimumLabel="Nada"
        maximumLabel="Mucho"
        error={errors.nervousnessLevel}
      />

      {/* Age Range Dropdown */}
      <FormDropdown
        label="¿Qué edad tienes?"
        value={data.age}
        onValueChange={(value) => updateField('age', value)}
        options={AGE_RANGES}
        placeholder="Elige tu edad"
        error={errors.age}
        required
      />

      {/* Weather Info Level Slider */}
      <FormSlider
        label="¿Qué tan informado quieres estar acerca de las condiciones de tiempo?"
        value={data.weatherInfoLevel}
        onValueChange={(value) => updateField('weatherInfoLevel', value)}
        minimumValue={1}
        maximumValue={10}
        minimumLabel="Poco"
        maximumLabel="Muy informado"
        error={errors.weatherInfoLevel}
      />
    </WizardContainer>
  );
};
