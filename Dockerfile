# Use uma imagem base oficial da AWS Lambda para Python 3.9 (ou 3.10, 3.11)
FROM public.ecr.aws/lambda/python:3.9

# Define o diretório de trabalho dentro do contêiner
WORKDIR ${LAMBDA_TASK_ROOT}

# Copia o arquivo de dependências primeiro para aproveitar o cache do Docker
COPY requirements.txt ./

# Instala as dependências Python
# --no-cache-dir é usado para reduzir o tamanho da imagem
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código do handler
COPY src/newImage/handler.py ./handler.py 
# Mantém o handler.py na raiz do WORKDIR

# Se você baixar o modelo .pt, copie-o também:
# COPY yolov8n.pt ./yolov8n.pt

# Define o CMD para o seu handler Python.
CMD [ "handler.handler" ]