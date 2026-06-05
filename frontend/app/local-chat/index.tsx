import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenHeader from "../../components/ScreenHeader";
import { colors, fonts } from "../../utils/theme";
import { LocalChatMessage, useLocalOfflineChat } from "./useLocalOfflineChat";
import { useNearbyChat } from "./useNearbyChat";

const statusCopy: Record<string, string> = {
  "answer-ready": "Respuesta lista",
  connected: "Enlazado",
  connecting: "Conectando",
  error: "Con error",
  idle: "Sin enlace",
  "offer-ready": "Oferta lista",
  preparing: "Preparando",
};

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function MessageBubble({ item }: { item: LocalChatMessage }) {
  if (item.author === "system") {
    return (
      <View style={styles.systemBubble}>
        <Text style={styles.systemText}>{item.body}</Text>
      </View>
    );
  }

  const isSelf = item.author === "self";

  return (
    <View style={[styles.messageRow, isSelf ? styles.selfRow : styles.remoteRow]}>
      <View style={[styles.messageBubble, isSelf ? styles.selfBubble : styles.remoteBubble]}>
        <Text style={styles.messageMeta}>{isSelf ? "Tú" : "Remoto"}</Text>
        <Text style={[styles.messageText, isSelf ? styles.selfText : styles.remoteText]}>
          {item.body}
        </Text>
      </View>
    </View>
  );
}

