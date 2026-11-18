import type { TagNode } from '../lib/tags';

/** 虚构测试数据：字典与标签树。不含任何真实企业、客户或个人信息。 */
export interface DictSeed {
  id: string;
  name: string;
  code: string;
  tags: TagNode[];
}

const t = (id: string, label: string, refCount: number, children?: TagNode[], status: TagNode['status'] = 'enabled'): TagNode =>
  children ? { id, label, status, refCount, children } : { id, label, status, refCount };

export function seedDictionaries(): DictSeed[] {
  return [
    {
      id: 'dict-industry',
      name: '行业分类',
      code: 'industry',
      tags: [
        t('ind-mfg', '制造业', 18, [
          t('ind-mfg-eq', '智能装备', 9),
          t('ind-mfg-auto', '汽车零部件', 6),
          t('ind-mfg-mat', '新材料', 3),
        ]),
        t('ind-trade', '跨境贸易', 12),
        t('ind-edu', '教育培训', 0, undefined, 'disabled'),
        t('ind-svc', '现代服务业', 7, [t('ind-svc-consult', '企业咨询', 4), t('ind-svc-hr', '人力资源', 3)]),
        t('ind-digital', '数字经济', 15),
      ],
    },
    {
      id: 'dict-service',
      name: '服务类目',
      code: 'service',
      tags: [
        t('svc-design', '设计服务', 5, [t('svc-design-brand', '品牌设计', 3), t('svc-design-ui', '界面设计', 2)]),
        t('svc-dev', '软件开发', 11),
        t('svc-legal', '法律咨询', 4),
        t('svc-print', '印刷制作', 0, undefined, 'disabled'),
      ],
    },
    {
      id: 'dict-resource',
      name: '资源类型',
      code: 'resource',
      tags: [
        t('res-capital', '资金', 6),
        t('res-channel', '渠道', 9, [t('res-channel-online', '线上渠道', 5), t('res-channel-offline', '线下门店', 4)]),
        t('res-talent', '人才', 8),
      ],
    },
    {
      id: 'dict-empty',
      name: '活动主题',
      code: 'event_topic',
      tags: [],
    },
  ];
}
