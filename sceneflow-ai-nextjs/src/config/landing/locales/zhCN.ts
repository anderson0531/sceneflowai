import type { StudioLandingCopy } from './types'
import { MOBILE_COMPANION_COPY_ZH_CN } from '../mobileCompanionCopy'

export const STUDIO_LANDING_COPY_ZH_CN = {
  heroDock: {
    tagline:
      '执导原创影视剧集 — 或打造高毛利的视频定制服务业务。无需电影学院背景，告别繁琐提示词工程。',
    primaryCta: '启动工作室 ($9)',
    businessCta: '探索视频服务商机',
    howItWorksCta: '了解工作流程',
  },
  audienceGateway: {
    eyebrow: '一体化制片厂 · 三大赢利与创作路径',
    title: '创作原创影视世界，',
    titleAccent: '或打造高利润的视频服务事业。',
    subtitle:
      'SceneFlow 将专家级 AI 制片团队与自然语音/文字导演对话融为一体 — 全面赋能商业视频服务商、故事新人与资深影视创作者。',
    cards: [
      {
        id: 'services',
        badge: '高收益商机 · 65–85% 典型毛利率',
        title: '商业视频交付服务商',
        description:
          '在数小时而非数周内，为付费客户交付人生传记电影、房产导览、企业培训与品牌短片 — 享有 100% 商业版权归属。',
        highlights: [
          '故事优先的引导式客户访谈与分年龄段角色连续性锁定',
          '通过分享链接轻松完成 Blueprint、角色连续性与 Screening Room 客户签收',
          '客户真实照片 + 4K AI 电影重现混合模式，兼顾质感与高利润',
        ],
        ctaLabel: '查看商业模式与收益测算',
        targetAnchor: 'video-services',
      },
      {
        id: 'aspiring',
        badge: '无需电影科班或提示词技巧',
        title: '新锐故事创作者与作者',
        description:
          '脑海中有回忆录、小说或频道创意？只需用日常语言说出或输入故事，SceneFlow 即可自动生成专业级剧集、蓝图与拍摄剧本初稿。',
        highlights: [
          '一键生成剧集圣经、Blueprint 与分镜制作剧本初稿',
          '用自然语音或文字直接下达修改指令 — 零提示词语法门槛',
          '在消耗视频积分前先试看全配音 Pre-vis 动态分镜预演',
        ],
        ctaLabel: '体验 4 步制片空间导览',
        targetAnchor: 'studio-tour',
      },
      {
        id: 'experienced',
        badge: '长剧频道 · 视频播客 · 投融资预演',
        title: '资深创作者与专业影视人',
        description:
          '彻底终结盲盒式抽卡重绘。在连续性资产库中锁定常驻演员面孔、逐镜头服装、专属声线与实景 — 再由全自动代理实现 10 倍产能跃升。',
        highlights: [
          '跨剧集连续性资产库与逐镜头专属服装选择',
          '内置 Audience Resonance 评分与 FlowDirector 专家级审片指导',
          '自主代理自动生成 27+ 场戏并输出 70+ 种语言译制流',
        ],
        ctaLabel: '了解 5 大制片超能力',
        targetAnchor: 'five-superpowers',
      },
    ],
  },
  superpowers: {
    eyebrow: 'SceneFlow 核心设计哲学',
    title: '五大制片超能力，',
    titleAccent: '告别晦涩技术手册。',
    subtitle:
      '传统 AI 视频工具迫使您在碎片化软件间反复横跳、手写上百条脆弱提示词。SceneFlow 提供自动专家初稿、语音/文字对话执导、受众共鸣审片与全自动生产代理。',
    watchClipLabel: '观看 30 秒概览',
    pillars: [
      {
        id: 'baseline',
        number: '01',
        badge: '告别空白页焦虑',
        title: '自动生成专家级初稿基线',
        description:
          '从一句话创意或引导式故事访谈起步，SceneFlow 自动撰写结构完整的剧集圣经、电影 Blueprint 与拍摄剧本 — 涵盖独立人物弧光、时代场景与戏剧节拍。',
        outcomeTag: '剧集 · Blueprint · 制作剧本',
        videoClipKey: 'comparison',
      },
      {
        id: 'dialog',
        number: '02',
        badge: '语音或文字自然执导',
        title: '智能对话驱动的完整导演控制权',
        description:
          '像真正的导演一样创作，而非提示词工程师。通过语音或打字调整剧情节拍、拆分不同人生阶段角色（17 岁、32 岁、62 岁）、指定每个镜头的服装或精修画面。',
        outcomeTag: '零提示词工程',
        videoClipKey: 'direction',
      },
      {
        id: 'review',
        number: '03',
        badge: '渲染前后双重专家质检',
        title: 'Audience Resonance 与 FlowDirector 成片视频审阅',
        description:
          'Audience Resonance 在渲染前为剧集、Blueprint 与剧本打分 — 随后 FlowDirector 从观众共鸣与导演执行双视角审阅已渲染的场景视频，通过 Shot Director 一键重制瑕疵镜头，轻松统管 20+ 个并行客户项目。',
        outcomeTag: '观众 + 导演双视角质检 · 一键重制镜头',
      },
      {
        id: 'agents',
        number: '04',
        badge: '解放双手的规模化产能',
        title: '全自动快速通道制片代理',
        description:
          '确认剧本与 Pre-vis 动态分镜后，即可启动 Audio Agent、Stills Agent、Clips Agent 或完整 Production Agents，自动批量生成数十场戏并自我修复瑕疵镜头。',
        outcomeTag: '替代 300+ 次手动提示词输入',
        videoClipKey: 'agent',
      },
      {
        id: 'collaboration',
        number: '05',
        badge: '客户签收与全球多语种发行',
        title: '分享审阅链接、Screening Room 与 70+ 语言译制',
        description:
          '发送免登录网页链接完成 Blueprint、剧本及 Screening Room 逐帧审片确认 — 支持 7 种原生工作台语言与 70+ 种语言场景化配音交付。',
        outcomeTag: '审阅链接 · Screening Room · 70+ 译制',
        videoClipKey: 'publish',
      },
    ],
    microVisuals: {
      baseline: {
        intakePrompt: '故事访谈：“请讲讲您的故事……”',
        autoBadge: '数秒内自动生成',
        steps: [
          { step: '1 · 剧集圣经', detail: '6 集故事弧 + 共享资产库' },
          { step: '2 · 电影 Blueprint', detail: '共鸣节拍 + 分龄角色卡' },
          { step: '3 · 制作剧本', detail: '对白、服装与镜头调度' },
        ],
      },
      dialog: {
        quote:
          '“将约翰拆分为 17 岁、32 岁和 62 岁三个独立角色 — 并在镜头 2 给艾拉拉换上晚宴丝绸大衣。”',
        chipCast: '✓ 已锁定 3 张分龄角色卡',
        chipWardrobe: '✓ 镜头 2 服装：晚宴丝绸大衣',
      },
      review: {
        arLabel: 'Audience Resonance + FlowDirector',
        arStatus: '渲染前把关 + 视频成片质检',
        gateSeries: '剧集 90',
        gateBlueprint: 'Blueprint 92',
        gateScript: '场次 AR 86→89',
        flowDirectorNote:
          'FlowDirector 场次视频质检：观众 AR 86 + 导演 81 → 一键修复自动重制镜头 (+3 AR)',
      },
      agents: {
        rows: [
          { label: 'Audio Agent · 配音、音效与配乐', status: '27 / 27 就绪' },
          { label: 'Stills Agent · 连续性关键帧', status: '100% 锁定' },
          { label: 'Clips Agent · 自愈式动态镜头', status: '自动校验通过' },
        ],
      },
      collaboration: {
        approvedBadge: '已签收 ✓',
        dubsChip: '+70 种配音',
      },
    },
  },
  videoServices: {
    eyebrow: '视频交付服务引擎 · 独立主理人与代理机构',
    title: '以价值 $1,500+ 的制作水准，实现',
    titleAccent: '50%–80% 更低交付总成本',
    subtitle:
      '传统实拍剧组与动辄 30 小时的手工剪辑，把 90% 的家庭、房产经纪人与本地商户拒之门外。SceneFlow 将您的综合交付成本（算力积分 + 人工统筹时间）直降 50% 至 80%，让您以亲民客单价轻松获客，同时稳享 65%–85% 真实净利率。',
    commercialRightsBadge: '100% 商业版权归属 · 自由向客户交付高清母带',
    costSavingsPillLabel: '综合交付成本直降 50%–80% · 把握庞大全球刚需市场',
    verticalsHeading: '1. 选择全球高需求客户服务赛道',
    globalDemandLabel: '庞大的全球市场商机',
    whoBuysLabel: '高频复购客户群体',
    marginAdvantageLabel: 'SceneFlow 低成本交付优势',
    calculatorBadge: '透明成本与净利润测算器',
    calculatorTitle: '2. 对比交付成本与月度净利润',
    priceTierLabel: '客户报价档位：',
    priceTierNames: ['亲民档', '标准档', '精品档'],
    volumeLabel: '每月交付客户项目数：',
    projectsPerMonthSuffix: '单/月',
    projectsUnitLabel: '个项目',
    perProjectProfitLabel: '单项目净利润',
    traditionalMarketLabel: '传统市场均价',
    typicalFeeLabel: '您的客户报价',
    fullyLoadedCostLabel: '综合交付成本',
    costBreakdownSubLabel: '积分 + 统筹工时',
    estComputeLabel: 'SceneFlow 积分',
    activeHandsOnLabel: '人工统筹工时',
    monthlyGrossLabel: '预估月度客户营收总额',
    monthlyNetLabel: '预估月度净利润（已扣除积分与人工时间）',
    perMonthSuffix: '/ 月',
    marginBadgeSuffix: '净利率',
    disclaimer:
      '综合交付成本包含 SceneFlow 算力积分（按 $0.01/积分加购包折算）以及客户访谈、执导与 Screening Room 审片所需的预估人工统筹工时。实际对客报价由您自主设定。',
    launchBusinessCta: '开启您的视频服务业务 ($9)',
    workflowHeading: '客户定制项目如何通过 4 个轻松步骤高效交付',
    stepPrefix: '步骤',
    workflowSteps: [
      {
        step: '01',
        title: '故事优先的客户访谈',
        detail:
          '通过自然访谈（“请讲讲您的故事”）提炼打动人心的人生或品牌节拍与关键人物。',
      },
      {
        step: '02',
        title: '分享 Blueprint 链接确认',
        detail:
          '内部通过 Audience Resonance 评估打磨后，发送免登录 Blueprint 链接供客户签字立项。',
      },
      {
        step: '03',
        title: '真实照片 + AI 混合制片',
        detail:
          '将客户珍藏照片与分龄角色连续性、专属服装及 Audio Agent / Clips Agent 自动合成完美结合。',
      },
      {
        step: '04',
        title: 'Screening Room 审片交付',
        detail:
          '发送私密 Screening Room 链接收集逐帧修改意见，导出 4K 商业母带并完成收款。',
      },
    ],
    verticals: [
      {
        id: 'memoir',
        tabLabel: '人生传记电影',
        badge: '$300–$950 / 部 · 市场价：$800–$3,500+',
        title: '人生回忆录、金婚寿辰致敬与家族传记大片',
        description:
          '将珍贵的家庭老照片与电影级 AI 时代重现、精准分龄人物连续性（如 17 岁 → 32 岁 → 62 岁）无缝融合，搭配温暖自然的旁白配音。',
        globalMarketNeed:
          '全球每年有数以亿计的长辈寿辰、金婚庆典与家族纪念需求，但因传统团队动辄 $2,000+ 的高昂费用，超过 90% 的家庭故事从未被影像记录。',
        clientBuyer:
          '家庭客户、重要寿辰/纪念日庆典、财富传承顾问、高端康养社区与纪念礼仪机构',
        traditionalMarketRangeLabel: '$800–$3,500+',
        typicalRetailUsd: 499,
        priceTiersUsd: [300, 499, 950],
        retailRangeLabel: '$300–$950',
        estComputeUsd: 22,
        estOperatorUsd: 78,
        activeMinutesLabel: '~1.5–2 小时',
        keyAdvantage:
          '仅需 ~$100 综合成本（~$22 积分 + ~$78 统筹工时）即可交付 $1,500 级传记大片 — 定价 $300–$500 即可轻松打动嫌传统拍摄太贵的家庭。',
      },
      {
        id: 'realestate',
        tabLabel: '房产与酒店导览',
        badge: '$199–$549 / 套 · 市场价：$450–$1,500+',
        title: '豪宅房源配音漫游与精品酒店沉浸导览',
        description:
          '将房源实拍照片与周边配套亮点转化为配乐配音俱全的电影感导览大片 — 并可即时生成英语、西语、阿语或葡语版本吸引海外买家。',
        globalMarketNeed:
          '全球每月有数以千万计的住宅房源、度假民宿与精品酒店急需吸引本地及跨国买家，但绝大多数仍停留在缺乏感染力的静态房源照片。',
        clientBuyer:
          '住宅房产经纪人、豪宅代理机构、度假民宿主理人与精品酒店',
        traditionalMarketRangeLabel: '$450–$1,500+',
        typicalRetailUsd: 299,
        priceTiersUsd: [199, 299, 549],
        retailRangeLabel: '$199–$549',
        estComputeUsd: 12,
        estOperatorUsd: 48,
        activeMinutesLabel: '~45–60 分钟',
        keyAdvantage:
          '无需外景奔波或受天气耽搁：仅约 ~$60 综合成本即可将房源照片转化为多语种配音豪宅导览，比现场实拍省 60% 以上。',
      },
      {
        id: 'training',
        tabLabel: '企业培训与 SOP',
        badge: '$599–$1,800 / 门课 · 市场价：$1,500–$5,000+',
        title: '企业入职培训、安全规范与多语种标准课程',
        description:
          '在连续性资产库中锁定讲师形象、工装制服与作业场景 — 一键向全球不同母语员工交付清晰统一的标准培训剧集。',
        globalMarketNeed:
          '全球每一家制造工厂、连锁医疗、餐饮集团与加盟品牌都面临高频人员流动、安全合规与多语种员工考核，亟需标准化视频 SOP 课程。',
        clientBuyer:
          '企业 HR 与培训部门、制造工厂、医疗诊所、连锁餐饮与特许加盟品牌',
        traditionalMarketRangeLabel: '$1,500–$5,000+',
        typicalRetailUsd: 950,
        priceTiersUsd: [599, 950, 1800],
        retailRangeLabel: '$599–$1,800',
        estComputeUsd: 35,
        estOperatorUsd: 115,
        activeMinutesLabel: '~2–2.5 小时',
        keyAdvantage:
          '交付成本比实拍团队低 70%（~$150 对比 $3,000+）— 合规制度更新时只需几分钟微调单个片段，无需重拍。',
      },
      {
        id: 'brand',
        tabLabel: '品牌故事与广告',
        badge: '$399–$1,200 / 套 · 市场价：$3,000–$8,000+',
        title: '创始人品牌故事片、诊所科普与竖屏社媒广告',
        description:
          '打造高转化官网品牌故事主片，并自动裁剪适配抖音、TikTok、Instagram 与 YouTube Shorts 的 9:16 竖屏预告片 — 通过 Screening Room 高效审片。',
        globalMarketNeed:
          '全球超过 3,000 万家本地诊所、律师事务所、特色餐厅与创业品牌急需官网信任背书大片与 9:16 社媒广告，却无力承担 $5,000+ 传统广告制作费。',
        clientBuyer:
          '医疗/牙科诊所、律师事务所、本地中小企业、营销机构与跨境电商品牌主理人',
        traditionalMarketRangeLabel: '$3,000–$8,000+',
        typicalRetailUsd: 650,
        priceTiersUsd: [399, 650, 1200],
        retailRangeLabel: '$399–$1,200',
        estComputeUsd: 22,
        estOperatorUsd: 88,
        activeMinutesLabel: '~1.5–2 小时',
        keyAdvantage:
          '仅约 ~$110 综合交付成本即可激活本地诊所、餐厅与律所客群 — 同步自动输出 9:16 竖屏社媒短片。',
      },
    ],
  },
  guidedTour: {
    eyebrow: '可视化制片导览 · 告别专业术语',
    title: '四大协同创作空间，',
    titleAccent: '一套行云流水的流程。',
    subtitle:
      '花 60 秒认识工作室的 4 扇核心入口 — Series Room、Blueprint Room、Production Stage 与 Screening Room — 随后即可在下方的 6 部完整剧目示例中直接点击体验同款实景入口。',
    stepPrefix: '步骤',
    lensLabel: '预览演示视角：',
    lensCreator: '原创剧集（《琉璃账本》）',
    lensService: '客户服务（“人生传记电影”）',
    watchRoomVideoLabel: '观看 30 秒空间导览',
    inspectFullScreenLabel: '查看高清完整工作台',
    openLiveScreeningLabel: '打开沙盒 Screening Room 预览',
    screeningModalTitle: '《琉璃账本》— 沙盒 Screening Room 实景演示',
    examplesBridgeText:
      '既然您已熟悉工作室的 4 大空间，立即在下方 6 大完整题材中亲自点击体验：',
    examplesBridgeCta: '在成片示例中体验 4 大实景入口',
    rooms: [
      {
        id: 'series-desk',
        stepNumber: '01',
        tabLabel: 'Series Room',
        badge: '多集世界观与连续性圣经',
        title: '一次构建可复用的故事宇宙 — 而非孤立短片',
        promise:
          '只需描述一次剧集频道、培训课程体系或多章节传记，SceneFlow 自动建立故事圣经、分集大纲与共享 Reference Library，确保每一集风格高度统一。',
        creatorExampleTitle: '《琉璃账本》· 6 集新黑色悬疑剧集',
        creatorExampleNote:
          '共享主演阵容（艾拉拉·万斯、马库斯·索恩、阿里斯·凯尔博士）、地下档案金库场景与石英法典道具跨 6 集全程锁定，Audience Resonance 达 91/100。',
        serviceExampleTitle: '多章节家族传承录或企业系列课程',
        serviceExampleNote:
          '一次保存客户确认的主讲人、年代场景或企业环境 — 一键扩展第 2 至第 10 集，视觉零偏差。',
        callouts: [
          {
            label: '即时剧集初稿与 Audience Resonance 评分',
            detail: '在正式制作前自动生成全季梗概、分集故事弧与受众共鸣评分。',
          },
          {
            label: '跨集共享 Reference Library',
            detail: '人物面孔、专属声线、服装、场地与核心道具自动继承至每一集。',
          },
          {
            label: '语音或文字剧集总导演',
            detail: '直接口述或输入修改意见，轻松重塑整季脉络或单集剧情走向。',
          },
        ],
        visuals: {
          topBadge: '剧集 AR：91 / 100 · 已同步 6 集大纲',
          bottomBadge: '共享 Reference Library 已跨全季锁定',
          thumbLabels: [
            '艾拉拉·万斯 · 女主',
            '马库斯·索恩 · 主演',
            '地下档案库 · 实景',
            '石英琉璃法典 · 道具',
          ],
        },
      },
      {
        id: 'blueprint-board',
        stepNumber: '02',
        tabLabel: 'Blueprint Room',
        badge: '故事优先访谈、分龄角色与立项绿灯',
        title: '在消耗视频算力前，先锁定打动人心的故事与演员阵容',
        promise:
          '从自然的口述访谈或概念出发，Blueprint Room 自动梳理戏剧节拍、标注每场戏的具体角色、锁定跨年龄段人物特征，并支持客户通过网页链接远程签收。',
        creatorExampleTitle: '逐节拍电影阐述与视觉美学锁定',
        creatorExampleNote:
          '每个叙事节拍均绑定戏剧张力、出场人物、变形宽银幕布光规范以及带配音的 Audience Resonance 评估建议。',
        serviceExampleTitle: '智能传记访谈与跨年龄角色连续性',
        serviceExampleNote:
          '以“请讲讲您的故事”开启访谈，提炼高共鸣人生节点，自动创建 17 岁、32 岁、62 岁等独立分龄角色卡并保持血统骨相一致。',
        callouts: [
          {
            label: '故事优先的引导式深度访谈',
            detail: '挖掘真挚的个人经历或品牌故事，明确每一幕登场的独立人物而非笼统群体。',
          },
          {
            label: '跨年龄段角色连续性构建',
            detail: '为青年、中年、晚年分别建立独立角色参考，彻底避免不同年代造型混淆。',
          },
          {
            label: 'Audience Resonance + Blueprint 分享签收链接',
            detail: '用 AI 量化评估故事感染力，并通过清爽的网页链接收集客户立项确认。',
          },
        ],
        visuals: {
          topBadge: 'Blueprint AR：92 / 100 · 逐节拍角色高亮',
          bottomBadge: '分龄人物连续性锁定 + 客户在线签收链接',
          thumbLabels: [
            '女主角人物弧光',
            '阿里斯·凯尔博士 · 节拍 2',
            '雨夜港口观景台 · 第二幕',
            '黄铜时序钥匙 · 核心道具',
          ],
        },
      },
      {
        id: 'production-stage',
        stepNumber: '03',
        tabLabel: 'Production Stage',
        badge: 'Shot Director、逐镜头服装选择与全自动代理',
        title: '先审看全配音动态分镜 — 再交由代理批量生成成片镜头',
        promise:
          '审阅制作剧本初稿，锁定连续性参考图，试看完整配音的 Pre-vis Animatic，在 Shot Director 中为每个镜头挑选专属服装，随后启动自主代理完成全片制作。',
        creatorExampleTitle: '第 1 场：地下档案金库 · 4K 变形宽银幕',
        creatorExampleNote:
          '按镜头切换艾拉拉的服装，用语音或文字微调景别构图，在 Production Mixer 混音并派发 Production Agents。',
        serviceExampleTitle: '客户真实老照片 + 4K 电影级时代重现',
        serviceExampleNote:
          '为珍贵照片匹配 Ken Burns 运镜，为未留影像的记忆生成 4K AI 电影重现 — 将 15 分钟传记大片算力控制在约 $75 以内。',
        callouts: [
          {
            label: '逐镜头服装选择与语音/文字 Shot Director',
            detail: '精准指定每个镜头的服装造型，对话式精修构图与神态，告别盲盒式重抽。',
          },
          {
            label: '有声 Pre-vis Animatic 预算防火墙',
            detail: '在消耗动态视频积分前，先在分镜画面上完整试听对白、旁白、音效与配乐节奏。',
          },
          {
            label: 'Audio Agent、Stills Agent 与 Clips Agent 协同',
            detail: '既可逐场精雕细琢，也可一键启动全自动代理完成生成与合成。',
          },
        ],
        visuals: {
          topBadge: 'Shot Director · 已选定专属服装 · Pre-vis Animatic 就绪',
          bottomBadge: 'Audio Agent、Stills Agent 与 Clips Agent 自动编排全片场景',
          thumbLabels: [
            '镜头 1 · 金库全景',
            '镜头 3 · 铰链微距特写',
            '第 2 场 · 钥匙交接',
            '第 3 场 · 走廊跟拍冲刺',
          ],
        },
      },
      {
        id: 'screening-room',
        stepNumber: '04',
        tabLabel: 'Screening Room',
        badge: '逐帧精准审片、70+ 语言译制与全渠道发布',
        title: '通过私密链接高效协作，用任意语言向全球交付',
        promise:
          '在统一播放器中放映动态分镜、粗剪与 4K 终剪母带。收集带时间戳的客户或团队批注，生成 70+ 种语言场景同步译制流，一键导出或全网发布。',
        creatorExampleTitle: '首映级 4K 母带、竖屏预告与全球多语种发行',
        creatorExampleNote:
          '自动生成 9:16 竖屏宣传片，译制 70+ 个语种对白流，直发 YouTube、Bilibili 或申报 SceneFlow Originals。',
        serviceExampleTitle: '零门槛客户审片与多语种成片交付',
        serviceExampleNote:
          '客户在手机或电脑上免登录直接观看、打点留言，并获取匹配家族母语或跨国团队语言的高清 MP4 成片。',
        callouts: [
          {
            label: '免登录私密审片分享链接',
            detail: '发送 `/share/screening-room/` 专属链接，方便客户、高管或家人随时签收确认。',
          },
          {
            label: '70+ 种语言场景化音画同步流',
            detail: '完整保留环境音效与背景配乐，精准对齐全球各语种配音与角色表达。',
          },
          {
            label: '4K 商业母带导出与社媒预告裁切',
            detail: '下载拥有完整商业版权的高清母带，或直接分发多比例社媒宣传短片。',
          },
        ],
        visuals: {
          topBadge: '逐帧时间戳批注 · 免登录客户审片链接',
          bottomBadge: '7 种工作台原生语言 · 70+ 种场景同步译制流',
          thumbLabels: [
            'EN · 原版 4K 母带',
            'ES / PT · 同步译制版',
            'ZH / TH / HI · 多语种流',
            '9:16 竖屏宣传短片',
          ],
        },
      },
    ],
  },
  useCaseDirectory: {
    viewByUseCaseLabel: '按应用场景浏览',
    viewByRoomLabel: '按制片空间浏览',
    tracks: [
      {
        id: 'memoir-services',
        tabLabel: '人生传记电影与家族传承',
        badge: '高利润定制服务 · $300–$950/部',
        headline: '将家庭深度访谈与珍藏老照片转化为传世电影',
        description:
          '通过智能故事访谈采集人生历程，锁定从 70 年代青年时期到晚年的分龄人物肖像，调度全自动 Production Agents，由 FlowDirector 一键修复镜头，并通过免登录 Screening Room 链接交付。',
        featureIcons: [
          'startBlueprint',
          'treatment',
          'continuity',
          'directShot',
          'animatic',
          'scriptSupervisor',
          'productionAgent',
          'screeningCollab',
          'languageStreams',
        ],
      },
      {
        id: 'commercial-training',
        tabLabel: '20 项目并行机构与培训视频',
        badge: '20+ 并行项目 · 全自动智能体 + FlowDirector 质检',
        headline: '借助全流程自动化，以直降 50%–80% 的成本同时推进 20 个客户项目',
        description:
          '精准预测 Pre-vis 积分消耗，在 20 条并行客户产线中批量调度 Audio、Stills、Clips 与 Production Agents，由 FlowDirector 从观众与导演双视角审片并一键重制镜头，输出 70+ 语言版本。',
        featureIcons: [
          'scriptSupervisor',
          'productionAgent',
          'budget',
          'castLocations',
          'audioAgent',
          'stillsAgent',
          'videoAgent',
          'multilanguageUi',
          'screeningPlayer',
        ],
      },
      {
        id: 'series-animation',
        tabLabel: '多集剧集与风格化 3D 动画',
        badge: '多集原创 IP · 锁定美术与角色连续性',
        headline: '从第 1 集试播集到季终集全程统御剧集主创圣经',
        description:
          '搭建多集整季故事弧线，跨集冻结写实电影感或风格化 3D 美术设定，精准执导故事板节拍与关键帧，并渲染院线级视频镜头。',
        featureIcons: [
          'newSeries',
          'seriesReview',
          'seriesDirector',
          'directEpisode',
          'startEpisode',
          'stillsWorkbench',
          'videoAgent',
          'clipsWorkbench',
        ],
      },
      {
        id: 'creator-podcast',
        tabLabel: 'YouTube 频道与叙事播客节目',
        badge: '高完播率频道 · 多主持人对谈节目',
        headline: '配备录音棚级多角色人声、原创配乐与精修混音，每周稳定更新',
        description:
          '渲染前测试观众完播率钩子，执导多主持人互动张力与专属情绪配乐，在 Production Mixer 中精细打磨节奏，并打包导出 16:9 + 9:16 社媒矩阵成片。',
        featureIcons: [
          'sceneWorkflow',
          'seriesResonance',
          'musicScore',
          'scriptSupervisor',
          'mixer',
          'shipPackage',
        ],
      },
      {
        id: 'filmmaker-pitch',
        tabLabel: '导演前视预演与路演概念预告片',
        badge: '立项路演案卷 · 概念验证院线短片',
        headline: '全面压测剧本结构，带着成片级概念预告片自信走进投资路演会',
        description:
          '与 FlowDirector 协同打磨剧本，在 Blueprint 与剧本双重关卡用 Audience Resonance 评估结构节奏，生成好莱坞工业标准剧本，并剪辑震撼路演预告片。',
        featureIcons: [
          'blueprintDirector',
          'blueprintResonance',
          'goToProduction',
          'productionScript',
          'scriptResonance',
          'promoTrailers',
        ],
      },
    ],
  },
  directoryDrawer: {
    badge: '工作流自动化与 34 项核心能力 · 7 语种 5K 运镜解说导览',
    title: '自动化制片与专家视频质检，轻松统管 20+ 个并行项目',
    subtitle:
      '每项功能现均配备交互式 5K 平移运镜与 7 种语言配音解说。亲眼见证 FlowDirector 如何从观众与导演双视角审阅场景视频并一键重制镜头，以及智能体如何替代 300+ 次手动提示词。',
    expandCta: '探索全部 34 项 5K 配音功能导览',
    collapseCta: '收起工作室核心能力名录',
    automationEyebrow: '专为高产创作者与同时管理 20 个项目的视频服务商打造',
    automationTitle: '端到端工作流自动化：智能体后台批量生成，FlowDirector 一键审片与重制。',
    automationSubtitle:
      '告别逐个镜头手动盯守提示词。Audio、Stills、Clips 与 Production Agents 在后台并行构建场景，FlowDirector 对每段渲染 MP4 进行观众共鸣与导演合规双审，并通过 Shot Director 一键重制问题镜头。',
    spotlightFlowDirectorLabel: 'FlowDirector 场景视频质检',
    spotlightFlowDirectorMeta: '观众 AR + 导演合规评分 · 一键修复自动重制镜头',
    spotlightAgentsLabel: '全自动制片智能体矩阵',
    spotlightAgentsMeta: '替代 300+ 手动提示词 · 轻松扩展至 20 个并行项目',
    spotlightNarrated5kLabel: '34 项能力 · 5K 运镜配音解说',
    spotlightNarrated5kMeta: '同步 5K 镜头平移 + 覆盖全部 7 种语言的神经网络配音',
  },
  academyStrip: {
    badge: '零学习门槛保障 · Studio Academy',
    title: '绝不迷茫：在任意画面按下 ? 键，即刻打开 60 秒可视化导览图。',
    subtitle:
      '每个制片空间均内置带编号标注的即时界面地图（JIT Screen Map）、一键快捷操作、Pre-vis 积分护栏，以及“10 分钟完成您的第一部短片”互动教学模拟器。',
    pills: [
      '上下文感知 ? 界面导览图',
      '“10 分钟首部短片”互动模拟器',
      '内置 Pre-vis 视频积分护栏',
    ],
    watchAcademyCta: '观看 30 秒学院导览',
    startExplorerCta: '以 Explorer 方案起步 — $9',
  },
  mobileCompanion: MOBILE_COMPANION_COPY_ZH_CN,
} satisfies StudioLandingCopy
