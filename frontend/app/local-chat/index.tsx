import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import ScreenHeader from "../../components/ScreenHeader";
import { colors, fonts } from "../../utils/theme";
import type { NearbyChatMessage } from "./useNearbyChat";
import { useNearbyChat } from "./useNearbyChat";

function StatusPill({
  label,
  tone,
  value,
}: {
  label: string;
  tone: string;
  value: string;
}) {
  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

function SectionCard({
  children,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  subtitle?: string;
  title: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function MessageBubble({ item }: { item: NearbyChatMessage }) {
  if (item.author === "system") {
    return (
      <View style={styles.systemBubble}>
        <Text style={styles.systemText}>{item.body}</Text>
      </View>
    );
  }

  const isSelf = item.author === "self";

  return (
    <View
      style={[styles.messageRow, isSelf ? styles.selfRow : styles.remoteRow]}
    >
      <View
        style={[
          styles.messageBubble,
          isSelf ? styles.selfBubble : styles.remoteBubble,
        ]}
      >
        <Text style={styles.messageMeta}>{isSelf ? "Tú" : "Remoto"}</Text>
        <Text
          style={[
            styles.messageText,
            isSelf ? styles.selfText : styles.remoteText,
          ]}
        >
          {item.body}
        </Text>
      </View>
    </View>
  );
}

export default function LocalChatScreen() {
  const nearby = useNearbyChat();

  const stateTone =
    nearby.state === "connected"
      ? colors.brandGreen
      : nearby.state === "error"
        ? colors.brandRed
        : colors.brandBlue;

  const connectedTone = nearby.connectedEndpoint
    ? colors.brandGreen
    : colors.brandCyan;

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      <ScreenHeader title="Chat nearby" />

      <ScrollView
        className="flex-1 pt-6"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <MaterialCommunityIcons
              color="white"
              name="bluetooth-connect"
              size={22}
            />
          </View>
          <View style={styles.introBody}>
            <Text style={styles.introTitle}>Nearby Connections</Text>
            <Text style={styles.introText}>
              Dos teléfonos Android cercanos se descubren y enlazan sin internet
              ni códigos manuales.
            </Text>
          </View>
        </View>

        <View style={styles.statusGrid}>
          <StatusPill
            label="Plataforma"
            tone={colors.brandCyan}
            value={Platform.OS}
          />
          <StatusPill label="Estado" tone={stateTone} value={nearby.state} />
          <StatusPill
            label="Conectado"
            tone={connectedTone}
            value={nearby.connectedEndpoint?.endpointName ?? "Nadie"}
          />
          <StatusPill
            label="Módulo"
            tone={nearby.available ? colors.brandGreen : colors.brandRed}
            value={nearby.available ? "Nativo listo" : "Falta rebuild"}
          />
        </View>

        {!nearby.supported ? (
          <SectionCard title="No disponible">
            <Text style={styles.errorText}>
              Nearby solo está soportado en Android.
            </Text>
          </SectionCard>
        ) : null}

        {nearby.supported && !nearby.available ? (
          <SectionCard title="Rebuild requerido">
            <Text style={styles.errorText}>
              El módulo nativo `NearbyConnections` todavía no está cargado en
              este build. Corre `npx expo run:android` para regenerar Android
              con el plugin nuevo.
            </Text>
          </SectionCard>
        ) : null}

        <SectionCard
          title="Acciones"
          subtitle="Primero anuncia este dispositivo o busca otros teléfonos con BluEye cerca."
        >
          <View style={styles.actionRow}>
            <Pressable
              disabled={!nearby.available}
              onPress={nearby.startAdvertising}
              style={[
                styles.button,
                styles.primaryButton,
                !nearby.available && styles.disabledButton,
              ]}
            >
              <Text style={styles.primaryButtonText}>Anunciar</Text>
            </Pressable>
            <Pressable
              disabled={!nearby.available}
              onPress={nearby.startDiscovery}
              style={[
                styles.button,
                styles.secondaryButton,
                !nearby.available && styles.disabledButton,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Buscar</Text>
            </Pressable>
          </View>
          <View style={styles.actionRow}>
            <Pressable
              disabled={!nearby.available}
              onPress={nearby.disconnect}
              style={[
                styles.button,
                styles.secondaryButton,
                !nearby.available && styles.disabledButton,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Desconectar</Text>
            </Pressable>
            <Pressable
              disabled={!nearby.available}
              onPress={nearby.resetSession}
              style={[
                styles.button,
                styles.secondaryButton,
                !nearby.available && styles.disabledButton,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Reiniciar</Text>
            </Pressable>
          </View>
        </SectionCard>

        <SectionCard
          title="Dispositivos cercanos"
          subtitle="Toca uno para solicitar conexión."
        >
          {nearby.endpoints.length === 0 ? (
            <Text style={styles.cardSubtitle}>
              Aún no hay dispositivos encontrados.
            </Text>
          ) : (
            nearby.endpoints.map((endpoint) => (
              <Pressable
                key={endpoint.endpointId}
                onPress={() => nearby.connectToEndpoint(endpoint.endpointId)}
                style={styles.endpointRow}
              >
                <View>
                  <Text style={styles.endpointName}>
                    {endpoint.endpointName}
                  </Text>
                  <Text style={styles.endpointMeta}>{endpoint.endpointId}</Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color="white"
                />
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
                (!nearby.canSend || !nearby.draft.trim()) &&
                  styles.disabledButton,
              ]}
            >
              <MaterialCommunityIcons color="white" name="send" size={20} />
            </Pressable>
          </View>

          <View style={styles.messagesList}>
            {nearby.messages.map((item) => (
              <MessageBubble item={item} key={item.id} />
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
