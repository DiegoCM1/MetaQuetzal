import "../../global.css";
import { StatusBar } from "expo-status-bar";
import Main from "../map";

const MapScreen = () => (
  <>
    <StatusBar style="light" translucent={false} />
    <Main />
  </>
);

export default MapScreen;
