declare module 'istanbul-lib-coverage' {
  export class CoverageMap {
    constructor(obj?: unknown);
    files(): string[];
    fileCoverageFor(file: string): { toJSON(): Record<string, unknown> };
    merge(obj: unknown): void;
  }
  export class FileCoverage {
    constructor(obj: unknown);
    merge(other: FileCoverage): void;
    toJSON(): Record<string, unknown>;
  }
  export function createCoverageMap(obj?: unknown): CoverageMap;
  export function createFileCoverage(obj: unknown): FileCoverage;
}

declare module 'istanbul-lib-source-maps' {
  export function createSourceMapStore(opts?: {
    baseDir?: string | null;
    verbose?: boolean;
  }): {
    transformCoverage(map: unknown): Promise<import('istanbul-lib-coverage').CoverageMap>;
    dispose(): void;
  };
}
