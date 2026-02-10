/**
 * TeachableMachineDetector.js
 * Utility for loading and running Google Teachable Machine models (Image and Pose).
 */

import * as tmImage from '@teachablemachine/image';
import * as tmPose from '@teachablemachine/pose';

class TeachableMachineDetector {
    constructor() {
        this.models = new Map(); // id -> { model, type, source }
    }

    /**
     * Load a Teachable Machine model from a URL or Files
     * @param {string} id - Unique identifier for the model
     * @param {string|Object} source - The URL or an object containing Files { model, metadata, weights }
     * @param {string} type - 'image' or 'pose'
     */
    async loadModel(id, source, type = 'image') {
        const existing = this.models.get(id);
        if (existing && existing.source === source && existing.type === type) {
            return true;
        }

        try {
            let model;
            let modelURL, metadataURL;

            if (typeof source === 'string') {
                modelURL = source + 'model.json';
                metadataURL = source + 'metadata.json';

                if (type === 'image') {
                    model = await tmImage.load(modelURL, metadataURL);
                } else {
                    model = await tmPose.load(modelURL, metadataURL);
                }
            } else if (source.model && source.metadata && source.weights) {
                // Loading from files
                if (type === 'image') {
                    model = await tmImage.loadFromFiles(source.model, source.weights, source.metadata);
                } else {
                    model = await tmPose.loadFromFiles(source.model, source.weights, source.metadata);
                }
                source = 'local-files';
            }

            if (!model) throw new Error('Failed to create model instance');

            this.models.set(id, { model, type, source });
            console.log(`✅ Teachable Machine model [${id}] (type: ${type}) loaded`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to load Teachable Machine model [${id}]:`, error);
            throw error;
        }
    }

    /**
     * Remove a model from memory
     * @param {string} id 
     */
    unloadModel(id) {
        this.models.delete(id);
    }

    /**
     * Predict classes for a specific model
     * @param {string} id
     * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} element 
     * @returns {Promise<Array>} List of predictions sorted by probability
     */
    async predict(id, element) {
        const entry = this.models.get(id);
        if (!entry || !entry.model) return [];

        try {
            let predictions = [];
            if (entry.type === 'image') {
                predictions = await entry.model.predict(element);
            } else if (entry.type === 'pose') {
                const { posenetOutput } = await entry.model.estimatePose(element);
                predictions = await entry.model.predict(posenetOutput);
            }

            return predictions.sort((a, b) => b.probability - a.probability);
        } catch (error) {
            console.error(`Error in TM prediction for [${id}]:`, error);
            return [];
        }
    }

    /**
     * Run prediction for all loaded models
     * @param {HTMLVideoElement} element 
     * @returns {Promise<Object>} Map of modelId -> topPrediction
     */
    async predictAll(element) {
        const results = {};
        const promises = Array.from(this.models.keys()).map(async (id) => {
            const preds = await this.predict(id, element);
            if (preds && preds.length > 0) {
                results[id] = preds[0];
            }
        });
        await Promise.all(promises);
        return results;
    }
}

const tmDetector = new TeachableMachineDetector();
export default tmDetector;
