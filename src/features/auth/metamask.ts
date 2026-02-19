export function isMetaMaskInstalled(): boolean {
  const w = window as any;
  const eth = w?.ethereum;

  // MetaMask injects the `ethereum` object into the `window` object, and sets the `isMetaMask` property to `true`.
  return Boolean(eth && eth.isMetaMask);
}
