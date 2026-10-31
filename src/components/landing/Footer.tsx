import { Wordmark } from "./Brand";

export default function Footer() {
  return (
    <footer className="mx-auto w-full max-w-[1360px] px-4 pb-10 md:px-10">
      <div className="flex flex-col gap-5 border-t-[1.5px] border-kohl/40 pt-7 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <Wordmark />
        <p>Powered by Gemini Flash (handwriting) and the Gemini Live API (voice).</p>
        <p>Built for hackCBS 9.0</p>
      </div>
    </footer>
  );
}
