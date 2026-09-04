"use client";
import { useId, useRef, useState, useTransition } from "react";
import { uploadImage } from "@/lib/admin/uploads";

type Props = {
  folder: "screenshots" | "featured" | "avatars";
  onUploaded: (url: string) => void;
  label?: string;
  multiple?: boolean;
  className?: string;
};

/** File picker that uploads via the shared server action and hands back the public URL. */
export function ImageUpload({ folder, onUploaded, label = "Upload image", multiple = false, className = "" }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const list = Array.from(files);
    startTransition(async () => {
      for (const file of list) {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("folder", folder);
        const res = await uploadImage(fd);
        if (res.ok && res.data) onUploaded(res.data.url);
        else setError(res.message ?? "Upload failed");
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={`inline-flex h-9 cursor-pointer items-center rounded-md border border-dashed border-zinc-300 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50 ${pending ? "opacity-60" : ""}`}
      >
        {pending ? "Uploading…" : label}
      </label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple={multiple}
        className="sr-only"
        disabled={pending}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
