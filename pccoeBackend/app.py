from flask import Flask, request, jsonify
from datetime import datetime
from flask_cors import CORS
import os
from pymongo import MongoClient
from bson.objectid import ObjectId
import json
from collections import Counter

app = Flask(__name__)
CORS(app)

# MongoDB Atlas configuration
MONGO_URI = "mongodb+srv://atharvapatil22:PkESJq6Q2XCAWWwi@cluster0.jpndy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client['app_usage_db']
logs_collection = db['usage_logs']

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/log-usage', methods=['POST'])
def log_usage():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        filename = file.filename or 'unnamed_file'
        tab_name = request.form.get('tab_name', 'unknown')
        entities = request.form.get('entities', '[]')  # Entities detected in the file
        selected_entities = request.form.get('selected_entities', '[]')  # Entities chosen by user
        
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        log_entry = {
            'tab': tab_name,
            'filename': filename,
            'timestamp': current_time,
            'entities': json.loads(entities),  # Detected entities
            'selected_entities': json.loads(selected_entities),  # Chosen entities
            'created_at': datetime.utcnow()
        }
        
        result = logs_collection.insert_one(log_entry)
        
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        
        return jsonify({
            'message': 'Usage logged successfully',
            'tab': tab_name,
            'filename': filename,
            'timestamp': current_time,
            'id': str(result.inserted_id)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get-logs', methods=['GET'])
def get_logs():
    try:
        logs = list(logs_collection.find())
        for log in logs:
            log['_id'] = str(log['_id'])
            log.pop('created_at', None)
        return jsonify({'logs': logs}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get-logs-filtered', methods=['GET'])
def get_logs_filtered():
    try:
        tab = request.args.get('tab')
        filename = request.args.get('filename')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        query = {}
        if tab:
            query['tab'] = tab
        if filename:
            query['filename'] = filename
        if start_date or end_date:
            query['timestamp'] = {}
            if start_date:
                query['timestamp']['$gte'] = start_date
            if end_date:
                query['timestamp']['$lte'] = end_date

        logs = list(logs_collection.find(query))
        for log in logs:
            log['_id'] = str(log['_id'])
            log.pop('created_at', None)
        
        return jsonify({'logs': logs}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get-preferred-entities', methods=['GET'])
def get_preferred_entities():
    try:
        # Get all logs for the 'redact-image' tab
        logs = list(logs_collection.find({'tab': 'redact-image'}))
        
        if not logs:
            return jsonify({'preferred_entities': []}), 200

        # Count frequency of each entity selected by the user
        entity_counts = Counter()
        total_logs = len(logs)
        
        for log in logs:
            selected_entities = log.get('selected_entities', [])
            for entity in selected_entities:
                entity_counts[entity] += 1

        # Simple reinforcement learning: select entities chosen in >= 50% of sessions
        threshold = total_logs * 0.5
        preferred_entities = [
            entity for entity, count in entity_counts.items()
            if count >= threshold
        ]

        # If no entities meet the threshold, return the most frequent ones
        if not preferred_entities and entity_counts:
            preferred_entities = [
                entity for entity, _ in entity_counts.most_common(3)  # Top 3 as fallback
            ]

        return jsonify({'preferred_entities': preferred_entities}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)