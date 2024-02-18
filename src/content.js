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

// This function will be executed on each image once it is loaded
const sendImageToServiceWorker = (image) => {
    // TODO: serialize the image and send it to the service worker to be fed into the image
    //       captioning model (see TF project). The service worker will reply with a message,
    //       and the content script will update the image caption of the corresponding URL
    //       (or id). If using id, then we will need to set the id first!

    // For now, we will just send the image URL to the service worker
    chrome.runtime.sendMessage({ action: ACTION_DESCRIBE_IMAGE, url: image.src }, (response) => {
        console.debug('Received response from service worker:', response);
        // Update the image caption with the response from the service worker
        image.alt = response.description;
    });
};

// Function to add a 'load' event listener to an image
const addLoadListenerToImage = (image) => {
    // Check if the image is already loaded (important for cached images)
    if (image.complete) {
        sendImageToServiceWorker(image);
    } else {
        // If the image is not yet loaded, listen for the load event
        image.addEventListener('load', () => sendImageToServiceWorker(image));
    }
};

// Observe the DOM for added images
const observeDOMChanges = () => {
    // TODO: Use a newer API to observe the DOM for added images... this throws a warning
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                // Check if the added node is an image
                if (node.tagName === 'IMG') {
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
    document.querySelectorAll('img').forEach(addLoadListenerToImage);
    observeDOMChanges();
};

// Execute the initialization function
initialize();
