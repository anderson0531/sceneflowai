import type { StudioLandingCopy } from './types'

export const STUDIO_LANDING_COPY_KO: StudioLandingCopy = {
  heroDock: {
    tagline:
      '오리지널 영화와 시리즈를 연출하거나, 고수익 영상 제작 비즈니스를 구축하세요. 영화 제작 경험도, 프롬프트 작성 기술도 필요 없습니다.',
    primaryCta: 'Studio 시작하기 ($9)',
    businessCta: '영상 제작 비즈니스 보기',
    howItWorksCta: '작동 방식 보기',
  },
  audienceGateway: {
    eyebrow: '하나의 스튜디오 · 세 가지 성공 경로',
    title: '오리지널 세계를 창조하세요.',
    titleAccent: '또는 수익성 높은 영상 비즈니스를 구축하세요.',
    subtitle:
      'SceneFlow는 전문가급 AI 제작 크루와 대화형 연출을 결합해, 1인 스토리텔러부터 멀티 에피소드 시리즈 크리에이터, 클라이언트 대상 영상 제작 사업자까지 모두 지원합니다.',
    cards: [
      {
        id: 'services',
        badge: '수익 기회 · 65–90% 높은 서비스 총이익률',
        title: '영상 제작 납품 비즈니스',
        description:
          '$149 당일 납품 Express 4K 시네마 필름과 고마진 인생 회고록(라이프 메모아)으로 첫 고객을 확보하고, 기업 교육·부동산·브랜드 필름의 월간 정기 계약을 100% 상업적 소유권과 함께 쌓아가세요.',
        highlights: [
          '로그인 없는 화이트라벨 포털(인터뷰·Blueprint·연속성·시사실)',
          '당일 $149 Express 4K 시네마(약 88% 마진) & 재작업 없는 풀모션 업그레이드',
          '음성 포함 시네마 프리뷰 방화벽과 수정 횟수 상한으로 비용 높은 재촬영 차단',
        ],
        ctaLabel: '비즈니스 모델과 마진 살펴보기',
        targetAnchor: 'video-services',
      },
      {
        id: 'aspiring',
        badge: '영화 학교·프롬프트 지식 불필요',
        title: '예비 스토리텔러 & 작가',
        description:
          '머릿속에 회고록, 소설, 유튜브 채널 아이디어가 있나요? 평소 말하는 자연스러운 언어로나 텍스트로 이야기를 들려주면 SceneFlow가 전문가 수준의 각본 베이스라인과 세계관을 자동 완성합니다.',
        highlights: [
          '시리즈·Blueprint·제작 대본의 전문가급 초안을 즉시 자동 생성',
          '복잡한 프롬프트 문법 제로 — 일상 언어로 말하거나 입력해 바로 수정',
          '음성이 입혀진 시네마 프리뷰를 감상하고 그대로 4K 시네마 필름으로 렌더링',
        ],
        ctaLabel: '4단계 스튜디오 투어 시작하기',
        targetAnchor: 'studio-tour',
      },
      {
        id: 'experienced',
        badge: '시리즈 채널 · 팟캐스트 · 투자자 프리비즈',
        title: '숙련된 크리에이터 & 영화 제작자',
        description:
          '슬롯머신 같은 운에 맡기는 재생성은 끝내세요. 반복 등장하는 배우의 얼굴, 컷별 의상, 맞춤 목소리, 세트를 Continuity Vault에 고정하고 자율 에이전트로 제작 생산성을 10배 확장하세요.',
        highlights: [
          '멀티 에피소드 Continuity Vault 및 컷별 의상 정밀 제어',
          'Audience Resonance & FlowDirector의 그린라이트 품질 검수',
          '자율 에이전트가 27개 이상의 씬 제작과 70개 이상 언어 더빙 자동 처리',
        ],
        ctaLabel: '스튜디오 5대 슈퍼파워 보기',
        targetAnchor: 'five-superpowers',
      },
    ],
  },
  superpowers: {
    eyebrow: 'SceneFlow의 설계 철학',
    title: '다섯 가지 스튜디오 슈퍼파워.',
    titleAccent: '복잡한 매뉴얼은 필요 없습니다.',
    subtitle:
      '기존 AI 영상 제작은 파편화된 툴을 오가며 수백 개의 불안정한 프롬프트를 직접 써야 했습니다. SceneFlow는 지능형 베이스라인, 자연스러운 음성·텍스트 연출, 임원급 리뷰, 자율 제작 에이전트를 하나로 제공합니다.',
    watchClipLabel: '30초 개요 보기',
    pillars: [
      {
        id: 'baseline',
        number: '01',
        badge: '빈 화면 앞에서 막막할 일 제로',
        title: '전문가급 베이스라인 자동 생성',
        description:
          '간단한 콘셉트나 스토리 중심 인터뷰로 시작하세요. SceneFlow가 체계적인 시리즈 바이블, 필름 Blueprint, 제작 대본을 자동 작성하며 캐릭터 아크, 시대별 로케이션, 드라마틱 비트까지 완성합니다.',
        outcomeTag: '시리즈 · Blueprint · 제작 대본',
        videoClipKey: 'comparison',
      },
      {
        id: 'dialog',
        number: '02',
        badge: '음성 또는 텍스트로 자유로운 연출',
        title: '지능형 대화를 통한 완전한 감독 제어권',
        description:
          '프롬프트 엔지니어가 아니라 영화 감독처럼 연출하세요. 말하거나 입력하는 것만으로 스토리 비트를 재구성하고, 인물을 생애 연령대별(17세·32세·62세)로 나누고, 컷별 의상을 고르거나 원하는 프레임을 정교하게 다듬을 수 있습니다.',
        outcomeTag: '프롬프트 엔지니어링 제로',
        videoClipKey: 'direction',
      },
      {
        id: 'review',
        number: '03',
        badge: '렌더링 전·후 전문가 QA',
        title: 'Audience Resonance & FlowDirector 영상 리뷰',
        description:
          '렌더링 전에는 Audience Resonance가 시리즈·Blueprint·대본을 채점하고, 렌더링 후에는 FlowDirector가 관객과 감독 두 관점에서 완성된 씬 영상을 검수합니다. Shot Director 연동 원클릭 수정으로 20개 이상의 동시 고객 프로젝트에서도 클립을 손쉽게 재생성하세요.',
        outcomeTag: '관객 + 감독 영상 QA · 원클릭 클립 수정',
      },
      {
        id: 'agents',
        number: '04',
        badge: '손대지 않는 고속 스케일링',
        title: '자율형 패스트트랙 제작 에이전트',
        description:
          '대본과 음성 시네마 프리뷰가 마음에 들면 Audio Agent, Stills Agent, Clips Agent 또는 통합 Production Agents를 실행하세요. 수십 개 씬 생성부터 실패한 테이크 자가 복구까지 자동 수행해 4K 시네마 필름이나 풀모션 마스터를 완성합니다.',
        outcomeTag: '수동 프롬프트 300회 이상 대체',
        videoClipKey: 'agent',
      },
      {
        id: 'collaboration',
        number: '05',
        badge: '클라이언트 승인 & 글로벌 배급',
        title: '공유 리뷰 링크, 시사실(Screening Room) & 70개 이상 언어',
        description:
          'Blueprint, 대본, 프레임 단위의 시사실 승인을 위한 깔끔한 브라우저 링크를 바로 공유하세요. 7개 네이티브 Studio UI 언어로 연출하면서 70개 이상 언어의 현지화 스트림을 동시에 납품할 수 있습니다.',
        outcomeTag: '공유 링크 · 시사실 · 70+ 언어 더빙',
        videoClipKey: 'publish',
      },
    ],
    microVisuals: {
      baseline: {
        intakePrompt: '스토리 인테이크: “당신의 이야기를 들려주세요...”',
        autoBadge: '몇 초 만에 자동 생성',
        steps: [
          { step: '1 · 시리즈 바이블', detail: '6부작 아크 + 공유 Continuity Vault' },
          { step: '2 · 필름 Blueprint', detail: '공감 비트 + 다연령 캐스트 설계' },
          { step: '3 · 제작 대본', detail: '대사·의상·카메라 워킹 완비' },
        ],
      },
      dialog: {
        quote:
          '“존을 17세, 32세, 62세로 나누고, 샷 2에서 엘라라에게 이브닝 갈라 실크 코트를 입혀줘.”',
        chipCast: '✓ 3개 연령대 캐스트 카드 고정됨',
        chipWardrobe: '✓ 샷 2 의상: 갈라 실크 코트',
      },
      review: {
        arLabel: 'Audience Resonance + FlowDirector',
        arStatus: '렌더링 전 게이트 + 씬 영상 QA',
        gateSeries: '시리즈 90',
        gateBlueprint: 'Blueprint 92',
        gateScript: '씬 AR 86→89',
        flowDirectorNote:
          'FlowDirector 씬 영상 QA: 관객 AR 86 + 감독 81 → 원클릭 수정으로 클립 재생성 (+3 AR)',
      },
      agents: {
        rows: [
          { label: 'Audio Agent · 보이스, SFX & 스코어', status: '27 / 27 완료' },
          { label: 'Stills Agent · 연속성 키프레임', status: '100% 고정됨' },
          { label: 'Clips Agent · 자가 복구 모션', status: '자동 검증됨' },
        ],
      },
      collaboration: {
        approvedBadge: '승인 완료 ✓',
        dubsChip: '+70개 언어 더빙',
      },
    },
  },
  videoServices: {
    eyebrow: '영상 납품 서비스 · 1인 사업자 & 제작 에이전시',
    title: '$1,500+ 수준의 제작 퀄리티를',
    titleAccent: '50%–80% 더 낮은 제작 원가로 납품',
    subtitle:
      '전통적인 촬영 크루와 30시간의 수작업 편집은 가족, 부동산 중개인, 지역 사업자의 90%에게 가격 장벽이 됩니다. 지역 제휴 파트너를 통한 주력 상품인 인생 회고록(라이프 메모아)으로 시작해, 총 납품 원가(컴퓨팅 + 운영자 시간)를 50%~80% 절감하며 반복 B2B 리테이너를 쌓으세요.',
    commercialRightsBadge: '100% 상업적 소유권 · 화이트라벨 고객 포털 (Pro+)',
    costSavingsPillLabel: '주력 라이프 메모아 + 반복 B2B 리테이너',
    verticalsHeading: '1. 주력 핵심 상품으로 시장을 열고, 정기 계약으로 확장하세요',
    globalDemandLabel: '거대한 글로벌 시장 수요',
    whoBuysLabel: '반복 구매 고객층',
    partnerChannelsLabel: '광고비 제로 제휴 추천 파트너',
    marginAdvantageLabel: 'SceneFlow 마진 및 제작 범위 우위',
    calculatorBadge: '패키지 범위 연동 원가 & 수익 계산기',
    calculatorTitle: '2. 납품 원가와 월간 서비스 순이익 스트레스 테스트',
    priceTierLabel: '클라이언트 패키지 등급:',
    priceTierNames: ['Express 4K 시네마', '풀모션 시네마', 'Signature 4K'],
    tierScopePrefix: '패키지 구성:',
    volumeLabel: '월간 클라이언트 납품 건수:',
    projectsPerMonthSuffix: '건/월',
    projectsUnitLabel: '건',
    stressTestToggleLabel: '스트레스 테스트: 첫 달 적응 기간 + Pro 플랜 ($149/월)',
    stressTestOnBadge: '켜짐',
    stressTestOffBadge: '꺼짐',
    stressTestActiveNote:
      '보수적 초기 적응 기준 적용 중: 초보 PM 작업 시간 +60%, 추가 재촬영 컴퓨팅 버퍼 +30%, Operator Pro 멤버십 $149/월(기본 월 10,000 크레딧 + 150 GB Vault 포함)이 반영됩니다.',
    proPlanLineLabel: 'Pro 플랜 ($149/월) + 추가 컴퓨팅',
    proPlanCreditsIncludedNote: ' (10k cr 포함)',
    perProjectProfitLabel: '프로젝트당 서비스 이익',
    traditionalMarketLabel: '기존 시장 평균가',
    typicalFeeLabel: '고객 청구 가격',
    fullyLoadedCostLabel: '프로젝트당 총 납품 원가',
    costBreakdownSubLabel: '크레딧 + PM 시간',
    estComputeLabel: '컴퓨팅 비용 (재촬영 버퍼 20% 포함)',
    activeHandsOnLabel: '운영자 / PM 실작업 시간 ($50/시간 기준)',
    monthlyGrossLabel: '예상 월간 고객 매출',
    monthlyNetLabel: '예상 월간 서비스 순이익 (컴퓨팅 및 PM 시간 차감 후)',
    perMonthSuffix: '/ 월',
    marginBadgeSuffix: '서비스 마진율',
    disclaimer:
      '범위 연동 납품 원가에는 SceneFlow 컴퓨팅 비용(추가 크레딧당 $0.01, 재촬영 버퍼 20% 포함)과 시간당 $50 기준의 운영자/PM 작업 시간이 포함됩니다. 위 스트레스 테스트를 켜면 초기 적응 시간과 Pro($149/월) 구독료가 반영되며, 지역 영업·마케팅 비용은 제외됩니다.',
    launchBusinessCta: '첫 포트폴리오 샘플 영상 만들기 ($9)',
    launchBusinessSubnote:
      '$9 Explorer 테스트 플랜으로 지역 제휴 파트너에게 보여줄 워터마크 없는 포트폴리오 샘플을 제작한 뒤, Pro($149/월)로 업그레이드해 100% 화이트라벨 고객 포털을 열어보세요.',
    foundingCharterCta:
      '지금 바로 클라이언트 스튜디오를 시작하시나요? 25석 한정 창립 오퍼레이터 차터 보기',
    foundingCharterTitle: '창립 영상 서비스 오퍼레이터 90일 Pro 차터',
    trustShieldHeading: '엔터프라이즈급 마진·개인정보·상업 IP 보호 체계',
    trustShieldPillars: [
      {
        title: '로그인 없는 화이트라벨 포털 (Pro+)',
        detail:
          '클라이언트는 SceneFlow 로그인 화면이나 크레딧 단가를 전혀 보지 않고 귀하의 스튜디오 이름, 로고, 브랜드 컬러 아래에서 리뷰합니다.',
      },
      {
        title: 'Express 4K 시네마 & 모션 지출 방화벽',
        detail:
          '포토리얼 패닝 4K 스틸에 복제 보이스·SFX·배경음악을 더한 완성본을 $149–$249 당일 마스터로 납품하거나, 풀모션 영상 비용을 쓰기 전 낭비 없는 사전 승인 방화벽으로 활용할 수 있습니다.',
      },
      {
        title: '고객 사진과 사연은 100% 비공개 보호',
        detail:
          '가족 아카이브와 B2B 자료는 철저히 비공개로 보관되며 공개 AI 모델 학습에 절대 사용되지 않습니다. 업로드 시 EXIF GPS가 자동 제거되며 명시적 초상권 동의가 기록됩니다.',
      },
    ],
    playbooksBadge: '바로 쓰는 비즈니스 스타터 키트 포함',
    playbooksHeading: '턴키 운영 플레이북, 요금표 & 파트너 제안 템플릿',
    playbooksSubtitle:
      '시행착오 없이 바로 수익을 낼 수 있도록 검증된 업종별 표준 운영 절차(SOP)가 SceneFlow Studio 안에 내장되어 있습니다:',
    playbooksItems: [
      '70개 이상 영화 언어 대응 AI 전기 작가 & 인터뷰 플레이북 (7개 네이티브 포털 UI 언어)',
      '3단계 패키지 요금표 & 앱 내 최소 마진 계산기',
      '20% 추천 파트너 제안서 (실버타운, 장례식장, 부동산 중개소용)',
      '클릭랩 미디어·다연령 초상권·음성 동의 원장 기본 내장',
    ],
    blueprintFlywheel: {
      badge: 'PM 시간 0분 자동 발굴 · 83% 순마진',
      title: 'PM이 프로젝트에 손대기도 전에 자동으로 수익을 창출하세요',
      subtitle:
        '고객은 빈 화면에서 영상을 기획하는 데는 어려움을 겪지만, 삽화와 내레이션이 담긴 초안에 피드백을 주는 데는 능숙합니다. SceneFlow는 고객 온보딩을 자가 수익형·가족 협업 Blueprint Pass로 전환해 보류된 리드에서도 수익을 만듭니다.',
      cards: [
        {
          tag: '$29 패스 + $19 추가 팩 · PM 0분',
          title: '자가 수익형 Blueprint Pass & 추가 수정 팩',
          detail:
            '고객은 선불 $29만 결제하면 약 3분 안에 삽화 스토리보드, 다국어 내레이션, Audience Resonance 점수를 받습니다(중단해도 약 83% 마진). 추가 라운드가 필요하면 $19 셀프 팩(+3회 수정 / +2 AR)을 즉시 구매할 수 있습니다.',
        },
        {
          tag: '빠르고 사실에 충실한 초안 1',
          title: '기억 소환 칩, 15초 퀵 체크 & 허구 방지 가드레일',
          detail:
            '업종별 이정표 칩(결혼, 승진, 스포츠, 성과, 공간 등)과 15초 음성/텍스트 퀵 체크로 핵심 인물과 사건을 빠르게 수집하며, 엄격한 논픽션 가드레일로 사실에 없는 전기 내용을 지어내지 않습니다.',
        },
        {
          tag: '이중 공유 링크 & 의견 선별',
          title: '가족/팀 댓글 전용 링크 & 주 고객의 최종 결정권',
          detail:
            '주 고객에게는 전용 디렉터 포털을 제공하고 가족·동료에게는 댓글 전용 링크를 공유합니다. 게스트는 70개 이상 언어로 듣고 댓글만 남길 수 있어 수정 횟수나 승인 권한을 소모하지 않으며, 주 고객이 메모와 원클릭 AR 팁을 골라 1회 AI 업데이트로 스토리보드와 오디오를 자동 갱신합니다.',
        },
        {
          tag: '승인 시점 지연 PM 배정',
          title: '승인 클릭 시에만 PM 배정 + Blueprint 전환 퍼널',
          detail:
            '고객이 Blueprint 승인을 누르기 전까지 PM 인건비는 0원입니다. Blueprint 퍼널에서 진행 중, 48시간/7일 이상 정체, 라운드 소진 리드를 추적하고 원클릭 화이트라벨 리마인드 이메일, +3회 수정 부여, 자동 패스 매출을 관리하세요.',
        },
      ],
    },
    agencyScaleOps: {
      badge: '멀티 PM 에이전시 스케일 · 수백 개 클라이언트 프로젝트',
      title: '스튜디오에 기본 내장된 에이전시 운영 지휘 본부',
      subtitle:
        '스프레드시트, 낭비되는 영업 시간, 마진 누수, 비대해진 스토리지 없이 1인 오퍼레이터에서 글로벌 멀티 PM 영상 에이전시로 확장하세요.',
      pillars: [
        {
          title: 'Blueprint 퍼널, 칸반 & SLA 알림',
          detail:
            '자동화 Blueprint Pass와 실제 제작 건을 분리 관리하고, 미승인 정체 건(>48시간/7일)과 수정 소진 건을 원클릭 화이트라벨 리마인드 및 +3회 수정 지급으로 즉시 전환합니다.',
        },
        {
          title: '고객 CRM, 패스 매출 & PM 스코어카드',
          detail:
            '자동화된 $29 Blueprint Pass, $19 추가 팩, 본 제작 주문을 자동 집계하며 PM별 크레딧 소진량, 납기 속도, 실시간 총이익률을 모니터링합니다.',
        },
        {
          title: '지연 PM 라우팅 & 워크스페이스 격리',
          detail:
            '승인 전 Blueprint Pass는 완전 무인으로 운영하고 승인 시점에만 언어별 PM을 자동 배정합니다. 시리즈 바이블 위임과 크레딧 소비 없는 QA 리뷰어 분리도 지원합니다.',
        },
        {
          title: '무제한 확장 & 원클릭 중간 파일 정리',
          detail:
            '수백 개 프로젝트를 아우르는 서버 검색과 일괄 PM 작업, 최종 마스터는 보존하면서 중간 초안 파일만 원클릭 아카이브 및 정리하는 기능을 제공합니다.',
        },
      ],
    },
    workflowHeading: '화이트라벨 클라이언트 프로젝트가 완성되는 4단계 흐름',
    stepPrefix: '단계',
    workflowSteps: [
      {
        step: '01',
        title: '자가 수익형 $29 가이드 인테이크',
        detail:
          '고객이 $29 Blueprint Pass를 구매하고 업종별 기억 소환 칩을 탭한 뒤, 필수 동의와 함께 음성이나 텍스트로 이야기를 들려주고 15초 퀵 체크로 논픽션 정확도를 확정합니다.',
      },
      {
        step: '02',
        title: '리빙 Blueprint, 가족 의견 선별 & 자동 수정',
        detail:
          '약 3분 만에 삽화 스토리보드, 다국어 오디오, AR 점수를 받고 가족/팀에게 댓글 전용 링크를 공유합니다. 선별한 메모로 AI 수정(또는 $19 팩 추가)을 거쳐 승인하면 PM이 자동 배정됩니다.',
      },
      {
        step: '03',
        title: '모바일 사진 업로드, 발음 가이드 & 연속성 고정',
        detail:
          '고객이 스마트폰에서 실제 사진을 업로드하고(EXIF GPS 자동 삭제), 인물·지명 10초 발음 가이드를 추가한 뒤 정해진 라운드 내에서 다연령 캐스트·의상·세트를 승인 고정합니다.',
      },
      {
        step: '04',
        title: '당일 Express 4K 또는 풀모션 시사실 납품',
        detail:
          'PM의 원탭 승인 공개(또는 완전 자동 파일럿)로 로그인 없는 시사실에 배포합니다. 고객 승인 시 4K 마스터 렌더링과 다운로드 이메일이 자동 실행되며, 언제든 재작업 없이 풀모션으로 업그레이드할 수 있습니다.',
      },
    ],
    verticals: [
      {
        id: 'memoir',
        tabLabel: '비디오 회고록',
        roleTag: '★ 주력 고마진 핵심 상품',
        badge: '$149–$1,250 / 편 · 기존 시장가: $1,200–$4,500+',
        title: '인생 스토리, 기념 헌정 영상 & 가족 전기 필름',
        description:
          '$149 당일 납품 Express 4K 시네마 헌정 필름(포토리얼 패닝 스틸, 복제 보이스, SFX & 스코어)으로 시작하거나, 재작업 없이 다연령 시대 재연(17세 → 32세 → 62세) 풀모션으로 매끄럽게 업그레이드하세요.',
        globalMarketNeed:
          '전 세계적으로 매년 수억 건의 부모님 생신, 금혼식, 추모 행사가 열리지만 $2,000+ 촬영 비용과 수주의 제작 기간 때문에 90% 이상이 영상으로 남지 못합니다.',
        clientBuyer:
          '칠순·팔순 생신, 결혼 50주년, 은퇴식 및 가족 유산 헌정 영상을 준비하는 가정',
        partnerChannels:
          '자산승계 플래너, 실버타운, 장례 지도사 & 기념 이벤트 플래너 (15–20% 추천 파트너 모델)',
        traditionalMarketRangeLabel: '$1,200–$4,500+',
        typicalRetailUsd: 599,
        priceTiersUsd: [149, 599, 1250],
        tierScopeLabels: [
          'Express 4K 시네마 (5–8분 · 당일 납품) · 패닝 4K 스틸 + 보이스·SFX·스코어 · 자동 4K 마스터',
          '12분 풀모션 가족 회고록 · 다연령 캐스트 + 시대 클립 · 2개 언어',
          '20분 Signature 유산 다큐멘터리 · 4K 풀모션 시대 재연 + 가보 고정 · 4개 언어',
        ],
        computeTiersUsd: [6, 34, 72],
        operatorTiersUsd: [12, 88, 150],
        activeTimeTiersLabels: ['약 15분', '약 1.75시간', '약 3.0시간'],
        retailRangeLabel: '$149–$1,250',
        estComputeUsd: 34,
        estOperatorUsd: 88,
        activeMinutesLabel: '약 1.75시간',
        keyAdvantage:
          '3단계 가치 사다리: $29 Blueprint Pass → $149 당일 Express 4K 시네마(총원가 약 $18, 약 88% 마진) → 재작업 없는 $599+ 풀모션 업그레이드.',
      },
      {
        id: 'realestate',
        tabLabel: '부동산 투어',
        roleTag: '↻ 중개사 정기 리테이너',
        badge: '$149–$549 / 매물 · 기존 시장가: $450–$1,500+',
        title: '내레이션 고급 부동산 & 부티크 호텔 투어',
        description:
          '매물 사진과 주변 인프라 강점을 당일 $149 Express 4K 매물 필름이나 풀모션 워크스루로 변환하세요. 해외 바이어를 위한 중국어, 스페인어, 아랍어, 포르투갈어 버전도 즉시 제작할 수 있습니다.',
        globalMarketNeed:
          '매달 전 세계 수천만 개의 주택 매물, 단기 숙소, 부티크 호텔이 국내외 바이어를 두고 경쟁하지만 대부분 여전히 정적인 사진에 머물러 있습니다.',
        clientBuyer:
          '고실적 주거용 부동산 중개인, 럭셔리 중개 법인, 휴양지 숙소 & 부티크 호텔',
        partnerChannels:
          '부동산 전문 사진 스튜디오, 홈 스테이징 팀, 고급 중개 법인 & 호스피탈리티 마케터',
        traditionalMarketRangeLabel: '$450–$1,500+',
        typicalRetailUsd: 299,
        priceTiersUsd: [149, 299, 549],
        tierScopeLabels: [
          'Express 4K 매물 필름 (90초 · 당일 납품) · 패닝 4K 스틸 + 내레이션 & 스코어 · 1개 언어',
          '2분 풀모션 매물 투어 · 4K 업스케일 + 2개 언어',
          '3분 럭셔리 에스테이트 필름 + 9:16 릴스 · 4개 국제 언어',
        ],
        computeTiersUsd: [5, 15, 28],
        operatorTiersUsd: [10, 50, 88],
        activeTimeTiersLabels: ['약 12분', '약 1.0시간', '약 1.75시간'],
        retailRangeLabel: '$149–$549',
        estComputeUsd: 15,
        estOperatorUsd: 50,
        activeMinutesLabel: '약 1.0시간',
        keyAdvantage:
          '중개사당 높은 반복 주문: 현장 이동 지연 없이 $149 당일 Express 4K 매물 필름(납품 원가 약 $15, 약 90% 마진) 또는 월간 풀모션 리테이너를 수주하세요.',
      },
      {
        id: 'training',
        tabLabel: '기업 교육 & SOP',
        roleTag: '↻ B2B 정기 리테이너',
        badge: '$249–$1,800 / 모듈 · 기존 시장가: $1,500–$5,000+',
        title: '기업 온보딩, 산업 안전 & 다국어 교육 과정',
        description:
          '일관된 강사 캐릭터, 유니폼, 작업장 세트를 Continuity Vault에 고정한 뒤, 당일 $249 Express 4K 내레이션 SOP 또는 70개 이상 직원 언어로 현지화된 풀모션 강좌를 신속하게 납품하세요.',
        globalMarketNeed:
          '전 세계 제조업체, 병원 네트워크, 외식 그룹, 프랜차이즈가 현장 인력 이탈, 안전 규정 준수, 다국적 인력 교육을 위해 명확한 영상 SOP를 절실히 필요로 합니다.',
        clientBuyer:
          'HR·L&D 책임자, 제조기업, 의료 클리닉 네트워크, 외식 프랜차이즈 본사',
        partnerChannels:
          '외부 HR 컨설턴트, 산업안전 감사 기관, LMS 구축사 & 프랜차이즈 협회',
        traditionalMarketRangeLabel: '$1,500–$5,000+',
        typicalRetailUsd: 950,
        priceTiersUsd: [249, 950, 1800],
        tierScopeLabels: [
          'Express 4K 내레이션 SOP (5분 · 당일 납품) · 고정 강사 스틸 + 복제 보이스 & SFX · 1개 언어',
          '10분 풀모션 안전/온보딩 강좌 · 현장 직원용 3개 언어',
          '20분 멀티 챕터 교육 커리큘럼 · 6개 이상 언어 지원',
        ],
        computeTiersUsd: [9, 40, 78],
        operatorTiersUsd: [18, 125, 210],
        activeTimeTiersLabels: ['약 20분', '약 2.5시간', '약 4.2시간'],
        retailRangeLabel: '$249–$1,800',
        estComputeUsd: 40,
        estOperatorUsd: 125,
        activeMinutesLabel: '약 2.5시간',
        keyAdvantage:
          '이탈률 낮은 B2B 리테이너: $249 당일 Express 4K SOP(원가 약 $27, 약 89% 마진)나 $950+ 다국어 강좌를 납품하고, 규정 변경 시 몇 분 만에 재렌더링할 수 있습니다.',
      },
      {
        id: 'brand',
        tabLabel: '브랜드 스토리',
        roleTag: '↻ SMB & 에이전시 반복 팩',
        badge: '$199–$1,200 / 팩 · 기존 시장가: $3,000–$8,000+',
        title: '창업자 스토리 필름, 병원 소개 & SNS 광고 영상',
        description:
          '당일 $199 Express 4K 브랜드 필름 또는 풀모션 홈페이지 창업 스토리에 인스타그램·틱톡·유튜브 쇼츠용 9:16 세로 예고편을 자동 패키징하고, 시사실(Screening Room)에서 깔끔하게 검수받으세요.',
        globalMarketNeed:
          '전 세계 3,000만 개 이상의 병원, 로펌, 레스토랑, 로컬 브랜드가 홈페이지 신뢰 영상과 신선한 9:16 광고를 원하지만 $5,000+ 대행사 촬영비에 막혀 있습니다.',
        clientBuyer:
          '병·의원 및 치과, 법무법인, 지역 중소기업, 웹 에이전시 & 이커머스 창업자',
        partnerChannels:
          '지역 웹 디자인 스튜디오, SEO·퍼포먼스 광고 대행사, 상공회의소 & 의료 경영 컨설턴트',
        traditionalMarketRangeLabel: '$3,000–$8,000+',
        typicalRetailUsd: 650,
        priceTiersUsd: [199, 650, 1200],
        tierScopeLabels: [
          'Express 4K 브랜드 필름 (90초 · 당일 납품) · 패닝 4K 스틸 + 내레이션 & 스코어 · 자동 4K 마스터',
          '2분 풀모션 창업자 오리진 필름 + 소셜 9:16 컷다운 2종',
          'Signature 브랜드 필름 + 다국어 유료 광고 훅 변형 4종',
        ],
        computeTiersUsd: [7, 28, 56],
        operatorTiersUsd: [15, 88, 150],
        activeTimeTiersLabels: ['약 18분', '약 1.75시간', '약 3.0시간'],
        retailRangeLabel: '$199–$1,200',
        estComputeUsd: 28,
        estOperatorUsd: 88,
        activeMinutesLabel: '약 1.75시간',
        keyAdvantage:
          '지역 웹·광고 대행사를 위한 화이트라벨 제작 납품: $199 당일 Express 4K 브랜드 필름(원가 약 $22, 약 89% 마진) 또는 9:16 컷다운 포함 $650 풀모션 팩.',
      },
    ],
  },
  guidedTour: {
    eyebrow: '비주얼 스튜디오 투어 · 전문 용어 제로',
    title: '하나로 연결된 네 개의 룸.',
    titleAccent: '막힘없는 단일 워크플로우.',
    subtitle:
      '아래 6개 풀렝스 제작 사례에서 직접 열어보기 전에, 60초 만에 4개의 스튜디오 문(시리즈 룸, Blueprint 룸, 프로덕션 스테이지, 시사실)을 한눈에 익혀보세요.',
    stepPrefix: '단계',
    lensLabel: '미리보기 관점:',
    lensCreator: '오리지널 시리즈 (“The Glass Ledger”)',
    lensService: '클라이언트 서비스 (“인생 스토리 회고록”)',
    watchRoomVideoLabel: '30초 룸 투어 보기',
    inspectFullScreenLabel: '스튜디오 전체 화면 보기',
    openLiveScreeningLabel: '라이브 샌드박스 시사실 열기',
    screeningModalTitle: 'The Glass Ledger — 샌드박스 시사실 (Screening Room)',
    examplesBridgeText:
      '4개의 스튜디오 문을 익혔다면, 이제 6가지 풀렝스 장르에서 직접 체험해 보세요:',
    examplesBridgeCta: '제작 사례에서 4개 라이브 룸 체험하기',
    rooms: [
      {
        id: 'series-desk',
        stepNumber: '01',
        tabLabel: '시리즈 룸',
        badge: '멀티 에피소드 세계관 & 연속성 바이블',
        title: '단발 클립이 아닌, 재사용 가능한 세계관을 한 번에 구축',
        promise:
          '시리즈 채널, 기업 교육 커리큘럼, 멀티 챕터 전기를 한 번만 설명하세요. SceneFlow가 스토리 바이블, 에피소드 목록, 공유 레퍼런스 라이브러리를 자동 구축해 모든 회차의 일관성을 유지합니다.',
        creatorExampleTitle: 'The Glass Ledger · 6부작 네오 누아르 스릴러',
        creatorExampleNote:
          '공유 캐스트(엘라라 반스, 마커스 손, 아리스 카엘 박사), 아카이브 금고 세트, 쿼츠 코덱스 소품이 6개 에피소드 전체에 고정되어 Audience Resonance 91/100을 달성했습니다.',
        serviceExampleTitle: '멀티 챕터 가족 유산 또는 기업 교육 커리큘럼',
        serviceExampleNote:
          '클라이언트가 승인한 진행자, 가족 시대별 인물, 사업장 로케이션을 한 번 저장해 두면 2화부터 10화까지 비주얼 흔들림 없이 원클릭으로 확장할 수 있습니다.',
        callouts: [
          {
            label: '즉시 생성되는 시리즈 베이스라인 & Audience Resonance 점수',
            detail:
              '제작에 앞서 시놉시스, 에피소드 아크, Audience Resonance 분석 점수를 자동 생성합니다.',
          },
          {
            label: '공유 레퍼런스 라이브러리',
            detail:
              '캐릭터, 보이스, 의상, 세트, 소품이 모든 에피소드로 자동 연동됩니다.',
          },
          {
            label: '음성 또는 텍스트 시리즈 디렉터',
            detail:
              '말하거나 입력하는 것만으로 시즌 전체 전개나 개별 에피소드 구성을 손쉽게 조정합니다.',
          },
        ],
        visuals: {
          topBadge: '시리즈 AR: 91 / 100 · 6개 에피소드 동기화됨',
          bottomBadge: '모든 에피소드에 공유 레퍼런스 라이브러리 고정 완료',
          thumbLabels: [
            '엘라라 반스 · 주연',
            '마커스 손 · 캐스트',
            '아카이브 금고 · 세트',
            '쿼츠 코덱스 · 소품',
          ],
        },
      },
      {
        id: 'blueprint-board',
        stepNumber: '02',
        tabLabel: 'Blueprint 룸',
        badge: '스토리 우선 인테이크, 다연령 캐스트 & 그린라이트',
        title: '영상 렌더링 비용을 쓰기 전에 공감 가는 스토리와 캐스트 확정',
        promise:
          '자연스러운 스토리 인터뷰나 콘셉트에서 시작하세요. Blueprint 룸이 극적 비트를 구조화하고 비트별 등장인물을 강조하며 다연령 정체성을 고정해 공유 링크로 즉시 승인을 받을 수 있습니다.',
        creatorExampleTitle: '비트별 트리트먼트 & 비주얼 스타일 락',
        creatorExampleNote:
          '각 비트마다 극적 의도, 등장인물, 아나모픽 조명 규칙, 음성 해설이 포함된 Audience Resonance 피드백을 결합합니다.',
        serviceExampleTitle: 'PM 시간 0분 $29 Blueprint Pass & 가족 댓글 선별',
        serviceExampleNote:
          '기억 소환 칩과 허구 방지 가드레일로 약 3분 만에 삽화·내레이션 초안 1을 생성합니다. 고객은 가족에게 댓글 전용 링크를 공유하고 메모와 원클릭 AR 팁을 골라 AI 수정한 뒤, 승인 클릭 시에만 PM을 배정합니다.',
        callouts: [
          {
            label: '기억 소환 인테이크 & 허구 방지 보호',
            detail:
              '업종별 이정표 칩과 15초 음성/텍스트 퀵 체크로 핵심 인물과 시대를 빠르게 담아내며, 말하지 않은 사실을 임의로 지어내지 않습니다.',
          },
          {
            label: '이중 가족/팀 공유 & 의견 트리아지',
            detail:
              '게스트는 70개 이상 언어(7개 네이티브 UI 언어)로 듣고 수정 횟수 소모나 승인 없이 댓글을 남기며, 주 고객이 의견을 선별해 1회 깔끔한 AI 수정으로 반영합니다.',
          },
          {
            label: '오디오·스토리보드 자동 갱신 & $19 추가 팩',
            detail:
              '매 수정마다 변경된 챕터를 다시 그리고 내레이션 재생성 및 Audience Resonance 재채점을 수행하며, 셀프 +3회 수정 팩도 제공합니다.',
          },
        ],
        visuals: {
          topBadge: 'Blueprint AR: 92 / 100 · 비트별 캐스트 하이라이트',
          bottomBadge: '다연령 캐릭터 연속성 + 클라이언트 공유 승인 링크',
          thumbLabels: [
            '주인공 서사 아크',
            '아리스 카엘 박사 · 비트 2',
            '항구 데크 · 2막',
            '크로노 키 · 핵심 플롯',
          ],
        },
      },
      {
        id: 'production-stage',
        stepNumber: '03',
        tabLabel: '프로덕션 스테이지',
        badge: 'Shot Director, 의상 제어 & 자율 제작 에이전트',
        title: '음성 시네마 컷 시사 — 4K로 바로 납품하거나 풀모션으로 업그레이드',
        promise:
          '제작 대본과 연속성 레퍼런스를 확인하고, 복제 보이스·SFX·스코어가 어우러진 포토리얼 패닝 시네마 컷을 감상하세요. 당일 4K Express 시네마 필름으로 바로 납품하거나 자율 에이전트로 풀모션 샷을 구축할 수 있습니다.',
        creatorExampleTitle: '씬 1: 지하 아카이브 금고 · 아나모픽 4K',
        creatorExampleNote:
          '샷마다 엘라라의 의상을 바꾸고 음성·텍스트로 카메라 프레이밍을 지시하며, Production Mixer에서 대사·SFX·스코어를 믹싱한 뒤 Production Agents를 실행하세요.',
        serviceExampleTitle: '당일 $149 Express 4K 시네마 또는 하이브리드 풀모션 업그레이드',
        serviceExampleNote:
          '포토리얼 패닝 4K 내레이션 시네마 필름을 몇 시간 만에 납품하거나(컴퓨팅 약 $6), 사진이 없는 추억만 AI 풀모션으로 재연해 12분 풀모션 회고록 컴퓨팅 원가를 약 $34 수준으로 유지할 수 있습니다.',
        callouts: [
          {
            label: '컷별 의상 지정 & 음성/텍스트 Shot Director',
            detail:
              '샷마다 정확한 의상을 선택하고 대화하듯 프레이밍이나 표정을 미세 조정하세요 — 운에 맡기는 재생성은 없습니다.',
          },
          {
            label: 'Express 4K 시네마 마스터 & 모션 지출 방화벽',
            detail:
              '연속성이 고정된 패닝 4K 스틸 위에서 복제 대사·내레이션·SFX·스코어를 확인하고, $149 완성본으로 출력하거나 풀모션 지출 전 최종 승인 게이트로 활용하세요.',
          },
          {
            label: '자율형 Audio Agent, Stills Agent & Clips Agent',
            detail:
              '씬 단위로 세밀하게 생성하거나 통합 Production Agents를 실행해 전체 제작과 편집 결합을 자동화하세요.',
          },
        ],
        visuals: {
          topBadge: 'Shot Director · 의상 선택 완료 · Express 4K 시네마 컷 준비',
          bottomBadge: 'Audio / Stills / Clips Agent가 모든 씬을 자동 오케스트레이션',
          thumbLabels: [
            '샷 1 · 금고 와이드',
            '샷 3 · 소품 매크로',
            '씬 2 · 인계 장면',
            '씬 3 · 트래킹 샷',
          ],
        },
      },
      {
        id: 'screening-room',
        stepNumber: '04',
        tabLabel: '시사실 (Screening Room)',
        badge: '프레임 단위 리뷰, 70개 이상 언어 & 글로벌 배급',
        title: '프라이빗 링크로 협업하고 전 세계 어떤 언어로든 배급하세요',
        promise:
          'Express 4K 시네마 컷, 러프 컷, 풀모션 4K 마스터를 하나의 플레이어에서 시사합니다. 클라이언트 승인 시 4K 마스터 렌더링과 다운로드 링크 이메일 발송이 자동 실행되며, 70개 이상 언어의 씬 내 더빙 스트림도 즉시 생성됩니다.',
        creatorExampleTitle: '프리미어급 마스터, 프로모 예고편 & 글로벌 더빙',
        creatorExampleNote:
          '9:16 세로 예고편을 자동 컷다운하고 70개 이상 시장의 현지화 대사 스트림을 재생성해 유튜브에 게시하거나 SceneFlow Originals에 지원하세요.',
        serviceExampleTitle: '마찰 없는 클라이언트 리뷰 & 다국어 납품',
        serviceExampleNote:
          '클라이언트는 로그인 없이 모바일이나 데스크톱에서 영상을 확인하고 타임스탬프 메모를 남긴 뒤, 가족이나 직원의 언어로 완성된 고화질 MP4를 바로 수령합니다.',
        callouts: [
          {
            label: '로그인 없는 공유 리뷰 링크',
            detail:
              '프라이빗 `/share/screening-room/` 링크를 보내 클라이언트, 임원, 가족의 승인을 간편하게 완료하세요.',
          },
          {
            label: '70개 이상 언어 씬 내 동기화 스트림',
            detail:
              '배경 효과음과 스코어는 그대로 유지하면서 글로벌 시장에 맞춘 현지화 음성과 대사를 정밀하게 동기화합니다.',
          },
          {
            label: '4K 마스터 내보내기 & 프로모 컷다운',
            detail:
              '완전한 IP 소유권이 보장된 깔끔한 상업용 마스터를 다운로드하거나 소셜 채널용 예고편을 즉시 발행하세요.',
          },
        ],
        visuals: {
          topBadge: '프레임 정밀 메모 · 로그인 없는 고객 링크',
          bottomBadge: '7개 스튜디오 UI 언어 · 70+ 씬 내 다국어 스트림',
          thumbLabels: [
            'EN · 오리지널 마스터',
            'ES / PT · 동기화 더빙',
            'ZH / TH / HI · 다국어 스트림',
            '9:16 프로모 컷다운',
          ],
        },
      },
    ],
  },
  useCaseDirectory: {
    viewByUseCaseLabel: '활용 사례별로 보기',
    viewByRoomLabel: '스튜디오 룸별로 보기',
    tracks: [
      {
        id: 'memoir-services',
        tabLabel: '비디오 회고록 & 가족 유산',
        badge: '주력 클라이언트 서비스 · $149–$1,250/편',
        headline: '가족 인터뷰와 소중한 사진을 평생 간직할 시네마로 완성하세요',
        description:
          '70개 이상 영화 언어(7개 네이티브 UI 포털 지원)로 인생 이야기를 수집하고, Character Selfie Studio에서 1970년대 청년기부터 현재까지 초상을 보정·연령 변환한 뒤, 자율 Production Agents와 FlowDirector 원클릭 수정을 거쳐 로그인 없는 시사실 링크로 납품합니다.',
        featureIcons: [
          'clientIntake',
          'selfieStudio',
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
        tabLabel: '20개 프로젝트 에이전시 & 기업 교육',
        badge: '20+ 동시 프로젝트 · 통합 Production Agent + FlowDirector QA',
        headline: '워크플로우 자동화로 20개 동시 클라이언트 프로젝트를 50%–80% 낮은 비용에 운영',
        description:
          '화이트라벨 포털과 PM 크레딧 상한을 설정하고 공유 Blueprint에서 순마진을 검증하세요. 통합 Production Agent로 프리비즈 오디오, 키프레임 스틸, 모션 클립, MP4 씬 렌더링을 병렬 처리하고 자가 복구 [Investigate] 및 FlowDirector QA를 거쳐 70개 이상 언어로 납품합니다.',
        featureIcons: [
          'producerLaunchpad',
          'blueprintShare',
          'productionAgent',
          'scriptSupervisor',
          'budget',
          'castLocations',
          'musicScore',
          'stillsWorkbench',
          'clipsWorkbench',
          'multilanguageUi',
          'screeningPlayer',
        ],
      },
      {
        id: 'series-animation',
        tabLabel: '에피소드 시리즈 & 스타일라이즈드 애니메이션',
        badge: '멀티 에피소드 IP · 아트 & 캐스트 연속성 고정',
        headline: '1화부터 시즌 피날레까지 하나의 쇼러너 바이블로 완주하세요',
        description:
          '멀티 에피소드 시즌 아크를 구축하고 모든 회차에 걸쳐 포토리얼 또는 스타일라이즈드 3D 아트 디렉션을 고정한 뒤, 스토리보드와 키프레임을 연출하고 통합 Production Agent와 자가 복구 Creative Kling AI F2V 폴백으로 시네마급 10초 클립을 렌더링하세요.',
        featureIcons: [
          'newSeries',
          'seriesReview',
          'seriesDirector',
          'directEpisode',
          'startEpisode',
          'productionAgent',
          'stillsWorkbench',
          'clipsWorkbench',
        ],
      },
      {
        id: 'creator-podcast',
        tabLabel: '유튜브 채널 & 내러티브 팟캐스트',
        badge: '고유지율 페이스리스 채널 · 멀티 호스트 쇼',
        headline: '스튜디오급 보이스, 음악, 믹싱으로 매주 스토리 중심 에피소드 발행',
        description:
          '렌더링 전 시청 지속 훅을 테스트하고, 다중 호스트 케미·샷 동기화 내레이션·맞춤 오리지널 스코어를 연출하세요. 4스템 오디오 믹스를 다듬고 원클릭 OAuth로 16:9 및 9:16 소셜 스트림을 바로 게시합니다.',
        featureIcons: [
          'sceneWorkflow',
          'seriesResonance',
          'musicScore',
          'scriptSupervisor',
          'mixer',
          'streamsInventory',
          'shipPackage',
        ],
      },
      {
        id: 'filmmaker-pitch',
        tabLabel: '영화감독 프리비즈 & 피치 트레일러',
        badge: '그린라이트 덱 · 콘셉트 증명 시네마',
        headline: '시나리오를 사전 검증하고 완성된 예고편과 함께 피치 미팅에 들어가세요',
        description:
          'FlowDirector와 공동 집필하고 Blueprint·대본 게이트에서 Audience Resonance로 구조적 페이싱을 평가한 뒤, 예산 예측이 포함된 삽화 스토리보드 공유, 표준 시나리오 포맷팅, 극장급 콘셉트 예고편 제작까지 끝내세요.',
        featureIcons: [
          'blueprintDirector',
          'blueprintResonance',
          'blueprintShare',
          'goToProduction',
          'productionScript',
          'scriptResonance',
          'promoTrailers',
        ],
      },
    ],
  },
  directoryDrawer: {
    badge: '워크플로우 자동화 & 39개 스튜디오 기능 · 7개 언어 내레이션 시네마 가이드',
    title: '20개 이상 동시 프로젝트의 제작과 전문가 영상 QA를 자동화하세요',
    subtitle:
      '모든 기능마다 모바일 친화적인 7개 언어 WebM 내레이션 시네마 안내 영상이 제공됩니다. 화이트라벨 포털, Selfie Studio, FlowDirector 원클릭 수정, 자율 에이전트가 어떻게 300회 이상의 수동 프롬프트를 대체하는지 확인해 보세요.',
    expandCta: '내레이션 포함 39개 스튜디오 기능 모두 보기',
    collapseCta: '스튜디오 기능 목록 접기',
    automationEyebrow: '대량 제작 크리에이터 & 20개 프로젝트 영상 서비스 사업자를 위한 설계',
    automationTitle: '엔드투엔드 워크플로우 자동화: 에이전트가 제작하고, FlowDirector가 원클릭으로 감사 및 수정합니다.',
    automationSubtitle:
      '클립마다 프롬프트를 지켜보며 시간을 쏟지 마세요. 자율형 Audio, Stills, Clips, Production Agents가 백그라운드에서 씬을 구축하는 동안, FlowDirector가 렌더링된 모든 씬 MP4의 Audience Resonance와 감독 준수도를 검사하고 Shot Director를 통해 원클릭으로 문제 클립을 재생성합니다.',
    spotlightFlowDirectorLabel: 'FlowDirector 씬 영상 QA',
    spotlightFlowDirectorMeta: '관객 AR + 감독 준수도 검사 · 원클릭 클립 재생성',
    spotlightAgentsLabel: '자율형 프로덕션 에이전트',
    spotlightAgentsMeta: '300+ 프롬프트 자동화 · 20개 활성 프로젝트 자가 복구',
    spotlightNarrated5kLabel: '39개 기능 · 내레이션 시네마 가이드',
    spotlightNarrated5kMeta: '깔끔한 16:9 WebM 시네마 워크스루 + 7개 언어 스튜디오 내레이션',
  },
  academyStrip: {
    badge: '학습 곡선 제로 보장 · Studio Academy',
    title: '막막해할 필요 없습니다. 어디서나 ? 키를 누르면 60초 비주얼 가이드가 열립니다.',
    subtitle:
      '모든 스튜디오 룸에는 번호가 매겨진 콜아웃, 원클릭 액션, 프리비즈 크레딧 보호 가드레일, 그리고 인터랙티브 “10분 만에 첫 영화 만들기” 시뮬레이터가 담긴 적시(JIT) 화면 맵이 내장되어 있습니다.',
    pills: [
      '상황 인식 ? 화면 맵',
      '“10분 만에 첫 영화” 시뮬레이터',
      '프리비즈 크레딧 보호 가드레일 기본 내장',
    ],
    watchAcademyCta: '30초 Academy 투어 보기',
    startExplorerCta: 'Explorer로 시작하기 — $9',
  },
  mobileCompanion: {
    eyebrow: '로그인 없는 고객 링크 + 운영자용 모바일 PWA · iOS & Android',
    title: '데스크톱 스튜디오의 파워.',
    titleAccent: '고객과 팀을 위한 마찰 없는 모바일 포털.',
    subtitle:
      '유료 클라이언트는 SceneFlow 로그인, 앱 다운로드, 구독이 전혀 필요 없습니다. 귀하의 화이트라벨 모바일 웹 링크로 참여하며, 귀하와 프로젝트 매니저(PM)는 즉시 설치되는 Mobile Companion PWA로 알림·마일스톤·크레딧 상한을 관리합니다.',
    whyPwaBadge: '고객 로그인 제로 · 즉시 설치 운영자 PWA',
    whyPwaNote:
      '고객은 귀하의 브랜드 아래 깔끔한 Safari/Chrome 링크를 탭하고, 운영자와 PM은 원탭으로 Companion PWA를 설치해 네이티브 Web Push 알림을 받습니다.',
    modeCustomerTab: '화이트라벨 고객 루프',
    modeTeamTab: '운영자 & PM 허브 (PWA)',
    customerHeading: '귀하의 스튜디오 브랜드로 제공되는 로그인 없는 모바일 포털',
    customerSubheading:
      '고객은 SceneFlow 크레딧 가격을 보거나 계정을 만들 필요 없이, 네 개의 화이트라벨 모바일 링크에서 이야기를 들려주고 사진을 올리며 최종 승인을 마칩니다.',
    customerSteps: [
      {
        step: '01',
        badge: '로그인 없는 인테이크',
        title: '음성·텍스트 스토리 입력 & 초상권 동의 기록',
        detail:
          '고객이 스마트폰에서 브랜드 /intake 링크를 열고 미디어·초상권 사용 동의에 체크한 뒤, 계정 설정 없이 바로 이야기를 말하거나 입력합니다.',
        linkLabel: '/intake · 화이트라벨 음성 & 텍스트 브리프',
        phoneHeadline: '하버 가족 인생 회고록',
        phoneStatus: '동의 기록 완료 · Blueprint 초안 준비됨',
        phoneMeta: '고객 로그인 제로 · 제작 상한: 2,500 cr',
      },
      {
        step: '02',
        badge: '공유 Blueprint & ARA',
        title: '렌더링 지출 전에 스토리 비트 먼저 승인',
        detail:
          '데스크톱에서 Audience Resonance로 페이싱을 다듬은 뒤 화이트라벨 Blueprint 링크를 전송해 모바일에서 고객 피드백과 진행 승인을 받으세요.',
        linkLabel: '/blueprint/share · 제작 전 사전 승인',
        phoneHeadline: 'Blueprint & 비트 리뷰',
        phoneStatus: '94 / 100 Audience Resonance · 승인됨',
        phoneMeta: '2라운드 중 1회 사용 · 연속성 단계 준비 완료',
      },
      {
        step: '03',
        badge: '공유 연속성 링크',
        title: '휴대폰 사진 업로드(EXIF 제거) & 캐스트 고정',
        detail:
          '고객이 연속성 링크를 탭해 휴대폰 갤러리나 카메라에서 실제 가족·매물·제품 사진을 직접 업로드하고 캐스트·의상·세트를 승인합니다.',
        linkLabel: '/share/continuity · 갤러리 & 카메라 업로드',
        phoneHeadline: '연속성 & 사진 수집',
        phoneStatus: '고객 사진 6장 업로드됨 · 캐스트 & 세트 고정',
        phoneMeta: 'EXIF GPS 자동 제거 · AI 모델 학습 제로',
      },
      {
        step: '04',
        badge: '공유 시사실 (Screening Room)',
        title: '프레임 정밀 모바일 시사 & 최종 마스터 납품',
        detail:
          '고객은 로그인 없이 어떤 스마트폰에서도 음성 프리비즈와 4K 렌더링 컷을 감상하고, 타임스탬프 메모를 남긴 뒤 최종 마스터를 승인합니다.',
        linkLabel: '/share/screening-room · 최종 승인',
        phoneHeadline: '프리미어 시사실',
        phoneStatus: '최종 4K 마스터 승인 완료 ✓',
        phoneMeta: '다국어 스트림 납품 완료 · 원본 업로드 삭제 가능',
      },
    ],
    teamHeading: '프로듀서, 감독 & PM을 위한 실시간 포켓 지휘실',
    teamSubheading:
      '책상을 비운 동안에도 모든 제작이 멈추지 않도록, 워크스페이스 관리자와 담당 PM 권한에 맞춘 실시간 현황을 제공합니다.',
    teamPillars: [
      {
        id: 'alerts',
        title: '즉각적인 Web Push 알림',
        detail:
          '자율 에이전트 렌더링 완료, 신규 고객 브리프 시작, 새 연속성 사진 도착 순간 즉시 알림을 받으세요.',
        metric: '실시간 푸시 + 수신함',
      },
      {
        id: 'status',
        title: '5단계 마일스톤 & 일정 속도 트래커',
        detail:
          'Blueprint, 공명 평가, 연속성, 제작, 시사실 진행 상황과 일일 씬 제작 속도를 한눈에 추적합니다.',
        metric: '정상 일정 가시성',
      },
      {
        id: 'budget',
        title: '크레딧 잔액 & 엄격한 예산 상한',
        detail:
          '가용 스튜디오 크레딧, 프로젝트별 고객 예산 상한, PM별 월간 크레딧 한도를 실시간으로 통제합니다.',
        metric: '마진 가드레일',
      },
      {
        id: 'links',
        title: '원탭 네이티브 모바일 링크 공유',
        detail:
          'Blueprint, 공명 리뷰, 연속성 업로드, 시사실 링크를 SMS, WhatsApp, Slack, 이메일로 즉시 발송하세요.',
        metric: '4개 공유 포털',
      },
    ],
    phoneHeaderBrand: 'SceneFlow Mobile Companion',
    phoneCreditsPill: '14,250 cr',
    phonePmBadge: 'PM 연결됨',
    phoneVoiceBriefPill: '음성 / 브리프',
    phoneContinuitySlots: ['캐스트 ✓', '의상 ✓', '로케이션 ✓', '소품 ✓'],
    phoneMasterLabel: '4K 마스터',
    phoneStageBarLabels: ['Blueprint', '공명', '연속성', '제작', '시사'],
    phoneTeamAlertTitle: '신규 고객 연속성 사진 업로드',
    phoneTeamAlertBody: '엘레나가 가족 아카이브 사진 6장을 올렸습니다 · 탭하여 검토 및 반영',
    phoneTeamBudgetLabel: '프로젝트 크레딧 예산',
    phoneTeamBudgetValue: '1,180 / 2,500 cr',
    phoneTeamPaceBadge: '일정 정상 · 예산 이내',
    installIosBadge: 'iOS Safari: 공유 → 홈 화면에 추가',
    installAndroidBadge: 'Android / Chrome: 원탭 앱 설치',
    ctaPrimary: 'Studio + 모바일 PWA 시작하기 ($9)',
  },
}
