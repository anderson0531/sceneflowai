import type { StudioLandingCopy } from './types'

export const STUDIO_LANDING_COPY_JA: StudioLandingCopy = {
  heroDock: {
    tagline:
      '心を引き込む1時間以上の自分史・人生の物語、歴史再現ドラマ、複数話シリーズを制作——あるいは高利益率の動画制作スタジオを構築。短尺 AI ツールでは維持できない長編の一貫性を実現します。',
    primaryCta: 'Studio を起動 ($9)',
    businessCta: '動画制作ビジネスを見る',
    howItWorksCta: '仕組みを見る',
  },
  audienceGateway: {
    eyebrow: 'ひとつのスタジオ · 3つの成功ルート',
    title: 'オリジナルの世界を創る。',
    titleAccent: 'あるいは、収益性の高い動画ビジネスを築く。',
    subtitle:
      'SceneFlow は、プロ水準の AI 制作クルーと対話型の演出体験を融合。個人ストーリーテラーから複数話のシリーズ制作者、クライアント向け動画制作ビジネスまで幅広く支えます。',
    cards: [
      {
        id: 'services',
        badge: '収益チャンス · 粗利率 65–90% の高利益モデル',
        title: '動画納品ビジネス事業者',
        description:
          '$149 の当日納品 Express 4K シネマフィルムや高粗利の自分史・ライフメモワールを入り口に、企業研修・不動産・ブランド映像の継続リテイナーを積み上げられます。商用利用権も100%帰属します。',
        highlights: [
          'ログイン不要のホワイトラベルポータル（ヒアリング・Blueprint・コンティニュイティ・試写室）',
          '当日納品の $149 Express 4K シネマ（粗利率 約88%）＆手戻りゼロのフルモーション拡張',
          '音声付きシネマプレビューの承認防波堤と修正回数上限で、高額な撮り直しを防止',
        ],
        ctaLabel: 'ビジネスモデルと利益率を見る',
        targetAnchor: 'video-services',
      },
      {
        id: 'aspiring',
        badge: '映画学校もプロンプト知識も不要',
        title: 'これからのストーリーテラー・著者',
        description:
          '自分史、小説、YouTube チャンネルの構想が頭の中にありますか？普段の言葉で話すか入力するだけで、SceneFlow がプロ品質の脚本ベースラインと世界観を自動生成します。',
        highlights: [
          'シリーズ企画・Blueprint・制作脚本のエキスパート下書きを瞬時に生成',
          '専門構文ゼロ——日常の言葉で話しかけるか入力して自在に修正',
          '音声付きシネマプレビューを確認し、そのまま 4K シネマフィルムとして書き出し可能',
        ],
        ctaLabel: '4ステップのスタジオツアーを見る',
        targetAnchor: 'studio-tour',
      },
      {
        id: 'experienced',
        badge: 'シリーズ番組 · ポッドキャスト · 投資家向けプリビズ',
        title: '経験豊富なクリエイター・映像制作者',
        description:
          'ガチャのような運任せの再生成に終止符を。登場人物の顔、ショットごとの衣装、専用ボイス、ロケ地を Continuity Vault に固定し、自律エージェントで制作量を10倍に拡張できます。',
        highlights: [
          '複数話対応の Continuity Vault とショット単位の衣装コントロール',
          'Audience Resonance ＆ FlowDirector によるグリーンライト品質審査',
          '自律エージェントが 27 以上のシーン制作と 70 言語以上の吹き替えを自動化',
        ],
        ctaLabel: 'スタジオの5大スーパーパワーを見る',
        targetAnchor: 'five-superpowers',
      },
    ],
  },
  superpowers: {
    eyebrow: 'SceneFlow の設計思想',
    title: '5つのスタジオ・スーパーパワー。',
    titleAccent: '分厚いマニュアルは一切不要。',
    subtitle:
      '従来の AI 動画制作では、バラバラのツールを行き来しながら何百もの壊れやすいプロンプトを手打ちする必要がありました。SceneFlow はプロ品質のベースライン、自然な音声・テキスト演出、エグゼクティブ品質レビュー、自律ビルドエージェントを一貫提供します。',
    watchClipLabel: '30秒の概要を見る',
    pillars: [
      {
        id: 'baseline',
        number: '01',
        badge: '白紙の画面に悩まない',
        title: 'エキスパート品質のベースライン自動生成',
        description:
          'シンプルなアイデアやストーリー重視のインタビューから開始するだけ。SceneFlow が体系的なシリーズバイブル、フィルム Blueprint、制作脚本を自動作成し、キャラクターの成長曲線、時代考証に沿ったロケーション、ドラマティックなビートまで整えます。',
        outcomeTag: 'シリーズ · Blueprint · 制作脚本',
        videoClipKey: 'comparison',
      },
      {
        id: 'dialog',
        number: '02',
        badge: '音声またはテキストで演出指示',
        title: 'インテリジェント対話による完全な監督コントロール',
        description:
          'プロンプトエンジニアではなく、映画監督のように演出できます。話すか入力するだけで展開を組み替え、人物を人生の年代別（17歳・32歳・62歳）に分割し、ショットごとの衣装を指定したり、1フレーム単位で精密に調整したりできます。',
        outcomeTag: 'プロンプト設計ゼロ',
        videoClipKey: 'direction',
      },
      {
        id: 'review',
        number: '03',
        badge: 'レンダリング前後のプロ品質QA',
        title: 'Audience Resonance と FlowDirector による映像レビュー',
        description:
          'レンダリング前には Audience Resonance がシリーズ・Blueprint・脚本を採点。レンダリング後は FlowDirector が「観客視点」と「監督視点」の両面からシーン動画を審査し、Shot Director 経由のワンクリック修正で 20 件以上の同時進行案件でもクリップを自在に再生成できます。',
        outcomeTag: '観客＋監督の映像QA · ワンクリック修正',
      },
      {
        id: 'agents',
        number: '04',
        badge: 'ハンズフリーで量産スケール',
        title: '自律型ファストトラック制作エージェント',
        description:
          '脚本と音声付きシネマプレビューに手応えを得たら、Audio Agent、Stills Agent、Clips Agent、または統合 Production Agents を起動。数十シーンの生成から失敗テイクの自己修復まで自動実行し、4K シネマフィルムやフルモーションのマスターを納品します。',
        outcomeTag: '300回以上の手動プロンプトを自動化',
        videoClipKey: 'agent',
      },
      {
        id: 'collaboration',
        number: '05',
        badge: 'クライアント承認とグローバル展開',
        title: '共有レビューリンク・試写室・70言語以上の吹き替え',
        description:
          'Blueprint・脚本・フレーム精度の試写室（Screening Room）承認用ブラウザリンクをそのまま共有。14のネイティブ Studio UI 言語で演出しながら、70言語以上のローカライズ配信ストリームを一括出力できます。',
        outcomeTag: '共有リンク · 試写室 · 70言語以上の吹き替え',
        videoClipKey: 'publish',
      },
    ],
    microVisuals: {
      baseline: {
        intakePrompt: 'ストーリー・ヒアリング：「あなたの物語を聞かせてください…」',
        autoBadge: '数秒で自動生成',
        steps: [
          { step: '1 · シリーズバイブル', detail: '全6話構成＋共有 Continuity Vault' },
          { step: '2 · フィルム Blueprint', detail: '共感ビート＋多年代キャスト設計' },
          { step: '3 · 制作脚本', detail: 'セリフ・衣装・カメラワーク指定' },
        ],
      },
      dialog: {
        quote:
          '「ジョンを17歳・32歳・62歳に分けて、ショット2のエララにはイブニングガラのシルクコートを着せて。」',
        chipCast: '✓ 3年代のキャストカードをロック',
        chipWardrobe: '✓ ショット2 衣装：ガラ用シルクコート',
      },
      review: {
        arLabel: 'Audience Resonance + FlowDirector',
        arStatus: 'レンダリング前ゲート＋シーン映像QA',
        gateSeries: 'シリーズ 90',
        gateBlueprint: 'Blueprint 92',
        gateScript: 'シーン AR 86→89',
        flowDirectorNote:
          'FlowDirector シーン映像QA：観客 AR 86 + 監督 81 → ワンクリック修正でクリップ再生成 (+3 AR)',
      },
      agents: {
        rows: [
          { label: 'Audio Agent · 声・効果音・劇伴', status: '27 / 27 完了' },
          { label: 'Stills Agent · 一貫性キーフレーム', status: '100% ロック済' },
          { label: 'Clips Agent · 自己修復モーション生成', status: '自動検証済' },
        ],
      },
      collaboration: {
        approvedBadge: '承認済み ✓',
        dubsChip: '+70言語吹替',
      },
    },
  },
  videoServices: {
    eyebrow: '動画納品サービス · 個人オペレーター＆制作エージェンシー向け',
    title: '$1,500+ 相当の映像クオリティを、',
    titleAccent: '50%–80% 低い制作コストで納品',
    subtitle:
      '従来の撮影クルーや30時間に及ぶ手作業編集では、家族・不動産会社・地域企業の90%にとって高嶺の花でした。まずは地域パートナー経由の主力商品「ライフメモワール」から始め、総制作コスト（計算リソース＋運用工数）を50%〜80%削減しながら継続 B2B リテイナーを積み上げましょう。',
    commercialRightsBadge: '100% 商用利用権 · ホワイトラベル顧客ポータル (Pro+)',
    costSavingsPillLabel: '主力ライフメモワール＋継続 B2B リテイナー',
    verticalsHeading: '1. 主力フロント商品で受注し、継続リテイナーへ展開する',
    globalDemandLabel: '巨大なグローバル市場ニーズ',
    whoBuysLabel: '継続購入する主な顧客層',
    partnerChannelsLabel: '広告費ゼロの紹介パートナー開拓先',
    marginAdvantageLabel: 'SceneFlow ならではの利益率とスコープ優位性',
    calculatorBadge: 'スコープ連動型 コスト＆利益シミュレーター',
    calculatorTitle: '2. 納品コストと月間サービス利益をストレステスト',
    priceTierLabel: 'クライアント向けパッケージ階層：',
    priceTierNames: ['Express 4K シネマ', 'フルモーション・シネマ', 'Signature 4K'],
    tierScopePrefix: 'パッケージ内容：',
    volumeLabel: '月間クライアント納品数：',
    projectsPerMonthSuffix: '案件/月',
    projectsUnitLabel: '案件',
    stressTestToggleLabel: 'ストレステスト：初月立ち上げ負荷 ＋ Pro プラン ($149/月)',
    stressTestOnBadge: 'オン',
    stressTestOffBadge: 'オフ',
    stressTestActiveNote:
      '保守的な立ち上げ試算を適用中：初心者 PM 作業時間 +60%、撮り直し計算バッファ +30%、Operator Pro プラン $149/月（基本 10,000 クレジット/月 ＋ 150 GB Vault 込み）を含みます。',
    proPlanLineLabel: 'Pro プラン ($149/月) ＋ 追加計算コスト',
    proPlanCreditsIncludedNote: ' (10k cr 込み)',
    perProjectProfitLabel: '1案件あたりのサービス利益',
    traditionalMarketLabel: '従来の市場相場',
    typicalFeeLabel: 'あなたの提供価格',
    fullyLoadedCostLabel: '1案件あたりの総納品コスト',
    costBreakdownSubLabel: 'クレジット＋PM工数',
    estComputeLabel: '計算コスト（再生成バッファ 20% 込み）',
    activeHandsOnLabel: 'オペレーター / PM 実作業（時給 $50 換算）',
    monthlyGrossLabel: '想定月間クライアント売上',
    monthlyNetLabel: '想定月間サービス利益（計算費・PM工数控除後）',
    perMonthSuffix: '/ 月',
    marginBadgeSuffix: 'サービス利益率',
    disclaimer:
      'スコープ連動型の納品コストには、SceneFlow 計算費（追加 $0.01/クレジット、再生成バッファ 20% 込み）および時給 $50 換算のオペレーター／PM工数が含まれます。上のストレステストを切り替えると初月習熟コストと Pro プラン ($149/月) も加算されます（地域の営業・広告費は含みません）。',
    launchBusinessCta: '最初のサンプル映像を作る ($9)',
    launchBusinessSubnote:
      '$9 の Explorer テストプランで地域パートナー向けの透かしなしポートフォリオを作成し、準備ができたら Pro ($149/月) で100%ホワイトラベル顧客ポータルを解放しましょう。',
    foundingCharterCta:
      '今すぐクライアント向けスタジオを立ち上げますか？25席限定の創業オペレーター憲章を見る',
    foundingCharterTitle: '創業動画サービスオペレーター向け 90日 Pro 憲章',
    trustShieldHeading: 'エンタープライズ水準の利益保護・プライバシー・商用IPシールド',
    trustShieldPillars: [
      {
        title: 'ログイン不要のホワイトラベルポータル (Pro+)',
        detail:
          'クライアントはあなたのスタジオ名・ロゴ・ブランドカラーのもとでレビューでき、SceneFlow のログイン画面やクレジット単価は一切表示されません。',
      },
      {
        title: 'Express 4K シネマ＆モーション課金防波堤',
        detail:
          '実写質感のパン付き 4K スチルにクローン音声・効果音・劇伴を合わせた作品を $149–$249 の当日納品マスターとして届けることも、フルモーション動画生成前の無駄ゼロ承認ゲートとして活用することも可能です。',
      },
      {
        title: '顧客の写真・物語は 100% 厳重なプライベート管理',
        detail:
          '家族のアーカイブや企業データは完全非公開で、公開 AI モデルの学習には一切使用されません。アップロード時に EXIF GPS 情報を自動削除し、肖像利用同意も記録します。',
      },
    ],
    playbooksBadge: 'すぐ使えるビジネス開業スターターキット付属',
    playbooksHeading: '業種別オペレーター手順書・料金表・パートナー提案テンプレート',
    playbooksSubtitle:
      'ゼロからの手探りを卒業。実戦検証済みの業種別 SOP が SceneFlow Studio 内に標準搭載されています：',
    playbooksItems: [
      '70言語以上の映画対応 AI 伝記作家＆ヒアリング手順書（14言語ネイティブ UI ポータル）',
      '3段階パッケージ料金表＆アプリ内・最低粗利シミュレーター',
      '20% 紹介パートナー提案書（高齢者施設・葬儀社・不動産会社向け）',
      'クリックラップ式メディア・多年代肖像・音声同意台帳を標準内蔵',
    ],
    blueprintFlywheel: {
      badge: 'PM工数ゼロの自動ヒアリング · 純利益率 83%',
      title: 'PM が案件に触れる前から、自動で収益を生み出す仕組み',
      subtitle:
        '多くの顧客は白紙から構成を考えるのは苦手ですが、イラストとナレーション付きの初稿を見て感想を言うのは得意です。SceneFlow は初回ヒアリングを自己資金回収型の「Blueprint Pass」へ変え、検討中で止まった見込み客からも利益を生みます。',
      cards: [
        {
          tag: '$29 パス ＋ $19 追加パック · PM 0分',
          title: '自己資金回収型 Blueprint Pass ＆ 追加リビジョンパック',
          detail:
            'クライアントは最初に $29 を支払うだけで、約3分以内にイラスト付き絵コンテ、多言語ナレーション、Audience Resonance 採点を受け取れます（一時停止しても粗利率 約83%）。さらに追加修正したい時はセルフ購入の $19 パック（+3 修正 / +2 AR）で対応できます。',
        },
        {
          tag: '高速かつ事実に忠実な第1稿',
          title: '記憶喚起チップ・15秒クイック確認・捏造防止ガード',
          detail:
            '業種別の節目チップ（結婚・昇進・スポーツ・実績・間取り等）と15秒の音声/テキスト確認で重要人物や出来事を素早く抽出し、厳格なノンフィクション制御で事実に基づかない創作を防ぎます。',
        },
        {
          tag: '二層共有リンク＆フィードバック集約',
          title: '家族・チーム向けコメント専用リンクと主契約者の承認権限',
          detail:
            '主契約者には専用の監督ポータルを渡し、家族や同僚にはコメント専用リンクを共有可能。ゲストは 70 言語以上の映画言語で試聴（14言語ネイティブポータル UI 対応）・コメントできますが修正回数消費や承認は行えず、主契約者がコメントと AR 提案を取捨選択して1回の AI 更新にまとめると絵コンテと音声が自動刷新されます。',
        },
        {
          tag: '承認後の遅延PMアサイン',
          title: '承認時のみ PM を自動割当 ＋ Blueprint 転換ファネル',
          detail:
            '顧客が「Blueprint を承認」を押すまで人手 PM 工数はゼロ。Blueprint ファネルで進行中・48時間/7日以上停滞・修正上限到達の案件を可視化し、ホワイトラベルのリマインド送信、+3 回数付与、パス売上をワンクリック管理できます。',
        },
      ],
    },
    agencyScaleOps: {
      badge: 'マルチPMエージェンシー対応 · 数百件の同時管理',
      title: 'スタジオ直結のエージェンシー運用コマンドセンター',
      subtitle:
        '表計算ソフトや無駄な営業工数、利益漏れ、肥大化したストレージに悩まされることなく、個人オペレーターから多言語・複数 PM 体制の動画エージェンシーへ拡張できます。',
      pillars: [
        {
          title: 'Blueprint ファネル・カンバン・SLA リマインド',
          detail:
            '自動運用の Blueprint Pass と本制作案件を分離管理。48時間/7日未承認や修正枠消化の案件を検知し、ワンクリックでホワイトラベル通知や +3 修正枠を付与できます。',
        },
        {
          title: '顧客 CRM・パス収益集計・PM スコアカード',
          detail:
            '$29 の Blueprint Pass、$19 の追加パック、本制作受注を自動合算し、PM ごとのクレジット消費、納期、実質粗利率をリアルタイムに把握できます。',
        },
        {
          title: '承認連動 PM ルーティング＆ワークスペース分離',
          detail:
            '承認前の Blueprint Pass は完全自動に保ち、承認ボタン押下時のみ担当言語の PM へ自動割当。シリーズバイブルの委任や 0 クレジット権限の QA レビュアー配置も自在です。',
        },
        {
          title: '無制限スケール＆ワンクリック中間素材パージ',
          detail:
            '数百件規模のサーバー側検索と一括 PM 操作に加え、最終マスターを保護したまま中間下書き素材だけをワンクリックでアーカイブ・削除できます。',
        },
      ],
    },
    workflowHeading: 'ホワイトラベル顧客案件が 4 ステップで完了する流れ',
    stepPrefix: 'ステップ',
    workflowSteps: [
      {
        step: '01',
        title: '自己資金回収型の $29 ガイド付きヒアリング',
        detail:
          '顧客が $29 の Blueprint Pass を購入し、業種別の記憶喚起チップをタップ。必須の同意を記録した上で音声またはテキストで物語を語り、15秒のクイック確認でノンフィクション精度を担保します。',
      },
      {
        step: '02',
        title: 'ライブ Blueprint・家族トリアージ・自動改訂',
        detail:
          '約3分でイラスト付き絵コンテ・多言語音声・AR スコアを生成。家族やチームへコメント専用リンクを共有し、選んだメモから AI 改訂（必要に応じて $19 パック追加）を行い、承認と同時に PM アサインを起動します。',
      },
      {
        step: '03',
        title: 'スマホ写真アップロード・発音ガイド・コンティニュイティ固定',
        detail:
          '顧客がスマホから実物写真をアップロード（EXIF GPS 自動除去）し、人名・地名の10秒発音ガイドを登録。規定回数内で多年代キャスト・衣装・セットを承認固定します。',
      },
      {
        step: '04',
        title: '当日 Express 4K またはフルモーション試写室納品',
        detail:
          'PM によるワンタップ承認公開（または完全オートパイロット）でログイン不要の試写室へ配信。顧客承認と同時に 4K マスター書き出しとダウンロード通知メールを自動実行し、後からいつでも手戻りゼロでフルモーションへアップグレードできます。',
      },
    ],
    verticals: [
      {
        id: 'memoir',
        tabLabel: 'ビデオメモワール',
        roleTag: '★ 主力・高粗利フロント商材',
        badge: '$149–$1,250 / 本 · 市場相場：$1,200–$4,500+',
        title: '人生の物語・1時間以上の時代再現・複数話の家族伝記シリーズ',
        description:
          '$149 の当日納品 Express 4K 長編フィーチャーまたはエピソードシリーズ（最大 60分 / 360 演出フレーム ＋ 1–3分予告編）からスタート。映像が残っていない章を時代考証に沿った人物・場所・文化・歴史で再現し、手戻りゼロで多年代（17歳 → 32歳 → 62歳）のフルモーション再現へシームレスにアップグレードできます。',
        globalMarketNeed:
          '高齢の両親への贈り物、金婚式、お別れ会などの人生の節目は世界で毎年何億件も訪れますが、$2,000+ の撮影費と数週間の納期が壁となり、90%以上が映像化されていません。',
        clientBuyer:
          '還暦・米寿などの長寿祝い、金婚式、退職記念、家族のレガシー映像を残したいご家庭',
        partnerChannels:
          '資産承継コンサルタント、シニアレジデンス、葬儀社、記念日イベントプランナー（15–20% 紹介報酬モデル）',
        traditionalMarketRangeLabel: '$1,200–$4,500+',
        typicalRetailUsd: 599,
        priceTiersUsd: [149, 599, 1250],
        tierScopeLabels: [
          'Express 4K 長編フィーチャーまたはエピソードシリーズ（最大 60分 / 360 フレーム · 当日納品）＋ 1–3分予告編 · 年代固定再現・音声・劇伴',
          '30–60分 ハイブリッド・フルモーション自分史ドキュメンタリー または 全4話シリーズ · 多年代の時代再現 · 2言語',
          '60–150分 Signature 長編 または 全6–8話レガシーシリーズ · 4K フルモーション時代再現・文化的背景＆家宝ロック · 4言語',
        ],
        computeTiersUsd: [6, 34, 72],
        operatorTiersUsd: [12, 88, 150],
        activeTimeTiersLabels: ['約15分', '約1.75時間', '約3.0時間'],
        retailRangeLabel: '$149–$1,250',
        estComputeUsd: 34,
        estOperatorUsd: 88,
        activeMinutesLabel: '約1.75時間',
        keyAdvantage:
          '3段階の収益ラダー：$29 Blueprint Pass → $149 当日 Express 4K シネマ（総コスト約 $18・利益率約 88%）→ 手戻りゼロで $599+ フルモーションへ展開。',
      },
      {
        id: 'realestate',
        tabLabel: '不動産ツアー',
        roleTag: '↻ 不動産会社向け継続契約',
        badge: '$149–$549 / 物件 · 市場相場：$450–$1,500+',
        title: 'ナレーション付き高級物件・ブティックホテル紹介ツアー',
        description:
          '物件写真と周辺エリアの魅力から、当日納品の $149 Express 4K 物件紹介フィルムやフルモーション・ウォークスルーを制作。海外富裕層向けに中国語・スペイン語・アラビア語・ポルトガル語版も即座に出力できます。',
        globalMarketNeed:
          '毎月数千万件の売買物件、民泊・バケーションレンタル、ブティックホテルが国内外の買い手を巡って競い合っていますが、大半がいまだ静止画止まりです。',
        clientBuyer:
          'トップ実績の住宅仲介エージェント、高級不動産会社、別荘レンタル運営者、ブティックホテル',
        partnerChannels:
          '不動産専門フォトスタジオ、ホームステージング会社、高級仲介会社、ホテル集客代理店',
        traditionalMarketRangeLabel: '$450–$1,500+',
        typicalRetailUsd: 299,
        priceTiersUsd: [149, 299, 549],
        tierScopeLabels: [
          'Express 4K 物件フィルム（90秒 · 当日納品）· パン付き 4K スチル＋ナレーション＆音楽 · 1言語',
          '2分 フルモーション物件ツアー · 4K アップスケール＋2言語',
          '3分 高級邸宅フィルム＋9:16 縦型リール · 4か国語対応',
        ],
        computeTiersUsd: [5, 15, 28],
        operatorTiersUsd: [10, 50, 88],
        activeTimeTiersLabels: ['約12分', '約1.0時間', '約1.75時間'],
        retailRangeLabel: '$149–$549',
        estComputeUsd: 15,
        estOperatorUsd: 50,
        activeMinutesLabel: '約1.0時間',
        keyAdvantage:
          '仲介会社1社あたりの高いリピート率：移動や天候待ちゼロで、$149 当日 Express 4K 物件フィルム（コスト約 $15・利益率約 90%）や月額フルモーション契約を受注できます。',
      },
      {
        id: 'training',
        tabLabel: '企業研修・SOP',
        roleTag: '↻ B2B 継続リテイナー',
        badge: '$249–$1,800 / モジュール · 市場相場：$1,500–$5,000+',
        title: '社員オンボーディング・安全教育・多言語マニュアル講座',
        description:
          '一貫した講師キャラクター、制服、現場環境を Continuity Vault に固定。当日納品の $249 Express 4K ナレーション付き SOP から、従業員の母国語 70 言語以上にローカライズされたフルモーション研修まで一括制作できます。',
        globalMarketNeed:
          '世界中の製造業、クリニック網、飲食グループ、フランチャイズが現場の離職対策・安全法令遵守・多国籍スタッフ教育のために分かりやすい動画 SOP を切実に求めています。',
        clientBuyer:
          '人事・人材開発部門、製造メーカー、医療クリニックグループ、外食チェーン、フランチャイズ本部',
        partnerChannels:
          '社外人事コンサルタント、労働安全監査法人、LMS 導入支援会社、フランチャイズ協会',
        traditionalMarketRangeLabel: '$1,500–$5,000+',
        typicalRetailUsd: 950,
        priceTiersUsd: [249, 950, 1800],
        tierScopeLabels: [
          'Express 4K ナレーション SOP（5分 · 当日納品）· 固定講師スチル＋クローン音声＆SFX · 1言語',
          '10分 フルモーション安全・オンボーディング研修 · 従業員向け 3言語',
          '20分 マルチチャプター研修カリキュラム · 6言語以上対応',
        ],
        computeTiersUsd: [9, 40, 78],
        operatorTiersUsd: [18, 125, 210],
        activeTimeTiersLabels: ['約20分', '約2.5時間', '約4.2時間'],
        retailRangeLabel: '$249–$1,800',
        estComputeUsd: 40,
        estOperatorUsd: 125,
        activeMinutesLabel: '約2.5時間',
        keyAdvantage:
          '解約されにくい B2B 継続契約：$249 当日 Express 4K SOP（コスト約 $27・利益率約 89%）や $950+ 多言語講座を提供し、規定改定時の再レンダリングも数分で完了します。',
      },
      {
        id: 'brand',
        tabLabel: 'ブランドストーリー',
        roleTag: '↻ SMB・代理店向け継続パック',
        badge: '$199–$1,200 / パック · 市場相場：$3,000–$8,000+',
        title: '創業者ストーリー・クリニック紹介・SNS 広告映像',
        description:
          '当日納品の $199 Express 4K ブランド映像や、フルモーションのトップページ用ストーリー映像に、Instagram・TikTok・YouTube Shorts 用の 9:16 縦型予告編を自動セット。試写室で顧客承認まで完結します。',
        globalMarketNeed:
          '世界3,000万以上のクリニック、法律事務所、飲食店、クラフト系ブランドが信頼獲得のトップ動画と新鮮な 9:16 SNS 広告を必要としていますが、$5,000+ の代理店撮影費が障壁です。',
        clientBuyer:
          '医科・歯科クリニック、法律事務所、地域の中小企業、Web 制作会社、EC ブランド創業者',
        partnerChannels:
          '地域 Web 制作会社、SEO・運用型広告代理店、商工会議所、医療・歯科経営コンサルタント',
        traditionalMarketRangeLabel: '$3,000–$8,000+',
        typicalRetailUsd: 650,
        priceTiersUsd: [199, 650, 1200],
        tierScopeLabels: [
          'Express 4K ブランドフィルム（90秒 · 当日納品）· パン付き 4K スチル＋ナレーション＆音楽 · 自動 4K マスター',
          '2分 フルモーション創業者ストーリー＋SNS 用 9:16 縦型カット2本',
          'Signature ブランドフィルム＋多言語有料広告フック4パターン',
        ],
        computeTiersUsd: [7, 28, 56],
        operatorTiersUsd: [15, 88, 150],
        activeTimeTiersLabels: ['約18分', '約1.75時間', '約3.0時間'],
        retailRangeLabel: '$199–$1,200',
        estComputeUsd: 28,
        estOperatorUsd: 88,
        activeMinutesLabel: '約1.75時間',
        keyAdvantage:
          '地域 Web・広告代理店向けのホワイトラベル制作：$199 当日 Express 4K ブランド映像（コスト約 $22・利益率約 89%）や 9:16 カット付き $650 フルモーションパックを展開できます。',
      },
    ],
  },
  guidedTour: {
    eyebrow: 'ビジュアル・スタジオツアー · 専門用語ゼロ',
    title: 'つながる4つの制作ルーム。',
    titleAccent: '迷わない一本のワークフロー。',
    subtitle:
      'まずは60秒で4つのスタジオの扉（シリーズルーム、Blueprint ルーム、プロダクションステージ、試写室）を把握しましょう。直後の6つのフル尺制作事例で、そのままライブ体験できます。',
    stepPrefix: 'ステップ',
    lensLabel: 'プレビュー視点：',
    lensCreator: 'オリジナルシリーズ（「The Glass Ledger」）',
    lensService: 'クライアント案件（「ライフストーリー・メモワール」）',
    watchRoomVideoLabel: '30秒ルーム案内を見る',
    inspectFullScreenLabel: 'スタジオ画面を全画面で見る',
    openLiveScreeningLabel: 'ライブ体験版・試写室を開く',
    screeningModalTitle: 'The Glass Ledger — 体験版 試写室 (Screening Room)',
    examplesBridgeText:
      '4つのスタジオの扉が分かったら、6つのフル尺ジャンルで実際に触って体験しましょう：',
    examplesBridgeCta: '制作事例で4つのルームをライブ体験する',
    rooms: [
      {
        id: 'series-desk',
        stepNumber: '01',
        tabLabel: 'シリーズルーム',
        badge: '複数話の世界観＆コンティニュイティバイブル',
        title: '単発クリップではなく、再利用できる世界観を一度で構築',
        promise:
          'シリーズ番組、企業研修カリキュラム、複数章の伝記を一度説明するだけ。SceneFlow がストーリーバイブル、エピソード一覧、共有リファレンスライブラリを構築し、全話の造形を一貫保持します。',
        creatorExampleTitle: 'The Glass Ledger · 全6話 ネオノワール・スリラー',
        creatorExampleNote:
          '共通キャスト（エララ・ヴァンス、マーカス・ソーン、アリス・カエル博士）、アーカイブ保管庫セット、クォーツ・コーデックスの小道具を全6話でロックし、Audience Resonance 91/100 を達成。',
        serviceExampleTitle: '複数章の家族レガシー／企業研修カリキュラム',
        serviceExampleNote:
          '承認済みの司会者、家族の年代設定、職場ロケーションを一度保存すれば、第2話〜第10話までビジュアルのブレゼロでワンクリック展開できます。',
        callouts: [
          {
            label: '即座のシリーズ基礎設計＆Audience Resonance 採点',
            detail:
              '制作に入る前に、あらすじ、各話アーク、Audience Resonance スコアを自動生成します。',
          },
          {
            label: '共有リファレンスライブラリ',
            detail:
              'キャラクター、声、衣装、セット、小道具がすべてのエピソードへ自動的に引き継がれます。',
          },
          {
            label: '音声・テキスト対応のシリーズ監督',
            detail:
              '話すか入力するだけで、シーズン全体の展開や特定エピソードの構成を手軽に調整できます。',
          },
        ],
        visuals: {
          topBadge: 'シリーズ AR：91 / 100 · 全6話同期済み',
          bottomBadge: '共有リファレンスライブラリを全エピソードでロック',
          thumbLabels: [
            'エララ・ヴァンス · 主役',
            'マーカス・ソーン · キャスト',
            'アーカイブ保管庫 · セット',
            'クォーツ・コーデックス · 小道具',
          ],
        },
      },
      {
        id: 'blueprint-board',
        stepNumber: '02',
        tabLabel: 'Blueprint ルーム',
        badge: '物語起点ヒアリング・多年代キャスト・承認ゲート',
        title: '動画コストをかける前に、響く物語とキャストを確定',
        promise:
          '自然なストーリーインタビューや企画案からスタート。Blueprint ルームがビート構成を整え、各ビートの登場人物を可視化し、多年代の同一性を固定。共有リンクで顧客やチームから承認を得られます。',
        creatorExampleTitle: 'ビート別トリートメント＆ビジュアル様式ロック',
        creatorExampleNote:
          '各ビートにドラマの意図、登場人物、アナモルフィック照明ルール、音声付き Audience Resonance 講評を紐づけます。',
        serviceExampleTitle: 'PM工数ゼロの $29 Blueprint Pass ＆ 家族コメント集約',
        serviceExampleNote:
          '記憶喚起チップと捏造防止ガードにより約3分でイラスト・音声付き第1稿を生成。顧客はコメント専用リンクを家族に共有し、採用メモ＋ワンクリック AR 改善案で自動改訂したあと、承認時にのみ PM が割り当てられます。',
        callouts: [
          {
            label: '記憶喚起ヒアリング＆ノンフィクション保護',
            detail:
              '業種別の節目チップと15秒の音声/テキスト確認で重要人物と時代を素早く記録し、語られていない経歴を捏造しません。',
          },
          {
            label: '家族・チーム向け二層共有＆トリアージ',
            detail:
              'ゲストは 70 言語以上の映画言語で試聴（14言語ネイティブ UI）して修正回数を消費せずコメント可能。主契約者がメモを選んで1回のクリーンな AI 改訂へ統合します。',
          },
          {
            label: '音声・絵コンテ自動更新＆ $19 追加パック',
            detail:
              '改訂のたびに変更章を再描画し、ナレーション再生成と Audience Resonance 再採点を実施。セルフ購入の +3 改訂パックも用意されています。',
          },
        ],
        visuals: {
          topBadge: 'Blueprint AR：92 / 100 · ビート別キャスト表示',
          bottomBadge: '多年代キャラクター一貫性 ＋ 顧客承認リンク共有',
          thumbLabels: [
            '主人公アーク',
            'アリス・カエル博士 · ビート2',
            '港湾デッキ · 第2幕',
            'クロノキー · 重要伏線',
          ],
        },
      },
      {
        id: 'production-stage',
        stepNumber: '03',
        tabLabel: 'プロダクションステージ',
        badge: 'Shot Director・衣装制御・自律制作エージェント',
        title: '音声付きシネマカットを試写——そのまま 4K 納品もフルモーション拡張も自在',
        promise:
          '制作脚本を確認し、コンティニュイティ素材をロック。クローン音声・効果音・劇伴入りの実写質感パン付きシネマカットを視聴し、当日納品の 4K Express シネマとして書き出すか、自律エージェントでフルモーション化するか選べます。',
        creatorExampleTitle: 'シーン1：地下アーカイブ保管庫 · アナモルフィック 4K',
        creatorExampleNote:
          'ショットごとにエララの衣装を切り替え、音声またはテキストで構図を指示。Production Mixer でセリフ・SFX・劇伴を統合し、Production Agents を一括起動します。',
        serviceExampleTitle: '当日 $149 Express 4K シネマ または ハイブリッド・フルモーション拡張',
        serviceExampleNote:
          '実写質感のパン付き 4K ナレーション映画を数時間（計算費約 $6）で納品することも、写真が残っていない思い出だけを AI フルモーション再現で補い、12分のフルモーション自分史を計算費約 $34 に抑えることもできます。',
        callouts: [
          {
            label: 'ショット別衣装指定＆音声/テキスト Shot Director',
            detail:
              '各ショットの衣装を正確に選び、対話形式で画角や表情を微調整——運任せの再生成は不要です。',
          },
          {
            label: 'Express 4K シネママスター＆モーション課金防波堤',
            detail:
              '一貫性ロック済みのパン付き 4K スチル上でクローン音声・SFX・劇伴を確認。そのまま $149 完成品として書き出すことも、フルモーション生成前の最終承認にも使えます。',
          },
          {
            label: '自律型 Audio / Stills / Clips エージェント',
            detail:
              'シーン単位で生成することも、統合 Production Agents を起動して全編の生成・結合を自動化することも可能です。',
          },
        ],
        visuals: {
          topBadge: 'Shot Director · 衣装選択済 · Express 4K シネマカット準備完了',
          bottomBadge: 'Audio / Stills / Clips Agent が全シーンを自動オーケストレーション',
          thumbLabels: [
            'ショット1 · 保管庫ワイド',
            'ショット3 · 小道具マクロ',
            'シーン2 · 受け渡し',
            'シーン3 · トラッキング',
          ],
        },
      },
      {
        id: 'screening-room',
        stepNumber: '04',
        tabLabel: '試写室 (Screening Room)',
        badge: 'フレーム精度レビュー・70言語以上・グローバル公開',
        title: 'プライベートリンクで共同確認し、あらゆる言語で世界へ届ける',
        promise:
          'Express 4K シネマカット、ラフカット、フルモーション 4K マスターを単一プレイヤーで試写。顧客承認をトリガーに 4K マスター書き出しとダウンロードメール送信を自動化し、さらに 70 言語以上のシーン内吹き替えストリームも生成できます。',
        creatorExampleTitle: 'プレミア品質マスター・告知予告編・世界向け吹き替え',
        creatorExampleNote:
          '9:16 縦型予告編を自動カットし、70以上の市場向けに吹き替え対話を再生成。YouTube 公開や SceneFlow Originals への応募もスムーズです。',
        serviceExampleTitle: 'ストレスゼロの顧客レビュー＆多言語納品',
        serviceExampleNote:
          '顧客はスマホやPCからログイン不要で試写し、タイムコード付きコメントを送信。家族や従業員の母国語で仕上げた高精細 MP4 をそのまま受け取れます。',
        callouts: [
          {
            label: 'ログイン不要の共有レビューリンク',
            detail:
              'プライベートな `/share/screening-room/` リンクを送るだけで、顧客・決裁者・家族の承認を手軽に完了できます。',
          },
          {
            label: '70言語以上のシーン内同期ストリーム',
            detail:
              '環境音・効果音・劇伴を損なわず、世界中の視聴者に合わせて自然なローカライズ音声とセリフを同期します。',
          },
          {
            label: '4K マスター書き出し＆プロモ用カットダウン',
            detail:
              '完全な知的財産権付きのクリーンな商用マスターをダウンロード、または各種 SNS へ予告編を直接展開できます。',
          },
        ],
        visuals: {
          topBadge: 'フレーム精度メモ · ログイン不要の顧客リンク',
          bottomBadge: '7つのスタジオ UI 言語 · 70言語以上のシーン内音声ストリーム',
          thumbLabels: [
            'EN · オリジナルマスター',
            'ES / PT · 同期吹き替え',
            'ZH / TH / HI · 多言語配信',
            '9:16 縦型プロモ版',
          ],
        },
      },
    ],
  },
  useCaseDirectory: {
    viewByUseCaseLabel: '用途別に探す',
    viewByRoomLabel: 'スタジオルーム別に探す',
    tracks: [
      {
        id: 'memoir-services',
        tabLabel: 'ビデオメモワール＆家族レガシー',
        badge: '主力クライアント商材 · $149–$1,250 / 本',
        headline: '家族インタビューと思い出の写真を、一生残る映画作品へ',
        description:
          '70言語以上の映画対応（7言語ネイティブ UI ポータル内）で人生の物語を収録し、Character Selfie Studio で1970年代の青年期から現在までの肖像を補正・若返り再現。自律 Production Agents を実行し、FlowDirector のワンクリック修正を経てログイン不要の試写室リンクで納品します。',
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
        tabLabel: '20案件並行エージェンシー＆企業研修',
        badge: '20件以上同時進行 · 統合 Production Agent + FlowDirector QA',
        headline: 'ワークフロー自動化で、20件の同時クライアント案件を 50%–80% 低コスト運用',
        description:
          'ホワイトラベルポータルと PM クレジット上限を設定し、共有 Blueprint で純利益率を検証。統合 Production Agent で音声プリビズ、キーフレーム静止画、モーションクリップ、MP4 シーン書き出しを並列実行し、自己修復 [Investigate] 復旧と FlowDirector QA を経て 70 言語以上で納品します。',
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
        tabLabel: '連続シリーズ＆スタイライズド・アニメ',
        badge: '複数話 IP · アート様式＆キャスト完全ロック',
        headline: '第1話からシーズン最終話まで、ひとつのショーランナー・バイブルで統括',
        description:
          '複数話のシーズン構成を設計し、実写質感またはスタイライズド 3D のアートディレクションを全話固定。絵コンテとキーフレームを演出し、統合 Production Agent で自己修復 Creative Kling AI F2V フォールバック付きのシネマ品質10秒クリップを連続レンダリングします。',
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
        tabLabel: 'YouTube チャンネル＆物語系ポッドキャスト',
        badge: '高維持率顔出し不要チャンネル · 複数ホスト番組',
        headline: 'スタジオ品質の声・音楽・音響仕上げで、毎週ストーリー番組を公開',
        description:
          'レンダリング前に視聴維持フックを検証し、複数ホストの掛け合い・ショット同期ナレーション・オリジナル劇伴を演出。4ステム音響ミックスを整え、ワンクリック OAuth で 16:9 と 9:16 の配信パッケージを公開できます。',
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
        tabLabel: '映画制作者プリビズ＆企画ピッチ予告編',
        badge: '企画通過デッキ · コンセプト実証シネマ',
        headline: '脚本を事前検証し、完成した予告編を携えてピッチ会議へ臨む',
        description:
          'FlowDirector と共同執筆し、Blueprint と脚本の両ゲートで Audience Resonance により構成テンポを採点。予算試算付きイラスト絵コンテを共有し、業界標準形式の脚本整形と劇場品質のコンセプト予告編制作まで完結します。',
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
    badge: 'ワークフロー自動化＆39のスタジオ機能 · 7言語ナレーション付きシネマ解説',
    title: '20件以上の同時案件で、制作とプロ品質映像QAを完全自動化',
    subtitle:
      '全39機能にモバイル対応のクリーンな 7言語 WebM ナレーション解説シネマを完備。ホワイトラベルポータル、Selfie Studio、FlowDirector のワンクリック修正、自律エージェントが 300 回以上の手動プロンプトをどう置き換えるかご確認ください。',
    expandCta: 'ナレーション付き39機能をすべて見る',
    collapseCta: 'スタジオ機能一覧を閉じる',
    automationEyebrow: '高頻度クリエイター＆20案件対応の動画制作事業者向け設計',
    automationTitle: '一気通貫のワークフロー自動化：エージェントが構築し、FlowDirector がワンクリック監査・修正。',
    automationSubtitle:
      'クリップごとにプロンプトを見張り続ける日々は終わりです。自律型の Audio / Stills / Clips / Production Agents がバックグラウンドでシーンを構築する間、FlowDirector が全 MP4 を Audience Resonance と監督基準で監査し、指摘クリップを Shot Director 経由でワンクリック再生成します。',
    spotlightFlowDirectorLabel: 'FlowDirector シーン映像QA',
    spotlightFlowDirectorMeta: '観客 AR ＋ 監督基準チェック · ワンクリックでクリップ再生成',
    spotlightAgentsLabel: '自律型プロダクションエージェント',
    spotlightAgentsMeta: '300+ プロンプトを自動化 · 20件並行でも自己修復運用',
    spotlightNarrated5kLabel: '全39機能 · ナレーション付きシネマ解説',
    spotlightNarrated5kMeta: '16:9 WebM シネマウォークスルー＋全7言語スタジオナレーション',
  },
  academyStrip: {
    badge: '学習コストゼロ保証 · Studio Academy',
    title: '操作に迷うことはありません。どの画面でも「?」を押せば60秒ビジュアルガイドを表示。',
    subtitle:
      'すべてのスタジオルームに、番号付きコールアウト、ワンクリック操作、プリビズ・クレジット保護ガード、そして対話型「10分で最初の1本を作る」シミュレーターを備えたジャストインタイム (JIT) 画面マップを搭載しています。',
    pills: [
      '文脈連動型「?」画面マップ',
      '「10分で最初の映画」体験シミュレーター',
      'プリビズ・クレジット保護ガード標準内蔵',
    ],
    watchAcademyCta: '30秒 Academy ツアーを見る',
    startExplorerCta: 'Explorer プランで始める — $9',
  },
  mobileCompanion: {
    eyebrow: 'ログイン不要の顧客リンク ＋ オペレーター用モバイル PWA · iOS & Android',
    title: 'デスクトップ級のスタジオ性能。',
    titleAccent: '顧客とチームをつなぐ摩擦ゼロのモバイルポータル。',
    subtitle:
      'クライアントは SceneFlow のアカウント登録もアプリ導入も契約も不要——あなたのホワイトラベル Web リンクからそのまま参加できます。一方、あなたとプロジェクトマネージャー (PM) は即時インストール可能な Mobile Companion PWA で通知・進捗・クレジット上限を管理できます。',
    whyPwaBadge: '顧客ログイン不要 · 即時導入オペレーター PWA',
    whyPwaNote:
      '顧客はあなたのブランド名で Safari / Chrome のリンクを開くだけ。オペレーターと PM はワンタップで PWA を導入し、ネイティブ Web Push 通知を受け取れます。',
    modeCustomerTab: 'ホワイトラベル顧客ループ',
    modeTeamTab: 'オペレーター＆PM ハブ (PWA)',
    customerHeading: 'あなたのスタジオブランドで提供する、ログイン不要のモバイルポータル',
    customerSubheading:
      'クライアントに SceneFlow のクレジット価格やログイン画面は一切見せません。4つのホワイトラベルリンク上で物語を語り、写真を送り、承認を完了できます。',
    customerSteps: [
      {
        step: '01',
        badge: 'ログイン不要ヒアリング',
        title: '音声・テキストで物語を入力し、肖像利用同意を記録',
        detail:
          'クライアントはスマホでブランド付き /intake リンクを開き、メディア・肖像利用規約に同意したうえで、アカウント作成なしで物語を話したり入力したりできます。',
        linkLabel: '/intake · ホワイトラベル音声・テキストヒアリング',
        phoneHeadline: 'ハーバー家ライフメモワール',
        phoneStatus: '同意記録済み · Blueprint 下書き準備完了',
        phoneMeta: '顧客ログイン不要 · 制作上限：2,500 cr',
      },
      {
        step: '02',
        badge: '共有 Blueprint & ARA',
        title: 'レンダリング費用をかける前にストーリー構成を承認',
        detail:
          'デスクトップで Audience Resonance を使ってテンポを磨いた後、ホワイトラベルの Blueprint リンクを送り、クライアントのスマホからフィードバックと制作承認を取得します。',
        linkLabel: '/blueprint/share · 本制作前サインオフ',
        phoneHeadline: 'Blueprint ＆ ビート確認',
        phoneStatus: '94 / 100 Audience Resonance · 承認済み',
        phoneMeta: '2ラウンド中 1回使用 · コンティニュイティ準備完了',
      },
      {
        step: '03',
        badge: '共有コンティニュイティリンク',
        title: 'スマホ写真を送信（EXIF 自動削除）＆ キャスト固定',
        detail:
          'クライアントはコンティニュイティリンクから端末の写真ライブラリやカメラで家族・物件・商品写真を直接アップロードし、キャスト・衣装・セットを承認します。',
        linkLabel: '/share/continuity · ギャラリー＆カメラ送信',
        phoneHeadline: 'コンティニュイティ＆写真収集',
        phoneStatus: '顧客写真 6枚アップロード済 · キャスト＆セット固定',
        phoneMeta: 'EXIF GPS 自動除去済 · AI モデル学習一切なし',
      },
      {
        step: '04',
        badge: '共有試写室 (Screening Room)',
        title: 'フレーム精度のスマホ試写と最終マスター納品',
        detail:
          'クライアントはログイン不要で任意のスマホから音声付きプリビズや 4K レンダリング版を視聴し、タイムコード付きメモを残して最終マスターを承認できます。',
        linkLabel: '/share/screening-room · 最終承認',
        phoneHeadline: 'プレミア試写室',
        phoneStatus: '最終 4K マスター承認済み ✓',
        phoneMeta: '多言語ストリーム納品済 · 元アップロード素材も削除可能',
      },
    ],
    teamHeading: 'プロデューサー・監督・PM のためのリアルタイム・ポケット司令塔',
    teamSubheading:
      'デスクを離れていても全案件を止めません。ワークスペース管理者と担当 PM に応じた権限表示で現場を把握できます。',
    teamPillars: [
      {
        id: 'alerts',
        title: '即時 Web Push 通知',
        detail:
          '自律エージェントのレンダリング完了、新規クライアントのヒアリング開始、新しいコンティニュイティ写真の到着を瞬時に通知します。',
        metric: 'ライブ通知＋受信箱',
      },
      {
        id: 'status',
        title: '5段階マイルストーン＆進行ペース監視',
        detail:
          'Blueprint、共鳴評価、コンティニュイティ、制作、試写室の進捗と日次シーン消化ペースを一目で追跡できます。',
        metric: 'オンスケジュール可視化',
      },
      {
        id: 'budget',
        title: 'クレジット残高＆厳格な予算上限',
        detail:
          'スタジオ残高、案件ごとの予算上限、PM 別の月間クレジット割当をリアルタイムに管理します。',
        metric: '利益率ガードレール',
      },
      {
        id: 'links',
        title: 'ワンタップのネイティブ共有',
        detail:
          'Blueprint、共鳴レビュー、コンティニュイティ送信、試写室の各リンクを SMS、WhatsApp、Slack、メールで即座に送付できます。',
        metric: '4つの共有ポータル',
      },
    ],
    phoneHeaderBrand: 'SceneFlow Mobile Companion',
    phoneCreditsPill: '14,250 cr',
    phonePmBadge: 'PM 接続中',
    phoneVoiceBriefPill: '音声 / ブリーフ',
    phoneContinuitySlots: ['キャスト ✓', '衣装 ✓', 'ロケ地 ✓', '小道具 ✓'],
    phoneMasterLabel: '4K マスター',
    phoneStageBarLabels: ['Blueprint', '共鳴評価', '一貫性', '制作', '試写室'],
    phoneTeamAlertTitle: '新規コンティニュイティ写真が届きました',
    phoneTeamAlertBody: 'エレナさんが家族アーカイブ写真6枚を送信 · タップして確認・採用',
    phoneTeamBudgetLabel: '案件クレジット予算',
    phoneTeamBudgetValue: '1,180 / 2,500 cr',
    phoneTeamPaceBadge: '順調 · 予算内',
    installIosBadge: 'iOS Safari：共有 → ホーム画面に追加',
    installAndroidBadge: 'Android / Chrome：ワンタップでアプリ導入',
    ctaPrimary: 'Studio ＋ モバイル PWA で始める ($9)',
  },
}
