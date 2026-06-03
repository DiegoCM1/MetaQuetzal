import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../../utils/theme';

interface FeatureListProps {
  features: string[];
  title?: string;
}

export default function FeatureList({ features, title }: FeatureListProps) {
  return (
    <View>
      {title && (
        <Text style={{ fontFamily: fonts.poppinsSemiBold, color: 'rgba(255,255,255,0.6)', fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>
          {title}
        </Text>
      )}
      {features.map((feature, index) => (
        <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
          <Ionicons name="checkmark" size={18} color={colors.brandGreen} style={{ marginRight: 10, marginTop: 2 }} />
          <Text style={{ fontFamily: fonts.poppins, color: 'white', fontSize: 14, flex: 1 }}>
            {feature}
          </Text>
        </View>
      ))}
    </View>
  );
}
