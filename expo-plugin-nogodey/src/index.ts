import fs from 'node:fs'
import path from 'node:path'
import {withDangerousMod, withEntitlementsPlist} from '@expo/config-plugins'
import type {ConfigPlugin} from '@expo/config-plugins'

/**
 * Expo Config Plugin for Nogodey LLM integration
 *
 * This plugin:
 * - Adds ML Model Inference entitlement for iOS
 * - Copies Swift files to the iOS project during prebuild
 */
const withNogodey: ConfigPlugin = config => {
  let updatedConfig = withEntitlementsPlist(config, config => {
    return {
      ...config,
      modResults: {
        ...config.modResults,
        'com.apple.developer.ml.model-inference': true,
      },
    }
  })

  updatedConfig = withDangerousMod(updatedConfig, [
    'ios',
    async config => {
      const projectRoot = config.modRequest.projectRoot
      const pluginsDestDir = path.join(projectRoot, 'ios', 'Plugins', 'nogodey')

      if (!fs.existsSync(pluginsDestDir)) {
        fs.mkdirSync(pluginsDestDir, {recursive: true})
        console.log(`Created directory: ${pluginsDestDir}`)
      }

      // Path to the source files in node_modules
      const sourcePath = path.join(
        projectRoot,
        'node_modules',
        'expo-plugin-nogodey',
        'ios',
        'Plugins',
        'nogodey'
      )

      const filesToCopy = ['NogoLLM.swift', 'NogoLLM-Bridging-Header.h']

      // Copy each file to the destination
      for (const fileName of filesToCopy) {
        const sourceFile = path.join(sourcePath, fileName)
        const destFile = path.join(pluginsDestDir, fileName)

        if (fs.existsSync(sourceFile)) {
          fs.copyFileSync(sourceFile, destFile)
          console.log(`Copied ${fileName} to ${pluginsDestDir}`)
        } else {
          console.warn(`Source file not found: ${sourceFile}`)
        }
      }

      return config
    },
  ])

  return updatedConfig
}

export default withNogodey
