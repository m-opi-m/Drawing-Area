import { normalize } from './normalize';
const WORDS: Record<string, string[]> = {
  ar: ['قطة','أسد','تفاحة','مدرسة','طائرة','بيتزا','قمر','دراجة','شجرة','كمبيوتر','ساعة','موزة'],
  en: ['cat','lion','apple','school','airplane','pizza','moon','bicycle','tree','computer','clock','banana'],
};
type Phase = 'LOBBY' | 'WORD_SELECTION' | 'DRAWING' | 'ROUND_END' | 'MATCH_END';
interface P { id: string; name: string; score: number; guessed: boolean; ws: WebSocket; hits: number[] }

export default {
  async fetch(req: Request, env: any) {
    const u = new URL(req.url);
    if (u.pathname !== '/ws') return new Response('Not found', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected websocket', { status: 426 });
    const code = (u.searchParams.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (code.length !== 4) return new Response('Bad room', { status: 400 });
    return env.ROOM.get(env.ROOM.idFromName(code)).fetch(req);
  },
};

export class Room {
  inited = false; id = ''; hostId = ''; phase: Phase = 'LOBBY'; players = new Map<string, P>(); order: string[] = []; turn = 0;
  rounds = 2; drawTime = 60; lang = 'en'; options: string[] = []; word = ''; strokes: any[] = []; seq = 0; endsAt = 0; timer: any; used = new Set<string>();
  constructor(public state: any, public env: any) {}

  drawer() { return this.order[this.turn % Math.max(this.order.length, 1)]; }
  to(id: string, e: string, d?: any) { try { this.players.get(id)?.ws.send(JSON.stringify({ e, d })); } catch {} }
  all(e: string, d?: any) { for (const id of this.players.keys()) this.to(id, e, d); }
  sync() { this.all('room:state', { id: this.id, phase: this.phase, hostId: this.hostId, round: Math.floor(this.turn / Math.max(this.order.length, 1)) + 1,
    rounds: this.rounds, drawerId: this.order.length ? this.drawer() : null, endsAt: this.endsAt,
    hint: this.phase === 'DRAWING' ? this.word.replace(/[^\s]/gu, '_').split('').join(' ') : '',
    players: [...this.players.values()].map(({ id, name, score, guessed }) => ({ id, name, score, guessed })) }); }
  later(ms: number, fn: () => void) { clearTimeout(this.timer); this.endsAt = Date.now() + ms; this.timer = setTimeout(fn, ms); }

  startTurn() {
    while (this.turn < this.rounds * this.order.length && !this.players.has(this.drawer())) this.turn++;
    if (this.turn >= this.rounds * this.order.length || this.players.size < 2) return this.endMatch();
    this.players.forEach(p => (p.guessed = false)); this.strokes = []; this.seq = 0; this.word = '';
    const pool = WORDS[this.lang].filter(w => !this.used.has(w)); const src = pool.length >= 3 ? pool : WORDS[this.lang];
    this.options = [...src].sort(() => Math.random() - 0.5).slice(0, 3);
    this.phase = 'WORD_SELECTION'; this.all('canvas:clear'); this.to(this.drawer(), 'word:options', this.options); this.sync();
    this.later(15000, () => this.choose(this.options[0]));
  }
  choose(w: string) {
    if (this.phase !== 'WORD_SELECTION' || !this.options.includes(w)) return;
    this.word = w; this.used.add(w); this.phase = 'DRAWING';
    this.to(this.drawer(), 'word:secret', w);               // ONLY the drawer ever receives the word
    this.sync(); this.later(this.drawTime * 1000, () => this.endTurn());
  }
  endTurn() {
    if (this.phase !== 'DRAWING') return;
    this.phase = 'ROUND_END'; this.all('round:end', { word: this.word }); this.sync();
    this.later(5000, () => { this.turn++; this.startTurn(); });
  }
  endMatch() {
    clearTimeout(this.timer); this.phase = 'MATCH_END';
    this.all('match:end', [...this.players.values()].map(({ id, name, score }) => ({ id, name, score })).sort((a, b) => b.score - a.score)); this.sync();
  }
  leave(id: string) {
    if (!this.players.delete(id)) return;
    if (this.players.size === 0) { clearTimeout(this.timer); this.inited = false; return; }
    if (this.hostId === id) this.hostId = this.players.keys().next().value!;
    if (this.phase === 'DRAWING' || this.phase === 'WORD_SELECTION') this.endMatch();   // 2-player game: opponent left
    this.sync();
  }

  async fetch(req: Request) {
    const u = new URL(req.url), q = u.searchParams;
    const pair = new WebSocketPair(); const [client, server] = Object.values(pair) as WebSocket[]; server.accept();
    const done = () => new Response(null, { status: 101, webSocket: client } as any);
    const fail = (m: string) => { server.send(JSON.stringify({ e: 'error:msg', d: m })); server.close(1000, m); return done(); };
    const create = q.get('create') === '1';
    if (create) {
      if (this.inited) return fail('exists');
      this.inited = true; this.id = (q.get('room') || '').toUpperCase().slice(0, 4); this.phase = 'LOBBY'; this.players.clear(); this.order = []; this.turn = 0; this.used.clear(); this.strokes = [];
      this.lang = q.get('lang') === 'ar' ? 'ar' : 'en'; this.rounds = Math.min(Math.max(+q.get('rounds')! || 2, 1), 10); this.drawTime = Math.min(Math.max(+q.get('drawTime')! || 60, 10), 180);
    } else {
      if (!this.inited) return fail('not_found');
      if (this.players.size >= 2) return fail('full');
      if (this.phase !== 'LOBBY') return fail('started');
    }
    const id = crypto.randomUUID().slice(0, 8); let hits: number[] = [];
    const limited = (max: number) => { const t = Date.now(); hits = hits.filter(h => t - h < 1000); hits.push(t); return hits.length > max; };
    const name = (q.get('name') || '').trim().slice(0, 20) || 'Player';
    this.players.set(id, { id, name, score: 0, guessed: false, ws: server, hits });
    if (create) this.hostId = id;
    this.to(id, 'hello', id); this.to(id, 'canvas:snapshot', this.strokes); this.sync();
    if (this.players.size === 2) { this.order = [...this.players.keys()]; this.turn = 0; this.startTurn(); }   // auto-start with 2 players

    server.addEventListener('message', (ev: MessageEvent) => {
      if (typeof ev.data !== 'string' || ev.data.length > 20000) return;
      let m: any; try { m = JSON.parse(ev.data); } catch { return; }
      const p = this.players.get(id); if (!p) return; const d = m.d;
      if (m.e === 'word:choose') { if (this.drawer() === id) this.choose(String(d)); }
      else if (m.e === 'stroke') {
        if (this.phase !== 'DRAWING' || this.drawer() !== id || limited(60)) return;
        if (!Array.isArray(d?.points) || d.points.length > 200 || this.strokes.length > 5000) return;
        const s = { seq: ++this.seq, id: String(d.id).slice(0, 40), color: String(d.color).slice(0, 9), size: Math.min(+d.size || 4, 60), erase: !!d.erase,
          points: d.points.map((pt: any) => [+pt[0] || 0, +pt[1] || 0]) };
        this.strokes.push(s); for (const o of this.players.keys()) if (o !== id) this.to(o, 'stroke', s);
      } else if (m.e === 'guess') {
        if (limited(5)) return; const text = String(d ?? '').slice(0, 100); if (!text.trim()) return;
        if (this.phase !== 'DRAWING' || this.drawer() === id || p.guessed) {
          const msg = { from: p.name, text };
          if (this.phase !== 'DRAWING') return this.all('chat', msg);
          for (const q2 of this.players.values()) if (q2.guessed || q2.id === this.drawer()) this.to(q2.id, 'chat', msg);   // never leak the word
          return;
        }
        if (normalize(text) === normalize(this.word)) {         // server-authoritative validation
          p.guessed = true; const left = Math.max(0, this.endsAt - Date.now()) / (this.drawTime * 1000);
          p.score += Math.round(50 + 100 * left); const dr = this.players.get(this.drawer()); if (dr) dr.score += 30;
          this.all('chat', { system: true, key: 'guessed', name: p.name }); this.sync();
          if ([...this.players.values()].every(x => x.guessed || x.id === this.drawer())) this.endTurn();
        } else this.all('chat', { from: p.name, text });
      }
    });
    server.addEventListener('close', () => this.leave(id));
    server.addEventListener('error', () => this.leave(id));
    return done();
  }
}
