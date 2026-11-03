import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class NoCacheRequestHandler(SimpleHTTPRequestHandler):
    # Module graphs contain many small files. Reuse connections so repeated
    # browser runs do not exhaust Windows sockets with HTTP/1.0 TIME_WAIT churn.
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description="Serve Tæt UI development examples and documentation without browser caching.")
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--port", default=5173, type=int)
    parser.add_argument("--directory", default=".")
    args = parser.parse_args()

    directory = Path(args.directory).resolve()
    handler = partial(NoCacheRequestHandler, directory=str(directory))
    server = ThreadingHTTPServer((args.bind, args.port), handler)
    print(f"Serving {directory} on http://{args.bind}:{args.port}/ with cache disabled")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
