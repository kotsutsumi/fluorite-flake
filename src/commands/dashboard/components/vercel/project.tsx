import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    onCreateProjectRequested,
    activeTeam,
    refreshToken,
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
    const [focusedArea, setFocusedArea] = useState<"list" | "actions">("list");

    useEffect(() => {
        if (!token) {
            setState("idle");
            setProjects([]);
            setTotalCount(undefined);
            setErrorMessage(undefined);
            setSelectedIndex(0);
            setLastSelected(undefined);
            setFocusedArea("list");
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

                const headers: Record<string, string> = {
                    Authorization: `Bearer ${token}`,
                };

                if (activeTeam?.id && activeTeam.id.trim().length > 0) {
                    endpoint.searchParams.set("teamId", activeTeam.id);
                    headers["x-vercel-team-id"] = activeTeam.id;
                } else if (activeTeam?.slug && activeTeam.slug.trim().length > 0) {
                    endpoint.searchParams.set("teamSlug", activeTeam.slug);
                    headers["x-vercel-team-id"] = activeTeam.slug;
                }

                const response = await fetch(endpoint, {
                    headers,
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
    }, [appendLog, projectMessages, token, activeTeam?.id, activeTeam?.slug, refreshToken]);

    useEffect(() => {
        setSelectedIndex(0);
        setLastSelected(undefined);
        if (projects.length === 0) {
            setFocusedArea("actions");
        } else {
            setFocusedArea("list");
        }
    }, [projects, activeTeam?.id, activeTeam?.slug, refreshToken]);

    useEffect(() => {
        selectedIndexRef.current = selectedIndex;
    }, [selectedIndex]);

    const hasInteractiveContent = state === "success" && Boolean(token);

    const moveSelection = useCallback(
        (direction: "next" | "previous") => {
            if (!hasInteractiveContent) {
                return;
            }
            if (focusedArea !== "list" || projects.length === 0) {
                return;
            }

            setSelectedIndex((current) => {
                if (projects.length === 0) {
                    return 0;
                }
                if (direction === "next") {
                    return (current + 1) % projects.length;
                }
                return (current - 1 + projects.length) % projects.length;
            });
        },
        [focusedArea, hasInteractiveContent, projects.length]
    );

    const confirmSelection = useCallback(() => {
        if (!hasInteractiveContent) {
            return;
        }

        if (focusedArea === "actions") {
            appendLog({ level: "info", message: projectMessages.logCreateRequested });
            if (onCreateProjectRequested) {
                onCreateProjectRequested();
            }
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
    }, [
        appendLog,
        focusedArea,
        hasInteractiveContent,
        onCreateProjectRequested,
        onProjectSelected,
        projectMessages,
        projects,
    ]);

    const cycleArea = useCallback(
        (direction: "next" | "previous") => {
            if (!hasInteractiveContent) {
                return false;
            }

            if (direction === "next") {
                if (focusedArea === "list") {
                    setFocusedArea("actions");
                    return true;
                }
                return false;
            }

            if (focusedArea === "actions") {
                if (projects.length > 0) {
                    setFocusedArea("list");
                    return true;
                }
                return false;
            }

            return false;
        },
        [focusedArea, hasInteractiveContent, projects.length]
    );

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
                    setFocusedArea("actions");
                    return;
                }
                setFocusedArea("list");
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
                moveSelection(direction);
            },
            select: () => {
                confirmSelection();
            },
            cycleArea: (direction) => cycleArea(direction),
        };

        onRegisterNavigation(navigation);

        return () => {
            onRegisterNavigation(undefined);
        };
    }, [
        confirmSelection,
        cycleArea,
        hasInteractiveContent,
        moveSelection,
        onRegisterNavigation,
        projects.length,
    ]);

    useEffect(() => {
        if (!isFocused) {
            return;
        }
        if (!hasInteractiveContent) {
            return;
        }

        if (projects.length === 0) {
            setFocusedArea("actions");
            return;
        }

        setSelectedIndex((current) => {
            if (current < 0 || current >= projects.length) {
                return 0;
            }
            return current;
        });
    }, [hasInteractiveContent, isFocused, projects.length]);

    const isListFocused = isFocused && focusedArea === "list";
    const isActionsFocused = isFocused && focusedArea === "actions";

    return (
        <Box flexDirection="column">
            <Text color="blueBright">{sectionLabel}</Text>

            {!token ? (
                <Text>{projectMessages.tokenMissing}</Text>
            ) : state === "loading" ? (
                <Text>{projectMessages.loading}</Text>
            ) : state === "error" ? (
                <Text>{projectMessages.error(errorMessage ?? "unknown error")}</Text>
            ) : state === "success" ? (
                <>
                    {typeof totalCount === "number" ? <Text>{projectMessages.totalCount(totalCount)}</Text> : null}
                    <Box marginTop={1} flexDirection="column">
                        {projects.length > 0 ? (
                            projects.map((project, index) => {
                                const isSelected = index === selectedIndex;
                                const bullet = isListFocused && isSelected ? "▸" : " ";
                                const updated = formatUpdatedAt(project.updatedAt);
                                return (
                                    <Text key={project.id} color={isListFocused && isSelected ? "greenBright" : undefined}>
                                        {bullet} {project.name}
                                        {project.framework ? ` – ${project.framework}` : ""}
                                        {updated ? `  Updated: ${updated}` : ""}
                                    </Text>
                                );
                            })
                        ) : (
                            <Text>{projectMessages.empty}</Text>
                        )}
                    </Box>
                    <Box marginTop={1}>
                        {lastSelected ? (
                            <Text color="greenBright">{projectMessages.selectionConfirmed(lastSelected.name)}</Text>
                        ) : null}
                    </Box>
                    <Box>
                        {hasInteractiveContent ? (
                            isListFocused ? (
                                <>
                                    <Text dimColor>{projectMessages.selectionHint}</Text>
                                    <Text dimColor>{projectMessages.createButtonHint}</Text>
                                </>
                            ) : null
                        ) : null}
                    </Box>
                    <Box
                        marginTop={1}
                        borderStyle="single"
                        borderColor={isActionsFocused ? "greenBright" : "gray"}
                        flexDirection="column"
                        paddingX={1}
                        paddingY={0}
                    >
                        <Text color="blueBright">{projectMessages.actionsHeading}</Text>
                        <Box marginTop={1} marginBottom={isActionsFocused ? 1 : 0}>
                            <Text color={isActionsFocused ? "greenBright" : undefined}>
                                {isActionsFocused ? "▸" : " "} {projectMessages.createButtonLabel}
                            </Text>
                        </Box>
                        {isActionsFocused ? (
                            <Box marginBottom={1}>
                                <Text dimColor>{projectMessages.actionsHint}</Text>
                            </Box>
                        ) : null}
                    </Box>
                </>
            ) : null}
        </Box>
    );
};
