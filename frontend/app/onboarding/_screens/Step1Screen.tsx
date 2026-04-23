import React, { useState } from 'react';
import { Alert, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { WizardContainer } from '../_components/WizardContainer';
import { FormInput } from '../_components/FormInput';
import { FormDropdown } from '../_components/FormDropdown';
import { useOnboarding } from '../_context/OnboardingContext';
import { validateStep1 } from '../_validation';
import { MEXICO_STATES } from '../_types';
import { track } from '../../../utils/analytics';

/**
 * Step 1: Personal Information Collection
 * Collects name, address, zip code, and state
 */
export const Step1Screen: React.FC = () => {
  const router = useRouter();
  const { data, updateField, updateMultipleFields } = useOnboarding();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const handleUseLocation = async () => {
    setIsLoadingLocation(true);
    console.log('🌍 Starting location request...');

    try {
      // Check if already has permissions
      const existingStatus = await Location.getForegroundPermissionsAsync();
      console.log('📋 Existing permission status:', existingStatus.status);

      let status = existingStatus.status;

      // If not granted, request permissions
      if (status !== 'granted') {
        console.log('📍 Requesting permissions...');
        const permissionResponse = await Location.requestForegroundPermissionsAsync();
        status = permissionResponse.status;
        console.log('✅ Permission status:', status);
      }

      if (status !== 'granted') {
        const canAskAgain = existingStatus.canAskAgain;

        if (canAskAgain) {
          Alert.alert(
            'Permisos necesarios',
            'Por favor acepta el permiso de ubicación en el siguiente cuadro de diálogo.'
          );
        } else {
          // User denied permanently, need to go to settings
          Alert.alert(
            'Permisos denegados',
            'Los permisos de ubicación fueron denegados. Ve a Configuración de la app para habilitarlos.',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Ir a Configuración',
                onPress: () => {
                  // This will be handled by the OS
                  console.log('User should go to settings manually');
                }
              }
            ]
          );
        }

        setIsLoadingLocation(false);
        return;
      }

      // Get current location
      console.log('📡 Getting current position...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      console.log('✅ Location obtained:', location.coords.latitude, location.coords.longitude);

      // Reverse geocode to get address details
      console.log('🔍 Reverse geocoding...');
      const addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      console.log('✅ Addresses received:', addresses);

      const address = addresses[0];

      if (address) {
        console.log('📦 Address details:', address);

        // Update state and postal code
        const updates: any = {};

        if (address.region) {
          updates.state = address.region;
          console.log('State found:', address.region);
        }

        if (address.postalCode) {
          updates.zipCode = address.postalCode;
          console.log('Postal code found:', address.postalCode);
        }

        if (address.street && address.streetNumber) {
          updates.address1 = `${address.street} ${address.streetNumber}`;
        } else if (address.street) {
          updates.address1 = address.street;
        }

        console.log('📝 Updating fields with:', updates);
        updateMultipleFields(updates);

        track('onboarding_location_used', {
          state: address.region,
          hasPostalCode: !!address.postalCode,
        });
      } else {
        console.log('⚠️ No address found in geocode result');
        Alert.alert('Error', 'No pudimos obtener los detalles de tu ubicación.');
      }
    } catch (error: any) {
      console.error('❌ Error getting location:', error);
      console.error('Error details:', error.message, error.code);
      Alert.alert(
        'Error',
        `No pudimos obtener tu ubicación: ${error.message || 'Error desconocido'}`
      );
    } finally {
      console.log('🏁 Location request finished');
      setIsLoadingLocation(false);
    }
  };

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
      {/* Section: Personal Data */}
      <View className="mb-6">
        <View className="flex-row items-center mb-3">
          <Ionicons name="person-circle" size={24} color="rgb(50, 180, 200)" />
          <Text className="ml-2 text-lg font-semibold text-phase2Titles">
            Datos Personales
          </Text>
        </View>

        {/* Name Row: First Name + Last Name */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormInput
              label="Nombre"
              value={data.firstName}
              onChangeText={(value) => updateField('firstName', value)}
              placeholder="Juan"
              error={errors.firstName}
              required
              autoComplete="given-name"
              textContentType="givenName"
            />
          </View>

          <View className="flex-1">
            <FormInput
              label="Apellido"
              value={data.lastName}
              onChangeText={(value) => updateField('lastName', value)}
              placeholder="Hernández"
              error={errors.lastName}
              required
              autoComplete="family-name"
              textContentType="familyName"
            />
          </View>
        </View>

        <Text className="text-xs text-phase2SecondaryTxt mt-1">
          Usaremos tu nombre para personalizar las alertas
        </Text>
      </View>

      {/* Section: Location */}
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Ionicons name="location" size={24} color="rgb(50, 180, 200)" />
            <Text className="ml-2 text-lg font-semibold text-phase2Titles">
              Tu Ubicación
            </Text>
          </View>

          {/* Use Location Button */}
          <TouchableOpacity
            onPress={handleUseLocation}
            disabled={isLoadingLocation}
            className="flex-row items-center bg-phase2Buttons px-3 py-2 rounded-lg"
          >
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="navigate" size={16} color="#fff" />
                <Text className="ml-1 text-xs font-semibold text-white">
                  Usar mi ubicación
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Address Line 1 */}
        <FormInput
          label="Dirección"
          value={data.address1}
          onChangeText={(value) => updateField('address1', value)}
          placeholder="Av. Insurgentes Sur 1234"
          error={errors.address1}
          required
          autoComplete="street-address"
          textContentType="streetAddressLine1"
          autoCapitalize="words"
        />

        {/* Address Line 2 (Optional) */}
        <FormInput
          label="Dirección 2 (Opcional)"
          value={data.address2}
          onChangeText={(value) => updateField('address2', value)}
          placeholder="Depto 5B, Col. Del Valle"
          autoComplete="street-address"
          textContentType="streetAddressLine2"
          autoCapitalize="words"
        />

        {/* Location Row: ZIP Code + State */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormInput
              label="Código Postal"
              value={data.zipCode}
              onChangeText={(value) => updateField('zipCode', value)}
              placeholder="01000"
              error={errors.zipCode}
              required
              keyboardType="number-pad"
              autoComplete="postal-code"
              textContentType="postalCode"
              maxLength={5}
            />
          </View>

          <View className="flex-1">
            <FormDropdown
              label="Estado"
              value={data.state}
              onValueChange={(value) => updateField('state', value)}
              options={MEXICO_STATES}
              placeholder="Selecciona"
              error={errors.state}
              required
            />
          </View>
        </View>

        <Text className="text-xs text-phase2SecondaryTxt mt-1">
          Necesitamos tu ubicación para enviarte alertas relevantes de tu zona
        </Text>
      </View>
    </WizardContainer>
  );
};
