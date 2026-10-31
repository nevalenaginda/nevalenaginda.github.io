// Case studies are flat Markdown: an h2, then its paragraphs and lists. This Sätteri hast plugin
// wraps each h2 and what follows it in a <section>, so the page can animate, colour and track the
// parts as mission log entries. It also gives each part a "read aloud" button and the text to read
// (data-read-text), and turns the bullets under "Key trade-offs" into cards ARIS-1 can scan. The
// Markdown files stay plain.

// Nebula and accent colour per part; unknown parts take the next colour in turn.
const tones = { problem: 'rose', approach: 'cyan', 'key trade-offs': 'violet', role: 'teal', 'public outcome': 'amber', reference: 'teal' };
const cycle = ['teal', 'cyan', 'violet', 'amber', 'rose'];

const textOf = (node) => (node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join(''));
const escape = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** A plain copy of a node: the new tree must hold ordinary objects, not the visitor's lazy views. */
function copy(node) {
  if (node.type === 'element') {
    return { type: 'element', tagName: node.tagName, properties: { ...(node.properties ?? {}) }, children: (node.children ?? []).map(copy) };
  }
  if ('children' in node) return { type: node.type, children: node.children.map(copy) };
  return { type: node.type, value: node.value };
}

const svg = (paths) => `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths.map((d) => `<path d="${d}"/>`).join('')}</svg>`;
const speaker = svg(['M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z', 'M16 9a5 5 0 0 1 0 6', 'M19.364 18.364a9 9 0 0 0 0-12.728']);
const scanLine = svg(['M3 7V5a2 2 0 0 1 2-2h2', 'M17 3h2a2 2 0 0 1 2 2v2', 'M21 17v2a2 2 0 0 1-2 2h-2', 'M7 21H5a2 2 0 0 1-2-2v-2', 'M7 12h10']);

// Shown only where the browser can speak (:root[data-speech] in global.css).
const readButton = (title) => ({ type: 'raw', value: `<button type="button" class="read-part" data-read-btn aria-label="Read &quot;${escape(title)}&quot; aloud" title="Read this part aloud">${speaker}</button>` });
const scanButton = (label) => ({ type: 'raw', value: `<button type="button" class="tradeoff-scan" data-scan-btn aria-label="Scan: ${escape(label)}" title="Scan this trade-off">${scanLine}</button>` });

function decorateTradeoffs(list) {
  list.properties.className = ['tradeoffs'];
  for (const item of list.children) {
    if (item.type !== 'element' || item.tagName !== 'li') continue;
    const strong = item.children.find((c) => c.type === 'element' && c.tagName === 'strong');
    const say = textOf(item).replace(/\s+/g, ' ').trim();
    const label = (strong ? textOf(strong) : say.slice(0, 60)).trim().replace(/\.$/, '');
    Object.assign(item.properties, {
      className: ['trade-off', 'scan-card', 'brackets'],
      dataScan: '', dataScanClick: '', dataReveal: 'card', dataScanLabel: label, dataScanSay: say,
    });
    item.children.push(scanButton(label));
  }
}

export const briefSections = {
  name: 'brief-sections',
  after(root, ctx) {
    const children = [];
    let section = null;
    for (const child of root.children) {
      const node = copy(child);
      if (node.type === 'element' && node.tagName === 'h2') {
        const title = textOf(node).trim();
        const key = title.toLowerCase();
        const tone = tones[key] ?? cycle[children.filter((c) => c.tagName === 'section').length % cycle.length];
        node.properties.dataSplit = 'mask';
        section = {
          type: 'element', tagName: 'section',
          properties: { className: ['brief-section'], dataBriefSection: '', dataWash: tone, dataTone: tone, ...(key === 'key trade-offs' ? { dataTradeoffs: '' } : {}) },
          children: [node, readButton(title)],
        };
        children.push(section);
        continue;
      }
      if (!section) { children.push(node); continue; }
      if (node.type === 'element') {
        if (node.tagName === 'ul' && 'dataTradeoffs' in section.properties) decorateTradeoffs(node);
        else if (['p', 'ul', 'ol', 'blockquote'].includes(node.tagName)) node.properties.dataReveal = '';
      }
      section.children.push(node);
    }
    // What the voice reads for each part: the heading, then every paragraph and bullet as sentences.
    for (const part of children) {
      if (part.tagName !== 'section') continue;
      const sentences = [];
      for (const node of part.children) {
        if (node.type !== 'element') continue;
        const items = ['ul', 'ol'].includes(node.tagName) ? node.children.filter((c) => c.type === 'element' && c.tagName === 'li') : [node];
        for (const item of items) {
          const line = textOf(item).replace(/\s+/g, ' ').trim();
          if (line) sentences.push(/[.!?]$/.test(line) ? line : `${line}.`);
        }
      }
      part.properties.dataReadText = sentences.join(' ');
    }
    ctx.replaceNode(root, { type: 'root', children });
  },
};
