/**
 * ABOUT ZENITH — Executive Brochure Page
 * 
 * Founder identity, AI pillar cards, and compliance governance footer.
 * Design: Pure white background, Cobalt Blue (#002D62) accents, Slate Gray text.
 */

import { Brain, Shield, Sparkles, Globe, Scale, Award, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';

const PILLARS = [
  {
    name: 'LEXIS',
    subtitle: 'Intelligence Engine',
    icon: Brain,
    description:
      'The cognitive core of ZENITH. LEXIS performs automatic document ingestion, multi-format classification, and intelligent cross-referencing of commercial invoices, transport documents, and manifests. It applies heuristic tariff classification aligned with WCO Harmonized System standards.',
    color: 'text-[#002D62]',
    bg: 'bg-[#002D62]/5',
    border: 'border-[#002D62]/15',
  },
  {
    name: 'ZOD',
    subtitle: 'Integrity Engine',
    icon: Shield,
    description:
      'The forensic auditor of every transaction. ZOD performs real-time validation of data integrity, detects subvaluation patterns, flags GTIN/HS mismatches, and enforces CAUCA/RECAUCA compliance. Every finding is backed by legal citations and regulatory references.',
    color: 'text-[#B45309]',
    bg: 'bg-[#B45309]/5',
    border: 'border-[#B45309]/15',
  },
  {
    name: 'STELLA',
    subtitle: 'Compliance Advisor',
    icon: Sparkles,
    description:
      'The senior strategic advisor. Stella performs compliance triage — routing shipments through Green, Amber, and Red lanes. She monitors cash flow exposure, regulatory permit requirements, and provides proactive alerts on volume anomalies and ANA credit line management.',
    color: 'text-[#1D4ED8]',
    bg: 'bg-[#1D4ED8]/5',
    border: 'border-[#1D4ED8]/15',
  },
];

const STANDARDS = [
  { label: 'WCO', full: 'World Customs Organization' },
  { label: 'WTO', full: 'World Trade Organization' },
  { label: 'CAUCA', full: 'Central American Uniform Customs Code' },
  { label: 'RECAUCA', full: 'CAUCA Regulations' },
  { label: 'OEA', full: 'Authorized Economic Operator' },
  { label: 'BASC', full: 'Business Alliance for Secure Commerce' },
];

export default function AboutZenithPage() {
  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF' }}>
      {/* Navigation */}
      <div className="max-w-5xl mx-auto px-6 pt-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-70"
          style={{ color: '#002D62' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Platform
        </Link>
      </div>

      {/* Hero */}
      <header className="max-w-5xl mx-auto px-6 pt-12 pb-16">
        <div className="space-y-4">
          <p
            className="text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: '#002D62' }}
          >
            About the Platform
          </p>
          <h1
            className="text-4xl md:text-5xl font-bold leading-tight"
            style={{ color: '#1E293B', fontFamily: 'Inter, sans-serif' }}
          >
            ZENITH
          </h1>
          <p
            className="text-lg max-w-2xl leading-relaxed"
            style={{ color: '#475569' }}
          >
            A next-generation customs intelligence platform that transforms traditional
            brokerage operations into a high-velocity, AI-driven digital fortress — built
            for the realities of international trade in 2026.
          </p>
        </div>
      </header>

      <Separator className="max-w-5xl mx-auto" style={{ backgroundColor: '#E2E8F0' }} />

      {/* Founder Section */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-12 items-start">
          {/* Left — Profile Placeholder */}
          <div className="flex flex-col items-center md:items-start">
            <div
              className="w-56 h-56 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: '#F1F5F9',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              }}
            >
              <div className="text-center space-y-2">
                <div
                  className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                  style={{ backgroundColor: '#002D62' }}
                >
                  <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter' }}>
                    DP
                  </span>
                </div>
                <p className="text-xs" style={{ color: '#94A3B8' }}>
                  Professional Portrait
                </p>
              </div>
            </div>
          </div>

          {/* Right — Bio */}
          <div className="space-y-5">
            <div>
              <h2
                className="text-2xl font-bold"
                style={{ color: '#1E293B', fontFamily: 'Inter' }}
              >
                Demostenes Perez Castillero
              </h2>
              <p
                className="text-sm font-medium mt-1"
                style={{ color: '#002D62' }}
              >
                Founder & Chief Visionary Officer
              </p>
            </div>

            <p
              className="text-base leading-relaxed"
              style={{ color: '#475569' }}
            >
              Architect of the ZENITH ecosystem. A pioneer in transforming traditional customs
              brokerage into a high-velocity, AI-driven digital fortress. Under his leadership,
              ZENITH bridges the gap between international trade law (WCO/WTO) and 2026
              technological excellence.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              {['AI Architecture', 'Customs Law', 'Trade Compliance', 'Digital Transformation'].map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    color: '#002D62',
                    backgroundColor: 'rgba(0,45,98,0.06)',
                    border: '1px solid rgba(0,45,98,0.12)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-5xl mx-auto" style={{ backgroundColor: '#E2E8F0' }} />

      {/* AI Pillars */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="space-y-2 mb-10">
          <p
            className="text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: '#002D62' }}
          >
            Artificial Intelligence Triad
          </p>
          <h2
            className="text-2xl font-bold"
            style={{ color: '#1E293B' }}
          >
            The Pillars of ZENITH AI
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILLARS.map(pillar => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.name}
                className="rounded-xl p-6 space-y-4 transition-all duration-200 hover:shadow-md"
                style={{
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${pillar.bg} ${pillar.border}`}
                    style={{ border: '1px solid' }}
                  >
                    <Icon className={`w-5 h-5 ${pillar.color}`} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: '#1E293B' }}>
                      {pillar.name}
                    </h3>
                    <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#94A3B8' }}>
                      {pillar.subtitle}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Compliance Governance Bar */}
      <section
        className="py-10"
        style={{ backgroundColor: '#F8FAFC' }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <p
            className="text-center text-xs font-semibold uppercase tracking-[0.3em] mb-6"
            style={{ color: '#002D62' }}
          >
            Global Compliance Standards
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {STANDARDS.map(std => (
              <div
                key={std.label}
                className="flex items-center gap-2 px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                }}
              >
                <Globe className="w-3.5 h-3.5" style={{ color: '#002D62' }} />
                <span className="text-xs font-semibold" style={{ color: '#1E293B' }}>
                  {std.label}
                </span>
                <span className="text-[10px]" style={{ color: '#94A3B8' }}>
                  {std.full}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* System Footer */}
      <footer
        className="py-6 text-center"
        style={{ backgroundColor: '#F1F5F9', borderTop: '1px solid #E2E8F0' }}
      >
        <p style={{ color: '#94A3B8', fontSize: '9px', fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em' }}>
          Systemic DNA by Demostenes Perez Castillero | v2.0.26
        </p>
        <p style={{ color: '#CBD5E1', fontSize: '8px', fontFamily: 'Inter, sans-serif', marginTop: '4px' }}>
          ZENITH Customs Intelligence Platform · Powered by Lexis AI Architecture · © 2026
        </p>
      </footer>
    </div>
  );
}
