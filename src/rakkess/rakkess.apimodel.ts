export type Access = { [kind: string]: KindPermissions };

export type KindPermissions = { [verb: string]: KindPermission };

export enum KindPermission {
    Allowed = 1,
    Denied = 2,
    NotApplicable = 3,
    Error = 4,
}

export function parseRakkessOutput(text: string): Access {
    const lines = text.split('\n')
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0)
                      .map((s) => s.split(/\s+/));
    if (lines.length < 2 || lines[0].length < 2) {
        return {};
    }
    return parseRakkessOutputLines(lines[0], lines.slice(1));
}

function parseRakkessOutputLines(headerLine: string[], permissionLines: string[][]): Access {
    const verbs = headerLine.slice(1).map((v) => v.toLowerCase());
    const access: Access = {};
    for (const line of permissionLines) {
        const kind = line[0];
        const permissionTexts = line.slice(1);
        const permissions = parsePermissions(verbs, permissionTexts);
        access[kind] = permissions;
    }
    return access;
}

function parsePermissions(verbs: string[], permissions: string[]): KindPermissions {
    const result: KindPermissions = {};
    for (let i = 0; i < verbs.length; ++i) {
        const verb = verbs[i];
        const permission = permissions[i];
        result[verb] = parsePermissionString(permission);
    }
    return result;
}

function parsePermissionString(text: string): KindPermission {
    switch (text.toLowerCase()) {
        case "yes": return KindPermission.Allowed;
        case "no": return KindPermission.Denied;
        case "n/a": return KindPermission.NotApplicable;
        default: return KindPermission.Error;
    }
}
