from pathlib import Path
import fitz

def pdf_page_count(path: Path) -> int:
    with fitz.open(path) as doc: return doc.page_count

def pdf_to_images(path: Path, out_dir: Path, dpi: int = 180) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True); images=[]
    with fitz.open(path) as doc:
        for idx, page in enumerate(doc, start=1):
            pix = page.get_pixmap(matrix=fitz.Matrix(dpi/72, dpi/72), alpha=False)
            img = out_dir / f'page-{idx}.png'; pix.save(img); images.append(img)
    return images
