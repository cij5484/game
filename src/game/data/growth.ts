/** One permanent A/B choice per growth track and run. */
export type GrowthBranch = "a" | "b";
export type GrowthBranches = Partial<Record<string, GrowthBranch>>;
