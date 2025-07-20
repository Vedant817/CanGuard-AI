pip install Flask
# app.py

from flask import Flask, request, jsonify
import numpy as np

# Import your main authenticator class
from ai_models.auth_orchestrator import UnifiedAuthenticator

# Initialize the Flask app
app = Flask(__name__)

# --- Load Models Once at Startup ---
# This is a critical performance step. The models are loaded into memory
# only once when the server starts, not on every request.
print("Initializing the Unified Authenticator and loading AI models...")
authenticator = UnifiedAuthenticator()
print("✅ Server is ready to accept requests.")


# --- Define the API Endpoint ---
@app.route('/api/authenticate', methods=['POST'])
def authenticate():
    """
    This function handles the authentication requests from the React Native app.
    """
    try:
        # Get the JSON data sent from the app
        request_data = request.get_json()

        # Basic validation of the incoming data
        if not request_data or 'behavioral_vector' not in request_data:
            return jsonify({"error": "Missing or invalid request payload"}), 400

        # Call your core authentication logic
        result = authenticator.authenticate_session(request_data)

        # Return the result as a JSON response
        return jsonify(result)

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({"error": "An internal server error occurred."}), 500

# --- Run the Server ---
# This allows you to run the server by executing "python app.py"
if __name__ == '__main__':
    # For production, use a proper WSGI server like Gunicorn instead of app.run()
    app.run(host='0.0.0.0', port=5000, debug=True)