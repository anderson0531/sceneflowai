"use client";

import { useState } from 'react';

export default function TestImagePage() {
  const [prompt, setPrompt] = useState(
    'A photorealistic image of a futuristic cyberpunk city at night with neon lights and flying cars.'
  );
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [numberOfImages, setNumberOfImages] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setImages([]);

    try {
      const res = await fetch('/api/generate-image/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          options: { numberOfImages, aspectRatio }
        })
      });

      const raw = await res.text();
      let data: any = null;
      try { data = JSON.parse(raw); } catch {}
      if (!res.ok) {
        setError((data && (data.message || data.error)) || raw || 'Failed to generate image');
        return;
      }

      const urls: string[] = (data?.images || []).map((it: { dataUrl: string }) => it.dataUrl);
      if (!urls.length && data?.imageUrl) urls.push(data.imageUrl);
      setImages(urls);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Test Image Generation</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Prompt</label>
          <textarea
            className="w-full border rounded p-2 text-sm"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <div>
            <label className="block text-sm mb-1">Aspect Ratio</label>
            <input
              className="border rounded p-2 text-sm"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              placeholder="16:9"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Number of Images</label>
            <input
              type="number"
              min={1}
              max={4}
              className="border rounded p-2 text-sm w-24"
              value={numberOfImages}
              onChange={(e) => setNumberOfImages(Number(e.target.value))}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </form>

      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}

      {!!images.length && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {images.map((src, idx) => (
            <img key={idx} src={src} alt={`generated-${idx}`} className="w-full h-auto rounded border" />
          ))}
        </div>
      )}
    </div>
  );
}
