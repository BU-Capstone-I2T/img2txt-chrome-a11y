/**
 * File Description: This file contains the JavaScript code for the options page.
 * This is needed to make the page functional. The HTML just provides the structure.
 *
 * See the Chrome extension documentation for more information:
 * https://developer.chrome.com/docs/extensions/develop/ui/options-page
 */

// Objects for developers to easily view and update model size / priority mappings
const priorityToModelSizeMap = {
    'Efficiency': 'xs',
    'Quality': 'l'
}
const modelSizeToPriorityMap = {
    'xs': 'Efficiency',
    'l': 'Quality'
}

/**
 * Helper function to convert a priority to a model size.
 *
 * @param {string} priority
 * @returns {string} The model size corresponding to the given priority.
 *  *                Returns 'undefined' if the priority is not implemented.

 */
const priorityToModelSize = (priority) => {
    const modelSize = priorityToModelSizeMap[priority];
    if (!modelSize) {
        console.error(`Priority not implemented: ${priority}`);
    }
    return modelSize;
}

/**
 * Helper function to convert a model size to a priority.
 *
 * @param {string} modelSize
 * @returns {string} The priority corresponding to the given model size.
 *                   Returns 'undefined' if the model size is not implemented.
 */
const modelSizeToPriority = (modelSize) => {
    const priority = modelSizeToPriorityMap[modelSize];
    if (!priority) {
        console.error(`Model size not implemented: ${modelSize}`);
    }
    return priority;
}

/**
 * Function to save the selected options to Chrome storage.
 * Will also display a confirmation message to the user.
 */
const saveOptions = () => {
    const priority = document.querySelector('#performanceForm input[name="priority"]:checked').value;
    const modelSize = priorityToModelSize(priority);
    const loggingEnabled = document.getElementById('loggingToggle').checked;
    const altTextEnabled = document.getElementById('altTextToggle').checked;
    chrome.storage.sync.set({modelSize: modelSize, logging: loggingEnabled, altText: altTextEnabled}, () => {
        // Announce the save confirmation
        const status = document.getElementById('status');
        status.textContent = `Settings saved. Priority: ${priority}, Logging: ${loggingEnabled ? 'Enabled' : 'Disabled'}, Alt Text Display: ${altTextEnabled ? 'Enabled' : 'Disabled'}.`;
        status.style.visibility = 'visible';
        setTimeout(() => status.style.visibility = 'hidden', 4000);
    });
}

/**
 * Function to load the options from Chrome storage.
 */
const restoreOptions = () => {
    chrome.storage.sync.get(['modelSize', 'logging', 'altText'], (result) => {
        if (result.modelSize) {
            const priority = modelSizeToPriority(result.modelSize);
            document.getElementById(priority.toLowerCase()).checked = true;
        } else {
            document.getElementById('efficiency').checked = true;
        }
        document.getElementById('loggingToggle').checked = result.logging || false;
        document.getElementById('altTextToggle').checked = result.altText || false;
    });
}

// Add event listeners to the save button and the page load
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
