type Payload = string;
type Path = number | string;
type Metadata = {
  timestamp: number;
  type: "=" | "+";
  path: Path[];
  value: unknown;
};
export declare namespace utils {
  const selectChild: (
    object: unknown,
    paths: Path[],
    initLastPath?: () => any,
  ) => unknown;
  const selectRecordChild: (object: unknown, paths: Path[]) => void;
  const set: (object: unknown, paths: Path[], value: unknown) => void;
  const add: (object: unknown, paths: Path[], value: unknown) => void;
  namespace path {
    const serialize: (paths: Path[]) => string;
    const deserialize: (path: string) => (string | number)[];
  }
}
export declare const parse: (payload: Payload) => any;
export declare const stringifyLineEvent: (metadata: Metadata) => string;
export declare const createEventsWritable: () => {
  readable: ReadableStream<Uint8Array>;
  close: () => void;
  set(path: Path[], value: unknown): void;
  add(path: Path[], value: unknown): void;
};
export {};
