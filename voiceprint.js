/* Voice print: lets an app answer only the voice you registered.
   - You speak for about 30 seconds once. The app keeps a small set of numbers about HOW your voice sounds (never the recording) on this phone only.
   - While you talk later, the same numbers are measured on each turn and compared. A turn that does not match is ignored.
   It works from the loudness meter's audio, so it needs no server and costs nothing.
   Honest limits: this is a simple method. Very similar voices, a bad microphone, a cold, whispering or a loud room can confuse it, and a recording of
   your voice can pass. When it cannot tell, it lets the turn through. Never use it to protect anything private. */
(function () {
  "use strict";
  var KEY = "vp_profile_v1", NB = 24, NC = 12, F0 = 200, F1 = 3300, CHUNK = 60, NEED = 8, WANT = 14, MINF = 30;
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  var profile = null; try { profile = JSON.parse(ls(KEY) || "null"); } catch (e) { profile = null; }
  if (profile && (!profile.mu || profile.mu.length !== NC)) profile = null;

  var mel = function (f) { return 2595 * Math.log10(1 + f / 700); }, imel = function (m) { return 700 * (Math.pow(10, m / 2595) - 1); };
  var edges = []; for (var i = 0; i < NB + 2; i++) edges.push(imel(mel(F0) + (mel(F1) - mel(F0)) * i / (NB + 1)));
  var dct = []; for (var k = 1; k <= NC; k++) { var row = []; for (var j = 0; j < NB; j++) row.push(Math.cos(Math.PI * k * (j + 0.5) / NB)); dct.push(row); }
  var fbuf = null, tbuf = null;

  function pitch(an, sr) {               // rough pitch in Hz of what the mic hears right now, 0 when it is not a voiced sound
    var N = an.fftSize; if (!tbuf || tbuf.length !== N) tbuf = new Float32Array(N);
    an.getFloatTimeDomainData(tbuf);
    var lo = Math.floor(sr / 420), hi = Math.min(Math.floor(sr / 75), N - 200), n = N - hi, r0 = 0, i, l;
    if (hi <= lo || n < 150) return 0;
    for (i = 0; i < n; i++) r0 += tbuf[i] * tbuf[i];
    if (r0 < 1e-7) return 0;
    var best = 0, cs = [];
    for (l = lo; l <= hi; l++) { var c = 0, e = 0; for (i = 0; i < n; i++) { c += tbuf[i] * tbuf[i + l]; e += tbuf[i + l] * tbuf[i + l]; } c = c / Math.sqrt(r0 * e + 1e-9); cs[l] = c; if (c > best) best = c; }
    if (best < 0.5) return 0;
    for (l = lo; l <= hi; l++) if (cs[l] >= best * 0.92 && cs[l] >= cs[l - 1] && cs[l] >= (cs[l + 1] || 0)) return sr / l;
    return 0;
  }
  function cep(an, sr) {                 // 12 numbers describing the shape of the sound (what makes a voice sound like that voice)
    var n = an.frequencyBinCount; if (!fbuf || fbuf.length !== n) fbuf = new Float32Array(n);
    an.getFloatFrequencyData(fbuf);
    var bh = sr / an.fftSize, le = new Array(NB), b, i;
    for (b = 0; b < NB; b++) {
      var a = edges[b], m = edges[b + 1], z = edges[b + 2], s = 0, w = 0;
      for (i = Math.max(1, Math.floor(a / bh)); i <= Math.min(n - 1, Math.ceil(z / bh)); i++) {
        var f = i * bh, wt = f < a || f > z ? 0 : f <= m ? (f - a) / (m - a) : (z - f) / (z - m);
        if (wt > 0) { s += wt * Math.pow(10, fbuf[i] / 10); w += wt; }
      }
      le[b] = Math.log(s / (w || 1) + 1e-12);
    }
    var out = new Array(NC);
    for (var k = 0; k < NC; k++) { var v = 0; for (b = 0; b < NB; b++) v += dct[k][b] * le[b]; out[k] = v; }
    return out;
  }

  /* ---- listening to a turn ---- */
  var U = { sum: new Array(NC).fill(0), n: 0, p: [] };
  function reset() { U = { sum: new Array(NC).fill(0), n: 0, p: [] }; }
  function feed(an, sr) {
    if (!an || !sr) return;
    var p = pitch(an, sr); if (!p) return;
    var c = cep(an, sr); for (var k = 0; k < NC; k++) U.sum[k] += c[k];
    U.n++; if (U.p.length < 400) U.p.push(p);
  }
  function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }); return s[s.length >> 1]; }
  function strict() { var s = ls("vp_strict"); return s === "strict" ? 0.8 : s === "loose" ? 1.3 : 1; }
  function dist(m, mu, sg) { var t = 0; for (var k = 0; k < NC; k++) { var z = (m[k] - mu[k]) / sg[k]; t += z * z; } return Math.sqrt(t / NC); }
  function verdict() {                   // { ok, known, score }  ok = true also when we cannot tell
    if (!on() || U.n < MINF) return { ok: true, known: false, score: 0 };
    var m = U.sum.map(function (x) { return x / U.n; }), d = dist(m, profile.mu, profile.sg), thr = profile.thr * strict();
    var pOk = true;
    if (U.p.length >= 10 && profile.pitch) { var r = median(U.p) / profile.pitch; pOk = r > 0.72 && r < 1.38; }
    return { ok: d <= thr && pOk, known: true, score: d / thr };
  }

  /* ---- registering your voice ---- */
  var E = null;
  function enrollStart() { E = { chunks: [], cur: new Array(NC).fill(0), n: 0, p: [] }; return true; }
  function enrollFeed(an, sr) {          // returns progress 0..1
    if (!E) return 0;
    var p = pitch(an, sr); if (p) {
      var c = cep(an, sr); for (var k = 0; k < NC; k++) E.cur[k] += c[k];
      E.n++; E.p.push(p);
      if (E.n >= CHUNK) { E.chunks.push(E.cur.map(function (x) { return x / E.n; })); E.cur = new Array(NC).fill(0); E.n = 0; }
    }
    return Math.min(1, E.chunks.length / WANT);
  }
  function enrollFinish() {
    if (!E || E.chunks.length < NEED) { E = null; return false; }
    var C = E.chunks, N = C.length, mu = new Array(NC).fill(0), sg = new Array(NC).fill(0), k, i;
    for (i = 0; i < N; i++) for (k = 0; k < NC; k++) mu[k] += C[i][k] / N;
    for (i = 0; i < N; i++) for (k = 0; k < NC; k++) sg[k] += Math.pow(C[i][k] - mu[k], 2) / N;
    var ms = 0; for (k = 0; k < NC; k++) { sg[k] = Math.sqrt(sg[k]); ms += sg[k] / NC; }
    for (k = 0; k < NC; k++) sg[k] = Math.max(sg[k], ms * 0.5, 1e-3);
    var ds = [];
    for (i = 0; i < N; i++) { var lo = mu.map(function (x, j) { return (x * N - C[i][j]) / (N - 1); }); ds.push(dist(C[i], lo, sg)); }
    var dm = ds.reduce(function (a, b) { return a + b; }, 0) / N, dv = Math.sqrt(ds.reduce(function (a, b) { return a + Math.pow(b - dm, 2); }, 0) / N);
    var thr = Math.min(3, Math.max(1.1, dm + 2.5 * dv));
    profile = { mu: mu, sg: sg, thr: thr, pitch: median(E.p), t: Date.now() };
    lsSet(KEY, JSON.stringify(profile)); E = null; reset();
    if (ls("vp_on") === null) lsSet("vp_on", "1");
    return true;
  }
  function on() { return !!profile && ls("vp_on") !== "0"; }

  window.VoicePrint = {
    enrolled: function () { return !!profile; },
    on: on,
    setOn: function (v) { lsSet("vp_on", v ? "1" : "0"); },
    setStrict: function (s) { lsSet("vp_strict", s); },
    strict: function () { return ls("vp_strict") || "normal"; },
    clear: function () { profile = null; lsDel(KEY); lsDel("vp_on"); E = null; reset(); },
    reset: reset, feed: feed, verdict: verdict,
    enrollStart: enrollStart, enrollFeed: enrollFeed, enrollFinish: enrollFinish, enrolling: function () { return !!E; }, enrollCancel: function () { E = null; },
    _dbg: function () { return { profile: profile, U: U }; }
  };
})();
