// ページコンポーネントを描画する。
import type { ReactElement } from "react";
import { Navigation } from "@/components/navigation";

type IconProps = {
  className?: string;
};

const StrategyIcon = ({ className }: IconProps) => (
  <svg
    aria-hidden="true"
    className={`h-6 w-6 ${className ?? ""}`}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.6}
    viewBox="0 0 24 24"
  >
    <path d="M4 4h6v6" />
    <path d="M10 4 4 10" />
    <path d="M14 14h6v6" />
    <path d="M20 14 14 20" />
    <path d="M7 14h2" />
    <path d="M15 4h2" />
  </svg>
);

const AnalyticsIcon = ({ className }: IconProps) => (
  <svg
    aria-hidden="true"
    className={`h-6 w-6 ${className ?? ""}`}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.6}
    viewBox="0 0 24 24"
  >
    <path d="M4 4v16" />
    <path d="M4 20h16" />
    <path d="M8 16v-6" />
    <path d="M12 16V8" />
    <path d="M16 16v-4" />
    <path d="M8 10 12 6l4 3 4-5" />
  </svg>
);

const ShieldIcon = ({ className }: IconProps) => (
  <svg
    aria-hidden="true"
    className={`h-6 w-6 ${className ?? ""}`}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.6}
    viewBox="0 0 24 24"
  >
    <path d="M12 21c6-3 8-6 8-12V5l-8-3-8 3v4c0 6 2 9 8 12" />
    <path d="M9 12.5 11 14l4-4" />
  </svg>
);

const GlobeIcon = ({ className }: IconProps) => (
  <svg
    aria-hidden="true"
    className={`h-6 w-6 ${className ?? ""}`}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.6}
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a17 17 0 0 1 0 18" />
    <path d="M12 3a17 17 0 0 0 0 18" />
  </svg>
);

const GrowthIcon = ({ className }: IconProps) => (
  <svg
    aria-hidden="true"
    className={`h-6 w-6 ${className ?? ""}`}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.6}
    viewBox="0 0 24 24"
  >
    <path d="M4 20V9" />
    <path d="M8 20V5" />
    <path d="M12 20V11" />
    <path d="M16 20V7" />
    <path d="M3 4h6l2 3 2-3h8" />
  </svg>
);

const TeamIcon = ({ className }: IconProps) => (
  <svg
    aria-hidden="true"
    className={`h-6 w-6 ${className ?? ""}`}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.6}
    viewBox="0 0 24 24"
  >
    <circle cx="8" cy="9" r="3" />
    <circle cx="16" cy="9" r="3" />
    <path d="M3 21v-2a4 4 0 0 1 4-4h2" />
    <path d="M21 21v-2a4 4 0 0 0-4-4h-2" />
  </svg>
);

type IconComponent = (props: IconProps) => ReactElement;

type CardContent = {
  title: string;
  description: string;
  icon: IconComponent;
};

const heroHighlights = [
  "経営層と伴走する戦略アドバイザリー",
  "人を中心に据えたチェンジマネジメント",
  "現地密着で展開するグローバルデリバリー",
];

const stats = [
  { value: "180+", label: "変革プログラムの実績" },
  { value: "42", label: "対応マーケット" },
  { value: "94%", label: "クライアント継続率" },
  { value: "350", label: "専門コンサルタント" },
];

const services: CardContent[] = [
  {
    title: "コーポレート戦略",
    description:
      "市場のシグナルを読み解き、成長とレジリエンスを両立させる実行可能なロードマップへ落とし込みます。",
    icon: StrategyIcon,
  },
  {
    title: "データ＆オートメーション",
    description:
      "統合データ基盤と予測ダッシュボード、インテリジェントな業務フローで意思決定を刷新します。",
    icon: AnalyticsIcon,
  },
  {
    title: "リスク＆コンプライアンス",
    description:
      "先回りのガバナンスとサイバーアセスメント、規制対応を組み込み信頼を仕組み化します。",
    icon: ShieldIcon,
  },
  {
    title: "グローバル展開支援",
    description:
      "各地域のタレントとパートナー網を活用し、新規事業とイノベーションの立ち上げを加速します。",
    icon: GlobeIcon,
  },
];

