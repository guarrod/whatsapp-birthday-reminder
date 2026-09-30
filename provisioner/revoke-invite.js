// Uso: node revoke-invite.js <token-o-id>
const { revokeInvite } = require('./invitesStore');

(async () => {
    const idOrToken = process.argv[2];
    if (!idOrToken) {
        console.error('Uso: node revoke-invite.js <token-o-id>');
        process.exit(1);
    }
    try {
        const invite = await revokeInvite(idOrToken);
        console.log(`Invitación revocada${invite.label ? ` (${invite.label})` : ''}.`);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
})();
