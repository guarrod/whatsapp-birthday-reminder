# 🎂 WhatsApp Birthday Reminder

¡Nunca vuelvas a olvidar un cumpleaños! Esta aplicación automatiza los recordatorios de cumpleaños enviando mensajes personalizados a tu grupo de WhatsApp.

## ✨ Características

- **Recordatorios Automáticos**: Envía notificaciones 1 semana antes, 1 día antes y el mismo día del cumpleaños.
- **Reconexión Automática**: Si el bot pierde la sesión de WhatsApp, se reconecta solo y reintenta el recordatorio pendiente del día.
- **Interfaz Moderna y Responsive**: Tema claro ("Pleasant Light Theme") con diseño profesional, animaciones suaves y adaptado a mobile.
- **Gestión Visual**: Selectores interactivos para días y meses (nombres completos).
- **Log de Actividad**: Seguimiento en tiempo real del último recordatorio enviado (persistido en disco, sobrevive a reinicios) y el próximo evento programado.
- **Bot de WhatsApp**: Integración basada en [Baileys](https://github.com/WhiskeySockets/Baileys), que habla el protocolo WebSocket de WhatsApp directamente — sin navegador headless de por medio.

## 🛠️ Tecnologías

- **Backend**: Node.js, Express, SQLite, Baileys.
- **Frontend**: React, Vite, TypeScript, Lucide Icons.
- **Estilos**: Vanilla CSS con variables personalizadas y glassmorphism.

## 🚀 Instalación Local

### Requisitos
- Node.js (v18+)

### Pasos

1. **Clonar el repo**:
   ```bash
   git clone https://github.com/guarrod/whatsapp-birthday-reminder.git
   cd whatsapp-birthday-reminder
   ```

2. **Configurar variables de entorno**:
   - Copia `backend/.env.example` a `backend/.env` y ajusta el nombre del grupo de WhatsApp.

3. **Instalar dependencias**:
   ```bash
   # En la raíz
   npm install
   # En backend
   cd backend && npm install
   # En frontend
   cd ../frontend && npm install
   ```

4. **Ejecutar en desarrollo**:
   ```bash
   # En la raíz
   npm run dev
   ```

## 🚢 Despliegue (VPS)

El proyecto incluye un script de despliegue automatizado.

1. Configura tu acceso SSH al servidor.
2. Crea tu propio `deploy.sh` basado en `deploy.sh.template`.
3. Ejecuta:
   ```bash
   ./deploy.sh
   ```

## 📝 Uso

1. Abre la web (local o en tu VPS).
2. Escanea el código QR con tu WhatsApp para vincular el bot.
3. Añade los cumpleaños de tus amigos/familiares.
4. ¡Listo! El bot se encargará del resto a las 08:00 AM (hora Ecuador) cada día.

## 🔄 Migración de whatsapp-web.js a Baileys

El bot usaba originalmente `whatsapp-web.js`, que automatiza una instancia headless de Chrome para "leer" WhatsApp Web. En agosto 2026 esa librería quedó rota por un cambio interno de WhatsApp (migración al sistema LID), sin parche oficial publicado en semanas. Se migró a **Baileys**, que implementa el protocolo WebSocket de WhatsApp directamente:

- No depende de Chrome/Chromium ni de Puppeteer — menor consumo de RAM y sin el riesgo de que un cambio visual de WhatsApp Web rompa el scraping.
- La sesión se guarda en `backend/auth_info_baileys/` (antes `backend/.wwebjs_auth/`). Requiere volver a escanear el QR una sola vez tras la migración; sesiones futuras no se ven afectadas.
- El campo `Último envío` del panel se persiste en `backend/last-reminder.json` para que no se pierda con cada reinicio del proceso.

---

Hecho con ❤️ atte Carlitos
