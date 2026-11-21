const DATA = NAMEPLATE_DATA;
const FONT = '"Gotham Black", "Gotham", Montserrat, sans-serif';

const BORDER = 8, SIZE = 200, GAP = 12, BANNER_W = 1000;
const BANNER_X = SIZE + 2 * BORDER + GAP + BORDER;

const $ = id => document.getElementById(id);
const canvas = $('nameplate');
const ctx = canvas.getContext('2d');
const playerInput = $('player');
const titleSelect = $('title');

const byName = (list, name) => list.find(x => x.name === name) || list[0];
const state = {
  icon: byName(DATA.icons, 'Boombox Mastery Icon I'),
  banner: byName(DATA.banners, 'Crossroads Aromantic Pride'),
  title: byName(DATA.titles, 'Bat vs Rat'),
  team: 0,
  rank: 0,
  pluses: 25,
};
const hover = {};
const shown = key => hover[key] || state[key];

const RANKS = DATA.phestivalRanks;

const CUSTOM_TITLE = {
  name: 'Custom title',
  custom: true,
  requirement: 'Custom title.',
};
const customInput = $('custom-title');

function titleText() {
  const { title, team, rank, pluses } = state;
  if (title.custom) return customInput.value;
  if (!title.teams) return title.name;
  return `${title.teams[team]} ${RANKS[rank].name}${'+'.repeat(pluses)}`;
}

function titleRequirement() {
  const { title } = state;
  return title.teams ? `Play in the ${title.name} Phestival.` : title.requirement;
}

function buildTitles() {
  titleSelect.append(new Option(CUSTOM_TITLE.name, 'custom'));
  const groups = new Map();
  DATA.titles.forEach((title, index) => {
    if (!groups.has(title.category)) {
      const group = document.createElement('optgroup');
      group.label = title.category;
      groups.set(title.category, group);
      titleSelect.append(group);
    }
    groups.get(title.category).append(new Option(title.name, index, false, title === state.title));
  });
  for (const [index, rank] of RANKS.entries()) $('rank').append(new Option(rank.name, index));
}

function showPhestival() {
  const teams = state.title.teams;
  $('phestival').hidden = !teams;
  if (!teams) return;
  $('teams').replaceChildren(...teams.map((team, index) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'team';
    input.checked = index === state.team;
    input.addEventListener('change', () => { state.team = index; render(); });
    const text = document.createElement('span');
    text.textContent = team;
    label.append(input, text);
    return label;
  }));
}

titleSelect.addEventListener('change', () => {
  state.title = titleSelect.value === 'custom' ? CUSTOM_TITLE : DATA.titles[titleSelect.value];
  state.team = 0;
  showPhestival();
  $('custom-title-label').hidden = !state.title.custom;
  if (state.title.custom) customInput.focus();
  render();
});
customInput.addEventListener('input', render);
$('rank').addEventListener('change', event => { state.rank = +event.target.value; render(); });
$('pluses').addEventListener('input', event => {
  state.pluses = Math.max(0, Math.min(99, Math.floor(+event.target.value) || 0));
  render();
});

const images = new Map();
function loadImage(src) {
  if (!images.has(src)) {
    images.set(src, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    }));
  }
  return images.get(src);
}

function drawCover(img, x, y, w, h) {
  if (!img.naturalWidth || !img.naturalHeight) return ctx.drawImage(img, x, y, w, h);
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale, sh = h / scale;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

function outlinedText(text, x, y, weight, size, maxWidth) {
  do {
    ctx.font = `${weight} ${size}px ${FONT}`;
  } while (ctx.measureText(text).width > maxWidth && --size > 10);
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.13;
  ctx.strokeStyle = '#000';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x, y);
}

