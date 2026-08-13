import base64
import json
import requests


IMAGE_PATH_1 = "./test_img/srkreg.jpg"
IMAGE_PATH_2 = "./test_img/aryankhan.jpg"


SERVICE_URL = (
    "http://127.0.0.1:5001/extract-embeddings"
)


def image_to_base64(path):
    with open(path, "rb") as file:
        return base64.b64encode(
            file.read()
        ).decode("utf-8")


payload = {
    "images": [
        image_to_base64(IMAGE_PATH_1),
        image_to_base64(IMAGE_PATH_2),
    ]
}


response = requests.post(
    SERVICE_URL,
    json=payload,
    timeout=120,
)


print(
    "HTTP status:",
    response.status_code,
)

print(
    json.dumps(
        response.json(),
        indent=2,
    )
)