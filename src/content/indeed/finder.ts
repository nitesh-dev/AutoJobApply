import { Page } from "../automation/page";
import { api } from "@/services/extensionApi";
import { BaseExecutor } from "../common/BaseExecutor";
import { ExtensionMessage } from "@/types";
import { delay } from "../utils";

export class IndeedFinder extends BaseExecutor {
    private allJobsSelector = "#mosaic-provider-jobcards ul li"; // Slightly updated selector

    constructor(private page: Page) {
        super();
    }

    init(url: string, options?: { noClick?: boolean }) {
        // Auto-start scanning for now (prototype style)
        this.scanJobs();
    }

    handleMessage(message: ExtensionMessage) {
        if (message.type === 'PROCESS_NEXT_JOB') {
            // ... logic for next job
            // alert("Processing next job");
        }
    }

    async scanJobs() {
        await delay(3000)
        this.logger.info("Scanning for jobs...");
        try {
            // Wait for list
            await this.page.waitForSelector("#mosaic-provider-jobcards");

            const jobElements = Array.from(document.querySelectorAll(this.allJobsSelector))
                .filter(el => el.checkVisibility() && el.clientHeight > 0);
            const jobs: any[] = [];

            jobElements.forEach((el) => {
                const titleEl = el.querySelector("h2.jobTitle span");
                const linkEl = el.querySelector("a.jcs-JobTitle");

                if (titleEl && linkEl) {
                    jobs.push({
                        title: (titleEl as HTMLElement).innerText,
                        jobUrl: (linkEl as HTMLAnchorElement).href,
                        id: (linkEl as HTMLAnchorElement).getAttribute('data-jk')
                    });
                }
            });

            this.logger.success(`Found ${jobs.length} jobs.`);
            console.log({jobs})

            await api.jobListFound(jobs);

        } catch (e) {
            this.logger.error("Failed to scan jobs", e);
        }
    }
}



// // 1. Parse all cards with their URLs
// const jobCards = Array.from(document.querySelectorAll('.cardOutline')).map(card => {
//     const linkElement = card.querySelector('a[id^="job_"]') || card.querySelector('h2.jobTitle a');
//     return {
//         title: card.querySelector('h2.jobTitle')?.innerText.trim(),
//         url: linkElement ? linkElement.href : 'N/A',
//         jobId: linkElement?.dataset.jk || linkElement?.id
//     };
// });
// console.log("Job Cards:", jobCards);

// // 2. Parse active Job Content and Apply Button
// // Trigger this after clicking a job card
// const getActiveJobDetails = () => {
//     const detailPane = document.querySelector('#jobsearch-ViewjobPaneWrapper');
//     if (!detailPane) return "Please click a job card first.";

//     // Select the primary action button (Apply Now)
//     const applyBtn = detailPane.querySelector('[data-testid="jobsearch-ViewJobButtons-container"] button') || 
//                      detailPane.querySelector('.jobsearch-ViewJobButtons-container button') ||
//                      detailPane.querySelector('button.css-17qy6hn');

//     return {
//         title: detailPane.querySelector('h2')?.innerText.trim(),
//         description: document.querySelector('#jobDescriptionText')?.innerText.replace(/\s+/g, ' ').trim(),
//         applyButton: {
//             text: applyBtn?.innerText.trim(),
//             isVisible: !!applyBtn,
//             isExternal: applyBtn?.innerText.toLowerCase().includes('apply on company site'),
//             element: applyBtn
//         }
//     };
// };

// console.log("Active Job Details:", getActiveJobDetails());