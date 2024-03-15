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
        if (!predictions || predictions.length < 1) {
            return `No prediction 🙁`;
        }
        // Confident.
        if (predictions[0].probability >= HIGH_CONFIDENCE_THRESHOLD) {
            return `😄 ${predictions[0].className}!`;
        }
        // Not Confident.
        if (predictions[0].probability >= LOW_CONFIDENCE_THRESHOLD &&
            predictions[0].probability < HIGH_CONFIDENCE_THRESHOLD) {
            return `${predictions[0].className}?...\n Maybe ${predictions[1].className}?`;
        }
        // Very not confident.
        if (predictions[0].probability < LOW_CONFIDENCE_THRESHOLD) {
            return `😕  ${predictions[0].className}????...\n Maybe ${predictions[1].className}????`;
        }
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
