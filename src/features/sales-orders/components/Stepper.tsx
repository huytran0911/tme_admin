"use client";

import { CheckIcon } from "@heroicons/react/24/solid";

export type Step = {
  id: number;
  name: string;
  description?: string;
};

type StepperProps = {
  steps: Step[];
  currentStep: number;
};

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      {/* Desktop stepper */}
      <div className="hidden sm:block">
        <div className="mx-auto max-w-3xl">
          {/* Progress bar background */}
          <div className="relative">
            {/* Background line */}
            <div className="absolute top-5 left-0 h-1 w-full rounded-full bg-slate-200" />

            {/* Progress line */}
            <div
              className="absolute top-5 left-0 h-1 rounded-full bg-linear-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
              style={{
                width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
              }}
            />

            {/* Steps */}
            <ol className="relative flex justify-between">
              {steps.map((step) => {
                const isCompleted = step.id < currentStep;
                const isCurrent = step.id === currentStep;

                return (
                  <li key={step.id} className="flex flex-col items-center">
                    {/* Circle */}
                    <div
                      className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 transition-all duration-300 ${
                        isCompleted
                          ? "border-emerald-500 bg-emerald-500 shadow-lg shadow-emerald-500/30"
                          : isCurrent
                            ? "border-emerald-500 bg-white shadow-lg shadow-emerald-500/20"
                            : "border-slate-200 bg-white"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckIcon className="h-5 w-5 text-white" />
                      ) : (
                        <span
                          className={`text-sm font-bold ${
                            isCurrent ? "text-emerald-500" : "text-slate-400"
                          }`}
                        >
                          {step.id}
                        </span>
                      )}
                    </div>

                    {/* Label */}
                    <div className="mt-3 text-center">
                      <p
                        className={`text-sm font-semibold transition-colors ${
                          isCompleted || isCurrent
                            ? "text-slate-800"
                            : "text-slate-400"
                        }`}
                      >
                        {step.name}
                      </p>
                      {step.description && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {step.description}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>

      {/* Mobile stepper - compact pills */}
      <div className="sm:hidden">
        <div className="flex items-center justify-center gap-2">
          {steps.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;

            return (
              <div key={step.id} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                        ? "bg-emerald-50 text-emerald-600 ring-2 ring-emerald-500"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <CheckIcon className="h-3.5 w-3.5" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                  <span className={isCurrent ? "" : "hidden"}>
                    {step.name}
                  </span>
                </div>
                {step.id < steps.length && (
                  <div
                    className={`h-0.5 w-4 rounded ${
                      isCompleted ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        {/* Current step name on mobile */}
        <p className="mt-3 text-center text-sm font-medium text-slate-700">
          {steps.find((s) => s.id === currentStep)?.name}
        </p>
      </div>
    </nav>
  );
}
