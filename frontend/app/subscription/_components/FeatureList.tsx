import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FeatureListProps {
  features: string[];
  title?: string;
}

export default function FeatureList({ features, title }: FeatureListProps) {
  return (
    <View>
      {title && (
        <Text className="text-phase2SecondaryTxt dark:text-phase2SecondaryTxtDark text-sm mb-3">
          {title}
        </Text>
      )}
      {features.map((feature, index) => (
        <View key={index} className="flex-row items-start mb-2">
          <Ionicons
            name="checkmark"
            size={20}
            color="#10B981"
            style={{ marginRight: 8, marginTop: 2 }}
          />
          <Text className="text-phase2Titles dark:text-phase2TitlesDark text-base flex-1">
            {feature}
          </Text>
        </View>
      ))}
    </View>
  );
}
