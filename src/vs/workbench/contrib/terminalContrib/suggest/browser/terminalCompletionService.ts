/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Disposable, IDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { TerminalSettingId, TerminalShellType } from '../../../../../platform/terminal/common/terminal.js';
import { ISimpleCompletion } from '../../../../services/suggest/browser/simpleCompletionItem.js';
import { ITerminalSuggestConfiguration, terminalSuggestConfigSection } from '../common/terminalSuggestConfiguration.js';

export const ITerminalCompletionService = createDecorator<ITerminalCompletionService>('terminalCompletionService');

export enum ISimpleCompletionKind {
	File = 0,
	Folder = 1,
	Flag = 2,
	Method = 3
}

export interface ITerminalCompletionProvider {
	id: string;
	shellTypes?: TerminalShellType[];
	provideCompletions(value: string, cursorPosition: number, token: CancellationToken): Promise<ISimpleCompletion[] | undefined>;
	triggerCharacters?: string[];
	isBuiltin?: boolean;
}

export interface ITerminalCompletionService {
	_serviceBrand: undefined;
	providers: ITerminalCompletionProvider[];
	registerTerminalCompletionProvider(extensionIdentifier: string, id: string, provider: ITerminalCompletionProvider, ...triggerCharacters: string[]): IDisposable;
	provideCompletions(promptValue: string, cursorPosition: number, shellType: TerminalShellType, token: CancellationToken, triggeredProviders?: ITerminalCompletionProvider[]): Promise<ISimpleCompletion[] | undefined>;
}

export class TerminalCompletionService extends Disposable implements ITerminalCompletionService {
	declare _serviceBrand: undefined;
	private readonly _providers: Map</*ext id*/string, Map</*provider id*/string, ITerminalCompletionProvider>> = new Map();
	get providers() { return [...this._providers.values()].flatMap(providerMap => [...providerMap.values()]); }

	constructor(@IConfigurationService private readonly _configurationService: IConfigurationService) {
		super();
	}

	registerTerminalCompletionProvider(extensionIdentifier: string, id: string, provider: ITerminalCompletionProvider, ...triggerCharacters: string[]): IDisposable {
		let extMap = this._providers.get(extensionIdentifier);
		if (!extMap) {
			extMap = new Map();
			this._providers.set(extensionIdentifier, extMap);
		}
		provider.triggerCharacters = triggerCharacters;
		provider.id = id;
		extMap.set(id, provider);
		return toDisposable(() => {
			const extMap = this._providers.get(extensionIdentifier);
			if (extMap) {
				extMap.delete(id);
				if (extMap.size === 0) {
					this._providers.delete(extensionIdentifier);
				}
			}
		});
	}

	async provideCompletions(promptValue: string, cursorPosition: number, shellType: TerminalShellType, token: CancellationToken, triggeredProviders?: ITerminalCompletionProvider[]): Promise<ISimpleCompletion[] | undefined> {
		const completionItems: ISimpleCompletion[] = [];

		if (!this._providers || !this._providers.values) {
			return undefined;
		}

		const collectCompletions = async (providers: ITerminalCompletionProvider[]) => {
			await Promise.all(providers.map(async provider => {
				if (provider.shellTypes && !provider.shellTypes.includes(shellType)) {
					return;
				}
				const completions = await provider.provideCompletions(promptValue, cursorPosition, token);
				const devModeEnabled = this._configurationService.getValue(TerminalSettingId.DevMode);
				if (completions) {
					for (const completion of completions) {
						if (devModeEnabled && !completion.detail?.includes(provider.id)) {
							completion.detail = `(${provider.id}) ${completion.detail ?? ''}`;
						}
						completionItems.push(completion);
					}
				}
			}));
		};


		const extensionCompletionsEnabled = this._configurationService.getValue<ITerminalSuggestConfiguration>(terminalSuggestConfigSection).enableExtensionCompletions;
		let providers;
		if (triggeredProviders) {
			providers = triggeredProviders;
		} else {
			providers = [...this._providers.values()].flatMap(providerMap => [...providerMap.values()]);
		}

		if (!extensionCompletionsEnabled) {
			providers = providers.filter(p => p.isBuiltin);
		}

		await collectCompletions(providers);

		return completionItems.length > 0 ? completionItems : undefined;
	}
}
