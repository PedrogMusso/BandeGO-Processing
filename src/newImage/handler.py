import json
import base64
import io
import logging
from datetime import datetime # Para o timestamp

from PIL import Image
from ultralytics import YOLO

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Carregar o modelo YOLO (fora do handler para otimizar cold starts)
# Você pode especificar um modelo pré-treinado como 'yolov8n.pt' (Nano), 'yolov5s.pt' (Small), etc.
# A biblioteca Ultralytics vai baixar o modelo na primeira vez se não estiver presente.
# Para produção, é MELHOR incluir o arquivo .pt na sua imagem Docker e carregar o caminho local.
MODEL_PATH = 'yolov8n.pt' # Exemplo: YOLOv8 Nano. Leve e rápido.
try:
    model = YOLO(MODEL_PATH)
    logger.info(f"Modelo YOLO '{MODEL_PATH}' carregado com sucesso.")
except Exception as e:
    logger.error(f"Erro ao carregar o modelo YOLO: {e}", exc_info=True)
    model = None # Lidar com isso no handler

def handler(event, context):
    logger.info("Handler invocado.")
    if not model:
        logger.error("Modelo YOLO não está carregado.")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Modelo de IA não carregado'})
        }

    try:
        body_str = event.get('body', '{}')
        logger.info(f"Corpo da requisição (primeiros 100 chars): {body_str[:100]}")
        body = json.loads(body_str)
        base64_image_string = body.get('image')

        if not base64_image_string:
            logger.warning("Imagem não encontrada no corpo da requisição.")
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Imagem não fornecida no corpo da requisição'})
            }

        image_bytes = base64.b64decode(base64_image_string)
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB') # Garante 3 canais de cor
        logger.info(f"Imagem decodificada. Tamanho: {img.size}")

        # Realizar inferência com o YOLO
        # O objeto 'results' da Ultralytics é uma lista (geralmente com 1 elemento para 1 imagem)
        # Cada elemento contém informações sobre as detecções.
        results = model(img)
        logger.info("Detecção concluída.")

        people_count = 0
        detected_people_details = []

        if results and len(results) > 0:
            # Acessar as caixas delimitadoras do primeiro resultado
            boxes = results[0].boxes
            for box in boxes:
                class_id = int(box.cls) # ID da classe detectada
                class_name = model.names[class_id] # Nome da classe (ex: 'person', 'car')

                if class_name == 'person':
                    people_count += 1
                    detected_people_details.append({
                        'bbox': [round(coord) for coord in box.xyxy[0].tolist()], # [x1, y1, x2, y2] como inteiros
                        'score': float(box.conf) # Score de confiança
                    })
        
        logger.info(f"Pessoas detectadas: {people_count}")

        response_body = {
            'peopleCount': people_count,
            'people': detected_people_details,
            'processedAt': datetime.utcnow().isoformat() + "Z"
        }

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(response_body)
        }

    except json.JSONDecodeError as e:
        logger.error(f"Erro ao decodificar JSON: {e}")
        return {'statusCode': 400, 'headers': {'Content-Type': 'application/json'}, 'body': json.dumps({'error': 'JSON inválido no corpo da requisição', 'details': str(e)})}
    except base64.binascii.Error as e:
        logger.error(f"Erro ao decodificar Base64: {e}")
        return {'statusCode': 400, 'headers': {'Content-Type': 'application/json'}, 'body': json.dumps({'error': 'String base64 da imagem inválida', 'details': str(e)})}
    except Exception as e:
        logger.error(f"Erro inesperado no processamento: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Erro interno do servidor', 'details': str(e)})
        }

# Para teste local (opcional, não usado pela Lambda diretamente)
# if __name__ == '__main__':
#     # Crie um evento de teste simulado aqui
#     mock_event = {
#         "body": json.dumps({
#             "image": "SUA_STRING_BASE64_AQUI"
#         })
#     }
#     print(handler(mock_event, None))