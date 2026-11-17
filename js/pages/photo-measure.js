import { $, toast } from '../layout.js';
import { fmt } from '../stats.js';
import * as store from '../store.js';

const CARD_MM = 85.6; // ISO/IEC 7810 ID-1 long edge
const canvas = $('#canvas');
const ctx = canvas.getContext('2d');
const COLORS = ['#e0712c', '#2f80ed'];
const LABELS = ['Card edge', 'Length'];

let image = null;
let lines = [];
let drawing = null;
let lengthCm = null;

function instruction() {
  const text = !image ? '' : lines.length === 0 ? 'Step 2 · Drag along the long edge of the card'
    : lines.length === 1 ? 'Step 3 · Drag from the base (pubic bone) to the tip' : 'Done · Redraw with “Undo” if needed';
  $('#instruction').textContent = text;
  $('#undo-btn').disabled = !lines.length;
  $('#reset-btn').disabled = !image;
}

function lineWidth() { return Math.max(2, canvas.width / 300); }

function draw() {
  if (!image) return;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const all = drawing ? [...lines, drawing] : lines;
  all.forEach((l, i) => {
    ctx.strokeStyle = COLORS[i];
    ctx.fillStyle = COLORS[i];
    ctx.lineWidth = lineWidth();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
    for (const [x, y] of [[l.x1, l.y1], [l.x2, l.y2]]) { ctx.beginPath(); ctx.arc(x, y, lineWidth() * 2.2, 0, Math.PI * 2); ctx.fill(); }
    const fs = Math.max(14, canvas.width / 45);
    ctx.font = `700 ${fs}px system-ui, sans-serif`;
    const tx = (l.x1 + l.x2) / 2 + fs * 0.6;
    const ty = (l.y1 + l.y2) / 2;
    ctx.lineWidth = fs / 5; ctx.strokeStyle = 'rgba(0,0,0,.65)';
    ctx.strokeText(LABELS[i], tx, ty); ctx.fillText(LABELS[i], tx, ty);
  });
}

const len = (l) => Math.hypot(l.x2 - l.x1, l.y2 - l.y1);

function compute() {
  const result = $('#result');
  if (lines.length < 2) { result.classList.add('hidden'); lengthCm = null; return; }
  const mmPerPx = CARD_MM / len(lines[0]);
  lengthCm = (len(lines[1]) * mmPerPx) / 10;
  const unit = store.load().unit;
  $('#result-value').textContent = fmt(lengthCm, unit);
  result.classList.remove('hidden');
}

function pos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
}

canvas.addEventListener('pointerdown', (e) => {
  if (!image || lines.length >= 2) return;
  canvas.setPointerCapture(e.pointerId);
  const p = pos(e);
  drawing = { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
});
canvas.addEventListener('pointermove', (e) => {
  if (!drawing) return;
  const p = pos(e);
  drawing.x2 = p.x; drawing.y2 = p.y;
  draw();
});
canvas.addEventListener('pointerup', () => {
  if (!drawing) return;
  if (len(drawing) > canvas.width / 50) lines.push(drawing);
  drawing = null;
  draw(); compute(); instruction();
});
canvas.addEventListener('pointercancel', () => { drawing = null; draw(); });

$('#file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    image = bitmap;
    lines = [];
    $('#work').classList.remove('hidden');
    draw(); compute(); instruction();
    $('#work').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    console.error(err);
    toast('Could not open that image');
  }
  e.target.value = '';
});

$('#undo-btn').addEventListener('click', () => { lines.pop(); draw(); compute(); instruction(); });
$('#reset-btn').addEventListener('click', () => {
  image = null; lines = [];
  $('#work').classList.add('hidden');
  compute(); instruction();
});

function use(metric) {
  if (!lengthCm) return;
  const state = store.load();
  store.update({ measurements: { ...state.measurements, [metric]: Math.round(lengthCm * 10) / 10 } });
  toast('Saved — opening the calculator');
  setTimeout(() => { location.href = 'index.html'; }, 600);
}
$('#use-length').addEventListener('click', () => use('erectLength'));
$('#use-flaccid').addEventListener('click', () => use('flaccidLength'));

instruction();
