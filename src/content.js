/**
 * File Description:
 * This file contains the content script for the extension. It listens for images being added
 * to the DOM and sends them to the service worker to be described.
 *
 * See the Chrome extension documentation for more information:
 * https://developer.chrome.com/docs/extensions/mv3/content_scripts/
 */

import {
    ACTION_DESCRIBE_IMAGE,
    ACTION_LOG,
    IMAGE_SIZE,
    DEFAULT_LOGGING_ENABLED,
    DEFAULT_ALT_TEXT_DISPLAY_DISABLED, DEBUG_DIV_NAME
} from "./constants";
import { LogLevels } from "./log";

let loggingEnabled = DEFAULT_LOGGING_ENABLED;
let displayEnabled = DEFAULT_ALT_TEXT_DISPLAY_DISABLED;
let divName = DEBUG_DIV_NAME;

/**
 * Send a log message to the background script, and log it to the console.
 *
 * @param {string} msg the message to log
 * @param {Object} loglevel the level of the log
 */
const log = (msg, loglevel) => {
    if (!loggingEnabled) return;
    if (loglevel === LogLevels.BENCHMARK) console.log(`[BENCHMARK]: ${msg}`);
    if (loglevel === LogLevels.ERROR) console.error(msg);
    if (loglevel === LogLevels.WARN) console.warn(msg);
    if (loglevel === LogLevels.INFO) console.info(msg);
    if (loglevel === LogLevels.DEBUG) console.debug(`[DEBUG]: ${msg}`);
    chrome.runtime.sendMessage({ action: ACTION_LOG, message: msg, level: loglevel });
}

/**
 * Removes text elements from DOM when the user clicks the left mouse button.
 *
 * @param {MouseEvent} mouseEvent the mouse event
 */
function removeTextOnLeftClick(mouseEvent) {
    if (mouseEvent.button === 0 && !displayEnabled) {
        const textDivs = document.getElementsByClassName(divName);
        for (const div of textDivs) {
            div.parentNode.removeChild(div);
        }
    }
}

// Set up a listener to remove all annotations if the user clicks
// the left mouse button.
window.addEventListener('click', removeTextOnLeftClick, false);

/**
 * Adds a text element to an image node. Used for displaying alt text on images for
 * sighted users.
 *
 * @param {HTMLImageElement} imgNode
 * @param {string} textContent
 */
function addTextElementToImageNode(imgNode, textContent) {
    const originalParent = imgNode.parentElement;
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.textAlign = 'center';
    container.style.color = 'white';
    const text = document.createElement('div');
    text.className = divName;
    text.style.position = 'absolute';
    text.style.top = '50%';
    text.style.left = '50%';
    text.style.transform = 'translate(-50%, -50%)';
    text.style.fontSize = '30px';
    text.style.fontFamily = 'Google Sans,sans-serif';
    text.style.fontWeight = '700';
    text.style.color = 'white';
    text.style.lineHeight = '1em';
    text.style['-webkit-text-fill-color'] = 'white';
    text.style['-webkit-text-stroke-width'] = '1px';
    text.style['-webkit-text-stroke-color'] = 'black';
    // Add the containerNode as a peer to the image, right next to the image.
    originalParent.insertBefore(container, imgNode);
    // Move the imageNode to inside the containerNode;
    container.appendChild(imgNode);
    // Add the text node right after the image node;
    container.appendChild(text);
    text.textContent = textContent;
}

/**
 * Sends an image to the service worker for description, and updates the alt text of the image
 * with the response from the service worker.
 * This function will be executed on each image once it is loaded.
 *
 * @param {HTMLImageElement} img The image to describe
 * @param {HTMLImageElement} drawableImg The image to draw to a canvas.
 *                                       This is necessary for CORS-protected images.
 */
