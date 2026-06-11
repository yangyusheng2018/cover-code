## ADDED Requirements

### Requirement: 澶氭瀯寤哄伐鍏锋紨绀哄伐绋?

浠撳簱 MUST 鎻愪緵 Vite Vue3銆乄ebpack Vue3銆乄ebpack React TS 绛夋渶灏忓彲杩愯绀轰緥锛涘悇绀轰緥 MUST 閫氳繃 workspace 渚濊禆 `istanbul-live-*` 鍖呫€?

#### Scenario: 鍚姩 Vite 婕旂ず

- **WHEN** 鍦ㄦ牴鐩綍鎵ц `pnpm run dev:vite`
- **THEN** `examples/vite-vue3` 浠ュ紑鍙戞ā寮忓惎鍔ㄥ苟鍚敤 Istanbul 鎻掓々锛堢敱 vite.config 鎺у埗锛?

#### Scenario: 鍚姩 Webpack React 婕旂ず

- **WHEN** 鎵ц `pnpm run dev:react`
- **THEN** `examples/webpack-react-ts` 鍚姩涓?html-webpack-plugin 涓?IstanbulLiveWebpackPlugin 鍗忓悓娉ㄥ叆涓婃姤鑴氭湰

### Requirement: 绠€鏄撹鐩栫巼鎺ユ敹鏈嶅姟

`examples/coverage-server` MUST 鎻愪緵鍙湰鍦拌繍琛岀殑绠€鏄?HTTP 鎺ユ敹绔紝鐢ㄤ簬鍦ㄤ笉鍚姩 cover-admin 鏃堕獙璇?SDK 涓婃姤琛屼负銆?

#### Scenario: 鏈湴鎺ユ敹涓婃姤

- **WHEN** 绀轰緥宸ョ▼灏?`upload.endpoint` 鎸囧悜 coverage-server 鐩戝惉鍦板潃
- **THEN** 娴忚鍣?POST 鐨?coverage payload 琚帴鏀舵湇鍔¤褰曟垨鍝嶅簲鎴愬姛

### Requirement: 绀轰緥涓庢寮忓悗绔彲鍒囨崲

鍚勭ず渚嬬殑閰嶇疆 MUST 鍏佽灏?`upload.endpoint` 鍒囨崲涓?cover-admin 鐨?`/api/coverage/upload`锛屼互渚垮悓涓€ demo 鑱旇皟姝ｅ紡绠＄悊绔€?

#### Scenario: 鑱旇皟 cover-admin

- **WHEN** 绀轰緥 `project_code` 涓庡悗鍙伴」鐩?`code` 涓€鑷达紝涓斿凡鍒涘缓瀵瑰簲 `branch_coverage`
- **THEN** 涓婃姤鏁版嵁鍐欏叆 cover-admin 鏁版嵁搴撹€岄潪浠?demo 鎺ユ敹鏈嶅姟

