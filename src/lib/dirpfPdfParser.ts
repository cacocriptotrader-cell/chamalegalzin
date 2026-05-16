import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import type { Asset, AssetCategory, Liability, LiabilityCategory } from "@/lib/store";

export const DIRPF_PARSER_VERSION = "dirpf-parser-ocr-preprocess-2026-05-16-09";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export class DirpfPdfParseError extends Error {
  constructor(
    message: string,
    public readonly code: "NO_TEXT_LAYER" | "READ_ERROR",
  ) {
    super(message);
    this.name = "DirpfPdfParseError";
  }
}

export interface ParsedDirpfPatrimony {
  assets: Asset[];
  liabilities: Liability[];
}

interface TextItemLike {
  str?: string;
  transform?: number[];
}

type PdfDocument = Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>;

interface PdfPageLike {
  getTextContent: () => Promise<{ items: TextItemLike[] }>;
  getViewport: (params: { scale: number }) => any;
  render: (params: any) => { promise: Promise<unknown> };
}

export type DirpfPdfParseStage =
  | "read-start"
  | "pdfjs"
  | "ocr-start"
  | "ocr-page"
  | "done";

export interface DirpfPdfParseProgress {
  stage: DirpfPdfParseStage;
  message: string;
  page?: number;
  pages?: number;
}

export interface DirpfPdfParseOptions {
  onProgress?: (progress: DirpfPdfParseProgress) => void;
}

