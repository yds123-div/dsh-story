import { workflowRedirect } from './workflow';

describe('workflowRedirect', () => {
  it('sends unfinalized STEP2 visits back to outline', () => {
    expect(workflowRedirect('proj-nming-muye', 1, 'assets')).toBe('/project/proj-nming-muye/outline');
  });

  it('allows STEP2 after outline is finalized', () => {
    expect(workflowRedirect('proj-nming-muye', 2, 'assets')).toBeNull();
  });

  it('sends STEP3 visits back to assets until STEP2 is complete', () => {
    expect(workflowRedirect('proj-nming-muye', 2, 'episodes')).toBe('/project/proj-nming-muye/assets');
  });

  it('allows STEP3 after the three-step chain is unlocked', () => {
    expect(workflowRedirect('proj-nming-muye', 3, 'episodes')).toBeNull();
  });
});
