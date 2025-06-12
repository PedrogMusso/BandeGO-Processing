import { ProcessImage } from '../utils/openAI';
import { CountTable } from "../models/countTable";
import { v4 as uuidv4 } from 'uuid';

interface LambdaEvent {
  body: { image: string }
}

interface LambdaResponse {
  statusCode: number;
  body: {
    message: string;
    count: string;
  };
  headers: {
    "Content-Type": string;
    "Access-Control-Allow-Origin": string;
  };
}

exports.handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  const { image } = event.body;

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
    body: {
      message: 'Sucesso em contar as pessoas',
      count: count[0],
    },
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
  };
};
