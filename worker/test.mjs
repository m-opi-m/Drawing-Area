import assert from 'assert';
const URL_ = process.argv[2] || 'ws://localhost:3555/ws', wait = ms => new Promise(r => setTimeout(r, ms));
function client(code, create, name) {
  const c = { ev: [], st: null, id: '', opts: [], word: '', err: '' };
  c.ws = new WebSocket(`${URL_}?room=${code}&name=${name}&lang=en&create=${create ? 1 : 0}`);
  c.ws.onmessage = e => { const { e: ev, d } = JSON.parse(e.data); c.ev.push([ev, d]);
    if (ev === 'room:state') c.st = d; if (ev === 'hello') c.id = d; if (ev === 'word:options') c.opts = d; if (ev === 'word:secret') c.word = d; if (ev === 'error:msg') c.err = d; };
  c.send = (e, d) => c.ws.send(JSON.stringify({ e, d })); return c;
}
const code = 'T' + Math.random().toString(36).slice(2, 5).toUpperCase();
const a = client(code, true, 'A'); await wait(2500);
assert.equal(a.st.phase, 'LOBBY');
const dup = client(code, true, 'Z'); await wait(300); assert.equal(dup.err, 'exists');
const ghost = client('ZZZZ', false, 'G'); await wait(300); assert.equal(ghost.err, 'not_found');
const b = client(code, false, 'B'); await wait(500);
const c3 = client(code, false, 'C'); await wait(300); assert.equal(c3.err, 'full', '3rd player refused');
assert.equal(a.st.players.length, 2); assert.equal(a.st.phase, 'WORD_SELECTION', 'auto-start');
const dr = a.st.drawerId === a.id ? a : b, gu = dr === a ? b : a;
assert.ok(dr.opts.length === 3 && gu.opts.length === 0, 'options only to drawer');
gu.send('word:choose', dr.opts[0]); await wait(150); assert.equal(a.st.phase, 'WORD_SELECTION', 'guesser cannot choose');
dr.send('word:choose', dr.opts[0]); await wait(300); assert.equal(a.st.phase, 'DRAWING'); assert.ok(dr.word && !gu.word, 'secret only to drawer');
assert.ok(!JSON.stringify(gu.ev).includes(dr.word), 'word leaked to guesser');
dr.send('stroke', { id: 's2', color: '#000', size: 4, points: [[1, 2]] }); gu.send('stroke', { id: 'bad', color: '#f00', size: 4, points: [[0, 0]] }); await wait(200);
assert.equal(gu.ev.filter(([e, d]) => e === 'stroke' && d.id === 's2').length, 1); assert.equal(dr.ev.filter(([e]) => e === 'stroke').length, 0);
gu.send('guess', 'wrong'); gu.send('guess', dr.word.toUpperCase()); await wait(100); gu.send('guess', dr.word); await wait(300);
assert.equal(a.st.phase, 'ROUND_END'); const sg = a.st.players.find(p => p.id === gu.id).score, sd = a.st.players.find(p => p.id === dr.id).score;
assert.ok(sg >= 100 && sg <= 150, 'score ' + sg); assert.equal(sd, 30, 'no duplicate scoring');
const late = gu.ev.filter(([e]) => e === 'round:end').length; assert.equal(late, 1);
console.log('ALL CLOUDFLARE WORKER TESTS PASSED'); process.exit(0);
