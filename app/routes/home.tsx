/**
 * Home page route.
 */
export default function Home() {
  return (
    <section className="page-content col-span-full grid items-center">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-heading font-bold sm:text-3xl md:text-4xl dark:text-slate-300">
          👋 Hi, I'm Josiah
        </h1>
        <p className="text-gray-500 dark:text-slate-300 lg:text-lg">
          I'm a multi-disciplinary developer and marketing manager based in the Canadian Prairies. I currently lead the
          marketing team at{' '}
          <a href="https://leisurevans.com/">
            Leisure Travel Vans
          </a>
          .
        </p>
      </div>
    </section>
  )
}
