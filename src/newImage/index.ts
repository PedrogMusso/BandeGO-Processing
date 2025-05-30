import type * as TF from '@tensorflow/tfjs-node';
import type * as COCOSSD from '@tensorflow-models/coco-ssd';

const tf: typeof TF = require('@tensorflow/tfjs-node');
const cocoSsd: typeof COCOSSD = require('@tensorflow-models/coco-ssd');

let modelPromise: Promise<COCOSSD.ObjectDetection> | null = null;

const loadModel = async (): Promise<COCOSSD.ObjectDetection> => {
  if (!modelPromise) {
    console.log("Loading COCO-SSD model...");

    modelPromise = cocoSsd.load();
  }
  try {
    const model = await modelPromise;
    console.log("COCO-SSD model loaded successfully.");
    return model;
  } catch (error) {
    console.error("Failed to load COCO-SSD model:", error);

    modelPromise = null;

    throw error;
  }
};

loadModel().catch(err => {
  console.error("Error during initial model load:", err);
});

interface LambdaEvent {
  body: { image: string }
}

interface LambdaResponse {
  statusCode: number;
  headers?: { [key: string]: string };
  body: string;
}

exports.handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  try {
    console.log("Handler invoked. Event body (raw):", event.body);

    const { image } = event.body;

    if (!image) {
      console.log("Missing image in request body.");
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing image' }) };
    }

    const imageBuffer = Buffer.from(image, 'base64');
    console.log(`Received image buffer, length: ${imageBuffer.length}`);

    const imageTensor = tf.node.decodeImage(imageBuffer, 3, 'int32', false) as TF.Tensor3D;
    console.log("Image decoded into tensor. Shape:", imageTensor.shape);

    const model = await loadModel();

    console.log("Detecting objects...");

    // Antes
    // const predictions: COCOSSD.DetectedObject[] = await model.detect(imageTensor);

    // Depois (Exemplo com novos parâmetros)
    const predictions: COCOSSD.DetectedObject[] = await model.detect(
      imageTensor,
      200,
      0.5
    );

    console.log(`Detection complete. Found ${predictions.length} objects (before filtering for person).`); // Log para ver total de detecções
        console.log('predictions', predictions);

    tf.dispose(imageTensor);
    console.log("Image tensor disposed.");


    const people = predictions.filter((p: COCOSSD.DetectedObject) => p.class === 'person');
    console.log(`Found ${people.length} people.`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        peopleCount: people.length,
        people: people.map((p: COCOSSD.DetectedObject) => ({
          bbox: p.bbox,
          score: p.score,
        })),
        processedAt: new Date().toISOString(),
      }),
    };
  } catch (error: any) {
    console.error('Error processing request:', error.message);
    console.error('Stack trace:', error.stack);
    if (error.message.includes("model")) {
      modelPromise = null;
    }
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Erro ao processar a requisicao',
        error: error.message,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  }
};
