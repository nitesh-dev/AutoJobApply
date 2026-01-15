import { Page } from "../automation/page";
import { api } from "@/services/extensionApi";
import { BaseExecutor } from "../common/BaseExecutor";
import { ExtensionMessage } from "@/types";

export class IndeedAnalyzer extends BaseExecutor {
    private jobDescriptionSelector = "#jobDescriptionText";

    constructor(private page: Page) {
        super();
    }

    init() {
        // Wait for page to be ready, then extract
        setTimeout(() => this.analyze(), 3000);
    }

    handleMessage(_message: ExtensionMessage) {
        // No-op for now, everything is RPC
    }

    async analyze() {
        this.logger.info("Analyzing job details...");
        try {
            await api.reportJobStatus('analyzing');
            const el = await this.page.waitForSelector(this.jobDescriptionSelector);
            const description = (el as HTMLElement).innerText;

            const prompt = `
            I am a Full Stack Engineer.
            Analyze this job description:
            ${description.substring(0, 2000)}... (truncated)
            
            Should I apply? Return strictly JSON: {"match": true/false, "reason": "small reason"} in code block.
            `;

            const res = await api.proxyGpt(prompt) as any;
            console.log("GPT Response:", { res });
            const answer = res as string;

            console.log("GPT Response:", { answer });
            const decision = JSON.parse(answer.replace(/```json/g, '').replace(/```/g, '').trim());

            console.log("Decision:", { decision });
            if (decision.match) {
                await api.reportJobStatus('applying');
                this.apply();
            } else {
                this.logger.warning("Decided NOT to apply. Skipping.");
                await api.reportJobStatus('skipped');
                // window.close();
            }

        } catch (e) {
            this.logger.error("Failed to analyze job", e);
            await api.reportJobStatus('failed');
        }
    }

    async apply() {
        this.logger.success("Applying for job...");
        try {
            const btn = document.querySelector("#indeedApplyButton") as HTMLElement;
            if (btn) {
                btn.click();
            } else {
                // Fallback for non-Indeed Apply
                const extBtn = document.querySelector('#applyButtonLinkContainer button') as HTMLElement;
                extBtn?.click();
            }
        } catch (e) {
            this.logger.error("Failed to click apply", e);
        }
    }
}
