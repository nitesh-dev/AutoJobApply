import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./views/App.tsx";
import { Page } from "./automation/page.ts";
import { Indeed } from "./indeed/index.ts";
import { Logger } from "./logger/logger.ts";

const container = document.createElement("div");
container.id = "crxjs-app";
document.body.appendChild(container);
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);

const indeed = new Indeed(new Page(), new Logger());

let lastUrl = location.href;

setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    indeed.onNavigation();
  }
}, 500);

window.addEventListener("load", async () => {
  indeed.onLoad();
});
