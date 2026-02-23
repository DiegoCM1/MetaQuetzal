// backend/src/services/notification.js

// Usa la instancia ya inicializada en ./firebase.js
import admin from './firebase.js';
import pool from './db.js';

/**
 * Envía una notificación push a todos los tokens almacenados.
 * @param {{ title: string, body: string, data?: Record<string,string>, fullScreen?: boolean }} payload
 * @returns {Promise<import('firebase-admin').messaging.BatchResponse>}
 */
export async function sendAllNotifications({ title, body, data = {}, fullScreen = false }) {
    // 1) Recuperar todos los tokens de la BD
    const { rows } = await pool.query('SELECT token FROM device_tokens');
    const tokens = rows.map((r) => r.token).filter(Boolean);
    if (tokens.length === 0) {
        throw new Error('No hay tokens registrados');
    }

    // 2) Construir el mensaje base
    const message = {
        notification: { title, body },
        data: {
            ...data,
            fullScreen: fullScreen ? 'true' : 'false', // Data debe ser strings
        },
        tokens,
    };

    // 3) Si es full-screen (alertas críticas cat 3+), configurar prioridad alta
    if (fullScreen) {
        message.android = {
            priority: 'high',
            notification: {
                priority: 'high',
                channelId: 'critical_alerts', // Canal de alta prioridad
                sound: 'default',
                tag: 'hurricane_alert', // Reemplaza alertas anteriores
            },
        };

        message.apns = {
            headers: {
                'apns-priority': '10', // Máxima prioridad
            },
            payload: {
                aps: {
                    sound: 'critical', // iOS Critical Alert sound
                    interruptionLevel: 'critical', // Bypass Do Not Disturb
                },
            },
        };
    }

    // 4) Enviar usando la API moderna de Firebase Admin
    // Desde firebase-admin v13, el método se llama `sendEachForMulticast`
    // y reemplaza al antiguo `sendMulticast`.
    const response = await admin.messaging().sendEachForMulticast(message);

    // Limpia tokens que fallaron
    const invalidTokens = response.responses
        .map((r, i) => (!r.success ? tokens[i] : null))
        .filter(Boolean);

    if (invalidTokens.length) {
        await pool.query(
            'DELETE FROM device_tokens WHERE token = ANY($1::text[])',
            [invalidTokens]
        );
    }

    return response;
}
