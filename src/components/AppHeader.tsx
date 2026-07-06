export function AppHeader({dark, onToggleDark}: {dark: boolean; onToggleDark: () => void}) {
  return (
    <header>
      <div>
        <b>Xưởng Thiết Kế Mặt Bằng Việt</b>
        <small>CSP heuristic client-side · bản tham khảo</small>
      </div>
      <button onClick={onToggleDark} aria-pressed={dark}>Sáng/tối</button>
    </header>
  );
}
