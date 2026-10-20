"""Local server for the monster sprite baker.

Serves prototype/ and accepts POST /save/<name> to write baked sprites into prototype/sprites/.
Run: python3 prototype/tools/sprite_server.py 8766, then open http://127.0.0.1:8766/tools/bake-monsters.html
"""
import http.server
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'sprites')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_POST(self):
        match = re.fullmatch(r'/save/([a-z0-9-]+\.(?:webp|png|json))', self.path)
        if not match:
            self.send_error(400, 'bad name')
            return
        data = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        os.makedirs(OUT, exist_ok=True)
        with open(os.path.join(OUT, match.group(1)), 'wb') as f:
            f.write(data)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
