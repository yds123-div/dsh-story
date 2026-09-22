export const FIRST_GEN_COST = 1300;
export const REGEN_COST = 406;

export function generationCost(alreadyGenerated: boolean): number {
  return alreadyGenerated ? REGEN_COST : FIRST_GEN_COST;
}
