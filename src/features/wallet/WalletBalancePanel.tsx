import { walletBalances } from "./wallet.mock";

export function WalletBalancePanel() {
  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Wallet Balance</div>
        <div className="text-xs muted">Block 90126025</div>
      </div>

      <div className="mt-4 space-y-3">
        {walletBalances.map((b) => (
          <div key={b.symbol} className="flex items-center justify-between text-sm">
            <div className="muted">{b.symbol}</div>
            <div className={b.color}>{b.amount}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 text-xs muted">
        0x... (address)
      </div>
    </div>
  );
}
