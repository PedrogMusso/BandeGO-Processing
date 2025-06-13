import { CountTable } from "../models/countTable";

interface LambdaResponse {
    statusCode: number;
    body: string;
    headers: {
        "Content-Type": string;
        "Access-Control-Allow-Origin": string;
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
                body: JSON.stringify({
                    message: 'Nenhum item encontrado',
                    error: 'NotFound',
                }),
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
            };
        }

        const mostRecentCount = result[0].toJSON();

        console.log('Result received', mostRecentCount);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Sucesso em pegar a contagem",
                count: mostRecentCount.countPeople,
            }),
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
        };
    } catch (error) {
        console.error("Erro ao buscar o item mais recente:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Erro ao buscar item mais recente",
                error,
            }),
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
        }
    }
}