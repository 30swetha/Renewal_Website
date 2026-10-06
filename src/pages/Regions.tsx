import React, { useState } from 'react';
import { Globe, Building2, Award } from 'lucide-react';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';
import { db } from '../lib/database';

export const RegionsPage: React.FC = () => {
  const [selectedRegion, setSelectedRegion] = useState<string>('Middle East');
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  const todayOpps = db.getOpportunitiesForDate('2026-10-06');

  // Compute Region Breakdown
  const regionMap = new Map<string, {
    region: string;
    totalAcv: number;
    count: number;
    opps: typeof todayOpps;
  }>();

  todayOpps.forEach(opp => {
    const reg = opp.region || 'Sub-Saharan Africa';
    const existing = regionMap.get(reg) || { region: reg, totalAcv: 0, count: 0, opps: [] };
    existing.totalAcv += opp.acv_amount;
    existing.count += 1;
    existing.opps.push(opp);
    regionMap.set(reg, existing);
  });

  const regionsList = Array.from(regionMap.values()).sort((a, b) => b.totalAcv - a.totalAcv);
  const activeRegionData = regionMap.get(selectedRegion) || regionsList[0];

  // Top 10 Opportunities in Selected Region
  const top10Opps = activeRegionData
    ? [...activeRegionData.opps].sort((a, b) => b.acv_amount - a.acv_amount).slice(0, 10)
    : [];

  // Max ACV in top 10 for horizontal bar scaling
  const maxAcvInTop10 = top10Opps.length > 0 ? top10Opps[0].acv_amount : 1;

  // Leading Business Unit in Selected Region
  const buCountMap = new Map<string, number>();
  activeRegionData?.opps.forEach(o => {
    buCountMap.set(o.business_unit, (buCountMap.get(o.business_unit) || 0) + o.acv_amount);
  });
  const leadingBu = Array.from(buCountMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Enterprise';
  const top10LeadingBuOpps = activeRegionData?.opps
    .filter(o => o.business_unit === leadingBu)
    .sort((a, b) => b.acv_amount - a.acv_amount)
    .slice(0, 10) || [];

  return (
    <div className="space-y-6 pb-16 bg-slate-50 min-h-screen text-slate-900">
      
      {/* Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-indigo-600" />
            <span>Sub-Regions Overview & World Portfolio Mix</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Regional performance breakdown, top ranked opportunities, and leading business units
          </p>
        </div>
      </div>

      {/* Region Overview Tiles / Map Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {regionsList.map(item => {
          const isSelected = selectedRegion === item.region;
          return (
            <div
              key={item.region}
              onClick={() => setSelectedRegion(item.region)}
              className={`p-5 rounded-3xl border transition-all cursor-pointer space-y-2 ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white border-slate-200 hover:border-indigo-400 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className={`font-black text-sm ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {item.region}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-700'
                }`}>
                  {item.count} opps
                </span>
              </div>
              <div className="text-2xl font-black">
                ${(item.totalAcv / 1e6).toFixed(2)}M
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Region Detailed Analysis */}
      {activeRegionData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Top 10 Opportunities in Selected Region */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              <span>Top 10 ACV Deals in {selectedRegion}</span>
            </h3>

            <div className="space-y-3">
              {top10Opps.map((opp, idx) => {
                const widthPct = (opp.acv_amount / maxAcvInTop10) * 100;
                return (
                  <div
                    key={opp.opportunity_id}
                    onClick={() => setSelectedOppId(opp.opportunity_id)}
                    className="p-3 bg-slate-50 hover:bg-blue-50/70 rounded-2xl border border-slate-200 cursor-pointer transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 truncate max-w-[200px]">
                        #{idx + 1}. {opp.opportunity_name}
                      </span>
                      <span className="font-black text-slate-900 font-mono">
                        ${(opp.acv_amount / 1e6).toFixed(2)}M
                      </span>
                    </div>

                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div style={{ width: `${widthPct}%` }} className="h-full bg-blue-600 rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leading Business Unit Breakdown */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" />
              <span>Leading BU in Region: <strong>{leadingBu}</strong></span>
            </h3>

            <div className="space-y-3">
              {top10LeadingBuOpps.map((opp) => (
                <div
                  key={opp.opportunity_id}
                  onClick={() => setSelectedOppId(opp.opportunity_id)}
                  className="p-3 bg-slate-50 hover:bg-indigo-50/70 rounded-2xl border border-slate-200 cursor-pointer transition-colors space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-600">{opp.opportunity_id}</span>
                    <span className="font-extrabold text-slate-900">${(opp.acv_amount / 1e6).toFixed(2)}M</span>
                  </div>
                  <h4 className="font-bold text-slate-900 truncate">{opp.opportunity_name}</h4>
                  <p className="text-[11px] text-slate-500">{opp.approval_status} &bull; {opp.expiry_quarter}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default RegionsPage;
