require('dotenv').config();
const express = require('express');
const path = require('path');
const { provisionTeam } = require('./provision');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/provision', async (req, res) => {
    const { displayName, token } = req.body || {};
    if (!displayName || !token) {
        return res.status(400).json({ error: 'Falta el nombre o el enlace de invitación no es válido' });
    }
    try {
        const result = await provisionTeam({ displayName, token });
        res.status(201).json(result);
    } catch (err) {
        const message = (err && err.message) || 'Ocurrió un error inesperado al crear el equipo';
        console.error('[PROVISION] Error:', message, err);
        res.status((err && err.status) || 500).json({ error: message });
    }
});

app.listen(PORT, () => {
    console.log(`Provisioner listening at http://localhost:${PORT}`);
});
