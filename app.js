/* Percorso a casa · Coaching by Morgana */
const SB_URL = 'https://rqzfgzdqmbnsmkopebch.supabase.co';
const SB_KEY = 'sb_publishable__iUILNyZ_w2-NEbSgkvn2Q_7x30-FtD';
const sb = supabase.createClient(SB_URL, SB_KEY);
const D = window.PC_DATA;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const IC = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  cam: '<rect x="3" y="6" width="14" height="12" rx="2"/><path d="M17 10l4-2v8l-4-2"/>',
  up: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M17 11a3 3 0 100-6"/>',
  play: '<path d="M7 5l12 7-12 7z"/>',
  ok: '<path d="M5 12l4 4 10-10"/>',
};
const ic = (n, st = '') => `<svg class="i" viewBox="0 0 24 24" style="${st}">${IC[n]}</svg>`;
const S = { user: null, prof: null, done: new Set(), cps: [], videos: {}, tab: 'oggi', seen: new Set() };
const TOTAL = 84;
const toast = (m) => { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 3500); };
try { S.seen = new Set(JSON.parse(localStorage.getItem('pc-seen') || '[]')); } catch (e) {}
const saveSeen = () => { try { localStorage.setItem('pc-seen', JSON.stringify([...S.seen])); } catch (e) {} };

/* ---------- avvio ---------- */
async function boot() {
  const { data } = await sb.auth.getSession();
  S.user = data.session?.user || null;
  sb.auth.onAuthStateChange((_e, s) => { const u = s?.user || null; if ((u?.id) !== (S.user?.id)) { S.user = u; load(); } });
  await load();
}
async function load() {
  if (!S.user) return render();
  const { data: p } = await sb.from('pc_profiles').select('*').eq('user_id', S.user.id).maybeSingle();
  S.prof = p;
  if (p && (p.attiva || p.is_admin)) {
    const [pr, cp, vd] = await Promise.all([
      sb.from('pc_progressi').select('settimana,giorno'),
      sb.from('pc_checkpoint').select('*').order('creato_il'),
      sb.from('pc_videos').select('*').order('ordine'),
    ]);
    S.done = new Set((pr.data || []).map((r) => (r.settimana - 1) * 7 + r.giorno));
    S.cps = cp.data || [];
    S.videos = Object.fromEntries((vd.data || []).map((v) => [v.slot, v]));
  }
  render();
}

/* ---------- logica percorso ---------- */
const dayOf = (g) => D.cal.find((c) => c.g === g);
const nextG = () => { for (let g = 1; g <= TOTAL; g++) if (!S.done.has(g)) return g; return null; };
function pendingCheckpoint() {
  for (let b = 1; b <= 3; b++) {
    let all = true;
    for (let g = (b - 1) * 28 + 1; g <= b * 28; g++) if (!S.done.has(g)) all = false;
    if (all && !S.cps.some((c) => c.blocco === b && c.scelta === 'avanti')) return b;
  }
  return null;
}
async function markDone(g) {
  const w = Math.ceil(g / 7), d = ((g - 1) % 7) + 1;
  const { error } = await sb.from('pc_progressi').upsert({ user_id: S.user.id, settimana: w, giorno: d });
  if (error) return toast('Non sono riuscita a salvare. Riprova tra poco.');
  S.done.add(g);
}
const BLOCKS = ['Fondamenta', 'Costruzione', 'Rinforzo'];

/* ---------- viste ---------- */
function render() {
  const app = $('#app');
  if (!S.user) return (app.innerHTML = authView(), bindAuth());
  if (!S.prof) return (app.innerHTML = `<div class="shell"><div class="page"><h2>Un attimo…</h2><p class="muted">Sto preparando il tuo spazio ✨</p><button class="btn" id="out">Esci</button></div></div>`, $('#out').onclick = () => sb.auth.signOut());
  if (!S.prof.attiva && !S.prof.is_admin) return (app.innerHTML = waitView(), $('#out').onclick = () => sb.auth.signOut());
  const adm = S.prof.is_admin;
  const tabs = [['oggi', 'sun', 'Oggi'], ['cal', 'cal', 'Calendario'], ['lez', 'cam', 'Lezione']];
  if (adm) tabs.push(['video', 'up', 'Video'], ['clienti', 'users', 'Clienti']);
  app.innerHTML = `<div class="app-wrap"><div class="shell"><div class="page" id="page"></div></div>
  <nav class="tabs"><div>${tabs.map((t) => `<button data-t="${t[0]}" class="${S.tab === t[0] ? 'on' : ''}">${ic(t[1])}${t[2]}</button>`).join('')}</div></nav></div>`;
  app.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => { S.tab = b.dataset.t; render(); }));
  ({ oggi: viewOggi, cal: viewCal, lez: viewLez, video: viewVideo, clienti: viewClienti }[S.tab])($('#page'));
}

