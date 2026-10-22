/**
 * Pruebas de la lógica de recuperación del recordatorio diario.
 * Se ejecuta con `node scheduler.test.js` — sin dependencias externas: los
 * módulos que tocan red o disco se sustituyen por stubs antes de cargar
 * scheduler.js.
 */
const assert = require('assert');
const Module = require('module');

const os = require('os');
const fs = require('fs');
const path = require('path');

// Estado controlable de los stubs; last-reminder.json va a un directorio temporal.
const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scheduler-test-'));
const stub = {
    ready: false,
    sent: [],
    birthdays: [],
    sendDelayMs: 0,
};

const originalLoad = Module._load;
Module._load = function (request) {
    if (request === 'node-cron') return { schedule: () => {} };
    if (request === './db') return { getBirthdays: async () => stub.birthdays };
    if (request === './config') return { DATA_DIR: tmpDataDir };
    if (request === './teamConfig') return { getSendTarget: () => 'grupo-test' };
    if (request === './bot') {
        return {
            getStatus: () => ({ isReady: stub.ready }),
            sendGroupMessage: async (target, message) => {
                await new Promise((r) => setTimeout(r, stub.sendDelayMs));
                stub.sent.push(message);
            },
        };
    }
    return originalLoad.apply(this, arguments);
};

const {
    shouldCatchUp, minutesPastSchedule, ecuadorDateKey,
    checkBirthdaysAndSend, checkPendingRetry,
} = require('./scheduler');

const at = (iso) => new Date(iso);
let passed = 0;
const check = (label, actual, expected) => {
    assert.strictEqual(actual, expected, `${label}\n  esperado: ${expected}\n  obtenido: ${actual}`);
    console.log(`  ok — ${label}`);
    passed++;
};

console.log('ecuadorDateKey (servidor en UTC, Ecuador en UTC-5):');
check('13:00Z es el mismo día en Ecuador (08:00)',
    ecuadorDateKey(at('2026-08-29T13:00:00Z')), '2026-08-29');
check('01:00Z del 30 sigue siendo 29 en Ecuador (20:00)',
    ecuadorDateKey(at('2026-08-30T01:00:00Z')), '2026-08-29');
check('04:59Z del 29 aún es 28 en Ecuador (23:59)',
    ecuadorDateKey(at('2026-08-29T04:59:00Z')), '2026-08-28');

console.log('\nshouldCatchUp:');
check('ya corrió hoy -> no reenvía (evita duplicado)',
    shouldCatchUp('2026-08-29', at('2026-08-29T18:00:00Z')), false);

check('servidor caído a la hora del cron, vuelve 08:30 EC -> recupera',
    shouldCatchUp('2026-08-28', at('2026-08-29T13:30:00Z')), true);

check('reinicio antes de las 08:00 EC -> aún no toca',
    shouldCatchUp('2026-08-28', at('2026-08-29T10:00:00Z')), false);

check('exactamente 08:00 EC -> recupera',
    shouldCatchUp('2026-08-28', at('2026-08-29T13:00:00Z')), true);

check('sin registro previo y pasada la hora -> recupera',
    shouldCatchUp(null, at('2026-08-29T13:30:00Z')), true);

check('reconexión a las 20:00 EC habiendo corrido ese día -> no reenvía',
    shouldCatchUp('2026-08-29', at('2026-08-30T01:00:00Z')), false);

check('caído varios días, vuelve pasada la hora -> recupera',
    shouldCatchUp('2026-08-20', at('2026-08-29T15:00:00Z')), true);

const runConcurrencyTests = async () => {
    console.log('\nenvío diario (sin duplicados):');

    // Hoy en Ecuador, para que haya un mensaje que enviar.
    const ec = new Date(Date.now() - 5 * 60 * 60 * 1000);
    stub.birthdays = [{ name: 'Ana', month: ec.getUTCMonth() + 1, day: ec.getUTCDate() }];
    stub.ready = true;
    stub.sendDelayMs = 50;

    // Cron de las 13:00 y sondeo de */5 disparando a la vez; shouldCatchUp
    // depende de la hora real, así que el sondeo puede o no entrar — en ambos
    // casos debe salir un solo mensaje.
    await Promise.all([checkBirthdaysAndSend(), checkPendingRetry(), checkBirthdaysAndSend()]);
    check('llamadas simultáneas -> un solo mensaje', stub.sent.length, 1);

    await checkBirthdaysAndSend();
    check('otra llamada el mismo día -> no reenvía', stub.sent.length, 1);
};

runConcurrencyTests().then(() => {
    console.log(`\n${passed}/${passed} pruebas OK`);
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
}).catch((err) => {
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
    console.error(err);
    process.exit(1);
});
