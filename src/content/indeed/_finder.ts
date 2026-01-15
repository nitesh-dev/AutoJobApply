import { Page } from "../automation/page";
import { api } from "@/services/extensionApi";
import { BaseExecutor } from "../common/BaseExecutor";
import { ExtensionMessage } from "@/types";
import { delay } from "../utils";

export class IndeedFinder2 extends BaseExecutor {
    private allJobsSelector = ".cardOutline";

    constructor(private page: Page) {
        super();
    }

    init() {
        // Auto-start scanning for now (prototype style)
        this.scanJobs()
    }

    handleMessage(message: ExtensionMessage) {
        if (message.type === 'PROCESS_NEXT_JOB') {
            // ... logic for next job
            alert("Processing next job");
        }
    }

    async scanJobs() {
        await delay(3000);
        this.logger.info("Scanning for jobs...");
        try {
            await this.page.waitForSelector("#mosaic-provider-jobcards");

            const jobElements = Array.from(document.querySelectorAll(this.allJobsSelector))
                .filter(el => (el as HTMLElement).offsetParent !== null);
            this.logger.success(`Found ${jobElements.length} visible jobs. Starting detailed scan...`);

            for (const card of jobElements) {
                const clickable = card.querySelector('a[id^="job_"]') as HTMLElement || card.querySelector('h2.jobTitle a') as HTMLElement;

                if (clickable) {
                    clickable.click();
                    this.logger.info(`Clicked job. Waiting 5s for details...`);

                    await delay(5000);

                    const details = this.getActiveJobDetails();
                    console.log("Job Details captured:", details);
                    if (details && details.applyButton.element) {
                        await this.page.waitForSelector("#jobsearch-ViewJobButtons-container");
                        const applyBtn = document.querySelector('#jobsearch-ViewJobButtons-container>div button') as HTMLButtonElement | null;
                        console.log({ applyBtn })
                        for (let v = 0; v < 10; v++) {
                            // Loop body (currently empty)
                            applyBtn?.click()
                            await delay(1000);
                            window.focus()
                            console.log(`Clicked apply button attempt ${v + 1}`);
                        }

                        return
                    }
                }
            }

        } catch (e) {
            this.logger.error("Failed to scan jobs", e);
        }
    }

    getActiveJobDetails() {
        const detailPane = document.querySelector('#jobsearch-ViewjobPaneWrapper');
        if (!detailPane) return null;

        const applyBtn = (detailPane.querySelector('[data-testid="jobsearch-ViewJobButtons-container"] button') ||
            detailPane.querySelector('.jobsearch-ViewJobButtons-container button') ||
            detailPane.querySelector('button.css-17qy6hn')) as HTMLButtonElement | null


        return {
            title: (detailPane.querySelector('h2') as HTMLElement)?.innerText.trim(),
            description: (document.querySelector('#jobDescriptionText') as HTMLElement)?.innerText.replace(/\s+/g, ' ').trim(),
            applyButton: {
                text: (applyBtn as HTMLElement)?.innerText.trim(),
                isVisible: !!applyBtn,
                isExternal: (applyBtn as HTMLElement)?.innerText.toLowerCase().includes('apply on company site'),
                element: applyBtn
            }
        };
    }
}

