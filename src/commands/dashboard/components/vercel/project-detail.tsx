import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { Box, Text } from "ink";

import { getMessages } from "../../../../i18n.js";
import { useDashboard } from "../../state/dashboard-store.js";
import type { ProjectSummary, VercelCredentials } from "./types.js";

type FetchState = "idle" | "loading" | "ready" | "error";

type RemoteProjectDetail = {
    id: string;
    name: string;
    framework?: string;
    createdAt?: number;
    updatedAt?: number;
    gitRepository?: string;
    productionBranch?: string;
};

type DomainInfo = {
    name: string;
    verified: boolean;
    redirect?: string;
    createdAt?: number;
};

type ProjectDetailState = {
    project: RemoteProjectDetail;
    domains: DomainInfo[];
};

type ProjectDetailViewProps = {
    project: ProjectSummary;
    credentials?: VercelCredentials;
};

const PROJECT_DETAIL_ENDPOINT = (projectIdOrName: string): string =>
    `https://api.vercel.com/v13/projects/${encodeURIComponent(projectIdOrName)}`;

const PROJECT_DOMAINS_ENDPOINT = (projectIdOrName: string): string =>
    `https://api.vercel.com/v10/projects/${encodeURIComponent(projectIdOrName)}/domains`;

const PROJECT_DOMAIN_DETAIL_ENDPOINT = (projectIdOrName: string, domain: string): string =>
    `${PROJECT_DOMAINS_ENDPOINT(projectIdOrName)}/${encodeURIComponent(domain)}`;

const MAX_DOMAIN_DETAIL_REQUESTS = 10;

function formatTimestamp(value: number | undefined): string | undefined {
    if (!value) {
        return undefined;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return undefined;
    }

    return date.toLocaleString();
}

function normalizeProjectDetail(raw: Record<string, unknown>, fallback: ProjectSummary): RemoteProjectDetail {
    const project: RemoteProjectDetail = {
        id: typeof raw.id === "string" ? raw.id : fallback.id,
        name: typeof raw.name === "string" ? raw.name : fallback.name,
        framework: typeof raw.framework === "string" ? raw.framework : fallback.framework,
        createdAt: typeof raw.createdAt === "number" ? raw.createdAt : undefined,
        updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : fallback.updatedAt,
    };

    const gitRepository = raw.gitRepository;
    if (gitRepository && typeof gitRepository === "object" && gitRepository !== null) {
        const provider =
            typeof (gitRepository as { type?: unknown }).type === "string"
                ? (gitRepository as { type: string }).type
                : undefined;
        const repo =
            typeof (gitRepository as { repo?: unknown }).repo === "string"
                ? (gitRepository as { repo: string }).repo
                : undefined;
        if (repo) {
            project.gitRepository = provider ? `${provider}:${repo}` : repo;
        }
    }

    const productionBranch = raw.productionBranch;
    if (typeof productionBranch === "string" && productionBranch.length > 0) {
        project.productionBranch = productionBranch;
    }

    return project;
}

function normalizeDomainEntry(raw: Record<string, unknown>): DomainInfo | undefined {
    const name = typeof raw.name === "string" ? raw.name : undefined;
    if (!name) {
        return undefined;
    }

    const verified = Boolean((raw as { verified?: unknown }).verified);
    const redirect =
        typeof (raw as { redirect?: unknown }).redirect === "string"
            ? (raw as { redirect: string }).redirect
            : undefined;
    const createdAt = typeof raw.createdAt === "number" ? raw.createdAt : undefined;

    return {
        name,
        verified,
        redirect,
        createdAt,
    } satisfies DomainInfo;
}

function mergeDomainDetail(base: DomainInfo, detail?: Record<string, unknown>): DomainInfo {
    if (!detail) {
        return base;
    }

    const verifiedValue = (detail as { verified?: unknown }).verified;
    const verified = typeof verifiedValue === "boolean" ? verifiedValue : base.verified;
    const redirect =
        typeof (detail as { redirect?: unknown }).redirect === "string"
            ? (detail as { redirect: string }).redirect
            : base.redirect;
    const createdAt = typeof detail.createdAt === "number" ? detail.createdAt : base.createdAt;

    return {
        ...base,
        verified,
        redirect,
        createdAt,
    } satisfies DomainInfo;
}