function authView() {
  return `<div class="shell"><div class="page" style="justify-content:center">
  <div><div class="eyebrow">Coaching by Morgana</div><h1 style="font-size:32px;margin-top:4px">Percorso a casa</h1>
  <p class="muted">12 settimane per muoverti meglio, un passo alla volta ✨</p></div>
  <div class="card"><div id="nomeBox" hidden><label for="nome">Il tuo nome</label><input id="nome" autocomplete="name"></div>
  <label for="email">Email</label><input id="email" type="email" autocomplete="email">
  <label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password">
  <div class="err" id="aerr"></div>
  <button class="btn big" id="go">Entra</button>
  <p style="text-align:center;margin:12px 0 0"><button class="btn s" id="sw" style="border:0">Non hai un account? Registrati</button></p></div></div></div>`;
}
function bindAuth() {
  let reg = false;
  $('#sw').onclick = () => { reg = !reg; $('#nomeBox').hidden = !reg; $('#go').textContent = reg ? 'Crea account' : 'Entra'; $('#sw').textContent = reg ? 'Hai già un account? Entra' : 'Non hai un account? Registrati'; };
  $('#go').onclick = async () => {
    const email = $('#email').value.trim(), password = $('#pw').value; $('#aerr').textContent = '';
    if (!email || password.length < 6) return ($('#aerr').textContent = 'Inserisci email e una password di almeno 6 caratteri.');
    $('#go').disabled = true;
    const r = reg ? await sb.auth.signUp({ email, password, options: { data: { nome: $('#nome').value.trim(), email } } }) : await sb.auth.signInWithPassword({ email, password });
    $('#go').disabled = false;
    if (r.error) return ($('#aerr').textContent = r.error.message.includes('Invalid login') ? 'Email o password non corrette.' : r.error.message);
    if (reg && !r.data.session) $('#aerr').textContent = 'Controlla la tua email per confermare l’account, poi entra.';
  };
}
function waitView() {
  return `<div class="shell"><div class="page" style="justify-content:center;text-align:center">
  <h2 style="font-size:28px">Ci sei quasi ✨</h2>
  <p>Ciao ${esc(S.prof.nome || '')}! Il tuo account è creato. Appena Morgana attiva il tuo accesso potrai iniziare il percorso 💪🏻</p>
  <p class="muted">Se hai già pagato, scrivile pure: ci pensa lei.</p>
  <div><button class="btn" id="out">Esci</button></div></div></div>`;
}

function sessionList(day, wb) {
  const s = D.sessions[day.sid]; if (!s) return '';
  let last = '', h = '';
  s.ex.forEach((e) => {
    if (e.f !== last) { h += `<div class="phase">${esc(e.f)}</div>`; last = e.f; }
    const n = e.s[wb - 1];
    h += `<div class="row"><span class="n">${esc(e.n)}</span><em>${n} ${n === 1 ? 'serie' : 'serie'}</em></div>`;
  });
  return h;
}

function viewOggi(el) {
  const cp = pendingCheckpoint();
  if (cp) return viewCheckpoint(el, cp);
  const g = nextG();
  if (!g) return (el.innerHTML = `<div class="card" style="text-align:center"><h2 style="font-size:28px">Hai finito il percorso! ✨</h2><p>Dodici settimane portate a termine. Sono fierissima di te 🫶🏻🔥</p></div>`);
  const day = dayOf(g), doneCount = S.done.size;
  const kind = day.t === 'Riposo' ? 'riposo' : day.t === 'Mobilità' ? 'mob' : 'all';
  el.innerHTML = `<div><div class="eyebrow">Settimana ${day.w} · Blocco ${day.b} ${BLOCKS[day.b - 1]} · ${esc(day.dow)}</div>
  <h1 style="font-size:28px;margin-top:4px">Oggi: ${kind === 'riposo' ? 'giorno di riposo' : esc(day.sn)}</h1></div>
  <div class="prog"><i style="width:${(doneCount / TOTAL) * 100}%"></i></div><div class="muted" style="font-size:12px;margin-top:-8px">${doneCount} giorni su ${TOTAL}</div>
  ${kind === 'riposo' ? `<div class="card"><p style="margin:0 0 10px">${esc(day.note || 'Oggi riposi. Se ti va, fai una camminata libera.')} 🧘🏻‍♀️</p><button class="btn big" id="rest">Segna come fatto</button></div>`
    : `<div class="chips"><span class="chip">${day.min} minuti circa</span><span class="chip">${kind === 'mob' ? 'Mobilità' : 'Allenamento'}</span><span class="chip">Tappetino</span></div>
  <div class="card">${sessionList(day, day.wb)}</div>
  <button class="btn big" id="start">${ic('play')} Inizia</button>
  <p class="muted" style="font-size:12px;text-align:center;margin:0">Metti il telefono in orizzontale, a distanza. Dopo il primo tocco va avanti da solo. Se senti dolore, fermati.</p>`}`;
  if (kind === 'riposo') $('#rest').onclick = async () => { await markDone(g); toast('Riposo segnato 🫶🏻'); render(); };
  else $('#start').onclick = () => startPlayer(day);
}

