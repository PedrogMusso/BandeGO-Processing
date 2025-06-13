import { ExplainImage } from '../utils/openAI';

interface LambdaEvent {
    body: string | { image?: string }
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
    return /^[A-Za-z0-9+/]+={0,2}$/.test(str.replace(/\n|\r/g, '')) && str.length % 4 === 0;
}

exports.handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
    // console.log('event', event);
    const parsedBody = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const image = parsedBody?.image;

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

    console.log("Image base64 length:", image.length);
    console.log("Image base64 (first 100 chars):", image.slice(0, 100));
    console.log("Starts with 'data:image':", image.startsWith("data:image"));
    console.log("Valid base64:", isValidBase64(image));

    const content = await ExplainImage(image);

    console.log('Explicação da imagem', content[0]);

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: content[0],
        }),
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
    };
};
