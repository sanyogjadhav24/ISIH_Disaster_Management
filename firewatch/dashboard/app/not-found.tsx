import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090d16] text-white font-mono p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-400 mb-2">404 - Not Found</h2>
        <p className="text-slate-400 text-sm mb-4">The requested mesh resource could not be found.</p>
        <Link href="/" className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-xs uppercase hover:bg-cyan-500">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
