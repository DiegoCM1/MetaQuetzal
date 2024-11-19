import React from 'react';
import { YStack, XStack, Text, Button, Separator } from 'tamagui';

const CardPlan1 = () => {
  return (
    <YStack
      width={300}
      padding={4}
      borderWidth={4}
      borderColor="color3"
      borderRadius={4}
      backgroundColor="color1"
      shadowColor="shadowColor"
      shadowOpacity={0.2}
      shadowRadius={10}
      shadowOffset={{ width: 0, height: 4 }}
    >
      {/* Header */}
      <Text fontSize={24} fontWeight="700" color="color12" marginBottom={2}>
        Plan Pro
      </Text>

      {/* Description */}
      <Text fontSize={8} color="color11" marginBottom={4}>
        Accede a todas las funciones premium con soporte dedicado y más.
      </Text>

      <Separator marginVertical={2} />

      {/* Price and Button */}
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={6} fontWeight="700" color="color12">
          $9.99/mes
        </Text>
        <Button size={4} backgroundColor="color3">
          Suscribirse
        </Button>
      </XStack>
      
    </YStack>

    
  );
};

export default CardPlan1;
