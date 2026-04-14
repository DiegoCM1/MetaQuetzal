import "../../global.css";
import { StatusBar } from "expo-status-bar";
import Main from "../../components/Main";

const MapScreen = () => (
  <>
    <StatusBar style="light" translucent={false} />
    <Main />
  </>
);

export default MapScreen;
