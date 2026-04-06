#!/usr/bin/env python3
"""
Cadrage wizard server — AppFactory.
Serves HTML wizard pages + state API for Claude Code injection.

Usage:
  python3 server.py                    # Start on port 3333
  python3 server.py --port 4000        # Custom port

API:
  GET  /api/state          → current wizard state
  POST /api/state          → update state (merge)
  POST /api/state/replace  → replace entire state
"""

import json
import sys
import os
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

STATE = {"step": "pitch", "data": {}}


class CadrageHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/state":
            self._json_response(STATE)
        elif path == "/":
            self.path = "/pitch.html"
            super().do_GET()
        else:
            super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length > 0 else {}

        if path == "/api/state":
            STATE.update(body)
            self._json_response({"ok": True, "state": STATE})
        elif path == "/api/state/replace":
            STATE.clear()
            STATE.update(body)
            self._json_response({"ok": True, "state": STATE})
        else:
            self.send_error(404)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def _json_response(self, data):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._cors_headers()
        self.end_headers()
        self.wfile.write(payload)

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, format, *args):
        if "/api/" in str(args[0]):
            super().log_message(format, *args)


def main():
    port = 3334
    if "--port" in sys.argv:
        port = int(sys.argv[sys.argv.index("--port") + 1])

    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    server = HTTPServer(("localhost", port), CadrageHandler)
    url = f"http://localhost:{port}/"
    print(f"Cadrage wizard: {url}")
    print("Ctrl+C to stop\n")
    webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        server.server_close()


if __name__ == "__main__":
    main()