const differentiators: CardContent[] = [
  {
    title: "アダプティブな専任チーム",
    description:
      "実務経験豊富なメンバーが戦略・デザイン・テクノロジー・チェンジを同じスプリントで統合します。",
    icon: TeamIcon,
  },
  {
    title: "成果連動型エンゲージメント",
    description:
      "すべてのマイルストーンを測定可能な成果に結び付け、経営ダッシュボードと定例レビューで価値を可視化します。",
    icon: GrowthIcon,
  },
  {
    title: "業界特化プレイブック",
    description:
      "金融・エネルギー・ヘルスケアなど各業界の規制と顧客文脈に合わせた加速ソリューションを提供します。",
    icon: StrategyIcon,
  },
];

const processSteps = [
  {
    phase: "調査",
    title: "インサイトにもとづく現状分析",
    description:
      "市場・顧客・オペレーションのシグナルを統合し、潜在需要と改善余地を明らかにします。",
  },
  {
    phase: "設計",
    title: "シナリオ起点のロードマップ設計",
    description:
      "共創型デザインスプリントで将来像を検証し、チェンジストーリーに経営の合意を形成します。",
  },
  {
    phase: "実行",
    title: "フルスタックな施策推進",
    description:
      "専任チームがテクノロジー・業務・人材施策を統合し、透明性の高いガバナンスで推進します。",
  },
  {
    phase: "定着",
    title: "組織に根付くケイパビリティ",
    description:
      "プレイブックの移管とチェンジリーダー育成、フィードバックループ構築で持続的な成果を支えます。",
  },
];

const testimonials = [
  {
    quote:
      "Your Siteの伴走で成長戦略に確かな筋道が生まれ、6か月以内にデータドリブンな変革を実現できました。チームは社内メンバーのように動いてくれます。",
    name: "Lina Ortega",
    role: "Chief Strategy Officer, Cobalt Manufacturing",
  },
  {
    quote:
      "規制に精通した知見とデザイン思考を両立したチームのおかげで、新しいデジタル体験を自信を持って提供できるようになりました。",
    name: "Rohit Patel",
    role: "Head of Digital Banking, NovaBank",
  },
];

const insights = [
  {
    category: "プレイブック",
    title: "複雑なオペレーションでAI効率を引き出す5つのアクション",
    date: "2025年9月18日",
  },
  {
    category: "インサイト",
    title: "設備集約型産業におけるリスクマネジメントの刷新",
    date: "2025年8月22日",
  },
  {
    category: "レポート",
    title: "グローバル展開レディネス指標：第4四半期の見通し",
    date: "2025年7月30日",
  },
];

const partners = ["NovaBank", "Ardentis", "Cobalt", "SentryGrid", "Velora", "Northwind"];

const leadership = [
  {
    name: "Aiden Mercer",
    role: "Managing Partner",
    focus: "グローバル変革プログラム、M&A統合、資本効率の最適化をリード。",
  },
  {
    name: "Mira Okafor",
    role: "Chief Innovation Officer",
    focus: "AI導入、プロダクト創出、顧客体験の再設計を推進。",
  },
  {
    name: "Jonas Meyer",
    role: "Head of Global Delivery",
    focus: "プログラム統制、ニアショアデリバリー、パフォーマンスガバナンスを統括。",
  },
];

