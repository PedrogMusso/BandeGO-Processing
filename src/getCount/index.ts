import { CountTable } from "../models/countTable";

interface LambdaResponse {
    statusCode: number;
    body: {
        message: string;
        count: string;
    } | {
        message: string;
        error: unknown;
    };
}

exports.handler = async (): Promise<LambdaResponse> => {
    try {
        const result = await CountTable.query('allRecordsKey')
            .eq('ALL_RECORDS')
            .using('CreatedAtIndex')
            .sort('descending')
            .limit(1)
            .exec();

        if (!result || result.length === 0) {
            console.log('Nenhum item encontrado.');
            return {
                statusCode: 404,
                body: {
                    message: 'Nenhum item encontrado',
                    error: 'NotFound',
                }
            };
        }

        const mostRecent = JSON.stringify(result[0]);

        console.log('MostRecent', mostRecent);

        return {
            statusCode: 200,
            body: {
                message: "Sucesso em pegar a contagem",
                count: mostRecent,
            }
        };
    } catch (error) {
        console.error("Erro ao buscar o item mais recente:", error);
        return {
            statusCode: 500,
            body: {
                message: "Erro ao buscar item mais recente",
                error,
            }
        }
    }
}