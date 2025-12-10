import browser from "webextension-polyfill";
import { dispatch } from "./dispatcher";

browser.runtime.onMessage.addListener((msg: any) => {
    return dispatch(msg);
});

console.log('[CRXJS] Hello world from background script!')

// browser.runtime.onMessage.addListener((message, sender) => {

// })















