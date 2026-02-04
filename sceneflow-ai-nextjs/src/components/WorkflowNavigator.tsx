const WorkflowNavigator = ({ activeStepIndex = 0 }: { activeStepIndex?: number }) => {
  // Updated phase names: Blueprint → Production → Final Cut → Premiere
  const steps = [
    { name: "1. Blueprint" },
    { name: "2. Production" },
    { name: "3. Final Cut" },
    { name: "4. Premiere" }
  ];

  return (
    // This can be placed within the main content area or as a sticky header
    <nav className="bg-sf-surface border-b border-sf-border p-4 mb-8 sticky top-0 z-10">
      <div className="container mx-auto flex justify-center space-x-8">
        {steps.map((step, index) => {
          const isActive = index === activeStepIndex;
          const isComplete = index < activeStepIndex;

          return (
            <div
              key={step.name}
              // Apply dynamic classes for different states
              className={`py-2 px-4 transition-colors duration-200 font-medium cursor-pointer ${
                isActive
                  ? 'text-sf-primary border-b-2 border-sf-primary' // Active state
                  : isComplete 
                  ? 'text-sf-text-primary hover:text-sf-primary' // Completed state
                  : 'text-sf-text-secondary hover:text-sf-text-primary' // Future state
              }`}
            >
              {step.name}
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default WorkflowNavigator;
