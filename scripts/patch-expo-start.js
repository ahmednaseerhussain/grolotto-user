/**
 * Post-install patch for Expo CLI startAsync.js
 * 
 * Fixes: "TypeError: Body is unusable: Body has already been read"
 * This error occurs on Node.js v20.19+ with Expo SDK 54's @expo/cli 
 * due to a bug in the built-in undici fetch response body handling
 * during dependency version validation.
 * 
 * This patch wraps the dependency validation call in a try-catch
 * so it logs a warning instead of crashing the dev server.
 */
const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname, '..', 'node_modules', 'expo', 'node_modules',
  '@expo', 'cli', 'build', 'src', 'start', 'startAsync.js'
);

// Also check if @expo/cli is hoisted (not nested under expo)
const altTargetFile = path.join(
  __dirname, '..', 'node_modules',
  '@expo', 'cli', 'build', 'src', 'start', 'startAsync.js'
);

const filePath = fs.existsSync(targetFile) ? targetFile : 
                 fs.existsSync(altTargetFile) ? altTargetFile : null;

if (!filePath) {
  console.log('[patch-expo-start] Could not find startAsync.js, skipping patch.');
  process.exit(0);
}

const original = `if (!_env.env.EXPO_NO_DEPENDENCY_VALIDATION && !settings.webOnly && !options.devClient) {
        await (0, _profile.profile)(_validateDependenciesVersions.validateDependenciesVersionsAsync)(projectRoot, exp, pkg);
    }`;

const patched = `if (!_env.env.EXPO_NO_DEPENDENCY_VALIDATION && !settings.webOnly && !options.devClient) {
        try {
            await (0, _profile.profile)(_validateDependenciesVersions.validateDependenciesVersionsAsync)(projectRoot, exp, pkg);
        } catch (validationError) {
            _log.log(_chalk().default.yellow('Warning: Could not validate dependency versions: ' + validationError.message));
        }
    }`;

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('catch (validationError)')) {
    console.log('[patch-expo-start] Already patched, skipping.');
    process.exit(0);
  }
  
  if (!content.includes(original)) {
    console.log('[patch-expo-start] Target code not found (possibly different Expo version), skipping.');
    process.exit(0);
  }
  
  content = content.replace(original, patched);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[patch-expo-start] Successfully patched startAsync.js');
} catch (err) {
  console.log('[patch-expo-start] Patch failed:', err.message);
}
