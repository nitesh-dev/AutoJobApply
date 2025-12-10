import { Page } from "../automation/page";
import { Logger } from "../logger";
import { IndeedAutoFiller } from "./indeed-form-filler";
import { IndeedDynamicFormParser } from "./indeed-form-parser";
import { Jobs } from "./types";

export class Indeed {

    private logger = new Logger();


    constructor(private page: Page) { }
    // Form data to use for autofill
    private AUTOFILL_DATA = {
        "location-postal-code": "844114",
        "location-locality": "Patna, Bihar",
        "location-admin4": "AIIMS",
        "location-address": "Sector 5, Patna",
    };



    // Main function to parse and fill form
    async processForm() {
        try {
            this.logger.info("Processing Indeed application form...");
            await this.page.waitForNetworkIdle();
            await this.page.waitForSelector("#ia-container");
            await this.page.waitForTimeout(3000);

            const parser = new IndeedDynamicFormParser();
            const { fields, continueButton } = parser.parse();
            this.logger.success("Form parsed successfully", { fields, continueButton });

            const auto = new IndeedAutoFiller();
            await auto.autofill(fields, this.AUTOFILL_DATA);

            if (continueButton) {
                // auto.clickContinue(continueButton);
                await this.page.click(continueButton.selector);
            } else {
                this.logger.warning("No continue button found");
            }
        } catch (error) {
            this.logger.error("Error processing form", error);
        }
    }



    onNavigation(newUrl: string) {
        this.processForm();
    }




    // for job finding and listing keywords: string = "full stack developer", location: string = "Remote"



    private allJobsSelector = "#mosaic-provider-jobcards ul"  // use querySelector on this

    async findJobs() {


        try {

            let jobs: Jobs[] = [];

            this.logger.info("Finding jobs on the page...");
            let jobListContainer = await this.page.waitForSelector<HTMLUListElement>(this.allJobsSelector);
            this.logger.success("Job list container found:" + jobListContainer.children.length);

            for (let i = 0; i < jobListContainer.children.length; i++) {
                const jobElement = jobListContainer.children[i] as HTMLLIElement;

                const titleElement = jobElement.querySelector("h2") as HTMLElement;
                const linkElement = jobElement.querySelector("a") as HTMLAnchorElement;

                if (titleElement && linkElement) {
                    const jobTitle = titleElement.innerText.trim();
                    const jobUrl = linkElement.href;

                    jobs.push({
                        title: jobTitle,
                        jobUrl: jobUrl,
                        element: jobElement
                    });

                    this.logger.info(`Job found: ${jobTitle}`);
                }
            }

            this.logger.success(`Total jobs found: ${jobs.length}`);

            this.logger.info("Starting to apply to jobs...");
            for (const job of jobs) {
                this.logger.info(`Processing job: ${job.title}`);

                job.element.scrollIntoView();
                let url = job.element.querySelector("a")!.getAttribute("href") as string;
                window.open(url, "_blank");
                return


                // await this.page.waitForNetworkIdle()
                // await this.page.waitForTimeout(1000);

                // const jobDetailElement = await this.page.waitForSelector<HTMLDivElement>(this.jobCardSelector);
                // let innerText = jobDetailElement.innerText;
                // if (!innerText) {
                //     this.logger.error("Job detail innerText not found, skipping this job.");
                //     continue;
                // }

                // // find first button having apply now text
                // const applyNowButton = Array.from(jobDetailElement.querySelectorAll("button")).find(button => button.innerText.toLowerCase().includes("apply now"));
                // if (applyNowButton) {
                //     this.logger.info("Apply Now button found, clicking...");
                //     applyNowButton.click();


                //     // TODO: wait for background to pick up and process the application form
                // }
            }

        } catch (error) {
            this.logger.error("Error during job application process", error);

        }

    }

    private jobCardSelector = ".jobsearch-JobComponent" // use querySelector + innerText

    async viewJobDetails() {

        try {
            this.logger.info("Viewing job details...");
            const jobDetailElement = await this.page.waitForSelector<HTMLDivElement>(this.jobCardSelector);
            let innerText = jobDetailElement.innerText;
            this.logger.success("Job details retrieved");


            // find first button having apply now text
            const applyNowButton = Array.from(jobDetailElement.querySelectorAll("button")).find(button => button.innerText.toLowerCase().includes("apply now"));
            if (applyNowButton) {
                this.logger.info("Apply Now button found, clicking...");
                applyNowButton.click();


                // TODO: wait for background to pick up and process the application form
            }

        } catch (error) {
            this.logger.error("Error viewing job details", error);
        }
    }


}



// https://in.indeed.com/jobs?q=full+stack+developer&l=Remote