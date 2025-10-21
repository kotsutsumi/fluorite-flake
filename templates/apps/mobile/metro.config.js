const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Get the monorepo root
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

// Configure watchFolders to include the monorepo root for pnpm workspace support
config.watchFolders = [monorepoRoot];

// Configure resolver for monorepo
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: true,
  unstable_conditionNames: ["require", "import", "react-native"],
  nodeModulesPaths: [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(monorepoRoot, "node_modules"),
  ],
  resolveRequest: (context, moduleName, platform) => {
    // Force tslib to resolve to the project's node_modules to avoid Metro watching issues
    if (moduleName === "tslib" || moduleName.startsWith("tslib/")) {
      const tslibPath = path.join(
        monorepoRoot,
        "node_modules",
        ".pnpm",
        "tslib@2.8.1",
        "node_modules",
        "tslib",
        moduleName === "tslib" ? "tslib.js" : moduleName.replace("tslib/", "")
      );
      return {
        filePath: tslibPath,
        type: "sourceFile",
      };
    }

    // Default resolver
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
