/**
 * 스타일링 색상 유틸리티 함수 모음.
 * parseHexColor, rgbToHex, mixColors, isLightColor, suggestColors, isValidCssColor 제공.
 */

/** RGB 색상 값 */
interface RGB {
  r: number;
  g: number;
  b: number;
}

/** SuggestColors 결과 타입 */
export interface SuggestedColors {
  questionColor: string;
  inputBackground: string;
  inputBorderColor: string;
  cardBackground: string;
  pageBackground: string;
  buttonTextColor: string;
}

/** 자주 사용되는 CSS named color 매핑 */
const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  gray: '#808080',
  grey: '#808080',
  orange: '#ffa500',
  purple: '#800080',
  pink: '#ffc0cb',
  transparent: '#00000000',
};

/**
 * 유효한 CSS 색상인지 검증한다.
 * hex, rgb(), rgba(), hsl(), hsla(), named color를 지원한다.
 */
export function isValidCssColor(color: string): boolean {
  if (!color || typeof color !== 'string') return false;
  const trimmed = color.trim().toLowerCase();

  // named color 검사
  if (NAMED_COLORS[trimmed]) return true;

  // hex 검사: #rgb, #rgba, #rrggbb, #rrggbbaa
  if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) return true;

  // rgb/rgba 검사
  if (
    /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+))?\s*\)$/.test(
      trimmed
    )
  )
    return true;

  // hsl/hsla 검사
  if (
    /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(,\s*(0|1|0?\.\d+))?\s*\)$/.test(
      trimmed
    )
  )
    return true;

  return false;
}

/**
 * hex 색상 문자열을 RGB 객체로 파싱한다.
 * #rgb, #rrggbb 형식을 지원한다. named color도 지원한다.
 */
export function parseHexColor(hex: string): RGB | null {
  if (!hex) return null;

  let h = hex.trim().toLowerCase();

  // named color 변환
  if (NAMED_COLORS[h]) {
    h = NAMED_COLORS[h];
  }

  // # 제거
  if (h.startsWith('#')) {
    h = h.slice(1);
  }

  // 3자리 -> 6자리 확장
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }

  // 8자리(#rrggbbaa)인 경우 alpha 무시
  if (h.length === 8) {
    h = h.slice(0, 6);
  }

  if (h.length !== 6) return null;

  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

  return { r, g, b };
}

/**
 * RGB 값을 hex 문자열로 변환한다.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 두 색상을 지정 비율로 혼합한다.
 * ratio는 두 번째 색상(color2)의 비율이다 (0=color1 100%, 1=color2 100%).
 */
export function mixColors(
  color1: string,
  color2: string,
  ratio: number
): string {
  const c1 = parseHexColor(color1);
  const c2 = parseHexColor(color2);

  if (!c1 || !c2) return color1;

  const r = c1.r + (c2.r - c1.r) * ratio;
  const g = c1.g + (c2.g - c1.g) * ratio;
  const b = c1.b + (c2.b - c1.b) * ratio;

  return rgbToHex(r, g, b);
}

/**
 * 색상이 밝은지 판단한다.
 * WCAG 2.0 상대 휘도 계산 기반. 임계값은 0.179.
 */
export function isLightColor(color: string): boolean {
  const rgb = parseHexColor(color);
  if (!rgb) return true;

  // sRGB -> linear 변환 후 상대 휘도 계산
  const linearize = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const luminance =
    0.2126 * linearize(rgb.r) +
    0.7152 * linearize(rgb.g) +
    0.0722 * linearize(rgb.b);

  return luminance > 0.179;
}

/**
 * Brand Color에서 조화로운 색상 팔레트를 생성한다.
 * 색상 혼합(mix)은 선형 보간법을 사용한다.
 */
export function suggestColors(brandColor: string): SuggestedColors {
  return {
    questionColor: mixColors(brandColor, '#000000', 0.35),
    inputBackground: mixColors(brandColor, '#ffffff', 0.92),
    inputBorderColor: mixColors(brandColor, '#ffffff', 0.6),
    cardBackground: mixColors(brandColor, '#ffffff', 0.97),
    pageBackground: mixColors(brandColor, '#ffffff', 0.855),
    buttonTextColor: isLightColor(brandColor) ? '#0f172a' : '#ffffff',
  };
}
