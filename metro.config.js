const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 새 아키텍처 문제 우회
config.resolver.unstable_enablePackageExports = false;

// 다른 프로젝트 디렉토리 제외
config.resolver.blockList = [
  /CoTePractice\/.*/,
  /INHA_OSAP_002_T6\/.*/,
  /loc-git\/.*/,
  /naraka-chat\/.*/,
  /naraka-mobile\/.*/,
  /zagabi\/.*/,
  /ember-sentinel\/.*/,
];

module.exports = config;













