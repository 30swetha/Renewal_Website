import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';

// Server-side backend API handler for AI Chat Q&A
function backendApiPlugin(): Plugin {
  return {
    name: 'backend-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res, next) => {
        if (req.method !== 'POST') {
          return next();
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { prompt, dataContext } = JSON.parse(body);

            if (!prompt || !dataContext) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Prompt and dataContext are required.' }));
              return;
            }

            // Check if Anthropic / Claude API Key exists in environment
            const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

            let answerText = '';

            if (apiKey) {
              // Call Claude API from Backend Function
              const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                  model: 'claude-3-5-sonnet-20241022',
                  max_tokens: 1000,
                  system: `You are RenewIQ Assistant, an executive telecom renewals analytics engine.
Answer the user's question ONLY using the provided daily dataset summary and opportunity rows below.
DO NOT make up or infer facts not present in the dataset.
If the dataset does NOT contain the answer, explicitly reply: "The provided dataset does not contain information to answer this question."
Be concise, professional, and state exact dollar amounts in $ millions ($M).`,
                  messages: [
                    {
                      role: 'user',
                      content: `DAILY DATASET CONTEXT:\n${JSON.stringify(dataContext, null, 2)}\n\nUSER QUESTION:\n${prompt}`
                    }
                  ]
                })
              });

              const aiJson: any = await anthropicRes.json();
              if (aiJson && aiJson.content && aiJson.content[0] && aiJson.content[0].text) {
                answerText = aiJson.content[0].text;
              } else {
                answerText = 'Error communicating with Claude API backend function.';
              }
            } else {
              // Backend Server Data Query Engine (calculates exact answer strictly from dataContext)
              answerText = processDataQueryOnBackend(prompt, dataContext);
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ answer: answerText }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Backend processing error.' }));
          }
        });
      });
    }
  };
}

// Backend analytical query engine running strictly on server side
function processDataQueryOnBackend(prompt: string, data: any): string {
  const q = prompt.toLowerCase();

  // Check if question asks about non-existent topics
  const invalidKeywords = ['weather', 'stock price', 'competitor', 'ceo', 'salary', 'football', 'president', 'movie', 'recipe'];
  if (invalidKeywords.some(kw => q.includes(kw))) {
    return 'The provided dataset does not contain information to answer this question.';
  }

  // 1. Biggest drop vs yesterday
  if (q.includes('biggest drop') || q.includes('largest drop') || q.includes('decline') || q.includes('dropped')) {
    const summaryRows = data.summaryRows || [];
    const categoryRows = summaryRows.filter((r: any) => !r.isQuarterTotal && !r.isGrandTotal && r.category);
    let minItem: any = null;

    categoryRows.forEach((r: any) => {
      if (!minItem || r.tyAmount < minItem.tyAmount) {
        minItem = r;
      }
    });

    if (minItem && minItem.tyAmount < 0) {
      const dropM = Math.abs(minItem.tyAmount) / 1e6;
      return `Based on today's dataset, **${minItem.expiryPeriod} (${minItem.category})** had the biggest drop vs yesterday, declining by **-$${dropM.toFixed(2)}M** (T-Y count: ${minItem.tyCount}).`;
    } else {
      return 'No forecast category experienced a negative drop vs yesterday in the provided dataset.';
    }
  }

  // 2. Total approved vs pending ACV
  if (q.includes('approved') || q.includes('pending') || q.includes('approval')) {
    const status = data.approvalStatus || [];
    const approved = status.find((s: any) => s.status.toLowerCase().includes('approved'));
    const pending = status.find((s: any) => s.status.toLowerCase().includes('pending'));
    const total = data.grandTotal?.todayAmount || 0;

    let res = `From the current daily approval records:\n`;
    if (approved) res += `• **Approved ACV**: $${(approved.amount / 1e6).toFixed(2)}M (${approved.count} contracts)\n`;
    if (pending) res += `• **Pending Approval ACV**: $${(pending.amount / 1e6).toFixed(2)}M (${pending.count} contracts)\n`;
    res += `• **Grand Total ACV**: $${(total / 1e6).toFixed(2)}M across ${data.grandTotal?.todayCount || 0} contracts.`;
    return res;
  }

  // 3. Region accounts / EMEA Central / Highest ACV
  if (q.includes('region') || q.includes('account') || q.includes('emea') || q.includes('highest acv')) {
    const topRegions = data.topRegions || [];
    let filtered = topRegions;

    if (q.includes('emea')) filtered = topRegions.filter((r: any) => r.region.toLowerCase().includes('emea'));
    else if (q.includes('north america east')) filtered = topRegions.filter((r: any) => r.region.toLowerCase().includes('east'));
    else if (q.includes('north america west')) filtered = topRegions.filter((r: any) => r.region.toLowerCase().includes('west'));
    else if (q.includes('apac')) filtered = topRegions.filter((r: any) => r.region.toLowerCase().includes('apac'));

    const sorted = [...filtered].sort((a: any, b: any) => b.amount - a.amount);
    if (sorted.length > 0) {
      const top = sorted[0];
      return `In the selected region context (${top.region}), **${top.oppName}** [ID: ${top.oppId}] holds the highest ACV at **$${(top.amount / 1e6).toFixed(2)}M** under the **${top.businessUnit || 'Enterprise'}** business unit.`;
    }
  }

  // 4. Forecast category changes / how many opportunities changed
  if (q.includes('changed') || q.includes('opportunities changed') || q.includes('itemized') || q.includes('category shift')) {
    const oppChanges = data.oppChanges || [];
    if (oppChanges.length > 0) {
      const catShifts = oppChanges.filter((c: any) => c.changeType === 'Category Shift').length;
      const amtChanges = oppChanges.filter((c: any) => c.changeType === 'Amount Change').length;
      const news = oppChanges.filter((c: any) => c.changeType === 'New').length;
      const removed = oppChanges.filter((c: any) => c.changeType === 'Removed').length;

      return `In total, **${oppChanges.length} opportunities** changed in today's dataset:\n` +
             `• Category Shifts: ${catShifts}\n` +
             `• Amount Changes: ${amtChanges}\n` +
             `• New Opportunities: ${news}\n` +
             `• Removed Opportunities: ${removed}`;
    } else {
      return `No individual opportunity level category changes were recorded in today's dataset.`;
    }
  }

  // 5. Grand Total / Overall Pipeline
  if (q.includes('grand total') || q.includes('total acv') || q.includes('total pipeline')) {
    const gt = data.grandTotal || {};
    return `The Grand Total pipeline for ${data.reportDate} is **$${((gt.todayAmount || 0) / 1e6).toFixed(2)}M** across **${gt.todayCount || 0} contracts**, representing a T-Y change of **${gt.tyAmount >= 0 ? '+' : ''}$${((gt.tyAmount || 0) / 1e6).toFixed(2)}M** vs yesterday.`;
  }

  return `Based strictly on the provided daily dataset for ${data.reportDate}:\n` +
         `• Grand Total ACV: $${((data.grandTotal?.todayAmount || 0) / 1e6).toFixed(2)}M (${data.grandTotal?.todayCount || 0} contracts)\n` +
         `• T-Y Variance: ${data.grandTotal?.tyAmount >= 0 ? '+' : ''}$${((data.grandTotal?.tyAmount || 0) / 1e6).toFixed(2)}M\n` +
         `• T-LW Variance: ${data.grandTotal?.tlwAmount >= 0 ? '+' : ''}$${((data.grandTotal?.tlwAmount || 0) / 1e6).toFixed(2)}M\n\n` +
         `If you need specific quarter or region details, please ask!`;
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    backendApiPlugin(),
  ],
});
