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
    ".vxcard .vxpri{background:var(--c2);color:#fff;border:0}",
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
  var SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
  var TYPES = [["audio/webm;codecs=opus", "webm"], ["audio/mp4", "mp4"], ["audio/ogg", "ogg"]];
  var pick = TYPES.filter(function (t) { return window.MediaRecorder && MediaRecorder.isTypeSupported(t[0]); })[0] || ["", "webm"];
  var mime = pick[0], ext = pick[1];

  var state = "idle", on = false, paused = false, ctx, micAn, outAn, stream, rec, chunks = [];
  var speechStart = 0, lastVoice = 0, turn = 0;
  var buf = new Float32Array(1024);

  function set(s, text) {
    state = s; ov.dataset.s = s;
    if (text !== undefined) { var e = q("vxSt"); e.textContent = text; e.classList.toggle("on", /^(Error|Microphone|No internet)/.test(text)); }
  }
  function level(an) {
    an.getFloatTimeDomainData(buf);
    var sum = 0; for (var i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.min(1, Math.sqrt(sum / buf.length) * 10);
  }
  function setLevel(v) { ov.style.setProperty("--l", v); }

  async function begin() {
    try {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        outAn = ctx.createAnalyser(); outAn.fftSize = 1024;
        ctx.createMediaElementSource(player).connect(outAn);
        outAn.connect(ctx.destination);
      }
      await ctx.resume();
      player.src = SILENCE; player.play().catch(function () {});
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      micAn = ctx.createAnalyser(); micAn.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(micAn);
      on = true; paused = false; listen(); tick();
    } catch (e) {
      set("idle", "Microphone blocked. Allow mic access and tap again.");
    }
  }
  function stopRec() { try { if (rec && rec.state !== "inactive") { rec.onstop = null; rec.stop(); } } catch (e) {} }
  function end() {
    on = false; paused = false; turn++; stopRec();
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    player.pause(); setLevel(0);
    q("vxPause").textContent = "Pause"; set("idle", "");
  }
  function pause() {
    if (!on) return;
    if (!paused) { paused = true; player.pause(); stopRec(); setLevel(0); q("vxPause").textContent = "Resume"; set("idle", ""); }
    else { paused = false; q("vxPause").textContent = "Pause"; listen(); }
  }
  function listen() {
    chunks = []; speechStart = 0;
    rec = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
    rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
    rec.start(); set("listen", "");
  }
  function finish() {
    var spoke = lastVoice - speechStart;
    rec.onstop = function () { if (spoke < 400) listen(); else sendBlob(new Blob(chunks, { type: rec.mimeType })); };
    set("think", ""); rec.stop();
  }
  function tick() {
    if (!on) return;
    var now = performance.now(), mic = level(micAn);
    setLevel((state === "speak" ? level(outAn) : state === "listen" ? mic : 0).toFixed(3));
    if (state === "listen") {
      if (mic > 0.12) { if (!speechStart) speechStart = now; lastVoice = now; }
      else if (speechStart && now - lastVoice > 900) finish();
    } else if (state === "speak" && mic > 0.35) { player.pause(); listen(); }   // you interrupted
    requestAnimationFrame(tick);
  }

  async function post(path, body) {
    var r = await fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    var d = {}; try { d = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(d.error || "Request failed");
    return d;
  }
  function sendBlob(blob) {
    var f = new FileReader();
    f.onload = function () { send(f.result.split(",")[1]); };
    f.readAsDataURL(blob);
  }
  async function send(audio) {
    var my = ++turn;
    try {
      var name = (LANGS.filter(function (l) { return l[0] === lang; })[0] || [])[1] || "";
      var d = await post("/api/voice", { audio: audio, ext: ext, history: history, memory: memory, lang: lang, langName: name, mode: MODE });
      if (my !== turn) return;
      if (!d.reply) { if (on && !paused) listen(); return; }
      history.push({ role: "user", content: d.user }, { role: "assistant", content: d.reply + "\nSAY: " + d.say });
      history = history.slice(-16); save("tsa_voice_history", history);
      if (d.mem && memory.indexOf(d.mem) < 0) { memory.push(d.mem); memory = memory.slice(-30); save("tsa_voice_memory", memory); }
      if (!on || paused) return;
      var v = await post("/api/speak", { text: d.say || d.reply, voice: voice });
      if (my !== turn || !on || paused) return;
      player.src = "data:audio/mpeg;base64," + v.audio;
      set("speak", ""); await player.play();
    } catch (e) {
      set("idle", "Error: " + (navigator.onLine ? e.message : "No internet. I need to be online to talk."));
      if (on && !paused) setTimeout(function () { if (on && !paused) listen(); }, 3000);
    }
  }

  player.onended = function () { if (on && !paused && state === "speak") listen(); };
  q("vxOrb").onclick = function () {
    if (!on) begin(); else if (paused) pause(); else if (state === "speak") { player.pause(); listen(); }
  };
  q("vxPause").onclick = pause;
  function close() { end(); ov.hidden = true; q("vxSheet").hidden = true; }
  q("vxEnd").onclick = close;
  q("vxBack").onclick = close;
  open.onclick = function () { ov.hidden = false; if (!on) begin(); };
  document.addEventListener("visibilitychange", function () { if (document.hidden && on) pause(); });

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
