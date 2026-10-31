import React, { useRef } from 'react';
import {
  ArchitectForgeProjectSnapshot,
  StudioWindowId,
  StudioWindowState,
  getTimeOfDayInfo
} from '../game/rules';
import { StudioWindowFrame } from './StudioWindowFrame';

interface ProjectSaveLoadWindowProps {
  windowState: StudioWindowState;
  onFocus: (id: StudioWindowId) => void;
  onMove: (id: StudioWindowId, nextX: number, nextY: number) => void;
  onResize: (id: StudioWindowId, nextW: number, nextH: number) => void;
  onToggleMinimize: (id: StudioWindowId) => void;
  onToggleMaximize: (id: StudioWindowId) => void;
  onClose: (id: StudioWindowId) => void;
  projectName: string;
  projectDescription: string;
  onChangeProjectName: (name: string) => void;
  onChangeProjectDescription: (desc: string) => void;
  activeStats: {
    floorsCount: number;
    assetsCount: number;
    blueprintsCount: number;
    charactersCount: number;
    gameTimeMinutes: number;
  };
  savedProjects: ArchitectForgeProjectSnapshot[];
  activeProjectId: string | null;
  onSaveNewProjectSlot: () => void;
  onOverwriteProjectSlot: (slotId: string) => void;
  onLoadProjectSlot: (project: ArchitectForgeProjectSnapshot) => void;
  onDeleteProjectSlot: (slotId: string) => void;
  onExportProjectFile: (project?: ArchitectForgeProjectSnapshot) => void;
  onImportProjectJsonText: (jsonText: string, filename: string) => void;
}

export const ProjectSaveLoadWindow: React.FC<ProjectSaveLoadWindowProps> = ({
  windowState,
  onFocus,
  onMove,
  onResize,
  onToggleMinimize,
  onToggleMaximize,
  onClose,
  projectName,
  projectDescription,
  onChangeProjectName,
  onChangeProjectDescription,
  activeStats,
  savedProjects,
  activeProjectId,
  onSaveNewProjectSlot,
  onOverwriteProjectSlot,
  onLoadProjectSlot,
  onDeleteProjectSlot,
  onExportProjectFile,
  onImportProjectJsonText
}) => {
  const projectFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onImportProjectJsonText(String(reader.result || ''), file.name);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const activeClock = getTimeOfDayInfo(activeStats.gameTimeMinutes);

  return (
    <StudioWindowFrame
      windowState={windowState}
      badgeText={`${savedProjects.length} Saved`}
      onFocus={onFocus}
      onMove={onMove}
      onResize={onResize}
      onToggleMinimize={onToggleMinimize}
      onToggleMaximize={onToggleMaximize}
      onClose={onClose}
    >
      <div className="flex flex-col gap-2">
        <input
          ref={projectFileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* 1. Save Active Workspace as Entire Project */}
        <div className="bg-gradient-to-br from-[#f0f9ff] to-[#ecfdf5] border border-[#bae6fd] rounded-2xl p-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0369a1]">
              Save Entire Studio Project
            </span>
            <span className="text-[10px] font-bold text-[#059669] bg-white/80 px-2 py-0.5 rounded-full border border-[#a7f3d0]">
              {activeStats.floorsCount} Floors · {activeStats.assetsCount} Objs · {activeStats.charactersCount} Rigs
            </span>
          </div>

          <input
            type="text"
            aria-label="Project Name"
            placeholder="Project Name (e.g. Grand Boutique Hotel Suite)"
            value={projectName}
            onChange={(e) => onChangeProjectName(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-full px-3 py-1 text-xs font-bold text-slate-800"
          />

          <input
            type="text"
            aria-label="Project Description"
            placeholder="Notes (floors, rooms, AI characters, lighting clock...)"
            value={projectDescription}
            onChange={(e) => onChangeProjectDescription(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-full px-3 py-1 text-[11px] text-slate-600"
          />

          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <button
              type="button"
              data-testid="save-project-slot-btn"
              onClick={onSaveNewProjectSlot}
              className="flex-1 py-1.5 px-3 rounded-full bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white text-[11px] font-extrabold shadow-xs whitespace-nowrap"
            >
              💾 Save Project Slot
            </button>
            <button
              type="button"
              onClick={() => onExportProjectFile()}
              title="Download the entire project (all floors, 3D objects, room blueprints, AI character rigs, lore & clock) as a portable .json file"
              className="py-1.5 px-2.5 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white text-[11px] font-extrabold shadow-xs whitespace-nowrap"
            >
              ⬇ Export File (.json)
            </button>
            <button
              type="button"
              onClick={() => projectFileInputRef.current?.click()}
              title="Load an entire ArchitectForge project (.json) from your computer"
              className="py-1.5 px-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-extrabold whitespace-nowrap"
            >
              📂 Load File (.json)
            </button>
          </div>
        </div>

        {/* 2. Saved Project Slots Library */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Saved Project Slots ({savedProjects.length})
          </span>
          <span className="text-[10px] text-slate-500">
            Active Clock: {activeClock.formattedTime} ({activeClock.phase})
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          {savedProjects.map((proj) => {
            const isCurrent = proj.id === activeProjectId;
            const projTime = getTimeOfDayInfo(proj.gameTimeMinutes);
            const formattedDate = (() => {
              try {
                return new Date(proj.savedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                });
              } catch {
                return 'Saved';
              }
            })();

            return (
              <div
                key={proj.id}
                className={`rounded-2xl p-2.5 border transition-all flex flex-col gap-1.5 ${
                  isCurrent
                    ? 'bg-[#f0fdf4] border-[#34d399] shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-[#38bdf8]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-slate-800 leading-tight flex items-center gap-1.5">
                      <span className="truncate">{proj.name}</span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[#10b981] text-white text-[9px] font-extrabold uppercase shrink-0">
                          Loaded
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-snug line-clamp-1 mt-0.5">
                      {proj.description}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold shrink-0">
                    {formattedDate}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1 text-[9px] font-bold text-slate-600">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100">
                    🏢 {proj.floorLayers.length} Floors
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#e0f2fe] text-[#0369a1]">
                    🧱 {proj.assets.length} Objects
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#ecfdf5] text-[#047857]">
                    📐 {proj.roomBlueprints.length} Blueprints
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
                    👤 {proj.characterRigs.length} Rigs
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800">
                    🕒 {projTime.formattedTime}
                  </span>
                </div>

                <div className="flex items-center gap-1 pt-0.5">
                  <button
                    type="button"
                    aria-label={`Load Project ${proj.name}`}
                    onClick={() => onLoadProjectSlot(proj)}
                    className="flex-1 py-1 px-2.5 rounded-full bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] hover:from-[#0284c7] hover:to-[#0369a1] text-white text-[11px] font-extrabold shadow-2xs"
                  >
                    Load Entire Project
                  </button>
                  <button
                    type="button"
                    onClick={() => onOverwriteProjectSlot(proj.id)}
                    title="Overwrite this project slot with your current studio workspace"
                    className="py-1 px-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold"
                  >
                    Overwrite
                  </button>
                  <button
                    type="button"
                    onClick={() => onExportProjectFile(proj)}
                    title="Download this project slot as a .json file"
                    className="py-1 px-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold"
                  >
                    .json
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete Project ${proj.name}`}
                    onClick={() => onDeleteProjectSlot(proj.id)}
                    title="Delete project slot"
                    className="w-6 h-6 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center shrink-0"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </StudioWindowFrame>
  );
};
