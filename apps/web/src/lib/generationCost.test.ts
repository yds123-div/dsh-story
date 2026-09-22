import { FIRST_GEN_COST, REGEN_COST, generationCost } from './generationCost';

describe('generationCost', () => {
  it('charges ◆1300 for the first generate', () => {
    expect(generationCost(false)).toBe(1300);
    expect(FIRST_GEN_COST).toBe(1300);
  });

  it('charges ◆406 to regenerate an existing clip', () => {
    expect(generationCost(true)).toBe(406);
    expect(REGEN_COST).toBe(406);
  });
});
