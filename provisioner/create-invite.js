// Uso: node create-invite.js ["etiqueta opcional"]
// Genera un enlace de invitación reusable e imprime la URL lista para compartir.
require('dotenv').config();
const { createInvite } = require('./invitesStore');

(async () => {
    const label = process.argv.slice(2).join(' ') || null;
    const invite = await createInvite(label);
    const domain = process.env.DOMAIN || '<tu-dominio>';
    console.log('Invitación creada' + (label ? ` (${label})` : '') + ':');
    console.log(`https://${domain}/onboarding/?token=${invite.token}`);
})();
