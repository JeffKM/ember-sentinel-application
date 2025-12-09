const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 새 아키텍처 문제 우회
config.resolver.unstable_enablePackageExports = false;

module.exports = config;













