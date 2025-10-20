const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix tslib module resolution issue
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: true,
  unstable_conditionNames: ["require", "import", "react-native"],
  resolveRequest: (context, moduleName, platform) => {
    // Force tslib to resolve to the CommonJS version
    if (moduleName === "tslib" || moduleName.startsWith("tslib/")) {
      const tslibPath = require.resolve("tslib");
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
