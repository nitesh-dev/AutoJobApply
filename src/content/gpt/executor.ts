import { BaseExecutor } from "../common/BaseExecutor";
import { ExtensionMessage } from "@/types";
import { sendMessage } from "@/services/extensionApi";

export class GPTExecutor extends BaseExecutor {

    // Selectors from gpt.ts
    private readonly selectorInputArea = "#prompt-textarea";
    private readonly selectorSubmitButton = "#composer-submit-button";
    private readonly selectorSendButtonTestId = '#composer-submit-button[data-testid="send-button"]';

    // We want the last assistant response. attempting to get code block first as it's cleaner for JSON.
    private readonly selectorLastAssistantCodeBlock = "article[data-turn='assistant']:last-of-type pre:last-of-type code";
    private readonly selectorLastAssistantText = "article[data-turn='assistant']:last-of-type";
    private executionQueue: Promise<void> = Promise.resolve();

    init() {
        this.logger.info("GPT Executor initialized...");
        this.logger.info("GPT Executor initialized... GPT Executor initialized... GPT Executor initialized...GPT Executor initialized... GPT Executor initialized... GPT Executor initialized... GPT Executor initialized... GPT Executor initialized...");


        // Let background know we are ready
        setTimeout(() => {
            sendMessage('GPT_READY', undefined);
        }, 1000);
    }

    async handleMessage(msg: ExtensionMessage) {
        if (msg.type === 'PROMPT_GPT') {
            const payload = msg.payload as { prompt: string };
            this.logger.info("Adding GPT Prompt request to queue...");

            // Chain the prompt execution to the existing queue
            const responsePromise = this.executionQueue.then(async () => {
                this.logger.info("Starting queued GPT Prompt execution...");
                return await this.executePrompt(payload.prompt);
            });

            // Update the queue to wait for this specific execution to finish (resolve or reject)
            this.executionQueue = responsePromise.then(() => { }).catch(() => { });

            // Return the result of this specific execution to the caller
            const result = await responsePromise;
            this.logger.info("Queued GPT Prompt execution finished.");
            return result;
        }
    }

    async executePrompt(prompt: string): Promise<string | null> {
        this.logger.processing("Executing GPT Prompt...");
        try {
            if (!this.setPrompt(prompt)) {
                throw new Error("Failed to set prompt");
            }

            // Small delay before clicking
            await new Promise(r => setTimeout(r, 500));

            if (!(await this.submit())) {
                throw new Error("Failed to submit prompt");
            }

            // Wait for generation to finish
            await this.waitForAIFinish();

            // Try to get valid JSON response with retries
            let response: string | null = null;
            for (let i = 0; i < 3; i++) {
                response = this.getLastResponse();
                if (response) {
                    try {
                        const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
                        JSON.parse(cleanJson);
                        this.logger.success("Valid JSON response received");
                        break;
                    } catch (e) {
                        this.logger.warning(`Attempt ${i + 1}: Received invalid JSON or response not ready. Retrying...`);
                    }
                } else {
                    this.logger.warning(`Attempt ${i + 1}: No response found yet. Retrying...`);
                }

                if (i < 2) await new Promise(r => setTimeout(r, 2000));
            }

            this.logger.info("GPT Response extraction complete", { response });

            return response || '';

        } catch (e: any) {
            this.logger.error("GPT Execution failed", e);
            return null;
        }
    }

    private getInputArea(): HTMLElement | null {
        return document.querySelector(this.selectorInputArea);
    }

    private getSubmitButton(): HTMLButtonElement | null {
        return document.querySelector(this.selectorSubmitButton) as HTMLButtonElement | null;
    }

    private setPrompt(text: string): boolean {
        const input = this.getInputArea();
        if (!input) return false;

        // ChatGPT uses a contenteditable div or similar, textContent works better than value
        input.innerHTML = `<p>${text}</p>`;
        // Trigger input event
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
    }

    private async submit(): Promise<boolean> {
        const button = this.getSubmitButton();
        if (!button || button.disabled) return false;
        button.click();
        return true;
    }

    private async waitForAIFinish(timeoutMs: number = 60000): Promise<boolean> {
        this.logger.info("Waiting for GPT to generate...");
        const startTime = Date.now();
        const intervalMs = 1000;

        // Wait a bit for the UI to update to "processing" state
        await new Promise(r => setTimeout(r, 2000));

        while (Date.now() - startTime < timeoutMs) {
            // Check if "send" button is back (meaning generation stopped)
            const sendButton = document.querySelector(this.selectorSendButtonTestId);
            if (sendButton) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }

        this.logger.warning("Timeout waiting for GPT generation");
        return false;
    }

    private getLastResponse(): string | null {
        // Try to get code block first (cleanest for JSON)
        const codeBlock = document.querySelector(this.selectorLastAssistantCodeBlock);
        if (codeBlock) return codeBlock.textContent;

        // Fallback to full text if no code block
        const fullText = document.querySelector(this.selectorLastAssistantText);
        return fullText ? (fullText as HTMLElement).innerText : null;
    }
}

