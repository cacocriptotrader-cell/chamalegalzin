import { useState, useEffect, useRef } from "react";
import { useStore, type TrainingLevel } from "@/lib/store";
import { ArrowRight, Command, User, Stethoscope, MapPin, Loader2, GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function Onboarding() {
  const { completeOnboarding, updateUserProfile, setBase } = useStore();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel>("Médico Generalista");
  const [specialtyName, setSpecialtyName] = useState("");
  const [baseAddress, setBaseAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [suggestions, setSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [openSug, setOpenSug] = useState(false);
  const [apiError, setApiError] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (abortController.current) abortController.current.abort();
    };
  }, []);

  const showSpecialty = ["Pós-Graduando", "Residente", "Especialista (com RQE)"].includes(trainingLevel);

  function searchPlaces(q: string) {
    setBaseAddress(q);
    setOpenSug(true);
    setApiError(false);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (abortController.current) abortController.current.abort();

    if (q.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    setSearching(true);
    abortController.current = new AbortController();

    searchTimeout.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=br&q=${encodeURIComponent(q)}`;
        const r = await fetch(url, {
          signal: abortController.current?.signal,
          headers: { "Accept-Language": "pt-BR", "User-Agent": "Docfin/1.0" }
        });

        if (!r.ok) throw new Error("API request failed");

        const data: Array<any> = await r.json();
        setSuggestions(data);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Address search error:", err);
          setApiError(true);
          setSuggestions([]);
        }
      } finally {
        setSearching(false);
      }
    }, 500);
  }

  function pickSuggestion(item: { display_name: string; lat: string; lon: string }) {
    setBaseAddress(item.display_name);
    setLat(parseFloat(item.lat));
    setLng(parseFloat(item.lon));
    setOpenSug(false);
    setSuggestions([]);
  }

  async function handleNext() {
    if (step === 1) {
      setStep(2);
    } else {
      setSaving(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const { error } = await supabase.from("profiles").upsert({
          id: user.id,
          full_name: fullName,
          training_level: trainingLevel,
          specialty_name: showSpecialty ? specialtyName : null,
          base_address: baseAddress,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;

        updateUserProfile({ fullName, trainingLevel, specialtyName: showSpecialty ? specialtyName : undefined, baseAddress });
        if (lat !== null && lng !== null) {
          setBase({ label: baseAddress, lat, lng });
        }
        completeOnboarding();
        window.location.href = "/"; // Force reload to update OnboardingGate state
      } catch (err: any) {
        console.error("Erro ao salvar perfil:", err);
        alert("Erro ao salvar perfil: " + err.message);
      } finally {
        setSaving(false);
      }
    }
  }

  const isStep2Valid = fullName.trim() !== "" && baseAddress.trim() !== "" && (!showSpecialty || specialtyName.trim() !== "");

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-zinc-950 text-white">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-12">
          <div className="h-7 w-7 rounded-md bg-white text-black flex items-center justify-center">
            <Command className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight">Docfin</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 border-l border-white/10 pl-2 ml-1">
            Wealth
          </span>
        </div>

        {step === 1 ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl font-semibold tracking-tight leading-tight">
              Wealth management<br />para médicos.
            </h1>
            <p className="text-base text-zinc-400 mt-6 leading-relaxed">
              Fluxo de caixa, custo real por plantão, ledger de cirurgias e
              projeções de independência financeira — em um terminal único.
            </p>

            <button
              onClick={handleNext}
              className="mt-10 inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-all duration-200"
            >
              Começar <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2 mb-8">
              <h2 className="text-2xl font-semibold tracking-tight">Configuração Inicial</h2>
              <p className="text-sm text-zinc-500">Dados fundamentais para personalização e logística.</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium flex items-center gap-2">
                  <User className="h-3 w-3" /> Nome Completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Dr. João Silva"
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl h-12 px-4 text-sm focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium flex items-center gap-2">
                  <GraduationCap className="h-3 w-3" /> Nível de Formação
                </label>
                <select
                  value={trainingLevel}
                  onChange={(e) => setTrainingLevel(e.target.value as TrainingLevel)}
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl h-12 px-4 text-sm focus:outline-none focus:border-white/20 transition-colors appearance-none"
                >
                  <option value="Acadêmico de Medicina">Acadêmico de Medicina</option>
                  <option value="Médico Generalista">Médico Generalista</option>
                  <option value="Pós-Graduando">Pós-Graduando</option>
                  <option value="Residente">Residente</option>
                  <option value="Especialista (com RQE)">Especialista (com RQE)</option>
                </select>
              </div>

              {showSpecialty && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium flex items-center gap-2">
                    <Stethoscope className="h-3 w-3" /> Área de Especialidade
                  </label>
                  <input
                    type="text"
                    value={specialtyName}
                    onChange={(e) => setSpecialtyName(e.target.value)}
                    placeholder="Ex: Anestesiologia, Cardiologia, Dermatologia..."
                    className="w-full bg-zinc-900 border border-white/5 rounded-xl h-12 px-4 text-sm focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>
              )}

              <div className="space-y-2 relative">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium flex items-center gap-2">
                  <MapPin className="h-3 w-3" /> Endereço Base / Residência
                </label>
                <input
                  type="text"
                  value={baseAddress}
                  onChange={(e) => searchPlaces(e.target.value)}
                  onFocus={() => setOpenSug(true)}
                  placeholder="Digite seu endereço residencial"
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl h-12 px-4 text-sm focus:outline-none focus:border-white/20 transition-colors"
                  autoComplete="off"
                />
                {openSug && (suggestions.length > 0 || searching) && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-xl max-h-48 overflow-auto shadow-2xl">
                    {searching && <p className="p-3 text-[11px] text-zinc-500">Buscando...</p>}
                    {!searching && suggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => pickSuggestion(sug)}
                        className="w-full text-left px-4 py-3 text-xs hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                      >
                        <p className="text-zinc-300 truncate">{sug.display_name}</p>
                      </button>
                    ))}
                  </div>
                )}
                {apiError && (
                  <p className="text-[10px] text-zinc-500 mt-1">
                    API de mapas indisponível. Digite o endereço manualmente.
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={!isStep2Valid || saving}
              className="w-full mt-10 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Finalizar Configuração <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </>
              )}
            </button>
          </div>
        )}

        <p className="text-[11px] text-zinc-600 mt-12 font-mono">
          v1.0 · criptografia local de ponta a ponta
        </p>
      </div>
    </div>
  );
}
