'use strict';

import * as vscode from 'vscode';
import * as k8s from 'vscode-kubernetes-tools-api';

import { AccessDocumentProvider } from './access-document-provider';
import * as accessDocumentProvider from './access-document-provider';

let commandTargetResolver: k8s.CommandTargetsV1 | undefined = undefined;

export async function activate(context: vscode.ExtensionContext) {
    const commandTargets = await k8s.extension.commandTargets.v1;
    if (commandTargets.available) {
        commandTargetResolver = commandTargets.api;
    } else {
        vscode.window.showErrorMessage("Unable to access Kubernetes extension");  // TODO: better error message
    }

    const subscriptions = [
        vscode.commands.registerCommand('k8saccessviewer.showAccess', showAccess),
        vscode.workspace.registerTextDocumentContentProvider('rakkess', new AccessDocumentProvider()),
    ];

    context.subscriptions.push(...subscriptions);
}

async function showAccess(target?: any) {
    const namespace = targetNamespace(target);
    const uri = namespace ? accessDocumentProvider.namespaceUri(namespace) : accessDocumentProvider.clusterUri();
    await vscode.commands.executeCommand("markdown.showPreview", uri);
}

function targetNamespace(commandTarget: any): string | undefined {
    if (!commandTarget) {
        return undefined;
    }
    if (!commandTargetResolver) {
        return undefined;
    }

    const target = commandTargetResolver.resolve(commandTarget);
    if (target && target.targetType === 'kubernetes-explorer-node') {
        const node = target.node;
        if (node.nodeType === 'resource' && node.resourceKind.manifestKind === 'Namespace') {
            // Technically we don't need to check the resource kind as we never display
            // the menu item for any other kind of resource. But this shows an example of
            // how to do it!
            return node.name;
        }
    }

    return undefined;
}
