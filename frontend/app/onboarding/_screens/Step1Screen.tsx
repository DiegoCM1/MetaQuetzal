import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { WizardContainer } from '../_components/WizardContainer';
import { FormInput } from '../_components/FormInput';
import { useOnboarding } from '../_context/OnboardingContext';
import { validateStep1 } from '../_validation';
import { track } from '../../../utils/analytics';

/**
 * Step 1: Personal Information Collection
 * Collects name, address, zip code, and city
 */
export const Step1Screen: React.FC = () => {
  const router = useRouter();
  const { data, updateField } = useOnboarding();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleNext = () => {
    // Validate form
    const validation = validateStep1(data);

    if (!validation.isValid) {
      setErrors(validation.errors);
      // Show first error as alert
      const firstError = Object.values(validation.errors)[0];
      Alert.alert('Error de validación', firstError);
      return;
    }

    // Clear errors and proceed
    setErrors({});
    track('onboarding_step1_completed', {
      has_address2: !!data.address2,
    });
    router.push('/onboarding/step2');
  };

  return (
    <WizardContainer
      currentStep={1}
      totalSteps={2}
      title="Información Personal"
      subtitle="Ayúdanos a conocerte mejor para brindarte alertas más precisas"
      onNext={handleNext}
      nextLabel="Continuar"
    >
      {/* First Name */}
      <FormInput
        label="Nombre"
        value={data.firstName}
        onChangeText={(value) => updateField('firstName', value)}
        placeholder="Michael"
        error={errors.firstName}
        required
        autoComplete="given-name"
        textContentType="givenName"
      />

      {/* Last Name */}
      <FormInput
        label="Apellido"
        value={data.lastName}
        onChangeText={(value) => updateField('lastName', value)}
        placeholder="Johnson"
        error={errors.lastName}
        required
        autoComplete="family-name"
        textContentType="familyName"
      />

      {/* Address Line 1 */}
      <FormInput
        label="Dirección"
        value={data.address1}
        onChangeText={(value) => updateField('address1', value)}
        placeholder="123 Calle Principal"
        error={errors.address1}
        required
        autoComplete="street-address"
        textContentType="streetAddressLine1"
        autoCapitalize="words"
      />

      {/* Address Line 2 (Optional) */}
      <FormInput
        label="Dirección 2"
        value={data.address2}
        onChangeText={(value) => updateField('address2', value)}
        placeholder="Apt 4B, Edificio Norte (Opcional)"
        autoComplete="street-address"
        textContentType="streetAddressLine2"
        autoCapitalize="words"
      />

      {/* ZIP Code */}
      <FormInput
        label="Código Postal"
        value={data.zipCode}
        onChangeText={(value) => updateField('zipCode', value)}
        placeholder="00926"
        error={errors.zipCode}
        required
        keyboardType="number-pad"
        autoComplete="postal-code"
        textContentType="postalCode"
        maxLength={5}
      />

      {/* City */}
      <FormInput
        label="Ciudad"
        value={data.city}
        onChangeText={(value) => updateField('city', value)}
        placeholder="San Juan"
        error={errors.city}
        required
        autoComplete="street-address"
        textContentType="addressCity"
        autoCapitalize="words"
      />
    </WizardContainer>
  );
};
