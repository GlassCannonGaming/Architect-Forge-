import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, Type, Modality, LiveServerMessage } from '@google/genai';
import {
  buildAgentSystemPrompt,
  sanitizeAndValidateAgentResponse,
  buildProcedural3DSpecFromPrompt,
  INITIAL_CLUES,
  HotelAgentProfile,
  GameStateSnapshot
} from './src/game/rules';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || 'MISSING_KEY',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  const server = http.createServer(app);

  // 1. Multi-Turn Agent Chat Endpoint (uses gemini-4-argon or gemini-3.8-flash with strict anti-break guardrails)
  app.post('/api/agent/chat', async (req, res) => {
    try {
      const {
        agent,
        gameState,
        message,
        history = [],
        recentConversationMemory = [],
        useComplexReasoning = true
      }: {
        agent: HotelAgentProfile;
        gameState: GameStateSnapshot;
        message: string;
        history: { role: 'user' | 'model'; text: string }[];
        recentConversationMemory: string[];
        useComplexReasoning?: boolean;
      } = req.body;

      if (!agent || !message) {
        res.status(400).json({ error: 'Missing agent profile or message.' });
        return;
      }

      const systemInstruction = buildAgentSystemPrompt(
        agent,
        gameState,
        INITIAL_CLUES,
        recentConversationMemory
      );

      const ai = getGenAIClient();
      const modelName = useComplexReasoning ? 'gemini-4-argon' : 'gemini-3.8-flash';

      const contents = [
        ...history.map((h) => ({
          role: h.role,
          parts: [{ text: h.text }]
        })),
        {
          role: 'user',
          parts: [{ text: message }]
        }
      ];

      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: 0.75
        }
      });

      const rawReply = response.text || '';
      const validated = sanitizeAndValidateAgentResponse(rawReply, agent);

      res.json({
        reply: validated.text,
        wasFiltered: validated.wasFiltered,
        modelUsed: modelName
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // Provide resilient in-character fallback if offline/sandboxed while also reporting status
      const agent: HotelAgentProfile | undefined = req.body?.agent;
      const fallbackReply =
        agent?.role === 'helper_entity'
          ? `*Cylinder #9 clicks softly.* "Based on our logged ledger notes, check the hollow wainscoting between Suites 101 and 102, and compare Arthur's handwriting at the Front Desk."`
          : `*${agent?.name || 'The resident'} glances toward the brick partition.* "Keep your voice down, Clerk. The walls on this floor carry every syllable straight to the Front Desk."`;
      res.json({
        reply: fallbackReply,
        wasFiltered: false,
        fallbackUsed: true,
        errorDetail: errMsg
      });
    }
  });

  // 2. Fast Ambient Whisper / Tenant Bark Endpoint (uses gemini-3.1-flash-lite)
  app.post('/api/agent/quick-bark', async (req, res) => {
    try {
      const { floor, roomLabel, sanity } = req.body;
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Generate a single eerie 12-word atmospheric observation for a newly hired 1920s NYC hotel clerk standing in ${roomLabel} (${floor}) with sanity at ${sanity}%. No quotes.`
      });
      res.json({ bark: (response.text || '').trim() });
    } catch {
      res.json({
        bark: 'Behind the old New York brickwork, steam pipes clatter in a slow rhythmic cadence.'
      });
    }
  });

  // 3. Google Search Grounded NYC Hotel History & Architecture Fact-Checker (gemini-3.8-flash + googleSearch)
  app.post('/api/research/nyc-lore', async (req, res) => {
    try {
      const { query } = req.body;
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Fact-check and research historical New York pre-war hotel architecture, secret passageways, or mystery details for: "${query}". Summarize key verified facts in 3 concise sentences for our 3D hotel architect tool.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .map((c: { web?: { uri?: string; title?: string } }) =>
          c.web ? { uri: c.web.uri, title: c.web.title } : null
        )
        .filter(Boolean);

      res.json({
        summary: response.text || 'Verified pre-war NYC masonry hotels used hollow dumbwaiter shafts and double-brick air courts.',
        sources
      });
    } catch (err: unknown) {
      res.json({
        summary:
          'Pre-war New York hotels (1890s–1920s) frequently featured load-bearing Flemish-bond brick exteriors, cast-iron steam radiators, transom ventilation doors, and service dumbwaiter shafts between suites.',
        sources: [],
        errorDetail: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // 4. AI 3D Object & Meshy Bridge Generator (gemini-4-argon structured JSON + Meshy API option)
  app.post('/api/forge/generate-3d', async (req, res) => {
    const { prompt = 'Antique hotel gramophone', floor = 'lobby' } = req.body;
    try {
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-argon',
        contents: `Design a low-poly 3D composite object for a 1920s New York mystery hotel based on this request: "${prompt}".
Return between 4 and 8 distinct 3D sub-parts (box, cylinder, sphere, cone, or torus) that form a recognizable silhouette pivoted above y=0.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              dimensions: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER }
              },
              parts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    shape: { type: Type.STRING },
                    offset: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    size: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    color: { type: Type.STRING },
                    roughness: { type: Type.NUMBER },
                    metalness: { type: Type.NUMBER }
                  },
                  required: ['id', 'shape', 'offset', 'size', 'color', 'roughness', 'metalness']
                }
              }
            },
            required: ['name', 'dimensions', 'parts']
          }
        }
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      if (parsed && Array.isArray(parsed.parts) && parsed.parts.length >= 3) {
        res.json({
          spec: {
            name: parsed.name || prompt,
            category: 'custom_ai',
            floor,
            dimensions:
              Array.isArray(parsed.dimensions) && parsed.dimensions.length === 3
                ? parsed.dimensions
                : [1.1, 1.3, 0.9],
            parts: parsed.parts
          },
          source: 'gemini-4-argon-3d'
        });
        return;
      }
      throw new Error('Fallback to procedural composite spec');
    } catch {
      const spec = buildProcedural3DSpecFromPrompt(prompt);
      res.json({
        spec: { ...spec, floor },
        source: 'procedural-meshy-composite'
      });
    }
  });

  // 5. Custom Texture & Image Generation / Editing using gemini-nano-banana-2.1
  app.post('/api/forge/generate-texture', async (req, res) => {
    try {
      const { prompt, base64Image, mimeType = 'image/png', aspectRatio = '1:1' } = req.body;
      const ai = getGenAIClient();

      const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];
      if (base64Image) {
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType
          }
        });
      }
      parts.push({
        text: `Flat seamless orthographic game texture or architectural surface for a stylized 1920s New York mystery hotel: ${prompt}. High contrast, low-poly cartoon aesthetic.`
      });

      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as '1:1' | '16:9' | '4:3',
            imageSize: '1K'
          }
        }
      });

      let imageUrl = '';
      let textNote = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        } else if (part.text) {
          textNote += part.text;
        }
      }

      if (!imageUrl) {
        res.status(500).json({ error: 'No image data returned from gemini-nano-banana-2.1.' });
        return;
      }

      res.json({ imageUrl, textNote, model: 'gemini-nano-banana-2.1' });
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Texture generation failed'
      });
    }
  });

  // 6. Gemini Live API WebSocket Bridge (/live) using gemini-3.8-live
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '/', 'http://localhost:3000').pathname;
    if (pathname === '/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (clientWs) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let liveSession: any = null;
    try {
      const ai = getGenAIClient();
      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
          },
          systemInstruction:
            'You are Cylinder #9, the sentient 1920s Brass Pocket Dictaphone carried by the newly hired Night Clerk at The Alderney Arms Hotel in New York. Speak in concise, atmospheric detective tones. Never break character.'
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio && clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted && clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          }
        }
      });

      clientWs.on('message', (raw) => {
        try {
          const parsed = JSON.parse(raw.toString());
          if (parsed.audio && liveSession) {
            liveSession.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' }
            });
          } else if (parsed.text && liveSession) {
            liveSession.sendRealtimeInput({
              text: parsed.text
            });
          }
        } catch {
          // ignore malformed packet
        }
      });

      clientWs.on('close', () => {
        try {
          liveSession?.close?.();
        } catch {
          // ignore
        }
      });
    } catch (err: unknown) {
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(
          JSON.stringify({
            error: err instanceof Error ? err.message : 'Failed to connect Live API session'
          })
        );
      }
    }
  });

  // Mount Vite middlewares in dev or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ArchitectForge: The House Suite server running on http://localhost:${PORT}`);
  });
}

startServer();
