import "../../global.css";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams } from "expo-router";
import Main from "../map";

const MapScreen = () => {
  const { alertLat, alertLon, alertTitle, alertLevel } = useLocalSearchParams<{
    alertLat?: string;
    alertLon?: string;
    alertTitle?: string;
    alertLevel?: string;
  }>();

  const focusLat = alertLat ? parseFloat(alertLat) : undefined;
  const focusLon = alertLon ? parseFloat(alertLon) : undefined;

  return (
    <>
      <StatusBar style="light" translucent={false} />
      <Main
        focusLat={focusLat}
        focusLon={focusLon}
        focusTitle={alertTitle}
        focusLevel={alertLevel ? parseInt(alertLevel, 10) : undefined}
      />
    </>
  );
};

export default MapScreen;
