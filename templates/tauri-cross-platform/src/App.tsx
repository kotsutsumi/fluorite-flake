import { open } from "@tauri-apps/api/shell";
import { invoke } from "@tauri-apps/api/tauri";
import type React from "react";
import { useEffect, useState } from "react";
import "./App.css";

type SystemInfo = {
    platform: string;
    architecture: string;
    version: string;
};

const App: React.FC = () => {
    const [greetMsg, setGreetMsg] = useState("");
    const [name, setName] = useState("");
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

    // システム情報を取得
    useEffect(() => {
        invoke<SystemInfo>("get_system_info").then((info) => {
            setSystemInfo(info);
        });
    }, []);

    // 挨拶メッセージを取得
    async function greet() {
        if (!name.trim()) {
            return;
        }

        try {
            const message = await invoke<string>("greet", { name });
            setGreetMsg(message);
        } catch (error) {
            console.error("挨拶の取得に失敗しました:", error);
        }
    }

    // 外部リンクを開く
    const openGithub = () => {
        open("https://github.com/tauri-apps/tauri");
    };

    return (
        <div className="container">
            <h1>Tauri + React クロスプラットフォームアプリ</h1>

            {/* システム情報表示 */}
            {systemInfo && (
                <div className="system-info">
                    <h2>システム情報</h2>
                    <p>プラットフォーム: {systemInfo.platform}</p>
                    <p>アーキテクチャ: {systemInfo.architecture}</p>
                    <p>バージョン: {systemInfo.version}</p>
                </div>
            )}

            {/* 挨拶機能 */}
            <div className="greeting-section">
                <h2>挨拶機能</h2>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        greet();
                    }}
                >
                    <input
                        id="greet-input"
                        onChange={(e) => setName(e.currentTarget.value)}
                        placeholder="名前を入力してください..."
                        type="text"
                        value={name}
                    />
                    <button type="submit">挨拶する</button>
                </form>
                {greetMsg && <p className="greet-msg">{greetMsg}</p>}
            </div>

            {/* 外部リンク */}
            <div className="links-section">
                <h2>リンク</h2>
                <button onClick={openGithub} type="button">
                    Tauri GitHubを開く
                </button>
            </div>
        </div>
    );
};

export default App;
