// Twitter-style Snowflake ID generator in TypeScript
// 64 bits: [timestamp|workerId|sequence]

export class Snowflake {
  private static readonly EPOCH = 1704067200000; // Custom epoch (2024-01-01)
  private static readonly WORKER_ID_BITS = 5;
  private static readonly SEQUENCE_BITS = 12;
  private static readonly MAX_WORKER_ID = -1 ^ (-1 << Snowflake.WORKER_ID_BITS);
  private static readonly MAX_SEQUENCE = -1 ^ (-1 << Snowflake.SEQUENCE_BITS);

  private lastTimestamp = -1;
  private sequence = 0;

  constructor(private workerId = 1) {
    if (workerId < 0 || workerId > Snowflake.MAX_WORKER_ID) {
      throw new Error(`workerId must be between 0 and ${Snowflake.MAX_WORKER_ID}`);
    }
  }

  private currentTime(): number {
    return Date.now();
  }

  private waitNextMillis(lastTimestamp: number): number {
    let timestamp = this.currentTime();
    while (timestamp <= lastTimestamp) {
      timestamp = this.currentTime();
    }
    return timestamp;
  }

  public generate(): string {
    let timestamp = this.currentTime();
    if (timestamp < this.lastTimestamp) {
      throw new Error('Clock moved backwards. Refusing to generate id');
    }
    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & Snowflake.MAX_SEQUENCE;
      if (this.sequence === 0) {
        timestamp = this.waitNextMillis(this.lastTimestamp);
      }
    } else {
      this.sequence = 0;
    }
    this.lastTimestamp = timestamp;
    // Use BigInt for all calculations
    const timestampPart =
      BigInt(timestamp - Snowflake.EPOCH) << BigInt(Snowflake.WORKER_ID_BITS + Snowflake.SEQUENCE_BITS);
    const workerIdPart = BigInt(this.workerId) << BigInt(Snowflake.SEQUENCE_BITS);
    const sequencePart = BigInt(this.sequence);
    const id = timestampPart | workerIdPart | sequencePart;
    // Return as string to avoid JS number precision issues
    return id.toString();
  }

  public static decode(id: string) {
    const bigId = BigInt(id);
    const sequence = Number(bigId & BigInt(this.MAX_SEQUENCE));
    const workerId = Number((bigId >> BigInt(this.SEQUENCE_BITS)) & BigInt(this.MAX_WORKER_ID));
    const timestamp = Number(bigId >> BigInt(this.SEQUENCE_BITS + this.WORKER_ID_BITS)) + this.EPOCH;
    return { timestamp, workerId, sequence };
  }
}
