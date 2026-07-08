// dom.js
// Minimal DOM-builder helper. No HTML strings, no innerHTML with data in it.
// `content` items are appended as text nodes (via textContent-safe path) unless
// they are already DOM Nodes.

const _adopted = new Set();
let _cssBase = '/css/';

export function setStylesheetBase(base) {
  _cssBase = base;
}

export async function adoptStylesheet(...urls) {
  const sheets = await Promise.all(urls.map(async url => {
    if (_adopted.has(url)) return;
    _adopted.add(url);
    const resolved = _cssBase && !url.startsWith('/') && !url.startsWith('http') ? _cssBase + url : url;
    const res = await fetch(resolved);
    const css = await res.text();
    const sheet = new CSSStyleSheet();
    await sheet.replace(css);
    return sheet;
  }));
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, ...sheets.filter(Boolean)];
}

export function h(tag, props = {}, children = []) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;

    if (key === 'class') {
      el.className = value;
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key === 'style') {
      Object.assign(el.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value);
    }
  }

  for (const child of [].concat(children)) {
    if (child == null) continue;
    el.append(child instanceof Node ? child : document.createTextNode(child));
  }

  return el;
}
