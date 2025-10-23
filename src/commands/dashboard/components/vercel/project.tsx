import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text } from "ink";

import { getMessages } from "../../../../i18n.js";
import { useDashboard } from "../../state/dashboard-store.js";
import type { ProjectSummary, VercelSectionComponent, VercelSectionNavigation } from "./types.js";

type FetchState = "idle" | "loading" | "success" | "error";

type VercelProjectResponse = {
    id?: unknown;
    name?: unknown;
    framework?: unknown;
    updatedAt?: unknown;
};

type VercelProjectsPayload = {
    projects?: unknown;
    pagination?: {
        total?: unknown;
    };
};

const PROJECTS_ENDPOINT = "https://api.vercel.com/v10/projects";
const PROJECTS_LIMIT = 20;

function normalizeProjectList(payload: VercelProjectsPayload): ProjectSummary[] {
    if (!Array.isArray(payload.projects)) {
        return [];
    }

    const projects: ProjectSummary[] = [];

    for (const rawProject of payload.projects as VercelProjectResponse[]) {
        if (!rawProject || typeof rawProject !== "object") {
            continue;
        }

        const id = typeof rawProject.id === "string" ? rawProject.id : undefined;
        const name = typeof rawProject.name === "string" ? rawProject.name : id;
        if (!id || !name) {
            continue;
        }

        const framework =
            typeof rawProject.framework === "string" && rawProject.framework.length > 0
                ? rawProject.framework
                : undefined;
        const updatedAt =
            typeof rawProject.updatedAt === "number" && Number.isFinite(rawProject.updatedAt)
                ? rawProject.updatedAt
                : undefined;

        projects.push({ id, name, framework, updatedAt });
    }

    projects.sort((a, b) => {
        const aTime = a.updatedAt ?? 0;
        const bTime = b.updatedAt ?? 0;
        return bTime - aTime;
    });

    return projects.slice(0, PROJECTS_LIMIT);
}

function extractTotalCount(payload: VercelProjectsPayload, fallback: number): number {
    const total = payload.pagination?.total;
    if (typeof total === "number" && Number.isFinite(total)) {
        return total;
    }
    return fallback;
}

function formatUpdatedAt(timestamp?: number): string | undefined {
    if (!timestamp) {
        return undefined;
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return undefined;
    }

    return date.toLocaleString();
}

