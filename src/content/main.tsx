import { createRoot } from "react-dom/client";
import App from "@/content/views/App";
import { api } from "@/services/extensionApi";
import { Page } from "./automation/page";
import { IndeedFinder } from "./indeed/finder";
import { IndeedFinder2 } from "./indeed/_finder";
import { IndeedAnalyzer } from "./indeed/analyzer";
import { IndeedForm } from "./indeed/form";
import { GPTExecutor } from "./gpt/executor";
import { Logger } from "./logger/logger";
import browser from "webextension-polyfill";
import { Role, ExtensionMessage } from "../types";
import { BaseExecutor } from "./common/BaseExecutor";

const logger = new Logger();

// Observe URL changes (for SPAs)
let url = location.href;

// Wait for page load
async function init() {
  url = location.href;
  let role: Role | null = null;
  let platform: "INDEED" | "LINKEDIN" | undefined;

  if (url.includes("chatgpt.com") || url.includes("chat.openai.com")) {
    role = "GPT";
  } else if (url.includes("indeed.com/jobs") || url.includes("indeed.com/q-")) {
    role = "FINDER";
    platform = "INDEED";
  } else if (url.includes("indeed.com/viewjob")) {
    role = "ANALYZER";
    platform = "INDEED";
  } else if (url.includes("smartapply.indeed.com")) {
    role = "FORM_FILLER";
    platform = "INDEED";
  }

  if (!role) {
    logger.debug("AutoJobApply: No active role for this page.");
    return;
  }

  logger.info(`AutoJobApply: Registering as ${role}`);

  // Register Tab
  await api.registerTab({ role, platform });

  // Initialize specific logic
  const page = new Page();
  let handler: BaseExecutor | null = null;

  if (role === "GPT") {
    handler = new GPTExecutor();
  } else if (role === "FINDER") {
    handler = new IndeedFinder(page);
  } else if (role === "ANALYZER") {
    handler = new IndeedAnalyzer(page);
  } else if (role === "FORM_FILLER") {
    handler = new IndeedForm(page);
  }

  if (handler) {
    handler.init(url);
  }

  // Mount UI
  const root = document.createElement("div");
  root.id = "auto-job-apply-root";
  document.body.appendChild(root);

  createRoot(root).render(<App />);

  // Centralized message listener
  browser.runtime.onMessage.addListener((message: any) => {
    logger.info("Content received message:", message);
    if (handler) {
      return handler.handleMessage(message as ExtensionMessage);
    }
  });

  setInterval(() => {
    if (location.href !== url) {
      url = location.href;
      logger.debug(`URL changed to: ${url}`);
      if (handler && handler.onUrlChange) {
        handler.onUrlChange(url);
      }
    }
  }, 1000);

  console.log("AutoJobApply: Content script initialized.");
}

setTimeout(init, 2000); // Give a small buffer
