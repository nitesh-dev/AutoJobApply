import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./views/App.tsx";
import { Page } from "./automation/page.ts";
import { Indeed } from "./indeed/index.ts";
import { Logger } from "./logger/logger.ts";
import { GPTParser } from "./gpt.ts";

const container = document.createElement("div");
container.id = "crxjs-app";
document.body.appendChild(container);
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);

const indeed = new Indeed(new Page());
const gptParser = new GPTParser();
const logger = new Logger();

let url = location.href;
let lastUrl = url;

async function start() {
  logger.info("Waiting 5 seconds before starting...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  if (url.includes("chat.openai.com")) {
    logger.processing("Executing GPT Parser");
    await gptParser.execute();
  } else if (url.includes("smartapply.indeed.com")) {
    indeed.processForm();
  } else if (url.includes("indeed.com/viewjob")) {
    indeed.viewJobDetails();
  } else if (url.includes("indeed.com")) {
    indeed.findJobs();
  }

  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;

      if (url.includes("smartapply.indeed.com")) {
        indeed.onNavigation(location.href);
      }
    }
  }, 500);
}

start();
