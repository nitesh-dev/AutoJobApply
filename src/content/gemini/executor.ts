import { BaseExecutor } from "../common/BaseExecutor";
import { ExtensionMessage } from "@/types";
import { sendMessage } from "@/services/extensionApi";

export class GeminiExecutor extends BaseExecutor {
    private readonly selectorInputArea = "div.ql-editor[contenteditable='true']";
    private readonly selectorSubmitButton = "button[aria-label='Send message']";
    private readonly selectorLastResponse = "#chat-history .conversation-container:last-child model-response";
    private readonly selectorCodeBlock = this.selectorLastResponse + " code";

    private executionQueue: Promise<void> = Promise.resolve();

    onBegin(url: string, options?: { isManual?: boolean }) {
        this.logger.info("Gemini Executor initialized...");
        
        // Let background know we are ready
        setTimeout(() => {
            sendMessage('GEMINI_READY', undefined);
        }, 1000);
    }

    async handleMessage(msg: ExtensionMessage) {
        if (msg.type === 'PROMPT_GEMINI') {
            const payload = msg.payload as { prompt: string };
            this.logger.info("Adding Gemini Prompt request to queue...");

            const responsePromise = this.executionQueue.then(async () => {
                this.logger.info("Starting queued Gemini Prompt execution...");
                return await this.executePrompt(payload.prompt);
            });

            this.executionQueue = responsePromise.then(() => { }).catch(() => { });

            const result = await responsePromise;
            this.logger.info("Queued Gemini Prompt execution finished.");
            return result;
        }
    }

    async executePrompt(prompt: string): Promise<string | null> {
        this.logger.processing("Executing Gemini Prompt...");
        try {
            if (!this.setPrompt(prompt)) {
                throw new Error("Failed to set prompt");
            }

            await new Promise(r => setTimeout(r, 500));

            if (!(await this.submit())) {
                throw new Error("Failed to submit prompt");
            }

            await this.waitForAIFinish();

            let response: string | null = null;
            for (let i = 0; i < 3; i++) {
                response = await this.getLastResponse();
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

            this.logger.info("Gemini Response extraction complete", { response });
            return response || '';

        } catch (e: any) {
            this.logger.error("Gemini Execution failed", e);
            return null;
        }
    }

    private setPrompt(prompt: string): boolean {
        const inputArea = document.querySelector(this.selectorInputArea) as HTMLElement;
        if (inputArea) {
            inputArea.focus();
            inputArea.innerHTML = `<p>${prompt}</p>`;
            inputArea.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
        }
        return false;
    }

    private async submit(): Promise<boolean> {
        const submitBtn = document.querySelector(this.selectorSubmitButton) as HTMLButtonElement;
        if (submitBtn && !submitBtn.disabled) {
            submitBtn.click();
            return true;
        }
        return false;
    }

    private async waitForAIFinish(): Promise<void> {
        this.logger.info("Waiting for Gemini to finish generating...");
        return new Promise((resolve) => {
            const check = () => {
                const submitBtn = document.querySelector(this.selectorSubmitButton) as HTMLButtonElement;
                const stopBtn = document.querySelector("button[aria-label='Stop generation']");
                const spinnerVisible = !!document.querySelector('.avatar_spinner_animation:not([style*="hidden"])');
                
                // If the stop button is gone and the submit button is back/enabled, we're likely done
                if (!stopBtn && !spinnerVisible && (submitBtn && !submitBtn.disabled)) {
                    resolve();
                } else {
                    setTimeout(check, 1000);
                }
            };
            setTimeout(check, 2000); // Initial grace period
        });
    }

    private async getLastResponse(): Promise<string | null> {
        // Try to get content from a code block first (usually contains the raw JSON)
        const codeBlock = document.querySelector(this.selectorCodeBlock);
        if (codeBlock) {
            this.logger.debug("Found code block in Gemini response");
            return codeBlock.textContent;
        }

        // Fallback to full markdown text
        const responses = document.querySelectorAll(this.selectorLastResponse);
        if (responses.length > 0) {
            const lastResponse = responses[responses.length - 1];
            return lastResponse.textContent;
        }
        return null;
    }
}
