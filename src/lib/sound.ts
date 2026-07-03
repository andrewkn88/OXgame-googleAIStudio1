/**
 * Web Audio API based Sound Synthesizer
 * No external file downloads needed - 100% client side and zero latency.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    // @ts-ignore
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

export function resumeAudioContext() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}

/**
 * Plays a warm, ascending major chord chime when a player joins.
 */
export function playJoinSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudioContext();

  const now = ctx.currentTime;
  const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
  
  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + index * 0.08);
    
    gainNode.gain.setValueAtTime(0, now + index * 0.08);
    gainNode.gain.linearRampToValueAtTime(0.15, now + index * 0.08 + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.4);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now + index * 0.08);
    osc.stop(now + index * 0.08 + 0.4);
  });
}

/**
 * Plays a high-pitched cheerful double ding on correct answer.
 */
export function playCorrectSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudioContext();

  const now = ctx.currentTime;
  
  // Ding 1 (G5)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(783.99, now);
  gain1.gain.setValueAtTime(0.15, now);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.3);

  // Ding 2 (C6)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1046.50, now + 0.1);
  gain2.gain.setValueAtTime(0.2, now + 0.1);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.1);
  osc2.stop(now + 0.5);
}

/**
 * Plays a gentle low buzzy descending slide on incorrect answer.
 */
export function playIncorrectSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudioContext();

  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.linearRampToValueAtTime(120, now + 0.4);
  
  gainNode.gain.setValueAtTime(0.2, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  osc.start(now);
  osc.stop(now + 0.4);
}

/**
 * Plays a short subtle click for countdown timer ticking.
 */
export function playTickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudioContext();

  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, now);
  
  gainNode.gain.setValueAtTime(0.05, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  osc.start(now);
  osc.stop(now + 0.05);
}

/**
 * Plays a triumphant arpeggio at completion of game.
 */
export function playFinishSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudioContext();

  const now = ctx.currentTime;
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
  
  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = index % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now + index * 0.06);
    
    gainNode.gain.setValueAtTime(0, now + index * 0.06);
    gainNode.gain.linearRampToValueAtTime(0.12, now + index * 0.06 + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.06 + 0.6);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now + index * 0.06);
    osc.stop(now + index * 0.06 + 0.65);
  });
}
