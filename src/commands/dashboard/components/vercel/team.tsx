import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text } from "ink";

import { getMessages } from "../../../../i18n.js";
import { useDashboard } from "../../state/dashboard-store.js";
import type { TeamSummary, VercelSectionComponent, VercelSectionNavigation } from "./types.js";

type FetchState = "idle" | "loading" | "success" | "error";

type TeamApiResponse = {
    teams?: unknown;
};

type RawTeam = {
    id?: unknown;
    name?: unknown;
    slug?: unknown;
    createdAt?: unknown;
};

const TEAMS_ENDPOINT = "https://api.vercel.com/v2/teams";
const TEAM_FETCH_LIMIT = 50;

function normalizeTeam(raw: RawTeam): TeamSummary | undefined {
    if (!raw || typeof raw !== "object") {
        return undefined;
    }

    const id = typeof raw.id === "string" ? raw.id : undefined;
    const name = typeof raw.name === "string" ? raw.name : undefined;

    if (!id || !name) {
        return undefined;
    }

    const slug = typeof raw.slug === "string" ? raw.slug : undefined;
    const createdAt = typeof raw.createdAt === "number" ? raw.createdAt : undefined;

    return {
        id,
        name,
        slug,
        createdAt,
    } satisfies TeamSummary;
}

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

