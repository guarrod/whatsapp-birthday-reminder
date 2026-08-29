const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { getBirthdays } = require('./db');
const { getStatus, sendGroupMessage } = require('./bot');

const GROUP_NAME = process.env.WHATSAPP_GROUP_NAME || 'TB3-Asuntos sociales';
const LAST_REMINDER_FILE = path.join(__dirname, 'last-reminder.json');

// Ecuador no aplica horario de verano, así que el offset es fijo en UTC-5.
// El servidor corre en UTC: desplazamos la fecha para que los getters UTC
// devuelvan la hora de pared de Ecuador.
const EC_OFFSET_MS = 5 * 60 * 60 * 1000;
const SCHEDULE_HOUR_EC = 8;

const ecuadorNow = (d = new Date()) => new Date(d.getTime() - EC_OFFSET_MS);
const ecuadorDateKey = (d = new Date()) => ecuadorNow(d).toISOString().slice(0, 10);

const loadLastReminderInfo = () => {
    try {
        const saved = JSON.parse(fs.readFileSync(LAST_REMINDER_FILE, 'utf8'));
        // Migración: los archivos previos no guardaban la fecha del chequeo diario.
        // La derivamos del último timestamp para no reenviar, en el primer arranque
        // de esta versión, un recordatorio que ya salió hoy.
        if (!saved.lastDailyRunDate && saved.timestamp) {
            saved.lastDailyRunDate = ecuadorDateKey(new Date(saved.timestamp));
        }
        return saved;
    } catch {
        return { timestamp: null, summary: null, lastDailyRunDate: null };
    }
};

let lastReminderInfo = loadLastReminderInfo();

const setLastReminderInfo = (info) => {
    lastReminderInfo = { ...lastReminderInfo, ...info };
    try {
        fs.writeFileSync(LAST_REMINDER_FILE, JSON.stringify(lastReminderInfo));
    } catch (err) {
        console.error('[SCHEDULER] No se pudo guardar last-reminder.json:', err.message);
    }
};

/**
 * Calculates when the next reminder for a specific birthday will occur.
 */
const getNextReminderForBirthday = (birthday, referenceDate) => {
    const year = referenceDate.getFullYear();
    const results = [];

    // Check this year and next year
    [year, year + 1].forEach(y => {
        const bdayDate = new Date(y, birthday.month - 1, birthday.day, 9, 0, 0);

        const rdTypes = [
            { date: new Date(bdayDate), type: 'Mismo día' },
            { date: new Date(bdayDate), type: '1 día antes' },
            { date: new Date(bdayDate), type: '1 semana antes' }
        ];
        rdTypes[1].date.setDate(rdTypes[1].date.getDate() - 1);
        rdTypes[2].date.setDate(rdTypes[2].date.getDate() - 7);

        rdTypes.forEach(rdObj => {
            if (rdObj.date > referenceDate) {
                results.push({
                    date: rdObj.date,
                    type: rdObj.type,
                    birthdayDate: bdayDate // Store the actual birthday date
                });
            }
        });
    });

    // Return the earliest valid reminder for this specific person
    if (results.length === 0) return null;

    return results.reduce((earliest, current) =>
        current.date < earliest.date ? current : earliest
    );
};

const getNextReminderInfo = async () => {
    try {
        const birthdays = await getBirthdays();
        if (birthdays.length === 0) return null;

        const now = new Date();
        let globalNext = null;
        let targetBirthday = null;

        birthdays.forEach(b => {
            const personNext = getNextReminderForBirthday(b, now);
            if (personNext) {
                if (!globalNext || personNext.date < globalNext.date) {
                    globalNext = personNext;
                    targetBirthday = b;
                }
            }
        });

        if (!globalNext) return null;

        return {
            date: globalNext.date.toISOString(),
            birthdayDate: globalNext.birthdayDate.toISOString(),
            name: targetBirthday.name,
            type: globalNext.type
        };
    } catch (err) {
        console.error('Error calculating next reminder:', err);
        return null;
    }
};

