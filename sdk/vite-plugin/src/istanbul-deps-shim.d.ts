declare module "@istanbuljs/load-nyc-config" {
  export function loadNycConfig(opts: {
    cwd: string;
    nycrcPath?: string;
  }): Promise<{
    include?: string | string[];
    exclude?: string | string[];
    extension?: string | string[];
  }>;
}

declare module "istanbul-lib-instrument" {
  export function createInstrumenter(options: Record<string, unknown>): {
    instrumentSync(
      code: string,
      filename: string,
      inputSourceMap?: Record<string, unknown>
    ): string;
    lastSourceMap(): Record<string, unknown> | null;
    fileCoverage: object;
  };
}

declare module "test-exclude" {
  export default class TestExclude {
    constructor(opts: Record<string, unknown>);
    shouldInstrument(filename: string): boolean;
  }
}
