import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, Type, Modality, LiveServerMessage, ThinkingLevel } from '@google/genai';
import {
  buildAgentSystemPrompt,
  buildSandboxedCharacterSystemPrompt,
  buildProceduralPersonaFromPrompt,
  DEFAULT_GLOBAL_INSTRUCTION_SET,
  getTimeOfDayInfo,
  getActiveDailyAction,
  sanitizeAndValidateAgentResponse,
  buildProcedural3DSpecFromPrompt,
  INITIAL_CLUES,
  HotelAgentProfile,
  GameStateSnapshot,
  AI_MODEL_REGISTRY,
  verifyAiModelCompliance,
  generateSeamlessSvgTextureDataUrl
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

  // 0. AI Model Routing & Cost-Optimization Compliance Endpoint
  app.get('/api/ai/models', (_req, res) => {
    res.json({
      registry: AI_MODEL_REGISTRY,
      compliance: verifyAiModelCompliance(AI_MODEL_REGISTRY)
    });
  });

  // 1. Multi-Turn Agent Chat Endpoint (Cheapest capable Google model: gemini-3.1-flash-lite, strictly sandboxed to game lore with NO internet access)
  app.post('/api/agent/chat', async (req, res) => {
    try {
      const {
        agent,
        gameState,
        message,
        history = [],
        recentConversationMemory = [],
        globalInstructionSet = DEFAULT_GLOBAL_INSTRUCTION_SET,
        gameTimeMinutes = 21 * 60 + 30
      }: {
        agent: HotelAgentProfile;
        gameState?: GameStateSnapshot;
        message: string;
        history?: { role: 'user' | 'model'; text: string }[];
        recentConversationMemory?: string[];
        globalInstructionSet?: string;
        gameTimeMinutes?: number;
      } = req.body;

      if (!agent || !message) {
        res.status(400).json({ error: 'Missing agent profile or message.' });
        return;
      }

      const sandboxedInstruction = buildSandboxedCharacterSystemPrompt(
        agent,
        globalInstructionSet,
        gameTimeMinutes
      );
      const legacyContext = gameState
        ? `\n\n${buildAgentSystemPrompt(agent, gameState, INITIAL_CLUES, recentConversationMemory)}`
        : '';
      const systemInstruction = `${sandboxedInstruction}${legacyContext}`;

      const ai = getGenAIClient();
      const modelName = AI_MODEL_REGISTRY.character_chat.modelId; // 'gemini-3.1-flash-lite'

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

      // Strictly NO googleSearch or external internet tools attached
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction
        }
      });

      const rawReply = response.text || '';
      const validated = sanitizeAndValidateAgentResponse(rawReply, agent);

      res.json({
        reply: validated.text,
        wasFiltered: validated.wasFiltered,
        modelUsed: modelName,
        provider: 'Google'
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const agent: HotelAgentProfile | undefined = req.body?.agent;
      const gameTimeMinutes: number = req.body?.gameTimeMinutes ?? 21 * 60 + 30;
      const timeInfo = getTimeOfDayInfo(gameTimeMinutes);
      const activeDaily = getActiveDailyAction(agent?.dailySchedule, gameTimeMinutes);
      const knownFactHint =
        agent?.knownFacts && agent.knownFacts.length > 0
          ? agent.knownFacts[0]
          : 'The brick partitions on this floor sound hollow after curfew.';
      const fallbackReply = `*${agent?.name || 'The resident'} (${
        agent?.demeanor || 'guarded'
      }) pauses while ${activeDaily.action.toLowerCase()} at ${
        timeInfo.formattedTime
      }.* "Speaking in my usual ${
        agent?.voiceStyle ? agent.voiceStyle.slice(0, 36).toLowerCase() : 'hushed cadence'
      }, Clerk — all I know for certain is this: ${knownFactHint}"`;
      res.json({
        reply: fallbackReply,
        wasFiltered: false,
        fallbackUsed: true,
        modelUsed: AI_MODEL_REGISTRY.character_chat.modelId,
        errorDetail: errMsg
      });
    }
  });

  // 1B. AI Character Personality & Sandboxed Instruction Generator (Cheapest capable Google model: gemini-3.1-flash-lite — Offline Game-Specific Lore Only)
  app.post('/api/agent/generate-persona', async (req, res) => {
    const {
      name = 'Vincent Graves',
      archetype = 'Detective Clerk',
      roomNumber = 'Suite 202',
      seedPrompt = 'Nervous night clerk who collects brass keys and hears footsteps behind Room 202',
      globalInstructionSet = DEFAULT_GLOBAL_INSTRUCTION_SET
    } = req.body || {};

    const modelName = AI_MODEL_REGISTRY.persona_generator.modelId; // 'gemini-3.1-flash-lite'

    try {
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Generate an initial character personality profile, starting known information, personal instruction set, and 4-phase daily action schedule for a character in our 1920s New York mystery hotel game ("The Alderney Arms").
Character Name: "${name}"
Archetype: "${archetype}"
Assigned Room/Zone: "${roomNumber}"
Creator Prompt / Concept: "${seedPrompt}"
Global Instruction Set Constraint (MUST OBEY — NO INTERNET / GAME-SPECIFIC ONLY):
${globalInstructionSet}`,
        config: {
          // Strictly NO googleSearch tool — 100% isolated to game-world lore
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              voiceStyle: { type: Type.STRING },
              demeanor: { type: Type.STRING },
              likes: { type: Type.ARRAY, items: { type: Type.STRING } },
              dislikes: { type: Type.ARRAY, items: { type: Type.STRING } },
              knownFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
              personalInstructionSet: { type: Type.STRING },
              dailySchedule: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    phase: { type: Type.STRING },
                    timeRange: { type: Type.STRING },
                    action: { type: Type.STRING },
                    location: { type: Type.STRING },
                    eventTrigger: { type: Type.STRING }
                  },
                  required: ['phase', 'timeRange', 'action', 'location', 'eventTrigger']
                }
              }
            },
            required: [
              'voiceStyle',
              'demeanor',
              'likes',
              'dislikes',
              'knownFacts',
              'personalInstructionSet',
              'dailySchedule'
            ]
          }
        }
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      if (parsed && parsed.voiceStyle && Array.isArray(parsed.knownFacts)) {
        res.json({
          persona: parsed,
          modelUsed: modelName,
          source: 'gemini-3.1-flash-lite-sandboxed'
        });
        return;
      }
      throw new Error('Fallback to deterministic game-specific persona');
    } catch {
      const fallback = buildProceduralPersonaFromPrompt(name, archetype, seedPrompt, roomNumber);
      res.json({
        persona: fallback,
        modelUsed: modelName,
        source: 'procedural-offline-sandbox'
      });
    }
  });

  // 2. Fast Ambient Whisper / Tenant Bark Endpoint (uses gemini-3.1-flash-lite)
  app.post('/api/agent/quick-bark', async (req, res) => {
    try {
      const { floor, roomLabel, sanity } = req.body;
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: AI_MODEL_REGISTRY.ambient_bark.modelId, // 'gemini-3.1-flash-lite'
        contents: `Generate a single eerie 12-word atmospheric observation for a newly hired 1920s NYC hotel clerk standing in ${roomLabel} (${floor}) with sanity at ${sanity}%. No quotes.`
      });
      res.json({
        bark: (response.text || '').trim(),
        modelUsed: AI_MODEL_REGISTRY.ambient_bark.modelId
      });
    } catch {
      res.json({
        bark: 'Behind the old New York brickwork, steam pipes clatter in a slow rhythmic cadence.',
        modelUsed: AI_MODEL_REGISTRY.ambient_bark.modelId
      });
    }
  });

  // 3. Google Search Grounded NYC Hotel History & Architecture Fact-Checker (Cheapest search-capable Google model: gemini-3.8-flash + ThinkingLevel.LOW)
  app.post('/api/research/nyc-lore', async (req, res) => {
    const modelName = AI_MODEL_REGISTRY.architectural_research.modelId; // 'gemini-3.8-flash'
    try {
      const { query } = req.body;
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Fact-check and research historical New York pre-war hotel architecture, secret passageways, or mystery details for: "${query}". Summarize key verified facts in 3 concise sentences for our 3D hotel architect tool.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
        summary:
          response.text ||
          'Verified pre-war NYC masonry hotels used hollow dumbwaiter shafts and double-brick air courts.',
        sources,
        modelUsed: modelName
      });
    } catch (err: unknown) {
      res.json({
        summary:
          'Pre-war New York hotels (1890s–1920s) frequently featured load-bearing Flemish-bond brick exteriors, cast-iron steam radiators, transom ventilation doors, and service dumbwaiter shafts between suites.',
        sources: [],
        modelUsed: modelName,
        errorDetail: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // 4. Meshy.ai Image-to-3D + Google gemini-3.1-flash-lite 3D Composite Object Generator
  app.post('/api/forge/generate-3d', async (req, res) => {
    const {
      prompt = 'Antique hotel gramophone',
      floor = 'lobby',
      referenceImageUrl = null
    }: {
      prompt?: string;
      floor?: string;
      referenceImageUrl?: string | null;
    } = req.body || {};

    let meshyTaskId: string | null = null;
    let meshyStatus = 'ready';

    // If a reference image is provided and MESHY_API_KEY is configured, invoke Meshy.ai Image-to-3D API (the sole non-Google AI model)
    if (referenceImageUrl && process.env.MESHY_API_KEY) {
      try {
        const meshyRes = await fetch('https://api.meshy.ai/openapi/v1/image-to-3d', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.MESHY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image_url: referenceImageUrl,
            ai_model: 'meshy-4',
            topology: 'quad',
            target_polycount: 4000,
            should_remesh: true,
            enable_pbr: true
          })
        });
        if (meshyRes.ok) {
          const meshyData = (await meshyRes.json()) as { result?: string };
          meshyTaskId = meshyData.result || null;
          meshyStatus = 'meshy-4-image-to-3d-dispatched';
        }
      } catch {
        meshyStatus = 'meshy-local-composite-bridge';
      }
    }

    const googleModel = AI_MODEL_REGISTRY.composite_3d_spec.modelId; // 'gemini-3.1-flash-lite'

    try {
      const ai = getGenAIClient();
      const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];

      // If a base64 reference image was passed for Image-to-3D, include it as multimodal input to gemini-3.1-flash-lite!
      if (referenceImageUrl && referenceImageUrl.startsWith('data:image/')) {
        const mimeMatch = referenceImageUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        const cleanBase64 = referenceImageUrl.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
        if (mimeType !== 'image/svg+xml' && cleanBase64.length > 32) {
          parts.push({
            inlineData: {
              data: cleanBase64,
              mimeType
            }
          });
        }
      }

      parts.push({
        text: `Design a low-poly 3D composite object for a 1920s New York mystery hotel based on this request${
          referenceImageUrl ? ' and the provided Image-to-3D reference image' : ''
        }: "${prompt}".
Return between 4 and 8 distinct 3D sub-parts (box, cylinder, sphere, cone, or torus) that form a recognizable silhouette pivoted above y=0.`
      });

      const response = await ai.models.generateContent({
        model: googleModel,
        contents: { parts },
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
          modelUsed: googleModel,
          meshyModel: AI_MODEL_REGISTRY.meshy_image_to_3d.modelId,
          meshyTaskId,
          meshyStatus,
          source: referenceImageUrl
            ? 'meshy-image-to-3d+gemini-3.1-flash-lite'
            : 'gemini-3.1-flash-lite-3d'
        });
        return;
      }
      throw new Error('Fallback to procedural composite spec');
    } catch {
      const spec = buildProcedural3DSpecFromPrompt(prompt);
      res.json({
        spec: { ...spec, floor },
        modelUsed: googleModel,
        meshyModel: AI_MODEL_REGISTRY.meshy_image_to_3d.modelId,
        meshyTaskId,
        meshyStatus,
        source: referenceImageUrl
          ? 'meshy-image-to-3d-composite'
          : 'procedural-meshy-composite'
      });
    }
  });

  // 5. Custom Texture & Image-to-3D Reference Generation using Google's cheapest image model: gemini-3.1-flash-lite-image
  app.post('/api/forge/generate-texture', async (req, res) => {
    const { prompt = '1920s New York crimson art-deco carpet', base64Image, mimeType = 'image/png', aspectRatio = '1:1' } =
      req.body || {};
    const imageModel = AI_MODEL_REGISTRY.texture_synthesis.modelId; // 'gemini-3.1-flash-lite-image'

    try {
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
        text: `Flat seamless orthographic game texture or architectural surface reference for a stylized 1920s New York mystery hotel: ${prompt}. High contrast, low-poly cartoon aesthetic.`
      });

      const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as '1:1' | '16:9' | '4:3'
          }
        }
      });

      let imageUrl = '';
      let textNote = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          const outMime = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${outMime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          textNote += part.text;
        }
      }

      if (imageUrl) {
        res.json({
          imageUrl,
          textNote,
          modelUsed: imageModel,
          provider: 'Google'
        });
        return;
      }
      throw new Error('No inlineData returned; using deterministic SVG texture fallback.');
    } catch {
      const fallbackSvgUrl = generateSeamlessSvgTextureDataUrl(prompt);
      res.json({
        imageUrl: fallbackSvgUrl,
        textNote: 'Generated seamless orthographic architectural surface texture.',
        modelUsed: imageModel,
        provider: 'Google',
        fallbackUsed: true
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
