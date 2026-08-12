import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useEffect, useRef, useState } from "react";
import { TourAnchor } from "../../features/tour/TourAnchor";
import { colors, gradients } from "../../utils/theme";
import { TourProvider } from "../../features/tour/TourProvider";
import { mapTourSteps } from "../../features/tour/mapTourSteps";
import { MAP_TOUR, TOUR_IDS } from "../../features/tour/constants";

const TABS = [
  { name: "MapScreen", label: "Mapa", icon: "map-outline" },
  { name: "ChatAIScreen", label: "IA", icon: "message-text-outline" },
  { name: "AlertsHistoryScreen", label: "Alertas", icon: "bell-outline" },
  { name: "MoreScreen", label: "Más", icon: "menu" },
] as const;

/**
 * The tab Tutorial 1 spotlights. Named rather than compared inline so the
 * spotlight and the tab it points at cannot drift apart: `TABS` is `as const`,
 * so if this route is ever renamed there, the comparison below stops
 * type-checking instead of silently matching nothing and dropping the anchor.
 */
const AI_TAB_NAME = "ChatAIScreen";

const MARKER_WIDTH = 28;

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const markerX = useSharedValue(0);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (tabBarWidth === 0) return;
    const tabWidth = tabBarWidth / TABS.length;
    const targetX = state.index * tabWidth + tabWidth / 2 - MARKER_WIDTH / 2;
    if (isFirstRender.current) {
      markerX.value = targetX;
      isFirstRender.current = false;
    } else {
      markerX.value = withSpring(targetX, { damping: 60, stiffness: 1000 });
    }
  }, [state.index, tabBarWidth]);

  const markerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: markerX.value }],
  }));

  return (
    <View
      style={{
        backgroundColor: gradients.primary[1],
        marginHorizontal: 16,
        marginBottom: Math.max(insets.bottom, 8),
        borderRadius: 30,
        paddingHorizontal: 6,
        paddingBottom: 6,
        paddingTop: 4,
      }}
      onLayout={(e) => {
        setTabBarWidth(e.nativeEvent.layout.width - 12);
      }}
    >
      {/* Animated marker row */}
      <View style={{ height: 6, marginBottom: 2 }}>
        <Animated.View
          style={[
            {
              position: "absolute",
              width: MARKER_WIDTH,
              height: 3,
              borderRadius: 2,
              backgroundColor: colors.brandIndigo,
              top: 1,
            },
            markerStyle,
          ]}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          backgroundColor: colors.brandBlue,
          borderRadius: 24,
          height: 52,
        }}
      >
        {TABS.map((tab) => (
          <Pressable
            key={tab.name}
            onPress={() => navigation.navigate(tab.name)}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            {/* Invisible spotlight target for Tutorial 1, scoped to this one
                tab so the cutout matches what the bubble actually talks about.
                `fill` sizes it to this Pressable, so the bar's own layout —
                and the tab's own press handling — stay untouched by tour
                code. */}
            {tab.name === AI_TAB_NAME && (
              <TourAnchor index={MAP_TOUR.AI_TAB} fill />
            )}

            <MaterialCommunityIcons
              name={tab.icon}
              size={22}
              color="rgb(255, 255, 255)"
            />
            <Text
              style={{
                color: "rgb(255, 255, 255)",
                fontSize: 11,
                fontFamily: "Poppins-Light",
                marginTop: 2,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    // Wraps <Tabs> so both CustomTabBar (rendered through the tabBar prop, but
    // still a React child of the navigator) and every tab screen sit inside the
    // tour context. The overlay is idle-invisible, so this costs nothing when
    // no tour is running.
    <TourProvider tourId={TOUR_IDS.map} steps={mapTourSteps}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: "transparent" },
        }}
      >
        <Tabs.Screen name="MapScreen" />
        <Tabs.Screen name="ChatAIScreen" />
        <Tabs.Screen name="AlertsHistoryScreen" />
        <Tabs.Screen name="MoreScreen" />
      </Tabs>
    </TourProvider>
  );
}
