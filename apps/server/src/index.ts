import express from 'express'; import http from 'http'; import path from 'path';
import { Server, Socket } from 'socket.io'; import { normalize } from './normalize';

const WORDS: Record<string, string[]> = {
  ar: ['قطة','أسد','تفاحة','مدرسة','طائرة','بيتزا','قمر','دراجة','شجرة','كمبيوتر','ساعة','موزة'],
  en: ['cat','lion','apple','school','airplane','pizza','moon','bicycle','tree','computer','clock','banana'],
};
type Phase = 'LOBBY'|'WORD_SELECTION'|'DRAWING'|'ROUND_END'|'MATCH_END';
interface P { id: string; name: string; score: number; guessed: boolean }
interface Room { id: string; hostId: string; phase: Phase; players: Map<string,P>; order: string[]; turn: number;
  rounds: number; drawTime: number; lang: string; options: string[]; word: string; strokes: any[]; seq: number;
  endsAt: number; timer?: NodeJS.Timeout; used: Set<string> }
const rooms = new Map<string, Room>();
const app = express(); app.use(express.static(path.join(__dirname, '../../web')));
app.get('/health', (_q, res) => res.send('ok'));
const srv = http.createServer(app); const io = new Server(srv, { cors: { origin: '*' } });

const pub = (r: Room) => ({ id: r.id, phase: r.phase, hostId: r.hostId, round: Math.floor(r.turn / Math.max(r.order.length,1)) + 1,
  rounds: r.rounds, drawerId: r.order[r.turn % Math.max(r.order.length,1)] ?? null, endsAt: r.endsAt,
  hint: r.phase === 'DRAWING' ? r.word.replace(/[^\s]/gu, '_').split('').join(' ') : '',
  players: [...r.players.values()] });
const sync = (r: Room) => io.to(r.id).emit('room:state', pub(r));
const drawer = (r: Room) => r.order[r.turn % r.order.length];
const later = (r: Room, ms: number, fn: () => void) => { clearTimeout(r.timer); r.endsAt = Date.now() + ms; r.timer = setTimeout(fn, ms); };

function startTurn(r: Room) {
  // skip drawers who left
  while (r.turn < r.rounds * r.order.length && !r.players.has(drawer(r))) r.turn++;
  if (r.turn >= r.rounds * r.order.length || r.players.size < 2) return endMatch(r);
  r.players.forEach(p => (p.guessed = false)); r.strokes = []; r.seq = 0; r.word = '';
  const pool = WORDS[r.lang].filter(w => !r.used.has(w)); const src = pool.length >= 3 ? pool : WORDS[r.lang];
  r.options = [...src].sort(() => Math.random() - 0.5).slice(0, 3);
  r.phase = 'WORD_SELECTION'; io.to(r.id).emit('canvas:clear');
  io.to(drawer(r)).emit('word:options', r.options); sync(r);
  later(r, 15000, () => chooseWord(r, r.options[0]));
}
function chooseWord(r: Room, w: string) {
  if (r.phase !== 'WORD_SELECTION' || !r.options.includes(w)) return;
  r.word = w; r.used.add(w); r.phase = 'DRAWING';
  io.to(drawer(r)).emit('word:secret', w);        // ONLY the drawer ever receives the word
  sync(r); later(r, r.drawTime * 1000, () => endTurn(r));
}
function endTurn(r: Room) {
  if (r.phase !== 'DRAWING') return;
  r.phase = 'ROUND_END'; io.to(r.id).emit('round:end', { word: r.word }); sync(r);
  later(r, 5000, () => { r.turn++; startTurn(r); });
}
function endMatch(r: Room) {
  clearTimeout(r.timer); r.phase = 'MATCH_END';
  io.to(r.id).emit('match:end', [...r.players.values()].sort((a, b) => b.score - a.score)); sync(r);
}
function leave(s: Socket) {
  for (const r of rooms.values()) if (r.players.delete(s.id)) {
    s.leave(r.id);
    if (r.players.size === 0) { clearTimeout(r.timer); rooms.delete(r.id); continue; }
    if (r.hostId === s.id) r.hostId = r.players.keys().next().value!;      // host migration
    if (r.phase === 'DRAWING' || r.phase === 'WORD_SELECTION') {
      if (r.players.size < 2) endMatch(r);
      else if (!r.players.has(drawer(r))) { r.phase = 'DRAWING'; r.word ||= '-'; endTurn(r); }
    }
    sync(r);
  }
}
const clean = (n: any) => String(n ?? '').trim().slice(0, 20) || 'Player';

