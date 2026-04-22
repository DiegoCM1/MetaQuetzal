import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TABS = [
  { name: "MapScreen",          label: "Mapa",    icon: "map-outline"          },
  { name: "ChatAIScreen",       label: "IA",      icon: "message-text-outline" },
  { name: "AlertsHistoryScreen",label: "Alertas", icon: "bell-outline"         },
  { name: "MoreScreen",         label: "Más",     icon: "menu"                 },
] as const

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()

  return (
    <View style={{
      backgroundColor: 'rgb(6, 15, 30)',
      marginHorizontal: 16,
      marginBottom: Math.max(insets.bottom, 8),
      borderRadius: 30,
      padding: 6,
    }}>
      <View style={{
        flexDirection: 'row',
        backgroundColor: 'rgb(49, 103, 255)',
        borderRadius: 24,
        height: 52,
      }}>
      {TABS.map((tab, index) => {
        const focused = state.index === index
        return (
          <Pressable
            key={tab.name}
            onPress={() => navigation.navigate(tab.name)}
            style={{
              flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%',
            }}
          >
            {focused && (
              <View style={{
                position: 'absolute', top: 6, width: 28, height: 3,
                borderRadius: 2, backgroundColor: 'rgb(255, 255, 255)',
              }} />
            )}
            <MaterialCommunityIcons
              name={tab.icon}
              size={22}
              color="rgb(255, 255, 255)"
            />
            <Text style={{
              color: 'rgb(255, 255, 255)',
              fontSize: 11,
              fontFamily: 'Poppins-Light',
              marginTop: 2,
            }}>
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
      </View>
    </View>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="MapScreen" />
      <Tabs.Screen name="ChatAIScreen" />
      <Tabs.Screen name="AlertsHistoryScreen" />
      <Tabs.Screen name="MoreScreen" />
    </Tabs>
  );
}
