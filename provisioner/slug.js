// 'assets' está reservado porque TB3 sirve su propio JS/CSS en /birthdays/assets/*
// (confirmado en la config real de nginx) — un equipo con ese slug le robaría esa
// URL y rompería el frontend de TB3, dado que las URLs ahora anidan bajo /birthdays/.
const RESERVED = new Set(['tb3', 'api', 'assets', 'admin', 'onboarding', 'provisioner', 'www', 'static', 'nuevo']);

const slugify = (name) => {
    return (name || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar tildes
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
};

const isReserved = (slug) => RESERVED.has(slug);

module.exports = { slugify, isReserved, RESERVED };
