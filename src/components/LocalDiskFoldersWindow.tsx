import React, { useState, useRef } from 'react';
import {
  LOCAL_WORKSPACE_FOLDERS,
  LOCAL_WORKSPACE_ROOT_NAME,
  LocalFolderCategory,
  LocalFolderSpec,
  StudioWindowId,
  StudioWindowState,
  buildLocalSetupScripts,
  DEFAULT_ASSET_DESCRIPTIONS_IMPORT_FILE_CONTENT,
  ASSET_IMPORT_AGENT_INSTRUCTION_SET,
  AI_MODEL_REGISTRY
} from '../game/rules';
import { StudioWindowFrame } from './StudioWindowFrame';

export interface LocalDiskFileEntry {
  filename: string;
  relativePath: string;
  sizeBytes: number;
  updatedAt: string;
}

export interface LocalDiskFolderStatus extends LocalFolderSpec {
  fullDiskPath?: string;
  workspacePath: string;
  fileCount: number;
  files: LocalDiskFileEntry[];
}

export interface BatchImportedAssetSummary {
  name: string;
  category: string;
  enforcedImagePrompt?: string;
  referenceImageUrl: string;
  mattedImageDataUrl?: string;
  alphaMatted?: boolean;
  imageModelUsed: string;
  meshyModelUsed: string;
}

interface LocalDiskFoldersWindowProps {
  windowState: StudioWindowState;
  onFocus: (id: StudioWindowId) => void;
  onMove: (id: StudioWindowId, nextX: number, nextY: number) => void;
  onResize: (id: StudioWindowId, nextW: number, nextH: number) => void;
  onToggleMinimize: (id: StudioWindowId) => void;
  onToggleMaximize: (id: StudioWindowId) => void;
  onClose: (id: StudioWindowId) => void;
  foldersStatus: LocalDiskFolderStatus[];
  rootDiskPath: string;
  autoSaveToFolders: boolean;
  onToggleAutoSaveToFolders: () => void;
  nativeDirName: string | null;
  onMountNativeComputerFolder: () => void;
  onSyncAllDataToFolders: () => void;
  onQuickSaveCategorySample: (category: LocalFolderCategory) => void;
  onLoadFileFromFolder: (category: LocalFolderCategory, filename: string) => void;
  onRefreshStatus: () => void;
  lastSavedBanner: string | null;
  onExportStandaloneHtml: () => void;
  onSaveDescriptionFile?: (filename: string, content: string) => Promise<void>;
  onRunBatchDescriptionImport?: (filename: string, rawContent?: string) => Promise<void>;
  batchImportBusy?: boolean;
  lastBatchImportSummary?: BatchImportedAssetSummary[];
}

