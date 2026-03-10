import mqtt from 'mqtt';

/**
 * IoT Connector Utility
 * Handles MQTT connections and maps incoming messages to application triggers.
 */
class IOTConnector {
    constructor() {
        this.client = null;
        this.subscriptions = new Map();
        this.status = 'disconnected';
    }

    /**
     * Connect to an MQTT broker
     * @param {string} brokerUrl - e.g., 'ws://broker.emqx.io:8083/mqtt' (Websocket for browser)
     */
    connect(brokerUrl = 'ws://broker.emqx.io:8083/mqtt') {
        if (this.client) return;

        console.log(`Connecting to MQTT broker: ${brokerUrl}`);
        this.client = mqtt.connect(brokerUrl);

        this.client.on('connect', () => {
            this.status = 'connected';
            console.log('Successfully connected to MQTT broker');
            // Resubscribe to existing topics if any
            this.subscriptions.forEach((callback, topic) => {
                this.client.subscribe(topic);
            });
        });

        this.client.on('message', (topic, message) => {
            const payload = message.toString();
            console.log(`MQTT Received [${topic}]: ${payload}`);

            if (this.subscriptions.has(topic)) {
                this.subscriptions.get(topic)(payload);
            }
        });

        this.client.on('error', (err) => {
            this.status = 'error';
            console.error('MQTT Connection Error:', err);
        });

        this.client.on('close', () => {
            this.status = 'disconnected';
            console.log('MQTT Connection Closed');
        });
    }

    /**
     * Subscribe to a topic with a callback
     * @param {string} topic 
     * @param {Function} callback 
     */
    subscribe(topic, callback) {
        this.subscriptions.set(topic, callback);
        if (this.client && this.client.connected) {
            this.client.subscribe(topic);
        }
    }

    /**
     * Unsubscribe from a topic
     * @param {string} topic 
     */
    unsubscribe(topic) {
        this.subscriptions.delete(topic);
        if (this.client && this.client.connected) {
            this.client.unsubscribe(topic);
        }
    }

    /**
     * Publish a message to a topic
     * @param {string} topic 
     * @param {string} message 
     */
    publish(topic, message) {
        if (this.client && this.client.connected) {
            this.client.publish(topic, message);
        }
    }
}

const iotConnector = new IOTConnector();
export default iotConnector;
