## ADDED Requirements

### Requirement: Core 涓婃姤涓庤矾寰勮В鏋?

`istanbul-live-core` MUST 鎻愪緵 `buildCoverageUploadInlineScript` 鐢熸垚娴忚鍣ㄥ唴瀹氭椂 POST `window.__coverage__` 鐨勫唴鑱旇剼鏈紱MUST 鎻愪緵 `resolveCoverageReportPathRoot` 涓?`resolveGitUploadMeta` 鐢ㄤ簬璺緞褰掍竴鍖栦笌 Git 鍏冩暟鎹€?

#### Scenario: 涓婃姤鑴氭湰鎼哄甫椤圭洰鏍囪瘑

- **WHEN** 鎻掍欢鍚敤 upload 涓旈厤缃?`project_code` 涓?`endpoint`
- **THEN** 鍐呰仈鑴氭湰 MUST 鍦ㄨ姹傚ご鎼哄甫 `X-Project-Code`锛屽苟鎸?`intervalMs`锛堥粯璁?3000ms锛屾渶灏?500ms锛夊悜 endpoint POST

#### Scenario: 瑕嗙洊鐜囪矾寰勫綊涓€鍖?

- **WHEN** 涓婃姤鑴氭湰鎵ц涓斿瓨鍦?`reportPathRoot`
- **THEN** coverage 瀵硅薄閿強鏉＄洰鍐?`path` MUST 瑙勮寖涓虹浉瀵逛粨搴撴牴鐨勮矾寰?

### Requirement: Vite 鎻掍欢缁勫悎

`istanbul-live-vite-plugin` MUST 瀵煎嚭 `istanbulLiveVitePlugin(options)` 杩斿洖鎻掍欢鏁扮粍锛堝惈 vite-plugin-istanbul銆佸彲閫?Vue template 鎻掓々銆佷笂鎶ユ敞鍏ワ級锛涘惎鐢ㄦ彃妗╂椂 `project_code` MUST 涓洪潪绌哄瓧绗︿覆锛屽惁鍒欐瀯寤?MUST 澶辫触銆?

#### Scenario: Vite 寮€鍙戞ā寮忔彃妗╀笌涓婃姤

- **WHEN** `coverage: true` 涓旈厤缃?`upload.endpoint`锛屾墽琛?`vite dev`
- **THEN** 婧愮爜琚?Istanbul 鎻掓々锛孒TML head 娉ㄥ叆涓婃姤鑴氭湰锛屾祻瑙堝櫒鍛ㄦ湡鎬?POST 鑷?endpoint

#### Scenario: Vue SFC 妯℃澘鍒嗘敮瑕嗙洊

- **WHEN** `vueTemplateCoverage` 涓?true锛堥粯璁わ級
- **THEN** 瀵?`?vue&type=template` 铏氭嫙鍧楄繘琛屼簩娆℃彃妗╋紝浣挎ā鏉垮垎鏀繘鍏ヨ鐩栫巼缁熻

### Requirement: Webpack 鎻掍欢缁勫悎

`istanbul-live-webpack-plugin` MUST 鍦?`coverage: true` 鏃跺鍖归厤婧愮爜鎻掓々锛屽苟鍦ㄥ瓨鍦?html-webpack-plugin 鏃跺悜 HTML 娉ㄥ叆涓?core 涓€鑷寸殑涓婃姤鑴氭湰銆?

#### Scenario: Webpack 鏋勫缓鎻掓々

- **WHEN** 鍚敤 `IstanbulLiveWebpackPlugin` 涓?`coverage: true`
- **THEN** 鍖归厤 `include`/`exclude` 鐨勬ā鍧楃粡 istanbul-loader 鎻掓々锛屾瀯寤轰骇鐗╁彲鍦ㄦ祻瑙堝櫒浜х敓 `__coverage__`

### Requirement: 涓庣鐞嗙瀵归綈鐨勯厤缃?

SDK 鎻掍欢 MUST 灏?`project_code` 鏄犲皠涓轰笂鎶ュご `X-Project-Code`锛沗upload.endpoint` MUST 鎸囧悜绠＄悊绔?`POST /api/coverage/upload` 鎴栧吋瀹规帴鏀剁銆?

#### Scenario: 鏈厤缃垎鏀鐩栫巼浠诲姟

- **WHEN** SDK 鍚?cover-admin 涓婃姤锛屼絾椤圭洰 code + 娴嬭瘯鍒嗘敮鏃犲搴?`branch_coverage` 璁板綍
- **THEN** 鏈嶅姟绔?HTTP 200 涓?`{ success: false, message: "鏃犳椤圭洰鎴栬€呭垎鏀? }`

### Requirement: Babel 鎻掓々杈呭姪

`istanbul-live-babel` MUST 鎻愪緵闈?Vite/Webpack 鏍囧噯閾捐矾涓嬬殑 Babel 鍗曟鎻掓々杈呭姪锛屼緵楂樼骇闆嗘垚鍦烘櫙浣跨敤銆?

#### Scenario: 鐙珛 Babel 娴佹按绾?

- **WHEN** 涓氬姟宸ョ▼浣跨敤鑷畾涔?Babel 鏋勫缓涓斿紩鍏?`istanbul-live-babel`
- **THEN** 鍙湪涓嶄緷璧?Vite/Webpack 鎻掍欢鐨勬儏鍐典笅瀵规寚瀹氭簮鐮佹彃妗?