let renderId = 0;
async function render() {
  const id = ++renderId;
  const iconItem = shown('icon'), bannerItem = shown('banner');
  showRequirements();
  let icon, banner;
  const load = item => loadImage(item.image).catch(() => { throw item; });
  try {
    [icon, banner] = await Promise.all([
      load(iconItem),
      load(bannerItem),
      document.fonts.load(`900 60px ${FONT}`),
      document.fonts.load(`800 32px ${FONT}`),
    ]);
  } catch (failed) {
    if (id === renderId) alert(`Couldn't load "${failed.name}". Try a PNG, JPG or WebP file.`);
    return;
  }
  if (id !== renderId) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SIZE + 2 * BORDER, SIZE + 2 * BORDER);
  ctx.fillRect(BANNER_X - BORDER, 0, BANNER_W + 2 * BORDER, SIZE + 2 * BORDER);
  drawCover(icon, BORDER, BORDER, SIZE, SIZE);
  drawCover(banner, BANNER_X, BORDER, BANNER_W, SIZE);

  const shade = ctx.createLinearGradient(BANNER_X, BORDER + SIZE, BANNER_X + BANNER_W * 0.5, BORDER);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shade;
  ctx.fillRect(BANNER_X, BORDER, BANNER_W, SIZE);

  const textX = BANNER_X + 36;
  outlinedText(playerInput.value.toUpperCase(), textX, BORDER + 82, 900, 60, BANNER_W * 0.6);
  outlinedText(titleText(), textX + 2, BORDER + 124, 800, 32, BANNER_W * 0.6);
}

function showRequirements() {
  const rows = [
    ['Icon', shown('icon').name, shown('icon').requirement],
    ['Banner', shown('banner').name, shown('banner').requirement],
    ['Title', titleText() || state.title.name, titleRequirement()],
  ];
  $('requirements').replaceChildren(...rows.flatMap(([label, name, requirement]) => {
    const dt = document.createElement('dt');
    dt.textContent = `${label}: ${name}`;
    const dd = document.createElement('dd');
    dd.textContent = requirement;
    return [dt, dd];
  }));
}

$('download').addEventListener('click', () => {
  canvas.toBlob(blob => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nameplate-${playerInput.value || 'player'}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });
});

function hsvToCss(h, s, v) {
  const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return `rgb(${[5, 3, 1].map(n => Math.round(f(n) * 255)).join(', ')})`;
}

function hexToHsv(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? (g - b) / d : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, max ? d / max : 0, max];
}

function cone([h, s, v]) {
  const angle = h * Math.PI / 180;
  return [s * v * Math.cos(angle), s * v * Math.sin(angle), v];
}

const clamp = x => Math.min(1, Math.max(0, x));

function hsvPalette(root, label, onPick) {
  let h = 210, s = 0.7, v = 0.9;
  const square = document.createElement('div');
  square.className = 'sv';
  square.tabIndex = 0;
  square.setAttribute('role', 'slider');
  square.setAttribute('aria-label', `${label}: saturation and brightness (arrow keys)`);
  const knob = document.createElement('span');
  knob.className = 'knob';
  square.append(knob);

  const hue = document.createElement('input');
  hue.type = 'range';
  hue.className = 'hue';
  hue.min = 0;
  hue.max = 359;
  hue.value = h;
  hue.setAttribute('aria-label', `${label}: hue`);
  const swatch = document.createElement('span');
  swatch.className = 'swatch';
  const row = document.createElement('div');
  row.className = 'hue-row';
  row.append(hue, swatch);
  root.append(square, row);

  function paint() {
    square.style.backgroundColor = hsvToCss(h, 1, 1);
    knob.style.left = `${s * 100}%`;
    knob.style.top = `${(1 - v) * 100}%`;
    swatch.style.background = hsvToCss(h, s, v);
    square.setAttribute('aria-valuetext', `saturation ${Math.round(s * 100)}%, brightness ${Math.round(v * 100)}%`);
  }
  function pick() { paint(); onPick([h, s, v]); }
  function fromPointer(event) {
    const box = square.getBoundingClientRect();
    s = clamp((event.clientX - box.left) / box.width);
    v = 1 - clamp((event.clientY - box.top) / box.height);
    pick();
  }
  square.addEventListener('pointerdown', event => { square.setPointerCapture(event.pointerId); fromPointer(event); });
  square.addEventListener('pointermove', event => { if (square.hasPointerCapture(event.pointerId)) fromPointer(event); });
  square.addEventListener('keydown', event => {
    const step = event.shiftKey ? 0.1 : 0.02;
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[event.key];
    if (!move) return;
    event.preventDefault();
    s = clamp(s + move[0]);
    v = clamp(v + move[1]);
    pick();
  });
  hue.addEventListener('input', () => { h = +hue.value; pick(); });
  paint();
  return {
    get: () => [h, s, v],
    set([nh, ns, nv]) { h = nh; s = ns; v = nv; hue.value = h; paint(); },
  };
}

