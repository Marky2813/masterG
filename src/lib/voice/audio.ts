"use client";

// Mic capture (16 kHz PCM16, echo-cancelled) and gapless playback of the
// model's 24 kHz PCM16 audio, with an instant flush for interruptions.

const WORKLET = `
class Capture extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(1600); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this.buf[this.n++] = ch[i];
      if (this.n === this.buf.length) { this.port.postMessage(this.buf.slice(0)); this.n = 0; }
    }
    return true;
  }
}
registerProcessor("capture", Capture);
`;

function floatToPcm16Base64(f: Float32Array): string {
  const bytes = new Uint8Array(f.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < f.length; i++) {
    const s = Math.max(-1, Math.min(1, f[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export class Mic {
  private ctx?: AudioContext;
  private stream?: MediaStream;
  private node?: AudioWorkletNode;
  muted = false;

  // A context created after awaits may start suspended (no user gesture left): resume on press.
  async resume(): Promise<void> {
    if (this.ctx?.state === "suspended") await this.ctx.resume();
  }

  async start(onChunk: (base64Pcm16: string) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
    this.ctx = new AudioContext({ sampleRate: 16000 });
    const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
    await this.ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, "capture");
    this.node.port.onmessage = (e: MessageEvent<Float32Array>) => {
      if (!this.muted) onChunk(floatToPcm16Base64(e.data));
    };
    src.connect(this.node);
  }

  stop(): void {
    this.node?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
  }
}

const PREROLL_S = 0.25;

export class Player {
  underruns = 0; // times the stream ran dry mid-reply (logged per turn)
  private newTurn = true; // next chunk starts a reply: silence before it isn't an underrun

  endTurn(): void {
    this.newTurn = true;
  }

  takeUnderruns(): number {
    const n = this.underruns;
    this.underruns = 0;
    return n;
  }
  private ctx = new AudioContext({ sampleRate: 24000 });
  private nextTime = 0;
  private sources = new Map<AudioBufferSourceNode, { n: number; at: number }>(); // queued chunk -> its number and start time
  private enqueued = 0; // chunks queued so far (marks a point in the stream for cutFrom)
  private lastEnd = 0; // performance.now() when the last queued audio finished
  private turnS = 0; // seconds of audio received for the current reply

  get speaking(): boolean {
    return this.sources.size > 0;
  }

  // True while Masterji is audible, plus a tail for room echo to die down.
  isAudible(tailMs = 600): boolean {
    return this.sources.size > 0 || performance.now() - this.lastEnd < tailMs;
  }

  async resume(): Promise<void> {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  enqueue(base64Pcm16: string): void {
    const bin = atob(base64Pcm16);
    const n = bin.length >> 1;
    const buf = this.ctx.createBuffer(1, n, 24000);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
      ch[i] = (v >= 0x8000 ? v - 0x10000 : v) / 0x8000;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    // Jitter buffer: when starting from silence (new reply or after an underrun), wait 250 ms so
    // small network hiccups don't cut words. Contiguous chunks play back to back.
    const fromSilence = this.nextTime < this.ctx.currentTime;
    if (fromSilence && !this.newTurn) this.underruns++;
    if (this.newTurn) this.turnS = 0;
    this.turnS += buf.duration;
    this.newTurn = false;
    const at = fromSilence ? this.ctx.currentTime + PREROLL_S : this.nextTime;
    src.start(at);
    this.nextTime = at + buf.duration;
    this.sources.set(src, { n: this.enqueued++, at });
    src.onended = () => {
      this.sources.delete(src);
      if (this.sources.size === 0) this.lastEnd = performance.now();
    };
  }

  // A point in the stream: the next chunk to be queued. cutFrom(mark) drops that chunk and every later one.
  mark(): number {
    return this.enqueued;
  }

  // He started saying his reply a second time (voiceService restatedAt): drop the audio queued from that
  // point on, keep the first version playing to its end.
  cutFrom(mark: number): void {
    let from = Infinity;
    for (const [s, { n, at }] of this.sources) {
      if (n < mark) continue;
      from = Math.min(from, at);
      this.turnS -= s.buffer?.duration ?? 0;
      this.sources.delete(s);
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    if (from < this.nextTime) this.nextTime = from;
    if (this.sources.size === 0) this.lastEnd = performance.now();
  }

  // Interruption: stop mid-word, drop everything queued. Returns how much of the current reply
  // was actually played (0..1), so Masterji can be told what the child really heard.
  flush(): number {
    const unplayed = Math.max(0, this.nextTime - this.ctx.currentTime);
    const heard = this.turnS > 0 ? Math.max(0, Math.min(1, 1 - unplayed / this.turnS)) : 1;
    for (const s of this.sources.keys()) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    this.sources.clear();
    this.nextTime = 0;
    this.lastEnd = 0; // interrupted on purpose: open the mic right away
    this.turnS = 0;
    this.newTurn = true;
    return heard;
  }

  close(): void {
    this.flush();
    void this.ctx.close();
  }
}
