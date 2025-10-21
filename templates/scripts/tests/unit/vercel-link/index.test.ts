import { describe, expect, it } from "vitest";
import {
  createConsoleLogger,
  createDefaultDeps,
  createReadlinePrompt,
  createRunCommand,
  createRunCommandCapture,
  discoverApps,
  fetchVercelTeams,
  runVercelLink,
  selectApps,
  selectAppsInteractive,
  selectTeam,
  selectTeamInteractive,
  switchToTeam,
  updateAllEnvFiles,
} from "../../../libs/vercel-link/index.js";

describe("UT-SCRIPTS-VERCEL-LINK-03: index exports", () => {
  it("should export all required modules", () => {
    expect(discoverApps).toBeDefined();
    expect(selectApps).toBeDefined();
    expect(selectAppsInteractive).toBeDefined();
    expect(createRunCommand).toBeDefined();
    expect(createRunCommandCapture).toBeDefined();
    expect(createDefaultDeps).toBeDefined();
    expect(createReadlinePrompt).toBeDefined();
    expect(updateAllEnvFiles).toBeDefined();
    expect(createConsoleLogger).toBeDefined();
    expect(runVercelLink).toBeDefined();
    expect(fetchVercelTeams).toBeDefined();
    expect(selectTeam).toBeDefined();
    expect(selectTeamInteractive).toBeDefined();
    expect(switchToTeam).toBeDefined();
  });
});

// EOF
