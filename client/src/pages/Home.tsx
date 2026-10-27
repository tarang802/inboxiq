export default function Home() {
  return (
    <section className="py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Take back your inbox</h1>
      <p className="mx-auto mt-4 max-w-xl text-slate-600">
        See who fills your inbox, unsubscribe in one click, and keep only what matters. We only read
        email headers, never your messages.
      </p>
      <a
        href="/api/auth/google"
        className="mt-8 inline-block rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700"
      >
        Connect Gmail
      </a>
    </section>
  );
}
