import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const APP_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

const ACCOUNTANT_EMAIL = "iqobzmsggupilthbad@gonrr.net";
const DOCTOR_EMAIL = "dbs77977@laoia.com";
const PASSWORD = "sofia123";
const REFERENCE_MONTH = process.env.E2E_TAX_REFERENCE_MONTH ?? "06/2026";
const MOCK_PIX = "00020126580014br.gov.bcb.pix0136docfin-e2e-maker-checker-tax-flow5204000053039865406348.005802BR5925DOCFIN QA TAX FLOW6009SAO PAULO62070503***6304ABCD";
const WORKPLACE_ID = "e2e-tax-flow-hospital";
const SHIFT_ID = "e2e-tax-flow-shift";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
};

type SeedResult = {
  doctorId: string;
  accountantId: string;
};

test.describe.serial("Maker-Checker tax flow with Fator R", () => {
  test.skip(!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY, "Set E2E_SUPABASE_URL and E2E_SUPABASE_SERVICE_ROLE_KEY to seed deterministic tax data.");

  let seed: SeedResult;

  test.beforeAll(async () => {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    seed = await seedMakerCheckerTaxFlow(supabase);
  });

  test("Test Case 1: accountant dynamically validates Anexo V -> Anexo III and publishes guide", async ({ page }) => {
    await login(page, ACCOUNTANT_EMAIL, PASSWORD);
    await expect(page).toHaveURL(/\/contador/);

    await selectCompetence(page, REFERENCE_MONTH);

    const row = page.getByTestId(`tax-obligation-row-${seed.doctorId}`);
    await expect(row).toBeVisible();
    await expect(row.getByText(DOCTOR_EMAIL)).toBeVisible();

    await row.getByRole("button", { name: /validar guia/i }).click();

    const modal = page.getByTestId("tax-validation-modal");
    await expect(modal).toBeVisible();

    // Initial state is deliberately seeded with zero payroll. Fator R must fall below 28%,
    // therefore the system must classify the company under Anexo V and apply 15.5%.
    await expect(modal.getByTestId("tax-memory-annex")).toContainText("Anexo V");
    await expect(modal.getByTestId("tax-memory-effective-rate")).toContainText(/15,5|15,50/);
    await expect(modal.getByTestId("tax-memory-estimated-amount")).toContainText(/899,00/);

    // Entering high payroll should immediately push Fator R over 28%, switch to Anexo III,
    // and recalculate the estimated tax from R$ 899,00 to R$ 348,00.
    await modal.getByTestId("tax-payroll-input").fill("35000");
    await expect(modal.getByTestId("tax-memory-fator-r")).toContainText(/29,1|29,14|29,142/);
    await expect(modal.getByTestId("tax-memory-annex")).toContainText("Anexo III");
    await expect(modal.getByTestId("tax-memory-effective-rate")).toContainText(/6,0|6,00/);
    await expect(modal.getByTestId("tax-memory-estimated-amount")).toContainText(/348,00/);

    await modal.getByTestId("tax-official-amount-input").fill("348");
    await modal.getByTestId("tax-pix-code-input").fill(MOCK_PIX);
    await modal.getByTestId("tax-submit-validation-button").click();

    await expect(page.getByText(/guia aprovada e enviada para o cliente/i)).toBeVisible();
    await expect(row.getByTestId("tax-status-badge")).toContainText(/publicada/i);
    await expect(row.getByRole("button", { name: /enviada/i })).toBeDisabled();
  });

  test("Test Case 2: doctor copies PIX and marks published guide as paid", async ({ browser }) => {
    const context = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();

    await login(page, DOCTOR_EMAIL, PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);

    const obligationCard = page.getByTestId(`doctor-tax-obligation-${REFERENCE_MONTH.replace("/", "-")}`);
    await expect(obligationCard).toBeVisible();
    await expect(obligationCard).toContainText(/348,00/);
    await expect(obligationCard).toContainText(/Anexo III/);

    await obligationCard.getByTestId("doctor-tax-copy-pix").click();
    await expect(page.getByText(/pix copiado|código pix copiado/i)).toBeVisible();
    await expect.poll(async () => page.evaluate(() => navigator.clipboard.readText())).toContain(MOCK_PIX);

    await obligationCard.getByTestId("doctor-tax-mark-paid").click();
    await expect(page.getByText(/guia marcada como paga|pagamento registrado/i)).toBeVisible();
    await expect(obligationCard).toBeHidden();
    await expect(page.getByTestId("doctor-tax-pending-list")).not.toContainText(REFERENCE_MONTH);
    await expect(page.getByTestId("doctor-tax-chart")).toContainText(/pago|quitado/i);

    await context.close();
  });
});

