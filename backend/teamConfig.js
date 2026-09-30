const fs = require('fs');
const path = require('path');
const { DATA_DIR, GROUP_NAME } = require('./config');

const CONFIG_FILE = path.join(DATA_DIR, 'team-config.json');

// null significa "instalación legacy" (ej. TB3): nunca tuvo onboarding propio
// y debe seguir mandando por el WHATSAPP_GROUP_NAME de su .env, como siempre.
const getTeamConfig = () => {
    try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch {
        return null;
    }
};

const writeTeamConfig = (partial) => {
    const next = { ...(getTeamConfig() || {}), ...partial };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2));
    return next;
};

const setGroup = (jid, subject) => {
    return writeTeamConfig({ groupJid: jid, groupSubject: subject, onboarded: true });
};

// A quién mandarle el recordatorio hoy: el JID guardado por el equipo si existe,
// o el nombre de grupo de .env (comportamiento actual de TB3).
const getSendTarget = () => {
    const team = getTeamConfig();
    return (team && team.groupJid) || GROUP_NAME;
};

module.exports = { getTeamConfig, writeTeamConfig, setGroup, getSendTarget };
