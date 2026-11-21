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
const plates = [{
  name: 'battbites',
  icon: byName(DATA.icons, 'Boombox Mastery Icon I'),
  banner: byName(DATA.banners, 'Crossroads Aromantic Pride'),
  title: byName(DATA.titles, 'Bat vs Rat'),
  customTitle: '',
  team: 0,
  rank: 0,
  pluses: 25,
}];
let active = 0;
let state = plates[active];
const hover = {};
const shown = key => hover[key] || state[key];

const RANKS = DATA.phestivalRanks;

const CUSTOM_TITLE = {
  name: 'Custom title',
  custom: true,
  requirement: 'Custom title.',
};
const customInput = $('custom-title');

function titleText(plate = state) {
  const { title, team, rank, pluses } = plate;
  if (title.custom) return plate.customTitle;
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
customInput.addEventListener('input', () => { state.customTitle = customInput.value; render(); });
$('rank').addEventListener('change', event => { state.rank = +event.target.value; render(); });
$('pluses').addEventListener('input', event => {
  state.pluses = Math.max(0, Math.min(99, Math.floor(+event.target.value) || 0));
  render();
});

const GIFENC = 'https://cdn.jsdelivr.net/npm/gifenc@1.0.3/dist/gifenc.esm.js';
const media = new Map();

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function decodeGif(src) {
  const decoder = new ImageDecoder({ data: await (await fetch(src)).arrayBuffer(), type: 'image/gif' });
  await decoder.tracks.ready;
  await decoder.completed;
  const frames = [];
  for (let i = 0; i < decoder.tracks.selectedTrack.frameCount; i++) {
    const { image } = await decoder.decode({ frameIndex: i });
    const delay = (image.duration ?? 0) / 1000;
    frames.push({ image: await createImageBitmap(image), delay: delay >= 20 ? delay : 100 });
    image.close();
  }
  decoder.close();
  return { frames, duration: frames.length > 1 ? frames.reduce((sum, frame) => sum + frame.delay, 0) : 0 };
}

function loadMedia(item) {
  if (!media.has(item.image)) {
    const isGif = item.type ? item.type === 'image/gif' : /\.gif$/i.test(item.image);
    const still = () => loadImage(item.image).then(image => ({ frames: [{ image, delay: 0 }], duration: 0 }));
    media.set(item.image, isGif && 'ImageDecoder' in window ? decodeGif(item.image).catch(still) : still());
  }
  return media.get(item.image);
}

function frameAt({ frames, duration }, t) {
  let time = duration ? t % duration : 0;
  for (const frame of frames) {
    if (time < frame.delay) return frame.image;
    time -= frame.delay;
  }
  return frames[0].image;
}

function drawCover(g, img, x, y, w, h) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return g.drawImage(img, x, y, w, h);
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale, sh = h / scale;
  g.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}

function outlinedText(g, text, x, y, weight, size, maxWidth) {
  do {
    g.font = `${weight} ${size}px ${FONT}`;
  } while (g.measureText(text).width > maxWidth && --size > 10);
  g.lineJoin = 'round';
  g.lineWidth = size * 0.13;
  g.strokeStyle = '#000';
  g.strokeText(text, x, y);
  g.fillStyle = '#fff';
  g.fillText(text, x, y);
}

let current = null;

function draw(g, t, shot = current, plate = state) {
  g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  paintPlate(g, t, shot, plate);
}

function paintPlate(g, t, { icon, banner }, plate) {
  g.fillStyle = '#000';
  g.fillRect(0, 0, SIZE + 2 * BORDER, SIZE + 2 * BORDER);
  g.fillRect(BANNER_X - BORDER, 0, BANNER_W + 2 * BORDER, SIZE + 2 * BORDER);
  drawCover(g, frameAt(icon, t), BORDER, BORDER, SIZE, SIZE);
  drawCover(g, frameAt(banner, t), BANNER_X, BORDER, BANNER_W, SIZE);

  const shade = g.createLinearGradient(BANNER_X, BORDER + SIZE, BANNER_X + BANNER_W * 0.5, BORDER);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = shade;
  g.fillRect(BANNER_X, BORDER, BANNER_W, SIZE);

  const textX = BANNER_X + 36;
  outlinedText(g, plate.name.toUpperCase(), textX, BORDER + 82, 900, 60, BANNER_W * 0.6);
  outlinedText(g, titleText(plate), textX + 2, BORDER + 124, 800, 32, BANNER_W * 0.6);
}

