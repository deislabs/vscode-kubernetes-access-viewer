import * as vscode from 'vscode';

const EXTENSION_CONFIG_KEY = "vscode-k8saccessviewer";

export function affectsExtensionConfiguration(change: vscode.ConfigurationChangeEvent) {
    return change.affectsConfiguration(EXTENSION_CONFIG_KEY);
}

export function rakkessPath(): string | undefined {
    return toolPath('rakkess');
}

export function toolPath(tool: string): string | undefined {
    return vscode.workspace.getConfiguration(EXTENSION_CONFIG_KEY)[`${tool}-path`];
}
