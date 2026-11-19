import React, { useState, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Sparkles,
  Check,
  Tag,
  FolderOpen,
  ArrowRight,
} from 'lucide-react';
import type { MarginRecord, RecordType, Space, RecordAuthor } from '../types/margin';
import { extractRecordFromText } from '../services/marginAI';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRecord: (record: MarginRecord) => Promise<void>;
  spaces: Space[];
  activeSpaceId?: string;
  currentUser: RecordAuthor;
}

export const CaptureModal: React.FC<CaptureModalProps> = ({
  isOpen,
  onClose,
  onSaveRecord,
  spaces,
  activeSpaceId,
  currentUser,
}) => {
  const [text, setText] = useState('');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(activeSpaceId || spaces[0]?.id || '');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechSupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  });

  // Structured record preview state
  const [recordType, setRecordType] = useState<RecordType>('observation');
  const [recordTitle, setRecordTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [inferenceModeUsed, setInferenceModeUsed] = useState<string>('hybrid');

  const recognitionRef = useRef<any>(null);

  const toggleVoiceRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setText(currentTranscript);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsListening(true);
      } catch (e) {
        console.warn('Voice recognition error:', e);
        setIsListening(false);
      }
    }
  };

  const handleProcessContext = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);

    try {
      const spaceObj = spaces.find((s) => s.id === selectedSpaceId);
      const extracted = await extractRecordFromText(text, spaceObj?.name);

      setRecordType(extracted.type);
      setRecordTitle(extracted.title);
      setTagsInput(extracted.tags.join(', '));
      setInferenceModeUsed(extracted.inferenceMode);
      setIsPreviewReady(true);
    } catch (e) {
      console.warn('Extraction fallback:', e);
      setRecordType('observation');
      setRecordTitle(text.substring(0, 60));
      setTagsInput('context');
      setIsPreviewReady(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!text.trim() || !recordTitle.trim()) return;

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const newRecord: MarginRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      spaceId: selectedSpaceId || spaces[0]?.id || 'space-general',
      type: recordType,
      title: recordTitle,
      content: text,
      status: 'active',
      author: currentUser,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      source: isListening ? 'voice' : isPreviewReady ? 'ai_suggested' : 'user',
      supportingRecordIds: [],
      tags: parsedTags.length > 0 ? parsedTags : [recordType],
      version: 1,
      aiMetadata: isPreviewReady
        ? {
            inferenceMode: inferenceModeUsed as any,
            extractedAt: Date.now(),
          }
        : undefined,
    };

    await onSaveRecord(newRecord);

    // Reset modal
    setText('');
    setRecordTitle('');
    setTagsInput('');
    setIsPreviewReady(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252620]/40 backdrop-blur-xs">
      <div
        className="w-full max-w-xl bg-[#FFFFFF] rounded-xl border border-[#E5E3DA] shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E3DA] bg-[#F6F5F0]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#657C69]" />
            <h2 id="capture-title" className="font-serif text-lg font-medium text-[#252620]">
              Capture Context
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#77766E] hover:text-[#252620] p-1 rounded-md transition-colors"
            aria-label="Close capture modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Destination Space Selector */}
          <div className="flex items-center justify-between text-xs text-[#77766E]">
            <label htmlFor="space-select" className="font-medium flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-[#657C69]" />
              Destination Space:
            </label>
            <select
              id="space-select"
              value={selectedSpaceId}
              onChange={(e) => setSelectedSpaceId(e.target.value)}
              className="bg-[#EFEEE8] border border-[#E5E3DA] text-[#252620] px-2.5 py-1 rounded-md text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-[#657C69]"
            >
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.type})
                </option>
              ))}
            </select>
          </div>

          {/* Raw Text Input */}
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What did you observe, decide, or discover? Paste telemetry, notes, or raw context..."
              rows={4}
              className="w-full p-3.5 bg-[#F6F5F0] border border-[#E5E3DA] rounded-lg text-sm text-[#252620] placeholder-[#77766E]/70 focus:outline-hidden focus:ring-1 focus:ring-[#657C69] resize-none font-sans"
              autoFocus
            />

            {/* Voice dictate button */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={`absolute right-3 bottom-3 p-1.5 rounded-full text-xs transition-colors ${
                  isListening
                    ? 'bg-[#B87A4D] text-white animate-pulse'
                    : 'bg-[#EFEEE8] text-[#77766E] hover:text-[#252620] hover:bg-[#E5E3DA]'
                }`}
                title={isListening ? 'Stop voice recording' : 'Dictate with voice'}
                aria-label="Voice input"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Living Context AI Extractor CTA */}
          {!isPreviewReady && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#77766E]">
                Living Context Engine extracts record type, headline, and entity tags.
              </span>
              <button
                type="button"
                onClick={handleProcessContext}
                disabled={!text.trim() || isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#E8EEE7] text-[#252620] border border-[#C8D6C9] hover:bg-[#D9E4D8] transition-colors text-xs font-medium disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#657C69]" />
                <span>{isProcessing ? 'Structuring Context...' : 'Structure Context'}</span>
              </button>
            </div>
          )}

          {/* Living Context Structured Record Preview */}
          {isPreviewReady && (
            <div className="bg-[#EFEEE8] p-4 rounded-lg border border-[#E5E3DA] space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#252620] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#657C69]" />
                  Living Context Record
                </span>
                <span className="text-[10px] text-[#77766E] font-mono">
                  Mode: {inferenceModeUsed}
                </span>
              </div>

              {/* Record Type Selector */}
              <div>
                <label className="text-[11px] font-medium text-[#77766E] block mb-1">
                  Classified Record Type:
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['observation', 'decision', 'event', 'hypothesis', 'action'] as RecordType[]).map(
                    (t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRecordType(t)}
                        className={`px-2 py-1 rounded text-[11px] font-medium capitalize text-center transition-all ${
                          recordType === t
                            ? 'bg-[#252620] text-[#F6F5F0] shadow-xs'
                            : 'bg-[#FFFFFF] text-[#56554D] border border-[#E5E3DA] hover:bg-[#E5E3DA]'
                        }`}
                      >
                        {t}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Record Title */}
              <div>
                <label className="text-[11px] font-medium text-[#77766E] block mb-1">
                  Record Headline:
                </label>
                <input
                  type="text"
                  value={recordTitle}
                  onChange={(e) => setRecordTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E3DA] rounded-md text-xs text-[#252620] font-medium focus:outline-hidden focus:ring-1 focus:ring-[#657C69]"
                />
              </div>

              {/* Tags Input */}
              <div>
                <label className="text-[11px] font-medium text-[#77766E] block mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Tags (comma separated):
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E3DA] rounded-md text-xs text-[#252620] focus:outline-hidden focus:ring-1 focus:ring-[#657C69]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#E5E3DA] bg-[#F6F5F0]">
          <span className="text-[11px] text-[#77766E]">Preserved locally in IndexedDB first.</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-[#77766E] hover:text-[#252620] hover:bg-[#E5E3DA] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={isPreviewReady ? handleSave : handleProcessContext}
              disabled={!text.trim() || isProcessing}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#252620] text-[#F6F5F0] hover:bg-[#3D3E35] text-xs font-medium tracking-wide transition-colors disabled:opacity-50 active:scale-95 shadow-xs"
            >
              {isPreviewReady ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#A8BBAA]" />
                  <span>Save Record</span>
                </>
              ) : (
                <>
                  <span>Structure & Save</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
