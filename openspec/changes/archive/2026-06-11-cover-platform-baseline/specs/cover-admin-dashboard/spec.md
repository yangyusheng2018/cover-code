## ADDED Requirements

### Requirement: 璁よ瘉浼氳瘽涓庤矾鐢卞畧鍗?

鍓嶇 MUST 浣跨敤 Pinia auth store 绠＄悊 access token 涓庣敤鎴凤紱鏈櫥褰曡闂彈淇濇姢璺敱 MUST 閲嶅畾鍚戣嚦 `/login`锛涘凡鐧诲綍璁块棶 login MUST 閲嶅畾鍚戣嚦棣栦釜鍙闂彍鍗曢〉鎴?`/403`銆?

#### Scenario: 鐧诲綍鍚庤惤鍦?

- **WHEN** 鐢ㄦ埛鐧诲綍鎴愬姛
- **THEN** `resolvePostLoginLanding` MUST 鏍规嵁 `uiPermissionTree` 瑙ｆ瀽棣栦釜鍙闂?`path`锛涙棤鏉冮檺鏃?MUST 杩涘叆 forbidden 椤?

#### Scenario: UI 璺緞闂ㄧ

- **WHEN** 宸茬櫥褰曠敤鎴疯闂?`meta.useUiPathGate` 涓?true 鐨勮矾鐢?
- **THEN** MUST 鏍￠獙 `auth.canSeeRoutePath(to.path)`锛涙棤鏉冮檺 MUST 璺宠浆 `/403`

### Requirement: 鏉冮檺绠＄悊椤甸潰

鍓嶇 MUST 鎻愪緵鐢ㄦ埛绠＄悊銆佺敤鎴风粍銆佹帴鍙ｆ潈闄愩€佽彍鍗曚笌鎸夐挳绛夎鍥撅紝涓?`apps/cover-admin/docs/API.md` 绉嶅瓙鑿滃崟 path 瀵归綈銆?

#### Scenario: 渚ф爮鑿滃崟娓叉煋

- **WHEN** 鍔犺浇 `my-permissions` 杩斿洖 uiPermissionTree
- **THEN** 渚ф爮 MUST 灞曠ず `showInMenu === true` 鐨?menu 鑺傜偣锛涜矾鐢?path MUST 涓庡簱琛?`ui_permission.path` 涓€鑷达紙濡?`/report/project`锛?

### Requirement: 瑕嗙洊鐜囦笟鍔￠〉闈?

鍓嶇 MUST 鎻愪緵椤圭洰绠＄悊銆佸叏閲忓垎鏀鐩栫巼銆佸閲忚鐩栫巼绠＄悊椤碉紱璇︽儏 MUST 閫氳繃寮圭獥灞曠ず鏂囦欢鏍戙€佽绾х潃鑹层€佷汉宸ユ爣璁颁笌澶?commit 鎶ュ憡鍒囨崲銆?

#### Scenario: 鍏ㄩ噺瑕嗙洊鐜囧垪琛?

- **WHEN** 鐢ㄦ埛璁块棶 `/report/branch-coverage` 涓旀湁 `branch-coverage:list` 鏉冮檺
- **THEN** 鍒楄〃 MUST 浠呭睍绀?`taskScope=full` 鐨勫垎鏀鐩栫巼浠诲姟

#### Scenario: 澧為噺瑕嗙洊鐜囧垪琛?

- **WHEN** 鐢ㄦ埛璁块棶 `/report/incremental-coverage`
- **THEN** 鍒楄〃 MUST 浠呭睍绀?`taskScope=incremental` 浠诲姟锛涜鎯?MUST 鏀寔 incremental 瑙嗗浘涓庣嫭绔嬫寜閽潈闄愮爜

### Requirement: API 鍩哄潃閰嶇疆

鍓嶇 MUST 閫氳繃 `VITE_API_BASE_URL` 鎸囧悜 cover-admin 鏍瑰湴鍧€锛汬TTP 瀹㈡埛绔?MUST 瀵?refresh 绛夋帴鍙ｅ惎鐢?`credentials: 'include'` 浠ユ惡甯?Cookie銆?

#### Scenario: 璺ㄥ煙 Cookie 鍒锋柊

- **WHEN** access token 杩囨湡涓?refresh Cookie 鏈夋晥
- **THEN** 鍓嶇 MUST 鍙皟鐢?`/api/auth/refresh` 鑾峰彇鏂?token 涓旀棤闇€鐢ㄦ埛閲嶆柊鐧诲綍

### Requirement: 涓庡悗绔绾︿竴鑷?

鍓嶇 `src/api/` 妯″潡 MUST 涓?`docs/API.md` 璺緞銆佽姹備綋瀛楁淇濇寔涓€鑷达紱鐮村潖鎬?API 鍙樻洿 MUST 鍚屾鏇存柊鍓嶇璋冪敤涓庣被鍨嬨€?

#### Scenario: 瑕嗙洊鐜囪鎯呰姹?

- **WHEN** 鎵撳紑鍒嗘敮瑕嗙洊鐜囪鎯呭脊绐?
- **THEN** 鍓嶇 MUST 璋冪敤 `coverage-report` 涓庡彲閫?`source-file` 鎺ュ彛锛屽苟鎸夎繑鍥?`lineDetails` 涓?`visualizationHint` 娓叉煋

