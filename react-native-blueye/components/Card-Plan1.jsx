import React from 'react';
import { YStack, XStack, Text, Button, Separator } from 'tamagui';

const CardPlan1 = ({ header, description, price }) => {
  return (
    <YStack
      className="mb-5"
      width={300}
      height={110}
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
        {header}
      </Text>

      {/* Description */}
      <Text fontSize={12} color="color11" marginBottom={4}>
        {description}
      </Text>

      <Separator marginVertical={2} />

      {/* Price and Button */}
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={10} fontWeight="700" color="color12">
          {price}
        </Text>
        <Button size={10} backgroundColor="color3" className='bg-green-600'>
          Suscribirse
        </Button>
      </XStack>
    </YStack>
  );
};

export default CardPlan1;
