/**
 * 번역 파일 검증 스크립트.
 * en-US 기준으로 다른 로케일의 누락 키를 검사한다.
 *
 * 사용법: npx tsx scripts/check-i18n.ts
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

/** 번역 파일 경로 */
const LOCALES_DIR = join(__dirname, '../apps/client/src/app/i18n/locales');
/** 기준 로케일 */
const BASE_LOCALE = 'en-US';
/** 네임스페이스 */
const NAMESPACE = 'translation';

/** JSON 객체에서 모든 키 경로를 추출 (dot notation) */
function extractKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...extractKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function main() {
  // 기준 번역 파일 로드
  const basePath = join(LOCALES_DIR, BASE_LOCALE, `${NAMESPACE}.json`);
  if (!existsSync(basePath)) {
    console.error(`기준 번역 파일을 찾을 수 없습니다: ${basePath}`);
    process.exit(1);
  }

  const baseTranslation = JSON.parse(readFileSync(basePath, 'utf-8'));
  const baseKeys = extractKeys(baseTranslation);

  console.log(`기준 로케일: ${BASE_LOCALE} (${baseKeys.length}개 키)\n`);

  // 모든 로케일 디렉토리 검사
  const localeDirs = readdirSync(LOCALES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== BASE_LOCALE)
    .map((d) => d.name)
    .sort();

  let totalMissing = 0;
  let totalExtra = 0;

  for (const locale of localeDirs) {
    const localePath = join(LOCALES_DIR, locale, `${NAMESPACE}.json`);

    if (!existsSync(localePath)) {
      console.log(`[${locale}] 번역 파일 없음: ${NAMESPACE}.json`);
      totalMissing += baseKeys.length;
      continue;
    }

    const localeTranslation = JSON.parse(readFileSync(localePath, 'utf-8'));
    const localeKeys = extractKeys(localeTranslation);

    const missing = baseKeys.filter((k) => !localeKeys.includes(k));
    const extra = localeKeys.filter((k) => !baseKeys.includes(k));

    if (missing.length === 0 && extra.length === 0) {
      console.log(`[${locale}] OK (${localeKeys.length}개 키)`);
    } else {
      if (missing.length > 0) {
        console.log(`[${locale}] 누락 ${missing.length}개:`);
        missing.forEach((k) => console.log(`  - ${k}`));
        totalMissing += missing.length;
      }
      if (extra.length > 0) {
        console.log(`[${locale}] 초과 ${extra.length}개:`);
        extra.forEach((k) => console.log(`  + ${k}`));
        totalExtra += extra.length;
      }
    }
  }

  console.log(`\n총 누락: ${totalMissing}개, 총 초과: ${totalExtra}개`);

  if (totalMissing > 0) {
    process.exit(1);
  }
}

main();
