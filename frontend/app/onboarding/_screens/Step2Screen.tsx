import React, { useState } from 'react';
import { Alert, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      {/* Section: About You */}
      <View className="mb-6">
        <View className="flex-row items-center mb-3">
          <Ionicons name="person-circle" size={24} color="rgb(50, 180, 200)" />
          <Text className="ml-2 text-lg font-semibold text-phase2Titles">
            Sobre Ti
          </Text>
        </View>

        {/* Age Range Dropdown */}
        <FormDropdown
          label="¿Qué edad tienes?"
          value={data.age}
          onValueChange={(value) => updateField('age', value)}
          options={AGE_RANGES}
          placeholder="Selecciona tu rango"
          error={errors.age}
          required
        />

        <Text className="text-xs text-phase2SecondaryTxt mt-1">
          Esto nos ayuda a personalizar las alertas según tu grupo de edad
        </Text>
      </View>

      {/* Section: Your Preferences */}
      <View className="mb-6">
        <View className="flex-row items-center mb-3">
          <Ionicons name="settings" size={24} color="rgb(50, 180, 200)" />
          <Text className="ml-2 text-lg font-semibold text-phase2Titles">
            Tus Preferencias
          </Text>
        </View>

        {/* Nervousness Level Slider */}
        <View className="mb-6">
          <View className="flex-row items-center mb-2">
            <Text className="text-sm font-medium text-phase2Titles">
              😰 Nivel de Ansiedad ante Emergencias
            </Text>
          </View>
          <FormSlider
            label=""
            value={data.nervousnessLevel}
            onValueChange={(value) => updateField('nervousnessLevel', value)}
            minimumValue={1}
            maximumValue={10}
            minimumLabel="Tranquilo"
            maximumLabel="Muy nervioso"
            error={errors.nervousnessLevel}
          />
          <Text className="text-xs text-phase2SecondaryTxt mt-1">
            Ajustaremos el tono de las alertas según tu nivel de ansiedad
          </Text>
        </View>

        {/* Weather Info Level Slider */}
        <View className="mb-4">
          <View className="flex-row items-center mb-2">
            <Text className="text-sm font-medium text-phase2Titles">
              📊 Nivel de Detalle en Información
            </Text>
          </View>
          <FormSlider
            label=""
            value={data.weatherInfoLevel}
            onValueChange={(value) => updateField('weatherInfoLevel', value)}
            minimumValue={1}
            maximumValue={10}
            minimumLabel="Solo lo básico"
            maximumLabel="Todos los detalles"
            error={errors.weatherInfoLevel}
          />
          <Text className="text-xs text-phase2SecondaryTxt mt-1">
            Define cuánta información técnica quieres recibir en las alertas
          </Text>
        </View>
      </View>

      {/* Info Card */}
      <View className="bg-phase2Cards border border-phase2Borders rounded-lg p-4 mb-4">
        <View className="flex-row items-start">
          <Ionicons name="information-circle" size={20} color="rgb(50, 180, 200)" />
          <Text className="ml-2 text-xs text-phase2Titles flex-1">
            Estas preferencias nos ayudan a enviarte alertas más relevantes y adaptadas a ti.
            Puedes cambiarlas en cualquier momento desde Configuración.
          </Text>
        </View>
      </View>
    </WizardContainer>
  );
};
