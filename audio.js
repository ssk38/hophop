const MUSIC_PATTERN = [220, 262, 330, 392, 440, 392, 330, 262, 220, 196, 247, 294];

export function createAudio(state) {
  const audio = {
    ctx: null,
    master: null,
    musicGain: null,
    nextBeatAt: 0,
    step: 0,
    musicStarted: false,
  };

  function ensureAudio() {
    if (!audio.ctx) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;

      audio.ctx = new AudioCtor();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.12;
      audio.master.connect(audio.ctx.destination);
      audio.musicGain = audio.ctx.createGain();
      audio.musicGain.gain.value = 2.5;
      audio.musicGain.connect(audio.master);
    }

    if (audio.ctx.state === 'suspended') audio.ctx.resume();
  }

  function playTone(frequency, duration, type = 'sine', volume = 0.08, slideTo = null, output = audio.master) {
    if (!audio.ctx || !audio.master) return;

    const now = audio.ctx.currentTime;
    const oscillator = audio.ctx.createOscillator();
    const gainNode = audio.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gainNode);
    gainNode.connect(output);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function playKick() {
    playTone(42, 0.18, 'sine', 0.18, 24, audio.musicGain);
    playTone(68, 0.08, 'triangle', 0.04, 58, audio.musicGain);
  }

  function playBass() {
    ensureAudio();
    if (!audio.ctx || !audio.musicGain) return;
    const note = MUSIC_PATTERN[(audio.step + 2) % MUSIC_PATTERN.length] * 0.5;
    playTone(note, 0.22, 'sawtooth', 0.09, note * 0.7, audio.musicGain);
  }

  function playJumpSound() {
    ensureAudio();
    if (!audio.ctx || !audio.master) return;
    playTone(520, 0.12, 'square', 0.12, 200);
    playTone(680, 0.08, 'triangle', 0.05, 340);
  }

  function playStageTransition(stageNumber) {
    ensureAudio();
    if (!audio.ctx || !audio.master) return;
    const root = 330 + stageNumber * 35;
    playTone(root, 0.26, 'triangle', 0.12);
    playTone(root * 1.5, 0.34, 'sine', 0.08, root * 2);
  }

  function playCountdownTick(remaining) {
    ensureAudio();
    if (!audio.ctx || !audio.master) return;
    const frequency = remaining === 0 ? 880 : 520 + (3 - remaining) * 90;
    playTone(frequency, remaining === 0 ? 0.3 : 0.12, 'square', remaining === 0 ? 0.1 : 0.06);
  }

  function startMusic() {
    ensureAudio();
    if (!audio.ctx || !audio.master || audio.musicStarted) return;
    audio.musicStarted = true;
    audio.nextBeatAt = audio.ctx.currentTime + 0.08;
    audio.step = 0;
  }

  function updateMusic() {
    if (!audio.ctx || !audio.musicGain || !audio.musicStarted || !['playing', 'transition'].includes(state.status)) return;
    const beatDuration = 0.23;

    while (audio.nextBeatAt < audio.ctx.currentTime + 0.2) {
      const note = MUSIC_PATTERN[audio.step % MUSIC_PATTERN.length];
      playTone(note, 0.12, 'triangle', 0.05, null, audio.musicGain);
      if (audio.step % 2 === 1) playTone(note * 1.5, 0.08, 'square', 0.025, note * 1.2, audio.musicGain);
      if (audio.step % 2 === 0) playKick();
      if (audio.step % 4 === 0 || audio.step % 4 === 2) playBass();
      if (audio.step % 4 === 0) playTone(note * 0.5, 0.2, 'sine', 0.06, note * 0.25, audio.musicGain);
      audio.nextBeatAt += beatDuration;
      audio.step += 1;
    }
  }

  return { audio, ensureAudio, playJumpSound, playStageTransition, playCountdownTick, startMusic, updateMusic };
}
