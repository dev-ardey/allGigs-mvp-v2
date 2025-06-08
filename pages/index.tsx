import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-4xl font-bold mb-4">Welcome to the Freelance Job Board!</h1>
      <p className="text-lg text-gray-600 mb-8">Find your next opportunity or post a job.</p>
      <Link href="/jobs">
        <span className="px-6 py-3 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition">
          View Jobs
        </span>
      </Link>
    </main>
  );
}