export function ProjectDetailView({ project, credentials }: ProjectDetailViewProps): JSX.Element {
    const { dashboard } = useMemo(() => getMessages(), []);
    const detailMessages = dashboard.vercel.projectDetail;
    const { appendLog } = useDashboard();

    const token = credentials?.token;

    const [state, setState] = useState<FetchState>("idle");
    const [detail, setDetail] = useState<ProjectDetailState | undefined>(undefined);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!token) {
            setState("error");
            setErrorMessage(detailMessages.tokenMissing);
            return;
        }

        let isCancelled = false;
        const controller = new AbortController();

        const load = async (): Promise<void> => {
            try {
                setState("loading");
                setErrorMessage(undefined);
                appendLog({ level: "info", message: detailMessages.logFetchStart(project.name) });

                const projectIdOrName = project.id || project.name;
                const headers = {
                    Authorization: `Bearer ${token}`,
                } as const;

                const [projectResponse, domainsResponse] = await Promise.all([
                    fetch(PROJECT_DETAIL_ENDPOINT(projectIdOrName), {
                        headers,
                        signal: controller.signal,
                    }),
                    fetch(PROJECT_DOMAINS_ENDPOINT(projectIdOrName), {
                        headers,
                        signal: controller.signal,
                    }),
                ]);

                if (!projectResponse.ok) {
                    const body = await projectResponse.text();
                    throw new Error(body.trim() || `${projectResponse.status} ${projectResponse.statusText}`);
                }

                if (!domainsResponse.ok) {
                    const body = await domainsResponse.text();
                    throw new Error(body.trim() || `${domainsResponse.status} ${domainsResponse.statusText}`);
                }

                const projectPayload = (await projectResponse.json()) as Record<string, unknown>;
                const domainsPayload = (await domainsResponse.json()) as { domains?: unknown };

                if (isCancelled) {
                    return;
                }

                const remoteProject = normalizeProjectDetail(projectPayload, project);

                const domainsRaw = Array.isArray(domainsPayload.domains)
                    ? (domainsPayload.domains as Record<string, unknown>[])
                    : [];

                const normalizedDomains = domainsRaw
                    .map((entry) => (entry ? normalizeDomainEntry(entry) : undefined))
                    .filter((entry): entry is DomainInfo => Boolean(entry));

                const detailRequests = normalizedDomains.slice(0, MAX_DOMAIN_DETAIL_REQUESTS).map(async (domain) => {
                    try {
                        const detailResponse = await fetch(
                            PROJECT_DOMAIN_DETAIL_ENDPOINT(projectIdOrName, domain.name),
                            {
                                headers,
                                signal: controller.signal,
                            }
                        );

                        if (!detailResponse.ok) {
                            return domain;
                        }

                        const detailPayload = (await detailResponse.json()) as Record<string, unknown>;
                        return mergeDomainDetail(domain, detailPayload);
                    } catch (_error) {
                        return domain;
                    }
                });

                const enrichedDomains = await Promise.all(detailRequests);

                if (isCancelled) {
                    return;
                }

                const mappedDomainByName = new Map(enrichedDomains.map((entry) => [entry.name, entry] as const));
                const finalDomains = normalizedDomains.map((entry) => mappedDomainByName.get(entry.name) ?? entry);

                setDetail({
                    project: remoteProject,
                    domains: finalDomains,
                });
                setState("ready");
                appendLog({ level: "success", message: detailMessages.logFetchSuccess(project.name) });
            } catch (error) {
                if (controller.signal.aborted || isCancelled) {
                    return;
                }

                const message =
                    error instanceof Error && error.message ? error.message : String(error ?? "unknown error");
                setState("error");
                setErrorMessage(detailMessages.error(message));
                appendLog({ level: "error", message: detailMessages.logFetchFailure(project.name, message) });
            }
        };

        void load();

        return () => {
            isCancelled = true;
            controller.abort();
        };
    }, [appendLog, detailMessages, project, token]);

    const heading = useMemo(() => detailMessages.heading(project.name), [detailMessages, project.name]);

    if (state === "loading" || state === "idle") {
        return (
            <Box flexDirection="column" flexGrow={1} paddingX={0} paddingY={0}>
                <Box
                    borderStyle="single"
                    borderColor="blueBright"
                    flexDirection="column"
                    paddingX={2}
                    paddingY={1}
                    flexGrow={1}
                >
                    <Text color="blueBright">{heading}</Text>
                    <Text>{detailMessages.loading}</Text>
                    <Text dimColor>{detailMessages.backHint}</Text>
                </Box>
            </Box>
        );
    }

    if (state === "error") {
        return (
            <Box flexDirection="column" flexGrow={1} paddingX={0} paddingY={0}>
                <Box
                    borderStyle="single"
                    borderColor="blueBright"
                    flexDirection="column"
                    paddingX={2}
                    paddingY={1}
                    flexGrow={1}
                >
                    <Text color="blueBright">{heading}</Text>
                    <Text color="redBright">{errorMessage ?? detailMessages.genericError}</Text>
                    <Text dimColor>{detailMessages.backHint}</Text>
                </Box>
            </Box>
        );
    }

    const detailData =
        detail ??
        ({
            project: {
                id: project.id,
                name: project.name,
                framework: project.framework,
                createdAt: undefined,
                updatedAt: project.updatedAt,
            },
            domains: [],
        } satisfies ProjectDetailState);

    const createdAt = formatTimestamp(detailData.project.createdAt);
    const updatedAt = formatTimestamp(detailData.project.updatedAt);

    const ensureLabel = (raw: string): string => {
        const trimmed = raw.trimEnd();
        if (trimmed.endsWith(":")) {
            return trimmed;
        }
        return `${trimmed}:`;
    };

    type MetadataRow = {
        label: string;
        values: string[];
    };

    const metadataRows: MetadataRow[] = [];

    metadataRows.push({ label: ensureLabel(detailMessages.idLabel), values: [detailData.project.id] });
    metadataRows.push({
        label: ensureLabel(detailMessages.frameworkLabel),
        values: [detailData.project.framework ?? detailMessages.unknown],
    });

    if (detailData.project.gitRepository) {
        metadataRows.push({
            label: ensureLabel(detailMessages.gitRepositoryLabel),
            values: [detailData.project.gitRepository],
        });
    }

    if (detailData.project.productionBranch) {
        metadataRows.push({
            label: ensureLabel(detailMessages.productionBranchLabel),
            values: [detailData.project.productionBranch],
        });
    }

    if (createdAt) {
        metadataRows.push({ label: ensureLabel(detailMessages.createdAtLabel), values: [createdAt] });
    }

    if (updatedAt) {
        metadataRows.push({ label: ensureLabel(detailMessages.updatedAtLabel), values: [updatedAt] });
    }

    const domainLabelBase = ensureLabel(detailMessages.domainsHeading);

    if (detailData.domains.length === 0) {
        metadataRows.push({ label: domainLabelBase, values: [detailMessages.noDomains] });
    } else {
        detailData.domains.forEach((domain, index) => {
            const domainCreatedAt = formatTimestamp(domain.createdAt);
            const status = domain.verified ? detailMessages.domainStatusVerified : detailMessages.domainStatusPending;
            const combined = `${domain.name} — ${status}`;

            metadataRows.push({
                label: index === 0 ? domainLabelBase : "",
                values: [combined],
            });

            if (domainCreatedAt) {
                metadataRows.push({
                    label: "",
                    values: [detailMessages.domainCreatedLabel(domainCreatedAt)],
                });
            }

            if (domain.redirect) {
                metadataRows.push({
                    label: "",
                    values: [detailMessages.domainRedirectLabel(domain.redirect)],
                });
            }
        });
    }

    return (
        <Box flexDirection="column" flexGrow={1} paddingX={0} paddingY={0}>
            <Box
                borderStyle="single"
                borderColor="blueBright"
                flexDirection="column"
                paddingX={2}
                paddingY={1}
                flexGrow={1}
            >
                <Text color="blueBright">{heading}</Text>
                <Box flexDirection="column" marginTop={1}>
                    {metadataRows.map((row, index) => (
                        <Box key={`${row.label}-${index}`} flexDirection="column" marginBottom={1}>
                            {row.label ? <Text color="cyan">{row.label}</Text> : null}
                            {row.values.map((value, valueIndex) => (
                                <Text key={`${row.label}-${index}-${valueIndex}`}>{value}</Text>
                            ))}
                        </Box>
                    ))}
                </Box>

                <Box marginTop={1}>
                    <Text dimColor>{detailMessages.backHint}</Text>
                </Box>
            </Box>
        </Box>
    );
}