const sendImageToServiceWorker = (img, drawableImg) => {
    // Check if the image url ends in .svg
    if (img.src.endsWith('.svg')) {
        log(`Image ${img.src} is an SVG and will not be described`, LogLevels.WARN);
        return;
    }

    // Check if the image already has alt text
    if (img.alt) {
        log(`Image ${img.src} already has alt text: ${img.alt}`, LogLevels.WARN);
        return;
    }

    log(`Image ${img.src} is being sent to the service worker for description`, LogLevels.DEBUG);

    const startTime = performance.now();

    // Scale the image and get the pixel data
    const canvas = new OffscreenCanvas(IMAGE_SIZE, IMAGE_SIZE);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(drawableImg, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
    const imageData = ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);

    // Create a message to send to the service worker
    message = {
        action: ACTION_DESCRIBE_IMAGE,
        url: img.src,
        rawImageData: Array.from(imageData.data),
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
    };

    // Send the data to the service worker
    chrome.runtime.sendMessage(message, (response) => {
        log(`Received response from service worker: ${JSON.stringify(response)} for image ${img.src}`, LogLevels.DEBUG);
        // Update the image caption with the response from the service worker
        img.alt = response.description;
        const totalTime = Math.floor(performance.now() - startTime);
        log(`Added image description in ${totalTime} ms`, LogLevels.BENCHMARK);
        if (displayEnabled) {
            addTextElementToImageNode(img, img.alt);
        }
    });
};

/**
 * Adds a load listener to an image element. If the image is protected by CORS, a copy of the image
 * is created with crossOrigin set to 'anonymous' so that it can be drawn to a canvas.
 *
 * When the image is loaded, it will be sent to the service worker for description.
 *
 * @param {HTMLImageElement} img the image to add the load listener to
 */
const addLoadListenerToImage = (img) => {
    if (img.crossOrigin === 'anonymous') {
        // Check if the image is already loaded (important for cached images)
        if (img.complete) {
            sendImageToServiceWorker(img, img);
        } else {
            // If the image is not yet loaded, listen for the load event
            log(`Adding load listener for image: ${img.src}`, LogLevels.DEBUG);
            img.addEventListener('load', () => sendImageToServiceWorker(img, img));
        }
    } else {
        // Create a copy of the image with crossOrigin set to anonymous so that it can be
        // drawn to a canvas. This is necessary for images that are protected by CORS.
        const drawableImg = new Image();
        drawableImg.crossOrigin = 'anonymous';
        drawableImg.onerror = () => {
            log(`Could not load image from external source: ${img.src}`, LogLevels.ERROR);
        };
        log(`Adding load listener for CORS-protected image: ${img.src}`, LogLevels.DEBUG);
        drawableImg.addEventListener('load', () => {
            sendImageToServiceWorker(img, drawableImg);
        });
        drawableImg.src = img.src;
    }
};


/**
 * Observes the DOM for changes and adds load listeners to any images that are added.
 */
const observeDOMChanges = () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                // Check if the added node is an image
                if (node.tagName === 'IMG') {
                    log("Mutation Observer updating", LogLevels.DEBUG);
                    addLoadListenerToImage(node);
                }
                // If the node has children, look for images within it
                if (node.querySelectorAll) {
                    const childImages = node.querySelectorAll('img');
                    childImages.forEach(addLoadListenerToImage);
                }
            });
        });
    });

    // Configuration of the observer:
    const config = { childList: true, subtree: true };

    // Start observing the body for added nodes
    observer.observe(document.body, config);
};

// Listen for changes to extension settings
chrome.storage.sync.onChanged.addListener((changes) => {
    if (changes.logging) {
        loggingEnabled = changes.logging.newValue;
    }
    if (changes.altText) {
        displayEnabled = changes.altText.newValue;
    }
});

// Get the initial settings
const loadInitialSettings = () => {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['logging', 'altText'], (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                loggingEnabled = result.logging;
                displayEnabled = result.altText;
                if (loggingEnabled === undefined) {
                    loggingEnabled = DEFAULT_LOGGING_ENABLED;
                } else if (displayEnabled === undefined) {
                    displayEnabled = DEFAULT_ALT_TEXT_DISPLAY_DISABLED;
                }
                resolve();
            }
        });
    });
};

/**
 * Initialize the Chrome plugin on the current page by adding load listeners to all images
 * currently in the DOM, and observing the DOM for changes to add load listeners to new images.
 */
const initialize = () => {
    log("Initializing Chrome plugin", LogLevels.DEBUG);
    document.querySelectorAll('img').forEach(addLoadListenerToImage);
    observeDOMChanges();
    log("Chrome plugin initialized", LogLevels.DEBUG);
};

// Load the initial settings and execute the initialization function
loadInitialSettings().then(initialize).catch((err) => {
    console.error(err);
});