const checkBirthdaysAndSend = async (isRetry = false) => {
    const status = getStatus();
    if (!status.isReady) {
        // No marcamos lastDailyRunDate: la recuperación lo reintentará al reconectar.
        console.warn(`[SCHEDULER] ⚠️  RECORDATORIO OMITIDO a las ${new Date().toISOString()} — WhatsApp no está listo. Se reintentará al reconectar.`);
        return;
    }

    try {
        // Las comparaciones van en fecha de Ecuador, no del servidor (UTC), para
        // que una ejecución fuera del horario habitual no salte de día.
        const today = ecuadorNow();
        const currentMonth = today.getUTCMonth() + 1;
        const currentDay = today.getUTCDate();

        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

        const nextWeek = new Date(today);
        nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);

        const birthdays = await getBirthdays();

        let messages = [];

        birthdays.forEach(b => {
            if (b.month === currentMonth && b.day === currentDay) {
                messages.push(`🤖 ¡Hoy es el cumpleaños de *${b.name}*! 🥳🎂🎉 ¡Felicidades!`);
            }
            if (b.month === (tomorrow.getUTCMonth() + 1) && b.day === tomorrow.getUTCDate()) {
                messages.push(`🤖 Recordatorio: Mañana es el cumpleaños de *${b.name}*. 🎂`);
            }
            if (b.month === (nextWeek.getUTCMonth() + 1) && b.day === nextWeek.getUTCDate()) {
                messages.push(`🤖 Aviso: En exactamente una semana es el cumpleaños de *${b.name}*. 📅`);
            }
        });

        const runDate = ecuadorDateKey();

        if (messages.length > 0) {
            const prefix = isRetry ? `_Disculpa, hubo un problema técnico y este mensaje no pudo enviarse a las 8:00 AM._\n\n` : '';
            const summaryMessage = prefix + messages.join('\n\n');
            await sendGroupMessage(GROUP_NAME, summaryMessage);
            setLastReminderInfo({
                timestamp: new Date().toISOString(),
                summary: summaryMessage.length > 50 ? summaryMessage.substring(0, 47) + '...' : summaryMessage,
                lastDailyRunDate: runDate
            });
        } else {
            setLastReminderInfo({
                timestamp: new Date().toISOString(),
                summary: 'No hubo cumpleaños hoy.',
                lastDailyRunDate: runDate
            });
        }
    } catch (err) {
        // Dejamos lastDailyRunDate sin actualizar para que se reintente al reconectar.
        console.error('[SCHEDULER] ❌ Error al enviar — se reintentará al reconectar:', err.message);
    }
};

const getLastReminder = () => lastReminderInfo;

const recordManualReminder = (message) => {
    // Intencionalmente NO toca lastDailyRunDate: un envío manual de prueba no
    // debe cancelar el recordatorio automático del día.
    setLastReminderInfo({
        timestamp: new Date().toISOString(),
        summary: `Manual: ${message.length > 40 ? message.substring(0, 37) + '...' : message}`
    });
};

/**
 * Decide si falta ejecutar el chequeo diario. Es pura para poder testearla.
 * Se basa en la fecha del último chequeo completado y no en una bandera en
 * memoria: así también cubre el caso de que el proceso (o el servidor entero)
 * estuviera caído a la hora del cron y este nunca llegara a dispararse.
 */
const shouldCatchUp = (lastDailyRunDate, now = new Date()) => {
    if (lastDailyRunDate === ecuadorDateKey(now)) return false;
    return ecuadorNow(now).getUTCHours() >= SCHEDULE_HOUR_EC;
};

const checkPendingRetry = async () => {
    if (shouldCatchUp(lastReminderInfo.lastDailyRunDate)) {
        console.log(`[SCHEDULER] 🔄 El chequeo de ${ecuadorDateKey()} no se ejecutó (último: ${lastReminderInfo.lastDailyRunDate || 'nunca'}) — recuperando...`);
        await checkBirthdaysAndSend(true);
    }
};

const startScheduler = () => {
    console.log('Starting birthday check scheduler (runs every day at 08:00 AM Ecuador / 13:00 UTC)...');
    cron.schedule('0 13 * * *', () => {
        checkBirthdaysAndSend();
    });
};

module.exports = {
    startScheduler,
    checkBirthdaysAndSend,
    getLastReminder,
    getNextReminderInfo,
    checkPendingRetry,
    recordManualReminder,
    shouldCatchUp,
    ecuadorDateKey
};