export default function LocalChatScreen() {
  const nearby = useNearbyChat();
  const {
    applyAnswer,
    canSend,
    connectionState,
    createAnswer,
    createOffer,
    draft,
    error,
    localSignal,
    logs,
    messages,
    remoteSignal,
    resetSession,
    role,
    sendMessage,
    setDraft,
    setRemoteSignal,
    stage,
  } = useLocalOfflineChat();

  const shareLocalSignal = async () => {
    if (!localSignal) return;

    await Share.share({
      message: localSignal,
      title: "Codigo local BluEye",
    });
  };

  const roleCopy =
    role === "host" ? "Anfitrión" : role === "guest" ? "Invitado" : "Sin rol";

  const stageTone =
    stage === "connected"
      ? colors.brandGreen
      : stage === "error"
        ? colors.brandRed
        : colors.brandBlue;

  const connectionTone =
    connectionState === "connected" || connectionState === "completed"
      ? colors.brandGreen
      : connectionState === "failed"
        ? colors.brandRed
        : colors.brandBlue;

  if (Platform.OS === "android" && nearby.available) {
    return (
      <SafeAreaView className="flex-1 bg-transparent" edges={["top", "bottom"]}>
        <ScreenHeader title="Chat offline" />

        <ScrollView
          className="flex-1 pt-6"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <MaterialCommunityIcons color="white" name="bluetooth-connect" size={22} />
            </View>
            <View style={styles.introBody}>
              <Text style={styles.introTitle}>Nearby en Android</Text>
              <Text style={styles.introText}>
                Anuncia este teléfono o busca otros cercanos. Nearby usa Bluetooth,
                BLE y Wi-Fi por debajo para simplificar el enlace sin internet.
              </Text>
            </View>
          </View>

          <View style={styles.statusGrid}>
            <StatusPill label="Estado" tone={colors.brandBlue} value={nearby.state} />
            <StatusPill
              label="Conectado"
              tone={nearby.connectedEndpoint ? colors.brandGreen : colors.brandCyan}
              value={nearby.connectedEndpoint?.endpointName ?? "Nadie"}
            />
          </View>

          <SectionCard
            title="Acciones"
            subtitle="Primero anuncia este dispositivo o busca otros teléfonos con BluEye cerca."
          >
            <View style={styles.actionRow}>
              <Pressable onPress={nearby.startAdvertising} style={[styles.button, styles.primaryButton]}>
                <Text style={styles.primaryButtonText}>Anunciar</Text>
              </Pressable>
              <Pressable onPress={nearby.startDiscovery} style={[styles.button, styles.secondaryButton]}>
                <Text style={styles.secondaryButtonText}>Buscar</Text>
              </Pressable>
            </View>
            <View style={styles.actionRow}>
              <Pressable onPress={nearby.disconnect} style={[styles.button, styles.secondaryButton]}>
                <Text style={styles.secondaryButtonText}>Desconectar</Text>
              </Pressable>
              <Pressable onPress={nearby.resetSession} style={[styles.button, styles.secondaryButton]}>
                <Text style={styles.secondaryButtonText}>Reiniciar</Text>
              </Pressable>
            </View>
          </SectionCard>

          <SectionCard
            title="Dispositivos cercanos"
            subtitle="Toca uno para solicitar conexión."
          >
            {nearby.endpoints.length === 0 ? (
              <Text style={styles.cardSubtitle}>Aún no hay dispositivos encontrados.</Text>
            ) : (
              nearby.endpoints.map((endpoint) => (
                <Pressable
                  key={endpoint.endpointId}
                  onPress={() => nearby.connectToEndpoint(endpoint.endpointId)}
                  style={styles.endpointRow}
                >
                  <View>
                    <Text style={styles.endpointName}>{endpoint.endpointName}</Text>
                    <Text style={styles.endpointMeta}>{endpoint.endpointId}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color="white" />
                </Pressable>
              ))
            )}
          </SectionCard>

          <SectionCard
            title="Mensajes"
            subtitle="Cuando haya conexión, manda texto directo al otro teléfono."
          >
            <View style={styles.composerRow}>
              <TextInput
                multiline
                onChangeText={nearby.setDraft}
                placeholder="Escribe un mensaje..."
                placeholderTextColor="rgba(255,255,255,0.45)"
                style={styles.messageInput}
                value={nearby.draft}
              />
              <Pressable
                disabled={!nearby.canSend || !nearby.draft.trim()}
                onPress={nearby.sendMessage}
                style={[
                  styles.sendButton,
                  (!nearby.canSend || !nearby.draft.trim()) && styles.disabledButton,
                ]}
              >
                <MaterialCommunityIcons color="white" name="send" size={20} />
              </Pressable>
            </View>

            <View style={styles.messagesList}>
              {nearby.messages.map((item) => (
                <MessageBubble item={item as LocalChatMessage} key={item.id} />
              ))}
            </View>
          </SectionCard>

          {nearby.error ? (
            <SectionCard title="Error">
              <Text style={styles.errorText}>{nearby.error}</Text>
            </SectionCard>
          ) : null}

          <SectionCard title="Bitácora">
            {nearby.logs.map((item, index) => (
              <View key={`${index}-${item}`} style={styles.logRow}>
                <View style={styles.logDot} />
                <Text style={styles.logText}>{item}</Text>
              </View>
            ))}
          </SectionCard>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      <ScreenHeader title="Chat offline" />

      <ScrollView
        className="flex-1 pt-6"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <MaterialCommunityIcons
              color="white"
              name="access-point-network"
              size={22}
            />
          </View>
          <View style={styles.introBody}>
            <Text style={styles.introTitle}>Mensajería local</Text>
            <Text style={styles.introText}>
              Funciona entre dos teléfonos en la misma red local o hotspot,
              compartiendo manualmente el código de enlace.
            </Text>
          </View>
        </View>

        <View style={styles.statusGrid}>
          <StatusPill label="Sesión" tone={stageTone} value={statusCopy[stage] ?? stage} />
          <StatusPill label="Canal" tone={connectionTone} value={connectionState} />
          <StatusPill label="Rol" tone={colors.brandCyan} value={roleCopy} />
          <StatusPill label="Modo" tone={colors.brandPurple} value="Texto local" />
        </View>

        <SectionCard
          title="Enlace"
          subtitle="Primero crea oferta en un teléfono. Luego pega esa oferta en el otro y devuelve la respuesta."
        >
          <View style={styles.actionRow}>
            <Pressable onPress={createOffer} style={[styles.button, styles.primaryButton]}>
              <Text style={styles.primaryButtonText}>Crear oferta</Text>
            </Pressable>
            <Pressable onPress={resetSession} style={[styles.button, styles.secondaryButton]}>
              <Text style={styles.secondaryButtonText}>Reiniciar</Text>
            </Pressable>
          </View>
        </SectionCard>

        <SectionCard
          title="Código local"
          subtitle="Comparte este bloque con el otro teléfono."
        >
          <TextInput
            editable={false}
            multiline
            style={[styles.codeInput, styles.codeOutput]}
            textAlignVertical="top"
            value={localSignal}
          />
          <View style={styles.actionRow}>
            <Pressable
              disabled={!localSignal}
              onPress={shareLocalSignal}
              style={[
                styles.button,
                styles.primaryButton,
                !localSignal && styles.disabledButton,
              ]}
            >
              <Text style={styles.primaryButtonText}>Compartir</Text>
            </Pressable>
          </View>
        </SectionCard>

        <SectionCard
          title="Código remoto"
          subtitle="Pega aquí el código recibido del otro teléfono."
        >
          <TextInput
            multiline
            onChangeText={setRemoteSignal}
            placeholder="Pega aquí la oferta o respuesta..."
            placeholderTextColor="rgba(255,255,255,0.45)"
            style={styles.codeInput}
            textAlignVertical="top"
            value={remoteSignal}
          />
          <View style={styles.actionRow}>
            <Pressable
              disabled={!remoteSignal.trim()}
              onPress={role === "host" ? applyAnswer : createAnswer}
              style={[
                styles.button,
                styles.primaryButton,
                !remoteSignal.trim() && styles.disabledButton,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {role === "host" ? "Aplicar respuesta" : "Crear respuesta"}
              </Text>
            </Pressable>
          </View>
        </SectionCard>

        <SectionCard
          title="Mensajes"
          subtitle="Cuando el canal quede enlazado, podrás mandar texto sin internet público."
        >
          <View style={styles.composerRow}>
            <TextInput
              multiline
              onChangeText={setDraft}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.messageInput}
              value={draft}
            />
            <Pressable
              disabled={!canSend || !draft.trim()}
              onPress={sendMessage}
              style={[
                styles.sendButton,
                (!canSend || !draft.trim()) && styles.disabledButton,
              ]}
            >
              <MaterialCommunityIcons color="white" name="send" size={20} />
            </Pressable>
          </View>

          <View style={styles.messagesList}>
            {messages.map((item) => (
              <MessageBubble item={item} key={item.id} />
            ))}
          </View>
        </SectionCard>

        {error ? (
          <SectionCard title="Error">
            <Text style={styles.errorText}>{error}</Text>
          </SectionCard>
        ) : null}

        <SectionCard title="Bitácora">
          {logs.map((item, index) => (
            <View key={`${index}-${item}`} style={styles.logRow}>
              <View style={styles.logDot} />
              <Text style={styles.logText}>{item}</Text>
            </View>
          ))}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  button: {
    alignItems: "center",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: "rgba(8, 20, 38, 0.88)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  cardSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: fonts.poppins,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  cardTitle: {
    color: "white",
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 18,
  },
  codeInput: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    color: "white",
    fontFamily: "monospace",
    fontSize: 13,
    marginTop: 14,
    minHeight: 130,
    padding: 14,
  },
  codeOutput: {
    color: "rgba(255,255,255,0.86)",
  },
  composerRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  content: {
    paddingBottom: 36,
    paddingHorizontal: 16,
  },
  disabledButton: {
    opacity: 0.45,
  },
  errorText: {
    color: "#fecaca",
    fontFamily: fonts.poppins,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  introBody: {
    flex: 1,
  },
  introCard: {
    alignItems: "flex-start",
    backgroundColor: "rgba(49,103,255,0.14)",
    borderColor: "rgba(49,103,255,0.24)",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
    padding: 16,
  },
  introIcon: {
    alignItems: "center",
    backgroundColor: colors.brandBlue,
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  introText: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: fonts.poppins,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  introTitle: {
    color: "white",
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 18,
  },
  logDot: {
    backgroundColor: colors.brandCyan,
    borderRadius: 99,
    height: 8,
    marginTop: 7,
    width: 8,
  },
  logRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  logText: {
    color: "rgba(255,255,255,0.78)",
    flex: 1,
    fontFamily: fonts.poppins,
    fontSize: 14,
    lineHeight: 20,
  },
  messageBubble: {
    borderRadius: 18,
    maxWidth: "84%",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageInput: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    color: "white",
    flex: 1,
    fontFamily: fonts.poppins,
    fontSize: 14,
    maxHeight: 110,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageMeta: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 11,
    marginBottom: 5,
  },
  messageRow: {
    marginTop: 10,
  },
  messageText: {
    fontFamily: fonts.poppins,
    fontSize: 14,
    lineHeight: 20,
  },
  messagesList: {
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: colors.brandBlue,
    flex: 1,
  },
  primaryButtonText: {
    color: "white",
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 14,
  },
  remoteBubble: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
  },
  remoteRow: {
    alignItems: "flex-start",
  },
  remoteText: {
    color: "white",
  },
  endpointMeta: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: fonts.poppins,
    fontSize: 12,
    marginTop: 2,
  },
  endpointName: {
    color: "white",
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 15,
  },
  endpointRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    minWidth: 110,
  },
  secondaryButtonText: {
    color: "white",
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 14,
  },
  selfBubble: {
    backgroundColor: colors.brandCyan,
  },
  selfRow: {
    alignItems: "flex-end",
  },
  selfText: {
    color: "#04233d",
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.brandBlue,
    borderRadius: 16,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  statusLabel: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: fonts.poppins,
    fontSize: 12,
  },
  statusPill: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "48%",
    minHeight: 72,
    padding: 14,
  },
  statusValue: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 16,
    marginTop: 8,
  },
  systemBubble: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  systemText: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: fonts.poppins,
    fontSize: 13,
    textAlign: "center",
  },
});
