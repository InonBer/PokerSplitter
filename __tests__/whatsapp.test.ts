// __tests__/whatsapp.test.ts
import { buildSummaryURL, buildTransferURL } from '../src/utils/whatsapp';
import { Transfer } from '../src/types';

describe('buildSummaryURL', () => {
  it('starts with whatsapp://send?text=', () => {
    const url = buildSummaryURL([], 100);
    expect(url).toMatch(/^whatsapp:\/\/send\?text=/);
  });

  it('includes break-even message when no transfers', () => {
    const url = decodeURIComponent(buildSummaryURL([], 100));
    expect(url).toContain('everyone broke even');
    expect(url).toContain('$100.00');
  });

  it('uses em-dash (not hyphen) in break-even line', () => {
    const url = decodeURIComponent(buildSummaryURL([], 100));
    expect(url).toContain('—'); // em-dash U+2014
  });

  it('includes total pot in summary URL', () => {
    const url = decodeURIComponent(buildSummaryURL([], 280));
    expect(url).toContain('$280.00');
  });

  it('includes transfer lines when transfers exist', () => {
    const transfers: Transfer[] = [{ from: 'Dan', to: 'Maya', amount: 45 }];
    const url = decodeURIComponent(buildSummaryURL(transfers, 200));
    expect(url).toContain('Dan → Maya: $45.00');
    expect(url).toContain('$200.00');
  });
});

describe('buildTransferURL', () => {
  it('starts with whatsapp://send?phone= scheme', () => {
    const url = buildTransferURL('+972501234567', 'Dan', 'Maya', 45);
    expect(url).toMatch(/^whatsapp:\/\/send\?phone=/);
  });

  it('includes phone in URL', () => {
    const url = buildTransferURL('+972501234567', 'Dan', 'Maya', 45);
    expect(url).toContain('phone=%2B972501234567');
  });

  it('includes personalised message', () => {
    const url = decodeURIComponent(buildTransferURL('+972501234567', 'Dan', 'Maya', 45));
    expect(url).toContain('Dan');
    expect(url).toContain('Maya');
    expect(url).toContain('$45.00');
  });
});
