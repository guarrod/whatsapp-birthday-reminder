const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let latestQR = null;
let isReady = false;

// Create a new WhatsApp client instance with local auth strategy 
// Note: We use the local installation of Chrome because puppeteer download was skipped
const executablePath = process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : '/usr/bin/chromium-browser';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

client.on('qr', (qr) => {
    console.log('QR Code received, scan it with your phone:');
    qrcode.generate(qr, { small: true });
    latestQR = qr;
    isReady = false;
});

client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    latestQR = null; // Clear QR when ready
    isReady = true;
});

client.on('authenticated', () => {
    console.log('WhatsApp Client is authenticated!');
});

client.on('auth_failure', msg => {
    console.error('WhatsApp Client authentication failure:', msg);
    isReady = false;
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp Client was disconnected', reason);
    isReady = false;
});

const initializeBot = () => {
    console.log('Initializing WhatsApp bot...');
    client.initialize().catch(err => {
        console.error('Failed to initialize WhatsApp bot:', err);
    });
};

const getStatus = () => {
    return {
        isReady,
        qr: latestQR
    };
};

const sendGroupMessage = async (groupName, message) => {
    if (!isReady) {
        throw new Error('WhatsApp client is not ready');
    }

    try {
        const chats = await client.getChats();
        const groupChat = chats.find(chat => chat.isGroup && chat.name === groupName);

        if (groupChat) {
            await client.sendMessage(groupChat.id._serialized, message);
            console.log(`Mensaje enviado a grupo ${groupName}: ${message}`);
        } else {
            console.log(`No se encontró el grupo: ${groupName}`);
            throw new Error(`Group ${groupName} not found`);
        }
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

module.exports = {
    client,
    initializeBot,
    getStatus,
    sendGroupMessage
};
