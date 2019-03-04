'use strict';

import * as vscode from 'vscode';

import * as rakkess from './rakkess/rakkess';
import { shell } from './utils/shell';
import { failed } from './utils/errorable';
import { Access } from './rakkess/rakkess.apimodel';
import { longRunning } from './utils/host';

export function activate(context: vscode.ExtensionContext) {
    const subscriptions = [
        vscode.commands.registerCommand('k8saccessviewer.showAccess', showAccess)
    ];

    context.subscriptions.push(...subscriptions);
}

async function showAccess(target?: any) {
    const namespace = targetNamespace(target);
    const access = await longRunning('Rakkess is retrieving access info...', () =>
        rakkess.access(shell, namespace)
    );
    if (failed(access)) {
        await vscode.window.showErrorMessage(access.error[0]);
        return;
    }

    showAccessView(access.result);
}

function showAccessView(access: Access): void {
    const json = JSON.stringify(access, undefined, 2);
    console.log(json);
}

function targetNamespace(commandTarget: any): string | undefined {
    if (!commandTarget) {
        return undefined;
    }
    if (isKubernetesObject(commandTarget)) {
        return commandTarget.id;
    }
    return undefined;
}

// TODO: replace with SDK
function isKubernetesObject(obj: any): obj is KubernetesObject {
    return obj.id;
}

interface KubernetesObject {
    readonly id: string;
    readonly metadata?: any;
}
