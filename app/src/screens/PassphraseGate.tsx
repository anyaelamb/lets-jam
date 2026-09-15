import { useState, type FormEvent } from 'react';

interface PassphraseGateProps {
  onSubmit: (passphrase: string) => Promise<string | null>;
}

export default function PassphraseGate({ onSubmit }: PassphraseGateProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || checking) return;
    setChecking(true);
    setError(null);
    const errorMessage = await onSubmit(value.trim());
    setChecking(false);
    setError(errorMessage);
  }

  return (
    <div className="screen passphrase-gate">
      <div className="passphrase-content">
        <h1>Let's Jam 🎸</h1>
        <p className="splash-tagline">Enter the passphrase to continue.</p>
        <form onSubmit={handleSubmit} className="passphrase-form">
          <input
            type="password"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Passphrase"
            className="passphrase-input"
          />
          <button type="submit" className="btn btn-primary btn-large" disabled={checking}>
            {checking ? 'Checking…' : 'Unlock'}
          </button>
        </form>
        {error && <p className="passphrase-error">{error}</p>}
      </div>
    </div>
  );
}
