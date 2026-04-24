/** 与 DB / API 一致的行维度状态（前端可视化） */
export type LineInstrument = 'none' | 'ok' | 'fail' | 'unknown';

export interface CoverageLineDetail {
  /** 源文件行号（从 1 起） */
  line: number;
  /** 增量模式：是否属于「相对主分支 diff」范围内的行；全量模式恒为 true */
  inScope: boolean;
  /** none=无可执行 statement；ok=插桩成功；fail=插桩失败（由 meta 提供）；unknown=占位 */
  instrument: LineInstrument;
  /** 仅 instrument===ok 时有意义；否则为 null */
  covered: boolean | null;
  /** 是否从父提交继承的已覆盖状态（未在 resetLines 中的行可能为 true） */
  carried?: boolean;
  /**
   * 仅 API 增量视图：相对主分支 unified diff 中该行在新文件侧为「+」新增或「 」上下文。
   * 不入库。
   */
  diffMark?: '+' | ' ';
  /**
   * 详情人工标记（与 `coverage_file.manual_marks` 对应；入库行 JSON 可带此字段便于展示）
   */
  manualMark?: "redundant_covered" | "instrument_excluded";
}

export type CoverageMode = 'full' | 'incremental';

/** 请求体 meta（与 payload 并列） */
export interface CoverageUploadMeta {
  /** 用于继承覆盖：父提交 SHA（须已有对应 coverage_report） */
  parentCommit?: string | null;
  /** full=全文件行；incremental=结合 incrementalScopes 标记 inScope */
  mode: CoverageMode;
  /** 增量 diff 的基准（如 main 顶端），仅展示/审计用 */
  diffBaseCommit?: string | null;
  /** 每文件相对父提交需重算覆盖的行号（新增/修改），不在此集合的行可继承父提交已覆盖 */
  fileChanges?: Record<string, { resetLines?: number[] }>;
  /** 增量：每文件属于 diff 范围内的行号（用于 inScope）；缺省则 inScope 对插桩行视为 true */
  incrementalScopes?: Record<string, number[]>;
  /** 插桩失败的行号（构建/SDK 侧），按文件 */
  instrumentFailures?: Record<string, number[]>;
  /** 可选：每文件源文件最大行号，用于补全 statement 未覆盖的空白行展示 */
  maxSourceLines?: Record<string, number>;
}