function pickerButton(column, item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.title = `${item.name}: ${item.requirement}`;
  button.setAttribute('aria-pressed', item === state[column.key]);
  const img = document.createElement('img');
  img.src = item.image;
  img.alt = '';
  img.loading = 'lazy';
  button.append(img);
  if (item.color) {
    const tone = document.createElement('span');
    tone.className = 'tone';
    tone.style.background = item.color;
    button.append(tone);
  }
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = item.name;
  button.append(name);

  button.addEventListener('click', () => select(column, item));
  button.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    hover[column.key] = item;
    render();
  });
  button.addEventListener('pointerleave', () => {
    if (hover[column.key] !== item) return;
    delete hover[column.key];
    render();
  });
  column.buttons.set(item, button);
  return button;
}

function select(column, item) {
  column.buttons.get(state[column.key])?.setAttribute('aria-pressed', false);
  column.buttons.get(item).setAttribute('aria-pressed', true);
  state[column.key] = item;
  delete hover[column.key];
  render();
}

function applySearch(column) {
  let visible = 0;
  for (const [item, button] of column.buttons) {
    button.hidden = !item.imported && !item.name.toLowerCase().includes(column.query);
    if (!button.hidden) visible++;
  }
  column.count.textContent = `${visible} of ${column.buttons.size}`;
  column.empty.hidden = visible > 0;
  column.empty.textContent = `No ${column.noun} named "${column.query}". `;
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.textContent = 'Clear search';
  clear.addEventListener('click', () => {
    column.search.value = '';
    column.query = '';
    applySearch(column);
  });
  column.empty.append(clear);
}

function order(column, hsv) {
  const target = cone(hsv);
  const distance = item => Math.hypot(...column.points.get(item).map((x, i) => x - target[i]));
  const items = [...column.buttons.keys()];
  const pinned = items.filter(item => item.imported);
  const rest = items.filter(item => !item.imported).sort((a, b) => distance(a) - distance(b));
  for (const item of [...pinned, ...rest]) column.grid.append(column.buttons.get(item));
}

function setupColumn(key, element, items, noun) {
  const column = {
    key, noun, query: '',
    buttons: new Map(),
    grid: element.querySelector('.picker'),
    count: element.querySelector('.count'),
    search: element.querySelector('.search'),
    points: new Map(items.map(item => [item, cone(hexToHsv(item.color))])),
    empty: document.createElement('p'),
  };
  for (const item of items) column.grid.append(pickerButton(column, item));
  column.empty.className = 'empty';
  column.grid.after(column.empty);
  column.search.addEventListener('input', () => {
    column.query = column.search.value.trim().toLowerCase();
    applySearch(column);
  });
  column.palette = hsvPalette(element.querySelector('.hsv'), `${key[0].toUpperCase()}${key.slice(1)} color`,
    hsv => pickColor(column, hsv));
  applySearch(column);
  return column;
}

const sameColor = $('same-color');
let columns = [], lastPicked = null;

function pickColor(source, hsv) {
  lastPicked = source;
  for (const column of sameColor.checked ? columns : [source]) {
    if (column !== source) column.palette.set(hsv);
    order(column, hsv);
  }
}

sameColor.addEventListener('change', () => {
  if (sameColor.checked && lastPicked) pickColor(lastPicked, lastPicked.palette.get());
});

function setupUpload(column, input) {
  input.addEventListener('change', () => {
    let first;
    for (const file of [...input.files].reverse()) {
      first = {
        name: file.name.replace(/\.[^.]+$/, ''),
        image: URL.createObjectURL(file),
        requirement: `Your own image. Imported ${column.noun} only show up here, not in the game.`,
        imported: true,
      };
      column.grid.prepend(pickerButton(column, first));
    }
    if (first) select(column, first);
    applySearch(column);
    input.value = '';
  });
}

columns = [
  setupColumn('icon', $('icon-column'), DATA.icons, 'icons'),
  setupColumn('banner', $('banner-column'), DATA.banners, 'banners'),
];
setupUpload(columns[0], $('icon-upload'));
setupUpload(columns[1], $('banner-upload'));

playerInput.addEventListener('input', render);
buildTitles();
showPhestival();
render();
