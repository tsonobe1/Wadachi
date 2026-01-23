import type { TimedKeystroke } from './keyFormatter';

export interface DisplayKeystroke extends TimedKeystroke {
  id: string;
}

export class KeystrokeBuffer {
  private buffer: DisplayKeystroke[] = [];
  private counter = 0;

  constructor(private readonly ttlMs = 1800) {}

  push(stroke: TimedKeystroke): DisplayKeystroke[] {
    this.buffer.push({
      ...stroke,
      id: this.nextId()
    });

    return this.snapshot();
  }

  snapshot(now = Date.now()): DisplayKeystroke[] {
    this.buffer = this.buffer.filter((item) => now - item.timestamp <= this.ttlMs);
    return [...this.buffer];
  }

  clear(): void {
    this.buffer = [];
  }

  private nextId(): string {
    this.counter += 1;
    return `stroke-${this.counter}`;
  }
}
