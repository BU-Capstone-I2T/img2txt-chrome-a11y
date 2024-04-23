/**
 * File Description:
 * This file contains the background script for the extension. It listens for messages
 * from the content script and popup page, and sends the image to the image to text (I2T) model.
 *
 * See the Chrome extension documentation for more information:
 * https://developer.chrome.com/docs/extensions/mv3/background_pages/
 */

import I2TModelXS from './i2t-model-xs';
import I2TModelL from './i2t-model-large';
import { getToken } from './auth';
import Logger from './log';
import { loadLoggingState } from './log';
import {
    ACTION_DESCRIBE_IMAGE, ACTION_LOGIN, ACTION_LOG, ACTION_FEEDBACK,
    SERVER_URL, SERVER_LOGIN_PATH, SERVER_FEEDBACK_PATH,
    DEFAULT_MODEL_SIZE
} from './constants';

const log = new Logger('background.js', getToken);
const contentScriptLog = new Logger('content.js', getToken);

// The selected I2T model
let model = null;

// Listen for messages from the content script and popup page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.name === ACTION_LOGIN) {
        // Acquire access token using login credentials from popup
        login(message.username, message.password, sendResponse);
    } else if (message.action === ACTION_DESCRIBE_IMAGE) {
        // Describe image received from content script
        describe(message, sendResponse);
    } else if (message.action === ACTION_FEEDBACK) {
        // Submit feedback received from content script
        submitFeedback(message);
        return false; // Indicate synchronous response
    } else if (message.action === ACTION_LOG) {
        // Log message from content script
        contentScriptLog.sendLog(message.message, message.level);
        return false; // Indicate synchronous response
    }
    return true; // Indicate asynchronous response
})

/**
 * Function to submit feedback to the server.
 *
 * @param {Object} message message from content script containing feedback data
 */
const submitFeedback = (message) => {
    const body = {
        score: message.feedback,
        image_url: message.url,
        alt_text: message.altText,
        timestamp: new Date().toISOString()
    }

    getToken().then((token) => {
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        }

        fetch(`${SERVER_URL}${SERVER_FEEDBACK_PATH}`, options)
            .then(response => {
                if (!response.ok) {
                    log.error(`Failed to submit feedback: ${response.status} ${response.statusText}`);
                }
            })
            .catch(err => log.error(err));
    });
};

/**
 * Request the i2t model to describe the image, and send the description back to the content script.
 *
 * @param {Object} message message from content script containing image data
 * @param {Function} sendResponse function to send response back to content script.
 *                                To learn more about the sendResponse function, see:
 *                                https://developer.chrome.com/docs/extensions/develop/concepts/messaging#simple
 */
const describe = (message, sendResponse) => {
    // Check if the message contains the necessary image data
    if (!message.height || !message.width || !message.rawImageData) {
        log.error("Invalid image data");
        return;
    }

    // Check if the model is loaded
    if (!model) {
        log.error("I2T model not yet loaded");
        return;
    }
    log.debug(`Received image to describe: ${message.url}`)

    // Convert raw image data to ImageData
    const imageData = new ImageData(
        Uint8ClampedArray.from(message.rawImageData), message.width, message.height);

    // Request the i2t model to describe the image
    model.describeImage(imageData, message.url).then((description) => {
        sendResponse({ description: description });
    }).catch((err) => {
        log.error(err);
        sendResponse({ description: "An error occurred while describing the image." });
    });
}

/**
 * Function to log in to the server.
 *
 * @param {string} user username
 * @param {string} pass password
 */
const login = (user, pass, sendResponse) => {
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({username: user, password: pass})
    };

    fetch(`${SERVER_URL}${SERVER_LOGIN_PATH}`, options)
        .then(response => {
            if (!response.ok) {
                log.error(`Failed to login: ${response.status} ${response.statusText}`);
                response.json().then(data => {
                    sendResponse({ success: false, message: data.detail, status: response.status })
                })
            } else {
                response.json().then(data => {
                    chrome.storage.sync.set({token: data.access_token});
                    sendResponse({ success: true });
                })
            }
        })
        .catch(err => console.error(err));
}

/**
 * Function to log system information.
 */
const logSystemInfo = async () => {
    let systemInfo = {};

    // Promise to get system information
    const cpuInfoPromise = new Promise((resolve) => {
        chrome.system.cpu.getInfo((info) => {
            systemInfo.cpuArch = info.archName;
            systemInfo.cpuModel = info.modelName;
            systemInfo.cpuNumOfProcessors = info.numOfProcessors;
            resolve();
        });
    });

    // Promise to get total memory capacity
    const memoryInfoPromise = new Promise((resolve) => {
        chrome.system.memory.getInfo((info) => {
            systemInfo.memoryCapacityGB = info.capacity / 1024 / 1024 / 1024;
            resolve();
        });
    });

    // Wait for both promises to resolve
    await Promise.all([cpuInfoPromise, memoryInfoPromise]);

    log.benchmark(`"systeminfo": ${JSON.stringify(systemInfo, null, 2)}`);
}

/**
 * Helper function to set the I2T model size.
 *
 * @param {string} size The size of the I2T model to set ('xs', 'l', ...)
 */
const setModel = (size) => {
    if (size === 'xs') {
        model = new I2TModelXS();
    } else if (size === 'l') {
        model = new I2TModelL();
    }
    model.load();
}

/**
 * Function to load the initial settings from Chrome storage.
 *
 * @returns {Promise} A promise that resolves when the initial settings are loaded.
 */
const loadInitialSettings = () => {
    const loadI2TSettings = new Promise((resolve, reject) => {
        chrome.storage.sync.get(['modelSize'], (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                let modelSize = result.modelSize;
                if (result.modelSize === undefined) {
                    modelSize = DEFAULT_MODEL_SIZE;
                }
                setModel(modelSize);
                resolve();
            }
        });
    })
    return Promise.all([loadI2TSettings, loadLoggingState()]);
}

// Send system info to server
logSystemInfo();

// Log memory usage every 10 seconds
setInterval(() => {
    chrome.system.memory.getInfo((info) => {
        const availableMemoryMB = info.availableCapacity / 1024 / 1024;
        log.benchmark(`Available Memory: ${availableMemoryMB.toFixed(2)} MB`);
    });
}, 10000);

// Listen for changes to extension settings
chrome.storage.sync.onChanged.addListener((changes) => {
    if (changes.modelSize) {
        setModel(changes.modelSize.newValue);
    }
});

// Load initial settings
loadInitialSettings();
