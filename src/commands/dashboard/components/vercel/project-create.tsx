import { useCallback, useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { Box, Text, useInput } from "ink";

import { getMessages } from "../../../../i18n.js";
import { useDashboard } from "../../state/dashboard-store.js";
import type { ProjectSummary, TeamSummary, VercelCredentials } from "./types.js";

type ProjectCreateViewProps = {
    credentials?: VercelCredentials;
    activeTeam?: TeamSummary;
    onCancel: () => void;
    onSuccess: (project: ProjectSummary) => void;
};

type FieldId = "name" | "framework" | "gitProvider" | "gitRepository" | "productionBranch";
type ActionId = "submit" | "cancel";

type FormState = Record<FieldId, string>;

type FocusItem =
    | {
          kind: "field";
          id: FieldId;
      }
    | {
          kind: "action";
          id: ActionId;
      };

type SubmissionStatus = "idle" | "submitting" | "success" | "error";

const CREATE_PROJECT_ENDPOINT = "https://api.vercel.com/v13/projects";

function toProjectSummary(raw: Record<string, unknown>, fallbackName: string): ProjectSummary {
    const idCandidate = typeof raw.id === "string" && raw.id.trim().length > 0 ? raw.id : undefined;
    const nameCandidate = typeof raw.name === "string" && raw.name.trim().length > 0 ? raw.name : undefined;
    const id = idCandidate ?? fallbackName;
    const name = nameCandidate ?? id;
    const framework =
        typeof raw.framework === "string" && raw.framework.trim().length > 0 ? raw.framework.trim() : undefined;
    const updatedAt =
        typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt) ? raw.updatedAt : undefined;

    return {
        id,
        name,
        framework,
        updatedAt,
    };
}

