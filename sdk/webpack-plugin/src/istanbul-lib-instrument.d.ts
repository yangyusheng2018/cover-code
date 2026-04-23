declare module "istanbul-lib-instrument" {
  export function createInstrumenter(opts?: unknown): {
    instrumentSync(
      code: string,
      filename: string,
      inputSourceMap?: object | string,
    ): string;
    lastSourceMap(): object | null;
  };
}
