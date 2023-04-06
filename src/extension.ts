/* eslint-disable @typescript-eslint/naming-convention */

import { Event, EventEmitter, ExtensionContext, ProgressLocation, TreeDataProvider, TreeItem, commands, window, workspace } from 'vscode';
import axios from 'axios';

/**
 * This method is called when the extension is activated.
 * It registers the commands and adds them to the context subscriptions.
 *
 * @param context Context of the extension
 */
export function activate(context: ExtensionContext) {
	console.log('Congratulations, your extension "juandy-gpt-assistant" is now active!');

	const onlyCodeDirective = 'Only reply with the output inside one unique code block, and nothing else. Do not write explanations.';
	
	const progressOptions = {
		location: ProgressLocation.Notification,
		title: 'Loading...',
		cancellable: true
	};

	// Register the optimize command and add it to the context subscriptions
	const optimizeDisposable = commands.registerCommand('juandy-gpt-assistant.optimize', async () => {
		await window.withProgress(
			progressOptions,
			() =>
				executeCommand(`You are a code optimizer that receives {{LANG}} code and outputs an optimized version of the {{LANG}} code. ${onlyCodeDirective}`)
				//executeCommand(workspace.getConfiguration('JuandyGPTExtension').get('optimizePrompt', '') + onlyCodeDirective)
		  );
		}
	);

	context.subscriptions.push(optimizeDisposable);
	
	// Register the document command and add it to the context subscriptions
	const documentDisposable = commands.registerCommand('juandy-gpt-assistant.document',  async () => {
		await window.withProgress(
			progressOptions,
			() =>
				executeCommand(`You are a code documenting tool that receives {{LANG}} code and outputs the same code with comments in each line. ${onlyCodeDirective}`)
				//executeCommand(workspace.getConfiguration('JuandyGPTExtension').get('documentPrompt', '') + onlyCodeDirective)
		  );
		}
	);

	context.subscriptions.push(documentDisposable);

	// Register the analyze command and add it to the context subscriptions
	const analizeDisposable = commands.registerCommand('juandy-gpt-assistant.analyze', async () => {
		await window.withProgress(
			progressOptions,
			() =>
				executeCommand(`You are a code analyzer that receives {{LANG}} code and outputs an brief explanation of what the code does in plain English`, false)
				//executeCommand(workspace.getConfiguration('JuandyGPTExtension').get('analyzePrompt', ''), false)
		  );
		}
	);

	context.subscriptions.push(analizeDisposable);

	// Register the DRY command and add it to the context subscriptions
	const dryDisposable = commands.registerCommand('juandy-gpt-assistant.dry', async () => {
		await window.withProgress(
			progressOptions,
			() =>
				executeCommand(`You are a code optimizer that receives {{LANG}} code and outputs refactored, concise, and DRY {{LANG}} code. ${onlyCodeDirective}`)
				//executeCommand(workspace.getConfiguration('JuandyGPTExtension').get('dryPrompt', '') + onlyCodeDirective)
		  );
		}
	);

	context.subscriptions.push(dryDisposable);

	// Register the inquire command and add it to the context subscriptions
	const inquireDisposable = commands.registerCommand('juandy-gpt-assistant.inquire', async () => {
		await window.withProgress(
			progressOptions,
			async () => {
				// Get the active text editor
				const editor = window.activeTextEditor;

				// If there is no active text editor, exit the function
				if (!editor) {
					return;
				}

				// Get the user-selected text
				const selection = editor.selection;
				const selectedText = editor.document.getText(selection);

				// If there is no text selected, show an information message and exit the function
				if (!selectedText) {
					window.showInformationMessage('No text selected.');

					return;
				}

				// Display an input box and request user input
				const userInput = await window.showInputBox({
					prompt: 'Ask a question about this code.',
					value: selectedText
				});

				// Check if the user provided input or dismissed the input box
				if (userInput !== undefined) {
					// Handle the user input
					return executeCommand(userInput, false);
				} else {
					// The user dismissed the input box without providing input
					window.showWarningMessage('No input provided');
				}
			}
		  );
		}
	);

	context.subscriptions.push(inquireDisposable);

	// Register the panel view and add it to the context subscriptions
	const panelView = window.createTreeView('prompt-panel-view', {
		treeDataProvider: new PanelViewDataProvider(context),
		showCollapseAll: true
	});
	
	context.subscriptions.push(panelView);
}

/**
 * This class is used to provide a structure to the panel view.
 */
