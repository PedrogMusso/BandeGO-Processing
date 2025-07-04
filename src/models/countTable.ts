import dynamoose from "dynamoose";

const countSchema = new dynamoose.Schema(
    {
        id: {
            type: String,
            hashKey: true,
            required: true,
        },
        countPeople: {
            type: Number,
            required: true,
        },
        createdAt: {
            type: String,
            required: true,
        },
        allRecordsKey: {
            type: String,
            default: 'ALL_RECORDS',
            index: {
                name: 'CreatedAtIndex',
                project: true,
                type: 'global',
                rangeKey: 'createdAt',
            },
        },
    },
);

export const CountTable = dynamoose.model("CountTable", countSchema, {
    tableName: process.env.COUNT_TABLE || "CountTable",
});