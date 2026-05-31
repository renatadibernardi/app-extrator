#!/usr/bin/env python3
import argparse
import re
import shutil
import subprocess
import tempfile
from pathlib import Path


def require_bin(name: str):
    if shutil.which(name) is None:
        raise SystemExit(f"Erro: comando '{name}' não encontrado no PATH")


def run(cmd: list[str]) -> str:
    return subprocess.check_output(cmd, text=True, encoding="utf-8", errors="replace")


def normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"-\n(?=\w)", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = "\n".join(line.rstrip() for line in text.split("\n"))
    return text.strip()


def pdf_page_count(pdf: Path) -> int:
    info = run(["pdfinfo", str(pdf)])
    m = re.search(r"^Pages:\s+(\d+)\s*$", info, flags=re.MULTILINE)
    if not m:
        raise SystemExit("Erro: não foi possível ler o número de páginas do PDF.")
    return int(m.group(1))


def text_pages_from_pdf(pdf: Path) -> list[str]:
    raw = run(["pdftotext", "-layout", str(pdf), "-"])
    pages = raw.split("\f")
    return [normalize_text(p) for p in pages]


def image_count_by_page(pdf: Path, page_count: int) -> dict[int, int]:
    counts = {p: 0 for p in range(1, page_count + 1)}
    out = run(["pdfimages", "-list", str(pdf)])
    lines = out.splitlines()
    for line in lines:
        line = line.strip()
        if not line or line.startswith("page") or line.startswith("-"):
            continue
        parts = re.split(r"\s+", line)
        if not parts:
            continue
        try:
            page = int(parts[0])
        except ValueError:
            continue
        if 1 <= page <= page_count:
            counts[page] += 1
    return counts


def ocr_page(pdf: Path, page: int, tmpdir: Path, lang: str, dpi: int, psm: int) -> str:
    base = tmpdir / f"page_{page:04d}"
    img_path = str(base) + ".png"
    txt_path = Path(str(base) + ".txt")

    subprocess.run(
        [
            "pdftoppm",
            "-f",
            str(page),
            "-l",
            str(page),
            "-singlefile",
            "-r",
            str(dpi),
            "-png",
            str(pdf),
            str(base),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    subprocess.run(
        ["tesseract", img_path, str(base), "-l", lang, "--psm", str(psm)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    if not txt_path.exists():
        return ""
    return normalize_text(txt_path.read_text(encoding="utf-8", errors="replace"))


def pick_best_text(base: str, ocr: str) -> str:
    if not base and not ocr:
        return ""
    if base and not ocr:
        return base
    if ocr and not base:
        return ocr
    if len(ocr) > len(base) * 1.05:
        return ocr
    return base


def main():
    parser = argparse.ArgumentParser(
        description="Conversor híbrido PDF->MD (camada de texto + OCR em páginas com imagem)."
    )
    parser.add_argument("pdf", type=Path, help="PDF de entrada")
    parser.add_argument("output_md", type=Path, help="Arquivo .md de saída")
    parser.add_argument("--lang", default="por+eng", help="Idiomas do Tesseract (padrão: por+eng)")
    parser.add_argument("--dpi", type=int, default=300, help="DPI para OCR (padrão: 300)")
    parser.add_argument("--psm", type=int, default=3, help="PSM do Tesseract (padrão: 3)")
    parser.add_argument(
        "--ocr-short-pages",
        action="store_true",
        help="Também aplica OCR em páginas com pouco texto extraído (< 140 chars).",
    )
    args = parser.parse_args()

    for b in ("pdfinfo", "pdftotext", "pdfimages", "pdftoppm", "tesseract"):
        require_bin(b)

    pdf = args.pdf.resolve()
    out_md = args.output_md.resolve()
    if not pdf.exists():
        raise SystemExit(f"Erro: PDF não encontrado: {pdf}")

    page_count = pdf_page_count(pdf)
    base_pages = text_pages_from_pdf(pdf)
    img_count = image_count_by_page(pdf, page_count)

    if len(base_pages) < page_count:
        base_pages.extend([""] * (page_count - len(base_pages)))

    need_ocr = []
    for p in range(1, page_count + 1):
        base = base_pages[p - 1]
        has_image = img_count.get(p, 0) > 0
        short_page = len(re.sub(r"\s+", "", base)) < 140
        if has_image or (args.ocr_short_pages and short_page):
            need_ocr.append(p)

    merged = list(base_pages[:page_count])
    with tempfile.TemporaryDirectory(prefix="pdf_hybrid_ocr_") as td:
        tmpdir = Path(td)
        for idx, p in enumerate(need_ocr, start=1):
            ocr = ocr_page(pdf, p, tmpdir, args.lang, args.dpi, args.psm)
            merged[p - 1] = pick_best_text(merged[p - 1], ocr)
            if idx % 10 == 0 or idx == len(need_ocr):
                print(f"OCR: {idx}/{len(need_ocr)} páginas candidatas")

    out_md.parent.mkdir(parents=True, exist_ok=True)
    with out_md.open("w", encoding="utf-8") as f:
        for p in range(1, page_count + 1):
            f.write(f"# Página {p}\n\n")
            body = merged[p - 1].strip()
            if body:
                f.write(body + "\n\n")
            else:
                f.write("\n")

    print(f"OK: convertido {pdf.name} -> {out_md}")
    print(f"Páginas totais: {page_count} | OCR aplicado em: {len(need_ocr)}")


if __name__ == "__main__":
    main()
