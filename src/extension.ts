'use strict';

import * as vscode from 'vscode';
import * as k8s from 'vscode-kubernetes-tools-api';

import { AccessDocumentProvider } from './access-document-provider';
import * as accessDocumentProvider from './access-document-provider';

let clusterExplorer: k8s.ClusterExplorerV1 | undefined = undefined;

export async function activate(context: vscode.ExtensionContext) {
    const clusterExplorerAPI = await k8s.extension.clusterExplorer.v1;
    if (clusterExplorerAPI.available) {
        clusterExplorer = clusterExplorerAPI.api;
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
    if (!clusterExplorer) {
        return undefined;
    }

    const node = clusterExplorer.resolveCommandTarget(commandTarget);
    if (node) {
        if (node.nodeType === 'resource' && node.resourceKind.manifestKind === 'Namespace') {
            // Technically we don't need to check the resource kind as we never display
            // the menu item for any other kind of resource. But this shows an example of
            // how to do it!
            return node.name;
        }
    }

    return undefined;
}
