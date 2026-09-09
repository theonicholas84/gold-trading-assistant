document.addEventListener('DOMContentLoaded', () => {

  // --- 1. SAKLAR TAB MENU (Analytics vs Terminal) ---
  const navButtons = document.querySelectorAll('.nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');

      // Nonaktifkan semua tab & tombol
      navButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // Aktifkan tab & tombol yang dipilih
      button.classList.add('active');
      const selectedContent = document.getElementById(targetTab);
      
      if (selectedContent) {
        selectedContent.classList.add('active');
      }
    });
  });

  // --- 2. LOGIKA WAKTU REAL-TIME (Analytics & Time) ---
  function updateRealtimeClock() {
    const clockElement = document.getElementById('live-clock');
    const dateElement = document.getElementById('live-date');

    if (clockElement && dateElement) {
      const now = new Date();

      // Format Jam (HH:MM:SS)
      clockElement.textContent = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Format Tanggal (Hari, DD Bulan YYYY)
      dateElement.textContent = now.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  // Jalankan setiap detik & langsung panggil di awal
  setInterval(updateRealtimeClock, 1000);
  updateRealtimeClock();

  // --- 3. LOGIKA TERMINAL CONSOLE ---
  const consoleInput = document.getElementById('console-input');
  const consoleOutput = document.getElementById('console-output');

  if (consoleInput && consoleOutput) {
    consoleInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const command = consoleInput.value.trim();

        if (command === '') return;

        // Tampilkan perintah pengguna
        appendConsoleLine(`$ ${command}`, 'user-cmd');

        // Proses perintah
        processCommand(command.toLowerCase());

        // Reset input & scroll ke paling bawah
        consoleInput.value = '';
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
      }
    });
  }

  function appendConsoleLine(text, type = 'response') {
    const p = document.createElement('p');
    p.textContent = text;

    if (type === 'user-cmd') {
      p.style.fontWeight = '600';
      p.style.color = '#0f172a';
    } else if (type === 'system') {
      p.style.color = '#4f46e5';
    } else if (type === 'error') {
      p.style.color = '#ef4444';
    } else {
      p.style.color = '#475569';
    }

    consoleOutput.appendChild(p);
  }

  function processCommand(cmd) {
    switch (cmd) {
      case 'help':
        appendConsoleLine('Perintah yang tersedia:', 'system');
        appendConsoleLine('  help     - Menampilkan daftar perintah');
        appendConsoleLine('  time     - Menampilkan waktu server saat ini');
        appendConsoleLine('  status   - Memeriksa status sistem');
        appendConsoleLine('  clear    - Membersihkan layar konsol');
        break;

      case 'time':
        const now = new Date().toLocaleString('id-ID');
        appendConsoleLine(`Waktu Sistem: ${now}`, 'system');
        break;

      case 'status':
        appendConsoleLine('Status Server: 100% Operational', 'system');
        appendConsoleLine('Memory Usage : 42%', 'system');
        appendConsoleLine('Latency      : 14ms', 'system');
        break;

      case 'clear':
        consoleOutput.innerHTML = '';
        break;

      default:
        appendConsoleLine(`Command '${cmd}' tidak dikenali. Ketik 'help' untuk petunjuk.`, 'error');
        break;
    }
  }

});
