import type { ExpenseCategory } from "@/lib/store";

export interface ParsedExpenseDraft {
  date: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  sourceFileName: string;
  sourceType: "CSV" | "OFX";
}

const CATEGORY_RULES: Array<[ExpenseCategory, RegExp]> = [
  ["Transporte", /\b(UBER|99\s*APP|99POP|TAXI|CABIFY|MOBIZAP|METRO|ESTACIONAMENTO|SEM\s+PARAR|PEDAGIO|PEDÁGIO)\b/i],
  ["CRM/Sociedades", /\b(CREMESP|CRM|SBA|AMB|SOCIEDADE|ANUIDADE|CERTIFICADO\s+DIGITAL|E-?CPF|E-?CNPJ)\b/i],
  ["Alimentação", /\b(IFOOD|RESTAURANTE|PADARIA|MERCADO|SUPERMERCADO|HORTIFRUTI|CAFE|CAFÉ|LANCHONETE|DELIVERY)\b/i],
  ["Saúde", /\b(FARMACIA|FARMÁCIA|DROGA|DROGARIA|LABORATORIO|LABORATÓRIO|HOSPITAL|CLINICA|CLÍNICA|PSICOLOG|TERAP)\b/i],
  ["Educação", /\b(CURSO|LIVRO|CONGRESSO|SYMPOSIUM|SIMP[ÓO]SIO|AULA|POS|P[ÓO]S|FACULDADE|ESCOLA)\b/i],
  ["Viagens", /\b(HOTEL|AIRBNB|PASSAGEM|LATAM|GOL|AZUL|BOOKING|DECOLAR|UBER\s+TRIP|VIAGEM)\b/i],
  ["Moradia", /\b(ALUGUEL|CONDOMINIO|CONDOMÍNIO|ENERGIA|LUZ|AGUA|ÁGUA|INTERNET|VIVO|CLARO|TIM|NET)\b/i],
  ["Impostos/Taxas", /\b(IMPOSTO|TAXA|IOF|DARF|DAS|IPVA|IPTU|MULTA|JUROS|TARIFA|ANUIDADE\s+CARTAO|ANUIDADE\s+CARTÃO)\b/i],
];

export async function parseExpenseFile(file: File): Promise<ParsedExpenseDraft[]> {
  const text = await file.text();
  const sourceType = file.name.toLowerCase().endsWith(".ofx") ? "OFX" : "CSV";
  return sourceType === "OFX" ? parseOfx(text, file.name) : parseCsv(text, file.name);
}

export function autoTagExpense(description: string): ExpenseCategory {
  return CATEGORY_RULES.find(([, pattern]) => pattern.test(description))?.[0] ?? "Outros";
}

function parseCsv(text: string, sourceFileName: string): ParsedExpenseDraft[] {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeader);
  const dateIndex = findHeader(headers, ["data", "date", "dt", "lançamento", "lancamento", "transactiondate"]);
  const descriptionIndex = findHeader(headers, ["descrição", "descricao", "description", "histórico", "historico", "memo", "name", "detalhe"]);
  const amountIndex = findHeader(headers, ["valor", "value", "amount", "vlr", "quantia"]);
  if (dateIndex < 0 || descriptionIndex < 0 || amountIndex < 0) return [];

  return rows.slice(1)
    .map((row) => makeDraft(row[dateIndex], row[descriptionIndex], row[amountIndex], sourceFileName, "CSV"))
    .filter((item): item is ParsedExpenseDraft => Boolean(item));
}

function parseOfx(text: string, sourceFileName: string): ParsedExpenseDraft[] {
  const blocks = text.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|<\/CCSTMTRS>|$)/gi) ?? [];
  return blocks
    .map((block) => {
      const date = getOfxTag(block, "DTPOSTED") || getOfxTag(block, "DTUSER");
      const description = getOfxTag(block, "NAME") || getOfxTag(block, "MEMO") || getOfxTag(block, "FITID");
      const amount = getOfxTag(block, "TRNAMT");
      return makeDraft(date, description, amount, sourceFileName, "OFX");
    })
    .filter((item): item is ParsedExpenseDraft => Boolean(item));
}

function makeDraft(
  rawDate: string | undefined,
  rawDescription: string | undefined,
  rawAmount: string | undefined,
  sourceFileName: string,
  sourceType: "CSV" | "OFX",
) {
  const date = normalizeDate(rawDate ?? "");
  const description = cleanDescription(rawDescription ?? "");
  const amount = Math.abs(parseAmount(rawAmount ?? ""));
  if (!date || !description || amount <= 0) return null;

  return {
    date,
    description,
    amount,
    category: autoTagExpense(description),
    sourceFileName,
    sourceType,
  } satisfies ParsedExpenseDraft;
}

function parseCsvRows(text: string) {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      cell += "\"";
      index++;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const candidates = [",", ";", "\t"];
  return candidates
    .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ",";
}

function findHeader(headers: string[], candidates: string[]) {
  return headers.findIndex((header) => candidates.some((candidate) => header === normalizeHeader(candidate) || header.includes(normalizeHeader(candidate))));
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function normalizeDate(value: string) {
  const clean = value.trim();
  const ofx = /^(\d{4})(\d{2})(\d{2})/.exec(clean);
  if (ofx) return `${ofx[1]}-${ofx[2]}-${ofx[3]}`;

  const br = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(clean);
  if (br) {
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${year}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  }

  const iso = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(clean);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  return "";
}

function parseAmount(value: string) {
  const clean = value.replace(/[^\d,.-]/g, "").trim();
  if (!clean) return 0;
  const lastComma = clean.lastIndexOf(",");
  const lastDot = clean.lastIndexOf(".");
  const decimal = lastComma > lastDot ? "," : lastDot >= 0 ? "." : "";
  const index = decimal ? Math.max(lastComma, lastDot) : -1;
  const normalized = decimal
    ? `${clean.slice(0, index).replace(/[.,]/g, "")}.${clean.slice(index + 1).replace(/[.,]/g, "")}`
    : clean.replace(/[.,]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanDescription(value: string) {
  return decodeHtml(value).replace(/\s+/g, " ").trim().slice(0, 180);
}

function getOfxTag(block: string, tag: string) {
  const match = new RegExp(`<${tag}>([^<\\r\\n]+)`, "i").exec(block);
  return match?.[1]?.trim() ?? "";
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");
}
