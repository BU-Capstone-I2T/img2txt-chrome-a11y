/**
 * File Description:
 * This file contains the extra small AI model for the Image to Text feature.
 *
 * It uses a mobilenet image classifier to generate a list of predictions,
 * and then uses a simple NLP model (no ML, only if/else statements) to convert
 * the predictions into a text description.
 */
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as tf from '@tensorflow/tfjs';

// Size of the image expected by mobilenet.
const IMAGE_SIZE = 224;

// How many predictions to take.
const TOPK_PREDICTIONS = 2;
const FIVE_SECONDS_IN_MS = 5000;

/**
 * Async loads a mobilenet on construction.  Subsequently handles
 * requests to classify images through the .analyzeImage API.
 * Successful requests will post a chrome message with
 * 'IMAGE_CLICK_PROCESSED' action, which the content.js can
 * hear and use to manipulate the DOM.
 */
class ImageClassifier {
    constructor() {
        this.loadModel();
    }

    /**
     * Loads mobilenet from URL and keeps a reference to it in the object.
     */
    async loadModel() {
        console.log('Loading model...');
        const startTime = performance.now();
        try {
            this.model = await mobilenet.load({ version: 2, alpha: 1.00 });
            // Warms up the model by causing intermediate tensor values
            // to be built and pushed to GPU.
            tf.tidy(() => {
                this.model.classify(tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3]));
            });
            const totalTime = Math.floor(performance.now() - startTime);
            console.log(`Model loaded and initialized in ${totalTime} ms...`);
        } catch (e) {
            console.error('Unable to load model', e);
        }
    }

    /**
     * Triggers the model to make a prediction on the image referenced by the
     * image data.
     *
     * @param {ImageData} imageData ImageData of the image to analyze.
     * @param {string} url url of image to analyze.
     *
     * @return {Array} Array of predictions.
     */
    async analyzeImage(imageData, url) {
        if (!this.model) {
            console.log('Waiting for model to load...');
            setTimeout(
                () => { this.analyzeImage(imageData, url) }, FIVE_SECONDS_IN_MS);
            return;
        }
        console.log(`Predicting... ${url}`);
        const startTime = performance.now();
        const predictions = await this.model.classify(imageData, TOPK_PREDICTIONS);
        const totalTime = performance.now() - startTime;
        console.log(`Done in ${totalTime.toFixed(1)} ms `);
        return predictions;
    }
}


// Thresholds for LOW_CONFIDENCE_THRESHOLD and HIGH_CONFIDENCE_THRESHOLD,
// controlling which messages are printed.
const HIGH_CONFIDENCE_THRESHOLD = 0.5;
const LOW_CONFIDENCE_THRESHOLD = 0.1;

class NLPModel {

    /**
     * Produces a short text string summarizing the prediction
     * Input prediction should be a list of {className: string, prediction: float}
     * objects.
     */
    textContentFromPrediction(predictions) {
        // no predictions
        if (!predictions || predictions.length < 1) {
            return `Image unclear`;
        }
        // seperate predictions based on confidence
        let highpred = [];
        let midpred = [];
        let lowpred = [];
        // grab confident predictions
        const high = predictions.filter(prediction => prediction.probability >= HIGH_CONFIDENCE_THRESHOLD);
        if (high.length > 0) {
            highpred = high.map(prediction => prediction.className);
        }
        // grab mid predictions
        const mid = predictions.filter(prediction => prediction.probability >= LOW_CONFIDENCE_THRESHOLD && prediction.probability < HIGH_CONFIDENCE_THRESHOLD);
        if (mid.length > 0) {
            midpred = mid.map(prediction => prediction.className);
        }
        // grab low predictions
        const low = predictions.filter(prediction => prediction.probability < LOW_CONFIDENCE_THRESHOLD);
        if (low.length > 0) {
            lowpred = low.map(prediction => prediction.className);
        }
        // result statement
        let result = "Image that ";
        if (highpred.length > 0) {
            result += "contains ";
            if (highpred.length > 1) {
                result += `${highpred.slice(0, -1).join(', ')} and ${highpred[highpred.length - 1]}`;
            } else {
                result += `${highpred[0]}`;
            }
        }
        if (midpred.length > 0) {
            if (highpred.length > 0) {
                result += " and maybe has ";
            } else {
                result += "may contain ";
            }
            if (midpred.length > 1) {
                result += `${midpred.slice(0, -1).join(', ')} and ${midpred[midpred.length - 1]}`;
            } else {
                result += `${midpred[0]}`;
            }
        }
        if (lowpred.length > 0) {
            if (highpred.length === 0 && midpred.length === 0) {
                result += "possibly contains ";
            } else {
                result += " and could possibly have ";
            }
            if (lowpred.length > 1) {
                result += `${lowpred.slice(0, -1).join(', ')} and ${lowpred[lowpred.length - 1]}`;
            } else {
                result += `${lowpred[0]}`;
            }
            result += ".";
        }
        return result;
    }
}

export default class I2TModelXS {
    /**
     * Loads and initializes the image image-to-text model.
     */
    constructor() {
        this.imageClassifier = new ImageClassifier();
        this.nlpModel = new NLPModel();
    }

    /**
     * Analyzes the image and returns a text description.
     *
     * @param {ImageData} imageData The image data to analyze.
     * @param {string} url The URL of the image to analyze.
     */
    async describeImage(imageData, url) {
        return this.imageClassifier.analyzeImage(imageData, url).then((predictions) =>
            this.nlpModel.textContentFromPrediction(predictions)
        );
    }
}