// プロジェクト管理セクション。Vercel API からプロジェクト一覧を取得して表示する。
export const ProjectSection: VercelSectionComponent = ({
    sectionLabel,
    placeholder: _placeholder,
    credentials,
    isFocused = false,
    onRegisterNavigation,
    onProjectSelected,
}) => {
    const { appendLog } = useDashboard();
    const projectMessages = useMemo(() => getMessages().dashboard.vercel.projectSection, []);
    const token = credentials?.token;

    const [state, setState] = useState<FetchState>("idle");
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectedIndexRef = useRef(0);
    const [lastSelected, setLastSelected] = useState<ProjectSummary | undefined>(undefined);

    useEffect(() => {
        if (!token) {
            setState("idle");
            setProjects([]);
            setTotalCount(undefined);
            setErrorMessage(undefined);
            setSelectedIndex(0);
            setLastSelected(undefined);
            return;
        }

        let isCancelled = false;
        const controller = new AbortController();

        const fetchProjects = async (): Promise<void> => {
            try {
                setState("loading");
                setErrorMessage(undefined);
                appendLog({ level: "info", message: projectMessages.logFetchStart });

                const endpoint = new URL(PROJECTS_ENDPOINT);
                endpoint.searchParams.set("limit", String(PROJECTS_LIMIT));

                const response = await fetch(endpoint, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    signal: controller.signal,
                });

                if (!response.ok) {
                    const bodyText = await response.text();
                    const fallback = `${response.status} ${response.statusText}`.trim();
                    const message = bodyText.trim() || fallback;
                    throw new Error(message);
                }

                const payload = (await response.json()) as VercelProjectsPayload;
                if (isCancelled) {
                    return;
                }

                const normalized = normalizeProjectList(payload);
                setProjects(normalized);
                setTotalCount(extractTotalCount(payload, normalized.length));
                setState("success");
                appendLog({ level: "success", message: projectMessages.logFetchSuccess(normalized.length) });
            } catch (error) {
                if (controller.signal.aborted || isCancelled) {
                    return;
                }

                const message = error instanceof Error && error.message ? error.message : String(error ?? "unknown");
                setState("error");
                setErrorMessage(message);
                setProjects([]);
                setTotalCount(undefined);
                appendLog({ level: "error", message: projectMessages.logFetchFailure(message) });
            }
        };

        void fetchProjects();

        return () => {
            isCancelled = true;
            controller.abort();
        };
    }, [appendLog, projectMessages, token]);

    useEffect(() => {
        setSelectedIndex(0);
        setLastSelected(undefined);
    }, [projects]);

    useEffect(() => {
        selectedIndexRef.current = selectedIndex;
    }, [selectedIndex]);

    const hasInteractiveContent = state === "success" && projects.length > 0 && Boolean(token);

    const moveSelection = useMemo(
        () => ({
            next: () => {
                if (!hasInteractiveContent) {
                    return;
                }
                setSelectedIndex((current) => {
                    const nextIndex = (current + 1) % projects.length;
                    return nextIndex;
                });
            },
            previous: () => {
                if (!hasInteractiveContent) {
                    return;
                }
                setSelectedIndex((current) => {
                    const nextIndex = (current - 1 + projects.length) % projects.length;
                    return nextIndex;
                });
            },
        }),
        [hasInteractiveContent, projects.length]
    );

    const confirmSelection = useMemo(() => {
        return () => {
            if (!hasInteractiveContent) {
                return;
            }
            const project = projects[selectedIndexRef.current];
            if (!project) {
                return;
            }

            setLastSelected(project);
            appendLog({ level: "info", message: projectMessages.logSelection(project.name) });
            if (onProjectSelected) {
                onProjectSelected(project);
            }
        };
    }, [appendLog, hasInteractiveContent, onProjectSelected, projectMessages, projects]);

    useEffect(() => {
        if (!onRegisterNavigation) {
            return;
        }

        if (!hasInteractiveContent) {
            onRegisterNavigation(undefined);
            return;
        }

        const navigation: VercelSectionNavigation = {
            hasInteractiveContent: () => hasInteractiveContent,
            focus: () => {
                if (projects.length === 0) {
                    return;
                }
                setSelectedIndex((current) => {
                    if (current < 0 || current >= projects.length) {
                        return 0;
                    }
                    return current;
                });
            },
            blur: () => {
                // 何もしない。親がフォーカスを管理する。
            },
            move: (direction) => {
                if (direction === "next") {
                    moveSelection.next();
                    return;
                }
                moveSelection.previous();
            },
            select: () => {
                confirmSelection();
            },
        };

        onRegisterNavigation(navigation);

        return () => {
            onRegisterNavigation(undefined);
        };
    }, [confirmSelection, hasInteractiveContent, moveSelection, onRegisterNavigation, projects.length]);

    useEffect(() => {
        if (!isFocused) {
            return;
        }
        if (!hasInteractiveContent) {
            return;
        }

        if (projects.length === 0) {
            return;
        }

        setSelectedIndex((current) => {
            if (current < 0 || current >= projects.length) {
                return 0;
            }
            return current;
        });
    }, [hasInteractiveContent, isFocused, projects.length]);

    return (
        <Box flexDirection="column">
            <Text color="blueBright">{sectionLabel}</Text>

            {!token ? (
                <Text>{projectMessages.tokenMissing}</Text>
            ) : state === "loading" ? (
                <Text>{projectMessages.loading}</Text>
            ) : state === "error" ? (
                <Text>{projectMessages.error(errorMessage ?? "unknown error")}</Text>
            ) : projects.length === 0 ? (
                <Text>{projectMessages.empty}</Text>
            ) : (
                <>
                    {typeof totalCount === "number" ? <Text>{projectMessages.totalCount(totalCount)}</Text> : null}
                    <Box marginTop={1} flexDirection="column">
                        {projects.map((project, index) => {
                            const isSelected = index === selectedIndex;
                            const bullet = isFocused && isSelected ? "▸" : " ";
                            const updated = formatUpdatedAt(project.updatedAt);
                            return (
                                <Text key={project.id} color={isFocused && isSelected ? "greenBright" : undefined}>
                                    {bullet} {project.name}
                                    {project.framework ? ` – ${project.framework}` : ""}
                                    {updated ? `  Updated: ${updated}` : ""}
                                </Text>
                            );
                        })}
                    </Box>
                    <Box marginTop={1}>
                        {lastSelected ? (
                            <Text color="greenBright">{projectMessages.selectionConfirmed(lastSelected.name)}</Text>
                        ) : null}
                    </Box>
                    <Box>
                        {hasInteractiveContent ? (
                            <Text dimColor>{projectMessages.selectionHint}</Text>
                        ) : null}
                    </Box>
                </>
            )}
        </Box>
    );
};

// EOF
