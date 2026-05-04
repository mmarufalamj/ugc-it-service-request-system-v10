# Report Conversion Guide

- This guide describes how to convert Markdown reports to PDF or Word.
- Prerequisites: Pandoc installed on your system. Optionally, a LaTeX distribution for high-quality PDFs (e.g., TeX Live).

Converting a Markdown report to PDF
- Command: pandoc <input.md> -o <output.pdf>
- Example: pandoc docs/PROJECT_RECON_REPORT.md -o PROJECT_RECON_REPORT.pdf

Converting a Markdown report to Word
- Command: pandoc <input.md> -o <output.docx>
- Example: pandoc docs/PROJECT_RECON_REPORT.md -o PROJECT_RECON_REPORT.docx

Tips
- For consistent styling, you can specify a template:
  - PDF: pandoc <input> -o <output> --template=template.tex
  - DOCX: pandoc <input> -o <output> --reference-doc=template.docx
- If Pandoc is not available, you can export to HTML first (pandoc input.md -t html) and then print to PDF in a browser or use LibreOffice for DOCX export.
