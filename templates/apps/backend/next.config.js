// libSQLクライアントのプラットフォーム固有パッケージのリスト
// Webpackでの外部モジュール化が必要なライブラリを定義
const externalLibsqlPackages = [
  "@libsql/client",
  "@libsql/darwin-arm64",
  "@libsql/darwin-x64",
  "@libsql/linux-arm64",
  "@libsql/linux-x64",
  "@libsql/win32-arm64",
  "@libsql/win32-ia32",
  "@libsql/win32-x64",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // サーバーサイドでバンドルしない外部パッケージを指定
  // PrismaクライアントとlibSQLアダプターを外部モジュールとして扱う
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-libsql", "@libsql/client"],

  // Turbopack設定でtranspilePackagesを使用して共有UIパッケージをバンドルに含める
  transpilePackages: ["@repo/ui"],

  // Webpack設定のカスタマイズ
  webpack: (config, { isServer }) => {
    // サーバーサイドビルドでのみ実行
    if (isServer) {
      // 既存の外部モジュール設定を取得
      const existingExternals = config.externals;
      const wrappedExternals = Array.isArray(existingExternals) ? [...existingExternals] : [];

      // 既存の外部モジュール設定が配列でない場合は追加
      if (!Array.isArray(existingExternals) && existingExternals) {
        wrappedExternals.push(existingExternals);
      }

      // libSQLパッケージを外部モジュールとして扱うカスタム関数を追加
      wrappedExternals.push((context, callback) => {
        const request = context.request;
        // libSQLパッケージの場合はCommonJSモジュールとして外部化
        if (request && externalLibsqlPackages.includes(request)) {
          return callback(null, `commonjs ${request}`);
        }
        return callback();
      });
      config.externals = wrappedExternals;
    }
    return config;
  },
};

export default nextConfig;

// EOF
