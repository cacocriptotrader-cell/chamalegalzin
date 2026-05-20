import * as Accordion from "@radix-ui/react-accordion";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronDown, Crown, ShieldCheck, Sparkles, Stethoscope, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos — DocFin" },
      {
        name: "description",
        content: "Planos do DocFin para médicos que querem transformar plantões, recebíveis e contabilidade em paz fiscal.",
      },
    ],
  }),
  component: PricingPage,
});

const tiers = [
  {
    name: "Starter",
    price: "R$ 0",
    period: "para começar",
    description: "Para testar o fluxo essencial sem compromisso e organizar os primeiros plantões.",
    cta: "Começar grátis",
    icon: Stethoscope,
    features: [
      "Até 5 plantões por mês",
      "Captura básica de plantões",
      "Dashboard financeiro essencial",
      "Inbox de rascunhos para revisar depois",
    ],
  },
  {
    name: "DocFin Pro",
    price: "R$ 149",
    period: "/mês",
    description: "A rotina completa para quem quer parar de fechar o mês no WhatsApp.",
    cta: "Ativar Pro",
    icon: Crown,
    highlighted: true,
    badge: "Mais Escolhido",
    features: [
      "Plantões ilimitados",
      "Integração WhatsApp para captura rápida",
      "Dossiê Fiscal Premium",
      "Monitor de otimização tributária",
      "Exportação contábil CSV",
      "Patrimônio e DIRPF com revisão assistida",
    ],
  },
  {
    name: "Concierge",
    price: "R$ 499",
    period: "/mês",
    description: "Para operação médica de alta renda com escritório contábil integrado.",
    cta: "Solicitar Concierge",
    icon: ShieldCheck,
    concierge: true,
    features: [
      "Tudo do DocFin Pro",
      "Integração BPO contábil",
      "Painel do contador multi-cliente",
      "Revisão mensal assistida",
      "Prioridade nas automações WhatsApp",
      "Apoio operacional para rotina PJ/PF",
    ],
  },
];

const faqs = [
  {
    question: "Posso cancelar a qualquer momento?",
    answer:
      "Sim. A proposta do Beta é validar valor real sem prender o médico em contrato longo. Você mantém controle total sobre a sua rotina e seus dados.",
  },
  {
    question: "Isso substitui meu contador?",
    answer:
      "Não. O DocFin organiza plantões, recebíveis, patrimônio e dossiês para reduzir retrabalho e entregar dados melhores ao escritório contábil.",
  },
  {
    question: "Como funciona o Beta exclusivo?",
    answer:
      "Ao escolher um plano pago nesta fase, você entra no grupo de médicos selecionados e recebe 3 meses de acesso total gratuito.",
  },
];

function handleFakeDoor(planName: string) {
  logger.info(`Interesse registrado no plano ${planName}.`);
  toast.success("Bem-vindo ao Beta Exclusivo! Você foi selecionado e ganhou 3 meses de acesso total gratuito.", {
    duration: 7000,
  });
}

function PricingPage() {
  return (
    <div className="px-5 py-6 sm:px-0 md:py-8">
      <section className="premium-card relative overflow-hidden rounded-2xl p-6 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(15,118,110,0.24),transparent_34rem)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Beta exclusivo DocFin
            </span>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Invista na sua paz de espírito fiscal.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Economize tempo, reduza ruído com o contador e teste o nível de automação que faz sentido para a sua rotina médica.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ["Sem cobrança agora", "Convite Beta com acesso gratuito"],
              ["3 meses grátis", "Acesso total para médicos selecionados"],
              ["Dados protegidos", "Sem alterar seu fluxo financeiro atual"],
            ].map(([title, subtitle]) => (
              <div key={title} className="rounded-2xl border border-border/80 bg-surface/70 p-4">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3 lg:items-stretch">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          const isPaid = tier.name !== "Starter";
          return (
            <article
              key={tier.name}
              className={`relative flex min-h-full flex-col rounded-2xl border p-6 transition-all duration-300 ${
                tier.highlighted
                  ? "border-primary/70 bg-[linear-gradient(180deg,rgba(15,118,110,0.18),rgba(15,17,21,0.98))] shadow-[0_0_70px_rgba(15,118,110,0.22)] lg:-mt-4 lg:scale-[1.02]"
                  : tier.concierge
                    ? "border-slate-800 bg-black/55 shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
                    : "premium-card"
              }`}
            >
              {tier.badge && (
                <span className="absolute right-5 top-5 rounded-full border border-primary/50 bg-primary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  {tier.badge}
                </span>
              )}

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>

              <div className="mt-5">
                <h2 className="text-xl font-semibold text-foreground">{tier.name}</h2>
                <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{tier.description}</p>
              </div>

              <div className="mt-6 flex items-end gap-2">
                <span className="text-4xl font-semibold tracking-tight text-foreground">{tier.price}</span>
                <span className="pb-1 text-sm font-medium text-muted-foreground">{tier.period}</span>
              </div>

              <button
                type="button"
                onClick={() => (isPaid ? handleFakeDoor(tier.name) : toast.info("Plano Starter liberado. Você já pode começar pelo Dashboard."))}
                className={`mt-6 inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  tier.highlighted
                    ? "bg-primary text-primary-foreground shadow-[0_0_28px_rgba(15,118,110,0.24)] hover:bg-primary/90"
                    : tier.concierge
                      ? "border border-primary/45 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                      : "border border-border bg-surface text-foreground hover:border-primary/50 hover:text-primary"
                }`}
              >
                {tier.cta}
              </button>

              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.4} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="premium-card rounded-2xl p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
            <WalletCards className="h-5 w-5 text-primary" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-foreground">Preço é parte da confiança.</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Nesta fase, a escolha de um plano pago libera o convite para o Beta exclusivo. Você testa o produto completo antes de qualquer cobrança.
          </p>
          <Link
            to="/dashboard"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground transition hover:border-primary/45 hover:text-primary"
          >
            Voltar ao Dashboard
          </Link>
        </div>

        <div className="premium-card rounded-2xl p-2">
          <Accordion.Root type="single" collapsible className="divide-y divide-border/70">
            {faqs.map((item) => (
              <Accordion.Item key={item.question} value={item.question} className="px-4">
                <Accordion.Header>
                  <Accordion.Trigger className="group flex min-h-16 w-full items-center justify-between gap-4 text-left text-sm font-semibold text-foreground outline-none transition hover:text-primary">
                    {item.question}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden pb-5 text-sm leading-7 text-muted-foreground data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  {item.answer}
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>
      </section>
    </div>
  );
}