function viewCheckpoint(el, b) {
  const st = { f: 0, d: 0, s: 0 };
  const scale = (k, lab, hint) => `<label>${lab}</label><div class="scale" data-k="${k}">${[1, 2, 3, 4, 5].map((n) => `<button data-v="${n}">${n}</button>`).join('')}</div><div class="muted" style="font-size:12px">${hint}</div>`;
  el.innerHTML = `<div><div class="eyebrow">Fine blocco ${b}</div><h1 style="font-size:28px;margin-top:4px">Come stai? ✨</h1></div>
  <div class="card"><p style="margin:0">Sei arrivata alla fine del blocco «${BLOCKS[b - 1]}». Rispondi con sincerità: nessuna risposta è sbagliata.</p>
  ${scale('f', 'Fatica', '1 = leggera · 5 = tantissima')}${scale('d', 'Dolori', '1 = nessuno · 5 = forti')}${scale('s', 'Sicurezza nei movimenti', '1 = poca · 5 = tanta')}
  <div id="sug" class="muted" style="margin-top:12px;font-size:13px"></div>
  <div style="display:grid;gap:8px;margin-top:14px"><button class="btn big" id="av" disabled>Vado avanti 💪🏻</button><button class="btn" id="ri" disabled>Ripeto il blocco</button></div></div>
  <button class="btn s" id="vid" style="align-self:flex-start">${ic('play')} Guarda il messaggio di Morgana</button>`;
  const upd = () => {
    const ok = st.f && st.d && st.s; $('#av').disabled = $('#ri').disabled = !ok;
    $('#sug').textContent = ok ? ((st.d >= 4 || st.s <= 2) ? 'Con questi valori ti consiglio di ripetere il blocco: nessuna fretta, è il modo giusto per stare bene 🫶🏻' : 'Mi sembra che tu sia pronta per andare avanti ✨') : '';
  };
  el.querySelectorAll('.scale').forEach((sc) => sc.querySelectorAll('button').forEach((bt) => (bt.onclick = () => { st[sc.dataset.k] = +bt.dataset.v; sc.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === bt)); upd(); })));
  const save = async (scelta) => {
    const { error } = await sb.from('pc_checkpoint').insert({ user_id: S.user.id, blocco: b, fatica: st.f, dolori: st.d, sicurezza: st.s, scelta });
    if (error) return toast('Non sono riuscita a salvare. Riprova.');
    if (scelta === 'ripeti') {
      const from = (b - 1) * 7 * 4 / 7; // giorni del blocco
      const w0 = (b - 1) * 4 + 1, w1 = b * 4;
      await sb.from('pc_progressi').delete().gte('settimana', w0).lte('settimana', w1);
      toast('Ripartiamo dal blocco, con calma ✨');
    } else toast(b === 3 ? 'Percorso completato! 🔥' : 'Si va avanti! 💪🏻');
    await load();
  };
  $('#av').onclick = () => save('avanti'); $('#ri').onclick = () => save('ripeti');
  $('#vid').onclick = () => playSingle('FIS-0' + (b + 4) + '|Video fisso');
}

