document.addEventListener("DOMContentLoaded", () => {
  
  
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioCtx();
 
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.9;
  masterGain.connect(audioCtx.destination);

  function ensureAudioRunning() {
    if (audioCtx.state !== "running") audioCtx.resume();
  }

  function dbFromKnobAngle(angleDeg) {
    return (angleDeg / 120) * 24;
  }

  function playbackRateFromSpeedPercent(pct) {
    return 1 + pct / 100;
  }

  function equalPowerCrossfade(x01) {
    const a = Math.cos(x01 * Math.PI * 0.5);
    const b = Math.sin(x01 * Math.PI * 0.5);
    return { a, b };
  }

  function createDeckAudio() {
    const audioEl = new Audio();
    audioEl.preload = "auto";
    audioEl.crossOrigin = "anonymous";
  
    const src = audioCtx.createMediaElementSource(audioEl);
  
    // --- EQ filters (same as before) ---
    const low = audioCtx.createBiquadFilter();
    low.type = "lowshelf";
    low.frequency.value = 250;
    low.gain.value = 0;
  
    const mid = audioCtx.createBiquadFilter();
    mid.type = "peaking";
    mid.frequency.value = 1500;
    mid.Q.value = 3;
    mid.gain.value = 0;
  
    const hi = audioCtx.createBiquadFilter();
    hi.type = "highshelf";
    hi.frequency.value = 4000;
    hi.gain.value = 0;
  
    const deckGain = audioCtx.createGain();
    deckGain.gain.value = 0.8;
  
    low.connect(mid);
    mid.connect(hi);
    hi.connect(deckGain);
    deckGain.connect(masterGain);
  
    // --- Two selectable input paths into the EQ ---
    const normalIn = audioCtx.createGain();
    normalIn.gain.value = 1;
  
    const vocalIn = audioCtx.createGain();
    vocalIn.gain.value = 0;
  
    // Normal path: src -> normalIn -> low
    src.connect(normalIn);
    normalIn.connect(low);
  
    // Vocal-cut path: (L - R) -> vocalIn -> low
    const splitter = audioCtx.createChannelSplitter(2);
    src.connect(splitter);
  
    const invertR = audioCtx.createGain();
    invertR.gain.value = -1;
  
    const sum = audioCtx.createGain(); // sums signals (additive)
    splitter.connect(sum, 0);          // Left
    splitter.connect(invertR, 1);      // Right -> invert
    invertR.connect(sum);              // Left + (-Right) = L - R
  
    sum.connect(vocalIn);
    vocalIn.connect(low);
  
    return { audioEl, deckGain, low, mid, hi, normalIn, vocalIn, vocalCutOn: false };
  }
  

  const deckAudio = {
    1: createDeckAudio(),
    2: createDeckAudio(),
  };

  const decks = {
    1: {
      fileInput: document.getElementById("fileUpload1"),
      platter: document.getElementById("deck-1"),
      statusText: document.getElementById("deck-1-status"),
      playPauseBtn: document.getElementById("play-pause-1"),
      vocalBtn: document.getElementById("vocal-cut-1"),
      faderKnob: document.getElementById("knob-1"),
      faderTrack: document.getElementById("fader-1-track"),
      eq: {
        high: document.getElementById("eq-hi-1-knob"),
        mid: document.getElementById("eq-mid-1-knob"),
        low: document.getElementById("eq-low-1-knob"),
      },
      speedKnob: document.getElementById("speed-knob-1"),
      speedTrack: document.getElementById("speed-fader-1-track"),
      speedValueDisplay: document.getElementById("speed-value-1"),
    },
    2: {
      fileInput: document.getElementById("fileUpload2"),
      platter: document.getElementById("deck-2"),
      statusText: document.getElementById("deck-2-status"),
      playPauseBtn: document.getElementById("play-pause-2"),
      vocalBtn: document.getElementById("vocal-cut-2"),
      faderKnob: document.getElementById("knob-2"),
      faderTrack: document.getElementById("fader-2-track"),
      eq: {
        high: document.getElementById("eq-hi-2-knob"),
        mid: document.getElementById("eq-mid-2-knob"),
        low: document.getElementById("eq-low-2-knob"),
      },
      speedKnob: document.getElementById("speed-knob-2"),
      speedTrack: document.getElementById("speed-fader-2-track"),
      speedValueDisplay: document.getElementById("speed-value-2"),
    },
  };
 
  const state = {
    vol: { 1: 0.8, 2: 0.8 },
    cross: 0.5,
  };

  function applyMix() {
    const { a, b } = equalPowerCrossfade(state.cross);
    deckAudio[1].deckGain.gain.value = state.vol[1] * a;
    deckAudio[2].deckGain.gain.value = state.vol[2] * b;
  }

  applyMix();
 
  function setupUpload(deckId) {
    const ui = decks[deckId];
    const audio = deckAudio[deckId];

    ui.fileInput.addEventListener("change", () => {
      ensureAudioRunning();

      const file = ui.fileInput.files?.[0];
      if (!file) return;
     
      const url = URL.createObjectURL(file);
      audio.audioEl.src = url;
      audio.audioEl.load();

      ui.statusText.textContent = `Deck ${deckId}: Loaded (${file.name})`;
      ui.playPauseBtn.textContent = "Play";
      ui.platter.classList.remove("playing");
    });
  }

  setupUpload(1);
  setupUpload(2);

  function setupPlayPause(deckId) {
    const ui = decks[deckId];
    const audio = deckAudio[deckId];

    ui.playPauseBtn.addEventListener("click", async () => {
      ensureAudioRunning();

      if (!audio.audioEl.src) {
        ui.statusText.textContent = `Deck ${deckId}: No track loaded`;
        return;
      }

      if (audio.audioEl.paused) {
        try {
          await audio.audioEl.play();
          ui.playPauseBtn.textContent = "Pause";
          ui.statusText.textContent = `Deck ${deckId}: Playing`;
          ui.platter.classList.add("playing");
        } catch {
          ui.statusText.textContent = `Deck ${deckId}: Can't play (autoplay blocked?)`;
        }
      } else {
        audio.audioEl.pause();
        ui.playPauseBtn.textContent = "Play";
        ui.statusText.textContent = `Deck ${deckId}: Paused`;
        ui.platter.classList.remove("playing");
      }
    });

    audio.audioEl.addEventListener("ended", () => {
      ui.playPauseBtn.textContent = "Play";
      ui.statusText.textContent = `Deck ${deckId}: Ended`;
      ui.platter.classList.remove("playing");
    });
  }

  setupPlayPause(1);
  setupPlayPause(2);

  function setupVerticalFader(track, knob, onChange01) {
    knob.addEventListener("mousedown", startDrag);
    knob.addEventListener("touchstart", startDrag, { passive: false });

    function startDrag(e) {
      e.preventDefault();
      ensureAudioRunning();
      document.addEventListener("mousemove", onDrag);
      document.addEventListener("mouseup", endDrag);
      document.addEventListener("touchmove", onDrag, { passive: false });
      document.addEventListener("touchend", endDrag);
      onDrag(e);
    }

    function onDrag(e) {
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const rect = track.getBoundingClientRect();

      const knobH = knob.offsetHeight;
      const minTop = 0;
      const maxTop = rect.height - knobH;

      let top = clientY - rect.top - knobH / 2;
      top = Math.max(minTop, Math.min(top, maxTop));

      knob.style.top = `${top}px`;

      const value01 = 1 - top / maxTop;
      onChange01(value01);
    }

    function endDrag() {
      document.removeEventListener("mousemove", onDrag);
      document.removeEventListener("mouseup", endDrag);
      document.removeEventListener("touchmove", onDrag);
      document.removeEventListener("touchend", endDrag);
    }
  }

  function setupHorizontalFader(track, knob, onChange01) {
    knob.addEventListener("mousedown", startDrag);
    knob.addEventListener("touchstart", startDrag, { passive: false });

    function startDrag(e) {
      e.preventDefault();
      ensureAudioRunning();
      document.addEventListener("mousemove", onDrag);
      document.addEventListener("mouseup", endDrag);
      document.addEventListener("touchmove", onDrag, { passive: false });
      document.addEventListener("touchend", endDrag);
      onDrag(e);
    }

    function onDrag(e) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const rect = track.getBoundingClientRect();

      const knobW = knob.offsetWidth;
      const minLeft = 0;
      const maxLeft = rect.width - knobW;

      let left = clientX - rect.left - knobW / 2;
      left = Math.max(minLeft, Math.min(left, maxLeft));

      knob.style.left = `${left}px`;

      const value01 = left / maxLeft;
      onChange01(value01);
    }

    function endDrag() {
      document.removeEventListener("mousemove", onDrag);
      document.removeEventListener("mouseup", endDrag);
      document.removeEventListener("touchmove", onDrag);
      document.removeEventListener("touchend", endDrag);
    }
  }

  function setupRotary(knob, onAngleChange) {
    let startY = 0;
    let startAngle = 0;

    knob.addEventListener("mousedown", startRotate);
    knob.addEventListener("touchstart", startRotate, { passive: false });

    function getCurrentAngle() {
      const t = getComputedStyle(knob).transform;
      if (!t || t === "none") return 0;
      const m = new DOMMatrix(t);
      return Math.atan2(m.b, m.a) * (180 / Math.PI);
    }

    function startRotate(e) {
      e.preventDefault();
      ensureAudioRunning();

      startY = e.touches ? e.touches[0].clientY : e.clientY;
      startAngle = getCurrentAngle();

      document.addEventListener("mousemove", rotate);
      document.addEventListener("mouseup", endRotate);
      document.addEventListener("touchmove", rotate, { passive: false });
      document.addEventListener("touchend", endRotate);
    }

    function rotate(e) {
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const delta = (clientY - startY) * -0.5;
      const angle = Math.max(-120, Math.min(120, startAngle + delta));

      knob.style.transform = `rotate(${angle}deg)`;
      onAngleChange(angle);
    }

    function endRotate() {
      document.removeEventListener("mousemove", rotate);
      document.removeEventListener("mouseup", endRotate);
      document.removeEventListener("touchmove", rotate);
      document.removeEventListener("touchend", endRotate);
    }
  }

  function setupDeckVolume(deckId) {
    const ui = decks[deckId];

    setupVerticalFader(ui.faderTrack, ui.faderKnob, (value01) => {
      state.vol[deckId] = value01;
      applyMix();
    });
  }

  setupDeckVolume(1);
  setupDeckVolume(2);

  const crossKnob = document.getElementById("cross-fader-knob");
  const crossTrack = document.getElementById("cross-fader-track");

  setupHorizontalFader(crossTrack, crossKnob, (value01) => {
    state.cross = value01;
    applyMix();
  });

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  
  function setupProgress(deckId) {
    const audio = deckAudio[deckId].audioEl;
  
    const progress = document.getElementById(`progress-${deckId}`);
    const current = document.getElementById(`current-${deckId}`);
    const duration = document.getElementById(`duration-${deckId}`);
  
    audio.addEventListener("loadedmetadata", () => {
      progress.max = audio.duration;
      duration.textContent = formatTime(audio.duration);
    });
  
    audio.addEventListener("timeupdate", () => {
      progress.value = audio.currentTime;
      current.textContent = formatTime(audio.currentTime);
    });
  
    progress.addEventListener("input", () => {
      audio.currentTime = progress.value;
    });
  }
  
  setupProgress(1);
  setupProgress(2);  

  function setupSpeed(deckId) {
    const ui = decks[deckId];
    const audio = deckAudio[deckId];

    setupVerticalFader(ui.speedTrack, ui.speedKnob, (value01) => {
      const range = 50;
      const pct = value01 * (range * 2) - range;
      ui.speedValueDisplay.textContent = pct.toFixed(1) + "%";
      audio.audioEl.playbackRate = playbackRateFromSpeedPercent(pct);
    });
  }

  setupSpeed(1);
  setupSpeed(2);

  function setupEQ(deckId) {
    const ui = decks[deckId];
    const audio = deckAudio[deckId];

    setupRotary(ui.eq.low, (angle) => {
      audio.low.gain.value = dbFromKnobAngle(angle);
    });
    setupRotary(ui.eq.mid, (angle) => {
      audio.mid.gain.value = dbFromKnobAngle(angle);
    });
    setupRotary(ui.eq.high, (angle) => {
      audio.hi.gain.value = dbFromKnobAngle(angle);
    });
  }

  setupEQ(1);
  setupEQ(2);

  function setupVocalCut(deckId) {
    const ui = decks[deckId];
    const audio = deckAudio[deckId];
  
    ui.vocalBtn.addEventListener("click", () => {
      ensureAudioRunning();
  
      audio.vocalCutOn = !audio.vocalCutOn;
  
      if (audio.vocalCutOn) {
        audio.normalIn.gain.value = 0;
        audio.vocalIn.gain.value = 1;
        ui.vocalBtn.textContent = "Vocal Cut: ON";
        ui.statusText.textContent = `Deck ${deckId}: Vocal Cut ON`;
      } else {
        audio.normalIn.gain.value = 1;
        audio.vocalIn.gain.value = 0;
        ui.vocalBtn.textContent = "Vocal Cut: OFF";
        ui.statusText.textContent = `Deck ${deckId}: Vocal Cut OFF`;
      }
    });
  }
  setupVocalCut(1);
  setupVocalCut(2);  

  function setupPlatterToggle(deckId) {
    const ui = decks[deckId];
    ui.platter.addEventListener("click", () => ui.playPauseBtn.click());
  }
  setupPlatterToggle(1);
  setupPlatterToggle(2);
});
