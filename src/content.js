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


// Feedback logging mechanism
function logImageDetails() {
    const selectedImage = window.getSelection().anchorNode;
    if (selectedImage && selectedImage.tagName === 'IMG') {
        const url = selectedImage.src;
        const altText = selectedImage.alt;
        const textContent = 'good';
        console.log(`URL: ${url}, Alt Text: ${altText}, Text Content: ${textContent}`);
    } else {
        console.log('No image selected or not an image element.');
    }
}
logImageDetails();


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
const sendImageToServiceWorker = (image) => {
    // Check if the image already has alt text
    if (image.alt) {
        log("Image " + image.src + " already has alt text: " + image.alt);
        return;
    }
    // TODO: serialize the image and send it to the service worker to be fed into the image
    //       captioning model (see TF project). The service worker will reply with a message,
    //       and the content script will update the image caption of the corresponding URL
    //       (or id). If using id, then we will need to set the id first!
    // For now, we will just send the image URL to the service worker
    chrome.runtime.sendMessage({ action: ACTION_DESCRIBE_IMAGE, url: image.src }, (response) => {
        console.debug('Received response from service worker:', response);
        // Update the image caption with the response from the service worker
        image.alt = response.description;
        log("URL, text: " + image.url + " " + image.alt)
    });
};


// Function to add a 'load' event listener to an image
const addLoadListenerToImage = (image) => {
    // Check if the image is already loaded (important for cached images)
    if (image.complete) {
        log("sent image to service worker: " + image)
        sendImageToServiceWorker(image);
    } else {
        // If the image is not yet loaded, listen for the load event
        log("add load listener for image: " + image)
        image.addEventListener('load', () => sendImageToServiceWorker(image));
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
    log("Chrome plugin initialized")
    document.querySelectorAll('img').forEach(addLoadListenerToImage);
    observeDOMChanges();
};

// Execute the initialization function
initialize();
