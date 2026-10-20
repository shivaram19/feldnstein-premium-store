import Reveal from './Reveal'

export default function CreedSection() {
  return (
    <section
      aria-label="Our creed"
      className="relative overflow-hidden bg-brand-forestDark py-20 text-white sm:py-28 lg:py-36"
    >
      {/* Subtle top and bottom borders */}
      <div className="absolute inset-x-0 top-0 h-px bg-white/10"></div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-white/10"></div>

      {/* Subtle background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-brand-ochre/[0.05] blur-3xl"
      ></div>

      <Reveal className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        {/* Section label */}
        <div className="mb-10 flex items-center justify-center gap-4 sm:mb-14">
          <span className="h-px w-10 bg-brand-ochre/70 sm:w-16"></span>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-ochre sm:text-sm">
            Our philosophy
          </p>
          <span className="h-px w-10 bg-brand-ochre/70 sm:w-16"></span>
        </div>

        {/* Main manifesto */}
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 sm:gap-10 md:grid-cols-[0.95fr_1.35fr] md:gap-12 lg:gap-16">
          {/* Outlined NO */}
          <div className="flex justify-center md:justify-end">
            <svg
              className="w-full max-w-[340px] overflow-visible sm:max-w-[440px] lg:max-w-[520px]"
              viewBox="0 0 500 250"
              role="img"
              aria-labelledby="creed-no-title"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title id="creed-no-title">NO</title>

              {/* Outer gold outline */}
              <text
                x="250"
                y="202"
                textAnchor="middle"
                fontFamily="Georgia, 'Times New Roman', serif"
                fontSize="226"
                fontWeight="700"
                letterSpacing="-13"
                fill="none"
                stroke="#C99A24"
                strokeWidth="2.5"
                paintOrder="stroke"
              >NO</text>

              {/* Inner outline */}
              <text
                x="250"
                y="202"
                textAnchor="middle"
                fontFamily="Georgia, 'Times New Roman', serif"
                fontSize="226"
                fontWeight="700"
                letterSpacing="-13"
                fill="none"
                stroke="#C99A24"
                strokeWidth="1"
                transform="translate(0 0)"
              >NO</text>
            </svg>
          </div>

          {/* Strong, readable statements */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-ochre sm:text-xs">
              A different way of making oil
            </p>

            <h2 className="font-sans text-4xl font-extrabold uppercase leading-[0.98] tracking-[-0.045em] sm:text-5xl lg:text-6xl xl:text-7xl">
              <span className="block">Heat.</span>
              <span className="block">Chemicals.</span>
              <span className="block">Plastic.</span>
              <span className="block">Machines.</span>
            </h2>
          </div>
        </div>

        {/* Gold divider with botanical accent */}
        <div className="mx-auto mt-12 flex max-w-5xl items-center gap-4 sm:mt-16 sm:gap-6">
          <span className="h-px flex-1 bg-brand-ochre/80"></span>

          <svg
            aria-hidden="true"
            className="h-7 w-7 shrink-0 text-brand-ochre sm:h-9 sm:w-9"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 34V15M20 25C10 25 6 18 6 10C15 10 20 15 20 25ZM20 20C20 10 25 5 34 5C34 14 29 20 20 20Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <span className="h-px flex-1 bg-brand-ochre/80"></span>
        </div>

        {/* Tagline */}
        <p className="mt-8 text-center font-serif text-3xl italic leading-tight text-brand-ochre sm:mt-10 sm:text-5xl lg:text-6xl">
          Time &amp; patience. Naturally.
        </p>

        {/* Supporting copy */}
        <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-7 text-white/75 sm:mt-6 sm:text-base sm:leading-8 lg:text-lg">
          Every batch rests a full 48 hours before it reaches your kitchen.
          Nothing is rushed, because nothing needs to be.
        </p>
      </Reveal>
    </section>
  )
}
