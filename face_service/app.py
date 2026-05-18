from flask import Flask, request, jsonify
import face_recognition
import numpy as np
import cv2
import base64
import io
import tempfile
import os

app = Flask(__name__)

# Health check
@app.route('/health', methods = ['GET'])
def health():
    return jsonify({"status":"ok"})


# Register: extract embedding from a single-person image
@app.route('/extract-embedding', methods=['POST'])
def extract_embedding():
    """
    Input:  { "image_b64": "<base64 encoded image>" }
    Output: { "embedding": [128 floats] }
    Errors: { "error": "no_face_detected" | "multiple_faces_detected" }
    """
    data = request.get_json()
    if not data or 'image_b64' not in data:
        return jsonify({"error": "image_b64 required"}), 400
    
    try:
        image_bytes = base64.b64decode(data['image_b64'])
        image = face_recognition.load_image_file(io.BytesIO(image_bytes))
    except Exception:
        return jsonify({"error": "invalid_image"}), 400
    
    # using HOG model for now, will later try CNN
    face_locations = face_recognition.face_locations(image, model = 'hog')
    
    if len(face_locations)==0:
        return jsonify({"error": "no_face_detected"}), 400
    
    if len(face_locations)>1 :
        return jsonify({
            "error": "multiple_faces_detected",
            "count": len(face_locations)
        }), 400
        
    encodings = face_recognition.face_encodings(image, face_locations)
    embedding = encodings[0].tolist() # numpy array converted to JSON-serializable list
    
    return jsonify({"embedding": embedding})


# matching faces in uploaded image or video against known students
@app.route('/recognize', methods = ['POST'])
def recognize():
    """
    Input:
    {
      "image_b64": "...",    ← provide one of these
      "video_b64": "...",    ←
      "students": [
        { "id": "uuid", "embedding": [128 floats] },
        ...
      ],
      "threshold": 0.5       ← optional. Lower = stricter match. Default 0.5
    }
    Output:
    {
      "recognized": [{ "id": "uuid", "confidence": 0.87 }, ...],
      "frames_processed": 12,
      "faces_found": 3
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    students = data.get('students', [])
    threshold = float(data.get('threshold', 0.5))
    
    if not students:
        return jsonify({"error": "No students provided"}), 400
    
    known_ids = [s['id'] for s in students]
    known_encodings = [np.array(s['embedding']) for s in students]
    
    # Collect frames to process
    frames = []
    
    if 'image_b64' in data:
        try:
            image_bytes = base64.b64decode(data['image_b64'])
            image = face_recognition.load_image_file(io.BytesIO(image_bytes))
            frames.append(image)
        except Exception:
            return jsonify({"error": "invalid_image"}), 400

    elif 'video_b64' in data:
        # Write to temp file, extract a frame every 2 seconds
        try:
            video_bytes = base64.b64decode(data['video_b64'])
        except Exception:
            return jsonify({"error": "invalid_video"}), 400
    
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as f:
            f.write(video_bytes)
            temp_path = f.name
    
        try:
            cap = cv2.VideoCapture(temp_path)
            fps = cap.get(cv2.CAP_PROP_FPS) or 25
            frame_interval = max(1, int(fps * 2))   # sample every 2 seconds
            frame_count = 0
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                if frame_count % frame_interval == 0:
                    # OpenCV is BGR; face_recognition needs RGB
                    frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                frame_count += 1
            
            cap.release()
        finally:
            os.unlink(temp_path)
    
    else:
        return jsonify({"error": "Provide image_b64 or video_b64"}), 400
    
    
    # Process frames
    # Track the best (highest confidence) match per student across all frames
    best_match = {}  # student_id → best confidence score

    for frame in frames:
        face_locations = face_recognition.face_locations(frame, model='hog')
        if not face_locations:
            continue

        face_encodings = face_recognition.face_encodings(frame, face_locations)

        for face_enc in face_encodings:
            # face_distance returns Euclidean distance; lower = more similar
            distances = face_recognition.face_distance(known_encodings, face_enc)

            for idx, dist in enumerate(distances):
                if dist <= threshold:
                    sid = known_ids[idx]
                    confidence = round(float(1.0 - dist), 4)  # convert to 0–1
                    if confidence > best_match.get(sid, 0):
                        best_match[sid] = confidence

    recognized = [
        {"id": sid, "confidence": conf}
        for sid, conf in best_match.items()
    ]

    return jsonify({
        "recognized": recognized,
        "frames_processed": len(frames),
        "faces_found": len(recognized)
    })


if __name__ == '__main__':
    # Render uses PORT env var, fallback to 5001 for local dev
    port = int(os.environ.get('PORT', os.environ.get('FACE_SERVICE_PORT', 5001)))
    app.run(host='0.0.0.0', port=port, debug=False)
    
    