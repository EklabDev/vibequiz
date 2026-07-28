/*---------------------------------------------------------------------------------------------
 *  Minimal typings for the built-in vscode.git extension API (getAPI(1)).
 *  Adapted from microsoft/vscode extensions/git/src/api/git.d.ts
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from 'vscode';

export type RefType = 0 | 1 | 2 | 3 | 4;

export interface Ref {
  readonly type: RefType;
  readonly name?: string;
  readonly commit?: string;
  readonly remote?: string;
}

export interface UpstreamRef {
  readonly remote: string;
  readonly name: string;
}

export interface Branch extends Ref {
  readonly upstream?: UpstreamRef;
  readonly ahead?: number;
  readonly behind?: number;
}

export interface Remote {
  readonly name: string;
  readonly fetchUrl?: string;
  readonly pushUrl?: string;
  readonly isReadOnly: boolean;
}

export interface Change {
  readonly uri: vscode.Uri;
  readonly originalUri: vscode.Uri;
  readonly renameUri: vscode.Uri | undefined;
  readonly status: number;
}

export interface RepositoryState {
  readonly HEAD: Branch | undefined;
  readonly refs: Ref[];
  readonly remotes: Remote[];
  readonly workingTreeChanges: Change[];
  readonly indexChanges: Change[];
  readonly mergeChanges: Change[];
  readonly onDidChange: vscode.Event<void>;
}

export interface Repository {
  readonly rootUri: vscode.Uri;
  readonly state: RepositoryState;
  diff(cached?: boolean): Promise<string>;
  diffWith(ref: string, path?: string): Promise<string>;
  diffWithHEAD(path?: string): Promise<string>;
  getCommit(ref: string): Promise<{ hash: string; message: string }>;
  getConfig(key: string): Promise<string>;
  getConfigs(): Promise<{ key: string; value: string }[]>;
  push(
    remoteName?: string,
    branchName?: string,
    setUpstream?: boolean,
    force?: unknown
  ): Promise<void>;
}

export interface API {
  readonly repositories: Repository[];
  readonly onDidOpenRepository: vscode.Event<Repository>;
  readonly onDidCloseRepository: vscode.Event<Repository>;
  getRepository(uri: vscode.Uri): Repository | null;
}

export interface GitExtension {
  readonly enabled: boolean;
  readonly onDidChangeEnablement: vscode.Event<boolean>;
  getAPI(version: 1): API;
}
