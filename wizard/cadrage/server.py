#!/usr/bin/env python3
"""
Cadrage wizard server — AppFactory.
Serves HTML wizard pages + state API for Claude Code injection.

Usage:
  python3 server.py                                    # Cadrage only
  python3 server.py --port 4000                        # Custom port
  python3 server.py --enterprise '{"name":"FilmPro","logo":"/abs/path/logo.png"}'
  python3 server.py --mode entreprise                  # Enterprise pre-framing wizard

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
WIZARD_MODE = "cadrage"  # "cadrage" or "entreprise"
SERVE_ROOT = None  # set in main()
EXTRA_ROOTS = []  # additional directories for logo serving


class CadrageHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        """Serve files from SERVE_ROOT, with fallback to EXTRA_ROOTS for logos."""
        rel = urlparse(path).path.lstrip("/")
        # Check SERVE_ROOT first
        candidate = os.path.join(SERVE_ROOT, rel)
        if os.path.exists(candidate):
            return candidate
        # Check extra roots (for enterprise logos outside wizard dir)
        for root in EXTRA_ROOTS:
            candidate = os.path.join(root, rel)
            if os.path.exists(candidate):
                return candidate
        # Also serve absolute paths under /logos/ prefix
        if rel.startswith("logos/"):
            abs_path = rel[6:]  # strip "logos/"
            if os.path.isabs(abs_path) and os.path.exists(abs_path):
                return abs_path
        return os.path.join(SERVE_ROOT, rel)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/state":
            self._json_response(STATE)
        elif path == "/":
            if WIZARD_MODE == "entreprise":
                self.path = "/entreprise.html"
            else:
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
    global STATE, WIZARD_MODE, SERVE_ROOT, EXTRA_ROOTS

    port = 3334
    enterprise_json = None

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--port" and i + 1 < len(args):
            port = int(args[i + 1])
            i += 2
        elif args[i] == "--enterprise" and i + 1 < len(args):
            enterprise_json = args[i + 1]
            i += 2
        elif args[i] == "--mode" and i + 1 < len(args):
            WIZARD_MODE = args[i + 1]
            i += 2
        else:
            i += 1

    # Determine serve root based on mode
    wizard_dir = os.path.dirname(os.path.abspath(__file__))
    if WIZARD_MODE == "entreprise":
        SERVE_ROOT = os.path.join(os.path.dirname(wizard_dir), "entreprise")
        # Also serve cadrage dir for shared assets (logo.png, shared.css/js)
        EXTRA_ROOTS = [wizard_dir]
    else:
        SERVE_ROOT = wizard_dir

    # Initialize state with enterprise context if provided
    STATE = {"step": "pitch" if WIZARD_MODE == "cadrage" else "entreprise", "data": {}}
    if enterprise_json:
        try:
            ent = json.loads(enterprise_json)
            if ent.get("name"):
                STATE["enterprise_name"] = ent["name"]
            if ent.get("logo"):
                # Copy logo to serve directory or use absolute path
                logo_path = ent["logo"]
                if os.path.isabs(logo_path) and os.path.exists(logo_path):
                    EXTRA_ROOTS.append(os.path.dirname(logo_path))
                    STATE["enterprise_logo"] = os.path.basename(logo_path)
            if ent.get("slug"):
                STATE["enterprise_slug"] = ent["slug"]
            if ent.get("branding"):
                STATE["enterprise_branding"] = ent["branding"]
        except (json.JSONDecodeError, KeyError):
            pass

    server = HTTPServer(("localhost", port), CadrageHandler)
    mode_label = "Entreprise" if WIZARD_MODE == "entreprise" else "Cadrage"
    url = f"http://localhost:{port}/"
    print(f"{mode_label} wizard: {url}")
    print("Ctrl+C to stop\n")
    webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        server.server_close()


if __name__ == "__main__":
    main()
