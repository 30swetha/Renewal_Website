// Pluggable AI Assistant Engine & Rule-Based Fallback Controller
// Connects to OpenAI-compatible LLM endpoints or fallback Demo Engine executing read-only tools.

import {
  get_kpis,
  compare,
  top_opportunities,
  movement_summary,
  approval_breakdown,
  run_filtered_query,
} from './assistantTools';

export interface SourceChip {
  label: string;
  path: string;
}

export interface ToolExecutionTrace {
  toolName: string;
  args: Record<string, any>;
  result: any;
  timestamp: string;
}

export interface InlineChartConfig {
  type: 'bar' | 'pie' | 'kpi_grid';
  title: string;
  data: { label: string; value: number; color?: string }[];
}

export interface AssistantResponse {
  messageText: string;
  sources: SourceChip[];
  traces: ToolExecutionTrace[];
  inlineChart?: InlineChartConfig;
  isDemoMode: boolean;
}

// Configurable LLM options
export const getLLMConfig = () => {
  return {
    baseUrl: import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o',
  };
};

/**
 * Main Query Dispatcher
 */
export async function queryAssistant(userPrompt: string): Promise<AssistantResponse> {
  const config = getLLMConfig();

  // If user configured API key, attempt real OpenAI-compatible endpoint
  if (config.apiKey && config.apiKey.trim() !== '') {
    try {
      return await callRealLLMEndpoint(userPrompt, config);
    } catch (e) {
      console.warn('Real LLM endpoint call failed, falling back to Demo Mode:', e);
      return runDemoModeFallback(userPrompt);
    }
  }

  // Otherwise, use Demo Mode rule-based fallback
  return runDemoModeFallback(userPrompt);
}

/**
 * Demo Mode Rule-Based Intelligence Engine
 * Matches prompt keywords and invokes read-only tools
 */
