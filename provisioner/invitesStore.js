const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const INVITES_FILE = path.join(__dirname, 'invites.json');

const readRaw = () => {
    try {
        return JSON.parse(fs.readFileSync(INVITES_FILE, 'utf8'));
    } catch {
        return { invites: [] };
    }
};

const writeRaw = (data) => {
    fs.writeFileSync(INVITES_FILE, JSON.stringify(data, null, 2));
};

// Mismo patrón de cola en memoria que teamsStore.js, para serializar
// lecturas-modificaciones-escrituras y evitar carreras.
let queue = Promise.resolve();
const withLock = (fn) => {
    const result = queue.then(fn);
    queue = result.then(() => {}, () => {});
    return result;
};

const listInvites = () => readRaw().invites;

const createInvite = (label) => withLock(() => {
    const data = readRaw();
    const invite = {
        id: crypto.randomUUID(),
        token: crypto.randomBytes(16).toString('hex'),
        label: label || null,
        createdAt: new Date().toISOString(),
        revoked: false,
    };
    data.invites.push(invite);
    writeRaw(data);
    return invite;
});

// Acepta tanto el id como el token para identificar la invitación a revocar,
// porque desde la CLI es más natural pegar el token que copiar el id.
const revokeInvite = (idOrToken) => withLock(() => {
    const data = readRaw();
    const invite = data.invites.find(i => i.id === idOrToken || i.token === idOrToken);
    if (!invite) throw new Error('No se encontró esa invitación');
    invite.revoked = true;
    writeRaw(data);
    return invite;
});

const isValidToken = (token) => {
    if (!token) return false;
    const invite = readRaw().invites.find(i => i.token === token);
    return !!invite && !invite.revoked;
};

module.exports = { listInvites, createInvite, revokeInvite, isValidToken };
