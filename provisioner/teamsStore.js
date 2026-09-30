const fs = require('fs');
const path = require('path');

const TEAMS_FILE = path.join(__dirname, 'teams.json');

const readRaw = () => {
    try {
        return JSON.parse(fs.readFileSync(TEAMS_FILE, 'utf8'));
    } catch {
        return { nextPort: 3002, teams: [] };
    }
};

const writeRaw = (data) => {
    fs.writeFileSync(TEAMS_FILE, JSON.stringify(data, null, 2));
};

// Serializa lecturas-modificaciones-escrituras en una cola de promesas para
// evitar carreras si dos altas de equipo llegan casi al mismo tiempo (un solo
// proceso Node, sin cluster, así que esto es suficiente).
let queue = Promise.resolve();
const withLock = (fn) => {
    const result = queue.then(fn);
    queue = result.then(() => {}, () => {});
    return result;
};

const listTeams = () => readRaw().teams;

// Reserva atómicamente un slug + el siguiente puerto libre. Lanza si el slug
// ya existe. El puerto se incrementa de inmediato y nunca se reutiliza, aunque
// la provisión falle después — desperdiciar un número de puerto es inofensivo.
const reserveSlugAndPort = (slug) => withLock(() => {
    const data = readRaw();
    if (data.teams.some(t => t.slug === slug)) {
        throw new Error('SLUG_TAKEN');
    }
    const port = data.nextPort;
    data.nextPort = port + 1;
    data.teams.push({ slug, port, status: 'provisioning', createdAt: new Date().toISOString() });
    writeRaw(data);
    return port;
});

const commitTeam = (slug, fields) => withLock(() => {
    const data = readRaw();
    const team = data.teams.find(t => t.slug === slug);
    if (team) Object.assign(team, fields, { status: 'active' });
    writeRaw(data);
});

const removeTeam = (slug) => withLock(() => {
    const data = readRaw();
    data.teams = data.teams.filter(t => t.slug !== slug);
    writeRaw(data);
});

module.exports = { listTeams, reserveSlugAndPort, commitTeam, removeTeam };
