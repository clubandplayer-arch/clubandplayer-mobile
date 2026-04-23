const React = require('react');
const renderer = require('react-test-renderer');

const SponsorCtaBanner = require('../src/components/feed/SponsorCtaBanner').default;

describe('SponsorCtaBanner', () => {
  it('renders base structure', () => {
    const tree = renderer.create(React.createElement(SponsorCtaBanner, { onRequestInfo: jest.fn() })).toJSON();
    expect(tree).toBeTruthy();
  });

  it('matches snapshot', () => {
    const tree = renderer.create(React.createElement(SponsorCtaBanner, { onRequestInfo: jest.fn() })).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
