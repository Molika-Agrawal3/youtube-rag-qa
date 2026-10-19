import AuthButton from "@/components/AuthButton";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">YouTube RAG Q&amp;A</h1>
      <p className="max-w-md text-zinc-400">
        Ask questions about any YouTube video and get timestamped answers.
      </p>
      <AuthButton />
    </main>
  );
}
