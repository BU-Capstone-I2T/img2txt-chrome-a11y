/**
 * File Description:
 * This file contains the background script for the extension. It listens for messages
 * from the content script and sends the image URL to the server to be described.
 *
 * See the Chrome extension documentation for more information:
 * https://developer.chrome.com/docs/extensions/mv3/background_pages/
 */

// Constants
const ACTION_DESCRIBE_IMAGE = 'DESCRIBE_IMAGE';
const SERVER_URL = 'http://localhost:8000';
const SERVER_DESCRIBE_PATH = "/describe";

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === ACTION_DESCRIBE_IMAGE) {
        console.debug('Received request to describe image:', request.url)

        // Send the image URL to the server to be described
        fetch(`${SERVER_URL}${SERVER_DESCRIBE_PATH}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: request.url }),
        })

        // Check if the server responded with an error
        .then(response => {
            if (!response.ok) {
                console.error(`Server responded with ${response.status} ${response.statusText}`)
                if (response.status === 422) {
                    throw new Error('Invalid image URL: ' + request.url);
                }
                throw new Error('Server failed to describe the image');
            }
            return response;
        // Parse the response as JSON
        }).then(response => {
            return response.json();
        })
        // Send the description back to the content script
        .then(data => {
            sendResponse({ description: data.description });
        })
        // Handle any errors that occurred during the request
        .catch(error => {
            console.error('Failed to get image description:', error);
            sendResponse({ description: error.message });
        });
    }
    return true; // Required to keep the message channel open while waiting for the response
});