async function login(page: Page, email: string, password: string) {
  await page.goto(`${APP_URL}/login`);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /^entrar$/i }).click();
}

async function selectCompetence(page: Page, referenceMonth: string) {
  const [targetMonth, targetYear] = referenceMonth.split("/").map(Number);
  const now = new Date();
  const current = new Date(now.getFullYear(), now.getMonth(), 1);
  const target = new Date(targetYear, targetMonth - 1, 1);
  const diff = (target.getFullYear() - current.getFullYear()) * 12 + target.getMonth() - current.getMonth();

  const buttonName = diff >= 0 ? /próxima competência/i : /competência anterior/i;
  for (let index = 0; index < Math.abs(diff); index += 1) {
    await page.getByLabel(buttonName).click();
  }

  await expect(page.getByText(`${MONTH_NAMES[targetMonth - 1]} ${targetYear}`)).toBeVisible();
}

async function seedMakerCheckerTaxFlow(supabase: SupabaseClient): Promise<SeedResult> {
  const [doctor, accountant] = await Promise.all([
    getProfileByEmail(supabase, DOCTOR_EMAIL),
    getProfileByEmail(supabase, ACCOUNTANT_EMAIL),
  ]);

  const [month, year] = REFERENCE_MONTH.split("/").map(Number);
  const invoiceIssueDate = `${year}-${String(month).padStart(2, "0")}-05`;
  const expectedPaymentDate = `${year}-${String(month).padStart(2, "0")}-20`;

  await throwOnError(supabase
    .from("profiles")
    .update({
      linked_accountant_email: ACCOUNTANT_EMAIL,
      accountant_access_status: "GRANTED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", doctor.id), "link doctor to accountant");

  await throwOnError(supabase
    .from("workplaces")
    .upsert({
      id: WORKPLACE_ID,
      user_id: doctor.id,
      entity_domain: "PJ",
      name: "Hospital QA Maker Checker",
      address: "Av. Paulista, 1000 - São Paulo",
      lat: -23.5614,
      lng: -46.6559,
      regime: "PJ_SIMPLES",
      hourly_rate: 483.33,
      payment_rule: "Corte 30, pagamento dia 20",
      color: "#0F766E",
      cut_off_day: 30,
      payment_day: 20,
      payment_term_days: 30,
    }), "upsert e2e workplace");

  await throwOnError(supabase.from("shifts").delete().eq("id", SHIFT_ID), "delete previous e2e shift");
  await throwOnError(supabase
    .from("shifts")
    .insert({
      id: SHIFT_ID,
      user_id: doctor.id,
      workplace_id: WORKPLACE_ID,
      entity_domain: "PJ",
      record_status: "consolidated",
      date: `${year}-${String(month).padStart(2, "0")}-01`,
      origin_id: "home",
      hours: 12,
      gross: 5800,
      procedure: "Plantão E2E Fator R",
      tax_regime_override: "PJ_SIMPLES",
      deductions: [],
      settlement_adjustment: null,
      expected_payment_date: expectedPaymentDate,
      projected_payment_date: expectedPaymentDate,
      payment_status: "PENDING",
      actual_payment_date: null,
      invoice_issue_date: invoiceIssueDate,
      invoice_number: "NF-E2E-001",
      agent_notified: false,
      is_fixed_shift: false,
    }), "insert e2e shift");

  await throwOnError(supabase
    .from("tax_obligations")
    .delete()
    .eq("doctor_id", doctor.id)
    .eq("accountant_id", accountant.id)
    .eq("reference_month", REFERENCE_MONTH), "delete previous e2e tax obligation");

  await throwOnError(supabase
    .from("tax_obligations")
    .insert({
      id: randomUUID(),
      doctor_id: doctor.id,
      accountant_id: accountant.id,
      reference_month: REFERENCE_MONTH,
      system_estimated_amount: 899,
      official_amount: null,
      pix_code: null,
      status: "PENDING_VALIDATION",
      payroll_amount: 0,
      rbt12: 120100,
      fator_r: 0,
      tax_annex: "Anexo V",
      effective_tax_rate: 15.5,
    }), "insert pending e2e tax obligation");

  return {
    doctorId: doctor.id,
    accountantId: accountant.id,
  };
}

async function getProfileByEmail(supabase: SupabaseClient, email: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name")
    .eq("email", email)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch profile for ${email}: ${error.message}`);
  if (!data) throw new Error(`Missing profile for ${email}. Create the QA account before running this suite.`);
  return data as ProfileRow;
}

async function throwOnError<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>, label: string) {
  const { error } = await promise;
  if (error) throw new Error(`Seed step failed (${label}): ${error.message}`);
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
