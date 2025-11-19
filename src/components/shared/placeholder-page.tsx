import type { ReactNode } from "react";

type PlaceholderPageProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PlaceholderPage({
  title,
  description,
  actions,
}: PlaceholderPageProps) {
  return (
    <main className="flex min-h-[60vh] flex-col gap-6 px-8 py-16">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-neutral-600">{description}</p>
        ) : null}
      </div>
      {actions}
    </main>
  );
}