io.on('connection', (s) => {
  let hits: number[] = [];
  const limited = (max: number, ms = 1000) => { const t = Date.now(); hits = hits.filter(h => t - h < ms); hits.push(t); return hits.length > max; };
  const room = () => [...rooms.values()].find(r => r.players.has(s.id));
  const join = (r: Room, name: string) => { r.players.set(s.id, { id: s.id, name: clean(name), score: 0, guessed: false }); s.join(r.id);
    s.emit('canvas:snapshot', r.strokes); sync(r); };

  s.on('room:create', (d: any) => { const id = Math.random().toString(36).slice(2, 6).toUpperCase();
    const r: Room = { id, hostId: s.id, phase: 'LOBBY', players: new Map(), order: [], turn: 0, lang: d?.lang === 'ar' ? 'ar' : 'en',
      rounds: Math.min(Math.max(+d?.rounds || 2, 1), 10), drawTime: Math.min(Math.max(+d?.drawTime || 60, 10), 180),
      options: [], word: '', strokes: [], seq: 0, endsAt: 0, used: new Set() };
    rooms.set(id, r); join(r, d?.name); });
  s.on('room:join', (d: any) => { const r = rooms.get(String(d?.roomId).toUpperCase());
    if (!r) return s.emit('error:msg', 'not_found'); if (r.players.size >= 2) return s.emit('error:msg', 'full');
    if (r.phase !== 'LOBBY') return s.emit('error:msg', 'started'); join(r, d?.name);
    r.order = [...r.players.keys()]; r.turn = 0; startTurn(r); });   // 2 players: start automatically
  s.on('game:start', () => { const r = room(); if (!r || r.hostId !== s.id || r.phase !== 'LOBBY' || r.players.size < 2) return;
    r.order = [...r.players.keys()]; r.turn = 0; startTurn(r); });
  s.on('word:choose', (w: string) => { const r = room(); if (r && drawer(r) === s.id) chooseWord(r, w); });
  s.on('stroke', (d: any) => { const r = room(); if (!r || r.phase !== 'DRAWING' || drawer(r) !== s.id || limited(60)) return;
    if (!Array.isArray(d?.points) || d.points.length > 200 || r.strokes.length > 5000) return;
    const ev = { seq: ++r.seq, id: String(d.id).slice(0, 40), color: String(d.color).slice(0, 9), size: Math.min(+d.size || 4, 60),
      erase: !!d.erase, points: d.points.map((p: any) => [+p[0] || 0, +p[1] || 0]) };
    r.strokes.push(ev); s.to(r.id).emit('stroke', ev); });
  s.on('guess', (text: string) => { const r = room(); const p = r?.players.get(s.id); if (!r || !p || limited(5)) return;
    text = String(text ?? '').slice(0, 100);
    if (r.phase !== 'DRAWING' || drawer(r) === s.id || p.guessed) {
      const msg = { from: p.name, text };
      if (r.phase !== 'DRAWING') return void io.to(r.id).emit('chat', msg);
      // during drawing, drawer/guessed players chat privately among themselves (prevents leaking the word)
      for (const q of r.players.values()) if (q.guessed || q.id === drawer(r)) io.to(q.id).emit('chat', msg);
      return;
    }
    if (normalize(text) === normalize(r.word)) {                         // server-authoritative validation
      p.guessed = true; const left = Math.max(0, r.endsAt - Date.now()) / (r.drawTime * 1000);
      p.score += Math.round(50 + 100 * left); const d = r.players.get(drawer(r)); if (d) d.score += 30;
      io.to(r.id).emit('chat', { system: true, key: 'guessed', name: p.name }); sync(r);
      if ([...r.players.values()].every(x => x.guessed || x.id === drawer(r))) endTurn(r);
    } else io.to(r.id).emit('chat', { from: p.name, text });
  });
  s.on('disconnect', () => leave(s));
});
export { srv, rooms };
if (require.main === module) srv.listen(+(process.env.PORT || 3000), () => console.log('Draw Arena running'));
