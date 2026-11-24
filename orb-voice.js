/* Orb voice conversation for Tender Sprout AI.
   Add this file next to index.html. It adds a microphone button in the top bar.
   Tap it to talk out loud with the AI (no text on screen). Needs the voice server (Vercel) below. */
(function () {
  "use strict";
  var API = (window.ORB_VOICE_API || "https://baron-lovat.vercel.app").replace(/\/$/, "");
  var MODE = "teacher";

  var LANGS = [["", "Auto-detect"], ["en", "English"], ["fr", "French"], ["es", "Spanish"], ["de", "German"], ["pt", "Portuguese"],
    ["it", "Italian"], ["hi", "Hindi"], ["ar", "Arabic"], ["zh", "Chinese"], ["ja", "Japanese"], ["ko", "Korean"], ["ru", "Russian"],
    ["tr", "Turkish"], ["sw", "Swahili"], ["yo", "Yoruba"], ["ha", "Hausa"]];

  function get(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } }
  function save(k, v) { put(k, JSON.stringify(v)); }

  var history = load("tsa_voice_history"), memory = load("tsa_voice_memory"), voices = load("tsa_voice_voices");
  var voice = get("tsa_voice_id"), lang = get("tsa_voice_lang");

  /* ---------- styles ---------- */
  var css = [
    "#vxOv{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;color:#e8eaf2;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;",
    "--c1:#3b4a7a;--c2:#2a3358;--c3:#5a6aa8;--l:0;background:radial-gradient(130% 55% at 50% 100%,#1a2175 0%,#07080d 62%);",
    "padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}",
    "#vxOv[hidden]{display:none}",
    "html[data-theme=light] #vxOv{color:#1b2140;background:linear-gradient(#f4f2ff,#dbe4ff);--sheet:#fff;--btn:#ffffffd9;--line:#c5d0f0;--muted:#5b6485}",
    "#vxOv{--sheet:#1b2142;--btn:#11152b;--line:#2a315a;--muted:#98a0c0}",
    "#vxOv[data-s=listen]{--c1:#19d3c5;--c2:#2f6bff;--c3:#7be0ff}",
    "#vxOv[data-s=think]{--c1:#a56bff;--c2:#ff6bd5;--c3:#6b8bff}",
    "#vxOv[data-s=speak]{--c1:#ff8a3d;--c2:#ff3d8b;--c3:#ffd36b}",
    "#vxOv *{box-sizing:border-box}",
    "#vxOv button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}",
    ".vxtop{display:flex;align-items:center;justify-content:space-between;padding:.7rem 1rem}",
    ".vxib{width:44px;height:44px;border:0;border-radius:50%;background:var(--btn);display:grid;place-items:center}",
    ".vxib svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}",
    ".vxmid{flex:1;display:flex;align-items:center;justify-content:center}",
    ".vxw{position:relative;width:min(62vw,260px);aspect-ratio:1}",
    ".vxring{position:absolute;inset:0;border-radius:50%;border:2px solid var(--c1);opacity:0;pointer-events:none}",
    "#vxOv[data-s=listen] .vxring,#vxOv[data-s=speak] .vxring{animation:vxrip 2.4s ease-out infinite}",
    "#vxOv[data-s=listen] .vxr2,#vxOv[data-s=speak] .vxr2{animation-delay:1.2s}",
    "@keyframes vxrip{0%{transform:scale(1);opacity:.55}100%{transform:scale(1.75);opacity:0}}",
    ".vxorb{position:relative;width:100%;aspect-ratio:1;border:0;padding:0;border-radius:50%;overflow:hidden;background:#0c0e17;",
    "transform:scale(calc(1 + var(--l)*.28));transition:transform .08s linear,box-shadow .6s;box-shadow:0 0 60px -8px var(--c1)}",
    ".vxorb i{position:absolute;width:85%;height:85%;border-radius:50%;filter:blur(22px);mix-blend-mode:screen;transition:background .8s;animation:vxflow 8s ease-in-out infinite}",
    ".vxorb i:nth-child(1){background:var(--c1);top:-15%;left:-15%}",
    ".vxorb i:nth-child(2){background:var(--c2);bottom:-15%;right:-15%;animation-duration:10s;animation-delay:-3s}",
    ".vxorb i:nth-child(3){background:var(--c3);top:18%;left:18%;animation-duration:12s;animation-delay:-6s}",
    "#vxOv[data-s=think] .vxorb i{animation-duration:2.8s}",
    "@keyframes vxflow{0%,100%{transform:translate(0,0) rotate(0) scale(1)}33%{transform:translate(28%,14%) rotate(120deg) scale(1.2)}66%{transform:translate(-14%,28%) rotate(240deg) scale(.9)}}",
    "@media (prefers-reduced-motion:reduce){.vxorb i,.vxring{animation:none!important}}",
    "#vxSt{display:none;text-align:center;padding:0 1.2rem .6rem;font-size:.95rem;color:#ff8a8a}",
    "#vxSt.on{display:block}",
    ".vxbtns{display:flex;gap:.6rem;padding:0 1rem 1rem}",
    ".vxbtns button{flex:1;padding:.85rem;border-radius:999px;border:1px solid var(--line);background:var(--btn)}",
    "#vxEnd{color:#ff5a5a}",
    "#vxSheet{position:fixed;inset:0;background:#0008;display:flex;align-items:flex-end;justify-content:center;z-index:10000}",
    "#vxSheet[hidden]{display:none}",
    ".vxcard{width:100%;max-width:480px;background:var(--sheet);color:inherit;border-radius:22px 22px 0 0;padding:1.1rem 1.1rem calc(1.1rem + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:.55rem;max-height:90dvh;overflow:auto}",
    ".vxcard h3{margin:0 0 .2rem}",
    ".vxcard label{font-size:.8rem;color:var(--muted);margin-top:.35rem}",
    ".vxcard select,.vxcard input{width:100%;border:1px solid var(--line);background:var(--btn);color:inherit;border-radius:12px;padding:.7rem .8rem;font:inherit}",
    ".vxcard button{border:1px solid var(--line);background:var(--btn);border-radius:12px;padding:.65rem .9rem;flex:1}",
    "#vxOv .vxcard .vxpri{background:var(--c2);color:#fff;border:0}",
    ".vxseg{display:flex;gap:.5rem}",
    "#vxMsg{font-size:.85rem;color:var(--muted);min-height:1.2em}",
    ".vxhelp{font-size:.8rem;color:var(--muted);line-height:1.4;margin:0}",
    "#vxOpen{display:inline-grid;place-items:center}",
    ".vxname{font-weight:600;font-size:1.05rem}"
  ].join("");
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ---------- page pieces ---------- */
  var ov = document.createElement("div");
  ov.id = "vxOv"; ov.hidden = true; ov.dataset.s = "idle";
  ov.innerHTML =
    '<div class="vxtop">' +
      '<button class="vxib" id="vxBack" aria-label="Back to chat"><svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg></button>' +
      '<div class="vxname">Tender Sprout AI</div>' +
      '<button class="vxib" id="vxGear" aria-label="Voice settings"><svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg></button>' +
    '</div>' +
    '<div class="vxmid"><div class="vxw"><span class="vxring"></span><span class="vxring vxr2"></span>' +
      '<button class="vxorb" id="vxOrb" aria-label="Tap to talk"><i></i><i></i><i></i></button></div></div>' +
    '<p id="vxSt"></p>' +
    '<div class="vxbtns"><button id="vxPause">Pause</button><button id="vxEnd">End</button></div>' +
    '<div id="vxSheet" hidden><div class="vxcard">' +
      '<h3>Voice settings</h3>' +
      '<label>Language</label><select id="vxLang" aria-label="Language"></select>' +
      '<label>Voice</label><select id="vxVoice" aria-label="Voice"></select>' +
      '<div class="vxseg"><button id="vxTest">Test voice</button><button id="vxDel">Remove</button></div>' +
      '<label>Add a voice</label>' +
      '<input id="vxName" placeholder="Name (for example Sarah)" autocomplete="off">' +
      '<input id="vxId" placeholder="Paste Fish voice link or ID" autocomplete="off">' +
      '<button id="vxAdd">Add voice</button>' +
      '<p class="vxhelp">On fish.audio, open a voice you like and copy its link from the browser.</p>' +
      '<div id="vxMsg"></div>' +
      '<button class="vxpri" id="vxDone">Done</button>' +
    '</div></div>' +
    '<audio id="vxAudio" playsinline></audio>';
  document.body.appendChild(ov);

  function q(id) { return document.getElementById(id); }
  var player = q("vxAudio");

  /* mic button in the top bar */
  var open = document.createElement("button");
  open.className = "iconbtn"; open.id = "vxOpen"; open.title = "Talk with the AI"; open.setAttribute("aria-label", "Talk with the AI");
  open.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4"/></svg>';
  var theme = document.getElementById("themeBtn");
  if (theme && theme.parentNode) theme.parentNode.insertBefore(open, theme);
  else { var h = document.querySelector("header") || document.body; h.appendChild(open); }

  /* ---------- voice engine ---------- */
  var SR = 16000;                       // speech is recorded as 16 kHz mono WAV
  var T_ON = 0.12, T_BARGE = 0.30;      // how loud counts as "you are talking" / "you are interrupting"
  var END_MS = 800;                     // silence that ends your turn
  var PRE_BLOCKS = 6;                   // keeps the last half second so first words are never lost

  var state = "idle", on = false, paused = false, turn = 0;
  var ctx, micAn, outAn, stream, srcNode, proc, muteNode, ctl = null, stopFn = null, fxP = null, fxPlaying = false;
  var pre = [], utt = [], talking = false, speechStart = 0, lastVoice = 0, cont = 0, bargeMs = 0, lastT = 0, thinkSince = 0, fillerArmed = false;
  var buf = new Float32Array(1024);
  var SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";   // tiny silent clip that unlocks audio playback on phones

  function set(s, text) {
    state = s; ov.dataset.s = s;
    if (text !== undefined) { var e = q("vxSt"); e.textContent = text; e.classList.toggle("on", /^(Error|Microphone|No internet|No microphone)/.test(text)); }
  }
  function level(an) {
    an.getFloatTimeDomainData(buf);
    var sum = 0; for (var i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.min(1, Math.sqrt(sum / buf.length) * 10);
  }
  function setLevel(v) { ov.style.setProperty("--l", v); }

  /* --- recording straight from the mic (no MediaRecorder, so we can keep a pre-roll and resend) --- */
  function onAudio(e) {
    if (!on || paused) return;
    var inp = e.inputBuffer.getChannelData(0), ratio = ctx.sampleRate / SR, n = Math.floor(inp.length / ratio), out = new Int16Array(n);
    for (var i = 0; i < n; i++) {
      var a = Math.floor(i * ratio), b = Math.min(inp.length, Math.floor((i + 1) * ratio)), s = 0, c = 0;
      for (var j = a; j < b; j++) { s += inp[j]; c++; }
      var v = c ? s / c : 0; out[i] = Math.max(-1, Math.min(1, v)) * 32767;
    }
    if (talking) { utt.push(out); if (utt.length > 700 && state === "listen") submit(); }
    else { pre.push(out); if (pre.length > PRE_BLOCKS) pre.shift(); }
  }
  function wavB64(blocks) {
    var len = 0; blocks.forEach(function (b) { len += b.length; });
    var buffer = new ArrayBuffer(44 + len * 2), dv = new DataView(buffer);
    function str(o, t) { for (var i = 0; i < t.length; i++) dv.setUint8(o + i, t.charCodeAt(i)); }
    str(0, "RIFF"); dv.setUint32(4, 36 + len * 2, true); str(8, "WAVE"); str(12, "fmt "); dv.setUint32(16, 16, true);
    dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, SR, true); dv.setUint32(28, SR * 2, true);
    dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); str(36, "data"); dv.setUint32(40, len * 2, true);
    var o = 44; blocks.forEach(function (b) { for (var i = 0; i < b.length; i++) { dv.setInt16(o, b[i], true); o += 2; } });
    var bytes = new Uint8Array(buffer), s = "";
    for (var k = 0; k < bytes.length; k += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(k, k + 0x8000));
    return btoa(s);
  }

  /* --- playing sound --- */
  function playB64(b64) {
    return new Promise(function (res) {
      var done = false;
      function fin() { if (done) return; done = true; player.onended = null; player.onerror = null; if (stopFn === fin) stopFn = null; res(); }
      stopFn = fin; player.onended = fin; player.onerror = fin;
      player.src = "data:audio/mpeg;base64," + b64;
      player.play().catch(fin);
    });
  }
  function stopPlayback() { try { player.pause(); } catch (e) {} if (stopFn) { var f = stopFn; stopFn = null; f(); } }

  /* --- short spoken extras ("I'm listening", "Okay, one moment"), made once per voice and kept on the phone --- */
  var FX_LINES = { hello: "Okay, I'm listening.", fill: ["Mm-hm.", "Okay, one moment.", "Let me think."] };
  function fxKey() { return "tsa_voice_fx_" + (voice || "default"); }
  function getFx() { try { return JSON.parse(localStorage.getItem(fxKey())); } catch (e) { return null; } }
  var fxMaking = {};
  function makeFx() {
    var k = fxKey(); if (getFx() || fxMaking[k]) return fxMaking[k] || Promise.resolve();
    var all = [FX_LINES.hello].concat(FX_LINES.fill);
    fxMaking[k] = Promise.all(all.map(function (t) { return post("/api/speak", { text: t, voice: voice }).then(function (r) { return r.audio; }); }))
      .then(function (a) { try { localStorage.setItem(k, JSON.stringify({ hello: a[0], fill: a.slice(1) })); } catch (e) {} })
      .catch(function () {}).then(function () { delete fxMaking[k]; });
    return fxMaking[k];
  }
  function playFx(kind) {
    var fx = getFx(); if (!fx) return null;
    var clip = kind === "hello" ? fx.hello : fx.fill[Math.floor(Math.random() * fx.fill.length)];
    if (!clip) return null;
    fxPlaying = true;
    fxP = playB64(clip).then(function () { fxPlaying = false; fxP = null; });
    return fxP;
  }

  /* --- turn taking --- */
  function resetUtt() { talking = false; utt = []; speechStart = 0; cont = 0; }
  function listen() { resetUtt(); bargeMs = 0; fillerArmed = false; set("listen", ""); }
  function startTalk() { talking = true; utt = pre.slice(); pre = []; }
  function cancelPending() { turn++; if (ctl) { try { ctl.abort(); } catch (e) {} ctl = null; } fillerArmed = false; stopPlayback(); fxPlaying = false; }

  function micMessage(e) {
    var n = (e && e.name) || "", m = (e && e.message) || "";
    if (!window.isSecureContext) return "Microphone blocked. This page must open over https.";
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return "Microphone blocked. This browser can't use the mic here. Open the site in Chrome or Safari.";
    if (n === "NotAllowedError" || n === "PermissionDeniedError" || n === "SecurityError") return "Microphone blocked. Allow mic access for this site in your phone/browser settings, then tap the orb again.";
    if (n === "NotFoundError" || n === "DevicesNotFoundError") return "No microphone found on this device.";
    if (n === "NotReadableError" || n === "TrackStartError") return "Microphone is busy. Close other apps using the mic (calls, recorders), then tap again.";
    return "Error: voice could not start (" + (n || "unknown") + (m ? ": " + m : "") + "). Tap the orb to try again.";
  }
  async function begin() {
    try {
      if (typeof rec !== "undefined" && rec) { try { rec.stop(); } catch (x) {} }
    } catch (x) {}
    try {
      // ask for the mic first, while the tap is still fresh
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw { name: "NoMediaDevices" };
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) {
      set("idle", micMessage(e));
      return;
    }
    try {
      var warm = makeFx();
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        outAn = ctx.createAnalyser(); outAn.fftSize = 1024;
        try { ctx.createMediaElementSource(player).connect(outAn); outAn.connect(ctx.destination); }
        catch (x) { outAn = null; }
      }
      await ctx.resume();
      player.src = SILENCE; player.play().catch(function () {});
      micAn = ctx.createAnalyser(); micAn.fftSize = 1024;
      srcNode = ctx.createMediaStreamSource(stream); srcNode.connect(micAn);
      proc = ctx.createScriptProcessor(4096, 1, 1); srcNode.connect(proc);
      muteNode = ctx.createGain(); muteNode.gain.value = 0; proc.connect(muteNode); muteNode.connect(ctx.destination);
      proc.onaudioprocess = onAudio;
      on = true; paused = false; pre = []; resetUtt(); lastT = performance.now();
      requestAnimationFrame(tick);
      await Promise.race([warm, new Promise(function (r) { setTimeout(r, 1500); })]);
      var hp = on ? playFx("hello") : null;
      if (hp) { set("speak", ""); await hp; }
      if (on && !paused && state !== "listen") listen();
    } catch (e) {
      if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      on = false;
      set("idle", "Error: voice could not start (" + ((e && e.name) || "unknown") + ((e && e.message) ? ": " + e.message : "") + "). Tap the orb to try again.");
    }
  }
  function end() {
    on = false; paused = false; cancelPending(); resetUtt();
    try { if (proc) { proc.onaudioprocess = null; proc.disconnect(); } if (srcNode) srcNode.disconnect(); } catch (e) {}
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    setLevel(0); q("vxPause").textContent = "Pause"; set("idle", "");
  }
  function pause() {
    if (!on) return;
    if (!paused) { paused = true; cancelPending(); resetUtt(); setLevel(0); q("vxPause").textContent = "Resume"; set("idle", ""); }
    else { paused = false; q("vxPause").textContent = "Pause"; pre = []; listen(); }
  }

  function tick(now) {
    if (!on) return;
    var dt = Math.min(100, now - lastT); lastT = now;
    if (!paused && micAn) {
      var mic = level(micAn);
      setLevel((state === "speak" ? (outAn ? level(outAn) : 0.25) : state === "listen" ? mic : 0).toFixed(3));
      if (state === "listen") {
        if (mic > T_ON) { if (!talking) startTalk(); if (!speechStart) speechStart = now; lastVoice = now; }
        else if (talking && speechStart && now - lastVoice > END_MS) submit();
      } else if (state === "think") {
        // you kept talking: forget the early answer and keep listening
        if (!fxPlaying) { if (mic > T_ON) cont += dt; else cont = Math.max(0, cont - dt); }
        if (cont >= 140) { cancelPending(); cont = 0; lastVoice = now; set("listen", ""); }
        else if (fillerArmed && now - thinkSince > 1600) { fillerArmed = false; playFx("fill"); }
      } else if (state === "speak") {
        if (mic > T_BARGE) bargeMs += dt; else bargeMs = Math.max(0, bargeMs - dt * 2);
        if (bargeMs >= 260) {                 // you interrupted
          bargeMs = 0; cancelPending(); startTalk(); speechStart = now - 300; lastVoice = now; cont = 0; set("listen", "");
        }
      }
    }
    requestAnimationFrame(tick);
  }

  function submit() {
    var spoke = lastVoice - speechStart;
    if (spoke < 350) { resetUtt(); return; }          // just a noise
    var my = ++turn, audio = wavB64(utt);
    ctl = (window.AbortController ? new AbortController() : null);
    set("think", ""); thinkSince = performance.now(); fillerArmed = true; cont = 0;
    ask(my, audio, ctl);
  }
  async function ask(my, audio, c) {
    try {
      var name = (LANGS.filter(function (l) { return l[0] === lang; })[0] || [])[1] || "";
      var d = await post("/api/voice", { audio: audio, ext: "wav", history: history, memory: memory, lang: lang, langName: name, mode: MODE, spoken: true }, c && c.signal);
      if (my !== turn) return;
      fillerArmed = false;
      if (!d.reply) { listen(); return; }
      history.push({ role: "user", content: d.user }, { role: "assistant", content: d.reply });
      history = history.slice(-16); save("tsa_voice_history", history);
      if (d.mem && memory.indexOf(d.mem) < 0) { memory.push(d.mem); memory = memory.slice(-30); save("tsa_voice_memory", memory); }
      resetUtt(); pre = [];
      speakAll(sentences(d.say || d.reply), my);
    } catch (e) {
      if (e.name === "AbortError" || my !== turn) return;
      fillerArmed = false; resetUtt();
      set("idle", "Error: " + (navigator.onLine ? e.message : "No internet. I need to be online to talk."));
      setTimeout(function () { if (on && !paused && state === "idle") listen(); }, 3000);
    }
  }
  function sentences(t) {
    t = String(t).replace(/\s+/g, " ").trim();
    var m = t.match(/[^.!?…]+[.!?…]+["')\]]*|[^.!?…]+$/g) || [t], out = [], cur = "";
    m.forEach(function (s) { cur += (cur ? " " : "") + s.trim(); if (cur.length >= 28) { out.push(cur); cur = ""; } });
    if (cur) { if (out.length) out[out.length - 1] += " " + cur; else out.push(cur); }
    if (out.length > 5) out = out.slice(0, 4).concat(out.slice(4).join(" "));
    return out;
  }
  async function speakAll(parts, my) {
    var jobs = [];
    function fetchAt(i) { if (i < parts.length && !jobs[i]) { jobs[i] = post("/api/speak", { text: parts[i], voice: voice }); jobs[i].catch(function () {}); } }
    fetchAt(0); fetchAt(1);
    try {
      if (fxP) await fxP;
      for (var i = 0; i < parts.length; i++) {
        var v = await jobs[i];
        if (my !== turn || !on || paused) return;
        fetchAt(i + 1); fetchAt(i + 2);
        set("speak", "");
        await playB64(v.audio);
        if (my !== turn) return;                 // you interrupted
      }
      if (my === turn && on && !paused) { pre = []; listen(); }
    } catch (e) {
      if (my !== turn) return;
      set("idle", "Error: " + (navigator.onLine ? e.message : "No internet. I need to be online to talk."));
      setTimeout(function () { if (on && !paused && state === "idle") listen(); }, 3000);
    }
  }

  async function post(path, body, signal) {
    var r = await fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: signal });
    var d = {}; try { d = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(d.error || "Request failed");
    return d;
  }

  q("vxOrb").onclick = function () {
    if (!on) begin(); else if (paused) pause(); else if (state === "speak" || state === "think") { cancelPending(); pre = []; listen(); }
  };
  q("vxPause").onclick = pause;
  function close() { end(); ov.hidden = true; q("vxSheet").hidden = true; }
  q("vxEnd").onclick = close;
  q("vxBack").onclick = close;
  open.onclick = function () { ov.hidden = false; if (!on) begin(); };
  document.addEventListener("visibilitychange", function () { if (document.hidden && on && !paused) pause(); });

  /* ---------- settings sheet ---------- */
  var ls = q("vxLang");
  LANGS.forEach(function (l) { ls.appendChild(new Option(l[1], l[0])); });
  ls.value = lang;
  ls.onchange = function () { lang = ls.value; put("tsa_voice_lang", lang); };
  function drawVoices() {
    var sel = q("vxVoice"); sel.innerHTML = "";
    sel.appendChild(new Option("Default voice", ""));
    voices.forEach(function (v) { sel.appendChild(new Option(v.name, v.id)); });
    sel.value = voice; voice = sel.value;
  }
  function setVoice(v) { voice = v; put("tsa_voice_id", v); }
  drawVoices();
  q("vxVoice").onchange = function (e) { setVoice(e.target.value); };
  q("vxGear").onclick = function () { q("vxMsg").textContent = ""; q("vxSheet").hidden = false; };
  q("vxDone").onclick = function () { q("vxSheet").hidden = true; };
  q("vxSheet").onclick = function (e) { if (e.target.id === "vxSheet") e.target.hidden = true; };
  q("vxAdd").onclick = function () {
    var name = q("vxName").value.trim() || "My voice";
    var id = (q("vxId").value.trim().split(/[\/?#]/).filter(Boolean).pop()) || "";
    if (!/^[\w-]{8,64}$/.test(id)) { q("vxMsg").textContent = "That doesn't look like a voice link or ID."; return; }
    voices = voices.filter(function (v) { return v.id !== id; }).concat({ name: name, id: id }); save("tsa_voice_voices", voices);
    setVoice(id); drawVoices(); q("vxName").value = ""; q("vxId").value = ""; q("vxMsg").textContent = "Added. Tap Test voice to hear it.";
  };
  q("vxDel").onclick = function () {
    if (!voice) return;
    voices = voices.filter(function (v) { return v.id !== voice; }); save("tsa_voice_voices", voices); setVoice(""); drawVoices();
  };
  q("vxTest").onclick = async function () {
    q("vxMsg").textContent = "Loading voice…";
    try {
      var v = await post("/api/speak", { text: "Hello! This is how I sound.", voice: voice });
      player.src = "data:audio/mpeg;base64," + v.audio; await player.play(); q("vxMsg").textContent = "";
    } catch (e) { q("vxMsg").textContent = e.message; }
  };
})();