export interface ITableKeepAliveProbe {
  touch(): Promise<void>;
}
