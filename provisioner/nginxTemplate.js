// Genera el bloque nginx de un equipo, anidado bajo el mismo prefijo /birthdays/
// que ya usa TB3 (verificado contra /etc/nginx/sites-available/default real):
// locations planas sin regex, así que /birthdays/<slug>/ (más específico) convive
// sin conflicto con el bloque general /birthdays/. El directorio en disco de cada
// equipo sigue siendo un HERMANO (frontendDir, fuera de /var/www/apps/birthdays/),
// nunca anidado dentro del propio directorio de TB3.
//
// El proxy_pass preserva "/api" en el destino (sin barra final), replicando
// exactamente el patrón ya probado de TB3 (`proxy_pass http://localhost:3001/api;`)
// — con barra final se le comería el prefijo /api antes de reenviarlo al backend.
const renderNginxSnippet = ({ slug, port, frontendDir }) => `# Auto-generado por provisioner para el equipo "${slug}". No editar a mano.
location = /birthdays/${slug} { return 301 /birthdays/${slug}/; }
location /birthdays/${slug}/ {
    alias ${frontendDir}/;
    try_files $uri $uri/ /birthdays/${slug}/index.html;
}

location /birthdays/${slug}/api {
    proxy_pass http://127.0.0.1:${port}/api;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
`;

module.exports = { renderNginxSnippet };
