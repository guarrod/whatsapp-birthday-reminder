const cron = require('node-cron');
const { getBirthdays } = require('./db');
const { getStatus, sendGroupMessage } = require('./bot');

const GROUP_NAME = process.env.WHATSAPP_GROUP_NAME || 'TB3-Asuntos sociales';

let lastReminderInfo = {
    timestamp: null,
    summary: null
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

        console.log(`[DEBUG] Siguiente evento encontrado: ${targetBirthday.name} el ${globalNext.date.toISOString()} (${globalNext.type})`);

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

const checkBirthdaysAndSend = async () => {
    const status = getStatus();
    if (!status.isReady) {
        console.log('Scheduler skipped: WhatsApp bot is not ready yet');
        return;
    }

    try {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const birthdays = await getBirthdays();

        let messages = [];

        birthdays.forEach(b => {
            if (b.month === currentMonth && b.day === currentDay) {
                messages.push(`¡Hoy es el cumpleaños de *${b.name}*! 🥳🎂🎉 ¡Felicidades!`);
            }
            if (b.month === (tomorrow.getMonth() + 1) && b.day === tomorrow.getDate()) {
                messages.push(`Recordatorio: Mañana es el cumpleaños de *${b.name}*. 🎂`);
            }
            if (b.month === (nextWeek.getMonth() + 1) && b.day === nextWeek.getDate()) {
                messages.push(`Aviso: En exactamente una semana es el cumpleaños de *${b.name}*. 📅`);
            }
        });

        if (messages.length > 0) {
            const summaryMessage = messages.join('\n\n');
            await sendGroupMessage(GROUP_NAME, summaryMessage);
            lastReminderInfo = {
                timestamp: new Date().toISOString(),
                summary: summaryMessage.length > 50 ? summaryMessage.substring(0, 47) + '...' : summaryMessage
            };
        } else {
            lastReminderInfo = {
                timestamp: new Date().toISOString(),
                summary: 'No hubo cumpleaños hoy.'
            };
        }
    } catch (err) {
        console.error('Error during scheduled birthday check:', err);
    }
};

const getLastReminder = () => lastReminderInfo;

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
    getNextReminderInfo
};
