/**
 * 날짜 서수 접미사를 반환한다.
 * @param day - 일(day) 숫자
 * @returns 서수 접미사 ("st", "nd", "rd", "th")
 */
function getOrdinalSuffix(day: number): string {
  // 11, 12, 13은 항상 "th"
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/** 월 이름 (0-indexed) */
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * ISO 날짜 문자열을 서수 포매팅한다.
 * 예: "2024-01-01" -> "1st January 2024"
 *
 * @param dateStr - ISO 날짜 문자열 (YYYY-MM-DD 또는 ISO 8601)
 * @returns 서수 포매팅된 날짜 문자열. 파싱 실패 시 원본 반환.
 */
export function formatDateValue(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const day = date.getUTCDate();
    const month = MONTH_NAMES[date.getUTCMonth()];
    const year = date.getUTCFullYear();

    return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * 배열 값을 쉼표로 연결한다. 빈 값은 제거.
 * 예: ["a", "", "b", "c"] -> "a, b, c"
 *
 * @param values - 문자열 배열
 * @returns 쉼표 구분 문자열
 */
export function formatArrayValue(values: string[]): string {
  return values
    .filter((v) => v !== '' && v !== null && v !== undefined)
    .join(', ');
}

/**
 * 25자 이상 텍스트를 축약한다.
 * 앞 10자 + "..." + 뒤 10자 형태.
 *
 * @param text - 원본 텍스트
 * @param maxLength - 최대 길이 (기본 25)
 * @returns 축약된 텍스트 또는 원본
 */
export function truncateText(text: string, maxLength = 25): string {
  if (!text || text.length <= maxLength) return text;
  const start = text.slice(0, 10);
  const end = text.slice(-10);
  return `${start}...${end}`;
}

/**
 * &nbsp; 문자를 일반 공백으로 치환한다.
 * 에디터에서 생성된 &nbsp;를 일반 공백으로 변환.
 *
 * @param text - 원본 텍스트
 * @returns 치환된 텍스트
 */
export function replaceNbsp(text: string): string {
  if (!text) return text;
  // \u00A0은 non-breaking space 유니코드
  return text.replace(/\u00A0/g, ' ').replace(/&nbsp;/g, ' ');
}
