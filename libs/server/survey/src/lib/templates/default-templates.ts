/**
 * 기본 설문 템플릿 목록.
 * NPS, CSAT, CES 3개 프리셋을 제공한다.
 * 각 템플릿은 builder schema + survey settings를 포함한다.
 */

export interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'feedback' | 'satisfaction' | 'loyalty';
  /** Builder 스키마 (질문 구조) */
  schema: Record<string, unknown>;
  /** 설문 기본 설정 */
  settings: {
    type: 'link' | 'app';
    welcomeCard: Record<string, unknown>;
    endings: Record<string, unknown>[];
  };
}

export const DEFAULT_TEMPLATES: SurveyTemplate[] = [
  {
    id: 'nps',
    name: 'Net Promoter Score (NPS)',
    description:
      '고객 충성도를 측정하는 NPS 설문입니다. 0~10 척도로 추천 의향을 묻습니다.',
    category: 'loyalty',
    schema: {
      root: ['nps-block'],
      entities: {
        'nps-block': {
          type: 'block',
          attributes: {
            headline: { default: '추천 의향을 알려주세요' },
            description: {
              default:
                '이 제품/서비스를 친구나 동료에게 추천할 가능성은 얼마나 됩니까?',
            },
          },
          children: ['nps-question'],
        },
        'nps-question': {
          type: 'openText',
          attributes: {
            headline: { default: '0-10 사이의 점수를 입력해주세요' },
            required: true,
            placeholder: { default: '0~10' },
          },
          parentId: 'nps-block',
        },
      },
    },
    settings: {
      type: 'link',
      welcomeCard: {
        enabled: true,
        headline: { default: 'NPS 설문' },
        html: {
          default: '<p>잠시만 시간을 내어 저희에 대한 의견을 들려주세요.</p>',
        },
        buttonLabel: { default: '시작하기' },
        timeToFinish: true,
      },
      endings: [
        {
          id: 'nps-ending',
          type: 'endScreen',
          headline: { default: '감사합니다!' },
          subheader: { default: '소중한 의견 감사합니다.' },
        },
      ],
    },
  },
  {
    id: 'csat',
    name: 'Customer Satisfaction (CSAT)',
    description: '고객 만족도를 측정하는 CSAT 설문입니다.',
    category: 'satisfaction',
    schema: {
      root: ['csat-block'],
      entities: {
        'csat-block': {
          type: 'block',
          attributes: {
            headline: { default: '만족도를 알려주세요' },
            description: {
              default: '서비스에 대한 전반적인 만족도를 평가해주세요.',
            },
          },
          children: ['csat-question'],
        },
        'csat-question': {
          type: 'openText',
          attributes: {
            headline: { default: '만족도를 1~5로 평가해주세요' },
            required: true,
            placeholder: { default: '1~5' },
          },
          parentId: 'csat-block',
        },
      },
    },
    settings: {
      type: 'link',
      welcomeCard: {
        enabled: true,
        headline: { default: '고객 만족도 조사' },
        html: { default: '<p>서비스 개선을 위해 의견을 들려주세요.</p>' },
        buttonLabel: { default: '시작하기' },
        timeToFinish: true,
      },
      endings: [
        {
          id: 'csat-ending',
          type: 'endScreen',
          headline: { default: '감사합니다!' },
          subheader: { default: '피드백이 서비스 개선에 큰 도움이 됩니다.' },
        },
      ],
    },
  },
  {
    id: 'ces',
    name: 'Customer Effort Score (CES)',
    description: '고객 노력도를 측정하는 CES 설문입니다.',
    category: 'satisfaction',
    schema: {
      root: ['ces-block'],
      entities: {
        'ces-block': {
          type: 'block',
          attributes: {
            headline: { default: '이용 편의성을 알려주세요' },
            description: {
              default: '목표를 달성하기까지 얼마나 쉬웠나요?',
            },
          },
          children: ['ces-question'],
        },
        'ces-question': {
          type: 'openText',
          attributes: {
            headline: {
              default: '1(매우 어려움) ~ 7(매우 쉬움) 사이로 평가해주세요',
            },
            required: true,
            placeholder: { default: '1~7' },
          },
          parentId: 'ces-block',
        },
      },
    },
    settings: {
      type: 'link',
      welcomeCard: {
        enabled: true,
        headline: { default: '고객 노력도 조사' },
        html: { default: '<p>이용 경험에 대해 알려주세요.</p>' },
        buttonLabel: { default: '시작하기' },
        timeToFinish: true,
      },
      endings: [
        {
          id: 'ces-ending',
          type: 'endScreen',
          headline: { default: '감사합니다!' },
          subheader: { default: '더 나은 경험을 위해 노력하겠습니다.' },
        },
      ],
    },
  },
];
