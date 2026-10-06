const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./config');

const AUTH_DIR = path.join(DATA_DIR, 'auth_info_baileys');
const logger = pino({ level: 'silent' });

let sock = null;
let latestQR = null;
let isReady = false;
let reconnecting = false;
let onReadyCallback = null;

// Cache the group JID so we don't have to re-fetch all groups on every send
let cachedGroupName = null;
let cachedGroupJid = null;

const connectToWhatsApp = async () => {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
        auth: state,
        logger
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('QR Code received, scan it with your phone:');
            qrcode.generate(qr, { small: true });
            latestQR = qr;
            isReady = false;
        }

        if (connection === 'open') {
            console.log('WhatsApp Client is ready!');
            latestQR = null;
            isReady = true;
            cachedGroupJid = null; // group JID may change between sessions
            if (onReadyCallback) onReadyCallback();
        }

        if (connection === 'close') {
            isReady = false;
            const statusCode = lastDisconnect?.error instanceof Boom
                ? lastDisconnect.error.output?.statusCode
                : null;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log('[BOT] ⚠️  WhatsApp desconectado:', lastDisconnect?.error?.message, '— reconectar:', shouldReconnect);

            if (shouldReconnect && !reconnecting) {
                reconnecting = true;
                setTimeout(() => {
                    reconnecting = false;
                    connectToWhatsApp().catch(err => {
                        console.error('[BOT] ❌ Error al reconectar:', err.message);
                    });
                }, 5000);
            } else if (!shouldReconnect && !reconnecting) {
                // Las credenciales ya no sirven: reconectar con ellas daría otro 401 y
                // nunca emitiría un QR. Las borramos para que Baileys arranque una
                // sesión nueva y el panel muestre el QR para volver a vincular.
                console.error('[BOT] ❌ Sesión cerrada (logged out). Limpiando credenciales y generando un QR nuevo...');
                reconnecting = true;
                fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                setTimeout(() => {
                    reconnecting = false;
                    connectToWhatsApp().catch(err => {
                        console.error('[BOT] ❌ Error al regenerar el QR:', err.message);
                    });
                }, 2000);
            }
        }
    });
};

const initializeBot = () => {
    console.log('Initializing WhatsApp bot...');
    connectToWhatsApp().catch(err => {
        console.error('Failed to initialize WhatsApp bot:', err);
    });
};

const getStatus = () => ({
    isReady,
    qr: latestQR
});

// Called when the socket (re)connects, so pending reminders can be retried
const onReady = (callback) => {
    onReadyCallback = callback;
};

const resolveGroupJid = async (groupName) => {
    if (cachedGroupJid && cachedGroupName === groupName) {
        return cachedGroupJid;
    }

    const groups = await sock.groupFetchAllParticipating();
    const match = Object.values(groups).find(g => g.subject === groupName);

    if (!match) {
        return null;
    }

    cachedGroupName = groupName;
    cachedGroupJid = match.id;
    return match.id;
};

const listGroups = async () => {
    if (!isReady || !sock) {
        throw new Error('WhatsApp client is not ready');
    }
    const groups = await sock.groupFetchAllParticipating();
    return Object.values(groups).map(g => ({ id: g.id, subject: g.subject }));
};

const sendGroupMessage = async (target, message) => {
    if (!isReady || !sock) {
        throw new Error('WhatsApp client is not ready');
    }

    try {
        // Un equipo onboardeado ya conoce el JID exacto de su grupo — nos saltamos
        // el matching por nombre (frágil ante mayúsculas/tildes/espacios).
        const jid = target.endsWith('@g.us') ? target : await resolveGroupJid(target);

        if (!jid) {
            console.log(`[BOT] ❌ No se encontró el grupo: ${target}`);
            throw new Error(`Group ${target} not found`);
        }

        await sock.sendMessage(jid, { text: message });
        console.log(`[BOT] ✅ Mensaje enviado a grupo ${target}: ${message}`);
    } catch (error) {
        // Cached JID may be stale (e.g. group recreated) — clear it so the next attempt re-resolves
        cachedGroupJid = null;
        console.error('[BOT] Error enviando mensaje:', error.message, '\n', error.stack);
        throw error;
    }
};

module.exports = {
    initializeBot,
    getStatus,
    sendGroupMessage,
    listGroups,
    onReady
};
