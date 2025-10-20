import { describe, expect, it } from "vitest";
import { getEnvProjects } from "../../../libs/env-tools/get-env-projects.js";

describe("UT-SCRIPTS-12: getEnvProjects", () => {
  it("設定されたプロジェクトリストを公開すること", () => {
    const projects = getEnvProjects();

    expect(projects).toHaveLength(4);
    expect(projects.map((p) => p.name)).toEqual(["docs", "web", "backend", "mobile"]);
  });

  it("不変の配列参照を返すこと", () => {
    const first = getEnvProjects();
    const second = getEnvProjects();

    expect(first).toBe(second);
  });
});

// EOF
