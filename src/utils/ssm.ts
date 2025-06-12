 import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssmClient = new SSMClient({ region: "us-east-1" });

export const getSecretFromSSM = async (secretName: string): Promise<string | undefined> => {
    try {
        const command = new GetParameterCommand({
            Name: secretName,
            WithDecryption: true,
        });
        const response = await ssmClient.send(command);
        return response.Parameter?.Value;
    } catch (error) {
        console.error(`Erro ao buscar segredo ${secretName} do SSM`, error);
        throw new Error("Não foi possível carregar as configurações da aplicação.");
    }
};