function viewCal(el) {
  const g0 = nextG(); let h = `<div><div class="eyebrow">12 settimane</div><h1 style="font-size:28px;margin-top:4px">Calendario</h1></div><div class="weeks card">`;
  for (let w = 1; w <= 12; w++) {
    if ((w - 1) % 4 === 0) h += `<div class="phase" style="margin:${w === 1 ? 0 : 10}px 0 0">Blocco ${(w - 1) / 4 + 1} · ${BLOCKS[(w - 1) / 4]}</div>`;
    h += `<div class="week"><b>Sett. ${w}</b>`;
    for (let d = 1; d <= 7; d++) {
      const g = (w - 1) * 7 + d, c = dayOf(g), L = c.t === 'Riposo' ? 'R' : c.t === 'Mobilità' ? 'M' : (c.sid || '?')[0];
      h += `<button class="day ${c.t === 'Allenamento' ? 't' : c.t === 'Mobilità' ? 'm' : ''} ${S.done.has(g) ? 'done' : ''} ${g === g0 ? 'now' : ''}" data-g="${g}">${S.done.has(g) ? ic('ok', 'width:14px;height:14px') : L}</button>`;
    }
    h += '</div>';
  }
  el.innerHTML = h + `</div><p class="muted" style="font-size:12px">A, B, C = allenamenti · M = mobilità · R = riposo. Tocca un giorno per vedere cosa c’è.</p>`;
  el.querySelectorAll('.day').forEach((b) => (b.onclick = () => {
    const c = dayOf(+b.dataset.g), m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div><div class="eyebrow">Settimana ${c.w} · ${esc(c.dow)}</div><h2 style="margin:4px 0 8px">${esc(c.t === 'Riposo' ? 'Riposo' : c.sn)}</h2>${c.t === 'Riposo' ? `<p>${esc(c.note || '')}</p>` : sessionList(c, c.wb)}<p style="margin-top:14px"><button class="btn" id="cl">Chiudi</button></p></div>`;
    document.body.appendChild(m); m.onclick = (e) => { if (e.target === m || e.target.id === 'cl') m.remove(); };
  }));
}

async function viewLez(el) {
  const min = new Date(Date.now() + 3 * 864e5); const iso = min.toISOString().slice(0, 10);
  el.innerHTML = `<div><div class="eyebrow">Con Morgana</div><h1 style="font-size:28px;margin-top:4px">Lezione osservata</h1></div>
  <div class="card"><p style="margin:0">Vuoi che ti guardi mentre ti alleni, in videochiamata? Scegli un giorno con almeno 3 giorni di anticipo. Ti rispondo con una conferma o con un altro orario ✨</p>
  <label for="ld">Giorno</label><input id="ld" type="date" min="${iso}" value="${iso}">
  <label for="lf">Fascia</label><select id="lf"><option>Mattina</option><option>Pomeriggio</option><option>Sera</option></select>
  <label for="ln">Note (facoltative)</label><textarea id="ln" rows="2"></textarea><div class="err" id="le"></div>
  <button class="btn big" id="ls">Invia richiesta</button></div><div id="lr"></div>`;
  const list = async () => {
    const { data } = await sb.from('pc_richieste_lezione').select('*').eq('user_id', S.user.id).order('creato_il', { ascending: false });
    if (!$('#lr')) return;
    $('#lr').innerHTML = (data || []).length ? `<div class="card"><div class="eyebrow">Le tue richieste</div>${data.map((r) => `<div class="row"><span class="n">${esc(r.data_richiesta)} · ${esc(r.fascia)}${r.proposta ? `<br><em>Morgana propone: ${esc(r.proposta)}</em>` : ''}</span><span class="chip">${esc(r.stato)}</span></div>`).join('')}</div>` : '';
  };
  $('#ls').onclick = async () => {
    const d = $('#ld').value; if (!d || d < iso) return ($('#le').textContent = 'Scegli un giorno con almeno 3 giorni di anticipo.');
    const { error } = await sb.from('pc_richieste_lezione').insert({ user_id: S.user.id, data_richiesta: d, fascia: $('#lf').value, note: $('#ln').value });
    if (error) return ($('#le').textContent = 'Non sono riuscita a inviarla. Controlla la data.');
    $('#le').textContent = ''; toast('Richiesta inviata 🫶🏻'); list();
  };
  list();
}

/* ---------- admin ---------- */
function viewVideo(el) {
  const vs = Object.values(S.videos).sort((a, b) => a.ordine - b.ordine), n = vs.filter((v) => v.path).length;
  const gname = { 1: 'Giornata 1 · In piedi e sdraiata', 2: 'Giornata 2 · Pancia in giù, fianco, quattro zampe', 3: 'Giornata 3 · Seduta e libero', 4: 'Giornata 4 · Al muro', 5: 'Giornata 5 · Video fissi' };
  gname[1] = 'Giornata 1 · A terra, pancia in su';
  let h = `<div><div class="eyebrow">Solo per te</div><h1 style="font-size:28px;margin-top:4px">Carica video</h1></div>
  <div class="card"><b>${n} di ${vs.length} caricati</b> <span class="muted">· spazio usato: ${(vs.reduce((t, v) => t + (v.size_bytes || 0), 0) / 1048576).toFixed(0)} MB su circa 1000</span><div class="prog"><i style="width:${(n / vs.length) * 100}%"></i></div>
  <label class="btn big" style="margin-top:10px;cursor:pointer">${ic('up')} Carica più video insieme<input type="file" accept="video/*" multiple id="bulk" hidden></label>
  <p class="muted" style="font-size:12px;margin:6px 0 0">Scegli i video dal rullino nell’ordine in cui li hai registrati: li abbino io ai posti vuoti, in ordine di ripresa, e tu controlli prima di confermare.</p>
  <p class="muted" style="font-size:12px;margin:6px 0 0">Ogni file deve stare sotto i 50 MB. Registra in 720p HD, formato «Più compatibile». Il caricamento sostituisce il video già presente.</p></div>`;
  let last = null;
  vs.forEach((v) => {
    if (v.giornata !== last) { h += `<div class="phase" style="margin-bottom:-6px">${esc(gname[v.giornata] || 'Giornata ' + v.giornata)}</div>`; last = v.giornata; }
    h += `<div class="card" style="padding:10px 12px"><div class="row" style="border:0;padding:0"><span class="st ${v.path ? 'ok' : 'no'}">${v.path ? ic('ok', 'width:13px;height:13px') : ''}</span>
    <span class="n"><span class="muted">${v.ordine}.</span> <b>${esc(v.codice)}</b> · ${esc(v.clip)}<br><em>${esc(v.nome)}${v.path ? ' · ' + (v.size_bytes / 1048576).toFixed(1) + ' MB' : ' · mancante'}</em></span>
    ${v.path ? `<button class="btn s" data-pv="${esc(v.slot)}">Anteprima</button>` : ''}
    <label class="btn s ${v.path ? '' : 'f'}" style="margin:0;cursor:pointer">${v.path ? 'Sostituisci' : 'Carica'}<input type="file" accept="video/*" data-up="${esc(v.slot)}" hidden></label></div></div>`;
  });
  el.innerHTML = h;
  $('#bulk').onchange = (e) => e.target.files.length && bulkStart([...e.target.files], el);
  el.querySelectorAll('[data-pv]').forEach((b) => (b.onclick = () => playSingle(b.dataset.pv)));
  el.querySelectorAll('[data-up]').forEach((i) => (i.onchange = () => i.files[0] && uploadVideo(i.dataset.up, i.files[0], i)));
}
async function uploadCore(slot, file) {
  const ext = ((file.name.split('.').pop() || 'mp4').toLowerCase()).replace(/[^a-z0-9]/g, '') || 'mp4';
  const path = slot.replace('|', '_').replace(/\s+/g, '-') + '.' + ext;
  const prev = S.videos[slot]?.path;
  const up = await sb.storage.from('video').upload(path, file, { upsert: true, contentType: file.type || 'video/mp4' });
  if (up.error) return up.error.message;
  if (prev && prev !== path) await sb.storage.from('video').remove([prev]);
  const { error } = await sb.from('pc_videos').update({ path, size_bytes: file.size, aggiornato_il: new Date().toISOString() }).eq('slot', slot);
  if (error) return 'salvataggio non riuscito';
  S.videos[slot] = { ...S.videos[slot], path, size_bytes: file.size }; delete urlCache[slot];
  return null;
}
function bulkStart(files, el) {
  let fs = files.slice(); if (new Set(fs.map((f) => f.lastModified)).size === fs.length) fs.sort((a, b) => a.lastModified - b.lastModified);
  const all = Object.values(S.videos).sort((a, b) => a.ordine - b.ordine), miss = all.filter((v) => !v.path);
  const opts = (sel) => all.map((v) => `<option value="${esc(v.slot)}" ${v.slot === sel ? 'selected' : ''}>${v.ordine}. ${esc(v.codice)} · ${esc(v.clip)}${v.path ? ' (già caricato)' : ''}</option>`).join('');
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div><h2>Controlla l’abbinamento</h2><p class="muted" style="margin:4px 0 8px">Se un video è nel posto sbagliato, cambialo dal menu. «Anteprima» ti fa rivedere il file.</p>
  ${fs.map((f, i) => `<div class="row" style="align-items:flex-start;flex-direction:column;gap:4px"><span style="font-size:12px" class="muted">${esc(f.name)} · ${(f.size / 1048576).toFixed(1)} MB${f.size > 52428800 ? ' · TROPPO PESANTE, sarà saltato' : ''}</span>
  <span style="display:flex;gap:6px;width:100%"><select data-i="${i}" style="flex:1">${opts(miss[i]?.slot)}</select><button class="btn s" data-pr="${i}">Anteprima</button></span></div>`).join('')}
  <p id="bst" class="muted"></p><p style="display:flex;gap:8px"><button class="btn f" id="bgo">Carica tutti</button><button class="btn" id="bno">Annulla</button></p></div>`;
  document.body.appendChild(m);
  m.querySelectorAll('[data-pr]').forEach((b) => (b.onclick = () => { const u = URL.createObjectURL(fs[+b.dataset.pr]); const w = document.createElement('div'); w.className = 'modal'; w.style.zIndex = 45; w.innerHTML = `<div><video src="${u}" controls autoplay playsinline style="width:100%;border-radius:12px;background:#000"></video><p><button class="btn" id="x">Chiudi</button></p></div>`; document.body.appendChild(w); w.onclick = (e) => { if (e.target === w || e.target.id === 'x') { w.remove(); URL.revokeObjectURL(u); } }; }));
  $('#bno', m).onclick = () => m.remove();
  $('#bgo', m).onclick = async () => {
    const sel = [...m.querySelectorAll('select')].map((s) => s.value);
    if (new Set(sel).size !== sel.length) return ($('#bst', m).textContent = 'Due video sono sullo stesso posto: cambia uno dei due.');
    $('#bgo', m).disabled = true; let ok = 0, bad = [];
    for (let i = 0; i < fs.length; i++) {
      $('#bst', m).textContent = `Carico ${i + 1} di ${fs.length}… non chiudere la pagina.`;
      if (fs[i].size > 52428800) { bad.push(fs[i].name + ' (troppo pesante)'); continue; }
      const err = await uploadCore(sel[i], fs[i]); err ? bad.push(fs[i].name + ' (' + err + ')') : ok++;
    }
    m.remove(); toast(bad.length ? `Caricati ${ok}. Non riusciti: ${bad.join(', ')}` : `Caricati ${ok} video ✨`); render();
  };
}
async function uploadVideo(slot, file, input) {
  const mb = file.size / 1048576;
  if (mb > 50) return toast(`Il file pesa ${mb.toFixed(0)} MB: il limite è 50. Comprimilo (720p) e riprova.`);
  const lab = input.parentElement; const old = lab.firstChild.textContent; lab.firstChild.textContent = 'Carico…';
  const ext = ((file.name.split('.').pop() || 'mp4').toLowerCase()).replace(/[^a-z0-9]/g, '') || 'mp4';
  const path = slot.replace('|', '_').replace(/\s+/g, '-') + '.' + ext;
  const prev = S.videos[slot]?.path;
  const up = await sb.storage.from('video').upload(path, file, { upsert: true, contentType: file.type || 'video/mp4' });
  if (up.error) { lab.firstChild.textContent = old; return toast('Caricamento non riuscito: ' + up.error.message); }
  if (prev && prev !== path) await sb.storage.from('video').remove([prev]);
  const { error } = await sb.from('pc_videos').update({ path, size_bytes: file.size, aggiornato_il: new Date().toISOString() }).eq('slot', slot);
  if (error) return toast('Salvataggio non riuscito.');
  S.videos[slot] = { ...S.videos[slot], path, size_bytes: file.size }; delete urlCache[slot];
  toast('Video caricato ✨'); render();
}

async function viewClienti(el) {
  el.innerHTML = `<div><div class="eyebrow">Solo per te</div><h1 style="font-size:28px;margin-top:4px">Clienti</h1></div><div id="cl" class="card muted">Carico…</div><div id="rq"></div>`;
  const [{ data: ps }, { data: rs }] = await Promise.all([sb.from('pc_profiles').select('*').order('creato_il', { ascending: false }), sb.from('pc_richieste_lezione').select('*').order('creato_il', { ascending: false })]);
  if (!$('#cl')) return;
  const nm = Object.fromEntries((ps || []).map((p) => [p.user_id, p.nome || p.email || 'Cliente']));
  const cl = (ps || []).filter((p) => !p.is_admin);
  $('#cl').className = 'card';
  $('#cl').innerHTML = cl.length ? cl.map((p) => `<div class="row"><span class="n"><b>${esc(p.nome || 'Senza nome')}</b><br><em>${esc(p.email || '')}</em></span>
    <input type="date" value="${p.accesso_fino || ''}" data-fino="${p.user_id}" style="width:auto;padding:5px" title="Accesso fino al">
    <button class="btn s ${p.attiva ? 'f' : ''}" data-att="${p.user_id}" data-v="${p.attiva}">${p.attiva ? 'Attiva' : 'Attiva?'}</button></div>`).join('') : 'Ancora nessuna iscritta.';
  $('#cl').querySelectorAll('[data-att]').forEach((b) => (b.onclick = async () => { await sb.from('pc_profiles').update({ attiva: b.dataset.v !== 'true' }).eq('user_id', b.dataset.att); viewClienti(el); }));
  $('#cl').querySelectorAll('[data-fino]').forEach((i) => (i.onchange = async () => { await sb.from('pc_profiles').update({ accesso_fino: i.value || null }).eq('user_id', i.dataset.fino); toast('Scadenza salvata'); }));
  $('#rq').innerHTML = (rs || []).length ? `<div class="card"><div class="eyebrow">Richieste di lezione</div>${rs.map((r) => `<div class="row" style="align-items:flex-start"><span class="n"><b>${esc(nm[r.user_id] || 'Cliente')}</b><br>${esc(r.data_richiesta)} · ${esc(r.fascia)}${r.note ? '<br><em>' + esc(r.note) + '</em>' : ''}${r.proposta ? '<br><em>Proposta: ' + esc(r.proposta) + '</em>' : ''}</span>
    <span style="display:grid;gap:4px"><span class="chip">${esc(r.stato)}</span><button class="btn s" data-r="${r.id}" data-s="accettata">Accetta</button><button class="btn s" data-r="${r.id}" data-s="proposta">Proponi</button><button class="btn s" data-r="${r.id}" data-s="rifiutata">Rifiuta</button></span></div>`).join('')}</div>` : '';
  $('#rq').querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => {
    if (b.dataset.s !== 'proposta') return sb.from('pc_richieste_lezione').update({ stato: b.dataset.s }).eq('id', b.dataset.r).then(() => viewClienti(el));
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div><h2>Proponi un altro orario</h2><label for="pp">Giorno e ora</label><input id="pp" placeholder="es. giovedì 20 alle 18:30"><p><button class="btn f" id="ok">Invia</button> <button class="btn" id="no">Annulla</button></p></div>`;
    document.body.appendChild(m); $('#no').onclick = () => m.remove();
    $('#ok').onclick = async () => { await sb.from('pc_richieste_lezione').update({ stato: 'proposta', proposta: $('#pp').value }).eq('id', b.dataset.r); m.remove(); viewClienti(el); };
  }));
}

/* ---------- video: url firmati ---------- */
const urlCache = {};
async function getUrl(slot) {
  const v = S.videos[slot]; if (!v?.path) return null;
  const c = urlCache[slot]; if (c && c.exp > Date.now()) return c.url;
  const { data } = await sb.storage.from('video').createSignedUrl(v.path, 3600);
  if (!data?.signedUrl) return null;
  urlCache[slot] = { url: data.signedUrl, exp: Date.now() + 3000 * 1000 }; return data.signedUrl;
}

/* ---------- player ---------- */
let P = null, wake = null;
function playerShell() {
  const p = document.createElement('div'); p.id = 'player';
  p.innerHTML = `<video id="pv" playsinline preload="auto"></video>
  <div class="pl-top"><span id="pt"></span><span id="pc"></span></div>
  <div class="pl-mid" id="pm"><div><div class="lab" id="pl"></div><div class="num" id="pn"></div><div class="txt" id="px"></div></div></div>
  <div class="pl-bot"><span id="pnx"></span><span style="display:flex;gap:6px;align-items:center"><button class="skip" id="psk">Salta</button><button class="pause" id="pp">Pausa</button></span></div>
  <div class="pbar" id="pb" style="width:0"></div>
  <div class="rot" id="rot">Gira il telefono in orizzontale 🔄</div>
  <div class="ov" id="ov"><div style="display:grid;gap:12px;min-width:220px"><h2 style="font-size:30px">In pausa</h2><button class="btn big" id="rs">Riprendi</button><button class="btn" id="ex">Esci dall’allenamento</button></div></div>`;
  document.body.appendChild(p); return p;
}
const vidItem = (slot, o = {}) => ({ type: 'video', slot, ...o });
const timerItem = (label, sec, o = {}) => ({ type: 'timer', label, sec, ...o });
const NOPAUSE = ['Mobilità', 'Defaticamento']; // niente recuperi in mobilità e defaticamento
function buildQueue(day) {
  const s = D.sessions[day.sid], q = [], seenNow = new Set(S.seen), fis = (f) => S.videos[f + '|Video fisso'];
  day.fis.filter((f) => f !== 'FIS-08').forEach((f) => q.push(vidItem(f + '|Video fisso', { title: fis(f)?.nome || f, fb: fis(f)?.nome || '' })));
  let last = '';
  s.ex.forEach((e, i) => {
    if (e.f !== last) {
      last = e.f; q.push({ type: 'phase', title: e.f });
      if (e.f === 'Defaticamento' && day.fis.includes('FIS-08')) q.push(vidItem('FIS-08|Video fisso', { title: fis('FIS-08')?.nome || 'Perché finiamo con l’allungamento' }));
    }
    const n = e.s[day.wb - 1], info = D.ex[e.c] || {}, noPause = NOPAUSE.includes(e.f);
    for (let k = 1; k <= n; k++) {
      const sub = n > 1 ? `Serie ${k} di ${n}` : '';
      if (k === 1 && !seenNow.has(e.c)) { q.push(vidItem(e.c + '|Spiegazione', { title: e.n, sub: 'Spiegazione', fb: (info.txt || []).join(' '), fbSec: 22, mark: e.c })); seenNow.add(e.c); }
      q.push(vidItem(e.c + '|Seguimi', { title: e.n, sub: sub || 'Seguimi', fb: info.seg || '', fbSec: e.seg }));
      if (k < n && !noPause) q.push(timerItem('Recupero', day.b === 1 ? 15 : 30, { title: e.n, sub, next: e.n }));
    }
    if (i < s.ex.length - 1 && !NOPAUSE.includes(s.ex[i + 1].f)) q.push(timerItem('Cambio esercizio', 15, { title: 'Bravissima', sub: '', next: s.ex[i + 1].n }));
  });
  return q;
}
async function startPlayer(day) {
  P = { q: buildQueue(day), paused: false, stop: false, skip: false, day };
  const el = playerShell(); P.el = el;
  const v = $('#pv', el);
  // sblocca la riproduzione automatica (iPhone) con il tocco su "Inizia"
  v.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='; v.play().catch(() => {});
  try { el.requestFullscreen?.().catch(() => {}); } catch (e) {}
  navigator.wakeLock?.request('screen').then((w) => (wake = w)).catch(() => {});
  $('#pp', el).onclick = () => setPause(true); $('#rs', el).onclick = () => setPause(false);
  $('#psk', el).onclick = () => { P.skip = true; v.dispatchEvent(new Event('ended')); };
  $('#ex', el).onclick = () => { P.stop = true; v.dispatchEvent(new Event('ended')); };
  $('#rot', el).classList.add('on'); setTimeout(() => $('#rot', el)?.classList.remove('on'), 4000);
  document.addEventListener('visibilitychange', onVis);
  // sblocca l'audio/video con il tocco iniziale
  try { v.muted = false; v.src = ''; } catch (e) {}
  for (let i = 0; i < P.q.length && !P.stop; i++) {
    P.i = i; P.skip = false; showItem(P.q[i]);
    const nx = P.q.slice(i + 1).find((x) => x.type === 'video'); if (nx) getUrl(nx.slot);
    await runItem(P.q[i]);
  }
  const stopped = P.stop; closePlayer();
  if (!stopped) { await markDone(day.g); toast('Allenamento completato! Brava ✨🔥'); }
  render();
}
function onVis() { if (document.hidden && P && !P.paused) setPause(true); else if (!document.hidden && wake === null) navigator.wakeLock?.request('screen').then((w) => (wake = w)).catch(() => {}); }
function closePlayer() {
  document.removeEventListener('visibilitychange', onVis);
  try { wake?.release(); } catch (e) {} wake = null;
  try { document.fullscreenElement && document.exitFullscreen(); } catch (e) {}
  P?.el?.remove(); P = null;
}
function setPause(on) {
  P.paused = on; const v = $('#pv', P.el); $('#ov', P.el).classList.toggle('on', on);
  if (on) v.pause(); else if (P.cur === 'video' && v.src) v.play().catch(() => {});
}
function showItem(it) {
  const el = P.el, mid = $('#pm', el); $('#pt', el).textContent = (it.title || '') + (it.sub ? ' · ' + it.sub : '');
  $('#pc', el).textContent = `${P.i + 1} / ${P.q.length}`; $('#pb', el).style.width = (P.i / P.q.length) * 100 + '%';
  const nx = P.q.slice(P.i + 1).find((x) => x.title && x.type !== 'phase');
  $('#pnx', el).textContent = it.next ? 'Prossimo: ' + it.next : nx ? 'Prossimo: ' + nx.title : '';
  mid.classList.remove('on'); $('#pv', el).style.visibility = it.type === 'video' ? 'visible' : 'hidden';
}
const showMid = (lab, num, txt) => { const m = $('#pm', P.el); $('#pl', P.el).textContent = lab; $('#pn', P.el).textContent = num; $('#px', P.el).textContent = txt || ''; m.classList.add('on'); };
function wait(ms, tick) {
  return new Promise((res) => {
    let left = ms, last = performance.now();
    const t = setInterval(() => {
      const now = performance.now(); if (!P.paused) left -= now - last; last = now; tick?.(left);
      if (left <= 0 || P.skip || P.stop) { clearInterval(t); res(); }
    }, 100);
  });
}
async function runItem(it) {
  const v = $('#pv', P.el); P.cur = it.type;
  if (it.type === 'phase') { showMid(it.title, '', ''); $('#pn', P.el).textContent = ''; return wait(2500); }
  if (it.type === 'timer') return wait(it.sec * 1000, (l) => showMid(it.label, Math.max(0, Math.ceil(l / 1000)), it.next && it.label !== 'Preparati' ? 'Dopo: ' + it.next : (it.label === 'Preparati' ? 'Mettiti in posizione' : '')));
  const url = await getUrl(it.slot);
  if (it.mark) { S.seen.add(it.mark); saveSeen(); }
  if (!url) { // video non ancora caricato: mostro il testo
    P.cur = 'timer'; return wait((it.fbSec || 20) * 1000, (l) => showMid(it.sub || 'Video', Math.max(0, Math.ceil(l / 1000)), it.fb));
  }
  return new Promise((res) => {
    const done = () => { v.removeEventListener('ended', done); v.removeEventListener('error', done); res(); };
    v.addEventListener('ended', done); v.addEventListener('error', done);
    v.src = url; if (!P.paused) v.play().catch(() => {});
  });
}
async function playSingle(slot) {
  const url = await getUrl(slot); if (!url) return toast('Questo video non è ancora stato caricato.');
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div><video src="${esc(url)}" controls autoplay playsinline style="width:100%;border-radius:12px;background:#000"></video><p><button class="btn" id="cl">Chiudi</button></p></div>`;
  document.body.appendChild(m); m.onclick = (e) => { if (e.target === m || e.target.id === 'cl') m.remove(); };
}

boot();
