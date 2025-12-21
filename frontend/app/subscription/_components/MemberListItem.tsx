import { View, Text } from 'react-native';
import { FamilyMember } from '../_types';

interface MemberListItemProps {
  member: FamilyMember;
}

export default function MemberListItem({ member }: MemberListItemProps) {
  const distanceText =
    member.distanceUnit === 'km'
      ? `${member.distance} km`
      : `${member.distance} mts`;

  return (
    <View className="flex-row items-center px-6 py-4 bg-white dark:bg-neutral-800 mb-2 rounded-xl">
      {/* Avatar */}
      <View
        className="w-12 h-12 rounded-full items-center justify-center mr-4"
        style={{ backgroundColor: member.avatarColor }}
      >
        <Text className="text-white text-lg font-bold">{member.initials}</Text>
      </View>

      {/* Name */}
      <Text className="flex-1 text-lg font-semibold text-phase2Titles dark:text-phase2TitlesDark">
        {member.name}
      </Text>

      {/* Distance */}
      <Text className="text-base text-phase2SecondaryTxt dark:text-phase2SecondaryTxtDark">
        {distanceText}
      </Text>
    </View>
  );
}
