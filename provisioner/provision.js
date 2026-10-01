const fs = require('fs');
const path = require('path');
const net = require('net');
const { execSync } = require('child_process');
const pm2 = require('pm2');
const { slugify, isReserved } = require('./slug');
const { reserveSlugAndPort, reassignPort, commitTeam, removeTeam } = require('./teamsStore');
const { isValidToken } = require('./invitesStore');
const { renderNginxSnippet } = require('./nginxTemplate');

const httpError = (status, message) => Object.assign(new Error(message), { status });

const isDryRun = () => process.env.DRY_RUN === '1';

// El registro propio (teams.json) solo sabe de los puertos que ÉL asignó —
// no de otras apps que ya corran en el mismo VPS (ej. kpi-server en 3002).
// Verificamos contra el sistema operativo antes de confiar en el número.
const isPortFree = (port) => new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => tester.close(() => resolve(true)));
    tester.listen(port, '0.0.0.0');
});

// pm2.start() puede llamar a su callback sin error aunque el script no exista o
// el proceso hijo crashee al instante (PM2 solo confirma que lo registró y lo
// intentó lanzar, no que siga vivo). Sin esto, un equipo quedaría marcado como
// "active" en el registro con su backend en realidad caído.
const waitForPm2Online = (pm2Name, { attempts = 15, intervalMs = 300 } = {}) => new Promise((resolve, reject) => {
    const check = (tries) => {
        pm2.describe(pm2Name, (err, list) => {
            if (err) return reject(err);
            const status = list[0] && list[0].pm2_env && list[0].pm2_env.status;
            if (status === 'online') return resolve();
            if (status === 'errored' || status === 'stopped') {
                return reject(new Error(`El proceso ${pm2Name} no arrancó correctamente (status: ${status})`));
            }
            if (tries >= attempts) return reject(new Error(`El proceso ${pm2Name} no llegó a estar "online" a tiempo`));
            setTimeout(() => check(tries + 1), intervalMs);
        });
    };
    check(0);
});

const startPm2Process = ({ pm2Name, port, dataDir }) => new Promise((resolve, reject) => {
    pm2.connect((err) => {
        if (err) return reject(err);
        pm2.start({
            script: path.join(process.env.REPO_ROOT, 'backend', 'index.js'),
            name: pm2Name,
            cwd: path.join(process.env.REPO_ROOT, 'backend'),
            exec_mode: 'fork',
            instances: 1,
            env: { PORT: String(port), DATA_DIR: dataDir, NODE_ENV: 'production' },
        }, (err2) => {
            if (err2) {
                pm2.disconnect();
                return reject(err2);
            }
            waitForPm2Online(pm2Name)
                .then(() => { pm2.disconnect(); resolve(); })
                .catch((waitErr) => { pm2.disconnect(); reject(waitErr); });
        });
    });
});

const stopPm2Process = (pm2Name) => new Promise((resolve) => {
    pm2.connect((err) => {
        if (err) return resolve();
        pm2.delete(pm2Name, () => { pm2.disconnect(); resolve(); });
    });
});

const buildFrontend = ({ slug, frontendDir }) => {
    const frontendRoot = path.join(process.env.REPO_ROOT, 'frontend');
    const outDir = path.join(frontendRoot, `.provision-dist-${slug}`);
    execSync('npm run build', {
        cwd: frontendRoot,
        env: { ...process.env, VITE_BASE_PATH: `/birthdays/${slug}/`, VITE_OUT_DIR: outDir },
        stdio: 'inherit',
    });
    fs.mkdirSync(path.dirname(frontendDir), { recursive: true });
    fs.cpSync(outDir, frontendDir, { recursive: true });
    fs.rmSync(outDir, { recursive: true, force: true });
};

// Si el proceso ya corre como root (caso confirmado en este VPS), no anteponemos
// "sudo" — en instalaciones mínimas donde todo corre como root, "sudo" puede ni
// estar instalado, y de todos modos sería redundante.
const isRoot = () => typeof process.getuid === 'function' && process.getuid() === 0;
const withPrivilege = (cmd) => (isRoot() ? cmd : `sudo ${cmd}`);

