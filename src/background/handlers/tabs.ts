import { safeHandler } from "@/utils/safeHandler";
import browser from "webextension-polyfill";


async function _openTab(url: string, active: boolean = true) {
    const newTab = await browser.tabs.create({ url, active });
    return { tabId: newTab.id };
}



async function _closeTab(tabId: number) {
    await browser.tabs.remove(tabId);
    return { closed: true };
}





async function waitForTabToLoad(tabId: number) {

    return new Promise<browser.Tabs.Tab>((resolve) => {
        const listener = (updatedTabId: number, changeInfo: browser.Tabs.OnUpdatedChangeInfoType, tab: browser.Tabs.Tab) => {
            if (tabId == updatedTabId && changeInfo.status === "complete") {
                browser.tabs.onUpdated.removeListener(listener);
                resolve(tab);
            }
        };
        browser.tabs.onUpdated.addListener(listener);
    });
}








// // exports
export const openTab = safeHandler(_openTab)
export const closeTab = safeHandler(_closeTab)
