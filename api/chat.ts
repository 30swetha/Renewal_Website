import type { IncomingMessage, ServerResponse } from 'node:http';

type VercelRequest = IncomingMessage & { body?: any; method?: string };
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: any) => VercelResponse;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, dataContext } = req.body || {};

    if (!prompt || !dataContext) {
      return res.status(400).json({ error: 'Prompt and dataContext are required.' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

    if (apiKey) {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          system: `You are RenewIQ Assistant, an executive telecom renewals analytics engine for Mobileum.
Answer the user's question ONLY using the provided daily dataset summary and opportunity rows below.
DO NOT make up or infer facts not present in the dataset.
If the dataset does NOT contain the answer, explicitly reply: "The provided dataset does not contain information to answer this question."
Be concise, professional, and state exact dollar amounts in $ millions ($M).`,
          messages: [
            {
              role: 'user',
              content: `DAILY DATASET CONTEXT:\n${JSON.stringify(dataContext, null, 2)}\n\nUSER QUESTION:\n${prompt}`,
            },
          ],
        }),
      });

      const aiJson: any = await anthropicRes.json();
      if (aiJson && aiJson.content && aiJson.content[0] && aiJson.content[0].text) {
        return res.status(200).json({ answer: aiJson.content[0].text });
      }
    }

    // Serverless backend data query engine fallback
    const answerText = processDataQueryOnBackend(prompt, dataContext);
    return res.status(200).json({ answer: answerText });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

function processDataQueryOnBackend(prompt: string, data: any): string {
  const q = prompt.toLowerCase();

  const invalidKeywords = ['weather', 'stock price', 'competitor', 'ceo', 'salary', 'football', 'movie'];
  if (invalidKeywords.some(kw => q.includes(kw))) {
    return 'The provided dataset does not contain information to answer this question.';
  }

  if (q.includes('biggest drop') || q.includes('largest drop') || q.includes('decline')) {
    const summaryRows = data.summaryRows || [];
    const categoryRows = summaryRows.filter((r: any) => !r.isQuarterTotal && !r.isGrandTotal && r.category);
    let minItem: any = null;

    categoryRows.forEach((r: any) => {
      if (!minItem || r.tyAmount < minItem.tyAmount) minItem = r;
    });

    if (minItem && minItem.tyAmount < 0) {
      const dropM = Math.abs(minItem.tyAmount) / 1e6;
      return `Based on today's dataset, **${minItem.expiryPeriod} (${minItem.category})** had the biggest drop vs yesterday, declining by **-$${dropM.toFixed(2)}M**.`;
    }
  }

  if (q.includes('approved') || q.includes('pending')) {
    const status = data.approvalStatus || [];
    const approved = status.find((s: any) => s.status.toLowerCase().includes('approved'));
    const pending = status.find((s: any) => s.status.toLowerCase().includes('pending'));

    let res = `Approval Breakdown:\n`;
    if (approved) res += `• **Approved ACV**: $${(approved.amount / 1e6).toFixed(2)}M (${approved.count} contracts)\n`;
    if (pending) res += `• **Pending Approval**: $${(pending.amount / 1e6).toFixed(2)}M (${pending.count} contracts)\n`;
    return res;
  }

  return `Grand Total ACV for ${data.reportDate} is **$${((data.grandTotal?.todayAmount || 0) / 1e6).toFixed(2)}M** across **${data.grandTotal?.todayCount || 0} contracts**.`;
}
