// Vercel Serverless Function: POST /api/ai-check
// Reads a question image via Gemini Vision API, compares with options, and caches result in Supabase.

const SUPA_URL = process.env.SUPABASE_URL || 'https://ghbnoojsxdqqbecszqas.supabase.co/rest/v1';
const SUPA_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iQtscvMNv_UmjmSP30vkRw_7Pq7k6PU';
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

function normalizeAnswer(raw, allowed) {
  const letters = String(raw || '')
    .toUpperCase()
    .replace(/[^A-F]/g, '')
    .split('')
    .filter((c, i, a) => a.indexOf(c) === i && (!allowed.length || allowed.includes(c)))
    .sort();
  return letters.join(',');
}

async function getCachedAiAnswer(examId, questionIndex) {
  try {
    const url = `${SUPA_URL}/ai_answers?exam_id=eq.${encodeURIComponent(examId)}&question_index=eq.${Number(questionIndex)}&limit=1`;
    const res = await fetch(url, {
      headers: { apikey: SUPA_KEY, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch {
    return null;
  }
}

async function saveCachedAiAnswer(row) {
  try {
    await fetch(`${SUPA_URL}/ai_answers?on_conflict=exam_id,question_index`, {
      method: 'POST',
      headers: {
        apikey: SUPA_KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(5000)
    });
  } catch {
    // Non-fatal if cache write fails
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Chưa cấu hình GEMINI_API_KEY trong Environment Variables của Vercel.'
    });
  }

  const body = req.body || {};
  const examId = String(body.examId || '').slice(0, 200);
  const questionIndex = Number(body.questionIndex);
  const imageBase64 = String(body.imageBase64 || '');
  const mimeType = /^image\/(png|jpeg|jpg|webp)$/i.test(String(body.mimeType || ''))
    ? String(body.mimeType)
    : 'image/png';
  const options = Array.isArray(body.options) && body.options.length
    ? body.options.map((x) => String(x).toUpperCase()).filter((x) => /^[A-F]$/.test(x))
    : ['A', 'B', 'C', 'D'];
  const force = Boolean(body.force);

  if (!examId || !Number.isInteger(questionIndex) || questionIndex < 1) {
    return res.status(400).json({ error: 'Thiếu examId hoặc questionIndex hợp lệ.' });
  }

  if (!force) {
    const cached = await getCachedAiAnswer(examId, questionIndex);
    if (cached && cached.ai_answer) {
      return res.status(200).json({
        cached: true,
        answer: cached.ai_answer,
        reason: cached.reason || '',
        confidence: cached.confidence || 'medium',
        model: cached.model || DEFAULT_MODEL,
        updatedAt: cached.updated_at
      });
    }
  }

  if (!imageBase64 || imageBase64.length < 32) {
    return res.status(400).json({ error: 'Thiếu dữ liệu ảnh câu hỏi.' });
  }

  const prompt = [
    'Bạn là trợ giảng chuyên ngành kỹ thuật/CNTT chấm bài trắc nghiệm đại học FPT (EOS/FE).',
    'Hãy đọc thật kỹ nội dung câu hỏi, hình vẽ/sơ đồ/code và các lựa chọn (' + options.join(', ') + ') trong ảnh.',
    'Trả về DUY NHẤT một JSON hợp lệ (không markdown, không bọc ```json) với cấu trúc:',
    '{',
    '  "answer": "chữ cái đáp án đúng nhất, ví dụ B hoặc A,C nếu câu yêu cầu chọn nhiều",',
    '  "confidence": "high" | "medium" | "low",',
    '  "reason": "Giải thích ngắn gọn bằng tiếng Việt (2-4 câu): nêu rõ vì sao đáp án đó đúng và vì sao các phương án nhiễu chính lại sai."',
    '}',
    'Lưu ý: Chỉ chọn các chữ cái nằm trong danh sách: ' + options.join(', ') + '.'
  ].join('\n');

  const model = DEFAULT_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const gemRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: imageBase64 } }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      }),
      signal: AbortSignal.timeout(25000)
    });

    if (!gemRes.ok) {
      const errText = await gemRes.text().catch(() => '');
      return res.status(gemRes.status === 429 ? 429 : 502).json({
        error: gemRes.status === 429
          ? 'AI đang chạm giới hạn lượt gọi miễn phí (RPM). Đợi vài giây rồi bấm thử lại nhé.'
          : `Gemini API lỗi HTTP ${gemRes.status}${errText ? ': ' + errText.slice(0, 200) : ''}`
      });
    }

    const gemData = await gemRes.json();
    const rawText = gemData?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n').trim() || '';
    if (!rawText) {
      return res.status(502).json({ error: 'Gemini không trả về nội dung.' });
    }

    let parsed = null;
    try {
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const mAns = rawText.match(/"answer"\s*:\s*"([^"]+)"/i);
      const mReason = rawText.match(/"reason"\s*:\s*"([^"]+)"/i);
      parsed = {
        answer: mAns ? mAns[1] : rawText.slice(0, 10),
        confidence: 'medium',
        reason: mReason ? mReason[1] : rawText
      };
    }

    const answer = normalizeAnswer(parsed.answer, options);
    if (!answer) {
      return res.status(502).json({ error: 'AI không xác định được đáp án A-F hợp lệ.' });
    }

    const confidence = ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium';
    const reason = String(parsed.reason || '').trim().slice(0, 3000);
    const nowIso = new Date().toISOString();

    await saveCachedAiAnswer({
      exam_id: examId,
      question_index: questionIndex,
      model,
      ai_answer: answer,
      confidence,
      reason,
      updated_at: nowIso
    });

    return res.status(200).json({
      cached: false,
      answer,
      reason,
      confidence,
      model,
      updatedAt: nowIso
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Lỗi gọi AI: ' + (err?.message || String(err))
    });
  }
};
