const fs = require('fs');
const path = require('path');

const targetFile = 'd:/booran-warranty-new/app/(portal)/cases/new/page.tsx';

const content = `'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../../components/header';
import { useToast } from '../../../../components/toast';
import { api } from '../../../../lib/api';
import { FaultCategory, Site, Brand } from '../../../../lib/types';

export default function NewCaseWizard() {
  const router = useRouter();
  const { showToast } = useToast();

  const [sites, setSites] = useState<Site[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [vinDecoding, setVinDecoding] = useState(false);

  // Form State
  const [siteId, setSiteId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [roNumber, setRoNumber] = useState('CR-98421');
  const [vin, setVin] = useState('LGXCE4C86P0019283');
  const [odometer, setOdometer] = useState<number>(14250);
  const [make, setMake] = useState('BYD');
  const [model, setModel] = useState('ATTO 3 Extended');
  const [year, setYear] = useState<number>(2024);
  const [powertrain, setPowertrain] = useState<'EV' | 'Hybrid' | 'PHEV' | 'ICE'>('EV');
  const [technicianName, setTechnicianName] = useState('Jake Smith');
  const [concernTitle, setConcernTitle] = useState('High-voltage battery cooling loop moisture detected on dash cluster');
  const [faultCategory, setFaultCategory] = useState<FaultCategory>('Battery and high-voltage (HV) components');
  const [partReplaced, setPartReplaced] = useState(true);
  const [noiseFault, setNoiseFault] = useState(false);
  const [diagnosticsAvailable, setDiagnosticsAvailable] = useState(true);
  const [repairStage, setRepairStage] = useState<'Pre-repair only' | 'During repair' | 'Repair complete'>('Repair complete');

  // Evaluated Rules
  const [evaluatedRules, setEvaluatedRules] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('booran_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.name) setTechnicianName(user.name);
          if (user.defaultSiteId) setSiteId(user.defaultSiteId);
        } catch {
          // ignore
        }
      }
    }

    async function init() {
      try {
        const [sitesRes, brandsRes] = await Promise.all([api.getSites(), api.getBrands()]);
        setSites(sitesRes);
        setBrands(brandsRes);
        if (sitesRes.length > 0 && !siteId) setSiteId(sitesRes[0].id);
        if (brandsRes.length > 0) setBrandId(brandsRes[0].id);
      } catch (err) {
        console.error('Failed to load sites/brands:', err);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (siteId && sites.length > 0) {
      const matchedSite = sites.find((s) => s.id === siteId);
      if (matchedSite && matchedSite.roPrefix) {
        if (!roNumber || roNumber === 'CR-' || roNumber === 'CR-98421') {
          setRoNumber(\`\${matchedSite.roPrefix}\${Math.floor(10000 + Math.random() * 90000)}\`);
        }
      }
    }
  }, [siteId, sites]);

  useEffect(() => {
    if (brandId && faultCategory) {
      evaluateDynamicRules();
    }
  }, [brandId, faultCategory, partReplaced, noiseFault, diagnosticsAvailable, repairStage]);

  async function evaluateDynamicRules() {
    try {
      const res = await api.evaluateRules({
        brandId: brandId || 'brand_byd',
        faultCategory,
        partReplaced,
        noiseFault,
        diagnosticsAvailable,
        repairStage,
      });
      setEvaluatedRules(res);
    } catch (err) {
      console.error('Rules engine evaluation error:', err);
    }
  }

  async function handleDecodeVin() {
    if (!vin || vin.length !== 17) {
      showToast('VIN must be exactly 17 characters', 'error');
      return;
    }
    setVinDecoding(true);
    try {
      const decoded = await api.decodeVin(vin);
      setMake(decoded.make);
      setModel(decoded.model);
      setYear(decoded.year);
      setPowertrain(decoded.powertrain);
      showToast(\`Decoded: \${decoded.year} \${decoded.make} \${decoded.model} (\${decoded.powertrain}) via \${decoded.provider}\`, 'success');
    } catch (err: any) {
      showToast(err.message || 'VIN decode failed', 'error');
    } finally {
      setVinDecoding(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const created = await api.createCase({
        siteId: siteId || (sites[0]?.id || 'site_cranbourne_byd'),
        brandId: brandId || (brands[0]?.id || 'brand_byd'),
        roNumber,
        vin,
        odometer: Number(odometer),
        make,
        model,
        year: Number(year),
        powertrain,
        technicianId: 'tech_' + technicianName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        technicianName,
        concernTitle,
        faultCategory,
        partReplaced,
        noiseFault,
        diagnosticsAvailable,
        repairStage,
      });

      showToast(\`Warranty Case \${created.roNumber} initialized with \${evaluatedRules?.mandatoryCount || 8} mandatory gates!\`, 'success');
      router.push(\`/cases/\${created.id}\`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create warranty ticket', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col pb-12">
      <Header
        title="New Warranty RO Evidence Capture"
        subtitle="Start a guided technician evidence ticket with auto-evaluated OEM rules & Attachment A gates"
      />

      <div className="p-6 sm:p-8 max-w-4xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Rooftop & Brand */}
          <div className="glass-card-static p-6 border border-[#1a56db]/20 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#1a56db]/30 text-[#00f0ff] flex items-center justify-center text-xs">1</span>
              Dealership Rooftop & OEM Roster
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">Dealership Site</label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="input-field text-xs"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.roPrefix})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">OEM Brand</label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="input-field text-xs"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} — {b.seedChecklistReference}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Step 2: Vehicle & Identification Fast-Path */}
          <div className="glass-card-static p-6 border border-[#1a56db]/20 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#1a56db]/30 text-[#00f0ff] flex items-center justify-center text-xs">2</span>
              Vehicle Identification & RedBooks VIN Decoder
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">Repair Order (RO) #</label>
                <input
                  type="text"
                  required
                  value={roNumber}
                  onChange={(e) => setRoNumber(e.target.value)}
                  className="input-field text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">17-Digit Vehicle VIN</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    maxLength={17}
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    className="input-field text-xs font-mono uppercase tracking-wider flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleDecodeVin}
                    disabled={vinDecoding}
                    className="btn-ghost text-xs py-2 px-3 border-[#00f0ff]/40 text-[#00f0ff] hover:bg-[#00f0ff]/10 whitespace-nowrap"
                  >
                    {vinDecoding ? 'Decoding...' : 'Decode VIN'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">Make</label>
                <input
                  type="text"
                  required
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">Model</label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">Year</label>
                <input
                  type="number"
                  required
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">Odometer (km)</label>
                <input
                  type="number"
                  required
                  value={odometer}
                  onChange={(e) => setOdometer(Number(e.target.value))}
                  className="input-field text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Fault Category & Dynamic Evidence Requirements */}
          <div className="glass-card-static p-6 border border-[#1a56db]/20 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#1a56db]/30 text-[#00f0ff] flex items-center justify-center text-xs">3</span>
              Fault Classification & Attachment A Gate Resolver
            </h3>
            
            <div>
              <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">Fault Category (Attachment A)</label>
              <select
                value={faultCategory}
                onChange={(e) => setFaultCategory(e.target.value as FaultCategory)}
                className="input-field text-xs"
              >
                <option value="Oil leaks or seepage">Oil leaks or seepage</option>
                <option value="ECU or sensor internal faults">ECU or sensor internal faults</option>
                <option value="Software updates or program refreshes">Software updates or program refreshes</option>
                <option value="Battery and high-voltage (HV) components">Battery and high-voltage (HV) components</option>
                <option value="Charging system faults">Charging system faults</option>
                <option value="Powertrain, chassis or body component faults">Powertrain, chassis or body component faults</option>
                <option value="General / other (Tier 1 only)">General / other (Tier 1 only)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">Technician Stated Concern</label>
              <textarea
                rows={2}
                required
                value={concernTitle}
                onChange={(e) => setConcernTitle(e.target.value)}
                placeholder="Describe customer complaint & workshop findings..."
                className="input-field text-xs"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#cbd5e1] cursor-pointer">
                <input
                  type="checkbox"
                  checked={partReplaced}
                  onChange={(e) => setPartReplaced(e.target.checked)}
                  className="rounded border-[#1a56db] text-[#1a56db] focus:ring-[#00f0ff]"
                />
                <span>Part Replaced?</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-[#cbd5e1] cursor-pointer">
                <input
                  type="checkbox"
                  checked={noiseFault}
                  onChange={(e) => setNoiseFault(e.target.checked)}
                  className="rounded border-[#1a56db] text-[#1a56db] focus:ring-[#00f0ff]"
                />
                <span>Noise/Audio Fault?</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-[#cbd5e1] cursor-pointer">
                <input
                  type="checkbox"
                  checked={diagnosticsAvailable}
                  onChange={(e) => setDiagnosticsAvailable(e.target.checked)}
                  className="rounded border-[#1a56db] text-[#1a56db] focus:ring-[#00f0ff]"
                />
                <span>DTC Scan Available?</span>
              </label>
            </div>

            {/* Dynamic Rule Preview Output */}
            {evaluatedRules && (
              <div className="mt-4 p-4 rounded-xl bg-[#081225]/80 border border-[#00f0ff]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-pulse" />
                    <span className="text-xs font-bold text-[#00f0ff]">
                      {evaluatedRules.packName || 'Resolved Evidence Pack'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 text-[10px] font-bold">
                      {evaluatedRules.mandatoryCount || 0} Mandatory Gates
                    </span>
                    {evaluatedRules.optionalCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-gray-400 text-[10px]">
                        {evaluatedRules.optionalCount} Optional
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {Array.isArray(evaluatedRules.resolvedRules) && evaluatedRules.resolvedRules.map((rule: any, idx: number) => {
                    const ruleName = typeof rule === 'string' ? rule : (rule.name || rule.ruleKey || \`Rule \${idx + 1}\`);
                    const isMandatory = typeof rule === 'object' ? rule.isMandatory !== false : true;
                    const mediaType = typeof rule === 'object' ? (rule.mediaType || 'image') : 'image';
                    const guidance = typeof rule === 'object' ? rule.guidanceText : null;

                    return (
                      <div
                        key={typeof rule === 'object' ? (rule.id || rule.ruleKey || idx) : idx}
                        className="p-2.5 rounded-lg bg-[#0d1b3e] border border-[#1a56db]/20 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-semibold text-white truncate">{ruleName}</span>
                          <span className={\`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded \${
                            isMandatory ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50' : 'bg-slate-800 text-gray-400'
                          }\`}>
                            {isMandatory ? 'Required' : 'Optional'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                          <span className="capitalize">{mediaType}</span>
                          {guidance && <span className="text-gray-500 truncate max-w-[160px]">{guidance}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-ghost text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-xs py-3 px-8 shadow-[0_0_25px_rgba(26,86,219,0.5)]"
            >
              {loading ? 'Initializing Ticket...' : 'Create Ticket & Launch Evidence Capture →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(targetFile, content.trim() + '\n', 'utf8');
console.log('✅ Successfully updated cases/new/page.tsx with safe rule object rendering');