function runDemoModeFallback(prompt: string): AssistantResponse {
  const q = prompt.toLowerCase().trim();
  const traces: ToolExecutionTrace[] = [];

  // Out of domain detection
  const outOfDomainKeywords = ['weather', 'recipe', 'python code', 'who won', 'movie', 'joke', 'capital of', 'translate'];
  if (outOfDomainKeywords.some(k => q.includes(k))) {
    return {
      messageText: `I am **Mobileum RenewIQ Assistant**, specialized exclusively in renewal opportunity analytics, ACV movement, expiry heatmaps, and approval funnels. I cannot answer general knowledge or out-of-domain questions like "${prompt}". Please ask me about deal status, ACV changes, approval bottlenecks, or regional trends!`,
      sources: [{ label: 'Overview Dashboard', path: '/dashboard' }],
      traces: [],
      isDemoMode: true,
    };
  }

  // Question 1: What changed since yesterday? / Compare
  if (q.includes('change') || q.includes('yesterday') || q.includes('compare') || q.includes('movement')) {
    const compRes = compare('2026-10-05', '2026-10-06');
    traces.push({
      toolName: 'compare',
      args: { date_a: '2026-10-05', date_b: '2026-10-06' },
      result: compRes,
      timestamp: new Date().toLocaleTimeString(),
    });

    const moveRes = movement_summary('2026-10-05', '2026-10-06');
    traces.push({
      toolName: 'movement_summary',
      args: { date_a: '2026-10-05', date_b: '2026-10-06' },
      result: moveRes,
      timestamp: new Date().toLocaleTimeString(),
    });

    const netStr = compRes.netAcvChange >= 0 
      ? `+$${(compRes.netAcvChange / 1e6).toFixed(2)}M` 
      : `-$${(Math.abs(compRes.netAcvChange) / 1e6).toFixed(2)}M`;

    return {
      messageText: `Between **2026-10-05** and **2026-10-06**, total ACV shifted by **${netStr}** with a net gain of **+${compRes.countDelta} opportunities**.\n\n### Key Movements:\n- **Expansions**: ${moveRes.expansionsCount} deals expanded by **+$${(moveRes.expansionsAcv / 1e6).toFixed(2)}M**\n- **Category Shifts**: ${moveRes.categoryShiftsCount} deals moved between forecast stages (e.g. Commit to Closed)\n- **Contractions**: ${moveRes.contractionsCount} deals contracted by **-$${(moveRes.contractionsAcv / 1e6).toFixed(2)}M**`,
      sources: [
        { label: 'Overview Dashboard', path: '/dashboard' },
        { label: 'Snapshots History', path: '/history' },
      ],
      traces,
      inlineChart: {
        type: 'bar',
        title: 'ACV Net Movements ($M)',
        data: [
          { label: 'Expansions', value: Number((moveRes.expansionsAcv / 1e6).toFixed(2)), color: '#10B981' },
          { label: 'Net Growth', value: Number((compRes.netAcvChange / 1e6).toFixed(2)), color: '#2563EB' },
          { label: 'Contractions', value: Number((moveRes.contractionsAcv / 1e6).toFixed(2)), color: '#F59E0B' },
        ],
      },
      isDemoMode: true,
    };
  }

  // Question 2: Top / Largest opportunities
  if (q.includes('top') || q.includes('largest') || q.includes('biggest') || q.includes('valuable')) {
    const topOpps = top_opportunities({ date: '2026-10-06' }, 5);
    traces.push({
      toolName: 'top_opportunities',
      args: { date: '2026-10-06', n: 5 },
      result: topOpps,
      timestamp: new Date().toLocaleTimeString(),
    });

    const oppListMarkdown = topOpps.map((o, idx) => 
      `${idx + 1}. **${o.opportunity_name}** (${o.account_name}) — **$${(o.acv_amount / 1e6).toFixed(2)}M** | Stage: \`${o.forecast_category}\` | Status: \`${o.approval_status}\``
    ).join('\n');

    return {
      messageText: `Here are the **Top 5 Largest Opportunities** as of 2026-10-06:\n\n${oppListMarkdown}`,
      sources: [
        { label: 'Explore Portfolio', path: '/explore' },
        { label: 'Overview', path: '/dashboard' },
      ],
      traces,
      inlineChart: {
        type: 'bar',
        title: 'Top 5 Opportunities ACV ($M)',
        data: topOpps.map(o => ({
          label: o.account_name.substring(0, 15),
          value: Number((o.acv_amount / 1e6).toFixed(2)),
          color: '#2563EB',
        })),
      },
      isDemoMode: true,
    };
  }

  // Question 3: Approval / Bottlenecks / Pending
  if (q.includes('approval') || q.includes('pending') || q.includes('bottleneck') || q.includes('rejected')) {
    const appRes = approval_breakdown({ date: '2026-10-06' });
    traces.push({
      toolName: 'approval_breakdown',
      args: { date: '2026-10-06' },
      result: appRes,
      timestamp: new Date().toLocaleTimeString(),
    });

    const breakdownText = appRes.map(item => 
      `- **${item.status}**: ${item.count} deals (**$${(item.totalAcv / 1e6).toFixed(2)}M** / ${item.percentageOfTotalAcv.toFixed(1)}% of total ACV)`
    ).join('\n');

    return {
      messageText: `### Approval Status Breakdown (2026-10-06):\n${breakdownText}\n\n*Recommendation*: Focus on resolving **Pending VP Approval** deals to accelerate closing before quarter-end.`,
      sources: [
        { label: 'Approvals Funnel', path: '/approvals' },
        { label: 'Predictive Insights', path: '/insights' },
      ],
      traces,
      inlineChart: {
        type: 'pie',
        title: 'Approval Distribution ($M)',
        data: appRes.map(a => ({
          label: a.status,
          value: Number((a.totalAcv / 1e6).toFixed(2)),
          color: a.status.includes('Approved') ? '#10B981' : a.status.includes('Pending') ? '#3B82F6' : '#EF4444',
        })),
      },
      isDemoMode: true,
    };
  }

  // Question 4: Region / Sub-region / Lost commit
  if (q.includes('region') || q.includes('lost') || q.includes('location') || q.includes('geography')) {
    const queryRes = run_filtered_query({ date: '2026-10-06' });
    traces.push({
      toolName: 'run_filtered_query',
      args: { date: '2026-10-06' },
      result: { totalCount: queryRes.totalCount, totalAcv: queryRes.totalAcv },
      timestamp: new Date().toLocaleTimeString(),
    });

    return {
      messageText: `### Regional Breakdown & Movement:\n- **Europe & North America** hold the highest concentration of **Closed ACV** ($18.5M).\n- **Middle East & Africa** experienced a minor Commit re-classification into Pipeline (-$0.71M) pending discount VP approval.\n- Total active global pipeline spans **${queryRes.totalCount} deals** valued at **$${(queryRes.totalAcv / 1e6).toFixed(2)}M**.`,
      sources: [
        { label: 'Regions & Sub-Regions', path: '/regions' },
        { label: 'Business Units', path: '/business-units' },
      ],
      traces,
      inlineChart: {
        type: 'kpi_grid',
        title: 'Regional Snapshot',
        data: [
          { label: 'North America', value: 45.2, color: '#2563EB' },
          { label: 'Europe', value: 38.1, color: '#10B981' },
          { label: 'Asia-Pacific', value: 28.5, color: '#8B5CF6' },
          { label: 'Middle East', value: 24.3, color: '#F59E0B' },
        ],
      },
      isDemoMode: true,
    };
  }

  // Question 5: Default KPI overview
  const kpis = get_kpis('2026-10-06');
  traces.push({
    toolName: 'get_kpis',
    args: { date: '2026-10-06' },
    result: kpis,
    timestamp: new Date().toLocaleTimeString(),
  });

  return {
    messageText: `### Executive Renewal Summary (2026-10-06):\n- **Total ACV Pipeline**: **$${(kpis.totalAcv / 1e6).toFixed(2)}M** across **${kpis.totalOppsCount} contracts**\n- **Closed ACV**: **$${(kpis.closedAcv / 1e6).toFixed(2)}M**\n- **Commit ACV**: **$${(kpis.commitAcv / 1e6).toFixed(2)}M**\n- **Best Case ACV**: **$${(kpis.bestCaseAcv / 1e6).toFixed(2)}M**\n- **Pipeline ACV**: **$${(kpis.pipelineAcv / 1e6).toFixed(2)}M**\n\nYou can ask me specific questions like *"What changed since yesterday?"*, *"Top 5 largest deals"*, or *"Show approval status breakdown"*!`,
    sources: [
      { label: 'Overview Dashboard', path: '/dashboard' },
      { label: 'Expiry Heatmap', path: '/expiry' },
    ],
    traces,
    inlineChart: {
      type: 'kpi_grid',
      title: 'Current ACV Breakdown ($M)',
      data: [
        { label: 'Closed', value: Number((kpis.closedAcv / 1e6).toFixed(2)), color: '#10B981' },
        { label: 'Commit', value: Number((kpis.commitAcv / 1e6).toFixed(2)), color: '#2563EB' },
        { label: 'Best Case', value: Number((kpis.bestCaseAcv / 1e6).toFixed(2)), color: '#8B5CF6' },
        { label: 'Pipeline', value: Number((kpis.pipelineAcv / 1e6).toFixed(2)), color: '#F59E0B' },
      ],
    },
    isDemoMode: true,
  };
}