const reloadNginx = () => {
    execSync(withPrivilege('nginx -t'));
    execSync(withPrivilege('systemctl reload nginx'));
};

const writeNginxSnippetAndReload = ({ nginxFile, slug, port, frontendDir }) => {
    fs.mkdirSync(process.env.NGINX_INCLUDE_DIR, { recursive: true });
    fs.writeFileSync(nginxFile, renderNginxSnippet({ slug, port, frontendDir }));
    reloadNginx();
};

const provisionTeam = async ({ displayName, token }) => {
    if (!isValidToken(token)) {
        throw httpError(401, 'Este enlace de invitación no es válido o fue revocado');
    }

    const slug = slugify(displayName);
    if (!slug) throw httpError(400, 'Ese nombre no genera una URL válida, prueba con otro');
    if (isReserved(slug)) throw httpError(409, 'Ese nombre no está disponible, elige otro');

    let port;
    try {
        port = await reserveSlugAndPort(slug);
    } catch (err) {
        if (err.message === 'SLUG_TAKEN') throw httpError(409, 'Ya existe un equipo con ese nombre, elige otro');
        throw err;
    }

    // Si el puerto ya está en uso por otra app del servidor (no registrada en
    // teams.json), saltamos al siguiente en vez de arrancar un proceso que
    // nunca podrá escuchar en ese puerto.
    for (let attempts = 0; !(await isPortFree(port)) && attempts < 20; attempts++) {
        port = await reassignPort(slug);
    }
    if (!(await isPortFree(port))) {
        await removeTeam(slug).catch(() => {});
        throw httpError(500, 'No se encontró un puerto libre, avisá al admin');
    }

    const dataDir = path.join(process.env.TEAMS_BASE_DIR, slug, 'data');
    // Hermano de /var/www/apps/birthdays/ (el propio de TB3), nunca anidado dentro:
    // la URL se anida vía nginx (alias), el disco no.
    const frontendDir = path.join(process.env.WWW_BASE_DIR, `birthdays-${slug}`);
    const pm2Name = `bot-${slug}`;
    const nginxFile = path.join(process.env.NGINX_INCLUDE_DIR, `${slug}.conf`);

    const rollback = [];
    try {
        fs.mkdirSync(dataDir, { recursive: true });
        rollback.push(() => fs.rmSync(dataDir, { recursive: true, force: true }));

        fs.writeFileSync(path.join(dataDir, 'team-config.json'), JSON.stringify({
            displayName, slug, groupJid: null, groupSubject: null, onboarded: false,
        }, null, 2));

        if (isDryRun()) {
            console.log(`[DRY_RUN] pm2.start ${pm2Name} en puerto ${port}, DATA_DIR=${dataDir}`);
        } else {
            await startPm2Process({ pm2Name, port, dataDir });
            rollback.push(() => stopPm2Process(pm2Name));
        }

        if (isDryRun()) {
            console.log(`[DRY_RUN] build frontend VITE_BASE_PATH=/birthdays/${slug}/ -> ${frontendDir}`);
        } else {
            buildFrontend({ slug, frontendDir });
            rollback.push(() => fs.rmSync(frontendDir, { recursive: true, force: true }));
        }

        if (isDryRun()) {
            console.log(`[DRY_RUN] escribir ${nginxFile} y recargar nginx`);
        } else {
            writeNginxSnippetAndReload({ nginxFile, slug, port, frontendDir });
            rollback.push(() => {
                fs.rmSync(nginxFile, { force: true });
                try { reloadNginx(); } catch (e) { console.error('[PROVISION] No se pudo recargar nginx durante el rollback:', e.message); }
            });
        }

        await commitTeam(slug, { displayName, port, pm2Name, dataDir, frontendDir });

        return { slug, url: `https://${process.env.DOMAIN}/birthdays/${slug}/` };
    } catch (err) {
        for (const undo of rollback.reverse()) {
            try { await undo(); } catch (undoErr) { console.error('[PROVISION] rollback falló:', (undoErr && undoErr.message) || undoErr); }
        }
        await removeTeam(slug).catch(() => {});
        throw err;
    }
};

module.exports = { provisionTeam };
