import { cp, mkdir, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

async function copyTemplates() {
    const currentDir = fileURLToPath(new URL(".", import.meta.url));
    const rootDir = resolve(currentDir, "..");
    const sourceDir = resolve(rootDir, "templates");
    const targetDir = resolve(rootDir, "dist", "templates");

    try {
        await stat(sourceDir);
    } catch {
        console.warn(
            "テンプレートディレクトリが存在しないためコピーをスキップします。"
        );
        return;
    }

    await rm(targetDir, { recursive: true, force: true });
    await mkdir(resolve(rootDir, "dist"), { recursive: true });
    await cp(sourceDir, targetDir, { recursive: true });

    console.log("✅ templates ディレクトリを dist にコピーしました");
}

copyTemplates().catch((error) => {
    console.error("❌ テンプレートコピーに失敗しました", error);
    process.exit(1);
});
