## ADDED Requirements

### Requirement: JWT 涓?Refresh Token

绯荤粺 MUST 浣跨敤 JWT access token锛圚eader `Authorization: Bearer`锛変繚鎶ら櫎 `@Public` 澶栫殑 API锛況efresh token MUST 瀛?MySQL 骞堕€氳繃 HttpOnly Cookie `refresh_token` 涓嬪彂锛涚櫥褰曘€佸埛鏂般€佺櫥鍑烘帴鍙?MUST 鍦?`docs/API.md` 鏈夊畬鏁磋鏄庛€?

#### Scenario: 鐢ㄦ埛鐧诲綍

- **WHEN** 瀹㈡埛绔?`POST /api/auth/login` 鎻愪氦鏈夋晥 username/password
- **THEN** 鍝嶅簲鍚?`accessToken`銆乣expiresIn`銆乣user`锛況efresh token 鍐欏叆 Cookie锛汻edis 涓鐢ㄦ埛銆屽綋鍓嶇敓鏁堣鑹层€嶈娓呴櫎

#### Scenario: 鍒锋柊 access token

- **WHEN** 瀹㈡埛绔?`POST /api/auth/refresh` 涓?Cookie 鍚湁鏁?refresh_token
- **THEN** 杩斿洖鏂?accessToken 骞跺埛鏂?Cookie

### Requirement: 鐢ㄦ埛娉ㄥ唽涓庤嚜鍔╂敼瀵?

`POST /api/users/register` MUST 涓哄叕寮€鎺ュ彛锛屾帴鍙?username銆乸assword銆佸彲閫?email锛沗POST /api/users/change-password` MUST 瑕佹眰 JWT 涓斾粎鍏佽淇敼褰撳墠鐢ㄦ埛瀵嗙爜銆?

#### Scenario: 棣栦釜鐢ㄦ埛娉ㄥ唽

- **WHEN** 鏃?JWT 璋冪敤 register 涓?username 鏈崰鐢?
- **THEN** 鐢ㄦ埛鍏ュ簱锛堝瘑鐮?bcrypt锛夛紝杩斿洖涓嶅惈瀵嗙爜鐨勭敤鎴蜂俊鎭?

### Requirement: 瑙掕壊涓庡弻杞ㄦ潈闄?

绯荤粺 MUST 鏀寔瑙掕壊锛堢敤鎴风粍锛塁RUD銆佺敤鎴峰瑙掕壊缁戝畾銆佽鑹蹭笌鎺ュ彛鏉冮檺/UI 鏉冮檺鐨勬暣琛ㄦ浛鎹㈢粦瀹氾紱鎺ュ彛鏉冮檺 code MUST 涓?`@RequireApiPermissions` 瑁呴グ鍣ㄤ竴鑷淬€?

#### Scenario: 鎺ュ彛鏉冮檺鏍￠獙

- **WHEN** 宸茬櫥褰曠敤鎴疯闂甫 `@RequireApiPermissions('project:list')` 鐨勬帴鍙?
- **THEN** 鐢ㄦ埛 MUST 鎷ユ湁璇?code锛堟寜褰撳墠鐢熸晥瑙掕壊鎴栧叏瑙掕壊骞堕泦锛夛紱鍚﹀垯鎷掔粷

#### Scenario: 鍒囨崲褰撳墠鐢熸晥瑙掕壊

- **WHEN** 鐢ㄦ埛 `POST /api/auth/switch-role` 浼犲叆鍏舵嫢鏈夌殑 `roleId`
- **THEN** Redis 璁板綍鐢熸晥瑙掕壊锛涘悗缁?`my-permissions` 涓庢帴鍙ｆ牎楠屼粎鎸夎瑙掕壊璁＄畻锛涗紶 null 鎭㈠澶氳鑹插苟闆?

### Requirement: UI 鏉冮檺鏍?

绯荤粺 MUST 缁存姢 `ui_permission` 鏍戯紙directory/menu/button锛夛紱`GET /api/ui-permissions/tree` 涓?`GET /api/auth/my-permissions` 杩斿洖鐨?`uiPermissionTree` MUST 鍚?`path`銆乣code`銆乣showInMenu` 绛夊瓧娈典緵鍓嶇闂ㄧ銆?

#### Scenario: 鑿滃崟鑺傜偣杩囨护

- **WHEN** 鍓嶇娓叉煋渚ф爮涓旇妭鐐?`showInMenu` 涓?false
- **THEN** 璇ヨ妭鐐?MUST 涓嶅嚭鐜板湪渚ф爮锛屼絾浠嶅弬涓庢潈闄愭牎楠岋紙濡?button 绫诲瀷锛?

### Requirement: API 鏂囨。鍚屾

鍑¤矾鐢便€侀壌鏉冦€佽姹備綋鍙樻洿 MUST 鍚屾鏇存柊 `apps/cover-admin/docs/API.md`锛堣 `.cursor/rules/sync-api-docs.mdc`锛夈€?

#### Scenario: 鏂板鍙椾繚鎶ゆ帴鍙?

- **WHEN** 寮€鍙戣€呮柊澧炲甫 `@RequireApiPermissions` 鐨勬帶鍒跺櫒鏂规硶
- **THEN** 鍚屼竴鍙樻洿 MUST 鏇存柊 API.md 瀵瑰簲绔犺妭涓庢眹鎬昏〃

