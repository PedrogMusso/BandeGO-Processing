import { ExplainImage } from "../utils/openAI";

interface LambdaEvent {
  body: string | { image?: string };
}

interface LambdaResponse {
  statusCode: number;
  body: string;
  headers: {
    "Content-Type": string;
    "Access-Control-Allow-Origin": string;
  };
}

function isValidBase64(str: string) {
  return (
    /^[A-Za-z0-9+/]+={0,2}$/.test(str.replace(/\n|\r/g, "")) &&
    str.length % 4 === 0
  );
}

exports.handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  const parsedBody =
    typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  const image = parsedBody?.image;

  if (!image) {
    console.error("Imagem não encontrada no body");
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Imagem não encontrada no body" }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    };
  }

  const content = await ExplainImage(image);

  console.log("Explicação da imagem", content[0]);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: content[0],
    }),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  };
};
