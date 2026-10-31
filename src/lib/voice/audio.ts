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

export class Player {
  private ctx = new AudioContext({ sampleRate: 24000 });
  private nextTime = 0;
  private sources = new Set<AudioBufferSourceNode>();

  get speaking(): boolean {
    return this.sources.size > 0;
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
    const at = Math.max(this.ctx.currentTime + 0.02, this.nextTime);
    src.start(at);
    this.nextTime = at + buf.duration;
    this.sources.add(src);
    src.onended = () => this.sources.delete(src);
  }

  // Interruption: stop mid-word, drop everything queued.
  flush(): void {
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    this.sources.clear();
    this.nextTime = 0;
  }

  close(): void {
    this.flush();
    void this.ctx.close();
  }
}
