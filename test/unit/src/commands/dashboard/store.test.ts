import { describe, expect, it } from "vitest";

import {
    SERVICE_ORDER,
    getNextService,
    isServiceType,
    parseService,
    type ServiceType,
} from "../../../../../src/commands/dashboard/types/common.js";

describe("dashboard service helpers", () => {
    it("should cycle through services in order", () => {
        let current: ServiceType = SERVICE_ORDER[0];
        const visited: ServiceType[] = [];

        for (let index = 0; index < SERVICE_ORDER.length * 2; index++) {
            visited.push(current);
            current = getNextService(current);
        }

        expect(visited.slice(0, SERVICE_ORDER.length)).toEqual(SERVICE_ORDER);
        expect(current).toBe(SERVICE_ORDER[0]);
    });

    it("should validate supported service identifiers", () => {
        expect(isServiceType("vercel")).toBe(true);
        expect(isServiceType("turso")).toBe(true);
        expect(isServiceType("github")).toBe(false);
        expect(isServiceType(undefined)).toBe(false);
    });

    it("should parse service arguments case-insensitively", () => {
        expect(parseService("Vercel")).toBe("vercel");
        expect(parseService(" TURSO ")).toBe("turso");
        expect(parseService("unknown")).toBeUndefined();
        expect(parseService(undefined)).toBeUndefined();
    });
});

// EOF
