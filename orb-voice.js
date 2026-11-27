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
  var token = get("tsa_voice_token"), tasks = load("tsa_voice_tasks"), pendingCam = null;

  var LU = {
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
    micOff: '<line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>'
  };   // Lucide icons, drawn inline so they work offline
  function lu(n, sz) { return '<svg class="lu" viewBox="0 0 24 24" width="' + (sz || 16) + '" height="' + (sz || 16) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + LU[n] + '</svg>'; }
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
    ".vxdock{display:flex;justify-content:center;gap:.8rem;padding:0 .8rem 1.1rem}",
    ".vxgb{display:flex;flex-direction:column;align-items:center;gap:.4rem;background:none;border:0;padding:0;min-width:58px}",
    ".vxgb .ic{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,rgba(255,255,255,.24),rgba(255,255,255,.06));-webkit-backdrop-filter:blur(16px) saturate(170%);backdrop-filter:blur(16px) saturate(170%);border:1px solid rgba(255,255,255,.3);box-shadow:0 10px 26px -12px var(--c1),inset 0 1px 0 rgba(255,255,255,.4);transition:transform .15s,box-shadow .6s}",
    ".vxgb:active .ic{transform:scale(.9)}",
    ".vxgb svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}",
    ".vxgb small{font-size:.7rem;color:var(--muted)}",
    "#vxEnd .ic{color:#ff6b6b;background:linear-gradient(145deg,rgba(255,90,90,.3),rgba(255,90,90,.08));border-color:rgba(255,120,120,.45)}",
    "html[data-theme=light] .vxgb .ic{background:linear-gradient(145deg,rgba(255,255,255,.9),rgba(255,255,255,.5));border-color:rgba(60,70,130,.22);box-shadow:0 10px 24px -14px #3b4a7a,inset 0 1px 0 #fff}",
    "#vxFile{display:flex;align-items:center;gap:.4rem;margin:0 auto .8rem;max-width:88%;padding:.4rem .4rem .4rem .9rem;border-radius:999px;font-size:.82rem;background:rgba(255,255,255,.1);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.25)}",
    "#vxFile[hidden]{display:none}",
    "#vxFileN{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    "#vxFileX{width:28px;height:28px;border-radius:50%;border:0;background:rgba(255,255,255,.18);font-size:1rem;line-height:1}",
    "#vxSheet,#vxLog{position:fixed;inset:0;background:#0008;display:flex;align-items:flex-end;justify-content:center;z-index:10000}",
    "#vxSheet[hidden],#vxLog[hidden]{display:none}",
    ".vxrt{display:flex;gap:.5rem}",
    "#vxLogList{max-height:58dvh;overflow:auto;font-size:.9rem;color:var(--muted)}",
    ".vxi{border:1px solid var(--line);border-radius:14px;padding:.6rem .7rem;margin-bottom:.5rem;background:var(--btn);color:inherit}",
    ".vxi small{display:block;color:var(--muted);font-size:.75rem;margin-bottom:.25rem}",
    ".vxi pre{margin:0;white-space:pre-wrap;word-break:break-word;font:inherit;font-size:.9rem;line-height:1.4}",
    ".vxi.code pre{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.78rem}",
    ".vxcard .vxcp{display:flex;gap:.4rem;margin-top:.45rem}",
    ".vxcard .vxcp button{flex:none;padding:.4rem .75rem;border-radius:10px;background:transparent}",
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
    ".vxname{font-weight:600;font-size:1.05rem}",
    "#vxCam{position:fixed;inset:0;z-index:10001;background:#05060b;display:flex;flex-direction:column;color:#e8eaf2}",
    "#vxCam[hidden]{display:none}",
    "#vxCamV{flex:1;min-height:0;width:100%;object-fit:cover;background:#000}",
    ".vxcb{padding:.8rem 1rem calc(.8rem + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:.5rem;background:#0b0e1d}",
    "#vxCamTxt{font-size:.9rem;color:#98a0c0;min-height:1.2em}",
    "#vxCamOut{font-size:.95rem;line-height:1.4;max-height:26dvh;overflow:auto;white-space:pre-wrap}",
    "#vxCam input{width:100%;border:1px solid #2a315a;background:#11152b;color:inherit;border-radius:12px;padding:.7rem .8rem;font:inherit}",
    "#vxCam button{flex:1;padding:.8rem;border-radius:999px;border:1px solid #2a315a;background:#11152b;color:inherit;font:inherit}",
    "#vxCam .vxpri{background:#2f6bff;border:0;color:#fff}",
    "#vxState{display:flex;align-items:center;justify-content:center;gap:.5rem;margin:0 auto .7rem;padding:.4rem .95rem;border-radius:999px;font-size:.85rem;background:rgba(255,255,255,.1);border:1px solid var(--line);width:max-content;max-width:90%}",
    "#vxState i{width:9px;height:9px;border-radius:50%;background:#19d3c5;box-shadow:0 0 8px #19d3c5;flex:none}",
    "#vxOv[data-s=think] #vxState i{background:#a56bff;box-shadow:0 0 8px #a56bff}",
    "#vxOv[data-s=speak] #vxState i{background:#ff8a3d;box-shadow:0 0 8px #ff8a3d}",
    "#vxState.off i{background:#ff6b6b;box-shadow:none}",
    ".vxcard .vxseg button.act{background:var(--c2);color:#fff;border-color:transparent}",
    ".vxf{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.35rem 0;border-bottom:1px solid var(--line)}",
    ".vxf span{flex:1;min-width:0;overflow-wrap:anywhere}",
    ".vxcard .vxf button{flex:none;padding:.25rem .65rem;border-radius:10px;font-size:.75rem}",
    ".vxcard .vxseg button,.vxcard .vxf button{display:inline-flex;align-items:center;justify-content:center;gap:.4rem}",
    ".lu{vertical-align:-2px;flex:none}"
  ].join("");
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ---------- page pieces ---------- */
  function gb(id, label, svg) { return '<button class="vxgb" id="' + id + '"><span class="ic"><svg viewBox="0 0 24 24">' + svg + '</svg></span><small id="' + id + 'L">' + label + '</small></button>'; }
  var ov = document.createElement("div");
  ov.id = "vxOv"; ov.hidden = true; ov.dataset.s = "idle";
  ov.innerHTML =
    '<div class="vxtop">' +
      '<button class="vxib" id="vxBack" aria-label="Back to chat"><svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg></button>' +
      '<div class="vxname">Tender Sprout AI</div>' +
      '<div class="vxrt">' +
        '<button class="vxib" id="vxTextBtn" aria-label="Text and copy"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg></button>' +
        '<button class="vxib" id="vxGear" aria-label="Voice settings"><svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg></button>' +
      '</div>' +
    '</div>' +
    '<div class="vxmid"><div class="vxw"><span class="vxring"></span><span class="vxring vxr2"></span>' +
      '<button class="vxorb" id="vxOrb" aria-label="Tap to talk"><i></i><i></i><i></i></button></div></div>' +
    '<p id="vxState" class="off" role="status" aria-live="polite"><i></i><span id="vxStateT">Tap the orb to talk</span></p>' +
    '<p id="vxSt"></p>' +
    '<div id="vxFile" hidden><span id="vxFileN"></span><button id="vxFileX" aria-label="Remove file">\u00d7</button></div>' +
    '<input type="file" id="vxFileIn" multiple hidden>' +
    '<div class="vxdock">' +
      gb("vxCamBtn", "Camera", '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>') +
      gb("vxFileBtn", "File", '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>') +
      gb("vxMsgBtn", "Messages", '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>') +
      gb("vxPause", "Mute", LU.mic) +
      gb("vxEnd", "End", '<path d="M18 6 6 18M6 6l12 12"/>') +
    '</div>' +
    '<div id="vxSheet" hidden><div class="vxcard">' +
      '<h3>Voice settings</h3>' +
      '<label>Language</label><select id="vxLang" aria-label="Language"></select>' +
      '<label>Voice</label><select id="vxVoice" aria-label="Voice"></select>' +
      '<label>Voice volume: <span id="vxVolV"></span></label><input type="range" id="vxVol" min="50" max="300" step="10" aria-label="Voice volume">' +
      '<div class="vxseg"><button id="vxTest">Test voice</button><button id="vxDel">Remove</button></div>' +
      '<label>How long I wait when you pause</label>' +
      '<div class="vxseg" id="vxPat"><button data-p="quick">Quick</button><button data-p="normal">Normal</button><button data-p="patient">Patient</button></div>' +
      '<p class="vxhelp">Patient waits longer, so I do not cut in while you are thinking.</p>' +
      '<label>Add a voice</label>' +
      '<input id="vxName" placeholder="Name (for example Sarah)" autocomplete="off">' +
      '<input id="vxId" placeholder="Paste Fish voice link or ID" autocomplete="off">' +
      '<button id="vxAdd">Add voice</button>' +
      '<p class="vxhelp">On fish.audio, open a voice you like and copy its link from the browser.</p>' +
      '<label>What I remember</label><div id="vxMem" class="vxhelp"></div>' +
      '<div class="vxseg"><button id="vxMemClr">Forget our talks</button><button id="vxTaskClr">Clear plans</button></div>' +
      '<div class="vxseg"><button id="vxLogClr">'+lu("trash", 15)+' Delete text log</button><button id="vxAllClr">'+lu("trash", 15)+' Delete all voice data</button></div>' +
      '<div id="vxMsg"></div>' +
      '<button class="vxpri" id="vxDone">Done</button>' +
    '</div></div>' +
    '<div id="vxLog" hidden><div class="vxcard">' +
      '<h3>Text</h3>' +
      '<div id="vxLogList"></div>' +
      '<div class="vxseg"><button id="vxLogChat">Open chat</button><button id="vxLogClear">Clear</button></div>' +
      '<button class="vxpri" id="vxLogDone">Done</button>' +
    '</div></div>' +
    '<div id="vxCam" hidden>' +
      '<video id="vxCamV" playsinline muted autoplay></video>' +
      '<div class="vxcb">' +
        '<div id="vxCamTxt"></div><div id="vxCamOut"></div>' +
        '<input id="vxCamQ" placeholder="Ask about it (optional), e.g. solve this" autocomplete="off">' +
        '<div class="vxseg"><button class="vxpri" id="vxCamLook">Look</button><button id="vxCamFlip">Flip</button><button id="vxCamClose">Close</button></div>' +
      '</div>' +
    '</div>' +
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
  var T_ON = 0.12, T_BARGE = 0.16;      // how loud counts as "you are talking" / "you are interrupting"
  var END_MS = 700;                     // (kept for reference) the real wait now comes from PATS below
  var PATS = { quick: [500, 800], normal: [700, 1000], patient: [1100, 1500] };   // [silence that ends a turn, same after very short speech] in ms
  var pat = get("tsa_voice_pat"); if (!PATS[pat]) pat = "normal";
  var padMs = 0;                        // grows a little when you often pause mid-thought, shrinks when you speak in full sentences
  var PRE_BLOCKS = 6;                   // keeps the last half second so first words are never lost

  var state = "idle", on = false, paused = false, turn = 0;
  var ctx, micAn, outAn, stream, srcNode, proc, muteNode, ctl = null, stopFn = null, fxP = null, fxPlaying = false;
  var pre = [], utt = [], talking = false, speechStart = 0, lastVoice = 0, cont = 0, bargeMs = 0, lastT = 0, fillerArmed = false;
  var buf = new Float32Array(1024);
  var auto = 1, gainNode = null, vol = parseInt(get("tsa_voice_vol"), 10) || 100;
  var held = "", holds = 0, holdT = null, bcT = null, lastAck = "";
  var job = null, carry = "", pendingUser = "", lastOut = 0;   // job = the task being worked on (what you asked, what was said, what is left)
  var clipN = 0, clipGen = 0, lastClipEnd = 0, fillN = 0, nextFill = 0, listenSince = 0, nudged = false, early = false;   // words kept when you pause mid-thought
  var SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";   // tiny silent clip that unlocks audio playback on phones

  /* --- the Text screen: everything said, with Copy buttons (and full code, memos, lesson plans made by voice) --- */
  var log = load("tsa_voice_log");
  function saveLog() {
    var keep = log.slice(-30).map(function (e) { return { who: e.who, title: e.title || "", text: String(e.text || "").slice(0, 20000), code: !!e.code }; });
    save("tsa_voice_log", keep);
  }
  function addLog(who, text, title, code) {
    text = String(text || "").trim(); if (!text) return;
    log.push({ who: who, text: text, title: title || "", code: !!code });
    if (log.length > 30) log = log.slice(-30);
    saveLog();
    if (!q("vxLog").hidden) renderLog();
  }
  function copyTxt(t, btn) {
    function done() { if (btn) { var o = btn.getAttribute("data-l") || btn.textContent; btn.setAttribute("data-l", o); btn.textContent = "Copied"; setTimeout(function () { btn.textContent = o; }, 1200); } }
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = t; ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); done();
    }
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(done, fallback); return; } } catch (e) {}
    fallback();
  }
  function codeOf(t) {
    var re = /```[a-zA-Z0-9]*\n([\s\S]*?)```/g, m, out = [];
    while ((m = re.exec(t))) out.push(m[1].replace(/\n$/, ""));
    return out.join("\n\n");
  }
  function renderLog() {
    var list = q("vxLogList"); list.innerHTML = "";
    if (!log.length) { list.textContent = "Nothing yet. What you and the AI say will show here, and you can copy it."; return; }
    log.forEach(function (e) {
      var d = document.createElement("div"); d.className = "vxi" + (e.code ? " code" : "");
      var sm = document.createElement("small"); sm.textContent = (e.who === "you" ? "You" : "Tender Sprout AI") + (e.title ? " · " + e.title : "");
      var pr = document.createElement("pre"); pr.textContent = e.text;
      d.appendChild(sm); d.appendChild(pr);
      if (e.who !== "you") {
        var row = document.createElement("div"); row.className = "vxcp";
        var cb = document.createElement("button"); cb.textContent = "Copy"; cb.onclick = function () { copyTxt(e.text, cb); };
        row.appendChild(cb);
        var cd = e.code ? "" : codeOf(e.text);
        if (cd) { var cc = document.createElement("button"); cc.textContent = "Copy code"; cc.onclick = function () { copyTxt(cd, cc); }; row.appendChild(cc); }
        d.appendChild(row);
      }
      list.appendChild(d);
    });
    list.scrollTop = list.scrollHeight;
  }

  function pLabel(t) { var e = q("vxPauseL"); if (e) e.textContent = t; var b = q("vxPause"), sv = b && b.querySelector("svg"); if (sv) sv.innerHTML = (t === "Unmute") ? LU.micOff : LU.mic; }
  function set(s, text) {
    state = s; ov.dataset.s = s; showState();
    if (text !== undefined) { var e = q("vxSt"); e.textContent = text; e.classList.toggle("on", /^(Error|Microphone|No internet|No microphone)/.test(text)); }
  }
  /* the pill under the orb: always says whether the mic is live, thinking, speaking or off */
  function showState() {
    var t = q("vxStateT"), p = q("vxState"); if (!t || !p) return;
    var off = !on || paused || state === "idle";
    t.textContent = !on ? "Tap the orb to talk" : paused ? "Mic is off \u00b7 tap Unmute" : state === "listen" ? "Listening" : state === "think" ? "Thinking\u2026" : state === "speak" ? "Speaking \u00b7 talk to interrupt" : "Ready \u00b7 tap the orb";
    p.classList.toggle("off", off);
  }
  function muteTracks(m) { try { if (stream) stream.getAudioTracks().forEach(function (t) { t.enabled = !m; }); } catch (e) {} }   // a real mute: the mic sends silence while muted
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
      levelOf(b64).then(function (m) {
        if (done) return;
        auto = m; applyVol();
        player.src = "data:audio/mpeg;base64," + b64;
        player.play().catch(fin);
      });
    });
  }
  function stopPlayback() { try { player.pause(); } catch (e) {} if (stopFn) { var f = stopFn; stopFn = null; f(); } }

  /* --- short spoken reactions ("Mm-hm", "Oh nice!", "Good question."), made once per voice and kept on the phone --- */
  var HELLOS = ["Hey there! What can I do for you today?", "Hi! What are we working on today?", "Hello! How can I help you today?", "Hey, good to hear from you. What can I do for you?", "Hi there! What would you like to do today?", "Hey! What's on your mind today?"];
  var ACKS = {
    wait: ["Let me think about that.", "One moment.", "Let me check."],
    ask:  ["Good question.", "Sure."],
    task: ["Sure thing.", "Alright, on it."],
    wait2: ["Almost there.", "Just a little more.", "Thanks for waiting."],
    work: ["Sure, I'll put that in your chat.", "On it. Give me a moment."],
    ready: ["It's ready. Tap the text button to copy it.", "Done. You can copy it from the text button."],
    good: ["Oh nice!", "That's great!", "Oh wow, nice."],
    sad:  ["Aww.", "Oh no.", "Hmm, I'm sorry to hear that."]
  };
  function allLines() { var a = HELLOS.slice(); Object.keys(ACKS).forEach(function (c) { a = a.concat(ACKS[c]); }); return a; }
  function fxKey() { return "tsa_voice_fx2_" + (voice || "default"); }
  var fxMem = null, fxBusy = {};
  function fxLoad() {
    var k = fxKey(); if (fxMem && fxMem.k === k) return fxMem.v;
    var v = {}; try { v = JSON.parse(localStorage.getItem(k)) || {}; } catch (e) {}
    try { localStorage.removeItem("tsa_voice_fx_" + (voice || "default")); } catch (e) {}
    fxMem = { k: k, v: v }; return v;
  }
  function ensureFx() {                      // returns a promise that is ready as soon as the "I'm listening" clip exists
    var k = fxKey(), store = fxLoad();
    var todo = allLines().filter(function (t) { return !store[t]; });
    todo.sort(function () { return Math.random() - 0.5; });
    todo.sort(function (a, b) { return (HELLOS.indexOf(b) >= 0) - (HELLOS.indexOf(a) >= 0); });
    if (!todo.length) return Promise.resolve();
    if (fxBusy[k]) return fxBusy[k];
    var helloDone, helloP = HELLOS.some(function (h) { return store[h]; }) ? Promise.resolve() : new Promise(function (r) { helloDone = r; });
    fxBusy[k] = helloP;
    function next() {
      var t = todo.shift(); if (!t) return Promise.resolve();
      return post("/api/speak", { text: t, voice: voice }).then(function (r) {
        store[t] = r.audio; try { localStorage.setItem(k, JSON.stringify(store)); } catch (e) {}
        if (HELLOS.indexOf(t) >= 0 && helloDone) helloDone();
      }).catch(function () {}).then(next);
    }
    Promise.all([next(), next()]).then(function () { delete fxBusy[k]; if (helloDone) helloDone(); });
    return helloP;
  }
  function playClip(audio) {                 // clips play one after another, never on top of each other
    if (!audio) return null;
    var g = clipGen; clipN++; fxPlaying = true;
    fxP = (fxP || Promise.resolve()).then(function () { return g === clipGen ? playB64(audio) : null; }).then(function () {
      if (g !== clipGen) return;
      lastClipEnd = performance.now(); clipN = Math.max(0, clipN - 1);
      if (!clipN) { fxPlaying = false; fxP = null; if (state === "listen" && !talking) pre = []; }   // forget what the mic heard while the reaction played
    });
    return fxP;
  }
  function cancelClips() { clipGen++; clipN = 0; fxP = null; fxPlaying = false; stopPlayback(); }
  function pickHello() {                    // a different opening line each time you open it
    var store = fxLoad(), last = get("tsa_voice_lasthello");
    var all = HELLOS.filter(function (h) { return store[h]; });
    var opts = all.filter(function (h) { return h !== last; });
    if (!opts.length) opts = all;
    if (!opts.length) return null;
    var h = opts[Math.floor(Math.random() * opts.length)]; put("tsa_voice_lasthello", h);
    return store[h];
  }
  function armFiller(ms) { fillerArmed = true; fillN = 0; nextFill = performance.now() + ms; }
  function pickFrom(kind, skipRandom) {
    if (!kind) return null;
    if (!skipRandom && Math.random() > 0.3) return null;          // mostly just answer, like a real person
    var store = fxLoad();
    var opts = (ACKS[kind] || []).filter(function (t) { return store[t] && t !== lastAck; });
    if (!opts.length) return null;
    var t = opts[Math.floor(Math.random() * opts.length)]; lastAck = t;
    return { text: t, audio: store[t] };
  }
  /* what kind of reaction fits what you just said */
  function classify(text) {
    var s = text.toLowerCase().replace(/\s+/g, " ").trim(), words = s.split(" ").length;
    if (/^(hi|hello|hey|good (morning|afternoon|evening)|thanks?|thank you|bye|goodbye|ok|okay|yes|no|yeah|yep|nope|please)\b[.!?, ]*$/.test(s)) return "";
    if (/\b(sorry|sad|tired|sick|died|passed away|failed|lost my|stressed|worried|bad day|angry|upset|hurt|crying|scared|lonely|headache|hungry)\b/.test(s)) return "sad";
    if (/\b(i passed|i won|promoted|graduat|my birthday|excited|so happy|finally|good news|congrat|got the job|got admission)\b/.test(s)) return "good";
    if (/^(please |can you |could you |kindly |i want you to |i need you to )?(tell me|explain|teach|show|give me|make|create|write|help me|quiz|solve|list|translate|summari[sz]e|prepare|plan|set)\b/.test(s) || /\b(lesson plan|quiz me|test me)\b/.test(s)) return "task";
    if (/\?$/.test(s) || /^(what|why|how|who|when|where|which|can|could|is|are|do|does|did|will|would|should)\b/.test(s)) return "ask";
    return words >= 4 ? "ok" : "";
  }
  /* did you stop mid-thought? (ends with "and", "but", "so", "um", "...", a comma, and so on) */
  var HANG = ["and", "but", "so", "because", "or", "the", "a", "an", "to", "of", "with", "for", "in", "on", "at", "that", "if", "when", "my", "your", "um", "uh", "umm", "uhh", "hmm", "like", "then", "also", "i'm", "it's", "why", "about", "from", "than", "which",
    "et", "mais", "donc", "parce", "car", "ou", "le", "la", "les", "un", "une", "de", "du", "des", "\u00e0", "au", "avec", "pour", "que", "qui", "si", "quand", "mon", "ma", "mes", "dans", "sur", "puis", "alors", "euh", "ben", "bah",
    "na", "anaa", "nanso", "efis\u025b", "s\u025b"];
  function incomplete(t) {
    t = t.trim(); if (!t) return false;
    if (/(\.\.\.|…|[,;:\-–—])\s*$/.test(t)) return true;
    var w = t.toLowerCase().replace(/[.?!"')\]]+$/, "").split(/\s+/), last = w[w.length - 1];
    if (w.length === 1) return /^(um+|uh+|hmm+|mm+|m+h?m+|emm+|erm+|ehm+|er+|ah+)$/.test(last);
    return HANG.indexOf(last) >= 0;
  }
  /* asking for code, a PDF, a lesson plan, a letter...: the chat makes it properly, and you can copy it from the Text screen */
  var W_VERB = /\b(make|create|write|generate|build|draft|prepare|design|compose|produce|give me|develop|code me)\b/;
  var W_OBJ = /\b(pdf|code|html|css|javascript|python|website|web ?page|landing page|script|program|app|lesson plan|lesson notes|scheme of work|exam paper|test paper|worksheet|memo|letter|email|essay|report|notice|speech|slides|powerpoint|presentation|timetable|certificate)\b/;
  function isWork(t) {
    var s = t.toLowerCase();
    return (W_VERB.test(s) && W_OBJ.test(s)) || /\b(as|in|into|to) (a )?(pdf|word document)\b/.test(s) || /\b(show|give|send) me (the|that|this) code\b/.test(s);
  }
  function dropHeld() { held = ""; holds = 0; clearTimeout(holdT); clearTimeout(bcT); }
  function armHold() {                       // you paused mid-thought and never came back: answer what we have
    clearTimeout(holdT);
    holdT = setTimeout(function () {
      if (held && on && !paused && state === "listen" && !talking) {
        var my = ++turn; ctl = (window.AbortController ? new AbortController() : null);
        set("think", ""); respond(my, held);
      }
    }, 4500);
  }
  /* you paused or said "emm...": after a short wait, say "okay, I'm listening" so you know it is still with you */
  function armBC() { clearTimeout(bcT); }          // stay quiet while you think. It waits for you.

  /* --- remembering the job when you interrupt --- */
  var STOPRE = /^(ok(ay)?[, ]*)?(stop|wait|hold on|hold up|pause|enough|cancel|never ?mind|be quiet|quiet|shut up)\b[ .!,]*$/i;
  function markInterrupted() {
    if (!job || job.done) return;
    job.interrupted = true;
    var i = Math.max(0, Math.min(job.parts.length, job.idx));
    job.heard = job.parts.slice(0, i + 1).join(" ");
    job.unsaid = job.parts.slice(i + 1).join(" ");
    // fix the memory: the AI should know you did NOT hear all of it
    for (var k = history.length - 1; k >= 0; k--) {
      if (history[k].role === "assistant") { history[k] = { role: "assistant", content: job.heard + " [I was interrupted here. The rest was not heard.]" }; break; }
    }
    save("tsa_voice_history", history);
  }
  function jobContext(newText) {          // sent to the server so it knows what you were doing before you cut in
    if (!job || job.done) return null;
    return { task: job.task, heard: (job.heard || "").slice(0, 500), unsaid: (job.unsaid || "").slice(0, 500), interrupted: !!job.interrupted, stopOnly: STOPRE.test(newText.trim()) };
  }

  /* --- turn taking --- */
  function resetUtt() { talking = false; utt = []; speechStart = 0; cont = 0; }
  function listen() { resetUtt(); bargeMs = 0; fillerArmed = false; clearTimeout(bcT); listenSince = performance.now(); nudged = false; set("listen", ""); }
  function startTalk() { talking = true; utt = pre.slice(); pre = []; clearTimeout(holdT); clearTimeout(bcT); if (fxPlaying) cancelClips(); }
  function cancelPending() { turn++; if (ctl) { try { ctl.abort(); } catch (e) {} ctl = null; } fillerArmed = false; cancelClips(); }

  function micMessage(e) {
    var n = (e && e.name) || "", m = (e && e.message) || "";
    if (!window.isSecureContext) return "Microphone blocked. This page must open over https.";
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return "Microphone blocked. This browser can't use the mic here. Open the site in Chrome or Safari.";
    if (n === "NotAllowedError" || n === "PermissionDeniedError" || n === "SecurityError") return "Microphone blocked. Allow mic access for this site in your phone/browser settings, then tap the orb again.";
    if (n === "NotFoundError" || n === "DevicesNotFoundError") return "No microphone found on this device.";
    if (n === "NotReadableError" || n === "TrackStartError") return "Microphone is busy. Close other apps using the mic (calls, recorders), then tap again.";
    return "Error: voice could not start (" + (n || "unknown") + (m ? ": " + m : "") + "). Tap the orb to try again.";
  }
  function levelOf(b64) {                   // how much to lift or lower this clip so every voice sounds equally loud
    if (!ctx || !gainNode) return Promise.resolve(1);
    try {
      var bin = atob(b64), u = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return ctx.decodeAudioData(u.buffer).then(function (buf) {
        var d = buf.getChannelData(0), n = d.length, step = Math.max(1, Math.floor(n / 20000)), sum = 0, c = 0;
        for (var k = 0; k < n; k += step) { sum += d[k] * d[k]; c++; }
        var rms = Math.sqrt(sum / (c || 1));
        return rms > 0.001 ? Math.max(0.5, Math.min(4, 0.12 / rms)) : 1;
      }).catch(function () { return 1; });
    } catch (e) { return Promise.resolve(1); }
  }
  function applyVol() { if (gainNode) gainNode.gain.value = vol / 100 * auto; }
  function initAudio() {                     // voice goes: player -> (meter) -> volume -> limiter -> speaker
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    outAn = ctx.createAnalyser(); outAn.fftSize = 1024;
    try {
      gainNode = ctx.createGain(); applyVol();
      var lim = ctx.createDynamicsCompressor();
      ctx.createMediaElementSource(player).connect(outAn);
      outAn.connect(gainNode); gainNode.connect(lim); lim.connect(ctx.destination);
    } catch (x) { outAn = null; gainNode = null; }
  }
  async function begin(quiet) {
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
      var warm = ensureFx();
      initAudio();
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
      var hp = on && !quiet ? playClip(pickHello()) : null;
      if (hp) { set("speak", ""); await hp; }
      if (on && !paused && state !== "listen") listen();
    } catch (e) {
      if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      on = false;
      set("idle", "Error: voice could not start (" + ((e && e.name) || "unknown") + ((e && e.message) ? ": " + e.message : "") + "). Tap the orb to try again.");
    }
  }
  function end() {
    on = false; paused = false; padMs = 0; cancelPending(); resetUtt(); dropHeld(); job = null; carry = ""; pendingUser = "";
    try { if (proc) { proc.onaudioprocess = null; proc.disconnect(); } if (srcNode) srcNode.disconnect(); } catch (e) {}
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    setLevel(0); pLabel("Mute"); set("idle", "");
  }
  function pause() {
    if (!on) return;
    if (!paused) { paused = true; cancelPending(); resetUtt(); dropHeld(); setLevel(0); pLabel("Unmute"); muteTracks(true); set("idle", ""); }
    else { paused = false; pLabel("Mute"); muteTracks(false); pre = []; listen(); }
  }

  function tick(now) {
    if (!on) return;
    var dt = Math.min(100, now - lastT); lastT = now;
    if (!paused && micAn) {
      var mic = level(micAn);
      setLevel((state === "speak" ? (outAn ? level(outAn) : 0.25) : state === "listen" ? mic : 0).toFixed(3));
      if (state === "listen") {
        if (mic > (fxPlaying ? T_BARGE : T_ON)) { if (!talking) startTalk(); if (!speechStart) speechStart = now; lastVoice = now; }
        else if (talking && speechStart && now - lastVoice > ((lastVoice - speechStart) < 1200 ? PATS[pat][1] : PATS[pat][0]) + padMs) submit();
      } else if (state === "think") {
        // you kept talking: forget the early answer and keep listening
        if (!fxPlaying) { if (mic > T_ON) cont += dt; else cont = Math.max(0, cont - dt); }
        if (cont >= 140) { if (pendingUser) { carry = pendingUser; } cancelPending(); cont = 0; lastVoice = now; set("listen", ""); }
        else if (fillerArmed && !fxPlaying && now >= nextFill) {     // still working: a short "let's see..." now and then
          fillN++; var fl = pickFrom(fillN === 1 ? "wait" : "wait2", true);
          if (fl) playClip(fl.audio);
          if (fillN >= 4) fillerArmed = false; else nextFill = now + 4500;
        }
      } else if (state === "speak") {
        lastOut = outAn ? level(outAn) : 0;
        var bt = T_BARGE + lastOut * 0.35;   // louder AI voice = a little higher bar, so its own echo never counts as you
        if (mic > bt) bargeMs += dt; else bargeMs = Math.max(0, bargeMs - dt * 2);
        if (bargeMs >= 180) {                 // you interrupted
          bargeMs = 0; markInterrupted(); cancelPending(); startTalk(); speechStart = now - 300; lastVoice = now; cont = 0; set("listen", "");
        }
      }
    }
    requestAnimationFrame(tick);
  }

  function submit() {
    var spoke = lastVoice - speechStart;
    if (spoke < 350) { resetUtt(); if (held) armHold(); return; }          // just a noise
    var my = ++turn, audio = wavB64(utt);
    ctl = (window.AbortController ? new AbortController() : null);
    set("think", ""); cont = 0; early = false;
    armFiller(6500);
    transcribe(my, audio, ctl);
  }
  /* step 1: turn your voice into words, and decide if you are really finished */
  async function transcribe(my, audio, c) {
    try {
      var name = (LANGS.filter(function (l) { return l[0] === lang; })[0] || [])[1] || "";
      var d = await post("/api/voice", { audio: audio, ext: "wav", lang: lang, langName: name, sttOnly: true }, c && c.signal);
      if (my !== turn) return;
      var heard = String(d.user || "").trim();
      if (!heard) { if (held) respond(my, held); else listen(); return; }
      var full = (held ? held + " " : "") + heard;
      if (holds < 2 && incomplete(full)) {          // still thinking out loud: keep listening and join the next part
        held = full; holds++; padMs = Math.min(600, padMs + 200); resetUtt(); pre = []; listen(); armHold(); armBC(); return;
      }
      respond(my, full);
    } catch (e) {
      if (e.name === "AbortError" || my !== turn) return;
      fillerArmed = false; resetUtt();
      set("idle", "Error: " + (navigator.onLine ? e.message : "No internet. I need to be online to talk."));
      setTimeout(function () { if (on && !paused && state === "idle") listen(); }, 3000);
    }
  }
  /* step 2: react like a person while the answer is being thought up */
  function respond(my, text) {
    var shownText = text;
    if (carry) { text = "(Before you answered I had asked: \"" + carry + "\". I interrupted and now add:) " + text; carry = ""; }
    pendingUser = shownText; padMs = Math.max(0, padMs - 100);
    dropHeld(); resetUtt(); pre = [];
    if (localCmd(my, shownText)) return;
    if (doc && doc.kind === "img" && !CAMRE.test(text)) { lookDoc(my, shownText); return; }
    if (isWork(text) && window.tsaVoice && window.tsaVoice.work) { handleWork(my, text); return; }
    if (CAMRE.test(text)) { addLog("you", text); var ca = pickFrom("task", true); if (ca) playClip(ca.audio); openCam("", true); return; }
    var ack = early ? null : pickFrom(classify(text));
    if (ack) playClip(ack.audio);
    armFiller(6500); cont = 0;
    ask(my, text, ack ? ack.text : "", ctl, shownText);
  }
  async function handleWork(my, text) {
    var V = window.tsaVoice;
    addLog("you", text);
    var a = pickFrom("work", true); if (a) playClip(a.audio);
    armFiller(6500); cont = 0;
    var r;
    try { r = await V.work(text); } catch (e) { r = { ok: false, why: String((e && e.message) || e) }; }
    fillerArmed = false;
    if (r && r.ok) {
      (r.blocks || []).forEach(function (b) { addLog("ai", b.text, b.title, b.code); });
      if (r.pdf) addLog("ai", "Your PDF \"" + r.pdf + "\" is ready. Open your chat and tap the PDF link, then Save as PDF.", "PDF");
      history.push({ role: "user", content: text }, { role: "assistant", content: "I made it in the chat." });
      history = history.slice(-40); save("tsa_voice_history", history);
    }
    if (my !== turn || !on) return;
    if (r && r.ok) {
      var rd = pickFrom("ready", true);
      if (fxP) await fxP;
      if (my !== turn || !on) return;
      if (rd) { set("speak", ""); await playClip(rd.audio); }
      if (my === turn && on && !paused) { pre = []; listen(); }
    } else {
      set("idle", "Error: " + ((r && r.why) || "that did not work"));
      setTimeout(function () { if (on && !paused && state === "idle") listen(); }, 3500);
    }
  }
  async function ask(my, text, ack, c, shown) {
    try {
      var name = (LANGS.filter(function (l) { return l[0] === lang; })[0] || [])[1] || "";
      var V = window.tsaVoice;                                   // the main app (chat + memory), when it is there
      var mem = (V && V.notes) ? V.notes() : memory;
      var d = await post("/api/voice", { text: text, ack: ack, history: history.slice(-12), memory: mem, lang: lang, langName: name, mode: MODE, spoken: true, doc: docPayload(), job: jobContext(shown || text), now: new Date().toLocaleString(), tasks: tasks, device: {}, extra: { offset: new Date().getTimezoneOffset() } }, c && c.signal);
      if (my !== turn) return;
      fillerArmed = false; pendingUser = "";
      if (!d.reply) { listen(); return; }
      history.push({ role: "user", content: text }, { role: "assistant", content: doc ? String(d.reply).slice(0, 1500) : d.reply });
      history = history.slice(-40); save("tsa_voice_history", history);
      (d.actions || []).forEach(applyAct);
      if (V && V.turn) { try { V.turn(shown || text, d.reply); } catch (e) {} }          // show it in the chat
      addLog("you", shown || text); addLog("ai", d.reply, doc ? doc.name : "");
      if (d.long || (doc && String(d.reply).length > 280)) openLog();          // long answer: show it in the pop-up so you can read and copy it
      if (d.mem) {
        if (V && V.remember) { try { V.remember(d.mem); } catch (e) {} }        // save it in Memory & Learning
        else if (memory.indexOf(d.mem) < 0) { memory.push(d.mem); memory = memory.slice(-30); save("tsa_voice_memory", memory); }
      }
      resetUtt(); pre = [];
      var ps = sentences(d.say || d.reply);
      var amend = job && !job.done && (job.interrupted || /^(and|also|but|no|actually|instead|change|make it|use|use the)\b/i.test((shown || text).trim()));
      job = { task: amend ? job.task + " | then user said: " + (shown || text) : (shown || text), parts: ps, idx: 0, done: false, interrupted: false, heard: "", unsaid: "" };
      speakAll(ps, my);
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
        if (job) job.idx = i;
        await playB64(v.audio);
        if (my !== turn) return;                 // you interrupted
      }
      if (job) { job.done = true; }
      if (pendingCam && my === turn && on) { var pc = pendingCam; pendingCam = null; openCam(pc.q, true); return; }
      if (my === turn && on && !paused) { pre = []; listen(); }
    } catch (e) {
      if (my !== turn) return;
      set("idle", "Error: " + (navigator.onLine ? e.message : "No internet. I need to be online to talk."));
      setTimeout(function () { if (on && !paused && state === "idle") listen(); }, 3000);
    }
  }

  /* talking to the Jarvis server: it is locked with your passcode, so sign in once (the phone remembers it for 30 days) */
  var loginP = null, loginAsked = false;
  function signIn() {
    if (loginP) return loginP;
    loginAsked = true;
    loginP = (async function () {
      var pc = window.prompt("Enter your Jarvis passcode (the same one you use to open Jarvis):");
      if (!pc) throw new Error("Passcode needed. Tap the orb to try again.");
      var r = await fetch(API + "/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc }) });
      var d = {}; try { d = await r.json(); } catch (e) {}
      if (!r.ok || !d.token) throw new Error(d.error || "Could not sign in (" + r.status + ")");
      token = d.token; put("tsa_voice_token", token);
    })();
    var clear = function () { loginP = null; };
    loginP.then(clear, clear);
    return loginP;
  }
  async function post(path, body, signal, opt) {
    for (var tries = 0; tries < 2; tries++) {
      if (!token && opt && opt.quiet && loginAsked) throw new Error("Not signed in");
      var h = { "Content-Type": "application/json" }; if (token) h.Authorization = "Bearer " + token;
      var r = await fetch(API + path, { method: "POST", headers: h, body: JSON.stringify(body), signal: signal });
      var d = {}; try { d = await r.json(); } catch (e) {}
      if (r.status === 401 && tries === 0) { token = ""; put("tsa_voice_token", ""); await signIn(); continue; }
      if (!r.ok) throw new Error(d.error || ("Request failed (" + r.status + ")"));
      return d;
    }
  }
  window.tsaJarvis = { search: function (query) { return post("/api/search", { query: query }, null, { quiet: true }); } };

  /* ---------- plans the AI writes down for you ---------- */
  function applyAct(a) {
    if (!a) return;
    if (a.action === "task_add" && a.task) tasks = tasks.concat(a.task);
    else if (a.action === "task_done") tasks = tasks.map(function (t) { return t.id === a.id ? { id: t.id, text: t.text, done: true } : t; });
    else if (a.action === "task_remove") tasks = tasks.filter(function (t) { return t.id !== a.id; });
    else if (a.action === "look") { pendingCam = { q: String(a.question || "") }; return; }
    else return;
    save("tsa_voice_tasks", tasks);
  }

  /* ---------- camera: show it something and it tells you what it sees (or solves it) ---------- */
  var CAMRE = /\b(what (do|can) you see|can you see (this|me|it)|look (at|through) (this|that|it|the camera)|(open|use|turn on|start) (the |my )?camera|scan (this|that|it)|take a (look|photo|picture)|show you (this|something))\b/i;
  var camStream = null, camFacing = "environment", camTimer = null, camBusy = false, camWasOn = false, camGen = 0;
  function camSay(t) { q("vxCamTxt").textContent = t; }
  async function camStart() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw { name: "NoMediaDevices" };
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: camFacing }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      var v = q("vxCamV"); v.srcObject = camStream; v.play().catch(function () {});
    } catch (e) {
      camStream = null;
      camSay("Error: camera could not open. " + (e && e.name === "NotAllowedError" ? "Allow the camera for this site in your browser settings." : ((e && e.message) || "")));
    }
  }
  function camStop() { clearTimeout(camTimer); if (camStream) { camStream.getTracks().forEach(function (t) { t.stop(); }); camStream = null; } q("vxCamV").srcObject = null; }
  async function openCam(question, auto) {
    camWasOn = on && !paused; if (camWasOn) pause();                 // the mic rests while the camera is open
    q("vxCam").hidden = false; q("vxCamQ").value = question || ""; q("vxCamOut").textContent = ""; camSay("Hold it up so I can see it...");
    await camStart();
    if (auto && camStream) {
      var n = 3;
      (function count() {
        if (q("vxCam").hidden || !camStream || camBusy) return;
        if (n <= 0) { camLook(); return; }
        camSay("Hold it steady... " + n); n--; camTimer = setTimeout(count, 1000);
      })();
    }
  }
  function closeCam() { camGen++; stopPlayback(); camStop(); q("vxCam").hidden = true; if (on && paused && camWasOn) pause(); camWasOn = false; }
  async function camLook() {
    if (!camStream) return;
    stopPlayback(); var gen = ++camGen;                               // a new look stops the old reading
    var v = q("vxCamV"), w = v.videoWidth, h = v.videoHeight;
    if (!w || !h) { camSay("The camera is not ready yet. Try again in a second."); return; }
    camBusy = true; clearTimeout(camTimer);
    var k = Math.min(1, 1280 / Math.max(w, h)), c = document.createElement("canvas");
    c.width = Math.round(w * k); c.height = Math.round(h * k); c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    var img = c.toDataURL("image/jpeg", 0.8), question = q("vxCamQ").value.trim();
    camSay("Looking..."); q("vxCamOut").textContent = "";
    try {
      var name = (LANGS.filter(function (l) { return l[0] === lang; })[0] || [])[1] || "";
      var d = await post("/api/look", { image: img, question: question, langName: name });
      if (gen !== camGen) return;
      var shown = String(d.reply || "").trim();
      q("vxCamOut").textContent = shown; camSay("Tap Look to check again, or Close to go back.");
      var said = "[Camera] " + (question || "What is this?");
      addLog("you", said); addLog("ai", shown);
      var V = window.tsaVoice; if (V && V.turn) { try { V.turn(said, shown); } catch (e) {} }
      history.push({ role: "user", content: said }, { role: "assistant", content: shown.slice(0, 600) });
      history = history.slice(-40); save("tsa_voice_history", history);
      var a = await post("/api/speak", { text: String(d.say || shown).slice(0, 400), voice: voice });
      if (gen !== camGen) return;
      try { initAudio(); await ctx.resume(); } catch (e) {}
      if (!q("vxCam").hidden) await playB64(a.audio);
    } catch (e) { if (gen === camGen) camSay("Error: " + (navigator.onLine ? e.message : "No internet.")); }
    camBusy = false;
  }
  q("vxCamBtn").onclick = function () { openCam("", false); };
  q("vxCamLook").onclick = camLook;
  q("vxCamFlip").onclick = async function () { stopPlayback(); camStop(); camFacing = camFacing === "environment" ? "user" : "environment"; await camStart(); };
  q("vxCamClose").onclick = closeCam;

  /* ---------- files: send a zip, code, text, Word file or picture and talk about it ---------- */
  var doc = null, picking = false;            // doc = the file you gave me: { name, kind: "text"|"img", text | img }
  var TEXTRE = /\.(txt|md|markdown|json|js|jsx|mjs|cjs|ts|tsx|css|scss|html?|xml|csv|tsv|py|java|c|cpp|h|hpp|cs|php|rb|go|rs|sql|ya?ml|toml|ini|cfg|sh|bat|svg|vue|kt|swift|dart|log|env|gradle)$/i;
  var SKIPRE = /(^|\/)(node_modules|\.git|__MACOSX|dist|build|\.next)\//;
  var DOC_MAX = 16000, ONE_MAX = 3500;
  function langName() { return (LANGS.filter(function (l) { return l[0] === lang; })[0] || [])[1] || ""; }
  function docPayload() { return doc && doc.kind === "text" ? { name: doc.name, text: doc.text } : null; }
  function openLog() { renderLog(); q("vxLog").hidden = false; }
  function chip(t) { q("vxFile").hidden = !t; q("vxFileN").textContent = t || ""; }
  function clearDoc() { doc = null; chip(""); }
  function imgData(f) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(f), im = new Image();
      im.onload = function () {
        var k = Math.min(1, 1280 / Math.max(im.width, im.height)), c = document.createElement("canvas");
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL("image/jpeg", 0.8));
      };
      im.onerror = function () { URL.revokeObjectURL(u); rej(new Error("I could not open that picture.")); };
      im.src = u;
    });
  }
  async function readZip(f) {
    if (!window.JSZip) throw new Error("The zip reader did not load. Check your internet and reload.");
    var z = await JSZip.loadAsync(f), names = Object.keys(z.files).filter(function (n) { return !z.files[n].dir && !SKIPRE.test(n); });
    var out = "ZIP \"" + f.name + "\" has " + names.length + " files:\n" + names.slice(0, 150).join("\n") + (names.length > 150 ? "\n..." : "") + "\n\n", used = out.length, cut = 0, skipped = 0;
    var tn = names.filter(function (n) { return TEXTRE.test(n); });
    var items = await Promise.all(tn.slice(0, 80).map(async function (n) { return { n: n, t: await z.files[n].async("string") }; }));
    items.sort(function (a, b) { return a.t.length - b.t.length; });          // small files first so more of them fit
    for (var i = 0; i < items.length; i++) {
      if (used >= DOC_MAX) { skipped = items.length - i; break; }
      var lim = Math.min(ONE_MAX, DOC_MAX - used), t = items[i].t, piece = t.slice(0, lim);
      if (t.length > lim) { piece += "\n[...cut here, the file has " + t.length + " characters]"; cut++; }
      var block = "=== " + items[i].n + " ===\n" + piece + "\n\n"; out += block; used += block.length;
    }
    if (cut || skipped) out += "[Note: only the start of " + cut + " long file(s) is shown" + (skipped ? " and " + skipped + " file(s) were left out" : "") + ". Say so if the user needs exact details from them.]";
    return out;
  }
  async function readDocx(f) {
    var z = await JSZip.loadAsync(f), x = z.file("word/document.xml");
    if (!x) throw new Error("I could not read that Word file.");
    var s = await x.async("string");
    return s.replace(/<\/w:p>/g, "\n").replace(/<w:tab\/>/g, "\t").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/\n{3,}/g, "\n\n").trim().slice(0, DOC_MAX);
  }
  async function readOne(f) {
    var n = f.name || "file";
    if (/^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp)$/i.test(n)) return { kind: "img", img: await imgData(f), name: n };
    if (f.size > 40 * 1024 * 1024) throw new Error("That file is too big for me (over 40 MB).");
    if (/\.zip$/i.test(n)) return { kind: "text", text: await readZip(f), name: n, zip: true };
    if (/\.docx$/i.test(n)) return { kind: "text", text: await readDocx(f), name: n };
    if (/\.(pdf|xlsx|xls|pptx|ppt|doc|rar|7z|mp3|mp4|wav|apk|exe)$/i.test(n)) throw new Error("I can't read " + n.split(".").pop().toUpperCase() + " files by voice yet. Use the plus button in the chat for PDFs, or send a zip, text, code, Word file or picture.");
    var t = await f.text();
    if (/[\u0000-\u0008]/.test(t.slice(0, 500))) throw new Error("I can't read that kind of file.");
    var more = t.length > DOC_MAX;
    return { kind: "text", text: "FILE \"" + n + "\":\n" + t.slice(0, DOC_MAX) + (more ? "\n[...cut here, the file has " + t.length + " characters]" : ""), name: n };
  }
  async function takeFiles(files) {
    chip("Reading " + files[0].name + (files.length > 1 ? " +" + (files.length - 1) : "") + "...");
    try {
      var got = [];
      for (var i = 0; i < files.length && i < 6; i++) got.push(await readOne(files[i]));
      var texts = got.filter(function (g) { return g.kind === "text"; });
      if (texts.length) {
        var t = texts.map(function (g) { return g.text; }).join("\n\n").slice(0, DOC_MAX + 2000);
        doc = { kind: "text", name: texts.length > 1 ? texts.length + " files" : texts[0].name, text: t, zip: !!texts[0].zip };
      } else doc = { kind: "img", name: got[0].name, img: got[0].img };
      chip((doc.kind === "img" ? "Picture: " : "File: ") + doc.name);
      addLog("ai", "I have " + (doc.kind === "img" ? "the picture" : "the file") + " \"" + doc.name + "\". Tell me what to do with it.", "File");
      if (on) {
        job = null; cancelPending(); var my = turn;
        var what = doc.kind === "img" ? "the picture" : doc.zip ? "the zip" : "the file";
        speakAll(["Got it. I've " + (doc.kind === "img" ? "looked at " : "read ") + what + ". What should I do with it?"], my);
      }
    } catch (e) {
      doc = null; chip("");
      set("idle", "Error: " + ((e && e.message) || "could not read that file"));
      setTimeout(function () { if (on && !paused && state === "idle") listen(); }, 3500);
    }
  }
  async function lookDoc(my, question) {              // you gave me a picture and now you are asking about it
    addLog("you", question);
    var a = pickFrom("task", true); if (a) playClip(a.audio);
    armFiller(6500); cont = 0;
    try {
      var d = await post("/api/look", { image: doc.img, question: question, langName: langName() }, ctl && ctl.signal);
      if (my !== turn) return;
      fillerArmed = false; pendingUser = "";
      var shown = String(d.reply || "").trim(); if (!shown) { listen(); return; }
      addLog("ai", shown, doc.name);
      history.push({ role: "user", content: "[Picture " + doc.name + "] " + question }, { role: "assistant", content: shown.slice(0, 1200) });
      history = history.slice(-40); save("tsa_voice_history", history);
      var V = window.tsaVoice; if (V && V.turn) { try { V.turn("[Picture] " + question, shown); } catch (e) {} }
      if (shown.length > 280) openLog();
      var ps = sentences(d.say || shown);
      job = { task: "Picture " + doc.name + ": " + question, parts: ps, idx: 0, done: false, interrupted: false, heard: "", unsaid: "" };
      speakAll(ps, my);
    } catch (e) {
      if (e.name === "AbortError" || my !== turn) return;
      fillerArmed = false; resetUtt();
      set("idle", "Error: " + (navigator.onLine ? e.message : "No internet."));
      setTimeout(function () { if (on && !paused && state === "idle") listen(); }, 3000);
    }
  }

  /* ---------- voice commands for the message pop-up (open, close, copy) and the file ---------- */
  var OPEN_RE = /\b(open|show|bring up|pull up|display|let me see|i want to see|i wanna see)\b[^.?!]{0,40}\b(messages?|pop ?-?up|text (screen|window)|what you('| a)re (writing|typing|doing|saying)|your (writing|answer))\b/i;
  var CLOSE_RE = /\b(close|hide|dismiss|put (it |that )?away|remove|shut|take (it |that )?away)\b/i;
  var CLOSE_NOUN = /\b(messages?|pop ?-?up|text (screen|window)|window)\b/i;
  var COPY_RE = /\bcopy\b[^.?!]{0,30}\b(that|it|this|code|answer|text|message|result)\b/i;
  var FORGET_RE = /\b(forget|remove|clear|drop|close|done with|delete)\b[^.?!]{0,20}\b(file|zip|attachment|document|picture|photo)\b/i;
  var PICK_RE = /\b(upload|attach|send you|let me send|i want to send|i will send|pick|choose)\b[^.?!]{0,30}\b(file|zip|document|picture|photo|image)\b/i;
  function lastAI() { for (var i = log.length - 1; i >= 0; i--) if (log[i].who !== "you") return log[i]; return null; }
  function localCmd(my, text) {
    var s = text.trim(), words = s.split(/\s+/).length, popOpen = !q("vxLog").hidden, kind = "";
    if (doc && FORGET_RE.test(s)) kind = "forget";
    else if (CLOSE_RE.test(s) && (CLOSE_NOUN.test(s) || (popOpen && words <= 5))) kind = "close";
    else if (COPY_RE.test(s)) kind = "copy";
    else if (OPEN_RE.test(s)) kind = "open";
    else if (PICK_RE.test(s)) kind = "pick";
    if (!kind) return false;
    fillerArmed = false; addLog("you", s);
    if (kind === "pick") { speakAll(["Tap the file button at the bottom, then choose your file."], my); return true; }
    if (kind === "open") openLog();
    else if (kind === "close") q("vxLog").hidden = true;
    else if (kind === "forget") clearDoc();
    else if (kind === "copy") {
      var a = lastAI();
      if (!a) { speakAll(["There is nothing to copy yet."], my); return true; }
      var t = /\bcode\b/i.test(s) ? (a.code ? a.text : codeOf(a.text)) || a.text : a.text, fail = function () { openLog(); speakAll(["I can't copy by myself on this phone. Tap the Copy button for me."], my); };
      try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(function () {}, fail); } else fail(); } catch (e) { fail(); return true; }
    }
    var c = pickFrom("task", true), p = c ? playClip(c.audio) : null;
    set("speak", "");
    Promise.resolve(p).then(function () { if (my === turn && on && !paused) { pre = []; listen(); } });
    return true;
  }
  function ensureMic() {                      // after the phone's file picker, the mic may have been cut: bring it back quietly
    try { if (ctx && ctx.state === "suspended") ctx.resume(); } catch (e) {}
    if (on && stream && stream.getTracks().some(function (t) { return t.readyState !== "live"; })) { end(); begin(true); }
  }
  q("vxFileBtn").onclick = function () { picking = true; q("vxFileIn").value = ""; q("vxFileIn").click(); };
  q("vxFileIn").onchange = function () { var fs = Array.prototype.slice.call(this.files || []); picking = false; if (!fs.length) return; ensureMic(); takeFiles(fs); };
  q("vxFileX").onclick = clearDoc;
  q("vxMsgBtn").onclick = openLog;
  window.addEventListener("focus", function () { if (picking) setTimeout(function () { picking = false; ensureMic(); }, 1500); });

  /* ---------- what it remembers ---------- */
  function renderMem() {
    var box = q("vxMem"); box.textContent = "";
    var V = window.tsaVoice;
    function line(t) { var d = document.createElement("div"); d.textContent = t; box.appendChild(d); }
    line("Our last " + Math.floor(history.length / 2) + " talks are kept on this phone so I can pick up where we stopped.");
    var facts = (V && V.facts) ? V.facts() : ((V && V.notes) ? V.notes() : memory).map(function (t) { return { id: "", text: t, src: "" }; });
    facts.slice(0, 12).forEach(function (f) {
      var row = document.createElement("div"); row.className = "vxf";
      var sp = document.createElement("span"); sp.textContent = (f.src === "voice" ? "" : "\u2022 ") + f.text; if (f.src === "voice") sp.insertAdjacentHTML("afterbegin", lu("mic", 13) + " "); row.appendChild(sp);
      if (f.id && V && V.forget) {
        var b = document.createElement("button"); b.innerHTML = lu("trash", 13) + " Delete";
        b.onclick = function () { try { V.forget(f.id); } catch (e) {} renderMem(); };
        row.appendChild(b);
      }
      box.appendChild(row);
    });
    if (facts.length > 12) line("\u2026and " + (facts.length - 12) + " more in Memory & Learning.");
    if (!facts.length) line("No saved facts yet. Say 'remember that...' and I will keep it. Saved facts also show in Memory & Learning.");
    tasks.slice(0, 12).forEach(function (t) { line((t.done ? "\u2713 " : "\u25CB ") + "Plan: " + t.text); });
  }
  q("vxMemClr").onclick = function () { history = []; memory = []; save("tsa_voice_history", history); save("tsa_voice_memory", memory); renderMem(); q("vxMsg").textContent = "Done. I won't recall our earlier talks. Facts in Memory & Learning stay until you delete them there."; };
  q("vxTaskClr").onclick = function () { tasks = []; save("tsa_voice_tasks", tasks); renderMem(); };
  q("vxLogClr").onclick = function () { log = []; saveLog(); renderLog(); renderMem(); q("vxMsg").textContent = "Text log deleted."; };
  q("vxAllClr").onclick = function () {
    if (!confirm("Delete all voice data on this phone: our talks, the text log, plans and facts saved by voice? This cannot be undone.")) return;
    window.tsaVoiceData.clear("all"); q("vxMsg").textContent = "All voice data deleted.";
  };
  /* lets the Memory & Learning screen in the main app show and clear voice data too */
  window.tsaVoiceData = {
    stats: function () { return { talks: Math.floor(history.length / 2), log: log.length, plans: tasks.length }; },
    clear: function (what) {
      var all = what === "all";
      if (all || what === "talks") { history = []; memory = []; save("tsa_voice_history", history); save("tsa_voice_memory", memory); }
      if (all || what === "log") { log = []; saveLog(); try { renderLog(); } catch (e) {} }
      if (all || what === "plans") { tasks = []; save("tsa_voice_tasks", tasks); }
      if (all) { var V = window.tsaVoice; if (V && V.forgetVoice) { try { V.forgetVoice(); } catch (e) {} } }
      try { renderMem(); } catch (e) {}
    }
  };

  q("vxOrb").onclick = function () {
    if (!on) begin(); else if (paused) pause(); else if (state === "speak" || state === "think") { markInterrupted(); cancelPending(); pre = []; listen(); }
  };
  q("vxPause").onclick = pause;
  q("vxTextBtn").onclick = function () { renderLog(); q("vxLog").hidden = false; };
  q("vxLogDone").onclick = function () { q("vxLog").hidden = true; };
  q("vxLog").onclick = function (e) { if (e.target.id === "vxLog") e.target.hidden = true; };
  q("vxLogClear").onclick = function () { log = []; saveLog(); renderLog(); };
  q("vxLogChat").onclick = function () { close(); };
  function close() { clearDoc(); camStop(); q("vxCam").hidden = true; end(); ov.hidden = true; q("vxSheet").hidden = true; q("vxLog").hidden = true; }
  q("vxEnd").onclick = close;
  q("vxBack").onclick = close;
  open.onclick = function () { ov.hidden = false; if (!on) begin(); };
  document.addEventListener("visibilitychange", function () { if (document.hidden && on && !paused && !picking) pause(); });

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
  q("vxGear").onclick = function () { q("vxMsg").textContent = ""; renderMem(); q("vxSheet").hidden = false; };
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
  q("vxVol").value = vol; q("vxVolV").textContent = vol + "%";
  function drawPat() { var bs = q("vxPat").children; for (var i = 0; i < bs.length; i++) bs[i].classList.toggle("act", bs[i].getAttribute("data-p") === pat); }
  q("vxPat").onclick = function (e) { var p = e.target && e.target.getAttribute && e.target.getAttribute("data-p"); if (!p || !PATS[p]) return; pat = p; put("tsa_voice_pat", p); drawPat(); q("vxMsg").textContent = "Saved. I will wait " + (p === "quick" ? "a little less" : p === "patient" ? "longer" : "the normal time") + " when you pause."; };
  drawPat();
  q("vxVol").oninput = function () { vol = parseInt(q("vxVol").value, 10) || 100; q("vxVolV").textContent = vol + "%"; put("tsa_voice_vol", String(vol)); applyVol(); };
  q("vxTest").onclick = async function () {
    q("vxMsg").textContent = "Loading voice…";
    try {
      var v = await post("/api/speak", { text: "Hello! This is how I sound.", voice: voice });
      try { initAudio(); await ctx.resume(); auto = await levelOf(v.audio); applyVol(); } catch (x) {}
      player.src = "data:audio/mpeg;base64," + v.audio; await player.play(); q("vxMsg").textContent = "";
    } catch (e) { q("vxMsg").textContent = e.message; }
  };
})();