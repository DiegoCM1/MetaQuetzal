const fs = require("fs");
const path = require("path");
const {
  createRunOncePlugin,
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withMainApplication,
} = require("@expo/config-plugins");

const PKG = "with-nearby-connections";
const VERSION = "1.0.0";
const DEPENDENCY =
  'implementation("com.google.android.gms:play-services-nearby:19.3.0")';

function ensureDependency(src) {
  if (src.includes("play-services-nearby")) {
    return src;
  }

  return src.replace(
    /dependencies\s?{/,
    (match) => `${match}\n    ${DEPENDENCY}`,
  );
}

function ensureImport(src, statement) {
  if (src.includes(statement)) {
    return src;
  }

  const packageMatch = src.match(/package .+\n/);
  if (!packageMatch) {
    return `${statement}\n${src}`;
  }

  return src.replace(packageMatch[0], `${packageMatch[0]}\n${statement}\n`);
}

function ensureMainApplicationRegistration(src, packageName) {
  const importStatement = `import ${packageName}.nearby.NearbyConnectionsPackage`;
  let next = ensureImport(src, importStatement);

  if (next.includes("NearbyConnectionsPackage()")) {
    return next;
  }

  if (next.includes("PackageList(this).packages.apply {")) {
    return next.replace(
      "PackageList(this).packages.apply {",
      "PackageList(this).packages.apply {\n        add(NearbyConnectionsPackage())",
    );
  }

  if (next.includes("val packages = PackageList(this).packages")) {
    return next.replace(
      "val packages = PackageList(this).packages",
      "val packages = PackageList(this).packages\n      packages.add(NearbyConnectionsPackage())",
    );
  }

  if (
    next.includes(
      "List<ReactPackage> packages = new PackageList(this).getPackages();",
    )
  ) {
    return next.replace(
      "List<ReactPackage> packages = new PackageList(this).getPackages();",
      "List<ReactPackage> packages = new PackageList(this).getPackages();\n      packages.add(new NearbyConnectionsPackage());",
    );
  }

  return next;
}

function ensurePermission(manifest, permission) {
  manifest.manifest["uses-permission"] =
    manifest.manifest["uses-permission"] || [];
  const alreadyPresent = manifest.manifest["uses-permission"].some(
    (entry) => entry.$["android:name"] === permission,
  );

  if (!alreadyPresent) {
    manifest.manifest["uses-permission"].push({
      $: { "android:name": permission },
    });
  }

  return manifest;
}

function buildNearbyModuleSource(packageName) {
  return `package ${packageName}.nearby

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.AdvertisingOptions
import com.google.android.gms.nearby.connection.ConnectionInfo
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback
import com.google.android.gms.nearby.connection.ConnectionResolution
import com.google.android.gms.nearby.connection.ConnectionsClient
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo
import com.google.android.gms.nearby.connection.DiscoveryOptions
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback
import com.google.android.gms.nearby.connection.Payload
import com.google.android.gms.nearby.connection.PayloadCallback
import com.google.android.gms.nearby.connection.PayloadTransferUpdate
import com.google.android.gms.nearby.connection.Strategy
import java.nio.charset.StandardCharsets

class NearbyConnectionsModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  private val connectionsClient: ConnectionsClient = Nearby.getConnectionsClient(reactContext)
  private val strategy: Strategy = Strategy.P2P_POINT_TO_POINT
  private val serviceId: String = reactContext.packageName + ".nearby.chat"
  private val endpointNames = mutableMapOf<String, String>()
  private var localEndpointName: String = "BluEye"
  private var connectedEndpointId: String? = null

  override fun getName(): String = "NearbyConnections"

  private fun emit(eventName: String, params: Map<String, Any?> = emptyMap()) {
    val payload: WritableMap = Arguments.createMap()
    for ((key, value) in params) {
      when (value) {
        null -> payload.putNull(key)
        is String -> payload.putString(key, value)
        is Boolean -> payload.putBoolean(key, value)
        is Int -> payload.putInt(key, value)
        is Double -> payload.putDouble(key, value)
        else -> payload.putString(key, value.toString())
      }
    }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, payload)
  }

  private fun endpointName(endpointId: String): String {
    return endpointNames[endpointId] ?: endpointId
  }

  private val payloadCallback = object : PayloadCallback() {
    override fun onPayloadReceived(endpointId: String, payload: Payload) {
      val bytes = payload.asBytes() ?: return
      val message = String(bytes, StandardCharsets.UTF_8)
      emit(
        "NearbyMessageReceived",
        mapOf(
          "endpointId" to endpointId,
          "endpointName" to endpointName(endpointId),
          "message" to message,
        )
      )
    }

    override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) {
      // No-op: text messages are tiny and we only surface delivery at a high level.
    }
  }

  private val connectionLifecycleCallback = object : ConnectionLifecycleCallback() {
    override fun onConnectionInitiated(endpointId: String, connectionInfo: ConnectionInfo) {
      endpointNames[endpointId] = connectionInfo.endpointName
      emit(
        "NearbyConnectionInitiated",
        mapOf(
          "endpointId" to endpointId,
          "endpointName" to connectionInfo.endpointName,
        )
      )
      connectionsClient.acceptConnection(endpointId, payloadCallback)
    }

    override fun onConnectionResult(endpointId: String, resolution: ConnectionResolution) {
      if (resolution.status.isSuccess) {
        connectedEndpointId = endpointId
        emitState("connected")
        emit(
          "NearbyConnectionConnected",
          mapOf(
            "endpointId" to endpointId,
            "endpointName" to endpointName(endpointId),
          )
        )
      } else {
        emitState("error")
        emit("NearbyConnectionFailed", mapOf("endpointId" to endpointId))
      }
    }

    override fun onDisconnected(endpointId: String) {
      if (connectedEndpointId == endpointId) {
        connectedEndpointId = null
      }
      emitState("idle")
      emit(
        "NearbyDisconnected",
        mapOf(
          "endpointId" to endpointId,
          "endpointName" to endpointName(endpointId),
        )
      )
    }
  }

  private val endpointDiscoveryCallback = object : EndpointDiscoveryCallback() {
    override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
      endpointNames[endpointId] = info.endpointName
      emit(
        "NearbyEndpointFound",
        mapOf(
          "endpointId" to endpointId,
          "endpointName" to info.endpointName,
        )
      )
    }

    override fun onEndpointLost(endpointId: String) {
      emit(
        "NearbyEndpointLost",
        mapOf(
          "endpointId" to endpointId,
          "endpointName" to endpointName(endpointId),
        )
      )
    }
  }

  private fun emitState(state: String) {
    emit("NearbyStateChanged", mapOf("state" to state))
  }

  @ReactMethod
  fun startAdvertising(displayName: String?, promise: Promise) {
    localEndpointName = displayName?.takeIf { it.isNotBlank() } ?: "BluEye"
    val options = AdvertisingOptions.Builder().setStrategy(strategy).build()

    connectionsClient
      .startAdvertising(localEndpointName, serviceId, connectionLifecycleCallback, options)
      .addOnSuccessListener {
        emitState("advertising")
        promise.resolve(true)
      }
      .addOnFailureListener { error ->
        emitState("error")
        promise.reject("NEARBY_ADVERTISING_FAILED", error.message, error)
      }
  }

  @ReactMethod
  fun startDiscovery(promise: Promise) {
    val options = DiscoveryOptions.Builder().setStrategy(strategy).build()

    connectionsClient
      .startDiscovery(serviceId, endpointDiscoveryCallback, options)
      .addOnSuccessListener {
        emitState("discovering")
        promise.resolve(true)
      }
      .addOnFailureListener { error ->
        emitState("error")
        promise.reject("NEARBY_DISCOVERY_FAILED", error.message, error)
      }
  }

  @ReactMethod
  fun requestConnection(endpointId: String, promise: Promise) {
    connectionsClient
      .requestConnection(localEndpointName, endpointId, connectionLifecycleCallback)
      .addOnSuccessListener {
        emitState("connecting")
        promise.resolve(true)
      }
      .addOnFailureListener { error ->
        emitState("error")
        promise.reject("NEARBY_REQUEST_CONNECTION_FAILED", error.message, error)
      }
  }

  @ReactMethod
  fun sendMessage(message: String, promise: Promise) {
    val endpointId = connectedEndpointId
    if (endpointId == null) {
      promise.reject("NEARBY_NOT_CONNECTED", "No connected endpoint")
      return
    }

    connectionsClient
      .sendPayload(endpointId, Payload.fromBytes(message.toByteArray(StandardCharsets.UTF_8)))
      .addOnSuccessListener { promise.resolve(true) }
      .addOnFailureListener { error ->
        promise.reject("NEARBY_SEND_FAILED", error.message, error)
      }
  }

  @ReactMethod
  fun disconnect(promise: Promise) {
    connectedEndpointId?.let {
      connectionsClient.disconnectFromEndpoint(it)
    }
    connectedEndpointId = null
    emitState("idle")
    promise.resolve(true)
  }

  @ReactMethod
  fun stopAll(promise: Promise) {
    connectionsClient.stopAdvertising()
    connectionsClient.stopDiscovery()
    connectionsClient.stopAllEndpoints()
    connectedEndpointId = null
    endpointNames.clear()
    emitState("idle")
    promise.resolve(true)
  }
}
`;
}

function buildNearbyPackageSource(packageName) {
  return `package ${packageName}.nearby

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class NearbyConnectionsPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(NearbyConnectionsModule(reactContext))
  }

  override fun createViewManagers(
    reactContext: ReactApplicationContext
  ): List<ViewManager<*, *>> {
    return emptyList()
  }
}
`;
}

const withNearbyConnections = (config) => {
  config = withAndroidManifest(config, (mod) => {
    ensurePermission(mod.modResults, "android.permission.ACCESS_FINE_LOCATION");
    ensurePermission(
      mod.modResults,
      "android.permission.ACCESS_COARSE_LOCATION",
    );
    ensurePermission(mod.modResults, "android.permission.BLUETOOTH_ADVERTISE");
    ensurePermission(mod.modResults, "android.permission.BLUETOOTH_CONNECT");
    ensurePermission(mod.modResults, "android.permission.BLUETOOTH_SCAN");
    ensurePermission(mod.modResults, "android.permission.NEARBY_WIFI_DEVICES");
    // Nearby Connections upgrades to Wi-Fi for the high-bandwidth link, so it
    // needs the Wi-Fi-state permissions (normal/install-time). Missing
    // CHANGE_WIFI_STATE is what raises status 8033.
    ensurePermission(mod.modResults, "android.permission.ACCESS_WIFI_STATE");
    ensurePermission(mod.modResults, "android.permission.CHANGE_WIFI_STATE");
    // Legacy Bluetooth permissions for Android < 12 (e.g. the old test device).
    ensurePermission(mod.modResults, "android.permission.BLUETOOTH");
    ensurePermission(mod.modResults, "android.permission.BLUETOOTH_ADMIN");
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = ensureDependency(mod.modResults.contents);
    return mod;
  });

  config = withMainApplication(config, (mod) => {
    const packageName = config.android?.package || "com.bluai.app";
    mod.modResults.contents = ensureMainApplicationRegistration(
      mod.modResults.contents,
      packageName,
    );
    return mod;
  });

  config = withDangerousMod(config, [
    "android",
    async (mod) => {
      const packageName = config.android?.package || "com.bluai.app";
      const packagePath = packageName.split(".").join(path.sep);
      const baseDir = path.join(
        mod.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        packagePath,
        "nearby",
      );

      fs.mkdirSync(baseDir, { recursive: true });
      fs.writeFileSync(
        path.join(baseDir, "NearbyConnectionsModule.kt"),
        buildNearbyModuleSource(packageName),
      );
      fs.writeFileSync(
        path.join(baseDir, "NearbyConnectionsPackage.kt"),
        buildNearbyPackageSource(packageName),
      );

      return mod;
    },
  ]);

  return config;
};

module.exports = createRunOncePlugin(withNearbyConnections, PKG, VERSION);
