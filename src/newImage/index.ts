import { ProcessImage } from '../utils/openAI';
import { CountTable } from "../models/countTable";
import { v4 as uuidv4 } from 'uuid';

interface LambdaEvent {
  body: { image: string }
}

interface LambdaResponse {
  statusCode: number;
  body: string;
  headers: {
    "Content-Type": string;
    "Access-Control-Allow-Origin": string;
  };
}

exports.handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
    const parsedBody = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const image = parsedBody?.image;
    console.log('Imagem em Base64', image);
    if (!image) {
        console.error("Imagem não encontrada no body");
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Imagem não encontrada no body" }),
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        };
    }

  const count = await ProcessImage(image);

  console.log('Contagem: ', count[0])

  const createdAt = new Date().toISOString();

  console.log('Data gerada com sucesso', createdAt);

  await CountTable.batchPut([{
    id: uuidv4(),
    countPeople: parseInt(count[0]),
    createdAt: createdAt,
    allRecordsKey: 'ALL_RECORDS',
  }]);

  console.log('Sucesso em salvar no DynamoDB');

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Sucesso em contar as pessoas',
      count: count[0],
    }),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
  };
};
