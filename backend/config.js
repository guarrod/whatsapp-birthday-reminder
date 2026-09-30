require('dotenv').config();

module.exports = {
    GROUP_NAME: process.env.WHATSAPP_GROUP_NAME || 'TB3-Asuntos sociales',
    PORT: process.env.PORT || 3001,
    DATA_DIR: process.env.DATA_DIR || __dirname,
};
