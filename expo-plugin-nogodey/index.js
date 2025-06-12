const { withEntitlements } = require("@expo/config-plugins");
const fs = require('node:fs');
const path = require('node:path');

const withNogodey = (initialConfig) => {
  // Add ML Model Inference entitlement for iOS
  const configWithEntitlements = withEntitlements(initialConfig, (configItem) => {
    return {
      ...configItem,
      modResults: {
        ...configItem.modResults,
        "com.apple.developer.ml.model-inference": true
      }
    };
  });

  return {
    ...configWithEntitlements,
    mods: {
      ...configWithEntitlements.mods,
      ios: {
        ...configWithEntitlements.mods?.ios,
        prebuild: async (prebuildConfig) => {
          let updatedConfig = prebuildConfig;
          if (updatedConfig.mods?.ios?.prebuild) {
            updatedConfig = await updatedConfig.mods.ios.prebuild(updatedConfig);
          }

          const projectRoot = updatedConfig.modRequest.projectRoot;
          const pluginsDestDir = path.join(projectRoot, 'ios', 'Plugins', 'nogodey');
          
          // Ensure the destination directory exists
          if (!fs.existsSync(pluginsDestDir)) {
            fs.mkdirSync(pluginsDestDir, { recursive: true });
            console.log(`Created directory: ${pluginsDestDir}`);
          }

          const sourcePath = path.join(
            projectRoot, 
            'node_modules', 
            'expo-plugin-nogodey',
            'ios',
            'Plugins',
            'nogodey'
          );

          const filesToCopy = [
            'NogoLLM.swift',
            'NogoLLM-Bridging-Header.h',
          ];

          // Copy each file to the destination
          for (const fileName of filesToCopy) {
            const sourceFile = path.join(sourcePath, fileName);
            const destFile = path.join(pluginsDestDir, fileName);
            
            if (fs.existsSync(sourceFile)) {
              fs.copyFileSync(sourceFile, destFile);
              console.log(`Copied ${fileName} to ${pluginsDestDir}`);
            } else {
              console.warn(`Source file not found: ${sourceFile}`);
            }
          }

          return updatedConfig;
        }
      }
    }
  };
};

module.exports = withNogodey;