const isAnimated = ({ icon, banner } = current) => icon.duration > 0 || banner.duration > 0;
const startTime = performance.now();
let frameRequest = 0;

function paintAll(t) {
  if (current) draw(ctx, t);
  drawTeam(t);
}

function animate(now) {
  paintAll(now - startTime);
  frameRequest = requestAnimationFrame(animate);
}

function restartAnimation() {
  cancelAnimationFrame(frameRequest);
  if ((current && isAnimated()) || teamMedia.some(shot => isAnimated(shot))) {
    frameRequest = requestAnimationFrame(animate);
  } else {
    paintAll(0);
  }
}

let renderId = 0;
async function render() {
  const id = ++renderId;
  const iconItem = shown('icon'), bannerItem = shown('banner');
  showRequirements();
  let icon, banner;
  const load = item => loadMedia(item).catch(() => { throw item; });
  try {
    [icon, banner] = await Promise.all([
      load(iconItem),
      load(bannerItem),
      document.fonts.load(`900 60px ${FONT}`),
      document.fonts.load(`800 32px ${FONT}`),
    ]);
  } catch (failed) {
    if (id === renderId) alert(`Couldn't load "${failed.name}". Try a PNG, JPG, WebP or GIF file.`);
    return;
  }
  if (id !== renderId) return;

  current = { icon, banner };
  if (!$('download').disabled) $('download').textContent = isAnimated() ? 'Download GIF' : 'Download PNG';
  restartAnimation();
  renderTeam();
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

function save(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function makeGif(width, height, mediaList, paint) {
  const { GIFEncoder, quantize, applyPalette } = await import(GIFENC);
  const animated = mediaList.filter(m => m.duration);
  const duration = Math.min(Math.max(...animated.map(m => m.duration)), 15000);
  const step = Math.max(40, Math.min(...animated.flatMap(m => m.frames.map(frame => frame.delay))));
  const frame = document.createElement('canvas');
  frame.width = width;
  frame.height = height;
  const g = frame.getContext('2d', { willReadFrequently: true });
  const pixels = t => { paint(g, t); return g.getImageData(0, 0, frame.width, frame.height).data; };
  const times = [];
  for (let t = 0; t < duration; t += step) times.push(t);

  const samples = Math.min(times.length, 6);
  const sample = new Uint8ClampedArray(frame.width * frame.height * 4 * samples);
  for (let s = 0; s < samples; s++) {
    sample.set(pixels(times[Math.floor(s * times.length / samples)]), s * frame.width * frame.height * 4);
  }
  const colors = quantize(sample, 255);
  const palette = [...colors, [0, 0, 0]];
  const clear = palette.length - 1;

  const gif = GIFEncoder();
  let previous = null, pending = null;
  const flush = () => gif.writeFrame(pending.index, frame.width, frame.height, {
    palette: pending.first ? palette : undefined,
    delay: pending.delay,
    transparent: true,
    transparentIndex: clear,
    dispose: 1,
  });
  for (const t of times) {
    const data = pixels(t);
    const index = applyPalette(data, colors);
    for (let i = 0; i < index.length; i++) if (data[i * 4 + 3] < 128) index[i] = clear;
    if (!previous) {
      pending = { index, delay: step, first: true };
    } else {
      const changes = index.slice();
      let changed = false;
      for (let i = 0; i < changes.length; i++) {
        if (changes[i] === previous[i]) changes[i] = clear;
        else changed = true;
      }
      if (!changed) {
        pending.delay += step;
        continue;
      }
      flush();
      pending = { index: changes, delay: step };
    }
    previous = index;
    await new Promise(resolve => setTimeout(resolve));
  }
  flush();
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

async function download(button, filename, width, height, shots, paint, label) {
  if (!shots.some(shot => isAnimated(shot))) {
    const still = document.createElement('canvas');
    still.width = width;
    still.height = height;
    paint(still.getContext('2d'), 0);
    return still.toBlob(blob => save(blob, `${filename}.png`));
  }
  button.disabled = true;
  button.textContent = 'Making GIF…';
  try {
    save(await makeGif(width, height, shots.flatMap(shot => [shot.icon, shot.banner]), paint), `${filename}.gif`);
  } catch {
    alert("Couldn't make the GIF. Check your internet connection and try again.");
  } finally {
    button.disabled = false;
    button.textContent = label();
  }
}

$('download').addEventListener('click', () => {
  const shot = current, plate = state;
  download($('download'), `nameplate-${plate.name || 'player'}`, canvas.width, canvas.height, [shot],
    (g, t) => draw(g, t, shot, plate), () => (isAnimated() ? 'Download GIF' : 'Download PNG'));
});

const ROW_GAP = 16;
const teamList = $('plates');
let teamMedia = [];
let teamId = 0;

function teamLabel() {
  return teamMedia.some(shot => isAnimated(shot)) ? 'Download team GIF' : 'Download team PNG';
}

function plateTool(text, label, action, disabled) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.setAttribute('aria-label', label);
  button.dataset.action = action;
  button.disabled = disabled;
  return button;
}

function buildRows() {
  teamList.replaceChildren(...plates.map((plate, i) => {
    const row = document.createElement('li');
    row.className = 'plate-row';
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'plate-pick';
    pick.setAttribute('aria-pressed', i === active);
    pick.setAttribute('aria-label', `Edit nameplate ${i + 1}: ${plate.name}`);
    const preview = document.createElement('canvas');
    preview.width = canvas.width;
    preview.height = canvas.height;
    pick.append(preview);
    pick.addEventListener('click', () => setActive(i));
    const tools = document.createElement('div');
    tools.className = 'plate-tools';
    tools.append(
      plateTool('↑', 'Move up', 'up', i === 0),
      plateTool('↓', 'Move down', 'down', i === plates.length - 1),
      plateTool('Remove', `Remove nameplate ${i + 1}`, 'remove', plates.length === 1),
    );
    tools.addEventListener('click', event => {
      const action = event.target.closest('button')?.dataset.action;
      if (action === 'up') movePlate(i, -1);
      if (action === 'down') movePlate(i, 1);
      if (action === 'remove') removePlate(i);
    });
    row.append(pick, tools);
    return row;
  }));
}

function drawTeam(t) {
  teamList.querySelectorAll('canvas').forEach((preview, i) => {
    if (teamMedia[i]) draw(preview.getContext('2d'), t, teamMedia[i], plates[i]);
  });
}

let rebuildPending = false;

async function renderTeam(rebuild = false) {
  const id = ++teamId;
  rebuildPending ||= rebuild;
  const stacked = plates.length > 1;
  teamList.hidden = !stacked;
  $('download-team').hidden = !stacked;
  $('team-count').textContent = stacked ? `${plates.length} nameplates` : '';
  let loaded;
  try {
    loaded = await Promise.all(plates.map(async plate => ({
      icon: await loadMedia(plate.icon),
      banner: await loadMedia(plate.banner),
    })));
  } catch {
    return;
  }
  if (id !== teamId) return;
  teamMedia = stacked ? loaded : [];
  if (rebuildPending || teamList.children.length !== plates.length) buildRows();
  rebuildPending = false;
  if (!$('download-team').disabled) $('download-team').textContent = teamLabel();
  restartAnimation();
}

function syncControls() {
  playerInput.value = state.name;
  titleSelect.value = state.title.custom ? 'custom' : DATA.titles.indexOf(state.title);
  customInput.value = state.customTitle;
  $('custom-title-label').hidden = !state.title.custom;
  $('rank').value = state.rank;
  $('pluses').value = state.pluses;
  showPhestival();
  for (const column of columns) {
    for (const [item, button] of column.buttons) button.setAttribute('aria-pressed', item === state[column.key]);
  }
}

function setActive(index) {
  active = index;
  state = plates[active];
  for (const key in hover) delete hover[key];
  syncControls();
  render();
  renderTeam(true);
}

function movePlate(i, step) {
  const j = i + step;
  [plates[i], plates[j]] = [plates[j], plates[i]];
  if (active === i) active = j;
  else if (active === j) active = i;
  renderTeam(true).then(() => {
    const button = teamList.children[j]?.querySelector(`[data-action="${step < 0 ? 'up' : 'down'}"]`);
    (button && !button.disabled ? button : teamList.children[j]?.querySelector('.plate-pick'))?.focus();
  });
}

function removePlate(i) {
  plates.splice(i, 1);
  setActive(i < active ? active - 1 : Math.min(active, plates.length - 1));
}

$('add-plate').addEventListener('click', () => {
  plates.splice(active + 1, 0, { ...state });
  setActive(active + 1);
});

$('download-team').addEventListener('click', () => {
  const shots = teamMedia, stack = [...plates];
  const rowHeight = canvas.height + ROW_GAP;
  download($('download-team'), 'team', canvas.width, stack.length * rowHeight - ROW_GAP, shots, (g, t) => {
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);
    stack.forEach((plate, i) => {
      g.save();
      g.translate(0, i * rowHeight);
      paintPlate(g, t, shots[i], plate);
      g.restore();
    });
  }, teamLabel);
});

function hsvToCss(h, s, v) {
  const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return `rgb(${[5, 3, 1].map(n => Math.round(f(n) * 255)).join(', ')})`;
}

function rgbToHsv(r, g, b) {
  [r, g, b] = [r / 255, g / 255, b / 255];
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? (g - b) / d : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, max ? d / max : 0, max];
}