export function ProjectCreateView({
    credentials,
    activeTeam,
    onCancel,
    onSuccess,
}: ProjectCreateViewProps): JSX.Element {
    const { dashboard } = useMemo(() => getMessages(), []);
    const projectCreateMessages = dashboard.vercel.projectCreate;
    const { appendLog } = useDashboard();

    const token = credentials?.token;

    const fieldConfigs = useMemo(
        () =>
            [
                {
                    id: "name" as const,
                    label: projectCreateMessages.nameLabel,
                    placeholder: projectCreateMessages.namePlaceholder,
                },
                {
                    id: "framework" as const,
                    label: projectCreateMessages.frameworkLabel,
                    placeholder: projectCreateMessages.frameworkPlaceholder,
                },
                {
                    id: "gitProvider" as const,
                    label: projectCreateMessages.gitProviderLabel,
                    placeholder: projectCreateMessages.gitProviderPlaceholder,
                },
                {
                    id: "gitRepository" as const,
                    label: projectCreateMessages.gitRepositoryLabel,
                    placeholder: projectCreateMessages.gitRepositoryPlaceholder,
                },
                {
                    id: "productionBranch" as const,
                    label: projectCreateMessages.productionBranchLabel,
                    placeholder: projectCreateMessages.productionBranchPlaceholder,
                },
            ],
        [projectCreateMessages]
    );

    const focusItems = useMemo<FocusItem[]>(() => {
        const items: FocusItem[] = fieldConfigs.map((field) => ({
            kind: "field",
            id: field.id,
        }));
        items.push({ kind: "action", id: "submit" });
        items.push({ kind: "action", id: "cancel" });
        return items;
    }, [fieldConfigs]);

    const fieldIndexMap = useMemo(() => {
        const map = new Map<FieldId, number>();
        fieldConfigs.forEach((field, index) => {
            map.set(field.id, index);
        });
        return map;
    }, [fieldConfigs]);

    const [form, setForm] = useState<FormState>({
        name: "",
        framework: "",
        gitProvider: "",
        gitRepository: "",
        productionBranch: "",
    });
    const [focusIndex, setFocusIndex] = useState(0);
    const [status, setStatus] = useState<SubmissionStatus>("idle");
    const [statusMessage, setStatusMessage] = useState<string | undefined>(undefined);
    const [validationMessage, setValidationMessage] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (focusIndex < 0 || focusIndex >= focusItems.length) {
            setFocusIndex(0);
        }
    }, [focusIndex, focusItems.length]);

    const setFieldValue = useCallback(
        (fieldId: FieldId, updater: (previous: string) => string) => {
            setForm((current) => {
                const previous = current[fieldId];
                const nextValue = updater(previous);
                if (nextValue === previous) {
                    return current;
                }
                return {
                    ...current,
                    [fieldId]: nextValue,
                };
            });
            if (status !== "idle") {
                setStatus("idle");
                setStatusMessage(undefined);
            }
            setValidationMessage(undefined);
        },
        [status]
    );

    const moveFocus = useCallback(
        (delta: number) => {
            const total = focusItems.length;
            if (total === 0) {
                return;
            }
            setFocusIndex((current) => {
                const next = (current + delta + total) % total;
                return next;
            });
        },
        [focusItems.length]
    );

    const handleSubmit = useCallback(async () => {
        if (!token) {
            setStatus("error");
            setStatusMessage(projectCreateMessages.tokenMissing);
            return;
        }
        if (status === "submitting") {
            return;
        }

        const trimmedName = form.name.trim();
        const trimmedFramework = form.framework.trim();
        const trimmedProvider = form.gitProvider.trim();
        const trimmedRepository = form.gitRepository.trim();
        const trimmedBranch = form.productionBranch.trim();

        if (!trimmedName) {
            setValidationMessage(projectCreateMessages.validationNameRequired);
            setFocusIndex(fieldIndexMap.get("name") ?? 0);
            return;
        }

        if (trimmedRepository && !trimmedProvider) {
            setValidationMessage(projectCreateMessages.validationGitProviderRequired);
            setFocusIndex(fieldIndexMap.get("gitProvider") ?? 0);
            return;
        }

        if (trimmedProvider && !trimmedRepository) {
            setValidationMessage(projectCreateMessages.validationGitRepositoryRequired);
            setFocusIndex(fieldIndexMap.get("gitRepository") ?? 0);
            return;
        }

        setStatus("submitting");
        setStatusMessage(projectCreateMessages.requestInProgress);
        setValidationMessage(undefined);
        appendLog({ level: "info", message: projectCreateMessages.logCreateStart });

        try {
            const endpoint = new URL(CREATE_PROJECT_ENDPOINT);
            const headers: Record<string, string> = {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            if (activeTeam?.id && activeTeam.id.trim().length > 0) {
                endpoint.searchParams.set("teamId", activeTeam.id);
                headers["x-vercel-team-id"] = activeTeam.id;
            } else if (activeTeam?.slug && activeTeam.slug.trim().length > 0) {
                endpoint.searchParams.set("teamSlug", activeTeam.slug);
                headers["x-vercel-team-id"] = activeTeam.slug;
            }

            const payload: Record<string, unknown> = {
                name: trimmedName,
            };

            if (trimmedFramework) {
                payload.framework = trimmedFramework;
            }

            if (trimmedRepository) {
                payload.gitRepository = {
                    repo: trimmedRepository,
                    ...(trimmedProvider ? { type: trimmedProvider.toLowerCase() } : {}),
                };
            }

            if (trimmedBranch) {
                payload.productionBranch = trimmedBranch;
            }

            const response = await fetch(endpoint, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const responseText = await response.text();
                const message = responseText.trim() || `${response.status} ${response.statusText}`.trim();
                throw new Error(message);
            }

            const rawProject = (await response.json()) as Record<string, unknown>;
            const summary = toProjectSummary(rawProject, trimmedName);

            setStatus("success");
            setStatusMessage(projectCreateMessages.requestSuccess(summary.name));
            appendLog({ level: "success", message: projectCreateMessages.logCreateSuccess(summary.name) });
            onSuccess(summary);
        } catch (error) {
            const message = error instanceof Error && error.message ? error.message : String(error ?? "unknown error");
            setStatus("error");
            setStatusMessage(projectCreateMessages.requestFailure(message));
            appendLog({
                level: "error",
                message: projectCreateMessages.logCreateFailure(trimmedName || form.name || "unknown", message),
            });
        }
    }, [
        activeTeam?.id,
        activeTeam?.slug,
        appendLog,
        fieldIndexMap,
        form.gitProvider,
        form.gitRepository,
        form.name,
        form.productionBranch,
        form.framework,
        onSuccess,
        projectCreateMessages,
        status,
        token,
    ]);

    useInput((input, key) => {
        if (status === "submitting") {
            return;
        }

        if (key.escape) {
            onCancel();
            return;
        }

        if (key.tab) {
            moveFocus(key.shift ? -1 : 1);
            return;
        }

        if (input?.toLowerCase() === "j" || key.downArrow) {
            moveFocus(1);
            return;
        }

        if (input?.toLowerCase() === "k" || key.upArrow) {
            moveFocus(-1);
            return;
        }

        const currentItem = focusItems[focusIndex];
        if (!currentItem) {
            return;
        }

        if (currentItem.kind === "field") {
            if (key.return) {
                moveFocus(1);
                return;
            }

            if (key.backspace || key.delete) {
                setFieldValue(currentItem.id, (previous) => previous.slice(0, -1));
                return;
            }

            if (!input || key.ctrl || key.meta) {
                return;
            }

            setFieldValue(currentItem.id, (previous) => previous + input);
            return;
        }

        if (currentItem.kind === "action" && key.return) {
            if (currentItem.id === "submit") {
                void handleSubmit();
            } else {
                onCancel();
            }
        }
    });

    if (!token) {
        return (
            <Box flexDirection="column" flexGrow={1}>
                <Text color="blueBright">{projectCreateMessages.heading}</Text>
                <Box marginTop={1}>
                    <Text color="redBright">{projectCreateMessages.tokenMissing}</Text>
                </Box>
                <Box marginTop={1}>
                    <Text dimColor>{projectCreateMessages.navigationHint}</Text>
                </Box>
            </Box>
        );
    }

    const statusColor =
        status === "error" ? "redBright" : status === "success" ? "greenBright" : status === "submitting" ? "cyan" : undefined;

    return (
        <Box flexDirection="column" flexGrow={1}>
            <Text color="blueBright">{projectCreateMessages.heading}</Text>
            <Box marginTop={1}>
                <Text dimColor>{projectCreateMessages.navigationHint}</Text>
            </Box>

            <Box marginTop={1} flexDirection="column">
                {fieldConfigs.map((field, index) => {
                    const value = form[field.id];
                    const isActive = focusIndex === index;
                    return (
                        <Box key={field.id} flexDirection="column" marginBottom={1}>
                            <Text color={isActive ? "greenBright" : undefined}>
                                {isActive ? "▸" : " "} {field.label}
                            </Text>
                            {value.length > 0 ? (
                                <Text>{value}</Text>
                            ) : (
                                <Text dimColor>{field.placeholder}</Text>
                            )}
                        </Box>
                    );
                })}
            </Box>

            {validationMessage ? (
                <Box marginBottom={1}>
                    <Text color="redBright">{validationMessage}</Text>
                </Box>
            ) : null}

            {statusMessage ? (
                <Box marginBottom={1}>
                    <Text color={statusColor}>{statusMessage}</Text>
                </Box>
            ) : null}

            <Box flexDirection="row" marginTop={1}>
                {(["submit", "cancel"] as const).map((actionId, offset) => {
                    const index = fieldConfigs.length + offset;
                    const isActive = focusIndex === index;
                    const label =
                        actionId === "submit" ? projectCreateMessages.submitLabel : projectCreateMessages.cancelLabel;
                    return (
                        <Box key={actionId} marginRight={2}>
                            <Text color={isActive ? "greenBright" : undefined}>
                                {isActive ? "▸" : " "} {label}
                            </Text>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}

// EOF
