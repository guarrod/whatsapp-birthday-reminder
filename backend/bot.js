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

// Estado para diagnóstico (se expone en /api/bot/status) y para el watchdog
let state = 'connecting';
let stateSince = Date.now();
let lastDisconnect = null;
let lastEventAt = Date.now();
const WATCHDOG_INTERVAL_MS = 60 * 1000;
const WATCHDOG_STALL_MS = 5 * 60 * 1000;

const ts = () => new Date().toISOString();
const log = (...args) => console.log(ts(), ...args);
const logError = (...args) => console.error(ts(), ...args);

const setState = (next) => {
    if (state !== next) {
        state = next;
        stateSince = Date.now();
    }
};

// Cache the group JID so we don't have to re-fetch all groups on every send
let cachedGroupName = null;
let cachedGroupJid = null;

const connectToWhatsApp = async () => {
    // Soltar el socket anterior (si quedó colgado) para no acumular listeners ni conexiones
    if (sock) {
        try {
            sock.ev.removeAllListeners('connection.update');
            sock.ev.removeAllListeners('creds.update');
            sock.end(undefined);
        } catch (err) {
            logError('[BOT] No se pudo cerrar el socket anterior:', err.message);
        }
    }

    setState('connecting');
    lastEventAt = Date.now();
    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
        auth: authState,
        markOnlineOnConnect: false,
        logger
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect: lastDisc, qr } = update;
        lastEventAt = Date.now();

        if (qr) {
            log('QR Code received, scan it with your phone:');
            setState('qr');
            qrcode.generate(qr, { small: true });
            latestQR = qr;
            isReady = false;
        }

        if (connection === 'open') {
            log('WhatsApp Client is ready!');
            setState('open');
            latestQR = null;
            isReady = true;
            cachedGroupJid = null; // group JID may change between sessions
            if (onReadyCallback) onReadyCallback();
        }

        if (connection === 'close') {
            isReady = false;
            setState('closed');
            const statusCode = lastDisc?.error instanceof Boom
                ? lastDisc.error.output?.statusCode
                : null;
            lastDisconnect = {
                at: new Date().toISOString(),
                statusCode,
                message: lastDisc?.error?.message || null
            };
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            log('[BOT] ⚠️  WhatsApp desconectado:', lastDisc?.error?.message, '(código', statusCode + ')', '— reconectar:', shouldReconnect);

            if (shouldReconnect && !reconnecting) {
                reconnecting = true;
                setTimeout(() => {
                    reconnecting = false;
                    connectToWhatsApp().catch(err => {
                        logError('[BOT] ❌ Error al reconectar:', err.message);
                    });
                }, 5000);
            } else if (!shouldReconnect && !reconnecting) {
                // Las credenciales ya no sirven: reconectar con ellas daría otro 401 y
                // nunca emitiría un QR. Las borramos para que Baileys arranque una
                // sesión nueva y el panel muestre el QR para volver a vincular.
                logError('[BOT] ❌ Sesión cerrada (logged out). Limpiando credenciales y generando un QR nuevo...');
                reconnecting = true;
                fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                setTimeout(() => {
                    reconnecting = false;
                    connectToWhatsApp().catch(err => {
                        logError('[BOT] ❌ Error al regenerar el QR:', err.message);
                    });
                }, 2000);
            }
        }
    });
};

const initializeBot = () => {
    log('Initializing WhatsApp bot...');
    connectToWhatsApp().catch(err => {
        logError('Failed to initialize WhatsApp bot:', err);
    });

    // Watchdog: si el socket queda colgado (sin ningún evento de Baileys) lo recreamos.
    // No toca las credenciales; solo reintenta la conexión con la sesión existente.
    setInterval(() => {
        const stalledFor = Date.now() - lastEventAt;
        if (!isReady && !latestQR && !reconnecting && stalledFor > WATCHDOG_STALL_MS) {
            log(`[BOT] 🐕 Watchdog: ${Math.round(stalledFor / 1000)}s sin eventos y sin conexión, recreando socket`);
            reconnecting = true;
            connectToWhatsApp()
                .catch(err => logError('[BOT] ❌ Watchdog no pudo reconectar:', err.message))
                .finally(() => { reconnecting = false; });
        }
    }, WATCHDOG_INTERVAL_MS).unref();
};

const getStatus = () => ({
    isReady,
    qr: latestQR,
    state,
    stateSince: new Date(stateSince).toISOString(),
    lastDisconnect
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
            log(`[BOT] ❌ No se encontró el grupo: ${target}`);
            throw new Error(`Group ${target} not found`);
        }

        await sock.sendMessage(jid, { text: message });
        log(`[BOT] ✅ Mensaje enviado a grupo ${target}: ${message}`);
    } catch (error) {
        // Cached JID may be stale (e.g. group recreated) — clear it so the next attempt re-resolves
        cachedGroupJid = null;
        logError('[BOT] Error enviando mensaje:', error.message, '\n', error.stack);
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