class PanelViewDataProvider implements TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData: EventEmitter<TreeItem | undefined> = new EventEmitter<TreeItem | undefined>();
	readonly onDidChangeTreeData: Event<TreeItem | undefined> = this._onDidChangeTreeData.event;
  
	constructor(private context: ExtensionContext) {}

	getTreeItem(element: TreeItem): TreeItem {
	  	return element;
	}
  
	getChildren(element?: TreeItem): Thenable<TreeItem[]> {
		const iconPath = {
			light: this.context.asAbsolutePath('resources/icon.ico'),
			dark: this.context.asAbsolutePath('resources/icon.ico')
		};

		if (element === undefined) {
			const optimizeButton = new TreeItem('Optimize');
			optimizeButton.command = { command: 'juandy-gpt-assistant.optimize', title: 'Optimize', arguments: [] };
			optimizeButton.iconPath = iconPath;

			const documentButton = new TreeItem('Document');
			documentButton.command = { command: 'juandy-gpt-assistant.document', title: 'Document', arguments: [] };
			documentButton.iconPath = iconPath;

			const analyzeButton = new TreeItem('Analyze');
			analyzeButton.command = { command: 'juandy-gpt-assistant.analyze', title: 'Analyze', arguments: [] };
			analyzeButton.iconPath = iconPath;

			const dryButton = new TreeItem('DRY');
			dryButton.command = { command: 'juandy-gpt-assistant.dry', title: 'DRY', arguments: [] };
			dryButton.iconPath = iconPath;

			const inquireButton = new TreeItem('Inquire');
			inquireButton.command = { command: 'juandy-gpt-assistant.inquire', title: 'Inquire', arguments: [] };
			inquireButton.iconPath = iconPath;
			
			return Promise.resolve([optimizeButton, documentButton, analyzeButton, dryButton, inquireButton]);
		}
	
		return Promise.resolve([]);
	}
}

/**
 * This method executes the command selected by the user.
 * It retrieves the selected text from the active text editor, validates the input,
 * and calls generateCompletion() to perform the requested action.
 *
 * @param instruction Instructions to be followed by the model
 * @returns A promise that resolves when the edited code has been applied
 */
async function executeCommand(instruction: string, edit: boolean = true) {
	// Get the active text editor
	const editor = window.activeTextEditor;

	// If there is no active text editor, exit the function
	if (!editor) {
		return;
	}

	// Get the user-selected text
	const selection = editor.selection;
	const selectedText = editor.document.getText(selection);
	const languageId = editor.document.languageId;

	// If there is no text selected, show an information message and exit the function
	if (!selectedText) {
		window.showInformationMessage('No text selected.');

		return;
	}

	// Call the generateEdit() or generateCompletion() functions to perform the requested action
	try {
		if (edit) {
			// Replace the {{CODE}} placeholder with the language ID
			const prompt = instruction.replace('{{LANG}}', languageId);
			// Display an information popup
			console.log(`PROMPT: \n${prompt}\n\n`);
			// Generate the edited code
			const response = await generateEdit(selectedText, prompt);
			// Display the response
			console.log(`RESPONSE: \n\n${response}\n\n`);
			// Apply the edited code to the active text editor
			await editor.edit((editBuilder) => {
				editBuilder.replace(selection, response);
			});
		} else {
			// Generate the completion
			const response = await generateCompletion(`${instruction} \n\n${selectedText}`);
			// Display the response
			console.log(`RESPONSE: \n\n${response}\n\n`);
			// Display an information popup
  			window.showInformationMessage(response);
		}
	} catch (error: any) {
		// Show an error message if there is an issue with generating the completion
		window.showErrorMessage('Error generating completion: ' + error.message);
	}
}

/**
 * Generates an edit completion for the provided prompt and instruction using the OpenAI API.
 *
 * @param prompt The input code to be processed
 * @param instruction The instruction to be followed by the model
 * @returns A Promise that resolves to the generated completion as a string
 * @throws An error if the API response is invalid or if the request fails
 */
async function generateEdit(prompt: string, instruction: string): Promise<string> {
	const apiKey = workspace.getConfiguration('JuandyGPTExtension').get('apiKey', '');
	const apiURL = 'https://api.openai.com/v1/edits';

	// Check if the API key is provided
	if (!apiKey) {
		window.showErrorMessage('Please configure the API key in the settings.');
		
		throw new Error('API key not configured');
	}

	const data = {
		model: "code-davinci-edit-001",
		input: prompt,
		instruction: instruction,
	};

	try {
		const response = 
			await axios.post(apiURL, data, {
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`,
				},
      			timeout: 30000, // Timeout in milliseconds (10 seconds)
			});

		if (response.data.choices?.length > 0) {
			return response.data.choices[0].text.trim();
		} else {
			throw new Error('No completion generated');
		}
	} catch (error: any) {
		throw error;
	}
}

/**
 * Generates an edit completion for the provided prompt and instruction using the OpenAI API.
 *
 * @param prompt The input code to be processed
 * @param instruction The instruction to be followed by the model
 * @returns A Promise that resolves to the generated completion as a string
 * @throws An error if the API response is invalid or if the request fails
 */
async function generateCompletion(prompt: string): Promise<string> {
	const apiKey = workspace.getConfiguration('JuandyGPTExtension').get('apiKey', '');
	const apiURL = 'https://api.openai.com/v1/chat/completions';

	// Check if the API key is provided
	if (!apiKey) {
		window.showErrorMessage('Please configure the API key in the settings.');

		throw new Error('API key not configured');
	}

	const data = {
		model: "gpt-3.5-turbo",
		messages: [
			{
				"role": "system",
				"content": "You are a helpful coding assistant."
			},
			{
				"role": "user",
				"content": prompt
			}
		],
	};

	try {
		const response = 
			await axios.post(apiURL, data, {
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`,
				},
      			timeout: 30000, // Timeout in milliseconds (10 seconds)
			});

		if (response.data.choices?.length > 0) {
			return response.data.choices[0].message.content.trim();
		} else {
			throw new Error('No completion generated');
		}
	} catch (error: any) {
		throw error;
	}
}

// This method is called when your extension is deactivated
export function deactivate() { /* NOTHING */ }
