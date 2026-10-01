// Uso: node create-invite.js <palabra> ["etiqueta opcional"]
// Genera un enlace de invitación reusable con la palabra que elijas e imprime
// la URL lista para compartir.
require('dotenv').config();
const { createInvite } = require('./invitesStore');

const TOKEN_PATTERN = /^[a-z0-9-]+$/i;

(async () => {
    const [rawToken, ...labelParts] = process.argv.slice(2);
    const label = labelParts.join(' ') || null;

    if (!rawToken || !TOKEN_PATTERN.test(rawToken)) {
        console.error('Uso: node create-invite.js <palabra> ["etiqueta opcional"]');
        console.error('La palabra solo puede tener letras, números y guiones (ej. ventas2026).');
        process.exit(1);
    }

    try {
        const invite = await createInvite(rawToken, label);
        const domain = process.env.DOMAIN || '<tu-dominio>';
        console.log('Invitación creada' + (label ? ` (${label})` : '') + ':');
        console.log(`https://${domain}/onboarding/?token=${invite.token}`);
    } catch (err) {
        if (err.message === 'TOKEN_TAKEN') {
            console.error(`"${rawToken}" ya está en uso por otra invitación. Elige otra palabra.`);
        } else {
            console.error(err.message);
        }
        process.exit(1);
    }
})();
