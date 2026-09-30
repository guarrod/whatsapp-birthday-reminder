const form = document.getElementById('provision-form');
const submitBtn = document.getElementById('submit-btn');
const message = document.getElementById('message');

const showMessage = (text) => {
  message.textContent = text;
  message.hidden = false;
};

const token = new URLSearchParams(window.location.search).get('token');

if (!token) {
  showMessage('Este enlace no es válido. Pídele a quien te lo compartió que te pase uno nuevo.');
} else {
  form.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creando tu bot...';
  message.hidden = true;

  const displayName = document.getElementById('displayName').value;

  try {
    const res = await fetch('/api/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, token }),
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error || 'Ocurrió un error al crear tu bot.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Crear mi bot';
      return;
    }

    showMessage('¡Listo! Te llevamos a tu bot...');
    window.location.href = data.url;
  } catch (err) {
    console.error(err);
    showMessage('Ocurrió un error de red. Intenta de nuevo.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Crear mi bot';
  }
});
