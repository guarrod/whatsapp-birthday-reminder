require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getBirthdays, getBirthdayById, addBirthday, updateBirthday, deleteBirthday } = require('./db');
const { initializeBot, getStatus, sendGroupMessage } = require('./bot');
const { getLastReminder, getNextReminderInfo, startScheduler } = require('./scheduler');

const GROUP_NAME = process.env.WHATSAPP_GROUP_NAME || 'TB3-Asuntos sociales';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Endpoints
app.get('/api/birthdays', async (req, res) => {
    try {
        const birthdays = await getBirthdays();
        res.json(birthdays);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/birthdays/:id', async (req, res) => {
    try {
        const birthday = await getBirthdayById(req.params.id);
        if (!birthday) return res.status(404).json({ error: 'Not found' });
        res.json(birthday);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/birthdays', async (req, res) => {
    try {
        const { name, day, month } = req.body;
        if (!name || !day || !month) return res.status(400).json({ error: 'Missing required fields' });
        const newBirthday = await addBirthday(name, day, month);
        res.status(201).json(newBirthday);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/birthdays/:id', async (req, res) => {
    try {
        const { name, day, month } = req.body;
        if (!name || !day || !month) return res.status(400).json({ error: 'Missing required fields' });
        const updated = await updateBirthday(req.params.id, name, day, month);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/birthdays/:id', async (req, res) => {
    try {
        const result = await deleteBirthday(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bot endpoints
app.get('/api/bot/status', async (req, res) => {
    res.json({
        ...getStatus(),
        lastReminder: getLastReminder(),
        nextReminder: await getNextReminderInfo()
    });
});

app.post('/api/bot/send-test/:id', async (req, res) => {
    try {
        const birthday = await getBirthdayById(req.params.id);
        if (!birthday) return res.status(404).json({ error: 'Birthday not found' });

        const today = new Date();
        const isToday = today.getDate() === birthday.day && (today.getMonth() + 1) === birthday.month;

        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const monthName = months[birthday.month - 1];

        let message = '';
        if (isToday) {
            message = `Recuerden hoy es el cumpleaños de *${birthday.name}* 🥳🎂🎉`;
        } else {
            message = `Recordemos que el cumpleaños de *${birthday.name}* es el ${birthday.day} de ${monthName} 📅`;
        }

        await sendGroupMessage(GROUP_NAME, message);

        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message || 'Failed to send message' });
    }
});

// Start bot and scheduler
initializeBot();
startScheduler();

// Serve static frontend
const path = require('path');
app.use(express.static(path.join(__dirname, '../dist')));
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
