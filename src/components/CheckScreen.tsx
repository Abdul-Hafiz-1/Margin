import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  Clipboard,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  Check,
  Loader2,
} from 'lucide-react';
import type { AppLanguage, SampleMessage } from '../types';
import { TRANSLATIONS } from '../data/i18n';
import { SAMPLE_MESSAGES } from '../data/samples';
import { extractTextFromImage } from '../services/ocrService';

interface CheckScreenProps {
  inputText: string;
  onInputChange: (text: string) => void;
  onRunCheck: (text: string, source: 'text' | 'screenshot') => void;
  isScanning: boolean;
  language: AppLanguage;
}

export const CheckScreen: React.FC<CheckScreenProps> = ({
  inputText,
  onInputChange,
  onRunCheck,
  isScanning,
  language,
}) => {
  const t = TRANSLATIONS[language];
  const [isDragging, setIsDragging] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sampleTab, setSampleTab] = useState<'all' | 'scam' | 'legitimate'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a PNG or JPEG screenshot.');
      return;
    }
    try {
      setOcrStatus('Starting on-device OCR...');
      setOcrProgress(15);
      const text = await extractTextFromImage(file, (progress, status) => {
        setOcrProgress(progress);
        setOcrStatus(status);
      });
      setOcrStatus(null);
      if (text) {
        onInputChange(text);
        onRunCheck(text, 'screenshot');
      } else {
        alert('No text detected in screenshot. Please try pasting the message directly.');
      }
    } catch (err: any) {
      setOcrStatus(null);
      alert(err.message || 'Failed to read image.');
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processImageFile(e.target.files[0]);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onInputChange(text);
      }
    } catch {
      // Browser permissions fallback
    }
  };

  const handleSelectSample = (sample: SampleMessage) => {
    onInputChange(sample.text);
    setCopiedId(sample.id);
    setTimeout(() => setCopiedId(null), 1500);
    onRunCheck(sample.text, 'text');
  };

  const filteredSamples = SAMPLE_MESSAGES.filter((s) => {
    if (sampleTab === 'all') return true;
    return s.category === sampleTab;
  });

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <div className="rounded-2xl bg-[#0f172a] border border-slate-800 p-4 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <label htmlFor="message-input" className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>{t.pastePrompt}</span>
          </label>
          <div className="flex items-center gap-2 text-xs">
            {inputText && (
              <button
                onClick={() => onInputChange('')}
                className="flex items-center gap-1 text-slate-400 hover:text-red-400 transition-colors px-2 py-1"
                title="Clear input"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
            <button
              onClick={handlePasteClipboard}
              className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 px-2.5 py-1 rounded-md transition-colors"
            >
              <Clipboard className="w-3.5 h-3.5 text-blue-400" />
              <span>Paste</span>
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            id="message-input"
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && inputText.trim()) {
                onRunCheck(inputText, 'text');
              }
            }}
            rows={5}
            placeholder={t.pastePlaceholder}
            className="w-full bg-[#090d16] border border-slate-700/80 rounded-xl p-3.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm sm:text-base resize-y leading-relaxed font-sans transition-colors"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 px-1">
            <span>Press Ctrl+Enter to check immediately</span>
            <span>{inputText.length} characters</span>
          </div>
        </div>

        {/* Screenshot Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/30'
          }`}
          role="button"
          tabIndex={0}
          aria-label="Upload screenshot"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept="image/png, image/jpeg"
            className="hidden"
          />
          {ocrStatus ? (
            <div className="flex flex-col items-center justify-center gap-2 py-1">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <p className="text-xs text-blue-300 font-medium">{ocrStatus}</p>
              <div className="w-48 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-full transition-all duration-200" style={{ width: `${ocrProgress}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-slate-400 py-1">
              <UploadCloud className="w-5 h-5 text-blue-400 shrink-0" />
              <div className="text-center sm:text-left">
                <p className="text-xs font-medium text-slate-300">{t.dropScreenshot}</p>
                <p className="text-[11px] text-slate-500">{t.dropScreenshotHint}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-5">
          <button
            onClick={() => inputText.trim() && onRunCheck(inputText, 'text')}
            disabled={!inputText.trim() || isScanning}
            className={`w-full py-3.5 px-6 rounded-xl font-semibold text-base flex items-center justify-center gap-2.5 shadow-lg transition-all ${
              !inputText.trim() || isScanning
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25 active:scale-[0.99] border border-blue-400/40'
            }`}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t.checking}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>{t.checkButton}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Try a Sample Gallery */}
      <div className="rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{t.trySampleHeading}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any realistic example to test Wary in 10 seconds.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs self-end sm:self-auto">
            <button
              onClick={() => setSampleTab('all')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                sampleTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All (12)
            </button>
            <button
              onClick={() => setSampleTab('scam')}
              className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
                sampleTab === 'scam' ? 'bg-red-600/30 text-red-300 border border-red-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3 h-3 text-red-400" />
              <span>Scams (8)</span>
            </button>
            <button
              onClick={() => setSampleTab('legitimate')}
              className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
                sampleTab === 'legitimate' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Legitimate (4)</span>
            </button>
          </div>
        </div>

        {/* Sample Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredSamples.map((sample) => (
            <div
              key={sample.id}
              onClick={() => handleSelectSample(sample)}
              className="group text-left p-3.5 rounded-xl bg-[#090d16]/80 hover:bg-[#131e36] border border-slate-800 hover:border-blue-500/40 cursor-pointer transition-all flex flex-col justify-between"
              role="button"
              tabIndex={0}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-blue-300 transition-colors flex items-center gap-1.5">
                    {sample.category === 'scam' ? (
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                    {sample.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {sample.language.toUpperCase()}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        sample.category === 'scam'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {sample.category === 'scam' ? 'Scam' : 'Safe'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-sans">
                  "{sample.text}"
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span className="italic">{sample.hint}</span>
                <span className="text-blue-400 group-hover:underline flex items-center gap-1 font-medium">
                  {copiedId === sample.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Tested!</span>
                    </>
                  ) : (
                    <span>Test now →</span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
