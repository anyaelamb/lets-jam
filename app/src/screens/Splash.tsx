interface SplashProps {
  onFindSong: () => void;
  onShowAll: () => void;
}

export default function Splash({ onFindSong, onShowAll }: SplashProps) {
  return (
    <div className="screen splash">
      <div className="splash-content">
        <h1>Let's Jam 🎸</h1>
        <p className="splash-tagline">Find the right song for right now.</p>
        <button type="button" className="btn btn-primary btn-large" onClick={onFindSong}>
          Find the perfect song
        </button>
        <button type="button" className="btn btn-link" onClick={onShowAll}>
          Show All Songs
        </button>
      </div>
    </div>
  );
}
