#!/usr/bin/env python3
import json
import os
import re
import shutil
import subprocess
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parent
SCRIPT_PATH = ROOT / "scripts" / "pdf_to_md_hybrid.py"


def sanitize_name(value):
    base = Path(str(value or "documento.pdf").strip()).name
    return re.sub(r"[^a-zA-Z0-9._-]", "-", base)


def to_markdown_name(file_name):
    return re.sub(r"\.[^.]+$", "", sanitize_name(file_name)) + ".md"


def normalize_text(value):
    return str(value or "").replace("\r\n", "\n").replace("\r", "\n").rstrip()


def run_checked(command, **kwargs):
    return subprocess.check_output(
        command,
        text=True,
        encoding="utf-8",
        errors="replace",
        stderr=subprocess.STDOUT,
        **kwargs,
    )


def convert_doc_to_text(input_path, temp_dir):
    run_checked([
        "libreoffice",
        "--headless",
        "--convert-to",
        "txt:Text",
        "--outdir",
        str(temp_dir),
        str(input_path),
    ])
    converted = temp_dir / f"{input_path.stem}.txt"
    if not converted.exists():
        raise RuntimeError("Falha ao converter documento do Word.")
    return converted.read_text(encoding="utf-8", errors="replace")


def convert_image_to_text(input_path):
    return run_checked(["tesseract", str(input_path), "stdout", "-l", "por+eng", "--psm", "3"])


def convert_file(file_name, data):
    safe_name = sanitize_name(file_name)
    extension = Path(safe_name).suffix.lower()

    with tempfile.TemporaryDirectory(prefix="app-extrator-") as temp_name:
      temp_dir = Path(temp_name)
      input_path = temp_dir / safe_name
      output_path = temp_dir / to_markdown_name(safe_name)
      input_path.write_bytes(data)

      if extension == ".pdf":
          stdout = run_checked([
              "python3",
              str(SCRIPT_PATH),
              str(input_path),
              str(output_path),
              "--ocr-short-pages",
          ])
          markdown = output_path.read_text(encoding="utf-8", errors="replace") if output_path.exists() else ""
      elif extension in (".txt", ".md"):
          markdown = normalize_text(data.decode("utf-8", errors="replace"))
          stdout = f"OK: texto importado de {safe_name}"
      elif extension in (".png", ".jpg", ".jpeg"):
          markdown = normalize_text(convert_image_to_text(input_path))
          stdout = f"OK: OCR de imagem concluido para {safe_name}"
      elif extension in (".doc", ".docx"):
          markdown = normalize_text(convert_doc_to_text(input_path, temp_dir))
          stdout = f"OK: documento convertido de {safe_name}"
      else:
          raise ValueError(f"Formato nao suportado: {extension or 'desconhecido'}")

      if markdown and not markdown.endswith("\n"):
          markdown += "\n"

      return {
          "ok": True,
          "mdName": to_markdown_name(safe_name),
          "markdown": markdown,
          "log": stdout.strip(),
      }


class Handler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", os.getenv("CORS_ORIGIN", "*"))
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-File-Name, X-Folder")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self.respond_json({"ok": True, "service": "app-extrator-api"})
            return
        self.respond_json({"ok": False, "error": "Not found"}, status=404)

    def do_POST(self):
        if self.path.rstrip("/") != "/api/extrator-process":
            self.respond_json({"ok": False, "error": "Not found"}, status=404)
            return

        length = int(self.headers.get("content-length") or "0")
        if length <= 0:
            self.respond_json({"ok": False, "error": "Arquivo invalido."}, status=400)
            return

        file_name = unquote(self.headers.get("x-file-name") or "documento.pdf")
        data = self.rfile.read(length)

        try:
            self.respond_json(convert_file(file_name, data))
        except Exception as error:
            self.respond_json({"ok": False, "error": str(error)}, status=500)

    def respond_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    for binary in ("python3", "pdfinfo", "pdftotext", "pdfimages", "pdftoppm", "tesseract"):
        if shutil.which(binary) is None:
            raise SystemExit(f"Comando obrigatorio nao encontrado: {binary}")

    port = int(os.getenv("PORT", "8080"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"app-extrator-api listening on :{port}", flush=True)
    server.serve_forever()
