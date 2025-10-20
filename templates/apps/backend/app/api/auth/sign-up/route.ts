// `/api/auth/sign-up` と `/api/auth/sign-up/email` のレスポンスを揃えるため、実装を共有する。
// biome-ignore lint/performance/noBarrelFile: /api/auth/sign-up と /api/auth/sign-up/email で実装を共有する設計のため
export { OPTIONS, POST } from "./email/route";

// EOF
