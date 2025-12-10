import { Page } from "../automation/page";
import { Logger } from "../logger";
import { IndeedAutoFiller } from "./indeed-form-filler";
import { IndeedDynamicFormParser } from "./indeed-form-parser";

export class Indeed {


    constructor(private page: Page, private logger: Logger) { }
    // Form data to use for autofill
    private AUTOFILL_DATA = {
        "location-postal-code": "844114",
        "location-locality": "Patna, Bihar",
        "location-admin4": "AIIMS",
        "location-address": "Sector 5, Patna",
    };



    // Main function to parse and fill form
    private async processForm() {
        try {
            await this.page.waitForNetworkIdle();
            await this.page.waitForSelector("#ia-container");
            await this.page.waitForTimeout(3000);

            const parser = new IndeedDynamicFormParser();
            const { fields, continueButton } = parser.parse();
            this.logger.success("Form parsed successfully", { fieldCount: fields.length, hasContinueButton: !!continueButton });

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



    onNavigation() {
        this.processForm()
    }

    onLoad() {
        this.processForm()
    }
}