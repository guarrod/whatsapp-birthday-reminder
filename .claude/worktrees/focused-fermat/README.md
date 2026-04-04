# 🎂 WhatsApp Birthday Reminder

¡Nunca vuelvas a olvidar un cumpleaños! Esta aplicación automatiza los recordatorios de cumpleaños enviando mensajes personalizados a tu grupo de WhatsApp.

## ✨ Características

- **Recordatorios Automáticos**: Envía notificaciones 1 semana antes, 1 día antes y el mismo día del cumpleaños.
- **Interfaz Moderna**: Tema claro ("Pleasant Light Theme") con diseño profesional y animaciones suaves.
- **Gestión Visual**: Selectores interactivos para días y meses (nombres completos).
- **Log de Actividad**: Seguimiento en tiempo real del último recordatorio enviado y el próximo evento programado.
- **Bot de WhatsApp**: Integración robusta basada en `whatsapp-web.js`.

## 🛠️ Tecnologías

- **Backend**: Node.js, Express, SQLite, whatsapp-web.js.
- **Frontend**: React, Vite, TypeScript, Lucide Icons.
- **Estilos**: Vanilla CSS con variables personalizadas y glassmorphism.

## 🚀 Instalación Local

### Requisitos
- Node.js (v18+)
- Google Chrome o Chromium

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
4. ¡Listo! El bot se encargará del resto a las 09:00 AM cada día.

---

Hecho con ❤️ atte Carlitos
