from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer

app = Flask(__name__)
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

@app.route('/embed', methods=['POST'])
def embed():
    data = request.json
    sentences = data['inputs']
    embeddings = model.encode(sentences).tolist()
    return jsonify({'embeddings': embeddings})

if __name__ == '__main__':
    app.run(port=5005)
