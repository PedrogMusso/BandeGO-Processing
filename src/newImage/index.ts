import { APIGatewayProxyHandler } from 'aws-lambda';
import * as tf from '@tensorflow/tfjs-node'; // Certifique-se de que está usando @tensorflow/tfjs-node
import * as cocoSsd from '@tensorflow-models/coco-ssd';
// A biblioteca 'canvas' (createCanvas, loadImage) não é mais necessária para a conversão da imagem para tensor
// se usarmos tf.node.decodeImage. Mantenha apenas se precisar dela para outras manipulações de imagem.

// Carrega o modelo COCO-SSD fora do handler.
// Isso permite que o modelo seja reutilizado entre invocações da Lambda (warm starts),
// economizando tempo de carregamento.
let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;

const loadModel = async (): Promise<cocoSsd.ObjectDetection> => {
  if (!modelPromise) {
    console.log("Loading COCO-SSD model...");
    // Você pode adicionar opções de configuração ao load(), se necessário.
    // Ex: cocoSsd.load({ base: 'mobilenet_v2' });
    modelPromise = cocoSsd.load();
  }
  try {
    const model = await modelPromise;
    console.log("COCO-SSD model loaded successfully.");
    return model;
  } catch (error) {
    console.error("Failed to load COCO-SSD model:", error);
    // Se o modelo falhar ao carregar, resetamos a promise para tentar novamente na próxima invocação.
    modelPromise = null;
    throw error; // Propaga o erro para que a invocação da Lambda falhe adequadamente.
  }
};

// Inicia o carregamento do modelo assim que o container Lambda é inicializado.
// Não bloqueia a execução, mas o primeiro request pode ter que esperar se ainda não carregou.
loadModel().catch(err => {
  // Logar o erro é importante, mas não queremos que uma falha no pré-carregamento
  // derrube o container inteiro se ele puder se recuperar na primeira chamada.
  console.error("Error during initial model load:", err);
});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    console.log("Handler invoked. Event body:", event.body ? event.body.substring(0, 200) + '...' : 'null'); // Log truncado do body
    const body = JSON.parse(event.body || '{}');

    if (!body.image) {
      console.log("Missing image in request body.");
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing image' }) };
    }

    const imageBuffer = Buffer.from(body.image, 'base64');
    console.log(`Received image buffer, length: ${imageBuffer.length}`);

    // Usa tf.node.decodeImage para converter o buffer da imagem diretamente em um tensor.
    // O '3' indica que queremos 3 canais de cor (RGB).
    // decodeImage retorna um Tensor3D (para PNG, JPEG) ou Tensor4D (para GIFs).
    // Para cocoSsd, precisamos de um Tensor3D.
    const imageTensor = tf.node.decodeImage(imageBuffer, 3, 'int32', false) as tf.Tensor3D;
    console.log("Image decoded into tensor. Shape:", imageTensor.shape);


    // Carrega o modelo (ou obtém a instância já carregada).
    const model = await loadModel();

    console.log("Detecting objects...");
    // O método detect do coco-ssd aceita um Tensor3D.
    const predictions = await model.detect(imageTensor);
    console.log(`Detection complete. Found ${predictions.length} objects.`);

    // Libera a memória do tensor da imagem, pois não é mais necessário.
    tf.dispose(imageTensor);
    console.log("Image tensor disposed.");

    const people = predictions.filter(p => p.class === 'person');
    console.log(`Found ${people.length} people.`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Considere restringir em produção
      },
      body: JSON.stringify({
        peopleCount: people.length,
        people: people.map(p => ({
          bbox: p.bbox,    // [x, y, width, height]
          score: p.score,  // Confiança da detecção
        })),
        // Opcional: incluir timestamp ou ID da requisição
        processedAt: new Date().toISOString(),
      }),
    };
  } catch (error: any) {
    console.error('Error processing request:', error.message);
    console.error('Stack trace:', error.stack);
    // Em caso de erro, também é bom limpar a modelPromise se o erro for relacionado ao modelo
    // para tentar recarregar na próxima vez.
    if (error.message.includes("model")) { // Heurística simples
        modelPromise = null;
    }
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Erro ao processar a requisicao',
        error: error.message,
        // stack: process.env.NODE_ENV === 'development' ? error.stack : undefined, // Opcional: stack em dev
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  }
};
