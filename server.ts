import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer, build as buildViteBundle } from 'vite';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, Type, Modality, LiveServerMessage, ThinkingLevel } from '@google/genai';
import {
  buildAgentSystemPrompt,
  buildSandboxedCharacterSystemPrompt,
  buildProceduralPersonaFromPrompt,
  evaluateCharacterInteractionMemory,
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
  generateSeamlessSvgTextureDataUrl,
  LOCAL_WORKSPACE_FOLDERS,
  LOCAL_WORKSPACE_ROOT_NAME,
  LocalFolderCategory,
  getLocalFolderSpec,
  buildLocalFolderItemFilename,
  buildLocalSetupScripts,
  INITIAL_ROOM_BLUEPRINTS,
  buildProceduralSfxSpecFromPrompt,
  buildProceduralMusicSpecFromPrompt,
  DEFAULT_ASSET_DESCRIPTIONS_IMPORT_FILE_CONTENT,
  ASSET_IMPORT_AGENT_INSTRUCTION_SET,
  buildEnforcedLowPolyImagePrompt,
  parseAssetDescriptionsFile,
  generateAssetConceptSvgDataUrl,
  applyAlphaMatteToConceptImageDataUrl,
  weatherAssetToLate70sStyle,
  PlacedAsset,
  CharacterAppearance,
  ScheduledActivityGesture,
  MeshyCharacterAnimationClipSpec,
  MESHY_ANIMATION_PRESETS,
  normalizeGlobalAnimationFps,
  buildMeshyRiggingRequestPayload,
  buildMeshyAnimateRequestPayload,
  decimateAnimationKeyframes
} from './src/game/rules';
import { INITIAL_AGENTS, createBlueprintFromAsset, AssetBlueprint } from './src/game/hotelData';

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

  // 1. Multi-Turn Agent Chat Endpoint with Episodic & Relational Memory (Cheapest capable Google model: gemini-3.1-flash-lite)
  app.post('/api/agent/chat', async (req, res) => {
    const {
      agent,
      gameState,
      message,
      history = [],
      recentConversationMemory = [],
      globalInstructionSet = DEFAULT_GLOBAL_INSTRUCTION_SET,
      gameTimeMinutes = 21 * 60 + 30,
      gameDay = 1
    }: {
      agent: HotelAgentProfile;
      gameState?: GameStateSnapshot;
      message: string;
      history?: { role: 'user' | 'model'; text: string }[];
      recentConversationMemory?: string[];
      globalInstructionSet?: string;
      gameTimeMinutes?: number;
      gameDay?: number;
    } = req.body || {};

    if (!agent || !message) {
      res.status(400).json({ error: 'Missing agent profile or message.' });
      return;
    }

    const memoryEval = evaluateCharacterInteractionMemory(
      agent,
      message,
      gameTimeMinutes,
      gameDay
    );

    try {
      const sandboxedInstruction = buildSandboxedCharacterSystemPrompt(
        memoryEval.updatedAgent,
        globalInstructionSet,
        gameTimeMinutes,
        gameDay,
        memoryEval
      );
      const legacyContext = gameState
        ? `\n\n${buildAgentSystemPrompt(memoryEval.updatedAgent, gameState, INITIAL_CLUES, recentConversationMemory)}`
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
      const validated = sanitizeAndValidateAgentResponse(rawReply, memoryEval.updatedAgent);

      res.json({
        reply: validated.text,
        wasFiltered: validated.wasFiltered,
        memoryEvaluation: memoryEval,
        modelUsed: modelName,
        provider: 'Google'
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const timeInfo = getTimeOfDayInfo(gameTimeMinutes);
      const activeDaily = getActiveDailyAction(agent?.dailySchedule, gameTimeMinutes);
      const knownFactHint =
        agent?.knownFacts && agent.knownFacts.length > 0
          ? agent.knownFacts[0]
          : 'The brick partitions on this floor sound hollow after curfew.';

      let fallbackReply = '';
      if (memoryEval.answeredQuestion) {
        const waitPhrase =
          memoryEval.daysWaitedForAnswer >= 1
            ? `I've been waiting ${memoryEval.daysWaitedForAnswer} day(s) since Day ${memoryEval.answeredQuestion.askedOnDay} for your answer`
            : `Thank you for answering my question so quickly`;
        fallbackReply = `*${agent.name} exhales with relief at ${timeInfo.formattedTime} (Disposition: ${memoryEval.resultingDisposition.toUpperCase()}, Trust ${memoryEval.resultingTrust}/100).* "${waitPhrase}, Clerk. Since you kept your word regarding '${memoryEval.answeredQuestion.questionText}', I'll tell you what I've hidden in ${agent.roomNumber}: ${agent.secretTruth || knownFactHint}"`;
      } else if (memoryEval.oldestUnansweredQuestion && memoryEval.unansweredDaysWaiting >= 1) {
        fallbackReply = `*${agent.name} narrows their eyes at ${timeInfo.formattedTime} on Day ${gameDay} (Waiting ${memoryEval.unansweredDaysWaiting} day(s) for answer).* "Hold on, Clerk — I asked you ${memoryEval.unansweredDaysWaiting} day(s) ago on Day ${memoryEval.oldestUnansweredQuestion.askedOnDay}: '${memoryEval.oldestUnansweredQuestion.questionText}' You still haven't given me an answer!"`;
      } else if (
        memoryEval.resultingDisposition === 'hostile' ||
        memoryEval.resultingDisposition === 'cold' ||
        memoryEval.triggeredDislikes.length > 0
      ) {
        const dislikeReason =
          memoryEval.triggeredDislikes[0] || 'your intrusive questioning';
        fallbackReply = `*${agent.name} steps back coldly in ${agent.roomNumber} (Disposition: ${memoryEval.resultingDisposition.toUpperCase()}, Trust ${memoryEval.resultingTrust}/100).* "I can't stand ${dislikeReason}, Clerk. Until you show some respect around ${agent.roomNumber}, I have nothing more to say to you."`;
      } else if (memoryEval.newlyAskedQuestion) {
        fallbackReply = `*${agent.name} (${
          agent.demeanor || 'guarded'
        }) pauses while ${activeDaily.action.toLowerCase()} at ${
          timeInfo.formattedTime
        }.* "All I know for certain is this: ${knownFactHint} Now tell me, Clerk — ${
          memoryEval.newlyAskedQuestion.questionText
        }"`;
      } else {
        fallbackReply = `*${agent?.name || 'The resident'} (${
          agent?.demeanor || 'guarded'
        }) pauses while ${activeDaily.action.toLowerCase()} at ${
          timeInfo.formattedTime
        }.* "Speaking in my usual ${
          agent?.voiceStyle ? agent.voiceStyle.slice(0, 36).toLowerCase() : 'hushed cadence'
        }, Clerk — all I know for certain is this: ${knownFactHint}"`;
      }

      res.json({
        reply: fallbackReply,
        wasFiltered: false,
        fallbackUsed: true,
        memoryEvaluation: memoryEval,
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
        contents: `Generate an initial character personality profile, starting known information, personal instruction set, and 4-phase daily action schedule for a character in our vintage mystery hotel game ("The Alderney Arms").
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
        contents: `Generate a single eerie 12-word atmospheric observation for a newly hired night hotel clerk standing in ${roomLabel} (${floor}) with sanity at ${sanity}%. No quotes.`
      });
      res.json({
        bark: (response.text || '').trim(),
        modelUsed: AI_MODEL_REGISTRY.ambient_bark.modelId
      });
    } catch {
      res.json({
        bark: 'Behind the old red brickwork, steam pipes clatter in a slow rhythmic cadence.',
        modelUsed: AI_MODEL_REGISTRY.ambient_bark.modelId
      });
    }
  });

  // 3. In-Game Hotel Architecture & Scale Reference Generator (gemini-3.8-flash + ThinkingLevel.LOW)
  app.post('/api/research/nyc-lore', async (req, res) => {
    const modelName = AI_MODEL_REGISTRY.architectural_research.modelId; // 'gemini-3.8-flash'
    try {
      const { query } = req.body;
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Provide in-game architectural scale, room proportion, and secret passageway design guidelines for our vintage residential mystery hotel game ("The Alderney Arms") regarding: "${query}". Summarize in 3 concise sentences for our 3D hotel Build Mode tool.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });

      res.json({
        summary:
          response.text ||
          'Vintage masonry residential hotels use hollow dumbwaiter shafts, 3.0m ceiling heights, and double-brick air courts.',
        sources: [],
        modelUsed: modelName
      });
    } catch (err: unknown) {
      res.json({
        summary:
          'Vintage residential hotels feature load-bearing brick exteriors, cast-iron steam radiators, transom ventilation doors, and service dumbwaiter shafts between suites.',
        sources: [],
        modelUsed: modelName,
        errorDetail: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // 4. Meshy.ai Image-to-3D + Google gemini-3.1-flash-lite 3D Composite Object Generator
  app.post('/api/forge/generate-3d', async (req, res) => {
    const {
      prompt = 'Vintage brass luggage cart',
      floor = 'lobby',
      referenceImageUrl = null
    }: {
      prompt?: string;
      floor?: string;
      referenceImageUrl?: string | null;
    } = req.body || {};

    let meshyTaskId: string | null = null;
    let meshyStatus = 'ready';

    // Proposal A: Run automatic studio background alpha matting pre-pass before Meshy.ai Image-to-3D submission
    const alphaMatteForSingle = referenceImageUrl
      ? applyAlphaMatteToConceptImageDataUrl(referenceImageUrl)
      : null;
    const meshyInputImageUrl = alphaMatteForSingle
      ? alphaMatteForSingle.mattedImageDataUrl
      : referenceImageUrl;

    // If a reference image is provided and MESHY_API_KEY is configured, invoke Meshy.ai Image-to-3D API (the sole non-Google AI model)
    if (meshyInputImageUrl && process.env.MESHY_API_KEY) {
      try {
        const meshyRes = await fetch('https://api.meshy.ai/openapi/v1/image-to-3d', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.MESHY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image_url: meshyInputImageUrl,
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
        text: `Design a low-poly 3D composite object for a vintage residential mystery hotel game based on this request${
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

  // 4b. Meshy.ai Auto-Rigging & Low-Frame Character Animation Pipeline (/openapi/v1/rigging + /openapi/v1/animations)
  app.post('/api/forge/meshy-animate-rig', async (req, res) => {
    const {
      characterName = 'Alderney Resident',
      appearance,
      gesture = 'idle_observe',
      bakeAllGestures = true,
      globalFps = 8,
      modelUrl = 'https://assets.meshy.ai/alderney/default_humanoid_hull.glb',
      existingRigTaskId
    } = req.body || {};

    const validGlobalFps = normalizeGlobalAnimationFps(Number(globalFps));
    const safeAppearance: CharacterAppearance = appearance || INITIAL_AGENTS[0].appearance;
    const meshyApiKey = process.env.MESHY_API_KEY;

    let rigTaskId: string =
      typeof existingRigTaskId === 'string' && existingRigTaskId.trim().length > 0
        ? existingRigTaskId.trim()
        : `meshy_rig_${Date.now().toString(36)}`;
    let meshyRigStatus = 'SYNTHESIZED_LOW_FRAME';

    const riggingPayload = buildMeshyRiggingRequestPayload(modelUrl, safeAppearance);

    // Step 1: If MESHY_API_KEY is configured, dispatch Auto-Rigging task to Meshy.ai REST v1
    if (meshyApiKey && !existingRigTaskId) {
      try {
        const rigRes = await fetch('https://api.meshy.ai/openapi/v1/rigging', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${meshyApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(riggingPayload)
        });
        if (rigRes.ok) {
          const rigData = (await rigRes.json()) as { result?: string };
          if (rigData.result) {
            rigTaskId = `meshy_live_${rigData.result}`;
            meshyRigStatus = 'SUBMITTED_TO_MESHY_V1';
          }
        }
      } catch {
        meshyRigStatus = 'LOCAL_LOW_FRAME_RIG_FALLBACK';
      }
    }

    // Step 2: Bake low-frame decimated animation clips (and dispatch /openapi/v1/animations with post_process.change_fps)
    const targetGestures: ScheduledActivityGesture[] = bakeAllGestures
      ? (Object.keys(MESHY_ANIMATION_PRESETS) as ScheduledActivityGesture[])
      : [gesture as ScheduledActivityGesture];

    const animations: Partial<Record<ScheduledActivityGesture, MeshyCharacterAnimationClipSpec>> = {};
    const apiPayloadsSent: Array< ReturnType<typeof buildMeshyAnimateRequestPayload> > = [];

    for (const g of targetGestures) {
      const animPayload = buildMeshyAnimateRequestPayload(rigTaskId, g, validGlobalFps);
      apiPayloadsSent.push(animPayload);

      let animTaskId = `meshy_anim_${g}_${validGlobalFps}fps_${Date.now().toString(36).slice(-4)}`;

      if (meshyApiKey && g === gesture) {
        try {
          const animRes = await fetch('https://api.meshy.ai/openapi/v1/animations', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${meshyApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(animPayload)
          });
          if (animRes.ok) {
            const animData = (await animRes.json()) as { result?: string };
            if (animData.result) {
              animTaskId = `meshy_live_anim_${animData.result}`;
            }
          }
        } catch {
          // Keep deterministic low-frame baked clip ID
        }
      }

      animations[g] = decimateAnimationKeyframes(
        safeAppearance,
        g,
        validGlobalFps,
        rigTaskId,
        animTaskId,
        60
      );
    }

    // Step 3: Persist the low-frame animated character rig bundle to ./ArchitectForge_Workspace/characters/rigs/
    let savedDiskPath: string | null = null;
    try {
      const rigFolderSpec = getLocalFolderSpec('character_rigs');
      const absDir = path.join(process.cwd(), LOCAL_WORKSPACE_ROOT_NAME, rigFolderSpec.relativePath);
      fs.mkdirSync(absDir, { recursive: true });
      const filename = buildLocalFolderItemFilename(
        'character_rigs',
        `${characterName}_meshy_${validGlobalFps}fps`,
        rigTaskId.slice(-6)
      );
      const fullPath = path.join(absDir, filename);
      fs.writeFileSync(
        fullPath,
        JSON.stringify(
          {
            schemaVersion: '2.1.0',
            savedAt: new Date().toISOString(),
            category: 'character_rigs',
            characterName,
            meshyRigTaskId: rigTaskId,
            globalFps: validGlobalFps,
            riggingPayload,
            animationPayloads: apiPayloadsSent,
            animations
          },
          null,
          2
        ),
        'utf-8'
      );
      savedDiskPath = `./${LOCAL_WORKSPACE_ROOT_NAME}/${rigFolderSpec.relativePath}/${filename}`;
    } catch {
      savedDiskPath = null;
    }

    const primaryClip = animations[gesture as ScheduledActivityGesture] || Object.values(animations)[0];

    res.json({
      rigTaskId,
      meshyRigStatus,
      globalFps: validGlobalFps,
      riggingPayload,
      primaryAnimationPayload: buildMeshyAnimateRequestPayload(
        rigTaskId,
        gesture as ScheduledActivityGesture,
        validGlobalFps
      ),
      primaryClip,
      animations,
      savedDiskPath,
      provider: 'Meshy.ai',
      modelUsed: AI_MODEL_REGISTRY.meshy_image_to_3d.modelId
    });
  });

  // 5. Custom Texture & Image-to-3D Reference Generation using Google's cheapest image model: gemini-3.1-flash-lite-image
  app.post('/api/forge/generate-texture', async (req, res) => {
    const { prompt = 'Crimson geometric corridor carpet', base64Image, mimeType = 'image/png', aspectRatio = '1:1' } =
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
        text: `Flat seamless orthographic game texture or architectural surface reference for a stylized vintage mystery hotel: ${prompt}. High contrast, low-poly cartoon aesthetic.`
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

  // 6. Parametric Game Sound Effect (SFX) Foley Generator (Cheapest Google model: gemini-3.1-flash-lite)
  app.post('/api/audio/generate-sfx', async (req, res) => {
    const { prompt = 'Heavy brass door lock latching shut' } = req.body || {};
    const modelName = AI_MODEL_REGISTRY.sfx_generator.modelId; // 'gemini-3.1-flash-lite'

    try {
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Design a SOTA multi-stage parametric sound effect (SFX) specification for our 1990s boutique hotel mystery game based on: "${prompt}".
Produce an oscillator synthesis envelope (sine, square, sawtooth, or triangle) with FM harmonic modulation (fmRatio, fmDepth), sub-oscillator mix (subOscMix), physical Foley noise color ('white', 'pink', or 'brown'), resonant filter cutoff, warm saturation distortion, and room acoustic reverb preset ('small_room', 'tiled_bathroom', 'grand_lobby', or 'sub_vault').`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              type: { type: Type.STRING },
              durationSeconds: { type: Type.NUMBER },
              oscillatorType: { type: Type.STRING },
              baseFrequency: { type: Type.NUMBER },
              pitchBend: { type: Type.NUMBER },
              attack: { type: Type.NUMBER },
              decay: { type: Type.NUMBER },
              sustain: { type: Type.NUMBER },
              release: { type: Type.NUMBER },
              filterType: { type: Type.STRING },
              filterCutoff: { type: Type.NUMBER },
              filterResonance: { type: Type.NUMBER },
              noiseMix: { type: Type.NUMBER },
              noiseColor: { type: Type.STRING },
              fmRatio: { type: Type.NUMBER },
              fmDepth: { type: Type.NUMBER },
              subOscMix: { type: Type.NUMBER },
              distortion: { type: Type.NUMBER },
              reverb: { type: Type.NUMBER },
              reverbPreset: { type: Type.STRING }
            },
            required: [
              'name',
              'durationSeconds',
              'oscillatorType',
              'baseFrequency',
              'attack',
              'decay',
              'sustain',
              'release',
              'noiseMix'
            ]
          }
        }
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      if (parsed && parsed.baseFrequency) {
        const validNoiseColors = ['white', 'pink', 'brown'];
        const validReverbPresets = ['small_room', 'tiled_bathroom', 'grand_lobby', 'sub_vault'];
        res.json({
          spec: {
            id: `sfx_ai_${Date.now()}`,
            name: parsed.name || prompt,
            type: 'custom',
            durationSeconds: Math.max(0.1, Math.min(4.0, Number(parsed.durationSeconds) || 1.0)),
            oscillatorType: parsed.oscillatorType || 'sine',
            baseFrequency: Math.max(30, Math.min(4000, Number(parsed.baseFrequency) || 220)),
            pitchBend: Number(parsed.pitchBend) || 0,
            attack: Math.max(0.001, Number(parsed.attack) || 0.05),
            decay: Math.max(0.01, Number(parsed.decay) || 0.2),
            sustain: Math.max(0, Math.min(1, Number(parsed.sustain) || 0.3)),
            release: Math.max(0.01, Number(parsed.release) || 0.3),
            filterType: parsed.filterType || 'lowpass',
            filterCutoff: Math.max(100, Math.min(8000, Number(parsed.filterCutoff) || 1000)),
            filterResonance: Math.max(0, Math.min(10, Number(parsed.filterResonance) || 2.0)),
            noiseMix: Math.max(0, Math.min(1, Number(parsed.noiseMix) || 0.2)),
            noiseColor: validNoiseColors.includes(parsed.noiseColor) ? parsed.noiseColor : 'pink',
            fmRatio: Math.max(0.5, Math.min(8, Number(parsed.fmRatio) || 1.5)),
            fmDepth: Math.max(0, Math.min(600, Number(parsed.fmDepth) || 35)),
            subOscMix: Math.max(0, Math.min(1, Number(parsed.subOscMix) || 0.25)),
            distortion: Math.max(0, Math.min(1, Number(parsed.distortion) || 0)),
            reverb: Math.max(0, Math.min(1, Number(parsed.reverb) || 0.3)),
            reverbPreset: validReverbPresets.includes(parsed.reverbPreset) ? parsed.reverbPreset : 'small_room'
          },
          modelUsed: modelName,
          source: 'gemini-3.1-flash-lite'
        });
        return;
      }
      throw new Error('Fallback to procedural sound generator');
    } catch {
      const fallback = buildProceduralSfxSpecFromPrompt(prompt);
      res.json({
        spec: fallback,
        modelUsed: modelName,
        source: 'procedural-fallback'
      });
    }
  });

  // 7. Multi-Track Background Music Composer (Cheapest Google model: gemini-3.1-flash-lite)
  app.post('/api/audio/generate-music', async (req, res) => {
    const { prompt = 'Rainy boutique hotel lounge noir jazz' } = req.body || {};
    const modelName = AI_MODEL_REGISTRY.music_composer.modelId; // 'gemini-3.1-flash-lite'

    try {
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Compose a SOTA polyphonic multi-voice ambient background music loop for a 1990s boutique hotel mystery based on: "${prompt}".
Include mood, bpm (40-140), key/scale, 4 jazz/ambient chord progression symbols (e.g. Dm7, G7, Bbmaj7, A7b9), padInstrument ('warm_epiano', 'vintage_pad', 'noir_organ', or 'glass_marimba'), reverbPreset ('small_room', 'tiled_bathroom', 'grand_lobby', or 'sub_vault'), stereoWidth (0.2-1.0), drone frequency, filter cutoff, and 4-8 melody notes (note name e.g. D4, freq, timeOffset in beats 0-8, duration in beats, velocity 0-1) and bass notes.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              mood: { type: Type.STRING },
              bpm: { type: Type.NUMBER },
              scale: { type: Type.STRING },
              rootNote: { type: Type.STRING },
              chords: { type: Type.ARRAY, items: { type: Type.STRING } },
              droneFreq: { type: Type.NUMBER },
              reverbAmount: { type: Type.NUMBER },
              reverbPreset: { type: Type.STRING },
              padInstrument: { type: Type.STRING },
              stereoWidth: { type: Type.NUMBER },
              filterCutoff: { type: Type.NUMBER },
              melody: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    note: { type: Type.STRING },
                    freq: { type: Type.NUMBER },
                    timeOffset: { type: Type.NUMBER },
                    duration: { type: Type.NUMBER },
                    velocity: { type: Type.NUMBER }
                  },
                  required: ['note', 'freq', 'timeOffset', 'duration', 'velocity']
                }
              },
              bass: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    note: { type: Type.STRING },
                    freq: { type: Type.NUMBER },
                    timeOffset: { type: Type.NUMBER },
                    duration: { type: Type.NUMBER },
                    velocity: { type: Type.NUMBER }
                  },
                  required: ['note', 'freq', 'timeOffset', 'duration', 'velocity']
                }
              }
            },
            required: ['title', 'mood', 'bpm', 'chords', 'droneFreq', 'melody', 'bass']
          }
        }
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      if (parsed && Array.isArray(parsed.melody) && parsed.melody.length > 0) {
        const validPads = ['warm_epiano', 'vintage_pad', 'noir_organ', 'glass_marimba'];
        const validReverbs = ['small_room', 'tiled_bathroom', 'grand_lobby', 'sub_vault'];
        res.json({
          track: {
            id: `bgm_ai_${Date.now()}`,
            title: parsed.title || prompt,
            mood: parsed.mood || 'Retro Hotel Mystery',
            bpm: Math.max(40, Math.min(140, Number(parsed.bpm) || 72)),
            scale: parsed.scale || 'natural_minor',
            rootNote: parsed.rootNote || 'D',
            chords: Array.isArray(parsed.chords) ? parsed.chords : ['Dm7', 'Gm7', 'A7b9', 'Dm7'],
            droneFreq: Math.max(30, Math.min(300, Number(parsed.droneFreq) || 73.42)),
            reverbAmount: Math.max(0.1, Math.min(0.9, Number(parsed.reverbAmount) || 0.5)),
            reverbPreset: validReverbs.includes(parsed.reverbPreset) ? parsed.reverbPreset : 'grand_lobby',
            padInstrument: validPads.includes(parsed.padInstrument) ? parsed.padInstrument : 'warm_epiano',
            stereoWidth: Math.max(0.2, Math.min(1.0, Number(parsed.stereoWidth) || 0.7)),
            filterCutoff: Math.max(200, Math.min(3000, Number(parsed.filterCutoff) || 900)),
            melody: parsed.melody,
            bass: Array.isArray(parsed.bass) ? parsed.bass : []
          },
          modelUsed: modelName,
          source: 'gemini-3.1-flash-lite'
        });
        return;
      }
      throw new Error('Fallback to procedural music generator');
    } catch {
      const fallback = buildProceduralMusicSpecFromPrompt(prompt);
      res.json({
        track: fallback,
        modelUsed: modelName,
        source: 'procedural-fallback'
      });
    }
  });

  // 8. Gemini Live API WebSocket Bridge (/live) using gemini-3.8-live
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
            'You are Tape #9, the sentient Handheld Microcassette Dictaphone carried by the newly hired Night Clerk at The Alderney Arms Hotel. Speak in concise, atmospheric detective tones. Never break character.'
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

  // 7. Standalone Single-File HTML Application Packager (GET or POST /api/export/standalone-html)
  const buildStandaloneSingleFileHtml = async (embeddedProject?: unknown): Promise<string> => {
    const distDir = path.resolve(__dirname, 'dist');
    const indexHtmlPath = path.join(distDir, 'index.html');
    if (!fs.existsSync(indexHtmlPath)) {
      await buildViteBundle({ logLevel: 'silent' });
    }
    let html = fs.readFileSync(indexHtmlPath, 'utf-8');

    // Inline <link rel="stylesheet" crossorigin href="/assets/...">
    html = html.replace(
      /<link[^>]*rel=["']stylesheet["'][^>]*href=["']\/?([^"']+\.css)["'][^>]*>/gi,
      (_match, relCssPath: string) => {
        const cleanRel = relCssPath.replace(/^\//, '');
        const fullCssPath = path.join(distDir, cleanRel);
        if (fs.existsSync(fullCssPath)) {
          const cssContent = fs.readFileSync(fullCssPath, 'utf-8');
          return `<style>${cssContent}</style>`;
        }
        return _match;
      }
    );

    const preloadScript = embeddedProject
      ? `<script>window.__STANDALONE_INITIAL_PROJECT__ = ${JSON.stringify(embeddedProject).replace(/<\/script/gi, '<\\/script')};</script>\n`
      : '';

    // Inline <script type="module" crossorigin src="/assets/..."></script>
    html = html.replace(
      /<script[^>]*src=["']\/?([^"']+\.js)["'][^>]*><\/script>/gi,
      (_match, relJsPath: string) => {
        const cleanRel = relJsPath.replace(/^\//, '');
        const fullJsPath = path.join(distDir, cleanRel);
        if (fs.existsSync(fullJsPath)) {
          const jsContent = fs
            .readFileSync(fullJsPath, 'utf-8')
            .replace(/<\/script/gi, '<\\/script');
          return `${preloadScript}<script type="module">${jsContent}</script>`;
        }
        return _match;
      }
    );

    return html;
  };

  app.get('/api/export/standalone-html', async (_req, res) => {
    try {
      const standaloneHtml = await buildStandaloneSingleFileHtml();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="ArchitectForge_Standalone.html"'
      );
      res.send(standaloneHtml);
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to build standalone HTML bundle'
      });
    }
  });

  app.post('/api/export/standalone-html', async (req, res) => {
    try {
      const projectSnapshot = req.body?.projectSnapshot || null;
      const standaloneHtml = await buildStandaloneSingleFileHtml(projectSnapshot);
      res.json({
        filename: 'ArchitectForge_Standalone.html',
        html: standaloneHtml,
        sizeBytes: Buffer.byteLength(standaloneHtml, 'utf-8')
      });
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to build standalone HTML bundle'
      });
    }
  });

  // 8. 100% Local Computer Workspace & Dedicated Folder File System Manager
  const localWorkspaceRoot = path.resolve(__dirname, LOCAL_WORKSPACE_ROOT_NAME);

  const ensureLocalWorkspaceDirectories = () => {
    if (!fs.existsSync(localWorkspaceRoot)) {
      fs.mkdirSync(localWorkspaceRoot, { recursive: true });
    }
    for (const folder of LOCAL_WORKSPACE_FOLDERS) {
      const fullFolder = path.join(localWorkspaceRoot, folder.relativePath);
      if (!fs.existsSync(fullFolder)) {
        fs.mkdirSync(fullFolder, { recursive: true });
      }
    }
    const scripts = buildLocalSetupScripts();
    const readmePath = path.join(localWorkspaceRoot, 'README_LOCAL_FOLDERS.txt');
    if (!fs.existsSync(readmePath)) {
      fs.writeFileSync(readmePath, scripts.readmeTxt, 'utf-8');
    }
    // Seed initial starter records in dedicated folders if completely empty
    const seedHelper = (category: LocalFolderCategory, name: string, suffix: string, payload: unknown) => {
      const spec = getLocalFolderSpec(category);
      const dir = path.join(localWorkspaceRoot, spec.relativePath);
      const existing = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
      if (existing.length === 0) {
        const fname = buildLocalFolderItemFilename(category, name, suffix);
        fs.writeFileSync(path.join(dir, fname), JSON.stringify(payload, null, 2), 'utf-8');
      }
    };

    // Seed the Asset Image Descriptions Import Queue folder (./ArchitectForge_Workspace/assets/image_descriptions_import/)
    const descSpec = getLocalFolderSpec('asset_descriptions');
    const descDir = path.join(localWorkspaceRoot, descSpec.relativePath);
    const existingDescFiles = fs.existsSync(descDir)
      ? fs.readdirSync(descDir).filter((f) => !f.startsWith('.'))
      : [];
    if (existingDescFiles.length === 0) {
      fs.writeFileSync(
        path.join(descDir, 'late70s_hotel_asset_descriptions.descriptions.txt'),
        DEFAULT_ASSET_DESCRIPTIONS_IMPORT_FILE_CONTENT,
        'utf-8'
      );
    }

    seedHelper('environment_3d', 'Vintage Brass Table Fan', 'seed01', {
      schemaVersion: '2.0.0',
      savedAt: new Date().toISOString(),
      category: 'environment_3d',
      asset: buildProcedural3DSpecFromPrompt('Vintage Brass Table Fan')
    });
    seedHelper('catalog_blueprints', 'Mahogany Concierge Desk', 'seed01', {
      schemaVersion: '2.0.0',
      savedAt: new Date().toISOString(),
      category: 'catalog_blueprints',
      catalogItem: {
        id: 'cat_concierge_desk_seed',
        name: 'Mahogany Concierge Desk',
        category: 'furniture',
        subType: 'concierge_desk',
        dimensions: [2.6, 1.1, 0.9],
        defaultColor: '#3b2314',
        defaultTextureId: 'oak_parquet',
        collidable: true
      }
    });
    seedHelper('textures', 'Crimson Geometric Corridor Carpet', 'seed01', {
      schemaVersion: '2.0.0',
      savedAt: new Date().toISOString(),
      category: 'textures',
      texture: {
        id: 'tex_crimson_deco_seed',
        name: 'Crimson Geometric Corridor Carpet',
        category: 'floor',
        imageUrl: generateSeamlessSvgTextureDataUrl('crimson geometric corridor carpet')
      }
    });
    if (INITIAL_ROOM_BLUEPRINTS.length > 0) {
      seedHelper('blueprints', INITIAL_ROOM_BLUEPRINTS[0].name, 'seed01', {
        schemaVersion: '2.0.0',
        savedAt: new Date().toISOString(),
        category: 'blueprints',
        blueprint: INITIAL_ROOM_BLUEPRINTS[0]
      });
      seedHelper('room_blueprints', INITIAL_ROOM_BLUEPRINTS[0].name, 'seed01', {
        schemaVersion: '2.0.0',
        savedAt: new Date().toISOString(),
        category: 'room_blueprints',
        blueprint: INITIAL_ROOM_BLUEPRINTS[0]
      });
    }
    if (INITIAL_AGENTS.length > 0) {
      seedHelper('character_rigs', INITIAL_AGENTS[0].name, 'seed01', {
        schemaVersion: '2.0.0',
        savedAt: new Date().toISOString(),
        category: 'character_rigs',
        character: INITIAL_AGENTS[0]
      });
      seedHelper('ai_instructions', `${INITIAL_AGENTS[0].name} Offline Lore`, 'seed01', {
        schemaVersion: '2.0.0',
        savedAt: new Date().toISOString(),
        category: 'ai_instructions',
        characterName: INITIAL_AGENTS[0].name,
        globalInstructionSet: DEFAULT_GLOBAL_INSTRUCTION_SET,
        personalInstructionSet: INITIAL_AGENTS[0].personalInstructionSet || '',
        knownFacts: INITIAL_AGENTS[0].knownFacts
      });
    }
  };

  ensureLocalWorkspaceDirectories();

  app.get('/api/local-fs/status', (_req, res) => {
    try {
      ensureLocalWorkspaceDirectories();
      const folders = LOCAL_WORKSPACE_FOLDERS.map((spec) => {
        const absDir = path.join(localWorkspaceRoot, spec.relativePath);
        const entries = fs.existsSync(absDir) ? fs.readdirSync(absDir) : [];
        const files = entries
          .filter((name) => !name.startsWith('.'))
          .map((filename) => {
            const fullPath = path.join(absDir, filename);
            const stat = fs.statSync(fullPath);
            return {
              filename,
              relativePath: `${LOCAL_WORKSPACE_ROOT_NAME}/${spec.relativePath}/${filename}`,
              sizeBytes: stat.size,
              updatedAt: stat.mtime.toISOString()
            };
          })
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        return {
          ...spec,
          fullDiskPath: absDir,
          workspacePath: `./${LOCAL_WORKSPACE_ROOT_NAME}/${spec.relativePath}/`,
          fileCount: files.length,
          files
        };
      });

      res.json({
        rootDirectoryName: LOCAL_WORKSPACE_ROOT_NAME,
        rootDiskPath: localWorkspaceRoot,
        totalFiles: folders.reduce((sum, f) => sum + f.fileCount, 0),
        folders
      });
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to read local workspace directory tree'
      });
    }
  });

  app.post('/api/local-fs/save-item', (req, res) => {
    try {
      ensureLocalWorkspaceDirectories();
      const {
        category,
        itemName = 'Newly Added Asset',
        uniqueId = String(Date.now()).slice(-6),
        payload
      }: {
        category: LocalFolderCategory;
        itemName?: string;
        uniqueId?: string;
        payload: unknown;
      } = req.body || {};

      const spec = getLocalFolderSpec(category || 'environment_3d');
      const targetDir = path.join(localWorkspaceRoot, spec.relativePath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const filename = buildLocalFolderItemFilename(spec.category, itemName, uniqueId);
      const fullPath = path.join(targetDir, filename);

      // If saving into asset_descriptions and payload is a string or has rawText, write raw text so user can edit it directly on disk
      if (spec.category === 'asset_descriptions' && typeof payload === 'string') {
        fs.writeFileSync(fullPath, payload, 'utf-8');
        res.json({
          saved: true,
          category: spec.category,
          filename,
          relativePath: `./${LOCAL_WORKSPACE_ROOT_NAME}/${spec.relativePath}/${filename}`,
          fullDiskPath: fullPath,
          sizeBytes: Buffer.byteLength(payload, 'utf-8'),
          savedAt: new Date().toISOString()
        });
        return;
      }

      const envelope = {
        schemaVersion: '2.0.0',
        savedAt: new Date().toISOString(),
        category: spec.category,
        folderPath: `${LOCAL_WORKSPACE_ROOT_NAME}/${spec.relativePath}`,
        itemName,
        data: payload
      };
      const serialized = JSON.stringify(envelope, null, 2);
      fs.writeFileSync(fullPath, serialized, 'utf-8');

      res.json({
        saved: true,
        category: spec.category,
        filename,
        relativePath: `./${LOCAL_WORKSPACE_ROOT_NAME}/${spec.relativePath}/${filename}`,
        fullDiskPath: fullPath,
        sizeBytes: Buffer.byteLength(serialized, 'utf-8'),
        savedAt: envelope.savedAt
      });
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to save item to dedicated local folder'
      });
    }
  });

  // Save or upload a raw .txt, .md, or .json asset description file into ./ArchitectForge_Workspace/assets/image_descriptions_import/
  app.post('/api/local-fs/save-description-file', (req, res) => {
    try {
      ensureLocalWorkspaceDirectories();
      const {
        filename = `custom_70s_assets_${String(Date.now()).slice(-5)}.descriptions.txt`,
        content = DEFAULT_ASSET_DESCRIPTIONS_IMPORT_FILE_CONTENT
      }: {
        filename?: string;
        content?: string;
      } = req.body || {};

      const spec = getLocalFolderSpec('asset_descriptions');
      const targetDir = path.join(localWorkspaceRoot, spec.relativePath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const safeFilename =
        path
          .basename(filename)
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .slice(0, 80) || 'asset_descriptions.txt';
      const fullPath = path.join(targetDir, safeFilename);
      fs.writeFileSync(fullPath, content, 'utf-8');
      const parsedItems = parseAssetDescriptionsFile(safeFilename, content);

      res.json({
        saved: true,
        category: 'asset_descriptions',
        filename: safeFilename,
        relativePath: `./${LOCAL_WORKSPACE_ROOT_NAME}/${spec.relativePath}/${safeFilename}`,
        fullDiskPath: fullPath,
        sizeBytes: Buffer.byteLength(content, 'utf-8'),
        parsedCount: parsedItems.length,
        parsedItems
      });
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to save asset description file'
      });
    }
  });

  app.get('/api/local-fs/read-item', (req, res) => {
    try {
      const category = (req.query.category as LocalFolderCategory) || 'environment_3d';
      const filename = path.basename(String(req.query.filename || ''));
      const spec = getLocalFolderSpec(category);
      const fullPath = path.join(localWorkspaceRoot, spec.relativePath, filename);
      if (!fs.existsSync(fullPath)) {
        res.status(404).json({ error: 'File not found in dedicated folder.' });
        return;
      }
      const raw = fs.readFileSync(fullPath, 'utf-8');
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {
          rawText: raw,
          items: parseAssetDescriptionsFile(filename, raw)
        };
      }
      res.json({
        category: spec.category,
        filename,
        relativePath: `./${LOCAL_WORKSPACE_ROOT_NAME}/${spec.relativePath}/${filename}`,
        rawText: raw,
        parsed
      });
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to read item from dedicated folder'
      });
    }
  });

  // 9. Batch Asset Description File -> Cheapest Image Model (gemini-3.1-flash-lite-image) -> Meshy.ai Image-to-3D -> Game Catalog Pipeline
  app.post('/api/forge/batch-import-descriptions', async (req, res) => {
    try {
      ensureLocalWorkspaceDirectories();
      const {
        filename = 'late70s_hotel_asset_descriptions.descriptions.txt',
        rawContent,
        floor = 'lobby'
      }: {
        filename?: string;
        rawContent?: string;
        floor?: string;
      } = req.body || {};

      const descSpec = getLocalFolderSpec('asset_descriptions');
      const fullDescPath = path.join(
        localWorkspaceRoot,
        descSpec.relativePath,
        path.basename(filename)
      );

      let textToParse = rawContent || '';
      if (!textToParse && fs.existsSync(fullDescPath)) {
        textToParse = fs.readFileSync(fullDescPath, 'utf-8');
      }
      if (!textToParse) {
        textToParse = DEFAULT_ASSET_DESCRIPTIONS_IMPORT_FILE_CONTENT;
      }

      const entries = parseAssetDescriptionsFile(filename, textToParse).slice(0, 8);
      if (entries.length === 0) {
        res.status(400).json({
          error: 'No valid asset descriptions found in file.'
        });
        return;
      }

      const imageModelId = AI_MODEL_REGISTRY.description_to_image.modelId; // 'gemini-3.1-flash-lite-image'
      const meshyModelId = AI_MODEL_REGISTRY.meshy_image_to_3d.modelId; // 'meshy-4-image-to-3d'
      const compositeModelId = AI_MODEL_REGISTRY.composite_3d_spec.modelId; // 'gemini-3.1-flash-lite'
      const ai = getGenAIClient();

      const importedResults = await Promise.all(
        entries.map(async (entry, idx) => {
          // Step A1: Asset Import Agent (Text/image/3d model instruction Set) -> Generate mandatory enforced low-poly 2D image prompt
          let enforcedImagePrompt =
            entry.enforcedImagePrompt ||
            buildEnforcedLowPolyImagePrompt(entry.name, entry.description);

          try {
            if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MISSING_KEY') {
              const promptResp = await Promise.race([
                ai.models.generateContent({
                  model: compositeModelId, // 'gemini-3.1-flash-lite'
                  contents: `Asset Name: ${entry.name}\nFunctional / Visual Details: ${entry.description}`,
                  config: {
                    systemInstruction: ASSET_IMPORT_AGENT_INSTRUCTION_SET,
                    temperature: 0.2
                  }
                }),
                new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error('Prompt agent timeout')), 3500)
                )
              ]);
              const candidatePrompt = (promptResp.text || '').trim().replace(/^["']|["']$/g, '');
              if (
                candidatePrompt.includes('low-poly game asset, isolated 3D asset style') &&
                candidatePrompt.includes('Flat texture maps, optimized for low-poly 3D reconstruction')
              ) {
                enforcedImagePrompt = candidatePrompt;
              }
            }
          } catch {
            // Deterministic enforcer already populated enforcedImagePrompt
          }

          // Step A2: Turn the enforced 2D image prompt into a 1:1 concept art image using the cheapest capable model: gemini-3.1-flash-lite-image
          let referenceImageUrl = '';
          try {
            if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MISSING_KEY') {
              const imgResp = await Promise.race([
                ai.models.generateContent({
                  model: imageModelId,
                  contents: {
                    parts: [
                      {
                        text: enforcedImagePrompt
                      }
                    ]
                  },
                  config: {
                    imageConfig: {
                      aspectRatio: '1:1'
                    }
                  }
                }),
                new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error('Image generation timeout')), 5500)
                )
              ]);
              for (const part of imgResp.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData?.data) {
                  const outMime = part.inlineData.mimeType || 'image/png';
                  referenceImageUrl = `data:${outMime};base64,${part.inlineData.data}`;
                  break;
                }
              }
            }
          } catch {
            // Fallback to deterministic Late-70s orthographic diffuse-white concept SVG data URI
          }

          if (!referenceImageUrl) {
            referenceImageUrl = generateAssetConceptSvgDataUrl(entry.name, entry.description);
          }

          // Step A3 (Proposal A): Automatic Studio Background Alpha Matting Pre-Pass (#f8fafc -> RGBA 0,0,0,0) before Meshy.ai
          const alphaMatteResult = applyAlphaMatteToConceptImageDataUrl(referenceImageUrl);
          const mattedImageDataUrl = alphaMatteResult.mattedImageDataUrl;

          // Step B: Pass the alpha-matted reference image to Meshy.ai Image-to-3D (meshy-4-image-to-3d)
          let meshyTaskId: string | null = null;
          let meshyStatus = 'meshy-4-image-to-3d-ready';
          if (process.env.MESHY_API_KEY) {
            try {
              const meshyRes = await fetch('https://api.meshy.ai/openapi/v1/image-to-3d', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${process.env.MESHY_API_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  image_url: mattedImageDataUrl,
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
          } else {
            meshyTaskId = `meshy4_img2mesh_${Date.now()}_${idx + 1}`;
            meshyStatus = 'meshy-4-image-to-3d-bridged';
          }

          // Step C: Build 3D composite geometry (multimodal gemini-3.1-flash-lite + procedural late-70s weathered fallback)
          const baseSpec = buildProcedural3DSpecFromPrompt(`${entry.name} ${entry.description}`);
          const dimensions: [number, number, number] =
            entry.dimensionsHint || baseSpec.dimensions || [1.0, 1.25, 0.75];

          const rawAsset: PlacedAsset = {
            id: `batch3d_${Date.now()}_${idx + 1}`,
            name: entry.name,
            category: entry.categoryHint || baseSpec.category || 'custom_ai',
            subType: `meshy_batch_${entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24)}`,
            floor,
            roomNumber: 'Imported Batch',
            position: [
              Number((-3.0 + idx * 2.0).toFixed(2)),
              Number((dimensions[1] / 2).toFixed(2)),
              0
            ],
            dimensions,
            rotationY: 0,
            color: baseSpec.parts[0]?.color || '#3b2314',
            textureId: 'aged_brass',
            customTextureUrl: mattedImageDataUrl,
            collidable: true,
            compositeParts: baseSpec.parts,
            meshyTaskId: meshyTaskId || undefined,
            inspectText: `${entry.description} [Image: ${imageModelId} → Alpha-Matted RGBA(0,0,0,0) → 3D: ${meshyModelId}]`
          };

          const weatheredAsset = weatherAssetToLate70sStyle(rawAsset);
          const catalogBlueprint = createBlueprintFromAsset(weatheredAsset);

          // Save both the 3D asset and the catalog blueprint to their dedicated local workspace folders on disk
          const envDir = path.join(localWorkspaceRoot, getLocalFolderSpec('environment_3d').relativePath);
          const catDir = path.join(localWorkspaceRoot, getLocalFolderSpec('catalog_blueprints').relativePath);
          const envFile = buildLocalFolderItemFilename('environment_3d', weatheredAsset.name, String(idx + 1));
          const catFile = buildLocalFolderItemFilename('catalog_blueprints', catalogBlueprint.name, String(idx + 1));

          fs.writeFileSync(
            path.join(envDir, envFile),
            JSON.stringify(
              {
                schemaVersion: '2.0.0',
                savedAt: new Date().toISOString(),
                category: 'environment_3d',
                pipeline: {
                  descriptionSourceFile: filename,
                  enforcedImagePrompt,
                  imageModel: imageModelId,
                  alphaMatted: alphaMatteResult.alphaMatted,
                  alphaMatteKeyHex: alphaMatteResult.backgroundKeyHex,
                  meshyModel: meshyModelId,
                  compositeModel: compositeModelId,
                  meshyTaskId
                },
                data: weatheredAsset
              },
              null,
              2
            ),
            'utf-8'
          );

          fs.writeFileSync(
            path.join(catDir, catFile),
            JSON.stringify(
              {
                schemaVersion: '2.0.0',
                savedAt: new Date().toISOString(),
                category: 'catalog_blueprints',
                pipeline: {
                  descriptionSourceFile: filename,
                  enforcedImagePrompt,
                  imageModel: imageModelId,
                  alphaMatted: alphaMatteResult.alphaMatted,
                  meshyModel: meshyModelId
                },
                data: catalogBlueprint
              },
              null,
              2
            ),
            'utf-8'
          );

          return {
            entryId: entry.id,
            name: weatheredAsset.name,
            category: weatheredAsset.category,
            description: entry.description,
            enforcedImagePrompt,
            referenceImageUrl,
            mattedImageDataUrl,
            alphaMatted: alphaMatteResult.alphaMatted,
            imageModelUsed: imageModelId,
            meshyModelUsed: meshyModelId,
            meshyTaskId,
            meshyStatus,
            catalogBlueprint,
            placedAsset: weatheredAsset
          };
        })
      );

      res.json({
        sourceFilename: filename,
        importedCount: importedResults.length,
        instructionSetEnforced: 'Text/image/3d model instruction Set (Mandatory Low-Poly Enforcer)',
        alphaMattingPrePass: 'Proposal A — Studio Background Chroma Key (#f8fafc -> RGBA 0,0,0,0)',
        pipelineModels: {
          promptEnforcerAgentModel: compositeModelId,
          descriptionToImageModel: imageModelId,
          alphaMattingPrePass: 'rgba-chroma-distance-feather',
          imageTo3DModel: meshyModelId,
          compositeFallbackModel: compositeModelId
        },
        items: importedResults
      });
    } catch (err: unknown) {
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Failed to process asset description file through Image-to-3D pipeline'
      });
    }
  });

  app.get('/api/local-fs/setup-scripts', (_req, res) => {
    res.json(buildLocalSetupScripts());
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
