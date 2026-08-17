import { useState } from "react";
import { API } from "../lib/api";

export interface UploadedScreenshot {
  url: string;
  tempId: string;
}

interface ScreenshotUploaderProps {
  screenshots: UploadedScreenshot[];
  onScreenshotsChange: (screenshots: UploadedScreenshot[]) => void;
}

export function ScreenshotUploader({ screenshots, onScreenshotsChange }: ScreenshotUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setError(null);

    let current = screenshots;
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const { data } = await API.post("/bets/upload-screenshot", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const newScreenshot: UploadedScreenshot = { url: data.url, tempId: data.tempId };
        current = [...current, newScreenshot];
        onScreenshotsChange(current);
      } catch {
        setError("Falha ao enviar uma ou mais imagens");
      }
    }

    setLoading(false);
    event.currentTarget.value = "";
  };

  const removeScreenshot = (tempId: string) => {
    onScreenshotsChange(screenshots.filter((s) => s.tempId !== tempId));
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-gray-700">Screenshots da aposta</span>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          disabled={loading}
          className="mt-2 block w-full text-sm"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Enviando...</p>}

      {screenshots.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {screenshots.map((ss) => (
            <div key={ss.tempId} className="relative">
              <img src={ss.url} alt="Screenshot" className="h-24 w-full rounded object-cover" />
              <button
                type="button"
                onClick={() => removeScreenshot(ss.tempId)}
                className="absolute right-1 top-1 rounded bg-red-500 px-1.5 py-0.5 text-xs text-white hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
