FROM public.ecr.aws/lambda/nodejs:18

WORKDIR ${LAMBDA_TASK_ROOT}

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


CMD [ "dist/src/newImage/index.handler" ]