const SectionHeader = ({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
}) => (
  <div className={align === "left" ? "max-w-2xl" : "mx-auto max-w-3xl text-center"}>
    <p className="font-semibold text-primary text-sm uppercase tracking-[0.35em]">{eyebrow}</p>
    <h2 className="mt-4 font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
      {title}
    </h2>
    <p className="mt-4 text-base text-foreground/70 leading-relaxed">{description}</p>
  </div>
);

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="relative overflow-hidden">
        <Navigation />
        <section className="relative overflow-hidden px-6 pt-10 pb-20">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.2fr,1fr]">
            <div className="space-y-8">
              <div>
                <p className="font-semibold text-primary text-sm uppercase tracking-[0.35em]">
                  次世代アドバイザリー
                </p>
                <h1 className="mt-4 font-semibold text-4xl text-foreground tracking-tight sm:text-5xl lg:text-6xl">
                  野心のスピードに合わせた変革をオーケストレーションします。
                </h1>
                <p className="mt-6 text-foreground/75 text-lg leading-8">
                  Your
                  Siteは戦略・デザイン・テクノロジー・チェンジマネジメントを統合し、自信を持って価値創出を加速できるプログラムを提供します。
                </p>
              </div>
              <ul className="grid gap-3 text-foreground/70 text-sm sm:grid-cols-2">
                {heroHighlights.map((item) => (
                  <li
                    className="flex items-start gap-2 rounded-lg border border-border/50 bg-card/30 p-3"
                    key={item}
                  >
                    <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-4">
                <a
                  className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground text-sm shadow-primary/40 shadow-sm transition hover:shadow-md"
                  href="#services"
                >
                  サービスを見る
                </a>
                <a
                  className="rounded-full border border-border px-6 py-3 font-semibold text-foreground text-sm transition hover:border-primary hover:text-primary"
                  href="#about"
                >
                  チームを見る
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-foreground/60 text-sm">
                <span className="font-semibold text-foreground">
                  世界のリーダーに選ばれています
                </span>
                <div className="flex flex-wrap items-center gap-4 text-foreground/50 text-xs uppercase tracking-[0.3em]">
                  {partners.map((partner) => (
                    <span key={partner}>{partner}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-secondary/30 blur-2xl" />
              <div className="relative rounded-3xl border border-border/60 bg-card/70 p-8 shadow-primary/10 shadow-xl backdrop-blur">
                <p className="font-semibold text-primary text-sm uppercase tracking-[0.35em]">
                  プロジェクト事例
                </p>
                <h3 className="mt-4 font-semibold text-2xl text-foreground">統合変革オフィス</h3>
                <p className="mt-3 text-foreground/70 text-sm">
                  世界的製造業がYour
                  Siteのデリバリーモデルを活用し、12か月でEBITDAを6.4%向上。変革オフィスを立ち上げ継続的な改善を実現しました。
                </p>
                <dl className="mt-8 grid gap-6 text-sm">
                  <div className="flex items-start justify-between gap-4 rounded-xl border border-border/80 bg-background/80 p-4">
                    <div>
                      <dt className="text-foreground/50 text-xs uppercase tracking-[0.25em]">
                        創出価値
                      </dt>
                      <dd className="mt-1 font-semibold text-foreground text-xl">$180M の効果</dd>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                      +42%
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4 rounded-xl border border-border/80 bg-background/80 p-4">
                    <div>
                      <dt className="text-foreground/50 text-xs uppercase tracking-[0.25em]">
                        成果創出まで
                      </dt>
                      <dd className="mt-1 font-semibold text-foreground text-xl">24週</dd>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/15 text-secondary">
                      x3
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4 rounded-xl border border-border/80 bg-background/80 p-4">
                    <div>
                      <dt className="text-foreground/50 text-xs uppercase tracking-[0.25em]">
                        変革定着度
                      </dt>
                      <dd className="mt-1 font-semibold text-foreground text-xl">準備率97%</dd>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-accent">
                      ↑
                    </span>
                  </div>
                </dl>
                <div className="mt-8 flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 text-foreground/60 text-xs">
                  <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                  <p>
                    週次の経営ステアリング、統合KPIダッシュボード、チェンジアクセラレーターを常設。
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative mx-auto mt-12 grid max-w-6xl gap-6 rounded-3xl border border-border/60 bg-card/70 px-6 py-8 shadow-lg shadow-primary/5 backdrop-blur">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((item) => (
                <div
                  className="rounded-2xl border border-border/70 bg-background/80 p-6 text-center"
                  key={item.label}
                >
                  <p className="font-semibold text-3xl text-primary">{item.value}</p>
                  <p className="mt-2 font-medium text-foreground/70 text-sm">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </header>

      <main className="space-y-24">
        <section className="px-6" id="services">
          <div className="mx-auto max-w-6xl space-y-16">
            <SectionHeader
              description="変革のあらゆる段階で戦略の明確化と緻密な実行を結び付けます。経営層から現場まで、Your Siteのチームが一体となって伴走します。"
              eyebrow="提供価値"
              title="事業インパクトを生む実証済みサービス"
            />
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {services.map((service) => (
                <article
                  className="hover:-translate-y-1 flex h-full flex-col justify-between rounded-3xl border border-border/70 bg-card/60 p-6 shadow-primary/5 shadow-sm transition hover:shadow-md hover:shadow-primary/10"
                  key={service.title}
                >
                  <div className="space-y-4">
                    <service.icon className="text-primary" />
                    <h3 className="font-semibold text-foreground text-xl">{service.title}</h3>
                    <p className="text-foreground/70 text-sm leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                  <a
                    className="mt-6 inline-flex items-center font-semibold text-primary text-sm transition hover:gap-2"
                    href="#contact"
                  >
                    専門家に相談する →
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-card/40 px-6 py-24" id="about">
          <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-[1.15fr,0.85fr]">
            <div className="space-y-8">
              <SectionHeader
                description="戦略家・テクノロジスト・チェンジエキスパートを統合した専任スクワッドが、ボードルームから現場まで伴走します。"
                eyebrow="Your Siteが選ばれる理由"
                title="測定可能な変革を求めるリーダーのために"
              />
              <div className="grid gap-6 sm:grid-cols-2">
                {differentiators.map((item) => (
                  <article
                    className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-primary/5 shadow-sm"
                    key={item.title}
                  >
                    <item.icon className="text-primary" />
                    <h3 className="mt-4 font-semibold text-foreground text-lg">{item.title}</h3>
                    <p className="mt-3 text-foreground/70 text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-border/60 bg-background/80 p-8 shadow-lg shadow-primary/10">
              <p className="font-semibold text-primary text-sm uppercase tracking-[0.35em]">
                実行ブループリント
              </p>
              <ul className="mt-6 space-y-6">
                {processSteps.map((step) => (
                  <li
                    className="relative rounded-2xl border border-border/80 bg-card/70 p-6"
                    key={step.phase}
                  >
                    <span className="font-semibold text-primary text-xs uppercase tracking-[0.3em]">
                      {step.phase}
                    </span>
                    <p className="mt-2 font-semibold text-foreground text-lg">{step.title}</p>
                    <p className="mt-3 text-foreground/70 text-sm">{step.description}</p>
                    <span className="-left-3 absolute top-6 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background font-semibold text-primary text-xs">
                      •
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-8 rounded-2xl border border-border/60 bg-background/70 p-4 text-foreground/60 text-xs">
                すべてのプログラムにナレッジ移管、チェンジアナリティクス、リーダーシップコーチングを組み込み、ローンチ後も成果を持続させます。
              </p>
            </div>
          </div>
        </section>

        <section className="px-6" id="insights">
          <div className="mx-auto max-w-6xl space-y-16">
            <SectionHeader
              align="center"
              description="Your Siteの支援はパートナーシップを前提に設計されています。変革の現場でどのようにインパクトを拡大しているのかをご紹介します。"
              eyebrow="お客様の声"
              title="世界のリーダーがYour Siteと共に戦略を実行へ"
            />
            <div className="grid gap-8 lg:grid-cols-2">
              {testimonials.map((testimonial) => (
                <figure
                  className="flex h-full flex-col justify-between rounded-3xl border border-border/70 bg-card/60 p-8 shadow-primary/5 shadow-sm"
                  key={testimonial.name}
                >
                  <blockquote className="font-medium text-foreground text-lg leading-relaxed">
                    “{testimonial.quote}”
                  </blockquote>
                  <figcaption className="mt-6 text-foreground/70 text-sm">
                    <span className="font-semibold text-foreground">{testimonial.name}</span>
                    <span className="block">{testimonial.role}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-card/40 px-6 py-24">
          <div className="mx-auto max-w-6xl space-y-16">
            <SectionHeader
              description="マクロトレンドを実行可能なアクションへと変換する実践的なインサイトを定期配信しています。"
              eyebrow="エグゼクティブ向け特集"
              title="先を読む洞察・プレイブック・リサーチをお届け"
            />
            <div className="grid gap-6 md:grid-cols-3">
              {insights.map((item) => (
                <article
                  className="flex h-full flex-col justify-between rounded-3xl border border-border/70 bg-background/85 p-6 shadow-primary/5 shadow-sm"
                  key={item.title}
                >
                  <div className="space-y-4">
                    <span className="inline-flex w-fit rounded-full border border-border px-3 py-1 font-semibold text-primary text-xs uppercase tracking-[0.25em]">
                      {item.category}
                    </span>
                    <h3 className="font-semibold text-foreground text-xl">{item.title}</h3>
                  </div>
                  <div className="mt-6 flex items-center justify-between text-foreground/60 text-sm">
                    <span>{item.date}</span>
                    <a
                      className="font-semibold text-primary transition hover:gap-2"
                      href="#contact"
                    >
                      記事を読む →
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6" id="contact">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-border/70 bg-card/70 shadow-lg shadow-primary/10">
            <div className="grid gap-0 md:grid-cols-[1.1fr,0.9fr]">
              <div className="space-y-6 px-8 py-12">
                <SectionHeader
                  description="目指すゴールをお聞かせください。戦略・テクノロジー・チェンジの専門チームがロードマップ共創を支援します。"
                  eyebrow="ご相談ください"
                  title="次の変革構想をYour Siteと共に"
                />
                <div className="grid gap-4 text-foreground/70 text-sm sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/80 bg-background/80 p-4">
                    <p className="text-primary text-xs uppercase tracking-[0.25em]">メール</p>
                    <p className="mt-2 font-medium text-foreground">hello@yoursite.com</p>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-background/80 p-4">
                    <p className="text-primary text-xs uppercase tracking-[0.25em]">ホットライン</p>
                    <p className="mt-2 font-medium text-foreground">+1 (312) 555-0149</p>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-background/80 p-4">
                    <p className="text-primary text-xs uppercase tracking-[0.25em]">拠点</p>
                    <p className="mt-2 font-medium text-foreground">
                      Chicago · London · Singapore · São Paulo
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-background/80 p-4">
                    <p className="text-primary text-xs uppercase tracking-[0.25em]">パートナー</p>
                    <p className="mt-2 font-medium text-foreground">partners@yoursite.com</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 pt-4">
                  <a
                    className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground text-sm shadow-primary/40 shadow-sm transition hover:shadow-md"
                    href="mailto:hello@yoursite.com"
                  >
                    メールで問い合わせる
                  </a>
                  <a
                    className="rounded-full border border-border px-6 py-3 font-semibold text-foreground text-sm transition hover:border-primary hover:text-primary"
                    href="#services"
                  >
                    導入事例を見る
                  </a>
                </div>
              </div>
              <div className="border-border/70 border-t bg-background/80 px-8 py-12 md:border-t-0 md:border-l">
                <p className="font-semibold text-primary text-sm uppercase tracking-[0.35em]">
                  リーダーシップチーム
                </p>
                <ul className="mt-8 space-y-6">
                  {leadership.map((leader) => (
                    <li
                      className="rounded-2xl border border-border/80 bg-card/70 p-6"
                      key={leader.name}
                    >
                      <p className="font-semibold text-base text-foreground">{leader.name}</p>
                      <p className="text-primary text-sm">{leader.role}</p>
                      <p className="mt-3 text-foreground/70 text-sm">{leader.focus}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-8 rounded-2xl border border-border/70 bg-background/70 p-4 text-foreground/60 text-xs">
                  まずは対話から。1営業日以内に次のステップをご案内します。
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-24 bg-background/80 px-6 pt-16 pb-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 md:flex-row md:justify-between">
          <div className="max-w-md space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground">
                YS
              </div>
              <span className="font-semibold text-xl tracking-tight">Your Site</span>
            </div>
            <p className="text-foreground/70 text-sm leading-relaxed">
              戦略・テクノロジー・チェンジのスペシャリストが集まり、野心的な組織に測定可能な成果をもたらします。
            </p>
            <div className="flex flex-wrap gap-4 text-foreground/50 text-xs uppercase tracking-[0.3em]">
              {partners.map((partner) => (
                <span key={partner}>{partner}</span>
              ))}
            </div>
          </div>
          <div className="grid gap-8 text-foreground/70 text-sm md:grid-cols-3">
            <div>
              <p className="font-semibold text-primary text-sm uppercase tracking-[0.3em]">
                メニュー
              </p>
              <ul className="mt-4 space-y-2">
                <li>
                  <a className="transition-colors hover:text-foreground" href="#services">
                    サービス
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-foreground" href="#insights">
                    インサイト
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-foreground" href="#about">
                    私たちについて
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-foreground" href="#contact">
                    お問い合わせ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-primary text-sm uppercase tracking-[0.3em]">拠点</p>
              <ul className="mt-4 space-y-2">
                <li>Chicago</li>
                <li>London</li>
                <li>Singapore</li>
                <li>São Paulo</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-primary text-sm uppercase tracking-[0.3em]">
                ニュースレター
              </p>
              <p className="mt-4 text-foreground/70 text-sm">
                戦略・テクノロジー・チェンジの最新トピックを月次でお届けします。
              </p>
              <a
                className="mt-4 inline-flex items-center rounded-full border border-border px-5 py-2 font-semibold text-foreground text-sm transition hover:border-primary hover:text-primary"
                href="mailto:hello@yoursite.com?subject=Your%20Site%20Newsletter"
              >
                購読する →
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-4 border-border/70 border-t pt-6 text-foreground/60 text-xs md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Your Site. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <a className="transition-colors hover:text-foreground" href="#privacy">
              プライバシー
            </a>
            <a className="transition-colors hover:text-foreground" href="#terms">
              利用規約
            </a>
            <a className="transition-colors hover:text-foreground" href="#sustainability">
              サステナビリティ
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// EOF