/**
 * Call Real OpenAI-Compatible API Endpoint if configured
 */
async function callRealLLMEndpoint(prompt: string, config: { baseUrl: string; apiKey: string; model: string }): Promise<AssistantResponse> {
  // Execute tools to provide context to prompt
  const kpis = get_kpis('2026-10-06');
  const comp = compare('2026-10-05', '2026-10-06');

  const systemMessage = `You are Mobileum RenewIQ AI Assistant, an expert executive assistant for renewal intelligence.
Current Date: 2026-10-06.
Live Data Context: Total ACV = $${(kpis.totalAcv / 1e6).toFixed(2)}M (${kpis.totalOppsCount} deals).
Closed ACV = $${(kpis.closedAcv / 1e6).toFixed(2)}M, Commit ACV = $${(kpis.commitAcv / 1e6).toFixed(2)}M.
Net ACV change today = +$${(comp.netAcvChange / 1e6).toFixed(2)}M.

Answer strictly based on this data. Format response in clean GitHub markdown. Refuse questions outside renewal data.`;

  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`API response status ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || 'No response generated.';

  return {
    messageText: text,
    sources: [
      { label: 'Overview Dashboard', path: '/dashboard' },
      { label: 'Explore Portfolio', path: '/explore' },
    ],
    traces: [
      {
        toolName: 'get_kpis',
        args: { date: '2026-10-06' },
        result: kpis,
        timestamp: new Date().toLocaleTimeString(),
      }
    ],
    isDemoMode: false,
  };
}
