import { splitOn } from "../utils/array";

export interface WhoCanInfo {
    readonly roleBindings: ReadonlyArray<RoleBinding>;
    readonly clusterRoleBindings: ReadonlyArray<ClusterRoleBinding>;
}

export interface RoleBinding {
    readonly roleBinding: string;
    readonly roleBindingNamespace: string;
    readonly subject: string;
    readonly subjectType: string;
    readonly subjectNamespace: string | null;
}

export interface ClusterRoleBinding {
    readonly clusterRoleBinding: string;
    readonly subject: string;
    readonly subjectType: string;
    readonly subjectNamespace: string | null;
}

export function parseWhoCanOutput(text: string): WhoCanInfo {
    const lines = text.split('\n').map((t) => t.trim());
    const tranches = splitOn(lines, (l) => l.length === 0);
    return {
        roleBindings: parseBindingsTranche(tranches[0], parseRoleBinding),
        clusterRoleBindings: parseBindingsTranche(tranches[1], parseClusterRoleBinding)
    };
}

function parseBindingsTranche<T>(lines: string[], lineParser: (l: string) => T): ReadonlyArray<T> {
    if (lines.length < 2) {
        return [];
    }
    const entries = lines.slice(1);
    return entries.map(lineParser);
}

function parseRoleBinding(line: string): RoleBinding {
    const bits = line.split('\t');
    return {
        roleBinding: bits[0],
        roleBindingNamespace: bits[1],
        subject: bits[2],
        subjectType: bits[3],
        subjectNamespace: bits[4] || null
    };
}

function parseClusterRoleBinding(line: string): ClusterRoleBinding {
    const bits = line.split('\t');
    return {
        clusterRoleBinding: bits[0],
        subject: bits[1],
        subjectType: bits[2],
        subjectNamespace: bits[3] || null
    };
}
