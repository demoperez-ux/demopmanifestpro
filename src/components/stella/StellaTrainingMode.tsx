/**
 * STELLA TRAINING MODE — "Guíame en este proceso"
 * Contextual step-by-step training overlay with knowledge search
 */

import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  GraduationCap, Search, ChevronRight, ChevronLeft, CheckCircle2,
  BookOpen, AlertTriangle, Calculator, X, Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  getTrainingStepsForRoute,
  getArticlesForRoute,
  searchKnowledge,
  getNivelLabel,
  type KnowledgeArticle,
  type TrainingStep,
} from '@/lib/stella/StellaKnowledgeBase';

interface Props {
  onClose: () => void;
  onAskStella: (question: string) => void;
}

type ViewMode = 'guide' | 'search' | 'article';

export function StellaTrainingMode({ onClose, onAskStella }: Props) {
  const location = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('guide');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGuideIndex, setActiveGuideIndex] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);

  const trainingGuides = useMemo(
    () => getTrainingStepsForRoute(location.pathname),
    [location.pathname]
  );

  const contextArticles = useMemo(
    () => getArticlesForRoute(location.pathname),
    [location.pathname]
  );

  const searchResults = useMemo(
    () => searchQuery.trim().length > 2 ? searchKnowledge(searchQuery) : [],
    [searchQuery]
  );

  const currentGuide = trainingGuides[activeGuideIndex];
  const currentStep = currentGuide?.steps[activeStepIndex];
  const totalSteps = currentGuide?.steps.length ?? 0;
  const completedCount = currentGuide?.steps.filter((_, i) =>
    completedSteps.has(`${activeGuideIndex}-${i}`)
  ).length ?? 0;

  const handleStepComplete = () => {
    const key = `${activeGuideIndex}-${activeStepIndex}`;
    setCompletedSteps(prev => new Set([...prev, key]));
    if (activeStepIndex < totalSteps - 1) {
      setActiveStepIndex(prev => prev + 1);
    }
  };

  const nivelIcon = (nivel: number) => {
    switch (nivel) {
      case 1: return <BookOpen className="w-3.5 h-3.5" />;
      case 2: return <AlertTriangle className="w-3.5 h-3.5" />;
      case 3: return <Calculator className="w-3.5 h-3.5" />;
      case 4: return <ChevronRight className="w-3.5 h-3.5" />;
      default: return <Lightbulb className="w-3.5 h-3.5" />;
    }
  };

  const nivelColor = (nivel: number) => {
    switch (nivel) {
      case 1: return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 2: return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 3: return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 4: return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    }
  };

  const renderArticleDetail = (article: KnowledgeArticle) => (
    <div className="space-y-3">
      <button
        onClick={() => { setSelectedArticle(null); setViewMode('search'); }}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-3 h-3" /> Volver
      </button>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn('text-[10px]', nivelColor(article.nivel))}>
          {nivelIcon(article.nivel)} N{article.nivel}
        </Badge>
        <h3 className="text-sm font-semibold text-foreground">{article.titulo}</h3>
      </div>
      <div className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
        {article.contenido}
      </div>
      {article.formulasRelacionadas && (
        <div className="space-y-2 mt-3">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1">
            <Calculator className="w-3 h-3 text-primary" /> Fórmulas de Cálculo
          </h4>
          {article.formulasRelacionadas.map((f, i) => (
            <div key={i} className="bg-muted/50 rounded-lg p-2.5 border border-border text-[11px] space-y-1">
              <p className="font-semibold text-foreground">{f.nombre}</p>
              <p className="font-mono text-primary">{f.formula}</p>
              <p className="text-muted-foreground">Ejemplo: {f.ejemplo}</p>
              <p className="text-muted-foreground/60 text-[10px]">📖 {f.baseLegal}</p>
            </div>
          ))}
        </div>
      )}
      {article.pasosGuiados && (
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs mt-2"
          onClick={() => {
            const idx = trainingGuides.findIndex(g => g.article.id === article.id);
            if (idx >= 0) {
              setActiveGuideIndex(idx);
              setActiveStepIndex(0);
              setViewMode('guide');
            }
          }}
        >
          <GraduationCap className="w-3.5 h-3.5 mr-1.5" /> Iniciar guía paso a paso
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="w-full text-xs text-muted-foreground"
        onClick={() => onAskStella(`Necesito más detalles sobre: ${article.titulo}`)}
      >
        Preguntarle a Stella sobre esto →
      </Button>
    </div>
  );

  const renderArticleList = (articles: KnowledgeArticle[], emptyMsg: string) => {
    if (articles.length === 0) {
      return (
        <div className="text-center py-6">
          <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">{emptyMsg}</p>
        </div>
      );
    }
    return (
      <div className="space-y-1.5">
        {articles.map(article => (
          <button
            key={article.id}
            onClick={() => { setSelectedArticle(article); setViewMode('article'); }}
            className="w-full text-left p-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors group"
          >
            <div className="flex items-start gap-2">
              <Badge variant="outline" className={cn('text-[9px] mt-0.5 flex-shrink-0', nivelColor(article.nivel))}>
                N{article.nivel}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                  {article.titulo}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{article.categoria}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-primary/5">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Training Mode</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'guide' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => setViewMode('guide')}
          >
            Guía
          </Button>
          <Button
            variant={viewMode === 'search' || viewMode === 'article' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => { setViewMode('search'); setSelectedArticle(null); }}
          >
            Buscar
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
        {/* ─── ARTICLE DETAIL VIEW ─── */}
        {viewMode === 'article' && selectedArticle && renderArticleDetail(selectedArticle)}

        {/* ─── SEARCH VIEW ─── */}
        {viewMode === 'search' && !selectedArticle && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="¿Cómo pago los impuestos de Amazon?"
                className="w-full pl-8 pr-3 py-2 text-xs bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                autoFocus
              />
            </div>
            {searchQuery.trim().length > 2
              ? renderArticleList(searchResults, 'No se encontraron resultados. Intente con otros términos.')
              : (
                <div className="space-y-3">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                    Artículos para esta pantalla
                  </p>
                  {renderArticleList(contextArticles, 'No hay artículos específicos para esta pantalla.')}
                </div>
              )
            }
          </div>
        )}

        {/* ─── GUIDE VIEW ─── */}
        {viewMode === 'guide' && (
          <div className="space-y-3">
            {trainingGuides.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <GraduationCap className="w-10 h-10 text-muted-foreground/20 mx-auto" />
                <div>
                  <p className="text-xs text-muted-foreground">No hay guía paso a paso para esta pantalla.</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Intente buscar en la base de conocimiento.</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setViewMode('search')}
                >
                  <Search className="w-3 h-3 mr-1" /> Buscar en manual
                </Button>
              </div>
            ) : (
              <>
                {/* Guide selector if multiple */}
                {trainingGuides.length > 1 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                      Guías disponibles
                    </p>
                    {trainingGuides.map((g, i) => (
                      <button
                        key={g.article.id}
                        onClick={() => { setActiveGuideIndex(i); setActiveStepIndex(0); }}
                        className={cn(
                          'w-full text-left px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
                          i === activeGuideIndex
                            ? 'border-primary/30 bg-primary/5 text-primary font-medium'
                            : 'border-border text-muted-foreground hover:border-primary/20'
                        )}
                      >
                        {g.article.titulo}
                      </button>
                    ))}
                  </div>
                )}

                {/* Active guide */}
                {currentGuide && (
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xs font-semibold text-foreground">{currentGuide.article.titulo}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Progress value={(completedCount / totalSteps) * 100} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground">{completedCount}/{totalSteps}</span>
                      </div>
                    </div>

                    {/* Step cards */}
                    <div className="space-y-2">
                      {currentGuide.steps.map((step, i) => {
                        const isActive = i === activeStepIndex;
                        const isDone = completedSteps.has(`${activeGuideIndex}-${i}`);
                        return (
                          <button
                            key={i}
                            onClick={() => setActiveStepIndex(i)}
                            className={cn(
                              'w-full text-left rounded-lg border p-2.5 transition-all',
                              isActive ? 'border-primary/40 bg-primary/5 shadow-sm' : 'border-border',
                              isDone && 'opacity-60'
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <div className={cn(
                                'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold',
                                isDone
                                  ? 'bg-green-500/10 text-green-600'
                                  : isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-muted text-muted-foreground'
                              )}>
                                {isDone ? <CheckCircle2 className="w-3 h-3" /> : step.paso}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-xs font-medium', isDone ? 'line-through text-muted-foreground' : 'text-foreground')}>
                                  {step.titulo}
                                </p>
                                {isActive && (
                                  <div className="mt-1.5 space-y-1.5">
                                    <p className="text-[11px] text-foreground/80 leading-relaxed">
                                      {step.instruccion}
                                    </p>
                                    {step.tip && (
                                      <div className="flex items-start gap-1.5 bg-amber-500/5 border border-amber-500/10 rounded-md px-2 py-1.5">
                                        <Lightbulb className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-amber-700 dark:text-amber-400">{step.tip}</p>
                                      </div>
                                    )}
                                    <Button
                                      size="sm"
                                      className="h-7 text-[10px] px-3"
                                      onClick={(e) => { e.stopPropagation(); handleStepComplete(); }}
                                    >
                                      <CheckCircle2 className="w-3 h-3 mr-1" /> Completado
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px]"
                        disabled={activeStepIndex === 0}
                        onClick={() => setActiveStepIndex(prev => prev - 1)}
                      >
                        <ChevronLeft className="w-3 h-3 mr-0.5" /> Anterior
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px]"
                        disabled={activeStepIndex >= totalSteps - 1}
                        onClick={() => setActiveStepIndex(prev => prev + 1)}
                      >
                        Siguiente <ChevronRight className="w-3 h-3 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
