import type { ITableKeepAliveProbe } from '../ports/itablekeepaliveprobe.js';

export class KeepDatabasesAliveUseCase {
  constructor(private readonly probes: ITableKeepAliveProbe[]) {}

  async execute(): Promise<void> {
    await Promise.all(this.probes.map(probe => probe.touch()));
  }
}
