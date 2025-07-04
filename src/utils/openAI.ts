import OpenAI from "openai";
import { getSecretFromSSM } from "./ssm";

export async function ProcessImage(image: string) {
  const openAiKey = await getSecretFromSSM("openAiKey");

  const openai = new OpenAI({ apiKey: openAiKey });

  const base64WithPrefix = `data:image/png;base64,${image}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that receives a base64 image and counts people in it. You only answer with the number of people, nothing else. If you can't determinate how many people there are in the image, just answers 0.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Count the number of people in this image. If you don't see any people, return 0. If you can't determinate how many people there are in the image, just answers 0.",
            },
            {
              type: "image_url",
              image_url: {
                url: base64WithPrefix,
              },
            },
          ],
        },
      ],
      max_completion_tokens: 1000,
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;

    if (content) {
      return [content.trim()];
    } else {
      return [];
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error", error);
    } else {
      console.error("Erro desconhecido");
    }
    return [];
  }
}

export async function ExplainImage(image: string) {
  const openAiKey = await getSecretFromSSM("openAiKey");

  const openai = new OpenAI({ apiKey: openAiKey });

  const base64WithPrefix = `data:image/png;base64,${image}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that receives a base64 image and explains what you see in the picture. Your response must be in portuguese.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Explain in portuguese what you understand about this image",
            },
            {
              type: "image_url",
              image_url: {
                url: base64WithPrefix,
              },
            },
          ],
        },
      ],
      max_completion_tokens: 1000,
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;

    if (content) {
      return [content.trim()];
    } else {
      return [];
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error", error);
    } else {
      console.error("Erro desconhecido");
    }
    return [];
  }
}
