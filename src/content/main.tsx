import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./views/App.tsx";
import { IndeedDynamicFormParser } from "./indeed/indeed-form-parser.ts";
import { IndeedAutoFiller } from "./indeed/indeed-form-filler.ts";
import { Page } from "./automation/page.ts";

console.log("[CRXJS] Hello world from content script!");

const container = document.createElement("div");
container.id = "crxjs-app";
document.body.appendChild(container);
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Form data to use for autofill
const AUTOFILL_DATA = {
  "location-postal-code": "844114",
  "location-locality": "Patna, Bihar",
  "location-admin4": "AIIMS",
  "location-address": "Sector 5, Patna",
};

const page = new Page();

// Main function to parse and fill form
async function processForm() {
  console.log("Processing form...");

  try {
    await page.waitForNetworkIdle();
    await page.waitForSelector("#ia-container");
    await page.waitForTimeout(3000);

    const parser = new IndeedDynamicFormParser();
    const { fields, continueButton } = parser.parse();
    console.log("Parsed form:", { fields, continueButton });

    const auto = new IndeedAutoFiller();
    await auto.autofill(fields, AUTOFILL_DATA);

    if (continueButton) {
      // auto.clickContinue(continueButton);
      await page.click(continueButton.selector);
    } else {
      console.warn("No continue button found");
    }
  } catch (error) {
    console.error("Error processing form:", error);
  }
}

let lastUrl = location.href;

setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    console.log("URL changed:", lastUrl);
    handleNavigation();
  }
}, 500);

async function handleNavigation() {
  await processForm();
}

window.addEventListener("load", async () => {
  await processForm();
});
