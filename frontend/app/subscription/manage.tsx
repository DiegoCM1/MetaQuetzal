import '../../global.css';
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { track } from '../../utils/analytics';
import MemberListItem from './_components/MemberListItem';
import { getFamilyMembers } from './_services/subscriptionService';
import { FamilyMember } from './_types';

export default function ManageSubscriptionScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    track('subscription_manage_view');
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const membersData = await getFamilyMembers();
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = () => {
    track('subscription_add_member_tap');
    Alert.alert(
      'Añadir miembro',
      'Función en desarrollo para agregar miembros al plan familiar',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-transparent items-center justify-center">
        <ActivityIndicator size="large" color="rgb(50, 180, 200)" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-transparent"
      edges={['left', 'right', 'bottom']}
    >
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-gray-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="rgb(50, 180, 200)"
          />
        </TouchableOpacity>
        <Ionicons
          name="people"
          size={28}
          color="rgb(50, 180, 200)"
        />
        <Text className="text-2xl font-bold text-phase2Titles ml-2">
          Suscripción
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Plan Card */}
        <View className="px-6 py-6">
          <View className="rounded-2xl p-6 relative overflow-hidden" style={{ backgroundColor: '#60A5FA' }}>
            {/* Background pattern */}
            <View className="absolute right-0 top-0 opacity-20">
              <Ionicons name="people" size={120} color="white" />
            </View>

            {/* Content */}
            <View className="relative z-10">
              <Text className="text-white text-2xl font-bold mb-2">
                Plan familiar
              </Text>
              <Text className="text-white text-base mb-4">
                {members.length} personas agregadas
              </Text>

              {/* Add button */}
              <TouchableOpacity
                onPress={handleAddMember}
                className="self-start bg-white rounded-full px-4 py-2 flex-row items-center"
                activeOpacity={0.8}
              >
                <Text className="text-phase2Buttons font-semibold mr-1">
                  Añadir
                </Text>
                <Ionicons name="chevron-forward" size={16} color="rgb(50, 180, 200)" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Members List */}
        <View className="px-6 pb-8">
          {members.map((member) => (
            <MemberListItem key={member.id} member={member} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
