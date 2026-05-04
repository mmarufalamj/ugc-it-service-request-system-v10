<# Requires Pandoc to be installed and in PATH
   Optionally: a LaTeX distribution for high-quality PDFs.
   This script builds a single PDF document from the codebase documentation. #>

Param()

# Define input and output
$InputFiles = @(
  "docs/CODEBASE_DOCUMENTATION.md",
  "docs/ARCHITECTURE.md",
  "docs/WORKFLOWS.md",
  "docs/DATABASE.md",
  "docs/API.md",
  "docs/OPERATIONS.md"
)
$OutputPdf = "docs/CODEBASE_DOCUMENTATION.pdf"

Write-Host "[DocsPDF] Building PDF from Markdown sources..."

# Ensure pandoc is available
$pandocPath = Get-Command pandoc -ErrorAction SilentlyContinue
if (-not $pandocPath) {
    Write-Error "Pandoc is not installed or not in PATH. Please install Pandoc to proceed."
    exit 1
}

# Build the PDF
$args = @()
foreach ($f in $InputFiles) {
    if (Test-Path $f) {
        $args += (",$f")
    } else {
        Write-Warning "Input file not found: $f"
    }
}

# Remove leading comma from the joined string
$inputArgs = ($args -join " ").Trim()
if ($inputArgs -eq "") {
    Write-Error "No input Markdown files found. Aborting."
    exit 1
}

pandoc $InputFiles -o $OutputPdf
Write-Host "[DocsPDF] Output: $OutputPdf"
