import type { MDXComponents } from "nextra/mdx-components";
import type { ReactNode } from "react";

// ドキュメント用の共通コンポーネント。MDX の記述量を抑えつつブランド感を統一する。

const CARD_BASE_CLASSES =
    "group relative h-full rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-lg transition hover:-translate-y-1 hover:border-sky-400 hover:shadow-2xl dark:border-slate-800/80 dark:bg-slate-900/50";
const CARD_TEXT_MUTED = "text-sm leading-6 text-slate-600 dark:text-slate-300";

const BUTTON_BASE_CLASSES =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

const BUTTON_PRIMARY_CLASSES = `${BUTTON_BASE_CLASSES} bg-sky-500 text-white shadow-lg shadow-sky-500/30 hover:bg-sky-400 focus-visible:outline-sky-500`;
const BUTTON_SECONDARY_CLASSES = `${BUTTON_BASE_CLASSES} border border-slate-200 bg-white/80 text-slate-900 hover:border-slate-300 hover:bg-white focus-visible:outline-slate-900 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:border-sky-400 dark:hover:text-sky-100`;

const SECTION_WRAPPER_CLASSES = "relative mx-auto max-w-6xl px-6 py-16 sm:px-8";
const SECTION_TITLE_CLASSES =
    "text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl";
const SECTION_EYEBROW_CLASSES =
    "text-sm font-semibold uppercase tracking-[0.28em] text-sky-500";

const HERO_GRADIENT_CLASSES =
    "relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-8 py-16 shadow-2xl ring-1 ring-slate-700/60 sm:px-12 sm:py-20";
const HERO_TEXT_CLASSES = "mx-auto max-w-4xl text-center text-slate-100";
const HERO_TITLE_CLASSES = "text-4xl font-semibold tracking-tight sm:text-5xl";

type HeroProps = {
    kicker?: string;
    title: string;
    description: string;
    children?: ReactNode;
};

function Hero({ kicker, title, description, children }: HeroProps) {
    return (
        <section className="mx-auto max-w-6xl px-6 sm:px-8">
            <div className={HERO_GRADIENT_CLASSES}>
                <div className="absolute inset-0 opacity-50">
                    <div className="-left-16 absolute top-0 h-56 w-56 rounded-full bg-sky-500/40 blur-3xl" />
                    <div className="-right-10 absolute bottom-0 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
                </div>
                <div className="relative space-y-8">
                    <div className={HERO_TEXT_CLASSES}>
                        {kicker ? (
                            <p className="mb-3 font-semibold text-sky-300 text-sm uppercase tracking-[0.3em]">
                                {kicker}
                            </p>
                        ) : null}
                        <h1 className={HERO_TITLE_CLASSES}>{title}</h1>
                        <p className="mt-5 text-base text-slate-200 leading-7 sm:text-lg">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>
            </div>
        </section>
    );
}

type HeroActionsProps = {
    children: ReactNode;
};

function HeroActions({ children }: HeroActionsProps) {
    return (
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-center">
            {children}
        </div>
    );
}

type HeroButtonProps = {
    href: string;
    children: ReactNode;
};

function HeroPrimary({ href, children }: HeroButtonProps) {
    return (
        <a className={BUTTON_PRIMARY_CLASSES} href={href}>
            <span className="font-semibold text-sm text-white tracking-wide">
                {children}
            </span>
        </a>
    );
}

function HeroSecondary({ href, children }: HeroButtonProps) {
    return (
        <a className={BUTTON_SECONDARY_CLASSES} href={href}>
            <span className="font-semibold text-sm">{children}</span>
        </a>
    );
}

type HeroStatsProps = {
    children: ReactNode;
};

function HeroStats({ children }: HeroStatsProps) {
    return (
        <div className="relative mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
            {children}
        </div>
    );
}

type HeroStatProps = {
    value: string;
    label: string;
};

function HeroStat({ value, label }: HeroStatProps) {
    return (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-5 text-left shadow-2xl backdrop-blur">
            <p className="font-semibold text-2xl text-white sm:text-3xl">
                {value}
            </p>
            <p className="mt-1 font-medium text-slate-200/80 text-xs uppercase tracking-[0.22em]">
                {label}
            </p>
        </div>
    );
}

type SectionProps = {
    eyebrow?: string;
    title?: string;
    description?: string;
    children: ReactNode;
};

