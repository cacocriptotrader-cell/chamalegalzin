import React, { useState, useRef } from "react";
import { GeneralGoal, goalProgressPercent, GOAL_CATEGORY_LABELS, brl2 } from "@/lib/store";
import { Trash2, Edit2, Upload, X } from "lucide-react";

interface GoalCardProps {
  goal: GeneralGoal;
  onUpdate: (patch: Partial<GeneralGoal>) => void;
  onDelete: () => void;
}

export function GoalCard({ goal, onUpdate, onDelete }: GoalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(goal.name);
  const [editTarget, setEditTarget] = useState(goal.targetAmount);
  const [editSaved, setEditSaved] = useState(goal.saved);
  const [editDate, setEditDate] = useState(goal.targetDate);
  const [editCategory, setEditCategory] = useState(goal.category);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const progress = goalProgressPercent(goal);
  const daysLeft = Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onUpdate({ coverImage: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = () => {
    onUpdate({
      name: editName,
      targetAmount: editTarget,
      saved: editSaved,
      targetDate: editDate,
      category: editCategory,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="glass-card rounded-2xl p-5 space-y-4 border border-primary/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg">Editar Meta</h3>
          <button onClick={() => setIsEditing(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Nome</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Categoria</label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as any)}
              className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Object.entries(GOAL_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Valor Alvo (R$)</label>
              <input
                type="number"
                value={editTarget}
                onChange={(e) => setEditTarget(+e.target.value)}
                className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Já Guardado (R$)</label>
              <input
                type="number"
                value={editSaved}
                onChange={(e) => setEditSaved(+e.target.value)}
                className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Data Alvo</label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Foto de Capa</label>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated/40 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition"
            >
              <Upload className="h-4 w-4" /> Selecionar Imagem
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {goal.coverImage && (
              <p className="text-[10px] text-success mt-1">✓ Imagem de capa definida</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSaveEdit}
            className="flex-1 rounded-lg py-2 text-sm font-medium text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            Salvar
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="flex-1 rounded-lg py-2 text-sm font-medium border border-border text-foreground hover:bg-surface-elevated/40"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative rounded-2xl overflow-hidden border border-border transition-all hover:border-primary/50"
      style={{
        backgroundImage: goal.coverImage ? `url(${goal.coverImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Backdrop blur para garantir legibilidade */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Conteúdo */}
      <div className="relative p-5 space-y-4 z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-slate-300 mb-1">{GOAL_CATEGORY_LABELS[goal.category]}</p>
            <h3 className="font-display text-xl text-white truncate">{goal.name}</h3>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              title="Editar meta"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg bg-destructive/20 hover:bg-destructive/40 text-destructive transition"
              title="Remover meta"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progresso */}
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-mono">{brl2(goal.saved)} / {brl2(goal.targetAmount)}</p>
            </div>
            <p className="text-[11px] text-slate-300 font-mono">{progress.toFixed(0)}%</p>
          </div>
          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress}%`,
                background: progress >= 100 ? "var(--gradient-gold)" : "var(--gradient-primary)",
              }}
            />
          </div>
        </div>

        {/* Data alvo */}
        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <span>Data alvo: {new Date(goal.targetDate).toLocaleDateString("pt-BR")}</span>
          <span className={daysLeft < 0 ? "text-destructive" : daysLeft < 90 ? "text-warning" : "text-success"}>
            {daysLeft < 0 ? `Vencido há ${Math.abs(daysLeft)}d` : daysLeft === 0 ? "Hoje!" : `${daysLeft}d`}
          </span>
        </div>
      </div>
    </div>
  );
}