export const TeamSection: VercelSectionComponent = ({
    sectionLabel,
    credentials,
    isFocused = false,
    onRegisterNavigation,
    activeTeam,
    onTeamSelected,
}) => {
    const { dashboard } = useMemo(() => getMessages(), []);
    const teamMessages = dashboard.vercel.teamSection;
    const { appendLog } = useDashboard();

    const token = credentials?.token;

    const [fetchState, setFetchState] = useState<FetchState>("idle");
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
    const [teams, setTeams] = useState<TeamSummary[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectedIndexRef = useRef(0);
    const [lastActivatedTeamName, setLastActivatedTeamName] = useState<string | undefined>(undefined);

    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!token) {
            setFetchState("idle");
            setTeams([]);
            setErrorMessage(undefined);
            return;
        }

        let isCancelled = false;
        const controller = new AbortController();

        const loadTeams = async (): Promise<void> => {
            try {
                setFetchState("loading");
                setErrorMessage(undefined);
                appendLog({ level: "info", message: teamMessages.logFetchStart });

                const endpoint = new URL(TEAMS_ENDPOINT);
                endpoint.searchParams.set("limit", String(TEAM_FETCH_LIMIT));

                const response = await fetch(endpoint, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    signal: controller.signal,
                });

                if (!response.ok) {
                    const payload = await response.text();
                    throw new Error(payload.trim() || `${response.status} ${response.statusText}`);
                }

                const payload = (await response.json()) as TeamApiResponse;
                if (isCancelled || !isMountedRef.current) {
                    return;
                }

                const rawTeams = Array.isArray(payload.teams) ? (payload.teams as RawTeam[]) : [];
                const normalized = rawTeams
                    .map((entry) => normalizeTeam(entry))
                    .filter((entry): entry is TeamSummary => Boolean(entry));

                setTeams(normalized);
                setFetchState("success");
                appendLog({ level: "success", message: teamMessages.logFetchSuccess(normalized.length) });
            } catch (error) {
                if (controller.signal.aborted || isCancelled || !isMountedRef.current) {
                    return;
                }

                const message = error instanceof Error && error.message ? error.message : String(error ?? "unknown error");
                setFetchState("error");
                setErrorMessage(message);
                setTeams([]);
                appendLog({ level: "error", message: teamMessages.logFetchFailure(message) });
            }
        };

        void loadTeams();

        return () => {
            isCancelled = true;
            controller.abort();
        };
    }, [appendLog, teamMessages, token]);

    useEffect(() => {
        if (teams.length === 0) {
            setSelectedIndex(0);
            setLastActivatedTeamName(undefined);
            return;
        }

        if (activeTeam?.id) {
            const matchIndex = teams.findIndex((team) => team.id === activeTeam.id);
            if (matchIndex >= 0) {
                setSelectedIndex(matchIndex);
                setLastActivatedTeamName(teams[matchIndex]?.name ?? activeTeam.name ?? activeTeam.id);
                return;
            }
        }

        setSelectedIndex(0);
        setLastActivatedTeamName(undefined);
    }, [activeTeam, teams]);

    useEffect(() => {
        selectedIndexRef.current = selectedIndex;
    }, [selectedIndex]);

    const hasInteractiveContent = useMemo(() => fetchState === "success" && teams.length > 0 && Boolean(token), [fetchState, teams.length, token]);

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
                if (teams.length === 0) {
                    return;
                }

                setSelectedIndex((current) => {
                    if (activeTeam?.id) {
                        const matchIndex = teams.findIndex((team) => team.id === activeTeam.id);
                        if (matchIndex >= 0) {
                            return matchIndex;
                        }
                    }

                    if (current < 0 || current >= teams.length) {
                        return 0;
                    }
                    return current;
                });
            },
            blur: () => {
                // no-op
            },
            move: (direction) => {
                if (teams.length === 0) {
                    return;
                }

                setSelectedIndex((current) => {
                    if (direction === "next") {
                        return (current + 1) % teams.length;
                    }
                    return (current - 1 + teams.length) % teams.length;
                });
            },
            select: () => {
                if (!onTeamSelected) {
                    return;
                }

                const team = teams[selectedIndexRef.current] ?? teams[selectedIndex];
                if (team) {
                    onTeamSelected(team);
                    setLastActivatedTeamName(team.name);
                }
            },
        };

        onRegisterNavigation(navigation);

        return () => {
            onRegisterNavigation(undefined);
        };
    }, [activeTeam, hasInteractiveContent, onRegisterNavigation, onTeamSelected, teams]);

    if (!token) {
        return (
            <Box flexDirection="column">
                <Text color="blueBright">{sectionLabel}</Text>
                <Text>{teamMessages.tokenMissing}</Text>
            </Box>
        );
    }

    if (fetchState === "loading" || fetchState === "idle") {
        return (
            <Box flexDirection="column">
                <Text color="blueBright">{sectionLabel}</Text>
                <Text>{teamMessages.loading}</Text>
            </Box>
        );
    }

    if (fetchState === "error") {
        return (
            <Box flexDirection="column">
                <Text color="blueBright">{sectionLabel}</Text>
                <Text color="redBright">{teamMessages.error(errorMessage ?? "unknown error")}</Text>
            </Box>
        );
    }

    if (teams.length === 0) {
        return (
            <Box flexDirection="column">
                <Text color="blueBright">{sectionLabel}</Text>
                <Text>{teamMessages.empty}</Text>
            </Box>
        );
    }

    return (
        <Box flexDirection="column">
            <Text color="blueBright">{sectionLabel}</Text>
            <Box flexDirection="column" marginTop={1}>
                {teams.map((team, index) => {
                    const isSelected = index === selectedIndex;
                    const indicator = isFocused && isSelected ? "▸" : " ";
                    const isActive = activeTeam?.id === team.id;
                    const created = formatTimestamp(team.createdAt);

                    return (
                        <Box key={team.id} flexDirection="column" marginBottom={1}>
                            <Text color={isFocused && isSelected ? "greenBright" : undefined}>
                                {indicator} {team.name}
                                {team.slug ? ` (${team.slug})` : ""}
                                {isActive ? `  ${teamMessages.activeTag}` : ""}
                            </Text>
                            {created ? <Text dimColor>{teamMessages.createdLabel(created)}</Text> : null}
                        </Box>
                    );
                })}
            </Box>
            <Box marginTop={1}>
                <Text dimColor>{teamMessages.selectionHint}</Text>
            </Box>
            {lastActivatedTeamName ? (
                <Box>
                    <Text dimColor>{teamMessages.lastActivatedFeedback(lastActivatedTeamName)}</Text>
                </Box>
            ) : null}
        </Box>
    );
};

// EOF
