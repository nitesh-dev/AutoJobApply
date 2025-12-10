import { Logger } from "./logger";

export class GPTParser {

    private logger = new Logger()

    // --- Selectors ---
    private readonly selectorInputArea = "#prompt-textarea";
    private readonly selectorSubmitButton = "#composer-submit-button";
    private readonly selectorLastAssistantCodeBlock =
        "article[data-turn='assistant']:last-of-type pre:last-of-type code";

    // New selector to check for AI writing completion
    // The presence of the "send-button" data-testid indicates the AI has stopped.
    private readonly selectorSendButtonTestId = '#composer-submit-button[data-testid="send-button"]';

    // --- Private DOM Access Methods ---

    private getInputArea(): HTMLElement | null {
        return document.querySelector(this.selectorInputArea);
    }

    private getSubmitButton(): HTMLButtonElement | null {
        return document.querySelector(this.selectorSubmitButton) as HTMLButtonElement | null;
    }

    private getLastAssistantCodeBlock(): string | null {
        const el = document.querySelector(this.selectorLastAssistantCodeBlock);
        return el?.textContent ?? null;
    }

    // --- Private Action Methods ---

    private setPrompt(text: string): boolean {
        const input = this.getInputArea();
        if (!input) return false;

        input.textContent = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
    }

    private async submit(): Promise<boolean> {

        await new Promise((resolve) => setTimeout(resolve, 1000));
        const button = this.getSubmitButton();
        if (!button || button.disabled) return false;

        // Note: The data-testid will switch from 'send-button' to 'stop-button' immediately after click
        button.click();
        return true;
    }

    private async waitForAIFinish(timeoutMs: number = 60000, intervalMs: number = 2000): Promise<boolean> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            // Check if the element with data-testid="send-button" is present
            // If it is, the AI has finished its response.
            const sendButton = document.querySelector(this.selectorSendButtonTestId);

            if (sendButton) {
                this.logger.success("AI finished writing.");
                return true;
            }

            // Wait for the next interval before checking again
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }

        this.logger.error("Timeout waiting for AI to finish writing.");
        return false;
    }

    // --- Main Execution Method ---

    async execute(prompt: string = ""){
        const message = prompt || "write hello world code in ts, no extra doc";

        this.logger.processing("Setting prompt");
        if (!this.setPrompt(message)) {
            this.logger.error("Failed to set prompt. Exiting.");
            return;
        }

        this.logger.processing("Submitting prompt");
        if (!(await this.submit())) {
            this.logger.error("Failed to submit prompt (button disabled or not found). Exiting.");
            return;
        }

        // Wait until the AI has finished its response
        const finished = await this.waitForAIFinish();

        if (finished) {
            // Only attempt to get the code block data after confirmation of completion
            const codeBlock = this.getLastAssistantCodeBlock();

            if (codeBlock) {
                this.logger.success("Last code block data successfully retrieved:", codeBlock);
                return codeBlock;
            } else {
                this.logger.error("Failed to find the last code block after AI finished.");
            }
        } else {
            this.logger.warning("Could not retrieve code block due to timeout.");
        }
    }
}