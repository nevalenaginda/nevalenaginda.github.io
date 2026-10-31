// The comms terminal: a contact form dressed as a console. The site is static (GitHub Pages), so a
// valid signal is handed to the visitor's own mail app as a pre-filled email; nothing is sent to
// a server. The log says so, and the address can be copied as a fallback.
import { sfx } from './audio';
import { narrate } from './narration';

const form = document.querySelector<HTMLFormElement>('[data-terminal]');
const log = document.querySelector<HTMLOListElement>('[data-terminal-log]');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function line(text: string, tone: 'sys' | 'ok' | 'err' | 'aris' = 'sys') {
  if (!log) return;
  const li = document.createElement('li');
  li.dataset.tone = tone;
  li.textContent = text;
  log.append(li);
  // Keep the log short enough to read at a glance.
  while (log.children.length > 9) log.firstElementChild?.remove();
}

if (form && log) {
  const email = form.dataset.email ?? '';
  const fields = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')];
  let sending = false;
  fields.forEach((f) => f.addEventListener('input', () => f.removeAttribute('aria-invalid')));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    const invalid = fields.filter((f) => !f.checkValidity());
    fields.forEach((f) => (invalid.includes(f) ? f.setAttribute('aria-invalid', 'true') : f.removeAttribute('aria-invalid')));
    if (invalid.length) {
      sfx.play('error');
      for (const f of invalid) line(`ERR ${f.name}: ${f.validationMessage}`, 'err');
      invalid[0].focus();
      narrate(`Transmission blocked. Check ${invalid.map((f) => f.dataset.label ?? f.name).join(' and ')}.`, { speak: false, callout: 'Transmission blocked' });
      return;
    }
    sending = true;
    const [name, from, message] = fields.map((f) => f.value.trim());
    sfx.play('transmit');
    line(`> compiling signal packet · ${message.length} chars`);
    await wait(380);
    line(`> sender · ${name} <${from}>`);
    await wait(380);
    line('> routing through your mail app…');
    await wait(420);
    const subject = `Portfolio contact from ${name}`;
    const body = `${message}\n\n— ${name} (${from})`;
    location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    line('OK  your mail app should open with the message ready. Press send there to finish.', 'ok');
    line(`ARIS-1 · thanks, ${name}. No mail app? Copy the address on the right.`, 'aris');
    narrate(`Signal ready, ${name}. Your mail app should open with the message. Press send there to finish.`, { callout: 'Signal ready · check your mail app' });
    sending = false;
  });

  form.addEventListener('reset', () => {
    fields.forEach((f) => f.removeAttribute('aria-invalid'));
    line('> buffers cleared');
    sfx.play('click');
  });
}

// The copy-email button next to the terminal.
const copy = document.querySelector<HTMLButtonElement>('[data-copy-email]');
const copyLabel = copy?.querySelector<HTMLElement>('[data-copy-label]');
if (copy && copyLabel) {
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(copy.dataset.copyEmail ?? '');
      copyLabel.textContent = 'Copied ✓';
      sfx.play('click');
    } catch {
      copyLabel.textContent = 'Copy failed';
    }
    setTimeout(() => { copyLabel.textContent = 'Copy email'; }, 2000);
  });
}
