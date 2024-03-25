/**
 * File Description:
 * This file contains the content script for the extension. It listens for images being added
 * to the DOM and sends them to the service worker to be described.
 *
 * See the Chrome extension documentation for more information:
 * https://developer.chrome.com/docs/extensions/mv3/content_scripts/
 */

// Constants
const ACTION_DESCRIBE_IMAGE = 'DESCRIBE_IMAGE';
const ACTION_LOG = 'LOG';
const ACTION_ERROR = 'ERROR';

// Size of the image expected by mobilenet.
const IMAGE_SIZE = 224;

// logs messages
function log(message) {
    console.log(message);
    chrome.runtime.sendMessage({name: ACTION_LOG, msg: message});
}


// logs errors
function logError(message) {
    const sta = new Error().stack;
    chrome.runtime.sendMessage({name: ACTION_ERROR, msg: message, stack: sta})
}


// This function will be executed on each image once it is loaded
const sendImageToServiceWorker = (img, drawableImg) => {
    // Check if the image url ends in .svg
    if (img.src.endsWith('.svg')) {
        log(`Image ${img.src} is an SVG and will not be described`);
        return;
    }

    // Check if the image already has alt text
    if (img.alt) {
        log(`Image ${img.src} already has alt text: ${img.alt}`);
        return;
    }

    log(`Image ${img.src} is being sent to the service worker for description`);

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
        log(`Received response from service worker: ${JSON.stringify(response)} for image ${img.src}`);
        // Update the image caption with the response from the service worker
        img.alt = response.description;
    });
};


// Function to add a 'load' event listener to an image
const addLoadListenerToImage = (img) => {
    if (img.crossOrigin === 'anonymous') {
        // Check if the image is already loaded (important for cached images)
        if (img.complete) {
            sendImageToServiceWorker(img, img);
        } else {
            // If the image is not yet loaded, listen for the load event
            log(`Adding load listener for image: ${img.src}`)
            img.addEventListener('load', () => sendImageToServiceWorker(img, img));
        }
    } else {
        // Create a copy of the image with crossOrigin set to anonymous so that it can be
        // drawn to a canvas. This is necessary for images that are protected by CORS.
        const drawableImg = new Image();
        drawableImg.crossOrigin = 'anonymous';
        drawableImg.onerror = () => {
            logError(`Could not load image from external source: ${img.src}`);
        };
        log(`Adding load listener for CORS-protected image: ${img.src}`)
        drawableImg.addEventListener('load', () => {
            sendImageToServiceWorker(img, drawableImg);
        });
        drawableImg.src = img.src;
    }
};


// Observe the DOM for added images
const observeDOMChanges = () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                // Check if the added node is an image
                if (node.tagName === 'IMG') {
                    log("Mutation Observer updating")
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


// Add event listeners to all images currently in the DOM
const initialize = () => {
    log("Initializing Chrome plugin");
    document.querySelectorAll('img').forEach(addLoadListenerToImage);
    observeDOMChanges();
    log("Chrome plugin initialized");
};

// Execute the initialization function
initialize();
