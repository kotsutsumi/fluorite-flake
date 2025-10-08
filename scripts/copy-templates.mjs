import { cp, mkdir, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

async function copyTemplates() {
    const currentDir = fileURLToPath(new URL(".", import.meta.url));
    const rootDir = resolve(currentDir, "..");
    const templatesDir = resolve(rootDir, "templates");
    const i18nDir = resolve(rootDir, "src", "i18n");
    const distDir = resolve(rootDir, "dist");
    const targetTemplatesDir = resolve(distDir, "templates");
    const targetI18nDir = resolve(distDir, "i18n");

    // distディレクトリを作成
    await mkdir(distDir, { recursive: true });

    // templatesディレクトリをコピー
    try {
        await stat(templatesDir);
        await rm(targetTemplatesDir, { recursive: true, force: true });
        await cp(templatesDir, targetTemplatesDir, { recursive: true });
        console.log("✅ templates ディレクトリを dist にコピーしました");
    } catch {
        console.warn("テンプレートディレクトリが存在しないためコピーをスキップします。");
    }

    // i18nディレクトリをコピー
    try {
        await stat(i18nDir);
        await rm(targetI18nDir, { recursive: true, force: true });
        await cp(i18nDir, targetI18nDir, { recursive: true });
        console.log("✅ i18n ディレクトリを dist にコピーしました");
    } catch {
        console.warn("i18nディレクトリが存在しないためコピーをスキップします。");
    }
}

copyTemplates().catch((error) => {
    console.error("❌ テンプレートコピーに失敗しました", error);
    process.exit(1);
});