function hexToHsv(hex) {
  return rgbToHsv(...[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)));
}

async function mainColor(item) {
  if (item.color) return item.color;
  const { frames } = await loadMedia(item);
  const size = 64;
  const sample = document.createElement('canvas');
  sample.width = sample.height = size;
  const g = sample.getContext('2d', { willReadFrequently: true });
  g.drawImage(frames[0].image, 0, 0, size, size);
  const data = g.getImageData(0, 0, size, size).data;
  const bands = new Map(), total = [0, 0, 0];
  let count = 0, colorful = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const rgb = [data[i], data[i + 1], data[i + 2]];
    rgb.forEach((c, k) => { total[k] += c; });
    count++;
    const [h, s, v] = rgbToHsv(...rgb);
    if (s < 0.25 || v < 0.2) continue;
    const weight = s * v, band = Math.floor(h / 15) % 24;
    colorful += weight;
    const sums = bands.get(band) || [0, 0, 0, 0];
    sums[0] += weight;
    rgb.forEach((c, k) => { sums[k + 1] += c * weight; });
    bands.set(band, sums);
  }
  let rgb = total.map(c => c / Math.max(count, 1));
  if (colorful > 0 && colorful >= 0.01 * count) {
    const near = band => [-1, 0, 1].map(d => bands.get((band + d + 24) % 24)).filter(Boolean);
    const weightOf = band => near(band).reduce((sum, b) => sum + b[0], 0);
    const best = near([...bands.keys()].reduce((a, b) => (weightOf(b) > weightOf(a) ? b : a)));
    const weight = best.reduce((sum, b) => sum + b[0], 0);
    rgb = [1, 2, 3].map(k => best.reduce((sum, b) => sum + b[k], 0) / weight);
  }
  item.color = `#${rgb.map(c => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
  return item.color;
}

function cone([h, s, v]) {
  const angle = h * Math.PI / 180;
  return [s * v * Math.cos(angle), s * v * Math.sin(angle), v];
}

const clamp = x => Math.min(1, Math.max(0, x));

function hsvPalette(root, label, onPick, matchLabel, matchColor) {
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
  const match = document.createElement('button');
  match.type = 'button';
  match.textContent = matchLabel;
  match.addEventListener('click', async () => {
    [h, s, v] = hexToHsv(await matchColor());
    hue.value = h;
    pick();
  });
  const row = document.createElement('div');
  row.className = 'hue-row';
  row.append(hue, swatch, match);
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
  const other = key === 'icon' ? 'banner' : 'icon';
  column.palette = hsvPalette(element.querySelector('.hsv'), `${key[0].toUpperCase()}${key.slice(1)} color`,
    hsv => pickColor(column, hsv), `Match ${other}`, () => mainColor(state[other]));
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
        type: file.type,
        requirement: column.key === 'banner'
          ? 'Custom banner.'
          : `Your own image. Imported ${column.noun} only show up here, not in the game.`,
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

playerInput.addEventListener('input', () => { state.name = playerInput.value; render(); });
buildTitles();
showPhestival();
render();