export const LocalDiskFoldersWindow: React.FC<LocalDiskFoldersWindowProps> = ({
  windowState,
  onFocus,
  onMove,
  onResize,
  onToggleMinimize,
  onToggleMaximize,
  onClose,
  foldersStatus,
  rootDiskPath,
  autoSaveToFolders,
  onToggleAutoSaveToFolders,
  nativeDirName,
  onMountNativeComputerFolder,
  onSyncAllDataToFolders,
  onQuickSaveCategorySample,
  onLoadFileFromFolder,
  onRefreshStatus,
  lastSavedBanner,
  onExportStandaloneHtml,
  onSaveDescriptionFile,
  onRunBatchDescriptionImport,
  batchImportBusy = false,
  lastBatchImportSummary = []
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<LocalFolderCategory>('asset_descriptions');
  const [descriptionFilename, setDescriptionFilename] = useState<string>(
    'late70s_hotel_asset_descriptions.descriptions.txt'
  );
  const [descriptionContent, setDescriptionContent] = useState<string>(
    DEFAULT_ASSET_DESCRIPTIONS_IMPORT_FILE_CONTENT
  );
  const [showInstructionSetModal, setShowInstructionSetModal] = useState<boolean>(false);
  const descriptionUploadInputRef = useRef<HTMLInputElement | null>(null);

  const displayFolders: LocalDiskFolderStatus[] =
    foldersStatus.length > 0
      ? foldersStatus
      : LOCAL_WORKSPACE_FOLDERS.map((f) => ({
          ...f,
          workspacePath: `./${LOCAL_WORKSPACE_ROOT_NAME}/${f.relativePath}/`,
          fileCount: 0,
          files: []
        }));

  const activeFolder =
    displayFolders.find((f) => f.category === selectedCategory) || displayFolders[0];

  const totalFilesCount = displayFolders.reduce((acc, f) => acc + f.fileCount, 0);

  const handleDownloadSetupScript = (kind: 'bat' | 'sh' | 'readme') => {
    const scripts = buildLocalSetupScripts();
    const content =
      kind === 'bat' ? scripts.windowsBat : kind === 'sh' ? scripts.unixSh : scripts.readmeTxt;
    const filename =
      kind === 'bat'
        ? 'Setup_ArchitectForge_Local_Folders.bat'
        : kind === 'sh'
          ? 'Setup_ArchitectForge_Local_Folders.sh'
          : 'README_LOCAL_FOLDERS.txt';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadDescriptionFileFromDisk = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result || '');
      setDescriptionFilename(file.name);
      setDescriptionContent(text);
      if (onSaveDescriptionFile) {
        await onSaveDescriptionFile(file.name, text);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <StudioWindowFrame
      windowState={windowState}
      badgeText={`${displayFolders.length} Folders · ${totalFilesCount} Files`}
      onFocus={onFocus}
      onMove={onMove}
      onResize={onResize}
      onToggleMinimize={onToggleMinimize}
      onToggleMaximize={onToggleMaximize}
      onClose={onClose}
    >
      <div className="flex flex-col h-full text-xs text-stone-200 select-none bg-stone-950">
        <input
          ref={descriptionUploadInputRef}
          type="file"
          accept=".txt,.md,.json,text/plain,application/json"
          onChange={handleUploadDescriptionFileFromDisk}
          className="hidden"
        />

        {/* Top Status Header */}
        <div className="p-2.5 bg-stone-900/95 border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 font-bold text-[10px]">
                100% LOCAL COMPUTER WORKSPACE
              </span>
              <span className="text-[11px] font-mono text-amber-300 font-semibold">
                {LOCAL_WORKSPACE_ROOT_NAME}/ ({displayFolders.length} Dedicated Subfolders • {totalFilesCount} Saved Files)
              </span>
            </div>
            <div className="text-[10px] text-stone-400 font-mono mt-0.5 truncate max-w-[490px]">
              Disk Path: {rootDiskPath || `./${LOCAL_WORKSPACE_ROOT_NAME}`}
              {nativeDirName ? ` • Mounted Native Folder: "${nativeDirName}"` : ''}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleAutoSaveToFolders}
              className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                autoSaveToFolders
                  ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
                  : 'bg-stone-800 border-stone-600 text-stone-400'
              }`}
              title="Automatically write newly forged 3D assets, textures, catalog items, blueprints, rigs, and logs into their dedicated computer folders"
            >
              {autoSaveToFolders ? '✓ Auto-Save New Assets: ON' : 'Auto-Save New Assets: OFF'}
            </button>
            <button
              type="button"
              onClick={onRefreshStatus}
              className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-[10px] font-semibold"
              title="Rescan dedicated local computer folders"
            >
              ↻ Rescan Disk
            </button>
          </div>
        </div>

        {/* Action Toolbar: Native Computer Mount, Sync All, Setup Scripts & Standalone App */}
        <div className="px-2.5 py-1.5 bg-stone-950/90 border-b border-stone-800 flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onMountNativeComputerFolder}
              className="px-2.5 py-1 rounded bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/70 text-amber-200 text-[10px] font-bold transition"
              title={`Select a folder directly on your computer hard drive and auto-create all ${displayFolders.length} dedicated subfolders`}
            >
              {nativeDirName
                ? `📂 Mounted: ${nativeDirName} (Change)`
                : `📂 Mount Computer Folder (Auto-Create ${displayFolders.length} Subfolders)`}
            </button>

            <button
              type="button"
              onClick={onSyncAllDataToFolders}
              className="px-2.5 py-1 rounded bg-sky-500/25 hover:bg-sky-500/35 border border-sky-400/70 text-sky-200 text-[10px] font-bold transition"
              title="Save all current 3D assets, catalog blueprints, textures, room blueprints, characters, and logs into their dedicated folders right now"
            >
              ⚡ Sync All Studio Data to Dedicated Folders
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleDownloadSetupScript('bat')}
              className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-[10px]"
              title="Download Windows batch script that creates the dedicated folders on your PC"
            >
              ⬇ Windows (.bat)
            </button>
            <button
              type="button"
              onClick={() => handleDownloadSetupScript('sh')}
              className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-[10px]"
              title="Download Mac/Linux shell script that creates the dedicated folders"
            >
              ⬇ Mac/Linux (.sh)
            </button>
            <button
              type="button"
              onClick={onExportStandaloneHtml}
              className="px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600/45 border border-emerald-400/70 text-emerald-200 text-[10px] font-bold"
              title="Download the 100% standalone single-file HTML application"
            >
              ⬇ Standalone App (.html)
            </button>
          </div>
        </div>

        {lastSavedBanner && (
          <div className="px-2.5 py-1 bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-200 text-[10px] font-mono flex items-center justify-between">
            <span>✓ {lastSavedBanner}</span>
            <span className="text-emerald-400 font-bold">SAVED TO DISK</span>
          </div>
        )}

        {/* Main Split View: Left = Dedicated Folders Tree, Right = Folder Inspector & Saved Files */}
        <div className="flex-1 grid grid-cols-12 min-h-0 overflow-hidden">
          {/* Left Column: Dedicated Folders */}
          <div className="col-span-5 border-r border-stone-800 overflow-y-auto p-1.5 space-y-1 bg-stone-950/60">
            <div className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Dedicated Data & Asset Folders ({displayFolders.length})
            </div>
            {displayFolders.map((folder) => {
              const isSelected = folder.category === activeFolder.category;
              const isDescriptionQueue = folder.category === 'asset_descriptions';
              return (
                <button
                  type="button"
                  key={folder.category}
                  data-testid={`folder-tab-${folder.category}`}
                  onClick={() => setSelectedCategory(folder.category)}
                  className={`w-full text-left p-2 rounded border transition flex items-start justify-between gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 text-amber-100 shadow-sm'
                      : isDescriptionQueue
                        ? 'bg-emerald-950/35 hover:bg-emerald-900/40 border-emerald-600/40 text-emerald-200'
                        : 'bg-stone-900/80 hover:bg-stone-800/80 border-stone-800 text-stone-300'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-bold text-[11px] truncate flex items-center gap-1">
                      <span>{isDescriptionQueue ? '🖼️' : '📁'}</span>
                      <span>{folder.relativePath}/</span>
                    </div>
                    <div className="text-[10px] text-stone-400 truncate mt-0.5">{folder.label}</div>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                      folder.fileCount > 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {folder.fileCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Column: Active Dedicated Folder Details & Saved Files */}
          <div className="col-span-7 min-w-0 flex flex-col min-h-0 overflow-y-auto bg-stone-900/40">
            <div className="p-2.5 border-b border-stone-800 bg-stone-900/80 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-amber-300 font-mono truncate">
                    ./{LOCAL_WORKSPACE_ROOT_NAME}/{activeFolder.relativePath}/
                  </div>
                  <div className="text-[11px] font-semibold text-stone-200 mt-0.5 truncate">
                    {activeFolder.label} ({activeFolder.dataTypeLabel})
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="quick-save-folder-item-btn"
                  onClick={() => onQuickSaveCategorySample(activeFolder.category)}
                  className="px-2.5 py-1 rounded bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/70 text-emerald-200 text-[10px] font-bold shrink-0 transition"
                  title={`Immediately save the current/newly added ${activeFolder.dataTypeLabel} into ./${LOCAL_WORKSPACE_ROOT_NAME}/${activeFolder.relativePath}/`}
                >
                  + Save Current Item to Folder
                </button>
              </div>
              <div className="text-[10px] text-stone-400 mt-1">{activeFolder.description}</div>
              <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-sky-300 bg-sky-950/40 border border-sky-500/30 rounded px-2 py-0.5">
                <span className="truncate">Auto-Saves On: {activeFolder.autoSavesOn}</span>
                <span className="shrink-0 ml-2">*{activeFolder.extension}</span>
              </div>
            </div>

            {/* Dedicated Workbench when viewing assets/image_descriptions_import/ */}
            {activeFolder.category === 'asset_descriptions' && (
              <div className="p-2.5 border-b border-amber-500/30 bg-stone-950/90 space-y-2 shrink-0 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-200 font-mono text-[9px] font-bold">
                      1. {AI_MODEL_REGISTRY.description_to_image.modelId}
                    </span>
                    <span className="text-stone-500">→</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-400/50 text-purple-200 font-mono text-[9px] font-bold">
                      2. Alpha-Matte RGBA(0,0,0,0)
                    </span>
                    <span className="text-stone-500">→</span>
                    <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-sky-200 font-mono text-[9px] font-bold">
                      3. {AI_MODEL_REGISTRY.meshy_image_to_3d.modelId}
                    </span>
                    <span className="text-stone-500">→</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 font-mono text-[9px] font-bold">
                      4. Game Catalog
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      data-testid="toggle-asset-import-instructions-btn"
                      onClick={() => setShowInstructionSetModal((v) => !v)}
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-200 text-[10px] font-bold"
                      title="Inspect the active Asset Import Agent System Instruction Set (Mandatory Low-Poly Enforcer + Late 70s / Early 80s Thriller Mystery)"
                    >
                      {showInstructionSetModal ? '▾ Hide Agent Instructions' : '📜 Agent Instruction Set'}
                    </button>
                    <button
                      type="button"
                      onClick={() => descriptionUploadInputRef.current?.click()}
                      className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-600 text-amber-200 text-[10px] font-semibold"
                      title="Upload a .txt, .md, or .json file containing detailed image descriptions of assets from your computer"
                    >
                      📂 Upload (.txt/.md/.json)
                    </button>
                  </div>
                </div>

                {showInstructionSetModal && (
                  <div
                    data-testid="asset-import-instruction-set-panel"
                    className="p-2 rounded bg-stone-900 border border-amber-500/50 space-y-1 min-w-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-bold text-amber-300">
                      <span>ACTIVE ASSET IMPORT AGENT INSTRUCTION SET</span>
                      <span className="font-mono text-[9px] text-emerald-300">
                        Diffuse White BG • Orthographic • Late-70s Thriller
                      </span>
                    </div>
                    <pre className="max-h-28 overflow-y-auto overflow-x-hidden break-words whitespace-pre-wrap font-mono text-[9px] text-stone-300 bg-stone-950 p-1.5 rounded border border-stone-800">
                      {ASSET_IMPORT_AGENT_INSTRUCTION_SET}
                    </pre>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-stone-400 font-mono shrink-0">File in Folder:</span>
                  <input
                    type="text"
                    value={descriptionFilename}
                    onChange={(e) => setDescriptionFilename(e.target.value)}
                    className="flex-1 bg-stone-900 border border-stone-700 rounded px-2 py-0.5 text-[10px] font-mono text-amber-200"
                    placeholder="my_hotel_assets.descriptions.txt"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onSaveDescriptionFile &&
                      onSaveDescriptionFile(descriptionFilename, descriptionContent)
                    }
                    className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-[10px] font-semibold shrink-0"
                  >
                    💾 Save File to Folder
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={descriptionContent}
                  onChange={(e) => setDescriptionContent(e.target.value)}
                  className="w-full bg-stone-900/90 border border-stone-700 rounded p-1.5 text-[10px] font-mono text-stone-200 focus:outline-none focus:border-amber-400"
                  placeholder="Place detailed asset image descriptions here (separated by --- or ### Title: prompt)..."
                />

                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] text-stone-400">
                    Drop any <code className="text-amber-300">.txt</code>,{' '}
                    <code className="text-amber-300">.md</code>, or{' '}
                    <code className="text-amber-300">.json</code> file into{' '}
                    <code className="text-amber-300">assets/image_descriptions_import/</code>
                  </span>
                  <button
                    type="button"
                    data-testid="run-batch-description-import-btn"
                    disabled={batchImportBusy}
                    onClick={() =>
                      onRunBatchDescriptionImport &&
                      onRunBatchDescriptionImport(descriptionFilename, descriptionContent)
                    }
                    className="w-full px-3 py-1.5 rounded bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 disabled:opacity-50 text-stone-950 font-extrabold text-[10px] shadow-sm transition text-center"
                  >
                    {batchImportBusy
                      ? '⏳ Generating Images (Flash-Lite) → Alpha-Matte → Meshy 3D → Importing...'
                      : '⚡ Convert Descriptions → Images (Flash-Lite) → Alpha-Matte → Meshy 3D → Catalog'}
                  </button>
                </div>

                {lastBatchImportSummary.length > 0 && (
                  <div
                    data-testid="batch-import-results-strip"
                    className="pt-1.5 border-t border-stone-800 space-y-1"
                  >
                    <div className="text-[10px] font-bold text-emerald-300 flex items-center justify-between">
                      <span>
                        ✓ Imported {lastBatchImportSummary.length} Assets into Build Mode Catalog:
                      </span>
                      <span className="text-[9px] font-mono text-stone-400">
                        gemini-3.1-flash-lite-image → meshy-4-image-to-3d
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto">
                      {lastBatchImportSummary.map((item, idx) => (
                        <div
                          key={`${item.name}_${idx}`}
                          className="flex items-center gap-1.5 p-1 rounded bg-stone-900 border border-emerald-500/30"
                        >
                          <img
                            src={item.referenceImageUrl}
                            alt={item.name}
                            className="w-8 h-8 rounded object-cover border border-amber-500/40 shrink-0 bg-stone-950"
                          />
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold text-amber-200 truncate">
                              {item.name}
                            </div>
                            <div className="text-[9px] font-mono text-emerald-300 truncate">
                              {item.alphaMatted !== false ? '✓ Alpha-Matted → ' : ''}
                              {item.meshyModelUsed} → Catalog
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Saved Files List in Active Folder */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {activeFolder.files.length === 0 ? (
                <div className="p-4 text-center text-stone-400 border border-dashed border-stone-700 rounded">
                  No files in <span className="font-mono">{activeFolder.relativePath}/</span> yet.
                  Click <strong>+ Save Current Item to Folder</strong> above or add a new asset in the
                  studio to save directly here.
                </div>
              ) : (
                activeFolder.files.map((file) => (
                  <div
                    key={file.filename}
                    className="p-2 rounded bg-stone-950/80 border border-stone-800 hover:border-amber-500/40 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-semibold text-[11px] text-amber-200 truncate">
                        {file.filename}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {(file.sizeBytes / 1024).toFixed(1)} KB • Saved{' '}
                        {new Date(file.updatedAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {activeFolder.category === 'asset_descriptions' &&
                        onRunBatchDescriptionImport && (
                          <button
                            type="button"
                            disabled={batchImportBusy}
                            onClick={() => onRunBatchDescriptionImport(file.filename)}
                            className="px-2 py-1 rounded bg-emerald-500/25 hover:bg-emerald-500/40 border border-emerald-400/70 text-emerald-200 text-[10px] font-bold"
                            title="Read this description file, generate reference images with gemini-3.1-flash-lite-image, pass to Meshy.ai Image-to-3D, and import all created 3D assets into the game catalog"
                          >
                            ⚡ Image → Meshy 3D → Catalog
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={() => onLoadFileFromFolder(activeFolder.category, file.filename)}
                        className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/60 text-amber-200 text-[10px] font-bold"
                        title="Load this file from its dedicated folder directly into the studio"
                      >
                        Load into Studio
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </StudioWindowFrame>
  );
};

