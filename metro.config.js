const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 새 아키텍처 문제 우회
config.resolver.unstable_enablePackageExports = false;

// 다른 프로젝트 디렉토리 제외 (자기 자신은 제외하지 않도록 주의)
config.resolver.blockList = [
  /CoTePractice\/.*/,
  /INHA_OSAP_002_T6\/.*/,
  /loc-git\/.*/,
  /naraka-chat\/.*/,
  /naraka-mobile\/.*/,
  /zagabi\/.*/,
];

module.exports = config;













