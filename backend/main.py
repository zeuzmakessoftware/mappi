from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
import base64
import os
from dotenv import load_dotenv

load_dotenv('../.env.local')

app = Flask(__name__)

CORS(app)

client = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
)

def encode_image(image_bytes):
    return base64.b64encode(image_bytes).decode('utf-8')

@app.route('/', methods=['POST'])
def analyze_image_and_chat():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        image_file = request.files['file']

        if image_file.filename == '':
            return jsonify({"error": "Empty file provided"}), 400

        base64_image = encode_image(image_file.read())

        vision_response = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", 
                            "text": "You are an AI vision model specialized in assessing disability accessibility in street images. Given an image of a street, analyze the features relevant to accessibility, such as the presence of wheelchair ramps, curb cuts, tactile paving, accessible crosswalk signals, and obstructions.\n\nYour response should be in JSON format with the following structure:\n\n{\n  \"disability_accessibility\": true or false,\n  \"accessibility_explanation\": \"Brief explanation of why the image is or isn't accessible.\"\n}\n\nGuidelines:\n- If the image includes features that make it accessible (e.g., ramps, curb cuts, wide pathways, absence of obstacles), set `disability_accessibility` to `true`.\n- If the image lacks accessibility features or has barriers (e.g., no curb cuts, narrow sidewalks, steep inclines, blocked pathways), set `disability_accessibility` to `false`.\n- Keep the `accessibility_explanation` concise and directly related to the observed features.\n- Do NOT include any additional information or explanations outside the JSON response.\n- Your response must be strictly JSON format with no extra text.\n\nExample outputs:\n\nAccessible street:\n{\n  \"disability_accessibility\": true,\n  \"accessibility_explanation\": \"The sidewalk has curb cuts, a wheelchair-accessible ramp, and a tactile guide path.\"\n}\n\nInaccessible street:\n{\n  \"disability_accessibility\": false,\n  \"accessibility_explanation\": \"No curb cuts, uneven pavement, and a narrow sidewalk obstruct accessibility.\"\n}\n"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                            },
                        },
                    ],
                }
            ],
            model="llama-3.2-11b-vision-preview",
        )
        vision_model_output = vision_response.choices[0].message.content

        print(vision_model_output)

        return jsonify({"vision_model_output": vision_model_output}), 200

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)