function Section({ eyebrow, title, description, children }: SectionProps) {
    return (
        <section className={SECTION_WRAPPER_CLASSES}>
            <div className="mx-auto max-w-3xl text-center">
                {eyebrow ? (
                    <p className={SECTION_EYEBROW_CLASSES}>{eyebrow}</p>
                ) : null}
                {title ? (
                    <h2 className={`${SECTION_TITLE_CLASSES} mt-4`}>{title}</h2>
                ) : null}
                {description ? (
                    <p className="mt-5 text-base text-slate-600 leading-7 dark:text-slate-300">
                        {description}
                    </p>
                ) : null}
            </div>
            <div className="mt-12">{children}</div>
        </section>
    );
}

type FeatureGridProps = {
    children: ReactNode;
};

function FeatureGrid({ children }: FeatureGridProps) {
    return <div className="grid gap-6 md:grid-cols-3">{children}</div>;
}

type FeatureCardProps = {
    title: string;
    description: string;
    icon?: string;
    children?: ReactNode;
};

function FeatureCard({ title, description, icon, children }: FeatureCardProps) {
    return (
        <article className={CARD_BASE_CLASSES}>
            <div className="flex items-center gap-3">
                {icon ? (
                    <span aria-hidden className="text-2xl">
                        {icon}
                    </span>
                ) : null}
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                    {title}
                </h3>
            </div>
            <p className={`mt-3 ${CARD_TEXT_MUTED}`}>{description}</p>
            {children ? (
                <div className={`mt-4 space-y-2 ${CARD_TEXT_MUTED}`}>
                    {children}
                </div>
            ) : null}
        </article>
    );
}

type StepTimelineProps = {
    children: ReactNode;
};

function StepTimeline({ children }: StepTimelineProps) {
    return (
        <ol className="relative mx-auto max-w-4xl border-slate-200 border-l dark:border-slate-800">
            {children}
        </ol>
    );
}

type StepItemProps = {
    title: string;
    description: string;
    children?: ReactNode;
};

function StepItem({ title, description, children }: StepItemProps) {
    return (
        <li className="ml-8 space-y-4 border-slate-100 border-b py-8 last:border-none dark:border-slate-800">
            <span className="-left-[14px] absolute mt-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 font-semibold text-white text-xs shadow-lg ring-4 ring-white dark:ring-slate-950" />
            <div>
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                    {title}
                </h3>
                <p className={CARD_TEXT_MUTED}>{description}</p>
            </div>
            {children ? (
                <div className="space-y-3 text-slate-600 text-sm dark:text-slate-300">
                    {children}
                </div>
            ) : null}
        </li>
    );
}

type ResourceGridProps = {
    children: ReactNode;
};

function ResourceGrid({ children }: ResourceGridProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {children}
        </div>
    );
}

type ResourceCardProps = {
    title: string;
    description: string;
    href: string;
    icon?: string;
};

function ResourceCard({ title, description, href, icon }: ResourceCardProps) {
    return (
        <a className={`${CARD_BASE_CLASSES} hover:border-sky-500`} href={href}>
            <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                {icon ? (
                    <span aria-hidden className="text-2xl">
                        {icon}
                    </span>
                ) : null}
                <h3 className="font-semibold text-base">{title}</h3>
            </div>
            <p className={`mt-3 ${CARD_TEXT_MUTED}`}>{description}</p>
        </a>
    );
}

type TestimonialProps = {
    quote: string;
    author: string;
    role: string;
};

function Testimonial({ quote, author, role }: TestimonialProps) {
    return (
        <figure className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white/80 p-10 text-left shadow-xl dark:border-slate-800 dark:bg-slate-900/50">
            <blockquote className="text-lg text-slate-800 leading-8 dark:text-slate-200">
                “{quote}”
            </blockquote>
            <figcaption className="mt-6 font-semibold text-slate-600 text-sm dark:text-slate-300">
                <span className="text-slate-900 dark:text-white">{author}</span>
                <span className="ml-2 text-slate-500 dark:text-slate-400">
                    {role}
                </span>
            </figcaption>
        </figure>
    );
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
    return {
        ...components,
        Hero,
        HeroActions,
        HeroPrimary,
        HeroSecondary,
        HeroStats,
        HeroStat,
        Section,
        FeatureGrid,
        FeatureCard,
        StepTimeline,
        StepItem,
        ResourceGrid,
        ResourceCard,
        Testimonial,
    };
}

// EOF
