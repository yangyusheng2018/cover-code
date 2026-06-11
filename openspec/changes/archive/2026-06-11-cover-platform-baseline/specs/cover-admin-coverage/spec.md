## ADDED Requirements

### Requirement: 鍏紑瑕嗙洊鐜囦笂鎶?

`POST /api/coverage/upload` MUST 涓哄叕寮€鎺ュ彛锛堟棤闇€ JWT锛夛紱MUST 鏍规嵁 `X-Project-Code` 涓?`X-Git-Branch` 鍖归厤 `branch_coverage`锛涗笟鍔″け璐ユ椂 HTTP MUST 浠嶄负 200 涓?`success: false`銆?

#### Scenario: 鎴愬姛涓婃姤鍏ㄩ噺浠诲姟

- **WHEN** 璇锋眰澶村惈鏈夋晥 project code 涓?test branch锛宐ody 涓?Istanbul 澶氭枃浠?payload
- **THEN** 鍒涘缓鎴栨洿鏂板搴?`coverage_report` 涓?`coverage_file` 琛岀骇鏁版嵁锛岃繑鍥?`success: true` 鍙?`reportId`銆乣files` 缁熻

#### Scenario: 鍚?commit 鍐嶆涓婃姤鍚堝苟

- **WHEN** 鍚屼竴 `branch_coverage` + 鍚屼竴 `git_commit` 鍐嶆涓婃姤
- **THEN** MUST 鏇存柊鍚屼竴鏉?report锛涜绾у悎骞?MUST 淇濈暀姝ゅ墠宸茶鐩栬锛坄carried: true`锛夛紝閬垮厤鍒锋柊瀵艰嚧瑕嗙洊褰掗浂

### Requirement: 澧為噺涓庤法鎻愪氦缁ф壙

澧為噺浠诲姟锛坄task_scope = incremental`锛夊叆搴撳墠 MUST 鎸?GitHub compare 杩囨护 diff 鑼冨洿鍐呮枃浠朵笌琛岋紱璺ㄦ彁浜?MUST 鏀寔鏄惧紡/闅愬紡鐖?commit 琛岀户鎵夸笌 `meta.fileChanges.resetLines` 閲嶇疆銆?

#### Scenario: 澧為噺浠诲姟 diff 杩囨护

- **WHEN** branch_coverage 涓?incremental 涓?GitHub compare 鍙敤
- **THEN** 浠?diff 娑夊強璺緞鍐欏叆搴擄紱`line_details.inScope` 鍙嶆槧 diff 鑼冨洿

#### Scenario: Source map 琛屽彿鏄犲皠

- **WHEN** payload 鍚?`inputSourceMap`
- **THEN** 鏈嶅姟绔?MUST 浣跨敤 istanbul-lib-source-maps 鏄犲皠鍚庡啀璁＄畻 `line_details`锛涙槧灏勫け璐?MUST 鍛婅骞跺洖閫€鏈槧灏勬暟鎹?

### Requirement: 椤圭洰绠＄悊

`/api/projects` MUST 鎻愪緵 CRUD锛涢」鐩?MUST 鍚叏灞€鍞竴 `code`銆乣gitUrl`銆乣mainBranch`銆佸彲閫?`relativeDir` 涓庡姞瀵嗗瓨鍌ㄧ殑 `repoToken`锛堝搷搴斾粎 `hasRepoToken`锛夈€?

#### Scenario: 鍒涘缓椤圭洰

- **WHEN** `POST /api/projects/create` 鍚?name銆乧ode銆乬itUrl
- **THEN** 椤圭洰鍏ュ簱锛沗code` 浠呭厑璁稿瓧姣嶆暟瀛楀強 `._-`锛汼DK 渚?`project_code` MUST 涓庢 code 涓€鑷?

### Requirement: 鍒嗘敮瑕嗙洊鐜囦换鍔?

`/api/branch-coverages` MUST 鍏宠仈椤圭洰涓庢祴璇曞垎鏀紱鍚屼竴 `projectId + test_branch` 鍏ㄥ眬 MUST 浠呬竴鏉¤褰曪紱`taskScope` 涓?`full` 鎴?`incremental` 鍐冲畾鍒楄〃褰掑睘銆?

#### Scenario: 瑕嗙洊鐜囪鎯呭脊绐?

- **WHEN** `POST /api/branch-coverages/coverage-report` 鍚?`branchCoverageId`
- **THEN** 杩斿洖 summary銆乫ileTree銆乫iles 琛岀骇璇︽儏锛沬ncremental 瑙嗗浘 MUST 鍦?task_scope 涓?incremental 鏃跺彲鐢?

#### Scenario: 杩滅▼鎷夊彇婧愮爜

- **WHEN** `POST /api/branch-coverages/source-file` 鍚?path 涓?branchCoverageId
- **THEN** 鏈嶅姟绔寜 gitUrl銆乧ommit銆乺epoToken 浠?GitHub/GitLab 绛夋媺鍙?UTF-8 婧愮爜姝ｆ枃渚涘墠绔潃鑹?

### Requirement: 浜哄伐鏍囪涓庨噸缃?

绯荤粺 MUST 鏀寔 `coverage-manual-marks`锛堝啑浣欍€佸厹搴曘€佹彃妗╂帓闄わ級涓?`reset-coverage` 娓呯┖璇ュ垎鏀笅鍏ㄩ儴涓婃姤銆?

#### Scenario: 琛岀骇浜哄伐鏍囪

- **WHEN** 璇︽儏寮圭獥鎻愪氦 lineMarks 涓?`redundant_covered` 鎴?`fallback_covered`
- **THEN** 璇ヨ鍦ㄧ粺璁′腑 MUST 瑙嗕负宸茶鐩栵紱鏍囪 MUST 鎸佷箙鍖栦簬 `coverage_file.manual_marks` 骞跺湪鍐嶆涓婃姤鏃舵寜鍩哄噯閲嶆斁

#### Scenario: 娓呯┖瑕嗙洊鐜?

- **WHEN** `POST /api/branch-coverages/reset-coverage`
- **THEN** 鍒犻櫎璇?branch_coverage 涓嬪叏閮?coverage_report锛堢骇鑱?coverage_file锛夛紝淇濈暀 branch_coverage 閰嶇疆鏈韩

