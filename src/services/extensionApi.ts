// services/extensionApi.ts
import { ChromeApiResponse} from "@/background/type";
import browser from "webextension-polyfill";

type RequestMessage = {
    action: string;
    data?: any;
};

export async function sendMessage<T>(msg: RequestMessage): Promise<ChromeApiResponse<T>> {
    return browser.runtime.sendMessage(msg);
}

// // Specific API functions
// export function getAllTabs() {
//     return sendMessage<GetAllTabRes[]>({
//         action: "getAllTabs",
//     });
// }


