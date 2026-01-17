import { Page } from "../automation/page";
import { api } from "@/services/extensionApi";
import { BaseExecutor } from "../common/BaseExecutor";
import { ExtensionMessage } from "@/types";
import { delay } from "../utils";

export class IndeedAnalyzer extends BaseExecutor {
    private jobDescriptionSelector = "#jobDescriptionText";

    constructor(private page: Page) {
        super();
    }

    init() {
        // Wait for page to be ready, then extract
        this.analyze();
    }

    handleMessage(_message: ExtensionMessage) {
        // No-op for now, everything is RPC
    }

    async analyze() {
        await delay(3000);

        let config = await api.getConfig();
        this.logger.info("Analyzing job details...");
        try {
            await api.reportJobStatus('analyzing');
            const el = await this.page.waitForSelector(this.jobDescriptionSelector);

            const applyBtn = await this.page.waitForSelector("#jobsearch-ViewJobButtons-container>div button")
            if (applyBtn.innerHTML.includes("Applied")) {
                this.logger.info("Already applied to this job. Skipping.");
                await api.reportJobStatus('skipped');
                close()
                return;
            } else if (applyBtn.innerHTML.includes("Apply on company site")) {
                this.logger.info("Job requires external application. Skipping.");
                await api.reportJobStatus('skipped');
                close()
                return;
            }

            // await this.apply();
            await api.reportJobStatus('applying');
            const description = (el as HTMLElement).innerText;

            const prompt = `
            resume: ${config.resumeText}
            
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

        // setTimeout(() => {
        //     window.close();
        // }, 5000);
    }

    async apply() {
        this.logger.success("Applying for job...");
        try {
            await this.page.waitForSelector("#jobsearch-ViewJobButtons-container");
            const applyBtn = document.querySelector('#jobsearch-ViewJobButtons-container>div button') as HTMLButtonElement | null;
            console.log({ applyBtn })
            for (let v = 0; v < 2; v++) {
                // Loop body (currently empty)
                applyBtn?.click()
                await delay(1000);
                console.log(`Clicked apply button attempt ${v + 1}`);
            }

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
            throw e;
        }
    }
}