const PDFJS_ASSET_BASE_URL = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}`;
const MIN_TEXT_CHARS_PER_PAGE = 50;
const OCR_RENDER_SCALE = 3;
const OCR_MESSAGE = "Detectamos um documento escaneado. Iniciando IA de leitura (OCR)... Isso pode levar alguns segundos.";

const SECTION_STOPS = [
  "Rendimentos",
  "Pagamentos",
  "Doações",
  "Espólio",
  "Resumo",
  "Demonstrativo",
  "Informações",
  "Identificação",
  "Dependentes",
  "Alimentandos",
  "Atividade Rural",
  "Ganhos de Capital",
];

const ASSET_CATEGORY_HINTS: Array<[RegExp, AssetCategory]> = [
  [/\b(apartamento|casa|terreno|im[oó]vel|sala|galp[aã]o|fazenda|lote)\b/i, "Imóvel"],
  [/\b(ve[ií]culo|autom[oó]vel|carro|moto|caminhonete|embarca[cç][aã]o|aeronave)\b/i, "Veículo"],
  [/\b(cdb|rdb|lci|lca|cri|cra|tesouro|poupan[cç]a|deb[eê]nture|renda fixa|t[ií]tulo)\b/i, "Renda Fixa"],
  [/\b(a[cç][oõ]es|fii|fundo imobili[aá]rio|etf|bdr|bolsa|renda vari[aá]vel|quotas?|fundo de investimento)\b/i, "Renda Variável"],
  [/\b(cons[oó]rcio)\b/i, "Consórcio"],
  [/\b(bitcoin|btc|ethereum|eth|cripto|criptoativo|usdt|usdc|solana|sol)\b/i, "Cripto"],
];

const LIABILITY_CATEGORY_HINTS: Array<[RegExp, LiabilityCategory]> = [
  [/\b(imobili[aá]rio|im[oó]vel|hipotec|habitacional|sbpe|sac)\b/i, "Financiamento Imobiliário"],
  [/\b(ve[ií]culo|autom[oó]vel|carro|moto|cdc)\b/i, "Financiamento Veículo"],
  [/\b(cons[oó]rcio)\b/i, "Consórcio"],
];

const uid = () => Math.random().toString(36).slice(2, 10);

export async function parseDirpfPdf(file: File, options: DirpfPdfParseOptions = {}): Promise<ParsedDirpfPatrimony> {
  try {
    options.onProgress?.({
      stage: "read-start",
      message: "Lendo arquivo da DIRPF...",
    });
    console.info("[DIRPF PDF] Parser version", DIRPF_PARSER_VERSION);
    console.info("[DIRPF PDF] Iniciando leitura", {
      name: file.name,
      size: file.size,
      type: file.type || "unknown",
      workerSrc: pdfWorkerUrl,
      pdfjsVersion: pdfjsLib.version,
      cMapUrl: `${PDFJS_ASSET_BASE_URL}/cmaps/`,
      standardFontDataUrl: `${PDFJS_ASSET_BASE_URL}/standard_fonts/`,
    });

    let data: ArrayBuffer;
    try {
      data = await file.arrayBuffer();
    } catch (error) {
      console.error("[DIRPF PDF] Falha ao ler ArrayBuffer", error);
      throw new DirpfPdfParseError("Não foi possível ler o arquivo enviado. Tente selecionar o PDF novamente.", "READ_ERROR");
    }

    const extracted = await extractPdfTextWithFallback(data, options);
    const text = normalizeDirpfText(extracted.text);
    console.info("[DIRPF PDF] Texto extraído", {
      chars: text.length,
      pages: extracted.pages,
      mode: extracted.mode,
    });
    if (text.replace(/\s+/g, "").length < 80) {
      throw new DirpfPdfParseError(
        "Não foi possível ler texto deste PDF. Ele pode ser uma imagem/scanner.",
        "NO_TEXT_LAYER",
      );
    }

    const assetSection = extractSection(text, /Bens\s+e\s+Direitos/i, /D[ií]vidas\s+e\s+[ÔO]nus\s+Reais/i);
    const liabilitySection = extractSection(text, /D[ií]vidas\s+e\s+[ÔO]nus\s+Reais/i);
    const situationYears = findSituationYears(assetSection || text);
    const latestYear = situationYears.at(-1);
    const assets = parseAssets(assetSection || text, latestYear);
    const liabilities = parseLiabilities(liabilitySection, latestYear);

    console.info(
      `[DIRPF PDF] Resultado do parser assets=${assets.length} liabilities=${liabilities.length} assetSection=${assetSection.length > 0} liabilitySection=${liabilitySection.length > 0} years=${situationYears.join(",") || "none"}`,
    );

    options.onProgress?.({
      stage: "done",
      message: "Leitura da DIRPF concluída.",
    });

    return { assets, liabilities };
  } catch (error) {
    console.error("[DIRPF PDF] Falha ao processar DIRPF", error);
    if (error instanceof DirpfPdfParseError) throw error;
    throw new DirpfPdfParseError("Erro ao ler arquivo. Formato não suportado ou corrompido.", "READ_ERROR");
  }
}

function normalizeDirpfText(text: string) {
  return repairSpacedWords(text)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+(Bens\s+e\s+Direitos)\b/gi, "\n$1")
    .replace(/\s+(D[ií]vidas\s+e\s+[ÔO]nus\s+Reais)\b/gi, "\n$1")
    .replace(/\s+(Rendimentos|Pagamentos|Doa[çc][oõ]es|Esp[oó]lio|Resumo|Demonstrativo)\b/gi, "\n$1")
    .replace(/\s+(\d{2}\s+\d{1,4}\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ])/g, "\n$1")
    .replace(/(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})/g, "$1 $2\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function repairSpacedWords(text: string) {
  return text
    .replace(/\bB\s+e\s+n\s+s\s+e\s+D\s+i\s+r\s+e\s+i\s+t\s+o\s+s\b/gi, "Bens e Direitos")
    .replace(/\bD\s+[ií]\s+v\s+i\s+d\s+a\s+s\s+e\s+[ÔO]\s+n\s+u\s+s\s+R\s+e\s+a\s+i\s+s\b/gi, "Dívidas e Ônus Reais")
    .replace(/\bS\s+i\s+t\s+u\s+a\s+[çc]\s+[aã]\s+o\b/gi, "Situação")
    .replace(/\bD\s+i\s+s\s+c\s+r\s+i\s+m\s+i\s+n\s+a\s+[çc]\s+[aã]\s+o\b/gi, "Discriminação")
    .replace(/\bA\s+[ÇC]\s+[ÕO]\s+E\s+S\b/gi, "ACOES")
    .replace(/\bF\s+I\s+I\b/gi, "FII")
    .replace(/\bB\s+D\s+R\b/gi, "BDR")
    .replace(/\bE\s+T\s+F\b/gi, "ETF");
}

async function extractPdfTextWithFallback(data: ArrayBuffer, options: DirpfPdfParseOptions) {
  let lastError: unknown = null;
  let lastResult: { text: string; pages: number; mode: "worker" | "sem-worker" | "raw-stream" } | null = null;
  const attempts: Array<{ mode: "worker" | "sem-worker"; disableWorker: boolean }> = [
    { mode: "worker", disableWorker: false },
    { mode: "sem-worker", disableWorker: true },
  ];

  for (const attempt of attempts) {
    let pdf: PdfDocument | null = null;
    try {
      options.onProgress?.({
        stage: "pdfjs",
        message: attempt.disableWorker ? "Tentando leitura alternativa do PDF..." : "Extraindo texto do PDF...",
      });
      pdf = await loadPdfDocument(data, attempt.disableWorker);
      const text = await extractDocumentText(pdf, attempt.mode, options);
      const result = { text, pages: pdf.numPages, mode: attempt.mode };
      lastResult = result;

      if (text.replace(/\s+/g, "").length >= 80) {
        return result;
      }

      console.warn("[DIRPF PDF] Texto insuficiente na tentativa de leitura", {
        mode: attempt.mode,
        chars: text.length,
        pages: pdf.numPages,
      });
    } catch (error) {
      lastError = error;
      console.warn("[DIRPF PDF] Tentativa de leitura falhou", {
        mode: attempt.mode,
        error,
      });
    } finally {
      try {
        await pdf?.destroy?.();
      } catch {
        // Cleanup best-effort do PDF.js.
      }
    }
  }

  const rawText = await extractRawPdfText(data);
  if (rawText.replace(/\s+/g, "").length >= 80) {
    console.info("[DIRPF PDF] Texto extraído por fallback bruto de streams", {
      chars: rawText.length,
    });
    return {
      text: rawText,
      pages: lastResult?.pages ?? 0,
      mode: "raw-stream" as const,
    };
  }

  if (lastResult) return lastResult;

  console.error("[DIRPF PDF] Falha ao carregar documento PDF em todas as tentativas", lastError);
  throw new DirpfPdfParseError("Não foi possível abrir este PDF. Verifique se o arquivo não está corrompido.", "READ_ERROR");
}

async function loadPdfDocument(data: ArrayBuffer, disableWorker: boolean) {
  if (!disableWorker) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  }

  return pdfjsLib.getDocument({
    data: new Uint8Array(data.slice(0)),
    cMapUrl: `${PDFJS_ASSET_BASE_URL}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${PDFJS_ASSET_BASE_URL}/standard_fonts/`,
    useSystemFonts: true,
    disableWorker,
  }).promise;
}

async function extractDocumentText(pdf: PdfDocument, mode: "worker" | "sem-worker", options: DirpfPdfParseOptions) {
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    try {
      const page = await pdf.getPage(pageNumber);
      const pageText = await extractPageText(page);
      let finalPageText = pageText;

      if (pageText.replace(/\s+/g, "").length < MIN_TEXT_CHARS_PER_PAGE) {
        finalPageText = [pageText, await extractPageTextWithOcr(page, pageNumber, pdf.numPages, options)]
          .filter(Boolean)
          .join("\n");
      }

      if (pageNumber <= 3) {
        console.info("[DIRPF PDF] Página processada", {
          mode,
          page: pageNumber,
          chars: finalPageText.length,
          ocr: finalPageText !== pageText,
        });
      }
      pageTexts.push(finalPageText);
    } catch (error) {
      console.warn(`[DIRPF PDF] Falha ao extrair texto da página ${pageNumber}`, {
        mode,
        error,
      });
      pageTexts.push("");
    }
  }

  return pageTexts.join("\n");
}

async function extractPageTextWithOcr(
  page: PdfPageLike,
  pageNumber: number,
  totalPages: number,
  options: DirpfPdfParseOptions,
) {
  if (typeof document === "undefined") return "";

  options.onProgress?.({
    stage: "ocr-start",
    message: OCR_MESSAGE,
    page: pageNumber,
    pages: totalPages,
  });

  try {
    const viewport = page.getViewport({ scale: OCR_RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return "";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    options.onProgress?.({
      stage: "ocr-page",
      message: `Lendo página ${pageNumber} de ${totalPages} com OCR...`,
      page: pageNumber,
      pages: totalPages,
    });

    const { recognize } = await import("tesseract.js");
    const result = await recognize(canvas.toDataURL("image/png"), "por", {
      logger: (progress) => {
        if (progress.status === "recognizing text") {
          const pct = Math.round((progress.progress ?? 0) * 100);
          options.onProgress?.({
            stage: "ocr-page",
            message: `Lendo página ${pageNumber} de ${totalPages} com OCR... ${pct}%`,
            page: pageNumber,
            pages: totalPages,
          });
        }
      },
    });

    const text = sanitizeOcrText(result.data.text);
    console.info("[DIRPF PDF] OCR finalizado", {
      page: pageNumber,
      chars: text.length,
    });
    return text;
  } catch (error) {
    console.warn("[DIRPF PDF] OCR falhou na página", {
      page: pageNumber,
      error,
    });
    return "";
  }
}

function sanitizeOcrText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[|¦]+/g, " ")
    .replace(/[‒–—]/g, "-")
    .replace(/^[\s_.=\-]{3,}$/gm, "")
    .replace(/[_=]{2,}/g, " ")
    .replace(/-{3,}/g, " ")
    .replace(/\bR\s*[$S5]\s*/gi, "R$ ")
    .replace(/\bR\$\s*([0-9])/gi, "R$ $1")
    .replace(/(\d)\s+\.\s+(\d{3})/g, "$1.$2")
    .replace(/(\d)\s*,\s*(\d{2})\b/g, "$1,$2")
    .replace(/(\d{1,3}(?:\.\d{3})*)\s+,\s*(\d{2})\b/g, "$1,$2")
    .replace(/(\d{1,3}(?:\.\d{3})*,\d{2})\s*\n\s*(\d{1,3}(?:\.\d{3})*,\d{2})/g, "$1 $2\n")
    .replace(/([A-Za-zÀ-ÿ])-\s*\n\s*([A-Za-zÀ-ÿ])/g, "$1$2")
    .replace(/([A-Za-zÀ-ÿ0-9,;:])\s*\n\s*(R\$\s*\d|\d{1,3}(?:\.\d{3})*,\d{2})/g, "$1 $2")
    .replace(/(Situa[çc][aã]o\s+em\s+31\/12\/\d{4})\s*\n\s*(R\$\s*)?(\d)/gi, "$1 R$ $3")
    .replace(/\s{2,}/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractRawPdfText(data: ArrayBuffer) {
  const bytes = new Uint8Array(data);
  const latin1 = new TextDecoder("latin1");
  const fullText = latin1.decode(bytes);
  const extractedParts: string[] = [];
  const streamPattern = /<<(?:.|\n|\r){0,4000}?>>\s*stream\r?\n?/g;
  let match: RegExpExecArray | null;

  while ((match = streamPattern.exec(fullText))) {
    const dict = match[0];
    const streamStart = match.index + match[0].length;
    const streamEnd = fullText.indexOf("endstream", streamStart);
    if (streamEnd <= streamStart) continue;

    const streamBytes = bytes.slice(streamStart, streamEnd);
    const decoded = /\/FlateDecode\b/.test(dict)
      ? await inflatePdfStream(streamBytes)
      : latin1.decode(streamBytes);

    if (!decoded) continue;
    extractedParts.push(extractTextOperators(decoded));
  }

  const directText = extractTextOperators(fullText);
  if (directText.length > 0) extractedParts.push(directText);

  const joined = extractedParts
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  console.info("[DIRPF PDF] Fallback bruto finalizado", {
    chars: joined.length,
    streams: extractedParts.length,
  });

  return joined;
}

async function inflatePdfStream(bytes: Uint8Array) {
  if (typeof DecompressionStream === "undefined") return "";

  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
    return await new Response(stream).text();
  } catch {
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return await new Response(stream).text();
    } catch {
      return "";
    }
  }
}

function extractTextOperators(pdfStreamText: string) {
  const parts: string[] = [];
  const literalPattern = /\((?:\\.|[^\\()])*\)/g;
  const hexPattern = /<([0-9a-fA-F\s]{4,})>/g;
  let literalMatch: RegExpExecArray | null;
  let hexMatch: RegExpExecArray | null;

  while ((literalMatch = literalPattern.exec(pdfStreamText))) {
    const decoded = decodePdfLiteral(literalMatch[0].slice(1, -1));
    if (isUsefulExtractedText(decoded)) parts.push(decoded);
  }

  while ((hexMatch = hexPattern.exec(pdfStreamText))) {
    const decoded = decodePdfHexString(hexMatch[1] ?? "");
    if (isUsefulExtractedText(decoded)) parts.push(decoded);
  }

  return parts.join(" ");
}

function decodePdfLiteral(value: string) {
  return value
    .replace(/\\([nrtbf()\\])/g, (_, escaped: string) => {
      const map: Record<string, string> = {
        n: "\n",
        r: "\r",
        t: "\t",
        b: "\b",
        f: "\f",
        "(": "(",
        ")": ")",
        "\\": "\\",
      };
      return map[escaped] ?? escaped;
    })
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)))
    .replace(/\\\r?\n/g, "")
    .trim();
}

function decodePdfHexString(value: string) {
  const clean = value.replace(/\s+/g, "");
  if (clean.length < 4 || clean.length % 2 !== 0) return "";

  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return decodeUtf16Be(bytes.slice(2)).trim();
  }

  const zeroEvenBytes = bytes.filter((byte, index) => index % 2 === 0 && byte === 0).length;
  if (zeroEvenBytes > bytes.length / 4) {
    return decodeUtf16Be(bytes).trim();
  }

  return new TextDecoder("latin1").decode(bytes).trim();
}

function decodeUtf16Be(bytes: Uint8Array) {
  let output = "";
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    output += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
  }
  return output;
}

function isUsefulExtractedText(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length < 2) return false;
  if (!/[A-Za-zÀ-ÿ0-9]/.test(normalized)) return false;
  if (/^[\d\s.,/-]+$/.test(normalized) && normalized.length < 6) return false;
  return true;
}

async function extractPageText(page: { getTextContent: () => Promise<{ items: TextItemLike[] }> }) {
  const content = await page.getTextContent();
  const rawText = content.items
    .map((item) => String(item.str ?? "").trim())
    .filter(Boolean)
    .join("\n");
  const positioned = content.items
    .map((item) => ({
      text: String(item.str ?? "").trim(),
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
    }))
    .filter((item) => item.text.length > 0)
    .sort((a, b) => (Math.abs(b.y - a.y) > 3 ? b.y - a.y : a.x - b.x));

  const lines: Array<{ y: number; chunks: string[] }> = [];
  for (const item of positioned) {
    const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= 3);
    if (line) {
      line.chunks.push(item.text);
    } else {
      lines.push({ y: item.y, chunks: [item.text] });
    }
  }

  const positionedText = lines.map((line) => line.chunks.join(" ")).join("\n");
  return positionedText.length >= rawText.length * 0.5 ? positionedText : rawText;
}

function findSituationYears(text: string) {
  const years = [...text.matchAll(/31\/12\/(\d{4})/gi)]
    .map((match) => Number(match[1]))
    .filter((year) => Number.isFinite(year));

  return [...new Set(years)].sort((a, b) => a - b);
}

function extractSection(text: string, startPattern: RegExp, preferredEndPattern?: RegExp) {
  const startMatch = startPattern.exec(text);
  if (!startMatch || startMatch.index < 0) return "";

  const afterStart = text.slice(startMatch.index + startMatch[0].length);
  const endIndexes = [
    preferredEndPattern?.exec(afterStart)?.index,
    ...SECTION_STOPS.map((label) => new RegExp(`\\n\\s*${escapeRegExp(label)}\\b`, "i").exec(afterStart)?.index),
  ].filter((index): index is number => typeof index === "number" && index > 0);

  return endIndexes.length > 0 ? afterStart.slice(0, Math.min(...endIndexes)) : afterStart;
}

function parseAssets(section: string, latestYear?: number): Asset[] {
  const blocks = splitItemBlocks(section);
  console.info(
    `[DIRPF PDF] Blocos candidatos de bens count=${blocks.length} latestYear=${latestYear ?? "none"} preview=${blocks.slice(0, 3).map((block) => safePreview(block)).join(" | ")}`,
  );

  return blocks
    .map((block) => {
      try {
        const value = extractSituationValue(block, latestYear);
        const description = extractDescription(block);
        if (!description || value <= 0) return null;

        return {
          id: uid(),
          entityDomain: "PF",
          category: classifyAsset(block),
          description,
          currentValue: value,
        } satisfies Asset;
      } catch {
        return null;
      }
    })
    .filter((asset): asset is Asset => Boolean(asset));
}

function parseLiabilities(section: string, latestYear?: number): Liability[] {
  if (/Sem\s+Informa[çc][oõ]es/i.test(section)) return [];

  const blocks = splitItemBlocks(section);
  console.info(
    `[DIRPF PDF] Blocos candidatos de dívidas count=${blocks.length} latestYear=${latestYear ?? "none"} preview=${blocks.slice(0, 3).map((block) => safePreview(block)).join(" | ")}`,
  );

  return blocks
    .map((block) => {
      try {
        const value = extractSituationValue(block, latestYear);
        const description = extractDescription(block);
        if (!description || value <= 0) return null;

        return {
          id: uid(),
          entityDomain: "PF",
          category: classifyLiability(block),
          description,
          totalAmount: value,
          remainingBalance: value,
          interestRate: 0,
        } satisfies Liability;
      } catch {
        return null;
      }
    })
    .filter((liability): liability is Liability => Boolean(liability));
}

function splitItemBlocks(section: string) {
  const normalizedSection = normalizeDirpfText(section)
    .replace(/(\b\d{2})\s+(\d{1,4})\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ])/g, "\n$1 $2 $3")
    .replace(/(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})/g, "$1 $2\n");

  const lines = normalizedSection
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !isIgnoredLine(line));

  const blocks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (isItemStartLine(line)) {
      if (current.length > 0) blocks.push(current.join("\n"));
      current = [line];
      continue;
    }

    if (current.length > 0) current.push(line);
  }

  if (current.length > 0) blocks.push(current.join("\n"));

  const lineBlocks = blocks.filter((block) => extractMoneyValues(block).length >= 1);
  if (lineBlocks.length > 0) return lineBlocks;

  return splitLooseItemBlocks(normalizedSection);
}

function splitLooseItemBlocks(section: string) {
  const flat = section.replace(/\s+/g, " ").trim();
  const itemStartPattern = /\b\d{2}\s+\d{1,4}\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9./ -]{2,}/g;
  const starts = [...flat.matchAll(itemStartPattern)]
    .map((match) => match.index ?? -1)
    .filter((index) => index >= 0);

  const blocks = starts.map((start, index) => {
    const end = starts[index + 1] ?? flat.length;
    return flat.slice(start, end).trim();
  });

  return blocks.filter((block) => extractMoneyValues(block).length >= 1);
}

function extractDescription(block: string) {
  const raw = block
    .split("\n")
    .filter((line) => extractMoneyValues(line).length === 0)
    .filter((line) => !isIgnoredLine(line))
    .join(" ");

  return raw
    .replace(/^\d{2}\s+/, "")
    .replace(/\b(CNPJ|CPF|Renavam|Banco|Ag[eê]ncia|Conta)\b[\s\S]*$/i, "")
    .replace(/\b(Titular|Dependente)\b[\s\S]*$/i, "")
    .replace(/\bBem\s+ou\s+direito\s+pertencente\s+ao\b[\s\S]*$/i, "")
    .replace(/\b\d{3}\s*-\s*Brasil\b/gi, "")
    .replace(/\b\d{2}\b\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function extractSituationValue(block: string, latestYear?: number) {
  const lines = block.split("\n");
  for (const line of [...lines].reverse()) {
    const values = extractMoneyValues(line);
    if (values.length >= 2) return values[1];
    if (values.length === 1 && !/\bR\$\s*\d/i.test(line)) return values[0];
  }

  const targetYearPattern = latestYear ? String(latestYear) : "\\d{4}";
  const directPattern = new RegExp(`Situa[çc][aã]o\\s+em\\s+31\\/12\\/${targetYearPattern}\\s*(?:R\\$)?\\s*([\\d.]+,\\d{2}|\\d+)`, "i");
  const direct = directPattern.exec(block);
  if (direct?.[1]) return parseBrazilianMoney(direct[1]);

  const situations = [...block.matchAll(/Situa[çc][aã]o\s+em\s+31\/12\/(\d{4})\s*(?:R\$)?\s*([\d.]+,\d{2}|\d+)/gi)];
  const best = situations
    .map((match) => ({ year: Number(match[1]), value: parseBrazilianMoney(match[2] ?? "") }))
    .filter((item) => Number.isFinite(item.year) && item.value > 0)
    .sort((a, b) => b.year - a.year)[0];

  if (best) return best.value;

  const values = [...block.matchAll(/R\$\s*([\d.]+,\d{2})/g)].map((match) => parseBrazilianMoney(match[1] ?? ""));
  return values.at(-1) ?? 0;
}

function extractMoneyValues(text: string) {
  return [...text.matchAll(/(?<![\d/])(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|0,00)(?![\d/])/g)]
    .map((match) => parseBrazilianMoney(match[1] ?? ""))
    .filter((value) => Number.isFinite(value));
}

function parseBrazilianMoney(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function classifyAsset(block: string): AssetCategory {
  return ASSET_CATEGORY_HINTS.find(([pattern]) => pattern.test(block))?.[1] ?? "Renda Fixa";
}

function classifyLiability(block: string): LiabilityCategory {
  return LIABILITY_CATEGORY_HINTS.find(([pattern]) => pattern.test(block))?.[1] ?? "Empréstimo";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isItemStartLine(line: string) {
  if (/^(Grupo|C[oó]digo|Discrimina[çc][aã]o|Situa[çc][aã]o)\b/i.test(line)) return false;
  if (/^\d{2}\s+\d+\s+\S+/.test(line)) return true;
  return /^\d{2}\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9]/i.test(line) && !/^\d{2}\s*$/.test(line);
}

function isIgnoredLine(line: string) {
  return [
    /^Página\s+\d+/i,
    /^Data\/Hora/i,
    /^Controle:/i,
    /^NOME:$/i,
    /^CPF:$/i,
    /^IMPOSTO SOBRE A RENDA/i,
    /^ANO-CALENDÁRIO/i,
    /^EXERCÍCIO/i,
    /^DECLARAÇÃO DE/i,
    /^DECLARAÇÃO DE AJUSTE/i,
    /^BENS E DIREITOS/i,
    /^DECLARAÇÃO DE BENS E DIREITOS/i,
    /^D[IÍ]VIDAS E [ÔO]NUS REAIS/i,
    /^GRUPO\b/i,
    /^C[ÓO]DIGO\b/i,
    /^DISCRIMINA[ÇC][AÃ]O\b/i,
    /^SITUA[ÇC][AÃ]O EM\b/i,
    /^31\/12\/\d{4}/i,
    /^Valores em Reais/i,
  ].some((pattern) => pattern.test(line));
}

function safePreview(block: string) {
  return block
    .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, "[CPF]")
    .replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, "[CNPJ]")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}
