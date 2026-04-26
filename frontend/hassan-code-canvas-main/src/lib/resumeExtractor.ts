type SupportedResumeMime =
  | "application/pdf"
  | "image/png"
  | "image/jpeg"
  | "image/jpg"
  | "text/plain";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);

const normalize = (text: string): string => text.replace(/\s+/g, " ").trim();

const extractFromPdf = async (file: File): Promise<string> => {
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;

  const maxPages = Math.min(pdf.numPages, 12);
  const chunks: string[] = [];

  for (let i = 1; i <= maxPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    if (text.trim()) {
      chunks.push(text);
    }
  }

  return normalize(chunks.join(" "));
};

const extractFromImageWithOcr = async (file: File): Promise<string> => {
  const tesseract = await import("tesseract.js");
  const worker = await tesseract.createWorker("eng");

  try {
    const { data } = await worker.recognize(file);
    return normalize(data.text ?? "");
  } finally {
    await worker.terminate();
  }
};

export const isSupportedResumeType = (file: File): boolean => {
  const type = file.type.toLowerCase() as SupportedResumeMime;
  return type === "application/pdf" || IMAGE_TYPES.has(type) || type.startsWith("text/");
};

export const extractResumeText = async (file: File): Promise<string> => {
  const type = file.type.toLowerCase();

  if (type === "application/pdf") {
    return extractFromPdf(file);
  }

  if (IMAGE_TYPES.has(type)) {
    return extractFromImageWithOcr(file);
  }

  if (type.startsWith("text/") || /\.(txt|md)$/i.test(file.name)) {
    const text = await file.text();
    return normalize(text);
  }

  throw new Error("Unsupported file type for extraction");
};
